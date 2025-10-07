const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const TILE = 32;
const COLS = canvas.width / TILE;   // 14
const ROWS = canvas.height / TILE;  // 16

const LANE_START = 3;   // 첫 도로/물길 시작 행 (위에서부터)
const LANE_END = 12;    // 마지막 도로/물길 행
const HOME_ROW = 1;     // 연못 목표 행

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
  lives: 3,
  score: 0,
  highScore: Number(localStorage.getItem('froggerHighScore') || '0'),
  running: true,
};

const hud = {
  lives: document.getElementById('lives'),
  score: document.getElementById('score'),
  high: document.getElementById('highScore'),
  restart: document.getElementById('restart'),
  mute: document.getElementById('mute'),
};
// ---- Audio ----
class Sound {
  constructor() {
    this.audioCtx = null;
    this.muted = false;
  }
  ensureContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
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
  score() {
    this.playTone(1046, 120, 'triangle', 0.06);
  }
  die() {
    this.playTone(180, 220, 'sawtooth', 0.08);
  }
  gameOver() {
    this.playTone(150, 500, 'square', 0.06);
  }
}

const sound = new Sound();


hud.high.textContent = gameState.highScore.toString();

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
    ctx.fillStyle = COLORS.frog;
    ctx.beginPath();
    ctx.arc(this.x, this.y, TILE * 0.35, 0, Math.PI * 2);
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
  }

  // 목표 도달(연못)
  if (frog.row <= HOME_ROW) {
    gameState.score += 100;
    hud.score.textContent = gameState.score.toString();
    sound.score();
    frog.reset();
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
  hud.restart.classList.remove('hidden');
  gameState.highScore = Math.max(gameState.highScore, gameState.score);
  localStorage.setItem('froggerHighScore', gameState.highScore.toString());
  hud.high.textContent = gameState.highScore.toString();
  // 중앙 메시지
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('게임 오버', canvas.width / 2, canvas.height / 2 - 12);
  ctx.font = '14px sans-serif';
  ctx.fillText('다시 시작을 누르세요', canvas.width / 2, canvas.height / 2 + 12);
}

function restart() {
  gameState.lives = 3;
  gameState.score = 0;
  hud.lives.textContent = '3';
  hud.score.textContent = '0';
  gameState.running = true;
  hud.restart.classList.add('hidden');
  frog.reset();
}

window.addEventListener('keydown', (e) => {
  if (!gameState.running && e.key === 'Enter') {
    restart();
    return;
  }
  switch (e.key) {
    case 'ArrowUp': frog.move(0, -1); break;
    case 'ArrowDown': frog.move(0, 1); break;
    case 'ArrowLeft': frog.move(-1, 0); break;
    case 'ArrowRight': frog.move(1, 0); break;
  }
});

hud.restart.addEventListener('click', restart);
hud.mute.addEventListener('click', () => {
  sound.muted = !sound.muted;
  hud.mute.textContent = sound.muted ? '🔈 소리 켜기' : '🔊 소리 끄기';
});

requestAnimationFrame(loop);

