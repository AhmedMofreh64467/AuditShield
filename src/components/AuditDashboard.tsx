import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BedDouble,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  ExternalLink,
  Flag,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LanguageCode, TranslationDict } from '../i18n/translations';
import {
  AuditExceptionResolution,
  AuditSummary,
  AuditTask,
  AuditTaskStatus,
  CashSettlement,
  DailyArchiveRecord,
  HotelConfig,
  HotelRoom,
  LedgerEntry,
  OccupancyInputs,
  RoomDiscrepancy,
  RoomFolioItem,
  RoomReservation,
} from '../types/audit';
import { RoomRevenueHeatmap } from './RoomRevenueHeatmap';
import {
  convertCurrency,
  formatMoney,
  getExchangeRates,
} from '../utils/auditEngine';
import { computeAllRoomsRevenueReport } from '../utils/roomRevenueEngine';

type DashboardNavTarget =
  | 'incomeAudit'
  | 'rooms'
  | 'ledger'
  | 'compare'
  | 'reports'
  | 'settings'
  | 'recovery'
  | 'auditSuite'
  | 'receivables';

interface AuditDashboardProps {
  lang: LanguageCode;
  t: TranslationDict;
  config: HotelConfig;
  entries: LedgerEntry[];
  summary: AuditSummary;
  settlement: CashSettlement;
  onUpdateSettlement: (next: CashSettlement) => void;
  tasks: AuditTask[];
  onUpdateTask: (id: string, status: AuditTaskStatus, notes?: string) => void;
  discrepancies: RoomDiscrepancy[];
  onToggleDiscrepancyResolved: (id: string) => void;
  onAddDiscrepancy: (d: Omit<RoomDiscrepancy, 'id'>) => void;
  onNavigateToTab: (tab: DashboardNavTarget) => void;
  occupancyInputs?: OccupancyInputs;
  dayLocked?: boolean;
  hotelRooms?: HotelRoom[];
  roomReservations?: RoomReservation[];
  roomFolioItems?: RoomFolioItem[];
  exceptionResolutions?: Record<string, AuditExceptionResolution>;
  dailyArchive?: DailyArchiveRecord[];
}

interface QuickBookmark {
  id: string;
  name: string;
  target: DashboardNavTarget;
  shortcut: string;
}

const DEPARTMENT_COLORS = [
  '#2563EB',
  '#0F1E36',
  '#0284C7',
  '#D97706',
  '#16A34A',
  '#475569',
];

function resolveDepartmentLabel(
  entry: LedgerEntry,
  lang: LanguageCode
): { key: string; label: string; shortLabel: string } {
  if (entry.category === 'Room') {
    return {
      key: 'rooms',
      label:
        lang === 'en'
          ? 'Rooms & Accommodation (Front Office)'
          : lang === 'fr'
          ? 'Hébergement (Front Office)'
          : 'الغرف والإقامة (Front Office)',
      shortLabel: lang === 'en' ? 'Rooms' : lang === 'fr' ? 'Chambres' : 'الغرف',
    };
  }
  if (entry.category === 'FoodBeverage') {
    const outlet = entry.outletOrDept.trim();
    if (outlet === 'Main Restaurant') {
      return {
        key: 'fb-main',
        label:
          lang === 'en'
            ? 'Main Restaurant'
            : lang === 'fr'
            ? 'Restaurant Principal'
            : 'المطعم الرئيسي',
        shortLabel:
          lang === 'en' ? 'Restaurant' : lang === 'fr' ? 'Restaurant' : 'المطعم الرئيسي',
      };
    }
    if (outlet === 'Lobby Lounge') {
      return {
        key: 'fb-lounge',
        label:
          lang === 'en'
            ? 'Lobby Lounge & Beverages'
            : lang === 'fr'
            ? 'Lobby Lounge & Boissons'
            : 'المشروبات واللاونج',
        shortLabel: lang === 'en' ? 'Lounge' : lang === 'fr' ? 'Lounge' : 'اللاونج',
      };
    }
    if (outlet === 'Room Service') {
      return {
        key: 'fb-rs',
        label:
          lang === 'en'
            ? 'Room Service'
            : lang === 'fr'
            ? 'Room Service'
            : 'خدمة الغرف',
        shortLabel:
          lang === 'en' ? 'Room Service' : lang === 'fr' ? 'Room Service' : 'خدمة الغرف',
      };
    }
    if (outlet === 'Pool Bar') {
      return {
        key: 'fb-pool',
        label:
          lang === 'en' ? 'Pool Bar' : lang === 'fr' ? 'Bar Piscine' : 'بار المسبح',
        shortLabel:
          lang === 'en' ? 'Pool Bar' : lang === 'fr' ? 'Bar Piscine' : 'بار المسبح',
      };
    }
    return { key: `fb-${outlet}`, label: outlet, shortLabel: outlet };
  }
  const dept = entry.outletOrDept.trim();
  if (dept === 'Spa & Laundry') {
    return {
      key: 'other-spa',
      label:
        lang === 'en'
          ? 'Spa & Laundry'
          : lang === 'fr'
          ? 'Spa & Lingerie'
          : 'السبا والغسيل',
      shortLabel:
        lang === 'en' ? 'Spa/Laundry' : lang === 'fr' ? 'Spa/Lingerie' : 'السبا والغسيل',
    };
  }
  return { key: `other-${dept}`, label: dept, shortLabel: dept };
}

export const AuditDashboard: React.FC<AuditDashboardProps> = ({
  lang,
  t,
  config,
  entries,
  summary,
  settlement,
  onUpdateSettlement,
  tasks,
  onUpdateTask,
  discrepancies,
  onToggleDiscrepancyResolved,
  onAddDiscrepancy,
  onNavigateToTab,
  occupancyInputs,
  dayLocked = false,
  hotelRooms = [],
  roomReservations = [],
  roomFolioItems = [],
  exceptionResolutions = {},
  dailyArchive = [],
}) => {
  const [newRoom, setNewRoom] = useState('');
  const [newFoStatus, setNewFoStatus] = useState<'Occupied' | 'Vacant' | 'DueOut'>('Vacant');
  const [newHkStatus, setNewHkStatus] = useState<
    'Occupied' | 'VacantClean' | 'VacantDirty' | 'SleepOut'
  >('Occupied');
  const [newDiscNote, setNewDiscNote] = useState('');
  const [showDiscForm, setShowDiscForm] = useState(false);

  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [metricMode, setMetricMode] = useState<'netAmount' | 'grossAmount'>('netAmount');

  const [bookmarks, setBookmarks] = useState<QuickBookmark[]>([
    { id: 'bm-1', name: 'Outage Posting Ledger', target: 'ledger', shortcut: 'Ctrl+L' },
    { id: 'bm-2', name: 'Kwentra PMS Compare', target: 'compare', shortcut: 'Ctrl+K' },
    { id: 'bm-3', name: 'Reports & Export Center', target: 'reports', shortcut: 'Ctrl+R' },
  ]);
  const [showBmForm, setShowBmForm] = useState(false);
  const [bmName, setBmName] = useState('');
  const [bmTarget, setBmTarget] = useState<DashboardNavTarget>('ledger');
  const [bmShortcut, setBmShortcut] = useState('');

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bmName.trim()) return;
    setBookmarks((prev) => [
      ...prev,
      {
        id: `bm-${Date.now()}`,
        name: bmName.trim(),
        target: bmTarget,
        shortcut: bmShortcut.trim() || '—',
      },
    ]);
    setBmName('');
    setBmShortcut('');
    setShowBmForm(false);
  };

  const verifiedCount = tasks.filter((tItem) => tItem.status === 'verified').length;
  const flaggedCount = tasks.filter((tItem) => tItem.status === 'flagged').length;

  const roomEnginePulse = useMemo(() => {
    const report = computeAllRoomsRevenueReport(
      hotelRooms,
      roomReservations,
      roomFolioItems,
      entries,
      config,
      config.businessDate,
      exceptionResolutions
    );
    const matchedCount = report.records.filter(
      (r) => r.auditStatus === 'Matched' || r.auditStatus === 'Approved'
    ).length;
    const missingNightCount = report.records.filter((r) =>
      r.verification.anomalies.some((a) => a.type === 'missing_room_charge')
    ).length;
    return {
      totals: report.totals,
      matchedCount,
      missingNightCount,
    };
  }, [hotelRooms, roomReservations, roomFolioItems, entries, config, exceptionResolutions]);

  const departmentRevenueData = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string;
        label: string;
        shortLabel: string;
        netAmount: number;
        grossAmount: number;
        count: number;
      }
    >();

    for (const entry of entries) {
      if (
        entry.category === 'Rebate' ||
        entry.category === 'PaidOut' ||
        entry.category === 'Deposit' ||
        entry.category === 'Payment'
      )
        continue;
      const meta = resolveDepartmentLabel(entry, lang);
      const existing = grouped.get(meta.key);
      if (existing) {
        existing.netAmount = Number((existing.netAmount + entry.netAmount).toFixed(2));
        existing.grossAmount = Number((existing.grossAmount + entry.grossAmount).toFixed(2));
        existing.count += 1;
      } else {
        grouped.set(meta.key, {
          key: meta.key,
          label: meta.label,
          shortLabel: meta.shortLabel,
          netAmount: Number(entry.netAmount.toFixed(2)),
          grossAmount: Number(entry.grossAmount.toFixed(2)),
          count: 1,
        });
      }
    }

    const list = Array.from(grouped.values()).sort(
      (a, b) => b[metricMode] - a[metricMode]
    );
    const total = list.reduce((acc, item) => acc + item[metricMode], 0);

    return list.map((item, idx) => ({
      ...item,
      color: DEPARTMENT_COLORS[idx % DEPARTMENT_COLORS.length],
      sharePct: total > 0 ? Number(((item[metricMode] / total) * 100).toFixed(1)) : 0,
    }));
  }, [entries, metricMode, lang]);

  // Infographic collection mix data
  const collectionMix = useMemo(() => {
    const cashPos = Math.max(0, summary.expectedCash + summary.totalPaidOuts);
    const items = [
      {
        key: 'cash',
        label: t.dashboard.cashLabel,
        amount: cashPos,
        color: '#2563EB',
      },
      {
        key: 'card',
        label: t.dashboard.cardLabel,
        amount: summary.expectedCreditCard,
        color: '#0F1E36',
      },
      {
        key: 'cl',
        label: t.dashboard.cityLedgerLabel,
        amount: summary.expectedCityLedger,
        color: '#0284C7',
      },
      {
        key: 'rc',
        label: t.dashboard.roomChargeLabel,
        amount: summary.roomChargeTransfers,
        color: '#D97706',
      },
    ];
    const total = items.reduce((acc, i) => acc + i.amount, 0);
    return items.map((i) => ({
      ...i,
      pct: total > 0 ? Number(((i.amount / total) * 100).toFixed(1)) : 0,
    }));
  }, [summary, t]);

  // Last 7 days daily revenue trend data (6 archived days + today's live summary)
  const sevenDayTrendData = useMemo(() => {
    const archiveByDate = new Map<string, DailyArchiveRecord>();
    for (const rec of dailyArchive) {
      archiveByDate.set(rec.businessDate, rec);
    }

    const baseDate = new Date(`${config.businessDate}T12:00:00`);
    const safeBase = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;

    const totalRooms = Math.max(1, config.totalAvailableRooms ?? 120);
    const occCount = occupancyInputs?.roomsSold ?? 92;
    const oooCount = occupancyInputs?.outOfOrderRooms ?? 3;
    const salable = Math.max(1, totalRooms - oooCount);
    const liveOccPct = Math.min(100, Number(((occCount / salable) * 100).toFixed(1)));

    const days: {
      date: string;
      shortDate: string;
      grossRevenue: number;
      roomNet: number;
      fbNet: number;
      occupancyPct: number;
      isLive: boolean;
    }[] = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const d = new Date(safeBase);
      d.setDate(safeBase.getDate() - offset);
      const iso = d.toISOString().slice(0, 10);
      const short = iso.slice(5); // MM-DD

      if (offset === 0) {
        days.push({
          date: iso,
          shortDate:
            lang === 'ar' ? `${short} (اليوم)` : lang === 'fr' ? `${short} (Auj.)` : `${short} (Today)`,
          grossRevenue: Number(summary.grossRevenue.toFixed(2)),
          roomNet: Number(summary.adjustedRoomNet.toFixed(2)),
          fbNet: Number(summary.adjustedFbNet.toFixed(2)),
          occupancyPct: liveOccPct,
          isLive: true,
        });
      } else {
        const archived = archiveByDate.get(iso);
        days.push({
          date: iso,
          shortDate: short,
          grossRevenue: Number((archived?.grossRevenue ?? 0).toFixed(2)),
          roomNet: Number((archived?.roomNet ?? 0).toFixed(2)),
          fbNet: Number((archived?.fbNet ?? 0).toFixed(2)),
          occupancyPct: archived?.occupancyPct ?? 0,
          isLive: false,
        });
      }
    }
    return days;
  }, [dailyArchive, config.businessDate, config.totalAvailableRooms, occupancyInputs, summary, lang]);

  const handleCreateDiscrepancy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.trim()) return;
    onAddDiscrepancy({
      roomNumber: newRoom.trim(),
      frontOfficeStatus: newFoStatus,
      housekeepingStatus: newHkStatus,
      foPax: newFoStatus === 'Occupied' ? 2 : 0,
      hkPax: newHkStatus === 'Occupied' ? 2 : 0,
      resolved: false,
      note: newDiscNote.trim() || t.dashboard.hkNotePlaceholder,
    });
    setNewRoom('');
    setNewDiscNote('');
    setShowDiscForm(false);
  };

  const FlowArrow = lang === 'ar' ? ArrowLeft : ArrowRight;

  const occ = occupancyInputs ?? {
    roomsSold: 92,
    complimentaryRooms: 2,
    houseUseRooms: 1,
    outOfOrderRooms: 3,
  };
  const totalRoomsCount = Math.max(1, config.totalAvailableRooms ?? 120);
  const salableRoomsCount = Math.max(1, totalRoomsCount - occ.outOfOrderRooms);
  const occRatePct = Math.min(
    100,
    Number(((occ.roomsSold / salableRoomsCount) * 100).toFixed(1))
  );
  const openDiscCount = discrepancies.filter((d) => !d.resolved).length;

  return (
    <div className="space-y-8">
      {/* Kwentra Front-Office Style: Today's Metrics (3 Clean Cards) */}
      <section aria-label="Today's Metrics" className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">
          {lang === 'ar'
            ? 'مؤشرات اليوم'
            : lang === 'fr'
            ? 'Indicateurs du Jour'
            : "Today's Metrics"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Rooms Sold & Comp */}
          <button
            type="button"
            onClick={() => onNavigateToTab('auditSuite')}
            className="bg-white border border-slate-200/90 rounded-lg shadow-[0_1px_4px_rgba(15,23,42,0.05)] p-5 text-start hover:border-sky-300 transition-colors"
          >
            <p className="text-sm font-medium text-slate-700">
              {lang === 'ar'
                ? 'الغرف المباعة / المسجلة'
                : lang === 'fr'
                ? 'Chambres Vendues'
                : 'Sold Rooms & Arrivals'}
            </p>
            <div className="my-5 text-center">
              <span className="text-4xl font-bold text-[#0088CC] underline underline-offset-8 decoration-2 font-mono tabular-nums">
                {occ.roomsSold}
              </span>
              <span className="text-sm font-semibold text-[#0088CC] ms-1.5 underline underline-offset-8 decoration-2">
                {lang === 'ar' ? 'غرفة' : lang === 'fr' ? 'Ch.' : 'Rooms'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5 font-mono tabular-nums">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                {occ.complimentaryRooms} Comp
              </span>
              <span className="font-mono tabular-nums">{occ.houseUseRooms} House</span>
            </div>
          </button>

          {/* Card 2: In-House / Occupancy */}
          <button
            type="button"
            onClick={() => onNavigateToTab('auditSuite')}
            className="bg-white border border-slate-200/90 rounded-lg shadow-[0_1px_4px_rgba(15,23,42,0.05)] p-5 text-start hover:border-emerald-300 transition-colors"
          >
            <p className="text-sm font-medium text-slate-700">
              {lang === 'ar'
                ? 'نسبة الإشغال الفعلي'
                : lang === 'fr'
                ? 'Occupation Actuelle'
                : 'In-House Occupancy'}
            </p>
            <div className="my-5 text-center">
              <span className="text-4xl font-bold text-[#16A34A] underline underline-offset-8 decoration-2 font-mono tabular-nums">
                {occRatePct}%
              </span>
              <span className="text-sm font-semibold text-[#16A34A] ms-1.5 underline underline-offset-8 decoration-2">
                {lang === 'ar' ? 'إشغال' : 'Occ'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5 font-mono tabular-nums">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                {salableRoomsCount} Salable
              </span>
              <span className="font-mono tabular-nums">{occ.outOfOrderRooms} OOO</span>
            </div>
          </button>

          {/* Card 3: Exceptions & Audit Alerts */}
          <button
            type="button"
            onClick={() => onNavigateToTab('ledger')}
            className="bg-white border border-slate-200/90 rounded-lg shadow-[0_1px_4px_rgba(15,23,42,0.05)] p-5 text-start hover:border-fuchsia-300 transition-colors"
          >
            <p className="text-sm font-medium text-slate-700">
              {lang === 'ar'
                ? 'تنبيهات واستثناءات اليوم'
                : lang === 'fr'
                ? 'Alertes & Anomalies'
                : 'Audit Exceptions & HK'}
            </p>
            <div className="my-5 text-center">
              <span className="text-4xl font-bold text-[#A855A3] underline underline-offset-8 decoration-2 font-mono tabular-nums">
                {summary.exceptions.length}
              </span>
              <span className="text-sm font-semibold text-[#A855A3] ms-1.5 underline underline-offset-8 decoration-2">
                {lang === 'ar' ? 'تنبيه' : lang === 'fr' ? 'Alertes' : 'Alerts'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="font-mono tabular-nums">
                {summary.outageEntriesCount} Outage
              </span>
              <span className="font-mono tabular-nums">{openDiscCount} HK Open</span>
            </div>
          </button>
        </div>

        {hotelRooms.length > 0 && (
          <div className="bg-white border border-slate-200/90 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-sky-50 text-[#0088CC] shrink-0">
                <BedDouble className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#0F1E36]">
                  {lang === 'ar'
                    ? 'نبض محرك إيرادات الغرف والـ Night Audit المباشر'
                    : lang === 'fr'
                    ? 'Moteur de Revenus Chambres & Audit Nocturne'
                    : 'Live Room Revenue Engine & Night Audit Pulse'}
                </p>
                <div
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1 font-mono tabular-nums"
                  dir="ltr"
                >
                  <span>
                    Gross Folio:{' '}
                    <strong className="text-[#0F1E36]">
                      {formatMoney(roomEnginePulse.totals.totalGrossCharges, config.currency)}
                    </strong>
                  </span>
                  <span>
                    Pkg F&B Split:{' '}
                    <strong className="text-indigo-700">
                      {formatMoney(roomEnginePulse.totals.totalPackageAllocation, config.currency)}
                    </strong>
                  </span>
                  <span className="text-emerald-700 font-semibold">
                    {roomEnginePulse.matchedCount}/{roomEnginePulse.totals.totalRooms} Matched
                  </span>
                  <span
                    className={
                      roomEnginePulse.totals.exceptionRoomsCount > 0
                        ? 'text-red-700 font-semibold'
                        : 'text-slate-500'
                    }
                  >
                    {roomEnginePulse.totals.exceptionRoomsCount} Flagged
                  </span>
                  {roomEnginePulse.missingNightCount > 0 && (
                    <span className="text-amber-700 font-semibold">
                      · {roomEnginePulse.missingNightCount} Unposted Nights
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToTab('incomeAudit')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0088CC] hover:bg-[#0070AA] rounded-lg flex items-center gap-1.5 shrink-0"
            >
              <ShieldCheck className="w-4 h-4" />
              {lang === 'ar'
                ? 'فتح محرك المراجعة اليومية'
                : lang === 'fr'
                ? 'Ouvrir Moteur d’Audit'
                : 'Open Daily Income Audit'}
            </button>
          </div>
        )}
      </section>

      {/* Kwentra Style: Quick Links / Bookmarks Strip */}
      <section aria-label="Quick Links" className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="text-lg font-semibold text-slate-800">
            {lang === 'ar' ? 'روابط سريعة' : lang === 'fr' ? 'Liens Rapides' : 'Quick Links'}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'ar' ? 'الاختصارات المحفوظة' : lang === 'fr' ? 'Favoris' : 'Bookmarks'}
          </p>
        </div>

        <div className="relative flex items-center py-2">
          <div className="w-full h-px bg-slate-300" />
          <button
            type="button"
            onClick={() => setShowBmForm((v) => !v)}
            aria-label="Add bookmark"
            className="absolute start-0 w-10 h-10 rounded-full bg-[#3F51B5] hover:bg-[#303F9F] text-white shadow-md flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {showBmForm && (
          <form
            onSubmit={handleAddBookmark}
            className="p-4 bg-white border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                {lang === 'ar' ? 'اسم الاختصار' : 'Name'}
              </label>
              <input
                type="text"
                required
                value={bmName}
                onChange={(e) => setBmName(e.target.value)}
                placeholder="Night Audit Summary"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                {lang === 'ar' ? 'الشاشة المستهدفة' : 'Target Screen'}
              </label>
              <select
                value={bmTarget}
                onChange={(e) => setBmTarget(e.target.value as DashboardNavTarget)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
              >
                <option value="incomeAudit">{t.nav.incomeAudit}</option>
                <option value="rooms">{t.nav.rooms}</option>
                <option value="ledger">{t.nav.ledger}</option>
                <option value="compare">{t.nav.compare}</option>
                <option value="auditSuite">{t.nav.auditSuite}</option>
                <option value="receivables">{t.nav.receivables}</option>
                <option value="reports">{t.nav.reports}</option>
                <option value="recovery">{t.nav.recovery}</option>
                <option value="settings">{t.nav.settings}</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                {lang === 'ar' ? 'مفتاح الاختصار' : 'Shortcut'}
              </label>
              <input
                type="text"
                value={bmShortcut}
                onChange={(e) => setBmShortcut(e.target.value)}
                placeholder="Ctrl+M"
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-1.5 px-3 text-xs font-semibold text-white bg-[#3F51B5] hover:bg-[#303F9F] rounded-md"
              >
                {t.actions.save}
              </button>
              <button
                type="button"
                onClick={() => setShowBmForm(false)}
                className="py-1.5 px-3 text-xs text-slate-600 border border-slate-200 rounded-md"
              >
                {t.actions.cancel}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white border border-slate-200/90 rounded-lg shadow-[0_1px_4px_rgba(15,23,42,0.05)] overflow-x-auto">
          <table className="w-full text-xs text-start border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 px-4 text-start font-medium">
                  {lang === 'ar' ? 'الاسم' : lang === 'fr' ? 'Nom' : 'Name'}
                </th>
                <th className="py-3 px-4 text-start font-medium">
                  {lang === 'ar' ? 'المسار' : lang === 'fr' ? 'Lien' : 'URL / View'}
                </th>
                <th className="py-3 px-4 text-start font-medium">
                  {lang === 'ar' ? 'الاختصار' : lang === 'fr' ? 'Raccourci' : 'Shortcut'}
                </th>
                <th className="py-3 px-4 text-end font-medium">
                  {lang === 'ar' ? 'إجراءات' : lang === 'fr' ? 'Actions' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookmarks.map((bm) => (
                <tr key={bm.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-medium text-slate-800">{bm.name}</td>
                  <td className="py-2.5 px-4">
                    <button
                      type="button"
                      onClick={() => onNavigateToTab(bm.target)}
                      className="text-[#0088CC] hover:underline font-mono text-xs inline-flex items-center gap-1"
                      dir="ltr"
                    >
                      <span>#/{bm.target}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-500" dir="ltr">
                    {bm.shortcut}
                  </td>
                  <td className="py-2.5 px-4 text-end">
                    <button
                      type="button"
                      onClick={() =>
                        setBookmarks((prev) => prev.filter((item) => item.id !== bm.id))
                      }
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      aria-label={bm.name}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Executive KPI Strip */}
      <section aria-label={t.dashboard.kpiGross}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border border-slate-200 bg-white rounded-xl divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-200">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">{t.dashboard.kpiGross}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums font-mono" dir="ltr">
              {formatMoney(summary.grossRevenue, config.currency)}
            </p>
            <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
              {t.dashboard.kpiRoomsLabel} {summary.roomNet.toLocaleString()} ·{' '}
              {t.dashboard.kpiFbLabel} {summary.fbNet.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] font-mono text-blue-700 tabular-nums" dir="ltr">
              {(['EGP', 'USD', 'EUR'] as const)
                .filter((c) => c !== config.currency)
                .map((target) => {
                  const rates = getExchangeRates(config);
                  return formatMoney(
                    convertCurrency(summary.grossRevenue, config.currency, target, rates),
                    target
                  );
                })
                .join(' · ')}
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">{t.dashboard.kpiOutage}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums font-mono">
              {summary.outageEntriesCount} {t.dashboard.kpiOutageUnit}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => onNavigateToTab('ledger')}
                className="text-blue-700 hover:text-blue-900 font-medium underline underline-offset-4"
              >
                {t.actions.openLedger}
              </button>
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">{t.dashboard.kpiVariance}</p>
            <p
              className={`mt-2 text-2xl font-bold tabular-nums font-mono ${
                Math.abs(summary.totalVariance) <= config.cashVarianceTolerance
                  ? 'text-emerald-700'
                  : 'text-red-600'
              }`}
              dir="ltr"
            >
              {summary.totalVariance > 0 ? '+' : ''}
              {formatMoney(summary.totalVariance, config.currency)}
            </p>
            <p className="mt-1.5 text-xs text-slate-600 flex items-center gap-1.5">
              {Math.abs(summary.totalVariance) <= config.cashVarianceTolerance ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{t.dashboard.kpiVarianceOk}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{t.dashboard.kpiVarianceAlert}</span>
                </>
              )}
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">{t.dashboard.kpiExceptions}</p>
            <p
              className={`mt-2 text-2xl font-bold tabular-nums font-mono ${
                summary.exceptions.length === 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {summary.exceptions.length} {t.dashboard.kpiExceptionsUnit}
            </p>
            <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
              {t.dashboard.kpiTasksVerified}: {verifiedCount}/{tasks.length} · {flaggedCount}{' '}
              {t.dashboard.kpiTasksFlagged}
            </p>
          </div>
        </div>

        {/* Hotel Performance KPIs (Occ % · ADR · RevPAR · Package Split · Day Lock) */}
        {(() => {
          const totalRooms = config.totalAvailableRooms ?? 120;
          const occ = occupancyInputs ?? {
            roomsSold: 0,
            complimentaryRooms: 0,
            houseUseRooms: 0,
            outOfOrderRooms: 0,
          };
          const salableRooms = Math.max(1, totalRooms - occ.outOfOrderRooms);
          const occPct = Math.min(100, Number(((occ.roomsSold / salableRooms) * 100).toFixed(1)));
          const adr = occ.roomsSold > 0 ? summary.adjustedRoomNet / occ.roomsSold : 0;
          const revpar = salableRooms > 0 ? summary.adjustedRoomNet / salableRooms : 0;

          return (
            <div className="mt-3 px-5 py-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-5 tabular-nums font-mono" dir="ltr">
                <span>
                  <strong className="text-slate-500 font-sans font-medium">Occ %:</strong>{' '}
                  <span className="font-bold text-slate-900">{occPct}%</span>{' '}
                  <span className="text-slate-400">
                    ({occ.roomsSold}/{salableRooms})
                  </span>
                </span>
                <span>
                  <strong className="text-slate-500 font-sans font-medium">ADR:</strong>{' '}
                  <span className="font-bold text-slate-900">
                    {formatMoney(adr, config.currency)}
                  </span>
                </span>
                <span>
                  <strong className="text-slate-500 font-sans font-medium">RevPAR:</strong>{' '}
                  <span className="font-bold text-slate-900">
                    {formatMoney(revpar, config.currency)}
                  </span>
                </span>
                {summary.packageSplitTotal > 0 && (
                  <span>
                    <strong className="text-slate-500 font-sans font-medium">
                      Package Split:
                    </strong>{' '}
                    <span className="font-semibold text-blue-700">
                      Room {formatMoney(summary.adjustedRoomNet, config.currency)} · F&B{' '}
                      {formatMoney(summary.adjustedFbNet, config.currency)}
                    </span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTab('auditSuite')}
                className={`text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
                  dayLocked ? 'text-emerald-700' : 'text-blue-700 hover:text-blue-900'
                }`}
              >
                <span>
                  {dayLocked
                    ? lang === 'ar'
                      ? 'اليوم مقفل ومؤرشف'
                      : lang === 'fr'
                      ? 'Journée Clôturée'
                      : 'Business Date Locked'
                    : lang === 'ar'
                    ? 'إدارة الأرشيف وقفل اليوم ←'
                    : lang === 'fr'
                    ? 'Ouvrir Archives & Clôture →'
                    : 'Open Archive & Day Lock →'}
                </span>
              </button>
            </div>
          );
        })()}
      </section>

      {/* Financial Flow & Collection Mix Infographic */}
      <section
        aria-label={t.dashboard.infographicTitle}
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t.dashboard.infographicTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.dashboard.infographicSubtitle}</p>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums" dir="ltr">
            {config.businessDate} · {config.currency}
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Waterfall Flow Infographic */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-4">
            <p className="text-xs font-semibold text-slate-600">
              {t.dashboard.waterfallTitle}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-stretch">
              <div className="p-3.5 rounded-lg bg-[#F4F6FA] border border-slate-200 flex flex-col justify-between">
                <span className="text-[11px] font-medium text-slate-500">
                  {t.dashboard.grossTotalLabel}
                </span>
                <span
                  className="mt-2 text-sm font-bold font-mono tabular-nums text-slate-900"
                  dir="ltr"
                >
                  {formatMoney(summary.grossRevenue, config.currency)}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F4F6FA] border border-slate-200 flex flex-col justify-between relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">
                    {t.dashboard.taxesAndSvcLabel}
                  </span>
                  <FlowArrow className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </div>
                <span
                  className="mt-2 text-sm font-bold font-mono tabular-nums text-blue-700"
                  dir="ltr"
                >
                  -{formatMoney(summary.totalServiceCharge + summary.totalVat, config.currency)}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F4F6FA] border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">
                    {t.dashboard.rebatesLabel}
                  </span>
                  <FlowArrow className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </div>
                <span
                  className="mt-2 text-sm font-bold font-mono tabular-nums text-red-700"
                  dir="ltr"
                >
                  -{formatMoney(summary.totalRebates, config.currency)}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0F1E36] text-white flex flex-col justify-between">
                <span className="text-[11px] font-medium text-blue-200">
                  {t.dashboard.netRealizedLabel}
                </span>
                <span
                  className="mt-2 text-sm font-bold font-mono tabular-nums text-white"
                  dir="ltr"
                >
                  {formatMoney(summary.netRevenueAfterRebates, config.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Collection Mix Proportional Bar Infographic */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-3 border-t lg:border-t-0 lg:border-s border-slate-200 pt-4 lg:pt-0 lg:ps-6">
            <p className="text-xs font-semibold text-slate-600">
              {t.dashboard.collectionMixTitle}
            </p>

            {/* Stacked Visual Proportion Bar */}
            <div className="h-3.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
              {collectionMix.map(
                (item) =>
                  item.pct > 0 && (
                    <div
                      key={item.key}
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                      title={`${item.label}: ${item.pct}%`}
                    />
                  )
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {collectionMix.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    <span className="text-slate-600 truncate">{item.label}</span>
                  </div>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                    {item.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Revenue Distribution by Department (Recharts) */}
      <section
        aria-label={t.dashboard.deptChartTitle}
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-700 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t.dashboard.deptChartTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.dashboard.deptChartSubtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setMetricMode('netAmount')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  metricMode === 'netAmount'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.dashboard.netMode}
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('grossAmount')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  metricMode === 'grossAmount'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.dashboard.grossMode}
              </button>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  chartType === 'bar'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.dashboard.barMode}
              </button>
              <button
                type="button"
                onClick={() => setChartType('pie')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  chartType === 'pie'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.dashboard.pieMode}
              </button>
            </div>
          </div>
        </div>

        {departmentRevenueData.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-slate-900">
              {t.dashboard.emptyChartTitle}
            </p>
            <p className="text-xs text-slate-500 mt-1">{t.dashboard.emptyChartDesc}</p>
            <button
              type="button"
              onClick={() => onNavigateToTab('ledger')}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {t.actions.registerNew}
            </button>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart
                    data={departmentRevenueData}
                    margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fontSize: 12, fill: '#475569' }}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => v.toLocaleString('en-US')}
                    />
                    <Tooltip
                      cursor={{ fill: '#F8FAFC' }}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8F0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        direction: t.dir,
                        textAlign: t.dir === 'rtl' ? 'right' : 'left',
                      }}
                      formatter={(value) => [
                        formatMoney(Number(value ?? 0), config.currency),
                        metricMode === 'netAmount' ? t.dashboard.netMode : t.dashboard.grossMode,
                      ]}
                    />
                    <Bar dataKey={metricMode} radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {departmentRevenueData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={departmentRevenueData}
                      dataKey={metricMode}
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={102}
                      paddingAngle={2}
                    >
                      {departmentRevenueData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8F0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        direction: t.dir,
                        textAlign: t.dir === 'rtl' ? 'right' : 'left',
                      }}
                      formatter={(value) => [
                        formatMoney(Number(value ?? 0), config.currency),
                        metricMode === 'netAmount' ? t.dashboard.netMode : t.dashboard.grossMode,
                      ]}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-5">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 text-start font-semibold">{t.dashboard.colDept}</th>
                    <th className="py-2 text-center font-semibold">{t.dashboard.colCount}</th>
                    <th className="py-2 text-center font-semibold">{t.dashboard.colShare}</th>
                    <th className="py-2 text-end font-semibold">{t.dashboard.colAmount}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departmentRevenueData.map((item) => (
                    <tr key={item.key} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pe-2 flex items-center gap-2 text-slate-800 font-medium">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </td>
                      <td className="py-2.5 text-center font-mono tabular-nums text-slate-600">
                        {item.count}
                      </td>
                      <td className="py-2.5 text-center font-mono tabular-nums text-slate-700 font-medium">
                        {item.sharePct}%
                      </td>
                      <td
                        className="py-2.5 ps-2 text-end font-mono tabular-nums font-semibold text-slate-900"
                        dir="ltr"
                      >
                        {formatMoney(item[metricMode], config.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 7-Day Daily Revenue Trends Line Chart (Recharts) */}
      <section
        aria-label={
          lang === 'ar' ? 'اتجاه الإيرادات اليومية لآخر 7 أيام' : '7-Day Daily Revenue Trends'
        }
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0088CC] shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {lang === 'ar'
                  ? 'اتجاه الإيرادات اليومية لآخر 7 أيام (Daily Revenue Trends)'
                  : lang === 'fr'
                  ? 'Tendance des Revenus sur 7 Jours'
                  : '7-Day Daily Revenue Trends'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'ar'
                  ? 'مقارنة إجمالي الإيرادات وصافي الغرف والأغذية والمشروبات على مدار الأسبوع المنتهي بتاريخ اليوم المالي'
                  : lang === 'fr'
                  ? 'Évolution quotidienne du chiffre d’affaires brut, chambres et restauration'
                  : 'Daily Gross Revenue, Room Net, and F&B Net performance over the past 7 days'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-600 tabular-nums" dir="ltr">
            <span>
              7d Avg Gross:{' '}
              <strong className="text-slate-900">
                {formatMoney(
                  sevenDayTrendData.reduce((acc, d) => acc + d.grossRevenue, 0) / 7,
                  config.currency
                )}
              </strong>
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sevenDayTrendData}
                margin={{ top: 12, right: 20, left: 10, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="shortDate"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v.toLocaleString('en-US')}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    direction: t.dir,
                    textAlign: t.dir === 'rtl' ? 'right' : 'left',
                  }}
                  formatter={(value, name) => [
                    formatMoney(Number(value ?? 0), config.currency),
                    String(name),
                  ]}
                  labelFormatter={(label, payload) => {
                    const first = payload?.[0]?.payload as
                      | { date?: string; occupancyPct?: number }
                      | undefined;
                    return first?.date
                      ? `${first.date} · Occ ${first.occupancyPct ?? 0}%`
                      : String(label);
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="grossRevenue"
                  name={
                    lang === 'ar'
                      ? 'إجمالي الإيرادات (Gross)'
                      : lang === 'fr'
                      ? 'Revenu Brut'
                      : 'Gross Revenue'
                  }
                  stroke="#0F1E36"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0F1E36' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="roomNet"
                  name={
                    lang === 'ar'
                      ? 'صافي الغرف (Room Net)'
                      : lang === 'fr'
                      ? 'Hébergement Net'
                      : 'Room Net'
                  }
                  stroke="#0088CC"
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: '#0088CC' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="fbNet"
                  name={
                    lang === 'ar'
                      ? 'صافي الأغذية والمشروبات (F&B)'
                      : lang === 'fr'
                      ? 'Restauration Net'
                      : 'F&B Net'
                  }
                  stroke="#16A34A"
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: '#16A34A' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* D3 Heatmap: Room Revenue Density across Room Types & Floors */}
      <RoomRevenueHeatmap
        lang={lang}
        config={config}
        rooms={hotelRooms}
        folioItems={roomFolioItems}
      />

      {/* Main Split: Exceptions + Cash Settlement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t.dashboard.exceptionsTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.dashboard.exceptionsSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('settings')}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5" />
              {t.actions.adjustRules}
            </button>
          </div>

          {summary.exceptions.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {t.dashboard.noExceptionsTitle}
              </p>
              <p className="mt-1 text-xs text-slate-500">{t.dashboard.noExceptionsDesc}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {summary.exceptions.map((exc) => (
                <li
                  key={exc.id}
                  className="px-5 py-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/70"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {exc.severity === 'critical' ? (
                      <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span
                          className={`font-semibold ${
                            exc.severity === 'critical' ? 'text-red-700' : 'text-amber-700'
                          }`}
                        >
                          {exc.severity === 'critical'
                            ? t.dashboard.critical
                            : t.dashboard.warning}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{exc.category}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 mt-0.5">{exc.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{exc.detail}</p>
                    </div>
                  </div>
                  {typeof exc.amountImpact === 'number' && exc.amountImpact > 0 && (
                    <span
                      className="text-xs font-mono font-semibold text-slate-800 tabular-nums whitespace-nowrap shrink-0"
                      dir="ltr"
                    >
                      {formatMoney(exc.amountImpact, config.currency)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Cash & EDC Settlement Reconciliation */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t.dashboard.settlementTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.dashboard.settlementSubtitle}</p>
            </div>
            <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          <div className="p-5 space-y-4">
            <div className="pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>{t.dashboard.expectedCash}</span>
                <span className="font-mono font-semibold text-slate-800 tabular-nums" dir="ltr">
                  {formatMoney(summary.expectedCash, config.currency)}
                </span>
              </div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.dashboard.actualCashLabel}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.01"
                  value={settlement.actualCashDrop}
                  onChange={(e) =>
                    onUpdateSettlement({
                      ...settlement,
                      actualCashDrop: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  dir="ltr"
                />
                <span
                  className={`text-xs font-mono font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                    Math.abs(summary.cashVariance) <= config.cashVarianceTolerance
                      ? 'text-emerald-700'
                      : 'text-red-600'
                  }`}
                  dir="ltr"
                >
                  {summary.cashVariance > 0 ? '+' : ''}
                  {summary.cashVariance.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>{t.dashboard.expectedCard}</span>
                <span className="font-mono font-semibold text-slate-800 tabular-nums" dir="ltr">
                  {formatMoney(summary.expectedCreditCard, config.currency)}
                </span>
              </div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.dashboard.actualCardLabel}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.01"
                  value={settlement.actualEdcBatch}
                  onChange={(e) =>
                    onUpdateSettlement({
                      ...settlement,
                      actualEdcBatch: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  dir="ltr"
                />
                <span
                  className={`text-xs font-mono font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                    Math.abs(summary.edcVariance) <= 1 ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                  dir="ltr"
                >
                  {summary.edcVariance > 0 ? '+' : ''}
                  {summary.edcVariance.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>{t.dashboard.expectedCityLedger}</span>
                <span className="font-mono font-semibold text-slate-800 tabular-nums" dir="ltr">
                  {formatMoney(summary.expectedCityLedger, config.currency)}
                </span>
              </div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.dashboard.actualCityLedgerLabel}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.01"
                  value={settlement.actualCityLedgerSigned}
                  onChange={(e) =>
                    onUpdateSettlement({
                      ...settlement,
                      actualCityLedgerSigned: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  dir="ltr"
                />
                <span
                  className={`text-xs font-mono font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                    Math.abs(summary.cityLedgerVariance) <= 1
                      ? 'text-emerald-700'
                      : 'text-red-600'
                  }`}
                  dir="ltr"
                >
                  {summary.cityLedgerVariance > 0 ? '+' : ''}
                  {summary.cityLedgerVariance.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
              <span>{t.dashboard.roomChargeTransfers}</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums" dir="ltr">
                {formatMoney(summary.roomChargeTransfers, config.currency)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Housekeeping Discrepancies & Income Auditor Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-blue-700" />
              <h2 className="text-base font-semibold text-slate-900">
                {t.dashboard.checklistTitle}
              </h2>
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              {verifiedCount} / {tasks.length} {t.dashboard.completedLabel}
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {tasks.map((task) => (
              <div key={task.id} className="px-5 py-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {lang === 'ar' ? task.titleAr : task.titleEn}
                    </p>
                    {lang === 'ar' && (
                      <p className="text-xs text-slate-500">{task.descriptionAr}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateTask(task.id, 'verified')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        task.status === 'verified'
                          ? 'bg-emerald-700 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.dashboard.statusVerified}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateTask(task.id, 'flagged')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        task.status === 'flagged'
                          ? 'bg-red-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.dashboard.statusFlagged}
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateTask(task.id, 'pending')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        task.status === 'pending'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.dashboard.statusPending}
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={task.notes}
                  onChange={(e) => onUpdateTask(task.id, task.status, e.target.value)}
                  placeholder={t.dashboard.notePlaceholder}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t.dashboard.hkTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.dashboard.hkSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowDiscForm((v) => !v)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.actions.addRoom}
            </button>
          </div>

          {showDiscForm && (
            <form
              onSubmit={handleCreateDiscrepancy}
              className="p-4 bg-slate-50 border-b border-slate-200 space-y-3"
            >
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {t.dashboard.roomNumber}
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    placeholder="309"
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {t.dashboard.foStatus}
                  </label>
                  <select
                    value={newFoStatus}
                    onChange={(e) =>
                      setNewFoStatus(e.target.value as 'Occupied' | 'Vacant' | 'DueOut')
                    }
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Vacant">Vacant</option>
                    <option value="Occupied">Occupied</option>
                    <option value="DueOut">DueOut</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {t.dashboard.hkStatus}
                  </label>
                  <select
                    value={newHkStatus}
                    onChange={(e) =>
                      setNewHkStatus(
                        e.target.value as
                          | 'Occupied'
                          | 'VacantClean'
                          | 'VacantDirty'
                          | 'SleepOut'
                      )
                    }
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Occupied">Occupied</option>
                    <option value="VacantClean">VacantClean</option>
                    <option value="VacantDirty">VacantDirty</option>
                    <option value="SleepOut">SleepOut</option>
                  </select>
                </div>
              </div>
              <input
                type="text"
                value={newDiscNote}
                onChange={(e) => setNewDiscNote(e.target.value)}
                placeholder={t.dashboard.hkNotePlaceholder}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiscForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  {t.actions.cancel}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {t.dashboard.saveDiscrepancy}
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-200">
            {discrepancies.map((d) => (
              <div key={d.id} className="px-5 py-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-bold text-slate-900">
                      {t.dashboard.roomNumber} {d.roomNumber}
                    </span>
                    <span className="text-xs text-slate-500">
                      FO: {d.frontOfficeStatus} / HK: {d.housekeepingStatus}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleDiscrepancyResolved(d.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                      d.resolved
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    {d.resolved ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t.dashboard.hkResolved}
                      </>
                    ) : (
                      <>
                        <Flag className="w-3.5 h-3.5" />
                        {t.dashboard.hkOpen}
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-600">{d.note}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
