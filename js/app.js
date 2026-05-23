const $ = s => document.querySelector(s);
const storage = {
  theme: 'dashboardTheme',
  name: 'dashboardName',
  timer: 'dashboardTimer',
  tasks: 'dashboardTasks',
  links: 'dashboardLinks',
  alarm: 'dashboardAlarmSound'
};

const els = {
  greeting: $('#greeting'),
  userName: $('#userName'),
  nameInput: $('#nameInput'),
  saveName: $('#saveNameBtn'),
  themeToggle: $('#themeToggle'),
  time: $('#time'),
  date: $('#date'),
  timer: $('#timer'),
  minutes: $('#timerMinutes'),
  start: $('#startBtn'),
  stop: $('#stopBtn'),
  reset: $('#resetBtn'),
  soundInput: $('#soundInput'),
  soundHint: $('#soundHint'),
  taskInput: $('#taskInput'),
  addTask: $('#addTaskBtn'),
  taskHint: $('#taskHint'),
  taskList: $('#taskList'),
  sortSelect: $('#sortSelect'),
  linkName: $('#linkName'),
  linkUrl: $('#linkUrl'),
  addLink: $('#addLinkBtn'),
  linkList: $('#linkList')
};

let timerId = null;
let remaining = 1500;
let tasks = [];
let links = [];
let alarmSound = null;
let sortMode = 'default';

const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const pad = n => String(n).padStart(2, '0');
const now = () => new Date();

function updateClock() {
  const d = now();
  els.time.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  els.date.textContent = d.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const h = d.getHours();
  const greeting = h < 4 ? 'Selamat malam' : h < 12 ? 'Selamat pagi' : h < 18 ? 'Selamat siang' : 'Selamat sore';
  els.greeting.textContent = `${greeting},`;
}

function theme(value) {
  document.documentElement.dataset.theme = value;
  els.themeToggle.checked = value === 'dark';
  save(storage.theme, value);
}

function setName(value) {
  const name = value.trim();
  if (!trimmed) {
$('#nameError').textContent = 'Nama tidak boleh kosong!'; return;
  }
  $('#nameError').textContent = ''; 
  els.userName.textContent = trimmed;
  els.nameInput.value = trimmed;
  save(storage.name, trimmed);
}

function renderTimer() {
  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  els.timer.textContent = `${pad(min)}:${pad(sec)}`;
}

function playDefaultAlarm() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.5, audioCtx.currentTime + 0.02);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  oscillator.stop(audioCtx.currentTime + 0.45);
}

function playAlarm() {
  if (alarmSound) {
    const audio = new Audio(alarmSound);
    audio.volume = 0.9;
    audio.play().catch(() => {
      console.warn('Playback blocked until user interaction.');
    });
    return;
  }
  playDefaultAlarm();
}

function startTimer() {
  if (timerId) return;
  timerId = setInterval(() => {
    if (remaining <= 0) { stopTimer(); playAlarm(); return; }
    remaining -= 1; renderTimer();
  }, 1000);
}
function stopTimer() { clearInterval(timerId); timerId = null; }
function resetTimer() { stopTimer(); remaining = load(storage.timer, 25) * 60; renderTimer(); }
function setDuration(value) { const m = Math.max(1, Number(value)); save(storage.timer, m); remaining = m * 60; renderTimer(); }

function setAlarm(fileDataUrl) {
  alarmSound = fileDataUrl;
  save(storage.alarm, fileDataUrl);
  els.soundHint.textContent = 'Suara alarm tersimpan.';
}

function normalize(text) { return text.trim().toLowerCase().replace(/\s+/g, ' '); }

function getSortedTasks() {
  const copy = [...tasks];
  if (sortMode === 'az') return copy.sort((a, b) => a.text.localeCompare(b.text, 'id'));
  if (sortMode === 'za') return copy.sort((a, b) => b.text.localeCompare(a.text, 'id'));
  if (sortMode === 'active') return copy.sort((a, b) => Number(a.done) - Number(b.done));
  if (sortMode === 'done') return copy.sort((a, b) => Number(b.done) - Number(a.done));
  return copy; // default: urutan tambah
}

function renderTasks() {
  els.taskList.innerHTML = getSortedTasks().map(t => `
    <li data-id="${t.id}">
      <label><input type="checkbox" ${t.done ? 'checked' : ''}><span class="${t.done ? 'done' : ''}">${t.text}</span></label>
      <div>
        <button data-action="edit">Edit</button>
        <button data-action="delete">Hapus</button>
      </div>
    </li>
  `).join('');
}

function renderLinks() {
  els.linkList.innerHTML = links.map(l => `
    <li data-id="${l.id}">
      <a href="${l.url}" target="_blank" rel="noopener noreferrer">${l.name}</a>
      <button data-action="delete">Hapus</button>
    </li>
  `).join('');
}

function addTask() {
  const text = els.taskInput.value.trim();
  if (!text) return els.taskHint.textContent = 'Isi tugas dulu.';
  if (tasks.some(t => normalize(t.text) === normalize(text))) return els.taskHint.textContent = 'Tugas sudah ada.';
  tasks.unshift({ id: Date.now(), text, done: false });
  save(storage.tasks, tasks); els.taskInput.value = ''; els.taskHint.textContent = ''; renderTasks();
}
function updateTask(id) {
  const task = tasks.find(t => t.id == id);
  if (!task) return;
  const text = prompt('Ubah tugas:', task.text)?.trim();
  if (!text) return;
  if (tasks.some(t => t.id != id && normalize(t.text) === normalize(text))) return els.taskHint.textContent = 'Tugas sudah ada.';
  task.text = text; save(storage.tasks, tasks); els.taskHint.textContent = ''; renderTasks();
}
function toggleTask(id) { tasks = tasks.map(t => t.id == id ? { ...t, done: !t.done } : t); save(storage.tasks, tasks); renderTasks(); }
function deleteTask(id) { tasks = tasks.filter(t => t.id != id); save(storage.tasks, tasks); renderTasks(); }

function addLink() {
  const name = els.linkName.value.trim();
  const url = els.linkUrl.value.trim();
  if (!name || !url) return;
  const full = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  if (links.some(l => normalize(l.name) === normalize(name) || l.url === full)) return;
  links.unshift({ id: Date.now(), name, url: full }); save(storage.links, links); els.linkName.value = ''; els.linkUrl.value = ''; renderLinks();
}
function deleteLink(id) { links = links.filter(l => l.id != id); save(storage.links, links); renderLinks(); }

function init() {
  theme(load(storage.theme, 'light'));
  setName(load(storage.name, 'Teman'));
  alarmSound = load(storage.alarm, null);
  if (alarmSound) els.soundHint.textContent = 'Suara alarm tersimpan.';
  const duration = load(storage.timer, 25);
  els.minutes.value = duration; remaining = duration * 60; renderTimer();
  tasks = load(storage.tasks, []); links = load(storage.links, []);
  renderTasks(); renderLinks(); updateClock(); setInterval(updateClock, 1000);

  els.themeToggle.addEventListener('change', () => theme(els.themeToggle.checked ? 'dark' : 'light'));
  els.saveName.addEventListener('click', () => setName(els.nameInput.value));
  els.start.addEventListener('click', startTimer);
  els.stop.addEventListener('click', stopTimer);
  els.reset.addEventListener('click', resetTimer);
  els.minutes.addEventListener('change', e => setDuration(e.target.value));
  els.soundInput.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAlarm(reader.result);
    };
    reader.readAsDataURL(file);
  });
  $('#resetSoundBtn').addEventListener('click', () => {
    alarmSound = null;
    localStorage.removeItem(storage.alarm);
    els.soundHint.textContent = 'Kembali ke suara default.';
  });

  els.addTask.addEventListener('click', addTask);
  els.taskInput.addEventListener('keydown', e => e.key === 'Enter' && addTask());
  els.sortSelect.addEventListener('change', e => { sortMode = e.target.value; renderTasks(); });
  els.taskList.addEventListener('click', e => {
    const id = e.target.closest('li')?.dataset.id; if (!id) return;
    if (e.target.dataset.action === 'delete') deleteTask(id);
    if (e.target.dataset.action === 'edit') updateTask(id);
    if (e.target.type === 'checkbox') toggleTask(id);
  });
  els.addLink.addEventListener('click', addLink);
  els.linkUrl.addEventListener('keydown', e => e.key === 'Enter' && addLink());
  els.linkList.addEventListener('click', e => { if (e.target.dataset.action === 'delete') deleteLink(e.target.closest('li').dataset.id); });
}

init();