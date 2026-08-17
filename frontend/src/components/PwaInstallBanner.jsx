import React, { useState, useEffect } from 'react';
import {
  Download,
  Bell,
  BellOff,
  Sparkles,
  Smartphone,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkPushSubscriptionStatus,
} from '../services/pwa';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [loadingPush, setLoadingPush] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState(null);

  // Check if app is already running in standalone PWA mode
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalled(isStandalone);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check push subscription
    checkPushSubscriptionStatus().then(setIsPushSubscribed);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleTogglePush = async () => {
    setLoadingPush(true);
    setPushStatusMessage(null);
    try {
      if (isPushSubscribed) {
        await unsubscribeFromPushNotifications();
        setIsPushSubscribed(false);
        setPushStatusMessage({ type: 'success', text: 'Push alerts disabled.' });
      } else {
        await subscribeToPushNotifications();
        setIsPushSubscribed(true);
        setPushStatusMessage({ type: 'success', text: 'Push notifications enabled successfully!' });
      }
    } catch (err) {
      setPushStatusMessage({
        type: 'error',
        text: err.message || 'Could not enable push notifications.',
      });
    } finally {
      setLoadingPush(false);
      setTimeout(() => setPushStatusMessage(null), 4000);
    }
  };

  if (isDismissed) return null;

  return (
    <>
      {/* Toast Feedback for Push Toggle */}
      {pushStatusMessage && (
        <div className="fixed bottom-20 right-6 z-50 animate-fade-in bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-bold">
          {pushStatusMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-400" />
          ) : (
            <AlertCircle size={16} className="text-rose-400" />
          )}
          <span>{pushStatusMessage.text}</span>
        </div>
      )}

      {/* Floating PWA Controls Pill */}
      {(isInstallable || !isPushSubscribed) && !isInstalled && (
        <div className="fixed bottom-5 right-5 z-40 animate-slide-up flex items-center gap-2 bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-900 border border-emerald-500/30 p-2 pl-4 rounded-full shadow-2xl text-white">
          <div className="flex items-center gap-2 pr-2 border-r border-white/10 text-xs font-bold">
            <Smartphone size={15} className="text-emerald-400" />
            <span className="hidden sm:inline">Install HANARA SMS</span>
          </div>

          {/* Install Button (if browser triggered prompt) */}
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-full text-xs font-black shadow-md transition-colors"
            >
              <Download size={13} />
              <span>Install App</span>
            </button>
          )}

          {/* Push Notifications 1-Click Button */}
          <button
            onClick={handleTogglePush}
            disabled={loadingPush}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              isPushSubscribed
                ? 'bg-white/10 hover:bg-white/20 text-slate-300'
                : 'bg-teal-700 hover:bg-teal-600 text-white'
            }`}
            title={isPushSubscribed ? 'Disable Push Alerts' : 'Enable Real-time Push Alerts'}
          >
            {loadingPush ? (
              <Loader2 className="animate-spin" size={13} />
            ) : isPushSubscribed ? (
              <BellOff size={13} />
            ) : (
              <Bell size={13} />
            )}
            <span className="hidden md:inline">
              {isPushSubscribed ? 'Alerts Enabled' : 'Enable Alerts'}
            </span>
          </button>

          {/* Dismiss button */}
          <button
            onClick={() => setIsDismissed(true)}
            className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </>
  );
}
