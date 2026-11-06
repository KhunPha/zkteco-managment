"use client";

import { useState } from "react";
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Check,
  Music,
  Sparkles,
  Bell,
  Mic,
  Sliders,
  X,
  Radio,
  Flame,
  Heart,
  Headphones,
} from "lucide-react";
import {
  AUDIO_OPTIONS,
  AUDIO_CATEGORIES,
  BGM_TRACKS,
  kioskAudioEngine,
} from "@/lib/kioskAudioEngine";

export default function KioskAudioSettingsModal({
  isOpen,
  onClose,
  selectedSoundId,
  onSelectSound,
  autoPlayEnabled,
  onToggleAutoPlay,
  volume,
  onChangeVolume,
  bgMusicEnabled,
  onToggleBgMusic,
  bgMusicTrack,
  onChangeBgMusicTrack,
  bgMusicVolume,
  onChangeBgMusicVolume,
}) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [playingId, setPlayingId] = useState(null);
  const [previewingBgmId, setPreviewingBgmId] = useState(null);

  if (!isOpen) return null;

  const handleTestPlay = async (option) => {
    kioskAudioEngine.ensureUnlocked();
    if (playingId === option.id) {
      setPlayingId(null);
      return;
    }
    setPlayingId(option.id);
    await kioskAudioEngine.play(option, volume);
    setTimeout(() => {
      setPlayingId((curr) => (curr === option.id ? null : curr));
    }, 4500);
  };

  const handlePreviewBgm = (track) => {
    kioskAudioEngine.ensureUnlocked();
    if (previewingBgmId === track.id) {
      setPreviewingBgmId(null);
      if (bgMusicEnabled) {
        kioskAudioEngine.startBgMusic(bgMusicTrack, bgMusicVolume);
      } else {
        kioskAudioEngine.stopBgMusic();
      }
      return;
    }
    setPreviewingBgmId(track.id);
    kioskAudioEngine.startBgMusic(track.id, bgMusicVolume);
  };

  const filteredOptions = AUDIO_OPTIONS.filter((opt) => {
    if (activeCategory === "all") return true;
    return opt.category === activeCategory;
  });

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case "hit_song":
        return <Flame size={14} className="text-rose-500" />;
      case "khmer_classic":
        return <Heart size={14} className="text-amber-600" />;
      case "combo":
        return <Sparkles size={14} className="text-amber-500" />;
      case "melody":
        return <Music size={14} className="text-indigo-500" />;
      case "voice":
        return <Mic size={14} className="text-emerald-500" />;
      case "bell":
        return <Bell size={14} className="text-sky-500" />;
      default:
        return <Sliders size={14} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Volume2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>ការកំណត់សំឡេង និងតន្ត្រីកុំព្យូទ័រ</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold">
                  Audio & BGM
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ជ្រើសរើសសំឡេងស្កេន និងតន្ត្រីផ្ទៃក្រោយ (BGM) សម្រាប់ចាក់ស្វ័យប្រវត្តិ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Global Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 space-y-3 shrink-0 text-xs">
          {/* Top Row: Scan Auto-Play & Scan Volume */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Scan Audio Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    autoPlayEnabled
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                  }`}
                >
                  <Volume2 size={16} />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    សំឡេងពេលស្កេន (Scan Audio)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {autoPlayEnabled ? "ចាក់សំឡេង+សូមអរគុណ" : "បិទសំឡេង (Muted)"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onToggleAutoPlay(!autoPlayEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  autoPlayEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    autoPlayEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Scan Volume Slider */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col justify-center space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Volume2 size={13} />
                  <span>កម្រិតសំឡេងស្កេន (Scan Vol)</span>
                </span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 dark:accent-indigo-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
              />
            </div>
          </div>

          {/* Bottom Row: Continuous Ambient Background Music (BGM) */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-300/80 dark:border-amber-800/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Headphones size={16} />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>តន្ត្រីផ្ទៃក្រោយជាប្រចាំ (Ambient Background Music - BGM)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold">
                      Default ON
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    ចាក់បទភ្លេងពិរោះរណ្តំជាប្រចាំលើអេក្រង់វត្តមាន (បន្ថយសំឡេងស្វ័យប្រវត្តពេលស្កេន)
                  </div>
                </div>
              </div>

              <button
                onClick={() => onToggleBgMusic(!bgMusicEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                  bgMusicEnabled ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    bgMusicEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {bgMusicEnabled && (
              <div className="pt-2 border-t border-amber-200 dark:border-amber-900/60 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">
                    បទភ្លេងផ្ទៃក្រោយបច្ចុប្បន្ន (Selected BGM):
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">កម្រិត BGM:</span>
                    <input
                      type="range"
                      min="0.05"
                      max="0.5"
                      step="0.02"
                      value={bgMusicVolume || 0.22}
                      onChange={(e) => onChangeBgMusicVolume(parseFloat(e.target.value))}
                      className="w-24 accent-amber-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                    />
                    <span className="font-mono text-[11px] font-bold text-amber-600">
                      {Math.round((bgMusicVolume || 0.22) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {BGM_TRACKS.map((t) => {
                    const isSelected = bgMusicTrack === t.id;
                    const isPreview = previewingBgmId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onChangeBgMusicTrack(t.id);
                          handlePreviewBgm(t);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-white/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-amber-50"
                        }`}
                      >
                        <Music size={11} className={isSelected ? "animate-pulse" : ""} />
                        <span>{t.nameKh.split(" (")[0]}</span>
                        {isSelected && <Check size={11} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scan Audio Categories Tab Bar */}
        <div className="px-5 pt-3 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-slate-100 dark:border-slate-800 shrink-0">
          {AUDIO_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {getCategoryIcon(cat.id)}
              <span>{cat.nameKh}</span>
            </button>
          ))}
        </div>

        {/* Sound Selection Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {filteredOptions.map((opt) => {
            const isSelected = selectedSoundId === opt.id;
            const isPlaying = playingId === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => onSelectSound(opt.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-500 dark:border-indigo-400 shadow-sm"
                    : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {getCategoryIcon(opt.category)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {opt.nameKh}
                      </span>
                      {opt.badge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {opt.descriptionKh}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestPlay(opt);
                    }}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                      isPlaying
                        ? "bg-rose-500 text-white border-rose-500 animate-pulse"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    }`}
                    title="សាកល្បងចាក់ (Play Preview)"
                  >
                    {isPlaying ? <Square size={13} /> : <Play size={13} />}
                    <span className="hidden sm:inline">{isPlaying ? "បញ្ឈប់" : "សាកល្បង"}</span>
                  </button>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {isSelected && <Check size={12} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            សំឡេងខ្មែរ: <b>khmer_thank_you.mp3</b> + តន្ត្រីផ្ទៃក្រោយ (BGM) លំនាំដើម
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            រួចរាល់ (Done)
          </button>
        </div>
      </div>
    </div>
  );
}
