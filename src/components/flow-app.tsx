"use client";

import { useState } from "react";
import { BuildGuide } from "@/components/build-guide";
import { FlowBench } from "@/components/flow-bench";

export function FlowApp() {
  const [ppl, setPpl] = useState(450);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-3xl">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">CraftBeerPi 4</p>
        <h1 className="mt-2 font-heading text-4xl tracking-tight text-balance sm:text-5xl">
          Leitmass, der USB-Zähler für den Tank
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Ein Hall-Sensor im Zulauf zählt Impulse. Ein Arduino Nano rechnet sie in Liter um
          und schickt die Menge über USB an CraftBeerPi. Dort erscheint sie als Sensor,
          zum Beispiel 18,40 L.
        </p>
        <p className="mt-3 text-base leading-7">
          Die Werkbank unten spielt denselben Ablauf durch, ohne Hardware. Hahn öffnen,
          Zielmenge setzen, und die grosse Zahl ist das, was CBPi anzeigen wird.
        </p>
      </header>

      <FlowBench ppl={ppl} onPplChange={setPpl} />
      <BuildGuide onApplyPpl={setPpl} />
    </div>
  );
}
