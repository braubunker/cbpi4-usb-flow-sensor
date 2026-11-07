"""Liest den USB-Zähler in einem eigenen Thread, damit CBPi nicht blockiert."""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import replace

from cbpi4_usb_flow.protocol import FlowReading, parse_line

logger = logging.getLogger(__name__)


def open_serial(port: str, baud: int, timeout: float):
    import serial

    return serial.Serial(port, baud, timeout=timeout)


class SerialFlowReader:
    def __init__(self, port: str, baud: int = 115200, open_port=None) -> None:
        self.port = port
        self.baud = baud
        self._open_port = open_port or open_serial
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()
        self._write_lock = threading.Lock()
        self._sample: FlowReading | None = None
        self._error: str | None = None
        self._ser = None
        self._ignore_until = 0.0
        self._last_log = 0.0

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="usb-flow", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        ser = self._ser
        if ser is not None:
            try:
                ser.close()
            except Exception:
                pass
        thread = self._thread
        if thread is not None and thread is not threading.current_thread():
            thread.join(timeout=2)
        self._thread = None

    def send(self, command: str) -> None:
        text = command.strip()
        if not text:
            return
        if text.upper() == "RESET":
            self._ignore_until = time.monotonic() + 0.4
            with self._lock:
                if self._sample is not None:
                    self._sample = replace(
                        self._sample,
                        ml=0,
                        pulses=0,
                        lpm=0.0,
                        received_at=time.time(),
                    )
        payload = (text + "\n").encode("ascii", errors="ignore")
        with self._write_lock:
            ser = self._ser
            if ser is None:
                raise ConnectionError(self.error or "USB-Zähler nicht verbunden")
            if text.upper() == "RESET":
                reset_buffer = getattr(ser, "reset_input_buffer", None)
                if callable(reset_buffer):
                    try:
                        reset_buffer()
                    except Exception:
                        logger.debug("Eingabepuffer konnte nicht geleert werden", exc_info=True)
            ser.write(payload)

    def latest(self) -> FlowReading | None:
        with self._lock:
            return self._sample

    @property
    def connected(self) -> bool:
        sample = self.latest()
        if sample is None or sample.received_at <= 0:
            return False
        return (time.time() - sample.received_at) < 3.0

    @property
    def error(self) -> str | None:
        with self._lock:
            return self._error

    def _run(self) -> None:
        while not self._stop.is_set():
            ser = None
            try:
                ser = self._open_port(self.port, self.baud, 0.5)
                self._ser = ser
                with self._lock:
                    self._error = None
                while not self._stop.is_set():
                    raw = ser.readline()
                    if not raw:
                        continue
                    reading = parse_line(raw)
                    if reading is None:
                        continue
                    if time.monotonic() < self._ignore_until and reading.ml > 0:
                        continue
                    stamped = replace(reading, received_at=time.time())
                    with self._lock:
                        self._sample = stamped
                        self._error = None
            except Exception as exc:
                now = time.time()
                with self._lock:
                    self._error = str(exc)
                if now - self._last_log > 15:
                    logger.warning("USB-Durchflussmesser %s: %s", self.port, exc)
                    self._last_log = now
                if self._stop.wait(1.5):
                    break
            finally:
                self._ser = None
                if ser is not None:
                    try:
                        ser.close()
                    except Exception:
                        pass
