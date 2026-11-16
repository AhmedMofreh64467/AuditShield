import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Globe2,
  Plus,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import { LanguageCode } from '../i18n/translations';
import {
  BanquetBeoRecord,
  CityLedgerRecord,
  HotelConfig,
  OtaAuditRecord,
} from '../types/audit';
import { formatMoney } from '../utils/auditEngine';

interface ReceivablesAndBeoProps {
  lang: LanguageCode;
  config: HotelConfig;
  otaBookings: OtaAuditRecord[];
  cityLedgerItems: CityLedgerRecord[];
  banquetEvents: BanquetBeoRecord[];
  onAddOta: (item: OtaAuditRecord) => void;
  onToggleOtaVerified: (id: string) => void;
  onDeleteOta: (id: string) => void;
  onAddCityLedger: (item: CityLedgerRecord) => void;
  onToggleCityLedgerSigned: (id: string) => void;
  onToggleCityLedgerCollected: (id: string) => void;
  onDeleteCityLedger: (id: string) => void;
  onAddBanquet: (item: BanquetBeoRecord) => void;
  onUpdateBanquetPos: (id: string, posPostedAmount: number) => void;
  onCycleBanquetStatus: (id: string) => void;
  onDeleteBanquet: (id: string) => void;
}

type ReceivablesSubtab = 'otas' | 'cityLedger' | 'banquet';

const COPY: Record<
  LanguageCode,
  {
    tabs: { otas: string; cityLedger: string; banquet: string };
    otaTitle: string;
    otaSubtitle: string;
    otaContractTotal: string;
    otaPostedTotal: string;
    otaRateLeakage: string;
    otaCommTotal: string;
    channel: string;
    bookingRef: string;
    guestName: string;
    roomNo: string;
    nights: string;
    contractRate: string;
    postedRate: string;
    commPct: string;
    netHotel: string;
    addOtaBtn: string;
    verified: string;
    mismatch: string;
    clTitle: string;
    clSubtitle: string;
    companyName: string;
    invoiceNo: string;
    dueDays: string;
    amount: string;
    advanceDep: string;
    netDue: string;
    signedFolio: string;
    collected: string;
    pending: string;
    addClBtn: string;
    bucket0_30: string;
    bucket31_60: string;
    bucket61_90: string;
    bucket90Plus: string;
    totalNetAr: string;
    beoTitle: string;
    beoSubtitle: string;
    beoNo: string;
    eventName: string;
    clientName: string;
    eventDate: string;
    hall: string;
    pax: string;
    contractAmt: string;
    depositPaid: string;
    posPosted: string;
    balanceDue: string;
    status: string;
    addBeoBtn: string;
    statuses: Record<BanquetBeoRecord['status'], string>;
  }
> = {
  ar: {
    tabs: {
      otas: '1. تدقيق عقود الـ OTAs والعمولات',
      cityLedger: '2. أعمار ذمم الشركات (City Ledger Aging)',
      banquet: '3. الحفلات والمؤتمرات (BEO & Deposits)',
    },
    otaTitle: 'تدقيق أسعار وعمولات قنوات الحجز (Booking.com / Expedia / Agents)',
    otaSubtitle: 'مقارنة سعر العقد المتفق عليه مع السعر المرحل فعلياً على حساب النزيل واحتساب عمولة القناة',
    otaContractTotal: 'إجمالي قيمة العقود',
    otaPostedTotal: 'إجمالي المرحل بالسيستم',
    otaRateLeakage: 'تسرب الأسعار (الفرق)',
    otaCommTotal: 'إجمالي عمولات الوكلاء',
    channel: 'القناة / الوكيل',
    bookingRef: 'رقم الحجز',
    guestName: 'اسم النزيل',
    roomNo: 'الغرفة',
    nights: 'ليالٍ',
    contractRate: 'سعر العقد/ليلة',
    postedRate: 'المرحل/ليلة',
    commPct: 'العمولة %',
    netHotel: 'صافي الفندق',
    addOtaBtn: 'إضافة حجز OTA',
    verified: 'مطابق',
    mismatch: 'فرق سعر',
    clTitle: 'متابعة أعمار ذمم الشركات والودائع المقدمة (City Ledger Aging)',
    clSubtitle: 'تصنيف المديونيات الآجلة للشركات إلى فترات (0-30 / 31-60 / 61-90 / +90 يوم) ومتابعة الفواتير الموقعة',
    companyName: 'اسم الشركة',
    invoiceNo: 'رقم الفاتورة',
    dueDays: 'عمر الدين (يوم)',
    amount: 'قيمة الفاتورة',
    advanceDep: 'دفعة مقدمة',
    netDue: 'الصافي المستحق',
    signedFolio: 'توقيع الفاتورة',
    collected: 'تم التحصيل',
    pending: 'تحت التحصيل',
    addClBtn: 'إضافة فاتورة',
    bucket0_30: '0 - 30 يوم',
    bucket31_60: '31 - 60 يوم',
    bucket61_90: '61 - 90 يوم',
    bucket90Plus: '+90 يوم',
    totalNetAr: 'إجمالي صافي الذمم المفتوحة',
    beoTitle: 'متابعة أوامر الحفلات والمؤتمرات والعربون (Banquet BEO)',
    beoSubtitle: 'مقارنة قيمة عقد الحفل مع العربون المحصل مقدماً والترحيل الفعلي على نقاط البيع POS',
    beoNo: 'رقم BEO',
    eventName: 'اسم الفعالية',
    clientName: 'العميل / الشركة',
    eventDate: 'تاريخ الحفل',
    hall: 'القاعة / المنفذ',
    pax: 'الأفراد',
    contractAmt: 'قيمة العقد',
    depositPaid: 'عربون مدفوع',
    posPosted: 'مرحل POS',
    balanceDue: 'المتبقي للتحصيل',
    status: 'الحالة',
    addBeoBtn: 'إضافة BEO',
    statuses: {
      scheduled: 'مجدول',
      posted: 'مرحل POS',
      settled: 'مسدد بالكامل',
    },
  },
  en: {
    tabs: {
      otas: '1. OTA & Travel Agent Contract Audit',
      cityLedger: '2. City Ledger Aging & Deposits',
      banquet: '3. Banquet BEO & Advance Deposits',
    },
    otaTitle: 'OTA & Travel Agent Rate & Commission Audit',
    otaSubtitle: 'Compare contracted channel rates vs posted PMS folio rates and audit commission deductions',
    otaContractTotal: 'Contracted Total',
    otaPostedTotal: 'Posted PMS Total',
    otaRateLeakage: 'Rate Variance / Leakage',
    otaCommTotal: 'Total OTA Commission',
    channel: 'Channel / Agent',
    bookingRef: 'Booking Ref',
    guestName: 'Guest Name',
    roomNo: 'Room',
    nights: 'Nts',
    contractRate: 'Contract/Nt',
    postedRate: 'Posted/Nt',
    commPct: 'Comm %',
    netHotel: 'Net to Hotel',
    addOtaBtn: 'Add OTA Audit',
    verified: 'Verified',
    mismatch: 'Rate Mismatch',
    clTitle: 'Corporate City Ledger Aging & Advance Deposits',
    clSubtitle: 'Track unpaid corporate receivables by 0-30 / 31-60 / 61-90 / 90+ day buckets and signed folio compliance',
    companyName: 'Company Name',
    invoiceNo: 'Invoice #',
    dueDays: 'Age (Days)',
    amount: 'Invoice Amt',
    advanceDep: 'Advance Dep.',
    netDue: 'Net Balance',
    signedFolio: 'Signed Folio',
    collected: 'Collected',
    pending: 'Open AR',
    addClBtn: 'Add AR Invoice',
    bucket0_30: '0 - 30 Days',
    bucket31_60: '31 - 60 Days',
    bucket61_90: '61 - 90 Days',
    bucket90Plus: '90+ Days',
    totalNetAr: 'Total Open Net AR',
    beoTitle: 'Banquet Event Orders (BEO) & Advance Deposits',
    beoSubtitle: 'Reconcile banquet contract value against advance deposits held and POS outlet postings',
    beoNo: 'BEO #',
    eventName: 'Event Name',
    clientName: 'Client / Account',
    eventDate: 'Event Date',
    hall: 'Hall / Venue',
    pax: 'Pax',
    contractAmt: 'Contract Amt',
    depositPaid: 'Deposit Held',
    posPosted: 'POS Posted',
    balanceDue: 'Balance Due',
    status: 'Status',
    addBeoBtn: 'Add BEO',
    statuses: {
      scheduled: 'Scheduled',
      posted: 'POS Posted',
      settled: 'Settled',
    },
  },
  fr: {
    tabs: {
      otas: '1. Audit Contrats OTAs & Commissions',
      cityLedger: '2. Balance Âgée Débiteurs (City Ledger)',
      banquet: '3. Banquets BEO & Acomptes',
    },
    otaTitle: 'Contrôle Tarifs & Commissions OTAs / Agences',
    otaSubtitle: 'Comparez le tarif contractuel au tarif facturé en PMS et contrôlez les commissions',
    otaContractTotal: 'Total Contractuel',
    otaPostedTotal: 'Total Facturé PMS',
    otaRateLeakage: 'Écart Tarifaire',
    otaCommTotal: 'Total Commissions',
    channel: 'Canal / Agence',
    bookingRef: 'Réf. Résa',
    guestName: 'Client',
    roomNo: 'Chambre',
    nights: 'Nuits',
    contractRate: 'Contrat/Nt',
    postedRate: 'Facturé/Nt',
    commPct: 'Comm. %',
    netHotel: 'Net Hôtel',
    addOtaBtn: 'Ajouter OTA',
    verified: 'Vérifié',
    mismatch: 'Écart Tarif',
    clTitle: 'Balance Âgée Débiteurs Sociétés & Acomptes',
    clSubtitle: 'Suivi des créances par tranche (0-30 / 31-60 / 61-90 / 90+ j) et présence de factures signées',
    companyName: 'Société',
    invoiceNo: 'Facture #',
    dueDays: 'Âge (Jours)',
    amount: 'Montant',
    advanceDep: 'Acompte',
    netDue: 'Solde Net',
    signedFolio: 'Signée',
    collected: 'Encaissée',
    pending: 'Ouverte',
    addClBtn: 'Ajouter Facture',
    bucket0_30: '0 - 30 Jours',
    bucket31_60: '31 - 60 Jours',
    bucket61_90: '61 - 90 Jours',
    bucket90Plus: '90+ Jours',
    totalNetAr: 'Total Créances Ouvertes',
    beoTitle: 'Ordres de Banquet (BEO) & Acomptes Reçus',
    beoSubtitle: 'Rapprochement entre contrat banquet, acomptes encaissés et facturation POS',
    beoNo: 'BEO #',
    eventName: 'Événement',
    clientName: 'Client / Société',
    eventDate: 'Date',
    hall: 'Salle / Point',
    pax: 'Pax',
    contractAmt: 'Montant Contrat',
    depositPaid: 'Acompte Reçu',
    posPosted: 'Facturé POS',
    balanceDue: 'Reste Dû',
    status: 'Statut',
    addBeoBtn: 'Ajouter BEO',
    statuses: {
      scheduled: 'Planifié',
      posted: 'Facturé POS',
      settled: 'Soldé',
    },
  },
};

export const ReceivablesAndBeo: React.FC<ReceivablesAndBeoProps> = ({
  lang,
  config,
  otaBookings,
  cityLedgerItems,
  banquetEvents,
  onAddOta,
  onToggleOtaVerified,
  onDeleteOta,
  onAddCityLedger,
  onToggleCityLedgerSigned,
  onToggleCityLedgerCollected,
  onDeleteCityLedger,
  onAddBanquet,
  onUpdateBanquetPos,
  onCycleBanquetStatus,
  onDeleteBanquet,
}) => {
  const c = COPY[lang];
  const [subtab, setSubtab] = useState<ReceivablesSubtab>('otas');

  // OTA form
  const [channel, setChannel] = useState('Booking.com');
  const [bookingRef, setBookingRef] = useState('');
  const [guestName, setGuestName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [nights, setNights] = useState('1');
  const [contractRate, setContractRate] = useState('');
  const [postedRate, setPostedRate] = useState('');
  const [commissionPct, setCommissionPct] = useState('15');

  // City Ledger form
  const [companyName, setCompanyName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [dueDays, setDueDays] = useState('15');
  const [clAmount, setClAmount] = useState('');
  const [clDeposit, setClDeposit] = useState('0');

  // Banquet BEO form
  const [beoNo, setBeoNo] = useState('');
  const [eventName, setEventName] = useState('');
  const [clientName, setClientName] = useState('');
  const [eventDate, setEventDate] = useState(config.businessDate);
  const [hallOrOutlet, setHallOrOutlet] = useState('Nile Grand Ballroom');
  const [pax, setPax] = useState('40');
  const [contractAmt, setContractAmt] = useState('');
  const [depositPaid, setDepositPaid] = useState('0');

  const otaKpis = useMemo(() => {
    let contractTotal = 0;
    let postedTotal = 0;
    let commTotal = 0;
    for (const o of otaBookings) {
      const cTot = o.contractRate * o.nights;
      const pTot = o.postedRate * o.nights;
      contractTotal += cTot;
      postedTotal += pTot;
      commTotal += pTot * (o.commissionPct / 100);
    }
    return {
      contractTotal,
      postedTotal,
      leakage: postedTotal - contractTotal,
      commTotal,
    };
  }, [otaBookings]);

  const clBuckets = useMemo(() => {
    let b0 = 0;
    let b31 = 0;
    let b61 = 0;
    let b90 = 0;
    for (const item of cityLedgerItems) {
      if (item.collected) continue;
      const net = Math.max(0, item.amount - item.advanceDeposit);
      if (item.dueDays <= 30) b0 += net;
      else if (item.dueDays <= 60) b31 += net;
      else if (item.dueDays <= 90) b61 += net;
      else b90 += net;
    }
    return { b0, b31, b61, b90, total: b0 + b31 + b61 + b90 };
  }, [cityLedgerItems]);

  const beoKpis = useMemo(() => {
    const contracted = banquetEvents.reduce((acc, b) => acc + b.totalContractAmount, 0);
    const deposits = banquetEvents.reduce((acc, b) => acc + b.advanceDepositPaid, 0);
    const posPosted = banquetEvents.reduce((acc, b) => acc + b.posPostedAmount, 0);
    const due = banquetEvents.reduce(
      (acc, b) =>
        acc +
        Math.max(
          0,
          (b.posPostedAmount > 0 ? b.posPostedAmount : b.totalContractAmount) - b.advanceDepositPaid
        ),
      0
    );
    return { contracted, deposits, posPosted, due };
  }, [banquetEvents]);

  const handleOtaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cr = parseFloat(contractRate) || 0;
    const pr = parseFloat(postedRate) || 0;
    if (!bookingRef.trim() || !guestName.trim() || cr <= 0) return;
    onAddOta({
      id: `ota-${Date.now()}`,
      channel,
      bookingRef: bookingRef.trim(),
      guestName: guestName.trim(),
      roomNumber: roomNumber.trim() || '—',
      nights: Math.max(1, parseInt(nights, 10) || 1),
      contractRate: cr,
      postedRate: pr,
      commissionPct: parseFloat(commissionPct) || 0,
      verified: Math.abs(cr - pr) <= 1,
    });
    setBookingRef('');
    setGuestName('');
    setRoomNumber('');
    setContractRate('');
    setPostedRate('');
  };

  const handleClSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(clAmount) || 0;
    if (!companyName.trim() || !invoiceNo.trim() || amt <= 0) return;
    onAddCityLedger({
      id: `cl-${Date.now()}`,
      companyName: companyName.trim(),
      invoiceNo: invoiceNo.trim(),
      invoiceDate: config.businessDate,
      dueDays: Math.max(0, parseInt(dueDays, 10) || 0),
      amount: amt,
      advanceDeposit: Math.max(0, parseFloat(clDeposit) || 0),
      signedFolioAttached: true,
      collected: false,
    });
    setCompanyName('');
    setInvoiceNo('');
    setClAmount('');
    setClDeposit('0');
  };

  const handleBeoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(contractAmt) || 0;
    if (!beoNo.trim() || !eventName.trim() || amt <= 0) return;
    onAddBanquet({
      id: `beo-${Date.now()}`,
      beoNo: beoNo.trim(),
      eventName: eventName.trim(),
      clientName: clientName.trim() || 'Corporate Client',
      eventDate,
      hallOrOutlet: hallOrOutlet.trim() || 'Banquet Hall',
      pax: Math.max(1, parseInt(pax, 10) || 1),
      totalContractAmount: amt,
      advanceDepositPaid: Math.max(0, parseFloat(depositPaid) || 0),
      posPostedAmount: 0,
      status: 'scheduled',
    });
    setBeoNo('');
    setEventName('');
    setClientName('');
    setContractAmt('');
    setDepositPaid('0');
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-1.5">
        {(
          [
            { id: 'otas', label: c.tabs.otas, icon: Globe2 },
            { id: 'cityLedger', label: c.tabs.cityLedger, icon: CalendarClock },
            { id: 'banquet', label: c.tabs.banquet, icon: UtensilsCrossed },
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
      </section>

      {/* SUBTAB 1: OTA CONTRACT AUDIT */}
      {subtab === 'otas' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 bg-white rounded-xl divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-200">
            <div className="p-5">
              <p className="text-xs text-slate-500">{c.otaContractTotal}</p>
              <p className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900" dir="ltr">
                {formatMoney(otaKpis.contractTotal, config.currency)}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">{c.otaPostedTotal}</p>
              <p className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900" dir="ltr">
                {formatMoney(otaKpis.postedTotal, config.currency)}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">{c.otaRateLeakage}</p>
              <p
                className={`mt-2 text-xl font-bold font-mono tabular-nums ${
                  Math.abs(otaKpis.leakage) <= 1 ? 'text-emerald-700' : 'text-red-600'
                }`}
                dir="ltr"
              >
                {otaKpis.leakage > 0 ? '+' : ''}
                {formatMoney(otaKpis.leakage, config.currency)}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">{c.otaCommTotal}</p>
              <p className="mt-2 text-xl font-bold font-mono tabular-nums text-blue-700" dir="ltr">
                {formatMoney(otaKpis.commTotal, config.currency)}
              </p>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">{c.otaTitle}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{c.otaSubtitle}</p>
            </div>

            <form
              onSubmit={handleOtaSubmit}
              className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-8 gap-2 items-end"
            >
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.channel}
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                >
                  <option value="Booking.com">Booking.com</option>
                  <option value="Expedia">Expedia</option>
                  <option value="Agoda">Agoda</option>
                  <option value="Corporate Agent">Corporate Agent</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.bookingRef}
                </label>
                <input
                  type="text"
                  required
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value)}
                  placeholder="BK-9920"
                  className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.guestName}
                </label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.contractRate}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={contractRate}
                  onChange={(e) => setContractRate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.postedRate}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={postedRate}
                  onChange={(e) => setPostedRate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.commPct}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={commissionPct}
                  onChange={(e) => setCommissionPct(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                  dir="ltr"
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full py-1.5 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {c.addOtaBtn}
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-4 text-start font-semibold">{c.channel}</th>
                    <th className="py-2.5 px-4 text-start font-semibold">{c.bookingRef}</th>
                    <th className="py-2.5 px-4 text-start font-semibold">{c.guestName}</th>
                    <th className="py-2.5 px-4 text-center font-semibold">{c.nights}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.contractRate}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.postedRate}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.commPct}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.netHotel}</th>
                    <th className="py-2.5 px-4 text-end font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {otaBookings.map((o) => {
                    const hasMismatch = Math.abs(o.postedRate - o.contractRate) > 1;
                    const netToHotel = o.postedRate * o.nights * (1 - o.commissionPct / 100);
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{o.channel}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-700">{o.bookingRef}</td>
                        <td className="py-2.5 px-4 text-slate-800">
                          {o.guestName} · <span className="font-mono text-slate-500">{o.roomNumber}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono">{o.nights}</td>
                        <td className="py-2.5 px-4 text-end font-mono tabular-nums" dir="ltr">
                          {formatMoney(o.contractRate, config.currency)}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-end font-mono tabular-nums font-semibold ${
                            hasMismatch ? 'text-red-600' : 'text-slate-900'
                          }`}
                          dir="ltr"
                        >
                          {formatMoney(o.postedRate, config.currency)}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono">{o.commissionPct}%</td>
                        <td className="py-2.5 px-4 text-end font-mono tabular-nums font-semibold text-emerald-700" dir="ltr">
                          {formatMoney(netToHotel, config.currency)}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onToggleOtaVerified(o.id)}
                              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${
                                o.verified && !hasMismatch
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {o.verified && !hasMismatch ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              {o.verified && !hasMismatch ? c.verified : c.mismatch}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteOta(o.id)}
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
      )}

      {/* SUBTAB 2: CITY LEDGER AGING */}
      {subtab === 'cityLedger' && (
        <div className="space-y-6">
          <section className="grid grid-cols-2 sm:grid-cols-5 border border-slate-200 bg-white rounded-xl divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-200">
            <div className="p-4">
              <p className="text-xs text-slate-500">{c.bucket0_30}</p>
              <p className="mt-1.5 text-lg font-bold font-mono tabular-nums text-slate-900" dir="ltr">
                {formatMoney(clBuckets.b0, config.currency)}
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500">{c.bucket31_60}</p>
              <p className="mt-1.5 text-lg font-bold font-mono tabular-nums text-amber-700" dir="ltr">
                {formatMoney(clBuckets.b31, config.currency)}
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500">{c.bucket61_90}</p>
              <p className="mt-1.5 text-lg font-bold font-mono tabular-nums text-red-600" dir="ltr">
                {formatMoney(clBuckets.b61, config.currency)}
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500">{c.bucket90Plus}</p>
              <p className="mt-1.5 text-lg font-bold font-mono tabular-nums text-red-700" dir="ltr">
                {formatMoney(clBuckets.b90, config.currency)}
              </p>
            </div>
            <div className="p-4 bg-[#0F1E36] text-white col-span-2 sm:col-span-1">
              <p className="text-xs text-blue-200">{c.totalNetAr}</p>
              <p className="mt-1.5 text-lg font-bold font-mono tabular-nums" dir="ltr">
                {formatMoney(clBuckets.total, config.currency)}
              </p>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">{c.clTitle}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{c.clSubtitle}</p>
              </div>
            </div>

            <form
              onSubmit={handleClSubmit}
              className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-6 gap-2 items-end"
            >
              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.companyName}
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.invoiceNo}
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.dueDays}
                </label>
                <input
                  type="number"
                  min="0"
                  value={dueDays}
                  onChange={(e) => setDueDays(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.amount}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={clAmount}
                  onChange={(e) => setClAmount(e.target.value)}
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
                  {c.addClBtn}
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-4 text-start font-semibold">{c.companyName}</th>
                    <th className="py-2.5 px-4 text-start font-semibold">{c.invoiceNo}</th>
                    <th className="py-2.5 px-4 text-center font-semibold">{c.dueDays}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.amount}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.advanceDep}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.netDue}</th>
                    <th className="py-2.5 px-4 text-end font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cityLedgerItems.map((item) => {
                    const netDue = Math.max(0, item.amount - item.advanceDeposit);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {item.companyName}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-700">
                          {item.invoiceNo} · <span className="text-slate-400">{item.invoiceDate}</span>
                        </td>
                        <td
                          className={`py-2.5 px-4 text-center font-mono font-semibold ${
                            item.dueDays > 60
                              ? 'text-red-600'
                              : item.dueDays > 30
                              ? 'text-amber-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {item.dueDays}d
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono tabular-nums" dir="ltr">
                          {formatMoney(item.amount, config.currency)}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono tabular-nums text-blue-700" dir="ltr">
                          {formatMoney(item.advanceDeposit, config.currency)}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono tabular-nums font-bold text-slate-900" dir="ltr">
                          {formatMoney(netDue, config.currency)}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onToggleCityLedgerSigned(item.id)}
                              className={`px-2 py-1 rounded text-[11px] font-medium ${
                                item.signedFolioAttached
                                  ? 'bg-slate-100 text-slate-800'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {c.signedFolio}: {item.signedFolioAttached ? '✓' : '✕'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleCityLedgerCollected(item.id)}
                              className={`px-2 py-1 rounded text-[11px] font-medium ${
                                item.collected
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-800'
                              }`}
                            >
                              {item.collected ? c.collected : c.pending}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteCityLedger(item.id)}
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
      )}

      {/* SUBTAB 3: BANQUET BEO & ADVANCE DEPOSITS */}
      {subtab === 'banquet' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 bg-white rounded-xl divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-200">
            <div className="p-5">
              <p className="text-xs text-slate-500">{c.contractAmt}</p>
              <p className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900" dir="ltr">
                {formatMoney(beoKpis.contracted, config.currency)}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">{c.depositPaid}</p>
              <p className="mt-2 text-xl font-bold font-mono tabular-nums text-blue-700" dir="ltr">
                {formatMoney(beoKpis.deposits, config.currency)}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">{c.posPosted}</p>
              <p className="mt-2 text-xl font-bold font-mono tabular-nums text-emerald-700" dir="ltr">
                {formatMoney(beoKpis.posPosted, config.currency)}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">{c.balanceDue}</p>
              <p className="mt-2 text-xl font-bold font-mono tabular-nums text-amber-700" dir="ltr">
                {formatMoney(beoKpis.due, config.currency)}
              </p>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">{c.beoTitle}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{c.beoSubtitle}</p>
            </div>

            <form
              onSubmit={handleBeoSubmit}
              className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-8 gap-2 items-end"
            >
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.beoNo}
                </label>
                <input
                  type="text"
                  required
                  value={beoNo}
                  onChange={(e) => setBeoNo(e.target.value)}
                  placeholder="BEO-511"
                  className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.eventName}
                </label>
                <input
                  type="text"
                  required
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.clientName}
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.hall}
                </label>
                <input
                  type="text"
                  value={hallOrOutlet}
                  onChange={(e) => setHallOrOutlet(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.contractAmt}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={contractAmt}
                  onChange={(e) => setContractAmt(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {c.depositPaid}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={depositPaid}
                  onChange={(e) => setDepositPaid(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                  dir="ltr"
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full py-1.5 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {c.addBeoBtn}
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-4 text-start font-semibold">{c.beoNo}</th>
                    <th className="py-2.5 px-4 text-start font-semibold">{c.eventName}</th>
                    <th className="py-2.5 px-4 text-start font-semibold">{c.eventDate}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.contractAmt}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.depositPaid}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.posPosted}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.balanceDue}</th>
                    <th className="py-2.5 px-4 text-end font-semibold">{c.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {banquetEvents.map((b) => {
                    const effectiveTotal =
                      b.posPostedAmount > 0 ? b.posPostedAmount : b.totalContractAmount;
                    const balance = Math.max(0, effectiveTotal - b.advanceDepositPaid);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{b.beoNo}</td>
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-slate-900 block">{b.eventName}</span>
                          <span className="text-[11px] text-slate-500">
                            {b.clientName} · {b.hallOrOutlet} ({b.pax} pax)
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600" dir="ltr">
                          {b.eventDate}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono tabular-nums" dir="ltr">
                          {formatMoney(b.totalContractAmount, config.currency)}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono tabular-nums text-blue-700" dir="ltr">
                          {formatMoney(b.advanceDepositPaid, config.currency)}
                        </td>
                        <td className="py-2.5 px-4 text-end">
                          <input
                            type="number"
                            step="0.01"
                            value={b.posPostedAmount}
                            onChange={(e) =>
                              onUpdateBanquetPos(b.id, Math.max(0, parseFloat(e.target.value) || 0))
                            }
                            className="w-28 px-2 py-1 text-end font-mono tabular-nums border border-slate-300 rounded"
                            dir="ltr"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono tabular-nums font-bold text-slate-900" dir="ltr">
                          {formatMoney(balance, config.currency)}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onCycleBanquetStatus(b.id)}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                                b.status === 'settled'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : b.status === 'posted'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {c.statuses[b.status]}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteBanquet(b.id)}
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
      )}
    </div>
  );
};
