"use strict";

class AudioManager {
  constructor() {
    this.context = null;
    this.output = null;
    this.buffers = {};
    this.soundSamples = {};
    this.loading = {};
    this.lastPlayedAt = {};
    this.variations = {};
    this.pitchVariations = [1, 0.96, 1.04, 0.98];
    this.bgm = null;
    this.isBgmPlaying = false;
  }

  unlock() {
    const AudioContextClass =
      globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      if (!this.context) {
        this.context = new AudioContextClass();
        const compressor = this.context.createDynamicsCompressor();
        compressor.threshold.value = -15;
        compressor.knee.value = 12;
        compressor.ratio.value = 5;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.09;

        this.output = this.context.createGain();
        this.output.gain.value = 0.8;
        this.output.connect(compressor);
        compressor.connect(this.context.destination);
      }

      if (this.context.state !== "running") {
        this.context.resume().catch(() => {});
      }

      this.loadAllSamples();
      this.playBgm();
    } catch {
      // Audio can be unavailable without breaking game flow
    }
  }

  playBgm() {
    const bgmPath = window.Constants?.ASSETS?.bgm?.main;
    if (!bgmPath) return;

    if (!this.bgm) {
      this.bgm = new Audio(bgmPath);
      this.bgm.loop = true;
      this.bgm.volume = 0.75;
    }

    if (this.bgm.paused) {
      this.bgm
        .play()
        .then(() => {
          this.isBgmPlaying = true;
        })
        .catch(() => {
          // Autoplay may be restricted until user interaction
        });
    }
  }

  pauseBgm() {
    if (this.bgm && !this.bgm.paused) {
      this.bgm.pause();
    }
  }

  resumeBgm() {
    if (this.bgm && this.bgm.paused) {
      this.bgm.play().catch(() => {});
    }
  }

  async loadSample(kind, path) {
    if (!path || this.soundSamples[kind] || this.loading[kind] || !this.context)
      return;
    this.loading[kind] = true;
    try {
      const response = await fetch(path);
      if (!response.ok)
        throw new Error(`${kind} audio not found: ${response.status}`);
      const decoded = await this.context.decodeAudioData(
        await response.arrayBuffer(),
      );
      this.soundSamples[kind] = decoded;
      if (kind === "wizard") this.soundSamples.fireball = decoded;
      if (kind === "fireball") this.soundSamples.wizard = decoded;
    } catch {
      // Gracefully fall back to procedural synthesizer
    } finally {
      this.loading[kind] = false;
    }
  }

  loadAllSamples() {
    const sfx = window.Constants?.ASSETS?.sfx;
    if (!sfx) return;
    this.loadSample("knight", sfx.knight);
    this.loadSample("fireball", sfx.fireball);
  }

  makeHit(kind) {
    const metal = kind === "knight";
    const magic = kind === "wizard" || kind === "fireball";
    const heavy = kind === "minotaur";
    const lightning = kind === "lightning" || kind === "kira";
    const heal = kind === "heal";
    const duration = heal ? 0.35 : lightning ? 0.28 : magic ? 0.32 : heavy ? 0.36 : metal ? 0.24 : 0.27;
    const rate = this.context.sampleRate;
    const buffer = this.context.createBuffer(
      1,
      Math.round(rate * duration),
      rate,
    );
    const data = buffer.getChannelData(0);
    const cycle = 2 * Math.PI;

    let seed = 17;
    let lowNoise = 0;
    let noise = 0;
    let phase = 0;
    const noiseStep = Math.max(1, Math.round(rate / 8000));
    const noiseFilter = 1 - Math.exp((-cycle * 850) / rate);

    for (let i = 0; i < data.length; i++) {
      const time = i / rate;
      if (i % noiseStep === 0) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        noise = seed / 2147483648 - 1;
      }
      lowNoise += noiseFilter * (noise - lowNoise);
      const edge = Math.min(1, time / 0.002, (duration - time) / 0.012);

      if (heal) {
        const pitch = 520 + 380 * (time / duration);
        phase += pitch / rate;
        const chime = Math.sin(cycle * phase) * Math.exp(-6 * time);
        const overtone = 0.3 * Math.sin(cycle * phase * 2.5) * Math.exp(-9 * time);
        data[i] = edge * (0.35 * chime + overtone);
      } else if (lightning) {
        const pitch = 800 - 450 * Math.exp(-15 * time);
        phase += pitch / rate;
        const zap = Math.sin(cycle * phase);
        const crack = (Math.random() * 2 - 1) * Math.exp(-22 * time);
        data[i] = edge * (0.28 * zap * Math.exp(-12 * time) + 0.38 * crack);
      } else if (heavy) {
        const step = Math.floor(Math.min(time / 0.1, 1) * 5);
        phase += (160 * Math.pow(0.78, step)) / rate;
        const sub = Math.sin(cycle * phase) * Math.exp(-14 * time);
        const slam = 0.32 * noise * Math.exp(-28 * time);
        const boom = 0.28 * lowNoise * Math.exp(-18 * time);
        data[i] = edge * (0.45 * sub + slam + boom);
      } else if (magic) {
        const pitch = 450 + 1000 * Math.exp(-19 * time);
        phase += pitch / rate;
        const shimmer = Math.sin(cycle * phase) * Math.exp(-12 * time);
        const crackle = noise * Math.exp(-25 * time);
        data[i] =
          edge *
          (0.22 * shimmer +
            0.13 * crackle +
            0.11 * Math.sin(cycle * 88 * time) * Math.exp(-18 * time));
      } else if (metal) {
        const step = Math.floor(Math.min(time / 0.065, 1) * 7);
        phase += (1480 * Math.pow(0.84, step)) / rate;
        const pulse = phase % 1 < 0.25 ? 1 : -1 / 3;
        const slash = 0.28 * (noise - lowNoise) * Math.exp(-32 * time);
        const clang =
          (0.1 * Math.sin(cycle * 2100 * time) +
            0.06 * Math.sin(cycle * 3217 * time)) *
          Math.exp(-19 * time);
        const body = 0.17 * Math.sin(cycle * 195 * time) * Math.exp(-47 * time);
        data[i] =
          edge * (slash + clang + body + 0.14 * pulse * Math.exp(-44 * time));
      } else {
        const step = Math.floor(Math.min(time / 0.09, 1) * 6);
        phase += (260 * Math.pow(0.8, step)) / rate;
        const triangle = 1 - 4 * Math.abs((phase % 1) - 0.5);
        const crack = 0.24 * noise * Math.exp(-65 * time);
        const thump = 0.34 * triangle * Math.exp(-22 * time);
        const knock =
          0.12 * Math.sin(cycle * 530 * time) * Math.exp(-43 * time);
        data[i] =
          edge *
          (crack + thump + knock + 0.18 * lowNoise * Math.exp(-28 * time));
      }
    }
    return buffer;
  }

  playHit(kind) {
    if (this.context?.state !== "running") return;
    const now = this.context.currentTime;
    if (now - (this.lastPlayedAt[kind] ?? -Infinity) < 0.06) return;

    const source = this.context.createBufferSource();
    const uploadedSample = this.soundSamples[kind] ?? null;
    source.buffer =
      uploadedSample ?? (this.buffers[kind] ??= this.makeHit(kind));

    const variation = this.variations[kind] ?? 0;
    source.playbackRate.value = uploadedSample
      ? 1
      : this.pitchVariations[variation % this.pitchVariations.length];
    this.variations[kind] = variation + 1;

    source.connect(this.output);
    source.onended = () => source.disconnect();
    source.start();
    this.lastPlayedAt[kind] = now;
  }
}

window.AudioManager = AudioManager;
window.audioManager = new AudioManager();
