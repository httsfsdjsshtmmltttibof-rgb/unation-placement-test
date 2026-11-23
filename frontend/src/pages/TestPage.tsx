import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, AlertCircle, Loader2, BookOpen, Check } from 'lucide-react';
import { getLocalSession, saveLocalResult, clearLocalSession } from '../lib/session';
import { testApi } from '../lib/api';
import { useTimer } from '../hooks/useTimer';
import { PublicQuestion } from '../types';

export default function TestPage() {
  const navigate = useNavigate();
  const session = getLocalSession();

  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const submittingRef = useRef(false);

  // Auto-submit callback triggered when 60-minute countdown reaches zero
  const handleTimeExpired = useCallback(async () => {
    if (submittingRef.current || !session) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const result = await testApi.submitTest(session.session_id, session.recovery_token);
      saveLocalResult(result);
      clearLocalSession();
      navigate('/result', { replace: true });
    } catch (err) {
      console.error('Time expired submit error:', err);
      // Fallback navigation
      navigate('/result', { replace: true });
    }
  }, [session, navigate]);

  const { formatted, isUrgent } = useTimer({
    expiresAt: session?.expires_at || new Date(Date.now() + 3600000).toISOString(),
    onTimeExpired: handleTimeExpired,
  });

  // Load questions and existing answers on mount
  useEffect(() => {
    if (!session) {
      navigate('/register', { replace: true });
      return;
    }

    let isMounted = true;

    async function loadTestState() {
      try {
        setLoading(true);
        setFetchError(null);

        // 1. Fetch questions
        const fetchedQuestions = await testApi.getQuestions(session!.session_id, session!.recovery_token);

        // 2. Fetch resumed state if applicable
        try {
          const resumedState = await testApi.resumeTest(session!.recovery_token);
          if (resumedState?.answers && isMounted) {
            setAnswers(resumedState.answers);
          }
          if (resumedState?.current_question && isMounted) {
            const resumeIdx = Math.min(resumedState.current_question - 1, fetchedQuestions.length - 1);
            setCurrentIndex(Math.max(0, resumeIdx));
          }
        } catch (e) {
          // Normal start, not resuming
        }

        if (isMounted) {
          setQuestions(fetchedQuestions);
        }
      } catch (err: any) {
        if (isMounted) {
          setFetchError(
            err.response?.data?.error || 'Failed to load test questions. Please check connection and retry.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTestState();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const currentAnswer = currentQuestion ? answers[String(currentQuestion.id)] : undefined;

  // Handle single choice selection (does not auto advance)
  const handleSelectOption = (key: string) => {
    if (!currentQuestion || submitting) return;

    const qIdStr = String(currentQuestion.id);
    const updated = { ...answers, [qIdStr]: key };
    setAnswers(updated);

    // Save answer asynchronously to server in the background
    if (session) {
      testApi.saveAnswer(session.session_id, session.recovery_token, currentQuestion.id, key).catch((e) => {
        console.warn('Background answer save error:', e);
      });
    }
  };

  // Manual NEXT navigation
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Manual final submission
  const handleSubmit = async () => {
    if (submittingRef.current || !session) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const result = await testApi.submitTest(session.session_id, session.recovery_token);
      saveLocalResult(result);
      clearLocalSession();
      navigate('/result', { replace: true });
    } catch (err: any) {
      submittingRef.current = false;
      setSubmitting(false);
      alert(err.response?.data?.error || 'Error submitting test. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-red" />
        <p className="text-sm font-semibold text-gray-600">Preparing Your Test Session...</p>
      </div>
    );
  }

  if (fetchError || !currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm text-center card-elevation border border-gray-100 space-y-4">
          <AlertCircle className="w-12 h-12 text-brand-red mx-auto" />
          <h3 className="text-lg font-bold text-gray-900">Session Error</h3>
          <p className="text-xs text-gray-500">{fetchError || 'Unable to access test questions.'}</p>
          <button
            onClick={() => navigate('/register')}
            className="w-full py-3 rounded-xl bg-brand-red text-white font-bold text-xs"
          >
            Return to Registration
          </button>
        </div>
      </div>
    );
  }

  // Build options array
  const options = [
    { key: 'a', label: 'A', text: currentQuestion.option_a },
    { key: 'b', label: 'B', text: currentQuestion.option_b },
    { key: 'c', label: 'C', text: currentQuestion.option_c },
    { key: 'd', label: 'D', text: currentQuestion.option_d },
  ].filter((o) => typeof o.text === 'string' && o.text.trim() !== '');

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
  const isReadingSection = currentQuestion.section === 'reading' || !!currentQuestion.reading_passage;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 flex flex-col justify-between pb-8 select-none">
      {/* Fixed Sticky Header with Global 60:00 Countdown Timer */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm px-4 sm:px-8 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Logo & Section Indicator */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
              <img
                src="https://i.postimg.cc/nLbBRfQP/photo-2021-04-03-05-52-16.jpg"
                alt="UNATION"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">UNATION LEVEL CHECK</p>
              <p className="text-xs font-black text-gray-900">
                Question {currentQuestion.id} <span className="text-gray-400 font-normal">/ {questions.length}</span>
              </p>
            </div>
          </div>

          {/* Global Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono font-bold text-sm transition-colors ${
              isUrgent
                ? 'bg-red-100 text-brand-red animate-pulse border border-red-300'
                : 'bg-gray-100 text-gray-800 border border-gray-200'
            }`}
          >
            <Clock className="w-4 h-4 text-brand-red" />
            <span>{formatted}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-red rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Question Interface */}
      <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-6 flex-1 space-y-6">
        {/* Reading Passage Display for Reading Section (Questions 101-120) */}
        {isReadingSection && currentQuestion.reading_passage && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 card-elevation border border-brand-gold/30 relative">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-gold uppercase tracking-wider mb-2">
              <BookOpen className="w-4 h-4" />
              <span>{currentQuestion.reading_passage_title || 'Reading Comprehension'}</span>
            </div>
            <div className="max-h-56 sm:max-h-64 overflow-y-auto passage-scrollbar pr-2 text-xs sm:text-sm text-gray-700 leading-relaxed space-y-3 font-serif">
              {currentQuestion.reading_passage.split('\n\n').map((para, pIdx) => (
                <p key={pIdx}>{para}</p>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-gray-400 text-right">
              Scroll down to view full passage
            </div>
          </div>
        )}

        {/* Question Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 card-elevation border border-gray-100 space-y-6">
          {/* Question Text */}
          <div className="space-y-2">
            <div className="inline-block px-3 py-1 rounded-lg bg-gray-100 text-[11px] font-bold text-gray-600">
              Part {currentQuestion.section === 'A' ? 'A (General)' : currentQuestion.section === 'B' ? 'B (Intermediate)' : 'Reading'}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
              {currentQuestion.question_text}
            </h2>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {options.map((opt) => {
              const isSelected = currentAnswer === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSelectOption(opt.key)}
                  disabled={submitting}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3.5 group ${
                    isSelected
                      ? 'border-brand-red bg-brand-red-light/50 text-gray-900 shadow-sm'
                      : 'border-gray-100 bg-gray-50/70 hover:bg-gray-100/70 text-gray-700'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-brand-red text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-500 group-hover:border-gray-400'
                    }`}
                  >
                    {isSelected ? <Check className="w-4 h-4" /> : opt.label}
                  </div>
                  <span className="text-sm font-medium leading-relaxed flex-1">
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Controls: Manual NEXT button */}
        <div className="pt-2">
          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-brand-red hover:bg-brand-red-dark text-white font-bold text-base flex items-center justify-center gap-2 button-3d shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting & Scoring Test...</span>
                </>
              ) : (
                <>
                  <span>FINALIZE & SUBMIT TEST</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-brand-red hover:bg-brand-red-dark text-white font-bold text-base flex items-center justify-center gap-2 button-3d shadow-md"
            >
              <span>NEXT QUESTION</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-[11px] text-gray-400 text-center">
          Questions must be advanced manually by pressing NEXT. Leaving unanswered counts as incorrect.
        </p>
      </main>
    </div>
  );
}
