import type { CSSProperties, ReactNode } from "react";
import { useStudio } from "../state";

/* ---------- icone SVG inline ---------- */

const paths: Record<string, ReactNode> = {
  play: <path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor" stroke="none" />,
  pause: <path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z" fill="currentColor" stroke="none" />,
  skipBack: <path d="M6 5v14M18 5.5v13L8.5 12 18 5.5z" />,
  loop: <path d="M17 3.5l3 3-3 3M20 6.5H7a4 4 0 0 0-4 4v1M7 20.5l-3-3 3-3M4 17.5h13a4 4 0 0 0 4-4v-1" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" />,
  copy: <path d="M9 9h11v11H9zM5 15H4V4h11v1" />,
  split: <path d="M12 3v18M5 8l-3 4 3 4M19 8l3 4-3 4M8 12h.01M16 12h.01" />,
  download: <path d="M12 4v11M7.5 11l4.5 4.5L16.5 11M5 19.5h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  spark: <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3zM18.5 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />,
  wave: <path d="M3 12h2l2-6 3 12 3-16 3 14 2-6 3 2" />,
  film: <path d="M4 5h16v14H4zM4 9h16M4 15h16M8 5v14M16 5v14" />,
  image: <path d="M4 5h16v14H4zM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM4 17l5-5 3 3 4-4 4 4" />,
  cube: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12L4 7.5M12 12v9" />,
  type: <path d="M6 6V4.5h12V6M12 4.5v15M9 19.5h6" />,
  upload: <path d="M12 15V4M7.5 8L12 3.5 16.5 8M5 19.5h14" />,
  key: <path d="M12 3l2.2 2.2L12 7.4 9.8 5.2 12 3zM12 7.4v13.1M9 17l3 3.5 3-3.5" />,
  sun: <path d="M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" />,
  leaf: <path d="M5 19c0-8 5-13 14-14-.5 9-5.5 14-12 14M5 19c2-5 5-8 9-10" />,
  export: <path d="M12 14V3M8 7l4-4 4 4M4 13v7h16v-7" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  info: <path d="M12 8h.01M12 11v5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />,
  warn: <path d="M12 4L2.5 20h19L12 4zM12 10v4M12 17h.01" />,
  scissors: <path d="M6 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 22a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM20 4L8.5 15.5M20 20L8.5 8.5M14.5 14l1.5 1.5" />,
  zoomIn: <path d="M4 12h16M12 4v16" />,
  external: <path d="M14 4h6v6M20 4l-9 9M19 13.5V20H4V5h6.5" />,
  chevronL: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  gem: <path d="M7 4h10l4 5-9 11L3 9l4-5zM3 9h18M12 20L8.5 9l2-5M12 20l3.5-11-2-5" />,
};

export const Icon = ({ name, size = 16, className = "" }: { name: keyof typeof paths & string; size?: number; className?: string }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    className={`shrink-0 ${className}`} aria-hidden
  >
    {paths[name]}
  </svg>
);

/* ---------- slider con label ---------- */

export const Slider = ({
  label, value, min, max, step = 1, onChange, fmt, color = "#ff7a1a", compact = false,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; fmt?: (v: number) => string; color?: string; compact?: boolean;
}) => {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className={`block ${compact ? "mb-1.5" : "mb-3"}`}>
      <div className="flex items-baseline justify-between mb-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-300">{label}</span>
        <span className="font-mono text-[11px] text-ink-200 tabular-nums">{fmt ? fmt(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ "--fill": `${fill}%`, "--tw-range-fill": color } as CSSProperties}
      />
    </label>
  );
};

/* ---------- toggle ---------- */

export const Toggle = ({ label, on, onChange, hint }: { label: string; on: boolean; onChange: (b: boolean) => void; hint?: string }) => (
  <button
    onClick={() => onChange(!on)}
    className="w-full flex items-center justify-between gap-3 py-1.5 group text-left"
    role="switch" aria-checked={on}
  >
    <span>
      <span className="block text-[12.5px] font-semibold text-ink-100 group-hover:text-white transition-colors">{label}</span>
      {hint && <span className="block text-[10.5px] text-ink-400 leading-tight mt-0.5">{hint}</span>}
    </span>
    <span className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${on ? "bg-ember-500" : "bg-ink-600"}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-ink-100 transition-all duration-200 ${on ? "left-[18px]" : "left-0.5"}`} />
    </span>
  </button>
);

export const SectionTitle = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center justify-between mb-2 mt-1">
    <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400 font-display">{children}</h3>
    {right}
  </div>
);

/* ---------- toasts ---------- */

export const Toasts = () => {
  const toasts = useStudio((s) => s.toasts);
  const dismiss = useStudio((s) => s.dismissToast);
  const icons = { success: "check", info: "info", warn: "warn", danger: "warn" } as const;
  const colors = {
    success: "border-limey-400/60 text-limey-400",
    info: "border-skyx-400/60 text-skyx-400",
    warn: "border-warnx-400/60 text-warnx-400",
    danger: "border-danger-400/60 text-danger-400",
  } as const;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`anim-toast pointer-events-auto flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-lg bg-ink-800/95 border border-ink-700 border-l-2 ${colors[t.type]} shadow-xl shadow-black/40 text-left backdrop-blur-sm`}
        >
          <Icon name={icons[t.type]} size={15} />
          <span className="text-[12.5px] font-medium text-ink-100">{t.msg}</span>
        </button>
      ))}
    </div>
  );
};
