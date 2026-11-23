import React, { forwardRef } from 'react';
import { Award, CheckCircle2, Calendar, Clock } from 'lucide-react';
import { TestResultData } from '../types';

interface CertificateCardProps {
  result: TestResultData;
}

const LEVEL_THEMES: Record<string, { badgeBg: string; badgeText: string; border: string }> = {
  'Beginner': { badgeBg: 'bg-stone-100', badgeText: 'text-stone-700', border: 'border-stone-300' },
  'Elementary': { badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-800', border: 'border-emerald-300' },
  'Pre-intermediate': { badgeBg: 'bg-blue-50', badgeText: 'text-blue-800', border: 'border-blue-300' },
  'Intermediate': { badgeBg: 'bg-indigo-50', badgeText: 'text-indigo-800', border: 'border-indigo-300' },
  'Upper Intermediate': { badgeBg: 'bg-amber-50', badgeText: 'text-amber-800', border: 'border-amber-400' },
  'Advanced': { badgeBg: 'bg-red-50', badgeText: 'text-brand-red', border: 'border-red-300' },
};

export const CertificateCard = forwardRef<HTMLDivElement, CertificateCardProps>(({ result }, ref) => {
  const theme = LEVEL_THEMES[result.level] || LEVEL_THEMES['Intermediate'];
  const formattedDate = new Date(result.completed_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const durationMin = Math.round(result.duration_seconds / 60);

  return (
    <div
      ref={ref}
      className="bg-white text-gray-900 rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl border border-gray-100 max-w-xl mx-auto"
      style={{
        boxShadow: '0 25px 50px -12px rgba(196, 18, 48, 0.08), 0 0 0 1px rgba(0,0,0,0.03)',
      }}
    >
      {/* Outer Luxury Double Border with Gold Trim */}
      <div className="absolute inset-3 sm:inset-4 border border-brand-gold/30 rounded-2xl pointer-events-none" />
      <div className="absolute inset-4 sm:inset-5 border border-brand-gold/15 rounded-xl pointer-events-none" />

      {/* Subtle Corner Gold Ornaments */}
      <div className="absolute top-6 left-6 w-3 h-3 border-t-2 border-l-2 border-brand-gold/50" />
      <div className="absolute top-6 right-6 w-3 h-3 border-t-2 border-r-2 border-brand-gold/50" />
      <div className="absolute bottom-6 left-6 w-3 h-3 border-b-2 border-l-2 border-brand-gold/50" />
      <div className="absolute bottom-6 right-6 w-3 h-3 border-b-2 border-r-2 border-brand-gold/50" />

      {/* Top Header Section */}
      <div className="text-center space-y-4 pt-2">
        {/* School Logo */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full p-1 bg-white shadow-md border-2 border-brand-gold/40 flex items-center justify-center overflow-hidden">
            <img
              src="https://i.postimg.cc/nLbBRfQP/photo-2021-04-03-05-52-16.jpg"
              alt="UNATION English School"
              className="w-full h-full object-cover rounded-full"
              crossOrigin="anonymous"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-bold tracking-[0.25em] text-brand-gold uppercase">UNATION ENGLISH SCHOOL</p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight mt-0.5">
            ENGLISH LEVEL RESULT
          </h2>
          <p className="text-xs text-gray-400 font-medium">Verified Placement Assessment</p>
        </div>
      </div>

      {/* Gold Divider Ribbon */}
      <div className="my-6 flex items-center justify-center gap-3">
        <div className="h-px bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent flex-1" />
        <Award className="w-5 h-5 text-brand-gold" />
        <div className="h-px bg-gradient-to-l from-transparent via-brand-gold/40 to-transparent flex-1" />
      </div>

      {/* Recipient Section */}
      <div className="text-center space-y-1.5 my-6">
        <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">This is proudly awarded to</p>
        <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-gray-900 tracking-normal px-2">
          {result.student_name}
        </h1>
        <p className="text-xs text-gray-500 font-light max-w-sm mx-auto pt-1">
          for successfully completing the 120-question comprehensive English placement examination.
        </p>
      </div>

      {/* Level & Score Showcase */}
      <div className="my-7 bg-gradient-to-b from-gray-50 to-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">Assessed Proficiency Level</p>
        
        <div className="inline-block px-6 py-2.5 rounded-full border-2 border-brand-gold/30 bg-brand-gold-light/40 mb-4 shadow-sm">
          <span className="text-2xl sm:text-3xl font-extrabold text-brand-red tracking-tight">
            {result.level}
          </span>
        </div>

        {/* Breakdown Stats */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
          <div className="p-2">
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{result.score}<span className="text-xs font-normal text-gray-400">/120</span></p>
            <p className="text-[11px] text-gray-500 font-medium">Total Score</p>
          </div>
          <div className="p-2 border-x border-gray-100">
            <p className="text-xl sm:text-2xl font-bold text-emerald-600">{result.correct_count}</p>
            <p className="text-[11px] text-gray-500 font-medium">Correct</p>
          </div>
          <div className="p-2">
            <p className="text-xl sm:text-2xl font-bold text-gray-500">{result.incorrect_count + result.unanswered_count}</p>
            <p className="text-[11px] text-gray-500 font-medium">Incorrect</p>
          </div>
        </div>
      </div>

      {/* Meta Information Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 px-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>{durationMin} min test duration</span>
        </div>
      </div>

      {/* Institutional Note */}
      <div className="mt-8 text-center border-t border-gray-100 pt-4">
        <p className="text-[10px] text-gray-400 font-light leading-relaxed">
          Official Placement Result Issued by UNATION English School.<br />
          This assessment represents an educational placement result and is not an official CEFR certificate.
        </p>
      </div>
    </div>
  );
});

CertificateCard.displayName = 'CertificateCard';
