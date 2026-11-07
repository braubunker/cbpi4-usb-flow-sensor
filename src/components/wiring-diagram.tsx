export function WiringDiagram() {
  return (
    <svg
      viewBox="0 0 640 280"
      role="img"
      aria-label="Verdrahtung: rotes Sensorkabel an 5V, schwarzes an GND, gelbes an D2 des Arduino. USB vom Arduino zum Raspberry Pi."
      className="h-auto w-full rounded-xl bg-[#f7f1e6] ring-1 ring-foreground/10"
    >
      <rect x="36" y="48" width="150" height="184" rx="12" fill="#243026" />
      <text x="54" y="78" fill="#f4efe6" fontSize="16" fontFamily="Georgia, serif">
        Durchflusssensor
      </text>
      <text x="54" y="100" fill="#c9d4c4" fontSize="12">
        Hall, 1/2 Zoll
      </text>
      <circle cx="70" cy="150" r="8" fill="#c4493a" />
      <text x="86" y="154" fill="#f4efe6" fontSize="13">
        Rot, 5 V
      </text>
      <circle cx="70" cy="178" r="8" fill="#1a1a1a" stroke="#f4efe6" />
      <text x="86" y="182" fill="#f4efe6" fontSize="13">
        Schwarz, GND
      </text>
      <circle cx="70" cy="206" r="8" fill="#e2b340" />
      <text x="86" y="210" fill="#f4efe6" fontSize="13">
        Gelb, Signal
      </text>

      <path d="M186 150 H250" stroke="#c4493a" strokeWidth="3" />
      <path d="M186 178 H250" stroke="#2a2a2a" strokeWidth="3" />
      <path d="M186 206 H250" stroke="#e2b340" strokeWidth="3" />

      <rect x="250" y="36" width="170" height="208" rx="10" fill="#1f4b73" />
      <text x="268" y="64" fill="#f4efe6" fontSize="16" fontFamily="Georgia, serif">
        Arduino Nano
      </text>
      <text x="268" y="84" fill="#c5d7e8" fontSize="12">
        5 V, USB-Serial
      </text>
      <text x="268" y="154" fill="#f4efe6" fontSize="13">
        5V
      </text>
      <text x="268" y="182" fill="#f4efe6" fontSize="13">
        GND
      </text>
      <text x="268" y="210" fill="#f4efe6" fontSize="13">
        D2
      </text>
      <rect x="300" y="196" width="92" height="28" rx="6" fill="#0e2a40" />
      <text x="312" y="214" fill="#f4efe6" fontSize="12">
        USB
      </text>

      <path d="M392 210 H470" stroke="#8d847a" strokeWidth="6" strokeLinecap="round" />
      <rect x="470" y="78" width="140" height="150" rx="14" fill="#6b2a33" />
      <circle cx="540" cy="118" r="16" fill="#f4efe6" />
      <text x="496" y="168" fill="#f4efe6" fontSize="15" fontFamily="Georgia, serif">
        Raspberry Pi
      </text>
      <text x="500" y="190" fill="#f0d0d4" fontSize="12">
        CraftBeerPi 4
      </text>
      <text x="508" y="208" fill="#f0d0d4" fontSize="12">
        USB-Buchse
      </text>
    </svg>
  );
}
