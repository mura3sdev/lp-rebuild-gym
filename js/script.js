/* ============================================================
   REBUILD 中目黒 — スクリプト（依存ライブラリなし）
   リッチアニメーションのデモを兼ねた実装。すべて transform /
   opacity のみで動かし、prefers-reduced-motion では無効化する。
   1. スクロール進捗バー
   2. パララックス（data-parallax属性・rAF実装）
   3. 数字カウントアップ（小数対応）
   4. SVGラインアニメーション（体重グラフの描画）
   5. マグネットボタン（ポインタ環境のみ）
   6. スクロール出現・メニュー・固定CTA
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 1+2. スクロール進捗バー & パララックス（同じrAFで処理） ---- */
  var progress = document.getElementById('progress');
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var ticking = false;

  function onFrame() {
    ticking = false;
    var doc = document.documentElement;
    // 進捗バー
    var max = doc.scrollHeight - doc.clientHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
    // パララックス: 要素が画面中央からどれだけ離れているかに比例して移動
    if (!reduced) {
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var offset = (r.top + r.height / 2) - vh / 2;
        var speed = parseFloat(el.dataset.parallax) || 0;
        el.style.setProperty('--py', (offset * speed).toFixed(1) + 'px');
      });
    }
  }
  function requestFrame() {
    if (!ticking) { ticking = true; requestAnimationFrame(onFrame); }
  }
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame, { passive: true });
  onFrame();

  /* ---- 3. 数字カウントアップ（小数・マイナス値対応） ---- */
  function startCount(el) {
    var target = parseFloat(el.dataset.count);
    var decimals = parseInt(el.dataset.decimals, 10) || 0;
    function fmt(v) {
      return decimals > 0
        ? v.toFixed(decimals)
        : Math.round(v).toLocaleString('ja-JP');
    }
    if (reduced) { el.textContent = fmt(target); return; }
    var start = null, DUR = 1500;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / DUR, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var counts = document.querySelectorAll('.count');
  if ('IntersectionObserver' in window) {
    var countIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countIo.unobserve(entry.target);
          startCount(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counts.forEach(function (el) { countIo.observe(el); });
  } else {
    counts.forEach(startCount);
  }

  /* ---- 4. SVGラインアニメーション（グラフ描画） ---- */
  var chartBox = document.getElementById('chartBox');
  if (chartBox && 'IntersectionObserver' in window && !reduced) {
    new IntersectionObserver(function (entries, obs) {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      chartBox.classList.add('is-drawn');
    }, { threshold: 0.45 }).observe(chartBox);
  } else if (chartBox) {
    chartBox.classList.add('is-drawn');
  }

  /* ---- 5. マグネットボタン（マウス環境のみ・控えめに） ---- */
  if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.magnetic').forEach(function (btn) {
      btn.style.transition = 'transform .25s cubic-bezier(.2,.8,.3,1), background-color .25s ease, box-shadow .25s ease';
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.transform = 'translate(' + (dx * 8).toFixed(1) + 'px,' + (dy * 6).toFixed(1) + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = '';
      });
    });
  }

  /* ---- 6. メニュー・スクロール出現・固定CTA ---- */
  var menuBtn = document.getElementById('menuBtn');
  var gnav = document.getElementById('gnav');
  function closeMenu() {
    gnav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  menuBtn.addEventListener('click', function () {
    var open = gnav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  gnav.addEventListener('click', function (e) {
    if (e.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-shown');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    reveals.forEach(function (n) { io.observe(n); });
  } else {
    reveals.forEach(function (n) { n.classList.add('is-shown'); });
  }

  var fixedCta = document.getElementById('fixedCta');
  var fv = document.querySelector('.fv');
  var cta = document.getElementById('cta');
  if (fixedCta && fv && 'IntersectionObserver' in window) {
    var pastFv = false, inCta = false;
    function updateCta() {
      var show = pastFv && !inCta;
      fixedCta.classList.toggle('is-visible', show);
      fixedCta.setAttribute('aria-hidden', String(!show));
      fixedCta.querySelector('a').tabIndex = show ? 0 : -1;
    }
    new IntersectionObserver(function (entries) {
      pastFv = !entries[0].isIntersecting;
      updateCta();
    }, { threshold: 0.1 }).observe(fv);
    new IntersectionObserver(function (entries) {
      inCta = entries[0].isIntersecting;
      updateCta();
    }, { threshold: 0.12 }).observe(cta);
  }
})();
