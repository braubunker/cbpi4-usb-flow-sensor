export type PartLink = {
  shop: string;
  href: string;
};

export type Part = {
  name: string;
  role: string;
  note: string;
  required: boolean;
  links: PartLink[];
};

export const PARTS: Part[] = [
  {
    name: "YF-S201, G1/2",
    role: "Hall-Sensor für kaltes Wasser",
    note: "1 bis 30 L/min, Startwert 450 Impulse pro Liter. Kunststoff, nicht für kochendes Würze. Drei Adern: rot, schwarz, gelb.",
    required: true,
    links: [
      {
        shop: "Funduino",
        href: "https://funduino.com/products/yf-s201-wasser-durchflusssensor-1-30l-min-g1-2-halleffekt",
      },
      {
        shop: "Otronic",
        href: "https://www.otronic-shop.de/de/water-flow-sensor-yf-s201",
      },
    ],
  },
  {
    name: "Arduino Nano, 5 V",
    role: "Zählt die Impulse und spricht USB",
    note: "ATmega328P mit CH340. Am Pi erscheint er als /dev/ttyUSB0. In der Arduino IDE bei Klonen «ATmega328P (Old Bootloader)» wählen, wenn der Upload scheitert.",
    required: true,
    links: [
      {
        shop: "Galaxus",
        href: "https://www.galaxus.ch/de/s1/product/berrybase-compatible-arduino-nano-with-atmel-mega-328p-process-single-board-computer-kits-33668257",
      },
    ],
  },
  {
    name: "USB-A auf Mini-USB",
    role: "Datenkabel zum Raspberry Pi",
    note: "Der klassische Nano hat eine Mini-USB-Buchse, kein Micro-USB und kein USB-C. Das Kabel muss Daten übertragen, ein reines Ladekabel reicht nicht.",
    required: true,
    links: [
      {
        shop: "Galaxus",
        href: "https://www.galaxus.ch/de/s1/product/delock-usb-a-usb-mini-b-070-m-usb-20-usb-cables-5639018",
      },
    ],
  },
  {
    name: "Jumper, Buchse-Buchse",
    role: "Drei Leitungen zum Sensor",
    note: "Nur nötig, wenn das Sensorkabel keine Dupont-Buchsen hat. Rot, schwarz und gelb helfen beim Zuordnen.",
    required: false,
    links: [
      {
        shop: "Galaxus",
        href: "https://www.galaxus.ch/de/s1/product/purecrea-jumperkabel-cable-prise-electronique-34239672",
      },
    ],
  },
  {
    name: "YF-B1 Edelstahl, G1/2",
    role: "Alternative für heisses Brauwasser",
    note: "Dasselbe Drei-Draht-Signal. Impulszahl steht im Datenblatt, oft um 660 pro Liter, und wird mit dem Messbecher geprüft. Messing geht auch, Edelstahl ist für Trinkwasser die ruhigere Wahl.",
    required: false,
    links: [
      {
        shop: "SmartHomeShop",
        href: "https://smarthomeshop.io/en/products/water-flow-sensor-yf-b1-g1-2-dn15",
      },
    ],
  },
  {
    name: "Zwei Schlauchtüllen G1/2",
    role: "Sensor in den Zulaufschlauch",
    note: "Gewinde und Tüllendurchmesser zum Schlauch passen. Der Pfeil auf dem Sensor zeigt in Fliessrichtung.",
    required: true,
    links: [
      {
        shop: "Galaxus-Suche",
        href: "https://www.galaxus.ch/de/search?q=Schlaucht%C3%BClle%201%2F2",
      },
    ],
  },
];

export const WIRING_ROWS = [
  { wire: "Rot", from: "Sensor VCC", to: "Nano, Stift mit Aufdruck 5V" },
  { wire: "Schwarz", from: "Sensor GND", to: "Nano, Stift mit Aufdruck GND" },
  { wire: "Gelb", from: "Sensor Signal", to: "Nano, Stift mit Aufdruck D2" },
  { wire: "USB", from: "Mini-USB am Nano", to: "USB-Buchse am Raspberry Pi" },
] as const;
