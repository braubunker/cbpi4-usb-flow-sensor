import asyncio
import logging
import sys
import time
import types
from dataclasses import replace

from cbpi4_usb_flow.protocol import FlowReading


def install_cbpi_stubs():
    def parameters(parameter):
        def decorate(cls):
            cls.cbpi_parameters = parameter
            return cls

        return decorate

    def action(key, parameters=None):
        def decorate(fn):
            fn.action = True
            fn.key = key
            fn.parameters = parameters or []
            return fn

        return decorate

    class CBPiSensor:
        def __init__(self, cbpi, id, props):
            self.cbpi = cbpi
            self.id = id
            self.props = props
            self.running = False
            self.logger = logging.getLogger("test-sensor")

        def push_update(self, value, mqtt=True):
            self.value = value

        def log_data(self, value):
            return None

        def get_unit(self):
            return None

    class CBPiStep:
        def __init__(self, cbpi, id, name, props, on_done):
            self.cbpi = cbpi
            self.id = id
            self.name = name
            self.props = props
            self.running = False
            self.summary = ""

    class Property:
        class Text:
            def __init__(self, label, configurable=False, default_value="", description=""):
                self.label = label
                self.configurable = configurable
                self.default_value = default_value
                self.description = description

        class Number:
            def __init__(self, label, configurable=False, default_value=None, unit="", description=""):
                self.label = label
                self.configurable = configurable
                self.default_value = default_value
                self.description = description

        class Select:
            def __init__(self, label, options, default_value=None, description=""):
                self.label = label
                self.options = options
                self.default_value = default_value
                self.description = description

        class Actor:
            def __init__(self, label, description=""):
                self.label = label
                self.description = description

        class Sensor:
            def __init__(self, label, description=""):
                self.label = label
                self.description = description

    class NotificationType:
        ERROR = "error"
        SUCCESS = "success"

    class StepResult:
        NEXT = "next"
        DONE = "done"
        ERROR = "error"

    api = types.ModuleType("cbpi.api")
    api.CBPiSensor = CBPiSensor
    api.Property = Property
    api.action = action
    api.parameters = parameters

    dataclasses = types.ModuleType("cbpi.api.dataclasses")
    dataclasses.NotificationType = NotificationType

    step = types.ModuleType("cbpi.api.step")
    step.CBPiStep = CBPiStep
    step.StepResult = StepResult

    cbpi = types.ModuleType("cbpi")
    cbpi.api = api

    sys.modules["cbpi"] = cbpi
    sys.modules["cbpi.api"] = api
    sys.modules["cbpi.api.dataclasses"] = dataclasses
    sys.modules["cbpi.api.step"] = step


install_cbpi_stubs()

from cbpi4_usb_flow.sensor import FLOW, UsbFillStep, UsbFlowSensor  # noqa: E402
import cbpi4_usb_flow  # noqa: E402


class FakeReader:
    def __init__(self, sample):
        self.sample = sample
        self.sent = []
        self.stopped = False

    def start(self):
        return None

    def stop(self):
        self.stopped = True

    def send(self, command):
        self.sent.append(command)
        if command == "RESET" and self.sample is not None:
            self.sample = replace(self.sample, ml=0, pulses=0, lpm=0.0, received_at=time.time())

    def latest(self):
        return self.sample

    @property
    def error(self):
        return None


def make_sensor(props, sample):
    sensor = UsbFlowSensor(object(), "sensor-1", props)
    sensor._reader = FakeReader(sample)
    return sensor


def test_setup_registers_sensor_and_step():
    class Registrar:
        def __init__(self):
            self.registered = []

        def register(self, name, cls):
            self.registered.append((name, cls))

    cbpi = types.SimpleNamespace(plugin=Registrar())
    cbpi4_usb_flow.setup(cbpi)
    assert [name for name, _cls in cbpi.plugin.registered] == [
        "USB Durchflussmesser",
        "USB Tank fuellen",
    ]


def test_sensor_shows_liters_and_can_switch_to_flow():
    sample = FlowReading(ml=2500, lpm=1.25, pulses=1125, ppl=450, received_at=time.time())
    props = {"Anschluss": "/dev/ttyUSB0", "Impulse pro Liter": 450, "Anzeige": "Volumen (L)"}
    sensor = make_sensor(props, sample)

    async def run_briefly():
        sensor.running = True

        async def stop():
            await asyncio.sleep(0.05)
            sensor.running = False

        await asyncio.gather(sensor.run(), stop())

    asyncio.run(run_briefly())
    assert sensor.value == 2.5
    assert sensor.get_unit() == "L"
    assert sensor.volume_liters() == 2.5
    assert sensor._reader.stopped is True

    sensor.props["Anzeige"] = FLOW
    sensor.running = True

    async def run_flow():
        async def stop():
            await asyncio.sleep(0.05)
            sensor.running = False

        await asyncio.gather(sensor.run(), stop())

    asyncio.run(run_flow())
    assert sensor.value == 1.25
    assert sensor.get_unit() == "L/min"


def test_sensor_sends_calibration_and_reset():
    sample = FlowReading(ml=1000, lpm=0, pulses=450, ppl=450, received_at=time.time())
    sensor = make_sensor(
        {"Anschluss": "/dev/ttyUSB0", "Impulse pro Liter": "5880", "Anzeige": "Volumen (L)"},
        sample,
    )

    async def run_briefly():
        sensor.running = True

        async def stop():
            await asyncio.sleep(0.05)
            sensor.running = False

        await asyncio.gather(sensor.run(), stop())

    asyncio.run(run_briefly())
    assert sensor._reader.sent == ["CAL 5880"]
    sensor.reset()
    assert sensor._reader.sent[-1] == "RESET"
    assert sensor.value == 0.0
    assert sensor.get_state()["ml"] == 0


def test_fill_step_opens_actor_and_finishes_at_target():
    class Meter:
        def __init__(self):
            self.volume = 0.0
            self.age = 0.1
            self.resets = 0

        def volume_liters(self):
            return self.volume

        def sample_age(self):
            return self.age

        def reset(self):
            self.resets += 1
            self.volume = 0.0

    meter = Meter()
    notes = []
    actor_log = []

    async def actor_on(actor_id, power=100, output=None):
        actor_log.append(("on", actor_id))

    async def actor_off(actor_id):
        actor_log.append(("off", actor_id))

    async def push_update():
        return None

    cbpi = types.SimpleNamespace(notify=lambda *args: notes.append(args))
    step = UsbFillStep(
        cbpi,
        "step-1",
        "Tank",
        {
            "Volumen": 2,
            "Aktor": "ventil",
            "Sensor": "flow",
            "Am Start zurücksetzen": "Ja",
            "Am Ende zurücksetzen": "Ja",
        },
        None,
    )
    step.get_sensor = lambda _sensor_id: types.SimpleNamespace(instance=meter)
    step.actor_on = actor_on
    step.actor_off = actor_off
    step.push_update = push_update

    async def scenario():
        await step.on_start()
        assert meter.resets == 1
        step.running = True

        async def pour():
            await asyncio.sleep(0.15)
            meter.volume = 1
            await asyncio.sleep(0.25)
            meter.volume = 2.2

        result, _pending = await asyncio.gather(step.run(), pour())
        return result

    result = asyncio.run(scenario())
    assert result == "next"
    assert ("on", "ventil") in actor_log
    assert actor_log[-1] == ("off", "ventil")
    assert meter.resets == 2
    assert notes[-1][2] == "success"


def test_fill_step_closes_actor_when_signal_is_lost():
    class Meter:
        def volume_liters(self):
            return 0.4

        def sample_age(self):
            return None

    actor_log = []
    notes = []

    async def actor_on(actor_id, power=100, output=None):
        actor_log.append(("on", actor_id))

    async def actor_off(actor_id):
        actor_log.append(("off", actor_id))

    async def push_update():
        return None

    cbpi = types.SimpleNamespace(notify=lambda *args: notes.append(args))
    step = UsbFillStep(
        cbpi,
        "step-2",
        "Tank",
        {
            "Volumen": 10,
            "Aktor": "ventil",
            "Sensor": "flow",
            "Am Start zurücksetzen": "Nein",
        },
        None,
    )
    step.get_sensor = lambda _sensor_id: types.SimpleNamespace(instance=Meter())
    step.actor_on = actor_on
    step.actor_off = actor_off
    step.push_update = push_update

    async def scenario():
        await step.on_start()
        step._started = time.time() - 10
        step._actor_on = True
        step.running = True

        async def stop():
            await asyncio.sleep(0.7)
            step.running = False

        await asyncio.gather(step.run(), stop())

    asyncio.run(scenario())
    assert "Signal" in step.summary
    assert ("off", "ventil") in actor_log
    assert ("on", "ventil") not in actor_log
    assert notes[-1][2] == "error"
