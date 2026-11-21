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

| Teil | Hinweis | Bezugsquelle |
| --- | --- | --- |
| YF-S201, G1/2 | Kaltes Wasser, Startwert 450 Impulse/L | [Funduino](https://funduino.com/products/yf-s201-wasser-durchflusssensor-1-30l-min-g1-2-halleffekt), [Otronic](https://www.otronic-shop.de/de/water-flow-sensor-yf-s201) |
| Arduino Nano, 5 V, ATmega328P | CH340-Klone erscheinen als `/dev/ttyUSB0` | [Galaxus, Berrybase-Nano](https://www.galaxus.ch/de/s1/product/berrybase-compatible-arduino-nano-with-atmel-mega-328p-process-single-board-computer-kits-33668257) |
| USB-A auf Mini-USB | Datenkabel, kein reines Ladekabel | [Galaxus, Delock](https://www.galaxus.ch/de/s1/product/delock-usb-a-usb-mini-b-070-m-usb-20-usb-cables-5639018) |
| Jumper Buchse-Buchse | Nur wenn das Sensorkabel keine Buchsen hat | [Galaxus, Purecrea](https://www.galaxus.ch/de/s1/product/purecrea-jumperkabel-cable-prise-electronique-34239672) |
| YF-B1 Edelstahl, optional | Heisses Brauwasser, Impulszahl kalibrieren | [SmartHomeShop](https://smarthomeshop.io/en/products/water-flow-sensor-yf-b1-g1-2-dn15) |
| Zwei Schlauchtüllen G1/2 | Pfeil auf dem Sensor in Fliessrichtung | [Galaxus-Suche](https://www.galaxus.ch/de/search?q=Schlaucht%C3%BClle%201%2F2) |

Verdrahtung, Nano mit Mini-USB nach oben:

- Rot (Sensor VCC) → Stift mit Aufdruck **5V** (linke Reihe, 12. Stift vom USB)
- Schwarz (Sensor GND) → Stift mit Aufdruck **GND** (rechte Reihe, gegenüber von 5V)
- Gelb (Sensor Signal) → Stift mit Aufdruck **D2** (rechte Reihe, ein Stift näher am USB als dieses GND)
- Mini-USB am Nano → USB-Buchse am Raspberry Pi

Das gelbe Signal bleibt am Arduino. An den Raspberry Pi geht nur das USB-Kabel. Ein Magnetventil ist ein eigener GPIO-Aktor und hängt nicht an diesen drei Drähten.

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

Auf dem Pi, einmalig das Repo holen und aus diesem Ordner installieren. `./cbpi4-usb-flow` gilt nur dort, nicht im Home-Verzeichnis.

```bash
cd "$HOME"
git clone https://github.com/braubunker/cbpi4-usb-flow-sensor.git
cd "$HOME/cbpi4-usb-flow-sensor"
sudo usermod -aG dialout "$USER"
pipx runpip cbpi4 install ./cbpi4-usb-flow
sudo systemctl restart craftbeerpi
```

Neu anmelden, damit die Gruppe `dialout` gilt. Der Dienst heisst `craftbeerpi`, nicht `cbpi`. Fehlt er, legt `cbpi autostart on` ihn an. Läuft CBPi nur in einem Terminal, dort mit Strg+C beenden und mit `cbpi` neu starten. Danach in CBPi:

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
