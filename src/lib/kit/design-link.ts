/**
 * Versioned design links.
 *
 * A link carries the design id and the exact form state, so opening it restores
 * the same part instead of only the route. The payload lives in the normal query
 * string; the hash still selects the designer.
 */

export const DESIGN_CONFIG_VERSION = 1;
export const DESIGN_CONFIG_PARAM = "config";
const STORAGE_PREFIX = "pww:design:";

export interface DesignConfigEnvelope {
  version: number;
  id: string;
  data: unknown;
}

export type DesignConfigSource = "link" | "local";

export interface LoadedDesignConfig<T> {
  data: T;
  source: DesignConfigSource;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
      Math.ceil(value.length / 4) * 4,
      "=",
    );
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeDesignConfig(id: string, data: unknown): string {
  return toBase64Url(
    JSON.stringify({
      version: DESIGN_CONFIG_VERSION,
      id,
      data,
    } satisfies DesignConfigEnvelope),
  );
}

export function decodeDesignConfig(value: string): DesignConfigEnvelope | null {
  const json = fromBase64Url(value);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as Partial<DesignConfigEnvelope>;
    if (
      parsed.version !== DESIGN_CONFIG_VERSION ||
      typeof parsed.id !== "string" ||
      !parsed.id ||
      parsed.data === undefined
    ) {
      return null;
    }
    return parsed as DesignConfigEnvelope;
  } catch {
    return null;
  }
}

function localKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`;
}

/** Reads the link first, then that designer's last saved local state. */
export function loadDesignConfig<T>(
  id: string,
  decode: (raw: unknown) => T | null,
): LoadedDesignConfig<T> | null {
  if (typeof window === "undefined") return null;

  const encoded = new URLSearchParams(window.location.search).get(DESIGN_CONFIG_PARAM);
  if (encoded) {
    const envelope = decodeDesignConfig(encoded);
    if (envelope?.id === id) {
      const data = decode(envelope.data);
      if (data) return { data, source: "link" };
    }
  }

  try {
    const saved = window.localStorage.getItem(localKey(id));
    if (saved) {
      const envelope = decodeDesignConfig(saved);
      if (envelope?.id === id) {
        const data = decode(envelope.data);
        if (data) return { data, source: "local" };
      }
    }
  } catch {
    // Storage can be unavailable in private or restricted contexts.
  }
  return null;
}

export function saveDesignConfig(id: string, data: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(localKey(id), encodeDesignConfig(id, data));
  } catch {
    // A failed save must not interrupt designing.
  }
}

export function buildDesignUrl(id: string, data: unknown): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set(DESIGN_CONFIG_PARAM, encodeDesignConfig(id, data));
  return url.toString();
}

/** Updates the address bar without adding a history entry or firing routing. */
export function writeDesignUrl(id: string, data: unknown): string {
  const url = buildDesignUrl(id, data);
  if (typeof window === "undefined" || !url) return url;
  window.history.replaceState(window.history.state, "", url);
  return url;
}

/** Clipboard first, then a hidden textarea for browsers that block the API. */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise((_, reject) => setTimeout(() => reject(new Error("clipboard timeout")), 1200)),
      ]);
      return true;
    } catch {
      // Fall through to the legacy path.
    }
  }
  if (typeof document === "undefined") return false;
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

/** Shared object guard used by every per-designer decoder. */
export function isConfigRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
