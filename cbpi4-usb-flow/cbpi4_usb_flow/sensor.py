from __future__ import annotations

import asyncio
import logging
import time

from cbpi.api import CBPiSensor, Property, action, parameters
from cbpi.api.dataclasses import NotificationType
from cbpi.api.step import CBPiStep, StepResult

from cbpi4_usb_flow.reader import SerialFlowReader

logger = logging.getLogger(__name__)

VOLUME = "Volumen (L)"
FLOW = "Durchfluss (L/min)"


def _prop(props, key, default=None):
    try:
        value = props.get(key, default)
    except Exception:
        value = default
    if value is None or value == "":
        return default
    return value


def _pulses_per_liter(props) -> int:
    raw = _prop(props, "Impulse pro Liter", 450)
    try:
        value = int(float(raw))
    except (TypeError, ValueError):
        value = 450
    return max(1, min(value, 65535))


@parameters(
    [
        Property.Text(
            label="Anschluss",
            configurable=True,
            default_value="/dev/ttyUSB0",
            description="Serieller Port. Stabil ist ein Pfad unter /dev/serial/by-id. CH340-Nanos sind meist /dev/ttyUSB0, ein Leonardo /dev/ttyACM0.",
        ),
        Property.Number(
            label="Impulse pro Liter",
            configurable=True,
            default_value=450,
            description="Kalibrierwert des Sensors. YF-S201 startet bei 450. Der Arduino speichert den Wert.",
        ),
        Property.Select(
            label="Anzeige",
            options=[VOLUME, FLOW],
            description="Was die grosse Zahl des Sensors zeigt. Der Füllschritt rechnet immer in Litern.",
        ),
    ]
)
class UsbFlowSensor(CBPiSensor):
    def __init__(self, cbpi, id, props):
        super().__init__(cbpi, id, props)
        self.value = 0.0
        port = str(_prop(props, "Anschluss", "/dev/ttyUSB0"))
        self._reader = SerialFlowReader(port=port, baud=115200)
        self._last_cal: int | None = None
        self._last_log = 0.0

    def _display(self) -> str:
        return str(_prop(self.props, "Anzeige", VOLUME))

    def get_unit(self):
        if self._display() == FLOW:
            return "L/min"
        return "L"

    def volume_liters(self) -> float:
        sample = self._reader.latest()
        if sample is None:
            return 0.0
        return sample.ml / 1000.0

    def sample_age(self):
        sample = self._reader.latest()
        if sample is None or sample.received_at <= 0:
            return None
        return time.time() - sample.received_at

    def reset(self):
        self.value = 0.0
        try:
            self._reader.send("RESET")
        except Exception as exc:
            logger.warning("Zähler zurücksetzen fehlgeschlagen: %s", exc)
        self.push_update(self.value)

    @action(key="Zähler zurücksetzen", parameters=[])
    async def reset_action(self, **kwargs):
        self.reset()

    async def run(self):
        self._reader.start()
        try:
            while self.running:
                sample = self._reader.latest()
                wanted = _pulses_per_liter(self.props)
                if sample is not None and sample.ppl != wanted and self._last_cal != wanted:
                    try:
                        self._reader.send(f"CAL {wanted}")
                        self._last_cal = wanted
                    except Exception:
                        logger.warning("Kalibrierung konnte nicht gesendet werden", exc_info=True)
                if self._display() == FLOW:
                    shown = 0.0 if sample is None else round(sample.lpm, 2)
                else:
                    shown = 0.0 if sample is None else round(sample.ml / 1000.0, 3)
                self.value = shown
                self.push_update(self.value)
                now = time.time()
                if sample is not None and now - self._last_log >= 5:
                    self.log_data(self.value)
                    self._last_log = now
                await asyncio.sleep(0.5)
        finally:
            self._reader.stop()

    async def on_stop(self):
        self._reader.stop()

    def get_state(self):
        sample = self._reader.latest()
        state = dict(value=self.value, unit=self.get_unit())
        if sample is not None:
            state.update(
                ml=sample.ml,
                lpm=sample.lpm,
                pulses=sample.pulses,
                ppl=sample.ppl,
            )
        error = self._reader.error
        if error:
            state["error"] = error
        return state


@parameters(
    [
        Property.Number(
            label="Volumen",
            configurable=True,
            default_value=20,
            description="Zielmenge in Liter.",
        ),
        Property.Sensor(
            label="Sensor",
            description="Sensor vom Typ USB Durchflussmesser.",
        ),
        Property.Actor(
            label="Aktor",
            description="Optional. Magnetventil oder Pumpe. Leer lassen, wenn du den Hahn selbst bedienst.",
        ),
        Property.Select(
            label="Am Start zurücksetzen",
            options=["Ja", "Nein"],
            description="Setzt den Zähler auf null, wenn der Schritt beginnt.",
        ),
        Property.Select(
            label="Am Ende zurücksetzen",
            options=["Nein", "Ja"],
            description="Setzt den Zähler auf null, wenn die Zielmenge erreicht ist.",
        ),
    ]
)
class UsbFillStep(CBPiStep):
    async def on_start(self):
        self.actor = _prop(self.props, "Aktor", None)
        try:
            self.target = float(_prop(self.props, "Volumen", 0) or 0)
        except (TypeError, ValueError):
            self.target = 0.0
        self.sensor_id = _prop(self.props, "Sensor", None)
        self.reset_at_end = _prop(self.props, "Am Ende zurücksetzen", "Nein") == "Ja"
        self.sensor = self.get_sensor(self.sensor_id) if self.sensor_id else None
        self._actor_on = False
        self._alarmed = False
        self._started = time.time()
        if _prop(self.props, "Am Start zurücksetzen", "Ja") == "Ja":
            instance = getattr(self.sensor, "instance", None) if self.sensor is not None else None
            if instance is not None and hasattr(instance, "reset"):
                instance.reset()

    async def on_stop(self):
        await self._close_actor()

    async def _close_actor(self):
        if getattr(self, "_actor_on", False) and getattr(self, "actor", None):
            await self.actor_off(self.actor)
            self._actor_on = False

    def _volume_and_age(self):
        instance = getattr(self.sensor, "instance", None) if self.sensor is not None else None
        if instance is None or not hasattr(instance, "volume_liters"):
            return None, None
        return float(instance.volume_liters()), instance.sample_age()

    async def run(self):
        try:
            while self.running:
                if self.sensor is None or getattr(self.sensor, "instance", None) is None:
                    self.summary = "Kein Durchflusssensor gewählt."
                    await self.push_update()
                    if not self._alarmed:
                        self.cbpi.notify(self.name, self.summary, NotificationType.ERROR)
                        self._alarmed = True
                    await self._close_actor()
                    await asyncio.sleep(1)
                    continue

                volume, age = self._volume_and_age()
                silent = age is None or age > 3
                if silent and (time.time() - self._started) > 3:
                    self.summary = "Kein Signal vom USB-Zähler. Zulauf gestoppt."
                    await self.push_update()
                    await self._close_actor()
                    if not self._alarmed:
                        self.cbpi.notify(self.name, self.summary, NotificationType.ERROR)
                        self._alarmed = True
                    await asyncio.sleep(0.5)
                    continue

                self._alarmed = False
                if self.actor and not self._actor_on and not silent:
                    await self.actor_on(self.actor)
                    self._actor_on = True

                shown = 0.0 if volume is None else volume
                self.summary = "Volumen: {:.2f} von {:.2f} L".format(shown, self.target)
                await self.push_update()
                if volume is not None and volume >= self.target:
                    await self._close_actor()
                    self.cbpi.notify(
                        self.name,
                        "Zielmenge erreicht: {:.2f} L.".format(shown),
                        NotificationType.SUCCESS,
                    )
                    if self.reset_at_end:
                        instance = getattr(self.sensor, "instance", None)
                        if instance is not None and hasattr(instance, "reset"):
                            instance.reset()
                    return StepResult.NEXT
                await asyncio.sleep(0.2)
        finally:
            await self._close_actor()
