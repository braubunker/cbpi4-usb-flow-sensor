"""Protokoll zwischen Arduino und CraftBeerPi.

Jede Zeile ist ein JSON-Objekt, abgeschlossen mit Newline:

    {"ml":1234,"lpm":6.2,"pulses":555,"ppl":450}

Befehle, ebenfalls eine Zeile:

    RESET
    CAL 450
    PING
"""

from __future__ import annotations

import json
from dataclasses import dataclass


@dataclass(frozen=True)
class FlowReading:
    ml: int
    lpm: float
    pulses: int
    ppl: int
    pong: bool = False
    received_at: float = 0.0


def milliliters(pulses: int, pulses_per_liter: int) -> int:
    if pulses_per_liter <= 0:
        raise ValueError("Impulse pro Liter müssen grösser als 0 sein")
    if pulses < 0:
        raise ValueError("Impulse können nicht negativ sein")
    return (pulses * 1000) // pulses_per_liter


def liters_per_minute(delta_pulses: int, pulses_per_liter: int, window_ms: int) -> float:
    if pulses_per_liter <= 0 or window_ms <= 0 or delta_pulses <= 0:
        return 0.0
    return (delta_pulses * 60000.0) / pulses_per_liter / window_ms


def pulses_per_liter(pulses: int, liters: float) -> int:
    if liters <= 0:
        raise ValueError("Die gemessene Menge muss grösser als 0 sein")
    if pulses < 0:
        raise ValueError("Impulse können nicht negativ sein")
    return max(1, int(round(pulses / liters)))


def parse_line(raw: bytes | str) -> FlowReading | None:
    if isinstance(raw, bytes):
        text = raw.decode("utf-8", errors="replace").strip()
    else:
        text = raw.strip()
    if not text.startswith("{"):
        return None
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict) or "ml" not in data:
        return None
    try:
        return FlowReading(
            ml=int(data["ml"]),
            lpm=float(data.get("lpm", 0) or 0),
            pulses=int(data.get("pulses", 0) or 0),
            ppl=int(data.get("ppl", 0) or 0),
            pong=bool(data.get("pong", False)),
        )
    except (TypeError, ValueError):
        return None


def format_line(reading: FlowReading) -> str:
    payload: dict[str, int | float] = {
        "ml": int(reading.ml),
        "lpm": round(float(reading.lpm), 1),
        "pulses": int(reading.pulses),
        "ppl": int(reading.ppl),
    }
    if reading.pong:
        payload["pong"] = 1
    return json.dumps(payload, separators=(",", ":"))


class FlowDevice:
    """Dieselbe Zählerlogik wie die Firmware, mit einer steuerbaren Uhr."""

    FLOW_WINDOW_S = 1.0
    FLOW_IDLE_S = 2.0

    def __init__(self, ppl: int = 450, now: float = 0.0) -> None:
        if ppl < 1 or ppl > 65535:
            raise ValueError("Impulse pro Liter müssen zwischen 1 und 65535 liegen")
        self.ppl = ppl
        self.pulses = 0
        self.lpm = 0.0
        self._now = now
        self._window_start = now
        self._window_pulses = 0
        self._last_pulse_at: float | None = None
        self._previous = 0

    def advance(self, seconds: float) -> None:
        if seconds < 0:
            raise ValueError("Die Zeit läuft nur vorwärts")
        self._now += seconds
        self._update_flow()

    def add_pulses(self, count: int) -> None:
        if count < 0:
            raise ValueError("Impulse können nicht negativ sein")
        self.pulses += count
        self._update_flow()

    def milliliters(self) -> int:
        return milliliters(self.pulses, self.ppl)

    def reading(self, pong: bool = False) -> FlowReading:
        return FlowReading(
            ml=self.milliliters(),
            lpm=round(self.lpm, 1),
            pulses=self.pulses,
            ppl=self.ppl,
            pong=pong,
        )

    def line(self, pong: bool = False) -> str:
        return format_line(self.reading(pong=pong))

    def handle(self, command: str) -> str | None:
        text = command.strip()
        if not text:
            return None
        head, _, arg = text.partition(" ")
        word = head.upper()
        if word == "RESET" and arg.strip() == "":
            self.pulses = 0
            self.lpm = 0.0
            self._window_start = self._now
            self._window_pulses = 0
            self._last_pulse_at = None
            self._previous = 0
            return None
        if word == "PING" and arg.strip() == "":
            return self.line(pong=True)
        if word == "CAL":
            try:
                value = int(arg.strip())
            except ValueError:
                return None
            if 1 <= value <= 65535:
                self.ppl = value
            return None
        return None

    def _update_flow(self) -> None:
        now = self._now
        if self.pulses != self._previous:
            self._last_pulse_at = now
            self._previous = self.pulses
        idle = self._last_pulse_at is None or (now - self._last_pulse_at) > self.FLOW_IDLE_S
        if idle:
            self.lpm = 0.0
            self._window_start = now
            self._window_pulses = self.pulses
            return
        elapsed_ms = int(round((now - self._window_start) * 1000))
        if elapsed_ms >= 1000:
            delta = self.pulses - self._window_pulses
            self.lpm = liters_per_minute(delta, self.ppl, elapsed_ms)
            self._window_start = now
            self._window_pulses = self.pulses
