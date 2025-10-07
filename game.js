const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let TILE = 32;
let COLS = 14;
let ROWS = 16;

const LANE_START = 3;   // 첫 도로/물길 시작 행 (위에서부터)
const LANE_END = 12;    // 마지막 도로/물길 행
const HOME_ROW = 1;     // 연못 목표 행

// 고정 크기 캔버스: HTML 속성의 width/height에 맞춰 타일 크기 계산
function recalcTile() {
  TILE = Math.floor(Math.min(canvas.width / COLS, canvas.height / ROWS));
}
recalcTile();

const COLORS = {
  background: '#10162f',
  grass: '#1f2937',
  water: '#0ea5e9',
  road: '#111827',
  frog: '#22c55e',
  car: '#ef4444',
  log: '#f59e0b',
  text: '#e5e7eb',
};

const gameState = {
  lives: 10,
  score: 0,
  highScore: Number(localStorage.getItem('froggerHighScore') || '0'),
  running: true,
  stage: 'month', // 'month' -> 'day'
  overlay: null, // null | 'over' | 'clear'
};

const hud = {
  lives: document.getElementById('lives'),
  score: document.getElementById('score'),
  high: document.getElementById('highScore'),
  restart: document.getElementById('restart'),
  mute: document.getElementById('mute'),
  stage: document.getElementById('stage'),
};
// ---- Audio ----
class Sound {
  constructor() {
    this.audioCtx = null;
    this.muted = false;
    this.bgmInterval = null;
    this.bgmActive = false;
  }
  ensureContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
  resumeIfSuspended() {
    this.ensureContext();
    if (this.audioCtx.state === 'suspended') {
      return this.audioCtx.resume();
    }
    return Promise.resolve();
  }
  playTone(freq, durationMs, type = 'sine', gain = 0.05) {
    if (this.muted) return;
    this.ensureContext();
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.connect(g).connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
  }
  move() {
    this.playTone(700, 60, 'square', 0.03);
  }
  jump() {
    // 조금 더 도약감 있는 짧은 톤
    this.playTone(820, 70, 'square', 0.04);
  }
  score() {
    this.playTone(1046, 120, 'triangle', 0.06);
  }
  die() {
    this.playTone(180, 220, 'sawtooth', 0.08);
  }
  gameOver() {
    this.playTone(150, 500, 'square', 0.06);
  }
  logMount() {
    // 통나무 탑승: 짧은 상승 이음
    this.playTone(500, 50, 'triangle', 0.035);
    setTimeout(() => this.playTone(650, 60, 'triangle', 0.035), 55);
  }
  startBgm() {
    if (this.muted || this.bgmActive) return;
    this.bgmActive = true;
    // 간단한 2음 반복 배경음
    const playLoop = () => {
      if (this.muted) return; // 음소거 시 스킵
      this.playTone(220, 160, 'sine', 0.02);
      setTimeout(() => this.playTone(277, 160, 'sine', 0.02), 200);
    };
    playLoop();
    this.bgmInterval = setInterval(playLoop, 2000);
  }
  stopBgm() {
    if (this.bgmInterval) clearInterval(this.bgmInterval);
    this.bgmInterval = null;
    this.bgmActive = false;
  }
}

const sound = new Sound();


hud.high.textContent = gameState.highScore.toString();
hud.stage.textContent = '월 선택';

class Frog {
  constructor() {
    this.reset();
  }
  reset() {
    this.col = Math.floor(COLS / 2);
    this.row = ROWS - 2;
    this.x = this.col * TILE + TILE / 2;
    this.y = this.row * TILE + TILE / 2;
    this.onLog = null; // 현재 올라탄 통나무 레퍼런스
  }
  move(dx, dy) {
    if (!gameState.running) return;
    this.col = Math.max(0, Math.min(COLS - 1, this.col + dx));
    this.row = Math.max(0, Math.min(ROWS - 1, this.row + dy));
    this.x = this.col * TILE + TILE / 2;
    this.y = this.row * TILE + TILE / 2;
    this.onLog = null;
    sound.move();
  }
  update(dt) {
    if (this.onLog) {
      this.x += this.onLog.speed * dt;
      this.col = Math.floor(this.x / TILE);
      if (this.col < 0 || this.col >= COLS) {
        this.die();
      }
    }
  }
  die() {
    gameState.lives -= 1;
    hud.lives.textContent = gameState.lives.toString();
    if (gameState.lives <= 0) {
      sound.gameOver();
      gameOver();
    } else {
      sound.die();
      this.reset();
    }
  }
  draw() {
    // 개구리 아이콘 (몸통 + 머리 + 눈)
    const r = TILE * 0.35;
    const eyeR = r * 0.22;
    const eyeOffX = r * 0.5;
    const eyeOffY = -r * 0.5;

    // 몸통(타원)
    ctx.fillStyle = COLORS.frog;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, r * 1.0, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 머리(반원)
    ctx.beginPath();
    ctx.arc(this.x, this.y - r * 0.4, r * 0.75, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    // 눈(흰자)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x - eyeOffX, this.y + eyeOffY, eyeR, 0, Math.PI * 2);
    ctx.arc(this.x + eyeOffX, this.y + eyeOffY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // 눈동자
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(this.x - eyeOffX, this.y + eyeOffY, eyeR * 0.45, 0, Math.PI * 2);
    ctx.arc(this.x + eyeOffX, this.y + eyeOffY, eyeR * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Entity {
  constructor(x, y, width, height, speed, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = speed;
    this.color = color;
  }
  update(dt) {
    this.x += this.speed * dt;
    if (this.speed > 0 && this.x - this.width / 2 > canvas.width + 40) {
      this.x = -40;
    } else if (this.speed < 0 && this.x + this.width / 2 < -40) {
      this.x = canvas.width + 40;
    }
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
  }
}

function laneY(row) {
  return row * TILE + TILE / 2;
}

function createLane(row, count, speed, kind) {
  const y = laneY(row);
  const items = [];
  for (let i = 0; i < count; i++) {
    const spacing = canvas.width / count;
    const x = i * spacing + spacing / 2;
    const width = kind === 'car' ? TILE * 1.5 : TILE * 2.4;
    const color = kind === 'car' ? COLORS.car : COLORS.log;
    items.push(new Entity(x, y, width, TILE * 0.8, speed, color));
  }
  return items;
}

const frog = new Frog();

// 도로 구간 (충돌 시 즉사)
const roadLanes = [
  { row: 10, speed: 80, count: 3, dir: 1 },
  { row: 9,  speed: -120, count: 2, dir: -1 },
  { row: 8,  speed: 100, count: 3, dir: 1 },
  { row: 7,  speed: -140, count: 3, dir: -1 },
];
const roads = roadLanes.map(l => createLane(l.row, l.count, l.speed, 'car'));

// 물길 구간 (통나무 위에 있어야 생존)
const waterLanes = [
  { row: 6, speed: 60, count: 3 },
  { row: 5, speed: -80, count: 2 },
  { row: 4, speed: 70, count: 3 },
  { row: 3, speed: -90, count: 2 },
];
const logs = waterLanes.map(l => createLane(l.row, l.count, l.speed, 'log'));

function drawBackground() {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 상단 연못
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(0, 0, canvas.width, TILE * 2);

  // 상단 집 슬롯(스테이지별 표시)
  drawHomeSlots();

  // 물길
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(0, TILE * 3, canvas.width, TILE * 4);

  // 도로
  ctx.fillStyle = COLORS.road;
  ctx.fillRect(0, TILE * 7, canvas.width, TILE * 4);

  // 하단 잔디
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, TILE * 11, canvas.width, TILE * 5);
}

function getHomeSlotConfig() {
  const slots = gameState.stage === 'month' ? 12 : 11; // days 10~20 inclusive -> 11
  const margin = TILE * 0.5;
  const slotW = (canvas.width - margin * 2) / slots;
  const slotH = TILE * 1.4;
  const y = TILE * 1.0;
  return { slots, margin, slotW, slotH, y };
}

function drawHomeSlots() {
  const { slots, margin, slotW, slotH, y } = getHomeSlotConfig();
  const labels = [];
  if (gameState.stage === 'month') {
    for (let m = 1; m <= 12; m++) labels.push(`${m}월`);
  } else {
    for (let d = 10; d <= 20; d++) labels.push(`${d}일`);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.floor(TILE * 0.5)}px sans-serif`;
  for (let i = 0; i < slots; i++) {
    const x = margin + slotW * i + slotW / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x - slotW / 2 + 4, y - slotH / 2, slotW - 8, slotH);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(labels[i], x, y);
  }
}

function getSelectedHomeIndex(frogX) {
  const { slots, margin, slotW } = getHomeSlotConfig();
  const idx = Math.floor((frogX - margin) / slotW);
  if (idx < 0 || idx >= slots) return -1;
  return idx;
}

function getHomeSlotCenterX(index) {
  const { margin, slotW } = getHomeSlotConfig();
  return margin + slotW * index + slotW / 2;
}

function aabb(x, y, w, h, px, py, pr) {
  const cx = Math.max(x - w / 2, Math.min(px, x + w / 2));
  const cy = Math.max(y - h / 2, Math.min(py, y + h / 2));
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= pr * pr;
}

function update(dt) {
  if (!gameState.running) return;

  // 이동체 업데이트
  roads.forEach(lane => lane.forEach(e => e.update(dt)));
  logs.forEach(lane => lane.forEach(e => e.update(dt)));

  const wasOnLog = !!frog.onLog;
  frog.onLog = null;

  // 도로 충돌 체크
  for (const lane of roads) {
    for (const car of lane) {
      if (aabb(car.x, car.y, car.width, car.height, frog.x, frog.y, TILE * 0.35)) {
        frog.die();
        return;
      }
    }
  }

  // 물길 생존 체크
  if (frog.row >= 3 && frog.row <= 6) {
    let onLog = false;
    for (const lane of logs) {
      for (const log of lane) {
        if (aabb(log.x, log.y, log.width, log.height, frog.x, frog.y, TILE * 0.35)) {
          onLog = true;
          frog.onLog = log;
          break;
        }
      }
      if (onLog) break;
    }
    if (!onLog) {
      frog.die();
      return;
    }
    if (!wasOnLog && onLog) {
      sound.logMount();
    }
  }

  // 목표 도달(연못)
  if (frog.row <= HOME_ROW) {
    // 스테이지 로직: 월 -> 일
    if (gameState.stage === 'month') {
      const idx = getSelectedHomeIndex(frog.x);
      const correct = 10; // 11월은 0-based index 10
      if (idx === correct) {
        gameState.score += 100;
        hud.score.textContent = gameState.score.toString();
        sound.score();
        gameState.stage = 'day';
        hud.stage.textContent = '일 선택';
      } else {
        sound.die();
        frog.die();
      }
      frog.reset();
    } else {
      // day: 10~20 -> index 0..10, 정답 16일 -> index 6
      const correct = 6;
      const idx = getSelectedHomeIndex(frog.x);
      if (idx === correct) {
        gameState.score += 300;
        hud.score.textContent = gameState.score.toString();
        sound.score();
        gameClear();
      } else {
        sound.die();
        frog.die();
        frog.reset();
      }
    }
  }

  // 상단 영역에서 개구리 위치를 슬롯 중심에 스냅하여 14칸 격자와 12/11칸 슬롯의 불일치 해소
  if (frog.row <= HOME_ROW + 1) {
    const idx = getSelectedHomeIndex(frog.x);
    if (idx >= 0) {
      frog.x = getHomeSlotCenterX(idx);
      frog.col = Math.floor(frog.x / TILE);
    }
  }

  frog.update(dt);
}

function draw() {
  drawBackground();

  // 이동체
  roads.forEach(lane => lane.forEach(e => e.draw()));
  logs.forEach(lane => lane.forEach(e => e.draw()));

  // 격자 가이드 (연한 라인)
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let r = 0; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * TILE);
    ctx.lineTo(canvas.width, r * TILE);
    ctx.stroke();
  }

  frog.draw();

  // Overlay (persistent)
  if (gameState.overlay === 'over') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('게임 오버', canvas.width / 2, canvas.height / 2 - 12);
    ctx.font = '14px sans-serif';
    ctx.fillText('다시 시작을 누르세요', canvas.width / 2, canvas.height / 2 + 12);
  } else if (gameState.overlay === 'clear') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('정답! 알함브라기타앙상블 연주회', canvas.width / 2, canvas.height / 2 - 24);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('11월 16일', canvas.width / 2, canvas.height / 2 + 6);
    ctx.font = '14px sans-serif';
    ctx.fillText('다시 시작을 누르세요', canvas.width / 2, canvas.height / 2 + 34);
    ctx.font = '15px sans-serif';
    ctx.fillText('연주회 날짜 맞추셨어요. 미션을 완료하신 분은', canvas.width / 2, canvas.height / 2 + 70);
    ctx.fillText('단톡방에 "가을단풍이 빨갛네요"라고 올려주세요', canvas.width / 2, canvas.height / 2 + 92);
  }
}

let last = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function gameOver() {
  gameState.running = false;
  gameState.overlay = 'over';
  hud.restart.classList.remove('hidden');
  gameState.highScore = Math.max(gameState.highScore, gameState.score);
  localStorage.setItem('froggerHighScore', gameState.highScore.toString());
  hud.high.textContent = gameState.highScore.toString();
}

function gameClear() {
  gameState.running = false;
  gameState.overlay = 'clear';
  hud.restart.classList.remove('hidden');
}

function restart() {
  gameState.lives = 10;
  gameState.score = 0;
  gameState.stage = 'month';
  hud.stage.textContent = '월 선택';
  hud.lives.textContent = '10';
  hud.score.textContent = '0';
  gameState.running = true;
  gameState.overlay = null;
  hud.restart.classList.add('hidden');
  frog.reset();
  sound.resumeIfSuspended().then(() => sound.startBgm());
}

window.addEventListener('keydown', (e) => {
  if (!gameState.running && e.key === 'Enter') {
    restart();
    return;
  }
  switch (e.key) {
    case 'ArrowUp': sound.jump(); frog.move(0, -1); break;
    case 'ArrowDown': frog.move(0, 1); break;
    case 'ArrowLeft': frog.move(-1, 0); break;
    case 'ArrowRight': frog.move(1, 0); break;
  }
});

hud.restart.addEventListener('click', restart);
hud.mute.addEventListener('click', () => {
  sound.muted = !sound.muted;
  hud.mute.textContent = sound.muted ? '🔈 소리 켜기' : '🔊 소리 끄기';
  if (sound.muted) {
    sound.stopBgm();
  } else {
    sound.resumeIfSuspended().then(() => sound.startBgm());
  }
});

requestAnimationFrame(loop);
// 사용자 입력 전에는 자동 재생 제한이 있으므로, 첫 키 입력 시 BGM 시작
window.addEventListener('click', () => sound.resumeIfSuspended().then(() => sound.startBgm()), { once: true });
window.addEventListener('keydown', () => sound.resumeIfSuspended().then(() => sound.startBgm()), { once: true });

