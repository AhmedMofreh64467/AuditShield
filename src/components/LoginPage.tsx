import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RotateCcw,
  ShieldCheck,
  User,
} from 'lucide-react';
import loginHeroImg from '../assets/images/pms_tablet_desk_1794687997283.jpg';
import { signInWithGoogleCloud } from '../firebase';
import { LanguageCode } from '../i18n/translations';
import { SecuritySettings, UserRole } from '../types/audit';

interface LoginPageProps {
  lang: LanguageCode;
  hotelName: string;
  security: SecuritySettings;
  onChangeLang: (lang: LanguageCode) => void;
  onLoginSuccess: (username: string, role?: UserRole) => void;
  onResetDefaultSecurity: () => void;
}

const LOGIN_COPY: Record<
  LanguageCode,
  {
    dir: 'rtl' | 'ltr';
    brandSubtitle: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    verifyPrompt: string;
    verifying: string;
    verified: string;
    securityLabel: string;
    forgotPassword: string;
    forgotHintDefault: string;
    forgotHintCustom: string;
    resetSecurityBtn: string;
    confirmResetSecurityBtn: string;
    resetDoneMsg: string;
    signInBtn: string;
    signingIn: string;
    errorMissingFields: string;
    errorInvalidCreds: string;
    errorVerifyRequired: string;
    heroHeadline: string;
    heroSubline: string;
    footerNote: string;
    googleBtn: string;
    googleHint: string;
    googleFail: string;
  }
> = {
  ar: {
    dir: 'rtl',
    brandSubtitle: 'THE HOSPITALITY AUDIT ECOSYSTEM FOR TOMORROW',
    usernameLabel: 'اسم المستخدم أو البريد',
    usernamePlaceholder: 'a.mofrah',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: '••••••••••••',
    verifyPrompt: 'اضغط للتحقق الأمني قبل الدخول',
    verifying: 'يتم التحقق الآن...',
    verified: 'تم التحقق الأمني بنجاح',
    securityLabel: 'حماية جلسة المراجع',
    forgotPassword: 'نسيت كلمة المرور؟',
    forgotHintDefault:
      'كلمة المرور الافتراضية الحالية هي (hotel-audit-2026) واسم المستخدم (a.mofrah). يمكنك تغيير بيانات الأمان في أي وقت من صفحة الإعدادات.',
    forgotHintCustom:
      'تم تخصيص كلمة مرور خاصة من إعدادات الأمان. إذا نسيتها يمكنك استعادة بيانات الدخول الافتراضية.',
    resetSecurityBtn: 'استعادة الأمان الافتراضي',
    confirmResetSecurityBtn: 'تأكيد استعادة كلمة المرور الافتراضية',
    resetDoneMsg: 'تمت استعادة بيانات الدخول الافتراضية (a.mofrah / hotel-audit-2026).',
    signInBtn: 'تسجيل الدخول',
    signingIn: 'جاري الدخول...',
    errorMissingFields: 'يرجى إدخال اسم المستخدم وكلمة المرور للمتابعة.',
    errorInvalidCreds: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
    errorVerifyRequired: 'يرجى إتمام مربع التحقق الأمني أولاً.',
    heroHeadline: 'منظومة الضيافة والمراجعة للمستقبل',
    heroSubline: 'مراجعة الإيرادات · مطابقة Kwentra · حماية بيانات الفندق',
    footerNote: 'تخزين محلي + مزامنة سحابية دائمة بدون حذف',
    googleBtn: 'الدخول السحابي الدائم عبر Google',
    googleHint: 'يحفظ الغرف والقيود والأرشيف تلقائياً في السحابة بدون حذف',
    googleFail: 'تعذر إتمام تسجيل الدخول عبر Google. حاول مرة أخرى.',
  },
  en: {
    dir: 'ltr',
    brandSubtitle: 'THE HOSPITALITY AUDIT ECOSYSTEM FOR TOMORROW',
    usernameLabel: 'Auditor Username',
    usernamePlaceholder: 'a.mofrah',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••••••',
    verifyPrompt: 'Click to complete security verification',
    verifying: 'Verifying session...',
    verified: 'Security check verified',
    securityLabel: 'Auditor Session Guard',
    forgotPassword: 'Forgot password?',
    forgotHintDefault:
      'Default credentials are username (a.mofrah) and passcode (hotel-audit-2026). You can change all security settings inside Property Settings.',
    forgotHintCustom:
      'A custom passcode is active in Security Settings. If forgotten, you can restore the default credentials below.',
    resetSecurityBtn: 'Restore Default Security',
    confirmResetSecurityBtn: 'Confirm Restore Defaults',
    resetDoneMsg: 'Default credentials restored (a.mofrah / hotel-audit-2026).',
    signInBtn: 'Sign In',
    signingIn: 'Signing in...',
    errorMissingFields: 'Please enter both username and password.',
    errorInvalidCreds: 'Incorrect username or password.',
    errorVerifyRequired: 'Please complete the security verification checkbox first.',
    heroHeadline: 'The Hospitality Audit Ecosystem for Tomorrow',
    heroSubline: 'Income Audit · Kwentra Reconciliation · Offline Continuity',
    footerNote: 'Zero-delete local + permanent cloud persistence',
    googleBtn: 'Sign in with Google (Cloud Vault)',
    googleHint: 'Syncs rooms, ledger, and audit archives permanently in Firestore',
    googleFail: 'Could not complete Google Sign-In. Please try again.',
  },
  fr: {
    dir: 'ltr',
    brandSubtitle: 'THE HOSPITALITY AUDIT ECOSYSTEM FOR TOMORROW',
    usernameLabel: 'Nom d’utilisateur',
    usernamePlaceholder: 'a.mofrah',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: '••••••••••••',
    verifyPrompt: 'Cliquez pour valider la vérification de sécurité',
    verifying: 'Vérification en cours...',
    verified: 'Vérification réussie',
    securityLabel: 'Protection Auditeur',
    forgotPassword: 'Mot de passe oublié ?',
    forgotHintDefault:
      'Identifiants par défaut : (a.mofrah / hotel-audit-2026). Modifiables à tout moment dans les paramètres de sécurité.',
    forgotHintCustom:
      'Un mot de passe personnalisé est actif. En cas d’oubli, vous pouvez restaurer les accès par défaut ci-dessous.',
    resetSecurityBtn: 'Restaurer accès par défaut',
    confirmResetSecurityBtn: 'Confirmer la réinitialisation',
    resetDoneMsg: 'Accès par défaut restaurés (a.mofrah / hotel-audit-2026).',
    signInBtn: 'Connexion',
    signingIn: 'Connexion...',
    errorMissingFields: 'Veuillez saisir votre identifiant et mot de passe.',
    errorInvalidCreds: 'Identifiant ou mot de passe incorrect.',
    errorVerifyRequired: 'Veuillez valider la case de sécurité avant de continuer.',
    heroHeadline: 'L’Écosystème d’Audit Hôtelier de Demain',
    heroSubline: 'Audit des Revenus · Rapprochement Kwentra · Continuité',
    footerNote: 'Sauvegarde locale + Cloud permanent sans suppression',
    googleBtn: 'Connexion Google (Coffre Cloud)',
    googleHint: 'Sauvegarde permanente des chambres et écritures dans Firestore',
    googleFail: 'Échec de connexion Google. Veuillez réessayer.',
  },
};

const LANG_OPTIONS: { code: LanguageCode; label: string }[] = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
];

const DEFAULT_PASSCODE = 'hotel-audit-2026';

export const LoginPage: React.FC<LoginPageProps> = ({
  lang,
  hotelName,
  security,
  onChangeLang,
  onLoginSuccess,
  onResetDefaultSecurity,
}) => {
  const c = LOGIN_COPY[lang];
  const isDefaultPasscode = security.passcode === DEFAULT_PASSCODE;

  const [username, setUsername] = useState(security.username || 'a.mofrah');
  const [password, setPassword] = useState(isDefaultPasscode ? DEFAULT_PASSCODE : '');
  const [showPassword, setShowPassword] = useState(false);
  const [verifyState, setVerifyState] = useState<'idle' | 'checking' | 'verified'>(
    security.requireSecurityCheck ? 'checking' : 'verified'
  );
  const [showForgotHint, setShowForgotHint] = useState(false);
  const [confirmResetStep, setConfirmResetStep] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  // Brief automatic verification settling like Kwentra's security box
  useEffect(() => {
    if (!security.requireSecurityCheck) {
      setVerifyState('verified');
      return;
    }
    if (verifyState !== 'checking') return;
    const timer = window.setTimeout(() => {
      setVerifyState('verified');
    }, 650);
    return () => window.clearTimeout(timer);
  }, [verifyState, security.requireSecurityCheck]);

  const handleToggleVerify = () => {
    setErrorMsg('');
    if (verifyState === 'idle') {
      setVerifyState('checking');
    } else if (verifyState === 'verified') {
      setVerifyState('idle');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setErrorMsg(c.errorMissingFields);
      return;
    }

    const operators = security.roleUsers ?? [];
    const matchedOp = operators.find(
      (op) => op.username.trim().toLowerCase() === cleanUser.toLowerCase()
    );
    let resolvedRole: UserRole = security.activeRole ?? 'Administrator';
    let resolvedUser = cleanUser;

    if (security.requireStrictCredentials) {
      const primaryMatches =
        cleanUser.toLowerCase() === security.username.trim().toLowerCase() &&
        password === security.passcode;
      const opMatches = Boolean(matchedOp && password === matchedOp.passcode);

      if (!primaryMatches && !opMatches) {
        setErrorMsg(c.errorInvalidCreds);
        return;
      }
      if (opMatches && matchedOp) {
        resolvedRole = matchedOp.role;
        resolvedUser = matchedOp.username;
      } else if (primaryMatches) {
        resolvedRole = security.activeRole ?? 'Administrator';
      }
    } else if (matchedOp) {
      resolvedRole = matchedOp.role;
      resolvedUser = matchedOp.username;
    }

    if (security.requireSecurityCheck && verifyState !== 'verified') {
      setErrorMsg(c.errorVerifyRequired);
      return;
    }

    setSubmitting(true);
    window.setTimeout(() => {
      onLoginSuccess(resolvedUser, resolvedRole);
    }, 220);
  };

  const handleRestoreDefaults = () => {
    if (!confirmResetStep) {
      setConfirmResetStep(true);
      return;
    }
    onResetDefaultSecurity();
    setUsername('a.mofrah');
    setPassword(DEFAULT_PASSCODE);
    setConfirmResetStep(false);
    setErrorMsg('');
    setResetMsg(c.resetDoneMsg);
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogleCloud();
      onLoginSuccess(user.displayName || user.email || security.username || 'a.mofrah');
    } catch {
      setErrorMsg(c.googleFail);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      dir="ltr"
      className="min-h-screen w-full bg-white grid grid-cols-1 lg:grid-cols-2"
    >
      {/* Left Half: Clean White Kwentra-Inspired Authentication Form */}
      <div
        dir={c.dir}
        className="flex flex-col justify-between px-6 sm:px-12 lg:px-16 py-8 bg-white"
      >
        {/* Subtle Language Switcher */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-medium text-slate-500 truncate">{hotelName}</span>
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => onChangeLang(opt.code)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                  lang === opt.code
                    ? 'bg-[#0052B4] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Centered Form Card */}
        <div className="w-full max-w-md mx-auto my-auto py-10 space-y-8">
          {/* Brand Lockup */}
          <div className="space-y-1.5" dir="ltr">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#0052B4] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0052B4]">
                Hotel Income Auditor
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] text-[#2B6CB0] ps-11">
              {c.brandSubtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="login-username" className="sr-only">
                {c.usernameLabel}
              </label>
              <div className="flex items-center gap-3 px-3.5 py-3 rounded-lg bg-[#EDF2F7] border border-[#CBD5E1] focus-within:border-[#1D5BB8] focus-within:bg-[#EBF4FF] transition-colors">
                <User className="w-4 h-4 text-slate-700 shrink-0" />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={c.usernamePlaceholder}
                  dir="ltr"
                  className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="login-password" className="sr-only">
                {c.passwordLabel}
              </label>
              <div className="flex items-center gap-3 px-3.5 py-3 rounded-lg bg-[#EDF2F7] border border-[#CBD5E1] focus-within:border-[#1D5BB8] focus-within:bg-[#EBF4FF] transition-colors">
                <KeyRound className="w-4 h-4 text-slate-700 shrink-0" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={c.passwordPlaceholder}
                  dir="ltr"
                  className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Interactive Security Verification Box (Toggleable from Security Settings) */}
            {security.requireSecurityCheck && (
              <div className="border border-slate-300 rounded-md bg-white px-4 py-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleToggleVerify}
                  className="flex items-center gap-2.5 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors text-start"
                >
                  {verifyState === 'checking' ? (
                    <Loader2 className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
                  ) : verifyState === 'verified' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-5 h-5 rounded border-2 border-slate-400 inline-block shrink-0" />
                  )}
                  <span>
                    {verifyState === 'checking'
                      ? c.verifying
                      : verifyState === 'verified'
                      ? c.verified
                      : c.verifyPrompt}
                  </span>
                </button>

                <div className="flex flex-col items-center shrink-0 text-slate-500">
                  <ShieldCheck className="w-5 h-5 text-[#0052B4]" />
                  <span className="text-[9px] font-semibold mt-0.5 whitespace-nowrap">
                    {c.securityLabel}
                  </span>
                </div>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs font-medium text-red-600">{errorMsg}</p>
            )}

            {resetMsg && (
              <p className="text-xs font-medium text-emerald-700">{resetMsg}</p>
            )}

            {/* Forgot Password + Primary Sign In Button */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowForgotHint((v) => !v);
                  setConfirmResetStep(false);
                }}
                className="text-xs text-slate-400 hover:text-[#0052B4] transition-colors"
              >
                {c.forgotPassword}
              </button>

              <button
                type="submit"
                disabled={submitting || googleLoading}
                className="px-7 py-2.5 text-sm font-semibold text-white bg-[#1D5BB8] hover:bg-[#164894] disabled:bg-[#6E92C9] rounded-lg transition-colors whitespace-nowrap"
              >
                {submitting ? c.signingIn : c.signInBtn}
              </button>
            </div>

            {/* Permanent Cloud Vault Google Sign-In */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || submitting}
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#0052B4]" />
                ) : (
                  <Cloud className="w-4 h-4 text-[#0052B4]" />
                )}
                <span>{c.googleBtn}</span>
              </button>
              <p className="text-[11px] text-slate-500 text-center">{c.googleHint}</p>
            </div>

            {showForgotHint && (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-2.5">
                <p>{isDefaultPasscode ? c.forgotHintDefault : c.forgotHintCustom}</p>
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className={`inline-flex items-center gap-1.5 font-semibold transition-colors ${
                    confirmResetStep
                      ? 'text-red-600 hover:text-red-700'
                      : 'text-[#0052B4] hover:underline'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {confirmResetStep ? c.confirmResetSecurityBtn : c.resetSecurityBtn}
                  </span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Quiet Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>{c.footerNote}</span>
          <span className="font-mono text-[11px]" dir="ltr">
            Hotel Income Auditor
          </span>
        </div>
      </div>

      {/* Right Half: Hospitality PMS Tablet Visual Showcase + Royal Blue Diagonal Accent */}
      <div className="relative hidden lg:block min-h-screen overflow-hidden bg-[#005BB5]">
        {!imgFailed ? (
          <img
            src={loginHeroImg}
            alt={c.heroHeadline}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0F1E36] via-[#0052B4] to-[#2563EB] flex items-center justify-center p-12">
            <ShieldCheck className="w-24 h-24 text-white/30" />
          </div>
        )}

        {/* Measured Gradient Scrim for 4.5:1+ Text Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#081A33]/90 via-[#081A33]/25 to-transparent pointer-events-none" />

        {/* Headline Overlay */}
        <div
          dir={c.dir}
          className="absolute inset-x-0 bottom-0 p-10 xl:p-14 text-white space-y-2"
        >
          <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-snug text-balance">
            {c.heroHeadline}
          </h2>
          <p className="text-sm text-blue-100 font-medium">{c.heroSubline}</p>
        </div>
      </div>
    </div>
  );
};
