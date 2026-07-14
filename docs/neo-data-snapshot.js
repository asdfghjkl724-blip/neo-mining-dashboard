/* Fallback snapshot.
 *
 * This intentionally contains NO objects. The previous version held 50
 * procedurally-generated (fake) designations; those have been removed so that
 * no fabricated data exists anywhere in this project.
 *
 * The dashboards now load 50 REAL near-Earth objects live from NASA/JPL via the
 * Cloudflare Worker proxy (see neo-config.js -> PROXY_BASE). If that live fetch
 * is ever unavailable, the dashboard shows an honest "data unavailable" state
 * rather than falling back to invented numbers.
 *
 * To bake a REAL offline snapshot for instant/offline loading, run
 * fetch_neo_data.py on a machine with internet, then paste its output here as
 *   window.NEO_SNAPSHOT = <contents of neo_data.json "objects" array>;
 */
window.NEO_SNAPSHOT = [];
