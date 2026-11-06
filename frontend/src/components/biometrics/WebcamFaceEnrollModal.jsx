"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Upload,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
import {
  loadFaceModels,
  detectFaceWithDescriptor,
  cropFaceBase64,
  captureFrameBase64,
  averageFaceDescriptors,
  findBestFaceMatch,
} from "@/lib/faceEngine";
import { kioskAudioEngine } from "@/lib/kioskAudioEngine";

export default function WebcamFaceEnrollModal({
  isOpen,
  onClose,
  person, // { id, code, name, khmerName, type: "EMPLOYEE"|"TEACHER"|"STUDENT", departmentOrClass, photoUrl }
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("webcam"); // "webcam" | "upload"
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceScore, setFaceScore] = useState(0);
  const [enrolling, setEnrolling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectIntervalRef = useRef(null);

  // Initialize models when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setEnrollSuccess(false);
    setErrorMessage(null);
    setFaceDetected(false);

    let isMounted = true;
    loadFaceModels().then((ok) => {
      if (isMounted) setModelsReady(ok);
    });

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen]);

  // Start webcam when tab is 'webcam' and models ready
  useEffect(() => {
    if (isOpen && activeTab === "webcam" && modelsReady && !cameraActive) {
      startCamera();
    } else if (activeTab !== "webcam") {
      stopCamera();
    }
  }, [isOpen, activeTab, modelsReady]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraActive(true);
          startDetectionLoop();
        };
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraError(
        "Cannot access webcam. Please ensure camera permissions are granted in browser settings."
      );
    }
  };

  const stopCamera = () => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setFaceDetected(false);
  };

  const startDetectionLoop = () => {
    if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);

    detectIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended)
        return;

      // Ultra-Fast Tiny Detector for smooth 30 FPS camera preview
      const result = await detectFaceWithDescriptor(videoRef.current, "tiny", 0.45);

      if (canvasRef.current && videoRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const w = videoRef.current.videoWidth || 640;
        const h = videoRef.current.videoHeight || 480;
        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);

        if (result && result.box) {
          setFaceDetected(true);
          setFaceScore(Math.round(result.score * 100));

          // Draw target tracking box with rounded corners & glow
          const { x, y, width, height } = result.box;
          ctx.strokeStyle = "#10b981"; // emerald-500
          ctx.lineWidth = 3;
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 10;
          ctx.strokeRect(x, y, width, height);

          // Draw corner highlights
          const cornerLen = 18;
          ctx.strokeStyle = "#34d399";
          ctx.lineWidth = 5;
          // Top-left
          ctx.beginPath();
          ctx.moveTo(x, y + cornerLen);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cornerLen, y);
          ctx.stroke();
          // Top-right
          ctx.beginPath();
          ctx.moveTo(x + width - cornerLen, y);
          ctx.lineTo(x + width, y);
          ctx.lineTo(x + width, y + cornerLen);
          ctx.stroke();
          // Bottom-left
          ctx.beginPath();
          ctx.moveTo(x, y + height - cornerLen);
          ctx.lineTo(x, y + height);
          ctx.lineTo(x + cornerLen, y + height);
          ctx.stroke();
          // Bottom-right
          ctx.beginPath();
          ctx.moveTo(x + width - cornerLen, y + height);
          ctx.lineTo(x + width, y + height);
          ctx.lineTo(x + width, y + height - cornerLen);
          ctx.stroke();
        } else {
          setFaceDetected(false);
          setFaceScore(0);
        }
      }
    }, 100);
  };

  const handleCaptureAndEnroll = async () => {
    if (!videoRef.current || !person) return;
    setEnrolling(true);
    setErrorMessage(null);

    try {
      // 1. High-Speed Multi-Sample Acquisition: 2 quick frames with Tiny detector
      const samples = [];
      let bestBox = null;
      for (let i = 0; i < 2; i++) {
        const det = await detectFaceWithDescriptor(videoRef.current, "tiny", 0.45);
        if (det && det.descriptor) {
          samples.push(det.descriptor);
          if (det.box) bestBox = det.box;
        }
        if (i < 1) await new Promise((r) => setTimeout(r, 60));
      }

      if (samples.length === 0) {
        throw new Error(
          "No clear face detected in the frame. Please look directly at the webcam."
        );
      }

      const finalDescriptor = averageFaceDescriptors(samples);

      // 2. Anti-Duplicate Face Protection: ensure this face is not already enrolled to another user!
      try {
        const descRes = await api.get("/api/v1/faces/descriptors");
        const existingList = descRes.data?.data || [];
        const currentPin = String(person.code || person.devicePin || person.id);
        const dupMatch = findBestFaceMatch(finalDescriptor, existingList, 0.35);
        if (dupMatch.matched && dupMatch.person && String(dupMatch.person.devicePin) !== currentPin) {
          throw new Error(
            `Duplicate face detected! This face is already enrolled to "${dupMatch.person.personName}" (PIN ${dupMatch.person.devicePin}). A face cannot be duplicated across multiple accounts.`
          );
        }
      } catch (dupErr) {
        if (dupErr.message && dupErr.message.includes("Duplicate face")) {
          throw dupErr;
        }
      }

      // 3. Crop ONLY the face area (clean square portrait 320x320) - NEVER full room/frame!
      const photoBase64 = cropFaceBase64(videoRef.current, bestBox, 0.25, 320, 0.92);

      // 4. Send enrollment payload to backend
      const payload = {
        devicePin: String(person.code || person.devicePin || person.id),
        personnelType: person.type || "EMPLOYEE",
        personnelId: person.id,
        employeeId: person.type !== "STUDENT" ? person.id : null,
        studentId: person.type === "STUDENT" ? person.id : null,
        personName: person.name,
        photoBase64,
        descriptor: finalDescriptor,
      };

      await api.post("/api/v1/faces/enroll", payload);

      setEnrollSuccess(true);
      kioskAudioEngine.ensureUnlocked();

      // Invalidate descriptors query cache so Live Kiosk scanner updates immediately
      queryClient.invalidateQueries({ queryKey: ["enrolled-face-descriptors"] });
      queryClient.invalidateQueries({ queryKey: ["device-users"] });

      setTimeout(() => {
        stopCamera();
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Enrollment failed:", err);
      setErrorMessage(
        err.response?.data?.message || err.message || "Failed to enroll face biometric"
      );
    } finally {
      setEnrolling(false);
    }
  };

  // Alternative: upload photo from local file
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !person) return;

    setEnrolling(true);
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const detection = await detectFaceWithDescriptor(img, "ssd", 0.5);
            if (!detection || !detection.descriptor) {
              setErrorMessage(
                "No face found in uploaded photo. Please select a clear portrait image."
              );
              setEnrolling(false);
              return;
            }

            // Anti-Duplicate Face Protection
            try {
              const descRes = await api.get("/api/v1/faces/descriptors");
              const existingList = descRes.data?.data || [];
              const currentPin = String(person.code || person.devicePin || person.id);
              const dupMatch = findBestFaceMatch(detection.descriptor, existingList, 0.35);
              if (dupMatch.matched && dupMatch.person && String(dupMatch.person.devicePin) !== currentPin) {
                setErrorMessage(
                  `Duplicate face detected! This face is already enrolled to "${dupMatch.person.personName}" (PIN ${dupMatch.person.devicePin}). A face cannot be duplicated across multiple accounts.`
                );
                setEnrolling(false);
                return;
              }
            } catch (dupErr) {
              if (dupErr.message && dupErr.message.includes("Duplicate face")) {
                setErrorMessage(dupErr.message);
                setEnrolling(false);
                return;
              }
            }

            // Crop ONLY the face area (clean square portrait 320x320)
            const photoBase64 = cropFaceBase64(img, detection.box, 0.25, 320, 0.92);

            const payload = {
              devicePin: String(person.code || person.devicePin || person.id),
              personnelType: person.type || "EMPLOYEE",
              personnelId: person.id,
              employeeId: person.type !== "STUDENT" ? person.id : null,
              studentId: person.type === "STUDENT" ? person.id : null,
              personName: person.name,
              photoBase64,
              descriptor: detection.descriptor,
            };

            await api.post("/api/v1/faces/enroll", payload);
            setEnrollSuccess(true);
            queryClient.invalidateQueries({ queryKey: ["enrolled-face-descriptors"] });
            queryClient.invalidateQueries({ queryKey: ["device-users"] });
            setTimeout(() => {
              if (onSuccess) onSuccess();
              onClose();
            }, 1200);
          } catch (error) {
            setErrorMessage(error.message);
          } finally {
            setEnrolling(false);
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setErrorMessage(err.message);
      setEnrolling(false);
    }
  };

  const handleDeleteFace = async () => {
    if (!person) return;
    if (!confirm(`Are you sure you want to delete the enrolled face for ${person.name}?`)) return;
    setDeleting(true);
    setErrorMessage(null);
    try {
      const pin = String(person.code || person.devicePin || person.id);
      await api.delete(`/api/v1/faces/${pin}`);
      queryClient.invalidateQueries({ queryKey: ["enrolled-face-descriptors"] });
      queryClient.invalidateQueries({ queryKey: ["device-users"] });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || "Failed to delete face");
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Camera size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>ចុះឈ្មោះ Face ID តាម Webcam</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                  AI 128-d
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enroll Face ID Biometrics directly into system without physical hardware
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Personnel Info Banner */}
        {person && (
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 overflow-hidden border border-slate-300 dark:border-slate-600">
                {person.photoUrl ? (
                  <img
                    src={person.photoUrl}
                    alt={person.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{(person.name || "U")[0]}</span>
                )}
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                  {person.khmerName ? `${person.khmerName} (${person.name})` : person.name}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Code: <b className="font-mono text-indigo-600">{person.code}</b> &bull;{" "}
                  {person.departmentOrClass || person.type}
                </span>
              </div>
            </div>

            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
              {person.type === "STUDENT" ? "🎓 Student" : person.type === "TEACHER" ? "👨‍🏫 Teacher" : "💼 Staff"}
            </span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="px-5 pt-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("webcam")}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "webcam"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Camera size={14} />
            <span>Webcam Live Capture</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "upload"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Upload size={14} />
            <span>Upload Photo from PC</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {enrollSuccess ? (
            <div className="p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 size={36} />
              </div>
              <h4 className="font-bold text-base text-emerald-800 dark:text-emerald-300">
                Face ID Enrolled Successfully!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                បានចុះឈ្មោះ Face ID ជោគជ័យ។ ឥឡូវនេះអាចស្កេនវត្តមានតាម Webcam បានភ្លាមៗ។
              </p>
            </div>
          ) : activeTab === "webcam" ? (
            <div className="space-y-3">
              {/* Webcam Viewport */}
              <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-inner flex items-center justify-center">
                {cameraError ? (
                  <div className="p-6 text-center text-rose-400 space-y-2">
                    <AlertCircle size={32} className="mx-auto" />
                    <p className="text-xs">{cameraError}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                    >
                      Retry Camera
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
                    />

                    {/* Oval Alignment Guide - Spacious Face Area */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div
                        className={`w-56 h-72 sm:w-64 sm:h-80 rounded-[48%] border-2 transition-all duration-300 ${
                          faceDetected
                            ? "border-emerald-400/90 shadow-[0_0_25px_rgba(16,185,129,0.45)] scale-102"
                            : "border-white/30 border-dashed shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        }`}
                      />
                    </div>

                    {/* HUD Status Pill */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold backdrop-blur-md flex items-center gap-1.5 ${
                          faceDetected
                            ? "bg-emerald-500/90 text-white shadow-md shadow-emerald-500/30"
                            : "bg-slate-900/80 text-slate-300"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            faceDetected ? "bg-white animate-pulse" : "bg-amber-400"
                          }`}
                        />
                        <span>{faceDetected ? `Face Detected (${faceScore}%)` : "Looking for face..."}</span>
                      </span>

                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/60 text-slate-300 font-mono backdrop-blur-md">
                        AI Biometrics
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Instructions */}
              <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                សូមតម្រង់ផ្ទៃមុខចំកណ្តាលកាមេរ៉ា ហើយចុច <b>"Capture & Enroll"</b> ដើម្បីរក្សាទុក
              </p>

              {/* Action Button */}
              <button
                type="button"
                disabled={enrolling || !faceDetected}
                onClick={handleCaptureAndEnroll}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {enrolling ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Processing Biometrics & Saving...</span>
                  </>
                ) : (
                  <>
                    <Camera size={16} />
                    <span>Capture & Enroll Face ID</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <Upload size={24} />
                </div>
                <div>
                  <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                    Click to select photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Upload a high-resolution front-facing portrait photo (JPG, PNG)
                  </p>
                </div>
              </div>

              {enrolling && (
                <div className="p-3 text-center text-xs text-indigo-600 font-semibold flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Analyzing face photo & generating 128-d descriptor...</span>
                </div>
              )}
            </div>
          )}

          {/* Delete Face Biometric Option if already enrolled */}
          {Boolean(person.faceEnrolled) && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={deleting || enrolling}
                onClick={handleDeleteFace}
                className="w-full py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Deleting Face Biometric...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete Face Biometric • លុបផ្ទៃមុខចេញពីប្រព័ន្ធ</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

