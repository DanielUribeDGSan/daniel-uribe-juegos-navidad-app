-- Run this script in the Supabase SQL Editor

-- 1. Create Game Sessions Table
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'question_1', 'finished', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Game Players Table
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Game Answers Table
CREATE TABLE game_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES game_players(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  response_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security (Allow all for development)
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for game_sessions" ON game_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for game_players" ON game_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for game_answers" ON game_answers FOR ALL USING (true) WITH CHECK (true);

-- 5. Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_answers;

-- 6. Create Mimica Game Sessions Table
CREATE TABLE mimica_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'prep', 'playing', 'round_end', 'finished'
  current_round INTEGER NOT NULL DEFAULT 1,
  active_team INTEGER, -- 1, 2, 3, or 4
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create Mimica Game Players Table
CREATE TABLE mimica_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES mimica_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team_id INTEGER NOT NULL, -- 1, 2, 3, or 4
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create Mimica Game State Table (One active row per session)
CREATE TABLE mimica_game_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES mimica_sessions(id) ON DELETE CASCADE,
  active_mimer_id UUID REFERENCES mimica_players(id),
  active_validator_id UUID REFERENCES mimica_players(id),
  current_word_index INTEGER NOT NULL DEFAULT 0,
  time_elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  words_completed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Enable Row Level Security for Mimica
ALTER TABLE mimica_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mimica_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE mimica_game_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for mimica_sessions" ON mimica_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for mimica_players" ON mimica_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for mimica_game_state" ON mimica_game_state FOR ALL USING (true) WITH CHECK (true);

-- 10. Enable Realtime for Mimica
ALTER PUBLICATION supabase_realtime ADD TABLE mimica_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE mimica_players;
ALTER PUBLICATION supabase_realtime ADD TABLE mimica_game_state;
