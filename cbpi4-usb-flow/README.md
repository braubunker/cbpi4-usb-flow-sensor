# USB-Durchflussmesser für CraftBeerPi 4

Sensor-Plugin, das die Liter von einem Arduino am USB-Anschluss anzeigt.

Der Hall-Sensor hängt am Nano: rot an 5V, schwarz an GND, gelb an D2. An den Pi geht nur das USB-Kabel. Bauteile und der Verdrahtungsplan stehen in der Werkbank und in der README im Repo-Wurzelverzeichnis.

## Installieren

Auf dem Raspberry Pi, im Ordner mit diesem Plugin:

```bash
pipx runpip cbpi4 install .
sudo systemctl restart cbpi
```

Der Benutzer von CBPi braucht Zugriff auf die serielle Schnittstelle:

```bash
sudo usermod -aG dialout "$USER"
```

Danach neu anmelden. Den Port findest du mit `ls -l /dev/serial/by-id`.

## Sensor

Hardware → Sensor hinzufügen → Typ **USB Durchflussmesser**.

| Feld | Wert |
| --- | --- |
| Anschluss | Pfad unter `/dev/serial/by-id`, sonst `/dev/ttyUSB0` |
| Impulse pro Liter | kalibrierter Wert, Startwert 450 für einen YF-S201 |
| Anzeige | Volumen (L) |

Dashboard-Widget **Sensor Data**: Sensor wählen, `unit` = `L`, `digits` = `2`, `action` = `yes`. Über das Aktionsmenü setzt du den Zähler vor dem Befüllen zurück.

## Sudschritt

Typ **USB Tank fuellen**. Zielmenge in Liter, dieser Sensor, und optional der Aktor eines Magnetventils. Ohne Aktor wartet der Schritt, bis du von Hand genug Wasser hast laufen lassen. Kommt drei Sekunden kein USB-Signal, wird der Aktor ausgeschaltet.

## Protokoll

115200 Baud, eine JSON-Zeile pro Viertelsekunde:

```text
{"ml":1234,"lpm":6.2,"pulses":555,"ppl":450}
```

Befehle: `RESET`, `CAL 450`, `PING`. Die Firmware liegt unter `firmware/usb_flowmeter/usb_flowmeter.ino` im Projekt.

Lizenz: GPLv3.
