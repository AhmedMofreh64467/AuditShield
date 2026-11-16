import React, { useRef, useState } from 'react';
import {
  ArchiveRestore,
  ArrowLeftRight,
  Cloud,
  CloudOff,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';
import { LanguageCode, TranslationDict } from '../i18n/translations';
import {
  ArchivedLedgerItem,
  ArchivedOperationalItem,
  ArchivedRoomItem,
} from '../services/firestoreVault';
import {
  AuditTrailEntry,
  CurrencyCode,
  HotelConfig,
  SecurityOperatorAccount,
  SecuritySettings,
  UserRole,
} from '../types/audit';
import {
  formatMoney,
  getDefaultRatesForBase,
  getExchangeRates,
} from '../utils/auditEngine';
import { ROLE_PERMISSIONS } from '../utils/rbac';

interface AuditSettingsProps {
  lang: LanguageCode;
  t: TranslationDict;
  config: HotelConfig;
  security: SecuritySettings;
  auditTrail?: AuditTrailEntry[];
  cloudUserEmail?: string | null;
  cloudSyncReady?: boolean;
  cloudError?: string | null;
  archivedRooms?: ArchivedRoomItem[];
  archivedEntries?: ArchivedLedgerItem[];
  archivedRecords?: ArchivedOperationalItem[];
  backupSnapshots?: { id: string; title: string; createdAtLabel: string; summaryText: string }[];
  onConnectGoogleCloud?: () => Promise<void>;
  onDisconnectGoogleCloud?: () => Promise<void>;
  onCreateSnapshotNow?: () => Promise<void>;
  onRestoreArchivedRoom?: (docIdOrRoomId: string) => void;
  onRestoreArchivedEntry?: (docIdOrEntryId: string) => void;
  onRestoreArchivedRecord?: (docId: string) => void;
  onUpdateConfig: (next: HotelConfig) => void;
  onUpdateSecurity: (next: SecuritySettings, detailSummary: string) => void;
  onResetSecurity: () => void;
  onLockNow: () => void;
  onExportJsonBackup: () => void;
  onImportJsonBackup: (jsonText: string) => boolean;
}

const CURRENCY_ORDER: CurrencyCode[] = ['EGP', 'USD', 'EUR', 'SAR'];

const SECURITY_COPY: Record<
  LanguageCode,
  {
    sectionTitle: string;
    sectionSubtitle: string;
    lockTestBtn: string;
    resetBtn: string;
    usernameLabel: string;
    supervisorPinLabel: string;
    currentPassLabel: string;
    newPassLabel: string;
    confirmPassLabel: string;
    saveSecurityBtn: string;
    strictCredsTitle: string;
    strictCredsDesc: string;
    secCheckTitle: string;
    secCheckDesc: string;
    dayPinTitle: string;
    dayPinDesc: string;
    errWrongCurrent: string;
    errShortNew: string;
    errMismatch: string;
    errEmptyUser: string;
    errShortPin: string;
    savedMsg: string;
    resetMsg: string;
    policyUpdatedMsg: string;
  }
> = {
  ar: {
    sectionTitle: 'إعدادات الأمان وحماية الدخول (Security & Access Control)',
    sectionSubtitle:
      'غيّر اسم المستخدم وكلمة المرور ومستوى التحقق الأمني ورمز PIN الخاص بفتح الأيام المقفلة',
    lockTestBtn: 'قفل الجلسة واختبار الدخول',
    resetBtn: 'استعادة الافتراضي',
    usernameLabel: 'اسم المستخدم للدخول',
    supervisorPinLabel: 'رمز المشرف (Supervisor PIN لفتح اليوم)',
    currentPassLabel: 'كلمة المرور الحالية (اختياري عند تعديل التبديلات فقط)',
    newPassLabel: 'كلمة المرور الجديدة',
    confirmPassLabel: 'تأكيد كلمة المرور الجديدة',
    saveSecurityBtn: 'حفظ تغييرات الأمان وكلمة المرور',
    strictCredsTitle: 'التحقق الصارم من كلمة المرور عند الدخول',
    strictCredsDesc: 'يرفض الدخول إذا كان اسم المستخدم أو كلمة المرور غير مطابقة.',
    secCheckTitle: 'مربع التحقق الأمني في صفحة الدخول',
    secCheckDesc: 'تفعيل أو إيقاف خطوة التحقق الأمني قبل زر تسجيل الدخول.',
    dayPinTitle: 'طلب رمز PIN المشرف لفتح اليوم المقفل',
    dayPinDesc: 'حماية إضافية تمنع فتح اليوم المالي المغلق بدون إدخال رمز المشرف.',
    errWrongCurrent: 'كلمة المرور الحالية غير صحيحة.',
    errShortNew: 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل.',
    errMismatch: 'كلمة المرور الجديدة وتأكيدها غير متطابقين.',
    errEmptyUser: 'يرجى كتابة اسم مستخدم صالح.',
    errShortPin: 'رمز المشرف يجب أن يكون 4 أرقام/أحرف على الأقل.',
    savedMsg: 'تم تحديث إعدادات الأمان وكلمة المرور بنجاح.',
    resetMsg: 'تمت استعادة إعدادات الأمان الافتراضية (a.mofrah / hotel-audit-2026).',
    policyUpdatedMsg: 'تم تحديث سياسة الحماية بنجاح.',
  },
  en: {
    sectionTitle: 'Security & Access Control',
    sectionSubtitle:
      'Change login username, passcode, security verification box, and Supervisor PIN for unlocking closed days',
    lockTestBtn: 'Lock & Test Login',
    resetBtn: 'Restore Defaults',
    usernameLabel: 'Login Username',
    supervisorPinLabel: 'Supervisor PIN (for Day Unlock)',
    currentPassLabel: 'Current Password (required only when changing password)',
    newPassLabel: 'New Password',
    confirmPassLabel: 'Confirm New Password',
    saveSecurityBtn: 'Save Security & Password Changes',
    strictCredsTitle: 'Strict Credential Verification',
    strictCredsDesc: 'Reject sign-in attempts unless username and password match exactly.',
    secCheckTitle: 'Security Check Box on Login Screen',
    secCheckDesc: 'Show or hide the interactive verification box before signing in.',
    dayPinTitle: 'Require Supervisor PIN to Unlock Closed Day',
    dayPinDesc: 'Prevents unlocking a closed Business Date without entering the Supervisor PIN.',
    errWrongCurrent: 'Current password is incorrect.',
    errShortNew: 'New password must be at least 4 characters.',
    errMismatch: 'New password and confirmation do not match.',
    errEmptyUser: 'Username cannot be empty.',
    errShortPin: 'Supervisor PIN must be at least 4 characters.',
    savedMsg: 'Security credentials and access rules updated successfully.',
    resetMsg: 'Default security settings restored (a.mofrah / hotel-audit-2026).',
    policyUpdatedMsg: 'Security policy updated.',
  },
  fr: {
    sectionTitle: 'Sécurité & Contrôle d’Accès',
    sectionSubtitle:
      'Modifiez l’identifiant, le mot de passe, la vérification de sécurité et le code PIN superviseur',
    lockTestBtn: 'Verrouiller & Tester',
    resetBtn: 'Réinitialiser',
    usernameLabel: 'Identifiant de connexion',
    supervisorPinLabel: 'Code PIN Superviseur (Déverrouillage journée)',
    currentPassLabel: 'Mot de passe actuel (requis pour changer de mot de passe)',
    newPassLabel: 'Nouveau mot de passe',
    confirmPassLabel: 'Confirmer le nouveau mot de passe',
    saveSecurityBtn: 'Enregistrer la sécurité',
    strictCredsTitle: 'Vérification stricte des identifiants',
    strictCredsDesc: 'Refuse la connexion si l’identifiant ou le mot de passe ne correspond pas.',
    secCheckTitle: 'Case de vérification sur l’écran de connexion',
    secCheckDesc: 'Affiche ou masque la case de sécurité avant la connexion.',
    dayPinTitle: 'Exiger le code PIN pour rouvrir une journée clôturée',
    dayPinDesc: 'Protège la réouverture de la journée comptable par un code PIN.',
    errWrongCurrent: 'Mot de passe actuel incorrect.',
    errShortNew: 'Le nouveau mot de passe doit comporter au moins 4 caractères.',
    errMismatch: 'Les nouveaux mots de passe ne correspondent pas.',
    errEmptyUser: 'L’identifiant ne peut pas être vide.',
    errShortPin: 'Le code PIN doit comporter au moins 4 caractères.',
    savedMsg: 'Paramètres de sécurité enregistrés avec succès.',
    resetMsg: 'Paramètres de sécurité par défaut restaurés.',
    policyUpdatedMsg: 'Politique de sécurité mise à jour.',
  },
};

export const AuditSettings: React.FC<AuditSettingsProps> = ({
  lang,
  t,
  config,
  security,
  auditTrail = [],
  cloudUserEmail = null,
  cloudSyncReady = false,
  cloudError = null,
  archivedRooms = [],
  archivedEntries = [],
  archivedRecords = [],
  backupSnapshots = [],
  onConnectGoogleCloud,
  onDisconnectGoogleCloud,
  onCreateSnapshotNow,
  onRestoreArchivedRoom,
  onRestoreArchivedEntry,
  onRestoreArchivedRecord,
  onUpdateConfig,
  onUpdateSecurity,
  onResetSecurity,
  onLockNow,
  onExportJsonBackup,
  onImportJsonBackup,
}) => {
  const sc = SECURITY_COPY[lang];
  const [newOutlet, setNewOutlet] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const [cloudActionMsg, setCloudActionMsg] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  // Local state for Security credentials form
  const [secUser, setSecUser] = useState(security.username);
  const [secPin, setSecPin] = useState(security.supervisorPin);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [secError, setSecError] = useState('');
  const [secSuccess, setSecSuccess] = useState('');
  const [newOpUser, setNewOpUser] = useState('');
  const [newOpPass, setNewOpPass] = useState('');
  const [newOpRole, setNewOpRole] = useState<UserRole>('NightAuditor');

  const rates = getExchangeRates(config);
  const fxHistoryEntries = auditTrail.filter((item) => item.action === 'rate_change').slice(0, 8);

  const handleAddOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpUser.trim() || newOpPass.length < 4) return;
    const op: SecurityOperatorAccount = {
      id: `op-${Date.now()}`,
      username: newOpUser.trim(),
      displayName: `${newOpUser.trim()} (${ROLE_PERMISSIONS[newOpRole].labelEn})`,
      role: newOpRole,
      passcode: newOpPass,
    };
    const nextUsers = [...(security.roleUsers ?? []), op];
    onUpdateSecurity(
      { ...security, roleUsers: nextUsers, updatedAt: new Date().toISOString() },
      `Added RBAC Operator ${op.username} (${op.role})`
    );
    setNewOpUser('');
    setNewOpPass('');
  };

  const handleBaseCurrencyChange = (nextBase: CurrencyCode) => {
    if (nextBase === config.currency) return;
    const pivot = rates[nextBase] || 1;
    const rescaled: Record<CurrencyCode, number> = {
      EGP: nextBase === 'EGP' ? 1 : Number((rates.EGP / pivot).toFixed(4)),
      USD: nextBase === 'USD' ? 1 : Number((rates.USD / pivot).toFixed(4)),
      EUR: nextBase === 'EUR' ? 1 : Number((rates.EUR / pivot).toFixed(4)),
      SAR: nextBase === 'SAR' ? 1 : Number((rates.SAR / pivot).toFixed(4)),
    };
    onUpdateConfig({
      ...config,
      currency: nextBase,
      exchangeRates: rescaled,
    });
  };

  const handleRateChange = (code: CurrencyCode, rawValue: string) => {
    if (code === config.currency) return;
    const parsed = parseFloat(rawValue);
    onUpdateConfig({
      ...config,
      exchangeRates: {
        ...rates,
        [code]: Number.isNaN(parsed) || parsed < 0 ? 0 : parsed,
      },
    });
  };

  const handleResetDefaultRates = () => {
    onUpdateConfig({
      ...config,
      exchangeRates: getDefaultRatesForBase(config.currency),
    });
  };

  const handleAddOutlet = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newOutlet.trim();
    if (!cleaned || config.outlets.includes(cleaned)) return;
    onUpdateConfig({
      ...config,
      outlets: [...config.outlets, cleaned],
    });
    setNewOutlet('');
  };

  const handleRemoveOutlet = (name: string) => {
    if (config.outlets.length <= 1) return;
    onUpdateConfig({
      ...config,
      outlets: config.outlets.filter((o) => o !== name),
    });
  };

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const ok = onImportJsonBackup(text);
    setBackupMessage(ok ? `${t.settings.backupOk} (${file.name})` : t.settings.backupErr);
    e.target.value = '';
  };

  const handleSaveSecurityForm = (e: React.FormEvent) => {
    e.preventDefault();
    setSecError('');
    setSecSuccess('');

    const cleanUser = secUser.trim();
    if (!cleanUser) {
      setSecError(sc.errEmptyUser);
      return;
    }
    const cleanPin = secPin.trim();
    if (cleanPin.length < 4) {
      setSecError(sc.errShortPin);
      return;
    }

    let nextPasscode = security.passcode;
    const changingPassword = newPass.length > 0 || confirmPass.length > 0;
    if (changingPassword) {
      if (currentPass !== security.passcode) {
        setSecError(sc.errWrongCurrent);
        return;
      }
      if (newPass.length < 4) {
        setSecError(sc.errShortNew);
        return;
      }
      if (newPass !== confirmPass) {
        setSecError(sc.errMismatch);
        return;
      }
      nextPasscode = newPass;
    }

    onUpdateSecurity(
      {
        ...security,
        username: cleanUser,
        passcode: nextPasscode,
        supervisorPin: cleanPin,
        updatedAt: new Date().toISOString(),
      },
      changingPassword
        ? `Updated login credentials (${cleanUser}) & Supervisor PIN`
        : `Updated login username (${cleanUser}) / Supervisor PIN`
    );

    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setSecSuccess(sc.savedMsg);
  };

  const handleToggleSecurityFlag = (
    field: 'requireStrictCredentials' | 'requireSecurityCheck' | 'requirePinForDayUnlock'
  ) => {
    setSecError('');
    const nextValue = !security[field];
    onUpdateSecurity(
      {
        ...security,
        [field]: nextValue,
        updatedAt: new Date().toISOString(),
      },
      `Security policy toggled ${field}: ${nextValue ? 'ON' : 'OFF'}`
    );
    setSecSuccess(sc.policyUpdatedMsg);
  };

  const handleResetDefaults = () => {
    onResetSecurity();
    setSecUser('a.mofrah');
    setSecPin('1234');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setSecError('');
    setSecSuccess(sc.resetMsg);
  };

  const totalArchivedCount =
    archivedRooms.length + archivedEntries.length + archivedRecords.length;

  const handleConnectCloud = async () => {
    if (!onConnectGoogleCloud) return;
    setCloudBusy(true);
    setCloudActionMsg('');
    try {
      await onConnectGoogleCloud();
      setCloudActionMsg(
        lang === 'ar'
          ? 'تم الربط مع قاعدة البيانات السحابية بنجاح — جميع بياناتك محفوظة الآن بدون حذف.'
          : lang === 'fr'
          ? 'Connecté à Firestore Cloud — vos données sont conservées sans suppression.'
          : 'Connected to Cloud Firestore Vault — all records are preserved without deletion.'
      );
    } catch {
      setCloudActionMsg(
        lang === 'ar'
          ? 'تعذر إتمام الربط عبر Google.'
          : lang === 'fr'
          ? 'Échec de connexion Google.'
          : 'Could not connect Google account.'
      );
    } finally {
      setCloudBusy(false);
    }
  };

  const handleSnapshotNow = async () => {
    if (!onCreateSnapshotNow) return;
    setCloudBusy(true);
    try {
      await onCreateSnapshotNow();
      setCloudActionMsg(
        lang === 'ar'
          ? 'تم حفظ نسخة احتياطية دائمة الآن في الخزنة السحابية.'
          : lang === 'fr'
          ? 'Instantané enregistré dans le coffre Cloud.'
          : 'Permanent snapshot saved to Cloud Vault.'
      );
    } finally {
      setCloudBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Permanent Zero-Delete Cloud Vault & Archive Recovery */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {cloudUserEmail ? (
              <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <CloudOff className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {lang === 'ar'
                  ? 'خزنة الحفظ الدائم ومنع الحذف (Zero-Delete Cloud Vault)'
                  : lang === 'fr'
                  ? 'Coffre Cloud Permanent (Zéro Suppression)'
                  : 'Permanent Cloud Vault (Zero-Delete Protection)'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'ar'
                  ? 'تُحفظ الغرف والقيود والأرشيف في Firestore بشكل دائم — أي عنصر يتم حذفه يُنقل للأرشيف القابل للاستعادة ولا يُمسح نهائياً.'
                  : lang === 'fr'
                  ? 'Chambres, écritures et archives sont conservées dans Firestore — aucune suppression définitive.'
                  : 'Rooms, ledger entries, and archives persist in Cloud Firestore — deletions move to Archive instead of erasing data.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {cloudUserEmail ? (
              <>
                <span className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md" dir="ltr">
                  {cloudSyncReady ? 'Synced: ' : 'Syncing: '}
                  {cloudUserEmail}
                </span>
                {onCreateSnapshotNow && (
                  <button
                    type="button"
                    disabled={cloudBusy}
                    onClick={handleSnapshotNow}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0088CC] hover:bg-[#0070AA] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {lang === 'ar'
                      ? 'حفظ لقطة احتياطية الآن'
                      : lang === 'fr'
                      ? 'Sauvegarder Instantané'
                      : 'Save Snapshot Now'}
                  </button>
                )}
                {onDisconnectGoogleCloud && (
                  <button
                    type="button"
                    onClick={() => void onDisconnectGoogleCloud()}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {lang === 'ar' ? 'فصل السحابة' : lang === 'fr' ? 'Déconnecter' : 'Disconnect'}
                  </button>
                )}
              </>
            ) : (
              onConnectGoogleCloud && (
                <button
                  type="button"
                  disabled={cloudBusy}
                  onClick={handleConnectCloud}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0088CC] hover:bg-[#0070AA] disabled:opacity-60 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  {lang === 'ar'
                    ? 'ربط حساب Google للتخزين السحابي الدائم'
                    : lang === 'fr'
                    ? 'Connecter Google Cloud'
                    : 'Connect Google Cloud Vault'}
                </button>
              )
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {cloudError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {cloudError}
            </div>
          )}
          {cloudActionMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
              {cloudActionMsg}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Soft-Deleted / Recoverable Archive Items */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <ArchiveRestore className="w-4 h-4 text-[#0088CC]" />
                  {lang === 'ar'
                    ? `العناصر المؤرشفة القابلة للاستعادة (${totalArchivedCount})`
                    : lang === 'fr'
                    ? `Éléments archivés récupérables (${totalArchivedCount})`
                    : `Archived / Recoverable Items (${totalArchivedCount})`}
                </span>
              </div>

              {totalArchivedCount === 0 ? (
                <p className="p-4 text-xs text-slate-500">
                  {lang === 'ar'
                    ? 'لا توجد غرف أو قيود محذوفة حالياً — أي عنصر تحذفه سيظهر هنا لتتمكن من استعادته في أي وقت.'
                    : lang === 'fr'
                    ? 'Aucun élément archivé pour le moment. Tout élément supprimé reste ici pour restauration.'
                    : 'No archived items yet. Any room, entry, or record you remove stays safely here for 1-click restore.'}
                </p>
              ) : (
                <div className="divide-y divide-slate-200 max-h-60 overflow-y-auto">
                  {archivedRooms.map((item) => (
                    <div
                      key={item.docId}
                      className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {lang === 'ar' ? 'غرفة' : 'Room'} #{item.room.roomNumber} ·{' '}
                          {item.room.roomType}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.room.guestName || item.room.status}
                        </p>
                      </div>
                      {onRestoreArchivedRoom && (
                        <button
                          type="button"
                          onClick={() => onRestoreArchivedRoom(item.docId)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#0088CC] bg-sky-50 hover:bg-sky-100 rounded border border-sky-200 shrink-0"
                        >
                          {lang === 'ar' ? 'استعادة' : lang === 'fr' ? 'Restaurer' : 'Restore'}
                        </button>
                      )}
                    </div>
                  ))}

                  {archivedEntries.map((item) => (
                    <div
                      key={item.docId}
                      className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {item.entry.category} · {item.entry.guestOrDescription}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono" dir="ltr">
                          {item.entry.referenceNo} · {formatMoney(item.entry.grossAmount, config.currency)}
                        </p>
                      </div>
                      {onRestoreArchivedEntry && (
                        <button
                          type="button"
                          onClick={() => onRestoreArchivedEntry(item.docId)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#0088CC] bg-sky-50 hover:bg-sky-100 rounded border border-sky-200 shrink-0"
                        >
                          {lang === 'ar' ? 'استعادة' : lang === 'fr' ? 'Restaurer' : 'Restore'}
                        </button>
                      )}
                    </div>
                  ))}

                  {archivedRecords.map((item) => (
                    <div
                      key={item.docId}
                      className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{item.title}</p>
                        <p className="text-[11px] text-slate-500">{item.recordType}</p>
                      </div>
                      {onRestoreArchivedRecord && (
                        <button
                          type="button"
                          onClick={() => onRestoreArchivedRecord(item.docId)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#0088CC] bg-sky-50 hover:bg-sky-100 rounded border border-sky-200 shrink-0"
                        >
                          {lang === 'ar' ? 'استعادة' : lang === 'fr' ? 'Restaurer' : 'Restore'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cloud Snapshots Log */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  {lang === 'ar'
                    ? `سجل اللقطات الاحتياطية السحابية (${backupSnapshots.length})`
                    : lang === 'fr'
                    ? `Instantanés Cloud (${backupSnapshots.length})`
                    : `Cloud Retention Snapshots (${backupSnapshots.length})`}
                </span>
              </div>
              {backupSnapshots.length === 0 ? (
                <p className="p-4 text-xs text-slate-500">
                  {lang === 'ar'
                    ? 'تُنشأ لقطة سحابية تلقائياً قبل أي استعادة أو استبدال بيانات، أو عند الضغط على "حفظ لقطة احتياطية الآن".'
                    : lang === 'fr'
                    ? 'Des instantanés sont créés automatiquement avant toute réinitialisation.'
                    : 'Automatic snapshots are stored before any data reset or on demand.'}
                </p>
              ) : (
                <div className="divide-y divide-slate-200 max-h-60 overflow-y-auto">
                  {backupSnapshots.map((snap) => (
                    <div key={snap.id} className="px-4 py-2.5 text-xs space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 truncate">{snap.title}</span>
                        <span className="text-[11px] font-mono text-slate-500 shrink-0" dir="ltr">
                          {snap.createdAtLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{snap.summaryText}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Security & Access Control */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0088CC] shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">{sc.sectionTitle}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{sc.sectionSubtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {sc.resetBtn}
            </button>
            <button
              type="button"
              onClick={onLockNow}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F1E36] hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              {sc.lockTestBtn}
            </button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Credentials & Supervisor PIN Form */}
          <form onSubmit={handleSaveSecurityForm} className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {sc.usernameLabel}
                </label>
                <input
                  type="text"
                  value={secUser}
                  onChange={(e) => setSecUser(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {sc.supervisorPinLabel}
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={secPin}
                  onChange={(e) => setSecPin(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#0088CC]" />
                  {sc.newPassLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPasswords((v) => !v)}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1"
                >
                  {showPasswords ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    {sc.currentPassLabel}
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    {sc.newPassLabel}
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    {sc.confirmPassLabel}
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {secError && <p className="text-xs font-medium text-red-600">{secError}</p>}
            {secSuccess && <p className="text-xs font-medium text-emerald-700">{secSuccess}</p>}

            <div>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0088CC] hover:bg-[#0070AA] rounded-lg transition-colors"
              >
                {sc.saveSecurityBtn}
              </button>
            </div>
          </form>

          {/* Security Level Switches */}
          <div className="lg:col-span-5 space-y-3 border-t lg:border-t-0 lg:border-s border-slate-200 pt-4 lg:pt-0 lg:ps-6">
            <label className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-slate-50">
              <div>
                <p className="text-xs font-semibold text-slate-900">{sc.strictCredsTitle}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{sc.strictCredsDesc}</p>
              </div>
              <input
                type="checkbox"
                checked={security.requireStrictCredentials}
                onChange={() => handleToggleSecurityFlag('requireStrictCredentials')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0088CC] focus:ring-[#0088CC]"
              />
            </label>

            <label className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-slate-50">
              <div>
                <p className="text-xs font-semibold text-slate-900">{sc.secCheckTitle}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{sc.secCheckDesc}</p>
              </div>
              <input
                type="checkbox"
                checked={security.requireSecurityCheck}
                onChange={() => handleToggleSecurityFlag('requireSecurityCheck')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0088CC] focus:ring-[#0088CC]"
              />
            </label>

            <label className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-slate-50">
              <div>
                <p className="text-xs font-semibold text-slate-900">{sc.dayPinTitle}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{sc.dayPinDesc}</p>
              </div>
              <input
                type="checkbox"
                checked={security.requirePinForDayUnlock}
                onChange={() => handleToggleSecurityFlag('requirePinForDayUnlock')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0088CC] focus:ring-[#0088CC]"
              />
            </label>

            {/* Active RBAC Role Switcher & Operator Accounts */}
            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900">
                  {lang === 'ar' ? 'صلاحية الدور النشط (RBAC Role)' : 'Active RBAC Role'}
                </span>
                <select
                  value={security.activeRole ?? 'Administrator'}
                  onChange={(e) => {
                    const role = e.target.value as UserRole;
                    onUpdateSecurity(
                      { ...security, activeRole: role, updatedAt: new Date().toISOString() },
                      `Switched active RBAC role to ${role}`
                    );
                  }}
                  className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded bg-slate-50"
                >
                  {(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map((role) => (
                    <option key={role} value={role}>
                      {lang === 'ar' ? ROLE_PERMISSIONS[role].labelAr : ROLE_PERMISSIONS[role].labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleAddOperator} className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  value={newOpUser}
                  onChange={(e) => setNewOpUser(e.target.value)}
                  placeholder="username"
                  dir="ltr"
                  className="px-2 py-1 text-[11px] border border-slate-300 rounded"
                />
                <input
                  type="password"
                  value={newOpPass}
                  onChange={(e) => setNewOpPass(e.target.value)}
                  placeholder="passcode"
                  dir="ltr"
                  className="px-2 py-1 text-[11px] border border-slate-300 rounded"
                />
                <div className="flex gap-1">
                  <select
                    value={newOpRole}
                    onChange={(e) => setNewOpRole(e.target.value as UserRole)}
                    className="flex-1 min-w-0 px-1 py-1 text-[10px] border border-slate-300 rounded bg-white"
                  >
                    {(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-2 py-1 text-[10px] font-semibold bg-[#0088CC] text-white rounded"
                  >
                    +
                  </button>
                </div>
              </form>

              {(security.roleUsers ?? []).length > 0 && (
                <div className="max-h-24 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                  {(security.roleUsers ?? []).map((op) => (
                    <div key={op.id} className="py-1 flex items-center justify-between gap-2">
                      <span className="font-mono text-slate-800">{op.username}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                        {op.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Hotel Policy & Tax Settings */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t.settings.policyTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.settings.policySubtitle}
            </p>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.settings.hotelName}
            </label>
            <input
              type="text"
              value={config.hotelName}
              onChange={(e) => onUpdateConfig({ ...config, hotelName: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.settings.businessDate}
            </label>
            <input
              type="date"
              value={config.businessDate}
              onChange={(e) => onUpdateConfig({ ...config, businessDate: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.settings.currency}
            </label>
            <select
              value={config.currency}
              onChange={(e) =>
                handleBaseCurrencyChange(e.target.value as CurrencyCode)
              }
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {CURRENCY_ORDER.map((code) => (
                <option key={code} value={code}>
                  {t.settings.currencyNames[code]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.settings.svcPct}
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={config.serviceChargePct}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  serviceChargePct: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.settings.vatPct}
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={config.vatPct}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  vatPct: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.settings.cityTaxPct}
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={config.cityTaxPct}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  cityTaxPct: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.settings.minRoomRate} ({config.currency})
            </label>
            <input
              type="number"
              min="0"
              value={config.minRoomRate}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  minRoomRate: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.settings.rebateLimit} ({config.currency})
            </label>
            <input
              type="number"
              min="0"
              value={config.rebateApprovalLimit}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  rebateApprovalLimit: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.settings.cashTolerance} ({config.currency})
            </label>
            <input
              type="number"
              min="0"
              value={config.cashVarianceTolerance}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  cashVarianceTolerance: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.settings.totalRooms}
            </label>
            <input
              type="number"
              min="1"
              value={config.totalAvailableRooms ?? 120}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  totalAvailableRooms: Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.settings.budgetDaily} ({config.currency})
            </label>
            <input
              type="number"
              min="0"
              value={config.budgetDailyRevenue ?? 32000}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  budgetDailyRevenue: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.settings.breakfastSplitPerPax} ({config.currency})
            </label>
            <input
              type="number"
              min="0"
              value={config.defaultBreakfastSplitPerPax ?? 250}
              onChange={(e) =>
                onUpdateConfig({
                  ...config,
                  defaultBreakfastSplitPerPax: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              dir="ltr"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  {lang === 'ar' ? 'فصل الإفطار / فرد' : 'Breakfast Split / Pax'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={
                    config.packageAllocationRules?.breakfastPerPax ??
                    config.defaultBreakfastSplitPerPax ??
                    250
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    onUpdateConfig({
                      ...config,
                      defaultBreakfastSplitPerPax: val,
                      packageAllocationRules: {
                        breakfastPerPax: val,
                        lunchPerPax: config.packageAllocationRules?.lunchPerPax ?? val,
                        dinnerPerPax: config.packageAllocationRules?.dinnerPerPax ?? val,
                        otherPerPax: config.packageAllocationRules?.otherPerPax ?? 0,
                        allInclusiveBeveragePerPax:
                          config.packageAllocationRules?.allInclusiveBeveragePerPax ?? 200,
                      },
                    });
                  }}
                  dir="ltr"
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  {lang === 'ar' ? 'فصل الغداء / فرد' : 'Lunch Split / Pax'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={
                    config.packageAllocationRules?.lunchPerPax ??
                    config.defaultBreakfastSplitPerPax ??
                    250
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    onUpdateConfig({
                      ...config,
                      packageAllocationRules: {
                        breakfastPerPax:
                          config.packageAllocationRules?.breakfastPerPax ??
                          config.defaultBreakfastSplitPerPax ??
                          250,
                        lunchPerPax: val,
                        dinnerPerPax:
                          config.packageAllocationRules?.dinnerPerPax ??
                          config.defaultBreakfastSplitPerPax ??
                          250,
                        otherPerPax: config.packageAllocationRules?.otherPerPax ?? 0,
                        allInclusiveBeveragePerPax:
                          config.packageAllocationRules?.allInclusiveBeveragePerPax ?? 200,
                      },
                    });
                  }}
                  dir="ltr"
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  {lang === 'ar' ? 'فصل العشاء / فرد' : 'Dinner Split / Pax'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={
                    config.packageAllocationRules?.dinnerPerPax ??
                    config.defaultBreakfastSplitPerPax ??
                    250
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    onUpdateConfig({
                      ...config,
                      packageAllocationRules: {
                        breakfastPerPax:
                          config.packageAllocationRules?.breakfastPerPax ??
                          config.defaultBreakfastSplitPerPax ??
                          250,
                        lunchPerPax:
                          config.packageAllocationRules?.lunchPerPax ??
                          config.defaultBreakfastSplitPerPax ??
                          250,
                        dinnerPerPax: val,
                        otherPerPax: config.packageAllocationRules?.otherPerPax ?? 0,
                        allInclusiveBeveragePerPax:
                          config.packageAllocationRules?.allInclusiveBeveragePerPax ?? 200,
                      },
                    });
                  }}
                  dir="ltr"
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  {lang === 'ar' ? 'مشروبات All Inclusive / فرد' : 'All-Inclusive Bev / Pax'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.packageAllocationRules?.allInclusiveBeveragePerPax ?? 200}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    onUpdateConfig({
                      ...config,
                      packageAllocationRules: {
                        breakfastPerPax:
                          config.packageAllocationRules?.breakfastPerPax ??
                          config.defaultBreakfastSplitPerPax ??
                          250,
                        lunchPerPax:
                          config.packageAllocationRules?.lunchPerPax ??
                          config.defaultBreakfastSplitPerPax ??
                          250,
                        dinnerPerPax:
                          config.packageAllocationRules?.dinnerPerPax ??
                          config.defaultBreakfastSplitPerPax ??
                          250,
                        otherPerPax: config.packageAllocationRules?.otherPerPax ?? 0,
                        allInclusiveBeveragePerPax: val,
                      },
                    });
                  }}
                  dir="ltr"
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  {lang === 'ar' ? 'خدمات مشمولة / فرد' : 'Other Inclusions / Pax'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.packageAllocationRules?.otherPerPax ?? 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    onUpdateConfig({
                      ...config,
                      packageAllocationRules: {
                        breakfastPerPax:
                          config.packageAllocationRules?.breakfastPerPax ??
                          config.defaultBreakfastSplitPerPax ??
                          250,
                        lunchPerPax:
                          config.packageAllocationRules?.lunchPerPax ??
                          config.defaultBreakfastSplitPerPax ??
                          250,
                        dinnerPerPax:
                          config.packageAllocationRules?.dinnerPerPax ??
                          config.defaultBreakfastSplitPerPax ??
                          250,
                        otherPerPax: val,
                        allInclusiveBeveragePerPax:
                          config.packageAllocationRules?.allInclusiveBeveragePerPax ?? 200,
                      },
                    });
                  }}
                  dir="ltr"
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  {lang === 'ar' ? 'رسوم الفرد الإضافي' : 'Extra Person Fee'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.extraPersonFee ?? 0}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...config,
                      extraPersonFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  dir="ltr"
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  {lang === 'ar' ? 'مغادرة متأخرة (%) / تقريب' : 'Late C/O % & Rounding'}
                </label>
                <div className="flex gap-1.5" dir="ltr">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.lateCheckoutFeePct ?? 50}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...config,
                        lateCheckoutFeePct: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-1/2 px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                    title="Late Checkout %"
                  />
                  <select
                    value={config.roundingDecimals ?? 2}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...config,
                        roundingDecimals: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-1/2 px-1.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                    title="Decimal Precision"
                  >
                    <option value={0}>0 dec</option>
                    <option value={2}>2 dec</option>
                    <option value={3}>3 dec</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-slate-50">
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    {lang === 'ar'
                      ? 'الأسعار شاملة للضريبة والخدمة (Tax-Inclusive Pricing)'
                      : 'Tax-Inclusive Pricing Mode'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {lang === 'ar'
                      ? 'عند التفعيل، يتم استخراج صافي الإيراد ورسوم الخدمة وضريبة القيمة المضافة والبلدية عكسياً.'
                      : 'Back-calculates net revenue, service charge, VAT, and city tax from gross.'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(config.taxInclusive)}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, taxInclusive: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-slate-50">
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    {lang === 'ar'
                      ? 'تطبيق الخصومات قبل حساب الضرائب (Discount Before Tax)'
                      : 'Apply Discounts Before Tax'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {lang === 'ar'
                      ? 'يُخصم التخفيض من أصل أجر الغرفة قبل الخدمة والضريبة (أو من الإجمالي عند الإيقاف).'
                      : 'Reduces taxable net room revenue first when enabled, or deducts from gross when disabled.'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.discountBeforeTax !== false}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, discountBeforeTax: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Base Currency & Editable Exchange Rates (EUR / USD / EGP / SAR) */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {t.settings.exchangeRatesTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.settings.exchangeRatesSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDefaultRates}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.settings.resetRatesBtn}
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Quick Base Currency Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-600">
              {t.settings.currency}:
            </span>
            <div className="inline-flex flex-wrap gap-1.5">
              {CURRENCY_ORDER.map((code) => {
                const isBase = config.currency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleBaseCurrencyChange(code)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      isBase
                        ? 'bg-[#0F1E36] text-white border-[#0F1E36]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {t.settings.currencyNames[code]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exchange Rate Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CURRENCY_ORDER.map((code) => {
              const isBase = config.currency === code;
              return (
                <div
                  key={code}
                  className={`p-4 rounded-xl border ${
                    isBase
                      ? 'border-blue-600 bg-blue-50/40'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {t.settings.currencyNames[code]}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-blue-700">
                      {code}
                    </span>
                  </div>

                  {isBase ? (
                    <div className="px-3 py-2 text-xs font-mono font-bold bg-white border border-blue-200 rounded-lg text-blue-800 flex items-center justify-between">
                      <span dir="ltr">1.0000</span>
                      <span className="text-[11px] font-sans font-semibold text-blue-600">
                        {t.settings.baseCurrencyTag}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                          1 {code} =
                        </span>
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          value={rates[code]}
                          onChange={(e) => handleRateChange(code, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold tabular-nums border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <span className="text-[11px] font-mono font-semibold text-slate-700">
                          {config.currency}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums" dir="ltr">
                        100 {code} = {formatMoney(100 * rates[code], config.currency)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {fxHistoryEntries.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                {lang === 'ar' ? 'سجل التعديلات التاريخية لأسعار الصرف (FX Audit History)' : 'Historical FX Rate Change Log'}
              </p>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-36 overflow-y-auto text-[11px]">
                {fxHistoryEntries.map((item) => (
                  <div key={item.id} className="px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-slate-500">{item.timestamp}</span>
                    <span className="font-medium text-slate-800">{item.actor}</span>
                    <span className="text-slate-600 truncate max-w-md">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* F&B Outlets & Local Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">
              {t.settings.outletsTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.settings.outletsSubtitle}
            </p>
          </div>

          <div className="p-5 space-y-4">
            <form onSubmit={handleAddOutlet} className="flex items-center gap-2">
              <input
                type="text"
                value={newOutlet}
                onChange={(e) => setNewOutlet(e.target.value)}
                placeholder={t.settings.outletPlaceholder}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                {t.settings.addOutletBtn}
              </button>
            </form>

            <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
              {config.outlets.map((outlet) => (
                <li
                  key={outlet}
                  className="px-4 py-2.5 flex items-center justify-between text-xs text-slate-800"
                >
                  <span className="font-medium">{outlet}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOutlet(outlet)}
                    disabled={config.outlets.length <= 1}
                    className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                    aria-label={outlet}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">
              {t.settings.backupTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.settings.backupSubtitle}
            </p>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onExportJsonBackup}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0F1E36] hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                {t.settings.exportJsonBtn}
              </button>

              <input
                ref={jsonInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleJsonUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="px-4 py-2 text-xs font-semibold text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                {t.settings.importJsonBtn}
              </button>
            </div>

            {backupMessage && (
              <p className="text-xs font-medium text-blue-700">{backupMessage}</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
