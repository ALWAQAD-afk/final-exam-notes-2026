/* ==========================================================================
   ملخص الامتحان النهائي 2026 — منطق الواجهة
   كل شيء يعمل في المتصفح فقط: لا خادم، لا تتبّع، لا ملخص حقيقي.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------- أدوات صغيرة */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = reducedMotionQuery.matches;
  const isTouch = window.matchMedia('(hover: none)').matches;

  const IMAGES = Array.from({ length: 12 }, (_, i) =>
    'assets/img/portrait-' + String(i + 1).padStart(2, '0') + '.png');

  /* --------------------------------------------------- إحصائيات البوابة */
  const statDownloads = $('#statDownloads');
  const queueNum = $('#queueNum');
  const countdownEl = $('#countdown');
  const countdownHint = $('#countdownHint');

  let downloads = 128417;
  let queue = 2184;

  function bumpDownloads() {
    downloads += randInt(1, 5);
    statDownloads.textContent = downloads.toLocaleString('en-US');
    setTimeout(bumpDownloads, randInt(2200, 6200));
  }
  setTimeout(bumpDownloads, 2600);

  setInterval(() => {
    queue = clamp(queue + randInt(-14, 18), 1600, 3200);
    queueNum.textContent = queue.toLocaleString('en-US');
  }, 3800);

  /* مؤقّت تنازلي يهدّد ثم يعتذر ثم يعيد الكرّة */
  const COUNTDOWN_START = 4 * 60 + 59;
  let remaining = COUNTDOWN_START;
  let countdownDone = false;

  function paintCountdown() {
    const m = String(Math.floor(remaining / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    countdownEl.textContent = m + ':' + s;
    countdownEl.classList.toggle('is-low', remaining <= 30);
  }

  paintCountdown();
  setInterval(() => {
    if (countdownDone) return;
    remaining -= 1;
    if (remaining <= 0) {
      remaining = 0;
      paintCountdown();
      countdownDone = true;
      countdownHint.textContent = 'انتهى الوقت. الرابط ما زال يعمل، لأن أحدًا لم يغلق شيئًا في حياته.';
      countdownEl.classList.remove('is-low');
      setTimeout(() => {
        remaining = COUNTDOWN_START;
        countdownDone = false;
        countdownHint.textContent = 'ثم يُفتح مرة أخرى، لأن أحدًا لا يغلق شيئًا فعلًا';
        paintCountdown();
      }, 3200);
      return;
    }
    paintCountdown();
  }, 1000);

  $('#year').textContent = new Date().getFullYear();

  /* ------------------------------------------------------ إدارة النوافذ */
  let lastFocused = null;

  function lockScroll(on) {
    document.body.classList.toggle('is-locked', on);
  }

  function focusables(root) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
      .filter((el) => el.offsetParent !== null || el.getClientRects().length);
  }

  function trapTab(container, e) {
    if (e.key !== 'Tab') return;
    const list = focusables(container);
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ====================================================== المرحلة الثانية */
  const verifyModal = $('#verifyModal');
  const verifyForm = $('#verifyForm');
  const identityMsg = $('#identityMsg');
  const pledgeMsg = $('#pledgeMsg');
  const pledge = $('#pledge');
  const verifyCard = $('.modal__card', verifyModal);

  function openVerify() {
    lastFocused = document.activeElement;
    verifyModal.hidden = false;
    lockScroll(true);
    setTimeout(() => {
      const first = $('.option input', verifyModal);
      if (first) first.focus({ preventScroll: true });
    }, 60);
  }

  function closeVerify() {
    verifyModal.hidden = true;
    lockScroll(false);
    if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
  }

  $('#downloadBtn').addEventListener('click', openVerify);

  $$('[data-close]', verifyModal).forEach((el) => {
    el.addEventListener('click', closeVerify);
  });

  verifyModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeVerify(); return; }
    trapTab(verifyCard, e);
  });

  verifyForm.addEventListener('change', () => {
    identityMsg.textContent = '';
    pledgeMsg.textContent = '';
  });

  function shake(el) {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 460);
  }

  const PRAISE = {
    a: 'مقبول. هذه هي الإجابة الرسمية للجامعة، ونحن لا نصدّقها أيضًا.',
    b: 'موثّق. الأسباب الوطنية مقبولة في كل استمارة منذ 1997.',
    c: 'كافٍ جدًا. معظم الطلاب يعرفون الاسم فقط، وبعضهم لا يعرف.',
    d: 'اكتُشف مراقب. لا بأس، الجميع يعرف أن المراقبين يبحثون عن الأسئلة أيضًا.'
  };

  verifyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const picked = $('input[name="identity"]:checked', verifyForm);
    let ok = true;

    if (!picked) {
      identityMsg.style.color = '';
      identityMsg.textContent = 'اختر إجابة، أي إجابة. لن نتحقق منها، لكن الإجراءات إجراءات.';
      shake(verifyCard);
      ok = false;
    } else {
      identityMsg.textContent = PRAISE[picked.value] || '';
      identityMsg.style.color = 'var(--teal)';
    }

    if (!pledge.checked) {
      pledgeMsg.textContent = 'التعهّد إلزامي. هذه جامعة محترمة… نسبيًا.';
      shake(verifyCard);
      ok = false;
    } else {
      pledgeMsg.textContent = '';
    }

    if (!ok) return;

    closeVerify();
    startLoading();
  });

  /* ======================================================== المرحلة الثالثة */
  const loader = $('#loader');
  const pctEl = $('#pct');
  const bar = $('#bar');
  const barFill = $('#barFill');
  const logEl = $('#log');
  const loaderNote = $('#loaderNote');

  const STEPS = [
    { to: 18, dur: 900,  label: 'التحقق من توافق الجهاز مع مناهج 2019…' },
    { to: 37, dur: 1000, label: 'فك تشفير أسئلة السنوات الخمس الماضية…' },
    { to: 56, dur: 1100, label: 'مقارنة خط اليد بخط الطالب المثالي…' },
    { to: 71, dur: 1000, label: 'تجاوز لجنة الأخلاقيات الأكاديمية (بنجاح مريب)…' },
    { to: 86, dur: 900,  label: 'تجهيز النسخة الموقّعة رقميًا…' },
    { to: 97, dur: 900,  label: 'ضغط الملف إلى حجم يبدو مقنعًا…' },
    { to: 99, dur: 700,  label: 'تثبيت النسبة عند 99% لأسباب درامية…' }
  ];

  const NOTES = [
    'لا تُغلق الصفحة. إن أغلقتهها سيعود الخادم إلى 0%، وهو لن يغفر لك.',
    'الخادم يتنفّس بعمق… ويحسب فيك خيرًا.',
    'لحظة واحدة… هذه أهم لحظة في حياتك الأكاديمية حتى الآن.'
  ];

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  function tween(from, to, dur, onUpdate) {
    return new Promise((resolve) => {
      if (reduceMotion) {
        onUpdate(to);
        resolve();
        return;
      }
      const t0 = performance.now();
      function frame(now) {
        const t = clamp((now - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        onUpdate(from + (to - from) * eased);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  function setPct(value) {
    const shown = Math.round(value);
    pctEl.textContent = shown;
    barFill.style.width = value + '%';
    bar.setAttribute('aria-valuenow', String(shown));
  }

  let loading = false;

  async function startLoading() {
    if (loading) return;
    loading = true;

    loader.hidden = false;
    lockScroll(true);
    logEl.innerHTML = '';
    setPct(0);
    bar.classList.remove('is-stuck');
    loaderNote.textContent = NOTES[0];
    loaderNote.classList.remove('is-warn');

    let current = 0;

    for (const step of STEPS) {
      const li = document.createElement('li');
      li.className = 'is-active';
      li.innerHTML = '<span class="log__ico" aria-hidden="true"></span><span></span>';
      li.lastElementChild.textContent = step.label;
      logEl.appendChild(li);
      requestAnimationFrame(() => li.classList.add('is-in'));

      await tween(current, step.to, step.dur, setPct);
      current = step.to;
      li.classList.remove('is-active');
      li.classList.add('is-done');
      await wait(reduceMotion ? 60 : 220);
    }

    /* التوقّف المتعمّد عند 99% لمدّة ثلاث ثوانٍ بالضبط */
    bar.classList.add('is-stuck');
    loaderNote.textContent = NOTES[1];
    await wait(1400);
    loaderNote.textContent = NOTES[2];
    loaderNote.classList.add('is-warn');
    await wait(1600);

    setPct(100);
    bar.classList.remove('is-stuck');
    loaderNote.textContent = 'تمّ. جارٍ بدء التنزيل…';
    loaderNote.classList.remove('is-warn');
    await wait(reduceMotion ? 80 : 650);

    loader.hidden = true;
    triggerDownload();
    startParty();
  }

  function triggerDownload() {
    try {
      const a = document.createElement('a');
      a.href = 'final-summary-2026.zip';
      a.download = 'final-summary-2026.zip';
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 1500);
      downloadStarted = true;
    } catch (err) {
      downloadStarted = false;
    }
  }

  let downloadStarted = false;

  /* ========================================================= المرحلة الرابعة */
  const party = $('#party');
  const stage = $('#stage');
  const imgCountEl = $('#imgCount');
  const closeTriesEl = $('#closeTries');
  const escapeBtn = $('#escapeBtn');
  const tauntEl = $('#taunt');
  const toastEl = $('#toast');
  const partyCard = $('#partyCard');
  const motionToggle = $('#motionToggle');

  let partyOn = false;
  let live = [];
  let spawnedTotal = 0;
  let targetLive = 0;
  let rafId = 0;
  let lastFrame = 0;
  let spawnTimer = 0;
  let closeTries = 0;
  let dodgeLock = false;
  let width = window.innerWidth;
  let height = window.innerHeight;

  const isSmall = () => width < 640;
  let capBoost = 0;
  const maxLive = () => (reduceMotion ? 40 : isSmall() ? 60 : 120) + capBoost;
  const speedScale = () => (reduceMotion ? 0.12 : 1);

  function showToast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('is-on'), ms || 2600);
  }

  const TAUNTS = [
    'الزر لا يريد ذلك.',
    'يبدو أن الزر لديه خطط أخرى.',
    'الإغلاق متاح في النسخة المدفوعة.',
    'أُغلق؟ لا، هذا زر «المزيد من الصور».',
    'حاول مرة أخرى. أو لا. النتيجة واحدة.',
    'الزر يعرف أنك لم تذاكر بعد.',
    'حسنًا… اقتربت. لكن الزر أسرع منك.'
  ];

  function makeImage(index) {
    const img = document.createElement('img');
    img.src = IMAGES[index % IMAGES.length];
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    const size = isSmall() ? rand(64, 132) : rand(88, 208);
    img.style.width = Math.round(size) + 'px';
    return img;
  }

  function spawnOne(entry) {
    const el = makeImage(spawnedTotal);
    const w = el.style.width ? parseFloat(el.style.width) : 120;
    const fromTop = entry === 'top' || Math.random() < 0.62;

    const obj = {
      el,
      x: rand(-w * 0.4, width - w * 0.6),
      y: fromTop ? rand(-height * 0.9, -w * 0.5) : rand(0, height - w * 0.5),
      vx: rand(-26, 26),
      vy: fromTop ? rand(26, 74) : rand(-22, 26),
      rot: rand(-18, 18),
      vr: rand(-16, 16) * (reduceMotion ? 0 : 1),
      phase: rand(0, Math.PI * 2),
      wob: rand(0.4, 1.4),
      w
    };

    stage.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    live.push(obj);
    spawnedTotal += 1;
    imgCountEl.textContent = spawnedTotal.toLocaleString('en-US');
  }

  function recycleOldest() {
    if (!live.length) return;
    const obj = live.shift();
    const w = obj.w;
    obj.x = rand(-w * 0.4, width - w * 0.6);
    obj.y = rand(-height * 0.8, -w * 0.4);
    obj.vy = rand(30, 80) * speedScale();
    obj.vx = rand(-30, 30);
    obj.rot = rand(-25, 25);
    obj.vr = rand(-20, 20) * (reduceMotion ? 0 : 1);
    live.push(obj);
    spawnedTotal += 1;
    imgCountEl.textContent = spawnedTotal.toLocaleString('en-US');
  }

  function grow() {
    if (!partyOn) return;
    if (live.length < Math.min(targetLive, maxLive())) {
      spawnOne();
      spawnTimer = setTimeout(grow, reduceMotion ? 220 : 180);
    } else if (live.length >= maxLive()) {
      recycleOldest();
      spawnTimer = setTimeout(grow, reduceMotion ? 1400 : 900);
    } else {
      spawnTimer = setTimeout(grow, 600);
    }
  }

  function frame(now) {
    if (!partyOn) return;
    const dt = Math.min(0.05, (now - lastFrame) / 1000 || 0.016);
    lastFrame = now;
    const t = now / 1000;
    const sp = speedScale();

    for (let i = 0; i < live.length; i++) {
      const o = live[i];
      o.y += o.vy * dt * sp;
      o.x += (o.vx + Math.sin(t * o.wob + o.phase) * 22) * dt * sp;
      o.rot += o.vr * dt;

      const w = o.w;
      if (o.y > height + 40) { o.y = -w - 20; o.x = rand(-w * 0.4, width - w * 0.6); }
      if (o.y < -height - 60) { o.y = height + 40; }
      if (o.x < -w - 40) o.x = width + 20;
      if (o.x > width + 40) o.x = -w - 20;

      o.el.style.transform =
        'translate3d(' + o.x.toFixed(1) + 'px,' + o.y.toFixed(1) + 'px,0) rotate(' +
        o.rot.toFixed(1) + 'deg)';
    }

    rafId = requestAnimationFrame(frame);
  }

  function placeEscapeButton() {
    const r = escapeBtn.getBoundingClientRect();
    const bw = r.width || 150;
    const bh = r.height || 46;
    const x = clamp(window.innerWidth / 2 - bw / 2, 14, window.innerWidth - bw - 14);
    const y = clamp(window.innerHeight - bh - 26, 70, window.innerHeight - bh - 14);
    escapeBtn.style.left = x + 'px';
    escapeBtn.style.top = y + 'px';
  }

  function dodgeFrom(px, py, radius) {
    const bw = escapeBtn.offsetWidth;
    const bh = escapeBtn.offsetHeight;
    const pad = 12;
    const minDist = Math.max(190, Math.min(width, height) * 0.28);
    let best = null;
    for (let i = 0; i < 24; i++) {
      const x = rand(pad, Math.max(pad, width - bw - pad));
      const y = rand(66, Math.max(70, height - bh - pad));
      const cx = x + bw / 2;
      const cy = y + bh / 2;
      const d = Math.hypot(cx - px, cy - py);
      if (d > minDist) { best = [x, y]; break; }
      if (!best || d > best[2]) best = [x, y, d];
    }
    escapeBtn.style.left = best[0] + 'px';
    escapeBtn.style.top = best[1] + 'px';
    escapeBtn.style.transform = 'rotate(' + rand(-7, 7).toFixed(1) + 'deg) scale(.97)';
    setTimeout(() => { escapeBtn.style.transform = ''; }, 190);
    return radius;
  }

  function nearButton(px, py) {
    const r = escapeBtn.getBoundingClientRect();
    if (!r.width) return false;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return Math.hypot(cx - px, cy - py) < (isTouch ? 118 : 138);
  }

  function onPointerMove(e) {
    if (!partyOn || dodgeLock || closeTries >= 6) return;
    const px = e.clientX;
    const py = e.clientY;
    if (nearButton(px, py)) {
      dodgeLock = true;
      dodgeFrom(px, py);
      if (Math.random() < 0.34) showToast(TAUNTS[randInt(0, TAUNTS.length - 1)], 1500);
      setTimeout(() => { dodgeLock = false; }, 130);
    }
  }

  function doubleImages() {
    capBoost = Math.min(capBoost + (isSmall() ? 12 : 24), isSmall() ? 24 : 40);
    const wanted = Math.min(maxLive(), Math.max(12, live.length));
    targetLive = Math.min(maxLive() + 40, targetLive + wanted);
    let n = 0;
    const burst = Math.min(wanted, isSmall() ? 16 : 26);
    (function pump() {
      if (n >= burst) return;
      if (live.length < maxLive()) spawnOne();
      else recycleOldest();
      n += 1;
      setTimeout(pump, 55);
    })();
    showToast('تضاعف عدد الصور. الزر «إغلاق وإلغاء» يبدو أنه لا يفهم معنى الإلغاء.', 3200);
  }

  function onEscapeClick() {
    closeTries += 1;
    closeTriesEl.textContent = String(closeTries);
    doubleImages();

    if (closeTries === 1) {
      tauntEl.textContent = 'لم يُغلق شيء. لكن عدد الصور تضاعف. شكرًا لمساهمتك.';
    } else if (closeTries === 3) {
      tauntEl.textContent = 'ثلاث محاولات. معدل نجاحك في الإغلاق يساوي معدلك في المادة.';
    } else if (closeTries >= 6) {
      tauntEl.textContent = 'حسنًا. أنت مصرّ. لكن الزر أيضًا مصرّ. تعادل.';
      escapeBtn.textContent = 'إغلاق وإلغاء (يائس)';
    } else {
      tauntEl.textContent = TAUNTS[randInt(0, TAUNTS.length - 1)];
    }
  }

  function startParty() {
    if (partyOn) return;
    partyOn = true;
    party.hidden = false;
    lockScroll(true);
    width = window.innerWidth;
    height = window.innerHeight;

    document.body.classList.add('is-party');

    /* الموجة الأولى: تتساقط بدفعات صغيرة لتبدو «تتكاثر» ثم تملأ الشاشة */
    const burstSize = reduceMotion ? 22 : isSmall() ? 34 : 46;
    targetLive = maxLive();
    placeEscapeButton();
    setTimeout(() => escapeBtn.focus({ preventScroll: true }), 500);

    let burst = 0;
    (function firstWave() {
      if (!partyOn) return;
      if (burst >= burstSize) { grow(); return; }
      spawnOne('top');
      burst += 1;
      setTimeout(firstWave, reduceMotion ? 90 : 45);
    })();

    lastFrame = performance.now();
    rafId = requestAnimationFrame(frame);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize);

    if (!downloadStarted) {
      setTimeout(() => {
        showToast('إن لم يبدأ التنزيل تلقائيًا، اضغط «إن أردت الدليل، افتح الملف».', 5200);
      }, 2600);
    }
  }

  function onResize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const r = escapeBtn.getBoundingClientRect();
    escapeBtn.style.left = clamp(parseFloat(escapeBtn.style.left || r.left), 10, Math.max(10, width - r.width - 10)) + 'px';
    escapeBtn.style.top = clamp(parseFloat(escapeBtn.style.top || r.top), 66, Math.max(66, height - r.height - 10)) + 'px';
  }

  let lastDodgeAt = 0;

  escapeBtn.addEventListener('pointerdown', (e) => {
    if (!partyOn || closeTries >= 6) return;
    if (Math.random() < (isTouch ? 0.85 : 0.6)) {
      lastDodgeAt = performance.now();
      dodgeFrom(e.clientX, e.clientY);
      showToast('أمسكت الهواء. هذا أيضًا إنجاز أكاديمي.', 1500);
    }
  });

  escapeBtn.addEventListener('click', () => {
    if (performance.now() - lastDodgeAt < 400) return;
    onEscapeClick();
  });

  /* محاولة الاقتراب بلوحة المفاتيح: الزر يهرب أيضًا عند التركيز */
  escapeBtn.addEventListener('focus', () => {
    if (!partyOn || closeTries >= 6) return;
    if (escapeBtn.matches(':focus-visible')) {
      const r = escapeBtn.getBoundingClientRect();
      dodgeFrom(r.left + r.width / 2, r.top + r.height / 2);
    }
  });

  let lastEscKey = 0;
  document.addEventListener('keydown', (e) => {
    if (partyOn && e.key === 'Escape') {
      e.preventDefault();
      const now = performance.now();
      if (now - lastEscKey < 900) return;
      lastEscKey = now;
      showToast('زر Escape يعمل في كل مكان… إلا هنا. المذاكرة هي المخرج الوحيد.', 3200);
      doubleImages();
    }
  });

  motionToggle.addEventListener('click', () => {
    reduceMotion = !reduceMotion;
    motionToggle.setAttribute('aria-pressed', String(reduceMotion));
    motionToggle.textContent = reduceMotion ? 'تشغيل الحركة' : 'تقليل الحركة';
    if (reduceMotion) {
      live.forEach((o) => { o.vr = 0; });
      showToast('خُفّفت الحركة. الصور باقية، مثل المادة.', 2400);
    } else {
      live.forEach((o) => { o.vr = rand(-16, 16); });
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!partyOn) return;
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      clearTimeout(spawnTimer);
    } else {
      lastFrame = performance.now();
      rafId = requestAnimationFrame(frame);
      clearTimeout(spawnTimer);
      grow();
    }
  });

  /* احتياط: إن أُعيد تحميل الصفحة بعد المفاجأة، نبقى على البوابة */
  party.hidden = true;
})();
