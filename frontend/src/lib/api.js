import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export function formatApiError(detail) {
  if (detail == null) return "Une erreur est survenue. Veuillez réessayer.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const AXIS_STYLES = {
  "Cours de base": "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800",
  "Méthodologie": "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
  "Justice sociale": "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
  "Intervention sociale": "bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
  "Protection sociale": "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800",
  "Théories sociologiques": "bg-violet-500/10 text-violet-800 dark:text-violet-300 border-violet-300 dark:border-violet-800",
};

export function axisStyle(axis) {
  return AXIS_STYLES[axis] || "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700";
}

export const ROLE_LABELS = {
  admin: "Administrateur",
  enseignant: "Enseignant",
  etudiant: "Étudiant",
};
