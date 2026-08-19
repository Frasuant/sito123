import type { Clip, Keyframe, Lights } from "../types";
import { clamp, lerp, smooth } from "../types";
import { getBg } from "./backgrounds";
import { getFx, GREEN } from "./effects";
import { getPreset } from "./presets";
import { getSceneManager } from "./three";

/* ---------- keyframe ---------- */

export const poseAt = (clip: Clip, t: number): Keyframe => {
  const kfs = (clip.kfs ?? []).slice().sort((a, b) => a.t - b.t);
  const def: Keyframe = { t: 0, x: 0.5, y: 0.5, s: 0.42, rx: 0.4, ry: 0, rz: 0 };
  if (kfs.length === 0) return def;
  if (t <= kfs[0].t) return kfs[0];
  if (t >= kfs[kfs.length - 1].t) return kfs[kfs.length - 1];
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i + 1];
    if (t >= a.t && t <= b.t) {
      const u = smooth(clamp((t - a.t) / Math.max(0.001, b.t - a.t), 0, 1));
      return {
        t,
        x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), s: lerp(a.s, b.s, u),
        rx: lerp(a.rx, b.rx, u), ry: lerp(a.ry, b.ry, u), rz: lerp(a.rz, b.rz, u),
      };
    }
  }
  return kfs[0];
};

/* ---------- asset cache (video / immagini) ---------- */

const videoCache = new Map<string, HTMLVideoElement>();

export const getVideoEl = (clip: Clip): HTMLVideoElement | null => {
  if (!clip.src) return null;
  let el = videoCache.get(clip.id);
  if (!el || el.src !== clip.src) {
    el = document.createElement("video");
    el.src = clip.src;
    el.muted = false; // Fix: enable audio
    el.loop = true;
    el.playsInline = true;
    el.preload = "auto";
    videoCache.set(clip.id, el);
  }
  return el;
};

export const pauseAllVideos = () => {
  videoCache.forEach(el => {
    el.pause();
    el.currentTime = 0;
  });
};

const imageCache = new Map<string, HTMLImageElement>();

export const getImageEl = (src: string): HTMLImageElement => {
  let el = imageCache.get(src);
  if (!el) {
    el = new Image();
    el.src = src;
    imageCache.set(src, el);
  }
  return el;
};

/* ---------- chroma key ---------- */

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex ?? "#00ff00");
  if (!m) return [0, 255, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
};

const chromaCanvas = document.createElement("canvas");

const drawChromaVideo = (
  ctx: CanvasRenderingContext2D, el: HTMLVideoElement, t: number,
  w: number, h: number, tol: number, soft: number, keyHex: string
) => {
  const vw = el.videoWidth, vh = el.videoHeight;
  if (!vw || !vh) return;
  if (Math.abs(el.currentTime - t) > 0.12) el.currentTime = t % (el.duration || 1);
  const cw = Math.min(640, vw);
  const ch = Math.round((cw / vw) * vh);
  if (chromaCanvas.width !== cw) { chromaCanvas.width = cw; chromaCanvas.height = ch; }
  const cctx = chromaCanvas.getContext("2d", { willReadFrequently: true });
  if (!cctx) return;
  cctx.drawImage(el, 0, 0, cw, ch);
  const img = cctx.getImageData(0, 0, cw, ch);
  const d = img.data;
  const [kr, kg, kb] = hexToRgb(keyHex);
  const tolSq = tol * tol;
  for (let i = 0; i < d.length; i += 4) {
    const dr = d[i] - kr, dg = d[i + 1] - kg, db = d[i + 2] - kb;
    const dist = dr * dr * 0.4 + dg * dg * 0.7 + db * db * 0.4;
    if (dist < tolSq) d[i + 3] = 0;
    else if (dist < tolSq * (1 + soft)) d[i + 3] = Math.round(d[i + 3] * ((dist - tolSq) / (tolSq * soft)));
  }
  cctx.putImageData(img, 0, 0);
  const scale = Math.max(w / vw, h / vh);
  const dw = vw * scale, dh = vh * scale;
  ctx.drawImage(chromaCanvas, (w - dw) / 2, (h - dh) / 2, dw, dh);
};

/* ---------- analisi AI del green screen ---------- */

export const analyzeGreenScreen = (el: HTMLVideoElement): Promise<{ isGreen: boolean; key: string; tolerance: number }> =>
  new Promise((resolve) => {
    const fail = () => resolve({ isGreen: false, key: "#00ff00", tolerance: 90 });
    const timeout = setTimeout(fail, 3500);
    const run = () => {
      clearTimeout(timeout);
      try {
        const vw = el.videoWidth, vh = el.videoHeight;
        if (!vw || !vh) return fail();
        const cw = Math.min(160, vw);
        const ch = Math.round((cw / vw) * vh);
        const cv = document.createElement("canvas");
        cv.width = cw; cv.height = ch;
        const cctx = cv.getContext("2d", { willReadFrequently: true })!;
        cctx.drawImage(el, 0, 0, cw, ch);
        const d = cctx.getImageData(0, 0, cw, ch).data;
        let green = 0, total = 0, sr = 0, sg = 0, sb = 0, varSum = 0;
        for (let i = 0; i < d.length; i += 4) {
          total++;
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if (g > 60 && g - r > 24 && g - b > 24) {
            green++; sr += r; sg += g; sb += b;
          }
        }
        const ratio = green / Math.max(1, total);
        if (ratio < 0.22 || green === 0) return resolve({ isGreen: false, key: "#00ff00", tolerance: 90 });
        const ar = sr / green, ag = sg / green, ab = sb / green;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if (g > 60 && g - r > 24 && g - b > 24) {
            const dist = Math.sqrt(0.4 * (r - ar) ** 2 + 0.7 * (g - ag) ** 2 + 0.4 * (b - ab) ** 2);
            varSum += dist;
          }
        }
        const spread = varSum / green;
        const tol = Math.round(clamp(70 + spread * 2.4, 75, 165));
        const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
        resolve({ isGreen: true, key: `#${toHex(ar)}${toHex(ag)}${toHex(ab)}`, tolerance: tol });
      } catch {
        fail();
      }
    };
    const trySeek = () => {
      el.currentTime = Math.min(0.2, (el.duration || 1) / 2);
      el.onseeked = run;
    };
    if (el.readyState >= 2) trySeek();
    else {
      el.onloadeddata = trySeek;
      el.onerror = fail;
    }
  });

/* ---------- frame compositor ---------- */

export interface FrameState {
  clips: Clip[];
  lights: Lights;
  eco: boolean;
}

export function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, st: FrameState) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0b0b0c";
  ctx.fillRect(0, 0, W, H);

  const active = (c: Clip) => t >= c.start && t < c.start + c.duration;
  const local = (c: Clip) => t - c.start;

  // Sort all clips by track order (higher tracks render on top)
  // Track priority: bg (bottom) < fx < video < text < model (top)
  const trackPriority: Record<string, number> = { bg: 0, fx: 1, video: 2, text: 3, model: 4, audio: -1 };
  
  // Get all active clips sorted by track priority and then by their order in the array
  const allActive = st.clips.filter(active).sort((a, b) => {
    const priorityDiff = (trackPriority[a.track] ?? 0) - (trackPriority[b.track] ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    // If same track, later clips in array render on top
    return st.clips.indexOf(a) - st.clips.indexOf(b);
  });

  // 1. Render background first
  const bgs = allActive.filter((c) => c.track === "bg");
  const bg = bgs[bgs.length - 1];
  if (bg) {
    if (bg.refId.startsWith("img:") && bg.src) {
      const img = getImageEl(bg.src);
      if (img.complete && img.naturalWidth > 0) {
        const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      }
    } else {
      getBg(bg.refId).draw(ctx, local(bg), W, H, st.eco);
    }
  }

  // 2. Render all other clips in order (FX, videos, text, models)
  for (const c of allActive) {
    if (c.track === "bg") continue; // Already rendered
    
    if (c.kind === "fx") {
      const fx = getFx(c.refId);
      const lt = local(c) % fx.cycle;
      const scale = c.elScale ?? 1;
      const cx = (c.elX ?? 0.5) * W;
      const cy = (c.elY ?? 0.5) * H;
      ctx.save();
      if (c.chroma === false) {
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.fillStyle = GREEN;
        ctx.fillRect(-W / 2, -H / 2, W, H);
        ctx.translate(-W / 2, -H / 2);
        fx.draw(ctx, lt, W, H, st.eco);
      } else {
        ctx.translate(cx - (W * scale) / 2, cy - (H * scale) / 2);
        ctx.scale(scale, scale);
        fx.draw(ctx, lt, W, H, st.eco);
      }
      ctx.restore();
    } else if (c.kind === "video") {
      const el = getVideoEl(c);
      if (el && el.readyState >= 2) {
        ctx.save();
        const targetTime = local(c) % (el.duration || 1);
        if (Math.abs(el.currentTime - targetTime) > 0.15) {
          el.currentTime = targetTime;
        }
        if (!st.playing && el.paused === false) {
          el.pause();
        }
        if (c.chroma === false) {
          ctx.fillStyle = GREEN;
          ctx.fillRect(0, 0, W, H);
          const scale = Math.max(W / el.videoWidth, H / el.videoHeight);
          ctx.drawImage(el, (W - el.videoWidth * scale) / 2, (H - el.videoHeight * scale) / 2, el.videoWidth * scale, el.videoHeight * scale);
        } else {
          drawChromaVideo(ctx, el, local(c), W, H, c.tolerance ?? 90, c.softness ?? 2.5, c.keyColor ?? "#00ff00");
        }
        ctx.restore();
        if (st.playing && el.paused) void el.play().catch(() => undefined);
      }
    } else if (c.kind === "text") {
      getPreset(c.preset ?? "popin").draw(ctx, c, local(c), W, H);
    } else if (c.kind === "model") {
      const p = poseAt(c, local(c));
      const isCustom = c.refId.startsWith("custom:");
      if (isCustom && !mgr?.hasCustom(c.refId)) continue;
      const canvas3d = mgr?.render(c.refId, c.modelColor ?? "#c9c9cf", c.wireframe ?? false, p.rx, p.ry + local(c) * 0.3, p.rz, c.lights ?? st.lights);
      if (!canvas3d) continue;
      const size = p.s * H * 2.1;
      ctx.drawImage(canvas3d, p.x * W - size / 2, p.y * H - size / 2, size, size);
    }
  }
}

let mgr: ReturnType<typeof getSceneManager> | null = null;
let loading = false;
const ensureThree = async (eco: boolean) => {
  if (mgr || loading) return;
  loading = true;
  try {
    const mod = await import("./three");
    mgr = mod.getSceneManager(eco);
  } finally {
    loading = false;
  }
};
void ensureThree(false);

/* ---------- export video ---------- */

export interface ExportOpts {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  duration: number;
  state: () => FrameState;
  onProgress: (p: number) => void;
  audioClips: { start: number; duration: number; refId: string; gain: number }[];
  audioEngine: {
    playClips: (clips: { start: number; duration: number; refId: string; gain: number }[], t: number, dest?: AudioNode) => Promise<void>;
    stopAll: () => void;
    createExportDest: () => MediaStreamAudioDestinationNode | null;
    releaseExportDest: (d: MediaStreamAudioDestinationNode) => void;
  };
}

export function startExport(opts: ExportOpts): { done: Promise<Blob | null>; cancel: () => void } {
  let cancelled = false;
  const canvas = document.createElement("canvas");
  canvas.width = opts.width;
  canvas.height = opts.height;
  const ctx = canvas.getContext("2d")!;

  const done = new Promise<Blob | null>((resolve) => {
    const stream = canvas.captureStream(opts.fps);
    const dest = opts.audioClips.length ? opts.audioEngine.createExportDest() : null;
    if (dest) dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: opts.bitrate });
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      if (dest) opts.audioEngine.releaseExportDest(dest);
      opts.audioEngine.stopAll();
      pauseAllVideos();
      resolve(cancelled ? null : new Blob(chunks, { type: "video/webm" }));
    };

    void opts.audioEngine.playClips(opts.audioClips, 0, dest ?? undefined);
    rec.start(250);
    const t0 = performance.now();

    const tick = () => {
      if (cancelled) { rec.stop(); return; }
      const t = (performance.now() - t0) / 1000;
      if (t >= opts.duration) {
        drawFrame(ctx, opts.width, opts.height, opts.duration - 0.001, opts.state());
        opts.onProgress(1);
        setTimeout(() => { rec.stop(); pauseAllVideos(); }, 120);
        return;
      }
      drawFrame(ctx, opts.width, opts.height, t, opts.state());
      opts.onProgress(t / opts.duration);
      requestAnimationFrame(tick);
    };
    tick();
  });

  return { done, cancel: () => { cancelled = true; pauseAllVideos(); } };
}
