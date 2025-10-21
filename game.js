const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Supabase 설정
const SUPABASE_URL = 'https://dmgtwzbvpualecnrcyug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZ3R3emJ2cHVhbGVjbnJjeXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMzAzODUsImV4cCI6MjA3MjcwNjM4NX0.Cddfcij0GL3lLCZz51tALcyKULfGECyq4YNpjVh9Uf4';

// Supabase 클라이언트 초기화
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 통나무 이미지 로드
const treeImage = new Image();
treeImage.src = 'tree.JPG';

treeImage.onload = function() {
  console.log('Tree image loaded successfully for logs');
};

treeImage.onerror = function() {
  console.log('Failed to load tree image, using fallback design for logs');
};

// 트럭 이미지들 로드
const truckImages = [];
const truckImageFiles = ['truck1.JPG', 'truck2.JPG', 'truck3.JPG'];

truckImageFiles.forEach((filename, index) => {
  const truckImage = new Image();
  truckImage.src = filename;
  truckImage.onload = function() {
    console.log(`Truck image ${index + 1} loaded successfully`);
  };
  truckImage.onerror = function() {
    console.log(`Failed to load truck image ${index + 1}, using fallback design`);
  };
  truckImages.push(truckImage);
});

// 검정색 배경을 제거하는 함수
function removeBlackBackground(image) {
  try {
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
  } catch (error) {
    console.log('Background removal failed:', error);
  }
}

// 고급 배경 제거 함수 (색상 기반 마스킹)
function removeBackgroundAdvanced(image) {
  try {
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
  } catch (error) {
    console.log('Advanced background removal failed:', error);
  }
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
  water: 'rgba(0, 3, 41)',
  road: 'rgba(207, 245, 254)',
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
  stage: 'month', // 'month' -> 'day' -> 'time'
  overlay: null, // null | 'over' | 'clear'
};

const hud = {
  lives: document.getElementById('lives'),
  score: document.getElementById('score'),
  high: document.getElementById('highScore'),
  restart: document.getElementById('restart'),
  mute: document.getElementById('mute'),
  stage: document.getElementById('stage'),
  scoreboard: document.getElementById('scoreboard'),
  playerStats: document.getElementById('playerStats'),
  currentPlayer: document.getElementById('currentPlayer'),
};

// 플레이어 설정 관련 요소들
const playerSetup = document.getElementById('playerSetup');
const playerNameInput = document.getElementById('playerName');
const startGameBtn = document.getElementById('startGame');
const showRankingBeforeStartBtn = document.getElementById('showRankingBeforeStart');

// 현재 플레이어 이름 저장
let currentPlayerName = '익명';
const finalMessage = document.getElementById('finalMessage');

// 순위 팝업 관련 요소들
const rankingPopup = document.getElementById('rankingPopup');
const closeRankingBtn = document.getElementById('closeRanking');
const playAgainBtn = document.getElementById('playAgain');
const viewDetailsBtn = document.getElementById('viewDetails');

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
    // 성공 시 상승하는 멜로디
    this.playTone(523, 80, 'triangle', 0.05);  // C5
    setTimeout(() => this.playTone(659, 80, 'triangle', 0.05), 90);  // E5
    setTimeout(() => this.playTone(784, 120, 'triangle', 0.06), 180); // G5
  }
  die() {
    // 일반적인 실패 시 하강하는 음계
    this.playTone(392, 100, 'sawtooth', 0.08);  // G4
    setTimeout(() => this.playTone(349, 100, 'sawtooth', 0.08), 110); // F4
    setTimeout(() => this.playTone(294, 150, 'sawtooth', 0.08), 220); // D4
  }
  carCrash() {
    // 차에 치였을 때 충돌음
    this.playTone(180, 200, 'square', 0.1);
    setTimeout(() => this.playTone(120, 300, 'square', 0.1), 210);
  }
  wrongSlot() {
    // 잘못된 슬롯에 도착했을 때 경고음
    this.playTone(330, 100, 'triangle', 0.06);  // E4
    setTimeout(() => this.playTone(220, 150, 'triangle', 0.06), 110); // A3
  }
  gameOver() {
    // 게임 오버 시 긴 저음
    this.playTone(147, 800, 'square', 0.08);  // D3
  }
  success() {
    // 스테이지 클리어 시 특별한 성공음
    this.playTone(523, 100, 'triangle', 0.06);  // C5
    setTimeout(() => this.playTone(659, 100, 'triangle', 0.06), 110);  // E5
    setTimeout(() => this.playTone(784, 100, 'triangle', 0.06), 220);  // G5
    setTimeout(() => this.playTone(1047, 200, 'triangle', 0.08), 330); // C6
  }
  stageComplete() {
    // 스테이지 완료 시 축하음
    this.playTone(523, 80, 'triangle', 0.05);   // C5
    setTimeout(() => this.playTone(659, 80, 'triangle', 0.05), 90);   // E5
    setTimeout(() => this.playTone(784, 80, 'triangle', 0.05), 180);  // G5
    setTimeout(() => this.playTone(1047, 80, 'triangle', 0.05), 270); // C6
    setTimeout(() => this.playTone(1319, 300, 'triangle', 0.08), 360); // E6
  }
  logMount() {
    // 통나무 탑승: 안전한 착지음
    this.playTone(440, 60, 'triangle', 0.04);  // A4
    setTimeout(() => this.playTone(554, 80, 'triangle', 0.04), 70);  // C#5
  }
  waterSplash() {
    // 물에 빠질 때 물 튀는 소리
    this.playTone(200, 150, 'sawtooth', 0.06);
    setTimeout(() => this.playTone(150, 200, 'sawtooth', 0.06), 160);
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


// 점수를 Supabase DB에 저장하는 함수
async function saveScoreToDatabase(score, playerName = currentPlayerName) {
  try {
    const { data, error } = await supabase
      .from('game_scores')
      .insert([
        {
          score: score,
          player_name: playerName,
          game_date: new Date().toISOString(),
          stage_completed: gameState.stage === 'day' // 게임을 완료했는지 여부
        }
      ]);

    if (error) {
      console.error('점수 저장 오류:', error);
      return false;
    }

    console.log('점수가 성공적으로 저장되었습니다:', data);
    return true;
  } catch (err) {
    console.error('점수 저장 중 예외 발생:', err);
    return false;
  }
}

// 상위 점수들을 가져오는 함수
async function getTopScores(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('top_scores')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('점수 조회 오류:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('점수 조회 중 예외 발생:', err);
    return [];
  }
}

// 개인별 누계 성적 조회 함수
async function getPlayerStats(playerName) {
  try {
    const { data, error } = await supabase
      .from('game_scores')
      .select('*')
      .eq('player_name', playerName)
      .order('game_date', { ascending: false });

    if (error) {
      console.error('개인 성적 조회 오류:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return {
        totalGames: 0,
        totalScore: 0,
        completedGames: 0,
        averageScore: 0,
        bestScore: 0,
        recentGames: []
      };
    }

    const totalGames = data.length;
    const totalScore = data.reduce((sum, game) => sum + game.score, 0);
    const completedGames = data.filter(game => game.stage_completed).length;
    const averageScore = Math.round(totalScore / totalGames);
    const bestScore = Math.max(...data.map(game => game.score));
    const recentGames = data.slice(0, 5); // 최근 5게임

    return {
      totalGames,
      totalScore,
      completedGames,
      averageScore,
      bestScore,
      recentGames
    };
  } catch (err) {
    console.error('개인 성적 조회 중 예외 발생:', err);
    return null;
  }
}

// 전체 순위 조회 함수 (누계 점수 기준)
async function getOverallRankings() {
  try {
    const { data, error } = await supabase
      .from('game_scores')
      .select('player_name, score, stage_completed');

    if (error) {
      console.error('전체 순위 조회 오류:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 플레이어별 누계 점수 계산
    const playerTotals = {};
    data.forEach(game => {
      if (!playerTotals[game.player_name]) {
        playerTotals[game.player_name] = {
          totalScore: 0,
          totalGames: 0,
          completedGames: 0
        };
      }
      playerTotals[game.player_name].totalScore += game.score;
      playerTotals[game.player_name].totalGames += 1;
      if (game.stage_completed) {
        playerTotals[game.player_name].completedGames += 1;
      }
    });

    // 순위 정렬 (누계 점수 기준)
    const rankings = Object.entries(playerTotals)
      .map(([playerName, stats]) => ({
        playerName,
        ...stats,
        averageScore: Math.round(stats.totalScore / stats.totalGames)
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10); // 상위 10명

    return rankings;
  } catch (err) {
    console.error('전체 순위 조회 중 예외 발생:', err);
    return [];
  }
}

// 점수 보드 표시 함수
async function showScoreBoard() {
  const scores = await getTopScores(5);
  if (scores.length === 0) {
    console.log('저장된 점수가 없습니다.');
    return;
  }

  console.log('=== 상위 점수 ===');
  scores.forEach((score, index) => {
    const date = new Date(score.game_date).toLocaleDateString('ko-KR');
    const stage = score.stage_completed ? '완료' : '미완료';
    console.log(`${index + 1}위: ${score.score}점 (${score.player_name}) - ${date} - ${stage}`);
  });
}

// 순위 팝업 표시 함수
async function showRankingPopup() {
  const playerStats = await getPlayerStats(currentPlayerName);
  const overallRankings = await getOverallRankings();
  
  if (!playerStats) {
    console.log('성적 조회에 실패했습니다.');
    return;
  }

  // 개인 순위 찾기
  const playerRank = overallRankings.findIndex(rank => rank.playerName === currentPlayerName) + 1;
  
  // 플레이어 정보 업데이트
  document.getElementById('popupPlayerName').textContent = currentPlayerName;
  document.getElementById('popupPlayerRank').textContent = playerRank > 0 ? `${playerRank}위` : '순위 없음';
  document.getElementById('popupTotalScore').textContent = `${playerStats.totalScore}점`;
  document.getElementById('popupTotalGames').textContent = `${playerStats.totalGames}게임`;
  
  const completionRate = playerStats.totalGames > 0 
    ? Math.round((playerStats.completedGames / playerStats.totalGames) * 100) 
    : 0;
  document.getElementById('popupCompletionRate').textContent = `${completionRate}%`;
  
  // 순위 테이블 생성
  const rankingTable = document.getElementById('rankingTable');
  rankingTable.innerHTML = '';
  
  overallRankings.slice(0, 10).forEach((rank, index) => {
    const isCurrentPlayer = rank.playerName === currentPlayerName;
    const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
    
    const row = document.createElement('div');
    row.className = `ranking-row${isCurrentPlayer ? ' current-player' : ''}`;
    
    row.innerHTML = `
      <div class="rank-number">
        <span class="rank-medal">${rankIcon}</span> ${index + 1}
      </div>
      <div class="player-name-cell">${rank.playerName}${isCurrentPlayer ? ' 👤' : ''}</div>
      <div class="score-cell">${rank.totalScore}점</div>
      <div class="games-cell">${rank.totalGames}회</div>
      <div class="avg-cell">${rank.averageScore}점</div>
    `;
    
    rankingTable.appendChild(row);
  });
  
  // 팝업 표시
  rankingPopup.classList.remove('hidden');
  
  // 콘솔에도 출력 (백업)
  console.log('\n' + '='.repeat(50));
  console.log('🎮 게임 종료 - 누계 성적 조회');
  console.log('='.repeat(50));
  console.log(`👤 플레이어: ${currentPlayerName}`);
  console.log(`🏆 전체 순위: ${playerRank > 0 ? playerRank + '위' : '순위 없음'}`);
  console.log(`💯 누계 점수: ${playerStats.totalScore}점`);
  console.log('='.repeat(50) + '\n');
}

// 순위 팝업 닫기 함수
function closeRankingPopup() {
  rankingPopup.classList.add('hidden');
}

// 게임 시작 전 순위 보기 함수
async function showRankingBeforeStart() {
  const overallRankings = await getOverallRankings();
  
  if (overallRankings.length === 0) {
    alert('아직 저장된 점수가 없습니다.\n첫 번째 게임을 시작해보세요!');
    return;
  }

  // 플레이어 설정 화면 숨기기
  playerSetup.classList.add('hidden');
  
  // 순위 테이블 생성
  const rankingTable = document.getElementById('rankingTable');
  rankingTable.innerHTML = '';
  
  overallRankings.slice(0, 10).forEach((rank, index) => {
    const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
    
    const row = document.createElement('div');
    row.className = 'ranking-row';
    
    row.innerHTML = `
      <div class="rank-number">
        <span class="rank-medal">${rankIcon}</span> ${index + 1}
      </div>
      <div class="player-name-cell">${rank.playerName}</div>
      <div class="score-cell">${rank.totalScore}점</div>
      <div class="games-cell">${rank.totalGames}회</div>
      <div class="avg-cell">${rank.averageScore}점</div>
    `;
    
    rankingTable.appendChild(row);
  });
  
  // 플레이어 정보는 현재 플레이어가 없으므로 숨기기
  document.querySelector('.player-info').style.display = 'none';
  
  // 헤더 텍스트 변경
  document.querySelector('.ranking-header h2').textContent = '🏆 전체 순위';
  
  // 푸터 버튼 변경
  const footer = document.querySelector('.ranking-footer');
  footer.innerHTML = `
    <button id="backToSetup" class="play-again-btn">🔙 돌아가기</button>
  `;
  
  // 돌아가기 버튼 이벤트 리스너 추가
  document.getElementById('backToSetup').addEventListener('click', () => {
    rankingPopup.classList.add('hidden');
    playerSetup.classList.remove('hidden');
    playerNameInput.focus();
  });
  
  // 팝업 표시
  rankingPopup.classList.remove('hidden');
}

// 성적 조회 화면 표시 함수 (개선된 버전)
async function showPlayerStatsScreen() {
  const playerStats = await getPlayerStats(currentPlayerName);
  const overallRankings = await getOverallRankings();
  
  if (!playerStats) {
    console.log('성적 조회에 실패했습니다.');
    return;
  }

  // 개인 순위 찾기
  const playerRank = overallRankings.findIndex(rank => rank.playerName === currentPlayerName) + 1;
  
  console.log('\n' + '='.repeat(50));
  console.log('🎮 게임 종료 - 누계 성적 조회');
  console.log('='.repeat(50));
  
  // 현재 플레이어 정보
  console.log(`👤 플레이어: ${currentPlayerName}`);
  console.log(`🏆 전체 순위: ${playerRank > 0 ? playerRank + '위' : '순위 없음'}`);
  console.log(`📊 총 게임 수: ${playerStats.totalGames}게임`);
  console.log(`💯 누계 점수: ${playerStats.totalScore}점`);
  console.log(`✅ 완료한 게임: ${playerStats.completedGames}게임`);
  console.log(`📈 평균 점수: ${playerStats.averageScore}점`);
  console.log(`⭐ 최고 점수: ${playerStats.bestScore}점`);
  
  // 최근 게임 기록
  if (playerStats.recentGames.length > 0) {
    console.log('\n📋 최근 게임 기록:');
    playerStats.recentGames.forEach((game, index) => {
      const date = new Date(game.game_date).toLocaleDateString('ko-KR');
      const stage = game.stage_completed ? '✅완료' : '❌미완료';
      const medal = game.score >= 400 ? '🥇' : game.score >= 200 ? '🥈' : '🥉';
      console.log(`   ${index + 1}. ${medal} ${game.score}점 - ${date} - ${stage}`);
    });
  }
  
  // 전체 순위표
  if (overallRankings.length > 0) {
    console.log('\n🏆 전체 순위 (누계 점수 기준):');
    console.log('순위 | 플레이어명 | 누계점수 | 게임수 | 평균점수');
    console.log('-'.repeat(50));
    
    overallRankings.slice(0, 10).forEach((rank, index) => {
      const isCurrentPlayer = rank.playerName === currentPlayerName;
      const marker = isCurrentPlayer ? ' 👤' : '';
      const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      
      console.log(`${rankIcon} ${String(index + 1).padStart(2)}위 | ${rank.playerName.padEnd(8)} | ${String(rank.totalScore).padStart(6)}점 | ${String(rank.totalGames).padStart(4)}게임 | ${String(rank.averageScore).padStart(6)}점${marker}`);
    });
  }
  
  console.log('='.repeat(50));
  console.log('게임을 다시 시작하려면 "다시 시작" 버튼을 클릭하세요!');
  console.log('='.repeat(50) + '\n');
}

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
    // 통나무 탑승 상태는 move에서 초기화하지 않음 - update에서 처리
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
  async die() {
    gameState.lives -= 1;
    hud.lives.textContent = gameState.lives.toString();
    if (gameState.lives <= 0) {
      sound.gameOver();
      await gameOver();
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
    // 트럭 이미지 인덱스 (car 타입일 때만 사용)
    this.truckImageIndex = type === 'car' ? Math.floor(Math.random() * truckImages.length) : 0;
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
    // 트럭 이미지가 로드되었는지 확인
    const truckImage = truckImages[this.truckImageIndex];
    if (truckImage && truckImage.complete && truckImage.naturalWidth > 0) {
      // 트럭 이미지 그리기
      ctx.drawImage(
        truckImage,
        this.x - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height
      );
    } else {
      // 이미지가 로드되지 않았을 때는 기존 빨간색 사각형 사용
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }
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

// 도로 구간 (충돌 시 즉사) - 시간 레벨에서는 더 어렵게
const roadLanes = [
  { row: 10, speed: 80, count: 3, dir: 1 },
  { row: 9,  speed: -120, count: 2, dir: -1 },
  { row: 8,  speed: 100, count: 3, dir: 1 },
  { row: 7,  speed: -140, count: 3, dir: -1 },
];

// 시간 레벨용 어려운 도로 구간
const timeRoadLanes = [
  { row: 10, speed: 120, count: 4, dir: 1 },
  { row: 9,  speed: -160, count: 3, dir: -1 },
  { row: 8,  speed: 140, count: 4, dir: 1 },
  { row: 7,  speed: -180, count: 4, dir: -1 },
  // row 6은 이제 물길로 변경됨
];

// 물길 구간 (통나무 위에 있어야 생존) - 총 4줄
const waterLanes = [
  { row: 6, speed: 50, count: 2 },  // 첫번째 칸에 통나무 추가
  { row: 5, speed: 60, count: 3 },
  { row: 4, speed: -80, count: 2 },
  { row: 3, speed: 70, count: 3 },
  // row 2는 상단 연못과 너무 가까워서 제거
];

// 시간 레벨용 어려운 물길 구간 - 총 4줄
const timeWaterLanes = [
  { row: 6, speed: 70, count: 2 },  // 첫번째 칸에 통나무 추가
  { row: 5, speed: 90, count: 2 },
  { row: 4, speed: -110, count: 2 },
  { row: 3, speed: 100, count: 2 },
  // row 2는 상단 연못과 너무 가까워서 제거
];

// 현재 레벨에 따른 도로와 물길 설정
function initializeLanes() {
  try {
    if (gameState.stage === 'time') {
      roads = timeRoadLanes.map(l => createLane(l.row, l.count, l.speed, 'car'));
      logs = timeWaterLanes.map(l => createLane(l.row, l.count, l.speed, 'log'));
    } else {
      roads = roadLanes.map(l => createLane(l.row, l.count, l.speed, 'car'));
      logs = waterLanes.map(l => createLane(l.row, l.count, l.speed, 'log'));
    }
    console.log('Lanes initialized successfully');
  } catch (error) {
    console.error('Failed to initialize lanes:', error);
    // 기본값으로 빈 배열 설정
    roads = [];
    logs = [];
  }
}

let roads, logs;

function drawBackground() {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 상단 연못 - 강물 그라데이션과 물결 패턴
  drawWaterArea(0, 0, canvas.width, TILE * 2);

  // 상단 집 슬롯(스테이지별 표시)
  drawHomeSlots();

  // 물길 - 강물 그라데이션과 물결 패턴 (row 3-6)
  let waterStartY, waterHeight;
  if (gameState.stage === 'time') {
    waterStartY = TILE * 3;  // row 3부터 시작
    waterHeight = TILE * 4;  // row 3-6, 4칸
  } else {
    waterStartY = TILE * 3;  // row 3부터 시작
    waterHeight = TILE * 4;  // row 3-6, 4칸
  }
  drawWaterArea(0, waterStartY, canvas.width, waterHeight);

  // 도로
  let roadStartY, roadHeight;
  if (gameState.stage === 'time') {
    roadStartY = TILE * 7;  // row 7부터 시작
    roadHeight = TILE * 4;   // 시간 레벨은 도로가 더 많음
  } else {
    roadStartY = TILE * 7;  // row 7부터 시작
    roadHeight = TILE * 4;
  }
  ctx.fillStyle = COLORS.road;
  ctx.fillRect(0, roadStartY, canvas.width, roadHeight);

  // 하단 잔디
  let grassStartY;
  if (gameState.stage === 'time') {
    grassStartY = TILE * 11;
  } else {
    grassStartY = TILE * 11;
  }
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, grassStartY, canvas.width, TILE * 5);
}

function drawWaterArea(x, y, width, height) {
  // 물 배경 (단색으로 변경)
  ctx.fillStyle = COLORS.water;
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
  let slots;
  if (gameState.stage === 'month') {
    slots = 12; // 1월~12월
  } else if (gameState.stage === 'day') {
    slots = 11; // 10일~20일 inclusive
  } else if (gameState.stage === 'time') {
    slots = 12; // 1~12시
  }
  
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
  } else if (gameState.stage === 'day') {
    for (let d = 10; d <= 20; d++) labels.push(`${d}일`);
  } else if (gameState.stage === 'time') {
    for (let h = 1; h <= 12; h++) {
      labels.push(`${h}시`);
    }
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

async function update(dt) {
  if (!gameState.running) return;

  // 이동체 업데이트 (안전하게 처리)
  if (roads && Array.isArray(roads)) {
    roads.forEach(lane => {
      if (lane && Array.isArray(lane)) {
        lane.forEach(e => e.update(dt));
      }
    });
  }
  
  if (logs && Array.isArray(logs)) {
    logs.forEach(lane => {
      if (lane && Array.isArray(lane)) {
        lane.forEach(e => e.update(dt));
      }
    });
  }

  const wasOnLog = !!frog.onLog;
  // frog.onLog은 통나무 탑승 체크 후에만 초기화됨

  // 도로 충돌 체크
  if (roads && Array.isArray(roads)) {
    for (const lane of roads) {
      if (lane && Array.isArray(lane)) {
        for (const car of lane) {
          if (car && aabb(car.x, car.y, car.width, car.height, frog.x, frog.y, TILE * 0.35)) {
            sound.carCrash(); // 차 충돌 효과음
            await frog.die();
            return;
          }
        }
      }
    }
  }

  // 물길 생존 체크
  let waterStartRow, waterEndRow;
  if (gameState.stage === 'time') {
    waterStartRow = 3;  // row 3부터 시작
    waterEndRow = 6;    // row 6 포함
  } else {
    waterStartRow = 3;  // row 3부터 시작
    waterEndRow = 6;    // row 6 포함
  }
  
  // 디버깅: 현재 개구리 위치와 물길 범위 출력
  if (frog.row === 2) {
    console.log(`개구리가 row 2에 있음 - 안전한 공간 (물길 범위: ${waterStartRow}-${waterEndRow})`);
  }
  
  if (frog.row >= waterStartRow && frog.row <= waterEndRow) {
    let onLog = false;
    if (logs && Array.isArray(logs)) {
      for (const lane of logs) {
        if (lane && Array.isArray(lane)) {
          for (const log of lane) {
            if (log && aabb(log.x, log.y, log.width, log.height, frog.x, frog.y, TILE * 0.35)) {
              onLog = true;
              frog.onLog = log;
              break;
            }
          }
        }
        if (onLog) break;
      }
    }
    if (!onLog) {
      frog.onLog = null; // 통나무 탑승 상태 초기화
      sound.waterSplash(); // 물에 빠지는 효과음
      await frog.die();
      return;
    }
    if (!wasOnLog && onLog) {
      sound.logMount();
    }
  } else {
    // 물길이 아닌 곳에서는 통나무 탑승 상태 초기화
    frog.onLog = null;
  }

  // 목표 도달(연못)
  if (frog.row <= HOME_ROW) {
    // 스테이지 로직: 월 -> 일 -> 시간
    if (gameState.stage === 'month') {
      const idx = getSelectedHomeIndex(frog.x);
      const correct = 10; // 11월은 0-based index 10
      if (idx === correct) {
        gameState.score += 100;
        hud.score.textContent = gameState.score.toString();
        sound.stageComplete(); // 스테이지 완료 효과음
        gameState.stage = 'day';
        hud.stage.textContent = '일 선택';
        // 레벨 변경 시 장애물 재초기화
        initializeLanes();
      } else {
        sound.wrongSlot(); // 잘못된 슬롯 효과음
        await frog.die();
      }
      frog.reset();
    } else if (gameState.stage === 'day') {
      // day: 10~20 -> index 0..10, 정답 16일 -> index 6
      const correct = 6;
      const idx = getSelectedHomeIndex(frog.x);
      if (idx === correct) {
        gameState.score += 200;
        hud.score.textContent = gameState.score.toString();
        sound.stageComplete(); // 스테이지 완료 효과음
        gameState.stage = 'time';
        hud.stage.textContent = '시간 선택';
        // 레벨 변경 시 장애물 재초기화
        initializeLanes();
      } else {
        sound.wrongSlot(); // 잘못된 슬롯 효과음
        await frog.die();
        frog.reset();
      }
    } else if (gameState.stage === 'time') {
      // time: 1~12 -> index 0..11, 정답 3시 -> index 2
      const correct = 2;
      const idx = getSelectedHomeIndex(frog.x);
      if (idx === correct) {
        gameState.score += 500; // 시간 레벨은 더 많은 점수
        hud.score.textContent = gameState.score.toString();
        sound.success(); // 게임 완전 클리어 효과음
        await gameClear();
      } else {
        sound.wrongSlot(); // 잘못된 슬롯 효과음
        await frog.die();
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

  // 이동체 (안전하게 처리)
  if (roads && Array.isArray(roads)) {
    roads.forEach(lane => {
      if (lane && Array.isArray(lane)) {
        lane.forEach(e => e.draw());
      }
    });
  }
  
  if (logs && Array.isArray(logs)) {
    logs.forEach(lane => {
      if (lane && Array.isArray(lane)) {
        lane.forEach(e => e.draw());
      }
    });
  }

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
    ctx.fillText('11월 16일 3시', canvas.width / 2, canvas.height / 2 + 6);
    ctx.font = '14px sans-serif';
    ctx.fillText('다시 시작을 누르세요', canvas.width / 2, canvas.height / 2 + 34);
    // 하단 DOM 오버레이는 별도로 표시
  }
}

let last = 0;
async function loop(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;
  await update(dt);
  draw();
  requestAnimationFrame(loop);
}

async function gameOver() {
  gameState.running = false;
  gameState.overlay = 'over';
  hud.restart.classList.remove('hidden');
  if (finalMessage) finalMessage.classList.add('hidden');
  gameState.highScore = Math.max(gameState.highScore, gameState.score);
  localStorage.setItem('froggerHighScore', gameState.highScore.toString());
  hud.high.textContent = gameState.highScore.toString();
  
  // 점수를 DB에 저장
  const saved = await saveScoreToDatabase(gameState.score);
  if (saved) {
    console.log('💾 게임 오버 - 점수가 DB에 저장되었습니다');
    console.log(`🎯 이번 게임 점수: ${gameState.score}점`);
    
    // 잠시 후 순위 팝업 표시
    setTimeout(async () => {
      await showRankingPopup();
    }, 1000);
  } else {
    console.log('❌ 게임 오버 - 점수 저장 실패');
  }
  
  // 게임 오버 후 잠시 후 플레이어 설정 화면 표시
  setTimeout(() => {
    playerSetup.classList.remove('hidden');
    playerNameInput.value = currentPlayerName; // 현재 이름으로 초기화
    playerNameInput.focus();
  }, 3000);
}

async function gameClear() {
  gameState.running = false;
  gameState.overlay = 'clear';
  hud.restart.classList.remove('hidden');
  if (finalMessage) finalMessage.classList.remove('hidden');
  
  // 게임 클리어 시 점수를 DB에 저장
  const saved = await saveScoreToDatabase(gameState.score);
  if (saved) {
    console.log('🎉 게임 클리어 - 점수가 DB에 저장되었습니다');
    console.log(`🏆 이번 게임 점수: ${gameState.score}점 (완료!)`);
    
    // 잠시 후 순위 팝업 표시
    setTimeout(async () => {
      await showRankingPopup();
    }, 1500);
  } else {
    console.log('❌ 게임 클리어 - 점수 저장 실패');
  }
  
  // 게임 클리어 후 잠시 후 플레이어 설정 화면 표시
  setTimeout(() => {
    playerSetup.classList.remove('hidden');
    playerNameInput.value = currentPlayerName; // 현재 이름으로 초기화
    playerNameInput.focus();
  }, 5000);
}

// 게임 시작 함수
function startGame() {
  const name = playerNameInput.value.trim();
  if (name) {
    currentPlayerName = name;
  } else {
    currentPlayerName = '익명';
  }
  
  // 플레이어 이름을 HUD에 표시
  hud.currentPlayer.textContent = currentPlayerName;
  
  // 플레이어 설정 화면 숨기기
  playerSetup.classList.add('hidden');
  
  // 게임 시작
  restart();
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
  
  // 장애물 초기화
  initializeLanes();
  
  sound.resumeIfSuspended().then(() => sound.startBgm());
}

window.addEventListener('keydown', (e) => {
  if (!gameState.running && e.key === 'Enter') {
    restart();
    return;
  }
  
  // 점수 보드 표시 (S 키)
  if (e.key === 's' || e.key === 'S') {
    showScoreBoard();
    return;
  }
  
  // 성적 조회 (P 키)
  if (e.key === 'p' || e.key === 'P') {
    showPlayerStatsScreen();
    return;
  }
  
  switch (e.key) {
    case 'ArrowUp': sound.jump(); frog.move(0, -1); break;
    case 'ArrowDown': frog.move(0, 1); break;
    case 'ArrowLeft': frog.move(-1, 0); break;
    case 'ArrowRight': frog.move(1, 0); break;
  }
});

hud.restart.addEventListener('click', () => {
  playerSetup.classList.remove('hidden');
  playerNameInput.value = currentPlayerName;
  playerNameInput.focus();
});
hud.mute.addEventListener('click', () => {
  sound.muted = !sound.muted;
  hud.mute.textContent = sound.muted ? '🔈 소리 켜기' : '🔊 소리 끄기';
  if (sound.muted) {
    sound.stopBgm();
  } else {
    sound.resumeIfSuspended().then(() => sound.startBgm());
  }
});
hud.scoreboard.addEventListener('click', showScoreBoard);
hud.playerStats.addEventListener('click', showPlayerStatsScreen);

// 플레이어 설정 관련 이벤트 리스너
startGameBtn.addEventListener('click', startGame);
showRankingBeforeStartBtn.addEventListener('click', showRankingBeforeStart);

// Enter 키로 게임 시작
playerNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    startGame();
  }
});

// 페이지 로드 시 플레이어 이름 입력에 포커스
window.addEventListener('load', () => {
  playerNameInput.focus();
});

// 순위 팝업 버튼 이벤트 리스너
closeRankingBtn.addEventListener('click', closeRankingPopup);

playAgainBtn.addEventListener('click', () => {
  closeRankingPopup();
  playerSetup.classList.remove('hidden');
  playerNameInput.value = currentPlayerName;
  playerNameInput.focus();
});

viewDetailsBtn.addEventListener('click', () => {
  closeRankingPopup();
  showPlayerStatsScreen();
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

