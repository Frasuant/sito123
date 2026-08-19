import { useEffect, useRef } from "react";
import { useStudio } from "../state";
import { TRACKS, fmtTime, type Clip } from "../types";
import { audioEngine, drawWaveform, getSoundBuffer } from "../lib/audio";
import { Icon, Slider } from "./ui";

const TRACK_COLORS: Record<string, string> = {
  bg: "#8f96a3", fx: "#3ddc97", text: "#e8e8ea", model: "#9fb7ff", audio: "#f2c14e",
};

/* ---------- waveform dentro la clip audio ---------- */
const ClipWave = ({ refId, duration }: { refId: string; duration: number }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let live = true;
    void getSoundBuffer(refId).then((buf) => {
      if (!live || !ref.current) return;
      drawWaveform(ref.current, buf, "rgba(16,20,27,0.65)");
    });
    return () => { live = false; };
  }, [refId]);
  return <canvas ref={ref} width={Math.max(60, Math.round(duration * 60))} height={30} className="w-full h-[30px] opacity-70" />;
};

/* ---------- singola clip ---------- */
const ClipBlock = ({ clip, zoom, color }: { clip: Clip; zoom: number; color: string }) => {
  const selectedId = useStudio((s) => s.selectedId);
  const select = useStudio((s) => s.select);
  const updateClip = useStudio((s) => s.updateClip);
  const projectDur = useStudio((s) => s.projectDur);
  const selected = selectedId === clip.id;
  const dragRef = useRef<{ mode: "move" | "resize"; startX: number; origStart: number; origDur: number } | null>(null);

  const onDown = (e: React.PointerEvent, mode: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    select(clip.id);
    dragRef.current = { mode, startX: e.clientX, origStart: clip.start, origDur: clip.duration };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dt = Math.round(((e.clientX - d.startX) / zoom) * 20) / 20;
    if (d.mode === "move") {
      updateClip(clip.id, { start: Math.max(0, Math.min(projectDur - 0.2, d.origStart + dt)) });
    } else {
      updateClip(clip.id, { duration: Math.max(0.25, d.origDur + dt) });
    }
  };
  const onUp = () => {
    dragRef.current = null;
    if (useStudio.getState().playing) {
      const s = useStudio.getState();
      void audioEngine.playClips(
        s.clips.filter((c) => c.kind === "audio").map((c) => ({ start: c.start, duration: c.duration, refId: c.refId, gain: c.gain ?? 0.8 })),
        s.playhead
      );
    }
  };

  return (
    <div
      onPointerDown={(e) => onDown(e, "move")}
      onPointerMove={onMove}
      onPointerUp={onUp}
      className={`absolute top-1 bottom-1 rounded-md border cursor-grab active:cursor-grabbing select-none overflow-hidden group transition-shadow ${selected ? "border-white shadow-lg shadow-black/40 z-10" : "border-black/30 hover:border-white/40"}`}
      style={{
        left: clip.start * zoom,
        width: Math.max(14, clip.duration * zoom),
        background: `linear-gradient(160deg, ${color}e6, ${color}b3)`,
      }}
      title={`${clip.name} · ${clip.duration.toFixed(1)}s`}
    >
      <div className="px-1.5 pt-0.5 flex items-center gap-1 min-w-0">
        <span className="text-[9.5px] font-bold text-ink-950/90 truncate leading-tight">{clip.name}</span>
      </div>
      {clip.kind === "audio" && <div className="px-1 mt-0.5"><ClipWave refId={clip.refId} duration={clip.duration} /></div>}
      {clip.kind === "model" && (
        <div className="absolute bottom-0.5 left-0 right-0 h-2.5 flex items-center px-0.5">
          {(clip.kfs ?? []).map((k, i) => (
            <span
              key={i}
              className="absolute w-2 h-2 rotate-45 bg-ink-950 border border-white/80 rounded-[2px]"
              style={{ left: k.t * zoom - 4, top: 1 }}
            />
          ))}
        </div>
      )}
      {clip.kind === "fx" && (
        <span className={`absolute top-1 right-1 text-[8px] font-black px-1 rounded-sm ${clip.chroma !== false ? "bg-ink-950/70 text-limey-400" : "bg-limey-400 text-ink-950"}`}>
          {clip.chroma !== false ? "KEY" : "VERDE"}
        </span>
      )}
      {/* handle resize */}
      <div
        onPointerDown={(e) => onDown(e, "resize")}
        onPointerMove={onMove}
        onPointerUp={onUp}
        className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity bg-white/30 border-l border-white/50"
      />
    </div>
  );
};

/* ---------- timeline ---------- */
export const Timeline = () => {
  const clips = useStudio((s) => s.clips);
  const selectedId = useStudio((s) => s.selectedId);
  const playhead = useStudio((s) => s.playhead);
  const playing = useStudio((s) => s.playing);
  const loop = useStudio((s) => s.loop);
  const zoom = useStudio((s) => s.zoom);
  const projectDur = useStudio((s) => s.projectDur);
  const s = useStudio.getState();
  const rulerRef = useRef<HTMLDivElement>(null);
  const contentW = projectDur * zoom;

  const scrub = (e: React.PointerEvent) => {
    const el = rulerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const t = Math.max(0, Math.min(projectDur, (e.clientX - rect.left + el.scrollLeft * 0) / zoom));
    useStudio.getState().setPlayhead(t);
  };

  const selected = clips.find((c) => c.id === selectedId);

  return (
    <section className="h-[248px] shrink-0 bg-ink-900 border-t border-ink-800 flex flex-col min-h-0">
      {/* transport */}
      <div className="flex items-center gap-2 px-3 h-11 border-b border-ink-800 shrink-0">
        <button
          onClick={() => useStudio.getState().setPlayhead(0)}
          className="w-8 h-8 grid place-items-center rounded-lg bg-ink-800 border border-ink-700 text-ink-200 hover:text-white hover:border-ink-600 active:scale-90 transition-all"
          aria-label="Torna all'inizio" title="Inizio"
        >
          <Icon name="skipBack" size={15} />
        </button>
        <button
          onClick={() => {
            const st = useStudio.getState();
            if (!st.playing && st.playhead >= st.projectDur - 0.05) st.setPlayhead(0);
            st.setPlaying(!st.playing);
          }}
          className={`w-10 h-8 grid place-items-center rounded-lg font-bold active:scale-90 transition-all ${playing ? "bg-warnx-400 text-ink-950" : "bg-ember-500 hover:bg-ember-400 text-ink-950 shadow-md shadow-ember-600/30"}`}
          aria-label="Riproduci o pausa" title="Spazio"
        >
          <Icon name={playing ? "pause" : "play"} size={16} />
        </button>
        <button
          onClick={s.toggleLoop}
          className={`w-8 h-8 grid place-items-center rounded-lg border active:scale-90 transition-all ${loop ? "bg-teal-500/15 border-teal-500/50 text-teal-400" : "bg-ink-800 border-ink-700 text-ink-400 hover:text-ink-200"}`}
          aria-label="Loop" title="Loop"
        >
          <Icon name="loop" size={14} />
        </button>

        <div className="ml-2 font-mono text-[13px] tabular-nums px-3 py-1 rounded-md bg-ink-950 border border-ink-750 text-ember-400">
          {fmtTime(playhead)} <span className="text-ink-400">/ {fmtTime(projectDur)}</span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => selectedId && s.splitClip(selectedId)}
          disabled={!selected || playhead <= (selected?.start ?? 0) + 0.05 || playhead >= (selected ? selected.start + selected.duration : 0) - 0.05}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-ink-800 border border-ink-700 text-[11px] font-bold text-ink-200 hover:text-white hover:border-ink-600 disabled:opacity-35 disabled:pointer-events-none active:scale-95 transition-all"
          title="Dividi al playhead (S)"
        >
          <Icon name="split" size={13} /> Dividi
        </button>
        <button
          onClick={() => selectedId && s.duplicateClip(selectedId)}
          disabled={!selected}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-ink-800 border border-ink-700 text-[11px] font-bold text-ink-200 hover:text-white hover:border-ink-600 disabled:opacity-35 disabled:pointer-events-none active:scale-95 transition-all"
          title="Duplica clip"
        >
          <Icon name="copy" size={13} /> Duplica
        </button>
        <button
          onClick={() => selectedId && s.removeClip(selectedId)}
          disabled={!selected}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-danger-400/10 border border-danger-400/30 text-[11px] font-bold text-danger-400 hover:bg-danger-400/20 disabled:opacity-35 disabled:pointer-events-none active:scale-95 transition-all"
          title="Elimina (Canc)"
        >
          <Icon name="trash" size={13} /> Elimina
        </button>

        <div className="w-36 pl-2 border-l border-ink-800">
          <Slider label="Zoom" value={zoom} min={20} max={200} step={5} color="#5aa9ff" compact onChange={s.setZoom} fmt={(v) => `${v}px/s`} />
        </div>
        <button
          onClick={s.extendDuration}
          className="h-8 px-2.5 rounded-lg bg-ink-800 border border-ink-700 text-[11px] font-bold text-skyx-400 hover:border-skyx-400/50 active:scale-95 transition-all whitespace-nowrap"
          title="Aggiungi 5 secondi"
        >
          +5s
        </button>
      </div>

      {/* ruler + tracks */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="w-[104px] shrink-0 border-r border-ink-800 flex flex-col bg-ink-900">
          <div className="h-6 border-b border-ink-800" />
          {TRACKS.map((tr) => (
            <div key={tr.id} className="flex-1 flex items-center gap-1.5 px-2.5 border-b border-ink-800/60 min-h-0">
              <span className="w-2 h-2 rounded-[3px] shrink-0" style={{ background: tr.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-300 truncate">{tr.label}</span>
            </div>
          ))}
        </div>

        <div ref={rulerRef} className="flex-1 overflow-x-auto overflow-y-hidden relative min-h-0">
          <div className="relative h-full" style={{ width: contentW + 40, minWidth: "100%" }}>
            {/* ruler */}
            <div
              className="h-6 border-b border-ink-800 relative cursor-pointer select-none bg-ink-850"
              onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); scrub(e); }}
              onPointerMove={(e) => { if (e.buttons === 1) scrub(e); }}
            >
              {Array.from({ length: Math.ceil(projectDur) + 1 }, (_, i) => (
                <div key={i} className="absolute top-0 bottom-0" style={{ left: i * zoom }}>
                  <div className="w-px h-full bg-ink-600" />
                  {i % 2 === 0 && <span className="absolute top-0.5 left-1 font-mono text-[9px] text-ink-400">{i}s</span>}
                  {zoom >= 50 && <div className="absolute left-1/2 bottom-0 w-px h-2 bg-ink-700" />}
                </div>
              ))}
            </div>

            {/* tracks */}
            {TRACKS.map((tr) => (
              <div
                key={tr.id}
                className="relative border-b border-ink-800/60 bg-ink-900/60"
                style={{ height: `calc((100% - 24px) / ${TRACKS.length})` }}
                onPointerDown={() => useStudio.getState().select(null)}
              >
                {/* griglia secondi */}
                {Array.from({ length: Math.ceil(projectDur) + 1 }, (_, i) => (
                  <div key={i} className="absolute top-0 bottom-0 w-px bg-ink-800/70" style={{ left: i * zoom }} />
                ))}
                {clips.filter((c) => c.track === tr.id).map((c) => (
                  <ClipBlock key={c.id} clip={c} zoom={zoom} color={TRACK_COLORS[c.kind] ?? tr.color} />
                ))}
              </div>
            ))}

            {clips.length === 0 && (
              <div className="absolute inset-0 grid place-items-center pointer-events-none" style={{ top: 24 }}>
                <p className="text-[11.5px] text-ink-400 bg-ink-850/80 border border-dashed border-ink-700 rounded-lg px-4 py-2">
                  Trascina le librerie qui: ogni scheda aggiunge una clip al playhead
                </p>
              </div>
            )}

            {/* playhead */}
            <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: playhead * zoom }}>
              <div className="w-px h-full bg-ink-50 shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
              <div className="absolute -top-0 -left-[5px] w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-ember-500" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
