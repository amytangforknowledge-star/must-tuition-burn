/* MUST Tuition Burn · Independent open-source educational toy.
 * No analytics, backend, external APIs or automated billing.
 * Academic dates and public holidays are reference defaults, not individual schedules.
 */
(() => {
  'use strict';

  const ZONE = 'Asia/Macau';
  const KEY = 'must-tuition-burn-2026-27-v1';
  const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const SEMESTERS = [{ id: 'autumn', label: '第一学期' }, { id: 'spring', label: '第二学期' }];
  const MAX_LESSONS = 20;
  const SCHOOL_HOLIDAYS = [
    ['2026-09-26', '2026-09-26', '中秋节翌日'],
    ['2026-10-01', '2026-10-02', '国庆节及翌日'],
    ['2026-11-02', '2026-11-02', '追思节'],
    ['2026-12-08', '2026-12-08', '圣母无原罪瞻礼'],
    ['2027-02-01', '2027-02-14', '澳科大农历新年休课'],
    ['2027-03-26', '2027-03-27', '耶稣受难日及复活节前日'],
    ['2027-04-05', '2027-04-05', '清明节'],
    ['2027-05-01', '2027-05-01', '劳动节']
  ];
  // These are public-sector compensatory rest days, NOT assumed university holidays.
  const GOVERNMENT_COMPENSATORY = [
    ['2026-09-28', '2026-09-28', '政府中秋补假'],
    ['2026-10-19', '2026-10-19', '政府重阳补假'],
    ['2027-02-09', '2027-02-10', '政府农历新年补假'],
    ['2027-03-29', '2027-03-29', '政府复活节补假'],
    ['2027-05-03', '2027-05-03', '政府劳动节补假']
  ];
  const exampleRows = () => [
    { name: '课程 01', day: 1, start: '09:00', minutes: 170 },
    { name: '课程 02', day: 2, start: '14:00', minutes: 120 },
    { name: '课程 03', day: 4, start: '09:00', minutes: 170 },
    { name: '课程 04', day: 5, start: '14:00', minutes: 170 }
  ];
  const defaults = () => ({
    degree: 'undergrad', annual: 0, firstShare: 50,
    excludeOfficial: true, excludeGovRest: false, extraDates: '',
    autumn: { start: '2026-09-01', end: '2026-12-14', rows: exampleRows() },
    spring: { start: '2027-01-13', end: '2027-05-11', rows: exampleRows() }
  });
  const $ = (id) => document.getElementById(id);
  const clone = (obj) => JSON.parse(JSON.stringify(obj));
  const money = (n, digits = 2) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const integer = (n) => Math.round(n).toLocaleString('en-US');
  const pad = (n) => String(n).padStart(2, '0');
  const toMinutes = (time) => +time.slice(0, 2) * 60 + +time.slice(3);
  const timeOK = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s + 'T00:00:00Z')) && new Date(Date.parse(s + 'T00:00:00Z')).toISOString().slice(0, 10) === s;
  const stamp = (date, time) => Date.parse(date + 'T' + time + ':00+08:00');
  const mmdd = (ms) => new Intl.DateTimeFormat('zh-CN', { timeZone: ZONE, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms);
  const macauClock = (ms) => new Intl.DateTimeFormat('zh-CN', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(ms);
  const duration = (ms) => {
    const secs = Math.max(0, Math.ceil(ms / 1000));
    const days = Math.floor(secs / 86400);
    const rest = secs % 86400;
    return (days ? days + '天 ' : '') + pad(Math.floor(rest / 3600)) + ':' + pad(Math.floor(rest % 3600 / 60)) + ':' + pad(rest % 60);
  };
  function isoDates(start, end) {
    const days = [];
    const first = Date.parse(start + 'T00:00:00Z');
    const last = Date.parse(end + 'T00:00:00Z');
    for (let t = first; t <= last; t += 86400000) days.push(new Date(t).toISOString().slice(0, 10));
    return days;
  }
  function rowDefault(index) {
    const days = [1, 2, 4, 5, 3, 1, 2, 4, 5, 3, 6, 0, 1, 2, 4, 5, 3, 1, 2, 4];
    const batch = Math.floor(index / 5);
    return { name: '课程 ' + pad(index + 1), day: days[index], start: batch === 0 ? '09:00' : batch === 1 ? '17:30' : '07:00', minutes: 90 };
  }
  function sanitize(input) {
    if (!input || typeof input !== 'object') return null;
    const v = {
      degree: String(input.degree || 'undergrad'),
      annual: Number(input.annual),
      firstShare: Number(input.firstShare),
      excludeOfficial: input.excludeOfficial !== false,
      excludeGovRest: input.excludeGovRest === true,
      extraDates: typeof input.extraDates === 'string' ? input.extraDates.slice(0, 2500) : ''
    };
    if (!['undergrad', 'master', 'phd', 'other'].includes(v.degree)) v.degree = 'other';
    if (!Number.isFinite(v.annual) || v.annual < 0 || v.annual > 100000000 || !Number.isFinite(v.firstShare) || v.firstShare < 0 || v.firstShare > 100) return null;
    for (const semester of SEMESTERS) {
      const t = input[semester.id];
      if (!t || !validDate(t.start) || !validDate(t.end) || t.end < t.start) return null;
      const span = isoDates(t.start, t.end).length;
      if (span > 250 || span < 1 || !Array.isArray(t.rows) || t.rows.length > MAX_LESSONS) return null;
      const rows = [];
      for (const row of t.rows) {
        const day = Number(row.day), minutes = Number(row.minutes), start = String(row.start || '');
        if (!Number.isInteger(day) || day < 0 || day > 6 || !Number.isInteger(minutes) || minutes < 15 || minutes > 600 || !timeOK(start) || toMinutes(start) + minutes > 1440) return null;
        rows.push({ day, minutes, start, name: String(row.name || '课程').slice(0, 34) });
      }
      v[semester.id] = { start: t.start, end: t.end, rows };
    }
    if (v.autumn.end >= v.spring.start) return null;
    return v;
  }
  function load() {
    let found = null;
    if (location.hash.startsWith('#p=')) {
      try {
        const raw = decodeURIComponent(location.hash.slice(3));
        if (raw.length < 9000) found = sanitize(JSON.parse(raw));
      } catch (_) { /* malformed shared link */ }
    }
    if (!found) {
      try { found = sanitize(JSON.parse(localStorage.getItem(KEY))); } catch (_) { /* no local data */ }
    }
    return found || defaults();
  }
  function exclusions(config) {
    const map = new Map();
    const add = (range) => isoDates(range[0], range[1]).forEach(d => map.set(d, range[2]));
    if (config.excludeOfficial) SCHOOL_HOLIDAYS.forEach(add);
    if (config.excludeGovRest) GOVERNMENT_COMPENSATORY.forEach(add);
    const errors = [];
    for (const entry of config.extraDates.split(/\r?\n/)) {
      const line = entry.trim();
      if (!line) continue;
      const m = line.match(/^(\d{4}-\d{2}-\d{2})(?:\s*~\s*(\d{4}-\d{2}-\d{2}))?(?:\s+(.+))?$/);
      if (!m || !validDate(m[1]) || (m[2] && (!validDate(m[2]) || m[2] < m[1])) || (m[2] && isoDates(m[1], m[2]).length > 250)) {
        errors.push(line);
      } else {
        add([m[1], m[2] || m[1], m[3] || '个人停课']);
      }
    }
    return { map, errors };
  }
  function scheduleError(config) {
    const { errors } = exclusions(config);
    if (errors.length) return '停课日期格式错误：' + errors[0];
    for (const semester of SEMESTERS) {
      const rows = config[semester.id].rows;
      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          const a = rows[i], b = rows[j];
          if (a.day === b.day && toMinutes(a.start) < toMinutes(b.start) + b.minutes && toMinutes(b.start) < toMinutes(a.start) + a.minutes)
            return semester.label + '有时间重叠的课程，请调整';
        }
      }
    }
    return '';
  }
  let config = load();
  let edit = clone(config);
  let activeTab = 'autumn';
  let schedule = [];
  let aggregates = {};
  let simulation = null;
  let previousCents = null;
  let toastTimer = null;

  function rebuild() {
    const blocked = exclusions(config).map;
    schedule = [];
    aggregates = {};
    for (const semester of SEMESTERS) {
      const settings = config[semester.id];
      const sessions = [];
      for (const date of isoDates(settings.start, settings.end)) {
        if (blocked.has(date)) continue;
        const weekDay = new Date(date + 'T12:00:00Z').getUTCDay();
        for (const row of settings.rows) {
          if (row.day !== weekDay) continue;
          const start = stamp(date, row.start);
          sessions.push({ sem: semester.id, name: row.name, day: row.day, start, end: start + row.minutes * 60000, seconds: row.minutes * 60 });
        }
      }
      sessions.sort((a, b) => a.start - b.start);
      const totalSeconds = sessions.reduce((sum, s) => sum + s.seconds, 0);
      const fee = config.annual * (semester.id === 'autumn' ? config.firstShare : 100 - config.firstShare) / 100;
      aggregates[semester.id] = { sessions, totalSeconds, fee, rate: totalSeconds > 0 ? fee / totalSeconds : 0 };
      schedule.push(...sessions);
    }
    schedule.sort((a, b) => a.start - b.start);
    fillStats();
    tick();
  }
  function validate(configCandidate) {
    const issue = scheduleError(configCandidate);
    if (issue) return issue;
    const holidays = exclusions(configCandidate).map;
    for (const semester of SEMESTERS) {
      const term = configCandidate[semester.id];
      const numberOfSessions = isoDates(term.start, term.end).reduce((total, date) => {
        if (holidays.has(date)) return total;
        const day = new Date(date + 'T12:00:00Z').getUTCDay();
        return total + term.rows.filter(row => row.day === day).length;
      }, 0);
      const fee = configCandidate.annual * (semester.id === 'autumn' ? configCandidate.firstShare : 100 - configCandidate.firstShare) / 100;
      if (fee > 0 && numberOfSessions === 0) return semester.label + '分配了学费但没有有效授课记录，请调整比例或课表';
    }
    return '';
  }
  function setValue(id, value) { $(id).textContent = value; }
  function fillForm() {
    edit = clone(config);
    $('degree').value = edit.degree;
    $('annualFee').value = edit.annual || '';
    $('firstShare').value = edit.firstShare;
    $('officialHolidays').checked = edit.excludeOfficial;
    $('compensatoryHolidays').checked = edit.excludeGovRest;
    $('extraDates').value = edit.extraDates;
    drawTerm(activeTab);
    splitPreview();
  }
  function drawTerm(id) {
    activeTab = id;
    $('autumnTab').classList.toggle('selected', id === 'autumn');
    $('springTab').classList.toggle('selected', id === 'spring');
    $('autumnTab').setAttribute('aria-selected', String(id === 'autumn'));
    $('springTab').setAttribute('aria-selected', String(id === 'spring'));
    $('termStart').value = edit[id].start;
    $('termEnd').value = edit[id].end;
    $('weeklyCount').value = edit[id].rows.length;
    drawRows();
  }
  function drawRows() {
    const root = $('classRows');
    root.replaceChildren();
    if (!edit[activeTab].rows.length) {
      const empty = document.createElement('div'); empty.className = 'lesson-empty';
      empty.textContent = '本学期尚无排定课程。如分配了学费，则无法计算每秒的等效费率。';
      root.append(empty); return;
    }
    edit[activeTab].rows.forEach((row, i) => {
      const line = document.createElement('div');
      line.className = 'lesson-row';
      const label = document.createElement('input'); label.type = 'text'; label.maxLength = 34;
      label.value = row.name; label.setAttribute('aria-label', '第 ' + (i + 1) + ' 节课程名称');
      label.addEventListener('input', () => { row.name = label.value; });
      const day = document.createElement('select'); day.setAttribute('aria-label', '第 ' + (i + 1) + ' 节星期');
      WEEKDAYS.forEach((d, j) => { const op = document.createElement('option'); op.value = j; op.textContent = d; day.append(op); });
      day.value = row.day; day.addEventListener('change', () => { row.day = +day.value; });
      const start = document.createElement('input'); start.type = 'time'; start.value = row.start;
      start.setAttribute('aria-label', '第 ' + (i + 1) + ' 节开始时间');
      const minutes = document.createElement('input'); minutes.type = 'number'; minutes.min = '15'; minutes.max = '600'; minutes.step = '5';
      minutes.value = row.minutes; minutes.setAttribute('aria-label', '第 ' + (i + 1) + ' 节分钟数');
      const end = document.createElement('output');
      const updateEnd = () => {
        const n = +minutes.value;
        if (timeOK(start.value) && Number.isInteger(n) && n >= 15 && n <= 600) {
          end.textContent = toMinutes(start.value) + n <= 1440 ? pad(Math.floor((toMinutes(start.value) + n) / 60)) + ':' + pad((toMinutes(start.value) + n) % 60) : '跨日';
        } else end.textContent = '待定';
      };
      start.addEventListener('input', () => { row.start = start.value; updateEnd(); });
      minutes.addEventListener('input', () => { row.minutes = +minutes.value; updateEnd(); });
      updateEnd(); line.append(label, day, start, minutes, end); root.append(line);
    });
  }
  function splitPreview() {
    const n = Number($('annualFee').value) || 0;
    const ratio = Number($('firstShare').value) || 0;
    setValue('splitHint', '第一学期 MOP ' + money(n * ratio / 100, 2) + ' · 第二学期 MOP ' + money(n * (100 - ratio) / 100, 2) + '。仅作为课堂时间折算。');
  }
  function readForm() {
    edit.degree = $('degree').value;
    edit.annual = $('annualFee').value === '' ? 0 : Number($('annualFee').value);
    edit.firstShare = Number($('firstShare').value);
    edit.excludeOfficial = $('officialHolidays').checked;
    edit.excludeGovRest = $('compensatoryHolidays').checked;
    edit.extraDates = $('extraDates').value;
    const next = sanitize(edit);
    if (!next) { toast('学费、日期或课时不合法。请检查各项输入（单节 15–600 分钟）'); return null; }
    const error = validate(next);
    if (error) { toast(error); return null; }
    return next;
  }
  function apply(remember) {
    const next = readForm(); if (!next) return false;
    config = next; simulation = null; updateDemo(); rebuild();
    if (remember) {
      try { localStorage.setItem(KEY, JSON.stringify(config)); } catch (_) { /* storage disabled */ }
      setValue('saveStatus', '已保存到当前浏览器 · 不上传服务器');
    }
    toast(remember ? '设置已保存，正在按澳门时间计时' : '已经重新计算（未保存到浏览器）');
    return true;
  }
  function fillStats() {
    const totalSeconds = (aggregates.autumn?.totalSeconds || 0) + (aggregates.spring?.totalSeconds || 0);
    const totalLessons = schedule.length;
    setValue('lessonTotal', integer(totalLessons) + ' 节');
    setValue('totalHours', (totalSeconds / 3600).toFixed(1) + ' h');
    setValue('budgetLabel', config.annual ? 'MOP ' + money(config.annual, 0) : 'MOP —');
    setValue('autumnStats', `${aggregates.autumn.sessions.length} 节 / ${(aggregates.autumn.totalSeconds / 3600).toFixed(1)} 小时`);
    setValue('springStats', `${aggregates.spring.sessions.length} 节 / ${(aggregates.spring.totalSeconds / 3600).toFixed(1)} 小时`);
    const labels = { undergrad: '本科', master: '硕士', phd: '博士', other: '其他' };
    setValue('degreeLabel', labels[config.degree] + ' · 2026/27');
    const list = $('scheduleSummary'); list.replaceChildren();
    for (const semester of SEMESTERS) {
      const r = aggregates[semester.id];
      const item = document.createElement('div'); const title = document.createElement('span'); const value = document.createElement('b');
      title.textContent = semester.label + ' · ' + config[semester.id].start.slice(5) + '—' + config[semester.id].end.slice(5);
      value.textContent = r.sessions.length + ' 节 / ' + (r.totalSeconds / 3600).toFixed(1) + ' 小时';
      item.append(title, value); list.append(item);
    }
    const excluded = exclusions(config).map;
    const excludedCount = [...excluded.keys()].filter(d => SEMESTERS.some(s => d >= config[s.id].start && d <= config[s.id].end)).length;
    const row = document.createElement('div'); const left = document.createElement('span'); const right = document.createElement('b');
    left.textContent = '排除的整日日期（含无课日）'; right.textContent = excludedCount + ' 天'; row.append(left, right); list.append(row);
  }
  function tick() {
    const real = Date.now();
    const now = simulation ? simulation.start + (real - simulation.real) * 20 : real;
    let burned = 0, elapsedSeconds = 0, finished = 0, active = null, next = null;
    for (const s of schedule) {
      const used = Math.min(s.seconds, Math.max(0, (now - s.start) / 1000));
      elapsedSeconds += used;
      burned += used * aggregates[s.sem].rate;
      if (now >= s.end) finished++;
      else if (now >= s.start && now < s.end) active = s;
      else if (now < s.start && !next) next = s;
    }
    burned = Math.min(config.annual, Math.max(0, burned));
    const currentSemester = active ? active.sem : next ? next.sem : now >= stamp(config.spring.start, '00:00') ? 'spring' : 'autumn';
    const rate = aggregates[currentSemester].rate;
    const cents = Math.round(burned * 100);
    setValue('costNumber', money(burned));
    $('costNumber').classList.toggle('flash', Boolean(active && config.annual && cents !== previousCents));
    previousCents = cents;
    setValue('remainingLabel', config.annual ? 'MOP ' + money(Math.max(0, config.annual - burned)) : 'MOP —');
    setValue('secondRate', config.annual ? 'MOP ' + money(rate, 5) : 'MOP —');
    setValue('minuteRate', config.annual ? 'MOP ' + money(rate * 60, 3) : 'MOP —');
    setValue('elapsedClass', integer(Math.floor(elapsedSeconds / 3600)) + ' 小时 ' + pad(Math.floor(elapsedSeconds % 3600 / 60)) + ' 分');
    setValue('completedLessons', finished + ' 节已完成');
    const progress = config.annual > 0 ? Math.min(100, Math.max(0, burned / config.annual * 100)) : 0;
    setValue('progressPct', progress.toFixed(1) + '%');
    $('yearProgress').style.width = progress + '%';
    setValue('macauClock', macauClock(now));
    const state = $('statusDot'); state.className = active ? (simulation ? 'demo' : 'active') : '';
    const card = $('burnCard');
    if (active) {
      setValue('countLabel', '距离本节课下课');
      setValue('timeState', 'IN CLASS');
      setValue('countdown', duration(active.end - now));
      setValue('countHint', active.name + ' · ' + WEEKDAYS[active.day] + ' · ' + mmdd(active.start) + ' 开始');
      setValue('classDuration', '本节 ' + (active.seconds / 60) + ' 分钟');
      $('classProgress').style.width = Math.max(0, Math.min(100, (now - active.start) / (active.end - active.start) * 100)) + '%';
      setValue('costState', config.annual > 0 ? '● BURNING' : 'NEED FEE');
      setValue('burnText', config.annual > 0 ? '正在以 MOP ' + money(rate, 5) + ' / 秒折算' : '已开始上课，请先在下方填写本人学费');
      setValue('statusText', simulation ? '模拟课堂中' : '正在上课');
      setValue('nextInfo', '当前课程：' + active.name + ' · ' + mmdd(active.end) + ' 下课（澳门时间）');
      card.classList.toggle('paused', !config.annual);
    } else if (next) {
      setValue('countLabel', '距离下一节课'); setValue('timeState', 'NEXT CLASS');
      setValue('countdown', duration(next.start - now));
      setValue('countHint', next.name + ' · ' + WEEKDAYS[next.day] + ' · ' + mmdd(next.start) + ' 开始');
      setValue('classDuration', '下节 ' + next.seconds / 60 + ' 分钟');
      $('classProgress').style.width = '0%'; setValue('costState', 'PAUSED');
      setValue('burnText', config.annual > 0 ? '不在课表时间内，金额暂停增长' : '先填写你的本学年学费，即可开始折算');
      setValue('statusText', '等待上课');
      setValue('nextInfo', '下一节：' + next.name + ' · ' + mmdd(next.start) + '（澳门时间）');
      card.classList.add('paused');
    } else {
      setValue('countLabel', '本学年已无排定课程'); setValue('timeState', 'COMPLETE');
      setValue('countdown', '00:00:00');
      setValue('countHint', schedule.length ? '本学年课表全部结束' : '本学年没有有效课程，请调整课表');
      setValue('classDuration', '全年课时已结算');
      $('classProgress').style.width = '100%';
      setValue('costState', 'STOPPED');
      setValue('burnText', config.annual > 0 ? '没有正在进行的课程，金额已停止增长' : '没有填写学费，不进行金额计算');
      setValue('statusText', '未在授课期');
      setValue('nextInfo', '本学年已无后续课程');
      card.classList.add('paused');
    }
  }
  function updateDemo() {
    setValue('demoBtn', simulation ? '■ 退出演示' : '▶ 20× 演示');
    $('demoBanner').classList.toggle('visible', Boolean(simulation));
  }
  function demo() {
    if (simulation) { simulation = null; updateDemo(); tick(); toast('已返回真实澳门时间'); return; }
    if (!config.annual) { toast('先输入并保存你要折算的学费金额，才能演示学费燃烧'); $('annualFee').focus(); return; }
    const start = schedule.find(s => s.start <= Date.now() && s.end > Date.now()) || schedule.find(s => s.start > Date.now()) || schedule[0];
    if (!start) { toast('没有有效课堂，无法演示'); return; }
    simulation = { start: start.start + 30000, real: Date.now() };
    updateDemo(); tick(); toast('虚拟课堂已开启（20× 时间速度）');
  }
  function toast(message) {
    const target = $('toast'); target.textContent = message; target.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => target.classList.remove('show'), 3500);
  }
  async function copyText(value) {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return true; }
      const target = document.createElement('textarea'); target.value = value; target.style.position = 'fixed'; target.style.opacity = '0'; document.body.append(target); target.select();
      const ok = document.execCommand('copy'); target.remove(); return ok;
    } catch (_) { return false; }
  }
  function shareURL(withConfig) {
    if (location.protocol === 'file:') return null;
    return location.origin + location.pathname + (withConfig ? '#p=' + encodeURIComponent(JSON.stringify(config)) : '');
  }
  async function share(withConfig) {
    const url = shareURL(withConfig);
    if (!url) { toast('本地 HTML 尚无可分享网址：请先部署至 GitHub Pages'); return; }
    if (withConfig && !confirm('个人配置链接包含你填写的学费、课程时间和名称。确认愿意将这些信息分享给任何拥有链接的人吗？')) return;
    const copied = await copyText(url);
    if (copied) { $('shareDialog').close(); toast(withConfig ? '个人配置链接已复制，包含课表和学费' : '公开网站链接已复制'); }
    else toast('自动复制失败，请使用地址栏复制：' + url);
  }
  $('autumnTab').addEventListener('click', () => drawTerm('autumn'));
  $('springTab').addEventListener('click', () => drawTerm('spring'));
  $('weeklyCount').addEventListener('change', () => {
    const n = Number($('weeklyCount').value);
    if (!Number.isInteger(n) || n < 0 || n > MAX_LESSONS) { toast('每周课程数请输入 0–20'); $('weeklyCount').value = edit[activeTab].rows.length; return; }
    const rows = edit[activeTab].rows;
    while (rows.length < n) rows.push(rowDefault(rows.length));
    rows.length = n;
    drawRows();
  });
  $('termStart').addEventListener('input', () => { edit[activeTab].start = $('termStart').value; });
  $('termEnd').addEventListener('input', () => { edit[activeTab].end = $('termEnd').value; });
  $('copyTermBtn').addEventListener('click', () => {
    const other = activeTab === 'autumn' ? 'spring' : 'autumn';
    edit[other].rows = clone(edit[activeTab].rows);
    toast('已将当前周课表复制到' + (other === 'autumn' ? '第一' : '第二') + '学期（不改变该学期日期），保存后生效');
  });
  $('annualFee').addEventListener('input', splitPreview);
  $('firstShare').addEventListener('input', splitPreview);
  $('calculateBtn').addEventListener('click', () => apply(false));
  $('saveBtn').addEventListener('click', () => apply(true));
  $('resetBtn').addEventListener('click', () => {
    if (!confirm('确认恢复空白学费与示例课表？当前本地保存的设置将被清除。')) return;
    config = defaults(); simulation = null; updateDemo();
    try { localStorage.removeItem(KEY); } catch (_) { }
    fillForm(); rebuild(); toast('已重置：学费需要重新填写');
  });
  $('demoBtn').addEventListener('click', demo);
  $('shareBtn').addEventListener('click', () => $('shareDialog').showModal());
  $('closeShare').addEventListener('click', () => $('shareDialog').close());
  $('copySiteLink').addEventListener('click', () => share(false));
  $('copyConfigLink').addEventListener('click', () => share(true));
  $('shareDialog').addEventListener('click', (e) => { if (e.target === $('shareDialog')) $('shareDialog').close(); });
  window.addEventListener('hashchange', () => {
    if (location.hash.startsWith('#p=')) {
      const received = load(); if (!received) return;
      config = received; simulation = null; updateDemo(); fillForm(); rebuild(); toast('已载入分享课表，请检查其中的学费数据');
    }
  });
  fillForm(); rebuild(); setInterval(tick, 150);
})();