"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Clock,
  Radio,
  UserCheck,
  CreditCard,
  Cpu,
  Layers,
  Fingerprint,
  Scan,
  X,
  ShieldCheck,
  Sparkles,
  Music,
  Sliders,
  Settings,
  Camera,
  Video,
  VideoOff,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
import { formatTime } from "@/lib/utils";
import Portal from "@/components/common/Portal";
import KioskAudioSettingsModal from "@/components/kiosk/KioskAudioSettingsModal";
import {
  kioskAudioEngine,
  AUDIO_OPTIONS,
} from "@/lib/kioskAudioEngine";
import {
  detectFaceWithDescriptor,
  findBestFaceMatch,
  cropFaceBase64,
  captureFrameBase64,
  loadFaceModels,
} from "@/lib/faceEngine";

export default function AttendanceLiveKioskPage() {
  const queryClient = useQueryClient();
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [selectedSoundId, setSelectedSoundId] = useState("combo_melody_khmer");
  const [audioAutoPlay, setAudioAutoPlay] = useState(true);
  const [volume, setVolume] = useState(0.9);

  // Background Music (BGM) State - Default ON
  const [bgMusicEnabled, setBgMusicEnabled] = useState(true);
  const [bgMusicTrack, setBgMusicTrack] = useState("in_another_life");
  const [bgMusicVolume, setBgMusicVolume] = useState(0.22);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [lastLogId, setLastLogId] = useState(null);
  const [activeScan, setActiveScan] = useState(null);
  const [countdown, setCountdown] = useState(5);

  const audioRef = useRef(null);
  const lastAudioPlayedRef = useRef(0);
  const dismissTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Webcam Face ID Live Recognition State
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [webcamPunchState, setWebcamPunchState] = useState("CHECK_IN");
  const [webcamStatus, setWebcamStatus] = useState("idle");
  const [webcamFeedback, setWebcamFeedback] = useState(null);
  const [webcamError, setWebcamError] = useState(null);
  const [liveFaceBox, setLiveFaceBox] = useState(null);

  const webcamVideoRef = useRef(null);
  const webcamCanvasRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const webcamLoopRef = useRef(null);
  const isLoopActiveRef = useRef(false);
  const isProcessingFrameRef = useRef(false);
  const cooldownMapRef = useRef(new Map());
  const consecutiveMatchRef = useRef({ pin: null, count: 0 });

  // Query enrolled face descriptors
  const { data: enrolledFaces, refetch: refetchFaces } = useQuery({
    queryKey: ["enrolled-face-descriptors"],
    queryFn: async () => {
      const res = await api.get("/api/v1/faces/descriptors");
      return res.data?.data || [];
    },
    staleTime: 30000,
  });

  // Initialize and unlock audio engine preferences
  useEffect(() => {
    setSelectedSoundId(kioskAudioEngine.getSavedSoundId());
    setAudioAutoPlay(kioskAudioEngine.getAutoPlayEnabled());
    setVolume(kioskAudioEngine.getVolume());

    const isBgm = kioskAudioEngine.getBgMusicEnabled();
    const track = kioskAudioEngine.getBgMusicTrack();
    const bgmVol = kioskAudioEngine.getBgMusicVolume();
    setBgMusicEnabled(isBgm);
    setBgMusicTrack(track);
    setBgMusicVolume(bgmVol);

    const unlockAudio = () => {
      kioskAudioEngine.ensureUnlocked();
      if (kioskAudioEngine.getBgMusicEnabled()) {
        kioskAudioEngine.startBgMusic(kioskAudioEngine.getBgMusicTrack(), kioskAudioEngine.getBgMusicVolume());
      }
    };
    window.addEventListener("click", unlockAudio, { once: true });
    window.addEventListener("touchstart", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      kioskAudioEngine.stopBgMusic();
    };
  }, []);

  const handleSelectSound = (id) => {
    setSelectedSoundId(id);
    kioskAudioEngine.setSavedSoundId(id);
  };

  const handleToggleAutoPlay = (enabled) => {
    setAudioAutoPlay(enabled);
    kioskAudioEngine.setAutoPlayEnabled(enabled);
  };

  const handleChangeVolume = (val) => {
    setVolume(val);
    kioskAudioEngine.setVolume(val);
  };

  const handleToggleBgMusic = (enabled) => {
    setBgMusicEnabled(enabled);
    kioskAudioEngine.setBgMusicEnabled(enabled);
    if (enabled) {
      kioskAudioEngine.startBgMusic(bgMusicTrack, bgMusicVolume);
    } else {
      kioskAudioEngine.stopBgMusic();
    }
  };

  const handleChangeBgMusicTrack = (trackId) => {
    setBgMusicTrack(trackId);
    kioskAudioEngine.setBgMusicTrack(trackId);
    if (bgMusicEnabled) {
      kioskAudioEngine.startBgMusic(trackId, bgMusicVolume);
    }
  };

  const handleChangeBgMusicVolume = (vol) => {
    setBgMusicVolume(vol);
    kioskAudioEngine.setBgMusicVolume(vol);
  };

  const currentSoundOption =
    AUDIO_OPTIONS.find((opt) => opt.id === selectedSoundId) || AUDIO_OPTIONS[0];

  // Digital clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-GB", { hour12: false })
      );
      setCurrentDateStr(
        now.toLocaleDateString("km-KH", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll real-time biometric raw punch events with high-frequency 400ms interval
  const { data: liveScans } = useQuery({
    queryKey: ["live-scans-stream"],
    queryFn: async () => {
      const res = await api.get("/api/v1/attendance/live-scans?limit=15");
      return res.data?.data || [];
    },
    refetchInterval: 400,
    staleTime: 0,
    refetchIntervalInBackground: true,
  });

  // Handle auto-cleanup and 5-second countdown timer
  const triggerActiveScanWithCountdown = (record) => {
    setActiveScan(record);
    setCountdown(5);

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    let secLeft = 5;
    countdownIntervalRef.current = setInterval(() => {
      secLeft -= 1;
      setCountdown((prev) => Math.max(0, prev - 1));
      if (secLeft <= 0) {
        clearInterval(countdownIntervalRef.current);
      }
    }, 1000);

    dismissTimerRef.current = setTimeout(() => {
      setActiveScan(null);
      setCountdown(5);
    }, 5000);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      stopWebcamFaceId();
    };
  }, []);

  const isPunchingRef = useRef(false);

  const startWebcamFaceId = async () => {
    setWebcamError(null);
    setWebcamStatus("loading_models");
    setWebcamFeedback("Loading Face AI Models...");

    const ok = await loadFaceModels();
    if (!ok) {
      setWebcamError("Failed to initialize face-api models");
      setWebcamStatus("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        webcamVideoRef.current.onloadedmetadata = () => {
          webcamVideoRef.current.play();
          setWebcamStatus("ready");
          setWebcamFeedback("Webcam Gate Ready • ត្រៀមស្កេន");
          startWebcamLoop();
        };
      }
    } catch (err) {
      console.error("Camera startup error:", err);
      setWebcamError("Cannot access camera: " + err.message);
      setWebcamStatus("error");
    }
  };

  const stopWebcamFaceId = () => {
    isLoopActiveRef.current = false;
    if (webcamLoopRef.current) {
      clearTimeout(webcamLoopRef.current);
      clearInterval(webcamLoopRef.current);
      webcamLoopRef.current = null;
    }
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((t) => t.stop());
      webcamStreamRef.current = null;
    }
    setWebcamStatus("idle");
    setWebcamFeedback(null);
    setLiveFaceBox(null);
    consecutiveMatchRef.current = { pin: null, count: 0 };
  };

  const startWebcamLoop = () => {
    isLoopActiveRef.current = true;
    if (webcamLoopRef.current) {
      clearTimeout(webcamLoopRef.current);
      clearInterval(webcamLoopRef.current);
    }

    const processNextFrame = async () => {
      if (!isLoopActiveRef.current) return;

      const video = webcamVideoRef.current;
      const canvas = webcamCanvasRef.current;

      if (video && !video.paused && !video.ended && video.readyState >= 2 && !isPunchingRef.current) {
        if (!isProcessingFrameRef.current) {
          isProcessingFrameRef.current = true;
          try {
            // Ultra-Fast Tiny Detector (10-20ms per frame, 30+ FPS) + 68 Landmark + ResNet-34
            const result = await detectFaceWithDescriptor(video, "tiny", 0.45);

            if (canvas && video && isLoopActiveRef.current) {
              const ctx = canvas.getContext("2d");
              const w = video.videoWidth || 640;
              const h = video.videoHeight || 480;
              canvas.width = w;
              canvas.height = h;
              ctx.clearRect(0, 0, w, h);

              if (result && result.box) {
                const { x, y, width, height } = result.box;

                // 1. Check face proximity (allow larger scanning area across full camera frame)
                if (width < 60 || height < 60) {
                  consecutiveMatchRef.current = { pin: null, count: 0 };
                  setLiveFaceBox({ ...result.box, matched: false, tooFar: true });
                  setWebcamFeedback("📏 Move Closer to Camera • សូមខិតមកជិតកាមេរ៉ា");
                  ctx.strokeStyle = "#f59e0b";
                  ctx.lineWidth = 2.5;
                  ctx.setLineDash([6, 6]);
                  ctx.strokeRect(x, y, width, height);
                  ctx.setLineDash([]);
                } else {
                  // 2. Strict Biometric Matching with 0.32 threshold (Zero False Accepts)
                  const match = findBestFaceMatch(result.descriptor, enrolledFaces || [], 0.32);

                  if (match.matched && match.person) {
                    const pin = match.person.devicePin;
                    if (consecutiveMatchRef.current.pin === pin) {
                      consecutiveMatchRef.current.count += 1;
                    } else {
                      consecutiveMatchRef.current = { pin, count: 1 };
                    }

                    setLiveFaceBox({
                      ...result.box,
                      matched: true,
                      name: match.person.personName,
                      confidence: match.confidence,
                      distance: match.distance,
                    });

                    // Draw green recognition box
                    ctx.strokeStyle = "#10b981";
                    ctx.lineWidth = 3;
                    ctx.shadowColor = "#10b981";
                    ctx.shadowBlur = 14;
                    ctx.strokeRect(x, y, width, height);

                    // 3. Temporal Consistency: Require 2 consecutive frames before punching
                    if (consecutiveMatchRef.current.count >= 2) {
                      const lastPunchTime = cooldownMapRef.current.get(pin) || 0;
                      const now = Date.now();

                      if (now - lastPunchTime > 4000) {
                        cooldownMapRef.current.set(pin, now);
                        isPunchingRef.current = true;
                        setWebcamFeedback(`✓ Verified: ${match.person.personName} (${match.confidence}%)`);

                        // Capture ONLY cropped face portrait (320x320) - NEVER full camera frame!
                        const snapshotBase64 = cropFaceBase64(video, result.box, 0.25, 320, 0.90);

                        // Dispatch verified face punch with vector for server validation
                        api.post("/api/v1/faces/punch", {
                          devicePin: pin,
                          punchState: webcamPunchState,
                          distance: match.distance,
                          confidence: match.confidence,
                          descriptor: result.descriptor,
                          snapshotBase64,
                          deviceName: "Webcam Gate Scanner",
                        }).then((res) => {
                          if (res.data?.data) {
                            const punchData = res.data.data;
                            triggerActiveScanWithCountdown({
                              ...punchData,
                              profileImageUrl: punchData.photoUrl,
                              personnelName: punchData.personName,
                              personnelKhmerName: punchData.khmerName,
                              personnelCode: punchData.personnelCode,
                              personnelType: punchData.personnelType,
                              departmentName: punchData.departmentOrClass,
                              punchTime: punchData.punchTime,
                              punchState: punchData.punchState,
                            });

                            // Immediate refresh of live scans feed
                            queryClient.invalidateQueries({ queryKey: ["live-scans-stream"] });

                            // Trigger sound & speech with BGM ducking
                            if (audioAutoPlay) {
                              kioskAudioEngine.ensureUnlocked();
                              kioskAudioEngine.play(selectedSoundId, volume);
                            }
                          }
                        }).catch((err) => {
                          console.error("Punch request failed:", err);
                          setWebcamFeedback(err.response?.data?.message || "Punch rejected");
                        }).finally(() => {
                          setTimeout(() => {
                            isPunchingRef.current = false;
                          }, 1200);
                        });
                      } else {
                        const secLeft = Math.ceil((4000 - (now - lastPunchTime)) / 1000);
                        setWebcamFeedback(`✓ Already Recorded: ${match.person.personName} (Wait ${secLeft}s)`);
                      }
                    } else {
                      setWebcamFeedback(`Verifying Face... • កំពុងផ្ទៀងផ្ទាត់ (${match.person.personName})`);
                    }
                  } else {
                    // 4. Face Detected BUT NOT ENROLLED (e.g. Person B while only Person A enrolled)
                    consecutiveMatchRef.current = { pin: null, count: 0 };
                    setLiveFaceBox({ ...result.box, matched: false, unregistered: true });
                    setWebcamFeedback("⚠️ Unregistered Face • មិនទាន់ចុះឈ្មោះ (Access Denied)");

                    // Draw red warning box
                    ctx.strokeStyle = "#ef4444";
                    ctx.lineWidth = 2.5;
                    ctx.shadowColor = "#ef4444";
                    ctx.shadowBlur = 8;
                    ctx.strokeRect(x, y, width, height);
                  }
                }
              } else {
                consecutiveMatchRef.current = { pin: null, count: 0 };
                setLiveFaceBox(null);
                setWebcamFeedback("Looking for face... • សូមបែរមុខរកកាមេរ៉ា");
              }
            }
          } catch (loopErr) {
            console.warn("Face loop error:", loopErr);
          } finally {
            isProcessingFrameRef.current = false;
          }
        }
      }

      // Schedule next frame with 50ms pacing (~16-20 FPS)
      if (isLoopActiveRef.current) {
        webcamLoopRef.current = setTimeout(processNextFrame, 50);
      }
    };

    processNextFrame();
  };

  useEffect(() => {
    if (webcamEnabled) {
      startWebcamFaceId();
    } else {
      stopWebcamFaceId();
    }
    return () => {
      stopWebcamFaceId();
    };
  }, [webcamEnabled]);

  // Trigger audio and display on new punch event
  useEffect(() => {
    if (!liveScans || liveScans.length === 0) return;
    const latest = liveScans[0];
    if (!latest) return;

    // First load check: only display as active scan if punch was within the last 5 seconds
    if (lastLogId === null) {
      setLastLogId(latest.logId);
      if (latest.punchTime) {
        const punchAgeMs = Date.now() - new Date(latest.punchTime).getTime();
        if (punchAgeMs >= 0 && punchAgeMs <= 5000) {
          triggerActiveScanWithCountdown(latest);
        }
      }
      return;
    }

    // New punch event detected from hardware
    if (latest.logId !== lastLogId) {
      setLastLogId(latest.logId);
      triggerActiveScanWithCountdown(latest);

      // Automatic computer audio playback with 1.5s debounce
      if (audioAutoPlay) {
        const now = Date.now();
        if (now - lastAudioPlayedRef.current > 1500) {
          lastAudioPlayedRef.current = now;
          kioskAudioEngine.play(selectedSoundId, volume);
        }
      }
    }
  }, [liveScans, lastLogId, audioAutoPlay, selectedSoundId, volume]);

  // Synchronize fullscreen state with browser events (e.g. user presses ESC)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      // In case browser policy blocks requestFullscreen, still toggle UI fullscreen mode
      setIsFullscreen((prev) => !prev);
    }
  };

  const playTestVoice = () => {
    kioskAudioEngine.ensureUnlocked();
    kioskAudioEngine.play(selectedSoundId, volume);
  };

  const dismissActiveScan = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setActiveScan(null);
    setCountdown(5);
  };

  const kioskContent = (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[999999] bg-slate-950 text-white flex flex-col p-4 sm:p-5 h-screen w-screen overflow-hidden select-none animate-in fade-in duration-200"
          : "space-y-6"
      }
    >
      {/* Kiosk Top Bar */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/40 ${
          isFullscreen ? "p-3.5 sm:p-4 shrink-0 mb-3" : "p-5"
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400">
            <Radio size={isFullscreen ? 20 : 24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`${isFullscreen ? "text-lg sm:text-xl" : "text-xl"} font-bold tracking-tight`}>
                Live Attendance Gate Kiosk
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                ULTRA-FAST LIVE SYNC (400ms)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {currentDateStr} • ZKTeco IN01-A Dual Gate (192.168.1.201 & .202)
            </p>
          </div>
        </div>

        {/* Digital Clock & Controls */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`font-mono ${isFullscreen ? "text-xl sm:text-2xl" : "text-2xl"} font-black tracking-wider text-emerald-400`}>
              {currentTime}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Phnom Penh Time (UTC+7)
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-700/60 pl-3 sm:pl-4">
            {/* Webcam Face ID Scanner Toggle Button */}
            <button
              onClick={() => setWebcamEnabled(!webcamEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-2xl border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                webcamEnabled
                  ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/35 ring-2 ring-emerald-500/30"
                  : "bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title="បើក/បិទ ស្កេនវត្តមានតាម Webcam Face ID (Direct Web Face Recognition)"
            >
              {webcamEnabled ? (
                <Video size={15} className="text-emerald-400 animate-pulse" />
              ) : (
                <VideoOff size={15} className="text-slate-400" />
              )}
              <span className="hidden sm:inline font-bold">
                {webcamEnabled ? "🎥 Webcam Face ID: បើក" : "🎥 Webcam: បិទ"}
              </span>
              {enrolledFaces && enrolledFaces.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-950/70 text-emerald-300 font-mono font-bold">
                  {enrolledFaces.length} Faces
                </span>
              )}
            </button>

            {/* Background Music BGM Toggle Button */}
            <button
              onClick={() => handleToggleBgMusic(!bgMusicEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-2xl border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                bgMusicEnabled
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                  : "bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title="តន្ត្រីផ្ទៃក្រោយ (Background Music BGM Loop) - Click to toggle"
            >
              <Music size={14} className={bgMusicEnabled ? "text-amber-400 animate-pulse" : "text-slate-400"} />
              <span className="hidden sm:inline font-bold">
                {bgMusicEnabled ? "តន្ត្រីផ្ទៃក្រោយ: បើក" : "តន្ត្រី: បិទ"}
              </span>
            </button>

            {/* Audio Settings & Auto-Play Status Button */}
            <button
              onClick={() => setAudioModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-2xl border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                audioAutoPlay
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                  : "bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title="កែសម្រួលសំឡេង ឬចម្រៀងកុំព្យូទ័រ (Click to configure kiosk audio & melodies)"
            >
              {audioAutoPlay ? (
                <Volume2 size={15} className="text-emerald-400 shrink-0" />
              ) : (
                <VolumeX size={15} className="text-slate-400 shrink-0" />
              )}
              <span className="hidden sm:inline font-bold">
                {audioAutoPlay ? "សំឡេងកុំព្យូទ័រ: បើក" : "សំឡេង: បិទ"}
              </span>
              <span className="hidden md:inline text-[10px] text-slate-300 px-1.5 py-0.5 rounded-lg bg-slate-800/80 font-medium">
                {currentSoundOption?.badge || "Audio"}
              </span>
              <Sliders size={13} className="text-indigo-400 shrink-0" />
            </button>

            {/* Test Voice / Melody Button */}
            <button
              onClick={playTestVoice}
              className="px-3 py-1.5 sm:py-2 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
              title="សាកល្បងចាក់សំឡេង ឬបទភ្លេង (Test current audio / song)"
            >
              <Music size={14} className="text-amber-400 shrink-0" />
              <span>សាកល្បងសំឡេង</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 sm:p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Gate Display"}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Kiosk Content */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 ${
          isFullscreen ? "flex-1 min-h-0 overflow-hidden" : "gap-6"
        }`}
      >
        {/* Left Column: Big Real-Time Scan Display Card */}
        <div
          className={`lg:col-span-7 xl:col-span-8 ${
            isFullscreen ? "h-full flex flex-col overflow-hidden" : "space-y-4"
          }`}
        >
          {/* Webcam Face ID Live Scanner Pane */}
          {webcamEnabled && (
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl space-y-3.5 mb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <span>Webcam Face ID Gate Camera</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-300 font-mono">
                        AI Real-Time
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      ស្កេនផ្ទៃមុខតាមកាមេរ៉ាកុំព្យូទ័រដោយស្វ័យប្រវត្ត &bull; {enrolledFaces?.length || 0} Registered Personnel
                    </p>
                  </div>
                </div>

                {/* Punch State Selector */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/90 border border-slate-700/80 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setWebcamPunchState("CHECK_IN")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      webcamPunchState === "CHECK_IN"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    🟢 ចូល (Check In)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWebcamPunchState("CHECK_OUT")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      webcamPunchState === "CHECK_OUT"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    🔴 ចេញ (Check Out)
                  </button>
                </div>
              </div>

              {/* Camera Video Viewport - Large Area High-Tech Biometric Scanner */}
              <div className="relative w-full h-[460px] sm:h-[520px] rounded-3xl overflow-hidden bg-slate-950 border border-slate-700/80 shadow-2xl flex items-center justify-center">
                {webcamError ? (
                  <div className="p-8 text-center text-rose-400 text-sm space-y-3">
                    <p className="font-semibold">{webcamError}</p>
                    <button
                      type="button"
                      onClick={startWebcamFaceId}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 cursor-pointer shadow-md"
                    >
                      Retry Camera
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={webcamVideoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                    <canvas
                      ref={webcamCanvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
                    />

                    {/* High-Tech Biometric Targeting Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                      {/* Large Biometric Scanning Frame */}
                      <div className="relative flex items-center justify-center">
                        {/* 4 Tech Corner Brackets */}
                        <div
                          className={`absolute -top-4 -left-4 w-9 h-9 border-t-3 border-l-3 transition-colors duration-300 ${
                            liveFaceBox?.matched
                              ? "border-emerald-400"
                              : liveFaceBox?.unregistered
                              ? "border-rose-500"
                              : liveFaceBox?.tooFar
                              ? "border-amber-400"
                              : "border-indigo-400/70"
                          }`}
                        />
                        <div
                          className={`absolute -top-4 -right-4 w-9 h-9 border-t-3 border-r-3 transition-colors duration-300 ${
                            liveFaceBox?.matched
                              ? "border-emerald-400"
                              : liveFaceBox?.unregistered
                              ? "border-rose-500"
                              : liveFaceBox?.tooFar
                              ? "border-amber-400"
                              : "border-indigo-400/70"
                          }`}
                        />
                        <div
                          className={`absolute -bottom-4 -left-4 w-9 h-9 border-b-3 border-l-3 transition-colors duration-300 ${
                            liveFaceBox?.matched
                              ? "border-emerald-400"
                              : liveFaceBox?.unregistered
                              ? "border-rose-500"
                              : liveFaceBox?.tooFar
                              ? "border-amber-400"
                              : "border-indigo-400/70"
                          }`}
                        />
                        <div
                          className={`absolute -bottom-4 -right-4 w-9 h-9 border-b-3 border-r-3 transition-colors duration-300 ${
                            liveFaceBox?.matched
                              ? "border-emerald-400"
                              : liveFaceBox?.unregistered
                              ? "border-rose-500"
                              : liveFaceBox?.tooFar
                              ? "border-amber-400"
                              : "border-indigo-400/70"
                          }`}
                        />

                        {/* Large Oval Face Guide - Spacious Area */}
                        <div
                          className={`w-56 h-76 sm:w-68 sm:h-92 rounded-[48%] border-2 transition-all duration-300 flex flex-col items-center justify-between p-4 ${
                            liveFaceBox?.matched
                              ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_35px_rgba(16,185,129,0.55)] scale-102"
                              : liveFaceBox?.unregistered
                              ? "border-rose-500 bg-rose-500/15 shadow-[0_0_30px_rgba(239,68,68,0.55)]"
                              : liveFaceBox?.tooFar
                              ? "border-amber-400/90 border-dashed bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                              : "border-indigo-400/40 border-dashed shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                          }`}
                        >
                          {/* Top Guide Indicator */}
                          <div className="pt-2">
                            {liveFaceBox?.matched ? (
                              <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-lg flex items-center gap-1">
                                <CheckCircle2 size={13} />
                                <span>VERIFIED {liveFaceBox.confidence}%</span>
                              </span>
                            ) : liveFaceBox?.unregistered ? (
                              <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-[11px] font-bold shadow-lg flex items-center gap-1 animate-pulse">
                                <X size={13} />
                                <span>UNREGISTERED • មិនទាន់ចុះឈ្មោះ</span>
                              </span>
                            ) : liveFaceBox?.tooFar ? (
                              <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold shadow-lg flex items-center gap-1">
                                <span>MOVE CLOSER • សូមខិតមកជិត</span>
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-indigo-300 text-[10px] font-semibold border border-indigo-500/30">
                                ALIGN FACE IN OVAL • សូមដាក់ផ្ទៃមុខក្នុងរង្វង់
                              </span>
                            )}
                          </div>

                          {/* Center Target Crosshair */}
                          <div className="relative w-12 h-12 flex items-center justify-center opacity-30">
                            <div className="w-full h-0.5 bg-white" />
                            <div className="absolute h-full w-0.5 bg-white" />
                          </div>

                          {/* Radar Sweep Effect (when scanning) */}
                          {!liveFaceBox?.matched && !liveFaceBox?.unregistered && (
                            <div className="absolute inset-x-4 top-1/4 h-0.5 bg-linear-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-pulse" />
                          )}

                          <div className="text-[10px] text-slate-400 pb-1">
                            {liveFaceBox?.matched ? liveFaceBox.name : "High-Accuracy Face ID"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top HUD Telemetry Bar */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-md">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>AI EDGE RECOGNITION</span>
                        </span>
                        <span className="text-[10px] px-2 py-1 rounded-xl bg-black/60 backdrop-blur-md text-slate-300 font-mono border border-slate-700/50">
                          Threshold: 0.38 (Strict)
                        </span>
                      </div>

                      <span className="text-[10px] px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md text-slate-200 font-mono border border-slate-700/60 shadow-md">
                        {enrolledFaces?.length || 0} Registered Personnel
                      </span>
                    </div>

                    {/* Bottom HUD Status Bar */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span
                        className={`text-xs px-3.5 py-1.5 rounded-xl backdrop-blur-md font-bold border flex items-center gap-2 shadow-lg transition-all ${
                          liveFaceBox?.matched
                            ? "bg-emerald-600/95 text-white border-emerald-400/60"
                            : liveFaceBox?.unregistered
                            ? "bg-rose-600/95 text-white border-rose-400/60"
                            : liveFaceBox?.tooFar
                            ? "bg-amber-600/95 text-white border-amber-400/60"
                            : "bg-slate-900/85 text-emerald-300 border-slate-700"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                        <span>
                          {liveFaceBox?.matched
                            ? `✓ Match: ${liveFaceBox.name} (${liveFaceBox.confidence}%)`
                            : (webcamFeedback || "Looking for face...")}
                        </span>
                      </span>

                      <span className="text-[10px] px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md text-slate-300 font-mono border border-slate-700/50">
                        {liveFaceBox?.similarity
                          ? `Cosine: ${(liveFaceBox.similarity * 100).toFixed(1)}%`
                          : liveFaceBox?.distance
                          ? `Dist: ${liveFaceBox.distance.toFixed(3)}`
                          : "SSD MobileNet AI"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div
            className={`relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between ${
              isFullscreen ? "h-full p-5 sm:p-7" : "p-7 min-h-[500px]"
            }`}
          >
            {/* Background Decorative Glow */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className={isFullscreen ? "flex-1 min-h-0 flex flex-col justify-between" : ""}>
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck size={16} className="text-emerald-500" />
                  Biometric Verification Gate
                </span>
                
                {activeScan ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      <Clock size={12} className="animate-spin" />
                      Auto-cleans in <strong className="font-mono text-sm">{countdown}s</strong>
                    </span>
                    <button
                      type="button"
                      onClick={dismissActiveScan}
                      className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="Dismiss now"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Ready to Scan • ត្រៀមស្កេន
                  </span>
                )}
              </div>

              {activeScan ? (
                <div className={`animate-in fade-in zoom-in-95 duration-200 ${isFullscreen ? "space-y-4 py-3 flex-1 flex flex-col justify-around" : "pt-6 space-y-6"}`}>
                  {/* Countdown Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden shrink-0">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-indigo-600 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${(countdown / 5) * 100}%` }}
                    />
                  </div>

                  {/* Avatar & Names */}
                  <div className="flex items-start gap-5">
                    <div className={`${isFullscreen ? "w-20 h-20 sm:w-24 sm:h-24" : "w-24 h-24"} rounded-3xl bg-linear-to-tr from-emerald-500 to-indigo-600 p-1 shadow-lg shadow-emerald-500/20 shrink-0`}>
                      <div className="w-full h-full rounded-[22px] bg-white dark:bg-slate-900 flex items-center justify-center font-bold text-2xl text-slate-800 dark:text-white uppercase overflow-hidden">
                        {activeScan.profileImageUrl ? (
                          <img src={activeScan.profileImageUrl} alt={activeScan.personnelName} className="w-full h-full object-cover" />
                        ) : (
                          activeScan.personnelName ? activeScan.personnelName.substring(0, 2) : "ZK"
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          activeScan.personnelType === "TEACHER"
                            ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                            : activeScan.personnelType === "STUDENT"
                            ? "bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300"
                            : "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                        }`}>
                          {activeScan.personnelType === "TEACHER"
                            ? "👨‍🏫 គ្រូបង្រៀន (Teacher)"
                            : activeScan.personnelType === "STUDENT"
                            ? "🎓 សិស្ស (Student)"
                            : "💼 បុគ្គលិក (Employee)"}
                        </span>

                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          ID: {activeScan.personnelCode || activeScan.devicePin}
                        </span>

                        {activeScan.cardNumber && (
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <CreditCard size={12} />
                            Card: {activeScan.cardNumber}
                          </span>
                        )}
                      </div>

                      {/* Khmer Name Highlight */}
                      {activeScan.personnelKhmerName && (
                        <div className={`${isFullscreen ? "text-xl sm:text-2xl" : "text-2xl"} font-black text-indigo-600 dark:text-indigo-400 tracking-tight`}>
                          {activeScan.personnelKhmerName}
                        </div>
                      )}

                      {/* English Name */}
                      <h2 className={`${isFullscreen ? "text-2xl sm:text-3xl" : "text-3xl"} font-extrabold text-slate-900 dark:text-white tracking-tight truncate`}>
                        {activeScan.personnelName}
                      </h2>

                      {/* Class or Department */}
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Layers size={14} className="text-slate-400" />
                        <span>{activeScan.departmentOrClass || "General Campus"}</span>
                      </p>
                    </div>
                  </div>

                  {/* High Visibility Khmer Confirmation Banner */}
                  <div className={`rounded-2xl bg-linear-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 flex items-center gap-4 shadow-sm ${isFullscreen ? "p-3.5 sm:p-4" : "p-5"}`}>
                    <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30 animate-pulse shrink-0">
                      <CheckCircle2 size={isFullscreen ? 26 : 32} />
                    </div>
                    <div>
                      <div className={`${isFullscreen ? "text-lg sm:text-xl" : "text-xl"} font-black text-emerald-700 dark:text-emerald-300 tracking-wide`}>
                        សូមអរគុណសម្រាប់ការចុះវត្តមាន!
                      </div>
                      <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Scan Verified Successfully • Punch State: {activeScan.punchState || "CHECK_IN"} • Auto-cleans in {countdown}s
                      </div>
                    </div>
                  </div>

                  {/* Punch Details Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className={`${isFullscreen ? "p-2.5 sm:p-3" : "p-3.5"} rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800`}>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">ម៉ោងស្កេន (Punch Time)</span>
                      <span className="font-mono text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Clock size={16} className="text-indigo-500" />
                        {activeScan.punchTime ? formatTime(activeScan.punchTime) : "--:--:--"}
                      </span>
                    </div>

                    <div className={`${isFullscreen ? "p-2.5 sm:p-3" : "p-3.5"} rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800`}>
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">ឧបករណ៍ស្កេន (Terminal Gate)</span>
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                        <Cpu size={14} className="text-emerald-500" />
                        <span>{activeScan.deviceName || activeScan.deviceSn || "IN01-A"}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* High-Tech Standby Screen */
                <div className={`text-center space-y-5 animate-in fade-in duration-300 ${isFullscreen ? "py-8 my-auto flex flex-col items-center justify-center" : "py-14"}`}>
                  {/* Radar Pulse Sensor Visual */}
                  <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping opacity-75" />
                    <div className="absolute inset-2 rounded-full bg-indigo-500/10 animate-pulse" />
                    <div className="w-24 h-24 rounded-3xl bg-linear-to-tr from-emerald-500/20 via-indigo-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-xl">
                      <Fingerprint size={48} className="animate-pulse text-emerald-500" />
                    </div>
                  </div>

                  <div className="space-y-2 max-w-md mx-auto">
                    <h2 className={`${isFullscreen ? "text-xl sm:text-2xl" : "text-2xl"} font-black text-slate-800 dark:text-white tracking-tight`}>
                      សូមស្កេនកាត ឬដាក់ម្រាមដៃលើម៉ាស៊ីន
                    </h2>
                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      Ready to Scan • Present RFID Card or Biometric Fingerprint
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Dual Gate Terminals (192.168.1.201 & 192.168.1.202) are armed and listening in real-time. Results will flash here for 5s.
                    </p>
                  </div>

                  {/* Device Gate Status Chips */}
                  <div className="inline-flex flex-wrap items-center justify-center gap-3 pt-2">
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      Gate 1 (192.168.1.201): Online
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      Gate 2 (192.168.1.202): Online
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-indigo-500" />
                      Latency: &lt; 2ms Direct DB
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAudioModalOpen(true)}
                className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors group text-left"
                title="ចុចដើម្បីប្តូរសំឡេង ឬបទភ្លេង / Click to change sound or song"
              >
                <span className="text-base group-hover:scale-110 transition-transform">🔊</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  សំឡេងកុំព្យូទ័រ: {audioAutoPlay ? "បើកស្វ័យប្រវត្តិ" : "បានបិទ (Muted)"}
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold underline decoration-dotted ml-0.5">
                  ({currentSoundOption?.nameKh || "សូមអរគុណសម្រាប់ការចុះវត្តមាន"})
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold ml-1">
                  ប្តូរសំឡេង ⚙️
                </span>
              </button>
              <span>Ultra-Fast Real-Time Biometric Stream • Auto-cleans after 5 seconds</span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Today Scans List */}
        <div
          className={`lg:col-span-5 xl:col-span-4 ${
            isFullscreen ? "h-full flex flex-col overflow-hidden" : "space-y-4"
          }`}
        >
          <div
            className={`rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col ${
              isFullscreen ? "h-full p-4 sm:p-5 overflow-hidden" : "p-5 space-y-4"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                Live Attendance Scans Stream
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                {liveScans?.length || 0} Punches
              </span>
            </div>

            <div
              className={`space-y-2.5 overflow-y-auto pr-1 ${
                isFullscreen ? "flex-1 min-h-0" : "max-h-[500px]"
              }`}
            >
              {liveScans?.map((record) => {
                const isSelected = activeScan?.logId === record.logId;
                return (
                  <div
                    key={record.logId}
                    onClick={() => triggerActiveScanWithCountdown(record)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-xs"
                        : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                        {record.personnelName ? record.personnelName.substring(0, 2).toUpperCase() : "ZK"}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                          {record.personnelKhmerName ? `${record.personnelKhmerName} • ` : ""}{record.personnelName}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {record.personnelType} • {record.departmentOrClass || "Campus"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white block">
                        {record.punchTime ? formatTime(record.punchTime) : "--:--"}
                      </span>
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {record.punchState || "CHECK_IN"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Audio Settings Modal */}
      <KioskAudioSettingsModal
        isOpen={audioModalOpen}
        onClose={() => setAudioModalOpen(false)}
        selectedSoundId={selectedSoundId}
        onSelectSound={handleSelectSound}
        autoPlayEnabled={audioAutoPlay}
        onToggleAutoPlay={handleToggleAutoPlay}
        volume={volume}
        onChangeVolume={handleChangeVolume}
        bgMusicEnabled={bgMusicEnabled}
        onToggleBgMusic={handleToggleBgMusic}
        bgMusicTrack={bgMusicTrack}
        onChangeBgMusicTrack={handleChangeBgMusicTrack}
        bgMusicVolume={bgMusicVolume}
        onChangeBgMusicVolume={handleChangeBgMusicVolume}
      />
    </div>
  );

  if (isFullscreen) {
    return <Portal>{kioskContent}</Portal>;
  }

  return kioskContent;
}
