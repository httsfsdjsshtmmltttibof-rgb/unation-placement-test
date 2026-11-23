export interface PublicQuestion {
  id: number;
  section: 'A' | 'B' | 'reading';
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  reading_passage_title?: string;
  reading_passage?: string;
}

export interface SessionData {
  session_id: string;
  recovery_token: string;
  expires_at: string;
  student_name: string;
  resumed?: boolean;
}

export interface TestResultData {
  result_id: string;
  score: number;
  level: string;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  duration_seconds: number;
  student_name: string;
  completed_at: string;
  test_id_code?: string;
}

export interface AdminStats {
  total_ids: number;
  unused_ids: number;
  in_progress: number;
  completed_tests: number;
  total_students: number;
  average_score: number;
  level_distribution: Record<string, number>;
}

export interface TestIdRecord {
  id: string;
  code: string;
  status: 'unused' | 'reserved' | 'completed' | 'expired';
  created_at: string;
  created_by?: string;
  student_name?: string;
  session_id?: string;
  result_id?: string;
}

export interface StudentRecord {
  id: string;
  score: number;
  level: string;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  duration_seconds: number;
  test_id_code: string;
  completed_at: string;
  students?: {
    full_name: string;
    telegram_id?: string;
  };
}
