import { useEffect, useRef, useState } from "react";
import { useStudio } from "../state";
import { startExport } from "../lib/render";
import { audioEngine } from "../lib/audio";
import { Icon } from "./ui";
import type { Clip } from "../types";

const RESOLUTIONS = [
  { id: "720", label: "720p", w: 1280, h: 720, br: 6_000_000 },
  { id: "1080", label: "1080p", w: 1920, h: 1080, br: 12_000_000 },
  { id: "1440", label: "2K", w: 2560, h: 1440, br: 20_000_000 },
  { id: "4k", label: "4K Ultra HD", w: 3840, h: 2160, br: 40_000_000 },
];

const fmtMb = (b: Blob) => `${(b.size / (1024 * 1024)).toFixed(1)} MB`;

/* ---------------- export progetto ---------------- */

export const ExportModal = ({ onClose }: { onClose: () => void }) => {
  const [res, setRes] = useState("1080");
  const [fps, setFps] = useState(30);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const projectDur = useStudio((s) => s.projectDur);
  const eco = useStudio((s) => s.eco);

  const r = RESOLUTIONS.find((x) => x.id === res)!;
  const exportFps = eco && fps > 30 ? 30 : fps;

  const run = () => {
    const st = useStudio.getState();
    if (!st.clips.length) { st.toast("Aggiungi almeno una clip prima di esportare", "error"); return; }
    setProgress(0);
    setResult(null);
    const { cancel, done } = startExport({
      width: r.w, height: r.h, fps: exportFps, bitrate: r.br, duration: st.projectDur,
      state: () => {
        const s = useStudio.getState();
        return { clips: s.clips, lights: s.lights, eco: s.eco };
      },
      onProgress: setProgress,
      audioClips: st.clips.filter((c) => c.kind === "audio").map((c) => ({ start: c.start, duration: c.duration, refId: c.refId, gain: c.gain ?? 0.8 })),
      audioEngine,
    });
    cancelRef.current = cancel;
    void done.then((blob) => {
      cancelRef.current = null;
      setProgress(null);
      if (blob) setResult(blob);
    });
  };

  const busy = progress !== null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={busy ? undefined : onClose}>
      <div className="w-full max-w-[440px] bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-800">
          <h2 className="font-display font-bold text-[15px] text-ink-50">Esporta video</h2>
          {!busy && (
            <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-800 transition-colors" aria-label="Chiudi">
              <Icon name="close" size={15} />
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-400 mb-1.5">Risoluzione</p>
            <div className="grid grid-cols-2 gap-1.5">
              {RESOLUTIONS.map((o) => (
                <button
                  key={o.id} disabled={busy}
                  onClick={() => setRes(o.id)}
                  className={`rounded-lg border px-3 py-2 text-left transition-all active:scale-[0.98] ${res === o.id ? "border-ink-200 bg-ink-100 text-ink-950" : "border-ink-700 bg-ink-850 text-ink-200 hover:border-ink-500"}`}
                >
                  <span className="block text-[12px] font-bold">{o.label}</span>
                  <span className={`block text-[9.5px] font-mono ${res === o.id ? "text-ink-600" : "text-ink-400"}`}>{o.w}×{o.h}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-400 shrink-0">Frame rate</p>
            <div className="flex gap-1.5">
              {[24, 30, 60].map((f) => (
                <button
                  key={f} disabled={busy} onClick={() => setFps(f)}
                  className={`rounded-md border px-2.5 py-1 text-[11.5px] font-bold font-mono transition-all ${fps === f ? "border-ink-200 bg-ink-100 text-ink-950" : "border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-500"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            {eco && fps > 30 && <span className="text-[9.5px] text-warnx-400 font-bold">Eco: max 30 fps</span>}
          </div>

          <div className="rounded-lg bg-ink-850 border border-ink-750 px-3.5 py-2.5 text-[11px] text-ink-300 font-mono space-y-0.5">
            <p>Durata · {projectDur.toFixed(1)}s</p>
            <p>Formato · WebM (VP9) · ~{Math.round((r.br / 8) * projectDur / 1024 / 1024)} MB stimati</p>
            <p>Rendering · tempo reale con audio mixato</p>
          </div>

          {busy && progress !== null && (
            <div>
              <div className="h-2 rounded-full bg-ink-800 overflow-hidden">
                <div className="h-full bg-teal-400 transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="text-[11px] font-mono text-ink-300 mt-1.5">Rendering… {Math.round(progress * 100)}%</p>
            </div>
          )}

          {result && !busy && (
            <div className="rounded-lg border border-limey-400/40 bg-limey-400/10 px-3.5 py-3 flex items-center gap-2.5">
              <Icon name="check" size={16} className="text-limey-400 shrink-0" />
              <p className="text-[12px] text-ink-100 font-semibold flex-1">Video pronto · {fmtMb(result)}</p>
              <a
                href={URL.createObjectURL(result)} download={`moviola-${r.w}x${r.h}.webm`}
                className="inline-flex items-center gap-1.5 bg-ink-100 text-ink-950 text-[11.5px] font-bold rounded-md px-3 py-1.5 hover:bg-white active:scale-95 transition-all"
              >
                <Icon name="download" size={13} /> Salva
              </a>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-ink-800 flex justify-end gap-2">
          {busy ? (
            <button onClick={() => cancelRef.current?.()} className="rounded-lg border border-danger-400/40 text-danger-400 text-[12px] font-bold px-4 py-2 hover:bg-danger-400/10 transition-colors">
              Annulla export
            </button>
          ) : (
            <>
              <button onClick={onClose} className="rounded-lg border border-ink-700 text-ink-300 text-[12px] font-bold px-4 py-2 hover:border-ink-500 hover:text-ink-100 transition-colors">
                Chiudi
              </button>
              <button onClick={run} className="inline-flex items-center gap-2 rounded-lg bg-ink-100 text-ink-950 text-[12.5px] font-bold px-5 py-2 hover:bg-white active:scale-95 transition-all shadow-lg shadow-black/30">
                <Icon name="export" size={14} /> Esporta {r.label}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------- export green screen (singola clip) ---------------- */

export const GreenExportModal = ({ clip, onClose }: { clip: Clip; onClose: () => void }) => {
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const busy = progress !== null;

  useEffect(() => {
    const { cancel, done } = startExport({
      width: 1920, height: 1080, fps: 30, bitrate: 14_000_000,
      duration: Math.max(1, clip.duration),
      state: () => ({
        clips: [{ ...clip, start: 0, chroma: false }],
        lights: useStudio.getState().lights,
        eco: false,
      }),
      onProgress: setProgress,
      audioClips: [],
      audioEngine,
    });
    cancelRef.current = cancel;
    void done.then((blob) => {
      cancelRef.current = null;
      setProgress(null);
      setResult(blob);
    });
    return () => cancel();
  }, [clip]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={busy ? undefined : onClose}>
      <div className="w-full max-w-[400px] bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-800">
          <h2 className="font-display font-bold text-[14px] text-ink-50">Esporta green screen</h2>
          {!busy && (
            <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-800 transition-colors" aria-label="Chiudi">
              <Icon name="close" size={15} />
            </button>
          )}
        </div>
        <div className="p-5 space-y-3.5">
          <p className="text-[11.5px] text-ink-300 leading-relaxed">
            "<span className="font-bold text-ink-100">{clip.name}</span>" verrà esportato a <span className="font-mono text-[10.5px]">1920×1080 · 30fps</span> con sfondo verde pieno, pronto per il chroma key in qualsiasi editor.
          </p>
          <div className="h-8 rounded-md border border-ink-700 overflow-hidden relative">
            <div className="absolute inset-0" style={{ background: "#00b140" }} />
            <span className="absolute inset-0 grid place-items-center text-[10px] font-mono font-bold text-black/60">#00B140</span>
          </div>
          {busy && progress !== null && (
            <div>
              <div className="h-2 rounded-full bg-ink-800 overflow-hidden">
                <div className="h-full bg-limey-400 transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="text-[11px] font-mono text-ink-300 mt-1.5">Rendering… {Math.round(progress * 100)}%</p>
            </div>
          )}
          {result && !busy && (
            <div className="rounded-lg border border-limey-400/40 bg-limey-400/10 px-3.5 py-3 flex items-center gap-2.5">
              <Icon name="check" size={16} className="text-limey-400 shrink-0" />
              <p className="text-[12px] text-ink-100 font-semibold flex-1">Pronto · {fmtMb(result)}</p>
              <a
                href={URL.createObjectURL(result)} download={`${clip.name.replace(/[^\w\-]+/g, "-").toLowerCase()}-greenscreen.webm`}
                className="inline-flex items-center gap-1.5 bg-ink-100 text-ink-950 text-[11.5px] font-bold rounded-md px-3 py-1.5 hover:bg-white active:scale-95 transition-all"
              >
                <Icon name="download" size={13} /> Salva
              </a>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-ink-800 flex justify-end">
          {busy ? (
            <button onClick={() => cancelRef.current?.()} className="rounded-lg border border-danger-400/40 text-danger-400 text-[12px] font-bold px-4 py-2 hover:bg-danger-400/10 transition-colors">
              Annulla
            </button>
          ) : (
            <button onClick={onClose} className="rounded-lg border border-ink-700 text-ink-300 text-[12px] font-bold px-4 py-2 hover:border-ink-500 hover:text-ink-100 transition-colors">
              {result ? "Chiudi" : "Annulla"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
