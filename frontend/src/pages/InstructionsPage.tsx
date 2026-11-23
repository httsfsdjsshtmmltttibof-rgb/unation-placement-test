import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ListOrdered, MousePointerClick, Hourglass, Award, PlayCircle, ArrowLeft } from 'lucide-react';
import { getLocalSession } from '../lib/session';

export default function InstructionsPage() {
  const navigate = useNavigate();
  const session = getLocalSession();

  useEffect(() => {
    if (!session) {
      navigate('/register');
    }
  }, [session, navigate]);

  if (!session) return null;

  const rules = [
    {
      icon: ListOrdered,
      title: '120 Questions in Original Sequence',
      desc: 'The test consists of 100 multiple choice questions and 20 reading comprehension questions. No questions are randomly shuffled.',
    },
    {
      icon: Clock,
      title: '60-Minute Global Countdown',
      desc: 'One master countdown timer governs the entire test. There is NO 30-second per-question timer.',
    },
    {
      icon: MousePointerClick,
      title: 'Manual Navigation (NEXT Button)',
      desc: 'Selecting an answer will NOT automatically advance. You must manually click NEXT to proceed to the next question.',
    },
    {
      icon: Hourglass,
      title: 'Automatic Submission at Zero',
      desc: 'When the 60:00 timer reaches 00:00, your test will automatically finalize and submit immediately.',
    },
    {
      icon: Award,
      title: 'Instant Accurate Scoring',
      desc: 'Each question equals 1 point. Your English level is calculated server-side based on exact academic boundaries.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 flex flex-col items-center justify-center p-6 sm:p-10 select-none">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <button
          onClick={() => navigate('/register')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Change Registration
        </button>

        {/* Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 card-elevation border border-gray-100 space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-red bg-brand-red-light px-3 py-1 rounded-full">
              Test Instructions
            </span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight pt-2">
              Ready for Your Assessment?
            </h1>
            <p className="text-xs text-gray-500">
              Candidate: <strong className="text-gray-900">{session.student_name}</strong>
            </p>
          </div>

          {/* Rules List */}
          <div className="space-y-4">
            {rules.map((rule, index) => {
              const Icon = rule.icon;
              return (
                <div key={index} className="flex items-start gap-3.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand-red flex-shrink-0 mt-0.5 border border-gray-100">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-gray-900">{rule.title}</h3>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{rule.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 leading-relaxed">
            <strong>Important:</strong> Do not close or refresh the window unnecessarily. Your progress is continuously saved to the server.
          </div>

          {/* Start Test Action */}
          <button
            onClick={() => navigate('/test')}
            className="w-full py-4 px-6 rounded-2xl bg-brand-red hover:bg-brand-red-dark text-white font-bold text-base flex items-center justify-center gap-2 button-3d"
          >
            <PlayCircle className="w-5 h-5" />
            <span>START TEST NOW</span>
          </button>
        </div>
      </div>
    </div>
  );
}
