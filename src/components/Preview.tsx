import { useEffect, useRef, useState } from "react";
import { useStudio } from "../state";
import { drawFrame, poseAt } from "../lib/render";
import { audioEngine } from "../lib/audio";
import { clamp } from "../types";
import { Icon } from "./ui";

export const Preview = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [fps, setFps] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ id: string; kind: string } | null>(null);
  const scrubRef = useRef(false);

  const RES_W = () => (useStudio.getState().eco ? 854 : 1280);
  const RES_H = () => (useStudio.getState().eco ? 480 : 720);

  /* ---------- loop di rendering + playback ---------- */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let fpsT = last;

    const loop = () => {
      const s = useStudio.getState();
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;

      if (s.playing) {
        let t = s.playhead + dt;
        if (t >= s.projectDur) {
          if (s.loop) {
            t = t % s.projectDur;
            const audioClips = s.clips.filter((c) => c.kind === "audio").map((c) => ({ start: c.start, duration: c.duration, refId: c.refId, gain: c.gain ?? 0.8 }));
            void audioEngine.playClips(audioClips, t);
          } else {
            t = s.projectDur;
            s.setPlaying(false);
          }
        }
        s.setPlayhead(t);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const W = RES_W();
        if (canvas.width !== W) { canvas.width = W; canvas.height = RES_H(); }
        drawFrame(ctx, canvas.width, canvas.height, s.playhead, { clips: s.clips, lights: s.lights, eco: s.eco });
      }

      frames++;
      if (now - fpsT > 1000) {
        setFps(Math.round((frames * 1000) / (now - fpsT)));
        frames = 0;
        fpsT = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------- audio legato al playback ---------- */
  const playing = useStudio((s) => s.playing);
  useEffect(() => {
    if (playing) {
      const s = useStudio.getState();
      const audioClips = s.clips
        .filter((c) => c.kind === "audio")
        .map((c) => ({ start: c.start, duration: c.duration, refId: c.refId, gain: c.gain ?? 0.8 }));
      void audioEngine.playClips(audioClips, s.playhead >= s.projectDur - 0.05 ? 0 : s.playhead);
    } else {
      audioEngine.stopAll();
    }
  }, [playing]);

  /* ---------- interazione canvas ---------- */

  const hitTest = (nx: number, ny: number): string | null => {
    const s = useStudio.getState();
    const t = s.playhead;
    const active = s.clips.filter((c) => t >= c.start && t < c.start + c.duration);
    // priorità: testo > modelli > fx
    for (const c of [...active].reverse()) {
      if (c.kind === "text") {
        const cx = c.x ?? 0.5, cy = c.y ?? 0.5;
        const hn = ((c.fontSize ?? 64) * 1.35) / 720 / 2 + 0.02;
        const wn = ((c.fontSize ?? 64) * (c.text?.length ?? 5) * 0.58) / 1280 / 2 + 0.03;
        if (Math.abs(nx - cx) < wn && Math.abs(ny - cy) < hn) return c.id;
      } else if (c.kind === "model") {
        const p = poseAt(c, t - c.start);
        const half = (p.s * 720 * 2.1) / 2 / 720;
        const halfX = (half * 720) / 1280;
        if (Math.abs(nx - p.x) < halfX + 0.03 && Math.abs(ny - p.y) < half + 0.03) return c.id;
      } else if (c.kind === "fx") {
        const cx = c.elX ?? 0.5, cy = c.elY ?? 0.5;
        if (Math.abs(nx - cx) < 0.2 && Math.abs(ny - cy) < 0.2) return c.id;
      }
    }
    return null;
  };

  const toNorm = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      nx: clamp((e.clientX - rect.left) / rect.width, 0, 1),
      ny: clamp((e.clientY - rect.top) / rect.height, 0, 1),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const { nx, ny } = toNorm(e);
    const s = useStudio.getState();
    const hit = hitTest(nx, ny);
    if (hit) {
      s.select(hit);
      const clip = s.clips.find((c) => c.id === hit)!;
      dragRef.current = { id: hit, kind: clip.kind };
      setDragging(true);
      scrubRef.current = false;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      scrubRef.current = true;
      s.setPlayhead(nx * s.projectDur);
      if (s.playing) restartAudio();
    }
  };

  const restartAudio = () => {
    const s = useStudio.getState();
    const audioClips = s.clips.filter((c) => c.kind === "audio").map((c) => ({ start: c.start, duration: c.duration, refId: c.refId, gain: c.gain ?? 0.8 }));
    void audioEngine.playClips(audioClips, s.playhead);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = useStudio.getState();
    if (scrubRef.current && e.buttons === 1) {
      const { nx } = toNorm(e);
      s.setPlayhead(nx * s.projectDur);
      return;
    }
    if (!dragRef.current || e.buttons !== 1) return;
    const { nx, ny } = toNorm(e);
    const { id, kind } = dragRef.current;
    const clip = s.clips.find((c) => c.id === id);
    if (!clip) return;
    setDragging(true);
    if (kind === "text") s.updateClip(id, { x: nx, y: ny });
    else if (kind === "fx") s.updateClip(id, { elX: nx, elY: ny });
    else if (kind === "model") {
      const pose = poseAt(clip, s.playhead - clip.start);
      s.upsertKeyframe(id, clamp(s.playhead - clip.start, 0, clip.duration), { ...pose, x: nx, y: ny });
    }
  };

  const onPointerUp = () => {
    if (scrubRef.current && useStudio.getState().playing) restartAudio();
    dragRef.current = null;
    scrubRef.current = false;
    setDragging(false);
  };

  /* ---------- overlay selezione ---------- */
  const selectedId = useStudio((s) => s.selectedId);
  const clips = useStudio((s) => s.clips);
  const playhead = useStudio((s) => s.playhead);
  const selected = clips.find((c) => c.id === selectedId);
  const active = selected && playhead >= selected.start && playhead < selected.start + selected.duration;

  let selBox: { x: number; y: number; w: number; h: number } | null = null;
  if (selected && active) {
    if (selected.kind === "text") {
      const w = ((selected.fontSize ?? 64) * (selected.text?.length ?? 5) * 0.58) / 1280;
      const h = ((selected.fontSize ?? 64) * 1.35) / 720;
      selBox = { x: (selected.x ?? 0.5) - w / 2, y: (selected.y ?? 0.5) - h / 2, w, h };
    } else if (selected.kind === "model") {
      const p = poseAt(selected, playhead - selected.start);
      const h = p.s * 2.1;
      const w = (h * 720) / 1280;
      selBox = { x: p.x - w / 2, y: p.y - h / 2, w, h };
    } else if (selected.kind === "fx") {
      const w = (0.42 * (selected.elScale ?? 1) * 720) / 1280;
      const h = 0.42 * (selected.elScale ?? 1);
      selBox = { x: (selected.elX ?? 0.5) - w / 2, y: (selected.elY ?? 0.5) - h / 2, w, h };
    }
  }

  const eco = useStudio((s) => s.eco);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-ink-950">
      <div className="flex items-center justify-between px-4 h-9 border-b border-ink-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-400 font-display">Anteprima</span>
          <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-mono px-2 py-0.5 rounded-full border ${eco ? "text-limey-400 border-limey-400/40 bg-limey-400/10" : "text-ink-300 border-ink-700"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${eco ? "bg-limey-400" : "bg-ember-500"} rec-dot`} />
            {eco ? "480p · ECO" : "720p"}
          </span>
        </div>
        <span className="font-mono text-[11px] text-ink-300 tabular-nums">{fps} fps</span>
      </div>

      <div ref={wrapRef} className="flex-1 min-h-0 grid place-items-center p-4 relative">
        <div className="relative w-full max-w-full" style={{ aspectRatio: "16/9", maxHeight: "100%", maxWidth: "min(100%, calc((100vh - 340px) * 16 / 9))", margin: "0 auto" }}>
          <canvas
            ref={canvasRef}
            width={1280} height={720}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`w-full h-full rounded-lg border border-ink-750 shadow-2xl shadow-black/50 touch-none ${dragging ? "cursor-grabbing" : "cursor-crosshair"}`}
          />
          {selBox && (
            <div
              className="absolute border-2 border-ember-500 rounded pointer-events-none"
              style={{
                left: `${selBox.x * 100}%`, top: `${selBox.y * 100}%`,
                width: `${selBox.w * 100}%`, height: `${selBox.h * 100}%`,
                boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 0 18px rgba(255,255,255,0.18)",
              }}
            >
              <span className="absolute -top-5 left-0 text-[9.5px] font-bold bg-ember-500 text-ink-950 px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                {selected?.name}
              </span>
            </div>
          )}
          {clips.length === 0 && <EmptyOverlay />}
        </div>
      </div>
    </div>
  );
};

const EmptyOverlay = () => {
  const loadDemo = useStudio((s) => s.loadDemo);
  return (
    <div className="absolute inset-0 rounded-lg grid place-items-center bg-ink-950/85 backdrop-blur-[2px]">
      <div className="text-center px-6">
        <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-ink-800 border border-ink-700 grid place-items-center text-ember-500">
          <Icon name="film" size={22} />
        </div>
        <p className="font-display font-bold text-[15px] text-ink-100 mb-1">La timeline è vuota</p>
        <p className="text-[12px] text-ink-400 max-w-[280px] mx-auto mb-4">
          Aggiungi sfondi, green screen, suoni e modelli 3D dalle librerie a sinistra — oppure parti dal progetto demo.
        </p>
        <button
          onClick={loadDemo}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ember-500 hover:bg-ember-400 text-ink-950 text-[12.5px] font-bold transition-all active:scale-95 shadow-lg shadow-ember-600/25"
        >
          <Icon name="play" size={13} /> Carica progetto demo
        </button>
      </div>
    </div>
  );
};
