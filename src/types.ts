export type TrackId = "bg" | "fx" | "text" | "model" | "audio";
export type ClipKind = "bg" | "fx" | "video" | "text" | "model" | "audio";

export interface Keyframe {
  t: number; // secondi, relativo all'inizio della clip
  x: number; // 0..1 (normalizzato sulla larghezza canvas)
  y: number; // 0..1
  s: number; // scala relativa all'altezza canvas
  rx: number;
  ry: number;
  rz: number;
}

export interface Clip {
  id: string;
  kind: ClipKind;
  track: TrackId;
  name: string;
  refId: string;
  start: number;
  duration: number;
  // text
  text?: string;
  preset?: string;
  font?: string;
  fontSize?: number;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  x?: number;
  y?: number;
  // fx
  chroma?: boolean;
  elScale?: number;
  elX?: number;
  elY?: number;
  // uploaded video (green screen personale)
  src?: string;
  tolerance?: number;
  softness?: number;
  // model 3d
  kfs?: Keyframe[];
  modelColor?: string;
  wireframe?: boolean;
  // audio
  gain?: number;
}

export interface Lights {
  ambient: number;
  keyIntensity: number;
  keyColor: string;
  keyAngle: number; // gradi orizzontali
  keyElev: number; // gradi verticali
  rimIntensity: number;
  rimColor: string;
}

export const TRACKS: { id: TrackId; label: string; color: string }[] = [
  { id: "bg", label: "Sfondo", color: "#5aa9ff" },
  { id: "fx", label: "Green Screen / FX", color: "#52d273" },
  { id: "text", label: "Testo", color: "#ff7a1a" },
  { id: "model", label: "Modelli 3D", color: "#e0637c" },
  { id: "audio", label: "Audio", color: "#39d0b8" },
];

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);

/** pseudo-random deterministico 0..1 da un seed intero */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const fmtTime = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const f = Math.floor((t % 1) * 30);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(f).padStart(2, "0")}`;
};

export const fmtTimeShort = (t: number) => {
  const s = Math.floor(t % 60);
  const d = Math.floor((t % 1) * 10);
  return `${s}.${d}s`;
};
