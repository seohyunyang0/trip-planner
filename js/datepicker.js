// ─────────── 키치 커스텀 날짜·시간 피커 ───────────
// 네이티브 datetime-local 대체. 숨은 input(YYYY-MM-DDTHH:mm)에 값을 쓰고
// 'change' 이벤트를 dispatch 해서 기존 app.js 로직과 100% 호환된다.
(() => {
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const pad = n => String(n).padStart(2, '0');

  function parseValue(v) {
    // "YYYY-MM-DDTHH:mm" → Date (로컬)
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v || '');
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  }
  function toValue(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function displayText(d) {
    const ampm = d.getHours() < 12 ? '오전' : '오후';
    let h12 = d.getHours() % 12; if (h12 === 0) h12 = 12;
    return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}. (${WEEKDAYS[d.getDay()]}) ${ampm} ${pad(h12)}:${pad(d.getMinutes())}`;
  }
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  function createPicker(root) {
    const hidden = root.querySelector('input[type="hidden"]');
    const trigger = root.querySelector('.dp-trigger');
    const displayEl = root.querySelector('.dp-display');

    // 현재 선택값 (없으면 다음달 1일 12:00 기준으로 초기 표시)
    let selected = parseValue(hidden.value) || new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12, 0);
    let view = new Date(selected.getFullYear(), selected.getMonth(), 1); // 표시중인 달

    if (hidden.value) displayEl.textContent = displayText(selected);

    // 팝업 DOM
    const pop = document.createElement('div');
    pop.className = 'dp-pop';
    pop.hidden = true;
    pop.innerHTML = `
      <div class="dp-head">
        <button type="button" class="dp-nav dp-prev" aria-label="이전 달">‹</button>
        <div class="dp-title"></div>
        <button type="button" class="dp-nav dp-next" aria-label="다음 달">›</button>
      </div>
      <div class="dp-weekdays">${WEEKDAYS.map((w, i) =>
        `<span class="dp-wd${i === 0 ? ' sun' : ''}${i === 6 ? ' sat' : ''}">${w}</span>`).join('')}</div>
      <div class="dp-grid"></div>
      <div class="dp-time">
        <div class="dp-ampm">
          <button type="button" data-ampm="am">오전</button>
          <button type="button" data-ampm="pm">오후</button>
        </div>
        <div class="dp-time-sel">
          <select class="dp-hour"></select>
          <span class="dp-colon">:</span>
          <select class="dp-min"></select>
        </div>
      </div>
      <div class="dp-foot">
        <button type="button" class="dp-today">오늘 ↩</button>
        <button type="button" class="dp-done">완료 ✓</button>
      </div>`;
    root.appendChild(pop);

    const titleEl = pop.querySelector('.dp-title');
    const gridEl = pop.querySelector('.dp-grid');
    const hourSel = pop.querySelector('.dp-hour');
    const minSel = pop.querySelector('.dp-min');
    const ampmBtns = pop.querySelectorAll('.dp-ampm button');

    // 시/분 옵션 채우기
    for (let h = 1; h <= 12; h++) hourSel.add(new Option(pad(h), String(h)));
    for (let m = 0; m < 60; m += 10) minSel.add(new Option(pad(m), String(m)));

    function syncTimeControls() {
      const h = selected.getHours();
      ampmBtns.forEach(b => b.classList.toggle('active', (b.dataset.ampm === 'am') === (h < 12)));
      let h12 = h % 12; if (h12 === 0) h12 = 12;
      hourSel.value = String(h12);
      // 분은 10분 단위로 스냅
      minSel.value = String(Math.round(selected.getMinutes() / 10) * 10 % 60);
    }

    function renderGrid() {
      titleEl.textContent = `${view.getFullYear()}년 ${view.getMonth() + 1}월`;
      const year = view.getFullYear(), month = view.getMonth();
      const first = new Date(year, month, 1);
      const startOffset = first.getDay(); // 일요일 시작
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const today = new Date();

      const cells = [];
      // 앞쪽 이전달 날짜
      const prevDays = new Date(year, month, 0).getDate();
      for (let i = startOffset - 1; i >= 0; i--) {
        cells.push({ day: prevDays - i, muted: true, date: new Date(year, month - 1, prevDays - i) });
      }
      for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(year, month, d) });
      // 뒤쪽 다음달 (6주 그리드 = 42칸 채우기)
      let next = 1;
      while (cells.length % 7 !== 0 || cells.length < 42) {
        cells.push({ day: next, muted: true, date: new Date(year, month + 1, next) });
        next++;
        if (cells.length >= 42) break;
      }

      gridEl.innerHTML = cells.map(c => {
        const cls = ['dp-day'];
        if (c.muted) cls.push('muted');
        if (c.date.getDay() === 0) cls.push('sun');
        if (c.date.getDay() === 6) cls.push('sat');
        if (sameDay(c.date, today)) cls.push('today');
        if (sameDay(c.date, selected)) cls.push('selected');
        return `<button type="button" class="${cls.join(' ')}" data-ts="${c.date.getTime()}">${c.day}</button>`;
      }).join('');
    }

    function commit(fireChange = true) {
      hidden.value = toValue(selected);
      displayEl.textContent = displayText(selected);
      if (fireChange) hidden.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function open() {
      // 다른 열린 피커 닫기
      document.querySelectorAll('.dp-pop').forEach(p => { if (p !== pop) p.hidden = true; });
      view = new Date(selected.getFullYear(), selected.getMonth(), 1);
      renderGrid();
      syncTimeControls();
      pop.hidden = false;
      trigger.classList.add('open');
      // 아래 공간이 부족하면 위로 펼치고, 그래도 넘치면 화면 안으로 스크롤
      pop.classList.remove('up');
      const tRect = trigger.getBoundingClientRect();
      const popH = pop.offsetHeight;
      const below = window.innerHeight - tRect.bottom;
      if (below < popH + 20 && tRect.top > below) pop.classList.add('up');
      requestAnimationFrame(() => pop.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    }
    function close() { pop.hidden = true; trigger.classList.remove('open'); }

    // ── 이벤트 ──
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      pop.hidden ? open() : close();
    });

    pop.querySelector('.dp-prev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); renderGrid(); });
    pop.querySelector('.dp-next').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); renderGrid(); });

    gridEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.dp-day');
      if (!btn) return;
      const d = new Date(+btn.dataset.ts);
      selected.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
      view = new Date(d.getFullYear(), d.getMonth(), 1);
      renderGrid();
      commit();
    });

    ampmBtns.forEach(b => b.addEventListener('click', () => {
      const wantAm = b.dataset.ampm === 'am';
      const h = selected.getHours();
      if (wantAm && h >= 12) selected.setHours(h - 12);
      else if (!wantAm && h < 12) selected.setHours(h + 12);
      syncTimeControls();
      commit();
    }));

    function applyTime() {
      let h12 = +hourSel.value % 12;
      const isPm = selected.getHours() >= 12;
      selected.setHours(isPm ? h12 + 12 : h12, +minSel.value);
      commit();
    }
    hourSel.addEventListener('change', applyTime);
    minSel.addEventListener('change', applyTime);

    pop.querySelector('.dp-today').addEventListener('click', () => {
      const now = new Date();
      selected.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      view = new Date(now.getFullYear(), now.getMonth(), 1);
      renderGrid();
      commit();
    });
    pop.querySelector('.dp-done').addEventListener('click', close);

    // 바깥 클릭 닫기
    document.addEventListener('click', (e) => {
      if (!root.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    // 외부에서 hidden.value 가 바뀌면(예: 기본값 세팅) 표시 동기화
    hidden.addEventListener('dp:sync', () => {
      const v = parseValue(hidden.value);
      if (v) { selected = v; displayEl.textContent = displayText(selected); }
    });
  }

  document.querySelectorAll('.datepicker').forEach(createPicker);
})();
