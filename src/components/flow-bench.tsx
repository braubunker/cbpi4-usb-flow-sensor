"use client";

import { useEffect, useRef, useState } from "react";
import { Droplets, RotateCcw, Usb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { milliliters, serialLine } from "@/lib/flow";
import { TankVisual } from "@/components/tank-visual";

const CAPACITY = 50;
const TICK_MS = 100;
const TIME_SCALE = 15;

type FlowBenchProps = {
  ppl: number;
  onPplChange: (value: number) => void;
};

export function FlowBench({ ppl, onPplChange }: FlowBenchProps) {
  const [target, setTarget] = useState(20);
  const [flowRate, setFlowRate] = useState(8);
  const [tapOpen, setTapOpen] = useState(false);
  const [signal, setSignal] = useState(true);
  const [pulses, setPulses] = useState(0);
  const [stoppedForSignal, setStoppedForSignal] = useState(false);
  const [display, setDisplay] = useState<"volume" | "flow">("volume");

  const pulsesRef = useRef(0);
  const tapRef = useRef(tapOpen);
  const flowRef = useRef(flowRate);
  const signalRef = useRef(signal);
  const pplRef = useRef(ppl);
  const targetRef = useRef(target);

  useEffect(() => {
    tapRef.current = tapOpen;
    flowRef.current = flowRate;
    signalRef.current = signal;
    pplRef.current = ppl;
    targetRef.current = target;
  }, [tapOpen, flowRate, signal, ppl, target]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const litersNow = milliliters(pulsesRef.current, pplRef.current) / 1000;
      if (litersNow >= targetRef.current) {
        setTapOpen(false);
        return;
      }
      if (!tapRef.current || !signalRef.current || flowRef.current <= 0) {
        return;
      }
      const dt = (TICK_MS / 1000) * TIME_SCALE;
      pulsesRef.current += (flowRef.current / 60) * dt * pplRef.current;
      if (milliliters(pulsesRef.current, pplRef.current) / 1000 >= targetRef.current) {
        setTapOpen(false);
      }
      setPulses(pulsesRef.current);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const safePpl = Number.isFinite(ppl) && ppl >= 1 ? Math.round(ppl) : 1;
  const ml = milliliters(pulses, safePpl);
  const liters = ml / 1000;
  const liveFlow = tapOpen && signal && flowRate > 0 ? flowRate : 0;
  const line = serialLine(ml, liveFlow, pulses, safePpl);
  const progress = Math.min(100, target > 0 ? (liters / target) * 100 : 0);
  const reached = liters >= target;

  function reset() {
    pulsesRef.current = 0;
    setPulses(0);
    setStoppedForSignal(false);
    setTapOpen(false);
  }

  function toggleTap() {
    setStoppedForSignal(false);
    setTapOpen((open) => !open);
  }

  function toggleSignal() {
    setSignal((connected) => {
      const next = !connected;
      if (!next) {
        setTapOpen(false);
        setStoppedForSignal(true);
      } else {
        setStoppedForSignal(false);
      }
      return next;
    });
  }

  let status = "Hahn zu. Noch ist nichts durchgelaufen.";
  if (!signal) {
    status = "Kein USB-Signal. Der Zähler bleibt stehen und der Hahn geht zu.";
  } else if (reached && !tapOpen) {
    status = "Zielmenge erreicht. Der Hahn ist zu. Zum Weiterzählen die Zielmenge erhöhen oder den Zähler zurücksetzen.";
  } else if (tapOpen) {
    status = "Wasser läuft. Die grosse Zahl ist der Sensorwert in CraftBeerPi.";
  } else if (liters > 0) {
    status = "Hahn zu. Die bisherige Menge bleibt gespeichert, bis du zurücksetzt.";
  }

  const bigValue = display === "volume" ? liters.toFixed(2) : liveFlow.toFixed(1);
  const bigUnit = display === "volume" ? "L" : "L/min";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <TankVisual liters={liters} capacity={CAPACITY} target={target} />

      <Card className="bg-card/90">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="font-heading text-2xl">Wassermenge</CardTitle>
            <Badge variant="outline">{signal ? "USB verbunden" : "USB getrennt"}</Badge>
            <Badge variant="secondary">Simulation</Badge>
          </div>
          <CardDescription>
            Dieselbe Zeile schickt der Arduino jede Viertelsekunde an CraftBeerPi.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div>
            <p className="font-heading text-6xl tracking-tight text-balance tabular-nums sm:text-7xl">
              {bigValue}
              <span className="ml-2 text-2xl text-muted-foreground">{bigUnit}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
              {status}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Zeitraffer ×{TIME_SCALE}, nur in dieser Werkbank. Der Arduino zählt in Echtzeit.
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width] duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {liters.toFixed(2)} von {target.toFixed(1)} L
              <span className="mx-2">·</span>
              {liveFlow.toFixed(1)} L/min
              <span className="mx-2">·</span>
              {Math.floor(pulses)} Impulse
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={display === "volume" ? "default" : "outline"}
              onClick={() => setDisplay("volume")}
            >
              Anzeige Volumen
            </Button>
            <Button
              type="button"
              variant={display === "flow" ? "default" : "outline"}
              onClick={() => setDisplay("flow")}
            >
              Anzeige Durchfluss
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="target">Zielmenge in Liter</Label>
              <Input
                id="target"
                type="number"
                min={1}
                max={CAPACITY}
                step={0.5}
                value={target}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) {
                    setTarget(Math.min(CAPACITY, Math.max(0.5, next)));
                  }
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ppl">Impulse pro Liter</Label>
              <Input
                id="ppl"
                type="number"
                min={1}
                max={65535}
                step={1}
                value={ppl}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) {
                    onPplChange(Math.min(65535, Math.max(1, Math.round(next))));
                  }
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="flow">Durchfluss am Hahn</Label>
              <span className="text-sm tabular-nums text-muted-foreground">{flowRate.toFixed(1)} L/min</span>
            </div>
            <Slider
              id="flow"
              min={0.5}
              max={25}
              step={0.1}
              value={[flowRate]}
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                setFlowRate(next);
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              className="h-11"
              onClick={toggleTap}
              disabled={!signal || liters >= target}
              aria-pressed={tapOpen}
            >
              <Droplets />
              {tapOpen ? "Hahn schliessen" : "Hahn öffnen"}
            </Button>
            <Button type="button" size="lg" className="h-11" variant="outline" onClick={reset}>
              <RotateCcw />
              Zähler zurücksetzen
            </Button>
            <Button type="button" size="lg" className="h-11" variant="secondary" onClick={toggleSignal} aria-pressed={signal}>
              <Usb />
              {signal ? "USB trennen" : "USB verbinden"}
            </Button>
          </div>

          {stoppedForSignal ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Wie der Sudschritt in CBPi: ohne frische Messwerte bleibt das Ventil zu.
            </p>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-medium">Serielle Zeile</p>
            <pre className="overflow-x-auto rounded-lg bg-[#1c1915] px-3 py-3 text-sm text-[#f4efe6]">
              <code>{line}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
