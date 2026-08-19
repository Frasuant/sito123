import type { Clip } from "../types";
import { smooth } from "../types";

export interface PresetDef {
  id: string;
  name: string;
  desc: string;
  sample: string;
  dur: number;
  css: { color: string; shadow?: string; weight: number };
  draw: (ctx: CanvasRenderingContext2D, clip: Clip, t: number, W: number, H: number) => void;
}

const setFont = (ctx: CanvasRenderingContext2D, clip: Clip, H: number, sizeMul = 1) => {
  const px = (clip.fontSize ?? 64) * (H / 720) * sizeMul;
  ctx.font = `700 ${px}px "${clip.font ?? "Space Grotesk"}"`;
};

const basePos = (clip: Clip, W: number, H: number) => ({
  x: (clip.x ?? 0.5) * W,
  y: (clip.y ?? 0.5) * H,
});

const paintText = (ctx: CanvasRenderingContext2D, clip: Clip, text: string) => {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if ((clip.strokeWidth ?? 0) > 0) {
    ctx.lineWidth = (clip.strokeWidth ?? 4) * 2;
    ctx.lineJoin = "round";
    ctx.strokeStyle = clip.strokeColor ?? "#10141b";
    ctx.strokeText(text, 0, 0);
  }
  ctx.fillStyle = clip.color ?? "#e6ebf4";
  ctx.fillText(text, 0, 0);
};

const easeOutBack = (t: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

export const PRESET_CATALOG: PresetDef[] = [
  {
    id: "popin", name: "Pop In", desc: "Rimbalzo elastico d'ingresso", sample: "POP!", dur: 2.5,
    css: { color: "#ffd166", weight: 700 },
    draw(ctx, clip, t, W, H) {
      const k = Math.min(1, t / 0.45);
      const out = t > (clip.duration ?? 2.5) - 0.25 ? Math.max(0, ((clip.duration ?? 2.5) - t) / 0.25) : 1;
      const s = easeOutBack(k) * out;
      const { x, y } = basePos(clip, W, H);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      setFont(ctx, clip, H);
      paintText(ctx, clip, clip.text ?? "");
      ctx.restore();
    },
  },
  {
    id: "typewriter", name: "Typewriter", desc: "Digitazione lettera per lettera", sample: "Scrivi qui...", dur: 3.5,
    css: { color: "#7de8d5", weight: 500 },
    draw(ctx, clip, t, W, H) {
      const full = clip.text ?? "";
      const n = Math.min(full.length, Math.floor(t / 0.07));
      const caret = Math.floor(t * 2.4) % 2 === 0 ? "|" : "";
      const { x, y } = basePos(clip, W, H);
      ctx.save();
      ctx.translate(x, y);
      setFont(ctx, clip, H);
      paintText(ctx, clip, full.slice(0, n) + caret);
      ctx.restore();
    },
  },
  {
    id: "glitch", name: "Titolo Glitch", desc: "Separazione RGB e slice", sample: "GLITCH", dur: 3,
    css: { color: "#e6ebf4", shadow: "2px 0 #ff0050, -2px 0 #00ffd0", weight: 700 },
    draw(ctx, clip, t, W, H) {
      const { x, y } = basePos(clip, W, H);
      setFont(ctx, clip, H);
      const j = () => (Math.random() - 0.5) * 8 * (Math.sin(t * 7) > 0.3 ? 1 : 0.25);
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#ff0050";
      ctx.fillText(clip.text ?? "", j() - 3, j() * 0.4);
      ctx.fillStyle = "#00ffd0";
      ctx.fillText(clip.text ?? "", j() + 3, j() * 0.4);
      ctx.globalAlpha = 1;
      ctx.fillStyle = clip.color ?? "#e6ebf4";
      ctx.fillText(clip.text ?? "", j() * 0.5, 0);
      // barra di disturbo
      if (Math.sin(t * 11) > 0.75) {
        const bw = ctx.measureText(clip.text ?? "").width;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(-bw / 2, (Math.random() - 0.5) * 40, bw, 3);
      }
      ctx.restore();
    },
  },
  {
    id: "neon", name: "Neon Pulse", desc: "Bagliore al neon pulsante", sample: "NEON", dur: 3,
    css: { color: "#39d0b8", shadow: "0 0 14px #39d0b8", weight: 700 },
    draw(ctx, clip, t, W, H) {
      const { x, y } = basePos(clip, W, H);
      const pulse = 12 + Math.sin(t * 4) * 8;
      ctx.save();
      ctx.translate(x, y);
      setFont(ctx, clip, H);
      ctx.shadowColor = clip.color ?? "#39d0b8";
      ctx.shadowBlur = pulse * (H / 720);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = clip.color ?? "#39d0b8";
      ctx.fillText(clip.text ?? "", 0, 0);
      ctx.shadowBlur = pulse * 0.4 * (H / 720);
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.55;
      ctx.fillText(clip.text ?? "", 0, 0);
      ctx.restore();
    },
  },
  {
    id: "slideup", name: "Slide Up", desc: "Sale sfumando dal basso", sample: "Slide up", dur: 2.5,
    css: { color: "#5aa9ff", weight: 600 },
    draw(ctx, clip, t, W, H) {
      const k = smooth(Math.min(1, t / 0.5));
      const out = t > (clip.duration ?? 2.5) - 0.3 ? Math.max(0, ((clip.duration ?? 2.5) - t) / 0.3) : 1;
      const { x, y } = basePos(clip, W, H);
      ctx.save();
      ctx.translate(x, y + (1 - k) * H * 0.09);
      ctx.globalAlpha = k * out;
      setFont(ctx, clip, H);
      paintText(ctx, clip, clip.text ?? "");
      ctx.restore();
    },
  },
  {
    id: "lowerthird", name: "Lower Third", desc: "Barra nome stile intervista", sample: "Nome Creator", dur: 4,
    css: { color: "#ff9548", weight: 600 },
    draw(ctx, clip, t, W, H) {
      const k = smooth(Math.min(1, t / 0.45));
      const out = t > (clip.duration ?? 4) - 0.35 ? Math.max(0, ((clip.duration ?? 4) - t) / 0.35) : 1;
      const { x, y } = basePos(clip, W, H);
      setFont(ctx, clip, H, 0.55);
      const tw = ctx.measureText(clip.text ?? "").width;
      const bw = tw + H * 0.09;
      const bh = H * 0.075;
      ctx.save();
      ctx.globalAlpha = out;
      ctx.translate(x - (1 - k) * W * 0.3, y);
      ctx.fillStyle = "rgba(16,20,27,0.88)";
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
      ctx.fillStyle = clip.color ?? "#ff7a1a";
      ctx.fillRect(-bw / 2, -bh / 2, H * 0.012, bh);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#e6ebf4";
      ctx.fillText(clip.text ?? "", 0, 1);
      ctx.restore();
    },
  },
  {
    id: "stamp", name: "Timbro", desc: "Cade dall'alto come un timbro", sample: "APPROVATO", dur: 2.2,
    css: { color: "#ff5d5d", weight: 700 },
    draw(ctx, clip, t, W, H) {
      const k = Math.min(1, t / 0.22);
      const s = 2.6 - 1.6 * easeOutBack(k);
      const shake = t < 0.3 ? (1 - t / 0.3) * 6 : 0;
      const { x, y } = basePos(clip, W, H);
      ctx.save();
      ctx.translate(x + (Math.random() - 0.5) * shake, y);
      ctx.rotate(-0.09);
      ctx.scale(Math.max(0.01, s), Math.max(0.01, s));
      setFont(ctx, clip, H, 0.9);
      ctx.lineWidth = (clip.fontSize ?? 64) * (H / 720) * 0.045;
      ctx.strokeStyle = clip.color ?? "#ff5d5d";
      ctx.strokeRect(
        -ctx.measureText(clip.text ?? "").width / 2 - H * 0.03,
        -(clip.fontSize ?? 64) * (H / 720) * 0.62,
        ctx.measureText(clip.text ?? "").width + H * 0.06,
        (clip.fontSize ?? 64) * (H / 720) * 1.24
      );
      paintText(ctx, clip, clip.text ?? "");
      ctx.restore();
    },
  },
  {
    id: "wave", name: "Onda Lettere", desc: "Ogni lettera ondeggia", sample: "ONDA", dur: 3,
    css: { color: "#b7c0d0", weight: 700 },
    draw(ctx, clip, t, W, H) {
      const text = clip.text ?? "";
      const { x, y } = basePos(clip, W, H);
      setFont(ctx, clip, H);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const widths = [...text].map((ch) => ctx.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0);
      let cx = x - total / 2;
      [...text].forEach((ch, i) => {
        ctx.save();
        ctx.translate(cx + widths[i] / 2, y + Math.sin(t * 5 + i * 0.6) * H * 0.014);
        ctx.fillStyle = clip.color ?? "#e6ebf4";
        ctx.textAlign = "center";
        ctx.fillText(ch, 0, 0);
        ctx.restore();
        cx += widths[i];
      });
    },
  },
  {
    id: "karaoke", name: "Highlight Parola", desc: "Riempimento progressivo", sample: "Segui il ritmo", dur: 3.5,
    css: { color: "#ffd166", weight: 700 },
    draw(ctx, clip, t, W, H) {
      const text = clip.text ?? "";
      const { x, y } = basePos(clip, W, H);
      setFont(ctx, clip, H);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tw = ctx.measureText(text).width;
      const prog = Math.min(1, t / ((clip.duration ?? 3.5) * 0.8));
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = "rgba(230,235,244,0.25)";
      ctx.fillText(text, 0, 0);
      ctx.beginPath();
      ctx.rect(-tw / 2, -H * 0.08, tw * prog, H * 0.16);
      ctx.clip();
      ctx.fillStyle = clip.color ?? "#ffd166";
      ctx.fillText(text, 0, 0);
      ctx.restore();
    },
  },
];

export const getPreset = (id: string) => PRESET_CATALOG.find((p) => p.id === id) ?? PRESET_CATALOG[0];

export const FONT_OPTIONS = ["Space Grotesk", "Manrope", "JetBrains Mono", "Georgia"];
