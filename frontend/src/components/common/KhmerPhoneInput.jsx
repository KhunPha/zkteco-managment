"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, AlertCircle, Phone } from "lucide-react";
import {
  cleanKhmerDigits,
  formatKhmerNational,
  getKhmerCarrier,
  isValidKhmerPhone,
} from "@/lib/phoneUtils";

export default function KhmerPhoneInput({
  value = "",
  onChange,
  placeholder = "12 345 678",
  required = false,
  disabled = false,
  compact = false,
  className = "",
  inputClassName = "",
  id,
  name,
}) {
  // Prefix can be "+855" (International) or "0" (Domestic)
  const [prefix, setPrefix] = useState("+855");
  const inputRef = useRef(null);

  // Sync prefix if value starts with 0
  useEffect(() => {
    if (value && typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.startsWith("0")) {
        setPrefix("0");
      } else if (trimmed.startsWith("+855") || trimmed.startsWith("855")) {
        setPrefix("+855");
      }
    }
  }, [value]);

  const clean = cleanKhmerDigits(value);
  const displayDigits = formatKhmerNational(clean);
  const carrier = getKhmerCarrier(clean);
  const isValid = isValidKhmerPhone(value);
  const hasInvalidPrefix = clean.length >= 2 && !carrier;

  const handleInputChange = (e) => {
    const raw = e.target.value;
    const digits = cleanKhmerDigits(raw);

    if (!digits) {
      if (onChange) onChange("");
      return;
    }

    const formattedNational = formatKhmerNational(digits);
    const fullValue = prefix === "+855"
      ? `+855 ${formattedNational}`
      : `0${formattedNational}`;

    if (onChange) onChange(fullValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Backspace") {
      const input = e.target;
      const { selectionStart, selectionEnd, value: currentVal } = input;
      // If cursor is right after a space, delete the character before the space
      if (selectionStart === selectionEnd && selectionStart > 0 && currentVal[selectionStart - 1] === " ") {
        e.preventDefault();
        const before = currentVal.slice(0, selectionStart - 2);
        const after = currentVal.slice(selectionStart);
        const newDigits = cleanKhmerDigits(before + after);
        const formatted = formatKhmerNational(newDigits);
        const fullValue = newDigits
          ? (prefix === "+855" ? `+855 ${formatted}` : `0${formatted}`)
          : "";
        if (onChange) onChange(fullValue);
      }
    }
  };

  const togglePrefix = () => {
    const nextPrefix = prefix === "+855" ? "0" : "+855";
    setPrefix(nextPrefix);
    if (clean) {
      const formatted = formatKhmerNational(clean);
      const fullValue = nextPrefix === "+855"
        ? `+855 ${formatted}`
        : `0${formatted}`;
      if (onChange) onChange(fullValue);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`flex items-center rounded-xl bg-slate-50 dark:bg-slate-800 border transition-all ${
          hasInvalidPrefix
            ? "border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20"
            : isValid
            ? "border-emerald-400 dark:border-emerald-500/80 focus-within:ring-2 focus-within:ring-emerald-400/20"
            : "border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {/* Country Flag & Prefix Pill Button */}
        <button
          type="button"
          onClick={togglePrefix}
          disabled={disabled}
          title="Click to toggle between +855 and 0 prefix"
          className={`flex items-center gap-1.5 shrink-0 px-2.5 ${
            compact ? "py-1.5 text-[11px]" : "py-2 text-xs"
          } font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/60 border-r border-slate-200 dark:border-slate-700 rounded-l-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer select-none`}
        >
          <span className="text-sm leading-none" role="img" aria-label="Cambodia Flag">
            🇰🇭
          </span>
          <span className="font-mono">{prefix}</span>
        </button>

        {/* Formatted Number Input */}
        <div className="relative flex-1 flex items-center min-w-0">
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="tel"
            inputMode="numeric"
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            value={displayDigits}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className={`w-full bg-transparent border-none ${
              compact ? "py-1.5 px-2.5 text-xs" : "py-2 px-3 text-sm"
            } font-mono font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 ${inputClassName}`}
          />

          {/* Right Indicator: Carrier badge or validation status */}
          <div className="shrink-0 pr-2.5 flex items-center gap-1.5 pointer-events-none select-none">
            {carrier && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border tracking-wide uppercase ${carrier.color}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${carrier.dot}`} />
                {carrier.name}
              </span>
            )}

            {hasInvalidPrefix && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                <AlertCircle size={10} />
                Non-Khmer
              </span>
            )}

            {isValid && (
              <span
                className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs"
                title="Valid Cambodian phone number"
              >
                <Check size={10} strokeWidth={3} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Helper text when typing */}
      {hasInvalidPrefix && (
        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertCircle size={11} className="shrink-0" />
          <span>Only Cambodian phone prefixes are allowed (e.g., 10, 12, 15, 70, 77, 88, 97, 23).</span>
        </p>
      )}
    </div>
  );
}

