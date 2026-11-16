import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Lock,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { TranslationDict } from '../i18n/translations';
import {
  AuditSummary,
  CurrencyCode,
  EntryCategory,
  EntrySource,
  HotelConfig,
  HotelRoom,
  LedgerEntry,
  MealPlan,
  PaymentMethod,
} from '../types/audit';
import {
  calculateTaxes,
  computePackageSplit,
  convertCurrency,
  detectDuplicateEntries,
  formatMoney,
  getExchangeRates,
  roundMoney,
} from '../utils/auditEngine';

interface OutageLedgerProps {
  t: TranslationDict;
  config: HotelConfig;
  entries: LedgerEntry[];
  summary: AuditSummary;
  dayLocked?: boolean;
  hotelRooms?: HotelRoom[];
  currentCashierName?: string;
  onAddEntry: (entry: LedgerEntry) => void;
  onToggleReconciled: (id: string) => void;
  onApproveEntry: (id: string, approverName: string) => void;
  onDeleteEntry: (id: string) => void;
}

export const OutageLedger: React.FC<OutageLedgerProps> = ({
  t,
  config,
  entries,
  summary,
  dayLocked = false,
  hotelRooms = [],
  currentCashierName = '',
  onAddEntry,
  onToggleReconciled,
  onApproveEntry,
  onDeleteEntry,
}) => {
  const [sourceFilter, setSourceFilter] = useState<'ALL' | EntrySource>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | EntryCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [source, setSource] = useState<EntrySource>('OutageBackup');
  const [category, setCategory] = useState<EntryCategory>('Room');
  const [outletOrDept, setOutletOrDept] = useState('Front Office (Outage)');
  const [referenceNo, setReferenceNo] = useState('');
  const [guestOrDescription, setGuestOrDescription] = useState('');
  const [netAmountStr, setNetAmountStr] = useState('');
  const [entryCurrency, setEntryCurrency] = useState<CurrencyCode>(config.currency);
  const [mealPlan, setMealPlan] = useState<MealPlan>('BB');
  const [paxCount, setPaxCount] = useState(2);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashierName, setCashierName] = useState(currentCashierName);
  const [approvedBy, setApprovedBy] = useState('');

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approverInput, setApproverInput] = useState('');
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<string | null>(null);

  useEffect(() => {
    setEntryCurrency(config.currency);
  }, [config.propertyId, config.currency]);

  const rates = useMemo(() => getExchangeRates(config), [config]);
  const rawInputNet = parseFloat(netAmountStr) || 0;
  const convertedNetAmount = useMemo(
    () => convertCurrency(rawInputNet, entryCurrency, config.currency, rates),
    [rawInputNet, entryCurrency, config.currency, rates]
  );
  const egpNetEquivalent = useMemo(
    () => convertCurrency(rawInputNet, entryCurrency, 'EGP', rates),
    [rawInputNet, entryCurrency, rates]
  );

  const liveTaxPreview = useMemo(
    () => calculateTaxes(convertedNetAmount, category, config),
    [convertedNetAmount, category, config]
  );

  const livePackageSplit = useMemo(
    () =>
      category === 'Room'
        ? computePackageSplit(mealPlan, paxCount, liveTaxPreview.netAmount, config)
        : 0,
    [category, mealPlan, paxCount, liveTaxPreview.netAmount, config]
  );

  const potentialDuplicate = useMemo(() => {
    if (!referenceNo.trim() || rawInputNet <= 0) return false;
    const candidate: LedgerEntry = {
      id: 'candidate',
      timestamp: '00:00',
      source,
      category,
      outletOrDept: outletOrDept.trim() || 'Front Office',
      referenceNo: referenceNo.trim(),
      guestOrDescription: guestOrDescription.trim(),
      netAmount: liveTaxPreview.netAmount,
      serviceCharge: liveTaxPreview.serviceCharge,
      vatAmount: liveTaxPreview.vatAmount,
      cityTaxAmount: liveTaxPreview.cityTaxAmount,
      grossAmount: liveTaxPreview.grossAmount,
      paymentMethod,
      approvedBy: approvedBy.trim(),
      reconciled: false,
    };
    return detectDuplicateEntries([...entries, candidate]).includes('candidate');
  }, [
    referenceNo,
    rawInputNet,
    source,
    category,
    outletOrDept,
    guestOrDescription,
    liveTaxPreview,
    paymentMethod,
    approvedBy,
    entries,
  ]);

  const handleCategoryChange = (nextCat: EntryCategory) => {
    setCategory(nextCat);
    if (nextCat === 'FoodBeverage') {
      setOutletOrDept(config.outlets[0] || 'Main Restaurant');
    } else if (nextCat === 'OtherRevenue') {
      setOutletOrDept('Spa & Laundry');
    } else if (nextCat === 'Deposit' || nextCat === 'Payment') {
      setOutletOrDept('Front Office Cashier');
    } else {
      setOutletOrDept(source === 'OutageBackup' ? 'Front Office (Outage)' : 'Front Office');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dayLocked || !referenceNo.trim() || rawInputNet <= 0) return;

    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newEntry: LedgerEntry = {
      id: `ent-${Date.now()}`,
      timestamp: hhmm,
      source,
      category,
      outletOrDept: outletOrDept.trim() || 'Front Office',
      referenceNo: referenceNo.trim(),
      guestOrDescription: guestOrDescription.trim() || t.ledger.categories[category],
      netAmount: roundMoney(liveTaxPreview.netAmount),
      serviceCharge: liveTaxPreview.serviceCharge,
      vatAmount: liveTaxPreview.vatAmount,
      cityTaxAmount: liveTaxPreview.cityTaxAmount,
      grossAmount: liveTaxPreview.grossAmount,
      taxInclusive: Boolean(config.taxInclusive),
      originalCurrency: entryCurrency !== config.currency ? entryCurrency : undefined,
      originalNetAmount:
        entryCurrency !== config.currency ? roundMoney(rawInputNet) : undefined,
      fxRateApplied:
        entryCurrency !== config.currency ? rates[entryCurrency] : undefined,
      mealPlan: category === 'Room' ? mealPlan : undefined,
      paxCount: category === 'Room' ? paxCount : undefined,
      packageSplitAmount: category === 'Room' ? livePackageSplit : undefined,
      paymentMethod,
      cashierName: cashierName.trim() || currentCashierName || 'Income Auditor',
      approvedBy: approvedBy.trim(),
      reconciled: false,
    };

    onAddEntry(newEntry);
    setReferenceNo('');
    setGuestOrDescription('');
    setNetAmountStr('');
    setApprovedBy('');
  };

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((e) => {
      if (sourceFilter !== 'ALL' && e.source !== sourceFilter) return false;
      if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false;
      if (
        q &&
        !e.referenceNo.toLowerCase().includes(q) &&
        !e.guestOrDescription.toLowerCase().includes(q) &&
        !e.outletOrDept.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [entries, sourceFilter, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {dayLocked && (
        <div className="px-5 py-3.5 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {t.dir === 'rtl'
                ? `اليوم المالي (${config.businessDate}) مقفل للمراجعة النهائية — قم بفتح اليوم من وحدة «الأرشيف والكاشير» لإضافة أو حذف قيود.`
                : `Business Date (${config.businessDate}) is locked — unlock it from the Archive & Cashiers module to modify postings.`}
            </span>
          </div>
        </div>
      )}

      {/* Emergency Posting Form */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t.ledger.formTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.ledger.formSubtitle} ({config.serviceChargePct}% + {config.vatPct}%)
            </p>
          </div>
          <div className="text-xs text-slate-600 tabular-nums font-mono flex flex-wrap items-center gap-3" dir="ltr">
            <span>
              {t.ledger.liveGross}: {formatMoney(liveTaxPreview.grossAmount, config.currency)}
            </span>
            {entryCurrency !== 'EGP' && rawInputNet > 0 && (
              <span className="px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-[#0B4F8C] font-semibold">
                EGP Net: {formatMoney(egpNetEquivalent, 'EGP')}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t.ledger.sourceLabel}
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as EntrySource)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="OutageBackup">{t.ledger.sources.OutageBackup}</option>
              <option value="ManualEntry">{t.ledger.sources.ManualEntry}</option>
              <option value="PMS">{t.ledger.sources.PMS}</option>
              <option value="POS">{t.ledger.sources.POS}</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t.ledger.categoryLabel}
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as EntryCategory)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="Room">{t.ledger.categories.Room}</option>
              <option value="FoodBeverage">{t.ledger.categories.FoodBeverage}</option>
              <option value="OtherRevenue">{t.ledger.categories.OtherRevenue}</option>
              <option value="Rebate">{t.ledger.categories.Rebate}</option>
              <option value="PaidOut">{t.ledger.categories.PaidOut}</option>
              <option value="Deposit">{t.ledger.categories.Deposit}</option>
              <option value="Payment">{t.ledger.categories.Payment}</option>
              <option value="Adjustment">{t.ledger.categories.Adjustment}</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t.ledger.outletLabel}
            </label>
            {category === 'FoodBeverage' ? (
              <select
                value={outletOrDept}
                onChange={(e) => setOutletOrDept(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {config.outlets.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={outletOrDept}
                onChange={(e) => setOutletOrDept(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {category === 'FoodBeverage' ? t.ledger.refLabelCheck : t.ledger.refLabelRoom}
            </label>
            <input
              type="text"
              required
              list={category === 'Room' && hotelRooms.length > 0 ? 'ledger-hotel-rooms-list' : undefined}
              value={referenceNo}
              onChange={(e) => {
                const val = e.target.value;
                setReferenceNo(val);
                if (category === 'Room') {
                  const matchedRoom = hotelRooms.find(
                    (rm) => rm.roomNumber.toLowerCase() === val.trim().toLowerCase()
                  );
                  if (matchedRoom) {
                    if (!netAmountStr) setNetAmountStr(String(matchedRoom.baseRate));
                    if (!guestOrDescription) {
                      setGuestOrDescription(
                        matchedRoom.guestName
                          ? `${matchedRoom.guestName} — ${matchedRoom.roomType}`
                          : matchedRoom.roomType
                      );
                    }
                  }
                }
              }}
              placeholder={category === 'FoodBeverage' ? '4021' : '305'}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {category === 'Room' && hotelRooms.length > 0 && (
              <datalist id="ledger-hotel-rooms-list">
                {hotelRooms.map((rm) => (
                  <option key={rm.id} value={rm.roomNumber}>
                    {`${rm.roomNumber} · ${rm.roomType} (${rm.baseRate} ${config.currency})`}
                  </option>
                ))}
              </datalist>
            )}
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t.ledger.descLabel}
            </label>
            <input
              type="text"
              value={guestOrDescription}
              onChange={(e) => setGuestOrDescription(e.target.value)}
              placeholder={t.ledger.descPlaceholder}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t.ledger.netLabel} ({entryCurrency})
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={netAmountStr}
                onChange={(e) => setNetAmountStr(e.target.value)}
                placeholder="0.00"
                className="flex-1 min-w-0 px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                dir="ltr"
              />
              <select
                value={entryCurrency}
                onChange={(e) => setEntryCurrency(e.target.value as CurrencyCode)}
                className="w-20 px-2 py-2 text-xs font-mono font-semibold border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                dir="ltr"
              >
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="SAR">SAR</option>
              </select>
            </div>
            {entryCurrency !== config.currency && rawInputNet > 0 && (
              <p className="text-[11px] font-mono text-blue-700 mt-1" dir="ltr">
                = {formatMoney(convertedNetAmount, config.currency)} (×{rates[entryCurrency]})
                {config.currency !== 'EGP' && ` · ≈ ${formatMoney(egpNetEquivalent, 'EGP')}`}
              </p>
            )}
            {entryCurrency === config.currency && entryCurrency !== 'EGP' && rawInputNet > 0 && (
              <p className="text-[11px] font-mono text-blue-700 mt-1" dir="ltr">
                ≈ {formatMoney(egpNetEquivalent, 'EGP')}
              </p>
            )}
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t.ledger.paymentLabel}
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="Cash">{t.ledger.payments.Cash}</option>
              <option value="CreditCard">{t.ledger.payments.CreditCard}</option>
              <option value="CityLedger">{t.ledger.payments.CityLedger}</option>
              <option value="RoomCharge">{t.ledger.payments.RoomCharge}</option>
              <option value="HouseUse">{t.ledger.payments.HouseUse}</option>
            </select>
          </div>

          {category === 'Room' && (
            <div className="md:col-span-4 flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Meal Plan (Package Split)
                </label>
                <select
                  value={mealPlan}
                  onChange={(e) => setMealPlan(e.target.value as MealPlan)}
                  className="w-full px-2.5 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  dir="ltr"
                >
                  <option value="RO">RO (Room Only)</option>
                  <option value="BB">BB (Bed & Breakfast)</option>
                  <option value="HB">HB (Half Board)</option>
                  <option value="FB">FB (Full Board)</option>
                  <option value="AI">AI (All Inclusive)</option>
                </select>
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Pax
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={paxCount}
                  onChange={(e) => setPaxCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-2.5 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  dir="ltr"
                />
              </div>
              {livePackageSplit > 0 && (
                <div className="text-[11px] font-mono text-blue-700 pb-2 whitespace-nowrap" dir="ltr">
                  F&B: -{livePackageSplit.toFixed(0)}
                </div>
              )}
            </div>
          )}

          <div className={category === 'Room' ? 'md:col-span-3' : 'md:col-span-2'}>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t.dir === 'rtl' ? 'اسم الكاشير' : 'Cashier'}
            </label>
            <input
              type="text"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              placeholder="Cashier"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className={category === 'Room' ? 'md:col-span-3' : 'md:col-span-2'}>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t.ledger.approverLabel}
            </label>
            <input
              type="text"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              placeholder={t.ledger.approverPlaceholder}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={dayLocked}
              className="w-full px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {t.ledger.addBtn}
            </button>
          </div>

          {(category === 'Deposit' || category === 'Payment') && (
            <div className="md:col-span-12 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900">
              {t.dir === 'rtl'
                ? 'ملاحظة محاسبية: معاملات التأمين والسداد (Deposit / Payment) تُرحّل لقنوات التحصيل ولا تُحسب كإيراد فندقي لمنع التضخم.'
                : 'Accounting Rule: Deposits and Guest Payments update cash/card settlement channels and never inflate departmental Revenue.'}
            </div>
          )}

          {potentialDuplicate && (
            <div className="md:col-span-12 px-3 py-2 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                {t.dir === 'rtl'
                  ? `تنبيه تكرار محتمل: يوجد قيد مطابق بنفس المرجع (${referenceNo}) والقيمة والمصدر. تأكد قبل الترحيل.`
                  : `Potential duplicate detected for Ref #${referenceNo} with same category and gross amount. Verify before posting.`}
              </span>
            </div>
          )}
        </form>
      </section>

      {/* F&B Sequence Check Bar */}
      {summary.missingCheckNumbers.length > 0 && (
        <div className="px-5 py-3.5 bg-red-50 border border-red-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm text-red-900">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              {t.ledger.seqAlertPrefix}{' '}
              <strong className="font-mono">
                {summary.missingCheckNumbers.map((n) => `#${n}`).join(' · ')}
              </strong>{' '}
              {t.ledger.seqAlertSuffix}
            </span>
          </div>
          <span className="text-xs text-red-700">{t.ledger.seqVoidHint}</span>
        </div>
      )}

      {/* Ledger Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['ALL', 'OutageBackup', 'ManualEntry', 'PMS', 'POS'] as const).map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSourceFilter(src)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    sourceFilter === src
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {src === 'ALL' ? t.ledger.filterAll : t.ledger.sources[src]}
                </button>
              ))}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | EntryCategory)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="ALL">{t.ledger.allDepts}</option>
              <option value="Room">{t.ledger.categories.Room}</option>
              <option value="FoodBeverage">{t.ledger.categories.FoodBeverage}</option>
              <option value="OtherRevenue">{t.ledger.categories.OtherRevenue}</option>
              <option value="Rebate">{t.ledger.categories.Rebate}</option>
              <option value="PaidOut">{t.ledger.categories.PaidOut}</option>
              <option value="Deposit">{t.ledger.categories.Deposit}</option>
              <option value="Payment">{t.ledger.categories.Payment}</option>
              <option value="Adjustment">{t.ledger.categories.Adjustment}</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.ledger.searchPlaceholder}
              className="w-full ps-9 pe-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap text-start">
                  {t.ledger.colTimeSource}
                </th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap text-start">
                  {t.ledger.colTypeDept}
                </th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap text-start">
                  {t.ledger.colRef}
                </th>
                <th className="py-2.5 px-4 font-semibold text-start">{t.ledger.colDesc}</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap text-end">
                  {t.ledger.colNet}
                </th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap text-end">
                  {t.ledger.colGross}
                </th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap text-start">
                  {t.ledger.colPay}
                </th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap text-start">
                  {t.ledger.colApproval}
                </th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap text-start">
                  {t.ledger.colAction}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    {t.ledger.noResults}
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const needsApproval =
                    entry.category === 'Rebate' &&
                    entry.grossAmount >= config.rebateApprovalLimit &&
                    !entry.approvedBy.trim();
                  const isDup = summary.duplicateEntryIds?.includes(entry.id);
                  const isExpanded = expandedBreakdownId === entry.id;

                  return (
                    <React.Fragment key={entry.id}>
                      <tr className={isDup ? 'bg-amber-50/70 hover:bg-amber-50' : 'hover:bg-slate-50/70'}>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-slate-700 tabular-nums">
                            {entry.timestamp}
                          </span>
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span
                            className={
                              entry.source === 'OutageBackup'
                                ? 'font-semibold text-amber-700'
                                : 'text-slate-600'
                            }
                          >
                            {t.ledger.sources[entry.source]}
                          </span>
                        </td>

                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-medium text-slate-900">
                            {t.ledger.categories[entry.category]}
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            {entry.outletOrDept}
                            {entry.cashierName ? ` · ${entry.cashierName}` : ''}
                          </span>
                        </td>

                        <td className="py-2.5 px-4 whitespace-nowrap font-mono font-semibold text-slate-900 tabular-nums">
                          <span>{entry.referenceNo}</span>
                          {isDup && (
                            <span className="ms-1.5 px-1.5 py-0.5 text-[10px] font-sans rounded bg-amber-200 text-amber-950">
                              DUP
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-4 text-slate-700 max-w-xs truncate">
                          {entry.guestOrDescription}
                        </td>

                        <td
                          className="py-2.5 px-4 whitespace-nowrap font-mono tabular-nums text-end text-slate-600"
                          dir="ltr"
                        >
                          <span>
                            {entry.netAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          {entry.originalCurrency && entry.originalNetAmount !== undefined && (
                            <span className="block text-[10px] text-blue-600">
                              ({entry.originalNetAmount.toFixed(2)} {entry.originalCurrency}
                              {entry.fxRateApplied ? ` ×${entry.fxRateApplied}` : ''})
                            </span>
                          )}
                          {entry.category === 'Room' && entry.mealPlan && entry.mealPlan !== 'RO' && (
                            <span className="block text-[10px] text-slate-500">
                              {entry.mealPlan} · {entry.paxCount ?? 1}p (-{(entry.packageSplitAmount ?? 0).toFixed(0)} F&B)
                            </span>
                          )}
                        </td>

                        <td
                          className={`py-2.5 px-4 whitespace-nowrap font-mono font-semibold tabular-nums text-end ${
                            entry.category === 'Rebate' || entry.category === 'PaidOut'
                              ? 'text-red-700'
                              : entry.category === 'Deposit' || entry.category === 'Payment'
                              ? 'text-sky-700'
                              : 'text-slate-900'
                          }`}
                          dir="ltr"
                        >
                          {entry.category === 'Rebate' || entry.category === 'PaidOut' ? '-' : ''}
                          {entry.grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-2.5 px-4 whitespace-nowrap text-slate-700">
                          {t.ledger.payments[entry.paymentMethod]}
                        </td>

                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {approvingId === entry.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={approverInput}
                                onChange={(e) => setApproverInput(e.target.value)}
                                className="w-28 px-2 py-1 text-xs border border-slate-300 rounded"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (approverInput.trim()) {
                                    onApproveEntry(entry.id, approverInput.trim());
                                  }
                                  setApprovingId(null);
                                  setApproverInput('');
                                }}
                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                              >
                                {t.actions.save}
                              </button>
                            </div>
                          ) : needsApproval ? (
                            <button
                              type="button"
                              onClick={() => {
                                setApprovingId(entry.id);
                                setApproverInput('Financial Controller');
                              }}
                              className="text-red-700 hover:text-red-900 font-medium underline underline-offset-2"
                            >
                              {t.ledger.approveNow}
                            </button>
                          ) : (
                            <span className="text-slate-600">{entry.approvedBy || '—'}</span>
                          )}
                        </td>

                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedBreakdownId(isExpanded ? null : entry.id)
                              }
                              title="Calculation Breakdown"
                              className={`p-1 rounded transition-colors ${
                                isExpanded
                                  ? 'bg-sky-100 text-[#0088CC]'
                                  : 'text-slate-400 hover:text-[#0088CC]'
                              }`}
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={dayLocked}
                              onClick={() => onToggleReconciled(entry.id)}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 disabled:opacity-50 ${
                                entry.reconciled
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {entry.reconciled ? t.ledger.reconciled : t.ledger.reconcile}
                            </button>
                            <button
                              type="button"
                              disabled={dayLocked}
                              onClick={() => onDeleteEntry(entry.id)}
                              aria-label="Archive entry"
                              className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={9} className="px-5 py-2.5 text-[11px] font-mono text-slate-700" dir="ltr">
                            <div className="flex flex-wrap items-center gap-4">
                              <span>Net: {formatMoney(entry.netAmount, config.currency)}</span>
                              <span>SVC: {formatMoney(entry.serviceCharge, config.currency)}</span>
                              <span>VAT: {formatMoney(entry.vatAmount, config.currency)}</span>
                              <span>City Tax: {formatMoney(entry.cityTaxAmount ?? 0, config.currency)}</span>
                              <span className="font-bold text-slate-900">
                                Gross: {formatMoney(entry.grossAmount, config.currency)}
                              </span>
                              {entry.taxInclusive && <span className="text-sky-700">[Tax-Inclusive]</span>}
                              {entry.fxRateApplied && (
                                <span className="text-blue-700">[FX ×{entry.fxRateApplied}]</span>
                              )}
                              {entry.cashierName && <span>Cashier: {entry.cashierName}</span>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
