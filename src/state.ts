import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Clip, Keyframe, Lights, MediaAsset, StudioState, TrackId } from "./types";
import { uid, clamp } from "./types";
import { MODEL_CATALOG } from "./lib/models";
import { analyzeGreenScreen, poseAt } from "./lib/render";
import { getPreset } from "./lib/presets";
import { idbPut, idbGet, idbDel } from "./lib/idb";

const PROJECTS_KEY = "after-imam-projects";

let toastSeq = 1;

const VIDEO_EXT = ["mp4", "webm", "mov", "m4v", "mkv"];
const MODEL_EXT = ["glb", "gltf", "obj"];
const IMAGE_EXT = ["png", "jpg", "jpeg", "webp"];
const MAX_SIZE = 80 * 1024 * 1024;

const mimeFor = (a: MediaAsset) => {
  if (a.kind === "video") {
    const map: Record<string, string> = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska" };
    return map[a.ext] ?? "video/mp4";
  }
  if (a.kind === "image") {
    const map: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
    return map[a.ext] ?? "image/png";
  }
  return "application/octet-stream";
};

const cleanName = (f: string) => f.replace(/\.[^.]+$/, "");

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      clips: [],
      mediaAssets: [],
      playhead: 0,
      playing: false,
      loop: true,
      zoom: 60,
      selectedId: null,
      projectDur: 15,
      toasts: [],
      eco: false,
      fps: 0,
      lights: {
        ambient: 0.5, keyIntensity: 2.4, keyAngle: 35, keyElev: 40,
        keyColor: "#ffffff", rimColor: "#3bd6ae", rimIntensity: 1.2,
      },

      addClip: (c) => {
        const id = uid();
        const clip: Clip = { id, ...c };
        const s = get();
        set({
          clips: [...s.clips, clip],
          selectedId: id,
          projectDur: Math.max(s.projectDur, Math.ceil(clip.start + clip.duration + 2)),
        });
        return id;
      },

      updateClip: (id, patch) =>
        set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      removeClip: (id) =>
        set((s) => ({
          clips: s.clips.filter((c) => c.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

      splitClip: (id) => {
        const s = get();
        const c = s.clips.find((x) => x.id === id);
        if (!c) return;
        const t = s.playhead;
        if (t <= c.start + 0.05 || t >= c.start + c.duration - 0.05) return;
        const cut = t - c.start;
        const right: Clip = {
          ...c, id: uid(), start: t, duration: c.duration - cut,
          kfs: c.kfs?.filter((k) => k.t >= cut).map((k) => ({ ...k, t: k.t - cut })),
        };
        set({ clips: [...s.clips.map((x) => (x.id === id ? { ...x, duration: cut } : x)), right] });
        get().toast("Clip divisa", "info");
      },

      duplicateClip: (id) => {
        const s = get();
        const c = s.clips.find((x) => x.id === id);
        if (!c) return;
        const copy: Clip = { ...c, id: uid(), start: c.start + c.duration };
        set({
          clips: [...s.clips, copy],
          selectedId: copy.id,
          projectDur: Math.max(s.projectDur, Math.ceil(copy.start + copy.duration + 2)),
        });
        get().toast("Clip duplicata", "success");
      },

      upsertKeyframe: (clipId, t, pose) => {
        const s = get();
        const c = s.clips.find((x) => x.id === clipId);
        if (!c) return;
        const base = poseAt(c, t);
        const kf: Keyframe = { ...base, ...pose, t };
        const kfs = (c.kfs ?? []).filter((k) => Math.abs(k.t - t) > 0.06);
        kfs.push(kf);
        kfs.sort((a, b) => a.t - b.t);
        set({ clips: s.clips.map((x) => (x.id === clipId ? { ...x, kfs } : x)) });
      },

      select: (id) => set({ selectedId: id }),
      setPlayhead: (t) => set({ playhead: clamp(t, 0, get().projectDur) }),
      setPlaying: (b) => set({ playing: b }),
      setLoop: (b) => set({ loop: b }),
      toggleLoop: () => set((s) => ({ loop: !s.loop })),
      setZoom: (z) => set({ zoom: z }),
      setLights: (patch) => set((s) => ({ lights: { ...s.lights, ...patch } })),
      setEco: (b) => set({ eco: b }),
      setFps: (n) => set({ fps: n }),

      toast: (msg, type = "info") => {
        const id = toastSeq++;
        set((s) => ({ toasts: [...s.toasts.slice(-3), { id, msg, type }] }));
        setTimeout(() => get().dismissToast(id), 3400);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      extendDuration: () => set((s) => ({ projectDur: s.projectDur + 5 })),

      /* ---------------- media import ---------------- */

      importFiles: async (files) => {
        const list = Array.from(files);
        if (!list.length) return;
        for (const f of list) {
          const ext = (f.name.split(".").pop() ?? "").toLowerCase();
          const name = cleanName(f.name);
          if (f.size > MAX_SIZE) {
            get().toast(`"${name}" supera il limite di 80 MB`, "error");
            continue;
          }

          /* modello 3D */
          if (MODEL_EXT.includes(ext)) {
            const id = uid();
            const src = URL.createObjectURL(f);
            const { getSceneManager } = await import("./lib/three");
            const ok = await getSceneManager(get().eco).loadCustom(`custom:${id}`, src, ext);
            if (!ok) {
              get().toast(`"${name}": file 3D non valido (usa .glb, .gltf o .obj)`, "error");
              continue;
            }
            try { await idbPut(id, await f.arrayBuffer()); } catch { /* quota */ }
            const asset: MediaAsset = { id, name, kind: "model", ext, size: f.size, src };
            set((s) => ({ mediaAssets: [...s.mediaAssets, asset] }));
            get().addClip({
              kind: "model", track: "model", refId: `custom:${id}`, name,
              start: get().playhead, duration: 6, elX: 0.5, elY: 0.5, elScale: 1,
              wireframe: false, lights: { ...get().lights },
            });
            get().toast(`Modello "${name}" in scena — trascinalo per creare keyframe`, "success");
            continue;
          }

          /* video (con rimozione AI del green screen) */
          if (VIDEO_EXT.includes(ext) || f.type.startsWith("video/")) {
            const id = uid();
            const src = URL.createObjectURL(f);
            const dur = await new Promise<number>((res) => {
              const el = document.createElement("video");
              el.src = src; el.preload = "metadata"; el.muted = true;
              el.onloadedmetadata = () => res(el.duration || 4);
              el.onerror = () => res(4);
              setTimeout(() => res(4), 3000);
            });
            try { await idbPut(id, await f.arrayBuffer()); } catch { /* quota */ }
            const asset: MediaAsset = { id, name, kind: "video", ext, size: f.size, src, videoDur: dur };
            set((s) => ({ mediaAssets: [...s.mediaAssets, asset] }));
            const clipId = get().addClip({
              kind: "video", track: "fx", refId: id, src, name,
              start: get().playhead, duration: Math.min(Math.max(dur, 1), 6),
              chroma: false, keyColor: "#00ff00", tolerance: 90, softness: 2.6,
              elX: 0.5, elY: 0.5, elScale: 1,
            });
            get().toast(`AI: analisi di "${name}" in corso…`, "info");
            const vel = document.createElement("video");
            vel.src = src; vel.muted = true; vel.playsInline = true; vel.preload = "auto";
            const ai = await analyzeGreenScreen(vel);
            set((s) => ({
              mediaAssets: s.mediaAssets.map((a) =>
                a.id === id ? { ...a, aiGreen: ai.isGreen, aiKey: ai.key, aiTol: ai.tolerance } : a
              ),
            }));
            if (ai.isGreen) {
              get().updateClip(clipId, { chroma: true, keyColor: ai.key, tolerance: ai.tolerance, softness: 2.6 });
              get().toast(`AI: green screen rimosso da "${name}"`, "success");
            } else {
              get().toast(`AI: nessun green screen rilevato in "${name}"`, "info");
            }
            continue;
          }

          /* immagine → sfondo */
          if (IMAGE_EXT.includes(ext) || f.type.startsWith("image/")) {
            const id = uid();
            const src = URL.createObjectURL(f);
            try { await idbPut(id, await f.arrayBuffer()); } catch { /* quota */ }
            const asset: MediaAsset = { id, name, kind: "image", ext, size: f.size, src };
            set((s) => ({ mediaAssets: [...s.mediaAssets, asset] }));
            get().addClip({
              kind: "bg", track: "bg", refId: `img:${id}`, src, name,
              start: get().playhead, duration: 5,
            });
            get().toast(`Immagine "${name}" aggiunta come sfondo`, "success");
            continue;
          }

          get().toast(`Formato ".${ext}" non supportato`, "error");
        }
      },

      removeMediaAsset: (id) => {
        void idbDel(id).catch(() => undefined);
        set((s) => ({
          mediaAssets: s.mediaAssets.filter((a) => a.id !== id),
          clips: s.clips.filter((c) =>
            !(c.refId === id || c.refId === `img:${id}` || c.refId === `custom:${id}`)
          ),
        }));
        get().toast("Media rimosso dalla libreria", "info");
      },

      addAssetToTimeline: (id) => {
        const a = get().mediaAssets.find((x) => x.id === id);
        if (!a) return;
        if (!a.src) { get().toast("File non disponibile — reimportalo", "error"); return; }
        if (a.kind === "model") {
          get().addClip({
            kind: "model", track: "model", refId: `custom:${id}`, name: a.name,
            start: get().playhead, duration: 6, elX: 0.5, elY: 0.5, elScale: 1,
            wireframe: false, lights: { ...get().lights },
          });
        } else if (a.kind === "video") {
          get().addClip({
            kind: "video", track: "fx", refId: id, src: a.src, name: a.name,
            start: get().playhead, duration: Math.min(Math.max(a.videoDur ?? 4, 1), 6),
            chroma: a.aiGreen ?? true, keyColor: a.aiKey ?? "#00ff00", tolerance: a.aiTol ?? 90, softness: 2.6,
            elX: 0.5, elY: 0.5, elScale: 1,
          });
        } else {
          get().addClip({
            kind: "bg", track: "bg", refId: `img:${id}`, src: a.src, name: a.name,
            start: get().playhead, duration: 5,
          });
        }
        get().toast(`"${a.name}" aggiunto al playhead`, "success");
      },

      /* ripristina gli object-URL da IndexedDB dopo il reload */
      hydrateMedia: async () => {
        if (hydrated) return;
        hydrated = true;
        const assets = get().mediaAssets;
        if (!assets.length) return;
        let missing = 0;
        const updated: MediaAsset[] = [];
        for (const a of assets) {
          try {
            const buf = await idbGet(a.id);
            if (!buf) { updated.push({ ...a, src: null, missing: true }); missing++; continue; }
            const src = URL.createObjectURL(new Blob([buf], { type: mimeFor(a) }));
            if (a.kind === "model") {
              const { getSceneManager } = await import("./lib/three");
              const ok = await getSceneManager(get().eco).loadCustom(`custom:${a.id}`, src, a.ext);
              if (!ok) { updated.push({ ...a, src: null, missing: true }); missing++; continue; }
            }
            updated.push({ ...a, src });
          } catch {
            updated.push({ ...a, src: null, missing: true });
            missing++;
          }
        }
        const patched = get().clips.map((c) => {
          if (c.kind === "video") {
            const a = updated.find((x) => x.id === c.refId);
            if (a?.src) return { ...c, src: a.src };
          }
          if (c.kind === "bg" && c.refId.startsWith("img:")) {
            const a = updated.find((x) => x.id === c.refId.slice(4));
            if (a?.src) return { ...c, src: a.src };
          }
          return c;
        });
        set({ mediaAssets: updated, clips: patched });
        if (missing) get().toast(`${missing} file non trovati nel browser: reimportali dalla tab Media`, "info");
      },

      loadDemo: () => {
        const L = get().lights;
        const clips: Clip[] = [
          { id: uid(), kind: "bg", track: "bg", refId: "neon", name: "Neon Tunnel", start: 0, duration: 15 },
          {
            id: uid(), kind: "model", track: "model", refId: "crystal", name: "Cristallo 3D",
            start: 0, duration: 15, elX: 0.5, elY: 0.5, elScale: 1, modelColor: "#c9c9cf", wireframe: false,
            lights: { ...L, rimColor: "#3bd6ae" },
            kfs: [
              { t: 0, x: 0.5, y: 0.55, s: 0.5, rx: 0.5, ry: 0, rz: 0 },
              { t: 3, x: 0.74, y: 0.42, s: 0.38, rx: 1.1, ry: 2.2, rz: 0.2 },
              { t: 6, x: 0.28, y: 0.5, s: 0.62, rx: 0.2, ry: 4.4, rz: -0.15 },
              { t: 10, x: 0.5, y: 0.55, s: 0.5, rx: 0.5, ry: 6.6, rz: 0 },
            ],
          },
          { id: uid(), kind: "fx", track: "fx", refId: "explosion", name: "Esplosione", start: 6.4, duration: 2.2, chroma: true, elX: 0.28, elY: 0.5, elScale: 1.1 },
          {
            id: uid(), kind: "text", track: "text", refId: "txt", name: "Titolo",
            start: 1, duration: 4, text: "IL TUO VIDEO", preset: "slideup",
            x: 0.5, y: 0.22, fontSize: 9, color: "#f5f5f5", font: "Space Grotesk", strokeWidth: 0, strokeColor: "#000000",
          },
          {
            id: uid(), kind: "text", track: "text", refId: "txt", name: "Sottotitolo",
            start: 7, duration: 3.5, text: "Moviola Studio", preset: "typewriter",
            x: 0.5, y: 0.78, fontSize: 4.5, color: "#eaeaed", font: "Manrope", strokeWidth: 0, strokeColor: "#000000",
          },
          { id: uid(), kind: "audio", track: "audio", refId: "boom", name: "Boom Cinematico", start: 6.4, duration: 1.6, gain: 0.9 },
          { id: uid(), kind: "audio", track: "audio", refId: "ariaUp", name: "Aria Su (Swish)", start: 0.95, duration: 0.55, gain: 0.6 },
          { id: uid(), kind: "audio", track: "audio", refId: "beat", name: "Beat Lo-Fi", start: 2, duration: 8, gain: 0.4 },
        ];
        set({ clips, playhead: 0, selectedId: null, projectDur: 15, playing: false });
        get().toast("Progetto demo caricato — premi Spazio", "success");
      },

      clearProject: () =>
        set({ clips: [], playhead: 0, selectedId: null, projectDur: 15, playing: false }),

      saveProject: () => {
        const s = get();
        const currentProject = {
          id: "current",
          name: "Progetto Corrente",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          clips: [...s.clips],
          projectDur: s.projectDur,
        };
        try {
          const stored = localStorage.getItem(PROJECTS_KEY);
          const projects: any[] = stored ? JSON.parse(stored) : [];
          const updated = projects.filter(p => p.id !== "current");
          updated.push(currentProject);
          localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
        } catch (e) {
          console.error("Save project error:", e);
        }
      },
    }),
    {
      name: "moviola-studio-v2",
      partialize: (s) => ({
        clips: s.clips,
        mediaAssets: s.mediaAssets.map((a) => ({ ...a, src: null })),
        lights: s.lights,
        zoom: s.zoom,
        projectDur: s.projectDur,
        loop: s.loop,
        eco: s.eco,
      }),
    }
  )
);

let hydrated = false;

/* helper per i pannelli */
export const useAddFromLibrary = () => {
  return {
    addPreset(presetId: string) {
      const { addClip, toast, playhead } = useStudio.getState();
      const p = getPreset(presetId);
      addClip({
        kind: "text", track: "text", refId: "txt", name: p.name,
        start: playhead, duration: 3,
        text: "IL TUO TITOLO", preset: presetId, x: 0.5, y: 0.45,
        fontSize: 8, color: "#f5f5f5", font: "Space Grotesk", strokeWidth: 0, strokeColor: "#000000",
      });
      toast(`Testo "${p.name}" aggiunto al playhead`, "success");
    },
    addSound(soundId: string, name: string, dur: number) {
      const { addClip, toast, playhead } = useStudio.getState();
      addClip({ kind: "audio", track: "audio", refId: soundId, name, start: playhead, duration: dur, gain: 0.8 });
      toast(`"${name}" aggiunto in timeline`, "success");
    },
    addFx(fxId: string, name: string, cycle: number) {
      const { addClip, toast, playhead } = useStudio.getState();
      addClip({
        kind: "fx", track: "fx", refId: fxId, name, start: playhead,
        duration: cycle, chroma: true, elX: 0.5, elY: 0.5, elScale: 1,
      });
      toast(`"${name}" aggiunto — green screen attivo`, "success");
    },
    addBg(bgId: string, name: string) {
      const { addClip, toast, playhead } = useStudio.getState();
      addClip({ kind: "bg", track: "bg", refId: bgId, name, start: playhead, duration: 6 });
      toast(`Sfondo "${name}" aggiunto`, "success");
    },
    addModel(modelId: string) {
      const { addClip, toast, playhead, lights } = useStudio.getState();
      const m = MODEL_CATALOG.find((x) => x.id === modelId)!;
      addClip({
        kind: "model", track: "model", refId: modelId, name: m.name,
        start: playhead, duration: 6, elX: 0.5, elY: 0.5, elScale: 1,
        modelColor: "#c9c9cf", wireframe: false, lights: { ...lights },
      });
      toast(`Modello "${m.name}" in scena — trascinalo per creare keyframe`, "success");
    },
    jump(t: number) { useStudio.getState().setPlayhead(t); },
  };
};

export type { TrackId };
