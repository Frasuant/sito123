import { useEffect, useMemo, useRef, useState } from "react";
import { useAddFromLibrary, useStudio } from "../state";
import { PRESET_CATALOG } from "../lib/presets";
import { FX_CATALOG } from "../lib/effects";
import { BG_CATALOG } from "../lib/backgrounds";
import { MODEL_CATALOG } from "../lib/models";
import { SOUND_CATALOG, audioEngine, bufferToWav, getSoundBuffer } from "../lib/audio";
import { Icon } from "./ui";
import { fmtSize, uid, type MediaAsset } from "../types";

type Tab = "media" | "motion" | "sounds" | "greens" | "bgs" | "models";

const TABS: { id: Tab; label: string; icon: "upload" | "type" | "wave" | "film" | "image" | "cube" }[] = [
  { id: "media", label: "Media", icon: "upload" },
  { id: "motion", label: "Motion", icon: "type" },
  { id: "sounds", label: "Suoni", icon: "wave" },
  { id: "greens", label: "Green", icon: "film" },
  { id: "bgs", label: "Sfondi", icon: "image" },
  { id: "models", label: "Modelli", icon: "cube" },
];

const SectionTitle = ({ children }: { children: string }) => (
  <h2 className="font-display text-[13px] font-bold text-ink-100 uppercase tracking-wide">{children}</h2>
);

/* ---------------- MEDIA ---------------- */

const MediaPanel = () => {
  const mediaAssets = useStudio((s) => s.mediaAssets);
  const importFiles = useStudio((s) => s.importFiles);
  const addAssetToTimeline = useStudio((s) => s.addAssetToTimeline);
  const removeMediaAsset = useStudio((s) => s.removeMediaAsset);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hot, setHot] = useState(false);

  const KIND_ICON: Record<MediaAsset["kind"], "film" | "image" | "cube"> = { video: "film", image: "image", model: "cube" };
  const KIND_LABEL: Record<MediaAsset["kind"], string> = { video: "Video", image: "Immagine", model: "Modello 3D" };

  return (
    <div className="space-y-3">
      <SectionTitle>I tuoi file</SectionTitle>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setHot(true); }}
        onDragLeave={() => setHot(false)}
        onDrop={(e) => {
          e.preventDefault();
          setHot(false);
          if (e.dataTransfer.files.length) void importFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-all ${hot ? "border-ink-200 bg-ink-750 scale-[1.01]" : "border-ink-600 bg-ink-850 hover:border-ink-400 hover:bg-ink-800"}`}
      >
        <Icon name="upload" size={22} className={`mx-auto mb-2 ${hot ? "text-ink-100" : "text-ink-400"}`} />
        <p className="text-[12px] font-bold text-ink-200">Trascina qui i tuoi file</p>
        <p className="text-[10.5px] text-ink-400 mt-0.5 leading-relaxed">
          Video · Immagini · Modelli 3D<br />
          <span className="font-mono text-[9.5px]">.mp4 .webm .mov .png .jpg .glb .gltf .obj</span>
        </p>
        <input
          ref={inputRef} type="file" multiple className="hidden"
          accept="video/*,image/*,.glb,.gltf,.obj,.mp4,.webm,.mov,.png,.jpg,.jpeg,.webp"
          onChange={(e) => { if (e.target.files?.length) void importFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-ink-850 border border-warnx-400/25 px-3 py-2.5">
        <Icon name="spark" size={14} className="text-warnx-400 shrink-0 mt-0.5" />
        <p className="text-[10.5px] leading-snug text-ink-300">
          <span className="font-bold text-warnx-400">AI integrata:</span> i video importati vengono analizzati e il green screen viene rimosso automaticamente, senza fare nulla.
        </p>
      </div>

      {mediaAssets.length === 0 ? (
        <p className="text-[11px] text-ink-400 leading-relaxed px-1">
          La libreria è vuota. I file importati restano salvati nel browser anche dopo il reload.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {mediaAssets.map((a) => (
            <li key={a.id} className="group flex items-center gap-2.5 rounded-lg bg-ink-850 border border-ink-750 px-2.5 py-2 hover:border-ink-600 transition-colors">
              <span className="w-8 h-8 rounded-md bg-ink-750 grid place-items-center shrink-0">
                <Icon name={KIND_ICON[a.kind]} size={15} className="text-ink-300" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-bold text-ink-100 truncate">{a.name}</p>
                <p className="text-[9.5px] text-ink-400 font-mono">
                  {KIND_LABEL[a.kind]} · {a.ext.toUpperCase()} · {fmtSize(a.size)}
                  {a.missing && <span className="text-danger-400 font-sans font-bold"> · file mancante</span>}
                </p>
              </div>
              <button
                onClick={() => addAssetToTimeline(a.id)}
                title="Aggiungi al playhead"
                className="w-7 h-7 grid place-items-center rounded-md bg-ink-750 text-ink-200 hover:bg-ink-100 hover:text-ink-950 active:scale-90 transition-all"
              >
                <Icon name="plus" size={13} />
              </button>
              <button
                onClick={() => removeMediaAsset(a.id)}
                title="Rimuovi"
                className="w-7 h-7 grid place-items-center rounded-md text-ink-400 hover:bg-danger-400/15 hover:text-danger-400 active:scale-90 transition-all"
              >
                <Icon name="trash" size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ---------------- MOTION PRESET ---------------- */

const MotionPanel = () => {
  const add = useAddFromLibrary();
  return (
    <div className="space-y-3">
      <SectionTitle>Animazioni testo</SectionTitle>
      <p className="text-[11px] text-ink-400 leading-relaxed -mt-1">
        Preset motion graphics pronti per i tuoi titoli. Ogni preset è personalizzabile dall'inspector.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {PRESET_CATALOG.map((p) => (
          <button
            key={p.id}
            onClick={() => add.addPreset(p.id)}
            className="rounded-lg bg-ink-850 border border-ink-750 hover:border-ink-400 hover:bg-ink-800 px-3 py-3 text-left transition-all active:scale-[0.97] group"
          >
            <span className="block text-[11.5px] font-bold text-ink-100 group-hover:text-white">{p.name}</span>
            <span className="block text-[9.5px] text-ink-400 mt-0.5">aggiungi al playhead</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------------- SUONI ---------------- */

const SoundPanel = () => {
  const add = useAddFromLibrary();
  const toast = useStudio((s) => s.toast);
  const [q, setQ] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  
  const list = useMemo(
    () => SOUND_CATALOG.filter((s) => !q || (s.name + " " + s.desc + " " + s.tags).toLowerCase().includes(q.toLowerCase())),
    [q]
  );

  useEffect(() => () => audioEngine.stopAll(), []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioContextRef.current = new AudioContext();
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
        
        // Crea un ID unico per la registrazione
        const recordId = `rec_${Date.now()}`;
        const duration = audioBuffer.duration;
        
        // Salva il buffer audio nel catalogo suoni temporaneo
        (window as any).__customSounds = (window as any).__customSounds || {};
        (window as any).__customSounds[recordId] = audioBuffer;
        
        // Aggiungi alla timeline
        add.addSound(recordId, `Registrazione ${new Date().toLocaleTimeString()}`, duration);
        toast(`Registrazione aggiunta (${duration.toFixed(1)}s)`, "success");
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        audioContextRef.current = null;
        setIsRecording(false);
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Timer per mostrare il tempo di registrazione
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 0.1);
      }, 100);

    } catch (err) {
      toast("Impossibile accedere al microfono", "error");
      console.error(err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const handleImportMP3 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const importId = `imp_${Date.now()}`;
        (window as any).__customSounds = (window as any).__customSounds || {};
        (window as any).__customSounds[importId] = audioBuffer;
        
        add.addSound(importId, file.name.replace(/\.[^/.]+$/, ""), audioBuffer.duration);
        toast(`Audio importato (${audioBuffer.duration.toFixed(1)}s)`, "success");
        
        audioContext.close();
      } catch (err) {
        toast("Errore nell'importazione audio", "error");
        console.error(err);
      }
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      {/* Registrazione e Import */}
      <div className="flex gap-2">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg text-[12px] font-bold transition-all active:scale-95 ${
            isRecording 
              ? "bg-danger-500 hover:bg-danger-400 text-white animate-pulse" 
              : "bg-ink-800 hover:bg-ink-750 text-ink-200 border border-ink-700"
          }`}
        >
          <Icon name={isRecording ? "square" : "mic"} size={14} />
          {isRecording ? `Registra (${recordingTime.toFixed(1)}s)` : "Registra Voce"}
        </button>
        <label className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-ink-800 hover:bg-ink-750 text-ink-200 border border-ink-700 text-[12px] font-bold cursor-pointer transition-all active:scale-95">
          <Icon name="upload" size={14} />
          Importa MP3
          <input
            type="file"
            accept=".mp3,.wav,.webm,audio/*"
            onChange={handleImportMP3}
            className="hidden"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <SectionTitle>Libreria suoni</SectionTitle>
        <a
          href="https://soundbuttonslab.com/" target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-bold text-ink-300 hover:text-ink-100 bg-ink-850 border border-ink-750 hover:border-ink-500 rounded-md px-2 py-1 transition-colors"
          title="Apri soundbuttonslab.com"
        >
          soundbuttonslab.com <Icon name="external" size={11} />
        </a>
      </div>
      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca: aria, boom, tick…"
        className="w-full bg-ink-850 border border-ink-700 rounded-lg px-3 py-2 text-[12px] text-ink-100 placeholder:text-ink-500 outline-none focus:border-ink-400 transition-colors"
      />
      {list.length === 0 && <p className="text-[11px] text-ink-400">Nessun suono trovato per "{q}".</p>}
      <ul className="space-y-1.5">
        {list.map((s) => (
          <li key={s.id} className="flex items-center gap-2 rounded-lg bg-ink-850 border border-ink-750 px-2.5 py-2 hover:border-ink-600 transition-colors">
            <button
              onClick={() => {
                if (playingId === s.id) { audioEngine.stopAll(); setPlayingId(null); return; }
                setPlayingId(s.id);
                void audioEngine.preview(s.id).finally(() => setTimeout(() => setPlayingId((p) => (p === s.id ? null : p)), s.dur * 1000));
              }}
              title="Anteprima"
              className={`w-8 h-8 grid place-items-center rounded-md shrink-0 active:scale-90 transition-all ${playingId === s.id ? "bg-ink-100 text-ink-950" : "bg-ink-750 text-ink-200 hover:bg-ink-600"}`}
            >
              <Icon name={playingId === s.id ? "pause" : "play"} size={13} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-bold text-ink-100 truncate">{s.name}</p>
              <p className="text-[9.5px] text-ink-400 truncate">{s.desc} · {s.dur}s</p>
            </div>
            <button
              onClick={async () => {
                const blob = bufferToWav(await getSoundBuffer(s.id));
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `${s.id}.wav`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 4000);
                toast(`"${s.name}" esportato come WAV`, "success");
              }}
              title="Scarica WAV"
              className="w-7 h-7 grid place-items-center rounded-md text-ink-400 hover:bg-ink-750 hover:text-ink-100 active:scale-90 transition-all"
            >
              <Icon name="download" size={13} />
            </button>
            <button
              onClick={() => add.addSound(s.id, s.name, s.dur)}
              title="Aggiungi in timeline"
              className="w-7 h-7 grid place-items-center rounded-md bg-ink-750 text-ink-200 hover:bg-ink-100 hover:text-ink-950 active:scale-90 transition-all"
            >
              <Icon name="plus" size={13} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ---------------- GREEN SCREEN ---------------- */

const GreenPanel = () => {
  const add = useAddFromLibrary();
  return (
    <div className="space-y-3">
      <SectionTitle>Green screen</SectionTitle>
      <p className="text-[11px] text-ink-400 leading-relaxed -mt-1">
        Effetti con sfondo verde già scontornato (chroma key). Puoi anche esportarli con il verde dall'inspector, o importare i tuoi video dalla tab Media.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {FX_CATALOG.map((f) => (
          <button
            key={f.id}
            onClick={() => add.addFx(f.id, f.name, f.cycle)}
            className="rounded-lg bg-ink-850 border border-ink-750 hover:border-limey-400/60 hover:bg-ink-800 px-3 py-3 text-left transition-all active:scale-[0.97] group"
          >
            <span className="block text-[11.5px] font-bold text-ink-100">{f.name}</span>
            <span className="block text-[9.5px] text-ink-400 mt-0.5">loop {f.cycle}s · key attivo</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------------- SFONDI ---------------- */

const BgPanel = () => {
  const add = useAddFromLibrary();
  return (
    <div className="space-y-3">
      <SectionTitle>Sfondi faceless</SectionTitle>
      <p className="text-[11px] text-ink-400 leading-relaxed -mt-1">
        Background animati perfetti come livello sotto ai testi. Le immagini importate dalla tab Media funzionano allo stesso modo.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {BG_CATALOG.map((b) => (
          <button
            key={b.id}
            onClick={() => add.addBg(b.id, b.name)}
            className="rounded-lg bg-ink-850 border border-ink-750 hover:border-ink-400 hover:bg-ink-800 px-3 py-3 text-left transition-all active:scale-[0.97]"
          >
            <span className="block text-[11.5px] font-bold text-ink-100">{b.name}</span>
            <span className="block text-[9.5px] text-ink-400 mt-0.5">6s in timeline</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------------- MODELLI ---------------- */

const MODEL_GLYPHS: Record<string, string> = {
  crystal: "M12 3l7 6-3.5 11h-7L5 9l7-6zM5 9h14M12 3v17",
  knot: "M8 6c8-4 12 4 6 8s-14 4-10-2 10-10 4-6zM9 18c-3 2-5-1-3-3",
  gem: "M7 4h10l4 5-9 11L3 9l4-5zM3 9h18M12 20L8.5 9l2-5M12 20l3.5-11-2-5",
  cube: "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12L4 7.5M12 12v9",
  pyramid: "M12 3l8 17H4l8-17zM12 3v17M4 20l8-6 8 6",
  sphere: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 9.5h17M3.5 14.5h17M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18",
  torus: "M12 5.5c5 0 9 2.9 9 6.5s-4 6.5-9 6.5-9-2.9-9-6.5 4-6.5 9-6.5zM12 9c2.5 0 4.5 1.3 4.5 3s-2 3-4.5 3-4.5-1.3-4.5-3 2-3 4.5-3z",
  dodeca: "M12 3l8.5 6.2-3.2 10H6.7L3.5 9.2 12 3zM12 3v6.5M20.5 9.2l-8.5.3M3.5 9.2l8.5.3M6.7 19.2l5.3-9.7M17.3 19.2L12 9.5",
};

const ModelsPanel = () => {
  const add = useAddFromLibrary();
  const mediaAssets = useStudio((s) => s.mediaAssets);
  const addAssetToTimeline = useStudio((s) => s.addAssetToTimeline);
  const removeMediaAsset = useStudio((s) => s.removeMediaAsset);
  const customs = mediaAssets.filter((a) => a.kind === "model");

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <SectionTitle>I tuoi modelli</SectionTitle>
        {customs.length === 0 ? (
          <p className="text-[11px] text-ink-400 leading-relaxed">
            Importa file <span className="font-mono text-[10px] text-ink-300">.glb · .gltf · .obj</span> dalla tab Media: appariranno qui, con luci e keyframe.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {customs.map((a) => (
              <li key={a.id} className="flex items-center gap-2.5 rounded-lg bg-ink-850 border border-ink-750 px-2.5 py-2 hover:border-ink-600 transition-colors">
                <span className="w-8 h-8 rounded-md bg-ink-750 grid place-items-center shrink-0">
                  <Icon name="cube" size={15} className="text-ink-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-bold text-ink-100 truncate">{a.name}</p>
                  <p className="text-[9.5px] text-ink-400 font-mono">.{a.ext} · {fmtSize(a.size)}{a.missing && <span className="text-danger-400 font-sans font-bold"> · mancante</span>}</p>
                </div>
                <button onClick={() => addAssetToTimeline(a.id)} title="Aggiungi in scena"
                  className="w-7 h-7 grid place-items-center rounded-md bg-ink-750 text-ink-200 hover:bg-ink-100 hover:text-ink-950 active:scale-90 transition-all">
                  <Icon name="plus" size={13} />
                </button>
                <button onClick={() => removeMediaAsset(a.id)} title="Rimuovi"
                  className="w-7 h-7 grid place-items-center rounded-md text-ink-400 hover:bg-danger-400/15 hover:text-danger-400 active:scale-90 transition-all">
                  <Icon name="trash" size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <SectionTitle>Modelli integrati</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {MODEL_CATALOG.map((m) => (
            <button
              key={m.id}
              onClick={() => add.addModel(m.id)}
              className="rounded-lg bg-ink-850 border border-ink-750 hover:border-ink-400 hover:bg-ink-800 px-3 py-3 text-left transition-all active:scale-[0.97] group flex items-center gap-2.5"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" className="text-ink-400 group-hover:text-ink-100 shrink-0 transition-colors">
                <path d={MODEL_GLYPHS[m.id] ?? MODEL_GLYPHS.crystal} />
              </svg>
              <span>
                <span className="block text-[11.5px] font-bold text-ink-100">{m.name}</span>
                <span className="block text-[9.5px] text-ink-400">keyframe + luci</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ---------------- shell ---------------- */

export const LeftPanel = () => {
  const [tab, setTab] = useState<Tab>("media");
  return (
    <aside className="w-[290px] shrink-0 bg-ink-900 border-r border-ink-800 flex flex-col min-h-0">
      <nav className="flex border-b border-ink-800 shrink-0 px-1.5 pt-1.5 gap-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-t-lg text-[9.5px] font-bold transition-all border-b-2 ${
              tab === t.id
                ? "text-ink-50 border-ink-100 bg-ink-850"
                : "text-ink-400 border-transparent hover:text-ink-200 hover:bg-ink-850/60"
            }`}
            aria-label={t.label}
          >
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {tab === "media" && <MediaPanel />}
        {tab === "motion" && <MotionPanel />}
        {tab === "sounds" && <SoundPanel />}
        {tab === "greens" && <GreenPanel />}
        {tab === "bgs" && <BgPanel />}
        {tab === "models" && <ModelsPanel />}
      </div>
    </aside>
  );
};
