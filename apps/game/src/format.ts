/** Number and date formatting for the HUD (locale-independent on purpose: stable screenshots and tests). */
import { BODIES, dateFromEt, type BodyId } from "@starshot/ephemeris";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const group = (n: number): string => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** "5 Nov 2026" (UTC). */
export function formatDate(et: number): string {
  const d = dateFromEt(et);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "2026-11-05" (UTC). */
export const isoDate = (et: number): string => dateFromEt(et).toISOString().slice(0, 10);

/** Distances: "1.2 M km", "0.58 M km", "48 M km", "37,000 km". */
export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return "-";
  const m = km / 1e6;
  if (m >= 100) return `${group(m)} M km`;
  if (m >= 10) return `${m.toFixed(0)} M km`;
  if (m >= 1) return `${m.toFixed(1)} M km`;
  if (m >= 0.1) return `${m.toFixed(2)} M km`;
  const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(km, 1))) - 1));
  return `${group(Math.round(km / p) * p)} km`;
}

export function formatDays(days: number): string {
  const d = Math.round(days);
  if (d >= 730) return `${group(d)} days (${(days / 365.25).toFixed(1)} yr)`;
  return `${d} ${d === 1 ? "day" : "days"}`;
}

export const formatSpeed = (kmS: number, digits = 2): string => `${kmS.toFixed(digits)} km/s`;

export const bodyName = (id: BodyId | string | undefined): string =>
  id && id in BODIES ? BODIES[id as BodyId].name : String(id ?? "");
