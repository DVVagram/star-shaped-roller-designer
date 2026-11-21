import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildDesignUrl,
  copyText,
  saveDesignConfig,
  writeDesignUrl,
} from "@/lib/kit/design-link";

export type CopyStatus = "idle" | "copied" | "failed";

/**
 * Keeps the address bar and local storage in step with the live form. The URL
 * is updated after a short pause so typing does not churn history or clipboard
 * payloads on every keystroke.
 */
export function useDesignConfig(designId: string, data: unknown) {
  const serialized = JSON.stringify(data);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveDesignConfig(designId, data);
      writeDesignUrl(designId, data);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [designId, serialized]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const copyLink = useCallback(async () => {
    const url = buildDesignUrl(designId, data);
    writeDesignUrl(designId, data);
    const copied = await copyText(url);
    setCopyStatus(copied ? "copied" : "failed");
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopyStatus("idle"), 2200);
  }, [designId, serialized]); // eslint-disable-line react-hooks/exhaustive-deps

  return { copyStatus, copyLink };
}
