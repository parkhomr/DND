class Soundscape {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private initialized = false;
  enabled = false;
  volume = 0.3;
  async set(enabled: boolean, volume = this.volume) {
    this.enabled = enabled;
    this.volume = volume;
    if (enabled && !this.ctx) {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.gain.connect(this.ctx.destination);
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 4, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3;
      }
      this.source = this.ctx.createBufferSource();
      this.source.buffer = buffer;
      this.source.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 650;
      this.source.connect(filter);
      filter.connect(this.gain);
      this.source.start();
      this.initialized = true;
    }
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
    if (this.gain && this.ctx)
      this.gain.gain.setTargetAtTime(enabled ? volume * 0.3 : 0, this.ctx.currentTime, 0.3);
  }
  play(type: 'roll' | 'click' | 'combat' | 'travel') {
    if (!this.enabled || !this.ctx || !this.initialized) return;
    const ctx = this.ctx;
    const tone = ctx.createOscillator();
    const gain = ctx.createGain();
    tone.type = type === 'combat' ? 'triangle' : 'sine';
    tone.frequency.setValueAtTime(
      type === 'roll' ? 420 : type === 'travel' ? 220 : 640,
      ctx.currentTime,
    );
    tone.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(this.volume * 0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    tone.connect(gain);
    gain.connect(ctx.destination);
    tone.start();
    tone.stop(ctx.currentTime + 0.3);
  }
}
export const soundscape = new Soundscape();
