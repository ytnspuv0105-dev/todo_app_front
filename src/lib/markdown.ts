/** Raster types we will turn into an <img>. SVG is excluded so markup cannot run. */
export const RASTER_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const RASTER_EXT = /\.(png|jpe?g|gif|webp)$/i;

export function isRasterImageFile(file: File): boolean {
  if (file.type) return RASTER_IMAGE_TYPES.has(file.type);
  return RASTER_EXT.test(file.name);
}

/** Local attachment reference stored in Markdown. Not a remote URL. */
export function attachmentSrc(id: number): string {
  return `attachment:${id}`;
}

export function attachmentIdFromSrc(src: string | undefined | null): number | null {
  if (!src) return null;
  const match = src.trim().match(/^attachment:(\d+)$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function imageMarkdown(filename: string, id: number): string {
  const alt = filename.replace(/[\[\]\\]/g, "").replace(/[\r\n]/g, " ").trim() || "画像";
  return `![${alt}](${attachmentSrc(id)})`;
}

/**
 * Allow http(s) and mailto only. javascript:, data:, and other schemes return null.
 */
export function safeLinkHref(href: string | undefined | null): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || /[\u0000-\u001F\u007F]/.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
    return url.href;
  }
  return null;
}

/** Used by the Markdown renderer. Images stay local; links cannot be script URLs. */
export function markdownUrlTransform(url: string, key: string): string {
  const trimmed = url.trim();
  if (key === "src") {
    return attachmentIdFromSrc(trimmed) != null ? trimmed : "";
  }
  return safeLinkHref(trimmed) ?? "";
}
