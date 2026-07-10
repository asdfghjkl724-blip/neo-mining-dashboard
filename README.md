# NEO Mining Dashboard

Interactive, standalone dashboards for exploring a 100-object Near-Earth Object (NEO) dataset — composition, mining viability, and impact hazard — with live ephemeris data pulled from NASA's public APIs.

Each dashboard is a **single self-contained HTML file**. No build step, no server, no dependencies to install. Open any file directly in a browser and it runs.

## Live demo files

| File | What it shows |
|---|---|
| [`docs/index.html`](docs/index.html) | Landing page — links to all three dashboards |
| [`docs/neo100-live-dashboard.html`](docs/neo100-live-dashboard.html) | Full dataset with 3D orrery, composition breakdown, weekly hazard re-evaluation, monthly mining re-evaluation |
| [`docs/neo-mining-scatter.html`](docs/neo-mining-scatter.html) | Candidate cards, full sortable table, and an accessibility-vs-composition bubble scatter plot |
| [`docs/neo-mining-radar-breakdown.html`](docs/neo-mining-radar-breakdown.html) | Candidate cards, full table, per-object radar profile, and stacked mining-score breakdown |

## Quick start

1. Clone or download this repo
2. Open any file in `docs/` directly in a browser — double-click, or `open docs/neo-mining-scatter.html` (macOS) / `start docs\neo-mining-scatter.html` (Windows)
3. That's it — each file fetches live NASA data on load

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
└── docs/
    ├── index.html
    ├── neo100-live-dashboard.html
    ├── neo-mining-scatter.html
    └── neo-mining-radar-breakdown.html
```

The `docs/` folder is named that way so the repo can be served directly via **GitHub Pages** (Settings → Pages → Deploy from branch → `/docs`) with zero extra configuration. Once enabled, the base URL (`https://YOUR_USERNAME.github.io/neo-mining-dashboard/`) resolves to `index.html` and links out to all three dashboards.

## License

MIT — see [LICENSE](LICENSE).
