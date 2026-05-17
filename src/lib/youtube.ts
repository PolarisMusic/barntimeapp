// Extracts the 11-character YouTube video ID from any common URL shape:
// - https://www.youtube.com/watch?v=ID
// - https://youtu.be/ID
// - https://www.youtube.com/embed/ID
// - https://www.youtube.com/shorts/ID
const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Bare ID
  if (YT_ID_RE.test(trimmed)) return trimmed;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    return YT_ID_RE.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (parsed.pathname === "/watch") {
      const v = parsed.searchParams.get("v");
      return v && YT_ID_RE.test(v) ? v : null;
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    if ((parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "v") && parts[1]) {
      return YT_ID_RE.test(parts[1]) ? parts[1] : null;
    }
  }

  return null;
}

export function youTubeEmbedUrl(
  id: string,
  opts: { autoplay?: boolean; mute?: boolean; loop?: boolean } = {}
): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  if (opts.autoplay) params.set("autoplay", "1");
  if (opts.mute) params.set("mute", "1");
  if (opts.loop) {
    params.set("loop", "1");
    params.set("playlist", id);
  }
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

export function youTubeThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
