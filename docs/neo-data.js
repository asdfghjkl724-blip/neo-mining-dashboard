/**
 * neo-data.js — live JPL data loader shared by all three dashboards.
 *
 * Fetches real orbital + physical data for every designation in
 * window.NEO_DESIGNATIONS through the Cloudflare Worker proxy (window.PROXY_BASE),
 * then normalises each object into the schema the dashboards expect.
 *
 * Real, straight from JPL:  a, e, i, q, aphelion, period, MOID, condition_code,
 *                           diameter, albedo, H, spectral type, next approach.
 * Modeled (clearly flagged): composition class + volatile/metal %, mining score,
 *                            hazard level — derived from the real spectral type
 *                            and real orbit. `modeled:true` marks these fields.
 */

(function () {
  const LD_PER_AU = 389.17;

  function proxyReady() {
    return window.PROXY_BASE && !/CHANGE-ME/.test(window.PROXY_BASE);
  }

  async function fetchJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  function el(elements, name) {
    if (!elements) return null;
    for (const e of elements) if (e.name === name) {
      const v = parseFloat(e.value);
      return isNaN(v) ? null : v;
    }
    return null;
  }
  function phys(list, name) {
    if (!list) return null;
    for (const p of list) if (p.name === name) return p.value;
    return null;
  }

  function ccToEphem(cc) {
    if (cc === null || cc === undefined || cc === "") return 20;
    const n = Math.min(parseInt(cc, 10), 9);
    if (isNaN(n)) return 20;
    return 20 + Math.round((9 - n) / 9 * 80);
  }

  function specToComp(specB, specT) {
    const key = (specB || specT || "").trim();
    const map = window.SPEC_TO_COMP || {};
    if (map[key]) return { key, ...map[key] };
    // try first letter
    const first = key.charAt(0);
    if (map[first]) return { key, ...map[first] };
    return { key: key || "", ...map[""] };
  }

  // Modeled mining score from REAL orbit + diameter + modeled composition.
  function miningModel(o) {
    const moid = o.moid_au ?? 0.2;
    const speed = o.v_rel_kms ?? 12;
    const period = o.period_yr ?? 2;
    let acc = 100 - moid * 150 - speed * 1.3 - period * 3;
    acc = Math.round(Math.min(100, Math.max(5, acc)) * 10) / 10;

    const comp = o._comp;
    // composition value: metals dominate M/X value, volatiles dominate C value
    let cv = 40 + comp.metal * 70 + comp.vol * 120;
    cv = Math.round(Math.min(100, cv) * 10) / 10;

    const d = o.diameter_km ?? 0.3;
    const size = Math.round(Math.min(100, Math.max(5, (Math.log10(d * 1000) / 4) * 100)) * 10) / 10;

    const score = Math.round((acc * 0.40 + cv * 0.35 + size * 0.25) * 10) / 10;
    let tier;
    if (score >= 75) tier = "Prime target";
    else if (score >= 60) tier = "High potential";
    else if (score >= 45) tier = "Moderate potential";
    else if (score >= 30) tier = "Low potential";
    else tier = "Poor candidate";
    return { accessibility: acc, comp_value: cv, size_factor: size, mining_score: score, mining_tier: tier };
  }

  // Modeled hazard 0–4 from REAL MOID + PHA flag + diameter.
  function hazardModel(o) {
    const moidLD = (o.moid_au ?? 1) * LD_PER_AU;
    const d = o.diameter_km ?? 0.1;
    let h = 0;
    if (o.pha) h = 2;
    if (moidLD < 20) h = Math.max(h, 2);
    if (moidLD < 10) h = Math.max(h, 3);
    if (moidLD < 4 && d > 0.14) h = 4;
    if (moidLD < 1) h = 4;
    return h;
  }

  function normalize(sb, cad) {
    const orbit = sb.orbit || {};
    const obj = sb.object || {};
    const els = orbit.elements || [];
    const pl = sb.phys_par || [];

    const diameter_km = (() => { const v = parseFloat(phys(pl, "diameter")); return isNaN(v) ? null : v; })();
    const albedo = (() => { const v = parseFloat(phys(pl, "albedo")); return isNaN(v) ? null : v; })();
    const period_d = el(els, "per");

    const rec = {
      des: obj.des,
      name: obj.shortname || obj.fullname || obj.des,
      fullname: obj.fullname,
      neo: obj.neo, pha: obj.pha,
      orbit_class: (obj.orbit_class || {}).name || null,
      // REAL orbital elements
      a_au: el(els, "a"), e: el(els, "e"), i_deg: el(els, "i"),
      q_au: el(els, "q"), ad_au: el(els, "ad"),
      period_d, period_yr: period_d ? Math.round(period_d / 365.25 * 1000) / 1000 : null,
      moid_au: orbit.moid ? parseFloat(orbit.moid) : null,
      condition_code: orbit.condition_code ?? null,
      n_obs_used: orbit.n_obs_used ?? null,
      // REAL physical
      diameter_km, diameter_m: diameter_km ? Math.round(diameter_km * 1000) : null,
      albedo, H_mag: (() => { const v = parseFloat(phys(pl, "H")); return isNaN(v) ? null : v; })(),
      spec_B: phys(pl, "spec_B"), spec_T: phys(pl, "spec_T"),
      // REAL next approach (from CAD)
      next_approach: cad || null,
      v_rel_kms: cad ? cad.v_rel_kms : null,
      approach_date: cad ? cad.date : null,
      approach_dist_ld: cad ? cad.dist_ld : null,
    };

    rec.moid_ld = rec.moid_au != null ? Math.round(rec.moid_au * LD_PER_AU * 100) / 100 : null;
    rec.ephem_score = ccToEphem(rec.condition_code);

    // Modeled composition from REAL spectral type
    const comp = specToComp(rec.spec_B, rec.spec_T);
    rec._comp = comp;
    rec.comp_type = comp.type;
    rec.comp_desc = comp.note + (comp.key ? " (spec " + comp.key + ")" : " (spectral type unknown)");
    rec.volatiles = { water_ice_pct: Math.round(comp.vol * 1000) / 10 };
    rec.metals = { iron_nickel_pct: Math.round(comp.metal * 1000) / 10 };
    rec.modeled_composition = true;

    // Mass from real diameter + density implied by class (modeled)
    const density = comp.type === "M" ? 5.3 : comp.type === "C" ? 1.6 : comp.type === "X" ? 3.0 : 2.6;
    rec.density_gcm3 = density;
    if (rec.diameter_m) {
      const r = rec.diameter_m / 2;
      rec.mass_kg = Math.round((4 / 3) * Math.PI * r * r * r * density * 1000);
    } else {
      // No published diameter: estimate from absolute magnitude H + albedo
      // D(km) = 1329 / sqrt(albedo) * 10^(-H/5)
      const H = rec.H_mag, alb = rec.albedo || 0.14;
      if (H != null) {
        const dkm = 1329 / Math.sqrt(alb) * Math.pow(10, -H / 5);
        rec.diameter_km = Math.round(dkm * 1000) / 1000;
        rec.diameter_m = Math.round(dkm * 1000);
        const r = rec.diameter_m / 2;
        rec.mass_kg = Math.round((4 / 3) * Math.PI * r * r * r * density * 1000);
        rec.diameter_estimated = true;
      } else {
        rec.mass_kg = 0;
      }
    }

    // Modeled mining + hazard from REAL inputs
    Object.assign(rec, miningModel(rec));
    rec.hazard = hazardModel(rec);
    rec.modeled_scores = true;

    // ── Fields the dashboards call .toFixed() / arithmetic on must never be
    // null. Objects with no close approach in the search window get safe
    // defaults, and speed falls back to heliocentric orbital velocity. ──
    if (rec.v_rel_kms == null) {
      // mean orbital speed (vis-viva at a): v = sqrt(GM_sun/a), a in AU -> km/s
      rec.v_rel_kms = rec.a_au ? Math.round(29.78 / Math.sqrt(rec.a_au) * 100) / 100 : 0;
    }
    rec.speed_kms = rec.v_rel_kms;
    if (rec.approach_dist_ld == null) rec.approach_dist_ld = (rec.moid_au != null ? Math.round(rec.moid_au * LD_PER_AU * 100) / 100 : 0);
    if (!rec.approach_date) rec.approach_date = "—";
    if (rec.mass_kg == null) rec.mass_kg = 0;

    // ── Legacy aliases: the three dashboards' render/orrery/table/eval code
    // was written against the original synthetic field names. Provide those
    // names too so the live objects render without touching dashboard code. ──
    rec.id = rec.des;
    rec.diam_m = rec.diameter_m;
    rec.diam_km = rec.diameter_km;
    rec.orb_class = rec.orbit_class;
    rec.sim_approach_date = rec.approach_date;
    rec.sim_approach_dist_ld = rec.approach_dist_ld;
    rec.approach_dist_km = (rec.approach_dist_ld != null)
      ? Math.round(rec.approach_dist_ld * 384400) : 0;   // LD -> km
    rec.api_matched = (rec.approach_date && rec.approach_date !== "—");
    rec.pha_api = rec.pha;
    // orbital elements the orrery reads
    rec.a = rec.a_au; rec.ecc = rec.e; rec.inc = rec.i_deg;
    rec.q = rec.q_au; rec.ad = rec.ad_au;

    delete rec._comp;
    return rec;
  }

  async function loadOne(des) {
    const sbdb = await fetchJSON(window.PROXY_BASE + "/sbdb?sstr=" + encodeURIComponent(des) + "&phys-par=true");
    let cad = null;
    try {
      const c = await fetchJSON(window.PROXY_BASE + "/cad?des=" + encodeURIComponent(des) +
        "&body=Earth&date-min=now&date-max=%2B36500&sort=date&limit=1");
      if (c.count && c.data && c.data.length) {
        const f = c.fields, row = c.data[0], m = {};
        f.forEach((k, i) => m[k] = row[i]);
        const au = parseFloat(m.dist);
        cad = {
          date: (m.cd || "").split(" ")[0],
          dist_au: Math.round(au * 1e6) / 1e6,
          dist_ld: Math.round(au * LD_PER_AU * 100) / 100,
          v_rel_kms: m.v_rel ? Math.round(parseFloat(m.v_rel) * 100) / 100 : null,
        };
      }
    } catch (e) { /* approaches optional */ }
    return normalize(sbdb, cad);
  }

  // Public: load all objects, calling onProgress(done,total) as they arrive.
  async function loadAll(onProgress) {
    if (!proxyReady()) {
      throw new Error("PROXY_NOT_CONFIGURED");
    }
    const list = window.NEO_DESIGNATIONS || [];
    const out = [];
    let done = 0;
    // small concurrency to be quick but polite
    const QUEUE = list.slice();
    const WORKERS = 4;
    async function worker() {
      while (QUEUE.length) {
        const des = QUEUE.shift();
        try { out.push(await loadOne(des)); }
        catch (e) { console.warn("skip", des, e.message); }
        done++; if (onProgress) onProgress(done, list.length);
      }
    }
    await Promise.all(Array.from({ length: WORKERS }, worker));
    // rank by mining score
    out.sort((a, b) => b.mining_score - a.mining_score);
    out.forEach((o, i) => o.mining_rank = i + 1);
    return out;
  }

  window.NEOData = { loadAll, proxyReady };
})();
