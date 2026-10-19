ALTER TABLE rooms ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
UPDATE rooms SET expires_at = created_at + INTERVAL '6 hours' WHERE expires_at IS NULL;
ALTER TABLE rooms ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '6 hours');
ALTER TABLE rooms ALTER COLUMN expires_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON rooms(expires_at);

ALTER TABLE archived_rooms ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_checkout_session_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  user_id UUID NOT NULL,
  room_id UUID NOT NULL,
  kind VARCHAR(30) NOT NULL,
  lookup_key VARCHAR(100) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(10) NOT NULL,
  extension_hours INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payments_room_kind ON payments(room_id, kind, status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
