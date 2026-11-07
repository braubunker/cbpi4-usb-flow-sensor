#!/usr/bin/env python3
"""Stellt einen virtuellen USB-Zähler bereit, der das Arduino-Protokoll spricht."""

from __future__ import annotations

import argparse
import os
import pty
import select
import sys
import time

from cbpi4_usb_flow.protocol import FlowDevice


def main() -> int:
    parser = argparse.ArgumentParser(description="Simulierter USB-Durchflussmesser auf einem PTY")
    parser.add_argument("--ppl", type=int, default=450)
    parser.add_argument("--lpm", type=float, default=0.0, help="Ständiger Durchfluss in Liter pro Minute")
    args = parser.parse_args()

    master, slave = pty.openpty()
    os.set_blocking(master, False)
    print(os.ttyname(slave), flush=True)
    print("Diesen Pfad in CBPi als Anschluss eintragen. Beenden mit Ctrl-C.", file=sys.stderr, flush=True)

    device = FlowDevice(ppl=args.ppl, now=time.monotonic())
    buffer = ""
    last = time.monotonic()
    next_report = 0.0
    try:
        while True:
            now = time.monotonic()
            elapsed = now - last
            last = now
            device.advance(elapsed)
            if args.lpm > 0 and elapsed > 0:
                delta = int(args.lpm * elapsed / 60.0 * device.ppl)
                if delta:
                    device.add_pulses(delta)
            if now >= next_report:
                try:
                    os.write(master, (device.line() + "\n").encode())
                except BlockingIOError:
                    pass
                next_report = now + 0.25

            timeout = max(0.0, next_report - time.monotonic())
            readable, _, _ = select.select([master], [], [], timeout)
            if not readable:
                continue
            try:
                chunk = os.read(master, 256).decode("ascii", errors="ignore")
            except OSError:
                continue
            buffer += chunk
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                device.handle(line.strip("\r"))
    except KeyboardInterrupt:
        print("\nStopp.", file=sys.stderr)
    finally:
        os.close(master)
        os.close(slave)
    return 0


if __name__ == "__main__":
    sys.exit(main())
