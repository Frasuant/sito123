export interface SoundDef {
  id: string;
  name: string;
  desc: string;
  dur: number;
  tags: string;
  build: (ctx: OfflineAudioContext, out: AudioNode) => void;
}

const noiseBuffer = (ctx: BaseAudioContext, dur: number) => {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
};

const env = (ctx: BaseAudioContext, node: AudioParam, t0: number, a: number, peak: number, d: number) => {
  node.setValueAtTime(0.0001, t0);
  node.exponentialRampToValueAtTime(peak, t0 + a);
  node.exponentialRampToValueAtTime(0.0001, t0 + a + d);
};

const osc = (ctx: OfflineAudioContext, out: AudioNode, type: OscillatorType, f0: number, f1: number, t0: number, dur: number, peak: number) => {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  env(ctx, g.gain, t0, 0.008, peak, dur);
  o.connect(g).connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.1);
};

const noiseHit = (ctx: OfflineAudioContext, out: AudioNode, t0: number, dur: number, peak: number, filterType: BiquadFilterType, f0: number, f1?: number) => {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur + 0.05);
  const f = ctx.createBiquadFilter();
  f.type = filterType;
  f.frequency.setValueAtTime(f0, t0);
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  f.Q.value = 1.1;
  const g = ctx.createGain();
  env(ctx, g.gain, t0, 0.006, peak, dur);
  src.connect(f).connect(g).connect(out);
  src.start(t0);
  src.stop(t0 + dur + 0.1);
};

export const SOUND_CATALOG: SoundDef[] = [
  {
    id: "boom", name: "Boom Cinematico", desc: "Esplosione profonda con sub", dur: 1.6, tags: "esplosione impatto",
    build(ctx, out) {
      osc(ctx, out, "sine", 130, 28, 0, 1.4, 1.0);
      noiseHit(ctx, out, 0, 0.9, 0.7, "lowpass", 900, 120);
      noiseHit(ctx, out, 0, 0.12, 0.5, "highpass", 2000);
    },
  },
  {
    id: "whoosh", name: "Whoosh", desc: "Transizione aerea", dur: 0.9, tags: "transizione movimento",
    build(ctx, out) {
      noiseHit(ctx, out, 0, 0.85, 0.8, "bandpass", 250, 3200);
      osc(ctx, out, "sine", 180, 700, 0, 0.8, 0.25);
    },
  },
  {
    id: "pop", name: "Pop UI", desc: "Click morbido per interfacce", dur: 0.25, tags: "click ui interfaccia",
    build(ctx, out) {
      osc(ctx, out, "sine", 480, 140, 0, 0.12, 0.8);
      noiseHit(ctx, out, 0, 0.04, 0.3, "highpass", 3000);
    },
  },
  {
    id: "ding", name: "Ding Notifica", desc: "Campanella brillante", dur: 0.9, tags: "notifica successo",
    build(ctx, out) {
      osc(ctx, out, "sine", 880, 878, 0, 0.8, 0.6);
      osc(ctx, out, "sine", 1318, 1315, 0, 0.7, 0.35);
      osc(ctx, out, "sine", 1760, 1755, 0.02, 0.5, 0.2);
    },
  },
  {
    id: "riser", name: "Riser Tensione", desc: "Crescendo per il drop", dur: 2, tags: "tensione build up",
    build(ctx, out) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(90, 0);
      o.frequency.exponentialRampToValueAtTime(820, 1.9);
      f.type = "lowpass";
      f.frequency.setValueAtTime(300, 0);
      f.frequency.exponentialRampToValueAtTime(4200, 1.9);
      g.gain.setValueAtTime(0.0001, 0);
      g.gain.exponentialRampToValueAtTime(0.5, 1.9);
      g.gain.exponentialRampToValueAtTime(0.0001, 2.0);
      o.connect(f).connect(g).connect(out);
      o.start(0); o.stop(2);
      noiseHit(ctx, out, 0.2, 1.7, 0.2, "highpass", 1200, 6000);
    },
  },
  {
    id: "hit", name: "Impact Hit", desc: "Colpo secco da trailer", dur: 0.5, tags: "impatto trailer",
    build(ctx, out) {
      osc(ctx, out, "sine", 200, 40, 0, 0.4, 0.95);
      noiseHit(ctx, out, 0, 0.3, 0.6, "lowpass", 1400, 200);
      noiseHit(ctx, out, 0, 0.05, 0.4, "highpass", 4000);
    },
  },
  {
    id: "cash", name: "Cha-Ching", desc: "Cassa registratrice", dur: 0.7, tags: "soldi vendita",
    build(ctx, out) {
      osc(ctx, out, "square", 2100, 2050, 0, 0.07, 0.22);
      osc(ctx, out, "square", 2650, 2600, 0.09, 0.35, 0.22);
      noiseHit(ctx, out, 0.08, 0.1, 0.25, "highpass", 5000);
      osc(ctx, out, "sine", 1560, 1555, 0.16, 0.5, 0.3);
    },
  },
  {
    id: "zap", name: "Laser Zap", desc: "Raggio sci-fi", dur: 0.35, tags: "laser sci-fi",
    build(ctx, out) {
      osc(ctx, out, "sawtooth", 1500, 90, 0, 0.3, 0.5);
      osc(ctx, out, "square", 2400, 150, 0, 0.22, 0.2);
    },
  },
  {
    id: "keys", name: "Tastiera Typing", desc: "Sequenza di tasti meccanici", dur: 1.1, tags: "tastiera scrittura asmr",
    build(ctx, out) {
      for (let i = 0; i < 8; i++) {
        const t0 = i * 0.13 + (i % 3 === 0 ? 0.03 : 0);
        noiseHit(ctx, out, t0, 0.045, 0.5, "bandpass", 1800 + (i % 4) * 500);
        osc(ctx, out, "sine", 320 + (i % 3) * 60, 180, t0, 0.05, 0.2);
      }
    },
  },
  {
    id: "subdrop", name: "Sub Drop", desc: "Caduta di bassi 808", dur: 1.6, tags: "bassi 808 trap",
    build(ctx, out) {
      osc(ctx, out, "sine", 62, 27, 0, 1.5, 1.0);
      noiseHit(ctx, out, 0, 0.08, 0.35, "lowpass", 500);
    },
  },
  {
    id: "beat", name: "Beat Lo-Fi", desc: "Loop batteria 2 secondi", dur: 2, tags: "musica loop batteria",
    build(ctx, out) {
      const kick = (t0: number) => osc(ctx, out, "sine", 150, 42, t0, 0.22, 0.9);
      const hat = (t0: number, v: number) => noiseHit(ctx, out, t0, 0.05, v, "highpass", 7000);
      const snare = (t0: number) => { noiseHit(ctx, out, t0, 0.14, 0.45, "bandpass", 1800); osc(ctx, out, "sine", 220, 150, t0, 0.1, 0.3); };
      [0, 0.5, 1.0, 1.5].forEach(kick);
      [0.5, 1.5].forEach(snare);
      for (let i = 0; i < 8; i++) hat(i * 0.25, i % 2 ? 0.16 : 0.28);
      osc(ctx, out, "triangle", 220, 220, 0, 1.9, 0.1);
    },
  },
];

/* ---------- rendering offline + WAV ---------- */

const bufferCache = new Map<string, AudioBuffer>();

const sharedCtx = () => {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new AC();
};

export async function getSoundBuffer(id: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(id);
  if (cached) return cached;
  const def = SOUND_CATALOG.find((s) => s.id === id) ?? SOUND_CATALOG[0];
  const off = new OfflineAudioContext(2, Math.ceil(44100 * (def.dur + 0.1)), 44100);
  const master = off.createGain();
  master.gain.value = 0.9;
  master.connect(off.destination);
  def.build(off, master);
  const buf = await off.startRendering();
  bufferCache.set(id, buf);
  return buf;
}

export function bufferToWav(buf: AudioBuffer): Blob {
  const nCh = 2;
  const len = buf.length * nCh * 2 + 44;
  const ab = new ArrayBuffer(len);
  const view = new DataView(ab);
  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, "RIFF"); view.setUint32(4, len - 8, true); ws(8, "WAVE"); ws(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, nCh, true);
  view.setUint32(24, buf.sampleRate, true); view.setUint32(28, buf.sampleRate * nCh * 2, true);
  view.setUint16(32, nCh * 2, true); view.setUint16(34, 16, true); ws(36, "data"); view.setUint32(40, len - 44, true);
  const ch0 = buf.getChannelData(0);
  const ch1 = buf.getChannelData(1);
  let o = 44;
  for (let i = 0; i < buf.length; i++) {
    view.setInt16(o, Math.max(-1, Math.min(1, ch0[i])) * 0x7fff, true); o += 2;
    view.setInt16(o, Math.max(-1, Math.min(1, ch1[i])) * 0x7fff, true); o += 2;
  }
  return new Blob([ab], { type: "audio/wav" });
}

/* ---------- motore di riproduzione ---------- */

class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  private sources: AudioBufferSourceNode[] = [];
  private previewEl: HTMLAudioElement | null = null;

  ensure() {
    if (!this.ctx) {
      this.ctx = sharedCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  stopAll() {
    this.sources.forEach((s) => { try { s.stop(); } catch { /* già fermato */ } });
    this.sources = [];
    if (this.previewEl) { this.previewEl.pause(); this.previewEl = null; }
  }

  /** preview di un suono dalla libreria */
  async preview(id: string) {
    this.stopAll();
    const buf = await getSoundBuffer(id);
    const blob = bufferToWav(buf);
    const el = new Audio(URL.createObjectURL(blob));
    this.previewEl = el;
    void el.play();
    el.onended = () => URL.revokeObjectURL(el.src);
  }

  /**
   * Avvia tutte le clip audio dalla posizione t della timeline.
   * Restituisce una callback per fermare tutto.
   */
  async playClips(clips: { start: number; duration: number; refId: string; gain: number }[], t: number, dest?: AudioNode) {
    const ctx = this.ensure();
    this.stopAll();
    const target = dest ?? this.master!;
    for (const c of clips) {
      const end = c.start + c.duration;
      if (end <= t) continue;
      try {
        const buf = await getSoundBuffer(c.refId);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const g = ctx.createGain();
        g.gain.value = c.gain;
        src.connect(g).connect(target);
        const offset = Math.max(0, t - c.start) % buf.duration;
        const when = ctx.currentTime + Math.max(0, c.start - t) + 0.03;
        const remaining = end - Math.max(t, c.start);
        src.start(when, offset);
        src.stop(when + remaining);
        this.sources.push(src);
      } catch { /* buffer non pronto */ }
    }
  }

  /** nodo per registrare l'audio durante l'export */
  createExportDest(): MediaStreamAudioDestinationNode | null {
    const ctx = this.ensure();
    const dest = ctx.createMediaStreamDestination();
    this.master?.connect(dest);
    return dest;
  }

  releaseExportDest(dest: MediaStreamAudioDestinationNode) {
    try { this.master?.disconnect(dest); } catch { /* ok */ }
  }
}

export const audioEngine = new AudioEngine();

/* ---------- waveform ---------- */

export function drawWaveform(canvas: HTMLCanvasElement, buf: AudioBuffer | null, color = "#39d0b8") {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!buf) {
    ctx.fillStyle = "#2a3242";
    for (let x = 0; x < w; x += 6) ctx.fillRect(x, h / 2 - 1, 3, 2);
    return;
  }
  const data = buf.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / w));
  ctx.fillStyle = color;
  for (let x = 0; x < w; x++) {
    let min = 1, max = -1;
    const start = x * step;
    for (let i = 0; i < step; i += 4) {
      const v = data[start + i] ?? 0;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const y1 = (1 - max) * h * 0.5;
    const y2 = (1 - min) * h * 0.5;
    ctx.fillRect(x, y1, 1, Math.max(1, y2 - y1));
  }
}
