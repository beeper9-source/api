const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// 이미지 로드
const treeImage = new Image();
treeImage.src = 'tree.JPG';

// 이미지 로드 완료 이벤트
treeImage.onload = function() {
  console.log('Tree image loaded successfully');
  // 검정색 배경 제거 처리
  removeBlackBackground(treeImage);
  
  // 추가 배경 제거 (더 강력한 방법)
  setTimeout(() => {
    removeBackgroundAdvanced(treeImage);
  }, 100);
};

treeImage.onerror = function() {
  console.log('Failed to load tree image, using fallback design');
};

// 검정색 배경을 제거하는 함수
function removeBlackBackground(image) {
  // 임시 캔버스 생성
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  tempCanvas.width = image.width;
  tempCanvas.height = image.height;
  
  // 이미지를 임시 캔버스에 그리기
  tempCtx.drawImage(image, 0, 0);
  
  // 이미지 데이터 가져오기
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;
  
  // 픽셀별로 검정색 배경 제거
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];     // Red
    const g = data[i + 1]; // Green
    const b = data[i + 2]; // Blue
    const a = data[i + 3]; // Alpha
    
    // 더 넓은 범위의 검정색 판정
    const isPureBlack = r === 0 && g === 0 && b === 0; // 완전한 검정색
    const isVeryDark = r <= 60 && g <= 60 && b <= 60; // 매우 어두운 색상 (범위 확대)
    const isDark = r <= 100 && g <= 100 && b <= 100; // 어두운 색상 (범위 확대)
    const isBlackish = (r + g + b) <= 180; // 전체적으로 어두운 색상 (범위 확대)
    const isGrayish = Math.abs(r - g) <= 20 && Math.abs(g - b) <= 20 && Math.abs(r - b) <= 20; // 회색조
    
    // 검정색 배경 제거 로직
    if (isPureBlack) {
      data[i + 3] = 0; // 완전 투명
    } else if (isVeryDark && isBlackish) {
      data[i + 3] = 0; // 완전 투명
    } else if (isDark && isBlackish && isGrayish) {
      data[i + 3] = 0; // 완전 투명
    } else if (isDark && isBlackish) {
      data[i + 3] = Math.max(0, a - 150); // 매우 투명하게
    } else if (isDark) {
      data[i + 3] = Math.max(0, a - 80); // 투명하게
    }
    
    // 추가: 가장자리 픽셀도 처리 (배경일 가능성이 높음)
    const pixelIndex = i / 4;
    const x = pixelIndex % tempCanvas.width;
    const y = Math.floor(pixelIndex / tempCanvas.width);
    const isEdge = x < 5 || x > tempCanvas.width - 5 || y < 5 || y > tempCanvas.height - 5;
    
    if (isEdge && isDark) {
      data[i + 3] = 0; // 가장자리의 어두운 픽셀도 투명하게
    }
  }
  
  // 수정된 이미지 데이터를 다시 캔버스에 그리기
  tempCtx.putImageData(imageData, 0, 0);
  
  // 원본 이미지의 src를 수정된 캔버스의 데이터 URL로 변경
  treeImage.src = tempCanvas.toDataURL();
  
  console.log('Black background removed from tree image with improved algorithm');
}

// 고급 배경 제거 함수 (색상 기반 마스킹)
function removeBackgroundAdvanced(image) {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  tempCanvas.width = image.width;
  tempCanvas.height = image.height;
  
  tempCtx.drawImage(image, 0, 0);
  
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;
  
  // 색상 히스토그램 분석
  const colorCounts = {};
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.floor(data[i] / 10) * 10;
    const g = Math.floor(data[i + 1] / 10) * 10;
    const b = Math.floor(data[i + 2] / 10) * 10;
    const colorKey = `${r},${g},${b}`;
    colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
  }
  
  // 가장 많이 나타나는 어두운 색상들을 배경으로 간주
  const sortedColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // 상위 10개 색상
  
  const backgroundColors = [];
  sortedColors.forEach(([colorKey, count]) => {
    const [r, g, b] = colorKey.split(',').map(Number);
    const totalPixels = tempCanvas.width * tempCanvas.height;
    const percentage = (count / totalPixels) * 100;
    
    // 어두운 색상이고 전체의 5% 이상을 차지하면 배경으로 간주
    if (r <= 120 && g <= 120 && b <= 120 && percentage > 5) {
      backgroundColors.push({r, g, b, threshold: 30});
    }
  });
  
  console.log('Detected background colors:', backgroundColors);
  
  // 배경 색상들을 투명하게 처리
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    let isBackground = false;
    
    // 각 배경 색상과 비교
    backgroundColors.forEach(bgColor => {
      const distance = Math.sqrt(
        Math.pow(r - bgColor.r, 2) + 
        Math.pow(g - bgColor.g, 2) + 
        Math.pow(b - bgColor.b, 2)
      );
      
      if (distance <= bgColor.threshold) {
        isBackground = true;
      }
    });
    
    // 추가 조건: 가장자리 픽셀과 어두운 색상
    const pixelIndex = i / 4;
    const x = pixelIndex % tempCanvas.width;
    const y = Math.floor(pixelIndex / tempCanvas.width);
    const isEdge = x < 10 || x > tempCanvas.width - 10 || y < 10 || y > tempCanvas.height - 10;
    
    if (isBackground || (isEdge && r <= 150 && g <= 150 && b <= 150)) {
      data[i + 3] = 0; // 완전 투명
    }
  }
  
  tempCtx.putImageData(imageData, 0, 0);
  treeImage.src = tempCanvas.toDataURL();
  
  console.log('Advanced background removal completed');
}

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
const finalMessage = document.getElementById('finalMessage');
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
    this.col = Math.floor(COLS / 4); // 중앙에서 왼쪽으로 이동 (1/4 위치)
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
  constructor(x, y, width, height, speed, color, type = 'car') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = speed;
    this.color = color;
    this.type = type;
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
    if (this.type === 'log') {
      this.drawLog();
    } else {
      this.drawCar();
    }
  }
  
  drawLog() {
    const radius = this.height / 2;
    const centerX = this.x;
    const centerY = this.y;
    const logLength = this.width;
    
    // 이미지가 로드되었는지 확인
    if (treeImage.complete && treeImage.naturalWidth > 0) {
      // 통나무 그림자 (물에 비친 그림자)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(centerX + 3, centerY + radius + 2, logLength / 2, radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // tree.JPG 이미지를 통나무로 사용
      ctx.drawImage(
        treeImage,
        centerX - logLength / 2,
        centerY - radius,
        logLength,
        this.height
      );
      
      // 통나무 테두리 (선택사항)
      ctx.strokeStyle = 'rgba(101, 67, 33, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, logLength / 2, radius, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // 이미지가 로드되지 않았을 때는 기존 디자인 사용
      this.drawLogFallback();
    }
  }
  
  drawLogFallback() {
    const radius = this.height / 2;
    const centerX = this.x;
    const centerY = this.y;
    const logLength = this.width;
    
    // 통나무 그림자 (물에 비친 그림자)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(centerX + 3, centerY + radius + 2, logLength / 2, radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 통나무 본체 - 긴 원통형
    const gradient = ctx.createLinearGradient(centerX - logLength / 2, centerY, centerX + logLength / 2, centerY);
    gradient.addColorStop(0, '#8B4513');  // 갈색
    gradient.addColorStop(0.2, '#A0522D'); // 밝은 갈색
    gradient.addColorStop(0.5, '#CD853F'); // 더 밝은 갈색 (중앙)
    gradient.addColorStop(0.8, '#A0522D'); // 밝은 갈색
    gradient.addColorStop(1, '#654321');   // 어두운 갈색
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, logLength / 2, radius, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 통나무 양끝 원형 단면
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.arc(centerX - logLength / 2, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + logLength / 2, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 양끝 단면의 나이테
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.8)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 4; i++) {
      const ringRadius = radius * (i / 5);
      // 왼쪽 단면
      ctx.beginPath();
      ctx.arc(centerX - logLength / 2, centerY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      // 오른쪽 단면
      ctx.beginPath();
      ctx.arc(centerX + logLength / 2, centerY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // 통나무 측면 테두리
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, logLength / 2, radius, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // 통나무 측면 나무 결 (세로 줄무늬)
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const lineX = centerX - logLength / 3 + (logLength / 2.5) * i;
      ctx.beginPath();
      ctx.moveTo(lineX, centerY - radius * 0.9);
      ctx.lineTo(lineX, centerY + radius * 0.9);
      ctx.stroke();
    }
    
    // 통나무 표면의 나무 결 (가로 줄무늬)
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.3)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      const lineY = centerY - radius * 0.6 + (radius * 0.6) * i;
      ctx.beginPath();
      ctx.moveTo(centerX - logLength / 2.2, lineY);
      ctx.lineTo(centerX + logLength / 2.2, lineY);
      ctx.stroke();
    }
    
    // 통나무 표면의 하이라이트 (물에 젖은 느낌)
    const highlightGradient = ctx.createLinearGradient(centerX - logLength / 2, centerY - radius, centerX - logLength / 2, centerY + radius);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
    
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, logLength / 2, radius, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 통나무 끝부분의 나무 껍질 텍스처
    ctx.fillStyle = 'rgba(101, 67, 33, 0.3)';
    ctx.beginPath();
    ctx.ellipse(centerX - logLength / 2, centerY, radius * 0.8, radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(centerX + logLength / 2, centerY, radius * 0.8, radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  drawCar() {
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
    items.push(new Entity(x, y, width, TILE * 0.8, speed, color, kind));
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

  // 상단 연못 - 강물 그라데이션과 물결 패턴
  drawWaterArea(0, 0, canvas.width, TILE * 2);

  // 상단 집 슬롯(스테이지별 표시)
  drawHomeSlots();

  // 물길 - 강물 그라데이션과 물결 패턴
  drawWaterArea(0, TILE * 3, canvas.width, TILE * 4);

  // 도로
  ctx.fillStyle = COLORS.road;
  ctx.fillRect(0, TILE * 7, canvas.width, TILE * 4);

  // 하단 잔디
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, TILE * 11, canvas.width, TILE * 5);
}

function drawWaterArea(x, y, width, height) {
  // 물 그라데이션 배경
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, '#0ea5e9');  // 밝은 파란색 (수면)
  gradient.addColorStop(0.5, '#0284c7'); // 중간 파란색
  gradient.addColorStop(1, '#0369a1');   // 어두운 파란색 (깊은 곳)
  
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
  
  // 물결 패턴 추가
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  
  for (let i = 0; i < 3; i++) {
    const waveY = y + (height / 3) * (i + 1);
    const amplitude = 8;
    const frequency = 0.02;
    
    ctx.beginPath();
    for (let waveX = x; waveX < x + width; waveX += 2) {
      const waveOffset = Math.sin(waveX * frequency + Date.now() * 0.001) * amplitude;
      if (waveX === x) {
        ctx.moveTo(waveX, waveY + waveOffset);
      } else {
        ctx.lineTo(waveX, waveY + waveOffset);
      }
    }
    ctx.stroke();
  }
  
  // 물 표면 반짝임 효과
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let i = 0; i < 8; i++) {
    const sparkleX = x + Math.random() * width;
    const sparkleY = y + Math.random() * height;
    const sparkleSize = Math.random() * 3 + 1;
    
    ctx.beginPath();
    ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
    ctx.fill();
  }
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
    // 하단 DOM 오버레이는 별도로 표시
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
  if (finalMessage) finalMessage.classList.add('hidden');
  gameState.highScore = Math.max(gameState.highScore, gameState.score);
  localStorage.setItem('froggerHighScore', gameState.highScore.toString());
  hud.high.textContent = gameState.highScore.toString();
}

function gameClear() {
  gameState.running = false;
  gameState.overlay = 'clear';
  hud.restart.classList.remove('hidden');
  if (finalMessage) finalMessage.classList.remove('hidden');
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
  if (finalMessage) finalMessage.classList.add('hidden');
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

// 모바일용 가상 키보드 이벤트 핸들러
const virtualKeys = {
  keyUp: document.getElementById('keyUp'),
  keyDown: document.getElementById('keyDown'),
  keyLeft: document.getElementById('keyLeft'),
  keyRight: document.getElementById('keyRight')
};

// 가상 키보드 버튼 이벤트 추가
virtualKeys.keyUp.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (gameState.running) {
    sound.jump();
    frog.move(0, -1);
  }
});

virtualKeys.keyDown.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (gameState.running) {
    frog.move(0, 1);
  }
});

virtualKeys.keyLeft.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (gameState.running) {
    frog.move(-1, 0);
  }
});

virtualKeys.keyRight.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (gameState.running) {
    frog.move(1, 0);
  }
});

// 마우스 클릭 이벤트도 추가 (데스크톱에서도 사용 가능)
virtualKeys.keyUp.addEventListener('click', (e) => {
  e.preventDefault();
  if (gameState.running) {
    sound.jump();
    frog.move(0, -1);
  }
});

virtualKeys.keyDown.addEventListener('click', (e) => {
  e.preventDefault();
  if (gameState.running) {
    frog.move(0, 1);
  }
});

virtualKeys.keyLeft.addEventListener('click', (e) => {
  e.preventDefault();
  if (gameState.running) {
    frog.move(-1, 0);
  }
});

virtualKeys.keyRight.addEventListener('click', (e) => {
  e.preventDefault();
  if (gameState.running) {
    frog.move(1, 0);
  }
});

// 터치 이벤트로 BGM 시작
virtualKeys.keyUp.addEventListener('touchstart', () => sound.resumeIfSuspended().then(() => sound.startBgm()), { once: true });
virtualKeys.keyDown.addEventListener('touchstart', () => sound.resumeIfSuspended().then(() => sound.startBgm()), { once: true });
virtualKeys.keyLeft.addEventListener('touchstart', () => sound.resumeIfSuspended().then(() => sound.startBgm()), { once: true });
virtualKeys.keyRight.addEventListener('touchstart', () => sound.resumeIfSuspended().then(() => sound.startBgm()), { once: true });

// 모바일 스와이프 제스처 지원
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  sound.resumeIfSuspended().then(() => sound.startBgm());
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  touchEndX = touch.clientX;
  touchEndY = touch.clientY;
  
  if (!gameState.running) return;
  
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  const minSwipeDistance = 30; // 최소 스와이프 거리
  
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // 수평 스와이프
    if (Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // 오른쪽 스와이프
        frog.move(1, 0);
      } else {
        // 왼쪽 스와이프
        frog.move(-1, 0);
      }
    }
  } else {
    // 수직 스와이프
    if (Math.abs(deltaY) > minSwipeDistance) {
      if (deltaY > 0) {
        // 아래쪽 스와이프
        frog.move(0, 1);
      } else {
        // 위쪽 스와이프
        sound.jump();
        frog.move(0, -1);
      }
    }
  }
}, { passive: false });

