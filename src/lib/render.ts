import type { Clip, Keyframe, Lights } from "../types";
import { clamp, lerp, smooth } from "../types";
import { getBg } from "./backgrounds";
import { getFx, GREEN } from "./effects";
import { getPreset } from "./presets";
import type { SceneManager } from "./three";

/* three.js viene caricato in un chunk separato, solo quando serve un modello 3D */
let mgr: SceneManager | null = null;
let mgrPromise: Promise<SceneManager> | null = null;
const ensureThree = (eco: boolean) => {
  if (!mgrPromise) {
    mgrPromise = import("./three").then((m) => {
      mgr = m.getSceneManager(eco);
      return mgr;
    });
  }
  return mgrPromise;
};

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

/* ---------- video uploadati (green screen personali) ---------- */

const videoCache = new Map<string, HTMLVideoElement>();

export const getVideoEl = (clip: Clip): HTMLVideoElement | null => {
  if (!clip.src) return null;
  let el = videoCache.get(clip.id);
  if (!el) {
    el = document.createElement("video");
    el.src = clip.src;
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.preload = "auto";
    videoCache.set(clip.id, el);
  }
  return el;
};

const chromaCanvas = document.createElement("canvas");

const drawChromaVideo = (ctx: CanvasRenderingContext2D, el: HTMLVideoElement, t: number, w: number, h: number, tol: number, soft: number) => {
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
  const tolSq = tol * tol;
  for (let i = 0; i < d.length; i += 4) {
    const dr = d[i] - 0, dg = d[i + 1] - 255, db = d[i + 2] - 0;
    const dist = dr * dr * 0.4 + dg * dg * 0.7 + db * db * 0.4;
    if (dist < tolSq) d[i + 3] = 0;
    else if (dist < tolSq * (1 + soft)) d[i + 3] = Math.round(d[i + 3] * ((dist - tolSq) / (tolSq * soft)));
  }
  cctx.putImageData(img, 0, 0);
  // cover fit
  const scale = Math.max(w / vw, h / vh);
  const dw = vw * scale, dh = vh * scale;
  ctx.drawImage(chromaCanvas, (w - dw) / 2, (h - dh) / 2, dw, dh);
};

/* ---------- frame compositor ---------- */

export interface FrameState {
  clips: Clip[];
  lights: Lights;
  eco: boolean;
}

export function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, st: FrameState) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0c0f14";
  ctx.fillRect(0, 0, W, H);

  const active = (c: Clip) => t >= c.start && t < c.start + c.duration;
  const local = (c: Clip) => t - c.start;

  // 1. sfondi (ultimo attivo vince)
  const bgs = st.clips.filter((c) => c.track === "bg" && active(c));
  const bg = bgs[bgs.length - 1];
  if (bg) getBg(bg.refId).draw(ctx, local(bg), W, H, st.eco);

  // 2. effetti / video green screen
  for (const c of st.clips) {
    if (!active(c)) continue;
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
        if (c.chroma === false) {
          ctx.fillStyle = GREEN;
          ctx.fillRect(0, 0, W, H);
          const scale = Math.max(W / el.videoWidth, H / el.videoHeight);
          ctx.drawImage(el, (W - el.videoWidth * scale) / 2, (H - el.videoHeight * scale) / 2, el.videoWidth * scale, el.videoHeight * scale);
        } else {
          drawChromaVideo(ctx, el, local(c), W, H, c.tolerance ?? 90, c.softness ?? 2.5);
        }
        ctx.restore();
        if (el.paused) void el.play().catch(() => undefined);
      }
    }
  }

  // 3. testi con preset motion
  for (const c of st.clips) {
    if (c.kind === "text" && active(c)) {
      getPreset(c.preset ?? "popin").draw(ctx, c, local(c), W, H);
    }
  }

  // 4. modelli 3D
  const models = st.clips.filter((c) => c.kind === "model" && active(c));
  if (models.length) {
    if (!mgr) { void ensureThree(st.eco); return; }
    for (const c of models) {
      const p = poseAt(c, local(c));
      const canvas3d = mgr.render(c.refId, c.modelColor ?? "#ffb27a", c.wireframe ?? false, p.rx, p.ry + local(c) * 0.3, p.rz, st.lights);
      const size = p.s * H * 2.1;
      ctx.drawImage(canvas3d, p.x * W - size / 2, p.y * H - size / 2, size, size);
    }
  }
}

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
        setTimeout(() => rec.stop(), 120);
        return;
      }
      drawFrame(ctx, opts.width, opts.height, t, opts.state());
      opts.onProgress(t / opts.duration);
      requestAnimationFrame(tick);
    };
    tick();
  });

  return { done, cancel: () => { cancelled = true; } };
}
