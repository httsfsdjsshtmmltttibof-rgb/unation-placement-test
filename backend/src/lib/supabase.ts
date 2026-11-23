import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseServiceKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseUrl.includes('your-supabase-project-id')
);

let supabaseClient: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabaseClient = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('[Supabase] Connected to live Supabase backend successfully.');
  } catch (err) {
    console.warn('[Supabase] Failed to initialize live client:', err);
  }
} else {
  console.log('[Database] Supabase credentials not set or using placeholder. Running in integrated memory-safe mode.');
}

export const supabase = supabaseClient as SupabaseClient;

// Memory storage engine for instant offline/local development & demo tests
export interface MemoryStore {
  testIds: Map<string, any>;
  students: Map<string, any>;
  testSessions: Map<string, any>;
  results: Map<string, any>;
  settings: Map<string, string>;
}

export const memoryStore: MemoryStore = {
  testIds: new Map(),
  students: new Map(),
  testSessions: new Map(),
  results: new Map(),
  settings: new Map([['history_enabled', 'true']]),
};

// Seed a few initial demo test IDs in memory mode
if (!isSupabaseConfigured) {
  const sampleCodes = ['UNAT-1001', 'UNAT-1002', 'UNAT-1003', 'DEMO-2026', 'TEST-LEVEL'];
  sampleCodes.forEach(code => {
    memoryStore.testIds.set(code, {
      id: code,
      code,
      status: 'unused',
      created_at: new Date().toISOString(),
      created_by: 'system_init',
    });
  });
}
