/**
 * Cambodian (Khmer) Phone Number Utilities
 * Standardized according to MPTC (Ministry of Post and Telecommunications of Cambodia).
 * Identifies mobile and landline carriers, validates prefixes, and auto-formats numbers.
 */

export const KHMER_CARRIERS = {
  Smart: {
    name: "Smart",
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
    prefixes: ["10", "15", "16", "69", "70", "81", "86", "87", "93", "96", "98"],
  },
  Cellcard: {
    name: "Cellcard",
    color: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
    prefixes: ["11", "12", "14", "17", "61", "76", "77", "78", "79", "85", "89", "92", "94", "95", "99"],
  },
  Metfone: {
    name: "Metfone",
    color: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800",
    dot: "bg-red-500",
    prefixes: ["31", "60", "66", "67", "68", "71", "88", "90", "97"],
  },
  Seatel: {
    name: "Seatel",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
    prefixes: ["18"],
  },
  CooTel: {
    name: "CooTel",
    color: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    dot: "bg-purple-500",
    prefixes: ["38"],
  },
  Landline: {
    name: "Landline",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
    dot: "bg-slate-500",
    prefixes: [
      "23", "24", "25", "26", "32", "33", "34", "35", "36",
      "42", "43", "44", "45", "52", "53", "54", "55",
      "62", "63", "64", "65", "72", "73", "74", "75"
    ],
  },
};

/**
 * Extract clean national digits (without +855 or domestic 0).
 * Maximum length is 9 digits (standard Cambodian national length).
 */
export function cleanKhmerDigits(val) {
  if (!val) return "";
  let digits = String(val).replace(/\D/g, "");
  // If string starts with 855 (country code), remove it
  if (digits.startsWith("855")) {
    digits = digits.slice(3);
  }
  // If domestic leading 0 is present, strip it
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 9);
}

/**
 * Detect carrier info given clean national digits
 */
export function getKhmerCarrier(digits) {
  if (!digits || digits.length < 2) return null;
  const prefix2 = digits.slice(0, 2);
  for (const carrier of Object.values(KHMER_CARRIERS)) {
    if (carrier.prefixes.includes(prefix2)) {
      return carrier;
    }
  }
  return null;
}

/**
 * Format national digits with grouping:
 * 1-2 digits: XX
 * 3-5 digits: XX XXX
 * 6-8 digits: XX XXX XXX
 * 9 digits:   XX XXX XXXX
 */
export function formatKhmerNational(digits) {
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

/**
 * Check if the number is a valid completed Khmer phone number
 */
export function isValidKhmerPhone(val) {
  const digits = cleanKhmerDigits(val);
  if (digits.length < 8 || digits.length > 9) return false;
  return getKhmerCarrier(digits) !== null;
}

/**
 * Format to standard international: +855 XX XXX XXX
 */
export function formatKhmerInternational(val) {
  const digits = cleanKhmerDigits(val);
  if (!digits) return "";
  return `+855 ${formatKhmerNational(digits)}`;
}

/**
 * Format to local domestic: 0XX XXX XXX
 */
export function formatKhmerLocal(val) {
  const digits = cleanKhmerDigits(val);
  if (!digits) return "";
  return `0${formatKhmerNational(digits)}`;
}

