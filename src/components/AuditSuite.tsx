import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Banknote,
  CheckCircle2,
  CreditCard,
  History,
  Layers,
  Lock,
  Plus,
  Search,
  Trash2,
  Unlock,
  Users,
  X,
} from 'lucide-react';
import { LanguageCode } from '../i18n/translations';
import {
  AuditSummary,
  AuditTrailEntry,
  CashierShiftRecord,
  CashSettlement,
  DailyArchiveRecord,
  EdcTerminalRecord,
  HotelConfig,
  KwentraSnapshot,
  OccupancyInputs,
} from '../types/audit';
import { formatMoney } from '../utils/auditEngine';

interface AuditSuiteProps {
  lang: LanguageCode;
  config: HotelConfig;
  summary: AuditSummary;
  settlement: CashSettlement;
  kwentraSnapshot: KwentraSnapshot;
  dayLocked: boolean;
  canOverrideDayClose?: boolean;
  supervisorPin?: string;
  occupancyInputs: OccupancyInputs;
  dailyArchive: DailyArchiveRecord[];
  cashDenominations: Record<string, number>;
  edcTerminals: EdcTerminalRecord[];
  cashierShifts: CashierShiftRecord[];
  auditTrail: AuditTrailEntry[];
  onToggleDayLock: (overrideReason?: string) => void;
  onUpdateOccupancy: (next: OccupancyInputs) => void;
  onArchiveDay: (record: DailyArchiveRecord) => void;
  onDeleteArchive: (id: string) => void;
  onUpdateDenominations: (next: Record<string, number>) => void;
  onApplyCashToSettlement: (amount: number) => void;
  onAddEdcTerminal: (item: EdcTerminalRecord) => void;
  onToggleEdcMatched: (id: string) => void;
  onDeleteEdcTerminal: (id: string) => void;
  onSyncEdcToSettlement: (totalGross: number) => void;
  onAddCashierShift: (item: CashierShiftRecord) => void;
  onDeleteCashierShift: (id: string) => void;
}

type SuiteSubtab = 'archive' | 'cashiers' | 'trail';

const DENOM_VALUES = [200, 100, 50, 20, 10, 5, 1];

const COPY: Record<
  LanguageCode,
  {
    tabs: { archive: string; cashiers: string; trail: string };
    lockDayBtn: string;
    unlockDayBtn: string;
    archiveDayBtn: string;
    dayLockedBadge: string;
    dayOpenBadge: string;
    occTitle: string;
    occSubtitle: string;
    roomsSold: string;
    compRooms: string;
    houseUseRooms: string;
    oooRooms: string;
    kpiOcc: string;
    kpiAdr: string;
    kpiRevpar: string;
    kpiMtd: string;
    budgetTarget: string;
    archiveTableTitle: string;
    archiveEmpty: string;
    colDate: string;
    colRooms: string;
    colOcc: string;
    colAdr: string;
    colRevpar: string;
    colGross: string;
    colVar: string;
    colKwnVar: string;
    colAuditor: string;
    cashCounterTitle: string;
    cashCounterSubtitle: string;
    denomination: string;
    qty: string;
    subtotal: string;
    totalCounted: string;
    expectedCash: string;
    applyCashBtn: string;
    edcTitle: string;
    edcSubtitle: string;
    bankName: string;
    scheme: string;
    batchNo: string;
    grossAmt: string;
    feePct: string;
    netSettle: string;
    addEdcBtn: string;
    syncEdcBtn: string;
    matched: string;
    pending: string;
    shiftsTitle: string;
    shiftsSubtitle: string;
    cashierName: string;
    shift: string;
    expected: string;
    dropped: string;
    overShort: string;
    note: string;
    addShiftBtn: string;
    splitTitle: string;
    splitSubtitle: string;
    rawRoom: string;
    splitDeduction: string;
    adjRoom: string;
    rawFb: string;
    adjFb: string;
    trailTitle: string;
    trailSubtitle: string;
    trailSearch: string;
    trailTime: string;
    trailAction: string;
    trailActor: string;
    trailTarget: string;
    trailDetail: string;
    trailImpact: string;
    actions: Record<string, string>;
  }
> = {
  ar: {
    tabs: {
      archive: '1. الأرشيف اليومي، قفل اليوم و KPIs',
      cashiers: '2. عداد النقدية، بنوك EDC وشيفتات الكاشير',
      trail: '3. فصل الباقات (Package Split) وسجل التدقيق',
    },
    lockDayBtn: 'قفل اليوم المالي (Lock Day)',
    unlockDayBtn: 'فتح قفل اليوم للتعديل',
    archiveDayBtn: 'ترحيل وأرشفة اليوم الحالي + قفله',
    dayLockedBadge: 'اليوم مقفل — محمي ضد التعديل',
    dayOpenBadge: 'اليوم مفتوح للمراجعة',
    occTitle: 'إحصائيات الإشغال ومؤشرات الأداء الفندقي (Hotel KPIs)',
    occSubtitle: 'تُحسب نسب الإشغال و ADR و RevPAR تلقائياً من صافي الغرف المعدّل بعد فصل الباقات',
    roomsSold: 'الغرف المباعة (Sold)',
    compRooms: 'غرف مجانية (Comp)',
    houseUseRooms: 'استخدام إدارة (House Use)',
    oooRooms: 'خارج الخدمة (OOO)',
    kpiOcc: 'نسبة الإشغال (Occupancy %)',
    kpiAdr: 'متوسط سعر الغرفة (ADR)',
    kpiRevpar: 'عائد الغرفة المتاحة (RevPAR)',
    kpiMtd: 'الإيراد التراكمي للأيام المؤرشفة + اليوم',
    budgetTarget: 'الموازنة اليومية',
    archiveTableTitle: 'سجل الأيام المالية المؤرشفة (Daily Night Audit History)',
    archiveEmpty: 'لا توجد أيام مؤرشفة بعد.',
    colDate: 'التاريخ المالي',
    colRooms: 'الغرف المباعة',
    colOcc: 'الإشغال %',
    colAdr: 'ADR',
    colRevpar: 'RevPAR',
    colGross: 'إجمالي الإيراد',
    colVar: 'فرق الخزينة',
    colKwnVar: 'فرق Kwentra',
    colAuditor: 'المراجع / الإغلاق',
    cashCounterTitle: 'عداد فئات النقدية (Cash Denomination Counter)',
    cashCounterSubtitle: 'عدّ أوراق البنكنوت لإخراج إجمالي الجرد الفعلي وترحيله مباشرة إلى تسوية الخزينة',
    denomination: 'الفئة',
    qty: 'العدد',
    subtotal: 'الإجمالي',
    totalCounted: 'إجمالي الجرد الفعلي',
    expectedCash: 'المتوقع دفترياً',
    applyCashBtn: 'اعتماد المبلغ في تسوية الخزينة',
    edcTitle: 'مطابقة دفعات ماكينات البنوك (Bank-by-Bank EDC)',
    edcSubtitle: 'تفصيل دفعات فيزا وماستركارد وميزة لكل بنك وحساب عمولة البنك وصافي التسوية',
    bankName: 'اسم البنك',
    scheme: 'الشبكة',
    batchNo: 'رقم الـ Batch',
    grossAmt: 'الإجمالي',
    feePct: 'عمولة %',
    netSettle: 'صافي البنك',
    addEdcBtn: 'إضافة Batch',
    syncEdcBtn: 'مزامنة الإجمالي مع التسوية',
    matched: 'مطابق',
    pending: 'قيد الفحص',
    shiftsTitle: 'كشف شيفتات الكاشير (Cashier Over / Short)',
    shiftsSubtitle: 'متابعة مظروف كل كاشير (صباحي / مسائي / ليلي) لرصد مصدر أي عجز أو زيادة',
    cashierName: 'اسم الكاشير / النقطة',
    shift: 'الشيفت',
    expected: 'المتوقع',
    dropped: 'المورد فعلياً',
    overShort: 'الفرق',
    note: 'ملاحظة',
    addShiftBtn: 'إضافة شيفت',
    splitTitle: 'فصل الباقات (Package Split: Room vs BB / HB / FB / AI)',
    splitSubtitle: 'فصل قيمة الوجبات المدرجة في أسعار الغرف إلى إيراد الأغذية والمشروبات لتطابق ميزان المراجعة في Kwentra',
    rawRoom: 'صافي الغرف قبل الفصل',
    splitDeduction: 'مخصص الوجبات المحوّل لـ F&B',
    adjRoom: 'صافي الغرف المعدّل (Net Room)',
    rawFb: 'صافي المطاعم المباشر',
    adjFb: 'صافي F&B المعدّل (بعد الباقات)',
    trailTitle: 'سجل التدقيق الزمني غير القابل للتعديل (Audit Trail)',
    trailSubtitle: 'توثيق فوري لكل عملية إضافة أو حذف أو اعتماد أو قفل يوم أو تغيير سعر صرف',
    trailSearch: 'بحث في سجل المراجعة...',
    trailTime: 'الوقت',
    trailAction: 'الإجراء',
    trailActor: 'المنفذ',
    trailTarget: 'المرجع',
    trailDetail: 'التفاصيل',
    trailImpact: 'الأثر المالي',
    actions: {
      create: 'إضافة',
      delete: 'حذف',
      approve: 'اعتماد',
      reconcile: 'مطابقة',
      lock: 'قفل اليوم',
      unlock: 'فتح اليوم',
      archive: 'أرشفة',
      settlement: 'تسوية',
      rate_change: 'سعر صرف',
      security_change: 'تغيير أمان',
    },
  },
  en: {
    tabs: {
      archive: '1. Daily Archive, Day Lock & Hotel KPIs',
      cashiers: '2. Cash Counter, Bank EDC & Cashier Shifts',
      trail: '3. Package Split & Immutable Audit Trail',
    },
    lockDayBtn: 'Lock Business Date',
    unlockDayBtn: 'Unlock Business Date',
    archiveDayBtn: 'Archive Current Day & Lock',
    dayLockedBadge: 'Day Locked — Read-Only Protection Active',
    dayOpenBadge: 'Business Date Open',
    occTitle: 'Occupancy & Hotel Performance KPIs',
    occSubtitle: 'Occupancy %, ADR, and RevPAR calculated live using Package-Adjusted Net Room Revenue',
    roomsSold: 'Rooms Sold',
    compRooms: 'Complimentary',
    houseUseRooms: 'House Use',
    oooRooms: 'Out of Order (OOO)',
    kpiOcc: 'Occupancy %',
    kpiAdr: 'ADR (Avg Daily Rate)',
    kpiRevpar: 'RevPAR',
    kpiMtd: 'MTD Gross (Archived + Today)',
    budgetTarget: 'Daily Budget',
    archiveTableTitle: 'Daily Night Audit Archive History',
    archiveEmpty: 'No archived business dates recorded yet.',
    colDate: 'Business Date',
    colRooms: 'Sold',
    colOcc: 'Occ %',
    colAdr: 'ADR',
    colRevpar: 'RevPAR',
    colGross: 'Gross Revenue',
    colVar: 'Cash/EDC Var',
    colKwnVar: 'Kwentra Diff',
    colAuditor: 'Auditor / Closed',
    cashCounterTitle: 'Cash Denomination Counter',
    cashCounterSubtitle: 'Count physical bills by denomination and push total directly to General Cashier Drop',
    denomination: 'Bill',
    qty: 'Qty',
    subtotal: 'Subtotal',
    totalCounted: 'Total Physical Count',
    expectedCash: 'Expected Book Cash',
    applyCashBtn: 'Apply Count to Settlement',
    edcTitle: 'Bank-by-Bank EDC Terminal Reconciliation',
    edcSubtitle: 'Track Visa/Mastercard/Meeza Z-Report batches per bank with fee % and net settlement',
    bankName: 'Bank Name',
    scheme: 'Card Scheme',
    batchNo: 'Batch #',
    grossAmt: 'Gross Amount',
    feePct: 'Fee %',
    netSettle: 'Net Settlement',
    addEdcBtn: 'Add Batch',
    syncEdcBtn: 'Sync EDC Total to Settlement',
    matched: 'Matched',
    pending: 'Review',
    shiftsTitle: 'Cashier Shift Envelopes (Over / Short)',
    shiftsSubtitle: 'Isolate Morning, Afternoon, and Night cashier variance by envelope',
    cashierName: 'Cashier / Station',
    shift: 'Shift',
    expected: 'Expected',
    dropped: 'Dropped',
    overShort: 'Over/Short',
    note: 'Remarks',
    addShiftBtn: 'Add Shift',
    splitTitle: 'Package Split (Room vs BB / HB / FB / AI)',
    splitSubtitle: 'Separates meal entitlements bundled in room rates into F&B revenue matching Kwentra Trial Balance',
    rawRoom: 'Raw Room Net',
    splitDeduction: 'Meal Split to F&B',
    adjRoom: 'Adjusted Room Net',
    rawFb: 'Direct F&B Net',
    adjFb: 'Adjusted F&B Net',
    trailTitle: 'Immutable Audit Trail Log',
    trailSubtitle: 'Chronological record of ledger postings, approvals, locks, settlements, and FX edits',
    trailSearch: 'Search audit trail...',
    trailTime: 'Time',
    trailAction: 'Action',
    trailActor: 'Actor',
    trailTarget: 'Target Ref',
    trailDetail: 'Detail',
    trailImpact: 'Impact',
    actions: {
      create: 'Create',
      delete: 'Delete',
      approve: 'Approve',
      reconcile: 'Reconcile',
      lock: 'Lock Day',
      unlock: 'Unlock Day',
      archive: 'Archive',
      settlement: 'Settlement',
      rate_change: 'FX Rate',
      security_change: 'Security',
    },
  },
  fr: {
    tabs: {
      archive: '1. Archives, Clôture & KPIs Hôtel',
      cashiers: '2. Comptage Espèces, EDC & Caissiers',
      trail: '3. Forfaits (Package Split) & Piste d’Audit',
    },
    lockDayBtn: 'Clôturer la Journée',
    unlockDayBtn: 'Déverrouiller la Journée',
    archiveDayBtn: 'Archiver & Clôturer Aujourd’hui',
    dayLockedBadge: 'Journée Clôturée — Lecture Seule',
    dayOpenBadge: 'Journée Ouverte',
    occTitle: 'Indicateurs Hôteliers (Occupancy · ADR · RevPAR)',
    occSubtitle: 'Calculés en direct sur le revenu Hébergement Net ajusté après ventilation des repas',
    roomsSold: 'Chambres Vendues',
    compRooms: 'Gratuites (Comp)',
    houseUseRooms: 'Usage Interne',
    oooRooms: 'Hors Service (OOO)',
    kpiOcc: 'Taux d’Occupation',
    kpiAdr: 'Prix Moyen (ADR)',
    kpiRevpar: 'RevPAR',
    kpiMtd: 'Cumul Mensuel (Archives + Jour)',
    budgetTarget: 'Budget Quotidien',
    archiveTableTitle: 'Historique des Journées Clôturées',
    archiveEmpty: 'Aucune journée archivée pour le moment.',
    colDate: 'Date Comptable',
    colRooms: 'Vendues',
    colOcc: 'Occ %',
    colAdr: 'ADR',
    colRevpar: 'RevPAR',
    colGross: 'Brut TTC',
    colVar: 'Écart Caisse',
    colKwnVar: 'Écart Kwentra',
    colAuditor: 'Auditeur / Heure',
    cashCounterTitle: 'Comptage Espèces par Coupure',
    cashCounterSubtitle: 'Comptez les billets et appliquez le total directement à la Caisse Générale',
    denomination: 'Coupure',
    qty: 'Qté',
    subtotal: 'Sous-total',
    totalCounted: 'Total Compté',
    expectedCash: 'Attendu Livre',
    applyCashBtn: 'Appliquer au Règlement',
    edcTitle: 'Rapprochement Terminaux Bancaires (EDC)',
    edcSubtitle: 'Lots par banque (Visa / Mastercard / Meeza), frais bancaires et règlement net',
    bankName: 'Banque',
    scheme: 'Réseau',
    batchNo: 'Lot #',
    grossAmt: 'Brut',
    feePct: 'Comm. %',
    netSettle: 'Net Banque',
    addEdcBtn: 'Ajouter Lot',
    syncEdcBtn: 'Synchroniser Total EDC',
    matched: 'Rapproché',
    pending: 'À vérifier',
    shiftsTitle: 'Contrôle des Shifts Caissiers (Écarts)',
    shiftsSubtitle: 'Suivi individuel des enveloppes par shift (Matin / Après-midi / Nuit)',
    cashierName: 'Caissier / Poste',
    shift: 'Shift',
    expected: 'Attendu',
    dropped: 'Remis',
    overShort: 'Écart',
    note: 'Remarque',
    addShiftBtn: 'Ajouter Shift',
    splitTitle: 'Ventilation des Forfaits (Room vs BB / HB / FB / AI)',
    splitSubtitle: 'Transfère la part petit-déjeuner/repas des forfaits vers F&B selon la balance Kwentra',
    rawRoom: 'Hébergement Brut HT',
    splitDeduction: 'Part Repas → F&B',
    adjRoom: 'Hébergement Net Ajusté',
    rawFb: 'F&B Direct HT',
    adjFb: 'F&B Net Ajusté',
    trailTitle: 'Piste d’Audit Horodatée Immuable',
    trailSubtitle: 'Enregistrement automatique de chaque saisie, validation, clôture et taux de change',
    trailSearch: 'Rechercher dans la piste...',
    trailTime: 'Heure',
    trailAction: 'Action',
    trailActor: 'Auteur',
    trailTarget: 'Référence',
    trailDetail: 'Détail',
    trailImpact: 'Impact',
    actions: {
      create: 'Création',
      delete: 'Suppression',
      approve: 'Validation',
      reconcile: 'Pointage',
      lock: 'Clôture',
      unlock: 'Réouverture',
      archive: 'Archivage',
      settlement: 'Caisse',
      rate_change: 'Taux Change',
      security_change: 'Sécurité',
    },
  },
};

export const AuditSuite: React.FC<AuditSuiteProps> = ({
  lang,
  config,
  summary,
  settlement,
  kwentraSnapshot,
  dayLocked,
  canOverrideDayClose = true,
  supervisorPin = '1234',
  occupancyInputs,
  dailyArchive,
  cashDenominations,
  edcTerminals,
  cashierShifts,
  auditTrail,
  onToggleDayLock,
  onUpdateOccupancy,
  onArchiveDay,
  onDeleteArchive,
  onUpdateDenominations,
  onApplyCashToSettlement,
  onAddEdcTerminal,
  onToggleEdcMatched,
  onDeleteEdcTerminal,
  onSyncEdcToSettlement,
  onAddCashierShift,
  onDeleteCashierShift,
}) => {
  const c = COPY[lang];
  const [subtab, setSubtab] = useState<SuiteSubtab>('archive');
  const [trailQuery, setTrailQuery] = useState('');
  const [closeGuardAction, setCloseGuardAction] = useState<'lock' | 'archive' | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overridePin, setOverridePin] = useState('');
  const [overrideError, setOverrideError] = useState('');

  // EDC form state
  const [bankName, setBankName] = useState('CIB Egypt');
  const [cardScheme, setCardScheme] = useState<EdcTerminalRecord['cardScheme']>('Visa');
  const [batchNo, setBatchNo] = useState('');
  const [edcGross, setEdcGross] = useState('');
  const [bankFeePct, setBankFeePct] = useState('1.5');

  // Cashier Shift form state
  const [cashierName, setCashierName] = useState('');
  const [shiftType, setShiftType] = useState<CashierShiftRecord['shift']>('Morning');
  const [shiftExpected, setShiftExpected] = useState('');
  const [shiftDropped, setShiftDropped] = useState('');
  const [shiftNote, setShiftNote] = useState('');

  const totalRooms = Math.max(1, config.totalAvailableRooms ?? 120);
  const salableRooms = Math.max(1, totalRooms - occupancyInputs.outOfOrderRooms);
  const occupancyPct = Math.min(
    100,
    Number(((occupancyInputs.roomsSold / salableRooms) * 100).toFixed(1))
  );
  const adr = occupancyInputs.roomsSold > 0 ? summary.adjustedRoomNet / occupancyInputs.roomsSold : 0;
  const revpar = salableRooms > 0 ? summary.adjustedRoomNet / salableRooms : 0;

  const archivedGrossTotal = useMemo(
    () => dailyArchive.reduce((acc, r) => acc + r.grossRevenue, 0),
    [dailyArchive]
  );
  const mtdGross = archivedGrossTotal + summary.grossRevenue;
  const budgetDaily = config.budgetDailyRevenue ?? 32000;
  const budgetPct = budgetDaily > 0 ? Number(((summary.grossRevenue / budgetDaily) * 100).toFixed(1)) : 0;

  const kwentraGross =
    kwentraSnapshot.roomNet +
    kwentraSnapshot.fbNet +
    kwentraSnapshot.otherNet +
    kwentraSnapshot.serviceCharge +
    kwentraSnapshot.vatAndTaxes;

  const cashCountTotal = useMemo(
    () =>
      DENOM_VALUES.reduce(
        (acc, val) => acc + val * (cashDenominations[String(val)] ?? 0),
        0
      ),
    [cashDenominations]
  );

  const edcTotals = useMemo(() => {
    const gross = edcTerminals.reduce((acc, t) => acc + t.grossAmount, 0);
    const net = edcTerminals.reduce(
      (acc, t) => acc + t.grossAmount * (1 - t.bankFeePct / 100),
      0
    );
    return { gross: Number(gross.toFixed(2)), net: Number(net.toFixed(2)) };
  }, [edcTerminals]);

  const filteredTrail = useMemo(() => {
    const q = trailQuery.trim().toLowerCase();
    if (!q) return auditTrail;
    return auditTrail.filter(
      (item) =>
        item.actor.toLowerCase().includes(q) ||
        item.targetRef.toLowerCase().includes(q) ||
        item.detail.toLowerCase().includes(q) ||
        item.action.toLowerCase().includes(q)
    );
  }, [auditTrail, trailQuery]);

  const criticalExceptions = useMemo(
    () => summary.exceptions.filter((ex) => ex.severity === 'critical'),
    [summary.exceptions]
  );

  const performArchiveRecord = () => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    onArchiveDay({
      id: `arc-${Date.now()}`,
      businessDate: config.businessDate,
      roomsSold: occupancyInputs.roomsSold,
      totalAvailableRooms: totalRooms,
      occupancyPct,
      adr: Number(adr.toFixed(2)),
      revpar: Number(revpar.toFixed(2)),
      roomNet: summary.adjustedRoomNet,
      fbNet: summary.adjustedFbNet,
      otherNet: summary.otherNet,
      grossRevenue: summary.grossRevenue,
      totalVariance: summary.totalVariance,
      kwentraVariance: Number((summary.grossRevenue - kwentraGross).toFixed(2)),
      lockedAt: hhmm,
      auditorName: settlement.generalCashierName,
    });
  };

  const handleRequestLockToggle = () => {
    if (!dayLocked && criticalExceptions.length > 0) {
      setOverrideReason('');
      setOverridePin('');
      setOverrideError('');
      setCloseGuardAction('lock');
      return;
    }
    onToggleDayLock();
  };

  const handleArchiveCurrentDay = () => {
    if (!dayLocked && criticalExceptions.length > 0) {
      setOverrideReason('');
      setOverridePin('');
      setOverrideError('');
      setCloseGuardAction('archive');
      return;
    }
    performArchiveRecord();
  };

  const handleConfirmCloseOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canOverrideDayClose) {
      setOverrideError(
        lang === 'ar'
          ? 'صلاحيتك الحالية لا تسمح بتجاوز تنبيهات الإغلاق الحرجة.'
          : 'Your current role cannot override critical closing checks.'
      );
      return;
    }
    if (!overrideReason.trim()) {
      setOverrideError(
        lang === 'ar'
          ? 'يرجى كتابة سبب التجاوز الإداري للمتابعة.'
          : 'Please enter a written Supervisor Override reason.'
      );
      return;
    }
    if (overridePin !== supervisorPin) {
      setOverrideError(
        lang === 'ar' ? 'رمز المشرف (PIN) غير صحيح.' : 'Incorrect Supervisor PIN.'
      );
      return;
    }
    const mode = closeGuardAction;
    const reasonText = overrideReason.trim();
    setCloseGuardAction(null);
    if (mode === 'archive') {
      performArchiveRecord();
    }
    onToggleDayLock(reasonText);
  };

  const handleAddEdcSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(edcGross) || 0;
    if (!bankName.trim() || !batchNo.trim() || amt <= 0) return;
    onAddEdcTerminal({
      id: `edc-${Date.now()}`,
      bankName: bankName.trim(),
      cardScheme,
      batchNo: batchNo.trim(),
      grossAmount: Number(amt.toFixed(2)),
      bankFeePct: parseFloat(bankFeePct) || 0,
      matched: false,
    });
    setBatchNo('');
    setEdcGross('');
  };

  const handleAddShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const exp = parseFloat(shiftExpected) || 0;
    const drp = parseFloat(shiftDropped) || 0;
    if (!cashierName.trim()) return;
    onAddCashierShift({
      id: `csh-${Date.now()}`,
      cashierName: cashierName.trim(),
      shift: shiftType,
      expectedAmount: Number(exp.toFixed(2)),
      droppedAmount: Number(drp.toFixed(2)),
      note: shiftNote.trim() || '—',
    });
    setCashierName('');
    setShiftExpected('');
    setShiftDropped('');
    setShiftNote('');
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation + Lock Control */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'archive', label: c.tabs.archive, icon: Archive },
              { id: 'cashiers', label: c.tabs.cashiers, icon: Banknote },
              { id: 'trail', label: c.tabs.trail, icon: History },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = subtab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubtab(item.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  active
                    ? 'bg-[#0F1E36] text-white border-[#0F1E36]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
              dayLocked
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {dayLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{dayLocked ? c.dayLockedBadge : c.dayOpenBadge}</span>
          </span>

          <button
            type="button"
            onClick={handleRequestLockToggle}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              dayLocked
                ? 'bg-slate-800 hover:bg-slate-900 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {dayLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {dayLocked ? c.unlockDayBtn : c.lockDayBtn}
          </button>
        </div>
      </section>

      {/* TAB 1: DAILY ARCHIVE, LOCK & HOTEL KPIs */}
      {subtab === 'archive' && (
        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{c.occTitle}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{c.occSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={handleArchiveCurrentDay}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0F1E36] hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Archive className="w-3.5 h-3.5" />
                {c.archiveDayBtn}
              </button>
            </div>

            {/* Occupancy Inputs */}
            <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-200 bg-slate-50/60">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {c.roomsSold} (/{salableRooms})
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalRooms}
                  value={occupancyInputs.roomsSold}
                  onChange={(e) =>
                    onUpdateOccupancy({
                      ...occupancyInputs,
                      roomsSold: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg bg-white"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {c.compRooms}
                </label>
                <input
                  type="number"
                  min="0"
                  value={occupancyInputs.complimentaryRooms}
                  onChange={(e) =>
                    onUpdateOccupancy({
                      ...occupancyInputs,
                      complimentaryRooms: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg bg-white"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {c.houseUseRooms}
                </label>
                <input
                  type="number"
                  min="0"
                  value={occupancyInputs.houseUseRooms}
                  onChange={(e) =>
                    onUpdateOccupancy({
                      ...occupancyInputs,
                      houseUseRooms: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg bg-white"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {c.oooRooms}
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalRooms - 1}
                  value={occupancyInputs.outOfOrderRooms}
                  onChange={(e) =>
                    onUpdateOccupancy({
                      ...occupancyInputs,
                      outOfOrderRooms: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg bg-white"
                  dir="ltr"
                />
              </div>
            </div>

            {/* 4 KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-200">
              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">{c.kpiOcc}</p>
                <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-blue-700" dir="ltr">
                  {occupancyPct}%
                </p>
                <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums" dir="ltr">
                  {occupancyInputs.roomsSold} / {salableRooms} rooms
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">{c.kpiAdr}</p>
                <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900" dir="ltr">
                  {formatMoney(adr, config.currency)}
                </p>
                <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums" dir="ltr">
                  Adj. Room Net: {formatMoney(summary.adjustedRoomNet, config.currency)}
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">{c.kpiRevpar}</p>
                <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900" dir="ltr">
                  {formatMoney(revpar, config.currency)}
                </p>
                <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums" dir="ltr">
                  {c.budgetTarget}: {budgetPct}% ({formatMoney(budgetDaily, config.currency)})
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs font-medium text-slate-500">{c.kpiMtd}</p>
                <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700" dir="ltr">
                  {formatMoney(mtdGross, config.currency)}
                </p>
                <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                  {dailyArchive.length + 1} days
                </p>
              </div>
            </div>
          </section>

          {/* Archive History Table */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">{c.archiveTableTitle}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-4 text-start font-semibold">{c.colDate}</th>
                    <th className="py-2.5 px-4 text-center font-semibold">{c.colRooms}</th>
                    <th className="py-2.5 px-4 text-center font-semibold">{c.colOcc}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.colAdr}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.colRevpar}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.colGross}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.colVar}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.colKwnVar}</th>
                    <th className="py-2.5 px-4 text-start font-semibold">{c.colAuditor}</th>
                    <th className="py-2.5 px-4 text-end font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dailyArchive.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        {c.archiveEmpty}
                      </td>
                    </tr>
                  ) : (
                    dailyArchive.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-900" dir="ltr">
                          {rec.businessDate}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono tabular-nums">
                          {rec.roomsSold}/{rec.totalAvailableRooms}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono tabular-nums font-semibold text-blue-700">
                          {rec.occupancyPct}%
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono tabular-nums" dir="ltr">
                          {formatMoney(rec.adr, config.currency)}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono tabular-nums" dir="ltr">
                          {formatMoney(rec.revpar, config.currency)}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono tabular-nums font-semibold text-slate-900" dir="ltr">
                          {formatMoney(rec.grossRevenue, config.currency)}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-end font-mono tabular-nums ${
                            Math.abs(rec.totalVariance) <= config.cashVarianceTolerance
                              ? 'text-emerald-700'
                              : 'text-red-600'
                          }`}
                          dir="ltr"
                        >
                          {rec.totalVariance > 0 ? '+' : ''}
                          {rec.totalVariance.toFixed(2)}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-end font-mono tabular-nums ${
                            Math.abs(rec.kwentraVariance) <= 1 ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                          dir="ltr"
                        >
                          {rec.kwentraVariance > 0 ? '+' : ''}
                          {rec.kwentraVariance.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {rec.auditorName} · <span className="font-mono">{rec.lockedAt}</span>
                        </td>
                        <td className="py-2.5 px-4 text-end">
                          <button
                            type="button"
                            onClick={() => onDeleteArchive(rec.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            aria-label={rec.businessDate}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: CASH DENOMINATION COUNTER, EDC TERMINALS & CASHIER SHIFTS */}
      {subtab === 'cashiers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cash Denomination Counter */}
            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">{c.cashCounterTitle}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{c.cashCounterSubtitle}</p>
              </div>
              <div className="p-5 space-y-4">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 text-start font-semibold">{c.denomination}</th>
                      <th className="py-2 text-center font-semibold">{c.qty}</th>
                      <th className="py-2 text-end font-semibold">{c.subtotal}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {DENOM_VALUES.map((val) => {
                      const count = cashDenominations[String(val)] ?? 0;
                      return (
                        <tr key={val}>
                          <td className="py-2 font-mono font-bold text-slate-900" dir="ltr">
                            {val} {config.currency}
                          </td>
                          <td className="py-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={count}
                              onChange={(e) =>
                                onUpdateDenominations({
                                  ...cashDenominations,
                                  [String(val)]: Math.max(0, parseInt(e.target.value, 10) || 0),
                                })
                              }
                              className="w-20 px-2 py-1 text-center font-mono border border-slate-300 rounded-md"
                              dir="ltr"
                            />
                          </td>
                          <td
                            className="py-2 text-end font-mono tabular-nums font-semibold text-slate-800"
                            dir="ltr"
                          >
                            {formatMoney(val * count, config.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">{c.totalCounted}</span>
                    <span className="font-mono font-bold text-slate-900" dir="ltr">
                      {formatMoney(cashCountTotal, config.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">{c.expectedCash}</span>
                    <span className="font-mono font-semibold text-slate-700" dir="ltr">
                      {formatMoney(summary.expectedCash, config.currency)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onApplyCashToSettlement(cashCountTotal)}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  {c.applyCashBtn}
                </button>
              </div>
            </section>

            {/* Bank-by-Bank EDC Terminal Reconciliation */}
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{c.edcTitle}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{c.edcSubtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSyncEdcToSettlement(edcTotals.gross)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F1E36] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  {c.syncEdcBtn} ({formatMoney(edcTotals.gross, config.currency)})
                </button>
              </div>

              <form
                onSubmit={handleAddEdcSubmit}
                className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-6 gap-2 items-end"
              >
                <div className="col-span-2 sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    {c.bankName}
                  </label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    {c.scheme}
                  </label>
                  <select
                    value={cardScheme}
                    onChange={(e) =>
                      setCardScheme(e.target.value as EdcTerminalRecord['cardScheme'])
                    }
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Meeza">Meeza</option>
                    <option value="Amex">Amex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    {c.batchNo}
                  </label>
                  <input
                    type="text"
                    required
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    placeholder="B-109"
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    {c.grossAmt}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={edcGross}
                    onChange={(e) => setEdcGross(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                    dir="ltr"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="w-full py-1.5 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {c.addEdcBtn}
                  </button>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-2.5 px-4 text-start font-semibold">{c.bankName}</th>
                      <th className="py-2.5 px-4 text-start font-semibold">{c.scheme}</th>
                      <th className="py-2.5 px-4 text-start font-semibold">{c.batchNo}</th>
                      <th className="py-2.5 px-4 text-end font-semibold">{c.grossAmt}</th>
                      <th className="py-2.5 px-4 text-end font-semibold">{c.netSettle}</th>
                      <th className="py-2.5 px-4 text-start font-semibold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {edcTerminals.map((edc) => {
                      const net = edc.grossAmount * (1 - edc.bankFeePct / 100);
                      return (
                        <tr key={edc.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-4 font-medium text-slate-900">
                            {edc.bankName}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">{edc.cardScheme}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-700">{edc.batchNo}</td>
                          <td className="py-2.5 px-4 text-end font-mono tabular-nums" dir="ltr">
                            {formatMoney(edc.grossAmount, config.currency)}
                          </td>
                          <td
                            className="py-2.5 px-4 text-end font-mono tabular-nums text-emerald-700 font-semibold"
                            dir="ltr"
                          >
                            {formatMoney(net, config.currency)}{' '}
                            <span className="text-[10px] text-slate-400">(-{edc.bankFeePct}%)</span>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => onToggleEdcMatched(edc.id)}
                                className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${
                                  edc.matched
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-amber-50 text-amber-800'
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                {edc.matched ? c.matched : c.pending}
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteEdcTerminal(edc.id)}
                                className="p-1 text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Cashier Shift Envelopes */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">{c.shiftsTitle}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{c.shiftsSubtitle}</p>
              </div>
            </div>

            <form
              onSubmit={handleAddShiftSubmit}
              className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-6 gap-2 items-end"
            >
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.cashierName}
                </label>
                <input
                  type="text"
                  required
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.shift}
                </label>
                <select
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value as CashierShiftRecord['shift'])}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Night">Night</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.expected}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={shiftExpected}
                  onChange={(e) => setShiftExpected(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.dropped}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={shiftDropped}
                  onChange={(e) => setShiftDropped(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                  dir="ltr"
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full py-1.5 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {c.addShiftBtn}
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-4 text-start font-semibold">{c.cashierName}</th>
                    <th className="py-2.5 px-4 text-start font-semibold">{c.shift}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.expected}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.dropped}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.overShort}</th>
                    <th className="py-2.5 px-4 text-start font-semibold">{c.note}</th>
                    <th className="py-2.5 px-4 text-end font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cashierShifts.map((s) => {
                    const diff = Number((s.droppedAmount - s.expectedAmount).toFixed(2));
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-medium text-slate-900">{s.cashierName}</td>
                        <td className="py-2.5 px-4 text-slate-600">{s.shift}</td>
                        <td className="py-2.5 px-4 text-end font-mono tabular-nums" dir="ltr">
                          {formatMoney(s.expectedAmount, config.currency)}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono tabular-nums" dir="ltr">
                          {formatMoney(s.droppedAmount, config.currency)}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-end font-mono tabular-nums font-semibold ${
                            Math.abs(diff) <= 5 ? 'text-emerald-700' : 'text-red-600'
                          }`}
                          dir="ltr"
                        >
                          {diff > 0 ? '+' : ''}
                          {diff.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{s.note}</td>
                        <td className="py-2.5 px-4 text-end">
                          <button
                            type="button"
                            onClick={() => onDeleteCashierShift(s.id)}
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: PACKAGE SPLIT TRIAL BALANCE & IMMUTABLE AUDIT TRAIL */}
      {subtab === 'trail' && (
        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">{c.splitTitle}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{c.splitSubtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-200">
              <div className="p-5">
                <p className="text-xs text-slate-500">{c.rawRoom}</p>
                <p className="mt-2 text-lg font-bold font-mono tabular-nums text-slate-900" dir="ltr">
                  {formatMoney(summary.roomNet, config.currency)}
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500">{c.splitDeduction}</p>
                <p className="mt-2 text-lg font-bold font-mono tabular-nums text-blue-700" dir="ltr">
                  {formatMoney(summary.packageSplitTotal, config.currency)}
                </p>
              </div>
              <div className="p-5 bg-slate-50/70">
                <p className="text-xs font-semibold text-slate-700">{c.adjRoom}</p>
                <p className="mt-2 text-lg font-bold font-mono tabular-nums text-[#0F1E36]" dir="ltr">
                  {formatMoney(summary.adjustedRoomNet, config.currency)}
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500">{c.rawFb}</p>
                <p className="mt-2 text-lg font-bold font-mono tabular-nums text-slate-900" dir="ltr">
                  {formatMoney(summary.fbNet, config.currency)}
                </p>
              </div>
              <div className="p-5 bg-emerald-50/40">
                <p className="text-xs font-semibold text-emerald-800">{c.adjFb}</p>
                <p className="mt-2 text-lg font-bold font-mono tabular-nums text-emerald-700" dir="ltr">
                  {formatMoney(summary.adjustedFbNet, config.currency)}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{c.trailTitle}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{c.trailSubtitle}</p>
                </div>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={trailQuery}
                  onChange={(e) => setTrailQuery(e.target.value)}
                  placeholder={c.trailSearch}
                  className="w-full ps-9 pe-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-4 text-start font-semibold">{c.trailTime}</th>
                    <th className="py-2.5 px-4 text-start font-semibold">{c.trailAction}</th>
                    <th className="py-2.5 px-4 text-start font-semibold">{c.trailActor}</th>
                    <th className="py-2.5 px-4 text-start font-semibold">{c.trailTarget}</th>
                    <th className="py-2.5 px-4 text-start font-semibold">{c.trailDetail}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.trailImpact}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTrail.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap" dir="ltr">
                        {entry.timestamp}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-blue-700 whitespace-nowrap">
                        {c.actions[entry.action] ?? entry.action}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 whitespace-nowrap">
                        <span>{entry.actor}</span>
                        {entry.actorRole && (
                          <span className="ms-1.5 px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {entry.actorRole}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {entry.targetRef}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        <span>{entry.detail}</span>
                        {(entry.oldValues || entry.newValues) && (
                          <span className="block text-[10px] font-mono text-slate-500 mt-0.5" dir="ltr">
                            {entry.oldValues ? `Old: ${entry.oldValues}` : ''}
                            {entry.oldValues && entry.newValues ? ' → ' : ''}
                            {entry.newValues ? `New: ${entry.newValues}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono tabular-nums whitespace-nowrap" dir="ltr">
                        {typeof entry.amountImpact === 'number'
                          ? formatMoney(entry.amountImpact, config.currency)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Pre-Flight Day-Closing Critical Exception Override Modal */}
      {closeGuardAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4 no-print">
          <form
            onSubmit={handleConfirmCloseOverride}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'ar'
                    ? 'فحص إغلاق اليوم المالي (Pre-Flight Guard)'
                    : 'Day-Closing Pre-Flight Guard'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCloseGuardAction(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-red-50 border border-red-200 space-y-1.5 text-xs text-red-900">
              <p className="font-semibold">
                {lang === 'ar'
                  ? `توجد (${criticalExceptions.length}) مخالفات حرجة تمنع الإغلاق التلقائي:`
                  : `${criticalExceptions.length} critical audit exception(s) detected before day close:`}
              </p>
              <ul className="list-disc ps-5 space-y-0.5 text-[11px]">
                {criticalExceptions.map((ex) => (
                  <li key={ex.id}>{ex.title}</li>
                ))}
              </ul>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {lang === 'ar' ? 'سبب التجاوز الإداري (إلزامي)' : 'Supervisor Override Reason'}
              </label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder={
                  lang === 'ar' ? 'مثال: تسوية معلقة بموافقة المدير المالي' : 'e.g. Approved pending adjustment by FC'
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0088CC]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {lang === 'ar' ? 'رمز المشرف (Supervisor PIN)' : 'Supervisor PIN'}
              </label>
              <input
                type="password"
                value={overridePin}
                onChange={(e) => setOverridePin(e.target.value)}
                placeholder="••••"
                dir="ltr"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0088CC]"
              />
            </div>

            {overrideError && <p className="text-xs font-medium text-red-600">{overrideError}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCloseGuardAction(null)}
                className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg"
              >
                {lang === 'ar' ? 'تجاوز وإغلاق اليوم' : 'Override & Close Day'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
