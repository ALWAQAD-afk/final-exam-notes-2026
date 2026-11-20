/* ==========================================================================
   الأرشيف الأكاديمي الرقمي — منطق الصفحة
   يعمل بالكامل في المتصفح. لا يُرسل أي شيء إلى أي خادم.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* بداية الجلسة تُسجَّل من أول لحظة لتحميل الصفحة (انظر الوسم في <head>) */
  const START = window.__archiveStart || Date.now();
  let clicks = 0;
  let navigations = 0;
  let preparing = false;

  document.addEventListener('click', () => { clicks += 1; }, true);

  /* ---------------------------------------------------------- تنسيق الوقت */
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  function formatDate(d) {
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function formatTime(d) {
    let h = d.getHours();
    const suffix = h >= 12 ? 'م' : 'ص';
    h = h % 12 || 12;
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return h + ':' + m + ':' + s + ' ' + suffix;
  }

  function filesLabel(n) {
    if (n === 0) return 'لا ملفات';
    if (n === 1) return 'ملف واحد';
    if (n === 2) return 'ملفان';
    if (n >= 3 && n <= 10) return n + ' ملفات';
    return n + ' ملفًا';
  }

  const CATS = {
    midterm: 'ملخصات الميد',
    final: 'ملخصات الفاينل',
    quizzes: 'الكويزات وبنوك الأسئلة',
    projects: 'المشروعات والتقارير',
    notes: 'مذكرات المحاضرات'
  };

  /* ------------------------------------------------------------ عناصر الصفحة */
  const headDate = $('#headDate');
  const list = $('#list');
  const items = $$('.item', list);
  const chips = $$('.chip');
  const searchInput = $('#searchInput');
  const sortSelect = $('#sortSelect');
  const termSelect = $('#termSelect');
  const resultCount = $('#resultCount');
  const emptyState = $('#empty');

  const selTitle = $('#selTitle');
  const selMeta = $('#selMeta');
  const reqMsg = $('#reqMsg');
  const prepareBtn = $('#prepareBtn');

  const prep = $('#prep');
  const prepFile = $('#prepFile');
  const prepBar = $('#prepBar');
  const prepBarWrap = $('#prepBarWrap');
  const prepStatus = $('#prepStatus');

  const report = $('#report');
  const reportDate = $('#reportDate');
  const rTime = $('#rTime');
  const rDuration = $('#rDuration');
  const rClicks = $('#rClicks');
  const rTarget = $('#rTarget');
  const rQuote = $('#rQuote');
  const receiptNote = $('#receiptNote');
  const blank = $('#blank');

  const now = new Date();
  headDate.textContent = formatDate(now);

  /* ------------------------------------------------------------------ الحالة */
  let selected = null;
  let category = 'all';
  let query = '';
  let sort = 'newest';
  let term = 'all';

  const norm = (s) => s
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  items.forEach((li) => {
    li.dataset.norm = norm(li.dataset.search || li.textContent);
    li.dataset.normTitle = norm(li.dataset.title);
  });

  /* ------------------------------------------------------- التصفية والترتيب */
  function render() {
    const q = norm(query);
    const visible = [];

    items.forEach((li) => {
      const matchCat = category === 'all' || li.dataset.cat === category;
      const matchTerm = term === 'all' || li.dataset.term === term;
      const matchQuery = !q || li.dataset.norm.indexOf(q) !== -1;
      const show = matchCat && matchTerm && matchQuery;
      li.hidden = !show;
      if (show) visible.push(li);
    });

    visible.sort((a, b) => {
      if (sort === 'alpha') return a.dataset.title.localeCompare(b.dataset.title, 'ar');
      const da = a.dataset.date;
      const db = b.dataset.date;
      if (da === db) return a.dataset.title.localeCompare(b.dataset.title, 'ar');
      return sort === 'newest' ? (da < db ? 1 : -1) : (da > db ? 1 : -1);
    });

    visible.forEach((li) => list.appendChild(li));

    resultCount.textContent = filesLabel(visible.length);
    emptyState.hidden = visible.length !== 0;

    if (selected && selected.hidden) clearSelection();
  }

  function setCategory(cat, chip) {
    category = cat;
    chips.forEach((c) => {
      const on = c === chip;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', String(on));
    });
    render();
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => setCategory(chip.dataset.cat, chip));
  });

  let searchTimer = 0;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      query = searchInput.value;
      render();
    }, 90);
  });
  searchInput.addEventListener('change', () => { navigations += 1; });

  sortSelect.addEventListener('change', () => {
    sort = sortSelect.value;
    navigations += 1;
    render();
  });

  termSelect.addEventListener('change', () => {
    term = termSelect.value;
    navigations += 1;
    render();
  });

  /* --------------------------------------------------------------- الاختيار */
  function clearSelection() {
    if (!selected) return;
    selected.classList.remove('is-selected');
    const btn = $('.item__pick', selected);
    if (btn) {
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = 'تحديد';
    }
    selected = null;
    selTitle.textContent = 'لم يتم تحديد ملف بعد';
    selMeta.textContent = 'اختر ملفًا من القائمة لعرض تفاصيله.';
  }

  function selectItem(li) {
    if (selected === li) return;
    clearSelection();
    selected = li;
    li.classList.add('is-selected');
    const btn = $('.item__pick', li);
    if (btn) {
      btn.setAttribute('aria-pressed', 'true');
      btn.textContent = 'محدَّد';
    }

    const meta = $('.item__meta', li);
    const cat = CATS[li.dataset.cat] || '';
    selTitle.textContent = li.dataset.title;
    selMeta.textContent = cat + ' · ' + (meta ? meta.textContent : li.dataset.file);
    reqMsg.textContent = '';
  }

  items.forEach((li) => {
    li.addEventListener('click', (e) => {
      if (e.target.closest('.item__pick') || !e.target.closest('a')) {
        selectItem(li);
      }
    });
  });

  /* ------------------------------------------------------------- التجهيز */
  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function animateBar(duration) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      function step(t) {
        const p = Math.min(1, (t - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 2.2);
        prepBar.style.width = (eased * 100).toFixed(1) + '%';
        prepBarWrap.setAttribute('aria-valuenow', String(Math.round(eased * 100)));
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  function computeSession() {
    const end = new Date();
    const seconds = Math.max(1, Math.round((end.getTime() - START) / 1000));
    return {
      end,
      seconds,
      actions: clicks + navigations,
      target: selected ? selected.dataset.title : '',
      file: selected ? selected.dataset.file : '',
      category: selected ? (CATS[selected.dataset.cat] || '') : ''
    };
  }

  async function prepare() {
    if (preparing) return;

    if (!selected) {
      reqMsg.textContent = 'يُرجى تحديد ملف من القائمة أولًا.';
      return;
    }

    preparing = true;
    reqMsg.textContent = '';
    prepareBtn.disabled = true;

    prepFile.textContent = selected.dataset.file;
    prepStatus.textContent = 'التحقق من صلاحية النسخة…';
    prepBar.style.width = '0%';
    prepBarWrap.setAttribute('aria-valuenow', '0');
    prep.hidden = false;
    document.body.style.overflow = 'hidden';

    await animateBar(3200);
    prepStatus.textContent = 'تجهيز الملف…';
    await wait(260);
    prepStatus.textContent = 'إنهاء العملية…';
    await wait(360);

    prep.hidden = true;
    showReport();
  }

  prepareBtn.addEventListener('click', prepare);

  /* ------------------------------------------------------------- التقرير */
  function showReport() {
    const s = computeSession();
    const secs = s.seconds;

    reportDate.textContent = formatDate(s.end);
    rTime.textContent = formatTime(s.end);
    rDuration.textContent = secs + ' ثانية';
    rClicks.textContent = s.actions + ' نقرة';
    rTarget.textContent = s.target + (s.category ? ' · ' + s.category : '');

    rQuote.textContent = '';
    [
      'لا يوجد ملف هنا.',
      'لم تكن المشكلة في الرابط، ولا في صعوبة المادة.',
      'لقد أمضيت ' + secs + ' ثانية وأنت تنتظر ملفًا جاهزًا ينقذك بدل أن تفتح الكتاب.',
      'الوقت الذي استغرقته حتى وصلت إلى هذه الجملة كان يكفي لقراءة الصفحة الأولى.'
    ].forEach((line) => {
      const p = document.createElement('p');
      p.textContent = line;
      rQuote.appendChild(p);
    });

    report.hidden = false;
    document.body.style.overflow = 'hidden';
    document.title = 'تقرير الجلسة — الأرشيف الأكاديمي الرقمي';
    const title = $('#reportTitle');
    if (title) title.focus({ preventScroll: true });

    report._session = s;
  }

  /* ------------------------------------------------------------- الإيصال */
  function saveReceipt() {
    const s = report._session || computeSession();
    const lines = [
      'سجل الجلسة — الأرشيف الأكاديمي الرقمي',
      '=====================================',
      '',
      'التاريخ: ' + formatDate(s.end),
      'الوقت: ' + formatTime(s.end),
      'المدة: ' + s.seconds + ' ثانية',
      'عدد المحاولات والنقرات: ' + s.actions,
      'الهدف: ' + s.target + (s.category ? ' (' + s.category + ')' : ''),
      'الملف المطلوب: ' + s.file,
      '',
      'الوقت الذي استُهلك في البحث عن طريق مختصر: ' + s.seconds + ' ثانية.',
      ''
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'session-record.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    receiptNote.textContent = 'تم حفظ الإيصال باسم session-record.txt';
    clearTimeout(saveReceipt._t);
    saveReceipt._t = setTimeout(() => { receiptNote.textContent = ''; }, 4000);
  }

  $('#saveReceipt').addEventListener('click', saveReceipt);

  /* --------------------------------------------------- إغلاق والبدء بالدراسة */
  $('#closeAndStudy').addEventListener('click', () => {
    report.hidden = true;
    blank.hidden = false;
    document.body.style.overflow = 'hidden';
    document.title = 'الكتاب أمامك.';
  });

  /* ------------------------------------------------------------------ بدء */
  render();
})();
