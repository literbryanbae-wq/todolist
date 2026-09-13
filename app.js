(() => {
  'use strict';
  const YEAR = 2026;
  const STORAGE_KEY = 'haru-calendar-2026-v1';
  const now = new Date();
  const todayKey = keyOf(now);
  let selected = now.getFullYear() === YEAR ? new Date(YEAR, now.getMonth(), now.getDate()) : new Date(YEAR, 0, 1);
  let month = selected.getMonth();
  let data = {};
  let storageOkay = true;
  const $ = id => document.getElementById(id);
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      for (const [key, tasks] of Object.entries(stored)) {
        if (/^2026-\d{2}-\d{2}$/.test(key) && Array.isArray(tasks)) {
          data[key] = tasks.filter(t => t && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.done === 'boolean');
        }
      }
    }
  } catch { storageOkay = false; }
  function keyOf(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); storageOkay = true; }
    catch { storageOkay = false; }
  }
  function selectDate(date) { selected = date; month = date.getMonth(); render(); }
  function moveMonth(offset) {
    const target = month + offset;
    if (target < 0 || target > 11) return;
    selectDate(new Date(YEAR, target, Math.min(selected.getDate(), new Date(YEAR, target + 1, 0).getDate())));
  }
  function renderCalendar() {
    $('month-title').textContent = `${month + 1}월`;
    $('previous').disabled = month === 0;
    $('next').disabled = month === 11;
    $('months').replaceChildren();
    for (let i = 0; i < 12; i++) {
      const button = document.createElement('button');
      button.textContent = `${i + 1}월`;
      button.className = i === month ? 'active' : '';
      button.setAttribute('aria-pressed', String(i === month));
      button.addEventListener('click', () => moveMonth(i - month));
      $('months').append(button);
    }
    $('calendar').replaceChildren();
    const firstDay = new Date(YEAR, month, 1).getDay();
    const total = Math.ceil((firstDay + new Date(YEAR, month + 1, 0).getDate()) / 7) * 7;
    for (let i = 0; i < total; i++) {
      const date = new Date(YEAR, month, i - firstDay + 1);
      const key = keyOf(date);
      const tasks = data[key] || [];
      const button = document.createElement('button');
      button.className = `day${date.getMonth() !== month ? ' outside' : ''}${key === keyOf(selected) ? ' selected' : ''}${key === todayKey ? ' is-today' : ''}`;
      button.disabled = date.getFullYear() !== YEAR;
      button.setAttribute('aria-label', `${date.getMonth() + 1}월 ${date.getDate()}일, 할 일 ${tasks.length}개`);
      button.setAttribute('aria-pressed', String(key === keyOf(selected)));
      if (key === todayKey) button.setAttribute('aria-current', 'date');
      const number = document.createElement('span');
      number.className = 'day-number'; number.textContent = date.getDate(); button.append(number);
      if (tasks.length) {
        const preview = document.createElement('span');
        preview.className = 'day-preview'; preview.textContent = tasks.find(t => !t.done)?.text || tasks[0].text;
        button.append(preview);
        if (tasks.length > 1) { const more = document.createElement('span'); more.className = 'day-more'; more.textContent = `+${tasks.length - 1}`; button.append(more); }
      }
      button.addEventListener('click', () => selectDate(date));
      $('calendar').append(button);
    }
  }
  function renderTasks() {
    const key = keyOf(selected);
    const tasks = data[key] || [];
    const completed = tasks.filter(t => t.done).length;
    const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
    $('selected-title').textContent = `${month + 1}월 ${selected.getDate()}일`;
    $('day-label').textContent = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][selected.getDay()];
    $('date-caption').textContent = key === todayKey ? '오늘, 작은 일부터 하나씩 시작해보세요.' : '이날의 계획을 하나씩 채워보세요.';
    $('progress-text').textContent = `${percent}%`;
    $('progress-bar').style.width = `${percent}%`;
    $('todo-count').textContent = tasks.length;
    $('completed-count').textContent = `${completed}개 완료`;
    $('save-status').textContent = storageOkay ? '이 브라우저에 자동으로 저장됩니다' : '저장 공간에 접근할 수 없어 이번 화면에서만 유지됩니다';
    $('todo-list').replaceChildren();
    if (!tasks.length) {
      const empty = document.createElement('div'); empty.className = 'empty-state';
      empty.innerHTML = '<div class="empty-art" aria-hidden="true"><i></i><i></i><i></i></div><strong>아직 비어 있는 하루</strong><p>하고 싶은 일, 잊지 말아야 할 일.<br>첫 번째 할 일을 추가해보세요.</p>';
      $('todo-list').append(empty);
    }
    tasks.forEach(task => {
      const row = document.createElement('div'); row.className = `todo-item${task.done ? ' done' : ''}`;
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = task.done; check.id = `task-${task.id}`;
      const label = document.createElement('label'); label.htmlFor = check.id; label.textContent = task.text;
      const remove = document.createElement('button'); remove.className = 'delete-todo'; remove.textContent = '×'; remove.setAttribute('aria-label', `${task.text} 삭제`);
      check.addEventListener('change', () => { task.done = check.checked; persist(); render(); document.getElementById(check.id)?.focus(); });
      remove.addEventListener('click', () => { data[key] = tasks.filter(t => t.id !== task.id); if (!data[key].length) delete data[key]; persist(); render(); $('todo-input').focus(); });
      row.append(check, label, remove); $('todo-list').append(row);
    });
  }
  function render() { renderCalendar(); renderTasks(); }
  $('todo-form').addEventListener('submit', event => {
    event.preventDefault();
    const text = $('todo-input').value.trim();
    if (!text) { $('todo-input').focus(); return; }
    const key = keyOf(selected);
    (data[key] ||= []).push({ id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, text, done: false });
    $('todo-input').value = ''; persist(); render(); $('todo-input').focus();
  });
  $('previous').addEventListener('click', () => moveMonth(-1));
  $('next').addEventListener('click', () => moveMonth(1));
  $('today').disabled = now.getFullYear() !== YEAR;
  if (now.getFullYear() !== YEAR) $('today').title = '2026년 날짜만 사용할 수 있습니다';
  $('today').addEventListener('click', () => selectDate(new Date(YEAR, now.getMonth(), now.getDate())));
  render();
})();
