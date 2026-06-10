import { publicAssetUrl } from "@/lib/publicAssetUrl";

const FALLBACK_POSTER = publicAssetUrl("educacion-inmersiva.jpeg");

/** Primer fotograma de un MP4 en Cloudinary como imagen de tarjeta. */
export function cloudinaryVideoPosterUrl(videoUrl: string): string {
  const raw = videoUrl.trim();
  if (!raw) return FALLBACK_POSTER;
  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.includes("cloudinary.com") || !parsed.pathname.includes("/video/")) {
      return FALLBACK_POSTER;
    }
    if (raw.includes("/upload/so_")) return raw.replace(/\.mp4(\?.*)?$/i, ".jpg$1");
    const withFrame = raw.replace("/upload/", "/upload/so_0/");
    return withFrame.replace(/\.mp4(\?.*)?$/i, ".jpg$1");
  } catch {
    return FALLBACK_POSTER;
  }
}
