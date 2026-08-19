import { useStudio } from "../state";
import { fmtTimeShort, type Clip, type Keyframe } from "../types";
import { poseAt } from "../lib/render";
import { PRESET_CATALOG, FONT_OPTIONS } from "../lib/presets";
import { getModel } from "../lib/models";
import { Icon, SectionTitle, Slider, Toggle } from "./ui";

const NumField = ({ label, value, onChange, step = 0.1, min = 0 }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number }) => (
  <label className="flex-1">
    <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-400 mb-1">{label}</span>
    <input
      type="number" value={Number(value.toFixed(2))} step={step} min={min}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full px-2 py-1.5 rounded-md bg-ink-900 border border-ink-700 font-mono text-[12px] text-ink-100 outline-none focus:border-ember-500 transition-colors"
    />
  </label>
);

const Select = ({ label, value, options, onChange }: { label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) => (
  <label className="block mb-3">
    <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-400 mb-1">{label}</span>
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1.5 rounded-md bg-ink-900 border border-ink-700 text-[12px] text-ink-100 outline-none focus:border-ember-500 transition-colors"
    >
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </label>
);

const ModelSection = ({ clip }: { clip: Clip }) => {
  const playhead = useStudio((st) => st.playhead);
  const upsertKeyframe = useStudio((st) => st.upsertKeyframe);
  const removeKeyframe = useStudio((st) => st.removeKeyframe);
  const updateClip = useStudio((st) => st.updateClip);
  const setPlayhead = useStudio((st) => st.setPlayhead);
  const toast = useStudio((st) => st.toast);

  const localT = Math.min(Math.max(0, playhead - clip.start), clip.duration);
  const pose = poseAt(clip, localT);
  const hasKfHere = (clip.kfs ?? []).some((k) => Math.abs(k.t - localT) < 0.06);
  const set = (patch: Partial<Keyframe>) => upsertKeyframe(clip.id, localT, { ...pose, ...patch });

  return (
    <>
      <SectionTitle right={<span className="font-mono text-[10px] text-rosex-400">{getModel(clip.refId).name}</span>}>Modello 3D</SectionTitle>
      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-2 text-[11px] font-semibold text-ink-300">
          Colore
          <input type="color" value={clip.modelColor ?? "#ffb27a"} onChange={(e) => updateClip(clip.id, { modelColor: e.target.value })} />
        </label>
        <div className="flex-1">
          <Toggle label="Wireframe" on={clip.wireframe ?? false} onChange={(b) => updateClip(clip.id, { wireframe: b })} />
        </div>
      </div>

      <SectionTitle>Keyframe · posizione al playhead</SectionTitle>
      <div className="rounded-lg bg-ink-850 border border-ink-750 p-3 mb-2">
        <Slider label="Posizione X" value={pose.x} min={-0.2} max={1.2} step={0.01} color="#e0637c" onChange={(v) => set({ x: v })} fmt={(v) => v.toFixed(2)} />
        <Slider label="Posizione Y" value={pose.y} min={-0.2} max={1.2} step={0.01} color="#e0637c" onChange={(v) => set({ y: v })} fmt={(v) => v.toFixed(2)} />
        <Slider label="Scala" value={pose.s} min={0.1} max={1} step={0.01} color="#e0637c" onChange={(v) => set({ s: v })} fmt={(v) => v.toFixed(2)} />
        <Slider label="Rotazione X" value={pose.rx} min={-3.2} max={3.2} step={0.05} color="#ffd166" onChange={(v) => set({ rx: v })} fmt={(v) => `${Math.round(v * 57.3)}°`} />
        <Slider label="Rotazione Y" value={pose.ry} min={-6.4} max={6.4} step={0.05} color="#ffd166" onChange={(v) => set({ ry: v })} fmt={(v) => `${Math.round(v * 57.3)}°`} />
      </div>
      <button
        onClick={() => { upsertKeyframe(clip.id, localT, pose); toast(`Keyframe a ${fmtTimeShort(localT)}`, "success"); }}
        className={`w-full mb-3 inline-flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-bold active:scale-[0.98] transition-all ${hasKfHere ? "bg-ink-750 border border-ink-600 text-ink-200 hover:text-white" : "bg-rosex-400 text-ink-950 hover:brightness-110 shadow-md shadow-rosex-400/20"}`}
      >
        <Icon name="key" size={14} />
        {hasKfHere ? "Keyframe già presente — aggiorna" : "Aggiungi keyframe al playhead"}
      </button>

      <SectionTitle right={<span className="font-mono text-[10px] text-ink-400">{(clip.kfs ?? []).length} punti</span>}>Punti chiave</SectionTitle>
      {(clip.kfs ?? []).length === 0 ? (
        <p className="text-[11px] text-ink-400 bg-ink-850 border border-dashed border-ink-700 rounded-lg px-3 py-2.5">
          Nessun keyframe: il modello resta fermo. Aggiungine almeno due per animarlo.
        </p>
      ) : (
        <ul className="space-y-1 mb-2">
          {(clip.kfs ?? []).map((k, i) => (
            <li key={i} className="flex items-center gap-2 rounded-md bg-ink-850 border border-ink-750 px-2 py-1.5 group">
              <span className="w-2 h-2 rotate-45 bg-rosex-400 rounded-[2px] shrink-0" />
              <button onClick={() => setPlayhead(clip.start + k.t)} className="font-mono text-[11px] text-ink-100 hover:text-rosex-400 transition-colors tabular-nums">
                {fmtTimeShort(k.t)}
              </button>
              <span className="text-[10px] text-ink-400 font-mono flex-1 truncate">x{k.x.toFixed(2)} y{k.y.toFixed(2)} s{k.s.toFixed(2)}</span>
              <button
                onClick={() => removeKeyframe(clip.id, k.t)}
                className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-danger-400 transition-all"
                aria-label="Elimina keyframe"
              >
                <Icon name="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10.5px] leading-relaxed text-ink-400">
        Suggerimento: puoi anche trascinare il modello direttamente nell'anteprima per creare keyframe.
      </p>
    </>
  );
};

const EmptyInspector = () => {
  const clips = useStudio((s) => s.clips);
  const projectDur = useStudio((s) => s.projectDur);
  const eco = useStudio((s) => s.eco);
  return (
    <>
      <SectionTitle>Progetto</SectionTitle>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg bg-ink-850 border border-ink-750 p-3">
          <div className="font-display font-bold text-[20px] text-ember-400 leading-none">{clips.length}</div>
          <div className="text-[10px] uppercase tracking-wide font-bold text-ink-400 mt-1">clip in timeline</div>
        </div>
        <div className="rounded-lg bg-ink-850 border border-ink-750 p-3">
          <div className="font-display font-bold text-[20px] text-skyx-400 leading-none">{projectDur}s</div>
          <div className="text-[10px] uppercase tracking-wide font-bold text-ink-400 mt-1">durata</div>
        </div>
      </div>

      <SectionTitle>Workflow faceless</SectionTitle>
      <ol className="space-y-2 mb-4">
        {[
          ["image", "Scegli uno sfondo animato dalla libreria"],
          ["type", "Aggiungi testo con un motion preset"],
          ["film", "Sovrapponi un green screen (chroma automatico)"],
          ["cube", "Inserisci un modello 3D e anima i keyframe"],
          ["wave", "Importa i suoni e regola il timing"],
          ["export", "Esporta fino in 4K"],
        ].map(([ic, txt], i) => (
          <li key={i} className="flex items-start gap-2.5 text-[11.5px] text-ink-200 leading-snug">
            <span className="w-5 h-5 shrink-0 rounded-md bg-ink-800 border border-ink-700 grid place-items-center text-ember-400 mt-[-1px]">
              <Icon name={ic as "image"} size={11} />
            </span>
            <span><strong className="text-ink-100">{i + 1}.</strong> {txt}</span>
          </li>
        ))}
      </ol>

      <SectionTitle>Scorciatoie</SectionTitle>
      <div className="space-y-1.5 mb-4">
        {[["Spazio", "Riproduci / pausa"], ["S", "Dividi la clip al playhead"], ["Canc", "Elimina selezione"], ["Clic anteprima", "Seleziona / scrub"]].map(([k, d]) => (
          <div key={k} className="flex items-center justify-between text-[11px]">
            <kbd className="px-1.5 py-0.5 rounded bg-ink-800 border border-ink-700 font-mono text-[10px] text-ink-200">{k}</kbd>
            <span className="text-ink-400">{d}</span>
          </div>
        ))}
      </div>

      <div className={`rounded-lg border p-3 text-[10.5px] leading-relaxed ${eco ? "border-limey-400/40 bg-limey-400/5 text-limey-400" : "border-ink-750 bg-ink-850 text-ink-400"}`}>
        <span className="flex items-center gap-1.5 font-bold text-[11px] mb-0.5 text-ink-200"><Icon name="leaf" size={12} className={eco ? "text-limey-400" : "text-ink-400"} /> Modalità Eco {eco ? "attiva" : "non attiva"}</span>
        Anteprima a 480p, meno particelle e 3D leggero: perfetta per i PC entry-level. Attivala dalla barra in alto.
      </div>
    </>
  );
};

export const Inspector = () => {
  const clips = useStudio((s) => s.clips);
  const selectedId = useStudio((s) => s.selectedId);
  const updateClip = useStudio((s) => s.updateClip);
  const removeClip = useStudio((s) => s.removeClip);
  const duplicateClip = useStudio((s) => s.duplicateClip);
  const clip = clips.find((c) => c.id === selectedId) ?? null;

  return (
    <aside className="w-[276px] shrink-0 bg-ink-900 border-l border-ink-800 flex flex-col min-h-0">
      <div className="h-9 px-3.5 flex items-center border-b border-ink-800 shrink-0">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-400 font-display">Inspector</span>
        {clip && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-ink-800 text-ink-200 truncate max-w-[120px]">{clip.name}</span>}
      </div>
      <div className="flex-1 overflow-y-auto p-3.5 min-h-0">
        {!clip ? (
          <EmptyInspector />
        ) : (
          <>
            <SectionTitle>Clip</SectionTitle>
            <div className="flex gap-2 mb-3">
              <NumField label="Inizio (s)" value={clip.start} onChange={(v) => updateClip(clip.id, { start: Math.max(0, v) })} />
              <NumField label="Durata (s)" value={clip.duration} onChange={(v) => updateClip(clip.id, { duration: Math.max(0.25, v) })} step={0.25} min={0.25} />
            </div>
            <div className="flex gap-1.5 mb-4">
              <button onClick={() => duplicateClip(clip.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-ink-800 border border-ink-700 text-[11px] font-bold text-ink-200 hover:text-white hover:border-ink-600 active:scale-95 transition-all">
                <Icon name="copy" size={12} /> Duplica
              </button>
              <button onClick={() => removeClip(clip.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-danger-400/10 border border-danger-400/30 text-[11px] font-bold text-danger-400 hover:bg-danger-400/20 active:scale-95 transition-all">
                <Icon name="trash" size={12} /> Elimina
              </button>
            </div>

            {clip.kind === "text" && (
              <>
                <SectionTitle>Testo</SectionTitle>
                <textarea
                  value={clip.text ?? ""} rows={2}
                  onChange={(e) => updateClip(clip.id, { text: e.target.value })}
                  className="w-full mb-3 px-2.5 py-2 rounded-md bg-ink-900 border border-ink-700 text-[13px] text-ink-100 outline-none focus:border-ember-500 transition-colors resize-none font-display"
                  placeholder="Il tuo testo…"
                />
                <Select label="Motion preset" value={clip.preset ?? "popin"} onChange={(v) => updateClip(clip.id, { preset: v })} options={PRESET_CATALOG.map((p) => ({ v: p.id, l: p.name }))} />
                <Select label="Font" value={clip.font ?? "Space Grotesk"} onChange={(v) => updateClip(clip.id, { font: v })} options={FONT_OPTIONS.map((f) => ({ v: f, l: f }))} />
                <div className="rounded-lg bg-ink-850 border border-ink-750 p-3 mb-3">
                  <Slider label="Dimensione" value={clip.fontSize ?? 64} min={20} max={160} step={2} onChange={(v) => updateClip(clip.id, { fontSize: v })} fmt={(v) => `${v}px`} />
                  <Slider label="Contorno" value={clip.strokeWidth ?? 0} min={0} max={14} step={1} onChange={(v) => updateClip(clip.id, { strokeWidth: v })} fmt={(v) => (v === 0 ? "off" : `${v}`)} />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-ink-300">Riempimento
                      <input type="color" value={clip.color ?? "#e6ebf4"} onChange={(e) => updateClip(clip.id, { color: e.target.value })} />
                    </label>
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-ink-300">Contorno
                      <input type="color" value={clip.strokeColor ?? "#10141b"} onChange={(e) => updateClip(clip.id, { strokeColor: e.target.value })} />
                    </label>
                  </div>
                </div>
                <p className="text-[10.5px] text-ink-400">Trascina il testo nell'anteprima per riposizionarlo.</p>
              </>
            )}

            {clip.kind === "fx" && (
              <>
                <SectionTitle>Green Screen</SectionTitle>
                <div className="rounded-lg bg-ink-850 border border-ink-750 p-3 mb-3">
                  <Toggle label="Rimozione sfondo verde" hint="Chroma key automatico sull'effetto" on={clip.chroma !== false} onChange={(b) => updateClip(clip.id, { chroma: b })} />
                  <div className="mt-2">
                    <Slider label="Scala effetto" value={clip.elScale ?? 1} min={0.3} max={1.6} step={0.05} color="#52d273" onChange={(v) => updateClip(clip.id, { elScale: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
                  </div>
                </div>
                <p className="text-[10.5px] text-ink-400">Trascina l'effetto nell'anteprima per spostarlo.</p>
              </>
            )}

            {clip.kind === "video" && (
              <>
                <SectionTitle>Chroma Key</SectionTitle>
                <div className="rounded-lg bg-ink-850 border border-ink-750 p-3 mb-3">
                  <Toggle label="Rimozione sfondo verde" hint="Elaborazione pixel in tempo reale" on={clip.chroma !== false} onChange={(b) => updateClip(clip.id, { chroma: b })} />
                  <div className="mt-2">
                    <Slider label="Tolleranza" value={clip.tolerance ?? 90} min={20} max={200} step={5} color="#52d273" onChange={(v) => updateClip(clip.id, { tolerance: v })} />
                    <Slider label="Sfumatura bordo" value={clip.softness ?? 2.5} min={0.5} max={8} step={0.5} color="#52d273" onChange={(v) => updateClip(clip.id, { softness: v })} fmt={(v) => v.toFixed(1)} />
                  </div>
                </div>
                <p className="text-[10.5px] leading-relaxed text-ink-400">
                  Regola la tolleranza se resta un alone verde, o la sfumatura per bordi più morbidi.
                </p>
              </>
            )}

            {clip.kind === "model" && <ModelSection clip={clip} />}

            {clip.kind === "audio" && (
              <>
                <SectionTitle>Audio</SectionTitle>
                <div className="rounded-lg bg-ink-850 border border-ink-750 p-3 mb-3">
                  <Slider label="Volume" value={Math.round((clip.gain ?? 0.8) * 100)} min={0} max={100} step={5} color="#39d0b8" onChange={(v) => updateClip(clip.id, { gain: v / 100 })} fmt={(v) => `${v}%`} />
                </div>
                <p className="text-[10.5px] text-ink-400">Il suono va in loop per tutta la durata della clip.</p>
              </>
            )}

            {clip.kind === "bg" && (
              <>
                <SectionTitle>Sfondo</SectionTitle>
                <p className="text-[11.5px] text-ink-200 leading-relaxed mb-3">
                  Layer animato a schermo intero. Se più sfondi si sovrappongono, vince quello aggiunto per ultimo.
                </p>
                <div className="rounded-lg border border-ink-750 bg-ink-850 p-3 text-[10.5px] text-ink-400 leading-relaxed flex gap-2">
                  <Icon name="info" size={14} className="text-skyx-400 shrink-0 mt-0.5" />
                  Allunga la clip per coprire tutto il video: i video faceless funzionano meglio con uno sfondo continuo.
                </div>
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
