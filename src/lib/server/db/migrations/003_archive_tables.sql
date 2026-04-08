CREATE TABLE IF NOT EXISTS archived_rooms (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  invite_code VARCHAR(12) NOT NULL,
  creator_id UUID NOT NULL,
  creator_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_archived_rooms_creator ON archived_rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_archived_rooms_archived_at ON archived_rooms(archived_at);
CREATE INDEX IF NOT EXISTS idx_archived_rooms_invite_code ON archived_rooms(invite_code);

CREATE TABLE IF NOT EXISTS archived_participants (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_archived_participants_room_id ON archived_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_archived_participants_archived_at ON archived_participants(archived_at);

CREATE TABLE IF NOT EXISTS archived_messages (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL,
  participant_id UUID NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_archived_messages_room_id ON archived_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_archived_messages_archived_at ON archived_messages(archived_at);
