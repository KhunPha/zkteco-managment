"use client";

/**
 * Enterprise Kiosk Audio Engine
 * Supports Pre-recorded Khmer & English voice prompts, high-fidelity synthesizer melodies,
 * hit songs (Nevada Slowed, In Another Life, Wild Flower, បងក្រ), campus bells, and dual combos.
 */

export const AUDIO_CATEGORIES = [
  { id: "all", nameKh: "ទាំងអស់", nameEn: "All Sounds" },
  { id: "hit_song", nameKh: "បទចម្រៀងល្បីៗ (Hit Songs)", nameEn: "Hit Songs" },
  { id: "khmer_classic", nameKh: "មរតកខ្មែរ (Khmer Classic)", nameEn: "Khmer Classic" },
  { id: "combo", nameKh: "ចម្រៀង + សំឡេង (Combos)", nameEn: "Song + Voice Combos" },
  { id: "melody", nameKh: "បទភ្លេងស្វាគមន៍ (Melodies)", nameEn: "Welcome Melodies" },
  { id: "voice", nameKh: "សំឡេងនិយាយ (Voice Prompts)", nameEn: "Spoken Voice" },
  { id: "bell", nameKh: "កណ្ដឹង (Bells & Chimes)", nameEn: "Bells & Chimes" },
];

export const AUDIO_OPTIONS = [
  // --- HIT SONGS ---
  {
    id: "nevada_slowed",
    nameKh: "Nevada Slowed (បទចម្រៀង Vicetone - Slowed + Reverb)",
    nameEn: "Vicetone - Nevada (Slowed + Reverb Drop)",
    descriptionKh: "បទភ្លេង EDM បែប Slowed + Reverb ដ៏ល្បីល្បាញ សំឡេងបាសពិរោះរណ្តំ និងស្រទន់",
    category: "hit_song",
    icon: "music",
    badge: "🔥 Top Hit",
    file: "/audio/nevada_slowed.wav",
    synthType: "slowed_synth",
    duration: "5.0s",
  },
  {
    id: "in_another_life",
    nameKh: "In Another Life (ព្យាណូរ៉ូមែនទិកពិរោះរណ្តំ)",
    nameEn: "In Another Life - Emotional Acoustic Piano",
    descriptionKh: "បទភ្លេងព្យាណូ In Another Life ដ៏ទន់ភ្លន់ និងរំជួលចិត្ត ផ្តល់អារម្មណ៍កក់ក្តៅពេលព្រឹក",
    category: "hit_song",
    icon: "music",
    badge: "🎹 Piano Hit",
    file: "/audio/in_another_life.wav",
    synthType: "piano",
    duration: "5.2s",
  },
  {
    id: "wild_flower",
    nameKh: "Wild Flower (ហ្គីតាផ្កាព្រៃស្រស់ស្អាត)",
    nameEn: "Wild Flower - Acoustic Guitar Bloom",
    descriptionKh: "បទភ្លេងហ្គីតា Acoustic ផ្កាព្រៃ ស្រស់ស្រាយ ផ្អែមល្ហែម និងមានភាពរស់រវើក",
    category: "hit_song",
    icon: "music",
    badge: "🎸 Acoustic",
    file: "/audio/wild_flower.wav",
    synthType: "guitar",
    duration: "4.9s",
  },

  // --- KHMER CLASSIC ---
  {
    id: "bong_kror",
    nameKh: "បងក្រ (Bong Kror - បទមរតកដើមខ្មែរ រនាតឯក)",
    nameEn: "Bong Kror - Khmer Traditional Classic Melody",
    descriptionKh: "បទមរតកដើមខ្មែរដ៏ល្បីល្បាញ បន្លឺឡើងដោយឧបករណ៍រនាតឯក និងកណ្តឹងខ្មែរយ៉ាងពិរោះ",
    category: "khmer_classic",
    icon: "sparkles",
    badge: "🇰🇭 មរតកខ្មែរ",
    file: "/audio/bong_kror.wav",
    synthType: "roneat",
    duration: "6.3s",
  },

  // --- COMBOS (SONG + VOICE) ---
  {
    id: "combo_melody_khmer",
    nameKh: "បទភ្លេងស្វាគមន៍ + សំឡេងខ្មែរ (សូមអរគុណ)",
    nameEn: "Upbeat Melody + Khmer Voice Combo",
    descriptionKh: "ចាក់បទភ្លេងស្វាគមន៍រីករាយ បន្ទាប់មកសំឡេងខ្មែរ សូមអរគុណសម្រាប់ការចុះវត្តមាន",
    category: "combo",
    icon: "sparkles",
    badge: "⭐ លំនាំដើម (Default)",
    file: "/audio/welcome_melody.wav",
    nextFile: "/audio/khmer_thank_you.mp3",
    nextDelayMs: 650,
    duration: "3.2s",
  },
  {
    id: "combo_in_another_life_khmer",
    nameKh: "In Another Life + សំឡេងខ្មែរ (សូមអរគុណ)",
    nameEn: "In Another Life Piano + Khmer Voice",
    descriptionKh: "បទភ្លេងព្យាណូ In Another Life បន្តដោយសំឡេងខ្មែរ សូមអរគុណសម្រាប់ការចុះវត្តមាន",
    category: "combo",
    icon: "music",
    badge: "🎹 Piano Combo",
    file: "/audio/in_another_life.wav",
    nextFile: "/audio/khmer_thank_you.mp3",
    nextDelayMs: 1400,
    duration: "4.8s",
  },
  {
    id: "combo_wild_flower_khmer",
    nameKh: "Wild Flower + សំឡេងខ្មែរ (សូមអរគុណ)",
    nameEn: "Wild Flower Acoustic + Khmer Voice",
    descriptionKh: "បទភ្លេងហ្គីតាផ្កាព្រៃ ស្រស់ស្រាយ បន្តដោយសំឡេងខ្មែរ សូមអរគុណសម្រាប់ការចុះវត្តមាន",
    category: "combo",
    icon: "music",
    badge: "🎸 Acoustic Combo",
    file: "/audio/wild_flower.wav",
    nextFile: "/audio/khmer_thank_you.mp3",
    nextDelayMs: 1500,
    duration: "4.7s",
  },
  {
    id: "combo_nevada_khmer",
    nameKh: "Nevada Slowed + សំឡេងខ្មែរ (សូមអរគុណ)",
    nameEn: "Nevada Slowed + Khmer Voice Combo",
    descriptionKh: "ចាក់បទ Nevada Slowed បន្តដោយសំឡេងខ្មែរ សូមអរគុណសម្រាប់ការចុះវត្តមាន",
    category: "combo",
    icon: "music",
    badge: "🔥 Hit Combo",
    file: "/audio/nevada_slowed.wav",
    nextFile: "/audio/khmer_thank_you.mp3",
    nextDelayMs: 1800,
    duration: "4.5s",
  },
  {
    id: "combo_bong_kror_khmer",
    nameKh: "បងក្រ + សំឡេងខ្មែរ (សូមអរគុណ)",
    nameEn: "Bong Kror Melody + Khmer Voice Combo",
    descriptionKh: "ចាក់ភ្លេងបងក្របែបប្រពៃណី បន្តដោយសំឡេងខ្មែរ សូមអរគុណសម្រាប់ការចុះវត្តមាន",
    category: "combo",
    icon: "sparkles",
    badge: "🇰🇭 Khmer Combo",
    file: "/audio/bong_kror.wav",
    nextFile: "/audio/khmer_thank_you.mp3",
    nextDelayMs: 2200,
    duration: "5.0s",
  },
  {
    id: "combo_happy_kiosk_khmer",
    nameKh: "Happy Kiosk + សំឡេងខ្មែរ (សូមអរគុណ)",
    nameEn: "Happy Kiosk Melody + Khmer Voice",
    descriptionKh: "ចាក់ភ្លេង Happy Kiosk Swing បន្តដោយសំឡេងខ្មែរ សូមអរគុណសម្រាប់ការចុះវត្តមាន",
    category: "combo",
    icon: "music",
    badge: "✨ Upbeat Combo",
    file: "/audio/happy_kiosk_song.wav",
    nextFile: "/audio/khmer_thank_you.mp3",
    nextDelayMs: 1200,
    duration: "3.8s",
  },
  {
    id: "combo_bell_khmer",
    nameKh: "កណ្ដឹងគ្រីស្តាល់ + សំឡេងខ្មែរ (សូមអរគុណ)",
    nameEn: "Crystal Ding + Khmer Voice Combo",
    descriptionKh: "កណ្ដឹង Ding គ្រីស្តាល់រោទ៍ រួចបន្តដោយសំឡេងខ្មែរ សូមអរគុណសម្រាប់ការចុះវត្តមាន",
    category: "combo",
    icon: "bell",
    badge: "ស័ក្តិសមបំផុត",
    file: "/audio/crystal_ding.wav",
    nextFile: "/audio/khmer_thank_you.mp3",
    nextDelayMs: 400,
    duration: "2.6s",
  },

  // --- MELODIES & BELLS ---
  {
    id: "welcome_melody",
    nameKh: "បទភ្លេងស្វាគមន៍រីករាយ (Upbeat Welcome Melody)",
    nameEn: "Upbeat Welcome Theme Song",
    descriptionKh: "ភ្លេងស្វាគមន៍ ៦ កំណាត់ បែប Marimba រីករាយ ធ្វើឱ្យមានអារម្មណ៍ស្រស់ស្រាយរាល់ពេលស្កេន",
    category: "melody",
    icon: "music",
    badge: "ពិរោះរណ្តំ",
    file: "/audio/welcome_melody.wav",
    synthType: "marimba",
    duration: "2.2s",
  },
  {
    id: "happy_kiosk_song",
    nameKh: "ចម្រៀងភ្លេងខ្លីរីករាយ (Happy Kiosk Theme Song)",
    nameEn: "Happy Kiosk Theme Song",
    descriptionKh: "ចម្រៀងភ្លេង Swing ៨ ណោត រីករាយ និងទាក់ទាញ ស័ក្តិសមសម្រាប់ក្រុមហ៊ុននិងសាលារៀន",
    category: "melody",
    icon: "music",
    badge: "ថ្មី (New)",
    file: "/audio/happy_kiosk_song.wav",
    synthType: "song",
    duration: "2.7s",
  },
  {
    id: "success_fanfare",
    nameKh: "បទភ្លេងជោគជ័យ (Victory Sparkle & Fanfare)",
    nameEn: "Victory & Success Fanfare",
    descriptionKh: "បទភ្លេងអបអរសាទរជោគជ័យ សំឡេងភ្លឺថ្លា អមដោយពន្លឺ Sparkle",
    category: "melody",
    icon: "sparkles",
    badge: "ជោគជ័យ",
    file: "/audio/success_fanfare.wav",
    synthType: "crystal",
    duration: "2.1s",
  },
  {
    id: "campus_bell",
    nameKh: "កណ្ដឹងសាលារៀន (Campus Westminster Chime)",
    nameEn: "Classic Campus Westminster Bell",
    descriptionKh: "សំឡេងកណ្ដឹង Westminster ៤ កំណាត់ បែបសាលារៀន និងសកលវិទ្យាល័យលំដាប់អន្តរជាតិ",
    category: "bell",
    icon: "bell",
    badge: "សាលារៀន",
    file: "/audio/campus_bell.wav",
    synthType: "bell",
    duration: "3.8s",
  },
  {
    id: "crystal_ding",
    nameKh: "កណ្ដឹងគ្រីស្តាល់ទំនើប (Crystal Tech Ding)",
    nameEn: "Modern Crystal Ding",
    descriptionKh: "កណ្ដឹងកញ្ចក់គ្រីស្តាល់ទំនើប Ding-Dong ខ្លីរហ័ស ល្អសម្រាប់ស្កេនលឿន",
    category: "bell",
    icon: "bell",
    badge: "ទំនើប",
    file: "/audio/crystal_ding.wav",
    synthType: "crystal",
    duration: "1.6s",
  },
  {
    id: "gentle_harp",
    nameKh: "ភ្លេងរណ្តំពិរោះ (Soothing Pentatonic Harp)",
    nameEn: "Gentle Acoustic Harp Chime",
    descriptionKh: "ភ្លេងពិណកម្សាន្តស្រទន់ ៥ ណោត Pentatonic បន្ធូរអារម្មណ៍",
    category: "melody",
    icon: "music",
    badge: "ស្រទន់",
    file: "/audio/gentle_harp.wav",
    synthType: "harp",
    duration: "2.5s",
  },

  // --- SPOKEN VOICES ---
  {
    id: "khmer_voice",
    nameKh: "សំឡេងខ្មែរ: សូមអរគុណសម្រាប់ការចុះវត្តមាន",
    nameEn: "Khmer Voice: Standard Thank You",
    descriptionKh: "សំឡេងនិយាយខ្មែរច្បាស់ៗ៖ សូមអរគុណសម្រាប់ការចុះវត្តមាន",
    category: "voice",
    icon: "mic",
    badge: "ស្តង់ដារ",
    file: "/audio/khmer_thank_you.mp3",
    duration: "1.5s",
  },
  {
    id: "english_voice",
    nameKh: "សំឡេងអង់គ្លេស: Thank You (Attendance Recorded)",
    nameEn: "English Voice: Attendance Recorded",
    descriptionKh: "សំឡេងភាសាអង់គ្លេសផ្លូវការ៖ Thank you! Attendance recorded successfully.",
    category: "voice",
    icon: "volume-2",
    badge: "EN",
    ttsText: "Thank you! Attendance recorded successfully.",
    ttsLang: "en-US",
    duration: "1.8s",
  },
  {
    id: "english_welcome",
    nameKh: "សំឡេងអង់គ្លេស: Welcome, Have a Great Day!",
    nameEn: "English Voice: Welcome & Greetings",
    descriptionKh: "សំឡេងភាសាអង់គ្លេសស្វាគមន៍៖ Welcome! Have a great and productive day!",
    category: "voice",
    icon: "volume-2",
    badge: "EN",
    ttsText: "Welcome! Have a great and productive day!",
    ttsLang: "en-US",
    duration: "2.0s",
  },
];

export const BGM_TRACKS = [
  { id: "in_another_life", nameKh: "In Another Life (ព្យាណូរ៉ូមែនទិកពិរោះ)", nameEn: "In Another Life (Piano)", file: "/audio/in_another_life.wav" },
  { id: "wild_flower", nameKh: "Wild Flower (ហ្គីតាផ្កាព្រៃស្រស់ស្រាយ)", nameEn: "Wild Flower (Acoustic Guitar)", file: "/audio/wild_flower.wav" },
  { id: "nevada_slowed", nameKh: "Nevada Slowed (Slowed & Reverb EDM)", nameEn: "Nevada (Slowed EDM)", file: "/audio/nevada_slowed.wav" },
  { id: "bong_kror", nameKh: "បងក្រ (មរតកដើមខ្មែរ រនាតឯក)", nameEn: "Bong Kror (Khmer Classic)", file: "/audio/bong_kror.wav" },
  { id: "welcome_melody", nameKh: "បទភ្លេងស្វាគមន៍ (Upbeat Welcome Marimba)", nameEn: "Welcome Theme (Marimba)", file: "/audio/welcome_melody.wav" },
  { id: "happy_kiosk_song", nameKh: "ចម្រៀងរីករាយ (Happy Kiosk Swing)", nameEn: "Happy Kiosk Swing", file: "/audio/happy_kiosk_song.wav" },
  { id: "gentle_harp", nameKh: "ភ្លេងពិណស្រទន់ (Gentle Pentatonic Harp)", nameEn: "Gentle Harp", file: "/audio/gentle_harp.wav" },
];

class KioskAudioEngine {
  constructor() {
    this.currentAudio = null;
    this.currentNextAudio = null;
    this.bgAudio = null;
    this.audioContext = null;
    this.unlocked = false;
  }

  // Ensure AudioContext is initialized upon first user interaction
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
    this.unlocked = true;
  }

  getSavedSoundId() {
    if (typeof window === "undefined") return "combo_melody_khmer";
    return localStorage.getItem("kiosk_audio_sound") || "combo_melody_khmer";
  }

  setSavedSoundId(id) {
    if (typeof window === "undefined") return;
    localStorage.setItem("kiosk_audio_sound", id);
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
    if (typeof window === "undefined") return 0.9;
    const v = localStorage.getItem("kiosk_audio_volume");
    return v !== null ? parseFloat(v) : 0.9;
  }

  setVolume(vol) {
    if (typeof window === "undefined") return;
    localStorage.setItem("kiosk_audio_volume", String(vol));
  }

  // --- Background Music (BGM) Engine ---
  getBgMusicEnabled() {
    if (typeof window === "undefined") return true; // Default ON as requested
    const val = localStorage.getItem("kiosk_bgm_enabled");
    return val === null ? true : val === "true";
  }

  setBgMusicEnabled(enabled) {
    if (typeof window === "undefined") return;
    localStorage.setItem("kiosk_bgm_enabled", enabled ? "true" : "false");
    if (!enabled) {
      this.stopBgMusic();
    }
  }

  getBgMusicTrack() {
    if (typeof window === "undefined") return "in_another_life";
    return localStorage.getItem("kiosk_bgm_track") || "in_another_life";
  }

  setBgMusicTrack(track) {
    if (typeof window === "undefined") return;
    localStorage.setItem("kiosk_bgm_track", track);
  }

  getBgMusicVolume() {
    if (typeof window === "undefined") return 0.22;
    const v = localStorage.getItem("kiosk_bgm_volume");
    return v !== null ? parseFloat(v) : 0.22;
  }

  setBgMusicVolume(vol) {
    if (typeof window === "undefined") return;
    localStorage.setItem("kiosk_bgm_volume", String(vol));
    if (this.bgAudio) {
      this.bgAudio.volume = vol;
    }
  }

  resolveTrackFile(trackId) {
    const found = BGM_TRACKS.find((t) => t.id === trackId);
    return found ? found.file : "/audio/in_another_life.wav";
  }

  startBgMusic(trackId, volume = 0.22) {
    if (typeof window === "undefined") return;
    this.ensureUnlocked();
    const track = trackId || this.getBgMusicTrack();
    const vol = volume !== undefined ? volume : this.getBgMusicVolume();
    const file = this.resolveTrackFile(track);

    if (this.bgAudio) {
      if (this.bgAudio.src.endsWith(file) && !this.bgAudio.paused) {
        return; // Already playing same track
      }
      this.stopBgMusic();
    }

    try {
      this.bgAudio = new Audio(file);
      this.bgAudio.loop = true;
      this.bgAudio.volume = vol;
      this.bgAudio.play().catch((err) => {
        console.warn("BGM autoplay pending user interaction:", err);
      });
    } catch (e) {
      console.warn("Failed to start BGM:", e);
    }
  }

  stopBgMusic() {
    if (this.bgAudio) {
      try {
        this.bgAudio.pause();
        this.bgAudio.currentTime = 0;
        this.bgAudio = null;
      } catch (_) {}
    }
  }

  // Smoothly duck BGM volume while scan audio & voice prompt play
  duckBgMusic(durationMs = 3800) {
    if (!this.bgAudio) return;
    const baseVol = this.getBgMusicVolume();
    try {
      this.bgAudio.volume = Math.max(0.03, baseVol * 0.15);
      setTimeout(() => {
        if (this.bgAudio) {
          this.bgAudio.volume = baseVol;
        }
      }, durationMs);
    } catch (_) {}
  }

  // Synthesize notes dynamically via Web Audio API if audio file playback is delayed
  playSynth(type = "marimba", volume = 0.9) {
    this.ensureUnlocked();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const notes = {
      marimba: [
        { f: 523.25, t: 0.00, d: 0.8 },
        { f: 659.25, t: 0.14, d: 0.8 },
        { f: 783.99, t: 0.28, d: 0.8 },
        { f: 880.00, t: 0.42, d: 0.9 },
        { f: 1046.5, t: 0.58, d: 1.1 },
        { f: 1318.5, t: 0.74, d: 1.4 },
      ],
      song: [
        { f: 523.25, t: 0.00, d: 0.6 },
        { f: 659.25, t: 0.16, d: 0.6 },
        { f: 783.99, t: 0.32, d: 0.6 },
        { f: 880.00, t: 0.50, d: 0.6 },
        { f: 783.99, t: 0.68, d: 0.6 },
        { f: 987.77, t: 0.86, d: 0.7 },
        { f: 1046.5, t: 1.05, d: 1.6 },
      ],
      bell: [
        { f: 329.63, t: 0.00, d: 1.8 },
        { f: 261.63, t: 0.55, d: 1.8 },
        { f: 293.66, t: 1.10, d: 1.8 },
        { f: 196.00, t: 1.70, d: 2.2 },
      ],
      crystal: [
        { f: 783.99, t: 0.00, d: 0.8 },
        { f: 1046.5, t: 0.16, d: 1.4 },
      ],
      harp: [
        { f: 293.66, t: 0.00, d: 1.2 },
        { f: 369.99, t: 0.18, d: 1.2 },
        { f: 440.00, t: 0.36, d: 1.3 },
        { f: 493.88, t: 0.54, d: 1.4 },
        { f: 587.33, t: 0.72, d: 1.8 },
      ],
      slowed_synth: [
        { f: 164.81, t: 0.00, d: 2.2 },
        { f: 493.88, t: 0.00, d: 0.35 },
        { f: 587.33, t: 0.28, d: 0.35 },
        { f: 659.25, t: 0.56, d: 0.55 },
        { f: 783.99, t: 0.95, d: 0.45 },
        { f: 739.99, t: 1.35, d: 0.45 },
        { f: 659.25, t: 1.75, d: 0.45 },
        { f: 587.33, t: 2.15, d: 0.45 },
        { f: 493.88, t: 2.55, d: 0.55 },
        { f: 440.00, t: 2.95, d: 0.45 },
        { f: 493.88, t: 3.35, d: 1.60 },
      ],
      piano: [
        { f: 174.61, t: 0.00, d: 2.2 },
        { f: 440.00, t: 0.00, d: 0.40 },
        { f: 523.25, t: 0.32, d: 0.40 },
        { f: 698.46, t: 0.65, d: 0.70 },
        { f: 659.25, t: 1.25, d: 0.50 },
        { f: 587.33, t: 1.65, d: 0.50 },
        { f: 523.25, t: 2.05, d: 0.60 },
        { f: 440.00, t: 2.55, d: 0.50 },
        { f: 523.25, t: 2.95, d: 0.50 },
        { f: 587.33, t: 3.35, d: 1.80 },
      ],
      guitar: [
        { f: 164.81, t: 0.00, d: 2.2 },
        { f: 415.30, t: 0.00, d: 0.35 },
        { f: 493.88, t: 0.25, d: 0.35 },
        { f: 659.25, t: 0.50, d: 0.65 },
        { f: 622.25, t: 0.95, d: 0.45 },
        { f: 493.88, t: 1.30, d: 0.40 },
        { f: 415.30, t: 1.65, d: 0.40 },
        { f: 369.99, t: 1.95, d: 0.35 },
        { f: 415.30, t: 2.25, d: 0.45 },
        { f: 493.88, t: 2.65, d: 0.50 },
        { f: 659.25, t: 3.05, d: 1.80 },
      ],
      roneat: [
        { f: 146.83, t: 0.00, d: 2.4 },
        { f: 293.66, t: 0.00, d: 0.45 },
        { f: 349.23, t: 0.32, d: 0.45 },
        { f: 392.00, t: 0.65, d: 0.55 },
        { f: 440.00, t: 1.05, d: 0.65 },
        { f: 523.25, t: 1.55, d: 0.55 },
        { f: 587.33, t: 2.00, d: 0.85 },
        { f: 523.25, t: 2.65, d: 0.50 },
        { f: 440.00, t: 3.05, d: 0.50 },
        { f: 392.00, t: 3.45, d: 0.55 },
        { f: 349.23, t: 3.85, d: 0.50 },
        { f: 293.66, t: 4.25, d: 2.00 },
      ],
    }[type] || [];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type =
        type === "bell"
          ? "sine"
          : type === "harp" || type === "guitar"
          ? "triangle"
          : type === "piano"
          ? "triangle"
          : type === "roneat"
          ? "sine"
          : "sine";

      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0, now + n.t);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + n.t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.1);
    });
  }

  // Play an audio option by ID or object
  async play(soundIdOrOption = null, customVolume = null) {
    if (typeof window === "undefined") return;
    this.ensureUnlocked();

    const targetId = soundIdOrOption
      ? typeof soundIdOrOption === "string"
        ? soundIdOrOption
        : soundIdOrOption.id
      : this.getSavedSoundId();

    const option = AUDIO_OPTIONS.find((opt) => opt.id === targetId) || AUDIO_OPTIONS[0];
    const volume = customVolume !== null ? customVolume : this.getVolume();

    // Automatically duck background music during scan audio and voice playback
    this.duckBgMusic(3800);

    // 1. Text-to-Speech (TTS)
    if (option.ttsText && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(option.ttsText);
        utter.lang = option.ttsLang || "en-US";
        utter.volume = volume;
        utter.rate = 1.0;
        utter.pitch = 1.05;
        window.speechSynthesis.speak(utter);
        return true;
      } catch (err) {
        console.warn("TTS playback error:", err);
      }
    }

    // Stop currently running audios if any
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (_) {}
    }
    if (this.currentNextAudio) {
      try {
        this.currentNextAudio.pause();
        this.currentNextAudio.currentTime = 0;
      } catch (_) {}
    }

    // 2. Combo Playback (File 1 -> Delay -> File 2)
    if (option.category === "combo" && option.file && option.nextFile) {
      try {
        const audio1 = new Audio(option.file);
        audio1.volume = volume;
        this.currentAudio = audio1;

        await audio1.play();

        setTimeout(() => {
          try {
            const audio2 = new Audio(option.nextFile);
            audio2.volume = volume;
            this.currentNextAudio = audio2;
            audio2.play().catch(() => {});
          } catch (_) {}
        }, option.nextDelayMs || 500);

        return true;
      } catch (err) {
        console.warn("Combo audio playback issue, fallback to synth:", err);
        this.playSynth("marimba", volume);
        return false;
      }
    }

    // 3. Single Audio File Playback
    if (option.file) {
      try {
        const audio = new Audio(option.file);
        audio.volume = volume;
        this.currentAudio = audio;
        await audio.play();
        return true;
      } catch (err) {
        console.warn("Audio file playback blocked or not found, falling back to Web Audio synth:", err);
        if (option.synthType) {
          this.playSynth(option.synthType, volume);
        }
        return false;
      }
    }

    return false;
  }
}

export const kioskAudioEngine = new KioskAudioEngine();
