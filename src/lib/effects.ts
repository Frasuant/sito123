import { hash } from "../types";

export interface FxDef {
  id: string;
  name: string;
  desc: string;
  dur: number; // durata consigliata clip
  cycle: number; // ciclo di loop in secondi
  draw: (ctx: CanvasRenderingContext2D, t: number, w: number, h: number, eco: boolean) => void;
}

const TAU = Math.PI * 2;

/** particella deterministica */
const P = (i: number, salt: number) => ({
  a: hash(i * 3 + salt) * TAU,
  v: 0.3 + hash(i * 7 + salt) * 0.7,
  size: 0.5 + hash(i * 11 + salt) * 0.8,
  hue: hash(i * 13 + salt),
  life: 0.6 + hash(i * 17 + salt) * 0.4,
});

const fxExplosion: FxDef = {
  id: "explosion", name: "Esplosione Bomba", desc: "Boato, onda d'urto e detriti", dur: 2.4, cycle: 2.4,
  draw(ctx, t, w, h, eco) {
    const n = eco ? 34 : 64;
    const cx = w / 2, cy = h * 0.55, R = Math.min(w, h);
    // flash iniziale
    if (t < 0.18) {
      ctx.fillStyle = `rgba(255,240,200,${(1 - t / 0.18) * 0.9})`;
      ctx.fillRect(0, 0, w, h);
    }
    // onda d'urto
    const rt = t / 0.9;
    if (rt < 1) {
      ctx.strokeStyle = `rgba(255,220,160,${(1 - rt) * 0.8})`;
      ctx.lineWidth = R * 0.02 * (1 - rt) + 2;
      ctx.beginPath();
      ctx.arc(cx, cy, rt * R * 0.62, 0, TAU);
      ctx.stroke();
    }
    // nucleo
    if (t < 0.5) {
      const k = t / 0.5;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.22 * (0.4 + k));
      g.addColorStop(0, `rgba(255,255,230,${1 - k})`);
      g.addColorStop(0.5, `rgba(255,140,30,${(1 - k) * 0.9})`);
      g.addColorStop(1, "rgba(120,30,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    // detriti
    for (let i = 0; i < n; i++) {
      const p = P(i, 5);
      const lt = (t / (1.4 * p.life)) % 1;
      if (t > 1.9) continue;
      const dist = lt * R * 0.55 * p.v;
      const x = cx + Math.cos(p.a) * dist;
      const y = cy + Math.sin(p.a) * dist * 0.8 + lt * lt * R * 0.25;
      const sz = R * 0.014 * p.size * (1 - lt);
      ctx.fillStyle = p.hue > 0.5 ? `rgba(255,${120 + p.hue * 100},40,${1 - lt})` : `rgba(60,60,66,${(1 - lt) * 0.85})`;
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
    // fumo tardivo
    for (let i = 0; i < (eco ? 5 : 9); i++) {
      const p = P(i, 21);
      const lt = (t - 0.4) / 1.8;
      if (lt < 0 || lt > 1) continue;
      const x = cx + (p.hue - 0.5) * R * 0.3 + Math.sin(lt * 4 + i) * R * 0.03;
      const y = cy - lt * R * 0.4;
      const r = R * 0.05 * (0.4 + lt) * p.size;
      ctx.fillStyle = `rgba(80,80,88,${(1 - lt) * 0.4})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  },
};

const fxFire: FxDef = {
  id: "fire", name: "Colonna di Fuoco", desc: "Fiamme animate dal basso", dur: 3, cycle: 1.5,
  draw(ctx, t, w, h, eco) {
    const n = eco ? 22 : 40;
    const R = Math.min(w, h);
    for (let i = 0; i < n; i++) {
      const p = P(i, 33);
      const lt = (t * (0.7 + p.hue * 0.6) + p.v) % 1;
      const x = w / 2 + (p.hue - 0.5) * R * 0.34 * (1 - lt * 0.5) + Math.sin((t * 3 + i) * 2) * R * 0.02;
      const y = h * 0.98 - lt * h * 0.75;
      const r = R * 0.09 * p.size * (1 - lt * 0.75);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const hue = 55 - lt * 55;
      g.addColorStop(0, `hsla(${hue},100%,${70 - lt * 30}%,${(1 - lt) * 0.9})`);
      g.addColorStop(1, "hsla(10,100%,40%,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  },
};

const fxSmoke: FxDef = {
  id: "smoke", name: "Fumo Denso", desc: "Nuvola grigia che sale", dur: 3, cycle: 2.2,
  draw(ctx, t, w, h, eco) {
    const n = eco ? 10 : 16;
    const R = Math.min(w, h);
    for (let i = 0; i < n; i++) {
      const p = P(i, 55);
      const lt = (t * 0.45 + p.v * 0.7) % 1;
      const x = w / 2 + (p.hue - 0.5) * R * 0.5 + Math.sin(t + i * 2) * R * 0.04;
      const y = h * 0.9 - lt * h * 0.8;
      const r = R * 0.06 * (0.3 + lt * 1.6) * p.size;
      ctx.fillStyle = `rgba(150,152,160,${(1 - lt) * 0.32})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  },
};

const fxBolt: FxDef = {
  id: "bolt", name: "Fulmine", desc: "Scarica elettrica con flash", dur: 1.8, cycle: 1.8,
  draw(ctx, t, w, h) {
    const strikes = [0, 0.7];
    const R = Math.min(w, h);
    for (const st of strikes) {
      const lt = t - st;
      if (lt < 0 || lt > 0.5) continue;
      const k = lt / 0.5;
      if (lt < 0.08) {
        ctx.fillStyle = `rgba(220,230,255,${(1 - lt / 0.08) * 0.5})`;
        ctx.fillRect(0, 0, w, h);
      }
      const seed = Math.floor(lt * 24) + st * 100;
      const alpha = 1 - k;
      ctx.strokeStyle = `rgba(235,240,255,${alpha})`;
      ctx.lineWidth = R * 0.012;
      ctx.shadowColor = "rgba(140,170,255,0.9)";
      ctx.shadowBlur = R * 0.03;
      ctx.beginPath();
      let x = w * 0.5 + (hash(seed) - 0.5) * w * 0.2;
      ctx.moveTo(x, 0);
      const segs = 9;
      for (let i = 1; i <= segs; i++) {
        x += (hash(seed + i * 7) - 0.5) * w * 0.14;
        ctx.lineTo(x, (i / segs) * h * 0.95);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  },
};

const fxConfetti: FxDef = {
  id: "confetti", name: "Coriandoli", desc: "Pioggia di festa colorata", dur: 3, cycle: 2.4,
  draw(ctx, t, w, h, eco) {
    const n = eco ? 40 : 80;
    const colors = ["#ff7a1a", "#39d0b8", "#5aa9ff", "#ffd166", "#e0637c", "#52d273"];
    for (let i = 0; i < n; i++) {
      const p = P(i, 77);
      const lt = (t * (0.35 + p.v * 0.4) + p.hue) % 1;
      const x = p.hue * w + Math.sin(lt * 6 + i) * w * 0.03;
      const y = lt * h * 1.15 - h * 0.08;
      const sz = Math.min(w, h) * 0.016 * p.size;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lt * TAU * (p.v > 0.5 ? 1.5 : -1.2) + i);
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = lt > 0.9 ? (1 - lt) * 10 : 1;
      ctx.fillRect(-sz / 2, -sz / 4, sz, sz / 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
};

const fxMoney: FxDef = {
  id: "money", name: "Pioggia di Soldi", desc: "Banconote che cadono", dur: 3, cycle: 2.2,
  draw(ctx, t, w, h, eco) {
    const n = eco ? 12 : 22;
    const R = Math.min(w, h);
    for (let i = 0; i < n; i++) {
      const p = P(i, 91);
      const lt = (t * (0.3 + p.v * 0.35) + p.hue) % 1;
      const x = p.hue * w + Math.sin(lt * 5 + i * 2) * w * 0.05;
      const y = lt * h * 1.2 - h * 0.1;
      const bw = R * 0.1 * p.size, bh = bw * 0.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(lt * 7 + i) * 0.5);
      ctx.scale(1, 0.4 + Math.abs(Math.sin(lt * 6 + i)) * 0.6);
      ctx.fillStyle = "#3e9d5c";
      ctx.strokeStyle = "#1e5c34";
      ctx.lineWidth = 2;
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
      ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
      ctx.fillStyle = "#d9ffe4";
      ctx.font = `700 ${bh * 0.62}px "Space Grotesk"`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("€", 0, bh * 0.05);
      ctx.restore();
    }
  },
};

const fxLaser: FxDef = {
  id: "laser", name: "Raggio Laser", desc: "Sweep laser con scintille", dur: 2.4, cycle: 2.4,
  draw(ctx, t, w, h) {
    const R = Math.min(w, h);
    const ang = -0.6 + (t / 2.4) * 1.9;
    const ox = w / 2, oy = h * 1.05;
    const len = R * 1.4;
    const ex = ox + Math.sin(ang) * len, ey = oy - Math.cos(ang) * len;
    ctx.strokeStyle = "rgba(255,60,60,0.95)";
    ctx.lineWidth = R * 0.008;
    ctx.shadowColor = "rgba(255,40,40,1)";
    ctx.shadowBlur = R * 0.025;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = "rgba(255,190,190,0.9)";
    ctx.lineWidth = R * 0.0025;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.shadowBlur = 0;
    // scintille alla punta
    for (let i = 0; i < 8; i++) {
      const p = P(i + Math.floor(t * 20) * 8, 103);
      const d = p.v * R * 0.08;
      ctx.strokeStyle = `rgba(255,160,120,${1 - p.v})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(p.a) * d, ey + Math.sin(p.a) * d);
      ctx.stroke();
    }
  },
};

const fxShockwave: FxDef = {
  id: "shockwave", name: "Onda d'Urto", desc: "Impatto ad anello", dur: 1.6, cycle: 1.6,
  draw(ctx, t, w, h) {
    const R = Math.min(w, h);
    const cx = w / 2, cy = h / 2;
    for (let r = 0; r < 2; r++) {
      const lt = t / 1.1 - r * 0.12;
      if (lt < 0 || lt > 1) continue;
      const rad = lt * R * 0.6;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - lt) * 0.85})`;
      ctx.lineWidth = R * 0.035 * (1 - lt) + 1;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(120,200,255,${(1 - lt) * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, rad * 0.92, 0, TAU); ctx.stroke();
    }
    // polvere radiale
    for (let i = 0; i < 24; i++) {
      const p = P(i, 117);
      const lt = t / 1.2;
      if (lt > 1) continue;
      const d = lt * R * 0.5 * p.v;
      ctx.fillStyle = `rgba(200,215,230,${(1 - lt) * 0.6})`;
      ctx.fillRect(cx + Math.cos(p.a) * d, cy + Math.sin(p.a) * d, 3 * p.size, 3 * p.size);
    }
  },
};

const fxSparks: FxDef = {
  id: "sparks", name: "Scintille", desc: "Fontana di scintille calde", dur: 2.4, cycle: 1.2,
  draw(ctx, t, w, h, eco) {
    const n = eco ? 26 : 50;
    const R = Math.min(w, h);
    const cx = w / 2, cy = h * 0.62;
    for (let i = 0; i < n; i++) {
      const p = P(i, 131);
      const lt = (t * (0.9 + p.hue) + p.v) % 1;
      const vx = Math.cos(-Math.PI / 2 + (p.hue - 0.5) * 1.8) * p.v;
      const vy = Math.sin(-Math.PI / 2 + (p.hue - 0.5) * 1.8) * p.v;
      const x = cx + vx * lt * R * 0.5;
      const y = cy + vy * lt * R * 0.5 + lt * lt * R * 0.42;
      ctx.strokeStyle = `rgba(255,${170 + p.hue * 80},80,${1 - lt})`;
      ctx.lineWidth = 2 * p.size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - vx * R * 0.03, y - vy * R * 0.03 + lt * R * 0.02);
      ctx.stroke();
    }
  },
};

const fxFireworks: FxDef = {
  id: "fireworks", name: "Fuochi d'Artificio", desc: "Tre esplosioni in cielo", dur: 3.6, cycle: 3.6,
  draw(ctx, t, w, h, eco) {
    const R = Math.min(w, h);
    const bursts = [
      { t0: 0.2, x: 0.32, y: 0.34, hue: 18 },
      { t0: 1.3, x: 0.66, y: 0.26, hue: 190 },
      { t0: 2.4, x: 0.5, y: 0.4, hue: 52 },
    ];
    for (const b of bursts) {
      const lt = (t - b.t0) / 1.1;
      if (lt < 0 || lt > 1) continue;
      const n = eco ? 22 : 42;
      for (let i = 0; i < n; i++) {
        const p = P(i + b.t0 * 100, 149);
        const d = lt * R * 0.3 * p.v;
        const x = b.x * w + Math.cos(p.a) * d;
        const y = b.y * h + Math.sin(p.a) * d + lt * lt * R * 0.1;
        ctx.fillStyle = `hsla(${b.hue + p.hue * 40},100%,${65 - lt * 25}%,${1 - lt})`;
        ctx.fillRect(x, y, 3.2 * p.size, 3.2 * p.size);
      }
    }
  },
};

const fxSnow: FxDef = {
  id: "snow", name: "Neve", desc: "Fiocchi leggeri in caduta", dur: 4, cycle: 3.2,
  draw(ctx, t, w, h, eco) {
    const n = eco ? 30 : 60;
    const R = Math.min(w, h);
    for (let i = 0; i < n; i++) {
      const p = P(i, 163);
      const lt = (t * (0.2 + p.v * 0.25) + p.hue) % 1;
      const x = p.hue * w + Math.sin(lt * 8 + i) * R * 0.04;
      const y = lt * h * 1.1 - h * 0.05;
      const r = R * 0.008 * p.size;
      ctx.fillStyle = `rgba(255,255,255,${0.5 + p.v * 0.4})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  },
};

const fxGlitch: FxDef = {
  id: "glitchfx", name: "Glitch Burst", desc: "Distorsione digitale RGB", dur: 1.6, cycle: 0.8,
  draw(ctx, t, w, h) {
    const R = Math.min(w, h);
    const seed = Math.floor(t * 14);
    const intensity = 0.5 + 0.5 * Math.sin(t * 9);
    for (let i = 0; i < 10; i++) {
      const y = hash(seed * 31 + i * 3) * h;
      const bh = hash(seed * 17 + i * 7) * h * 0.06 + 2;
      const off = (hash(seed * 13 + i * 11) - 0.5) * w * 0.16 * intensity;
      ctx.fillStyle = i % 3 === 0 ? "rgba(255,0,80,0.5)" : i % 3 === 1 ? "rgba(0,255,220,0.4)" : "rgba(255,255,255,0.25)";
      ctx.fillRect(off, y, w, bh);
    }
    // blocchi
    for (let i = 0; i < 6; i++) {
      const x = hash(seed * 41 + i) * w;
      const y = hash(seed * 23 + i * 5) * h;
      const bw2 = hash(seed + i * 9) * R * 0.2;
      ctx.strokeStyle = `rgba(255,255,255,${0.3 * intensity})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, bw2, bw2 * 0.3);
    }
  },
};

export const FX_CATALOG: FxDef[] = [
  fxExplosion, fxFire, fxSmoke, fxBolt, fxConfetti, fxMoney,
  fxLaser, fxShockwave, fxSparks, fxFireworks, fxSnow, fxGlitch,
];

export const GREEN = "#00b140";

export const getFx = (id: string) => FX_CATALOG.find((f) => f.id === id) ?? fxExplosion;
