'use strict';
// ============================================================
//  REPORT MODAL — "מצאתם בעיה?"
// ============================================================
/* Shared by all six components of methodica-math-percent-06 (ported from methodica-math-ratio-01
   8f21b4c). Definition-only: 90-boot.js calls initReportModal().

   Per-part seams this file reads at call time, not load time:
     SCREEN_TO_SUBCONTENT   screen -> [item suffix, page-in-item]
     currentScreen          the learner's position
   Both come from the component's own script.js.

   Every component carries the same (newer) modal markup, with #report-text-error and
   onblur="reportTextBlur()"; every lookup is still guarded. */

/* Google Form that collects learner problem reports.
   ═══ ONE SHARED FORM FOR ALL OF 720 — not specific to this unit. ═══
   Decided by the content owner (2026-08-13): the same form serves every unit, and this is the
   universal endpoint. The REPORT-ISSUE.md §3 warning about a borrowed endpoint is about an
   UNINTENTIONAL share; what makes a deliberate one correct is that two fields carry the identity
   on every submission — entry.1933069481 (unit slug) and entry.2070680092 (component slug) —
   both read from window.METADATA, so a row from this unit is unambiguously identifiable.

   ⚠️ Operational consequence: the response sheet holds reports from every 720 unit together.
   Filtering by the unit-slug column is part of reading the reports, not an option. */
var REPORT_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSfFq5XFtH1pPpLgV5RWT4m3NanYPW5GKremqTvkp6zKjEGqcw/formResponse';

/* The entry.* keys of that shared form. Because one form serves every unit the keys are the same
   everywhere and there is nothing to adapt — ⚠️ renaming one here breaks EVERY unit reporting to
   this form, not just this one. */
var REPORT_FIELDS = {
  dateYear:   'entry.301404029_year',
  dateMonth:  'entry.301404029_month',
  dateDay:    'entry.301404029_day',
  timeHour:   'entry.2066097581_hour',
  timeMinute: 'entry.2066097581_minute',
  unitSlug:   'entry.1933069481',
  compSlug:   'entry.2070680092',
  itemId:     'entry.1555704258',
  itemPage:   'entry.1671046914',
  problemType:'entry.1179822443',
  freeText:   'entry.806447525'
};

/* Problem-type labels. Module scope because both the custom select and submitReport need them —
   the form records the human-readable label, not the internal key. */
var REPORT_TYPE_LABELS = {
  'technical': 'תקלה טכנית או שמשהו לא עובד',
  'unclear':   'משהו לא ברור לי',
  'other':     'אחר'
};

/* Arabic build: what the learner SEES in the custom select. REPORT_TYPE_LABELS above stays Hebrew
   because it is the value recorded in the shared 720 response sheet. */
var REPORT_TYPE_DISPLAY = {
  'technical': 'خلل تقني أو شيء لا يعمل',
  'unclear':   'شيء غير واضح لي',
  'other':     'أخرى'
};

function openReportModal() {
  resetReportForm();
  document.getElementById('report-modal').removeAttribute('hidden');
}

function tryCloseReportModal() {
  var typeVal = document.getElementById('report-type').value;
  var textVal = document.getElementById('report-text').value.trim();

  if (typeVal || textVal) {
    document.getElementById('report-modal').setAttribute('hidden', '');
    document.getElementById('report-confirm-modal').removeAttribute('hidden');
  } else {
    forceCloseReportModal();
  }
}

function forceCloseReportModal() {
  document.getElementById('report-modal').setAttribute('hidden', '');
  document.getElementById('report-confirm-modal').setAttribute('hidden', '');
  resetReportForm();
}

function backToReportForm() {
  document.getElementById('report-confirm-modal').setAttribute('hidden', '');
  document.getElementById('report-modal').removeAttribute('hidden');
  setTimeout(function() {
    var el = document.getElementById('report-type');
    if (el) el.focus();
  }, 40);
}

function showReportThanks() {
  document.getElementById('report-modal').setAttribute('hidden', '');
  document.getElementById('report-confirm-modal').setAttribute('hidden', '');
  var thanks = document.getElementById('report-thanks-modal');
  if (thanks) {
    thanks.removeAttribute('hidden');
    if (typeof announce === 'function') announce('تم إرسال البلاغ، شكرًا');   // ratio-01's 15-ui.js; percent-06 has none
    var btn = thanks.querySelector('.report-submit-btn');
    if (btn) setTimeout(function(){ btn.focus(); }, 40);
  }
  resetReportForm();
}

function closeReportThanks() {
  var thanks = document.getElementById('report-thanks-modal');
  if (thanks) thanks.setAttribute('hidden', '');
}

function submitReport() {
  var typeKey = document.getElementById('report-type').value;
  var textVal = document.getElementById('report-text').value.trim();
  /* The submit button is already gated by reportCheckSubmit(); this is the belt-and-braces path
     for keyboard/programmatic submits. */
  if (!typeKey || !textVal) { reportCheckSubmit(); return; }

  var now  = new Date();
  var meta = window.METADATA || {};
  var body = new URLSearchParams();
  body.append(REPORT_FIELDS.dateYear,   now.getFullYear());
  body.append(REPORT_FIELDS.dateMonth,  now.getMonth() + 1);
  body.append(REPORT_FIELDS.dateDay,    now.getDate());
  body.append(REPORT_FIELDS.timeHour,   now.getHours());
  body.append(REPORT_FIELDS.timeMinute, now.getMinutes());
  body.append(REPORT_FIELDS.unitSlug,   shortId(meta.learningUnitId));
  body.append(REPORT_FIELDS.compSlug,   shortId(meta.id));
  /* Item + page-in-item come from the same screen map the xAPI item scope uses, so a report and
     a statement always name the same place. Unmapped screens report the raw screen number.
     typeof-guarded: the modal works before the per-part maps are declared (script.js loads
     AFTER this file), and SCREEN_TO_SUBCONTENT is a top-level var in that part, not a window
     property. */
  var map      = (typeof SCREEN_TO_SUBCONTENT !== 'undefined') ? SCREEN_TO_SUBCONTENT : null;
  var mapEntry = map ? map[currentScreen] : null;
  /* The item slug, not the component slug: in this unit they differ (20-xapi.js xapiItemSlug).
     Resolved only for a mapped screen, and guarded: the form must work with reporting off. */
  var itemSlug = '';
  if (mapEntry) { try { itemSlug = (typeof xapiItemSlug === 'function' && xapiItemSlug()) || shortId(meta.id); } catch (e) { itemSlug = shortId(meta.id); } }
  var itemId   = mapEntry ? itemSlug + '-' + mapEntry[0] : '';
  var itemPage = mapEntry ? String(mapEntry[1]) : String(currentScreen);
  body.append(REPORT_FIELDS.itemId,      itemId);
  body.append(REPORT_FIELDS.itemPage,    itemPage);
  body.append(REPORT_FIELDS.problemType, REPORT_TYPE_LABELS[typeKey] || typeKey);
  body.append(REPORT_FIELDS.freeText,    textVal);

  if (!REPORT_FORM_ACTION) {
    /* Safety gate. Should not happen — the endpoint is set above — but if it is ever blanked,
       a loud failure beats a silent send to nowhere. The thank-you still shows: what the learner
       experiences must not change, and blocking them here would be worse. */
    console.error('[Report] REPORT_FORM_ACTION not configured — the report went nowhere.',
      'What would have been sent:', Object.fromEntries(body));
    showReportThanks();
    return;
  }

  /* no-cors: Google Forms accepts the POST but returns an opaque response. A failure must never
     block the learner, so the modal closes either way. */
  fetch(REPORT_FORM_ACTION, { method: 'POST', mode: 'no-cors', body: body })
    .catch(function (e) { console.error('[Report] send failed', e); });
  console.log('[Report Issue] sent');
  showReportThanks();
}

function reportCheckSubmit() {
  var typeVal = document.getElementById('report-type').value;
  var textVal = document.getElementById('report-text').value.trim();
  var btn = document.querySelector('.report-submit-btn');
  if (btn) btn.disabled = !(typeVal && textVal);
}

function resetReportForm() {
  var wrapper = document.getElementById('report-type-wrapper');
  if (wrapper && wrapper._resetSelect) wrapper._resetSelect();
  var ta = document.getElementById('report-text');
  var taErr = document.getElementById('report-text-error');
  if (ta)    { ta.value = ''; ta.classList.remove('has-error'); }
  if (taErr) taErr.hidden = true;
  document.getElementById('report-char-count').textContent = '0 / 250';
  reportCheckSubmit();
}

/* Wired from the markup as onblur="reportTextBlur()" in components 04 and 05 only. Harmless
   elsewhere: without #report-text-error it returns immediately, and nothing calls it. */
function reportTextBlur() {
  var ta    = document.getElementById('report-text');
  var taErr = document.getElementById('report-text-error');
  if (!ta || !taErr) return;
  if (!ta.value.trim()) {
    ta.classList.add('has-error');
    taErr.style.display = 'block';
  } else {
    ta.classList.remove('has-error');
    taErr.style.display = 'none';
  }
}

/* Everything with a side effect lives here, called once from 90-boot.js.
   The markup uses a hidden input plus a custom select, NOT a native <select>, so the usual
   options[selectedIndex].text idiom does not apply and REPORT_TYPE_LABELS has to be readable
   from submitReport() too — which is why it sits at module scope above. */
function initReportModal() {
  /* ── Wire the flag button by DELEGATION, not onclick/getElementById ──
     This unit has exactly ONE .flag-btn per part, carrying an inline onclick, so delegation
     changes nothing today. It is here because the sibling units grew per-screen flag
     buttons (mass-measure-02 has 18 across its parts) and a single getElementById would have
     wired one and silently left the rest dead. Delegation catches every instance, including any
     added later. The inline onclick stays: openReportModal() only calls resetReportForm() and
     clears [hidden], so a click arriving through both paths still opens the modal once. */
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.flag-btn')) {
      e.preventDefault();
      openReportModal();
    }
  });

  /* Custom select for report-type */
  (function() {
    var LABELS = REPORT_TYPE_DISPLAY;
    var PLACEHOLDER = 'اختاروا نوع المشكلة';
    var wrapper = document.getElementById('report-type-wrapper');
    if (!wrapper) return;
    var btn        = wrapper.querySelector('.report-select-btn');
    var list       = wrapper.querySelector('.report-select-list');
    var hidden     = document.getElementById('report-type');
    var valSpan    = wrapper.querySelector('.report-select-value');
    var errEl      = document.getElementById('report-type-error');
    var wasOpened  = false;
    var pickingOpt = false;

    function showError() {
      btn.classList.add('has-error');
      if (errEl) errEl.style.display = 'block';
    }
    function clearError() {
      btn.classList.remove('has-error');
      if (errEl) errEl.style.display = 'none';
    }
    function closeList() {
      list.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function() {
      var opening = list.hidden;
      list.hidden = !opening;
      btn.setAttribute('aria-expanded', String(opening));
      if (opening) {
        wasOpened = true;
      } else {
        if (!hidden.value) showError();
      }
    });

    list.addEventListener('mousedown', function() { pickingOpt = true; });
    list.addEventListener('mouseup',   function() { pickingOpt = false; });

    btn.addEventListener('blur', function() {
      if (!pickingOpt && wasOpened && !hidden.value) showError();
    });

    wrapper.querySelectorAll('.report-select-option').forEach(function(opt) {
      opt.addEventListener('click', function() {
        hidden.value = opt.getAttribute('data-value');
        valSpan.textContent = LABELS[hidden.value] || PLACEHOLDER;
        btn.classList.remove('is-placeholder');
        clearError();
        wasOpened = false;
        closeList();
        wrapper.querySelectorAll('.report-select-option').forEach(function(o) { o.classList.remove('is-selected'); });
        opt.classList.add('is-selected');
        hidden.dispatchEvent(new Event('change'));
      });
    });

    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) {
        if (wasOpened && !hidden.value) showError();
        closeList();
      }
    });

    wrapper._resetSelect = function() {
      wasOpened = false;
      hidden.value = '';
      valSpan.textContent = PLACEHOLDER;
      btn.classList.add('is-placeholder');
      btn.classList.remove('has-error');
      btn.setAttribute('aria-expanded', 'false');
      if (errEl) errEl.style.display = 'none';
      closeList();
      wrapper.querySelectorAll('.report-select-option').forEach(function(o) { o.classList.remove('is-selected'); });
    };
  })();

  // Character counter for report textarea
  var reportTextarea = document.getElementById('report-text');
  var reportCounter  = document.getElementById('report-char-count');
  if (reportTextarea && reportCounter) {
    reportTextarea.addEventListener('input', function() {
      reportCounter.textContent = reportTextarea.value.length + ' / 250';
      reportCheckSubmit();
    });
  }

  var reportSelect = document.getElementById('report-type');
  if (reportSelect) {
    reportSelect.addEventListener('change', function() {
      reportCheckSubmit();
      var field = document.querySelector('.report-field');
      var star = field ? field.querySelector('.required-star') : null;
      if (star) star.classList.toggle('is-error', !reportSelect.value);
    });
  }

  if (reportTextarea) {
    reportTextarea.addEventListener('blur', function() {
      var star = reportTextarea.closest('.report-field').querySelector('.required-star');
      if (star) star.classList.toggle('is-error', !reportTextarea.value.trim());
    });
    reportTextarea.addEventListener('input', function() {
      if (reportTextarea.value.trim()) {
        var star = reportTextarea.closest('.report-field').querySelector('.required-star');
        if (star) star.classList.remove('is-error');
      }
    });
  }

  // Escape key closes report modals
  document.addEventListener('keydown', function(event) {
    if (event.key !== 'Escape') return;
    var confirmModal = document.getElementById('report-confirm-modal');
    var reportModal  = document.getElementById('report-modal');
    if (!confirmModal.hasAttribute('hidden')) { forceCloseReportModal(); return; }
    if (!reportModal.hasAttribute('hidden'))  { tryCloseReportModal();   return; }
  });
}
