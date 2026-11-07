'use strict';
/* ═══════════════════ BOOT ═══════════════════
   The ONLY file in unit-js/ with top-level side effects, and the LAST script tag on every page —
   after the component's own script.js, so every per-part hook it calls already exists. Its own
   tag, never lines appended to script.js: a top-level throw there cannot reach this one
   (ADDING-REPORTING-AND-RESUME.md §3.2). Order from methodica-math-ratio-01 90-boot.js.

   By the time this runs, the component's script.js has already booted itself (scaleApp, the
   first resetScreenState(0), its listeners and the DEV bridge) — percent-06's components start
   themselves, so there is no partBoot() here. The order below is load-bearing:

     0. initResumeResetHatch() before everything — it strips ?resetState from the URL and raises
        the reset flag before anything reads the query or touches the state document.
     1. initReportModal() — the "מצאתם בעיה?" dialog (25-report.js).
     2. the leave handlers and the resumable-field saves (40-resume.js).
     3. hideCrossPartBack() — the first screen's "חזרה" (production only; §8.12).
     4. bootXAPI() last — the library, the metadata, the resume read and restore, the component
        'initialized'.
   Each of 0-3 is individually wrapped, so one failure cannot suppress the others.

   No DOMContentLoaded wrapper: this file sits immediately before </body>, so the DOM is
   complete. */
(function boot () {
  try { initResumeResetHatch(); }    catch (e) { console.error('[boot] initResumeResetHatch', e); }
  try { initReportModal(); }         catch (e) { console.error('[boot] initReportModal', e); }
  try { initResumeLeaveHandlers(); } catch (e) { console.error('[boot] initResumeLeaveHandlers', e); }
  try { initResumeFieldSaves(); }    catch (e) { console.error('[boot] initResumeFieldSaves', e); }
  try { hideCrossPartBack(); }       catch (e) { console.error('[boot] hideCrossPartBack', e); }
  bootXAPI();
})();
