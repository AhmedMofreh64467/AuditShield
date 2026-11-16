import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BedDouble,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  History,
  Lock,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import { LanguageCode } from '../i18n/translations';
import {
  AuditExceptionResolution,
  AuditSummary,
  AuditTask,
  AuditTrailEntry,
  BanquetBeoRecord,
  CashierShiftRecord,
  CashSettlement,
  CityLedgerRecord,
  DailyArchiveRecord,
  EdcTerminalRecord,
  ExceptionInvestigationStatus,
  HistoryPeriodMode,
  HotelConfig,
  HotelRoom,
  KwentraSnapshot,
  LedgerEntry,
  OtaAuditRecord,
  RoomDiscrepancy,
  RoomFolioItem,
  RoomRackStatus,
  RoomReservation,
  UnifiedAuditException,
} from '../types/audit';
import { downloadTextFile, formatMoney } from '../utils/auditEngine';
import { exportReportExcelXls, ReportExportPayload } from '../utils/reportExporter';
import {
  buildConsolidatedFinancialStatement,
  buildMissingRoomFolioBatch,
  buildUnifiedExceptionCenter,
  computeAllRoomsRevenueReport,
  computeRoomFinancialHistory,
  evaluateNightAuditReadiness,
} from '../utils/roomRevenueEngine';

interface DailyIncomeAuditProps {
  lang: LanguageCode;
  config: HotelConfig;
  rooms: HotelRoom[];
  reservations: RoomReservation[];
  folioItems: RoomFolioItem[];
  entries: LedgerEntry[];
  summary: AuditSummary;
  settlement: CashSettlement;
  tasks: AuditTask[];
  discrepancies: RoomDiscrepancy[];
  edcTerminals: EdcTerminalRecord[];
  cashierShifts: CashierShiftRecord[];
  otaBookings: OtaAuditRecord[];
  cityLedgerItems: CityLedgerRecord[];
  banquetEvents: BanquetBeoRecord[];
  dailyArchive: DailyArchiveRecord[];
  auditTrail: AuditTrailEntry[];
  kwentraSnapshot: KwentraSnapshot;
  exceptionResolutions: Record<string, AuditExceptionResolution>;
  nightAuditChecks: Record<string, boolean>;
  dayLocked: boolean;
  currentAuditor: string;
  onSaveExceptionResolution: (res: AuditExceptionResolution) => void;
  onToggleNightAuditCheck: (checkId: string) => void;
  onToggleDayLock: () => void;
  onOpenRoomProfile?: (roomId: string) => void;
  onBatchPostMissingRoomCharges?: (items: RoomFolioItem[]) => void;
}

type AuditSubTab = 'roomEngine' | 'workflow' | 'exceptions' | 'nightAudit';

const STATUS_BADGE_CLS: Record<string, string> = {
  Matched: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Approved: 'bg-sky-50 text-[#0088CC] border-sky-200',
  Variance: 'bg-amber-50 text-amber-800 border-amber-200',
  Exception: 'bg-red-50 text-red-800 border-red-200',
};

export const DailyIncomeAudit: React.FC<DailyIncomeAuditProps> = ({
  lang,
  config,
  rooms,
  reservations,
  folioItems,
  entries,
  summary,
  settlement,
  tasks,
  discrepancies,
  edcTerminals,
  cashierShifts,
  otaBookings,
  cityLedgerItems,
  banquetEvents,
  dailyArchive,
  auditTrail,
  kwentraSnapshot,
  exceptionResolutions,
  nightAuditChecks,
  dayLocked,
  currentAuditor,
  onSaveExceptionResolution,
  onToggleNightAuditCheck,
  onToggleDayLock,
  onOpenRoomProfile,
  onBatchPostMissingRoomCharges,
}) => {
  const isAr = lang === 'ar';
  const [subTab, setSubTab] = useState<AuditSubTab>('roomEngine');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VARIANCES' | RoomRackStatus>('ALL');
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);

  // Exception Center filters & inline note editing
  const [excFilter, setExcFilter] = useState<'ALL' | 'OPEN' | 'CRITICAL' | 'CLOSED'>('ALL');
  const [editingExcId, setEditingExcId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const [draftStatus, setDraftStatus] = useState<ExceptionInvestigationStatus>('Approved');

  // Historical Room Analysis controls
  const [selectedHistoryRoomId, setSelectedHistoryRoomId] = useState<string>(rooms[0]?.id ?? '');
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriodMode>('Daily');

  const { records: roomRecords, totals } = useMemo(
    () =>
      computeAllRoomsRevenueReport(
        rooms,
        reservations,
        folioItems,
        entries,
        config,
        config.businessDate,
        exceptionResolutions
      ),
    [rooms, reservations, folioItems, entries, config, exceptionResolutions]
  );

  const consolidated = useMemo(
    () =>
      buildConsolidatedFinancialStatement(
        entries,
        roomRecords,
        cityLedgerItems,
        banquetEvents,
        summary,
        settlement,
        config
      ),
    [entries, roomRecords, cityLedgerItems, banquetEvents, summary, settlement, config]
  );

  const unifiedExceptions = useMemo(
    () =>
      buildUnifiedExceptionCenter(
        roomRecords,
        summary,
        discrepancies,
        otaBookings,
        cityLedgerItems,
        exceptionResolutions,
        config,
        lang
      ),
    [
      roomRecords,
      summary,
      discrepancies,
      otaBookings,
      cityLedgerItems,
      exceptionResolutions,
      config,
      lang,
    ]
  );

  const nightReadiness = useMemo(
    () =>
      evaluateNightAuditReadiness({
        roomRecords,
        summary,
        discrepancies,
        tasks,
        edcTerminals,
        cashierShifts,
        otaBookings,
        cityLedgerItems,
        banquetEvents,
        unifiedExceptions,
        kwentraSnapshot,
        manualChecks: nightAuditChecks,
        config,
      }),
    [
      roomRecords,
      summary,
      discrepancies,
      tasks,
      edcTerminals,
      cashierShifts,
      otaBookings,
      cityLedgerItems,
      banquetEvents,
      unifiedExceptions,
      kwentraSnapshot,
      nightAuditChecks,
      config,
    ]
  );

  const missingRoomCandidates = useMemo(
    () => buildMissingRoomFolioBatch(roomRecords, reservations, config, config.businessDate),
    [roomRecords, reservations, config]
  );

  const missingRoomTotalExpected = useMemo(
    () => missingRoomCandidates.reduce((acc, c) => acc + c.expectedAmountBase, 0),
    [missingRoomCandidates]
  );

  const handleExportNightAuditDossier = () => {
    const dossier = {
      schemaVersion: 'AuditShield-NightAudit-v1',
      hotelName: config.hotelName,
      businessDate: config.businessDate,
      currency: config.currency,
      exportedAt: new Date().toISOString(),
      dayLocked,
      auditor: currentAuditor,
      roomTotals: totals,
      roomRecords,
      consolidatedStatement: consolidated,
      unifiedExceptions,
      nightAuditReadiness: nightReadiness,
    };
    downloadTextFile(
      `NightAudit_Dossier_${config.businessDate}.json`,
      JSON.stringify(dossier, null, 2),
      false
    );
  };

  const filteredRoomRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roomRecords.filter((rec) => {
      if (statusFilter === 'VARIANCES') {
        if (rec.auditStatus !== 'Exception' && rec.auditStatus !== 'Variance') return false;
      } else if (statusFilter !== 'ALL' && rec.roomStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        rec.roomNumber.toLowerCase().includes(q) ||
        rec.guestName.toLowerCase().includes(q) ||
        rec.reservationNumber.toLowerCase().includes(q) ||
        rec.roomType.toLowerCase().includes(q)
      );
    });
  }, [roomRecords, statusFilter, searchQuery]);

  const filteredExceptions = useMemo(() => {
    return unifiedExceptions.filter((exc) => {
      if (excFilter === 'OPEN') {
        return (
          exc.investigationStatus === 'Open' ||
          exc.investigationStatus === 'Investigating' ||
          exc.investigationStatus === 'Escalated'
        );
      }
      if (excFilter === 'CRITICAL') return exc.severity === 'critical';
      if (excFilter === 'CLOSED') {
        return exc.investigationStatus === 'Approved' || exc.investigationStatus === 'Resolved';
      }
      return true;
    });
  }, [unifiedExceptions, excFilter]);

  const activeHistoryRoom = useMemo(
    () => rooms.find((r) => r.id === selectedHistoryRoomId) ?? rooms[0],
    [rooms, selectedHistoryRoomId]
  );

  const historyAnalysis = useMemo(() => {
    if (!activeHistoryRoom) return null;
    return computeRoomFinancialHistory(
      activeHistoryRoom,
      reservations,
      folioItems,
      entries,
      dailyArchive,
      auditTrail,
      config,
      historyPeriod
    );
  }, [activeHistoryRoom, reservations, folioItems, entries, dailyArchive, auditTrail, config, historyPeriod]);

  const handleExportRoomReportExcel = () => {
    const payload: ReportExportPayload = {
      title: `Daily Room Revenue Report — ${config.hotelName}`,
      subtitle: `Business Date ${config.businessDate} (${config.currency})`,
      dir: isAr ? 'rtl' : 'ltr',
      metadata: {
        'Business Date': config.businessDate,
        'Occupied Rooms': totals.occupiedRooms,
        'Rooms Sold': totals.roomsSold,
        'Total Room Revenue': formatMoney(totals.totalRoomRevenue, config.currency),
        'Total Package Allocation': formatMoney(totals.totalPackageAllocation, config.currency),
        'Total Gross Charges': formatMoney(totals.totalGrossCharges, config.currency),
      },
      columns: [
        'Room Number',
        'Room Status',
        'Guest Name',
        'Reservation Number',
        'Room Type',
        'Rate Plan',
        'Meal Plan',
        'Contracted Rate',
        'Posted Rate',
        'Room Revenue',
        'F&B Package Allocation',
        'Extra Charges',
        'Discounts',
        'Net Revenue',
        'Service Charge',
        'VAT',
        'City Tax',
        'Gross Charges',
        'Variance',
        'Audit Status',
      ],
      rows: filteredRoomRecords.map((r) => [
        r.roomNumber,
        r.roomStatus,
        r.guestName,
        r.reservationNumber,
        r.roomType,
        r.ratePlan,
        r.mealPlan,
        r.contractedRate.toFixed(2),
        r.actualPostedRate.toFixed(2),
        r.roomRevenueNet.toFixed(2),
        r.packageAllocation.toFixed(2),
        r.extraCharges.toFixed(2),
        r.discount.toFixed(2),
        r.netRevenue.toFixed(2),
        r.serviceCharge.toFixed(2),
        r.vatAmount.toFixed(2),
        r.cityTaxAmount.toFixed(2),
        r.grossFolioCharge.toFixed(2),
        r.varianceAmount.toFixed(2),
        r.auditStatus,
      ]),
    };
    exportReportExcelXls(`Daily_Room_Revenue_${config.businessDate}`, payload);
  };

  const openInlineResolution = (exc: UnifiedAuditException) => {
    setEditingExcId(exc.exceptionId);
    setDraftNote(exc.resolution || '');
    setDraftStatus(
      exc.investigationStatus === 'Open' ? 'Approved' : exc.investigationStatus
    );
  };

  const submitInlineResolution = (excId: string) => {
    onSaveExceptionResolution({
      exceptionId: excId,
      status: draftStatus,
      reviewer: currentAuditor,
      resolutionNote: draftNote.trim() || (isAr ? 'تمت المراجعة والاعتماد' : 'Reviewed and approved by auditor'),
      updatedAt: new Date().toISOString(),
    });
    setEditingExcId(null);
  };

  const openExcCount = unifiedExceptions.filter(
    (e) => e.investigationStatus === 'Open' || e.investigationStatus === 'Investigating'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Banner & Sub-navigation */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-[#0088CC]" />
              <h1 className="text-lg font-bold text-[#0F1E36]">
                {isAr
                  ? 'محرك إيرادات الغرف والمراجعة اليومية المتكاملة'
                  : 'Daily Income Audit & Room Revenue Engine'}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isAr
                ? `${config.hotelName} · تاريخ العمل: ${config.businessDate} · التحقق الفردي لكل غرفة، فصل الباقات، التوحيد المالي، وجاهزية الإغلاق الليلي`
                : `${config.hotelName} · Business Date ${config.businessDate} · Per-Room Revenue, Rate Verification, Package Split & Night Audit Control`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              type="button"
              onClick={handleExportNightAuditDossier}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0088CC] hover:bg-[#0070AA] rounded-lg flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {isAr ? 'حزمة الإغلاق (.json)' : 'Closing Dossier (.json)'}
            </button>
            <button
              type="button"
              onClick={handleExportRoomReportExcel}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {isAr ? 'تصدير Excel (.xls)' : 'Export Excel (.xls)'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold text-[#0F1E36] border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              {isAr ? 'طباعة / PDF' : 'Print / PDF'}
            </button>
          </div>
        </div>

        {/* 4 Module Sub-Tabs */}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 no-print">
          {(
            [
              {
                id: 'roomEngine' as AuditSubTab,
                label: isAr ? '1. محرك وتقرير إيراد الغرف' : '1. Room Revenue Engine & Report',
                icon: BedDouble,
                badge: `${totals.roomsSold}/${totals.totalRooms}`,
              },
              {
                id: 'workflow' as AuditSubTab,
                label: isAr ? '2. مراحل التدقيق والقائمة الموحدة' : '2. 5-Stage Audit & Consolidation',
                icon: BarChart3,
              },
              {
                id: 'exceptions' as AuditSubTab,
                label: isAr ? '3. مركز استثناءات المراجعة' : '3. Exception Center',
                icon: ShieldAlert,
                badge: openExcCount > 0 ? String(openExcCount) : undefined,
              },
              {
                id: 'nightAudit' as AuditSubTab,
                label: isAr ? '4. جاهزية الإغلاق وتاريخ الغرف' : '4. Night Audit & Room History',
                icon: ClipboardCheck,
                badge: `${nightReadiness.scorePct}%`,
              },
            ] as {
              id: AuditSubTab;
              label: string;
              icon: typeof BedDouble;
              badge?: string;
            }[]
          ).map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg border flex items-center gap-2 transition-colors ${
                  active
                    ? 'bg-[#0088CC] text-white border-[#0088CC]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                      active ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ==================== TAB 1: DAILY ROOM REVENUE ENGINE & 20-COLUMN REPORT ==================== */}
      {subTab === 'roomEngine' && (
        <div className="space-y-5">
          {/* Summary Totals Grid (Module 4 Required Totals) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              {
                label: isAr ? 'المشغولة / المباعة' : 'Occupied / Sold',
                val: `${totals.occupiedRooms} / ${totals.roomsSold}`,
                sub: `${isAr ? 'متاح:' : 'Avail:'} ${totals.availableRooms}`,
              },
              {
                label: isAr ? 'مجانية / استخدام داخلي / OOO' : 'Comp / House / OOO',
                val: `${totals.complimentaryRooms} / ${totals.houseUseRooms} / ${totals.outOfOrderRooms}`,
                sub: `${isAr ? 'الإجمالي:' : 'Total:'} ${totals.totalRooms}`,
              },
              {
                label: isAr ? 'صافي إيراد الغرف' : 'Total Room Revenue',
                val: formatMoney(totals.totalRoomRevenue, config.currency),
                sub: `${isAr ? 'الخصومات:' : 'Disc:'} ${formatMoney(totals.totalDiscounts, config.currency)}`,
              },
              {
                label: isAr ? 'توزيع الباقات F&B' : 'Package Allocation',
                val: formatMoney(totals.totalPackageAllocation, config.currency),
                sub: `${isAr ? 'رسوم إضافية:' : 'Extras:'} ${formatMoney(totals.totalExtraCharges, config.currency)}`,
              },
              {
                label: isAr ? 'الضرائب والخدمة' : 'Total Taxes & SVC',
                val: formatMoney(totals.totalTaxes, config.currency),
                sub: `SVC ${config.serviceChargePct}% · VAT ${config.vatPct}%`,
              },
              {
                label: isAr ? 'الإجمالي الشامل (Gross)' : 'Total Gross Charges',
                val: formatMoney(totals.totalGrossCharges, config.currency),
                sub: `${totals.exceptionRoomsCount} ${isAr ? 'غرف بها فروقات' : 'rooms flagged'}`,
                highlight: totals.exceptionRoomsCount > 0,
              },
            ].map((kpi, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border bg-white ${
                  kpi.highlight ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
                }`}
              >
                <p className="text-[11px] font-medium text-slate-500">{kpi.label}</p>
                <p className="text-sm font-bold font-mono tabular-nums text-[#0F1E36] mt-1" dir="ltr">
                  {kpi.val}
                </p>
                <p className="text-[10px] font-mono text-slate-500 mt-1" dir="ltr">
                  {kpi.sub}
                </p>
              </div>
            ))}
          </div>

          {missingRoomCandidates.length > 0 && onBatchPostMissingRoomCharges && (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-start gap-2.5 text-xs text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {isAr
                      ? `تنبيه الإغلاق الليلي: ${missingRoomCandidates.length} غرفة مشغولة لم يُرحّل لها أجر الليلة اليوم (${config.businessDate})`
                      : `Night Audit Posting Alert: ${missingRoomCandidates.length} active room(s) missing daily room charge for ${config.businessDate}`}
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5 font-mono" dir="ltr">
                    Rooms: {missingRoomCandidates.map((c) => `#${c.roomNumber}`).join(', ')} · Expected:{' '}
                    {formatMoney(missingRoomTotalExpected, config.currency)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={dayLocked}
                onClick={() =>
                  onBatchPostMissingRoomCharges(missingRoomCandidates.map((c) => c.folioItem))
                }
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0F1E36] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shrink-0"
              >
                {isAr
                  ? `ترحيل أجر الليلة للغرف الناقصة (${missingRoomCandidates.length})`
                  : `Auto-Post Missing Nights (${missingRoomCandidates.length})`}
              </button>
            </div>
          )}

          {/* Search & Filter Controls */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ['ALL', isAr ? 'الكل' : 'All Rooms'],
                    ['VARIANCES', isAr ? 'الفروقات والاستثناءات فقط' : 'Variances & Exceptions'],
                    ['Occupied', 'Occupied'],
                    ['Complimentary', 'Complimentary'],
                    ['HouseUse', 'House Use'],
                    ['VacantClean', 'Vacant Clean'],
                    ['OutOfOrder', 'OOO'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                      statusFilter === key
                        ? 'bg-[#0F1E36] text-white border-[#0F1E36]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث برقم الغرفة أو النزيل أو الحجز...' : 'Search room, guest, res #...'}
                  className="w-full ps-8 pe-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0088CC]"
                />
              </div>
            </div>

            {/* 20-Column Daily Room Revenue Report Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-start border-collapse">
                <thead className="bg-[#0F1E36] text-white">
                  <tr>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Room #</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Status</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Guest Name</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Res #</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Type / Chg</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Rate Plan</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Meal</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Contracted</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Posted</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Room Rev</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Pkg Split</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Extras</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Discounts</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Net Rev</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">SVC</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">VAT</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">City Tax</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Gross</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Variance</th>
                    <th className="py-2.5 px-2.5 whitespace-nowrap">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRoomRecords.map((rec) => {
                    const isExpanded = expandedRoomId === rec.roomId;
                    const excId = `exc-room-${rec.roomId}-${rec.businessDate}`;
                    return (
                      <React.Fragment key={rec.roomId}>
                        <tr
                          onClick={() =>
                            setExpandedRoomId((prev) => (prev === rec.roomId ? null : rec.roomId))
                          }
                          className={`cursor-pointer hover:bg-sky-50/50 transition-colors ${
                            rec.auditStatus === 'Exception'
                              ? 'bg-red-50/30'
                              : rec.auditStatus === 'Variance'
                              ? 'bg-amber-50/30'
                              : ''
                          }`}
                        >
                          <td className="py-2 px-2.5 font-mono font-bold text-[#0F1E36] whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 text-[#0088CC]" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-slate-400" />
                              )}
                              {rec.roomNumber}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 whitespace-nowrap">
                            <span className="font-medium text-slate-800">{rec.roomStatus}</span>
                            <span className="block text-[10px] text-slate-500">{rec.stayPhase}</span>
                          </td>
                          <td className="py-2 px-2.5 font-medium text-slate-900 max-w-[140px] truncate">
                            {rec.guestName}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-slate-600 whitespace-nowrap" dir="ltr">
                            {rec.reservationNumber}
                          </td>
                          <td className="py-2 px-2.5 whitespace-nowrap text-slate-700">
                            {rec.roomType}
                            {rec.flags.roomUpgrade && (
                              <span className="block text-[10px] text-[#0088CC]">
                                Chg: {rec.chargedRoomType}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-slate-700 whitespace-nowrap" dir="ltr">
                            {rec.rateCode}
                          </td>
                          <td className="py-2 px-2.5 font-mono font-semibold text-slate-800">
                            {rec.mealPlan}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums text-slate-700" dir="ltr">
                            {rec.contractedRate.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums font-semibold text-slate-900" dir="ltr">
                            {rec.actualPostedRate.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums text-slate-900" dir="ltr">
                            {rec.roomRevenueNet.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums text-indigo-700" dir="ltr">
                            {rec.packageAllocation.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums text-slate-700" dir="ltr">
                            {rec.extraCharges.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums text-rose-700" dir="ltr">
                            {rec.discount.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums font-semibold text-slate-900" dir="ltr">
                            {rec.netRevenue.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums text-slate-600" dir="ltr">
                            {rec.serviceCharge.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums text-slate-600" dir="ltr">
                            {rec.vatAmount.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums text-slate-600" dir="ltr">
                            {rec.cityTaxAmount.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums font-bold text-[#0F1E36]" dir="ltr">
                            {rec.grossFolioCharge.toFixed(2)}
                          </td>
                          <td
                            className={`py-2 px-2.5 font-mono tabular-nums font-semibold ${
                              Math.abs(rec.varianceAmount) > 0.5 ? 'text-red-700' : 'text-emerald-700'
                            }`}
                            dir="ltr"
                          >
                            {rec.varianceAmount > 0 ? `+${rec.varianceAmount.toFixed(2)}` : rec.varianceAmount.toFixed(2)}
                            {Math.abs(rec.variancePct) > 0 && (
                              <span className="block text-[9px]">({rec.variancePct}%)</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
                                STATUS_BADGE_CLS[rec.auditStatus]
                              }`}
                            >
                              {rec.auditStatus}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Per-Room Audit Drawer (Modules 1, 2, 3 Verification) */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90">
                            <td colSpan={20} className="p-4">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {/* 5-Rate Comparison */}
                                <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2">
                                  <p className="text-xs font-bold text-[#0F1E36]">
                                    {isAr ? 'مقارنة مستويات السعر (5 مستويات)' : '5-Level Room Rate Verification'}
                                  </p>
                                  <div className="space-y-1 text-[11px] font-mono">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">1. Contracted Rate:</span>
                                      <span>{formatMoney(rec.verification.contractedRateBase, config.currency)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">2. Approved Res Rate:</span>
                                      <span>{formatMoney(rec.verification.approvedReservationRateBase, config.currency)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">3. PMS Posted Rate:</span>
                                      <span>{formatMoney(rec.verification.pmsPostedRateBase, config.currency)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">4. AuditShield Expected:</span>
                                      <span className="font-semibold text-[#0088CC]">
                                        {formatMoney(rec.verification.auditShieldExpectedRateBase, config.currency)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-100 pt-1">
                                      <span className="text-slate-700 font-bold">5. Actual Daily Charge:</span>
                                      <span className="font-bold">
                                        {formatMoney(rec.verification.actualDailyRoomChargeBase, config.currency)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Package Split Engine Breakdown (Module 3) */}
                                <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2">
                                  <p className="text-xs font-bold text-[#0F1E36]">
                                    {isAr
                                      ? `تفكيك باقة الوجبات (${rec.mealPlan})`
                                      : `Package Split Breakdown (${rec.mealPlan})`}
                                  </p>
                                  <div className="space-y-1 text-[11px] font-mono">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Original Package Value:</span>
                                      <span className="font-semibold">
                                        {formatMoney(rec.packageBreakdown.originalPackageValue, config.currency)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Accommodation Net:</span>
                                      <span className="text-emerald-700 font-semibold">
                                        {formatMoney(rec.packageBreakdown.accommodationRevenue, config.currency)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Breakfast / Lunch / Dinner:</span>
                                      <span>
                                        {rec.packageBreakdown.breakfastRevenue.toFixed(0)} /{' '}
                                        {rec.packageBreakdown.lunchRevenue.toFixed(0)} /{' '}
                                        {rec.packageBreakdown.dinnerRevenue.toFixed(0)}
                                      </span>
                                    </div>
                                    {(rec.mealPlan === 'AI' || rec.packageBreakdown.beverageRevenue > 0) && (
                                      <div className="flex justify-between">
                                        <span className="text-slate-500">AI Beverages & Snacks:</span>
                                        <span className="text-indigo-700 font-semibold">
                                          {formatMoney(rec.packageBreakdown.beverageRevenue, config.currency)}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Other Included Services:</span>
                                      <span>{formatMoney(rec.packageBreakdown.otherIncludedServices, config.currency)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-100 pt-1">
                                      <span className="text-slate-700">Folio W1 / W2 / Deposits:</span>
                                      <span>
                                        {rec.folioWindow1Net.toFixed(0)} / {rec.folioWindow2Net.toFixed(0)} / Dep{' '}
                                        {rec.depositsCollected.toFixed(0)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Anomalies & Inline Actions */}
                                <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-bold text-[#0F1E36]">
                                      {isAr ? 'ملاحظات وحالة تدقيق الغرفة' : 'Detected Anomalies & Flags'}
                                    </p>
                                    {onOpenRoomProfile && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenRoomProfile(rec.roomId);
                                        }}
                                        className="px-2.5 py-1 text-[11px] font-semibold bg-[#0088CC] text-white rounded hover:bg-[#0070AA]"
                                      >
                                        {isAr ? 'فتح ملف الغرفة' : 'Open Room Folio'}
                                      </button>
                                    )}
                                  </div>

                                  {rec.verification.anomalies.length === 0 ? (
                                    <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-4 h-4" />
                                      {isAr
                                        ? 'لا توجد فروقات أو ملاحظات تدقيق على هذه الغرفة.'
                                        : 'No rate or posting anomalies detected.'}
                                    </p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {rec.verification.anomalies.map((an, aIdx) => (
                                        <div
                                          key={aIdx}
                                          className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px]"
                                        >
                                          <p className="font-semibold text-amber-900">
                                            {isAr ? an.labelAr : an.labelEn}
                                          </p>
                                          <p className="text-slate-600">{an.detail}</p>
                                        </div>
                                      ))}
                                      <div className="flex flex-wrap items-center gap-2 pt-1">
                                        {(() => {
                                          const singleCand = missingRoomCandidates.find(
                                            (c) => c.roomId === rec.roomId
                                          );
                                          if (!singleCand || !onBatchPostMissingRoomCharges) return null;
                                          return (
                                            <button
                                              type="button"
                                              disabled={dayLocked}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onBatchPostMissingRoomCharges([singleCand.folioItem]);
                                              }}
                                              className="px-3 py-1.5 text-[11px] font-semibold bg-[#0F1E36] hover:bg-slate-800 disabled:opacity-50 text-white rounded"
                                            >
                                              {isAr ? 'ترحيل أجر الليلة الآن' : 'Post Nightly Charge Now'}
                                            </button>
                                          );
                                        })()}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onSaveExceptionResolution({
                                              exceptionId: excId,
                                              status: 'Approved',
                                              reviewer: currentAuditor,
                                              resolutionNote: isAr
                                                ? `اعتماد فرق غرفة ${rec.roomNumber} بعد مراجعة العقد والـ Folio`
                                                : `Approved room ${rec.roomNumber} variance after contract & folio check`,
                                              updatedAt: new Date().toISOString(),
                                            });
                                          }}
                                          className="px-3 py-1.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded"
                                        >
                                          {isAr ? 'اعتماد الاستثناء مع المبرر' : 'Approve Room Exception'}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: 5-STAGE WORKFLOW & CONSOLIDATED INCOME STATEMENT ==================== */}
      {subTab === 'workflow' && (
        <div className="space-y-6">
          {/* 5-Stage Daily Income Audit Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              {
                stage: 'A',
                title: isAr ? 'أ. تدقيق الاستقبال (FO)' : 'A. Front Office Audit',
                metric: `${totals.occupiedRooms} Occ · ${totals.exceptionRoomsCount} Flags`,
                ok: totals.exceptionRoomsCount === 0 && discrepancies.every((d) => d.resolved),
                detail: isAr
                  ? 'أسعار الغرف، التضارب، المجاني والـ House Use'
                  : 'Room rates, HK discrepancy, comp & house use',
              },
              {
                stage: 'B',
                title: isAr ? 'ب. تدقيق المنافذ (POS)' : 'B. POS Audit',
                metric: `${summary.missingCheckNumbers.length} Missing Checks`,
                ok: summary.missingCheckNumbers.length === 0,
                detail: isAr
                  ? 'تسلسل الشيكات، ترحيلات الغرف، الحفلات BEO'
                  : 'Check sequence, room charge transfers, BEOs',
              },
              {
                stage: 'C',
                title: isAr ? 'ج. تدقيق الخزينة (Cashier)' : 'C. Cashier Audit',
                metric: `Var: ${formatMoney(summary.totalVariance, config.currency)}`,
                ok: Math.abs(summary.cashVariance) <= config.cashVarianceTolerance && Math.abs(summary.edcVariance) <= 1,
                detail: isAr
                  ? 'جرد النقدية، دفعات EDC، المصروفات النثرية'
                  : 'Cash drop, EDC batches, paid outs & shifts',
              },
              {
                stage: 'D',
                title: isAr ? 'د. التدقيق المالي' : 'D. Financial Audit',
                metric: `${summary.duplicateEntryIds.length} Dups`,
                ok: summary.duplicateEntryIds.length === 0,
                detail: isAr
                  ? 'فصل الباقات، الضرائب، الخصومات والعملات'
                  : 'Package splits, tax accuracy, rebates & FX',
              },
              {
                stage: 'E',
                title: isAr ? 'هـ. الذمم والتحصيل' : 'E. Receivables Audit',
                metric: `${otaBookings.filter((o) => !o.verified).length} OTA · ${cityLedgerItems.filter((c) => !c.signedFolioAttached).length} AR`,
                ok: otaBookings.every((o) => o.verified) && cityLedgerItems.every((c) => c.signedFolioAttached || c.collected),
                detail: isAr
                  ? 'فواتير الشركات، أعمار الذمم، عمولات الـ OTA'
                  : 'City ledger folios, AR aging & OTA commissions',
              },
            ].map((s) => (
              <div
                key={s.stage}
                className={`p-4 rounded-xl border bg-white space-y-2 ${
                  s.ok ? 'border-emerald-200' : 'border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#0F1E36]">{s.title}</span>
                  {s.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                </div>
                <p className="text-sm font-mono font-bold text-[#0088CC]" dir="ltr">
                  {s.metric}
                </p>
                <p className="text-[11px] text-slate-500">{s.detail}</p>
              </div>
            ))}
          </div>

          {/* ONE Consolidated Financial Statement (Revenue Recognition vs Cash Collection & Receivables) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 bg-[#0F1E36] text-white flex items-center justify-between">
                <h2 className="text-sm font-bold">
                  {isAr
                    ? '1. قائمة الاعتراف بالإيرادات الموحدة (Revenue Recognition)'
                    : '1. Revenue Recognition Statement'}
                </h2>
                <span className="text-[11px] font-mono text-sky-200">{config.currency}</span>
              </div>
              <div className="p-5 space-y-2.5 text-xs">
                {[
                  [
                    isAr ? 'صافي إيراد الإقامة (بعد فصل الباقات)' : 'Room Accommodation Revenue (Net)',
                    consolidated.revenueRecognition.roomAccommodationNet,
                  ],
                  [
                    isAr ? 'مخصص الوجبات والمشروبات المحوّل من الباقات (BB/HB/FB/AI)' : 'F&B Package Allocation (Ro/BB/HB/FB/AI)',
                    consolidated.revenueRecognition.packageAllocationToFb,
                  ],
                  [
                    isAr ? 'مبيعات المطاعم والبارات المباشرة (POS Direct)' : 'F&B POS Direct Settlement (Net)',
                    consolidated.revenueRecognition.posFbDirectNet,
                  ],
                  [
                    isAr ? 'مبيعات المطاعم المرحّلة للغرف (تُحسب مرة واحدة)' : 'F&B POS Room Charge (Counted Once)',
                    consolidated.revenueRecognition.posFbRoomChargeNet,
                  ],
                  [
                    isAr ? 'إيرادات الأقسام الأخرى (Spa / Laundry)' : 'Other Department Revenue (Net)',
                    consolidated.revenueRecognition.otherDeptNet,
                  ],
                  [
                    isAr ? 'إيرادات الحفلات والمؤتمرات (Banquet BEO)' : 'Banquet / BEO Revenue Reference (Net)',
                    consolidated.revenueRecognition.banquetNet,
                  ],
                  [
                    isAr ? 'إجمالي الخصومات والتسويات (Discounts & Rebates)' : 'Discounts & Rebates (Deduction)',
                    -consolidated.revenueRecognition.totalDiscountsAndRebates,
                  ],
                  [
                    isAr ? 'رسوم الخدمة (Service Charge)' : 'Service Charge',
                    consolidated.revenueRecognition.serviceCharge,
                  ],
                  [
                    isAr ? 'ضريبة القيمة المضافة (VAT)' : 'VAT Amount',
                    consolidated.revenueRecognition.vatAmount,
                  ],
                  [
                    isAr ? 'ضريبة البلدية / السياحة (City Tax)' : 'City / Municipality Tax',
                    consolidated.revenueRecognition.cityTaxAmount,
                  ],
                ].map(([label, val], idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-700">{label}</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums" dir="ltr">
                      {formatMoney(Number(val), config.currency)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 text-sm font-bold text-[#0F1E36]">
                  <span>{isAr ? 'إجمالي الإيراد المعترف به (Gross Revenue)' : 'Gross Recognized Revenue'}</span>
                  <span className="font-mono tabular-nums" dir="ltr">
                    {formatMoney(consolidated.revenueRecognition.grossRecognizedRevenue, config.currency)}
                  </span>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-5 py-3.5 bg-[#0088CC] text-white flex items-center justify-between">
                  <h2 className="text-sm font-bold">
                    {isAr
                      ? '2. قائمة التحصيل النقدي والذمم (Cash Collection & Receivables)'
                      : '2. Cash Collection & Receivables Statement'}
                  </h2>
                  <span className="text-[11px] font-mono text-sky-100">Non-Revenue Balance</span>
                </div>
                <div className="p-5 space-y-2.5 text-xs">
                  {[
                    [
                      isAr ? 'التحصيل النقدي الفعلي (Cash Drop)' : 'Cash Collected (Physical Drop)',
                      consolidated.cashAndReceivables.cashCollected,
                    ],
                    [
                      isAr ? 'تحصيل البطاقات البنكية (EDC Z-Report)' : 'Card / EDC Collected',
                      consolidated.cashAndReceivables.cardEdcCollected,
                    ],
                    [
                      isAr ? 'التأمينات ومقدمات الحجز (لا تُعد إيراداً)' : 'Advance Deposits Collected (Non-Revenue)',
                      consolidated.cashAndReceivables.advanceDepositsCollected,
                    ],
                    [
                      isAr ? 'سداد النزلاء للفواتير (Payments - Non-Revenue)' : 'Guest Payments Collected (Non-Revenue)',
                      consolidated.cashAndReceivables.guestPaymentsCollected,
                    ],
                    [
                      isAr ? 'المصروفات النثرية (Paid Outs)' : 'Paid Outs Disbursed',
                      -consolidated.cashAndReceivables.paidOuts,
                    ],
                    [
                      isAr ? 'ترحيلات ذمم الشركات (City Ledger Transferred)' : 'City Ledger Signed & Transferred',
                      consolidated.cashAndReceivables.cityLedgerTransferred,
                    ],
                    [
                      isAr ? 'أرصدة الذمم المفتوحة غير المحصلة (Open AR)' : 'Outstanding City Ledger AR',
                      consolidated.cashAndReceivables.outstandingCityLedgerAr,
                    ],
                    [
                      isAr ? 'حساب مقاصة ترحيل الغرف (Room Charge Clearing)' : 'POS-to-PMS Room Charge Clearing',
                      consolidated.cashAndReceivables.roomChargeClearingTransfer,
                    ],
                  ].map(([label, val], idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">{label}</span>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums" dir="ltr">
                        {formatMoney(Number(val), config.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-5 py-3.5 bg-emerald-50 border-t border-emerald-200 flex flex-wrap items-center gap-3 text-[11px] text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  {isAr
                    ? 'تم التحقق: ترحيلات الـ POS للغرف غير مكررة، والودائع والمدفوعات مستبعدة من الإيرادات.'
                    : 'Verified: POS Room Charges not double-counted; Advance Deposits & Guest Payments excluded from revenue.'}
                </span>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: INCOME AUDIT EXCEPTION CENTER (MODULE 7) ==================== */}
      {subTab === 'exceptions' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#0F1E36]">
                {isAr ? 'مركز استثناءات وملاحظات المراجعة الموحد' : 'Unified Income Audit Exception Center'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'يجمع استثناءات محرك الغرف والدفتر والتدبير الفندقي والبنوك والـ OTAs مع توثيق القرار والمراجع'
                  : 'Consolidates room engine, ledger, HK discrepancies, cash/EDC, OTA & City Ledger exceptions with persisted resolutions'}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 no-print">
              {(
                [
                  ['ALL', isAr ? 'الكل' : 'All'],
                  ['OPEN', isAr ? 'مفتوح / قيد الفحص' : 'Open / Investigating'],
                  ['CRITICAL', isAr ? 'حرج فقط' : 'Critical Only'],
                  ['CLOSED', isAr ? 'معتمد / محلول' : 'Approved / Resolved'],
                ] as const
              ).map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setExcFilter(k)}
                  className={`px-3 py-1 text-xs font-medium rounded-md border ${
                    excFilter === k
                      ? 'bg-[#0088CC] text-white border-[#0088CC]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Exception ID</th>
                  <th className="py-2.5 px-3">Dept / Ref</th>
                  <th className="py-2.5 px-3">Title & Evidence</th>
                  <th className="py-2.5 px-3">Expected</th>
                  <th className="py-2.5 px-3">Actual</th>
                  <th className="py-2.5 px-3">Variance</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Reviewer / Resolution</th>
                  <th className="py-2.5 px-3 no-print">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredExceptions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      {isAr ? 'لا توجد استثناءات مطابقة للفلتر الحالي.' : 'No exceptions match the current filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredExceptions.map((exc) => {
                    const isEditing = editingExcId === exc.exceptionId;
                    return (
                      <tr key={exc.exceptionId} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap" dir="ltr">
                          {exc.exceptionId}
                          <span
                            className={`block text-[10px] font-semibold ${
                              exc.severity === 'critical' ? 'text-red-700' : 'text-amber-700'
                            }`}
                          >
                            {exc.severity.toUpperCase()} · {exc.businessDate}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 block">{exc.sourceDept}</span>
                          <span className="text-[11px] font-mono text-[#0088CC]">{exc.roomOrCheckRef}</span>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <p className="font-semibold text-slate-900">{exc.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{exc.evidence}</p>
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums" dir="ltr">
                          {exc.expectedAmount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums" dir="ltr">
                          {exc.actualAmount.toFixed(2)}
                        </td>
                        <td
                          className={`py-2.5 px-3 font-mono tabular-nums font-bold ${
                            Math.abs(exc.varianceAmount) > 0.5 ? 'text-red-700' : 'text-slate-700'
                          }`}
                          dir="ltr"
                        >
                          {exc.varianceAmount > 0 ? `+${exc.varianceAmount.toFixed(2)}` : exc.varianceAmount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
                              exc.investigationStatus === 'Approved' || exc.investigationStatus === 'Resolved'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : exc.investigationStatus === 'Escalated'
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {exc.investigationStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px]">
                          {isEditing ? (
                            <div className="space-y-1.5">
                              <select
                                value={draftStatus}
                                onChange={(e) => setDraftStatus(e.target.value as ExceptionInvestigationStatus)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                              >
                                <option value="Investigating">Investigating</option>
                                <option value="Approved">Approved</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Escalated">Escalated</option>
                              </select>
                              <input
                                type="text"
                                value={draftNote}
                                onChange={(e) => setDraftNote(e.target.value)}
                                placeholder={isAr ? 'تبرير أو قرار المراجع...' : 'Audit explanation / resolution...'}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                              />
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium text-slate-800 block">{exc.reviewer}</span>
                              <span className="text-slate-500">{exc.resolution || '—'}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 no-print whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => submitInlineResolution(exc.exceptionId)}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded"
                              >
                                {isAr ? 'حفظ' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingExcId(null)}
                                className="px-2 py-1 text-[11px] text-slate-600 border border-slate-300 rounded"
                              >
                                {isAr ? 'إلغاء' : 'Cancel'}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openInlineResolution(exc)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-[#0088CC] border border-[#0088CC]/40 bg-sky-50 hover:bg-sky-100 rounded"
                            >
                              {isAr ? 'معالجة / اعتماد' : 'Resolve / Approve'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: 14-STEP NIGHT AUDIT CONTROL & HISTORICAL ROOM ANALYSIS ==================== */}
      {subTab === 'nightAudit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Night Audit 14-Step Readiness Gate */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#0F1E36]">
                  {isAr
                    ? 'بوابة جاهزية الإغلاق الليلي (14 خطوة تدقيق)'
                    : 'Night Audit Readiness Gate (14-Step Control)'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr
                    ? `${nightReadiness.passedCount} / 14 خطوة مكتملة · نسبة الجاهزية ${nightReadiness.scorePct}%`
                    : `${nightReadiness.passedCount} / 14 passed · Readiness ${nightReadiness.scorePct}%`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportNightAuditDossier}
                  className="px-3 py-2 text-xs font-semibold text-[#0F1E36] border border-slate-300 bg-white hover:bg-slate-50 rounded-lg flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isAr ? 'حزمة الإغلاق (.json)' : 'Dossier (.json)'}
                </button>
                <button
                  type="button"
                  onClick={onToggleDayLock}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    dayLocked
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : nightReadiness.readyForClose
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-[#0F1E36] hover:bg-slate-800 text-white'
                  }`}
                >
                  {dayLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {dayLocked
                    ? isAr
                      ? 'فتح اليوم المقفل (PIN)'
                      : 'Reopen Closed Day'
                    : isAr
                    ? 'اعتماد وإغلاق اليوم المالي'
                    : 'Lock & Close Business Date'}
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {nightReadiness.items.map((item) => (
                <div key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                      {item.order}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {isAr ? item.titleAr : item.titleEn}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono" dir="ltr">
                        {item.stage} · {item.evidence}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
                        item.status === 'passed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {item.status === 'passed'
                        ? isAr
                          ? 'مكتمل'
                          : 'Passed'
                        : isAr
                        ? 'يتطلب تأكيد'
                        : 'Attention'}
                    </span>

                    <label className="inline-flex items-center gap-1 cursor-pointer text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={item.manualConfirmed}
                        onChange={() => onToggleNightAuditCheck(item.id)}
                        className="rounded border-slate-300 text-[#0088CC]"
                      />
                      <span>{isAr ? 'توقيع' : 'Sign'}</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Historical Room Revenue Analysis (Module 9) */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#0088CC]" />
                <h2 className="text-sm font-bold text-[#0F1E36]">
                  {isAr ? 'التحليل المالي التاريخي للغرفة' : 'Historical Room Revenue Analysis'}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={activeHistoryRoom?.id ?? ''}
                  onChange={(e) => setSelectedHistoryRoomId(e.target.value)}
                  className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Rm {r.roomNumber} · {r.roomType} ({r.status})
                    </option>
                  ))}
                </select>

                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                  {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as HistoryPeriodMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setHistoryPeriod(mode)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                        historyPeriod === mode
                          ? 'bg-[#0088CC] text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {historyAnalysis && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">
                      {isAr ? 'إجمالي التحصيل والودائع المسجلة' : 'Recorded Deposits & Payments'}
                    </span>
                    <span className="font-mono font-bold text-[#0F1E36]" dir="ltr">
                      {formatMoney(historyAnalysis.totalCollectedAllTime, config.currency)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">
                      {isAr ? 'حركات سجل التدقيق للغرفة' : 'Room Audit Trail Events'}
                    </span>
                    <span className="font-mono font-bold text-[#0088CC]">
                      {historyAnalysis.roomTrailCount}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-[11px] text-start">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <tr>
                        <th className="py-2 px-2.5">Period</th>
                        <th className="py-2 px-2.5">Nts</th>
                        <th className="py-2 px-2.5">Room Net</th>
                        <th className="py-2 px-2.5">Extras</th>
                        <th className="py-2 px-2.5">Gross</th>
                        <th className="py-2 px-2.5">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {historyAnalysis.rows.map((row) => (
                        <tr key={row.periodKey}>
                          <td className="py-2 px-2.5 font-mono font-semibold text-slate-900" dir="ltr">
                            {row.label}
                          </td>
                          <td className="py-2 px-2.5 font-mono">{row.nightsOrDays}</td>
                          <td className="py-2 px-2.5 font-mono tabular-nums" dir="ltr">
                            {row.roomRevenueNet.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums" dir="ltr">
                            {row.extraCharges.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 font-mono tabular-nums font-bold" dir="ltr">
                            {row.grossCharges.toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 text-[10px] text-slate-500">{row.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
