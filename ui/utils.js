export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;"
  }[character]));
}

export function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat("en-US").format(number) : "—";
}

export function formatDate(value, options = {}) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", ...options }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function relativeTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const delta = date.getTime() - Date.now();
  const minutes = Math.round(delta / 60000);
  if (Math.abs(minutes) < 1) return "Just now";
  if (Math.abs(minutes) < 60) return `${Math.abs(minutes)}m ${minutes < 0 ? "ago" : "from now"}`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${Math.abs(hours)}h ${hours < 0 ? "ago" : "from now"}`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return `${Math.abs(days)}d ${days < 0 ? "ago" : "from now"}`;
  return formatDate(value);
}

export function initials(value, fallback = "M") {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return fallback;
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

export function titleCase(value) {
  return String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function statusTone(status) {
  if (["active", "completed", "approved", "success", "ready", "connected", "synced"].includes(status)) return "pill-teal";
  if (["awaiting_approval", "pending", "review"].includes(status)) return "pill-amber";
  if (["running", "queued"].includes(status)) return "pill-blue";
  if (["failed", "rejected", "error"].includes(status)) return "pill-red";
  if (["paused", "draft", "disconnected", "not_configured"].includes(status)) return "pill-muted";
  return "pill-blue";
}

export function statusLabel(status) {
  const labels = { awaiting_approval: "Awaiting review", pending: "Needs review", not_configured: "Not configured", synced: "Available", ready: "Ready", completed: "Completed" };
  if (labels[status]) return labels[status];
  return titleCase(status || "unknown");
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function jsonText(value) {
  if (value === null || value === undefined || value === "") return "No output yet.";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

export function isPendingRun(run) {
  return Boolean(run && ["queued", "running"].includes(run.status));
}

export function getErrorMessage(error, fallback = "The request could not be completed.") {
  return error?.message || fallback;
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
