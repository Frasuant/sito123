import { useState, type ReactNode } from "react";
import { useStudio } from "../state";
import { PRESET_CATALOG, FONT_OPTIONS } from "../lib/presets";
import { poseAt, getVideoEl, analyzeGreenScreen } from "../lib/render";
import { fmtTimeShort, type Clip, type Lights } from "../types";
import { Icon, Slider, Toggle } from "./ui";
import { GreenExportModal } from "./ExportModal";

const Panel = ({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) => (
  <section className="border-b border-ink-800 px-4 py-3.5">
    <div className="flex items-center justify-between mb-2.5">
      <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-ink-400">{title}</h3>
      {right}
    </div>
    {children}
  </section>
);

const Num = ({ label, value, min, max, step = 0.01, onChange, fmt }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; fmt?: (v: number) => string;
}) => (
  <Slider label={label} value={value} min={min} max={max} step={step} onChange={onChange} fmt={fmt} compact />
);

const SelectRow = ({ label, value, options, onChange }: {
  label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void;
}) => (
  <label className="flex items-center justify-between gap-2 mb-2">
    <span className="text-[11px] font-semibold text-ink-300">{label}</span>
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="bg-ink-800 border border-ink-700 rounded-md px-2 py-1.5 text-[11px] text-ink-100 outline-none focus:border-ink-400 max-w-[150px]"
    >
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </label>
);

/* ---------------- keyframe (modelli 3D) ---------------- */

const ModelSection = ({ clip }: { clip: Clip }) => {
  const playhead = useStudio((s) => s.playhead);
  const s = useStudio.getState();
  const isCustom = clip.refId.startsWith("custom:");
  const assetName = isCustom ? (s.mediaAssets.find((a) => `custom:${a.id}` === clip.refId)?.name ?? "Modello custom") : null;

  const t = Math.min(Math.max(playhead - clip.start, 0), clip.duration);
  const pose = poseAt(clip, t);
  const lights: Lights = clip.lights ?? s.lights;
  const setL = (patch: Partial<Lights>) => s.updateClip(clip.id, { lights: { ...lights, ...patch } });
  const setPose = (patch: Partial<typeof pose>) => s.upsertKeyframe(clip.id, t, patch);
  const kfs = (clip.kfs ?? []).slice().sort((a, b) => a.t - b.t);

  return (
    <>
      <Panel
        title="Keyframe posizione"
        right={
          <button
            onClick={() => { s.upsertKeyframe(clip.id, t, {}); s.toast(`Keyframe a ${fmtTimeShort(clip.start + t)}`, "success"); }}
            className="inline-flex items-center gap-1 text-[10px] font-bold bg-ink-800 border border-ink-600 text-ink-100 rounded-md px-2 py-1 hover:bg-ink-100 hover:text-ink-950 hover:border-ink-100 active:scale-95 transition-all"
          >
            <Icon name="key" size={11} /> Fissa keyframe
          </button>
        }
      >
        <p className="text-[10.5px] text-ink-400 leading-relaxed mb-2.5">
          Sposta il playhead, poi trascina il modello nell'anteprima (o usa i cursori): il keyframe si crea da solo. Tra due keyframe il movimento viene interpolato automaticamente.
        </p>
        <Num label="Posizione X" value={pose.x} min={-0.2} max={1.2} onChange={(v) => setPose({ x: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
        <Num label="Posizione Y" value={pose.y} min={-0.2} max={1.2} onChange={(v) => setPose({ y: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
        <Num label="Scala" value={pose.s} min={0.08} max={1.5} onChange={(v) => setPose({ s: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
        <Num label="Rotazione X" value={pose.rx} min={-3.14} max={3.14} step={0.02} onChange={(v) => setPose({ rx: v })} fmt={(v) => `${Math.round((v * 180) / Math.PI)}°`} />
        <Num label="Rotazione Y" value={pose.ry} min={-6.28} max={6.28} step={0.02} onChange={(v) => setPose({ ry: v })} fmt={(v) => `${Math.round((v * 180) / Math.PI)}°`} />
        <Num label="Rotazione Z" value={pose.rz} min={-3.14} max={3.14} step={0.02} onChange={(v) => setPose({ rz: v })} fmt={(v) => `${Math.round((v * 180) / Math.PI)}°`} />

        <div className="mt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] font-bold text-ink-300">{kfs.length} keyframe</span>
            {kfs.length > 0 && (
              <button
                onClick={() => { s.updateClip(clip.id, { kfs: [] }); s.toast("Keyframe rimossi — il modello resta fermo", "info"); }}
                className="text-[9.5px] font-bold text-danger-400 hover:underline"
              >
                rimuovi tutti
              </button>
            )}
          </div>
          {kfs.length === 0 ? (
            <p className="text-[10px] text-ink-500 italic">Nessun keyframe: il modello mantiene la posizione base.</p>
          ) : (
            <ul className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
              {kfs.map((k, i) => (
                <li key={i} className="flex items-center gap-2 bg-ink-850 border border-ink-750 rounded-md px-2 py-1.5">
                  <span className="w-2 h-2 rotate-45 bg-ink-100 rounded-[2px] shrink-0" />
                  <button
                    onClick={() => s.setPlayhead(clip.start + k.t)}
                    className="font-mono text-[10.5px] text-ink-200 hover:text-white flex-1 text-left"
                    title="Vai al keyframe"
                  >
                    {fmtTimeShort(clip.start + k.t)} <span className="text-ink-500">· +{k.t.toFixed(2)}s</span>
                  </button>
                  <button
                    onClick={() => s.updateClip(clip.id, { kfs: kfs.filter((x) => x !== k) })}
                    className="text-ink-500 hover:text-danger-400 transition-colors" title="Elimina keyframe"
                  >
                    <Icon name="close" size={11} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel title="Aspetto">
        {isCustom ? (
          <p className="text-[10.5px] text-ink-400 mb-2">
            Modello importato: <span className="font-bold text-ink-200">{assetName}</span> — usa i materiali originali del file.
          </p>
        ) : (
          <label className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-ink-300">Colore materiale</span>
            <input type="color" value={clip.modelColor ?? "#c9c9cf"} onChange={(e) => s.updateClip(clip.id, { modelColor: e.target.value })} />
          </label>
        )}
        <Toggle label="Wireframe" hint="Mostra solo la geometria" on={clip.wireframe ?? false} onChange={(b) => s.updateClip(clip.id, { wireframe: b })} />
      </Panel>

      <Panel title="Illuminazione">
        <Num label="Luce ambiente" value={lights.ambient} min={0} max={2} step={0.05} onChange={(v) => setL({ ambient: v })} fmt={(v) => v.toFixed(2)} />
        <Num label="Intensità key" value={lights.keyIntensity} min={0} max={6} step={0.1} onChange={(v) => setL({ keyIntensity: v })} fmt={(v) => v.toFixed(1)} />
        <Num label="Angolo key" value={lights.keyAngle} min={0} max={360} step={1} onChange={(v) => setL({ keyAngle: v })} fmt={(v) => `${Math.round(v)}°`} />
        <Num label="Altezza key" value={lights.keyElev} min={-20} max={85} step={1} onChange={(v) => setL({ keyElev: v })} fmt={(v) => `${Math.round(v)}°`} />
        <div className="flex items-center gap-4 mt-1">
          <label className="flex items-center gap-2">
            <span className="text-[10.5px] font-semibold text-ink-300">Colore key</span>
            <input type="color" value={lights.keyColor} onChange={(e) => setL({ keyColor: e.target.value })} />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-[10.5px] font-semibold text-ink-300">Colore rim</span>
            <input type="color" value={lights.rimColor} onChange={(e) => setL({ rimColor: e.target.value })} />
          </label>
        </div>
        <div className="mt-2">
          <Num label="Intensità rim" value={lights.rimIntensity} min={0} max={4} step={0.1} onChange={(v) => setL({ rimIntensity: v })} fmt={(v) => v.toFixed(1)} />
        </div>
      </Panel>
    </>
  );
};

/* ---------------- video / chroma ---------------- */

const VideoSection = ({ clip, onGreenExport }: { clip: Clip; onGreenExport: () => void }) => {
  const s = useStudio.getState();
  const [analyzing, setAnalyzing] = useState(false);
  const keyOn = clip.chroma !== false;

  const runAi = async () => {
    const el = getVideoEl(clip);
    if (!el) { s.toast("Video non disponibile", "error"); return; }
    setAnalyzing(true);
    s.toast("AI: analisi del green screen…", "info");
    const ai = await analyzeGreenScreen(el);
    setAnalyzing(false);
    if (ai.isGreen) {
      s.updateClip(clip.id, { chroma: true, keyColor: ai.key, tolerance: ai.tolerance, softness: 2.6 });
      s.toast("AI: sfondo verde rimosso", "success");
    } else {
      s.toast("AI: nessun green screen rilevato nel video", "warn");
    }
  };

  return (
    <>
      <Panel
        title="Chroma key"
        right={
          <button
            onClick={() => void runAi()}
            disabled={analyzing}
            className="inline-flex items-center gap-1 text-[10px] font-bold bg-warnx-400/15 border border-warnx-400/40 text-warnx-400 rounded-md px-2 py-1 hover:bg-warnx-400/25 active:scale-95 transition-all disabled:opacity-50"
          >
            <Icon name="spark" size={11} /> {analyzing ? "Analisi…" : "Rileva AI"}
          </button>
        }
      >
        <Toggle label="Rimuovi sfondo verde" hint="Chroma key automatico" on={keyOn} onChange={(b) => s.updateClip(clip.id, { chroma: b })} />
        {keyOn && (
          <div className="mt-2.5">
            <label className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-ink-300">Colore da rimuovere</span>
              <input type="color" value={clip.keyColor ?? "#00ff00"} onChange={(e) => s.updateClip(clip.id, { keyColor: e.target.value })} />
            </label>
            <Num label="Tolleranza" value={clip.tolerance ?? 90} min={20} max={180} step={1} onChange={(v) => s.updateClip(clip.id, { tolerance: v })} fmt={(v) => `${Math.round(v)}`} />
            <Num label="Morbidezza bordi" value={clip.softness ?? 2.5} min={0.5} max={6} step={0.1} onChange={(v) => s.updateClip(clip.id, { softness: v })} fmt={(v) => v.toFixed(1)} />
          </div>
        )}
      </Panel>
      <Panel title="Esporta">
        <button
          onClick={onGreenExport}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-limey-400/40 bg-limey-400/10 text-limey-400 text-[12px] font-bold px-3 py-2.5 hover:bg-limey-400/20 active:scale-[0.98] transition-all"
        >
          <Icon name="export" size={14} /> Esporta con green screen
        </button>
        <p className="text-[9.5px] text-ink-500 mt-1.5 leading-relaxed">Salva questa clip come video 1080p con sfondo verde, da riusare in altri editor.</p>
      </Panel>
    </>
  );
};

/* ---------------- inspector ---------------- */

export const Inspector = () => {
  const clips = useStudio((s) => s.clips);
  const selectedId = useStudio((s) => s.selectedId);
  const s = useStudio.getState();
  const [greenClip, setGreenClip] = useState<Clip | null>(null);

  const clip = clips.find((c) => c.id === selectedId);

  if (!clip) {
    return (
      <aside className="w-[272px] shrink-0 bg-ink-900 border-l border-ink-800 p-4 overflow-y-auto">
        <h2 className="font-display text-[13px] font-bold text-ink-100 uppercase tracking-wide mb-2">Inspector</h2>
        <div className="rounded-lg border border-dashed border-ink-700 px-3 py-6 text-center">
          <p className="text-[11px] text-ink-400 leading-relaxed">
            Seleziona una clip in timeline per modificarne testo, keyframe, chroma key e luci.
          </p>
        </div>
        <div className="mt-5 space-y-2 text-[10.5px] text-ink-400 leading-relaxed">
          <p className="flex gap-2"><span className="text-ink-200 font-bold shrink-0">Spazio</span> riproduci / pausa</p>
          <p className="flex gap-2"><span className="text-ink-200 font-bold shrink-0">S</span> dividi la clip al playhead</p>
          <p className="flex gap-2"><span className="text-ink-200 font-bold shrink-0">Canc</span> elimina la clip</p>
          <p className="flex gap-2"><span className="text-ink-200 font-bold shrink-0">Trascina</span> i file ovunque per importarli</p>
        </div>
      </aside>
    );
  }

  const KIND_LABEL: Record<string, string> = { bg: "Sfondo", fx: "Green screen", text: "Testo", model: "Modello 3D", audio: "Audio", video: "Video" };

  return (
    <aside className="w-[272px] shrink-0 bg-ink-900 border-l border-ink-800 overflow-y-auto min-h-0">
      <div className="px-4 py-3 border-b border-ink-800 sticky top-0 bg-ink-900 z-10">
        <div className="flex items-center gap-2">
          <input
            value={clip.name}
            onChange={(e) => s.updateClip(clip.id, { name: e.target.value })}
            className="flex-1 min-w-0 bg-transparent font-display font-bold text-[14px] text-ink-50 outline-none border-b border-transparent focus:border-ink-500 transition-colors"
            aria-label="Nome clip"
          />
          <button onClick={() => { s.duplicateClip(clip.id); }} title="Duplica"
            className="w-7 h-7 grid place-items-center rounded-md text-ink-400 hover:text-ink-100 hover:bg-ink-800 transition-colors">
            <Icon name="copy" size={13} />
          </button>
          <button onClick={() => { s.removeClip(clip.id); s.toast("Clip eliminata", "info"); }} title="Elimina"
            className="w-7 h-7 grid place-items-center rounded-md text-ink-400 hover:text-danger-400 hover:bg-danger-400/10 transition-colors">
            <Icon name="trash" size={13} />
          </button>
        </div>
        <p className="text-[9.5px] font-bold uppercase tracking-wider text-ink-500 mt-1">{KIND_LABEL[clip.kind]} · inizio {fmtTimeShort(clip.start)}</p>
      </div>

      <Panel title="Durata">
        <Num label="Secondi" value={clip.duration} min={0.25} max={30} step={0.25} onChange={(v) => s.updateClip(clip.id, { duration: v })} fmt={(v) => `${v.toFixed(2)}s`} />
      </Panel>

      {clip.kind === "text" && (
        <Panel title="Contenuto">
          <textarea
            value={clip.text ?? ""}
            onChange={(e) => s.updateClip(clip.id, { text: e.target.value })}
            rows={2}
            className="w-full bg-ink-850 border border-ink-700 rounded-lg px-2.5 py-2 text-[12.5px] text-ink-100 outline-none focus:border-ink-400 resize-none mb-2.5 transition-colors"
            aria-label="Testo"
          />
          <SelectRow label="Animazione" value={clip.preset ?? "popin"} onChange={(v) => s.updateClip(clip.id, { preset: v })}
            options={PRESET_CATALOG.map((p) => ({ v: p.id, l: p.name }))} />
          <SelectRow label="Font" value={clip.font ?? "Space Grotesk"} onChange={(v) => s.updateClip(clip.id, { font: v })}
            options={FONT_OPTIONS.map((f) => ({ v: f, l: f }))} />
          <label className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-ink-300">Colore testo</span>
            <input type="color" value={clip.color ?? "#f5f5f5"} onChange={(e) => s.updateClip(clip.id, { color: e.target.value })} />
          </label>
          <label className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-ink-300">Contorno</span>
            <input type="color" value={clip.strokeColor ?? "#000000"} onChange={(e) => s.updateClip(clip.id, { strokeColor: e.target.value })} />
          </label>
          <Num label="Dimensione" value={clip.fontSize ?? 8} min={2} max={18} step={0.5} onChange={(v) => s.updateClip(clip.id, { fontSize: v })} fmt={(v) => `${v.toFixed(1)}%`} />
          <Num label="Spessore contorno" value={clip.strokeWidth ?? 0} min={0} max={8} step={0.5} onChange={(v) => s.updateClip(clip.id, { strokeWidth: v })} />
          <Num label="Posizione X" value={clip.x ?? 0.5} min={0} max={1} onChange={(v) => s.updateClip(clip.id, { x: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
          <Num label="Posizione Y" value={clip.y ?? 0.5} min={0} max={1} onChange={(v) => s.updateClip(clip.id, { y: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
        </Panel>
      )}

      {clip.kind === "fx" && (
        <>
          <Panel title="Green screen">
            <Toggle label="Sfondo trasparente" hint="Chroma key attivo sull'effetto" on={clip.chroma !== false} onChange={(b) => s.updateClip(clip.id, { chroma: b })} />
            <div className="mt-2.5">
              <Num label="Posizione X" value={clip.elX ?? 0.5} min={0} max={1} onChange={(v) => s.updateClip(clip.id, { elX: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
              <Num label="Posizione Y" value={clip.elY ?? 0.5} min={0} max={1} onChange={(v) => s.updateClip(clip.id, { elY: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
              <Num label="Scala" value={clip.elScale ?? 1} min={0.2} max={2} step={0.05} onChange={(v) => s.updateClip(clip.id, { elScale: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
            </div>
          </Panel>
          <Panel title="Esporta">
            <button
              onClick={() => setGreenClip(clip)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-limey-400/40 bg-limey-400/10 text-limey-400 text-[12px] font-bold px-3 py-2.5 hover:bg-limey-400/20 active:scale-[0.98] transition-all"
            >
              <Icon name="export" size={14} /> Esporta con green screen
            </button>
            <p className="text-[9.5px] text-ink-500 mt-1.5 leading-relaxed">Salva l'effetto come video 1080p con sfondo verde, da riusare in altri editor.</p>
          </Panel>
        </>
      )}

      {(clip.kind === "video") && <VideoSection clip={clip} onGreenExport={() => setGreenClip(clip)} />}

      {clip.kind === "audio" && (
        <Panel title="Audio">
          <Num label="Volume" value={clip.gain ?? 0.8} min={0} max={1} step={0.05} onChange={(v) => s.updateClip(clip.id, { gain: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
          <p className="text-[10px] text-ink-500 leading-relaxed mt-1">Il suono resta in loop per tutta la durata della clip.</p>
        </Panel>
      )}

      {clip.kind === "model" && <ModelSection clip={clip} />}

      {greenClip && <GreenExportModal clip={greenClip} onClose={() => setGreenClip(null)} />}
    </aside>
  );
};
