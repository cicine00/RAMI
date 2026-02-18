-- ─── Schema PostgreSQL pour Rami Marocain ────────────────────────────────────

-- Table des joueurs
CREATE TABLE IF NOT EXISTS players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR(30) UNIQUE NOT NULL,
  email       VARCHAR(100) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  avatar      VARCHAR(10) DEFAULT '🎴',
  total_games INTEGER DEFAULT 0,
  total_wins  INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Table des parties
CREATE TABLE IF NOT EXISTS games (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant      VARCHAR(20) NOT NULL CHECK (variant IN ('classique', 'avecJokers')),
  mode         VARCHAR(20) NOT NULL CHECK (mode IN ('solo', 'local', 'online')),
  team_mode    BOOLEAN DEFAULT FALSE,
  max_players  INTEGER NOT NULL CHECK (max_players BETWEEN 2 AND 4),
  status       VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  winner_id    UUID REFERENCES players(id),
  created_at   TIMESTAMP DEFAULT NOW(),
  finished_at  TIMESTAMP
);

-- Table des participations
CREATE TABLE IF NOT EXISTS game_players (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id    UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id  UUID REFERENCES players(id),
  team_id    VARCHAR(10),
  score      INTEGER DEFAULT 0,
  is_winner  BOOLEAN DEFAULT FALSE,
  joined_at  TIMESTAMP DEFAULT NOW()
);

-- Table des salles d'attente (rooms)
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(6) UNIQUE NOT NULL,
  host_id     UUID REFERENCES players(id),
  variant     VARCHAR(20) NOT NULL DEFAULT 'classique',
  team_mode   BOOLEAN DEFAULT FALSE,
  max_players INTEGER DEFAULT 4,
  status      VARCHAR(20) DEFAULT 'waiting',
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_player ON game_players(player_id);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
