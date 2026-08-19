import { useEffect, useState } from "react";
import { useStudio } from "./state";
import { LeftPanel } from "./components/LeftPanel";
import { Preview } from "./components/Preview";
import { Timeline } from "./components/Timeline";
import { Inspector } from "./components/Inspector";
import { ExportModal } from "./components/ExportModal";
import { Icon, Toasts, Toggle } from "./components/ui";

const Logo = () => (
  <div className="flex items-center gap-2.5 select-none">
    <div className="w-8 h-8 rounded-lg bg-ink-800 border border-ink-700 grid place-items-center relative overflow-hidden">
      <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
        <path d="M8 21 L16 6 L24 21 Z" stroke="#ff7a1a" strokeWidth="2.6" strokeLinejoin="round" />
        <circle cx="16" cy="24" r="3" fill="#39d0b8" />
      </svg>
    </div>
    <div className="leading-none">
      <div className="font-display font-bold text-[15px] tracking-tight text-ink-100">
        Moviola<span className="text-ember-500">.</span>
      </div>
      <div className="text-[8.5px] uppercase tracking-[0.22em] text-ink-400 font-bold mt-0.5">studio per creator</div>
    </div>
  </div>
);

const TopBar = ({ onExport }: { onExport: () => void }) => {
  const eco = useStudio((s) => s.eco);
  const setEco = useStudio((s) => s.setEco);
  const loadDemo = useStudio((s) => s.loadDemo);
  const clearProject = useStudio((s) => s.clearProject);
  const toast = useStudio((s) => s.toast);
  const clipCount = useStudio((s) => s.clips.length);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!confirmClear) return;
    const id = setTimeout(() => setConfirmClear(false), 2600);
    return () => clearTimeout(id);
  }, [confirmClear]);

  return (
    <header className="h-[52px] shrink-0 bg-ink-900 border-b border-ink-800 flex items-center gap-4 px-4">
      <Logo />
      <div className="hidden md:flex items-center gap-1.5 text-[10.5px] text-ink-400 bg-ink-850 border border-ink-750 rounded-full px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-limey-400" />
        salvataggio automatico attivo
      </div>

      <div className="flex-1" />

      <button
        onClick={loadDemo}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-ink-800 border border-ink-700 text-[11.5px] font-bold text-ink-200 hover:text-white hover:border-ink-600 active:scale-95 transition-all"
      >
        <Icon name="spark" size={13} className="text-warnx-400" /> Demo
      </button>

      <button
        onClick={() => {
          if (clipCount === 0) { toast("Il progetto è già vuoto", "info"); return; }
          if (!confirmClear) { setConfirmClear(true); return; }
          clearProject();
          setConfirmClear(false);
          toast("Progetto svuotato", "info");
        }}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[11.5px] font-bold active:scale-95 transition-all ${confirmClear ? "bg-danger-400/15 border-danger-400/50 text-danger-400" : "bg-ink-800 border-ink-700 text-ink-300 hover:text-white hover:border-ink-600"}`}
      >
        <Icon name="trash" size={13} /> {confirmClear ? "Confermi?" : "Nuovo"}
      </button>

      <div className="w-[168px] hidden lg:block bg-ink-850 border border-ink-750 rounded-lg px-2.5 py-0.5">
        <Toggle label="Modalità Eco" hint="Prestazioni per PC low-end" on={eco} onChange={(b) => { setEco(b); toast(b ? "Modalità Eco attiva — anteprima 480p" : "Modalità Eco disattivata", b ? "success" : "info"); }} />
      </div>

      <button
        onClick={onExport}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-ember-500 hover:bg-ember-400 text-ink-950 text-[12.5px] font-bold transition-all active:scale-95 shadow-lg shadow-ember-600/25"
      >
        <Icon name="export" size={14} /> Esporta 4K
      </button>
    </header>
  );
};

export default function App() {
  const [exporting, setExporting] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);
  const importFiles = useStudio((s) => s.importFiles);

  /* ripristina i file salvati in IndexedDB dopo il reload */
  useEffect(() => {
    void useStudio.getState().hydrateMedia();
  }, []);

  /* scorciatoie da tastiera */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const st = useStudio.getState();
      if (e.code === "Space") {
        e.preventDefault();
        if (!st.playing && st.playhead >= st.projectDur - 0.05) st.setPlayhead(0);
        st.setPlaying(!st.playing);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (st.selectedId) { st.removeClip(st.selectedId); st.toast("Clip eliminata", "info"); }
      } else if (e.key.toLowerCase() === "s") {
        if (st.selectedId) st.splitClip(st.selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hasFiles = (e: { dataTransfer: DataTransfer }) => Array.from(e.dataTransfer.types).includes("Files");

  return (
    <div
      className="h-full flex flex-col bg-ink-950 text-ink-100 overflow-hidden relative"
      onDragEnter={(e) => { if (hasFiles(e)) { e.preventDefault(); setDragDepth((d) => d + 1); } }}
      onDragOver={(e) => { if (hasFiles(e)) e.preventDefault(); }}
      onDragLeave={() => setDragDepth((d) => Math.max(0, d - 1))}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragDepth(0);
        if (e.dataTransfer.files.length) void importFiles(e.dataTransfer.files);
      }}
    >
      <TopBar onExport={() => setExporting(true)} />
      <div className="flex-1 flex min-h-0">
        <LeftPanel />
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <Preview />
          <Timeline />
        </main>
        <Inspector />
      </div>
      {exporting && <ExportModal onClose={() => setExporting(false)} />}
      <Toasts />

      {dragDepth > 0 && (
        <div className="absolute inset-0 z-40 bg-ink-950/80 backdrop-blur-sm grid place-items-center pointer-events-none p-8">
          <div className="w-full max-w-[520px] rounded-2xl border-2 border-dashed border-ink-200 bg-ink-900/80 px-8 py-12 text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-xl bg-ink-800 border border-ink-600 grid place-items-center text-ink-100">
              <Icon name="upload" size={26} />
            </div>
            <p className="font-display font-bold text-[17px] text-ink-50 mb-1">Rilascia per importare</p>
            <p className="text-[12px] text-ink-300 leading-relaxed">
              Video, immagini e modelli 3D (.glb .gltf .obj)<br />
              <span className="text-warnx-400 font-bold">AI</span> rimuoverà automaticamente il green screen dai video
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
