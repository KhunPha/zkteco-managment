"use client";

import { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, X, Loader2, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

/**
 * Universal Drag-and-Drop Image Upload Component
 * Supports previewing existing image, dropping new images, clicking to browse,
 * and uploading to /api/v1/uploads/image.
 *
 * @param {string} value - Current image URL
 * @param {function} onChange - Callback function receiving new image URL or empty string
 * @param {string} label - Optional label text
 * @param {string} helperText - Optional helper text
 */
export default function ImageUploadDropzone({
  value,
  onChange,
  label = "Profile Photo (Drag & Drop)",
  helperText = "PNG, JPG, WEBP, or SVG up to 10MB",
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const uploadFile = async (file) => {
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file (PNG, JPG, WEBP, or SVG).");
      return;
    }

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image size exceeds 10MB limit.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/api/v1/uploads/image", formData);

      const url = res.data?.data?.url;
      if (url) {
        onChange(url);
      } else {
        throw new Error("No URL returned from server");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err.response?.data?.message || err.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      uploadFile(file);
      e.dataTransfer.clearData();
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      uploadFile(file);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="font-semibold text-slate-700 dark:text-slate-300 block text-xs">
          {label}
        </label>
      )}

      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group rounded-2xl border-2 border-dashed transition-all p-3.5 flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
          isDragging
            ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 scale-[1.01]"
            : value
            ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-400"
            : "border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-100/60 dark:hover:bg-slate-800/70"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />

        {value ? (
          <div className="w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                <img
                  src={value}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle2 size={13} />
                  <span>Image Uploaded</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                  {value}
                </p>
                <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium mt-0.5">
                  Click or drag new image to replace
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemove}
              className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="text-center py-2 space-y-1.5">
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Uploading image...
                </span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs group-hover:scale-110 transition-transform">
                  <UploadCloud size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Drag and drop image here
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {" "}or <strong className="text-indigo-600 dark:text-indigo-400 underline">browse</strong>
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {helperText}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {uploadError && (
        <p className="text-[11px] text-rose-500 font-medium">
          {uploadError}
        </p>
      )}
    </div>
  );
}

