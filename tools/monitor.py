#!/usr/bin/env python3
"""Zeigt die Messwerte eines angeschlossenen USB-Zählers."""

from __future__ import annotations

import argparse
import sys
import time

from cbpi4_usb_flow.reader import SerialFlowReader


def main() -> int:
    parser = argparse.ArgumentParser(description="USB-Durchflussmesser live anzeigen")
    parser.add_argument("--port", default="/dev/ttyUSB0", help="Serieller Port, z.B. /dev/serial/by-id/...")
    parser.add_argument("--baud", type=int, default=115200)
    args = parser.parse_args()

    reader = SerialFlowReader(args.port, args.baud)
    reader.start()
    print(f"Lese {args.port} mit {args.baud} Baud. Beenden mit Ctrl-C.", flush=True)
    try:
        while True:
            sample = reader.latest()
            if sample is None:
                print(reader.error or "warte auf die erste Zeile", flush=True)
            else:
                print(
                    f"{sample.ml / 1000:.3f} L   {sample.lpm:.1f} L/min   "
                    f"{sample.pulses} Impulse   {sample.ppl} Imp/L",
                    flush=True,
                )
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopp.", flush=True)
    finally:
        reader.stop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
