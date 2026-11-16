import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  GitCompareArrows,
  Printer,
  RotateCcw,
  Upload,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TranslationDict } from '../i18n/translations';
import {
  AuditSummary,
  HotelConfig,
  KwentraSnapshot,
  ReconciliationStatus,
} from '../types/audit';
import {
  convertCurrency,
  formatMoney,
  getExchangeRates,
  parseCsvToEntries,
  roundMoney,
} from '../utils/auditEngine';

interface KwentraCompareProps {
  t: TranslationDict;
  config: HotelConfig;
  summary: AuditSummary;
  snapshot: KwentraSnapshot;
  currentAuditorName?: string;
  onUpdateSnapshot: (next: KwentraSnapshot) => void;
}

type EditableNumericField =
  | 'roomNet'
  | 'fbNet'
  | 'otherNet'
  | 'serviceCharge'
  | 'vatAndTaxes'
  | 'rebates'
  | 'paidOuts'
  | 'cash'
  | 'creditCard'
  | 'cityLedger'
  | 'roomCharge';

interface ComparisonRow {
  key: EditableNumericField | 'grossTotal';
  label: string;
  group: string;
  localVal: number;
  kwentraVal: number;
  editable: boolean;
}

function parseKwentraSummaryCsv(text: string): Partial<KwentraSnapshot> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Attempt JSON snapshot or entries array import
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<KwentraSnapshot> & {
        kwentraSnapshot?: Partial<KwentraSnapshot>;
      };
      const target = parsed.kwentraSnapshot ?? parsed;
      if (
        typeof target.roomNet === 'number' ||
        typeof target.fbNet === 'number' ||
        typeof target.cash === 'number'
      ) {
        return {
          ...(target.reportRef ? { reportRef: target.reportRef } : {}),
          ...(typeof target.roomNet === 'number' ? { roomNet: roundMoney(target.roomNet) } : {}),
          ...(typeof target.fbNet === 'number' ? { fbNet: roundMoney(target.fbNet) } : {}),
          ...(typeof target.otherNet === 'number' ? { otherNet: roundMoney(target.otherNet) } : {}),
          ...(typeof target.serviceCharge === 'number'
            ? { serviceCharge: roundMoney(target.serviceCharge) }
            : {}),
          ...(typeof target.vatAndTaxes === 'number'
            ? { vatAndTaxes: roundMoney(target.vatAndTaxes) }
            : {}),
          ...(typeof target.rebates === 'number' ? { rebates: roundMoney(target.rebates) } : {}),
          ...(typeof target.paidOuts === 'number' ? { paidOuts: roundMoney(target.paidOuts) } : {}),
          ...(typeof target.cash === 'number' ? { cash: roundMoney(target.cash) } : {}),
          ...(typeof target.creditCard === 'number'
            ? { creditCard: roundMoney(target.creditCard) }
            : {}),
          ...(typeof target.cityLedger === 'number'
            ? { cityLedger: roundMoney(target.cityLedger) }
            : {}),
          ...(typeof target.roomCharge === 'number'
            ? { roomCharge: roundMoney(target.roomCharge) }
            : {}),
          ...(target.note ? { note: target.note } : {}),
        };
      }
    } catch {
      // Fall through to CSV/TSV parser
    }
  }

  // Normalize tab-delimited Excel/TSV exports to CSV when tabs appear in header
  const firstLine = trimmed.split(/\r?\n/)[0] || '';
  const normalizedText =
    firstLine.includes('\t') && !firstLine.includes(',')
      ? trimmed.replace(/\t/g, ',')
      : trimmed;

  const lines = normalizedText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  // First attempt: standard transaction-level CSV
  const parsedEntries = parseCsvToEntries(normalizedText);
  if (parsedEntries.length > 0) {
    let roomNet = 0;
    let fbNet = 0;
    let otherNet = 0;
    let serviceCharge = 0;
    let vatAndTaxes = 0;
    let rebates = 0;
    let paidOuts = 0;
    let cash = 0;
    let creditCard = 0;
    let cityLedger = 0;
    let roomCharge = 0;

    for (const e of parsedEntries) {
      if (e.category === 'Room') roomNet += e.netAmount;
      else if (e.category === 'FoodBeverage') fbNet += e.netAmount;
      else if (e.category === 'OtherRevenue' || e.category === 'Adjustment')
        otherNet += e.netAmount;
      else if (e.category === 'Rebate') rebates += e.netAmount;
      else if (e.category === 'PaidOut') paidOuts += e.netAmount;

      serviceCharge += e.serviceCharge;
      vatAndTaxes += e.vatAmount + (e.cityTaxAmount ?? 0);

      if (e.category !== 'Rebate' && e.category !== 'PaidOut') {
        if (e.paymentMethod === 'Cash') cash += e.grossAmount;
        else if (e.paymentMethod === 'CreditCard') creditCard += e.grossAmount;
        else if (e.paymentMethod === 'CityLedger') cityLedger += e.grossAmount;
        else if (e.paymentMethod === 'RoomCharge') roomCharge += e.grossAmount;
      } else if (e.category === 'PaidOut' && e.paymentMethod === 'Cash') {
        cash -= e.grossAmount;
      }
    }

    return {
      roomNet: roundMoney(roomNet),
      fbNet: roundMoney(fbNet),
      otherNet: roundMoney(otherNet),
      serviceCharge: roundMoney(serviceCharge),
      vatAndTaxes: roundMoney(vatAndTaxes),
      rebates: roundMoney(rebates),
      paidOuts: roundMoney(paidOuts),
      cash: roundMoney(cash),
      creditCard: roundMoney(creditCard),
      cityLedger: roundMoney(cityLedger),
      roomCharge: roundMoney(roomCharge),
    };
  }

  // Fallback: 2-column summary CSV exported from Manager Flash / Excel
  const result: Partial<KwentraSnapshot> = {};
  let matchedCount = 0;

  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map((p) => p.replace(/^"|"$/g, '').trim());
    if (parts.length < 2) continue;
    const label = parts[0].toLowerCase();
    const numStr = parts[parts.length - 1].replace(/[^0-9.-]/g, '');
    const val = parseFloat(numStr);
    if (Number.isNaN(val)) continue;

    if (label.includes('room charge') || label.includes('ترحيل')) {
      result.roomCharge = val;
      matchedCount += 1;
    } else if (label.includes('room') || label.includes('غرف')) {
      result.roomNet = val;
      matchedCount += 1;
    } else if (label.includes('f&b') || label.includes('food') || label.includes('مطاعم') || label.includes('أغذية')) {
      result.fbNet = val;
      matchedCount += 1;
    } else if (label.includes('other') || label.includes('spa') || label.includes('أخرى')) {
      result.otherNet = val;
      matchedCount += 1;
    } else if (label.includes('service') || label.includes('خدمة')) {
      result.serviceCharge = val;
      matchedCount += 1;
    } else if (label.includes('vat') || label.includes('tax') || label.includes('ضريبة')) {
      result.vatAndTaxes = val;
      matchedCount += 1;
    } else if (label.includes('rebate') || label.includes('allowance') || label.includes('خصم')) {
      result.rebates = val;
      matchedCount += 1;
    } else if (label.includes('paid out') || label.includes('نثري')) {
      result.paidOuts = val;
      matchedCount += 1;
    } else if (label.includes('cash') || label.includes('نقد')) {
      result.cash = val;
      matchedCount += 1;
    } else if (label.includes('card') || label.includes('edc') || label.includes('visa') || label.includes('بطاق')) {
      result.creditCard = val;
      matchedCount += 1;
    } else if (label.includes('city') || label.includes('ledger') || label.includes('ذمم') || label.includes('شركات')) {
      result.cityLedger = val;
      matchedCount += 1;
    }
  }

  return matchedCount > 0 ? result : null;
}

export const KwentraCompare: React.FC<KwentraCompareProps> = ({
  t,
  config,
  summary,
  snapshot,
  currentAuditorName = 'Income Auditor',
  onUpdateSnapshot,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importMessage, setImportMessage] = useState<string>('');
  const [showDiffsOnly, setShowDiffsOnly] = useState(false);

  const localVatAndCity = roundMoney(summary.totalVat + summary.totalCityTax);
  const localTaxesTotal = roundMoney(summary.totalServiceCharge + localVatAndCity);
  const kwentraGrossTotal = roundMoney(
    snapshot.roomNet +
      snapshot.fbNet +
      snapshot.otherNet +
      snapshot.serviceCharge +
      snapshot.vatAndTaxes
  );

  const rows: ComparisonRow[] = useMemo(
    () => [
      {
        key: 'roomNet',
        label: t.kwentraCompare.rows.roomNet,
        group: t.kwentraCompare.groupRevenue,
        localVal: summary.roomNet,
        kwentraVal: snapshot.roomNet,
        editable: true,
      },
      {
        key: 'fbNet',
        label: t.kwentraCompare.rows.fbNet,
        group: t.kwentraCompare.groupRevenue,
        localVal: summary.fbNet,
        kwentraVal: snapshot.fbNet,
        editable: true,
      },
      {
        key: 'otherNet',
        label: t.kwentraCompare.rows.otherNet,
        group: t.kwentraCompare.groupRevenue,
        localVal: summary.otherNet,
        kwentraVal: snapshot.otherNet,
        editable: true,
      },
      {
        key: 'serviceCharge',
        label: t.kwentraCompare.rows.serviceCharge,
        group: t.kwentraCompare.groupRevenue,
        localVal: summary.totalServiceCharge,
        kwentraVal: snapshot.serviceCharge,
        editable: true,
      },
      {
        key: 'vatAndTaxes',
        label: t.kwentraCompare.rows.vatAndTaxes,
        group: t.kwentraCompare.groupRevenue,
        localVal: localVatAndCity,
        kwentraVal: snapshot.vatAndTaxes,
        editable: true,
      },
      {
        key: 'grossTotal',
        label: t.kwentraCompare.rows.grossTotal,
        group: t.kwentraCompare.groupRevenue,
        localVal: summary.grossRevenue,
        kwentraVal: kwentraGrossTotal,
        editable: false,
      },
      {
        key: 'rebates',
        label: t.kwentraCompare.rows.rebates,
        group: t.kwentraCompare.groupDeductions,
        localVal: summary.totalRebates,
        kwentraVal: snapshot.rebates,
        editable: true,
      },
      {
        key: 'paidOuts',
        label: t.kwentraCompare.rows.paidOuts,
        group: t.kwentraCompare.groupDeductions,
        localVal: summary.totalPaidOuts,
        kwentraVal: snapshot.paidOuts,
        editable: true,
      },
      {
        key: 'cash',
        label: t.kwentraCompare.rows.cash,
        group: t.kwentraCompare.groupSettlement,
        localVal: summary.expectedCash,
        kwentraVal: snapshot.cash,
        editable: true,
      },
      {
        key: 'creditCard',
        label: t.kwentraCompare.rows.creditCard,
        group: t.kwentraCompare.groupSettlement,
        localVal: summary.expectedCreditCard,
        kwentraVal: snapshot.creditCard,
        editable: true,
      },
      {
        key: 'cityLedger',
        label: t.kwentraCompare.rows.cityLedger,
        group: t.kwentraCompare.groupSettlement,
        localVal: summary.expectedCityLedger,
        kwentraVal: snapshot.cityLedger,
        editable: true,
      },
      {
        key: 'roomCharge',
        label: t.kwentraCompare.rows.roomCharge,
        group: t.kwentraCompare.groupSettlement,
        localVal: summary.roomChargeTransfers,
        kwentraVal: snapshot.roomCharge,
        editable: true,
      },
    ],
    [t, summary, snapshot, kwentraGrossTotal]
  );

  const tolerance = Math.max(0.01, config.cashVarianceTolerance > 0 ? 0.5 : 0.01);

  const editableRows = rows.filter((r) => r.editable);
  const matchedLinesCount = editableRows.filter(
    (r) => Math.abs(r.localVal - r.kwentraVal) <= tolerance
  ).length;
  const matchPercentage = Math.round((matchedLinesCount / editableRows.length) * 100);

  const grossDiff = Number((summary.grossRevenue - kwentraGrossTotal).toFixed(2));
  const isGrossMatched = Math.abs(grossDiff) <= tolerance;

  const topVarianceRow = useMemo(() => {
    let best: ComparisonRow | null = null;
    let maxAbs = 0;
    for (const r of editableRows) {
      const diffAbs = Math.abs(r.localVal - r.kwentraVal);
      if (diffAbs > tolerance && diffAbs > maxAbs) {
        maxAbs = diffAbs;
        best = r;
      }
    }
    return best;
  }, [editableRows, tolerance]);

  const visibleRows = showDiffsOnly
    ? rows.filter((r) => Math.abs(r.localVal - r.kwentraVal) > tolerance)
    : rows;

  const chartData = useMemo(
    () => [
      {
        name: 'Rooms',
        local: Number(summary.roomNet.toFixed(2)),
        kwentra: Number(snapshot.roomNet.toFixed(2)),
      },
      {
        name: 'F&B',
        local: Number(summary.fbNet.toFixed(2)),
        kwentra: Number(snapshot.fbNet.toFixed(2)),
      },
      {
        name: 'Svc & Tax',
        local: localTaxesTotal,
        kwentra: Number((snapshot.serviceCharge + snapshot.vatAndTaxes).toFixed(2)),
      },
      {
        name: 'Cash',
        local: Number(summary.expectedCash.toFixed(2)),
        kwentra: Number(snapshot.cash.toFixed(2)),
      },
      {
        name: 'Card (EDC)',
        local: Number(summary.expectedCreditCard.toFixed(2)),
        kwentra: Number(snapshot.creditCard.toFixed(2)),
      },
      {
        name: 'City Ledger',
        local: Number(summary.expectedCityLedger.toFixed(2)),
        kwentra: Number(snapshot.cityLedger.toFixed(2)),
      },
    ],
    [summary, snapshot, localTaxesTotal]
  );

  const handleFieldChange = (field: EditableNumericField, raw: string) => {
    const num = raw === '' ? 0 : parseFloat(raw);
    onUpdateSnapshot({
      ...snapshot,
      [field]: Number.isNaN(num) ? 0 : num,
      lastUpdated: new Date().toTimeString().slice(0, 5),
    });
  };

  const handleCopyLocalBaseline = () => {
    onUpdateSnapshot({
      ...snapshot,
      lastUpdated: new Date().toTimeString().slice(0, 5),
      roomNet: Number(summary.roomNet.toFixed(2)),
      fbNet: Number(summary.fbNet.toFixed(2)),
      otherNet: Number(summary.otherNet.toFixed(2)),
      serviceCharge: Number(summary.totalServiceCharge.toFixed(2)),
      vatAndTaxes: Number(summary.totalVat.toFixed(2)),
      rebates: Number(summary.totalRebates.toFixed(2)),
      paidOuts: Number(summary.totalPaidOuts.toFixed(2)),
      cash: Number(summary.expectedCash.toFixed(2)),
      creditCard: Number(summary.expectedCreditCard.toFixed(2)),
      cityLedger: Number(summary.expectedCityLedger.toFixed(2)),
      roomCharge: Number(summary.roomChargeTransfers.toFixed(2)),
    });
  };

  const handleZeroOutKwentra = () => {
    onUpdateSnapshot({
      ...snapshot,
      lastUpdated: new Date().toTimeString().slice(0, 5),
      roomNet: 0,
      fbNet: 0,
      otherNet: 0,
      serviceCharge: 0,
      vatAndTaxes: 0,
      rebates: 0,
      paidOuts: 0,
      cash: 0,
      creditCard: 0,
      cityLedger: 0,
      roomCharge: 0,
    });
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const extracted = parseKwentraSummaryCsv(text);
    if (!extracted) {
      setImportMessage(t.kwentraCompare.importError);
    } else {
      onUpdateSnapshot({
        ...snapshot,
        ...extracted,
        lastUpdated: new Date().toTimeString().slice(0, 5),
      });
      setImportMessage(`${t.kwentraCompare.importSuccess} ${file.name}`);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar & Reference Metadata */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0F1E36] text-white flex items-center justify-center shrink-0">
              <GitCompareArrows className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t.kwentraCompare.title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                {t.kwentraCompare.subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,.json,text/csv,application/json"
              onChange={handleCsvUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              {t.kwentraCompare.importCsvBtn}
            </button>
            <button
              type="button"
              onClick={handleCopyLocalBaseline}
              className="px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5" />
              {t.kwentraCompare.copyLocalBtn}
            </button>
            <button
              type="button"
              onClick={handleZeroOutKwentra}
              className="px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t.kwentraCompare.zeroOutBtn}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              {t.kwentraCompare.printBtn}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 pt-3 border-t border-slate-100 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {t.kwentraCompare.reportRefLabel}
            </label>
            <input
              type="text"
              value={snapshot.reportRef}
              onChange={(e) =>
                onUpdateSnapshot({ ...snapshot, reportRef: e.target.value })
              }
              className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {t.kwentraCompare.lastUpdatedLabel}
            </label>
            <input
              type="text"
              value={snapshot.lastUpdated}
              onChange={(e) =>
                onUpdateSnapshot({ ...snapshot, lastUpdated: e.target.value })
              }
              className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {t.dir === 'rtl' ? 'حالة الفحص والتحقق' : 'Investigation Status'}
            </label>
            <select
              value={snapshot.investigationStatus ?? 'Pending'}
              onChange={(e) =>
                onUpdateSnapshot({
                  ...snapshot,
                  investigationStatus: e.target.value as ReconciliationStatus,
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="Pending">Pending</option>
              <option value="Investigating">Investigating</option>
              <option value="Resolved">Resolved</option>
              <option value="Approved">Approved</option>
            </select>
          </div>
          <div>
            <button
              type="button"
              onClick={() =>
                onUpdateSnapshot({
                  ...snapshot,
                  investigationStatus: 'Approved',
                  approvedBy: currentAuditorName,
                })
              }
              className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.dir === 'rtl' ? 'اعتماد المطابقة' : 'Approve Match'}</span>
            </button>
          </div>
          <div className="sm:col-span-2 flex items-center justify-between gap-2">
            {importMessage ? (
              <p className="text-xs font-medium text-blue-700 pb-1.5">{importMessage}</p>
            ) : (
              <p className="text-xs text-slate-500 pb-1.5">
                {config.hotelName} · <span className="font-mono">{config.businessDate}</span> ({config.currency})
                {snapshot.approvedBy ? ` · Signed by ${snapshot.approvedBy}` : ''}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* KPI & Match Rate Infographic Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {t.kwentraCompare.kpiLocalGross}
          </p>
          <p
            className="text-2xl font-bold text-blue-600 mt-1.5 tabular-nums font-mono"
            dir="ltr"
          >
            {formatMoney(summary.grossRevenue, config.currency)}
          </p>
          <p className="mt-1.5 text-[11px] font-mono text-slate-500 tabular-nums" dir="ltr">
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

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {t.kwentraCompare.kpiKwentraGross}
          </p>
          <p
            className="text-2xl font-bold text-[#0F1E36] mt-1.5 tabular-nums font-mono"
            dir="ltr"
          >
            {formatMoney(kwentraGrossTotal, config.currency)}
          </p>
          <p className="mt-1.5 text-[11px] font-mono text-slate-500 tabular-nums" dir="ltr">
            {(['EGP', 'USD', 'EUR'] as const)
              .filter((c) => c !== config.currency)
              .map((target) => {
                const rates = getExchangeRates(config);
                return formatMoney(
                  convertCurrency(kwentraGrossTotal, config.currency, target, rates),
                  target
                );
              })
              .join(' · ')}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {t.kwentraCompare.kpiNetDiff}
          </p>
          <p
            className={`text-2xl font-bold mt-1.5 tabular-nums font-mono ${
              isGrossMatched ? 'text-emerald-700' : 'text-red-700'
            }`}
            dir="ltr"
          >
            {grossDiff > 0 ? `+${grossDiff.toFixed(2)}` : grossDiff.toFixed(2)}{' '}
            {config.currency}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            {isGrossMatched ? t.kwentraCompare.kpiMatched : t.kwentraCompare.kpiHasDiff}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">
              {t.kwentraCompare.kpiMatchRate}
            </p>
            <span className="text-xs font-bold font-mono tabular-nums text-slate-900">
              {matchPercentage}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-md overflow-hidden mt-2.5">
            <div
              className={`h-full transition-all ${
                matchPercentage === 100
                  ? 'bg-emerald-600'
                  : matchPercentage >= 70
                    ? 'bg-blue-600'
                    : 'bg-amber-600'
              }`}
              style={{ width: `${matchPercentage}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            <span className="font-mono tabular-nums font-semibold text-slate-800">
              {matchedLinesCount}
            </span>{' '}
            {t.kwentraCompare.kpiLinesMatched}{' '}
            <span className="font-mono tabular-nums">{editableRows.length}</span>
            {topVarianceRow
              ? ` · ${t.kwentraCompare.kpiTopDriver} ${topVarianceRow.label}`
              : ` · ${t.kwentraCompare.kpiNoDriver}`}
          </p>
        </div>
      </section>

      {/* Side-by-Side Visual Bar Chart */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {t.kwentraCompare.chartTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.kwentraCompare.chartSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />
              {t.kwentraCompare.seriesLocal}
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <span className="w-3 h-3 rounded-sm bg-[#0F1E36] inline-block" />
              {t.kwentraCompare.seriesKwentra}
            </span>
          </div>
        </div>

        <div className="p-5 h-[280px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#475569' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
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
                formatter={(value: unknown, name: unknown) => [
                  formatMoney(Number(value) || 0, config.currency),
                  name === 'local'
                    ? t.kwentraCompare.seriesLocal
                    : t.kwentraCompare.seriesKwentra,
                ]}
              />
              <Legend
                formatter={(value) =>
                  value === 'local'
                    ? t.kwentraCompare.seriesLocal
                    : t.kwentraCompare.seriesKwentra
                }
              />
              <Bar dataKey="local" name="local" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="kwentra" name="kwentra" fill="#0F1E36" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Editable Side-by-Side Reconciliation Matrix */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {t.kwentraCompare.matrixTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.kwentraCompare.matrixSubtitle}
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 no-print">
            <button
              type="button"
              onClick={() => setShowDiffsOnly(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                !showDiffsOnly
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.kwentraCompare.filterAll}
            </button>
            <button
              type="button"
              onClick={() => setShowDiffsOnly(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                showDiffsOnly
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.kwentraCompare.filterDiffsOnly}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold text-start">{t.kwentraCompare.colItem}</th>
                <th className="py-3 px-4 font-semibold text-start">{t.kwentraCompare.colGroup}</th>
                <th className="py-3 px-4 font-semibold text-end">{t.kwentraCompare.colLocal}</th>
                <th className="py-3 px-4 font-semibold text-end">{t.kwentraCompare.colKwentra}</th>
                <th className="py-3 px-4 font-semibold text-end">{t.kwentraCompare.colVariance}</th>
                <th className="py-3 px-4 font-semibold text-end">{t.kwentraCompare.colPct}</th>
                <th className="py-3 px-4 font-semibold text-start">{t.kwentraCompare.colStatus}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visibleRows.map((row) => {
                const diff = Number((row.localVal - row.kwentraVal).toFixed(2));
                const isMatched = Math.abs(diff) <= tolerance;
                const pct =
                  row.kwentraVal !== 0
                    ? ((diff / Math.abs(row.kwentraVal)) * 100).toFixed(1)
                    : row.localVal !== 0
                      ? '100.0'
                      : '0.0';
                const isGrossRow = row.key === 'grossTotal';

                return (
                  <tr
                    key={row.key}
                    className={
                      isGrossRow
                        ? 'bg-slate-50/90 font-semibold'
                        : !isMatched
                          ? 'bg-amber-50/40 hover:bg-amber-50/70'
                          : 'hover:bg-slate-50/70'
                    }
                  >
                    <td className="py-2.5 px-4 text-slate-900 font-medium">{row.label}</td>
                    <td className="py-2.5 px-4 text-slate-500">{row.group}</td>
                    <td
                      className="py-2.5 px-4 font-mono tabular-nums text-end text-blue-700 font-medium"
                      dir="ltr"
                    >
                      {row.localVal.toFixed(2)}
                    </td>
                    <td className="py-2 px-4 text-end">
                      {row.editable ? (
                        <input
                          type="number"
                          step="0.01"
                          value={snapshot[row.key as EditableNumericField]}
                          onChange={(e) =>
                            handleFieldChange(
                              row.key as EditableNumericField,
                              e.target.value
                            )
                          }
                          className="w-32 px-2.5 py-1 text-xs font-mono tabular-nums text-end border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                          dir="ltr"
                        />
                      ) : (
                        <span
                          className="font-mono tabular-nums text-slate-900 font-semibold px-2.5"
                          dir="ltr"
                        >
                          {row.kwentraVal.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 px-4 font-mono tabular-nums text-end font-semibold ${
                        isMatched
                          ? 'text-emerald-700'
                          : diff > 0
                            ? 'text-blue-700'
                            : 'text-red-700'
                      }`}
                      dir="ltr"
                    >
                      {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                    </td>
                    <td
                      className="py-2.5 px-4 font-mono tabular-nums text-end text-slate-600"
                      dir="ltr"
                    >
                      {isMatched ? '0.0%' : `${Number(pct) > 0 ? '+' : ''}${pct}%`}
                    </td>
                    <td className="py-2.5 px-4">
                      {isMatched ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          {t.kwentraCompare.statusMatch}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            diff > 0 ? 'text-amber-700' : 'text-red-700'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          {diff > 0
                            ? t.kwentraCompare.statusOver
                            : t.kwentraCompare.statusShort}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Reconciliation Note */}
        <div className="p-5 border-t border-slate-200 bg-slate-50/50">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            {t.kwentraCompare.noteLabel}
          </label>
          <textarea
            rows={2}
            value={snapshot.note}
            onChange={(e) =>
              onUpdateSnapshot({ ...snapshot, note: e.target.value })
            }
            placeholder={t.kwentraCompare.notePlaceholder}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </section>
    </div>
  );
};
