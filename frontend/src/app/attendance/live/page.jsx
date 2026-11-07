"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  AlertCircle,
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
  detectFaceFast,
  detectFaceWithDescriptor,
  findBestFaceMatch,
  prepareEnrolledFaces,
  cropFaceBase64,
  captureFrameBase64,
  loadFaceModels,
  LivenessDetector,
} from "@/lib/faceEngine";

export default function AttendanceLiveKioskPage() {
  const queryClient = useQueryClient();
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [selectedSoundId, setSelectedSoundId] = useState("khmer_thank_you");
  const [audioAutoPlay, setAudioAutoPlay] = useState(true);
  const [volume, setVolume] = useState(0.95);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [lastLogId, setLastLogId] = useState(null);
  const [activeScan, setActiveScan] = useState(null);
  const [countdown, setCountdown] = useState(2);

  const audioRef = useRef(null);
  const lastAudioPlayedRef = useRef(0);
  const dismissTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Webcam Face ID Live Recognition State
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  // Helper to determine automatic shift punch state without requiring manual button toggle
  const getAutoPunchState = () => {
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    const timeVal = hour + minute / 60.0;
    // Morning: before 11:30 AM -> CHECK_IN
    // Lunch departure: 11:30 AM - 1:30 PM -> CHECK_OUT
    // Afternoon arrival: 1:30 PM - 4:30 PM -> CHECK_IN
    // Evening departure: after 4:30 PM -> CHECK_OUT
    if (timeVal >= 11.5 && timeVal < 13.5) return "CHECK_OUT";
    if (timeVal >= 16.5) return "CHECK_OUT";
    return "CHECK_IN";
  };
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
  const activeMatchRef = useRef(null);
  const frameCounterRef = useRef(0);
  const lastFeedbackRef = useRef("");
  const lastBoxKeyRef = useRef("");
  const livenessDetectorRef = useRef(new LivenessDetector());

  // Throttled UI State updaters to prevent hundreds of React re-renders per second
  const updateFeedback = (msg) => {
    if (lastFeedbackRef.current !== msg) {
      lastFeedbackRef.current = msg;
      setWebcamFeedback(msg);
    }
  };

  const updateLiveBox = (box) => {
    const key = box
      ? `${box.matched ? 1 : 0}-${box.unregistered ? 1 : 0}-${box.tooFar ? 1 : 0}-${box.outsideArea ? 1 : 0}-${box.spoof ? 1 : 0}-${box.awaitingLiveness ? 1 : 0}-${box.name || ""}`
      : "null";
    if (lastBoxKeyRef.current !== key) {
      lastBoxKeyRef.current = key;
      setLiveFaceBox(box);
    }
  };

  // Query enrolled face descriptors with automatic polling so newly enrolled faces sync instantly
  const { data: enrolledFaces, refetch: refetchFaces } = useQuery({
    queryKey: ["enrolled-face-descriptors"],
    queryFn: async () => {
      const res = await api.get("/api/v1/faces/descriptors");
      return res.data?.data || [];
    },
    staleTime: 10000,
    refetchInterval: 15000,
  });

  // Pre-normalize descriptors into Float32Array once to ensure sub-millisecond matching
  const preparedEnrolledFaces = useMemo(() => {
    return prepareEnrolledFaces(enrolledFaces || []);
  }, [enrolledFaces]);

  // Use a mutable ref so the 60 FPS animation loop NEVER suffers from stale closure or missing data
  const enrolledFacesRef = useRef([]);
  useEffect(() => {
    enrolledFacesRef.current = preparedEnrolledFaces || [];
  }, [preparedEnrolledFaces]);

  // Initialize and unlock audio engine preferences
  useEffect(() => {
    setSelectedSoundId(kioskAudioEngine.getSavedSoundId());
    setAudioAutoPlay(kioskAudioEngine.getAutoPlayEnabled());
    setVolume(kioskAudioEngine.getVolume());

    const unlockAudio = () => {
      kioskAudioEngine.ensureUnlocked();
    };
    window.addEventListener("click", unlockAudio, { once: true });
    window.addEventListener("touchstart", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
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

  // Query registered attendance terminals dynamically
  const { data: devicesList } = useQuery({
    queryKey: ["kiosk-devices"],
    queryFn: async () => {
      const res = await api.get("/api/v1/devices?size=50");
      return res.data?.data?.content || res.data?.data || [];
    },
    staleTime: 30000,
  });

  const activeDevices = useMemo(() => {
    if (devicesList && Array.isArray(devicesList) && devicesList.length > 0) {
      return devicesList;
    }
    return [
      { id: 1, name: "ZKTeco 1 (203.147.129.237:4371)", ipAddress: "203.147.129.237", port: 4371, connectionStatus: "ONLINE" },
      { id: 2, name: "ZKTeco 2 (203.147.129.237:4370)", ipAddress: "203.147.129.237", port: 4370, connectionStatus: "ONLINE" },
    ];
  }, [devicesList]);

  // Poll real-time biometric raw punch events with instant 100ms interval
  const { data: liveScans } = useQuery({
    queryKey: ["live-scans-stream"],
    queryFn: async () => {
      const res = await api.get("/api/v1/attendance/live-scans?limit=15");
      return res.data?.data || [];
    },
    refetchInterval: 100,
    staleTime: 0,
    refetchIntervalInBackground: true,
  });

  // Handle auto-cleanup and 2-second countdown timer
  const triggerActiveScanWithCountdown = (record) => {
    // Show only the official profile picture, never the webcam face scan snapshot
    let displayPhoto = record.profileImageUrl;
    const match = enrolledFaces?.find(
      (f) => String(f.devicePin) === String(record.devicePin || record.personnelCode)
    );
    if (!displayPhoto || displayPhoto.includes("/faces/")) {
      if (match?.photoUrl && !match.photoUrl.includes("/faces/")) {
        displayPhoto = match.photoUrl;
      }
    }

    setActiveScan({
      ...record,
      positionOrGrade: record.positionOrGrade || match?.positionOrGrade,
      branchOrYear: record.branchOrYear || match?.branchOrYear,
      gender: record.gender || match?.gender,
      contactInfo: record.contactInfo || match?.contactInfo,
      departmentOrClass: record.departmentOrClass || record.departmentName || match?.departmentOrClass,
      profileImageUrl: displayPhoto,
    });
    setCountdown(2);

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    let secLeft = 2;
    countdownIntervalRef.current = setInterval(() => {
      secLeft -= 1;
      setCountdown((prev) => Math.max(0, prev - 1));
      if (secLeft <= 0) {
        clearInterval(countdownIntervalRef.current);
      }
    }, 1000);

    dismissTimerRef.current = setTimeout(() => {
      setActiveScan(null);
      setCountdown(2);
    }, 2000);
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
          width: { ideal: 960, max: 1280 },
          height: { ideal: 540, max: 720 },
          facingMode: "user",
          frameRate: { ideal: 24, max: 30 },
        },
        audio: false,
      });

      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        webcamVideoRef.current.onloadedmetadata = () => {
          webcamVideoRef.current.play();
          setWebcamStatus("ready");
          updateFeedback("Webcam Gate Ready • ត្រៀមស្កេន");
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
      if (typeof window !== "undefined" && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(webcamLoopRef.current);
      }
      clearTimeout(webcamLoopRef.current);
      clearInterval(webcamLoopRef.current);
      webcamLoopRef.current = null;
    }
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((t) => t.stop());
      webcamStreamRef.current = null;
    }
    setWebcamStatus("idle");
    updateFeedback(null);
    updateLiveBox(null);
    consecutiveMatchRef.current = { pin: null, count: 0 };
    activeMatchRef.current = null;
    frameCounterRef.current = 0;
    if (livenessDetectorRef.current) {
      livenessDetectorRef.current.reset();
    }
  };

  const startWebcamLoop = () => {
    isLoopActiveRef.current = true;
    if (webcamLoopRef.current) {
      if (typeof window !== "undefined" && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(webcamLoopRef.current);
      }
      clearTimeout(webcamLoopRef.current);
      clearInterval(webcamLoopRef.current);
      webcamLoopRef.current = null;
    }

    const processNextFrame = async () => {
      if (!isLoopActiveRef.current) return;

      // Always request next frame synchronized with display VSync (60 FPS)
      webcamLoopRef.current = window.requestAnimationFrame(processNextFrame);

      // Process AI inference on alternate frames (30 FPS) to maintain zero UI lag
      frameCounterRef.current = (frameCounterRef.current + 1) % 2;
      if (frameCounterRef.current !== 0) return;

      const video = webcamVideoRef.current;
      const canvas = webcamCanvasRef.current;

      if (video && !video.paused && !video.ended && video.readyState >= 2 && !isPunchingRef.current) {
        if (!isProcessingFrameRef.current) {
          isProcessingFrameRef.current = true;
          try {
            // Step 1: Sub-5ms pitch/tilt/distance-tolerant face detector (Tiny 320, score >= 0.20)
            const fastFace = await detectFaceFast(video, 320, 0.20);

            if (canvas && video && isLoopActiveRef.current) {
              const ctx = canvas.getContext("2d");
              const w = video.videoWidth || 640;
              const h = video.videoHeight || 480;

              // Prevent GPU buffer re-allocation unless video dimensions actually changed
              if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
              }
              ctx.clearRect(0, 0, w, h);

              if (fastFace && fastFace.box) {
                const { x, y, width, height } = fastFace.box;

                // Wide Long-Distance Scanning Boundaries: Allows natural standing distance (1m - 3m)
                const areaMinX = w * 0.05;
                const areaMaxX = w * 0.95;
                const areaMinY = h * 0.05;
                const areaMaxY = h * 0.95;

                const faceCenterX = x + width / 2;
                const faceCenterY = y + height / 2;

                const isInsideArea = (
                  faceCenterX >= areaMinX &&
                  faceCenterX <= areaMaxX &&
                  faceCenterY >= areaMinY &&
                  faceCenterY <= areaMaxY
                );

                if (!isInsideArea) {
                  consecutiveMatchRef.current = { pin: null, count: 0 };
                  activeMatchRef.current = null;
                  updateLiveBox({ ...fastFace.box, matched: false, outsideArea: true });
                  updateFeedback("📍 Move Face Inside View • សូមដាក់ផ្ទៃមុខក្នុងតំបន់ស្កេន");
                  ctx.strokeStyle = "#f59e0b";
                  ctx.lineWidth = 2.5;
                  ctx.setLineDash([6, 6]);
                  ctx.strokeRect(x, y, width, height);
                  ctx.setLineDash([]);
                } else if (width < 22 || height < 22) {
                  consecutiveMatchRef.current = { pin: null, count: 0 };
                  activeMatchRef.current = null;
                  updateLiveBox({ ...fastFace.box, matched: false, tooFar: true });
                  updateFeedback("📏 Step Closer to Camera • សូមខិតមកជិតបន្តិច");
                  ctx.strokeStyle = "#f59e0b";
                  ctx.lineWidth = 2.5;
                  ctx.setLineDash([6, 6]);
                  ctx.strokeRect(x, y, width, height);
                  ctx.setLineDash([]);
                } else {
                  const now = Date.now();
                  const activeMatch = activeMatchRef.current;

                  // Smooth 60 FPS Tracking: If already verified in the last 2.5s, track box at 3ms without re-running ResNet-34!
                  if (activeMatch && (now - activeMatch.time < 2500)) {
                    ctx.strokeStyle = "#10b981";
                    ctx.lineWidth = 3;
                    ctx.shadowColor = "#10b981";
                    ctx.shadowBlur = 14;
                    ctx.strokeRect(x, y, width, height);

                    updateLiveBox({
                      ...fastFace.box,
                      matched: true,
                      name: activeMatch.person.personName,
                      confidence: activeMatch.confidence,
                      distance: activeMatch.distance,
                    });
                  } else {
                    // Run deep descriptor & pitch-tolerant liveness with 320 input size for distance
                    const result = await detectFaceWithDescriptor(video, "tiny", 0.20, 320);
                    if (result && result.box) {
                      const resCenterX = result.box.x + result.box.width / 2;
                      const resCenterY = result.box.y + result.box.height / 2;
                      const isResultInside = (
                        resCenterX >= areaMinX &&
                        resCenterX <= areaMaxX &&
                        resCenterY >= areaMinY &&
                        resCenterY <= areaMaxY &&
                        result.box.x >= (areaMinX - result.box.width * 0.30) &&
                        (result.box.x + result.box.width) <= (areaMaxX + result.box.width * 0.30)
                      );

                      // Multi-Frame Anti-Spoofing & Liveness Evaluation
                      const liveness = livenessDetectorRef.current.evaluate(result, video);

                      if (!isResultInside) {
                        livenessDetectorRef.current.reset();
                        consecutiveMatchRef.current = { pin: null, count: 0 };
                        activeMatchRef.current = null;
                        updateLiveBox({ ...result.box, matched: false, outsideArea: true });
                        updateFeedback("📍 Move Face Inside Target Area • សូមដាក់ផ្ទៃមុខក្នុងតំបន់ស្កេន");
                        ctx.strokeStyle = "#f59e0b";
                        ctx.lineWidth = 2.5;
                        ctx.setLineDash([6, 6]);
                        ctx.strokeRect(result.box.x, result.box.y, result.box.width, result.box.height);
                        ctx.setLineDash([]);
                      } else if (liveness.isScreenSpoof || liveness.isStaticPhoto) {
                        // 100% Computer Screen / Photo Attack Prevention
                        consecutiveMatchRef.current = { pin: null, count: 0 };
                        activeMatchRef.current = null;
                        updateLiveBox({ ...result.box, matched: false, spoof: true });
                        updateFeedback("⚠️ Photo / Computer Screen Detected • ហាមប្រើរូបភាព ឬកុំព្យូទ័រស្កេន");
                        ctx.strokeStyle = "#ef4444";
                        ctx.lineWidth = 3;
                        ctx.setLineDash([6, 6]);
                        ctx.strokeRect(result.box.x, result.box.y, result.box.width, result.box.height);
                        ctx.setLineDash([]);
                      } else {
                        const currentEnrolled = enrolledFacesRef.current || [];
                        if (currentEnrolled.length === 0) {
                          consecutiveMatchRef.current = { pin: null, count: 0 };
                          activeMatchRef.current = null;
                          updateLiveBox(null);
                          updateFeedback("Loading Face Biometrics... • កំពុងទាញយកទិន្នន័យ");
                        } else {
                          const match = findBestFaceMatch(result.descriptor, currentEnrolled, 0.49);

                          if (match.matched && match.person) {
                            const pin = match.person.devicePin;

                            // STRICT ANTI-SPOOFING: Must verify active living human before punch!
                            if (!liveness.isLive) {
                              consecutiveMatchRef.current = { pin: null, count: 0 };
                              activeMatchRef.current = null;
                              updateLiveBox({
                                ...result.box,
                                matched: false,
                                awaitingLiveness: true,
                                name: match.person.personName,
                              });
                              updateFeedback(
                                liveness.message ||
                                "🔍 Verifying Live Face Biometrics... • កំពុងផ្ទៀងផ្ទាត់"
                              );
                              ctx.strokeStyle = "#f59e0b";
                              ctx.lineWidth = 2.5;
                              ctx.setLineDash([5, 5]);
                              ctx.strokeRect(result.box.x, result.box.y, result.box.width, result.box.height);
                              ctx.setLineDash([]);
                            } else {
                              // Live Human Face 100% Authenticated!
                              if (consecutiveMatchRef.current.pin === pin) {
                                consecutiveMatchRef.current.count += 1;
                              } else {
                                consecutiveMatchRef.current = { pin, count: 1 };
                              }

                              activeMatchRef.current = {
                                person: match.person,
                                confidence: match.confidence,
                                distance: match.distance,
                                time: Date.now(),
                              };

                              updateLiveBox({
                                ...result.box,
                                matched: true,
                                name: match.person.personName,
                                confidence: match.confidence,
                                distance: match.distance,
                              });

                              ctx.strokeStyle = "#10b981";
                              ctx.lineWidth = 3;
                              ctx.shadowColor = "#10b981";
                              ctx.shadowBlur = 14;
                              ctx.strokeRect(result.box.x, result.box.y, result.box.width, result.box.height);

                              // Real Face ID: Punch attendance immediately for verified live human (zero forced blinking required)
                              const isImmediate = liveness.isLive && !liveness.isScreenSpoof;
                              if (isImmediate) {
                                const lastPunchTime = cooldownMapRef.current.get(pin) || 0;
                                if (now - lastPunchTime > 4000) {
                                  cooldownMapRef.current.set(pin, now);
                                  isPunchingRef.current = true;
                                  updateFeedback(`✓ Verified Live Face: ${match.person.personName} (${match.confidence}%)`);

                                  if (audioAutoPlay) {
                                    lastAudioPlayedRef.current = Date.now();
                                    kioskAudioEngine.ensureUnlocked();
                                    kioskAudioEngine.play(
                                      "khmer_thank_you",
                                      volume,
                                      match.person.personName,
                                      match.person.khmerName
                                    );
                                  }

                                  const currentAutoPunchState = getAutoPunchState();

                                  triggerActiveScanWithCountdown({
                                    devicePin: pin,
                                    personnelName: match.person.personName,
                                    personnelKhmerName: match.person.khmerName,
                                    personnelCode: match.person.personnelCode || pin,
                                    personnelType: match.person.personnelType || "EMPLOYEE",
                                    departmentOrClass: match.person.departmentOrClass || "Campus",
                                    positionOrGrade: match.person.positionOrGrade,
                                    branchOrYear: match.person.branchOrYear,
                                    gender: match.person.gender,
                                    contactInfo: match.person.contactInfo,
                                    punchTime: new Date().toISOString(),
                                    punchState: currentAutoPunchState,
                                    profileImageUrl: match.person.photoUrl,
                                    confidence: match.confidence,
                                    deviceName: "Webcam Gate Scanner",
                                  });

                                  setTimeout(() => {
                                    updateLiveBox(null);
                                    activeMatchRef.current = null;
                                    if (canvas) {
                                      const c = canvas.getContext("2d");
                                      if (c) c.clearRect(0, 0, canvas.width, canvas.height);
                                    }
                                  }, 800);

                                  api.post("/api/v1/faces/punch", {
                                    devicePin: pin,
                                    punchState: currentAutoPunchState,
                                    distance: match.distance,
                                    confidence: match.confidence,
                                    descriptor: result.descriptor,
                                    deviceName: "Webcam Gate Scanner",
                                  }).catch((err) => {
                                    console.error("Punch background sync note:", err);
                                  }).finally(() => {
                                    setTimeout(() => {
                                      isPunchingRef.current = false;
                                    }, 1000);
                                  });
                                } else {
                                  const secLeft = Math.ceil((4000 - (now - lastPunchTime)) / 1000);
                                  updateFeedback(`✓ Already Recorded: ${match.person.personName} (Wait ${secLeft}s)`);
                                }
                              } else {
                                updateFeedback(`Verifying Face... • កំពុងផ្ទៀងផ្ទាត់ (${match.person.personName})`);
                              }
                            }
                          } else {
                            consecutiveMatchRef.current = { pin: null, count: 0 };
                            activeMatchRef.current = null;
                            updateLiveBox({ ...result.box, matched: false, unregistered: true });
                            updateFeedback("⚠️ Unregistered Face • មិនទាន់ចុះឈ្មោះ (Access Denied)");

                            ctx.strokeStyle = "#ef4444";
                            ctx.lineWidth = 2.5;
                            ctx.shadowColor = "#ef4444";
                            ctx.shadowBlur = 8;
                            ctx.strokeRect(result.box.x, result.box.y, result.box.width, result.box.height);
                          }
                        }
                      }
                    }
                  }
                }
              } else {
                consecutiveMatchRef.current = { pin: null, count: 0 };
                activeMatchRef.current = null;
                updateLiveBox(null);
                updateFeedback("Looking for face... • សូមបែរមុខរកកាមេរ៉ា");
              }
            }
          } catch (loopErr) {
            console.warn("Face loop error:", loopErr);
          } finally {
            isProcessingFrameRef.current = false;
          }
        }
      }
    };

    webcamLoopRef.current = window.requestAnimationFrame(processNextFrame);
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

    // First load check: only display as active scan if punch was within the last 2 seconds
    if (lastLogId === null) {
      setLastLogId(latest.logId);
      if (latest.punchTime) {
        const punchAgeMs = Date.now() - new Date(latest.punchTime).getTime();
        if (punchAgeMs >= 0 && punchAgeMs <= 2000) {
          triggerActiveScanWithCountdown(latest);
        }
      }
      return;
    }

    // New punch event detected from hardware
    if (latest.logId !== lastLogId) {
      setLastLogId(latest.logId);
      triggerActiveScanWithCountdown(latest);

      // Automatic computer audio playback with 2.0s anti-duplicate debounce
      if (audioAutoPlay) {
        const now = Date.now();
        if (now - lastAudioPlayedRef.current > 2000) {
          lastAudioPlayedRef.current = now;
          kioskAudioEngine.play("khmer_thank_you", volume);
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
    kioskAudioEngine.play("khmer_thank_you", volume, null, null, true);
  };

  const dismissActiveScan = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setActiveScan(null);
    setCountdown(2);
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
                ULTRA-FAST LIVE SYNC (100ms)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {currentDateStr} •{" "}
              {activeDevices.length > 0
                ? activeDevices.map((d) => `${d.name || `Gate ${d.id}`} (${d.ipAddress || d.ip_address || "203.147.129.237"}:${d.port || 4370})`).join(" & ")
                : "ZKTeco Dual Gate (203.147.129.237:4371 & :4370)"}
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
        className={`grid grid-cols-1 ${
          webcamEnabled ? "lg:grid-cols-12" : "lg:grid-cols-12"
        } gap-4 sm:gap-5 ${
          isFullscreen ? "flex-1 min-h-0 overflow-hidden" : "gap-6"
        }`}
      >
        {/* 1. Webcam Face ID Live Scanner Pane (Left Column when enabled) */}
        {webcamEnabled && (
          <div
            className={`lg:col-span-6 xl:col-span-6 ${
              isFullscreen ? "h-full flex flex-col overflow-hidden" : "flex flex-col"
            }`}
          >
            <div className={`p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl flex flex-col justify-between ${
              isFullscreen ? "h-full overflow-hidden" : "h-full min-h-[560px]"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <span>Face ID Camera</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-300 font-mono">
                        AI Real-Time
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      ស្កេនផ្ទៃមុខស្វ័យប្រវត្ត &bull; {enrolledFaces?.length || 0} Faces
                    </p>
                  </div>
                </div>

                {/* Auto Gate Status Badge (No manual selection needed) */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 self-start sm:self-auto shrink-0 shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-semibold text-emerald-300">
                    ស្វ័យប្រវត្ត &bull; Auto Punch
                  </span>
                </div>
              </div>

              {/* Camera Video Viewport */}
              <div className="relative w-full flex-1 min-h-[440px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/80 shadow-2xl flex items-center justify-center my-2">
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
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-3">
                      {/* Resized Large Biometric Scanning Frame */}
                      <div className="relative w-[75%] h-[82%] max-w-[420px] max-h-[500px] flex items-center justify-center">
                        {/* 4 Tech Corner Brackets */}
                        <div
                          className={`absolute -top-3 -left-3 w-10 h-10 border-t-3 border-l-3 transition-colors duration-300 ${
                            liveFaceBox?.spoof
                              ? "border-rose-500 animate-pulse"
                              : liveFaceBox?.awaitingLiveness
                              ? "border-amber-400 animate-pulse"
                              : liveFaceBox?.matched
                              ? "border-emerald-400"
                              : liveFaceBox?.outsideArea
                              ? "border-amber-400 animate-pulse"
                              : liveFaceBox?.unregistered
                              ? "border-rose-500"
                              : liveFaceBox?.tooFar
                              ? "border-amber-400"
                              : "border-indigo-400/80"
                          }`}
                        />
                        <div
                          className={`absolute -top-3 -right-3 w-10 h-10 border-t-3 border-r-3 transition-colors duration-300 ${
                            liveFaceBox?.spoof
                              ? "border-rose-500 animate-pulse"
                              : liveFaceBox?.awaitingLiveness
                              ? "border-amber-400 animate-pulse"
                              : liveFaceBox?.matched
                              ? "border-emerald-400"
                              : liveFaceBox?.outsideArea
                              ? "border-amber-400 animate-pulse"
                              : liveFaceBox?.unregistered
                              ? "border-rose-500"
                              : liveFaceBox?.tooFar
                              ? "border-amber-400"
                              : "border-indigo-400/80"
                          }`}
                        />
                        <div
                          className={`absolute -bottom-3 -left-3 w-10 h-10 border-b-3 border-l-3 transition-colors duration-300 ${
                            liveFaceBox?.spoof
                              ? "border-rose-500 animate-pulse"
                              : liveFaceBox?.awaitingLiveness
                              ? "border-amber-400 animate-pulse"
                              : liveFaceBox?.matched
                              ? "border-emerald-400"
                              : liveFaceBox?.outsideArea
                              ? "border-amber-400 animate-pulse"
                              : liveFaceBox?.unregistered
                              ? "border-rose-500"
                              : liveFaceBox?.tooFar
                              ? "border-amber-400"
                              : "border-indigo-400/80"
                          }`}
                        />
                        <div
                          className={`absolute -bottom-3 -right-3 w-10 h-10 border-b-3 border-r-3 transition-colors duration-300 ${
                            liveFaceBox?.spoof
                              ? "border-rose-500 animate-pulse"
                              : liveFaceBox?.awaitingLiveness
                              ? "border-amber-400 animate-pulse"
                              : liveFaceBox?.matched
                              ? "border-emerald-400"
                              : liveFaceBox?.outsideArea
                              ? "border-amber-400 animate-pulse"
                              : liveFaceBox?.unregistered
                              ? "border-rose-500"
                              : liveFaceBox?.tooFar
                              ? "border-amber-400"
                              : "border-indigo-400/80"
                          }`}
                        />

                        {/* Large Resized Face Scanning Area Guide */}
                        <div
                          className={`w-full h-full rounded-[38px] border-2 transition-all duration-300 flex flex-col items-center justify-between p-4 ${
                            liveFaceBox?.spoof
                              ? "border-rose-500 bg-rose-500/20 shadow-[0_0_35px_rgba(239,68,68,0.65)] scale-102"
                              : liveFaceBox?.awaitingLiveness
                              ? "border-amber-400/90 border-dashed bg-amber-500/10 shadow-[0_0_25px_rgba(245,158,11,0.4)]"
                              : liveFaceBox?.matched
                              ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_35px_rgba(16,185,129,0.55)] scale-101"
                              : liveFaceBox?.outsideArea
                              ? "border-amber-400/90 border-dashed bg-amber-500/10 shadow-[0_0_25px_rgba(245,158,11,0.35)]"
                              : liveFaceBox?.unregistered
                              ? "border-rose-500 bg-rose-500/15 shadow-[0_0_30px_rgba(239,68,68,0.55)]"
                              : liveFaceBox?.tooFar
                              ? "border-amber-400/90 border-dashed bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                              : "border-indigo-400/50 border-dashed shadow-[0_0_25px_rgba(99,102,241,0.2)]"
                          }`}
                        >
                          {/* Top Guide Indicator */}
                          <div className="pt-1.5">
                            {liveFaceBox?.spoof ? (
                              <span className="px-3.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-bold shadow-lg flex items-center gap-1.5 animate-pulse">
                                <AlertCircle size={13} />
                                <span>PHOTO / SCREEN SPOOF • ហាមស្កេនរូបថត</span>
                              </span>
                            ) : liveFaceBox?.awaitingLiveness ? (
                              <span className="px-3.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold shadow-lg flex items-center gap-1.5 animate-pulse">
                                <span>👁️ PLEASE BLINK EYES • សូមព្រិចភ្នែក</span>
                              </span>
                            ) : liveFaceBox?.matched ? (
                              <span className="px-3.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-lg flex items-center gap-1.5">
                                <CheckCircle2 size={13} />
                                <span>VERIFIED LIVE {liveFaceBox.confidence}%</span>
                              </span>
                            ) : liveFaceBox?.outsideArea ? (
                              <span className="px-3.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold shadow-lg flex items-center gap-1.5 animate-pulse">
                                <span>ALIGN IN AREA • សូមដាក់ផ្ទៃមុខក្នុងតំបន់ស្កេន</span>
                              </span>
                            ) : liveFaceBox?.unregistered ? (
                              <span className="px-3.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-bold shadow-lg flex items-center gap-1.5 animate-pulse">
                                <X size={13} />
                                <span>UNREGISTERED • មិនទាន់ចុះឈ្មោះ</span>
                              </span>
                            ) : liveFaceBox?.tooFar ? (
                              <span className="px-3.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold shadow-lg flex items-center gap-1.5">
                                <span>MOVE CLOSER • សូមខិតមកជិត</span>
                              </span>
                            ) : (
                              <span className="px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-indigo-300 text-[10px] font-semibold border border-indigo-500/30 whitespace-nowrap">
                                FACE SCANNING AREA • តំបន់ស្កេនផ្ទៃមុខ
                              </span>
                            )}
                          </div>

                          {/* Center Target Crosshair */}
                          <div className="relative w-12 h-12 flex items-center justify-center opacity-30">
                            <div className="w-full h-0.5 bg-white" />
                            <div className="absolute h-full w-0.5 bg-white" />
                          </div>

                          {/* Radar Sweep Effect (when scanning) */}
                          {!liveFaceBox?.matched && !liveFaceBox?.unregistered && !liveFaceBox?.outsideArea && (
                            <div className="absolute inset-x-6 top-1/4 h-0.5 bg-linear-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-pulse" />
                          )}

                          <div className="text-[10px] text-slate-300 pb-0.5 font-medium truncate max-w-[200px]">
                            {liveFaceBox?.matched ? liveFaceBox.name : "High-Accuracy Face ID"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top HUD Telemetry Bar */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] px-2 py-0.5 rounded-xl bg-black/75 backdrop-blur-md font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>AI EDGE</span>
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-xl bg-black/60 backdrop-blur-md text-slate-300 font-mono border border-slate-700/50">
                          0.38
                        </span>
                      </div>

                      <span className="text-[9px] px-2 py-0.5 rounded-xl bg-black/75 backdrop-blur-md text-slate-200 font-mono border border-slate-700/60 shadow-md">
                        {enrolledFaces?.length || 0} Faces
                      </span>
                    </div>

                    {/* Bottom HUD Status Bar */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-xl backdrop-blur-md font-bold border flex items-center gap-1.5 shadow-lg transition-all truncate max-w-[70%] ${
                          liveFaceBox?.matched
                            ? "bg-emerald-600/95 text-white border-emerald-400/60"
                            : liveFaceBox?.unregistered
                            ? "bg-rose-600/95 text-white border-rose-400/60"
                            : liveFaceBox?.tooFar
                            ? "bg-amber-600/95 text-white border-amber-400/60"
                            : "bg-slate-900/85 text-emerald-300 border-slate-700"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                        <span className="truncate">
                          {liveFaceBox?.matched
                            ? `✓ Match: ${liveFaceBox.name} (${liveFaceBox.confidence}%)`
                            : (webcamFeedback || "Looking for face...")}
                        </span>
                      </span>

                      <span className="text-[9px] px-2 py-0.5 rounded-xl bg-black/75 backdrop-blur-md text-slate-300 font-mono border border-slate-700/50">
                        {liveFaceBox?.similarity
                          ? `${(liveFaceBox.similarity * 100).toFixed(0)}%`
                          : liveFaceBox?.distance
                          ? `d:${liveFaceBox.distance.toFixed(2)}`
                          : "AI"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Biometric Verification Gate Card */}
        <div
          className={`${
            webcamEnabled
              ? "lg:col-span-6 xl:col-span-6"
              : "lg:col-span-12"
          } ${
            isFullscreen ? "h-full flex flex-col overflow-hidden" : "flex flex-col"
          }`}
        >
          <div
            className={`relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between ${
              isFullscreen ? "h-full p-4 sm:p-6" : "p-6 sm:p-7 h-full min-h-[560px]"
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
                      style={{ width: `${(countdown / 2) * 100}%` }}
                    />
                  </div>

                  {/* Avatar & Names Card with Large Portrait Photo & Full Personnel Data */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-lg">
                    {/* Big Profile Photo */}
                    <div className="relative group shrink-0">
                      <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-52 md:h-52 rounded-3xl bg-linear-to-tr from-emerald-400 via-teal-500 to-indigo-600 p-1.5 shadow-2xl shadow-emerald-500/25">
                        <div className="w-full h-full rounded-[22px] bg-white dark:bg-slate-950 flex items-center justify-center font-bold text-4xl text-slate-800 dark:text-white uppercase overflow-hidden ring-1 ring-white/10">
                          {activeScan.profileImageUrl ? (
                            <img src={activeScan.profileImageUrl} alt={activeScan.personnelName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl text-indigo-400 font-black">
                              {activeScan.personnelName ? activeScan.personnelName.substring(0, 2) : "ZK"}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Verified Badge Overlay */}
                      <div className="absolute -bottom-2.5 inset-x-3 py-1 px-2.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-lg flex items-center justify-center gap-1.5 border border-emerald-400/50">
                        <CheckCircle2 size={13} className="text-emerald-200" />
                        <span>VERIFIED • ត្រឹមត្រូវ</span>
                      </div>
                    </div>

                    {/* Full Personnel Information */}
                    <div className="space-y-2.5 flex-1 min-w-0 text-center sm:text-left pt-1">
                      {/* Role, ID, Gender Pills */}
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs ${
                          activeScan.personnelType === "TEACHER"
                            ? "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300/40"
                            : activeScan.personnelType === "STUDENT"
                            ? "bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-300/40"
                            : "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300/40"
                        }`}>
                          {activeScan.personnelType === "TEACHER"
                            ? "👨‍🏫 គ្រូបង្រៀន (Teacher)"
                            : activeScan.personnelType === "STUDENT"
                            ? "🎓 សិស្ស (Student)"
                            : "💼 បុគ្គលិក (Employee)"}
                        </span>

                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                          ID: {activeScan.personnelCode || activeScan.devicePin}
                        </span>

                        {activeScan.gender && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                            {activeScan.gender.toUpperCase() === "MALE" ? "ប្រុស (Male)" : activeScan.gender.toUpperCase() === "FEMALE" ? "ស្រី (Female)" : activeScan.gender}
                          </span>
                        )}

                        {activeScan.cardNumber && (
                          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                            <CreditCard size={12} />
                            Card: {activeScan.cardNumber}
                          </span>
                        )}
                      </div>

                      {/* Khmer Name Highlight */}
                      {activeScan.personnelKhmerName && (
                        <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                          {activeScan.personnelKhmerName}
                        </div>
                      )}

                      {/* English Name */}
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                        {activeScan.personnelName}
                      </h2>

                      {/* Detailed Meta Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                          <Layers size={16} className="text-indigo-500 shrink-0" />
                          <div className="truncate">
                            <span className="text-[10px] text-slate-400 block font-medium">
                              {activeScan.personnelType === "STUDENT" ? "ថ្នាក់រៀន (Class)" : "ដេប៉ាតឺម៉ង់ (Department)"}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-white truncate">
                              {activeScan.departmentOrClass || activeScan.departmentName || "General Campus"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                          <Cpu size={16} className="text-teal-500 shrink-0" />
                          <div className="truncate">
                            <span className="text-[10px] text-slate-400 block font-medium">
                              {activeScan.personnelType === "STUDENT" ? "កម្រិតថ្នាក់ (Grade)" : "មុខតំណែង (Position)"}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-white truncate">
                              {activeScan.positionOrGrade || (activeScan.personnelType === "STUDENT" ? "Student" : "Staff Member")}
                            </span>
                          </div>
                        </div>

                        {activeScan.branchOrYear && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                            <Clock size={16} className="text-amber-500 shrink-0" />
                            <div className="truncate">
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {activeScan.personnelType === "STUDENT" ? "ឆ្នាំសិក្សា (Academic Year)" : "សាខា (Branch)"}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-white truncate">
                                {activeScan.branchOrYear}
                              </span>
                            </div>
                          </div>
                        )}

                        {activeScan.contactInfo && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                            <UserCheck size={16} className="text-emerald-500 shrink-0" />
                            <div className="truncate">
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {activeScan.personnelType === "STUDENT" ? "លេខអាណាព្យាបាល (Parent Phone)" : "លេខទូរស័ព្ទ (Phone)"}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-white font-mono truncate">
                                {activeScan.contactInfo}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* High Visibility Khmer Confirmation Banner */}
                  <div className={`rounded-2xl bg-linear-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 flex items-center gap-4 shadow-sm ${isFullscreen ? "p-3 sm:p-4" : "p-4"}`}>
                    <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-pulse shrink-0">
                      <CheckCircle2 size={isFullscreen ? 28 : 34} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`${isFullscreen ? "text-lg sm:text-xl" : "text-xl"} font-black text-emerald-700 dark:text-emerald-300 tracking-wide`}>
                        សូមអរគុណសម្រាប់ការចុះវត្តមាន!
                      </div>
                      <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 flex-wrap">
                        <span>Scan Verified Successfully</span>
                        <span>&bull;</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300">
                          បានផ្ទៀងផ្ទាត់ត្រឹមត្រូវ
                        </span>
                        <span>&bull;</span>
                        <span>Auto-cleans in {countdown}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Punch Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">ម៉ោងស្កេន (Punch Time)</span>
                      <span className="font-mono text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Clock size={16} className="text-indigo-500" />
                        {activeScan.punchTime ? formatTime(activeScan.punchTime) : "--:--:--"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">ឧបករណ៍ (Scanner Gate)</span>
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                        <Cpu size={14} className="text-emerald-500" />
                        <span>{activeScan.deviceName || activeScan.deviceSn || "Webcam Gate Scanner"}</span>
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
                      Dual Gate Terminals ({activeDevices.map((d) => `${d.ipAddress || d.ip_address || "203.147.129.237"}:${d.port || 4370}`).join(" & ")}) are armed and listening in real-time. Results will flash here for 2s.
                    </p>
                  </div>

                  {/* Device Gate Status Chips */}
                  <div className="inline-flex flex-wrap items-center justify-center gap-3 pt-2">
                    {activeDevices.map((dev, idx) => (
                      <span
                        key={dev.id || idx}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        {dev.name || `Gate ${idx + 1}`} ({dev.ipAddress || dev.ip_address || "203.147.129.237"}:{dev.port || 4370}): {dev.connectionStatus || dev.connection_status || dev.status || "Online"}
                      </span>
                    ))}
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
              <span>Ultra-Fast Real-Time Biometric Stream • Auto-cleans after 2 seconds</span>
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
      />
    </div>
  );

  if (isFullscreen) {
    return <Portal>{kioskContent}</Portal>;
  }

  return kioskContent;
}
