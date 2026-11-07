import { WIRING_ROWS } from "@/lib/parts";

const leftPins = ["D13", "…", "A7", "5V"] as const;
const rightPins = ["D12", "…", "D2", "GND"] as const;

export function WiringDiagram() {
  return (
    <div className="flex flex-col gap-4">
      <svg
        viewBox="0 0 980 520"
        role="img"
        aria-label="Verdrahtungsplan: rotes Sensorkabel an 5V, schwarzes an GND, gelbes an D2. Mini-USB vom Arduino zum Raspberry Pi."
        className="h-auto w-full rounded-xl bg-[#f7f1e6] ring-1 ring-foreground/10"
      >
        <text x="24" y="30" fill="#3f3832" fontSize="18" fontFamily="Georgia, serif">
          Mini-USB zeigt nach oben
        </text>
        <text x="24" y="52" fill="#6d645b" fontSize="13">
          5V links, D2 und das gegenüberliegende GND rechts. Gelb nie an den Pi.
        </text>

        <rect x="24" y="150" width="200" height="210" rx="14" fill="#243026" />
        <text x="40" y="178" fill="#f4efe6" fontSize="16" fontFamily="Georgia, serif">
          Sensor
        </text>
        <path d="M40 198 H120" stroke="#f4efe6" strokeWidth="3" />
        <path d="M108 190 L126 198 L108 206" fill="#f4efe6" />
        <text x="136" y="203" fill="#c9d4c4" fontSize="12">
          Fluss
        </text>

        <text x="40" y="241" fill="#f4efe6" fontSize="14">
          Rot
        </text>
        <circle cx="200" cy="236" r="7" fill="#c4493a" />
        <text x="40" y="291" fill="#f4efe6" fontSize="14">
          Schwarz
        </text>
        <circle cx="170" cy="286" r="7" fill="#1a1a1a" stroke="#f4efe6" />
        <text x="40" y="331" fill="#f4efe6" fontSize="14">
          Gelb
        </text>
        <circle cx="140" cy="326" r="7" fill="#e2b340" />

        <rect x="430" y="78" width="250" height="360" rx="12" fill="#1f4b73" />
        <rect x="508" y="78" width="94" height="22" rx="4" fill="#d7e4ef" />
        <text x="526" y="93" fill="#1f4b73" fontSize="12">
          Mini-USB
        </text>
        <text x="446" y="124" fill="#f4efe6" fontSize="16" fontFamily="Georgia, serif">
          Arduino Nano
        </text>
        <text x="454" y="154" fill="#c5d7e8" fontSize="12">
          links
        </text>
        <text x="590" y="154" fill="#c5d7e8" fontSize="12">
          rechts
        </text>

        {leftPins.map((label, index) => {
          const y = 176 + index * 58;
          const hot = label === "5V";
          return (
            <g key={label}>
              <rect x="446" y={y} width="72" height="40" rx="6" fill={hot ? "#c4493a" : "#17405f"} />
              <text x="482" y={y + 26} textAnchor="middle" fill="#f4efe6" fontSize="15">
                {label}
              </text>
            </g>
          );
        })}
        {rightPins.map((label, index) => {
          const y = 176 + index * 58;
          const fill = label === "D2" ? "#e2b340" : label === "GND" ? "#1c1915" : "#17405f";
          const ink = label === "D2" ? "#1c1915" : "#f4efe6";
          return (
            <g key={label + index}>
              <rect x="586" y={y} width="72" height="40" rx="6" fill={fill} />
              <text x="622" y={y + 26} textAnchor="middle" fill={ink} fontSize="15">
                {label}
              </text>
            </g>
          );
        })}

        {/* Rot an 5V, linke Reihe */}
        <path d="M200 236 H250 V370 H446" fill="none" stroke="#c4493a" strokeWidth="4" />
        {/* Schwarz an GND, unter der Platine in den Stift */}
        <path d="M170 286 V450 H622 V390" fill="none" stroke="#1c1915" strokeWidth="4" />
        {/* Gelb an D2, aussen herum an die rechte Kante */}
        <path d="M140 326 V500 H730 V312 H658" fill="none" stroke="#e2b340" strokeWidth="4" />

        <path d="M602 89 H820 V150" fill="none" stroke="#8d847a" strokeWidth="8" strokeLinecap="round" />
        <rect x="760" y="150" width="196" height="150" rx="16" fill="#6b2a33" />
        <circle cx="858" cy="188" r="16" fill="#f4efe6" />
        <text x="784" y="230" fill="#f4efe6" fontSize="16" fontFamily="Georgia, serif">
          Raspberry Pi
        </text>
        <text x="784" y="254" fill="#f0d0d4" fontSize="13">
          CraftBeerPi 4
        </text>
        <text x="784" y="274" fill="#f0d0d4" fontSize="13">
          USB-Buchse
        </text>
      </svg>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
          <caption className="sr-only">Anschlüsse des Durchflusszählers</caption>
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Leitung</th>
              <th className="py-2 pr-3 font-medium">Von</th>
              <th className="py-2 font-medium">Nach</th>
            </tr>
          </thead>
          <tbody>
            {WIRING_ROWS.map((row) => (
              <tr key={row.wire} className="border-b border-border/70">
                <td className="py-2 pr-3 font-medium">{row.wire}</td>
                <td className="py-2 pr-3">{row.from}</td>
                <td className="py-2">{row.to}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        D2 ist der Interrupt-Eingang im Sketch. Liegt das Gelbe an einem anderen Stift, bleibt der Zähler auf null.
        Vom USB nach unten gezählt ist D2 der 11. Stift der rechten Reihe, GND der 12. direkt darunter, und 5V der
        12. Stift der linken Reihe. Der Sensor zieht nur wenige Milliampere aus dem 5V-Pin. Ein Magnetventil gehört
        nicht an diese drei Drähte, sondern als eigener Aktor an ein Relais auf einem GPIO.
      </p>
    </div>
  );
}
