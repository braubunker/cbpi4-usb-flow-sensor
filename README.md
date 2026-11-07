# Leitmass

USB-Durchflussmesser für CraftBeerPi 4. Ein Hall-Sensor im Zulauf zählt Impulse, ein Arduino Nano rechnet sie in Liter um, und CBPi zeigt die Wassermenge als Sensor.

Die Werkbank in diesem Repo spielt denselben Ablauf ohne Hardware durch: Hahn öffnen, Zielmenge setzen, Liter ablesen.

## Werkbank

```bash
npm install
npm run dev
```

Die Seite läuft danach auf Port 4731. Hahn öffnen füllt den Tank. Die grosse Zahl ist der Wert, den der CBPi-Sensor anzeigt. Unter der Werkbank stehen Aufbau, Kalibrierung und die Klicks in CraftBeerPi.

## Hardware

| Teil | Hinweis |
| --- | --- |
| Hall-Durchflusssensor, 1/2 Zoll | YF-S201 für kaltes Wasser, Startwert 450 Impulse/L. Für heisses Wasser einen Edelstahlsensor mit Impulsausgang. |
| Arduino Nano, 5 V | CH340-Klone erscheinen als `/dev/ttyUSB0`. |
| USB-Kabel | Muss Daten übertragen, nicht nur laden. |

Verdrahtung am Nano:

- Rot → 5V
- Schwarz → GND
- Gelb → D2

Das gelbe Signal bleibt am Arduino. An den Raspberry Pi geht nur das USB-Kabel.

Sketch `firmware/usb_flowmeter/usb_flowmeter.ino` mit der Arduino IDE laden. Board: Arduino Nano. Wenn der Upload bei einem Klon scheitert, den Prozessor „ATmega328P (Old Bootloader)“ wählen.

Der Zähler schickt alle 250 ms eine Zeile mit 115200 Baud:

```text
{"ml":1234,"lpm":6.2,"pulses":555,"ppl":450}
```

`RESET` setzt die Menge auf null. `CAL 450` speichert die Impulse pro Liter im EEPROM. Die gezählte Menge übersteht einen Neustart von CBPi, solange der Arduino Strom hat.

## Kalibrieren

Zähler zurücksetzen, genau einen Liter in einen Messbecher laufen lassen, Impulse ablesen. Diese Zahl ist der Wert „Impulse pro Liter“. Bei einer anderen Menge: Impulse geteilt durch Liter, gerundet.

Ohne CBPi kannst du mitlesen:

```bash
pip install -e ./cbpi4-usb-flow
PYTHONPATH=cbpi4-usb-flow python tools/monitor.py --port /dev/serial/by-id/usb-...
```

Den genauen Port zeigt `ls -l /dev/serial/by-id`.

## CraftBeerPi 4

Auf dem Pi:

```bash
sudo usermod -aG dialout "$USER"
pipx runpip cbpi4 install ./cbpi4-usb-flow
sudo systemctl restart cbpi
```

Neu anmelden, damit die Gruppe `dialout` gilt. Danach in CBPi:

1. Hardware → Sensor hinzufügen → Typ **USB Durchflussmesser**.
2. Anschluss auf den `by-id`-Pfad setzen, Impulse pro Liter eintragen, Anzeige **Volumen (L)**.
3. Dashboard-Widget **Sensor Data**: Sensor wählen, `unit` = `L`, `digits` = `2`, `action` = `yes`.
4. Vor dem Befüllen im Aktionsmenü **Zähler zurücksetzen**.

Der Sudschritt **USB Tank fuellen** schaltet optional einen Aktor (Magnetventil auf einem GPIO) ein, bis die Zielmenge erreicht ist. Ohne Aktor wartet der Schritt nur. Bleibt das USB-Signal länger als drei Sekunden weg, geht der Aktor aus.

## Tests

```bash
pip install -e ./cbpi4-usb-flow pytest
pytest
```

Lizenz: GPLv3.
