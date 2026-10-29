/**
 * GS PLAYER - Cloudflare Worker playlist fetcher.
 * Deploy this file as a Cloudflare Worker, then paste its HTTPS URL in GS PLAYER.
 * It fetches public M3U playlist text only; it does not proxy video streams.
 */
const ALLOWED_ORIGIN = "https://guibsilla-svg.github.io";
const MAX_BYTES = 10 * 1024 * 1024;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function reply(body, status, origin, extra = {}) {
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra
    }
  });
}

function isPrivateOrLocalHost(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") ||
      h.endsWith(".internal") || h === "metadata.google.internal") return true;
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80:")) return true;
  const parts = h.split(".");
  if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
    const n = parts.map(Number);
    if (n.some(x => x < 0 || x > 255)) return true;
    return n[0] === 10 || n[0] === 127 || n[0] === 0 ||
      (n[0] === 169 && n[1] === 254) ||
      (n[0] === 172 && n[1] >= 16 && n[1] <= 31) ||
      (n[0] === 192 && n[1] === 168);
  }
  return false;
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "GET") return reply("Method not allowed", 405, origin);
    if (origin && origin !== ALLOWED_ORIGIN) return reply("Origin not allowed", 403, origin);

    const requestUrl = new URL(request.url);
    const raw = requestUrl.searchParams.get("url");
    if (!raw) return reply("Missing url query parameter", 400, origin);

    let target;
    try {
      target = new URL(raw);
      if (!["http:", "https:"].includes(target.protocol) || target.username || target.password ||
          isPrivateOrLocalHost(target.hostname)) {
        return reply("Only public HTTP/HTTPS playlist URLs are allowed", 400, origin);
      }
    } catch {
      return reply("Invalid playlist URL", 400, origin);
    }

    try {
      const upstream = await fetch(target.toString(), {
        method: "GET",
        redirect: "follow",
        headers: {
          "Accept": "application/x-mpegURL, audio/mpegurl, text/plain, */*",
          "User-Agent": "GS-PLAYER-Playlist-Fetcher/1.0"
        },
        signal: AbortSignal.timeout(15000)
      });
      if (!upstream.ok) return reply("Playlist source returned HTTP " + upstream.status, 502, origin);
      const declaredLength = Number(upstream.headers.get("content-length") || 0);
      if (declaredLength > MAX_BYTES) return reply("Playlist is larger than 10 MB", 413, origin);
      const text = await upstream.text();
      if (new TextEncoder().encode(text).byteLength > MAX_BYTES) {
        return reply("Playlist is larger than 10 MB", 413, origin);
      }
      if (!/^\s*(?:\uFEFF)?#EXTM3U\b/m.test(text) && !/^\s*#EXTINF/m.test(text)) {
        return reply("Source did not return a recognizable M3U playlist", 422, origin);
      }
      return reply(text, 200, origin, { "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8" });
    } catch (error) {
      return reply("Could not fetch playlist source: " + (error && error.name === "TimeoutError" ? "timeout" : "network error"), 502, origin);
    }
  }
};
