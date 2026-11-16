import React, { useMemo, useRef, useState } from 'react';
import {
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FolderArchive,
  Printer,
  Search,
  Wand2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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
  AuditTrailEntry,
  BanquetBeoRecord,
  CashierShiftRecord,
  CashSettlement,
  CityLedgerRecord,
  DailyArchiveRecord,
  EdcTerminalRecord,
  HotelConfig,
  HotelRoom,
  KwentraSnapshot,
  LedgerEntry,
  OccupancyInputs,
  OtaAuditRecord,
  RoomDiscrepancy,
  RoomFolioItem,
  RoomReservation,
} from '../types/audit';
import {
  convertCurrency,
  downloadTextFile,
  formatMoney,
  getExchangeRates,
} from '../utils/auditEngine';
import {
  buildConsolidatedFinancialStatement,
  computeAllRoomsRevenueReport,
} from '../utils/roomRevenueEngine';
import {
  exportReportCsv,
  exportReportExcelXls,
  exportReportHtml,
  exportReportJson,
  ReportExportPayload,
} from '../utils/reportExporter';

export type ReportId =
  | 'executive'
  | 'departments'
  | 'kwentra'
  | 'exceptions'
  | 'ledger'
  | 'checklist'
  | 'archive'
  | 'cashiers'
  | 'otas'
  | 'beoTrail'
  | 'roomRevenue'
  | 'consolidated';

type KwentraModuleId = 'FO' | 'BO' | 'PS';

interface ReportDirectoryItem {
  key: string;
  reportId: ReportId;
  labelEn: string;
  labelAr: string;
  labelFr: string;
  outageOnly?: boolean;
}

interface ReportCategoryGroup {
  key: string;
  titleEn: string;
  titleAr: string;
  titleFr: string;
  items: ReportDirectoryItem[];
}

interface ReportsCenterProps {
  lang: LanguageCode;
  t: TranslationDict;
  config: HotelConfig;
  entries: LedgerEntry[];
  summary: AuditSummary;
  settlement: CashSettlement;
  tasks: AuditTask[];
  discrepancies: RoomDiscrepancy[];
  kwentraSnapshot: KwentraSnapshot;
  occupancyInputs?: OccupancyInputs;
  dailyArchive?: DailyArchiveRecord[];
  edcTerminals?: EdcTerminalRecord[];
  cashierShifts?: CashierShiftRecord[];
  otaBookings?: OtaAuditRecord[];
  cityLedgerItems?: CityLedgerRecord[];
  banquetEvents?: BanquetBeoRecord[];
  auditTrail?: AuditTrailEntry[];
  rooms?: HotelRoom[];
  roomReservations?: RoomReservation[];
  roomFolioItems?: RoomFolioItem[];
  exceptionResolutions?: Record<string, AuditExceptionResolution>;
}

const MODULE_DIRECTORY: Record<KwentraModuleId, ReportCategoryGroup[]> = {
  FO: [
    {
      key: 'fo-income',
      titleEn: 'Income',
      titleAr: 'الإيرادات (Income)',
      titleFr: 'Revenus (Income)',
      items: [
        {
          key: 'fo-addon',
          reportId: 'beoTrail',
          labelEn: 'Addon Packages Sales',
          labelAr: 'مبيعات الباقات والإضافات',
          labelFr: 'Ventes Forfaits & Addons',
        },
        {
          key: 'fo-adj-cashier',
          reportId: 'exceptions',
          labelEn: 'Adjustments By Cashier',
          labelAr: 'التسويات والخصومات حسب الكاشير',
          labelFr: 'Ajustements par Caissier',
        },
        {
          key: 'fo-cashier-sum',
          reportId: 'cashiers',
          labelEn: 'Cashier Summary',
          labelAr: 'ملخص الكاشير والخزينة',
          labelFr: 'Résumé Caissiers',
        },
        {
          key: 'fo-cashier-tx',
          reportId: 'ledger',
          labelEn: 'Cashier Transactions',
          labelAr: 'حركات ومعاملات الكاشير',
          labelFr: 'Transactions Caissier',
        },
        {
          key: 'fo-daily-res',
          reportId: 'archive',
          labelEn: 'Daily Results',
          labelAr: 'النتائج اليومية ومؤشرات الأداء',
          labelFr: 'Résultats Journaliers',
        },
        {
          key: 'fo-fx',
          reportId: 'executive',
          labelEn: 'Exchange Rate Report',
          labelAr: 'تقرير أسعار الصرف والعملات',
          labelFr: 'Rapport Taux de Change',
        },
        {
          key: 'fo-folio',
          reportId: 'ledger',
          labelEn: 'Folio Report',
          labelAr: 'تقرير الفواتير (Folio Report)',
          labelFr: 'Rapport Folios',
        },
        {
          key: 'fo-income-sum',
          reportId: 'executive',
          labelEn: 'Income Summary Report',
          labelAr: 'تقرير ملخص الإيرادات اليومي',
          labelFr: 'Synthèse des Revenus',
        },
        {
          key: 'fo-dept-j',
          reportId: 'departments',
          labelEn: 'Journal By Department',
          labelAr: 'يومية الإيرادات حسب القسم',
          labelFr: 'Journal par Département',
        },
        {
          key: 'fo-vat-j',
          reportId: 'departments',
          labelEn: 'Journal Of VAT Report',
          labelAr: 'يومية الضرائب ورسوم الخدمة',
          labelFr: 'Journal TVA & Services',
        },
        {
          key: 'fo-room-rev-engine',
          reportId: 'roomRevenue',
          labelEn: 'Daily Room Revenue & Package Split Report',
          labelAr: 'تقرير إيرادات الغرف اليومي وفصل الباقات',
          labelFr: 'Rapport Revenus Chambres & Forfaits',
        },
        {
          key: 'fo-consolidated',
          reportId: 'consolidated',
          labelEn: 'Consolidated Revenue & Collection Statement',
          labelAr: 'القائمة المالية الموحدة (الإيرادات مقابل التحصيل)',
          labelFr: 'État Financier Consolidé',
        },
      ],
    },
    {
      key: 'fo-reservation',
      titleEn: 'Reservation & Channels',
      titleAr: 'الحجوزات والقنوات',
      titleFr: 'Réservations & Canaux',
      items: [
        {
          key: 'fo-ch-comm',
          reportId: 'otas',
          labelEn: 'Channels Commission',
          labelAr: 'عمولات ومطابقة قنوات الحجز OTAs',
          labelFr: 'Commissions Canaux OTA',
        },
        {
          key: 'fo-ch-inc',
          reportId: 'otas',
          labelEn: 'Channels Income Statistics',
          labelAr: 'إحصائيات إيرادات القنوات',
          labelFr: 'Statistiques Revenus Canaux',
        },
        {
          key: 'fo-ctrl',
          reportId: 'kwentra',
          labelEn: 'Control Panel (Kwentra Sync)',
          labelAr: 'لوحة مطابقة سيستم Kwentra الأصلي',
          labelFr: 'Comparaison Kwentra PMS',
        },
        {
          key: 'fo-occ',
          reportId: 'archive',
          labelEn: 'Room Type Occupancy & ADR',
          labelAr: 'نسب الإشغال ومتوسط السعر ADR',
          labelFr: 'Occupation & ADR / RevPAR',
        },
        {
          key: 'fo-outage-log',
          reportId: 'ledger',
          outageOnly: true,
          labelEn: 'Outage Recovery Folio Log',
          labelAr: 'سجل فواتير طوارئ انقطاع السيستم',
          labelFr: 'Journal Folios Hors-Ligne',
        },
      ],
    },
    {
      key: 'fo-hk-fd',
      titleEn: 'Housekeeping & FrontDesk',
      titleAr: 'الإشراف الداخلي والاستقبال',
      titleFr: 'Étages & Réception',
      items: [
        {
          key: 'fo-hk-disc',
          reportId: 'exceptions',
          labelEn: 'Housekeeping Discrepancy',
          labelAr: 'تقرير تضارب الغرف (FO vs HK)',
          labelFr: 'Écarts Gouvernance (FO/HK)',
        },
        {
          key: 'fo-checklist',
          reportId: 'checklist',
          labelEn: 'Income Audit 8-Point Checklist',
          labelAr: 'قائمة اعتماد المراجعة اليومية (8 نقاط)',
          labelFr: 'Checklist Audit 8 Points',
        },
        {
          key: 'fo-seq-gaps',
          reportId: 'exceptions',
          labelEn: 'Missing Check Sequence Audit',
          labelAr: 'تقرير فجوات تسلسل الشيكات',
          labelFr: 'Séquences Chèques Manquantes',
        },
        {
          key: 'fo-trail',
          reportId: 'beoTrail',
          labelEn: 'Audit Trail & Day Lock Log',
          labelAr: 'سجل الرقابة وقفل الأيام المالية',
          labelFr: 'Piste Audit & Clôtures',
        },
      ],
    },
  ],
  BO: [
    {
      key: 'bo-treasury',
      titleEn: 'General Cashier & Banks',
      titleAr: 'الخزينة العامة والبنوك',
      titleFr: 'Trésorerie & Banques',
      items: [
        {
          key: 'bo-edc',
          reportId: 'cashiers',
          labelEn: 'Bank EDC Terminals Batch',
          labelAr: 'مطابقة دفعات ماكينات البنوك (EDC)',
          labelFr: 'Lots Terminaux EDC Banques',
        },
        {
          key: 'bo-cash-drop',
          reportId: 'cashiers',
          labelEn: 'Cash Denomination & Shift Drop',
          labelAr: 'جرد فئات النقدية وشيفتات الكاشير',
          labelFr: 'Billetage & Caisses Postes',
        },
        {
          key: 'bo-trial',
          reportId: 'executive',
          labelEn: 'Executive Financial Summary',
          labelAr: 'الملخص المالي التنفيذي (EGP/USD/EUR)',
          labelFr: 'Synthèse Financière Multi-Devises',
        },
      ],
    },
    {
      key: 'bo-receivables',
      titleEn: 'City Ledger & Receivables',
      titleAr: 'ذمم الشركات والتحصيل',
      titleFr: 'Comptes Clients & Agences',
      items: [
        {
          key: 'bo-cl-aging',
          reportId: 'otas',
          labelEn: 'City Ledger Aging (0-90+ Days)',
          labelAr: 'تقرير أعمار ذمم الشركات (0-90+ يوم)',
          labelFr: 'Balance Âgée Débiteurs',
        },
        {
          key: 'bo-kwentra',
          reportId: 'kwentra',
          labelEn: 'Kwentra Back Office Variance',
          labelAr: 'تقرير الفروقات مع Kwentra الأصلي',
          labelFr: 'Écarts vs Kwentra PMS',
        },
        {
          key: 'bo-consolidated',
          reportId: 'consolidated',
          labelEn: 'Consolidated Audit Statement (Rev vs Cash)',
          labelAr: 'القائمة المالية الموحدة لمراجع الدخل',
          labelFr: 'État Consolidé Auditeur',
        },
      ],
    },
    {
      key: 'bo-compliance',
      titleEn: 'Compliance & Archive',
      titleAr: 'الأرشيف والامتثال',
      titleFr: 'Archives & Conformité',
      items: [
        {
          key: 'bo-archive',
          reportId: 'archive',
          labelEn: 'Closed Business Dates Archive',
          labelAr: 'أرشيف الأيام المالية المغلقة والموازنة',
          labelFr: 'Archives Journées Clôturées',
        },
        {
          key: 'bo-trail',
          reportId: 'beoTrail',
          labelEn: 'Immutable Audit Trail Report',
          labelAr: 'سجل المراجعة الزمني غير القابل للتعديل',
          labelFr: 'Journal Audit Immuable',
        },
      ],
    },
  ],
  PS: [
    {
      key: 'ps-outlets',
      titleEn: 'F&B Outlets & Revenue',
      titleAr: 'منافذ الأغذية والمشروبات',
      titleFr: 'Points de Vente F&B',
      items: [
        {
          key: 'ps-dept',
          reportId: 'departments',
          labelEn: 'POS Outlets Revenue Breakdown',
          labelAr: 'توزيع إيرادات المطاعم والبارات',
          labelFr: 'Revenus par Point de Vente',
        },
        {
          key: 'ps-checks',
          reportId: 'ledger',
          labelEn: 'POS Checks & Room Charges',
          labelAr: 'كشف شيكات الـ POS وترحيلات الغرف',
          labelFr: 'Chèques POS & Reports Chambre',
        },
        {
          key: 'ps-outage',
          reportId: 'ledger',
          outageOnly: true,
          labelEn: 'Offline POS Outage Checks',
          labelAr: 'شيكات الطوارئ أثناء توقف الـ POS',
          labelFr: 'Chèques POS Hors-Ligne',
        },
      ],
    },
    {
      key: 'ps-banquet',
      titleEn: 'Banquets & Packages',
      titleAr: 'الحفلات وفصل الباقات',
      titleFr: 'Banquets & Forfaits',
      items: [
        {
          key: 'ps-beo',
          reportId: 'beoTrail',
          labelEn: 'Banquet Event Orders (BEO) & Deposits',
          labelAr: 'عقود الحفلات BEO والعربون المحصل',
          labelFr: 'Banquets (BEO) & Acomptes',
        },
        {
          key: 'ps-pkg',
          reportId: 'archive',
          labelEn: 'Package Split (RO/BB/HB/FB/AI)',
          labelAr: 'تقرير فصل وجبات الباقات عن الغرف',
          labelFr: 'Ventilation Forfaits Repas',
        },
      ],
    },
    {
      key: 'ps-controls',
      titleEn: 'POS Audit & Controls',
      titleAr: 'الرقابة على الـ POS',
      titleFr: 'Contrôles POS',
      items: [
        {
          key: 'ps-gaps',
          reportId: 'exceptions',
          labelEn: 'Check Sequence Gaps & Rebates',
          labelAr: 'فجوات أرقام الشيكات والخصومات',
          labelFr: 'Séquences & Remises Non Approuvées',
        },
        {
          key: 'ps-signoff',
          reportId: 'checklist',
          labelEn: 'F&B Night Audit Sign-Off',
          labelAr: 'اعتماد الإغلاق الليلي للمنافذ',
          labelFr: 'Validation Clôture F&B',
        },
      ],
    },
  ],
};

export const ReportsCenter: React.FC<ReportsCenterProps> = ({
  lang,
  t,
  config,
  entries,
  summary,
  settlement,
  tasks,
  discrepancies,
  kwentraSnapshot,
  occupancyInputs,
  dailyArchive = [],
  edcTerminals = [],
  cashierShifts = [],
  otaBookings = [],
  cityLedgerItems = [],
  banquetEvents = [],
  auditTrail = [],
  rooms = [],
  roomReservations = [],
  roomFolioItems = [],
  exceptionResolutions = {},
}) => {
  const [activeModule, setActiveModule] = useState<KwentraModuleId>('FO');
  const [activeReport, setActiveReport] = useState<ReportId>('executive');
  const [selectedLinkKey, setSelectedLinkKey] = useState<string>('fo-income-sum');
  const [selectedCustomTitle, setSelectedCustomTitle] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showVisualReports, setShowVisualReports] = useState(false);
  const [outageOnlyLedger, setOutageOnlyLedger] = useState(false);
  const [exportNotice, setExportNotice] = useState('');

  const previewRef = useRef<HTMLDivElement | null>(null);
  const rates = useMemo(() => getExchangeRates(config), [config]);

  const toEquiv = (val: number) => ({
    usd: convertCurrency(val, config.currency, 'USD', rates).toFixed(2),
    eur: convertCurrency(val, config.currency, 'EUR', rates).toFixed(2),
    egp: convertCurrency(val, config.currency, 'EGP', rates).toFixed(2),
  });

  const getLocalizedLabel = (item: {
    labelEn: string;
    labelAr: string;
    labelFr: string;
  }) => (lang === 'ar' ? item.labelAr : lang === 'fr' ? item.labelFr : item.labelEn);

  const getGroupTitle = (g: ReportCategoryGroup) =>
    lang === 'ar' ? g.titleAr : lang === 'fr' ? g.titleFr : g.titleEn;

  const filteredGroups = useMemo(() => {
    const groups = MODULE_DIRECTORY[activeModule];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((grp) => ({
        ...grp,
        items: grp.items.filter(
          (item) =>
            item.labelEn.toLowerCase().includes(q) ||
            item.labelAr.toLowerCase().includes(q) ||
            item.labelFr.toLowerCase().includes(q) ||
            grp.titleEn.toLowerCase().includes(q) ||
            grp.titleAr.toLowerCase().includes(q)
        ),
      }))
      .filter((grp) => grp.items.length > 0);
  }, [activeModule, searchQuery]);

  // Build normalized table payloads for all 10 reports
  const reportPayloads = useMemo<Record<ReportId, ReportExportPayload>>(() => {
    const execItems: [string, number][] = [
      [t.recovery.roomNet, summary.roomNet],
      [t.recovery.fbNet, summary.fbNet],
      [t.recovery.otherNet, summary.otherNet],
      [t.kwentraCompare.rows.serviceCharge, summary.totalServiceCharge],
      [t.kwentraCompare.rows.vatAndTaxes, summary.totalVat],
      [t.recovery.totalGross, summary.grossRevenue],
      [t.recovery.totalRebates, -summary.totalRebates],
      [t.kwentraCompare.rows.paidOuts, -summary.totalPaidOuts],
      [t.dashboard.expectedCash, summary.expectedCash],
      [t.dashboard.actualCashLabel, settlement.actualCashDrop],
      [t.dashboard.expectedCard, summary.expectedCreditCard],
      [t.dashboard.actualCardLabel, settlement.actualEdcBatch],
      [t.dashboard.expectedCityLedger, summary.expectedCityLedger],
      [t.dashboard.actualCityLedgerLabel, settlement.actualCityLedgerSigned],
      [t.recovery.netVariance, summary.totalVariance],
    ];

    const executive: ReportExportPayload = {
      title: `${t.reports.reportTabs.executive} — ${config.hotelName}`,
      subtitle: t.reports.executiveDesc,
      dir: t.dir,
      metadata: {
        [t.recovery.businessDateLabel]: config.businessDate,
        [t.settings.currency]: config.currency,
        [t.recovery.auditorLabel]: settlement.generalCashierName,
        'USD / EUR / EGP': `1 USD=${rates.USD} · 1 EUR=${rates.EUR} · 1 EGP=${rates.EGP} (${config.currency})`,
      },
      columns: [
        t.reports.cols.metric,
        `${t.reports.cols.amountBase} (${config.currency})`,
        t.reports.cols.equivUsd,
        t.reports.cols.equivEur,
        t.reports.cols.equivEgp,
      ],
      rows: execItems.map(([label, amount]) => {
        const eq = toEquiv(amount);
        return [label, amount.toFixed(2), eq.usd, eq.eur, eq.egp];
      }),
    };

    const deptMap = new Map<
      string,
      { dept: string; count: number; net: number; svc: number; vat: number; gross: number }
    >();
    for (const e of entries) {
      if (
        e.category === 'Rebate' ||
        e.category === 'PaidOut' ||
        e.category === 'Deposit' ||
        e.category === 'Payment'
      )
        continue;
      const key = `${e.category} · ${e.outletOrDept}`;
      const existing = deptMap.get(key);
      if (existing) {
        existing.count += 1;
        existing.net += e.netAmount;
        existing.svc += e.serviceCharge;
        existing.vat += e.vatAmount;
        existing.gross += e.grossAmount;
      } else {
        deptMap.set(key, {
          dept: e.outletOrDept,
          count: 1,
          net: e.netAmount,
          svc: e.serviceCharge,
          vat: e.vatAmount,
          gross: e.grossAmount,
        });
      }
    }
    const deptList = Array.from(deptMap.values()).sort((a, b) => b.gross - a.gross);
    const totalDeptGross = deptList.reduce((acc, d) => acc + d.gross, 0);

    const departments: ReportExportPayload = {
      title: `${t.reports.reportTabs.departments} — ${config.hotelName}`,
      subtitle: t.reports.departmentsDesc,
      dir: t.dir,
      metadata: {
        [t.recovery.businessDateLabel]: config.businessDate,
        [t.settings.currency]: config.currency,
      },
      columns: [
        t.reports.cols.dept,
        t.reports.cols.entriesCount,
        t.reports.cols.net,
        t.reports.cols.svc,
        t.reports.cols.vat,
        t.reports.cols.gross,
        t.reports.cols.share,
      ],
      rows: deptList.map((d) => [
        d.dept,
        d.count,
        d.net.toFixed(2),
        d.svc.toFixed(2),
        d.vat.toFixed(2),
        d.gross.toFixed(2),
        totalDeptGross > 0 ? `${((d.gross / totalDeptGross) * 100).toFixed(1)}%` : '0.0%',
      ]),
    };

    const kwentraGross =
      kwentraSnapshot.roomNet +
      kwentraSnapshot.fbNet +
      kwentraSnapshot.otherNet +
      kwentraSnapshot.serviceCharge +
      kwentraSnapshot.vatAndTaxes;

    const kwentraPairs: [string, number, number][] = [
      [t.kwentraCompare.rows.roomNet, summary.roomNet, kwentraSnapshot.roomNet],
      [t.kwentraCompare.rows.fbNet, summary.fbNet, kwentraSnapshot.fbNet],
      [t.kwentraCompare.rows.otherNet, summary.otherNet, kwentraSnapshot.otherNet],
      [
        t.kwentraCompare.rows.serviceCharge,
        summary.totalServiceCharge,
        kwentraSnapshot.serviceCharge,
      ],
      [t.kwentraCompare.rows.vatAndTaxes, summary.totalVat, kwentraSnapshot.vatAndTaxes],
      [t.kwentraCompare.rows.grossTotal, summary.grossRevenue, kwentraGross],
      [t.kwentraCompare.rows.rebates, summary.totalRebates, kwentraSnapshot.rebates],
      [t.kwentraCompare.rows.paidOuts, summary.totalPaidOuts, kwentraSnapshot.paidOuts],
      [t.kwentraCompare.rows.cash, summary.expectedCash, kwentraSnapshot.cash],
      [
        t.kwentraCompare.rows.creditCard,
        summary.expectedCreditCard,
        kwentraSnapshot.creditCard,
      ],
      [
        t.kwentraCompare.rows.cityLedger,
        summary.expectedCityLedger,
        kwentraSnapshot.cityLedger,
      ],
      [
        t.kwentraCompare.rows.roomCharge,
        summary.roomChargeTransfers,
        kwentraSnapshot.roomCharge,
      ],
    ];

    const kwentra: ReportExportPayload = {
      title: `${t.reports.reportTabs.kwentra} — ${config.hotelName}`,
      subtitle: t.reports.kwentraDesc,
      dir: t.dir,
      metadata: {
        [t.recovery.businessDateLabel]: config.businessDate,
        [t.kwentraCompare.reportRefLabel]: kwentraSnapshot.reportRef,
        [t.kwentraCompare.lastUpdatedLabel]: kwentraSnapshot.lastUpdated,
      },
      columns: [
        t.kwentraCompare.colItem,
        `${t.kwentraCompare.colLocal} (${config.currency})`,
        `${t.kwentraCompare.colKwentra} (${config.currency})`,
        t.kwentraCompare.colVariance,
        t.kwentraCompare.colStatus,
      ],
      rows: kwentraPairs.map(([label, localVal, kwVal]) => {
        const diff = Number((localVal - kwVal).toFixed(2));
        const matched = Math.abs(diff) <= 0.5;
        return [
          label,
          localVal.toFixed(2),
          kwVal.toFixed(2),
          diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2),
          matched
            ? t.kwentraCompare.statusMatch
            : diff > 0
              ? t.kwentraCompare.statusOver
              : t.kwentraCompare.statusShort,
        ];
      }),
    };

    const exceptionRows: (string | number)[][] = summary.exceptions.map((exc) => [
      exc.severity === 'critical' ? t.dashboard.critical : t.dashboard.warning,
      exc.category,
      exc.title,
      exc.detail,
    ]);
    for (const d of discrepancies) {
      exceptionRows.push([
        d.resolved ? t.dashboard.hkResolved : t.dashboard.hkOpen,
        t.dashboard.hkTitle,
        `${t.dashboard.roomNumber} ${d.roomNumber} (${d.frontOfficeStatus} vs ${d.housekeepingStatus})`,
        d.note,
      ]);
    }

    const exceptions: ReportExportPayload = {
      title: `${t.reports.reportTabs.exceptions} — ${config.hotelName}`,
      subtitle: t.reports.exceptionsDesc,
      dir: t.dir,
      metadata: {
        [t.recovery.businessDateLabel]: config.businessDate,
        [t.dashboard.kpiExceptions]: summary.exceptions.length,
      },
      columns: [
        t.reports.cols.severity,
        t.reports.cols.category,
        t.reports.cols.title,
        t.reports.cols.detail,
      ],
      rows:
        exceptionRows.length > 0
          ? exceptionRows
          : [['—', '—', t.dashboard.noExceptionsTitle, t.dashboard.noExceptionsDesc]],
    };

    const filteredLedger = outageOnlyLedger
      ? entries.filter((e) => e.source === 'OutageBackup')
      : entries;

    const ledger: ReportExportPayload = {
      title: `${t.reports.reportTabs.ledger} — ${config.hotelName}`,
      subtitle: t.reports.ledgerDesc,
      dir: t.dir,
      metadata: {
        [t.recovery.businessDateLabel]: config.businessDate,
        [t.settings.currency]: config.currency,
        [t.entriesUnit]: filteredLedger.length,
      },
      columns: [
        t.ledger.colTimeSource,
        t.ledger.colTypeDept,
        t.ledger.colRef,
        t.ledger.colDesc,
        `${t.ledger.colNet} (${config.currency})`,
        `${t.ledger.colGross} (${config.currency})`,
        t.ledger.colPay,
        t.ledger.colApproval,
      ],
      rows: filteredLedger.map((e) => [
        `${e.timestamp} · ${t.ledger.sources[e.source]}`,
        `${t.ledger.categories[e.category]} (${e.outletOrDept})`,
        e.referenceNo,
        e.originalCurrency && e.originalNetAmount
          ? `${e.guestOrDescription} [${e.originalNetAmount} ${e.originalCurrency}]`
          : e.guestOrDescription,
        e.netAmount.toFixed(2),
        e.grossAmount.toFixed(2),
        t.ledger.payments[e.paymentMethod],
        e.approvedBy || '—',
      ]),
    };

    const checklist: ReportExportPayload = {
      title: `${t.reports.reportTabs.checklist} — ${config.hotelName}`,
      subtitle: t.reports.checklistDesc,
      dir: t.dir,
      metadata: {
        [t.recovery.businessDateLabel]: config.businessDate,
        [t.recovery.auditorLabel]: settlement.generalCashierName,
      },
      columns: [t.reports.cols.task, t.reports.cols.status, t.reports.cols.notes],
      rows: tasks.map((task) => [
        lang === 'ar' ? task.titleAr : task.titleEn,
        task.status === 'verified'
          ? t.dashboard.statusVerified
          : task.status === 'flagged'
            ? t.dashboard.statusFlagged
            : t.dashboard.statusPending,
        task.notes || '—',
      ]),
    };

    const totalRooms = Math.max(1, config.totalAvailableRooms ?? 120);
    const occ = occupancyInputs ?? {
      roomsSold: 0,
      complimentaryRooms: 0,
      houseUseRooms: 0,
      outOfOrderRooms: 0,
    };
    const salable = Math.max(1, totalRooms - occ.outOfOrderRooms);
    const currentOccPct = Math.min(100, Number(((occ.roomsSold / salable) * 100).toFixed(1)));
    const currentAdr = occ.roomsSold > 0 ? summary.adjustedRoomNet / occ.roomsSold : 0;
    const currentRevpar = salable > 0 ? summary.adjustedRoomNet / salable : 0;

    const archiveRows: (string | number)[][] = [
      [
        `${config.businessDate} (Live)`,
        `${occ.roomsSold}/${totalRooms}`,
        `${currentOccPct}%`,
        currentAdr.toFixed(2),
        currentRevpar.toFixed(2),
        summary.adjustedRoomNet.toFixed(2),
        summary.adjustedFbNet.toFixed(2),
        summary.grossRevenue.toFixed(2),
        summary.totalVariance.toFixed(2),
      ],
      ...dailyArchive.map((d) => [
        d.businessDate,
        `${d.roomsSold}/${d.totalAvailableRooms}`,
        `${d.occupancyPct}%`,
        d.adr.toFixed(2),
        d.revpar.toFixed(2),
        d.roomNet.toFixed(2),
        d.fbNet.toFixed(2),
        d.grossRevenue.toFixed(2),
        d.totalVariance.toFixed(2),
      ]),
    ];

    const archive: ReportExportPayload = {
      title: `${t.reports.reportTabs.archive} — ${config.hotelName}`,
      subtitle: t.reports.archiveDesc,
      dir: t.dir,
      metadata: {
        [t.recovery.businessDateLabel]: config.businessDate,
        [t.settings.totalRooms]: totalRooms,
        [t.settings.currency]: config.currency,
      },
      columns: [
        'Date',
        'Sold/Total',
        'Occ %',
        'ADR',
        'RevPAR',
        'Adj. Room Net',
        'Adj. F&B Net',
        'Gross',
        'Variance',
      ],
      rows: archiveRows,
    };

    const cashierRows: (string | number)[][] = [
      ...edcTerminals.map((e) => [
        'EDC Terminal',
        `${e.bankName} (${e.cardScheme})`,
        e.batchNo,
        e.grossAmount.toFixed(2),
        (e.grossAmount * (1 - e.bankFeePct / 100)).toFixed(2),
        e.matched ? 'Matched' : 'Review',
      ]),
      ...cashierShifts.map((s) => [
        'Cashier Shift',
        `${s.cashierName} (${s.shift})`,
        s.note || '—',
        s.expectedAmount.toFixed(2),
        s.droppedAmount.toFixed(2),
        (s.droppedAmount - s.expectedAmount).toFixed(2),
      ]),
    ];

    const cashiers: ReportExportPayload = {
      title: `${t.reports.reportTabs.cashiers} — ${config.hotelName}`,
      subtitle: t.reports.cashiersDesc,
      dir: t.dir,
      metadata: {
        [t.recovery.businessDateLabel]: config.businessDate,
        [t.recovery.auditorLabel]: settlement.generalCashierName,
      },
      columns: ['Type', 'Bank / Cashier', 'Batch / Note', 'Gross / Exp', 'Net / Drop', 'Status / Diff'],
      rows: cashierRows.length > 0 ? cashierRows : [['—', '—', '—', '0.00', '0.00', '—']],
    };

    const otaRows: (string | number)[][] = [
      ...otaBookings.map((o) => [
        `OTA · ${o.channel}`,
        `${o.bookingRef} (${o.guestName})`,
        `${o.nights} nts · Rm ${o.roomNumber}`,
        (o.contractRate * o.nights).toFixed(2),
        (o.postedRate * o.nights).toFixed(2),
        `${o.commissionPct}% · ${o.verified ? 'OK' : 'Mismatch'}`,
      ]),
      ...cityLedgerItems.map((cl) => [
        `City Ledger · ${cl.dueDays}d`,
        `${cl.companyName} (${cl.invoiceNo})`,
        `Dep: ${cl.advanceDeposit.toFixed(2)}`,
        cl.amount.toFixed(2),
        Math.max(0, cl.amount - cl.advanceDeposit).toFixed(2),
        cl.collected ? 'Collected' : cl.signedFolioAttached ? 'Signed / Open' : 'Missing Sign',
      ]),
    ];

    const otas: ReportExportPayload = {
      title: `${t.reports.reportTabs.otas} — ${config.hotelName}`,
      subtitle: t.reports.otasDesc,
      dir: t.dir,
      metadata: {
        [t.recovery.businessDateLabel]: config.businessDate,
        [t.settings.currency]: config.currency,
      },
      columns: ['Source', 'Account / Ref', 'Detail', 'Contract / Gross', 'Posted / Net AR', 'Audit Status'],
      rows: otaRows.length > 0 ? otaRows : [['—', '—', '—', '0.00', '0.00', '—']],
    };

    const beoTrailRows: (string | number)[][] = [
      ...banquetEvents.map((b) => [
        `BEO ${b.beoNo}`,
        b.eventName,
        `${b.clientName} (${b.eventDate})`,
        b.totalContractAmount.toFixed(2),
        `Dep ${b.advanceDepositPaid.toFixed(2)} / POS ${b.posPostedAmount.toFixed(2)}`,
        b.status,
      ]),
      ...auditTrail.map((tr) => [
        `Trail · ${tr.timestamp}`,
        tr.action.toUpperCase(),
        `${tr.actor} (${tr.targetRef})`,
        typeof tr.amountImpact === 'number' ? tr.amountImpact.toFixed(2) : '—',
        tr.detail,
        'Logged',
      ]),
    ];

    const beoTrail: ReportExportPayload = {
      title: `${t.reports.reportTabs.beoTrail} — ${config.hotelName}`,
      subtitle: t.reports.beoTrailDesc,
      dir: t.dir,
      metadata: {
        [t.recovery.businessDateLabel]: config.businessDate,
        [t.settings.currency]: config.currency,
      },
      columns: ['Record', 'Event / Action', 'Client / Actor', 'Amount', 'Details / Deposit', 'Status'],
      rows: beoTrailRows.length > 0 ? beoTrailRows : [['—', '—', '—', '0.00', '—', '—']],
    };

    const roomReport = computeAllRoomsRevenueReport(
      rooms,
      roomReservations,
      roomFolioItems,
      entries,
      config,
      config.businessDate,
      exceptionResolutions
    );

    const roomRevenue: ReportExportPayload = {
      title: `${lang === 'ar' ? 'تقرير إيرادات الغرف اليومي' : 'Daily Room Revenue Report'} — ${config.hotelName}`,
      subtitle:
        lang === 'ar'
          ? 'تقييم الإيراد الفعلي لكل غرفة وفصل الباقات وفروقات الأسعار'
          : 'Room-by-room daily revenue, package allocation, rate verification & variances',
      dir: t.dir,
      metadata: {
        [t.recovery.businessDateLabel]: config.businessDate,
        'Occupied / Sold': `${roomReport.totals.occupiedRooms} / ${roomReport.totals.roomsSold}`,
        'Comp / House / OOO': `${roomReport.totals.complimentaryRooms} / ${roomReport.totals.houseUseRooms} / ${roomReport.totals.outOfOrderRooms}`,
        'Total Gross': roomReport.totals.totalGrossCharges.toFixed(2),
      },
      columns: [
        'Room #',
        'Status',
        'Guest',
        'Res #',
        'Room Type',
        'Rate Plan',
        'Meal',
        'Contracted',
        'Posted',
        'Room Rev',
        'F&B Pkg',
        'Extras',
        'Discounts',
        'Net Rev',
        'SVC',
        'VAT+City',
        'Gross',
        'Variance',
        'Audit Status',
      ],
      rows:
        roomReport.records.length > 0
          ? roomReport.records.map((r) => [
              r.roomNumber,
              r.roomStatus,
              r.guestName,
              r.reservationNumber || '—',
              `${r.roomType}${r.chargedRoomType !== r.roomType ? ` -> ${r.chargedRoomType}` : ''}`,
              r.ratePlan,
              r.mealPlan,
              r.contractedRate.toFixed(2),
              r.actualPostedRate.toFixed(2),
              r.packageBreakdown.accommodationRevenue.toFixed(2),
              r.packageAllocation.toFixed(2),
              (r.extraPersonCharge + r.extraCharges).toFixed(2),
              r.discount.toFixed(2),
              r.netRevenue.toFixed(2),
              r.serviceCharge.toFixed(2),
              (r.vatAmount + r.cityTaxAmount).toFixed(2),
              r.grossFolioCharge.toFixed(2),
              r.varianceAmount.toFixed(2),
              r.auditStatus,
            ])
          : [['—', '—', '—', '—', '—', '—', '—', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '—']],
    };

    const consolStmt = buildConsolidatedFinancialStatement(
      entries,
      roomReport.records,
      cityLedgerItems,
      banquetEvents,
      summary,
      settlement,
      config
    );

    const consolidated: ReportExportPayload = {
      title: `${lang === 'ar' ? 'القائمة المالية الموحدة' : 'Consolidated Income Audit Statement'} — ${config.hotelName}`,
      subtitle:
        lang === 'ar'
          ? 'فصل صريح بين الاعتراف بالإيرادات (Revenue Recognition) والتحصيل والذمم (Collection & Receivables)'
          : 'Single source of truth separating Revenue Recognition from Cash Collection & Receivables',
      dir: t.dir,
      metadata: {
        [t.recovery.businessDateLabel]: config.businessDate,
        [t.settings.currency]: config.currency,
        'Tax Delta': consolStmt.integrityChecks.taxRoundingDelta.toFixed(2),
      },
      columns: ['Section', 'Account / Line Item', `Amount (${config.currency})`],
      rows: [
        ['1. Revenue Recognition', 'Room Revenue (Accommodation)', consolStmt.revenueRecognition.roomAccommodationNet.toFixed(2)],
        ['1. Revenue Recognition', 'Package F&B Allocation (BB/HB/FB/AI)', consolStmt.revenueRecognition.packageAllocationToFb.toFixed(2)],
        ['1. Revenue Recognition', 'POS F&B Direct Cash/Card', consolStmt.revenueRecognition.posFbDirectNet.toFixed(2)],
        ['1. Revenue Recognition', 'POS F&B Charged to Room Folios (Single-Counted)', consolStmt.revenueRecognition.posFbRoomChargeNet.toFixed(2)],
        ['1. Revenue Recognition', 'Total F&B Net Revenue', consolStmt.revenueRecognition.totalFbNet.toFixed(2)],
        ['1. Revenue Recognition', 'Other Operating Departments', consolStmt.revenueRecognition.otherDeptNet.toFixed(2)],
        ['1. Revenue Recognition', 'Banquets (BEO) Posted', consolStmt.revenueRecognition.banquetNet.toFixed(2)],
        ['1. Revenue Recognition', 'Discounts & Rebates (-)', (-consolStmt.revenueRecognition.totalDiscountsAndRebates).toFixed(2)],
        ['1. Revenue Recognition', 'Net Revenue Before Taxes', consolStmt.revenueRecognition.netRevenueBeforeTaxes.toFixed(2)],
        ['2. Taxes & Charges', 'Service Charge', consolStmt.revenueRecognition.serviceCharge.toFixed(2)],
        ['2. Taxes & Charges', 'VAT', consolStmt.revenueRecognition.vatAmount.toFixed(2)],
        ['2. Taxes & Charges', 'City / Municipality Tax', consolStmt.revenueRecognition.cityTaxAmount.toFixed(2)],
        ['2. Taxes & Charges', 'Gross Recognized Revenue', consolStmt.revenueRecognition.grossRecognizedRevenue.toFixed(2)],
        ['3. Cash & Receivables', 'Cash Collected (General Cashier)', consolStmt.cashAndReceivables.cashCollected.toFixed(2)],
        ['3. Cash & Receivables', 'Credit Card / Bank EDC Batch', consolStmt.cashAndReceivables.cardEdcCollected.toFixed(2)],
        ['3. Cash & Receivables', 'City Ledger Transferred (Signed)', consolStmt.cashAndReceivables.cityLedgerTransferred.toFixed(2)],
        ['3. Cash & Receivables', 'Outstanding City Ledger AR', consolStmt.cashAndReceivables.outstandingCityLedgerAr.toFixed(2)],
        ['3. Cash & Receivables', 'Room Charge Clearing Transfer (Info Only)', consolStmt.cashAndReceivables.roomChargeClearingTransfer.toFixed(2)],
        ['3. Cash & Receivables', 'Advance Deposits (Liability, Excluded from Rev)', consolStmt.cashAndReceivables.advanceDepositsCollected.toFixed(2)],
        ['3. Cash & Receivables', 'Guest Folio Payments (Non-Revenue Settlement)', consolStmt.cashAndReceivables.guestPaymentsCollected.toFixed(2)],
        ['3. Cash & Receivables', 'Cash Paid-Outs', (-consolStmt.cashAndReceivables.paidOuts).toFixed(2)],
      ],
    };

    return {
      executive,
      departments,
      kwentra,
      exceptions,
      ledger,
      checklist,
      archive,
      cashiers,
      otas,
      beoTrail,
      roomRevenue,
      consolidated,
    };
  }, [
    lang,
    t,
    config,
    entries,
    summary,
    settlement,
    tasks,
    discrepancies,
    kwentraSnapshot,
    rates,
    outageOnlyLedger,
    occupancyInputs,
    dailyArchive,
    edcTerminals,
    cashierShifts,
    otaBookings,
    cityLedgerItems,
    banquetEvents,
    auditTrail,
    rooms,
    roomReservations,
    roomFolioItems,
    exceptionResolutions,
  ]);

  const currentPayload = useMemo(() => {
    const base = reportPayloads[activeReport];
    if (!selectedCustomTitle) return base;
    return {
      ...base,
      title: `${selectedCustomTitle} — ${config.hotelName}`,
    };
  }, [reportPayloads, activeReport, selectedCustomTitle, config.hotelName]);

  const visualChartData = useMemo(
    () => [
      {
        name: 'Rooms',
        Local: Number(summary.roomNet.toFixed(2)),
        Kwentra: Number(kwentraSnapshot.roomNet.toFixed(2)),
      },
      {
        name: 'F&B',
        Local: Number(summary.fbNet.toFixed(2)),
        Kwentra: Number(kwentraSnapshot.fbNet.toFixed(2)),
      },
      {
        name: 'Other',
        Local: Number(summary.otherNet.toFixed(2)),
        Kwentra: Number(kwentraSnapshot.otherNet.toFixed(2)),
      },
      {
        name: 'SVC+VAT',
        Local: Number((summary.totalServiceCharge + summary.totalVat).toFixed(2)),
        Kwentra: Number((kwentraSnapshot.serviceCharge + kwentraSnapshot.vatAndTaxes).toFixed(2)),
      },
    ],
    [summary, kwentraSnapshot]
  );

  const fileBase = `HotelIncomeAuditor_${activeReport}_${config.businessDate}`;

  const handleSelectDirectoryItem = (item: ReportDirectoryItem) => {
    setSelectedLinkKey(item.key);
    setSelectedCustomTitle(getLocalizedLabel(item));
    setActiveReport(item.reportId);
    if (typeof item.outageOnly === 'boolean') {
      setOutageOnlyLedger(item.outageOnly);
    } else if (item.reportId === 'ledger') {
      setOutageOnlyLedger(false);
    }
    setExportNotice('');
    setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleExport = (format: 'csv' | 'xls' | 'json' | 'html') => {
    if (format === 'csv') exportReportCsv(fileBase, currentPayload);
    else if (format === 'xls') exportReportExcelXls(fileBase, currentPayload);
    else if (format === 'json') exportReportJson(fileBase, currentPayload);
    else exportReportHtml(fileBase, currentPayload);

    setExportNotice(`${t.reports.exportedNotice} ${fileBase}.${format}`);
  };

  const handleExportAllPackJson = () => {
    const packName = `HotelIncomeAuditor_Full_Reports_Pack_${config.businessDate}.json`;
    downloadTextFile(
      packName,
      JSON.stringify(
        {
          hotel: config.hotelName,
          businessDate: config.businessDate,
          baseCurrency: config.currency,
          exchangeRates: rates,
          exportedAt: new Date().toISOString(),
          reports: reportPayloads,
        },
        null,
        2
      ),
      false
    );
    setExportNotice(`${t.reports.exportedNotice} ${packName}`);
  };

  const moduleTabs: {
    id: KwentraModuleId;
    code: string;
    subLabel: string;
    badgeBg: string;
    borderColor: string;
  }[] = [
    {
      id: 'FO',
      code: 'FO',
      subLabel: 'Front Office',
      badgeBg: 'bg-[#1E88E5]',
      borderColor: 'border-[#1E88E5]',
    },
    {
      id: 'BO',
      code: 'BO',
      subLabel: 'Back Office',
      badgeBg: 'bg-[#00A651]',
      borderColor: 'border-[#00A651]',
    },
    {
      id: 'PS',
      code: 'PS',
      subLabel: 'Point Of Sale',
      badgeBg: 'bg-[#5B21B6]',
      borderColor: 'border-[#5B21B6]',
    },
  ];

  const activeModuleMeta = moduleTabs.find((m) => m.id === activeModule) ?? moduleTabs[0];

  return (
    <div className="space-y-6">
      {/* Kwentra Reports Listing Header & Directory */}
      <section className="no-print space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">
            {lang === 'ar'
              ? 'قائمة التقارير (Reports listing)'
              : lang === 'fr'
              ? 'Liste des Rapports'
              : 'Reports listing'}
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportAllPackJson}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              {t.reports.exportPackJson}
            </button>

            <button
              type="button"
              onClick={() => setShowVisualReports((v) => !v)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1976D2] hover:bg-[#1565C0] rounded-sm shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Wand2 className="w-3.5 h-3.5" />
              {lang === 'ar'
                ? 'التقارير المرئية (Visual Reports)'
                : lang === 'fr'
                ? 'Rapports Visuels'
                : 'Visual Reports'}
            </button>
          </div>
        </div>

        {/* Optional Visual Reports Chart Drawer */}
        {showVisualReports && (
          <div className="bg-white border border-slate-200 rounded-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {t.kwentraCompare.chartTitle}
              </h3>
              <span className="text-xs font-mono text-slate-500" dir="ltr">
                {config.businessDate} · {config.currency}
              </span>
            </div>
            <div className="h-56 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visualChartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Bar dataKey="Local" fill="#1967B2" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Kwentra" fill="#00A651" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* FO / BO / PS Module Tabs Row + Search Reports Input */}
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-2 ps-2 sm:ps-6">
              {moduleTabs.map((mod) => {
                const isActive = activeModule === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setActiveModule(mod.id)}
                    className={`p-1.5 rounded-t-md transition-all relative ${
                      isActive
                        ? `bg-white border-t-2 border-x-2 ${mod.borderColor} -mb-px z-10`
                        : 'bg-transparent border border-transparent opacity-85 hover:opacity-100 pb-2'
                    }`}
                  >
                    <div
                      className={`w-16 h-16 ${mod.badgeBg} text-white rounded-sm flex flex-col items-center justify-center shadow-xs`}
                    >
                      <span className="text-2xl font-extrabold leading-none tracking-tight">
                        {mod.code}
                      </span>
                      <span className="text-[9px] font-medium mt-1 opacity-95">
                        {mod.subLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64 pb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'بحث في التقارير...'
                    : lang === 'fr'
                    ? 'Rechercher un rapport'
                    : 'Search Reports'
                }
                className="w-full ps-8 pe-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#1E88E5]"
              />
            </div>
          </div>

          {/* Kwentra Categorized Directory Box */}
          <div
            className={`bg-[#F3F4F6] border-2 ${activeModuleMeta.borderColor} rounded-sm p-5 sm:p-6`}
          >
            {filteredGroups.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                {lang === 'ar' ? 'لا توجد تقارير مطابقة للبحث.' : 'No matching reports found.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredGroups.map((group) => (
                  <div key={group.key} className="space-y-2">
                    <div className="bg-[#1967B2] text-white text-xs font-bold px-2.5 py-1">
                      {getGroupTitle(group)}
                    </div>
                    <ul className="space-y-1.5 ps-1">
                      {group.items.map((item) => {
                        const isSelected = selectedLinkKey === item.key;
                        return (
                          <li key={item.key} className="flex items-start gap-2">
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-1.5 shrink-0"
                              aria-hidden="true"
                            />
                            <button
                              type="button"
                              onClick={() => handleSelectDirectoryItem(item)}
                              className={`text-xs text-start transition-colors ${
                                isSelected
                                  ? 'text-[#0D47A1] font-bold underline underline-offset-2'
                                  : 'text-[#1565C0] hover:underline font-medium'
                              }`}
                            >
                              {getLocalizedLabel(item)}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Active Report Export Bar + Live Printable Sheet */}
      <div ref={previewRef} className="space-y-4">
        {/* Export All Formats + Print Bar */}
        <section className="bg-white border border-slate-200 rounded-md p-4 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">
              {t.reports.exportFormatsLabel}
            </span>

            <button
              type="button"
              onClick={() => handleExport('xls')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {t.reports.exportExcel}
            </button>

            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1967B2] hover:bg-[#145594] rounded-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {t.reports.exportCsv}
            </button>

            <button
              type="button"
              onClick={() => handleExport('html')}
              className="px-3 py-1.5 text-xs font-medium text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              {t.reports.exportHtml}
            </button>

            <button
              type="button"
              onClick={() => handleExport('json')}
              className="px-3 py-1.5 text-xs font-medium text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileJson className="w-3.5 h-3.5" />
              {t.reports.exportJson}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#0F1E36] border border-[#0F1E36] hover:bg-slate-100 rounded-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              {t.reports.printBtn}
            </button>
          </div>

          {activeReport === 'ledger' && (
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={outageOnlyLedger}
                onChange={(e) => setOutageOnlyLedger(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span>{t.reports.outageOnlyToggle}</span>
            </label>
          )}
        </section>

        {exportNotice && (
          <p className="text-xs font-medium text-[#1967B2] px-1 no-print">{exportNotice}</p>
        )}

        {/* Printable Report Preview Sheet */}
        <section className="bg-white border border-slate-200 rounded-md p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {currentPayload.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {currentPayload.subtitle}
              </p>
            </div>
            <div className="text-end text-xs text-slate-600 font-mono tabular-nums" dir="ltr">
              <div>
                {config.businessDate} · {config.currency}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Gross: {formatMoney(summary.grossRevenue, config.currency)}
              </div>
            </div>
          </div>

          {currentPayload.metadata && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
              {Object.entries(currentPayload.metadata).map(([k, v]) => (
                <div key={k}>
                  <span className="text-slate-500 block text-[11px]">{k}</span>
                  <span className="font-semibold text-slate-900 font-mono tabular-nums">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border border-slate-200">
              <thead className="bg-[#1967B2] text-white">
                <tr>
                  {currentPayload.columns.map((col, idx) => (
                    <th
                      key={idx}
                      className="py-2.5 px-3 font-semibold text-start whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentPayload.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/70">
                    {row.map((cell, cIdx) => {
                      const isNumeric =
                        typeof cell === 'number' ||
                        /^[+-]?\d[\d,.]*%?$/.test(String(cell));
                      return (
                        <td
                          key={cIdx}
                          className={`py-2.5 px-3 ${
                            isNumeric ? 'font-mono tabular-nums' : ''
                          } ${cIdx === 0 ? 'font-medium text-slate-900' : 'text-slate-700'}`}
                          dir={isNumeric ? 'ltr' : undefined}
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Printable Sign-Off Footer */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-600">
            <div className="pt-6 border-t border-dashed border-slate-300 text-center">
              {t.reports.signOffAuditor}
            </div>
            <div className="pt-6 border-t border-dashed border-slate-300 text-center">
              {t.reports.signOffCashier}
            </div>
            <div className="pt-6 border-t border-dashed border-slate-300 text-center">
              {t.reports.signOffController}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
