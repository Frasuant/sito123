export type Kind = "bg" | "fx" | "text" | "model" | "audio" | "video";
export type TrackId = Kind;

export interface Keyframe {
  t: number;
  x: number;
  y: number;
  s: number;
  rx: number;
  ry: number;
  rz: number;
}

export interface Lights {
  ambient: number;
  keyIntensity: number;
  keyAngle: number;
  keyElev: number;
  keyColor: string;
  rimColor: string;
  rimIntensity: number;
}

export interface Clip {
  id: string;
  kind: Kind;
  track: Kind;
  refId: string;
  name: string;
  start: number;
  duration: number;
  text?: string;
  preset?: string;
  fontSize?: number;
  color?: string;
  font?: string;
  x?: number;
  y?: number;
  strokeWidth?: number;
  strokeColor?: string;
  chroma?: boolean;
  keyColor?: string;
  tolerance?: number;
  softness?: number;
  elX?: number;
  elY?: number;
  elScale?: number;
  gain?: number;
  kfs?: Keyframe[];
  modelColor?: string;
  wireframe?: boolean;
  lights?: Lights;
  src?: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  kind: "video" | "image" | "model";
  ext: string;
  size: number;
  src: string | null;
  videoDur?: number;
  missing?: boolean;
  aiGreen?: boolean;
  aiKey?: string;
  aiTol?: number;
}

export interface Toast {
  id: number;
  msg: string;
  type: "success" | "error" | "info" | "warn";
}

export const TRACKS: { id: Kind; label: string; color: string }[] = [
  { id: "bg", label: "Sfondi", color: "#8f96a3" },
  { id: "fx", label: "Effetti", color: "#3ddc97" },
  { id: "text", label: "Testo", color: "#e8e8ea" },
  { id: "model", label: "Modelli 3D", color: "#9fb7ff" },
  { id: "audio", label: "Audio", color: "#f2c14e" },
];

export interface StudioState {
  clips: Clip[];
  mediaAssets: MediaAsset[];
  playhead: number;
  playing: boolean;
  loop: boolean;
  zoom: number;
  selectedId: string | null;
  projectDur: number;
  toasts: Toast[];
  lights: Lights;
  eco: boolean;
  fps: number;

  addClip: (c: Omit<Clip, "id">) => string;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  splitClip: (id: string) => void;
  duplicateClip: (id: string) => void;
  upsertKeyframe: (clipId: string, t: number, pose: Partial<Keyframe>) => void;
  select: (id: string | null) => void;
  setPlayhead: (t: number) => void;
  setPlaying: (b: boolean) => void;
  setLoop: (b: boolean) => void;
  toggleLoop: () => void;
  setZoom: (z: number) => void;
  setLights: (patch: Partial<Lights>) => void;
  setEco: (b: boolean) => void;
  setFps: (n: number) => void;
  toast: (msg: string, type?: Toast["type"]) => void;
  dismissToast: (id: number) => void;
  loadDemo: () => void;
  clearProject: () => void;
  saveProject: () => void;
  extendDuration: () => void;
  importFiles: (files: FileList | File[]) => Promise<void>;
  removeMediaAsset: (id: string) => void;
  addAssetToTimeline: (id: string) => void;
  hydrateMedia: () => Promise<void>;
}

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);

export const fmtTime = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const f = Math.floor((t % 1) * 30);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${f.toString().padStart(2, "0")}`;
};

export const hash = (s: string | number) => {
  const str = typeof s === "number" ? s.toString(36) : s;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const fmtTimeShort = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const fmtSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
