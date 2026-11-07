"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pulsesPerLiterFromSample, SENSOR_PRESETS } from "@/lib/flow";
import { PartsList } from "@/components/parts-list";
import { WiringDiagram } from "@/components/wiring-diagram";

type BuildGuideProps = {
  onApplyPpl: (value: number) => void;
};

export function BuildGuide({ onApplyPpl }: BuildGuideProps) {
  const [sampleLiters, setSampleLiters] = useState("1");
  const [samplePulses, setSamplePulses] = useState("450");
  const liters = Number(sampleLiters);
  const pulses = Number(samplePulses);
  const calibrated = pulsesPerLiterFromSample(pulses, liters);
  const calibrationError =
    sampleLiters !== "" && (!Number.isFinite(liters) || liters <= 0)
      ? "Die gemessene Menge muss grösser als 0 sein."
      : null;

  return (
    <Tabs defaultValue="aufbau">
      <TabsList className="h-auto w-full flex-wrap">
        <TabsTrigger value="aufbau">Aufbau</TabsTrigger>
        <TabsTrigger value="kalibrieren">Kalibrieren</TabsTrigger>
        <TabsTrigger value="cbpi">CraftBeerPi</TabsTrigger>
      </TabsList>

      <TabsContent value="aufbau" className="mt-4 flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Verdrahtungsplan</CardTitle>
            <CardDescription>
              Gelb bleibt am Arduino. An den Pi geht nur das USB-Kabel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WiringDiagram />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bauteile</CardTitle>
            <CardDescription>
              Der Pi sieht nur USB. Die Impulse zählt der Arduino. Ein Magnetventil bleibt ein eigener GPIO-Aktor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PartsList />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="kalibrieren" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Impulse pro Liter</CardTitle>
            <CardDescription>
              YF-S201 liegt oft bei 450, die Streuung ist aber gross. Ein Messbecher ist genauer als der Aufdruck.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6">
              <li>Zähler zurücksetzen.</li>
              <li>Eine bekannte Menge in einen Messbecher laufen lassen, am besten 1,000 L.</li>
              <li>Die gezählten Impulse ablesen.</li>
              <li>Impulse durch Liter teilen und runden. Diesen Wert in den Sensor und mit <code>CAL</code> auf den Arduino schreiben.</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              {SENSOR_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSampleLiters("1");
                    setSamplePulses(String(preset.ppl));
                    onApplyPpl(preset.ppl);
                  }}
                >
                  {preset.label}: {preset.ppl}
                </Button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sample-liters">Gemessene Liter</Label>
                <Input
                  id="sample-liters"
                  inputMode="decimal"
                  value={sampleLiters}
                  onChange={(event) => setSampleLiters(event.target.value)}
                  aria-invalid={calibrationError != null}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sample-pulses">Gezählte Impulse</Label>
                <Input
                  id="sample-pulses"
                  inputMode="numeric"
                  value={samplePulses}
                  onChange={(event) => setSamplePulses(event.target.value)}
                />
              </div>
            </div>
            {calibrationError ? (
              <p className="text-sm text-destructive">{calibrationError}</p>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-heading text-3xl tabular-nums">
                  {calibrated} <span className="text-lg text-muted-foreground">Impulse/L</span>
                </p>
                <Button type="button" onClick={() => onApplyPpl(calibrated)} disabled={calibrated < 1}>
                  In die Werkbank übernehmen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="cbpi" className="mt-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Auf dem Raspberry Pi</CardTitle>
              <CardDescription>CBPi liest den Zähler als Sensor vom Typ USB Durchflussmesser.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm leading-6">
              <p>Sketch <code>firmware/usb_flowmeter/usb_flowmeter.ino</code> mit der Arduino IDE auf den Nano laden. Bei CH340-Klonen den Prozessor „ATmega328P (Old Bootloader)“ wählen, falls der Upload scheitert.</p>
              <p>Sensor an 5V, GND und D2 hängen, USB-Kabel in den Pi. Den Port siehst du mit:</p>
              <pre className="overflow-x-auto rounded-lg bg-[#1c1915] px-3 py-3 text-[#f4efe6]">
                <code>ls -l /dev/serial/by-id</code>
              </pre>
              <p>Plugin installieren und CBPi neu starten:</p>
              <pre className="overflow-x-auto rounded-lg bg-[#1c1915] px-3 py-3 text-[#f4efe6]">
                <code>{`pipx runpip cbpi4 install ./cbpi4-usb-flow\nsudo systemctl restart cbpi`}</code>
              </pre>
              <p>Der Benutzer, unter dem CBPi läuft, muss in der Gruppe <code>dialout</code> sein. Danach einmal neu anmelden.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sensor und Dashboard</CardTitle>
              <CardDescription>Die Einheit tippst du im Widget, CBPi hängt sie nicht selbst an.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm leading-6">
              <p>Unter Hardware einen Sensor anlegen. Typ: <strong>USB Durchflussmesser</strong>. Anschluss: der Pfad unter <code>/dev/serial/by-id</code>. Impulse pro Liter: der kalibrierte Wert. Anzeige: Volumen (L).</p>
              <p>Auf dem Dashboard ein Widget <strong>Sensor Data</strong> setzen. Sensor wählen, <code>unit</code> auf <code>L</code>, <code>digits</code> auf <code>2</code>, <code>action</code> auf <code>yes</code>. Über das Aktionsmenü setzt du den Zähler vor dem Befüllen auf null.</p>
              <p>Im Sudbuch gibt es den Schritt <strong>USB Tank fuellen</strong>. Dort die Zielmenge und diesen Sensor wählen. Liegt ein Magnetventil als Aktor auf einem GPIO, trägst du ihn ein. Der Schritt macht den Aktor auf und wieder zu. Ohne Aktor wartet er nur, bis die Menge erreicht ist, und du bedienst den Hahn selbst.</p>
              <p>Bleibt der Wert auf null, zuerst den Anschluss prüfen. CH340-Nanos sind meist <code>/dev/ttyUSB0</code>, ein Leonardo eher <code>/dev/ttyACM0</code>.</p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
