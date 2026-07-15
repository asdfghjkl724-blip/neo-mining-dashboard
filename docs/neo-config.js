/**
 * Shared configuration for all three NEO dashboards.
 *
 * 1) Deploy the Cloudflare Worker in ../worker/ and paste its URL below.
 * 2) All dashboards fetch real JPL data live through that proxy.
 */

// ── Your deployed Cloudflare Worker URL (no trailing slash) ────────────────
// Example: "https://jpl-proxy.aiden.workers.dev"
// Until you set this, dashboards fall back to the bundled snapshot (neo-data-snapshot.js).
window.PROXY_BASE = "https://jpl-proxy.neo-mining.workers.dev";

// ── 50 real near-Earth objects (SBDB designations) ────────────────────────
// Variety across orbit classes (Aten/Apollo/Amor/Atira) and spectral types,
// including metal-rich / X-complex NEOs (3554 Amun, 6178 1986 DA, 4660 Nereus,
// 10302 1989 ML, 52768 1998 OR2). All are genuine catalogued objects.
window.NEO_DESIGNATIONS = [
  "99942","101955","162173","25143","65803","433","1566","1862","3200","4179",
  "1620","4769","4660","3554","6178","16960","1980","1685","2062","2100",
  "2340","3361","3362","5011","5590","7341","7482","7753","7822","8014",
  "8567","10115","10302","11066","35107","52768","53319","66391","68216","85770",
  "85989","137108","137126","138175","153591","163243","163693","175706","185851","3753"
];

// ── Composition model ──────────────────────────────────────────────────────
// JPL does not publish mining-relevant composition (volatile %, metal %) per
// object, so the dashboard MODELS these from the real spectral type returned by
// SBDB. These are clearly-labelled estimates, not measurements. Real orbital
// elements, MOID, diameter, albedo, and condition code always come from JPL.
window.SPEC_TO_COMP = {
  // Bus-DeMeo / Tholen letter  ->  dashboard composition class + typical profile
  C:{type:"C",vol:0.16,metal:0.05,note:"carbonaceous, volatile-rich"},
  B:{type:"C",vol:0.14,metal:0.05,note:"carbonaceous (B), primitive"},
  Cb:{type:"C",vol:0.15,metal:0.05,note:"carbonaceous transitional"},
  Cg:{type:"C",vol:0.15,metal:0.05,note:"carbonaceous"},
  P:{type:"C",vol:0.12,metal:0.06,note:"primitive, low-albedo"},
  D:{type:"C",vol:0.13,metal:0.05,note:"organic-rich, red"},
  S:{type:"S",vol:0.02,metal:0.10,note:"silicaceous, stony"},
  Sq:{type:"S",vol:0.02,metal:0.10,note:"stony (Sq)"},
  Sr:{type:"S",vol:0.02,metal:0.11,note:"stony (Sr)"},
  Sl:{type:"S",vol:0.02,metal:0.10,note:"stony (Sl)"},
  Sk:{type:"S",vol:0.02,metal:0.10,note:"stony (Sk)"},
  Sa:{type:"S",vol:0.02,metal:0.10,note:"stony (Sa)"},
  Q:{type:"S",vol:0.03,metal:0.12,note:"ordinary-chondrite-like (Q)"},
  V:{type:"S",vol:0.01,metal:0.08,note:"basaltic (V)"},
  K:{type:"S",vol:0.05,metal:0.09,note:"transitional (K)"},
  L:{type:"S",vol:0.04,metal:0.09,note:"transitional (L)"},
  A:{type:"S",vol:0.02,metal:0.12,note:"olivine-rich (A)"},
  M:{type:"M",vol:0.01,metal:0.65,note:"metallic, nickel-iron"},
  X:{type:"X",vol:0.04,metal:0.35,note:"X-complex, ambiguous"},
  Xe:{type:"M",vol:0.02,metal:0.55,note:"metal-rich (Xe)"},
  Xk:{type:"M",vol:0.03,metal:0.45,note:"metal-bearing (Xk)"},
  Xc:{type:"X",vol:0.05,metal:0.30,note:"X-complex (Xc)"},
  E:{type:"X",vol:0.01,metal:0.20,note:"enstatite (E), high-albedo"},
  T:{type:"X",vol:0.06,metal:0.25,note:"transitional (T)"},
  O:{type:"S",vol:0.03,metal:0.10,note:"unusual (O)"},
  R:{type:"S",vol:0.02,metal:0.10,note:"olivine-pyroxene (R)"},
  // Fallback when SBDB returns no spectral type
  "":{type:"X",vol:0.05,metal:0.20,note:"spectral type unknown — modeled default"},
};
