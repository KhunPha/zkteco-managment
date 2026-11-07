"use client";

/**
 * Enterprise Kiosk Audio Engine
 * Plays the Studio Khmer Thank You WAV file ("សូមអរគុណសម្រាប់ការចុះវត្តមាន")
 * and immediately speaks the verified person's name using SpeechSynthesis TTS.
 * Enforces strict anti-duplicate debounce so it never echoes or overlaps.
 */

export const AUDIO_CATEGORIES = [
  { id: "all", nameKh: "សំឡេងខ្មែរ", nameEn: "Khmer Voice" },
];

export const AUDIO_OPTIONS = [
  {
    id: "khmer_thank_you",
    nameKh: "សំឡេងខ្មែរ: សូមអរគុណសម្រាប់ការចុះវត្តមាន",
    nameEn: "Khmer Voice: Thank You for Attendance",
    descriptionKh: "សំឡេងនិយាយខ្មែរ៖ សូមអរគុណសម្រាប់ការចុះវត្តមាន (កម្រិត Studio ច្បាស់ល្អ)",
    category: "voice",
    icon: "volume-2",
    badge: "🇰🇭 សំឡេងខ្មែរ",
    file: "/audio/khmer_thank_you.wav",
    duration: "2.0s",
  },
];

export const BGM_TRACKS = [];

class KioskAudioEngine {
  constructor() {
    this.currentAudio = null;
    this.audioContext = null;
    this.audioBuffer = null;
    this.preloadedAudio = null;
    this.unlocked = false;
    this.lastPlayTime = 0;
    this.preload();
  }

  // Pre-load audio in memory immediately so there is zero network or decoding lag
  preload() {
    if (typeof window === "undefined") return;
    try {
      this.preloadedAudio = new Audio("/audio/khmer_thank_you.wav");
      this.preloadedAudio.preload = "auto";
      this.preloadedAudio.load();

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!this.audioContext) {
          this.audioContext = new AudioCtx();
        }
        fetch("/audio/khmer_thank_you.wav")
          .then((res) => res.arrayBuffer())
          .then((buf) => {
            if (this.audioContext) {
              return this.audioContext.decodeAudioData(buf);
            }
          })
          .then((decoded) => {
            if (decoded) {
              this.audioBuffer = decoded;
            }
          })
          .catch(() => {});
      }
    } catch (_) {}
  }

  // Ensure AudioContext and SpeechSynthesis are initialized upon first interaction
  ensureUnlocked() {
    if (typeof window === "undefined") return;
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    }
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }

    if (!this.audioBuffer && this.audioContext) {
      fetch("/audio/khmer_thank_you.wav")
        .then((res) => res.arrayBuffer())
        .then((buf) => this.audioContext.decodeAudioData(buf))
        .then((decoded) => {
          this.audioBuffer = decoded;
        })
        .catch(() => {});
    }

    if (window.speechSynthesis && window.speechSynthesis.getVoices) {
      window.speechSynthesis.getVoices();
    }

    this.unlocked = true;
  }

  getSavedSoundId() {
    return "khmer_thank_you";
  }

  setSavedSoundId(id) {
    if (typeof window === "undefined") return;
    localStorage.setItem("kiosk_audio_sound", "khmer_thank_you");
  }

  getAutoPlayEnabled() {
    if (typeof window === "undefined") return true;
    const val = localStorage.getItem("kiosk_audio_autoplay");
    return val === null ? true : val === "true";
  }

  setAutoPlayEnabled(enabled) {
    if (typeof window === "undefined") return;
    localStorage.setItem("kiosk_audio_autoplay", enabled ? "true" : "false");
  }

  getVolume() {
    if (typeof window === "undefined") return 0.95;
    const v = localStorage.getItem("kiosk_audio_volume");
    return v !== null ? parseFloat(v) : 0.95;
  }

  setVolume(vol) {
    if (typeof window === "undefined") return;
    localStorage.setItem("kiosk_audio_volume", String(vol));
  }

  getBgMusicEnabled() {
    return false;
  }

  setBgMusicEnabled() {}
  getBgMusicTrack() { return ""; }
  setBgMusicTrack() {}
  getBgMusicVolume() { return 0; }
  setBgMusicVolume() {}
  startBgMusic() {}
  stopBgMusic() {}
  duckBgMusic() {}

  /**
   * Speak the verified personnel name via SpeechSynthesis TTS
   */
  speakPersonnelName(name, khmerName = null) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();

      const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];

      // Check if Khmer TTS voice is supported in browser
      const khmerVoice = voices.find(
        (v) => v.lang && (v.lang.toLowerCase().startsWith("km") || v.lang.toLowerCase().includes("khmer"))
      );

      let textToSpeak = name;
      let selectedVoice = null;
      let lang = "en-US";

      if (khmerVoice && khmerName) {
        textToSpeak = khmerName;
        selectedVoice = khmerVoice;
        lang = khmerVoice.lang || "km-KH";
      } else {
        // English name is clearly and accurately pronounced across all OS and browsers
        textToSpeak = name || khmerName || "";
        const enVoice =
          voices.find((v) => v.lang && (v.lang.startsWith("en-") || v.lang.startsWith("en_"))) ||
          voices[0];
        selectedVoice = enVoice;
        lang = enVoice ? enVoice.lang : "en-US";
      }

      if (!textToSpeak || !textToSpeak.trim()) return;

      const utter = new SpeechSynthesisUtterance(textToSpeak.trim());
      if (selectedVoice) utter.voice = selectedVoice;
      utter.lang = lang;
      utter.rate = 0.90; // Natural, clear speaking speed
      utter.pitch = 1.05;
      utter.volume = Math.min(1.0, this.getVolume() * 1.1);

      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
    }
  }

  /**
   * Plays the Studio Khmer Thank You WAV file ("សូមអរគុណសម្រាប់ការចុះវត្តមាន").
   * Ultra-fast (<5ms) using pre-decoded Web Audio API buffer directly from RAM.
   * Debounced with a 2.0-second guard (bypassed when force=true for instant testing).
   */
  async play(soundIdOrOption = null, customVolume = null, personName = null, khmerName = null, force = false) {
    if (typeof window === "undefined") return false;
    this.ensureUnlocked();

    const now = Date.now();
    // 2.0-second anti-duplicate debounce (bypassed if force=true, e.g. user clicks Test Speaker)
    if (!force && (now - this.lastPlayTime < 2000)) {
      return false;
    }
    this.lastPlayTime = now;

    const volume = customVolume !== null ? customVolume : this.getVolume();

    // 1. Ultra-fast path: Web Audio API AudioBufferSourceNode (0ms latency, decoded in RAM)
    if (this.audioContext && this.audioBuffer) {
      try {
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }
        const source = this.audioContext.createBufferSource();
        source.buffer = this.audioBuffer;
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start(0);
        return true;
      } catch (webaudioErr) {
        // Fall back to preloaded audio
      }
    }

    // 2. Fast Fallback: Preloaded HTMLAudioElement
    try {
      let audio = this.preloadedAudio;
      if (!audio) {
        audio = new Audio("/audio/khmer_thank_you.wav");
        this.preloadedAudio = audio;
      }
      audio.currentTime = 0;
      audio.volume = volume;
      this.currentAudio = audio;

      await audio.play();
      return true;
    } catch (err) {
      console.warn("Audio playback issue:", err);
      return false;
    }
  }
}

export const kioskAudioEngine = new KioskAudioEngine();
