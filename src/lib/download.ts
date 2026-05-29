// Client-safe helper to turn a base64 payload (returned by a server fn that
// streamed a binary, e.g. invoices/{id}/download) into a browser download.
// Imports nothing server-only, so it is safe to use from route components.

export function downloadBase64(args: {
  base64: string;
  filename: string;
  contentType?: string;
}): void {
  const { base64, filename, contentType = "application/octet-stream" } = args;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
