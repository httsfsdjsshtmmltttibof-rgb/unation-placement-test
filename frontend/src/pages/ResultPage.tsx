import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { Download, RefreshCw, CheckCircle, Home, Share2, Loader2 } from 'lucide-react';
import { getLocalResult } from '../lib/session';
import { CertificateCard } from '../components/CertificateCard';
import { TestResultData } from '../types';

export default function ResultPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<TestResultData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cached = getLocalResult();
    if (!cached) {
      navigate('/', { replace: true });
    } else {
      setResult(cached);
    }
  }, [navigate]);

  const handleDownloadImage = async () => {
    if (!certificateRef.current || downloading) return;
    setDownloading(true);

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 3, // High-resolution export
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const downloadLink = document.createElement('a');
      const filename = `UNATION-Result-${(result?.student_name || 'Student').replace(/\s+/g, '_')}.png`;
      downloadLink.download = filename;
      downloadLink.href = image;
      downloadLink.click();
    } catch (err) {
      console.error('Failed to export certificate image:', err);
      alert('Could not generate image download. Please take a screenshot of your result.');
    } finally {
      setDownloading(false);
    }
  };

  if (!result) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 py-8 px-4 sm:px-6 select-none">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Celebration Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Assessment Completed!
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Congratulations, <strong className="text-gray-900">{result.student_name}</strong>. Here is your official UNATION English placement result.
          </p>
        </div>

        {/* Certificate / Result Card Component */}
        <CertificateCard ref={certificateRef} result={result} />

        {/* Action Controls */}
        <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="flex-1 py-4 px-6 rounded-2xl bg-brand-red hover:bg-brand-red-dark text-white font-bold text-sm flex items-center justify-center gap-2 button-3d shadow-md transition"
          >
            {downloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating High-Res Image...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Save Result Card as Image</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/')}
            className="py-4 px-6 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>
        </div>

        {/* Bottom Educational Guidance */}
        <div className="max-w-xl mx-auto bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center text-xs text-gray-500 leading-relaxed">
          <p>
            Please present this placement card to your academic counselor at UNATION English School to enroll in the appropriate study module.
          </p>
        </div>
      </div>
    </div>
  );
}
