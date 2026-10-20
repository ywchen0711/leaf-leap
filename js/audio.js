// LEAF LEAP — chiptune sound, synthesized with the Web Audio API: square-wave effects and a tune for each place.
export class Sound {
  constructor() { this.ctx = null; this.vol = 0.55; this.musicOn = true; this.song = null; this.last = {}; }
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.musicOn ? 0.32 : 0; this.musicBus.connect(this.master);
    const n = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, n, n); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.loop();
  }
  tone(t, f, dur, type = 'square', vol = 0.1, f2, dest) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(t, dur, freq, vol = 0.2, type = 'lowpass', dest) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(dest || this.master); s.start(t); s.stop(t + dur + 0.05);
  }
  seq(t, notes, step, type = 'square', vol = 0.07) { notes.forEach((f, i) => { if (f) this.tone(t + i * step, f, step * 1.1, type, vol); }); }
  play(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    if (this.last[name] && t - this.last[name] < 0.04) return; this.last[name] = t;
    switch (name) {
      case 'jump': this.tone(t, 280, 0.16, 'square', 0.06, 760); break;
      case 'coin': this.tone(t, 988, 0.06, 'square', 0.06); this.tone(t + 0.06, 1319, 0.22, 'square', 0.06); break;
      case 'stomp': this.tone(t, 500, 0.1, 'square', 0.08, 150); this.noise(t, 0.06, 900, 0.12); break;
      case 'kick': this.tone(t, 300, 0.08, 'square', 0.08, 900); this.noise(t, 0.05, 2000, 0.1); break;
      case 'thud': this.tone(t, 140, 0.08, 'triangle', 0.14, 90); break;
      case 'break': this.noise(t, 0.25, 1800, 0.25, 'bandpass'); this.tone(t, 200, 0.12, 'square', 0.06, 80); break;
      case 'sprout': this.seq(t, [392, 523, 659, 784, 1047], 0.05, 'square', 0.05); break;
      case 'power': this.seq(t, [523, 392, 523, 659, 784, 1047, 784, 1047], 0.05, 'square', 0.06); break;
      case 'leaf': this.tone(t, 300, 0.4, 'triangle', 0.1, 1200); this.noise(t, 0.3, 3000, 0.06, 'highpass'); break;
      case 'hurt': this.seq(t, [784, 659, 523, 392, 330], 0.06, 'square', 0.06); break;
      case 'oneup': this.seq(t, [659, 784, 1319, 1047, 1175, 1568], 0.08, 'square', 0.06); break;
      case 'fire': this.tone(t, 900, 0.08, 'square', 0.05, 300); break;
      case 'tail': this.noise(t, 0.2, 1400, 0.16, 'bandpass'); break;
      case 'fly': case 'wag': this.tone(t, 600, 0.06, 'triangle', 0.06, 900); break;
      case 'note': this.tone(t, 400, 0.12, 'triangle', 0.12, 900); break;
      case 'pipe': this.seq(t, [400, 300, 200, 400, 300, 200], 0.06, 'square', 0.05); break;
      case 'die': this.seq(t, [523, 0, 494, 466, 440, 0, 330, 262], 0.11, 'square', 0.07); break;
      case 'clear': this.seq(t, [523, 659, 784, 1047, 0, 784, 1047, 1319], 0.1, 'square', 0.07); break;
      case 'check': this.seq(t, [784, 988, 1175], 0.07, 'triangle', 0.08); break;
      case 'bosshit': this.tone(t, 220, 0.25, 'sawtooth', 0.1, 70); this.noise(t, 0.2, 700, 0.2); break;
      case 'boss': this.seq(t, [196, 185, 175, 165], 0.15, 'sawtooth', 0.06); break;
      case 'bosshop': this.tone(t, 120, 0.2, 'triangle', 0.14, 60); break;
      case 'bossfire': this.noise(t, 0.3, 600, 0.2); this.tone(t, 200, 0.3, 'sawtooth', 0.05, 90); break;
      case 'step': this.tone(t, 700, 0.04, 'square', 0.04); break;
      case 'enter': this.seq(t, [523, 784, 1047], 0.06, 'square', 0.06); break;
      case 'click': this.tone(t, 800, 0.04, 'square', 0.04); break;
      case 'deny': this.tone(t, 180, 0.15, 'square', 0.05, 140); break;
      case 'card': this.seq(t, [1047, 1319, 1568, 2093], 0.06, 'square', 0.06); break;
      case 'fanfare': this.seq(t, [523, 523, 523, 659, 0, 587, 659, 0, 784, 784, 1047], 0.12, 'square', 0.07); break;
    }
  }
  // songs: [bpm, bass line, lead line] as semitones from the root (null = rest), each 32 eighth-notes
  setSong(name) { this.song = name; this.i = 0; }
  loop() {
    const S = {
      grass: [150, 261.6, [0, 0, 7, 7, 5, 5, 4, 4, 0, 0, 7, 7, 5, 5, 4, 4, -3, -3, 4, 4, 2, 2, 0, 0, -5, -5, 2, 2, 0, 0, -1, -1],
        [12, null, 16, 19, 24, null, 19, 16, 14, null, 17, 21, 19, null, 16, 12, 9, null, 12, 16, 14, 12, 9, 7, 11, null, 14, 17, 16, 14, 12, null]],
      sky: [138, 293.7, [0, 0, 4, 4, 7, 7, 4, 4, 5, 5, 9, 9, 7, 7, 4, 4, 2, 2, 5, 5, 7, 7, 11, 11, 0, 0, 4, 4, 7, 7, 12, 12],
        [19, 21, 24, null, 21, 19, 16, null, 17, 21, 24, null, 26, 24, 21, null, 19, 17, 14, null, 17, 19, 23, null, 24, null, 19, null, 16, null, 12, null]],
      cave: [120, 196, [0, null, 12, null, 0, null, 12, null, 3, null, 15, null, 3, null, 15, null, 5, null, 17, null, 5, null, 17, null, 7, null, 19, null, 6, null, 18, null],
        [null, null, 24, null, null, 27, null, null, 26, null, null, 22, null, null, 24, null, null, null, 29, null, 27, null, 26, null, 24, null, null, null, 22, null, 19, null]],
      fort: [132, 220, [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, -1, -1, -1, -1, 0, 0, 0, 0, 1, 1, 1, 1, 3, 3, 3, 3, 1, 1, 1, 1],
        [12, null, 15, null, 13, null, 12, null, 11, null, 12, null, 13, null, 15, null, 17, null, 15, null, 13, null, 12, null, 15, 13, 12, 11, 12, null, null, null]],
      map: [112, 261.6, [0, null, 7, null, 0, null, 7, null, 5, null, 0, null, 7, null, 2, null, 0, null, 7, null, 0, null, 7, null, 5, null, 7, null, 0, null, null, null],
        [12, 12, 14, 16, null, 16, 17, 19, null, 21, 19, 17, 16, null, 14, null, 12, 12, 14, 16, null, 19, 17, 16, 14, null, 11, null, 12, null, null, null]],
    };
    let next = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => {
      const s = S[this.song === 'castle' ? 'fort' : this.song];
      if (!s || !this.musicOn) { next = this.ctx.currentTime + 0.1; return; }
      const [bpm, root, bass, lead] = s, step = 60 / bpm / 2, f = (n) => root * Math.pow(2, n / 12);
      while (next < this.ctx.currentTime + 0.25) {
        const i = this.i % 32, b = bass[i], l = lead[i];
        if (b !== null && b !== undefined) this.tone(next, f(b - 12), step * 0.9, 'triangle', 0.16, null, this.musicBus);
        if (l !== null && l !== undefined) this.tone(next, f(l), step * 0.85, 'square', 0.035, null, this.musicBus);
        if (i % 4 === 0) this.noise(next, 0.04, 200, 0.12, 'lowpass', this.musicBus);
        if (i % 4 === 2) this.noise(next, 0.03, 7000, 0.04, 'highpass', this.musicBus);
        next += step; this.i++;
      }
    }, 50);
  }
  setMusic(on) { this.musicOn = on; if (this.musicBus) this.musicBus.gain.value = on ? 0.32 : 0; }
}
