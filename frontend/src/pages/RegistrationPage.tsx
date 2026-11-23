import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, KeyRound, ArrowRight, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { testApi } from '../lib/api';
import { saveLocalSession } from '../lib/session';

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [testId, setTestId] = useState('');
  const [telegramId, setTelegramId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-fill from Telegram Mini App if available
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser) {
      const tgName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
      if (tgName && !fullName) {
        setFullName(tgName);
      }
      if (tgUser.id) {
        setTelegramId(String(tgUser.id));
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedCode = testId.trim().toUpperCase();

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }
    if (!trimmedCode) {
      setError('Iltimos, kirish parolini kiriting.');
      return;
    }

    setLoading(true);

    try {
      // 1. Pre-validate ID first
      await testApi.validateId(trimmedCode);

      // 2. Start or resume test session
      const session = await testApi.startTest(trimmedName, trimmedCode, telegramId);

      // 3. Save to local storage for recovery
      saveLocalSession(session);

      // 4. Proceed to instructions
      navigate('/instructions');
    } catch (err: any) {
      const serverMessage =
        err.response?.data?.error ||
        (err.code === 'ERR_NETWORK'
          ? 'Cannot connect to server. Please ensure the backend is running.'
          : 'Failed to authenticate test ID. Please verify your credentials.');
      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 flex flex-col items-center justify-center p-6 sm:p-10 select-none">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Back Link */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Welcome
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full p-1 bg-white shadow-md border border-gray-100 mx-auto flex items-center justify-center overflow-hidden mb-3">
            <img
              src="https://i.postimg.cc/nLbBRfQP/photo-2021-04-03-05-52-16.jpg"
              alt="UNATION"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Student Registration</h2>
          <p className="text-xs text-gray-500">
            Enter your official name and access password to begin the placement test.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start gap-3 shadow-sm animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <div className="text-xs font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {/* Registration Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 card-elevation border border-gray-100 space-y-5">
          {/* Full Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Full Name (Ism va Familiya)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ibrohim Abdurashidov"
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition"
              />
            </div>
          </div>

          {/* Password / Access Key Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Access Password (Kirish paroli)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={testId}
                onChange={(e) => setTestId(e.target.value)}
                placeholder="Parolni kiriting..."
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-brand-red hover:bg-brand-red-dark disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 button-3d transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying Access...</span>
              </>
            ) : (
              <>
                <span>Continue to Test</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
