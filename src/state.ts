import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Clip, Keyframe, Lights, TrackId } from "./types";
import { clamp, uid } from "./types";
import { getFx } from "./lib/effects";
import { getPreset } from "./lib/presets";
import { SOUND_CATALOG } from "./lib/audio";
import { MODEL_CATALOG } from "./lib/models";

export interface Toast {
  id: string;
  msg: string;
  type: "success" | "info" | "warn" | "danger";
}

interface Studio {
  clips: Clip[];
  selectedId: string | null;
  playhead: number;
  playing: boolean;
  loop: boolean;
  zoom: number;
  projectDur: number;
  eco: boolean;
  lights: Lights;
  toasts: Toast[];

  addClip: (partial: Omit<Clip, "id"> & { id?: string }) => string;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  duplicateClip: (id: string) => void;
  splitClip: (id: string) => void;
  select: (id: string | null) => void;
  setPlayhead: (t: number) => void;
  setPlaying: (b: boolean) => void;
  toggleLoop: () => void;
  setZoom: (z: number) => void;
  extendDuration: () => void;
  setEco: (b: boolean) => void;
  setLights: (patch: Partial<Lights>) => void;
  upsertKeyframe: (id: string, t: number, patch: Partial<Keyframe>) => void;
  removeKeyframe: (id: string, t: number) => void;
  loadDemo: () => void;
  clearProject: () => void;
  toast: (msg: string, type?: Toast["type"]) => void;
  dismissToast: (id: string) => void;
}

export const TRACK_OF: Record<Clip["kind"], TrackId> = {
  bg: "bg", fx: "fx", video: "fx", text: "text", model: "model", audio: "audio",
};

const DEFAULT_LIGHTS: Lights = {
  ambient: 0.5, keyIntensity: 2.4, keyColor: "#ffffff",
  keyAngle: 35, keyElev: 45, rimIntensity: 1.2, rimColor: "#39d0b8",
};

const grow = (dur: number, end: number) => Math.max(dur, Math.ceil(end + 1));

export const useStudio = create<Studio>()(
  persist(
    (set, get) => ({
      clips: [],
      selectedId: null,
      playhead: 0,
      playing: false,
      loop: true,
      zoom: 60,
      projectDur: 12,
      eco: false,
      lights: DEFAULT_LIGHTS,
      toasts: [],

      addClip: (partial) => {
        const id = partial.id ?? uid();
        const clip: Clip = { ...partial, id };
        set((s) => ({
          clips: [...s.clips, clip],
          projectDur: grow(s.projectDur, clip.start + clip.duration),
          selectedId: id,
        }));
        return id;
      },

      updateClip: (id, patch) =>
        set((s) => {
          const clips = s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c));
          const maxEnd = clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
          return { clips, projectDur: Math.max(s.projectDur, Math.ceil(maxEnd + 0.5)) };
        }),

      removeClip: (id) =>
        set((s) => ({
          clips: s.clips.filter((c) => c.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

      duplicateClip: (id) => {
        const c = get().clips.find((x) => x.id === id);
        if (!c) return;
        const copy: Clip = { ...c, id: uid(), start: c.start + c.duration, kfs: c.kfs ? c.kfs.map((k) => ({ ...k })) : undefined };
        set((s) => ({
          clips: [...s.clips, copy],
          selectedId: copy.id,
          projectDur: grow(s.projectDur, copy.start + copy.duration),
        }));
        get().toast("Clip duplicata", "success");
      },

      splitClip: (id) =>
        set((s) => {
          const c = s.clips.find((x) => x.id === id);
          const t = s.playhead;
          if (!c || t <= c.start + 0.05 || t >= c.start + c.duration - 0.05) return {};
          const at = t - c.start;
          const left: Clip = { ...c, duration: at, kfs: c.kfs ? c.kfs.filter((k) => k.t <= at).map((k) => ({ ...k })) : undefined };
          const right: Clip = {
            ...c, id: uid(), start: t, duration: c.duration - at,
            kfs: c.kfs ? c.kfs.filter((k) => k.t >= at).map((k) => ({ ...k, t: k.t - at })) : undefined,
          };
          return { clips: [...s.clips.filter((x) => x.id !== id), left, right], selectedId: right.id };
        }),

      select: (id) => set({ selectedId: id }),
      setPlayhead: (t) => set((s) => ({ playhead: clamp(t, 0, s.projectDur) })),
      setPlaying: (b) => set({ playing: b }),
      toggleLoop: () => set((s) => ({ loop: !s.loop })),
      setZoom: (z) => set({ zoom: clamp(z, 20, 200) }),
      extendDuration: () => set((s) => ({ projectDur: s.projectDur + 5 })),
      setEco: (b) => set({ eco: b }),
      setLights: (patch) => set((s) => ({ lights: { ...s.lights, ...patch } })),

      upsertKeyframe: (id, t, patch) =>
        set((s) => ({
          clips: s.clips.map((c) => {
            if (c.id !== id) return c;
            const kfs = [...(c.kfs ?? [])];
            const idx = kfs.findIndex((k) => Math.abs(k.t - t) < 0.06);
            if (idx >= 0) kfs[idx] = { ...kfs[idx], ...patch, t: kfs[idx].t };
            else kfs.push({ t, x: 0.5, y: 0.5, s: 0.42, rx: 0.4, ry: 0, rz: 0, ...patch });
            kfs.sort((a, b) => a.t - b.t);
            return { ...c, kfs };
          }),
        })),

      removeKeyframe: (id, t) =>
        set((s) => ({
          clips: s.clips.map((c) =>
            c.id === id ? { ...c, kfs: (c.kfs ?? []).filter((k) => Math.abs(k.t - t) > 0.06) } : c
          ),
        })),

      loadDemo: () => {
        const kfs = (arr: [number, number, number, number][]) =>
          arr.map(([t, x, y, s]) => ({ t, x, y, s, rx: 0.5, ry: t * 1.2, rz: 0 }));
        const demo: Clip[] = [
          { id: uid(), kind: "bg", track: "bg", refId: "synthwave", name: "Synthwave Sunset", start: 0, duration: 14 },
          { id: uid(), kind: "text", track: "text", refId: "popin", name: "Titolo Pop", text: "MONTA COSÌ", preset: "popin", font: "Space Grotesk", fontSize: 88, color: "#ffd166", strokeColor: "#10141b", strokeWidth: 6, x: 0.5, y: 0.4, start: 0.4, duration: 2.6 },
          { id: uid(), kind: "audio", track: "audio", refId: "whoosh", name: "Whoosh", start: 0.3, duration: 0.9, gain: 0.8 },
          { id: uid(), kind: "model", track: "model", refId: "crystal", name: "Cristallo", modelColor: "#ffb27a", wireframe: false, start: 0, duration: 14, kfs: kfs([[0, -0.15, 0.62, 0.3], [4, 0.5, 0.6, 0.42], [9, 0.78, 0.35, 0.3], [13.5, 1.15, 0.55, 0.36]]) },
          { id: uid(), kind: "fx", track: "fx", refId: "explosion", name: "Esplosione Bomba", start: 4.2, duration: 2.4, chroma: true, elScale: 1, elX: 0.5, elY: 0.5 },
          { id: uid(), kind: "audio", track: "audio", refId: "boom", name: "Boom Cinematico", start: 4.2, duration: 1.6, gain: 0.9 },
          { id: uid(), kind: "text", track: "text", refId: "typewriter", name: "Typewriter", text: "Video faceless in 5 minuti, senza camera.", preset: "typewriter", font: "Manrope", fontSize: 46, color: "#e6ebf4", strokeColor: "#10141b", strokeWidth: 5, x: 0.5, y: 0.72, start: 6.6, duration: 4.2 },
          { id: uid(), kind: "audio", track: "audio", refId: "keys", name: "Tastiera Typing", start: 6.7, duration: 1.1, gain: 0.5 },
          { id: uid(), kind: "fx", track: "fx", refId: "money", name: "Pioggia di Soldi", start: 10.8, duration: 2.6, chroma: true, elScale: 1, elX: 0.5, elY: 0.5 },
          { id: uid(), kind: "audio", track: "audio", refId: "cash", name: "Cha-Ching", start: 10.9, duration: 0.7, gain: 0.7 },
          { id: uid(), kind: "text", track: "text", refId: "lowerthird", name: "Lower Third", text: "@iltuocanale — segui per altri tips", preset: "lowerthird", font: "Manrope", fontSize: 38, color: "#ff7a1a", x: 0.5, y: 0.88, start: 10.2, duration: 3.8 },
        ];
        set({ clips: demo, playhead: 0, playing: false, projectDur: 15, selectedId: null });
        get().toast("Progetto demo caricato — premi Riproduci", "success");
      },

      clearProject: () => set({ clips: [], selectedId: null, playhead: 0, playing: false, projectDur: 12 }),

      toast: (msg, type = "info") => {
        const id = uid();
        set((s) => ({ toasts: [...s.toasts.slice(-3), { id, msg, type }] }));
        setTimeout(() => get().dismissToast(id), 3400);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: "moviola-studio-v1",
      partialize: (s) => ({
        clips: s.clips.filter((c) => c.kind !== "video").map((c) => ({ ...c, src: undefined })),
        lights: s.lights,
        projectDur: s.projectDur,
        zoom: s.zoom,
        loop: s.loop,
        eco: s.eco,
      }),
    }
  )
);

/* helper per i pannelli: crea clip pronte */

export const useAddFromLibrary = () => {
  return {
    addPreset(presetId: string) {
      const { addClip, toast, playhead } = useStudio.getState();
      const p = getPreset(presetId);
      addClip({
        kind: "text", track: "text", refId: p.id, name: p.name, start: playhead, duration: p.dur,
        text: p.id === "lowerthird" ? "@iltuocanale" : p.sample.toUpperCase(), preset: p.id,
        font: "Space Grotesk", fontSize: p.id === "lowerthird" ? 40 : 68,
        color: p.css.color, strokeColor: "#10141b", strokeWidth: 5, x: 0.5, y: p.id === "lowerthird" ? 0.86 : 0.45,
      });
      toast(`Preset "${p.name}" aggiunto`, "success");
    },
    addSound(soundId: string) {
      const { addClip, toast, playhead } = useStudio.getState();
      const s = SOUND_CATALOG.find((x) => x.id === soundId)!;
      addClip({ kind: "audio", track: "audio", refId: s.id, name: s.name, start: playhead, duration: s.dur, gain: 0.8 });
      toast(`"${s.name}" importato in timeline`, "success");
    },
    addFx(fxId: string) {
      const { addClip, toast, playhead } = useStudio.getState();
      const f = getFx(fxId);
      addClip({ kind: "fx", track: "fx", refId: f.id, name: f.name, start: playhead, duration: f.dur, chroma: true, elScale: 1, elX: 0.5, elY: 0.5 });
      toast(`Green screen "${f.name}" aggiunto (chroma ON)`, "success");
    },
    addBg(bgId: string, name: string) {
      const { addClip, toast, playhead, projectDur } = useStudio.getState();
      const dur = Math.max(4, projectDur - playhead);
      addClip({ kind: "bg", track: "bg", refId: bgId, name, start: playhead, duration: dur });
      toast(`Sfondo "${name}" aggiunto`, "success");
    },
    addModel(modelId: string) {
      const { addClip, toast, playhead } = useStudio.getState();
      const m = MODEL_CATALOG.find((x) => x.id === modelId)!;
      const colors: Record<string, string> = { crystal: "#ffb27a", knot: "#39d0b8", gem: "#e0637c", cube: "#5aa9ff", pyramid: "#ffd166", sphere: "#b7c0d0", torus: "#52d273", dodeca: "#ff9548" };
      addClip({
        kind: "model", track: "model", refId: m.id, name: m.name, start: playhead, duration: 6,
        modelColor: colors[m.id] ?? "#ffb27a", wireframe: false,
        kfs: [
          { t: 0, x: -0.12, y: 0.55, s: 0.34, rx: 0.4, ry: 0, rz: 0 },
          { t: 3, x: 0.5, y: 0.5, s: 0.46, rx: 0.4, ry: 2.4, rz: 0 },
          { t: 6, x: 1.12, y: 0.45, s: 0.34, rx: 0.6, ry: 5, rz: 0 },
        ],
      });
      toast(`Modello "${m.name}" in scena — keyframe pronti`, "success");
    },
    jump(t: number) { useStudio.getState().setPlayhead(t); },
  };
};
