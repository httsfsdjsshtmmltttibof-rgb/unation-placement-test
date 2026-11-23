import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckSquare, Award, ArrowRight, ShieldCheck } from 'lucide-react';

export default function WelcomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Expand to full view if opened inside Telegram Mini App
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 flex flex-col items-center justify-between p-6 sm:p-10 select-none">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto text-center pt-4 sm:pt-8 space-y-6">
        {/* School Emblem / Logo */}
        <div className="flex justify-center">
          <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-brand-red to-brand-gold rounded-full blur-md opacity-30 group-hover:opacity-50 transition duration-300" />
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1.5 bg-white shadow-xl border border-gray-100 flex items-center justify-center overflow-hidden">
              <img
                src="https://i.postimg.cc/nLbBRfQP/photo-2021-04-03-05-52-16.jpg"
                alt="UNATION English School"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest bg-brand-red-light text-brand-red">
            <ShieldCheck className="w-3.5 h-3.5" /> Official Placement System
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
            UNATION ENGLISH<br />
            <span className="text-brand-red">LEVEL CHECK</span>
          </h1>
          <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
            Assess your English grammar, vocabulary, and reading comprehension with our authoritative placement standard.
          </p>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="w-full max-w-md mx-auto my-6 bg-white rounded-3xl p-6 sm:p-8 card-elevation border border-gray-100 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-brand-red-light text-brand-red flex items-center justify-center mx-auto mb-2">
              <CheckSquare className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">120</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">Test Questions</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-brand-gold-light text-brand-gold-dark flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">60</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">Total Minutes</p>
          </div>
        </div>

        {/* Level Scale Indicator */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Score Placement Tiers</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {['Beginner', 'Elementary', 'Pre-intermediate', 'Intermediate', 'Upper Intermediate', 'Advanced'].map((lvl) => (
              <span
                key={lvl}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700"
              >
                {lvl}
              </span>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => navigate('/register')}
          className="w-full py-4 px-6 rounded-2xl bg-brand-red hover:bg-brand-red-dark text-white font-bold text-base flex items-center justify-center gap-2 button-3d"
        >
          <span>Start Placement Test</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Footer Info */}
      <div className="text-center pb-2">
        <p className="text-xs text-gray-400 font-medium">
          UNATION English School • All rights reserved
        </p>
      </div>
    </div>
  );
}
