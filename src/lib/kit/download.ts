/** Triggers a text download in the browser. */
export function downloadText(text: string, fileName: string, mime = "text/plain"): void {
  downloadBytes(new TextEncoder().encode(text), fileName, `${mime};charset=utf-8`);
}

/** Triggers a binary download in the browser. */
export function downloadBytes(
  bytes: Uint8Array | ArrayBuffer,
  fileName: string,
  mime = "application/octet-stream",
): void {
  const part = bytes instanceof Uint8Array ? Uint8Array.from(bytes).buffer : bytes;
  const blob = new Blob([part], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
