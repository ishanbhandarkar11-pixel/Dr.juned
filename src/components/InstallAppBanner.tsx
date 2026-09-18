import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA (standalone)
    const isApp = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isApp);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (isStandalone || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {/* Sleek App Install Prompt Card */}
      <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-[#162544] to-[#1C2541] border border-sky-500/30 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
            <Smartphone size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              फ़ोन में ऐप इंस्टॉल करें
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold">फ्री</span>
            </h4>
            <p className="text-[11px] text-slate-300 mt-0.5">
              बिना प्ले स्टोर, सीधा आपके मोबाइल स्क्रीन पर
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold shadow-md shadow-sky-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
          >
            <Download size={14} />
            इंस्टॉल
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
            title="छुपाएं"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Manual Step Guide Modal if browser prompt isn't directly supported */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#162038] border border-[#2A3756] rounded-3xl p-5 max-w-sm w-full shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#2A3756]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Smartphone size={18} />
                </div>
                <h3 className="font-bold text-sm text-white">अपने मोबाइल में ऐप जोड़ें</h3>
              </div>
              <button 
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              इसके लिए प्ले स्टोर की कोई ज़रूरत नहीं है! यह सिर्फ़ 5 सेकंड में आपके फ़ोन की होम-स्क्रीन पर ऐप की तरह आ जाएगी:
            </p>

            <div className="space-y-3 mb-5">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#1C2541] border border-[#2A3756]">
                <div className="w-5 h-5 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <p className="text-xs text-slate-200">
                  ऊपर Chrome ब्राउज़र में दाएँ कोने में <strong>3 डॉट्स (⋮)</strong> पर क्लिक करें।
                </p>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#1C2541] border border-[#2A3756]">
                <div className="w-5 h-5 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <p className="text-xs text-slate-200">
                  मेन्यू में <strong>"Install app"</strong> या <strong>"Add to Home screen" (होम स्क्रीन पर जोड़ें)</strong> दबाएँ।
                </p>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#1C2541] border border-[#2A3756]">
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  ✓
                </div>
                <p className="text-xs text-slate-200">
                  बस! आपके मोबाइल में <strong>दूध डायरी</strong> का असली ऐप आइकन बन जाएगा।
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 font-bold text-xs text-white shadow-lg shadow-sky-500/30 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={16} />
              समझ गया
            </button>
          </div>
        </div>
      )}
    </>
  );
}
