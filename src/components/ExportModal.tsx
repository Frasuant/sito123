import { useMemo, useRef, useState } from "react";
import { useStudio } from "../state";
import { startExport } from "../lib/render";
import { audioEngine } from "../lib/audio";
import { Icon } from "./ui";

const RESOLUTIONS = [
  { id: "720", label: "720p HD", w: 1280, h: 720, bit: 8_000_000, note: "Leggero, ideale per PC entry-level" },
  { id: "1080", label: "1080p Full HD", w: 1920, h: 1080, bit: 16_000_000, note: "Il miglior compromesso" },
  { id: "4k", label: "4K Ultra HD", w: 3840, h: 2160, bit: 45_000_000, note: "Massima qualità — richiede più GPU" },
];

type Phase = "config" | "rendering" | "done";

export const ExportModal = ({ onClose }: { onClose: () => void }) => {
  const clips = useStudio((s) => s.clips);
  const projectDur = useStudio((s) => s.projectDur);
  const eco = useStudio((s) => s.eco);
  const toast = useStudio((s) => s.toast);

  const [resId, setResId] = useState(eco ? "720" : "1080");
  const [fps, setFps] = useState(30);
  const [phase, setPhase] = useState<Phase>("config");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; size: number } | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const res = RESOLUTIONS.find((r) => r.id === resId)!;
  const estSize = useMemo(() => ((res.bit * projectDur) / 8 / 1_000_000).toFixed(0), [res, projectDur]);

  const start = () => {
    setPhase("rendering");
    setProgress(0);
    const audioClips = clips.filter((c) => c.kind === "audio").map((c) => ({ start: c.start, duration: c.duration, refId: c.refId, gain: c.gain ?? 0.8 }));
    const handle = startExport({
      width: res.w, height: res.h, fps, bitrate: res.bit, duration: projectDur,
      state: () => {
        const st = useStudio.getState();
        return { clips: st.clips, lights: st.lights, eco: st.eco };
      },
      onProgress: setProgress,
      audioClips,
      audioEngine,
    });
    cancelRef.current = handle.cancel;
    void handle.done.then((blob) => {
      cancelRef.current = null;
      if (!blob) { setPhase("config"); toast("Export annullato", "warn"); return; }
      setResult({ url: URL.createObjectURL(blob), size: blob.size });
      setPhase("done");
      toast(`Video ${res.label} pronto`, "success");
    });
  };

  const cancel = () => { cancelRef.current?.(); };

  return (
    <div className="fixed inset-0 z-40 bg-ink-950/80 backdrop-blur-sm grid place-items-center p-4" onPointerDown={(e) => { if (e.target === e.currentTarget && phase !== "rendering") onClose(); }}>
      <div className="anim-modal w-full max-w-[440px] rounded-xl bg-ink-850 border border-ink-700 shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between px-4 h-12 border-b border-ink-750">
          <h2 className="font-display font-bold text-[14px] text-ink-100 flex items-center gap-2">
            <Icon name="export" size={16} className="text-ember-500" /> Esporta video
          </h2>
          {phase !== "rendering" && (
            <button onClick={onClose} className="text-ink-400 hover:text-white transition-colors" aria-label="Chiudi">
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        {phase === "config" && (
          <div className="p-4">
            <div className="space-y-2 mb-4">
              {RESOLUTIONS.map((r) => (
                <button
                  key={r.id} onClick={() => setResId(r.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all active:scale-[0.99] ${resId === r.id ? "border-ember-500 bg-ember-500/10" : "border-ink-700 bg-ink-900 hover:border-ink-600"}`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 grid place-items-center shrink-0 ${resId === r.id ? "border-ember-500" : "border-ink-600"}`}>
                    {resId === r.id && <span className="w-2 h-2 rounded-full bg-ember-500" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-ink-100">{r.label}</span>
                      {r.id === "4k" && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-warnx-400/15 text-warnx-400 border border-warnx-400/30">PRO</span>}
                    </span>
                    <span className="block text-[10.5px] text-ink-400">{r.note}</span>
                  </span>
                  <span className="font-mono text-[10.5px] text-ink-300 shrink-0">{r.w}×{r.h}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">FPS</span>
              {[24, 30, 60].map((f) => (
                <button
                  key={f} onClick={() => setFps(f)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-bold font-mono transition-all active:scale-95 ${fps === f ? "bg-ember-500 text-ink-950" : "bg-ink-800 border border-ink-700 text-ink-300 hover:text-white"}`}
                >
                  {f}
                </button>
              ))}
              <span className="ml-auto font-mono text-[10.5px] text-ink-400">~{estSize} MB · {projectDur}s</span>
            </div>

            {clips.length === 0 ? (
              <p className="text-[12px] text-warnx-400 bg-warnx-400/10 border border-warnx-400/30 rounded-lg px-3 py-2.5 mb-3 flex items-center gap-2">
                <Icon name="warn" size={14} /> La timeline è vuota: aggiungi almeno una clip prima di esportare.
              </p>
            ) : (
              <p className="text-[10.5px] leading-relaxed text-ink-400 mb-3 flex gap-2">
                <Icon name="leaf" size={13} className="text-limey-400 shrink-0 mt-0.5" />
                Export 100% locale nel browser: nessun upload, nessun server, i tuoi video restano sul tuo dispositivo. La registrazione avviene in tempo reale ({projectDur}s).
              </p>
            )}

            <button
              onClick={start} disabled={clips.length === 0}
              className="w-full py-2.5 rounded-lg bg-ember-500 hover:bg-ember-400 disabled:opacity-40 disabled:pointer-events-none text-ink-950 text-[13px] font-bold transition-all active:scale-[0.98] shadow-lg shadow-ember-600/25"
            >
              Avvia export {res.label}
            </button>
          </div>
        )}

        {phase === "rendering" && (
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-danger-400 rec-dot" />
              <span className="font-display font-bold text-[13.5px] text-ink-100">Registrazione in corso…</span>
              <span className="ml-auto font-mono text-[12px] text-ember-400 tabular-nums">{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-ink-950 border border-ink-700 overflow-hidden mb-3">
              <div className="h-full rounded-full bg-gradient-to-r from-ember-600 to-ember-400 transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="text-[11px] text-ink-400 mb-4 leading-relaxed">
              Rendering di {res.w}×{res.h} a {fps} fps. Tieni questa scheda visibile: il browser registra i fotogrammi in tempo reale.
            </p>
            <button onClick={cancel} className="w-full py-2 rounded-lg bg-ink-800 border border-ink-700 text-[12px] font-bold text-ink-200 hover:text-danger-400 hover:border-danger-400/50 transition-all active:scale-[0.98]">
              Annulla export
            </button>
          </div>
        )}

        {phase === "done" && result && (
          <div className="p-5 text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-limey-400/15 border border-limey-400/40 grid place-items-center text-limey-400">
              <Icon name="check" size={22} />
            </div>
            <h3 className="font-display font-bold text-[16px] text-ink-100 mb-1">Video pronto</h3>
            <p className="text-[11.5px] text-ink-400 mb-4">
              {res.label} · {fps} fps · WebM · {(result.size / 1_000_000).toFixed(1)} MB
            </p>
            <a
              href={result.url} download={`moviola-${res.id}-${Date.now()}.webm`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-limey-400 hover:brightness-110 text-ink-950 text-[13px] font-bold transition-all active:scale-95 mb-2"
            >
              <Icon name="download" size={15} /> Scarica video
            </a>
            <p className="text-[10px] text-ink-400 mb-3">Consiglio: converti in MP4 con un tool locale se ti serve per i social.</p>
            <button onClick={onClose} className="text-[12px] font-semibold text-ink-300 hover:text-white transition-colors">Chiudi</button>
          </div>
        )}
      </div>
    </div>
  );
};
