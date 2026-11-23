import { Router, Response } from 'express';
import { supabase, isSupabaseConfigured, memoryStore } from '../lib/supabase';
import { adminAuthMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(adminAuthMiddleware as any);

// Helper to generate clean, readable unique test ID codes (e.g. UNA-9F2K-8A)
function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `UNA-${rand.slice(0, 3)}-${rand.slice(3)}`;
}

// 1. GET /api/admin/stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    if (isSupabaseConfigured) {
      const { data: idList } = await supabase.from('test_ids').select('status');
      const { data: resList } = await supabase.from('results').select('score, level');
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });

      const total_ids = idList?.length || 0;
      const unused_ids = idList?.filter(i => i.status === 'unused').length || 0;
      const in_progress = idList?.filter(i => i.status === 'reserved').length || 0;
      const completed_tests = idList?.filter(i => i.status === 'completed').length || 0;
      const scores = resList?.map(r => r.score) || [];
      const average_score = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      const level_distribution: Record<string, number> = {
        'Beginner': 0,
        'Elementary': 0,
        'Pre-intermediate': 0,
        'Intermediate': 0,
        'Upper Intermediate': 0,
        'Advanced': 0,
      };

      resList?.forEach(r => {
        if (level_distribution[r.level] !== undefined) {
          level_distribution[r.level]++;
        } else {
          level_distribution[r.level] = 1;
        }
      });

      res.json({
        success: true,
        data: {
          total_ids,
          unused_ids,
          in_progress,
          completed_tests,
          total_students: studentCount || 0,
          average_score,
          level_distribution,
        },
      });
    } else {
      const idList = Array.from(memoryStore.testIds.values());
      const resList = Array.from(memoryStore.results.values());
      const total_ids = idList.length;
      const unused_ids = idList.filter(i => i.status === 'unused').length;
      const in_progress = idList.filter(i => i.status === 'reserved').length;
      const completed_tests = idList.filter(i => i.status === 'completed').length;
      const scores = resList.map(r => r.score);
      const average_score = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      const level_distribution: Record<string, number> = {
        'Beginner': 0,
        'Elementary': 0,
        'Pre-intermediate': 0,
        'Intermediate': 0,
        'Upper Intermediate': 0,
        'Advanced': 0,
      };
      resList.forEach(r => {
        level_distribution[r.level] = (level_distribution[r.level] || 0) + 1;
      });

      res.json({
        success: true,
        data: {
          total_ids,
          unused_ids,
          in_progress,
          completed_tests,
          total_students: memoryStore.students.size,
          average_score,
          level_distribution,
        },
      });
    }
  } catch (err: any) {
    console.error('admin/stats error:', err);
    res.status(500).json({ success: false, error: 'Could not fetch admin statistics' });
  }
});

// 2. POST /api/admin/generate-id: Generate one or multiple unique IDs
router.post('/generate-id', async (req: AuthRequest, res: Response) => {
  const count = Math.min(Math.max(1, parseInt(req.body.count, 10) || 1), 100);

  try {
    const generated: string[] = [];

    for (let i = 0; i < count; i++) {
      let code = generateUniqueCode();
      if (isSupabaseConfigured) {
        let exists = true;
        while (exists) {
          const { data } = await supabase.from('test_ids').select('code').eq('code', code).maybeSingle();
          if (!data) {
            exists = false;
          } else {
            code = generateUniqueCode();
          }
        }
      } else {
        while (memoryStore.testIds.has(code)) {
          code = generateUniqueCode();
        }
      }
      generated.push(code);
    }

    if (isSupabaseConfigured) {
      const rows = generated.map(code => ({
        code,
        status: 'unused',
        created_by: req.admin?.username || 'admin',
      }));

      const { data, error } = await supabase.from('test_ids').insert(rows).select();
      if (error) {
        res.status(500).json({ success: false, error: 'Failed to insert generated test IDs' });
        return;
      }
      res.json({ success: true, data });
    } else {
      const records = generated.map(code => {
        const item = {
          id: code,
          code,
          status: 'unused',
          created_at: new Date().toISOString(),
          created_by: req.admin?.username || 'admin',
        };
        memoryStore.testIds.set(code, item);
        return item;
      });
      res.json({ success: true, data: records });
    }
  } catch (err: any) {
    console.error('admin/generate-id error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate test IDs' });
  }
});

// 3. GET /api/admin/ids: List all test IDs with search and status filters
router.get('/ids', async (req: AuthRequest, res: Response) => {
  const { status, search, limit = '100', page = '1' } = req.query;
  const p = Math.max(1, parseInt(page as string, 10) || 1);
  const l = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 100));

  try {
    if (isSupabaseConfigured) {
      let query = supabase
        .from('test_ids')
        .select('*')
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status as string);
      }
      if (search && typeof search === 'string') {
        query = query.ilike('code', `%${search.trim().toUpperCase()}%`);
      }

      query = query.range((p - 1) * l, p * l - 1);
      const { data, error } = await query;

      if (error) {
        res.status(500).json({ success: false, error: error.message });
        return;
      }
      res.json({ success: true, data: data || [] });
    } else {
      let items = Array.from(memoryStore.testIds.values());
      if (status && status !== 'all') {
        items = items.filter(i => i.status === status);
      }
      if (search && typeof search === 'string') {
        const s = search.trim().toUpperCase();
        items = items.filter(i => i.code.includes(s) || (i.student_name && i.student_name.toUpperCase().includes(s)));
      }
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const paginated = items.slice((p - 1) * l, p * l);
      res.json({ success: true, data: paginated });
    }
  } catch (err: any) {
    console.error('admin/ids error:', err);
    res.status(500).json({ success: false, error: 'Could not fetch test IDs' });
  }
});

// 4. DELETE /api/admin/ids/:code: Revoke unused ID
router.delete('/ids/:code', async (req: AuthRequest, res: Response) => {
  const { code } = req.params;

  try {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('test_ids').select('status').eq('code', code).maybeSingle();
      if (!data) {
        res.status(404).json({ success: false, error: 'Test ID not found' });
        return;
      }
      if (data.status !== 'unused') {
        res.status(400).json({ success: false, error: 'Only unused test IDs can be revoked' });
        return;
      }
      await supabase.from('test_ids').delete().eq('code', code);
      res.json({ success: true, message: `Test ID ${code} revoked successfully` });
    } else {
      const item = memoryStore.testIds.get(code);
      if (!item) {
        res.status(404).json({ success: false, error: 'Test ID not found' });
        return;
      }
      if (item.status !== 'unused') {
        res.status(400).json({ success: false, error: 'Only unused test IDs can be revoked' });
        return;
      }
      memoryStore.testIds.delete(code);
      res.json({ success: true, message: `Test ID ${code} revoked successfully` });
    }
  } catch (err: any) {
    console.error('admin/revoke error:', err);
    res.status(500).json({ success: false, error: 'Failed to revoke test ID' });
  }
});

// 5. GET /api/admin/students: Student records with level and search filters
router.get('/students', async (req: AuthRequest, res: Response) => {
  const { search, level, page = '1', limit = '100' } = req.query;
  const p = Math.max(1, parseInt(page as string, 10) || 1);
  const l = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 100));

  try {
    if (isSupabaseConfigured) {
      let query = supabase
        .from('results')
        .select('*, students(full_name, telegram_id), test_sessions(started_at, completed_at, status)')
        .order('completed_at', { ascending: false });

      if (level && level !== 'all') {
        query = query.eq('level', level as string);
      }

      query = query.range((p - 1) * l, p * l - 1);
      const { data, error } = await query;

      if (error) {
        res.status(500).json({ success: false, error: error.message });
        return;
      }

      let results = data || [];
      if (search && typeof search === 'string') {
        const s = search.trim().toLowerCase();
        results = results.filter((r: any) =>
          r.students?.full_name?.toLowerCase().includes(s) ||
          r.test_id_code?.toLowerCase().includes(s)
        );
      }

      res.json({ success: true, data: results });
    } else {
      let results = Array.from(memoryStore.results.values()).map(r => {
        const student = memoryStore.students.get(r.student_id);
        const session = memoryStore.testSessions.get(r.session_id);
        return {
          ...r,
          students: { full_name: student?.full_name || 'Student', telegram_id: student?.telegram_id },
          test_sessions: { started_at: session?.started_at, completed_at: session?.completed_at, status: session?.status },
        };
      });

      if (level && level !== 'all') {
        results = results.filter(r => r.level === level);
      }
      if (search && typeof search === 'string') {
        const s = search.trim().toLowerCase();
        results = results.filter(r =>
          r.students?.full_name?.toLowerCase().includes(s) ||
          r.test_id_code?.toLowerCase().includes(s)
        );
      }

      results.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
      const paginated = results.slice((p - 1) * l, p * l);
      res.json({ success: true, data: paginated });
    }
  } catch (err: any) {
    console.error('admin/students error:', err);
    res.status(500).json({ success: false, error: 'Could not fetch student results' });
  }
});

// 6. GET /api/admin/export: Export student records to CSV
router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    let rows: any[] = [];

    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('results')
        .select('*, students(full_name, telegram_id)')
        .order('completed_at', { ascending: false });
      rows = data || [];
    } else {
      rows = Array.from(memoryStore.results.values()).map(r => {
        const student = memoryStore.students.get(r.student_id);
        return {
          ...r,
          students: { full_name: student?.full_name || 'Student', telegram_id: student?.telegram_id },
        };
      });
    }

    const csvHeaders = [
      'Student Name',
      'Test ID',
      'Score (out of 120)',
      'English Level',
      'Correct Answers',
      'Incorrect Answers',
      'Unanswered',
      'Completion Time (sec)',
      'Completion Date',
      'Telegram ID',
    ];

    const csvLines = rows.map(r => {
      const name = (r.students?.full_name || '').replace(/"/g, '""');
      const testId = r.test_id_code || '';
      const score = r.score ?? 0;
      const level = r.level || '';
      const correct = r.correct_count ?? 0;
      const incorrect = r.incorrect_count ?? 0;
      const unanswered = r.unanswered_count ?? 0;
      const duration = r.duration_seconds ?? 0;
      const date = r.completed_at ? new Date(r.completed_at).toLocaleString() : '';
      const teleId = r.students?.telegram_id || '';
      return `"${name}","${testId}",${score},"${level}",${correct},${incorrect},${unanswered},${duration},"${date}","${teleId}"`;
    });

    const csvContent = [csvHeaders.join(','), ...csvLines].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="UNATION-Placement-Results.csv"');
    res.send(csvContent);
  } catch (err: any) {
    console.error('admin/export error:', err);
    res.status(500).json({ success: false, error: 'Export failed' });
  }
});

// 7. GET /api/admin/settings: Admin settings (e.g., student history toggle)
router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('admin_settings').select('*');
      const settingsMap: Record<string, string> = {};
      data?.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      res.json({ success: true, data: settingsMap });
    } else {
      const settingsMap: Record<string, string> = {};
      for (const [k, v] of memoryStore.settings.entries()) {
        settingsMap[k] = v;
      }
      res.json({ success: true, data: settingsMap });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Could not fetch settings' });
  }
});

// 8. PUT /api/admin/settings: Update an admin setting
router.put('/settings', async (req: AuthRequest, res: Response) => {
  const { key, value } = req.body;
  if (!key || typeof value === 'undefined') {
    res.status(400).json({ success: false, error: 'Key and value are required' });
    return;
  }

  try {
    if (isSupabaseConfigured) {
      await supabase
        .from('admin_settings')
        .upsert({ key, value: String(value), updated_at: new Date().toISOString() });
      res.json({ success: true, message: `Setting ${key} updated` });
    } else {
      memoryStore.settings.set(key, String(value));
      res.json({ success: true, message: `Setting ${key} updated` });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update setting' });
  }
});

export default router;
