/**
 * jpl-proxy — a tiny Cloudflare Worker that lets your static dashboard
 * read NASA/JPL Small-Body APIs from the browser.
 *
 * WHY THIS EXISTS
 * The JPL SBDB/CAD APIs do not send CORS headers, so a browser fetch() from
 * your GitHub Pages site is blocked. This Worker fetches JPL server-side (no
 * CORS applies to server-to-server calls) and relays the response WITH the
 * Access-Control-Allow-Origin header the browser needs.
 *
 * It only proxies the two JPL hosts below and only allows your own origin,
 * so it can't be abused as an open proxy.
 *
 * DEPLOY (one time, free):
 *   1. Create a free account at https://dash.cloudflare.com
 *   2. Workers & Pages → Create → Worker → paste this file → Deploy
 *      (or use the CLI:  npm i -g wrangler && wrangler deploy)
 *   3. Note your Worker URL, e.g. https://jpl-proxy.YOURNAME.workers.dev
 *   4. Put that URL into PROXY_BASE in the dashboard config.
 *
 * USAGE FROM THE BROWSER
 *   GET https://jpl-proxy.YOURNAME.workers.dev/sbdb?sstr=99942
 *   GET https://jpl-proxy.YOURNAME.workers.dev/cad?des=99942&date-min=now&date-max=+36500
 */

// Only these origins may use the proxy. Add localhost for local testing.
const ALLOWED_ORIGINS = [
  "https://asdfghjkl724-blip.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

// Only these upstream API paths are allowed.
const UPSTREAM = {
  "/sbdb": "https://ssd-api.jpl.nasa.gov/sbdb.api",
  "/cad":  "https://ssd-api.jpl.nasa.gov/cad.api",
};

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Only GET allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const upstreamBase = UPSTREAM[url.pathname];
    if (!upstreamBase) {
      return new Response(
        JSON.stringify({ error: "Unknown path. Use /sbdb or /cad." }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
      );
    }

    // Forward the query string verbatim to JPL.
    const target = upstreamBase + url.search;

    try {
      const jpl = await fetch(target, {
        headers: { "User-Agent": "neo-mining-dashboard/1.0 (cloudflare-worker)" },
      });

      const body = await jpl.text();
      return new Response(body, {
        status: jpl.status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=21600",
          ...corsHeaders(origin),
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({
        error: "Upstream fetch failed",
        target: target,
        detail: String(err && err.message ? err.message : err),
      }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }
  },
};
