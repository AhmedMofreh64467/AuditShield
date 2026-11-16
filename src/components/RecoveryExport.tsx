import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Upload,
} from 'lucide-react';
import { TranslationDict } from '../i18n/translations';
import {
  AuditSummary,
  CashSettlement,
  HotelConfig,
  LedgerEntry,
} from '../types/audit';
import {
  downloadTextFile,
  entriesToCsv,
  formatMoney,
  parseCsvToEntries,
} from '../utils/auditEngine';

interface RecoveryExportProps {
  t: TranslationDict;
  config: HotelConfig;
  entries: LedgerEntry[];
  summary: AuditSummary;
  settlement: CashSettlement;
  hotelRoomsCount?: number;
  archivedCount?: number;
  onImportEntries: (imported: LedgerEntry[], replaceExisting: boolean) => void;
  onResetSampleData: () => void;
  onExportJsonBackup?: () => void;
  onImportJsonBackup?: (jsonText: string) => boolean;
}

export const RecoveryExport: React.FC<RecoveryExportProps> = ({
  t,
  config,
  entries,
  summary,
  settlement,
  hotelRoomsCount = 0,
  archivedCount = 0,
  onImportEntries,
  onResetSampleData,
  onExportJsonBackup,
  onImportJsonBackup,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);

  const outageEntries = entries.filter((e) => e.source === 'OutageBackup');

  const handleExportSafePs1 = () => {
    const script = [
      `# AuditShield Safe Append-Only Outage Capture Script (${config.hotelName})`,
      `# Business Date: ${config.businessDate} | ZERO-DELETE SAFE MODE`,
      `$ErrorActionPreference = 'Stop'`,
      `$OutFile = Join-Path $PSScriptRoot "OutageCapture_${config.businessDate}.csv"`,
      `if (-not (Test-Path $OutFile)) {`,
      `  "ID,Timestamp,Source,Category,OutletOrDept,ReferenceNo,Description,NetAmount,ServiceCharge,VatAmount,GrossAmount,PaymentMethod,ApprovedBy,Reconciled" | Out-File -FilePath $OutFile -Encoding UTF8`,
      `}`,
      `$Id = "ps-$(Get-Date -Format 'HHmmss')"`,
      `$Time = Get-Date -Format "HH:mm"`,
      `$Ref = Read-Host "Room / Check Reference"`,
      `$Desc = Read-Host "Guest / Description"`,
      `$Net = [double](Read-Host "Net Amount (${config.currency})")`,
      `$Pay = Read-Host "Payment Method (Cash / CreditCard / CityLedger / RoomCharge)"`,
      `$Svc = [Math]::Round($Net * (${config.serviceChargePct} / 100), 2)`,
      `$Vat = [Math]::Round(($Net + $Svc) * (${config.vatPct} / 100), 2)`,
      `$Gross = [Math]::Round($Net + $Svc + $Vat, 2)`,
      `$Row = "$Id,$Time,OutageBackup,Room,Front Office (PS),$Ref,$Desc,$Net,$Svc,$Vat,$Gross,$Pay,${settlement.generalCashierName || 'Cashier'},false"`,
      `Add-Content -Path $OutFile -Value $Row -Encoding UTF8`,
      `Write-Host "Appended safely to $OutFile (Zero-Delete Policy)." -ForegroundColor Green`,
    ].join('\r\n');
    downloadTextFile(`AuditShield_SafeCapture_${config.businessDate}.ps1`, script, false);
  };

  const handleJsonRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportJsonBackup) return;
    const text = await file.text();
    const ok = onImportJsonBackup(text);
    setImportStatus(
      ok
        ? t.dir === 'rtl'
          ? `تمت استعادة النسخة الاحتياطية بنجاح (${file.name}).`
          : `JSON Backup restored cleanly (${file.name}).`
        : t.recovery.importFailMsg
    );
    e.target.value = '';
  };

  const handleExportFullLedger = () => {
    const csv = entriesToCsv(entries);
    downloadTextFile(`AuditLedger_${config.businessDate}.csv`, csv, true);
  };

  const handleExportRecoveryOnly = () => {
    const csv = entriesToCsv(outageEntries);
    downloadTextFile(`PMS_Recovery_Postings_${config.businessDate}.csv`, csv, true);
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsvToEntries(text);
    if (parsed.length === 0) {
      setImportStatus(t.recovery.importFailMsg);
    } else {
      onImportEntries(parsed, false);
      setImportStatus(`${t.recovery.importOkPrefix} ${parsed.length} (${file.name})`);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Sync & Recovery Controls */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden no-print">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t.recovery.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.recovery.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              {t.actions.printReport}
            </button>

            {confirmReset ? (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                <span className="text-xs text-red-800">{t.actions.confirmReset}</span>
                <button
                  type="button"
                  onClick={() => {
                    onResetSampleData();
                    setConfirmReset(false);
                    setImportStatus(t.recovery.resetDoneMsg);
                  }}
                  className="px-2 py-0.5 text-xs font-semibold bg-red-600 text-white rounded"
                >
                  {t.actions.yes}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2 py-0.5 text-xs text-slate-600"
                >
                  {t.actions.cancel}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t.actions.resetSample}
              </button>
            )}
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-slate-200 rounded-lg flex flex-col justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{t.recovery.card1Title}</p>
              <p className="text-xs text-slate-600 mt-1">
                {t.recovery.card1Desc} (
                <span className="font-mono">AuditLedger_{config.businessDate}.csv</span>)
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportFullLedger}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {t.recovery.card1Btn} ({entries.length} {t.entriesUnit})
            </button>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg flex flex-col justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{t.recovery.card2Title}</p>
              <p className="text-xs text-slate-600 mt-1">
                {t.recovery.card2Desc}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportRecoveryOnly}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0F1E36] hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {t.recovery.card2Btn} ({outageEntries.length} {t.entriesUnit})
            </button>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg flex flex-col justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{t.recovery.card3Title}</p>
              <p className="text-xs text-slate-600 mt-1">
                {t.recovery.card3Desc}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 text-xs font-semibold text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              {t.recovery.card3Btn}
            </button>
          </div>
        </div>

        {importStatus && (
          <div className="px-5 pb-4 text-xs font-medium text-blue-700">{importStatus}</div>
        )}

        {/* Safe PowerShell Capture + Backup Verification */}
        <div className="px-5 pb-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Terminal className="w-4 h-4 text-[#0088CC]" />
                <span>
                  {t.dir === 'rtl'
                    ? 'مولد سكريبت الطوارئ الآمن (PowerShell Append-Only)'
                    : 'Safe Outage Capture Script (Append-Only PowerShell)'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {t.dir === 'rtl'
                  ? 'سكريبت سطح مكتب محلي لتسجيل حركات الكاشير في CSV عند انقطاع النظام والشبكة — يستخدم Add-Content بدون أي أوامر حذف.'
                  : 'Local Windows desktop fallback script that appends cashier entries directly to CSV during full network outage — strictly append-only.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportSafePs1}
              className="self-start px-3.5 py-2 text-xs font-semibold text-white bg-[#0088CC] hover:bg-[#0070AA] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {t.dir === 'rtl' ? 'تحميل AuditShield_SafeCapture.ps1' : 'Download SafeCapture.ps1'}
              </span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>
                  {t.dir === 'rtl'
                    ? 'التحقق من سلامة النسخ الاحتياطي (Zero-Delete Integrity)'
                    : 'Backup Verification & JSON Recovery'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-mono text-slate-700" dir="ltr">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Rooms: {hotelRoomsCount}
                </span>
                <span>Entries: {entries.length}</span>
                <span>Archived: {archivedCount}</span>
                <span className={summary.duplicateEntryIds?.length ? 'text-amber-700 font-bold' : ''}>
                  Duplicates: {summary.duplicateEntryIds?.length ?? 0}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onExportJsonBackup && (
                <button
                  type="button"
                  onClick={onExportJsonBackup}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.dir === 'rtl' ? 'نسخة JSON كاملة' : 'Download JSON Backup'}</span>
                </button>
              )}
              {onImportJsonBackup && (
                <>
                  <input
                    ref={jsonInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleJsonRestoreFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => jsonInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{t.dir === 'rtl' ? 'استعادة JSON' : 'Restore JSON'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Printable Executive Income Audit Report */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="border-b border-slate-200 pb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {t.recovery.reportTitle} — {config.hotelName}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {t.recovery.businessDateLabel}: <span className="font-mono">{config.businessDate}</span> ·{' '}
              {t.recovery.auditorLabel}: {settlement.generalCashierName}
            </p>
          </div>
          <div className="text-end text-xs text-slate-600 tabular-nums font-mono" dir="ltr">
            Gross Revenue: {formatMoney(summary.grossRevenue, config.currency)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-2">
              {t.recovery.revBreakdownTitle}
            </h3>
            <table className="w-full text-xs border border-slate-200">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2 px-3 text-slate-700">{t.recovery.roomNet}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-end font-medium" dir="ltr">
                    {formatMoney(summary.roomNet, config.currency)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-700">{t.recovery.fbNet}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-end font-medium" dir="ltr">
                    {formatMoney(summary.fbNet, config.currency)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-700">{t.recovery.otherNet}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-end font-medium" dir="ltr">
                    {formatMoney(summary.otherNet, config.currency)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-700">
                    {t.recovery.svcAndVat} ({config.serviceChargePct}% + {config.vatPct}%)
                  </td>
                  <td className="py-2 px-3 font-mono tabular-nums text-end font-medium" dir="ltr">
                    {formatMoney(summary.totalServiceCharge + summary.totalVat, config.currency)}
                  </td>
                </tr>
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-2 px-3 text-slate-900">{t.recovery.totalGross}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-end text-slate-900" dir="ltr">
                    {formatMoney(summary.grossRevenue, config.currency)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-red-700">{t.recovery.totalRebates}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-end text-red-700" dir="ltr">
                    -{formatMoney(summary.totalRebates, config.currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-2">
              {t.recovery.settlementSummaryTitle}
            </h3>
            <table className="w-full text-xs border border-slate-200">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2 px-3 text-slate-700">{t.recovery.cashExpAct}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-end" dir="ltr">
                    {summary.expectedCash.toFixed(2)} / {settlement.actualCashDrop.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-700">{t.recovery.cardExpAct}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-end" dir="ltr">
                    {summary.expectedCreditCard.toFixed(2)} / {settlement.actualEdcBatch.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-700">{t.recovery.clExpAct}</td>
                  <td className="py-2 px-3 font-mono tabular-nums text-end" dir="ltr">
                    {summary.expectedCityLedger.toFixed(2)} / {settlement.actualCityLedgerSigned.toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-2 px-3 text-slate-900">{t.recovery.netVariance}</td>
                  <td
                    className={`py-2 px-3 font-mono tabular-nums text-end ${
                      Math.abs(summary.totalVariance) <= config.cashVarianceTolerance
                        ? 'text-emerald-700'
                        : 'text-red-700'
                    }`}
                    dir="ltr"
                  >
                    {formatMoney(summary.totalVariance, config.currency)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-700">{t.recovery.shiftNote}</td>
                  <td className="py-2 px-3 text-slate-600">{settlement.shiftNote}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
