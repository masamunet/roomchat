-- Extend invite_code column from VARCHAR(8) to VARCHAR(12) for improved security (~59bit entropy)
ALTER TABLE rooms ALTER COLUMN invite_code TYPE VARCHAR(12);
