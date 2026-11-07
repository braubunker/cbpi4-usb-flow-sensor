/** Gleiche Rechnung wie in cbpi4_usb_flow/protocol.py und in der Arduino-Firmware. */

export function milliliters(pulses: number, pulsesPerLiter: number): number {
  if (!Number.isFinite(pulses) || !Number.isFinite(pulsesPerLiter) || pulsesPerLiter <= 0) {
    return 0;
  }
  return Math.floor((Math.max(0, pulses) * 1000) / pulsesPerLiter);
}

export function litersPerMinute(
  deltaPulses: number,
  pulsesPerLiter: number,
  windowMs: number,
): number {
  if (pulsesPerLiter <= 0 || windowMs <= 0 || deltaPulses <= 0) {
    return 0;
  }
  return (deltaPulses * 60000) / pulsesPerLiter / windowMs;
}

export function pulsesPerLiterFromSample(pulses: number, liters: number): number {
  if (!Number.isFinite(liters) || liters <= 0 || !Number.isFinite(pulses) || pulses < 0) {
    return 0;
  }
  return Math.max(1, Math.round(pulses / liters));
}

export function serialLine(
  ml: number,
  lpm: number,
  pulses: number,
  pulsesPerLiter: number,
): string {
  const lpmText = (Math.round(lpm * 10) / 10).toFixed(1);
  return `{"ml":${Math.max(0, Math.round(ml))},"lpm":${lpmText},"pulses":${Math.max(0, Math.floor(pulses))},"ppl":${Math.max(1, Math.round(pulsesPerLiter))}}`;
}

export const SENSOR_PRESETS = [
  { id: "yf-s201", label: "YF-S201, 1/2 Zoll", ppl: 450, note: "Üblich für kaltes Wasser, etwa 1 bis 30 L/min." },
  { id: "yf-b1", label: "YF-B1", ppl: 660, note: "Häufiger Startwert. Datenblatt prüfen, dann kalibrieren." },
  { id: "yf-s401", label: "YF-S401, dünner Schlauch", ppl: 5880, note: "Kleine Mengen, etwa 0,3 bis 6 L/min." },
] as const;
