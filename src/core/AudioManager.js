"use strict";

class AudioManager {
  static volumeKey = "roti-benteng-audio-v1";
  static defaultVolume = { music: 75, effects: 80 };

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
    this.musicOutput = null;
    this.lobbyBgm = null;
    this.lobbyMusicOutput = null;
    this.activeBgmTrack = "lobby";
    this.volume = this.loadVolume();
  }

  loadVolume() {
    const volume = { ...AudioManager.defaultVolume };
    try {
      const stored = JSON.parse(localStorage.getItem(AudioManager.volumeKey));
      for (const kind of Object.keys(volume)) {
        if (Number.isFinite(stored?.[kind])) {
          volume[kind] = Math.max(0, Math.min(100, Math.round(stored[kind])));
        }
      }
    } catch {
      // Keep defaults if storage is unavailable.
    }
    return volume;
  }

  setVolume(kind, percent) {
    this.volume[kind] = percent;
    this.applyVolume();
    try {
      localStorage.setItem(AudioManager.volumeKey, JSON.stringify(this.volume));
    } catch {
      // Keep session volume usable when storage is unavailable.
    }
  }

  applyVolume() {
    if (this.output) this.output.gain.value = this.volume.effects / 100;
    const musicGain = this.volume.music / 100;
    const musicMuted = this.volume.music === 0;
    for (const audio of [this.bgm, this.lobbyBgm]) {
      if (audio) {
        audio.volume = musicGain;
        audio.muted = musicMuted;
      }
    }
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
        this.output.connect(compressor);
        compressor.connect(this.context.destination);
        this.applyVolume();
      }

      if (this.context.state !== "running") {
        this.context.resume().catch(() => {});
      }

      this.loadAllSamples();
      if (this.activeBgmTrack === "lobby" && (!this.lobbyBgm || this.lobbyBgm.paused)) {
        this.playLobbyBgm();
      }
    } catch {
      // Audio can be unavailable without breaking game flow
    }
  }

  createMusicPlayer(path) {
    // Use native HTMLAudioElement playback directly so BGM never goes silent
    // when routed through MediaElementAudioSourceNode on http:// origins.
    const audio = new Audio(path);
    audio.loop = true;
    audio.preload = "auto";
    return { audio, output: null };
  }

  playLobbyBgm() {
    this.activeBgmTrack = "lobby";
    if (this.bgm) {
      if (!this.bgm.paused) this.bgm.pause();
      if (this.bgm.currentTime > 0) this.bgm.currentTime = 0;
    }

    const lobbyPath = window.Constants?.ASSETS?.bgm?.lobby;
    if (!lobbyPath) return;

    if (!this.lobbyBgm) {
      const player = this.createMusicPlayer(lobbyPath);
      this.lobbyBgm = player.audio;
      this.lobbyMusicOutput = player.output;
      this.applyVolume();
    }

    if (this.lobbyBgm.paused) {
      this.lobbyBgm.play().catch(() => {});
    }
  }

  playBgm() {
    this.activeBgmTrack = "battle";
    if (this.lobbyBgm && !this.lobbyBgm.paused) {
      this.lobbyBgm.pause();
    }

    const bgmPath = window.Constants?.ASSETS?.bgm?.main;
    if (!bgmPath) return;

    if (!this.bgm) {
      const player = this.createMusicPlayer(bgmPath);
      this.bgm = player.audio;
      this.musicOutput = player.output;
      this.applyVolume();
    }

    if (this.bgm.paused) {
      this.bgm.play().catch(() => {});
    }
  }

  pauseBgm() {
    if (this.bgm && !this.bgm.paused) {
      this.bgm.pause();
    }
    if (this.lobbyBgm && !this.lobbyBgm.paused) {
      this.lobbyBgm.pause();
    }
  }

  resumeBgm() {
    if (this.activeBgmTrack === "lobby") {
      this.playLobbyBgm();
    } else {
      this.playBgm();
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
    for (const [kind, path] of Object.entries(sfx)) {
      this.loadSample(kind, path);
    }
  }

  makeHit(kind) {
    const durations = {
      heal: 0.35,
      lightning: 0.28,
      kira: 0.28,
      wizard: 0.32,
      fireball: 0.32,
      minotaur: 0.36,
      knight: 0.24,
      james: 0.24,
      baseSkill: 0.72,
      lynceLaunch: 0.24,
      lynceHit: 0.22,
      lynceSkillLaunch: 0.42,
      lynceSkillHit: 0.3,
      commander: 0.34,
      commanderPlant: 0.45,
      commanderSweep: 0.58,
      witcherLaunch: 0.28,
      witcherImpact: 0.36,
      witcherHeal: 0.48,
      witcherSummonStart: 0.65,
      witcherSummonComplete: 0.55,
      rootGiantAttack1: 0.38,
      rootGiantAttack2: 0.48,
      rootGiantSkill: 0.85
    };
    const metal = kind === "knight" || kind === "james";
    const magic = kind === "wizard" || kind === "fireball";
    const heavy = kind === "minotaur";
    const lightning = kind === "lightning" || kind === "kira";
    const heal = kind === "heal";
    const duration = durations[kind] ?? 0.27;
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
    let phaseAlt = 0;
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

      if (kind === "lynceLaunch") {
        const pitch = 155 + 185 * Math.exp(-28 * time);
        phase += pitch / rate;
        const twang = 0.45 * Math.sin(cycle * phase) * Math.exp(-18 * time);
        const zip = 0.28 * (noise - lowNoise) * Math.exp(-22 * time);
        data[i] = edge * (twang + zip);
      } else if (kind === "lynceHit") {
        const pitch = 72 + 160 * Math.exp(-42 * time);
        phase += pitch / rate;
        const thud = 0.5 * Math.sin(cycle * phase) * Math.exp(-24 * time);
        const snap = 0.32 * noise * Math.exp(-38 * time);
        data[i] = edge * (thud + snap);
      } else if (kind === "lynceSkillLaunch") {
        const pitch = 190 + 290 * Math.exp(-16 * time);
        phase += pitch / rate;
        const bow = 0.38 * Math.sin(cycle * phase) * Math.exp(-12 * time);
        const gale = (0.3 * (noise - lowNoise) + 0.2 * lowNoise) * Math.exp(-6.5 * time);
        data[i] = edge * (bow + gale);
      } else if (kind === "lynceSkillHit") {
        const pitch = 240 + 520 * Math.exp(-25 * time);
        phase += pitch / rate;
        const slice = 0.34 * Math.sin(cycle * phase) * Math.exp(-15 * time);
        const chime = 0.18 * Math.sin(cycle * 880 * time) * Math.exp(-14 * time);
        const whoosh = 0.28 * (noise - lowNoise) * Math.exp(-16 * time);
        data[i] = edge * (slice + chime + whoosh);
      } else if (kind === "commander") {
        const pitch = 74 * Math.exp(-16 * time) + 38;
        phase += pitch / rate;
        const thud = 0.5 * Math.sin(cycle * phase) * Math.exp(-14 * time);
        const steel = (0.28 * Math.sin(cycle * 920 * time) + 0.18 * Math.sin(cycle * 1380 * time)) * Math.exp(-19 * time);
        const cleave = 0.3 * (noise - lowNoise) * Math.exp(-26 * time);
        data[i] = edge * (thud + steel + cleave);
      } else if (kind === "commanderPlant") {
        const pitch = 38 + 77 * Math.exp(-20 * time);
        phase += pitch / rate;
        const slam = 0.55 * Math.sin(cycle * phase) * Math.exp(-7.5 * time);
        const lock = (0.24 * Math.sin(cycle * 440 * time) + 0.16 * Math.sin(cycle * 660 * time)) * Math.exp(-8 * time);
        const earth = 0.36 * lowNoise * Math.exp(-16 * time);
        data[i] = edge * (slam + lock + earth);
      } else if (kind === "commanderSweep") {
        const pitch = 35 + 115 * Math.exp(-15 * time);
        phase += pitch / rate;
        const boom = 0.55 * Math.sin(cycle * phase) * Math.exp(-6.2 * time);
        const ring = (0.25 * Math.sin(cycle * 680 * time) + 0.18 * Math.sin(cycle * 1020 * time)) * Math.exp(-8.5 * time);
        const wind = 0.32 * noise * Math.exp(-12 * time) + 0.24 * lowNoise * Math.exp(-8 * time);
        data[i] = edge * (boom + ring + wind);
      } else if (kind === "witcherLaunch") {
        const pitch = 190 + 450 * Math.exp(-11 * time);
        phase += pitch / rate;
        phaseAlt += (pitch * 1.5) / rate;
        const bolt = 0.34 * Math.sin(cycle * phase + Math.sin(cycle * phaseAlt)) * Math.exp(-9.5 * time);
        const hiss = 0.18 * (noise - lowNoise) * Math.exp(-13 * time);
        data[i] = edge * (bolt + hiss);
      } else if (kind === "witcherImpact") {
        const pitch = 58 + 232 * Math.exp(-26 * time);
        phase += pitch / rate;
        const pop = 0.42 * Math.sin(cycle * phase) * Math.exp(-13 * time);
        const darkChime = (0.22 * Math.sin(cycle * 415.3 * time) + 0.18 * Math.sin(cycle * 440 * time)) * Math.exp(-12 * time);
        const crackle = 0.24 * noise * Math.exp(-18 * time);
        data[i] = edge * (pop + darkChime + crackle);
      } else if (kind === "witcherHeal") {
        const minorNotes =
          0.18 * Math.sin(cycle * 146.83 * time) * Math.exp(-5.5 * time) +
          0.22 * Math.sin(cycle * 293.66 * time) * Math.exp(-6.5 * time) +
          (time > 0.05 ? 0.2 * Math.sin(cycle * 349.23 * (time - 0.05)) * Math.exp(-6.8 * (time - 0.05)) : 0) +
          (time > 0.1 ? 0.18 * Math.sin(cycle * 440 * (time - 0.1)) * Math.exp(-7.2 * (time - 0.1)) : 0);
        data[i] = edge * Math.min(1, time / 0.02) * minorNotes;
      } else if (kind === "witcherSummonStart") {
        const env = Math.min(1, time / 0.12) * Math.exp(-2.2 * Math.max(0, time - 0.12));
        const drone = 0.3 * Math.sin(cycle * 65.41 * time) + 0.22 * Math.sin(cycle * 98 * time);
        const rune = 0.16 * (Math.sin(cycle * 196 * time) + Math.sin(cycle * 207.65 * time));
        data[i] = edge * env * (drone + rune + 0.25 * lowNoise);
      } else if (kind === "witcherSummonComplete") {
        const stompPitch = 42 + 95 * Math.exp(-22 * time);
        const roarPitch = 78 + 57 * Math.exp(-3.8 * time);
        phase += stompPitch / rate;
        phaseAlt = (phaseAlt + roarPitch / rate) % 1;
        const stomp = 0.44 * Math.sin(cycle * phase) * Math.exp(-8.5 * time);
        const roar = 0.32 * (2 * phaseAlt - 1) * Math.min(1, time / 0.04) * Math.exp(-4.2 * Math.max(0, time - 0.05));
        const portal = 0.18 * Math.sin(cycle * 311.13 * time) * Math.exp(-11 * time);
        data[i] = edge * (stomp + roar + portal + 0.16 * lowNoise * Math.exp(-12 * time));
      } else if (kind === "baseSkill") {
        const chord =
          0.22 * Math.sin(cycle * 523.25 * time) * Math.exp(-5 * time) +
          (time > 0.06 ? 0.22 * Math.sin(cycle * 659.25 * (time - 0.06)) * Math.exp(-5 * (time - 0.06)) : 0) +
          (time > 0.12 ? 0.24 * Math.sin(cycle * 783.99 * (time - 0.12)) * Math.exp(-5 * (time - 0.12)) : 0) +
          (time > 0.18 ? 0.26 * Math.sin(cycle * 1046.5 * (time - 0.18)) * Math.exp(-5.4 * (time - 0.18)) : 0);
        const breeze = 0.25 * (noise - lowNoise) * Math.exp(-4.5 * time);
        data[i] = edge * (chord + breeze);
      } else if (kind === "rootGiantAttack1") {
        const pitch = 140 - 65 * time;
        phase += pitch / rate;
        const wood = 0.42 * Math.sin(cycle * phase) * Math.exp(-14 * time);
        const swipe = 0.48 * (noise - lowNoise) * Math.exp(-11 * time) * Math.min(1, time / 0.03);
        data[i] = edge * (wood + swipe);
      } else if (kind === "rootGiantAttack2") {
        const pitch = 38 + 95 * Math.exp(-24 * time);
        phase += pitch / rate;
        const thud = 0.58 * Math.sin(cycle * phase) * Math.exp(-7.5 * time);
        const crack = 0.32 * noise * Math.exp(-26 * time);
        data[i] = edge * (thud + crack);
      } else if (kind === "rootGiantSkill") {
        const rumble = 0.48 * lowNoise * Math.min(1, time / 0.06) * Math.exp(-2.6 * time);
        const yank = time >= 0.32
          ? 0.32 * Math.sin(cycle * (85 + 160 * Math.min(1, (time - 0.32) / 0.3)) * time) * Math.exp(-5 * (time - 0.32))
          : 0;
        data[i] = edge * (rumble + yank);
      } else if (heal) {
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
    if (this.context?.state !== "running" || this.volume.effects === 0) return;
    const now = this.context.currentTime;
    if (now - (this.lastPlayedAt[kind] ?? -Infinity) < 0.06) return;

    const uploadedSample = this.soundSamples[kind];
    if (!uploadedSample && kind === "lightningLaunch") return;

    const source = this.context.createBufferSource();
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
