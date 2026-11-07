type TankVisualProps = {
  liters: number;
  capacity: number;
  target: number;
};

export function TankVisual({ liters, capacity, target }: TankVisualProps) {
  const level = Math.min(1, Math.max(0, liters / capacity));
  const targetLevel = Math.min(1, Math.max(0, target / capacity));
  const innerTop = 48;
  const innerHeight = 300;
  const waterHeight = innerHeight * level;
  const waterY = innerTop + innerHeight - waterHeight;
  const targetY = innerTop + innerHeight - innerHeight * targetLevel;

  return (
    <figure className="mx-auto w-full max-w-[240px]">
      <svg
        viewBox="0 0 220 400"
        role="img"
        aria-label={`Tank mit ${liters.toFixed(2)} von ${capacity} Litern. Zielmarke bei ${target.toFixed(1)} Litern.`}
        className="h-auto w-full"
      >
        <defs>
          <linearGradient id="shell" x1="0" x2="1">
            <stop offset="0" stopColor="#d9d1c5" />
            <stop offset="0.45" stopColor="#f7f3ec" />
            <stop offset="1" stopColor="#b7aea2" />
          </linearGradient>
          <linearGradient id="water" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#8ec7de" />
            <stop offset="1" stopColor="#2f6f8f" />
          </linearGradient>
          <clipPath id="tank-inner">
            <rect x="46" y={innerTop} width="128" height={innerHeight} rx="10" />
          </clipPath>
        </defs>

        <rect x="36" y="28" width="148" height="336" rx="22" fill="url(#shell)" />
        <rect x="46" y={innerTop} width="128" height={innerHeight} rx="10" fill="#1c1915" />

        <g clipPath="url(#tank-inner)">
          <rect x="46" y={waterY} width="128" height={waterHeight} fill="url(#water)" />
          {waterHeight > 6 ? (
            <ellipse cx="110" cy={waterY} rx="64" ry="7" fill="#d7eef6" opacity="0.85" />
          ) : null}
        </g>

        <line
          x1="42"
          x2="178"
          y1={targetY}
          y2={targetY}
          stroke="#c46b3a"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <text x="182" y={targetY + 4} fill="#8a4b28" fontSize="11">
          Ziel
        </text>

        {[0, 10, 20, 30, 40, 50].map((mark) => {
          const y = innerTop + innerHeight - (mark / capacity) * innerHeight;
          return (
            <g key={mark}>
              <line x1="28" x2="42" y1={y} y2={y} stroke="#6d645b" strokeWidth="1.5" />
              <text x="4" y={y + 4} fill="#6d645b" fontSize="11">
                {mark}
              </text>
            </g>
          );
        })}

        <rect x="78" y="14" width="64" height="18" rx="4" fill="#8d847a" />
        <rect x="98" y="6" width="24" height="12" rx="3" fill="#5e574f" />
      </svg>
      <figcaption className="text-center text-sm text-muted-foreground">
        Tank {capacity} L, Marke bei {target.toFixed(1)} L
      </figcaption>
    </figure>
  );
}
