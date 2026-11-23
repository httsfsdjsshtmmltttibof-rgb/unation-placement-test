-- UNATION English Level Check - Complete Supabase Database Schema
-- Run this in Supabase SQL Editor

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Test IDs Table
CREATE TABLE IF NOT EXISTS test_ids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'reserved', 'completed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT DEFAULT 'admin',
  student_name TEXT,
  session_id UUID,
  result_id UUID
);

-- 3. Students Table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  telegram_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Test Sessions Table
CREATE TABLE IF NOT EXISTS test_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id_code TEXT NOT NULL REFERENCES test_ids(code) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  current_question INT NOT NULL DEFAULT 1,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  recovery_token TEXT UNIQUE NOT NULL,
  completed_at TIMESTAMPTZ
);

-- 5. Results Table
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  test_id_code TEXT NOT NULL,
  score INT NOT NULL,
  level TEXT NOT NULL,
  correct_count INT NOT NULL,
  incorrect_count INT NOT NULL,
  unanswered_count INT NOT NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Admin Settings Table
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial admin setting for student history toggle
INSERT INTO admin_settings (key, value)
VALUES ('history_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- 7. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_test_ids_code ON test_ids(code);
CREATE INDEX IF NOT EXISTS idx_test_ids_status ON test_ids(status);
CREATE INDEX IF NOT EXISTS idx_test_sessions_test_id_code ON test_sessions(test_id_code);
CREATE INDEX IF NOT EXISTS idx_test_sessions_recovery_token ON test_sessions(recovery_token);
CREATE INDEX IF NOT EXISTS idx_results_session_id ON results(session_id);
CREATE INDEX IF NOT EXISTS idx_results_student_id ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_completed_at ON results(completed_at DESC);

-- 8. Row Level Security (RLS) Policies
ALTER TABLE test_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Anonymous public can only check test_ids code & status (for frontend validation before registration)
CREATE POLICY "Public test ID read-only validation"
  ON test_ids FOR SELECT
  USING (true);

-- Backend operates using SUPABASE_SERVICE_ROLE_KEY which bypasses RLS securely.
-- Direct table modification from public anon key is restricted.
CREATE POLICY "Service role full access on test_ids"
  ON test_ids FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on students"
  ON students FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on test_sessions"
  ON test_sessions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on results"
  ON results FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on admin_settings"
  ON admin_settings FOR ALL
  USING (auth.role() = 'service_role');
