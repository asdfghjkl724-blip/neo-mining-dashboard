# NEO Mining Dashboard

Interactive dashboards for exploring **real near-Earth objects (NEOs)** — composition, mining viability, and impact hazard — with orbital elements, MOID, diameters, and close-approach dates pulled **live from NASA/JPL's Small-Body Database and Close-Approach APIs**.

## Real data vs. modeled data

This dashboard draws a clear line between the two:

- **Real, straight from NASA/JPL** (via the SBDB + CAD APIs): object identity, orbit class, semi-major axis, eccentricity, inclination, perihelion/aphelion, period, Earth MOID, orbit condition code, diameter, albedo, absolute magnitude, spectral type, and the next Earth close-approach date/distance/velocity.
- **Modeled from those real inputs** (clearly flagged in the UI): composition class and volatile/metal percentages are inferred from the object's *real spectral type*; mining score and hazard level are computed from the *real* orbit, MOID, and diameter. These are estimates, not measurements — the banner at the top of each dashboard says so.

The 50 objects are all genuine catalogued NEOs (Apophis, Bennu, Ryugu, Eros, Didymos, Phaethon, Cruithne, plus metal-rich NEOs like 3554 Amun, 6178 1986 DA, 4660 Nereus, and others).

## How the live data works

JPL's APIs don't send CORS headers, so a browser can't call them directly. This repo includes a tiny **Cloudflare Worker** (`worker/jpl-proxy.js`) that relays JPL responses with the needed header, locked to your own origin. Once deployed (free, ~2 minutes), all three dashboards fetch real data on every load.

Until you deploy the Worker, the dashboards fall back to a bundled snapshot and clearly label it as such.

## Live demo files

| File | What it shows |
|---|---|
| [`docs/index.html`](docs/index.html) | Landing page — links to all three dashboards |
| [`docs/neo100-live-dashboard.html`](docs/neo100-live-dashboard.html) | Full dataset with 3D orrery, composition breakdown, weekly hazard re-evaluation, monthly mining re-evaluation |
| [`docs/neo-mining-scatter.html`](docs/neo-mining-scatter.html) | Candidate cards, full sortable table, and an accessibility-vs-composition bubble scatter plot |
| [`docs/neo-mining-radar-breakdown.html`](docs/neo-mining-radar-breakdown.html) | Candidate cards, full table, per-object radar profile, and stacked mining-score breakdown |

## Setup (one time, ~2 minutes, free)

**1. Deploy the CORS proxy Worker.**
```bash
npm install -g wrangler          # if you don't have it
cd worker
wrangler login                   # opens browser, free Cloudflare account
wrangler deploy                  # prints your Worker URL
```
Cloudflare prints a URL like `https://jpl-proxy.YOURNAME.workers.dev`.
(You can also paste `worker/jpl-proxy.js` into the Cloudflare dashboard's Worker editor instead of using the CLI.)

**2. Point the dashboards at your Worker.**
Edit `docs/neo-config.js` and set:
```js
window.PROXY_BASE = "https://jpl-proxy.YOURNAME.workers.dev";
```
Also confirm your GitHub Pages origin is in the Worker's `ALLOWED_ORIGINS` list (it's pre-filled with `https://asdfghjkl724-blip.github.io`).

**3. Commit and push.** GitHub Pages serves the updated files; every visitor now loads real JPL data.

**Editing the object list.** The 50 designations live in `docs/neo-config.js` (`NEO_DESIGNATIONS`). Add or swap any valid SBDB designation, number, or name.

## Quick start (before Worker setup)

Open any file in `docs/` directly in a browser. Until the Worker URL is set, the dashboards show the bundled snapshot and label it clearly; once configured, they fetch live JPL data on load.

## Using your own NASA API key

All three dashboards ship with NASA's public `DEMO_KEY`, which is shared across every user of the API and capped at **30 requests/hour**. For steadier use:

1. Get a free key at [api.nasa.gov](https://api.nasa.gov) (instant, no approval wait)
2. Open the HTML file in a text editor
3. Find the line:
   ```js
   const API_KEY='DEMO_KEY';
   ```
4. Replace `DEMO_KEY` with your key, keeping the quotes:
   ```js
   const API_KEY='your_key_here';
   ```
5. Save and reload in your browser

Your own key gives you **1,000 requests/day**.

## What's under the hood

- **Dataset**: 100 simulated + real-named NEOs with composition type (C/S/M/X), volatile inventory, metal content, orbital elements, and computed mass
- **Live data sources**:
  - [NASA CAD API](https://ssd-api.jpl.nasa.gov/doc/cad.html) — real close-approach ephemeris, matched by name where possible
  - [NASA NeoWs API](https://api.nasa.gov) — weekly hazard feed
- **Hazard re-evaluation**: runs weekly, flags any object whose hazard level changed since the last run
- **Mining score re-evaluation**: runs monthly, recalculates accessibility / composition value / size factor from updated ephemeris
- **Ephemeris confidence**: derived from JPL orbit condition codes (0 = best-determined, 9 = most uncertain), mapped to a 20–100 confidence score
- No build tools, no npm install — everything (Chart.js, Three.js, Tabler Icons) loads from CDN at runtime

## Repo structure

```
neo-mining-dashboard/
├── README.md
├── LICENSE
├── worker/
│   ├── jpl-proxy.js          # Cloudflare Worker: CORS proxy for JPL APIs
│   └── wrangler.toml         # one-command deploy config
└── docs/
    ├── index.html
    ├── neo-config.js         # ← set PROXY_BASE + the 50 designations here
    ├── neo-data.js           # live JPL loader (real → normalized schema)
    ├── neo-data-snapshot.js  # fallback snapshot (labeled) until Worker is set
    ├── neo100-live-dashboard.html
    ├── neo-mining-scatter.html
    └── neo-mining-radar-breakdown.html
```

The `docs/` folder is named that way so the repo can be served directly via **GitHub Pages** (Settings → Pages → Deploy from branch → `/docs`) with zero extra configuration. Once enabled, the base URL (`https://YOUR_USERNAME.github.io/neo-mining-dashboard/`) resolves to `index.html` and links out to all three dashboards.

## License

MIT — see [LICENSE](LICENSE).
