import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStudio, useAddFromLibrary } from "../state";
import { FX_CATALOG, GREEN, type FxDef } from "../lib/effects";
import { BG_CATALOG, type BgDef } from "../lib/backgrounds";
import { PRESET_CATALOG } from "../lib/presets";
import { SOUND_CATALOG, audioEngine, bufferToWav, getSoundBuffer, drawWaveform } from "../lib/audio";
import { MODEL_CATALOG } from "../lib/models";
import { Icon, SectionTitle, Slider } from "./ui";

type TabId = "preset" | "suoni" | "green" | "sfondi" | "modelli";

const TABS: { id: TabId; label: string; icon: string; color: string }[] = [
  { id: "preset", label: "Preset", icon: "spark", color: "#ff7a1a" },
  { id: "suoni", label: "Suoni", icon: "wave", color: "#39d0b8" },
  { id: "green", label: "Green Screen", icon: "film", color: "#52d273" },
  { id: "sfondi", label: "Sfondi", icon: "image", color: "#5aa9ff" },
  { id: "modelli", label: "3D", icon: "cube", color: "#e0637c" },
];

/* thumbnail canvas che disegna una volta */
const Thumb = ({ draw, className }: { draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; className?: string }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    draw(ctx, c.width, c.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <canvas ref={ref} width={168} height={94} className={`w-full h-auto rounded-md ${className ?? ""}`} />;
};

const FxThumb = ({ fx }: { fx: FxDef }) => (
  <Thumb draw={(ctx, w, h) => {
    ctx.fillStyle = GREEN;
    ctx.fillRect(0, 0, w, h);
    fx.draw(ctx, fx.cycle * 0.42, w, h, true);
  }} />
);

const BgThumb = ({ bg }: { bg: BgDef }) => (
  <Thumb draw={(ctx, w, h) => bg.draw(ctx, 1.2, w, h, true)} />
);

const MODEL_GLYPHS: Record<string, ReactNode> = {
  crystal: <path d="M12 3l7 6-7 12L5 9l7-6zM5 9h14M12 21L9 9l3-6M12 21l3-12-3-6" />,
  knot: <path d="M8 8c6-4 10 0 8 4s-10 2-8 6 8 0 6-4" />,
  gem: <path d="M12 3l8 8-8 10L4 11l8-8zM4 11h16" />,
  cube: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12L4 7.5M12 12v9" />,
  pyramid: <path d="M12 3l9 17H3l9-17zM12 3v17M3 20l9-6 9 6" />,
  sphere: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 12h17M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />,
  torus: <path d="M12 17.5c-4.7 0-8.5-2.5-8.5-5.5S7.3 6.5 12 6.5s8.5 2.5 8.5 5.5-3.8 5.5-8.5 5.5zM12 14.8c-2.6 0-4.7-1.3-4.7-2.8s2.1-2.8 4.7-2.8 4.7 1.3 4.7 2.8-2.1 2.8-4.7 2.8z" />,
  dodeca: <path d="M12 3l8.5 6.2-3.2 10H6.7L3.5 9.2 12 3zM12 3v6.5M20.5 9.2l-8.5.3M3.5 9.2l8.5.3M6.7 19.2l5.3-9.7M17.3 19.2L12 9.5" />,
};

/* ---------- tab suoni ---------- */

const SoundsTab = () => {
  const [q, setQ] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [waves, setWaves] = useState<Record<string, AudioBuffer>>({});
  const lib = useAddFromLibrary();
  const toast = useStudio((s) => s.toast);

  const list = useMemo(
    () => SOUND_CATALOG.filter((s) => (s.name + s.desc + s.tags).toLowerCase().includes(q.toLowerCase())),
    [q]
  );

  useEffect(() => {
    let live = true;
    SOUND_CATALOG.forEach(async (s) => {
      const buf = await getSoundBuffer(s.id);
      if (live) setWaves((w) => ({ ...w, [s.id]: buf }));
    });
    return () => { live = false; };
  }, []);

  const preview = async (id: string) => {
    if (playingId === id) { audioEngine.stopAll(); setPlayingId(null); return; }
    setPlayingId(id);
    await audioEngine.preview(id);
    setTimeout(() => setPlayingId((p) => (p === id ? null : p)), (SOUND_CATALOG.find((s) => s.id === id)?.dur ?? 1) * 1000 + 100);
  };

  const download = async (id: string) => {
    const buf = await getSoundBuffer(id);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(bufferToWav(buf));
    a.download = `${id}.wav`;
    a.click();
    toast("WAV scaricato", "success");
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <a
          href="https://soundbuttonslab.com/" target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal-400 hover:text-teal-300 transition-colors"
        >
          <Icon name="external" size={12} /> soundbuttonslab.com
        </a>
        <span className="text-[10px] text-ink-400">{SOUND_CATALOG.length} suoni integrati</span>
      </div>
      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca suono…"
        className="w-full mb-3 px-3 py-2 rounded-lg bg-ink-900 border border-ink-700 text-[12.5px] text-ink-100 placeholder:text-ink-400 outline-none focus:border-teal-500 transition-colors"
      />
      {list.length === 0 && <p className="text-[12px] text-ink-400 py-6 text-center">Nessun suono trovato per "{q}"</p>}
      <div className="space-y-1.5">
        {list.map((s) => (
          <div key={s.id} className="group rounded-lg bg-ink-850 border border-ink-750 hover:border-teal-500/50 transition-colors p-2.5">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => void preview(s.id)}
                className={`w-8 h-8 rounded-full grid place-items-center shrink-0 transition-all active:scale-90 ${playingId === s.id ? "bg-teal-400 text-ink-950" : "bg-ink-750 text-teal-400 hover:bg-ink-700"}`}
                aria-label={`Anteprima ${s.name}`}
              >
                <Icon name={playingId === s.id ? "pause" : "play"} size={13} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12.5px] font-bold text-ink-100 truncate">{s.name}</span>
                  <span className="font-mono text-[10px] text-ink-400 shrink-0">{s.dur.toFixed(1)}s</span>
                </div>
                <WaveMini buffer={waves[s.id] ?? null} active={playingId === s.id} />
              </div>
            </div>
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={() => lib.addSound(s.id)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[11px] font-bold hover:bg-teal-500/25 active:scale-[0.98] transition-all"
              >
                <Icon name="plus" size={12} /> Importa in timeline
              </button>
              <button
                onClick={() => void download(s.id)}
                className="px-2.5 inline-flex items-center justify-center rounded-md bg-ink-750 text-ink-200 border border-ink-700 hover:text-white hover:border-ink-600 active:scale-95 transition-all"
                aria-label={`Scarica ${s.name}`} title="Scarica WAV"
              >
                <Icon name="download" size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10.5px] leading-relaxed text-ink-400 mt-3">
        I suoni sono sintetizzati nel browser (zero download, zero server). Apri soundbuttonslab.com per sfogliare la libreria completa.
      </p>
    </div>
  );
};

const WaveMini = ({ buffer, active }: { buffer: AudioBuffer | null; active: boolean }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawWaveform(ref.current, buffer, active ? "#7de8d5" : "#39d0b8");
  }, [buffer, active]);
  return <canvas ref={ref} width={150} height={22} className="w-full h-[22px] mt-1 opacity-80" />;
};

/* ---------- tab green screen ---------- */

const GreenTab = () => {
  const lib = useAddFromLibrary();
  const addClip = useStudio((s) => s.addClip);
  const toast = useStudio((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast("Carica un file video (mp4, webm…)", "danger"); return; }
    setImporting(true);
    const src = URL.createObjectURL(f);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = src;
    v.onloadedmetadata = () => {
      const dur = isFinite(v.duration) && v.duration > 0 ? Math.min(10, v.duration) : 4;
      addClip({ kind: "video", track: "fx", refId: "upload", name: f.name.replace(/\.[^.]+$/, ""), start: useStudio.getState().playhead, duration: dur, src, chroma: true, tolerance: 90, softness: 2.5 });
      setImporting(false);
      toast("Green screen importato — chroma key attivo", "success");
    };
    v.onerror = () => { setImporting(false); toast("Impossibile leggere il video", "danger"); };
  };

  return (
    <div>
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full mb-3 rounded-lg border-2 border-dashed border-limey-400/40 bg-limey-400/5 hover:bg-limey-400/10 hover:border-limey-400/70 transition-all py-3.5 flex flex-col items-center gap-1 active:scale-[0.99]"
      >
        <Icon name="upload" size={18} className="text-limey-400" />
        <span className="text-[12px] font-bold text-ink-100">{importing ? "Importazione…" : "Carica il tuo green screen"}</span>
        <span className="text-[10.5px] text-ink-400">Video da YouTube salvato in locale — il verde viene rimosso in automatico</span>
      </button>
      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />

      <SectionTitle>Libreria effetti ({FX_CATALOG.length})</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {FX_CATALOG.map((fx) => (
          <button
            key={fx.id} onClick={() => lib.addFx(fx.id)}
            className="group text-left rounded-lg overflow-hidden bg-ink-850 border border-ink-750 hover:border-limey-400/60 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <div className="relative">
              <FxThumb fx={fx} />
              <span className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-ink-950/80 text-limey-400 rounded-full p-1">
                <Icon name="plus" size={12} />
              </span>
            </div>
            <div className="px-2 py-1.5">
              <div className="text-[11.5px] font-bold text-ink-100 leading-tight">{fx.name}</div>
              <div className="text-[10px] text-ink-400 leading-tight">{fx.desc}</div>
            </div>
          </button>
        ))}
      </div>
      <p className="text-[10.5px] leading-relaxed text-ink-400 mt-3">
        Tutti gli effetti nascono su fondo verde: in timeline il <strong className="text-limey-400">chroma key</strong> rimuove lo sfondo automaticamente. Disattivalo dall'inspector per vedere il verde.
      </p>
    </div>
  );
};

/* ---------- tab modelli con luci ---------- */

const ModelsTab = () => {
  const lib = useAddFromLibrary();
  const lights = useStudio((s) => s.lights);
  const setLights = useStudio((s) => s.setLights);
  return (
    <div>
      <SectionTitle>Modelli nella scena</SectionTitle>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {MODEL_CATALOG.map((m) => (
          <button
            key={m.id} onClick={() => lib.addModel(m.id)}
            className="group text-left rounded-lg bg-ink-850 border border-ink-750 hover:border-rosex-400/60 transition-all hover:-translate-y-0.5 active:scale-[0.98] p-2.5"
          >
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#e0637c" strokeWidth="1.4" className="mb-1.5 group-hover:scale-110 transition-transform">
              {MODEL_GLYPHS[m.id]}
            </svg>
            <div className="text-[11.5px] font-bold text-ink-100 leading-tight">{m.name}</div>
            <div className="text-[10px] text-ink-400 leading-tight">{m.desc}</div>
          </button>
        ))}
      </div>

      <SectionTitle right={<Icon name="sun" size={13} className="text-warnx-400" />}>Luci della scena</SectionTitle>
      <div className="rounded-lg bg-ink-850 border border-ink-750 p-3">
        <Slider label="Luce ambiente" value={lights.ambient} min={0} max={2} step={0.05} color="#e0637c" onChange={(v) => setLights({ ambient: v })} fmt={(v) => v.toFixed(2)} />
        <Slider label="Key · intensità" value={lights.keyIntensity} min={0} max={6} step={0.1} color="#ffd166" onChange={(v) => setLights({ keyIntensity: v })} fmt={(v) => v.toFixed(1)} />
        <Slider label="Key · angolo" value={lights.keyAngle} min={-180} max={180} step={1} color="#ffd166" onChange={(v) => setLights({ keyAngle: v })} fmt={(v) => `${v}°`} />
        <Slider label="Key · altezza" value={lights.keyElev} min={5} max={85} step={1} color="#ffd166" onChange={(v) => setLights({ keyElev: v })} fmt={(v) => `${v}°`} />
        <Slider label="Rim · intensità" value={lights.rimIntensity} min={0} max={4} step={0.1} color="#39d0b8" onChange={(v) => setLights({ rimIntensity: v })} fmt={(v) => v.toFixed(1)} />
        <div className="flex items-center gap-4 mt-1">
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
            Key
            <input type="color" value={lights.keyColor} onChange={(e) => setLights({ keyColor: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
            Rim
            <input type="color" value={lights.rimColor} onChange={(e) => setLights({ rimColor: e.target.value })} />
          </label>
        </div>
      </div>
      <p className="text-[10.5px] leading-relaxed text-ink-400 mt-3">
        Seleziona una clip 3D in timeline per animarla con i <strong className="text-rosex-400">keyframe</strong>: sposta il playhead, regola posizione e rotazione, aggiungi il keyframe.
      </p>
    </div>
  );
};

/* ---------- pannello principale ---------- */

export const LeftPanel = () => {
  const [tab, setTab] = useState<TabId>("preset");
  const lib = useAddFromLibrary();

  return (
    <aside className="w-[280px] shrink-0 bg-ink-900 border-r border-ink-800 flex flex-col min-h-0">
      <nav className="flex border-b border-ink-800 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[9.5px] font-bold uppercase tracking-wide transition-colors relative ${tab === t.id ? "text-ink-100" : "text-ink-400 hover:text-ink-200"}`}
            style={tab === t.id ? { color: t.color } : undefined}
          >
            <Icon name={t.icon} size={17} />
            {t.label}
            {tab === t.id && <span className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-t-full" style={{ background: t.color }} />}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {tab === "preset" && (
          <div>
            <SectionTitle>Motion preset per il testo</SectionTitle>
            <div className="space-y-2">
              {PRESET_CATALOG.map((p) => (
                <button
                  key={p.id} onClick={() => lib.addPreset(p.id)}
                  className="w-full text-left rounded-lg bg-ink-850 border border-ink-750 hover:border-ember-500/60 transition-all hover:-translate-y-px active:scale-[0.99] p-3 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="font-display font-bold text-[17px] leading-none truncate"
                      style={{ color: p.css.color, textShadow: p.css.shadow, fontWeight: p.css.weight }}
                    >
                      {p.sample}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-ember-400 shrink-0"><Icon name="plus" size={14} /></span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-[11.5px] font-bold text-ink-100">{p.name}</span>
                    <span className="text-[10px] text-ink-400">{p.desc}</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10.5px] leading-relaxed text-ink-400 mt-3">
              Clicca per aggiungere il preset al playhead. Poi personalizza testo, font e colori dall'inspector a destra.
            </p>
          </div>
        )}
        {tab === "suoni" && <SoundsTab />}
        {tab === "green" && <GreenTab />}
        {tab === "sfondi" && (
          <div>
            <SectionTitle>Layer di sfondo faceless</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {BG_CATALOG.map((bg) => (
                <button
                  key={bg.id} onClick={() => lib.addBg(bg.id, bg.name)}
                  className="group text-left rounded-lg overflow-hidden bg-ink-850 border border-ink-750 hover:border-skyx-400/60 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <BgThumb bg={bg} />
                  <div className="px-2 py-1.5">
                    <div className="text-[11.5px] font-bold text-ink-100 leading-tight">{bg.name}</div>
                    <div className="text-[10px] text-ink-400 leading-tight">{bg.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10.5px] leading-relaxed text-ink-400 mt-3">
              Sfondo animato + testo = video faceless completo. Lo sfondo copre dal playhead fino a fine progetto.
            </p>
          </div>
        )}
        {tab === "modelli" && <ModelsTab />}
      </div>
    </aside>
  );
};


