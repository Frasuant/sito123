import { hash } from "../types";

export interface BgDef {
  id: string;
  name: string;
  desc: string;
  draw: (ctx: CanvasRenderingContext2D, t: number, w: number, h: number, eco: boolean) => void;
}

const bgSynthwave: BgDef = {
  id: "synthwave", name: "Synthwave Sunset", desc: "Griglia retro e sole al tramonto",
  draw(ctx, t, w, h) {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    sky.addColorStop(0, "#1b1035");
    sky.addColorStop(0.6, "#542354");
    sky.addColorStop(1, "#c34a63");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.62);
    // sole
    const sy = h * 0.52, sr = h * 0.22;
    const sun = ctx.createLinearGradient(0, sy - sr, 0, sy + sr);
    sun.addColorStop(0, "#ffd76e");
    sun.addColorStop(1, "#ff5e62");
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w, h * 0.62); ctx.clip();
    ctx.fillStyle = sun;
    ctx.beginPath(); ctx.arc(w / 2, sy, sr, 0, Math.PI * 2); ctx.fill();
    // strisce sul sole
    ctx.fillStyle = "#542354";
    for (let i = 0; i < 6; i++) {
      const yy = sy + i * sr * 0.18 - sr * 0.1 + Math.sin(t) * 0;
      ctx.fillRect(w / 2 - sr, yy, sr * 2, 2 + i * 1.2);
    }
    ctx.restore();
    // suolo
    ctx.fillStyle = "#140b26";
    ctx.fillRect(0, h * 0.62, w, h * 0.38);
    // griglia prospettica
    ctx.strokeStyle = "rgba(255,90,180,0.55)";
    ctx.lineWidth = 1.4;
    const horizon = h * 0.62;
    const scroll = (t * 0.5) % 1;
    for (let i = 0; i < 14; i++) {
      const p = (i + scroll) / 14;
      const y = horizon + p * p * h * 0.38;
      ctx.globalAlpha = 0.25 + p * 0.6;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * w * 0.02, horizon);
      ctx.lineTo(w / 2 + i * w * 0.16, h);
      ctx.stroke();
    }
  },
};

const bgRain: BgDef = {
  id: "rain", name: "Notte di Pioggia", desc: "Bokeh urbano sotto il temporale",
  draw(ctx, t, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0b1524");
    g.addColorStop(1, "#101c30");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // bokeh
    for (let i = 0; i < 14; i++) {
      const px = hash(i * 3 + 1) * w;
      const py = hash(i * 7 + 2) * h * 0.85;
      const r = (8 + hash(i * 11) * 30) * (h / 720);
      const tw = 0.5 + 0.5 * Math.sin(t * 1.4 + i * 2);
      const hue = i % 3 === 0 ? "255,170,90" : i % 3 === 1 ? "120,190,255" : "255,120,140";
      ctx.fillStyle = `rgba(${hue},${0.10 + tw * 0.16})`;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    }
    // pioggia
    ctx.strokeStyle = "rgba(180,205,235,0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const sp = 380 + hash(i * 13) * 240;
      const x = (hash(i * 17) * w * 1.2 + t * 60) % (w * 1.2) - w * 0.1;
      const y = (hash(i * 29) * h + t * sp) % h;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 6, y + 18);
    }
    ctx.stroke();
    // lampo occasionale
    const flash = Math.max(0, Math.sin(t * 0.9) - 0.96) * 8;
    if (flash > 0) {
      ctx.fillStyle = `rgba(210,225,255,${flash * 0.25})`;
      ctx.fillRect(0, 0, w, h);
    }
  },
};

const bgGalaxy: BgDef = {
  id: "galaxy", name: "Galassia Profonda", desc: "Stelle e nebulosa lenta",
  draw(ctx, t, w, h) {
    ctx.fillStyle = "#05070f";
    ctx.fillRect(0, 0, w, h);
    // nebulose
    const neb = [
      { x: 0.3, y: 0.4, r: 0.5, c: "70,60,160" },
      { x: 0.72, y: 0.62, r: 0.42, c: "30,110,140" },
      { x: 0.55, y: 0.25, r: 0.3, c: "150,60,100" },
    ];
    for (const n of neb) {
      const g = ctx.createRadialGradient(n.x * w, n.y * h, 0, n.x * w, n.y * h, n.r * w);
      g.addColorStop(0, `rgba(${n.c},0.28)`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    // stelle
    for (let i = 0; i < 130; i++) {
      const x = hash(i * 3 + 5) * w;
      const y = hash(i * 7 + 9) * h;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.6 + hash(i) * 1.4) + i));
      const s = hash(i * 11) > 0.92 ? 2.4 : 1.2;
      ctx.fillStyle = `rgba(230,240,255,${tw * 0.9})`;
      ctx.fillRect(x, y, s, s);
    }
  },
};

const bgWaves: BgDef = {
  id: "waves", name: "Onde Minimal", desc: "Strati morbidi in movimento",
  draw(ctx, t, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0e2233");
    g.addColorStop(1, "#123249");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const layers = [
      { a: 0.55, amp: 0.05, sp: 0.7, c: "rgba(57,208,184,0.20)" },
      { a: 0.68, amp: 0.06, sp: -0.5, c: "rgba(90,169,255,0.22)" },
      { a: 0.82, amp: 0.05, sp: 0.9, c: "rgba(230,235,244,0.10)" },
    ];
    for (const L of layers) {
      ctx.fillStyle = L.c;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) {
        const y = h * L.a + Math.sin(x / w * Math.PI * 3 + t * L.sp * 2) * h * L.amp + Math.sin(x / w * 7 - t * L.sp) * h * 0.012;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }
  },
};

const bgCity: BgDef = {
  id: "city", name: "Skyline Notturno", desc: "Palazzi e finestre accese",
  draw(ctx, t, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#131a2e");
    g.addColorStop(0.7, "#23304f");
    g.addColorStop(1, "#2c3a5c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // luna
    ctx.fillStyle = "rgba(240,244,255,0.9)";
    ctx.beginPath(); ctx.arc(w * 0.8, h * 0.18, h * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#131a2e";
    ctx.beginPath(); ctx.arc(w * 0.82, h * 0.16, h * 0.055, 0, Math.PI * 2); ctx.fill();
    // palazzi
    for (let i = 0; i < 16; i++) {
      const bw = w * (0.045 + hash(i * 3) * 0.05);
      const bx = hash(i * 7 + 1) * (w + bw) - bw;
      const bh = h * (0.28 + hash(i * 11 + 2) * 0.42);
      ctx.fillStyle = i % 2 ? "#0e1424" : "#111a2e";
      ctx.fillRect(bx, h - bh, bw, bh);
      // finestre
      for (let wy = 0; wy < Math.floor(bh / (h * 0.05)); wy++) {
        for (let wx = 0; wx < 3; wx++) {
          const on = hash(i * 31 + wy * 7 + wx * 3) > 0.45;
          if (!on) continue;
          const flick = hash(i + wy + wx) > 0.9 && Math.sin(t * 3 + i + wy) > 0.4 ? 0.2 : 0.75;
          ctx.fillStyle = `rgba(255,205,120,${flick})`;
          ctx.fillRect(bx + bw * (0.16 + wx * 0.3), h - bh + h * 0.02 + wy * h * 0.05, bw * 0.14, h * 0.022);
        }
      }
    }
  },
};

const bgTunnel: BgDef = {
  id: "tunnel", name: "Tunnel Ipnotico", desc: "Anelli in prospettiva infinita",
  draw(ctx, t, w, h) {
    ctx.fillStyle = "#0a0d16";
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const R = Math.max(w, h);
    for (let i = 0; i < 16; i++) {
      const p = (i / 16 + t * 0.14) % 1;
      const rad = p * p * R * 0.75 + 4;
      ctx.strokeStyle = `hsla(${200 + p * 120},80%,60%,${(1 - p) * 0.75})`;
      ctx.lineWidth = 1 + p * 4;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
    }
  },
};

const bgStudio: BgDef = {
  id: "studio", name: "Studio Morbido", desc: "Gradiente caldo da podcast",
  draw(ctx, t, w, h) {
    const shift = Math.sin(t * 0.3) * 8;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, `hsl(${222 + shift},34%,16%)`);
    g.addColorStop(1, `hsl(${250 + shift},30%,24%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // fasci di luce morbidi
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.translate(w * 0.75, -h * 0.1);
    ctx.rotate(0.5 + Math.sin(t * 0.2) * 0.05);
    const beam = ctx.createLinearGradient(0, 0, 0, h * 1.4);
    beam.addColorStop(0, "#ffd9a0");
    beam.addColorStop(1, "transparent");
    ctx.fillStyle = beam;
    ctx.fillRect(-w * 0.08, 0, w * 0.22, h * 1.4);
    ctx.restore();
    // grana leggera
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let i = 0; i < 60; i++) {
      ctx.fillRect(hash(i * 3 + Math.floor(t * 8)) * w, hash(i * 7) * h, 1.5, 1.5);
    }
    // vignettatura
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.95);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  },
};

const bgPaper: BgDef = {
  id: "paper", name: "Carta Chiara", desc: "Sfondo pulito per tutorial",
  draw(ctx, t, w, h) {
    ctx.fillStyle = "#eef0f4";
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, w * 0.7);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(206,212,224,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // punti fluttuanti
    for (let i = 0; i < 22; i++) {
      const x = hash(i * 5) * w;
      const y = (hash(i * 9) * h + t * 8 * (0.4 + hash(i))) % h;
      ctx.fillStyle = "rgba(90,110,140,0.14)";
      ctx.beginPath(); ctx.arc(x, y, 3 + hash(i * 13) * 5, 0, Math.PI * 2); ctx.fill();
    }
  },
};

export const BG_CATALOG: BgDef[] = [bgSynthwave, bgRain, bgGalaxy, bgWaves, bgCity, bgTunnel, bgStudio, bgPaper];

export const getBg = (id: string) => BG_CATALOG.find((b) => b.id === id) ?? bgSynthwave;
