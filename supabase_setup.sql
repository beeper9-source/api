-- 게임 점수를 저장할 테이블 생성
CREATE TABLE IF NOT EXISTS game_scores (
  id BIGSERIAL PRIMARY KEY,
  score INTEGER NOT NULL,
  player_name TEXT DEFAULT '익명',
  game_date TIMESTAMPTZ DEFAULT NOW(),
  stage_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상을 위해)
CREATE INDEX IF NOT EXISTS idx_game_scores_score ON game_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_date ON game_scores(game_date DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_stage ON game_scores(stage_completed);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 점수를 조회할 수 있도록 허용
CREATE POLICY "Allow public read access" ON game_scores
  FOR SELECT USING (true);

-- 모든 사용자가 점수를 삽입할 수 있도록 허용
CREATE POLICY "Allow public insert access" ON game_scores
  FOR INSERT WITH CHECK (true);

-- 점수 조회를 위한 뷰 생성 (상위 점수만)
CREATE OR REPLACE VIEW top_scores AS
SELECT 
  score,
  player_name,
  game_date,
  stage_completed,
  ROW_NUMBER() OVER (ORDER BY score DESC) as rank
FROM game_scores
ORDER BY score DESC
LIMIT 100;
