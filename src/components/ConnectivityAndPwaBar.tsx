import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { LanguageCode } from '../i18n/translations';
import { SyncStatusState } from '../services/offlineVault';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallButton: React.FC<{ lang: LanguageCode }> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-white bg-[#0F1E36] hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
      >
        <Download className="w-3.5 h-3.5 text-amber-400" />
        <span>
          {lang === 'ar' ? 'تثبيت التطبيق' : lang === 'fr' ? 'Installer App' : 'Install App'}
        </span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#0088CC]" />
          <span>{lang === 'ar' ? 'تثبيت iOS' : 'Install iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-slate-200 space-y-3">
              <h3 className="text-base font-bold text-slate-900">
                {lang === 'ar' ? 'تثبيت AuditShield على iPhone / iPad' : 'Install AuditShield on iOS'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === 'ar'
                  ? '1. اضغط على زر المشاركة (Share) في شريط Safari.\n2. اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).'
                  : '1. Tap the Share button in Safari.\n2. Scroll down and tap Add to Home Screen.'}
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 text-xs font-semibold text-white bg-[#0F1E36] rounded-lg"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

interface SyncBadgeProps {
  lang: LanguageCode;
  syncStatus: SyncStatusState;
  pendingCount: number;
  lastError: string | null;
  hasCloudAuth: boolean;
  onRetrySync: () => void;
}

export const SyncStatusBadge: React.FC<SyncBadgeProps> = ({
  lang,
  syncStatus,
  pendingCount,
  lastError,
  hasCloudAuth,
  onRetrySync,
}) => {
  const isAr = lang === 'ar';

  const meta: Record<
    SyncStatusState,
    { label: string; badgeClass: string; Icon: typeof Cloud }
  > = {
    ONLINE: {
      label: hasCloudAuth ? 'ONLINE' : isAr ? 'ONLINE (محلي)' : 'ONLINE (LOCAL)',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      Icon: CheckCircle2,
    },
    OFFLINE: {
      label: 'OFFLINE',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
      Icon: CloudOff,
    },
    SYNCING: {
      label: 'SYNCING',
      badgeClass: 'bg-sky-50 text-[#0B4F8C] border-sky-200',
      Icon: RefreshCw,
    },
    SYNC_ERROR: {
      label: 'SYNC ERROR',
      badgeClass: 'bg-red-50 text-red-800 border-red-300',
      Icon: AlertTriangle,
    },
  };

  const current = meta[syncStatus];
  const Icon = current.Icon;

  return (
    <div className="flex items-center gap-1.5">
      <span
        title={lastError || undefined}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono font-semibold ${current.badgeClass}`}
        dir="ltr"
      >
        <Icon
          className={`w-3.5 h-3.5 shrink-0 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`}
        />
        <span>{current.label}</span>
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white text-[10px]">
            {pendingCount}
          </span>
        )}
      </span>

      {(pendingCount > 0 || syncStatus === 'SYNC_ERROR') && (
        <button
          type="button"
          onClick={onRetrySync}
          title={isAr ? 'إعادة المزامنة الآن' : 'Sync pending queue now'}
          className="px-2 py-1 text-[11px] font-semibold bg-[#0F1E36] hover:bg-slate-800 text-white rounded-md transition-colors"
        >
          {isAr ? 'مزامنة' : 'Sync'}
        </button>
      )}
    </div>
  );
};
