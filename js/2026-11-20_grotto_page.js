/* 2026-11-20 오늘의 그롯또 saju page: form, canvas card, save, and share menu. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null && text !== "") n.textContent = String(text);
    return n;
  }
  function toast(msg) {
    var t = $("gs-grotto-toast");
    if (!t) {
      t = el("div", "gs-grotto-toast");
      t.id = "gs-grotto-toast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg || "";
    t.classList.add("on");
    if (toast._t) clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("on"); }, 2200);
  }
  function showErr(msg) {
    var e = $("gs-grotto-err");
    if (!e) return;
    if (msg) { e.hidden = false; e.textContent = msg; }
    else { e.hidden = true; e.textContent = ""; }
  }
  function calendarMode() {
    var r = document.querySelector('input[name="gs-grotto-cal"]:checked');
    return r && r.value === "lunar" ? "lunar" : "solar";
  }
  function syncCalendarUI() {
    var lunar = calendarMode() === "lunar";
    $("gs-grotto-solar-fields").hidden = lunar;
    $("gs-grotto-lunar-fields").hidden = !lunar;
    updateLeapHint();
  }
  function updateLeapHint() {
    var y = +$("gs-grotto-ly").value;
    var hint = $("gs-grotto-leap-hint");
    var box = $("gs-grotto-leap");
    if (!y || !window.GSGrotto || !GSGrotto.intercalMonth) { hint.textContent = ""; return; }
    var im = GSGrotto.intercalMonth(y);
    if (im > 0) {
      hint.textContent = "이 해의 윤달은 윤" + im + "월이에요.";
      box.disabled = false;
    } else {
      hint.textContent = "이 해에는 윤달이 없어요.";
      box.checked = false;
      box.disabled = true;
    }
  }
  function fillYears() {
    var sel = $("gs-grotto-ly");
    var today = GSGrotto.todayKST();
    sel.innerHTML = "";
    for (var y = today.y; y >= 1900; y--) {
      var o = document.createElement("option");
      o.value = String(y); o.textContent = y + "년";
      sel.appendChild(o);
    }
    sel.value = "1980";
  }
  function fillMonthsDays() {
    var msel = $("gs-grotto-lm"), dsel = $("gs-grotto-ld");
    msel.innerHTML = ""; dsel.innerHTML = "";
    var i, o;
    for (i = 1; i <= 12; i++) { o = document.createElement("option"); o.value = String(i); o.textContent = i + "월"; msel.appendChild(o); }
    for (i = 1; i <= 30; i++) { o = document.createElement("option"); o.value = String(i); o.textContent = i + "일"; dsel.appendChild(o); }
  }
  function fillShi() {
    var sel = $("gs-grotto-time");
    sel.innerHTML = "";
    GSGrotto.SHI.forEach(function (s) {
      var o = document.createElement("option");
      o.value = s.h === "" || s.h == null ? "" : String(s.h);
      o.textContent = s.label;
      sel.appendChild(o);
    });
  }

  var lastBlob = null, lastCard = null, lastUrl = null;

  function revoke() { if (lastUrl) { URL.revokeObjectURL(lastUrl); lastUrl = null; } }

  function fileName(card) {
    var t = card.today;
    return "오늘의그롯또-" + t.y + "-" + String(t.m).padStart(2,"0") + "-" + String(t.d).padStart(2,"0") + ".png";
  }

  function showResult(card, rendered) {
    var box = $("gs-grotto-res");
    box.hidden = false;
    revoke();
    lastBlob = rendered.blob;
    lastCard = card;
    lastUrl = URL.createObjectURL(rendered.blob);
    var img = $("gs-grotto-card");
    img.src = lastUrl;
    img.alt = "오늘의 그롯또, " + card.date + " " + card.pillar;
    $("gs-grotto-actions").hidden = false;
    closeShareMenu({ focus: false });
    box.setAttribute("tabindex", "-1");
    box.focus({ preventScroll: false });
  }

  function saveImage() {
    if (!lastBlob || !lastCard) return;
    var a = document.createElement("a");
    a.href = lastUrl || URL.createObjectURL(lastBlob);
    a.download = fileName(lastCard);
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("이미지를 저장했어요");
  }

  var SAJU_URL = "https://xn--739an53af0c.com/saju.html";
  var SHARE_LINK_LINE = "오늘의 그롯또 뽑아봤어요";
  var SHARE_X_TEXT = "오늘의 그롯또 나왔어요. 내 생일로 뽑아보기";
  var shareOpen = false;

  function shareMenuEls() {
    return {
      btn: $("gs-grotto-share"),
      menu: $("gs-grotto-share-menu"),
      back: $("gs-grotto-share-backdrop"),
      app: $("gs-grotto-share-app")
    };
  }

  function visibleShareItems() {
    var menu = $("gs-grotto-share-menu");
    if (!menu) return [];
    return Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]')).filter(function (n) {
      return !n.hidden;
    });
  }

  function canShareImageFile() {
    try {
      if (!navigator.canShare || !navigator.share || !lastBlob) return false;
      var name = lastCard ? fileName(lastCard) : "오늘의그롯또.png";
      var file = new File([lastBlob], name, { type: "image/png" });
      return !!navigator.canShare({ files: [file] });
    } catch (e) {
      return false;
    }
  }

  function syncShareAppItem() {
    var app = $("gs-grotto-share-app");
    if (app) app.hidden = !canShareImageFile();
  }

  function positionShareMenu() {
    var menu = $("gs-grotto-share-menu");
    if (!menu || window.matchMedia("(max-width: 640px)").matches) {
      if (menu) menu.classList.remove("up");
      return;
    }
    menu.classList.remove("up");
    var rect = menu.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 8 && rect.top > rect.height + 16) {
      menu.classList.add("up");
    }
  }

  function openShareMenu() {
    var els = shareMenuEls();
    if (!els.btn || !els.menu) return;
    syncShareAppItem();
    els.menu.hidden = false;
    if (els.back) els.back.hidden = false;
    els.btn.setAttribute("aria-expanded", "true");
    shareOpen = true;
    positionShareMenu();
    var items = visibleShareItems();
    if (items[0]) items[0].focus();
  }

  function closeShareMenu(opts) {
    var els = shareMenuEls();
    if (!els.menu) return;
    var was = shareOpen;
    els.menu.hidden = true;
    els.menu.classList.remove("up");
    if (els.back) els.back.hidden = true;
    if (els.btn) els.btn.setAttribute("aria-expanded", "false");
    shareOpen = false;
    if (was && (!opts || opts.focus !== false) && els.btn) els.btn.focus();
  }

  function toggleShareMenu() {
    if (shareOpen) closeShareMenu();
    else openShareMenu();
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  function copyShareLink() {
    var text = SHARE_LINK_LINE + "\n" + SAJU_URL;
    function ok() { closeShareMenu(); toast("복사했어요"); }
    function fail() { toast("복사하지 못했어요"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(function () {
        if (fallbackCopy(text)) ok(); else fail();
      });
      return;
    }
    if (fallbackCopy(text)) ok(); else fail();
  }

  function shareOnX() {
    var u = "https://x.com/intent/post?text=" + encodeURIComponent(SHARE_X_TEXT) +
      "&url=" + encodeURIComponent(SAJU_URL);
    closeShareMenu();
    window.open(u, "_blank", "noopener,noreferrer");
  }

  function shareWithApp() {
    if (!lastBlob || !lastCard) return;
    var file = new File([lastBlob], fileName(lastCard), { type: "image/png" });
    var data = { files: [file], title: "오늘의 그롯또" };
    if (!(navigator.canShare && navigator.canShare(data))) {
      syncShareAppItem();
      toast("이 기기는 앱으로 공유를 지원하지 않아요");
      return;
    }
    closeShareMenu();
    navigator.share(data).then(function () { toast("공유했어요"); }).catch(function (err) {
      if (err && err.name === "AbortError") return;
      toast("공유하지 못했어요");
    });
  }

  function onShareKeydown(e) {
    if (!shareOpen) {
      if ((e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") && e.target && e.target.id === "gs-grotto-share") {
        if (e.key === "ArrowDown") { e.preventDefault(); openShareMenu(); }
      }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); closeShareMenu(); return; }
    var items = visibleShareItems();
    if (!items.length) return;
    var i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i <= 0 ? items.length : i) - 1].focus();
    } else if (e.key === "Home") {
      e.preventDefault(); items[0].focus();
    } else if (e.key === "End") {
      e.preventDefault(); items[items.length - 1].focus();
    } else if (e.key === "Tab") {
      closeShareMenu({ focus: false });
    }
  }

  function onDocPointer(e) {
    if (!shareOpen) return;
    var wrap = $("gs-grotto-share-wrap");
    var back = $("gs-grotto-share-backdrop");
    if (e.target === back) { closeShareMenu(); return; }
    if (wrap && !wrap.contains(e.target)) closeShareMenu({ focus: false });
  }

  function onSubmit(e) {
    e.preventDefault();
    showErr("");
    var mode = calendarMode();
    var by, bm, bd, leap = false;
    if (mode === "solar") {
      var v = $("gs-grotto-date").value;
      if (!v) { showErr("생년월일을 입력해 주세요"); return; }
      var p = v.split("-");
      by = +p[0]; bm = +p[1]; bd = +p[2];
    } else {
      by = +$("gs-grotto-ly").value;
      bm = +$("gs-grotto-lm").value;
      bd = +$("gs-grotto-ld").value;
      leap = $("gs-grotto-leap").checked;
    }
    var hour = $("gs-grotto-time").value;
    var card = GSGrotto.buildCard({
      birthY: by, birthM: bm, birthD: bd,
      calendar: mode, leap: leap,
      hour: hour === "" ? null : +hour
    });
    if (card.error) { showErr(card.error); return; }
    var btn = $("gs-grotto-submit");
    btn.disabled = true;
    GSGrotto.renderCard(card, { assetBase: "" }).then(function (rendered) {
      showResult(card, rendered);
    }).catch(function () {
      showErr("카드를 그리지 못했어요. 잠시 후 다시 시도해 주세요.");
    }).then(function () { btn.disabled = false; });
  }

  function bind() {
    if (!window.GSGrotto || !GSGrotto.buildCard || !GSGrotto.renderCard) return;
    fillYears(); fillMonthsDays(); fillShi();
    syncCalendarUI();
    if (GSGrotto.loadAssets) GSGrotto.loadAssets("");
    document.querySelectorAll('input[name="gs-grotto-cal"]').forEach(function (r) {
      r.addEventListener("change", syncCalendarUI);
    });
    $("gs-grotto-ly").addEventListener("change", updateLeapHint);
    $("gs-grotto-form").addEventListener("submit", onSubmit);
    $("gs-grotto-save").addEventListener("click", saveImage);
    $("gs-grotto-share").addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleShareMenu();
    });
    $("gs-grotto-share-link").addEventListener("click", copyShareLink);
    $("gs-grotto-share-x").addEventListener("click", shareOnX);
    $("gs-grotto-share-app").addEventListener("click", shareWithApp);
    $("gs-grotto-share-backdrop").addEventListener("click", function () { closeShareMenu(); });
    document.addEventListener("keydown", onShareKeydown);
    document.addEventListener("pointerdown", onDocPointer, true);
    var today = GSGrotto.todayKST();
    var dateEl = $("gs-grotto-date");
    dateEl.max = today.y + "-" + String(today.m).padStart(2,"0") + "-" + String(today.d).padStart(2,"0");
    dateEl.min = "1900-01-01";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
