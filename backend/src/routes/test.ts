import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured, memoryStore } from '../lib/supabase';
import {
  QUESTIONS,
  TOTAL_QUESTIONS,
  TEST_DURATION_SECONDS,
  calculateLevel,
  getClientQuestions,
} from '../data/questions';

const router = Router();

// 1. POST /api/test/validate-id: Pre-check ID status before entering name
router.post('/validate-id', async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    res.status(400).json({ success: false, error: 'Please enter a test ID or password' });
    return;
  }

  const cleanCode = code.trim().toUpperCase();

  // Permanent password bypass (admin24 is always valid for all students)
  if (cleanCode === 'ADMIN24') {
    res.json({ success: true, message: 'Access granted with permanent password.' });
    return;
  }

  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('test_ids')
        .select('code, status')
        .eq('code', cleanCode)
        .maybeSingle();

      if (error || !data) {
        res.status(404).json({ success: false, error: 'Test ID not found. Please check with your administrator.' });
        return;
      }

      if (data.status === 'completed') {
        res.status(400).json({ success: false, error: 'This test ID has already been completed.' });
        return;
      }
      if (data.status === 'expired') {
        res.status(400).json({ success: false, error: 'This test ID has expired.' });
        return;
      }
      if (data.status === 'reserved') {
        res.status(400).json({ success: false, error: 'This test ID is already active in another test session.' });
        return;
      }

      res.json({ success: true, message: 'Test ID is valid and ready to use.' });
    } else {
      const item = memoryStore.testIds.get(cleanCode);
      if (!item) {
        res.status(404).json({ success: false, error: 'Test ID not found. Please check with your administrator.' });
        return;
      }
      if (item.status === 'completed') {
        res.status(400).json({ success: false, error: 'This test ID has already been completed.' });
        return;
      }
      if (item.status === 'expired') {
        res.status(400).json({ success: false, error: 'This test ID has expired.' });
        return;
      }
      if (item.status === 'reserved') {
        res.status(400).json({ success: false, error: 'This test ID is already in progress in another session.' });
        return;
      }
      res.json({ success: true, message: 'Test ID is valid and ready to use.' });
    }
  } catch (err: any) {
    console.error('validate-id error:', err);
    res.status(500).json({ success: false, error: 'Server error validating test ID.' });
  }
});

// 2. POST /api/test/start: Start or securely resume a test session
router.post('/start', async (req: Request, res: Response) => {
  const { full_name, test_id_code, telegram_id } = req.body;

  if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
    res.status(400).json({ success: false, error: 'Full name is required' });
    return;
  }
  if (!test_id_code || typeof test_id_code !== 'string') {
    res.status(400).json({ success: false, error: 'Test ID is required' });
    return;
  }

  const cleanName = full_name.trim();
  const cleanCode = test_id_code.trim().toUpperCase();

  // If permanent password ADMIN24 is used, create an instant session for the student
  if (cleanCode === 'ADMIN24') {
    try {
      const studentId = uuidv4();
      const sessionId = uuidv4();
      const recoveryToken = uuidv4();
      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + TEST_DURATION_SECONDS * 1000);

      if (isSupabaseConfigured) {
        await supabase.from('students').insert({
          id: studentId,
          full_name: cleanName,
          telegram_id: telegram_id ? String(telegram_id) : null,
        });

        await supabase.from('test_sessions').insert({
          id: sessionId,
          test_id_code: 'ADMIN24',
          student_id: studentId,
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'active',
          answers: {},
          recovery_token: recoveryToken,
        });
      } else {
        memoryStore.students.set(studentId, {
          id: studentId,
          full_name: cleanName,
          telegram_id: telegram_id || null,
          created_at: new Date().toISOString(),
        });

        memoryStore.testSessions.set(sessionId, {
          id: sessionId,
          test_id_code: 'ADMIN24',
          student_id: studentId,
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'active',
          answers: {},
          recovery_token: recoveryToken,
        });
      }

      res.json({
        success: true,
        data: {
          session_id: sessionId,
          recovery_token: recoveryToken,
          expires_at: expiresAt.toISOString(),
          student_name: cleanName,
          resumed: false,
        },
      });
      return;
    } catch (err: any) {
      console.error('ADMIN24 start error:', err);
      res.status(500).json({ success: false, error: 'Failed to start session with password.' });
      return;
    }
  }

  try {
    if (isSupabaseConfigured) {
      // Check test_id in database
      const { data: testIdRecord, error: idErr } = await supabase
        .from('test_ids')
        .select('*')
        .eq('code', cleanCode)
        .maybeSingle();

      if (idErr || !testIdRecord) {
        res.status(404).json({ success: false, error: 'Invalid Test ID. Please check and try again.' });
        return;
      }

      if (testIdRecord.status === 'completed') {
        res.status(400).json({ success: false, error: 'This Test ID has already been completed.' });
        return;
      }
      if (testIdRecord.status === 'expired') {
        res.status(400).json({ success: false, error: 'This Test ID has expired.' });
        return;
      }

      // Check for active session recovery for the same student
      if (testIdRecord.status === 'reserved' && testIdRecord.session_id) {
        const { data: activeSession } = await supabase
          .from('test_sessions')
          .select('*')
          .eq('id', testIdRecord.session_id)
          .maybeSingle();

        if (activeSession && activeSession.status === 'active') {
          const now = new Date();
          const expiresAt = new Date(activeSession.expires_at);

          if (now < expiresAt) {
            // Student is safely resuming their authorized in-progress session
            res.json({
              success: true,
              data: {
                session_id: activeSession.id,
                recovery_token: activeSession.recovery_token,
                expires_at: activeSession.expires_at,
                student_name: cleanName,
                resumed: true,
              },
            });
            return;
          } else {
            // Expired -> auto-finalize
            await finalizeSupabaseSession(activeSession);
            res.status(400).json({ success: false, error: 'The 60-minute test duration has already expired.' });
            return;
          }
        }
      }

      // If not reserved, verify it's unused
      if (testIdRecord.status !== 'unused') {
        res.status(400).json({ success: false, error: 'This test ID is no longer available.' });
        return;
      }

      // 1. Create student record
      const { data: studentRecord, error: studErr } = await supabase
        .from('students')
        .insert({
          full_name: cleanName,
          telegram_id: telegram_id ? String(telegram_id) : null,
        })
        .select()
        .single();

      if (studErr || !studentRecord) {
        res.status(500).json({ success: false, error: 'Could not register student details.' });
        return;
      }

      // 2. Compute server-validated 60-minute window
      const recoveryToken = uuidv4();
      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + TEST_DURATION_SECONDS * 1000);

      // 3. Create test session
      const { data: sessionRecord, error: sessErr } = await supabase
        .from('test_sessions')
        .insert({
          test_id_code: cleanCode,
          student_id: studentRecord.id,
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'active',
          answers: {},
          recovery_token: recoveryToken,
        })
        .select()
        .single();

      if (sessErr || !sessionRecord) {
        res.status(500).json({ success: false, error: 'Failed to create test session.' });
        return;
      }

      // 4. Reserve Test ID atomically
      const { error: reserveErr } = await supabase
        .from('test_ids')
        .update({
          status: 'reserved',
          student_name: cleanName,
          session_id: sessionRecord.id,
        })
        .eq('code', cleanCode)
        .eq('status', 'unused');

      if (reserveErr) {
        await supabase.from('test_sessions').delete().eq('id', sessionRecord.id);
        res.status(409).json({ success: false, error: 'Test ID was concurrently claimed. Please try again.' });
        return;
      }

      res.json({
        success: true,
        data: {
          session_id: sessionRecord.id,
          recovery_token: recoveryToken,
          expires_at: expiresAt.toISOString(),
          student_name: cleanName,
          resumed: false,
        },
      });
    } else {
      // Memory Store implementation
      const testIdRecord = memoryStore.testIds.get(cleanCode);
      if (!testIdRecord) {
        res.status(404).json({ success: false, error: 'Invalid Test ID. Please check and try again.' });
        return;
      }

      if (testIdRecord.status === 'completed') {
        res.status(400).json({ success: false, error: 'This Test ID has already been completed.' });
        return;
      }

      if (testIdRecord.status === 'reserved' && testIdRecord.session_id) {
        const active = memoryStore.testSessions.get(testIdRecord.session_id);
        if (active && active.status === 'active') {
          if (new Date() < new Date(active.expires_at)) {
            res.json({
              success: true,
              data: {
                session_id: active.id,
                recovery_token: active.recovery_token,
                expires_at: active.expires_at,
                student_name: cleanName,
                resumed: true,
              },
            });
            return;
          }
        }
      }

      const studentId = uuidv4();
      memoryStore.students.set(studentId, {
        id: studentId,
        full_name: cleanName,
        telegram_id: telegram_id || null,
        created_at: new Date().toISOString(),
      });

      const sessionId = uuidv4();
      const recoveryToken = uuidv4();
      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + TEST_DURATION_SECONDS * 1000);

      const sessionObj = {
        id: sessionId,
        test_id_code: cleanCode,
        student_id: studentId,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
        answers: {},
        current_question: 1,
        recovery_token: recoveryToken,
      };

      memoryStore.testSessions.set(sessionId, sessionObj);

      testIdRecord.status = 'reserved';
      testIdRecord.student_name = cleanName;
      testIdRecord.session_id = sessionId;

      res.json({
        success: true,
        data: {
          session_id: sessionId,
          recovery_token: recoveryToken,
          expires_at: expiresAt.toISOString(),
          student_name: cleanName,
          resumed: false,
        },
      });
    }
  } catch (err: any) {
    console.error('test/start error:', err);
    res.status(500).json({ success: false, error: 'Failed to initiate test session.' });
  }
});

// 3. POST /api/test/resume: Secure session recovery via recovery_token
router.post('/resume', async (req: Request, res: Response) => {
  const { recovery_token } = req.body;

  if (!recovery_token) {
    res.status(400).json({ success: false, error: 'Recovery token is required' });
    return;
  }

  try {
    if (isSupabaseConfigured) {
      const { data: session, error } = await supabase
        .from('test_sessions')
        .select('*, students(full_name)')
        .eq('recovery_token', recovery_token)
        .maybeSingle();

      if (error || !session) {
        res.status(404).json({ success: false, error: 'Active test session not found.' });
        return;
      }

      if (session.status === 'completed') {
        res.status(400).json({ success: false, error: 'This test has already been completed.' });
        return;
      }

      // Check server expiration
      if (new Date() >= new Date(session.expires_at)) {
        await finalizeSupabaseSession(session);
        res.status(400).json({ success: false, error: 'Test time has expired and the session has been submitted.' });
        return;
      }

      res.json({
        success: true,
        data: {
          session_id: session.id,
          expires_at: session.expires_at,
          current_question: session.current_question || 1,
          answers: session.answers || {},
          student_name: (session as any).students?.full_name || 'Student',
        },
      });
    } else {
      let session: any = null;
      for (const s of memoryStore.testSessions.values()) {
        if (s.recovery_token === recovery_token) {
          session = s;
          break;
        }
      }

      if (!session) {
        res.status(404).json({ success: false, error: 'Active test session not found.' });
        return;
      }

      if (session.status === 'completed') {
        res.status(400).json({ success: false, error: 'This test has already been completed.' });
        return;
      }

      const student = memoryStore.students.get(session.student_id);

      res.json({
        success: true,
        data: {
          session_id: session.id,
          expires_at: session.expires_at,
          current_question: session.current_question || 1,
          answers: session.answers || {},
          student_name: student?.full_name || 'Student',
        },
      });
    }
  } catch (err: any) {
    console.error('test/resume error:', err);
    res.status(500).json({ success: false, error: 'Session recovery failed.' });
  }
});

// 4. GET /api/test/questions: Return sanitized questions in exact original sequence
router.get('/questions', async (req: Request, res: Response) => {
  const { session_id, recovery_token } = req.query;

  if (!session_id || !recovery_token) {
    res.status(401).json({ success: false, error: 'Session authorization required' });
    return;
  }

  try {
    // Validate that session is valid and not expired
    if (isSupabaseConfigured) {
      const { data: session } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('id', session_id)
        .eq('recovery_token', recovery_token)
        .maybeSingle();

      if (!session || session.status !== 'active') {
        res.status(401).json({ success: false, error: 'Invalid or inactive test session.' });
        return;
      }

      if (new Date() >= new Date(session.expires_at)) {
        await finalizeSupabaseSession(session);
        res.status(400).json({ success: false, error: 'Time has expired for this test.' });
        return;
      }
    } else {
      const session = memoryStore.testSessions.get(String(session_id));
      if (!session || session.recovery_token !== recovery_token || session.status !== 'active') {
        res.status(401).json({ success: false, error: 'Invalid or inactive test session.' });
        return;
      }
    }

    // Return sanitized questions (correct answers never included)
    const publicQuestions = getClientQuestions();
    res.json({
      success: true,
      data: publicQuestions,
      total: TOTAL_QUESTIONS,
    });
  } catch (err: any) {
    console.error('test/questions error:', err);
    res.status(500).json({ success: false, error: 'Could not load questions.' });
  }
});

// 5. POST /api/test/save-answer: Incremental answer auto-save
router.post('/save-answer', async (req: Request, res: Response) => {
  const { session_id, recovery_token, question_id, answer } = req.body;

  if (!session_id || !recovery_token || !question_id || !answer) {
    res.status(400).json({ success: false, error: 'Missing required parameters' });
    return;
  }

  const qIdStr = String(question_id);
  const cleanAns = String(answer).toLowerCase();

  try {
    if (isSupabaseConfigured) {
      const { data: session } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('id', session_id)
        .eq('recovery_token', recovery_token)
        .maybeSingle();

      if (!session || session.status !== 'active') {
        res.status(400).json({ success: false, error: 'Session is not active' });
        return;
      }

      if (new Date() >= new Date(session.expires_at)) {
        await finalizeSupabaseSession(session);
        res.status(400).json({ success: false, error: 'Time expired' });
        return;
      }

      const updatedAnswers = { ...(session.answers || {}), [qIdStr]: cleanAns };
      await supabase
        .from('test_sessions')
        .update({
          answers: updatedAnswers,
          current_question: Math.max(session.current_question || 1, Number(question_id)),
        })
        .eq('id', session_id);

      res.json({ success: true });
    } else {
      const session = memoryStore.testSessions.get(session_id);
      if (!session || session.recovery_token !== recovery_token || session.status !== 'active') {
        res.status(400).json({ success: false, error: 'Session is not active' });
        return;
      }

      session.answers = { ...(session.answers || {}), [qIdStr]: cleanAns };
      session.current_question = Math.max(session.current_question || 1, Number(question_id));
      res.json({ success: true });
    }
  } catch (err: any) {
    console.error('save-answer error:', err);
    res.status(500).json({ success: false, error: 'Error saving answer' });
  }
});

// 6. POST /api/test/submit: Server-side scoring and result finalization
router.post('/submit', async (req: Request, res: Response) => {
  const { session_id, recovery_token } = req.body;

  if (!session_id || !recovery_token) {
    res.status(400).json({ success: false, error: 'Session credentials required' });
    return;
  }

  try {
    if (isSupabaseConfigured) {
      const { data: session } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('id', session_id)
        .eq('recovery_token', recovery_token)
        .maybeSingle();

      if (!session) {
        res.status(404).json({ success: false, error: 'Test session not found' });
        return;
      }

      // If already completed, return existing result (prevents duplicate submission)
      if (session.status === 'completed') {
        const { data: existingResult } = await supabase
          .from('results')
          .select('*, students(full_name)')
          .eq('session_id', session_id)
          .maybeSingle();

        if (existingResult) {
          res.json({
            success: true,
            data: {
              result_id: existingResult.id,
              score: existingResult.score,
              level: existingResult.level,
              correct_count: existingResult.correct_count,
              incorrect_count: existingResult.incorrect_count,
              unanswered_count: existingResult.unanswered_count,
              duration_seconds: existingResult.duration_seconds,
              student_name: (existingResult as any).students?.full_name || 'Student',
              completed_at: existingResult.completed_at,
            },
          });
          return;
        }
      }

      const finalized = await finalizeSupabaseSession(session);
      if (!finalized) {
        res.status(500).json({ success: false, error: 'Failed to record test result.' });
        return;
      }

      res.json({ success: true, data: finalized });
    } else {
      const session = memoryStore.testSessions.get(session_id);
      if (!session || session.recovery_token !== recovery_token) {
        res.status(404).json({ success: false, error: 'Test session not found' });
        return;
      }

      if (session.status === 'completed') {
        const existing = memoryStore.results.get(session_id);
        const student = memoryStore.students.get(session.student_id);
        res.json({
          success: true,
          data: { ...existing, student_name: student?.full_name || 'Student' },
        });
        return;
      }

      const answers = session.answers || {};
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;

      for (const q of QUESTIONS) {
        const given = answers[String(q.id)];
        if (!given) {
          unanswered++;
        } else if (given.toLowerCase() === q.correct_answer.toLowerCase()) {
          correct++;
        } else {
          incorrect++;
        }
      }

      const score = correct;
      const level = calculateLevel(score);
      const completedAt = new Date();
      const startedAt = new Date(session.started_at);
      const durationSeconds = Math.max(0, Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000));
      const resultId = uuidv4();

      const student = memoryStore.students.get(session.student_id);
      const studentName = student?.full_name || 'Student';

      const resultObj = {
        id: resultId,
        session_id: session.id,
        student_id: session.student_id,
        test_id_code: session.test_id_code,
        score,
        level,
        correct_count: correct,
        incorrect_count: incorrect,
        unanswered_count: unanswered,
        duration_seconds: durationSeconds,
        completed_at: completedAt.toISOString(),
      };

      memoryStore.results.set(session.id, resultObj);
      session.status = 'completed';
      session.completed_at = completedAt.toISOString();

      const testIdObj = memoryStore.testIds.get(session.test_id_code);
      if (testIdObj) {
        testIdObj.status = 'completed';
        testIdObj.result_id = resultId;
      }

      res.json({
        success: true,
        data: {
          result_id: resultId,
          score,
          level,
          correct_count: correct,
          incorrect_count: incorrect,
          unanswered_count: unanswered,
          duration_seconds: durationSeconds,
          student_name: studentName,
          completed_at: completedAt.toISOString(),
        },
      });
    }
  } catch (err: any) {
    console.error('test/submit error:', err);
    res.status(500).json({ success: false, error: 'Could not process submission.' });
  }
});

// 7. GET /api/test/result/:resultId: Secure public display of placement test outcome
router.get('/result/:resultId', async (req: Request, res: Response) => {
  const { resultId } = req.params;

  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('results')
        .select('*, students(full_name)')
        .eq('id', resultId)
        .maybeSingle();

      if (error || !data) {
        res.status(404).json({ success: false, error: 'Test result not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          result_id: data.id,
          score: data.score,
          level: data.level,
          correct_count: data.correct_count,
          incorrect_count: data.incorrect_count,
          unanswered_count: data.unanswered_count,
          duration_seconds: data.duration_seconds,
          student_name: (data as any).students?.full_name || 'Student',
          completed_at: data.completed_at,
          test_id_code: data.test_id_code,
        },
      });
    } else {
      let matched: any = null;
      for (const r of memoryStore.results.values()) {
        if (r.id === resultId) {
          matched = r;
          break;
        }
      }

      if (!matched) {
        res.status(404).json({ success: false, error: 'Test result not found' });
        return;
      }

      const student = memoryStore.students.get(matched.student_id);
      res.json({
        success: true,
        data: {
          ...matched,
          result_id: matched.id,
          student_name: student?.full_name || 'Student',
        },
      });
    }
  } catch (err: any) {
    console.error('test/result error:', err);
    res.status(500).json({ success: false, error: 'Error retrieving result.' });
  }
});

// Helper: Calculate score and finalize in Supabase
async function finalizeSupabaseSession(session: any) {
  try {
    const answers: Record<string, string> = session.answers || {};
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    for (const q of QUESTIONS) {
      const given = answers[String(q.id)];
      if (!given) {
        unanswered++;
      } else if (given.toLowerCase() === q.correct_answer.toLowerCase()) {
        correct++;
      } else {
        incorrect++;
      }
    }

    const score = correct;
    const level = calculateLevel(score);
    const completedAt = new Date();
    const startedAt = new Date(session.started_at);
    const durationSeconds = Math.max(0, Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000));

    // Save result record
    const { data: result, error: resErr } = await supabase
      .from('results')
      .insert({
        session_id: session.id,
        student_id: session.student_id,
        test_id_code: session.test_id_code,
        score,
        level,
        correct_count: correct,
        incorrect_count: incorrect,
        unanswered_count: unanswered,
        duration_seconds: durationSeconds,
        completed_at: completedAt.toISOString(),
      })
      .select()
      .single();

    if (resErr || !result) {
      console.error('Error inserting result:', resErr);
      return null;
    }

    // Update session status
    await supabase
      .from('test_sessions')
      .update({
        status: 'completed',
        completed_at: completedAt.toISOString(),
      })
      .eq('id', session.id);

    // Update test_ids table to completed
    await supabase
      .from('test_ids')
      .update({
        status: 'completed',
        result_id: result.id,
      })
      .eq('code', session.test_id_code);

    const { data: student } = await supabase
      .from('students')
      .select('full_name')
      .eq('id', session.student_id)
      .maybeSingle();

    return {
      result_id: result.id,
      score,
      level,
      correct_count: correct,
      incorrect_count: incorrect,
      unanswered_count: unanswered,
      duration_seconds: durationSeconds,
      student_name: student?.full_name || 'Student',
      completed_at: completedAt.toISOString(),
    };
  } catch (e) {
    console.error('finalizeSupabaseSession error:', e);
    return null;
  }
}

export default router;
