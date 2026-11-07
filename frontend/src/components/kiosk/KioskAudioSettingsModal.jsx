"use client";

import { useState } from "react";
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Check,
  X,
  Mic,
} from "lucide-react";
import {
  AUDIO_OPTIONS,
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
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!isOpen) return null;

  const handleTestPlay = async () => {
    kioskAudioEngine.ensureUnlocked();
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    await kioskAudioEngine.play("khmer_thank_you", volume, null, null, true);
    setTimeout(() => {
      setIsPlaying(false);
    }, 2000);
  };

  const option = AUDIO_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Volume2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>ការកំណត់សំឡេងកុំព្យូទ័រ</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-semibold">
                  Khmer Voice Only
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                សំឡេងខ្មែរ «សូមអរគុណសម្រាប់ការចុះវត្តមាន» (khmer_thank_you.wav)
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
        <div className="p-5 space-y-4 text-xs">
          {/* Scan Audio Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  autoPlayEnabled
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                }`}
              >
                {autoPlayEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  សំឡេងស្វ័យប្រវត្ត (Audio Autoplay)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {autoPlayEnabled ? "ចាក់សំឡេងពេលស្កេនជោគជ័យ" : "បិទសំឡេង (Muted)"}
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

          {/* Volume Slider */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Volume2 size={14} />
                <span>កម្រិតសំឡេង (Volume)</span>
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
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
              className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
            />
          </div>

          {/* Dedicated Sound Option */}
          <div className="p-4 rounded-2xl border bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/60 dark:border-emerald-600/40 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Mic size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {option.nameKh}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200">
                    {option.badge}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  ឯកសារសំឡេង: <b>/audio/khmer_thank_you.wav</b>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleTestPlay}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isPlaying
                    ? "bg-rose-500 text-white border-rose-500 animate-pulse"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-sm"
                }`}
                title="សាកល្បងចាក់ (Play Preview)"
              >
                {isPlaying ? <Square size={13} /> : <Play size={13} />}
                <span>{isPlaying ? "កំពុងចាក់..." : "សាកល្បង"}</span>
              </button>

              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <Check size={12} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            សំឡេងទោលតែមួយគត់ &bull; គ្មានសំឡេងស្ទួន &bull; គ្មានតន្ត្រីផ្ទៃក្រោយ
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            រួចរាល់ (Done)
          </button>
        </div>
      </div>
    </div>
  );
}
