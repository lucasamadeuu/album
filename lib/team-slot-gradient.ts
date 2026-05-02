import type { CSSProperties } from "react";

/** Tom mais neutro para páginas especiais (sem “seleção” clássica). */
function isNeutralAlbumPage(teamName: string): boolean {
  const k = teamName.trim().toLowerCase();
  return (
    k === "copa 2026" ||
    k.includes("host countries") ||
    k.includes("fifa museum") ||
    k.startsWith("official ") ||
    k.includes("panini")
  );
}

function hueFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

/**
 * Gradiente estável por nome da equipa/página — cada seleção ganha cor própria,
 * sem ser o mesmo verde para todos.
 */
export function teamSlotGradientStyle(teamName: string): CSSProperties {
  const key = teamName.trim() || "?";

  if (isNeutralAlbumPage(key)) {
    const base = 205 + (hueFromString(key) % 28);
    return {
      background: `linear-gradient(168deg, hsl(${base} 16% 32%), hsl(${(base + 14) % 360} 20% 23%))`,
    };
  }

  const h1 = hueFromString(key);
  const h2 = (h1 + 22 + (key.length % 9)) % 360;
  const s1 = 28 + (hueFromString(key + "a") % 12);
  const s2 = 32 + (hueFromString(key + "b") % 10);
  const l1 = 26 + (hueFromString(key + "c") % 7);
  const l2 = 17 + (hueFromString(key + "d") % 8);

  return {
    background: `linear-gradient(168deg, hsl(${h1} ${s1}% ${l1}%), hsl(${h2} ${s2}% ${l2}%))`,
  };
}
