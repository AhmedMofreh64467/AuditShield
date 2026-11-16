import React, { useMemo, useState } from 'react';
import {
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  DollarSign,
  Info,
  Lock,
  Minus,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Save,
  Search,
  ShoppingCart,
  Tag,
  Trash2,
  Unlock,
  User,
  UserPlus,
  Utensils,
  X,
} from 'lucide-react';
import { LanguageCode } from '../i18n/translations';
import {
  CurrencyCode,
  HotelConfig,
  HotelRoom,
  MealPlan,
  PosCatalogItem,
  PosCategory,
  ReservationState,
  RoomFolioItem,
  RoomReservation,
} from '../types/audit';
import { convertCurrency, formatMoney, getExchangeRates } from '../utils/auditEngine';

interface RoomProfileModalProps {
  lang: LanguageCode;
  config: HotelConfig;
  room: HotelRoom;
  reservation: RoomReservation | null;
  folioItems: RoomFolioItem[];
  posCatalog: PosCatalogItem[];
  initialView: 'reservation' | 'cashier' | 'billing';
  onClose: () => void;
  onSaveReservation: (res: RoomReservation, updatedRoom?: HotelRoom) => void;
  onAddFolioItem: (item: RoomFolioItem, alsoPostToLedger: boolean) => void;
  onToggleFolioVerified: (itemId: string) => void;
  onArchiveFolioItem: (itemId: string) => void;
  onAddPosCatalogItem: (item: PosCatalogItem) => void;
  onArchivePosCatalogItem: (itemId: string) => void;
}

const CHANNELS = [
  'Individual',
  'Booking.com',
  'Expedia',
  'Amisol Travel',
  'ALPI Tour SPA',
  'Corporate Contract',
  'Walk-In',
  'House / Complimentary',
];

const ROOM_TYPES = [
  'Standard King',
  'Twin Classic',
  'Deluxe Nile View',
  'Junior Suite',
  'Executive Suite',
  'Family Room',
];

const CURRENCIES: CurrencyCode[] = ['EGP', 'EUR', 'USD', 'SAR'];

const STATE_BADGE: Record<ReservationState, { bg: string; labelAr: string; labelEn: string }> = {
  CheckedIn: { bg: 'bg-emerald-600 text-white', labelAr: 'ساكن حالياً (Checked In)', labelEn: 'Checked In' },
  Reserved: { bg: 'bg-[#1967B2] text-white', labelAr: 'حجز مؤكد (Reserved)', labelEn: 'Reserved' },
  DueOut: { bg: 'bg-amber-600 text-white', labelAr: 'مغادرة اليوم (Due Out)', labelEn: 'Due Out' },
  CheckedOut: { bg: 'bg-slate-600 text-white', labelAr: 'غادر (Checked Out)', labelEn: 'Checked Out' },
  Cancelled: { bg: 'bg-red-600 text-white', labelAr: 'ملغي (Cancelled)', labelEn: 'Cancelled' },
};

const POS_CATEGORIES: { id: PosCategory; labelAr: string; labelEn: string; defaultDept: string }[] = [
  { id: 'Restaurant', labelAr: 'المطعم', labelEn: 'Restaurant', defaultDept: '1301 Main Restaurant Food' },
  { id: 'Bar', labelAr: 'البار والكافيه', labelEn: 'Bar & Cafe', defaultDept: '1303 Pool Bar (1) Beverage' },
  { id: 'RoomService', labelAr: 'خدمة الغرف', labelEn: 'Room Service', defaultDept: '1302 Room Service Food' },
  { id: 'MiniBar', labelAr: 'ميني بار', labelEn: 'Mini Bar', defaultDept: '1305 Mini Bar' },
  { id: 'SpaLaundry', labelAr: 'سبا ومغسلة', labelEn: 'Spa & Laundry', defaultDept: '1401 Health Club & Spa' },
  { id: 'Other', labelAr: 'أصناف أخرى', labelEn: 'Other', defaultDept: '1499 Miscellaneous POS' },
];

interface PosCartLine {
  item: PosCatalogItem;
  qty: number;
  unitPrice: number;
}

export const RoomProfileModal: React.FC<RoomProfileModalProps> = ({
  lang,
  config,
  room,
  reservation,
  folioItems,
  posCatalog,
  initialView,
  onClose,
  onSaveReservation,
  onAddFolioItem,
  onToggleFolioVerified,
  onArchiveFolioItem,
  onAddPosCatalogItem,
  onArchivePosCatalogItem,
}) => {
  const isAr = lang === 'ar';
  const [activeView, setActiveView] = useState<'reservation' | 'cashier' | 'billing'>(initialView);

  const defaultDraft = useMemo<RoomReservation>(() => {
    if (reservation) return reservation;
    const shortNum = String(29300 + (parseInt(room.roomNumber.replace(/\D/g, ''), 10) || 1));
    return {
      id: shortNum,
      roomId: room.id,
      confirmationNo: `i-0000${shortNum}`,
      primaryGuest: room.guestName || '',
      otherGuests: [],
      nationality: 'EG',
      arrival: config.businessDate,
      departure: new Date(new Date(config.businessDate).getTime() + 86400000 * 3)
        .toISOString()
        .slice(0, 10),
      checkInTime: '02:00 pm',
      checkOutTime: '12:00 pm',
      channel: 'Individual',
      adults: 2,
      children: 0,
      roomType: room.roomType,
      roomTypeToCharge: room.roomType,
      rateCode: 'BAR RO',
      boardType: 'BB',
      rateAmount: room.baseRate,
      rateCurrency: config.currency,
      manualRate: false,
      state: room.status === 'Occupied' ? 'CheckedIn' : 'Reserved',
      openedToPos: true,
      folioLocked: false,
      sendBillOnCheckout: false,
      alerts: [],
      window2Label: 'Company / Agency Master',
      notes: room.notes || '',
    };
  }, [reservation, room, config.businessDate, config.currency]);

  const [draft, setDraft] = useState<RoomReservation>(defaultDraft);
  const [guestOpen, setGuestOpen] = useState(true);
  const [resDetailsOpen, setResDetailsOpen] = useState(true);
  const [rateOpen, setRateOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);

  const [newCompanion, setNewCompanion] = useState('');
  const [newAlert, setNewAlert] = useState('');
  const [showAlertsBox, setShowAlertsBox] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState('');

  // Billing posting drawer state
  const [postMode, setPostMode] = useState<'none' | 'charge' | 'deposit' | 'payout'>('none');
  const [postWindow, setPostWindow] = useState<1 | 2>(1);
  const [postDept, setPostDept] = useState('1301 Main Restaurant Beverage');
  const [postAmount, setPostAmount] = useState('');
  const [postForeignAmt, setPostForeignAmt] = useState('');
  const [postForeignCurr, setPostForeignCurr] = useState<CurrencyCode>('EUR');
  const [postDetails, setPostDetails] = useState('');
  const [alsoPostLedger, setAlsoPostLedger] = useState(true);

  // Room Cashier (POS) state
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState<'ALL' | PosCategory>('ALL');
  const [posCart, setPosCart] = useState<PosCartLine[]>([]);
  const [posWindow, setPosWindow] = useState<1 | 2>(1);
  const [posSettlementMode, setPosSettlementMode] = useState<'room_charge' | 'cash_paid'>('room_charge');
  const [posCheckNo, setPosCheckNo] = useState(() => `POS-${room.roomNumber}-${String(Date.now()).slice(-4)}`);
  const [posOrderNote, setPosOrderNote] = useState('');
  const [showNewCatalogForm, setShowNewCatalogForm] = useState(false);
  const [newItemNameAr, setNewItemNameAr] = useState('');
  const [newItemNameEn, setNewItemNameEn] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<PosCategory>('Restaurant');
  const [newItemDept, setNewItemDept] = useState('1301 Main Restaurant Food');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCurrency, setNewItemCurrency] = useState<CurrencyCode>(config.currency);
  const [newItemSku, setNewItemSku] = useState('');

  const roomFolio = useMemo(
    () => folioItems.filter((f) => f.roomId === room.id),
    [folioItems, room.id]
  );

  const window1Items = useMemo(() => roomFolio.filter((f) => f.windowNo === 1), [roomFolio]);
  const window2Items = useMemo(() => roomFolio.filter((f) => f.windowNo === 2), [roomFolio]);

  const window1Balance = useMemo(
    () => window1Items.reduce((acc, item) => acc + item.amount, 0),
    [window1Items]
  );
  const window2Balance = useMemo(
    () => window2Items.reduce((acc, item) => acc + item.amount, 0),
    [window2Items]
  );
  const totalBalance = window1Balance + window2Balance;

  const handleSave = (override?: Partial<RoomReservation>, nextRoomStatus?: HotelRoom['status']) => {
    const merged: RoomReservation = { ...draft, ...override };
    if (!merged.primaryGuest.trim()) {
      merged.primaryGuest = isAr ? `نزيل غرفة ${room.roomNumber}` : `Guest Room ${room.roomNumber}`;
    }
    setDraft(merged);
    const updatedRoom: HotelRoom = {
      ...room,
      roomType: merged.roomType,
      baseRate: merged.rateAmount,
      guestName: merged.state === 'CheckedOut' || merged.state === 'Cancelled' ? '' : merged.primaryGuest,
      notes: merged.notes,
      status:
        nextRoomStatus ??
        (merged.state === 'CheckedIn'
          ? 'Occupied'
          : merged.state === 'CheckedOut'
          ? 'VacantDirty'
          : room.status),
    };
    onSaveReservation(merged, updatedRoom);
    setSaveFeedback(
      isAr
        ? `تم حفظ بيانات الغرفة #${room.roomNumber} في الخزنة الدائمة`
        : `Saved Room #${room.roomNumber} permanently`
    );
    window.setTimeout(() => setSaveFeedback(''), 2500);
  };

  const handleAddCompanion = () => {
    const cleaned = newCompanion.trim();
    if (!cleaned) return;
    setDraft((prev) => ({ ...prev, otherGuests: [...prev.otherGuests, cleaned] }));
    setNewCompanion('');
  };

  const handleAddAlert = () => {
    const cleaned = newAlert.trim();
    if (!cleaned) return;
    const nextAlerts = [...draft.alerts, cleaned];
    setDraft((prev) => ({ ...prev, alerts: nextAlerts }));
    setNewAlert('');
    handleSave({ alerts: nextAlerts });
  };

  const handleForeignInputUpdate = (nextAmtStr: string, nextCurr: CurrencyCode) => {
    setPostForeignAmt(nextAmtStr);
    setPostForeignCurr(nextCurr);
    const foreignVal = parseFloat(nextAmtStr);
    if (!Number.isNaN(foreignVal) && foreignVal > 0) {
      const rates = getExchangeRates(config);
      const baseConverted = convertCurrency(foreignVal, nextCurr, config.currency, rates);
      setPostAmount(baseConverted.toFixed(2));
    } else if (nextAmtStr.trim() === '') {
      setPostAmount('');
    }
  };

  const handlePostTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.folioLocked) return;
    const foreignNum = parseFloat(postForeignAmt);
    const rates = getExchangeRates(config);
    const rawNum =
      parseFloat(postAmount) ||
      (!Number.isNaN(foreignNum) && foreignNum > 0
        ? convertCurrency(foreignNum, postForeignCurr, config.currency, rates)
        : 0);
    if (!rawNum || rawNum <= 0) return;

    const signedAmount = postMode === 'deposit' ? -Math.abs(rawNum) : Math.abs(rawNum);
    const kind: RoomFolioItem['kind'] =
      postMode === 'deposit' ? 'deposit' : postMode === 'payout' ? 'payout' : 'charge';

    const newItem: RoomFolioItem = {
      id: `fi-${room.roomNumber}-${Date.now()}`,
      roomId: room.id,
      reservationId: draft.id,
      windowNo: postWindow,
      department: postDept.trim() || '1301 POS Charge',
      amount: Number(signedAmount.toFixed(2)),
      auditDate: config.businessDate,
      foreignAmount: !Number.isNaN(foreignNum) && foreignNum > 0 ? foreignNum : undefined,
      foreignCurrency:
        !Number.isNaN(foreignNum) && foreignNum > 0 ? postForeignCurr : undefined,
      kind,
      details: postDetails.trim() || `Room ${room.roomNumber} (${draft.primaryGuest})`,
      verified: false,
    };

    onAddFolioItem(newItem, alsoPostLedger);
    setPostAmount('');
    setPostForeignAmt('');
    setPostDetails('');
    setPostMode('none');
  };

  const [duplicateDailyWarning, setDuplicateDailyWarning] = useState(false);

  const handlePostDailyRoomCharge = (force = false) => {
    if (draft.folioLocked) return;
    const alreadyPostedToday = folioItems.some(
      (fi) => fi.kind === 'daily_room' && fi.auditDate === config.businessDate
    );
    if (alreadyPostedToday && !force) {
      setDuplicateDailyWarning(true);
      return;
    }
    setDuplicateDailyWarning(false);
    const rawRate = Number(draft.rateAmount) || room.baseRate;
    const rates = getExchangeRates(config);
    const convertedAmount =
      draft.rateCurrency !== config.currency
        ? convertCurrency(rawRate, draft.rateCurrency, config.currency, rates)
        : rawRate;
    const fxNote =
      draft.rateCurrency !== config.currency
        ? ` [FX ×${rates[draft.rateCurrency]}]`
        : '';
    const item: RoomFolioItem = {
      id: `fi-${room.roomNumber}-rm-${Date.now()}`,
      roomId: room.id,
      reservationId: draft.id,
      windowNo: 2,
      department: '1101 Room Rate Group',
      amount: Number(convertedAmount.toFixed(2)),
      auditDate: config.businessDate,
      foreignAmount: draft.rateCurrency !== config.currency ? rawRate : undefined,
      foreignCurrency: draft.rateCurrency !== config.currency ? draft.rateCurrency : undefined,
      kind: 'daily_room',
      details: `Nightly Room Charge (${draft.rateCode})${fxNote}`,
      verified: true,
    };
    onAddFolioItem(item, alsoPostLedger);
  };

  const filteredPosCatalog = useMemo(() => {
    const q = posSearch.trim().toLowerCase();
    return posCatalog.filter((item) => {
      if (posCategory !== 'ALL' && item.category !== posCategory) return false;
      if (!q) return true;
      return (
        item.nameAr.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.departmentCode.toLowerCase().includes(q) ||
        (item.sku ?? '').toLowerCase().includes(q)
      );
    });
  }, [posCatalog, posCategory, posSearch]);

  const posCartTotalBase = useMemo(() => {
    const rates = getExchangeRates(config);
    return posCart.reduce((acc, line) => {
      const unitBase = convertCurrency(line.unitPrice, line.item.currency, config.currency, rates);
      return acc + unitBase * line.qty;
    }, 0);
  }, [posCart, config]);

  const handleAddToCart = (item: PosCatalogItem) => {
    setPosCart((prev) => {
      const idx = prev.findIndex((l) => l.item.id === item.id);
      if (idx >= 0) {
        return prev.map((l, i) => (i === idx ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { item, qty: 1, unitPrice: item.price }];
    });
  };

  const handleUpdateCartQty = (itemId: string, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((l) => (l.item.id === itemId ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
    );
  };

  const handleCreateCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAr = newItemNameAr.trim();
    const cleanEn = newItemNameEn.trim() || cleanAr;
    const priceNum = parseFloat(newItemPrice);
    if (!cleanAr || Number.isNaN(priceNum) || priceNum < 0) return;

    const created: PosCatalogItem = {
      id: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      nameAr: cleanAr,
      nameEn: cleanEn,
      category: newItemCategory,
      departmentCode:
        newItemDept.trim() ||
        POS_CATEGORIES.find((c) => c.id === newItemCategory)?.defaultDept ||
        '1301 POS Outlet',
      price: Number(priceNum.toFixed(2)),
      currency: newItemCurrency,
      sku: newItemSku.trim() || undefined,
    };

    onAddPosCatalogItem(created);
    setNewItemNameAr('');
    setNewItemNameEn('');
    setNewItemPrice('');
    setNewItemSku('');
    setShowNewCatalogForm(false);
    setSaveFeedback(
      isAr
        ? `تمت إضافة الصنف "${created.nameAr}" إلى قائمة الكاشير الدائمة`
        : `Added "${created.nameEn}" to POS Catalog`
    );
    window.setTimeout(() => setSaveFeedback(''), 2500);
  };

  const handlePostPosCartToRoom = () => {
    if (posCart.length === 0 || draft.folioLocked) return;
    if (!draft.openedToPos && posSettlementMode === 'room_charge') return;

    const checkRef = posCheckNo.trim() || `POS-${room.roomNumber}-${String(Date.now()).slice(-4)}`;
    const nowStamp = Date.now();

    const rates = getExchangeRates(config);
    posCart.forEach((line, idx) => {
      const lineTotalForeign = Number((line.unitPrice * line.qty).toFixed(2));
      const lineTotalBase = convertCurrency(
        lineTotalForeign,
        line.item.currency,
        config.currency,
        rates
      );
      const itemLabel = isAr ? line.item.nameAr : line.item.nameEn;

      const folioCharge: RoomFolioItem = {
        id: `fi-${room.roomNumber}-pos-${nowStamp}-${idx}`,
        roomId: room.id,
        reservationId: draft.id,
        windowNo: posWindow,
        department: line.item.departmentCode,
        amount: Number(lineTotalBase.toFixed(2)),
        auditDate: config.businessDate,
        foreignAmount: line.item.currency !== config.currency ? lineTotalForeign : undefined,
        foreignCurrency: line.item.currency !== config.currency ? line.item.currency : undefined,
        kind: 'charge',
        details: `${checkRef} · ${line.qty}x ${itemLabel}${posOrderNote ? ` (${posOrderNote})` : ''}`,
        verified: true,
      };
      onAddFolioItem(folioCharge, alsoPostLedger);
    });

    if (posSettlementMode === 'cash_paid' && posCartTotalBase > 0) {
      const cashDeposit: RoomFolioItem = {
        id: `fi-${room.roomNumber}-pospay-${nowStamp}`,
        roomId: room.id,
        reservationId: draft.id,
        windowNo: posWindow,
        department: '2001 POS Instant Cash Payment',
        amount: -Number(posCartTotalBase.toFixed(2)),
        auditDate: config.businessDate,
        kind: 'deposit',
        details: `${checkRef} · ${isAr ? 'سداد نقدي فوري بالكاشير' : 'Instant Cash Settlement'}`,
        verified: true,
      };
      onAddFolioItem(cashDeposit, false);
    }

    const postedCount = posCart.length;
    setPosCart([]);
    setPosOrderNote('');
    setPosCheckNo(`POS-${room.roomNumber}-${String(Date.now()).slice(-4)}`);
    setSaveFeedback(
      isAr
        ? `تم ترحيل ${postedCount} أصناف (إجمالي ${formatMoney(posCartTotalBase, config.currency)}) إلى حساب غرفة #${room.roomNumber}`
        : `Posted ${postedCount} POS items (${formatMoney(posCartTotalBase, config.currency)}) to Room #${room.roomNumber}`
    );
    window.setTimeout(() => setSaveFeedback(''), 3000);
  };

  const stateMeta = STATE_BADGE[draft.state];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 flex items-start justify-center p-2 sm:p-5 overflow-y-auto no-print">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Top Kwentra Modal Header */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-red-600 text-white font-mono text-xs font-bold">
              {isAr ? `غرفة ${room.roomNumber}` : `Room ${room.roomNumber}`}
            </span>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              {activeView === 'reservation'
                ? isAr
                  ? `ملف الغرفة والحجز الفردي — ${draft.primaryGuest || room.roomType}`
                  : `Reservation — ${draft.primaryGuest || room.roomType}`
                : activeView === 'cashier'
                ? isAr
                  ? `كاشير الغرفة والأصناف (POS) — غرفة ${room.roomNumber}`
                  : `Room Cashier (POS) — Room ${room.roomNumber}`
                : isAr
                ? `الفاتورة والحساب التفصيلي (Billing) — غرفة ${room.roomNumber}`
                : `Billing Folio — Room ${room.roomNumber}`}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch between Reservation, Cashier & Billing tabs */}
            <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setActiveView('reservation')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeView === 'reservation'
                    ? 'bg-[#1967B2] text-white'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {isAr ? 'بيانات الغرفة والحجز' : 'Reservation'}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('cashier')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                  activeView === 'cashier'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                {isAr ? 'كاشير الغرفة والأصناف' : 'Room Cashier'}
              </button>
              <button
                type="button"
                onClick={() => setActiveView('billing')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                  activeView === 'billing'
                    ? 'bg-[#1967B2] text-white'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                {isAr ? 'الفاتورة (Billing)' : 'Billing'}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-600 hover:bg-slate-800 text-white flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {saveFeedback && (
          <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
        )}

        {/* ==================== RESERVATION VIEW (Images 2 & 3) ==================== */}
        {activeView === 'reservation' && (
          <div className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto bg-white">
            {/* Kwentra Action Buttons Strip */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAlertsBox((v) => !v)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded border border-red-700 flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{isAr ? 'التنبيهات' : 'Alerts'}</span>
                <span className="px-1.5 py-0.2 bg-white text-red-700 rounded-full text-[10px] font-bold">
                  {draft.alerts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRateOpen(true)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded border border-slate-300 flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5 text-[#1967B2]" />
                {isAr ? 'الأسعار والباقات' : 'Rates & Packages'}
              </button>

              <button
                type="button"
                onClick={() => setActiveView('billing')}
                className="px-3 py-1.5 text-xs font-semibold text-[#1967B2] bg-sky-50 hover:bg-sky-100 rounded border border-[#1967B2]/40 flex items-center gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5" />
                {isAr ? 'فتح الفاتورة (Billing)' : 'Billing'}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded border border-slate-300 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                {isAr ? 'طباعة' : 'Print'}
              </button>
            </div>

            {/* Alerts Drawer if toggled */}
            {showAlertsBox && (
              <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-lg space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-red-900">
                    {isAr ? 'تنبيهات الغرفة والمراجعة' : 'Room & Audit Alerts'}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newAlert}
                      onChange={(e) => setNewAlert(e.target.value)}
                      placeholder={isAr ? 'أضف تنبيهاً جديداً...' : 'Add new alert...'}
                      className="px-2.5 py-1 text-xs border border-red-300 rounded bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddAlert}
                      className="px-2.5 py-1 text-xs font-semibold bg-red-600 text-white rounded"
                    >
                      {isAr ? 'إضافة' : 'Add'}
                    </button>
                  </div>
                </div>
                {draft.alerts.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    {isAr ? 'لا توجد تنبيهات مسجلة لهذه الغرفة.' : 'No active alerts for this room.'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {draft.alerts.map((al, i) => (
                      <span
                        key={`${al}-${i}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white border border-red-200 text-red-900 rounded"
                      >
                        <span>{al}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextAlerts = draft.alerts.filter((_, idx) => idx !== i);
                            setDraft((prev) => ({ ...prev, alerts: nextAlerts }));
                            handleSave({ alerts: nextAlerts });
                          }}
                          className="text-red-500 hover:text-red-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Light Blue Summary Banner */}
            <div className="px-4 py-3 bg-[#DCEBFA] border border-[#BBD6F5] rounded-lg flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-5 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full ${draft.state === 'CheckedIn' ? 'bg-emerald-600' : 'bg-[#1967B2]'}`} />
                  <div>
                    <p className="text-[10px] text-slate-600">ID:</p>
                    <p className="font-mono font-bold text-slate-900">{draft.id}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600">{isAr ? 'الحالة:' : 'State:'}</p>
                  <p className="font-semibold text-slate-900">
                    {isAr ? stateMeta.labelAr : stateMeta.labelEn}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600">
                    {isAr ? 'رقم التأكيد:' : 'Confirmation Number:'}
                  </p>
                  <p className="font-mono font-semibold text-slate-900" dir="ltr">
                    {draft.confirmationNo}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600">{isAr ? 'الرصيد الحالي:' : 'Balance:'}</p>
                  <p className="font-mono font-bold text-[#1967B2]" dir="ltr">
                    {formatMoney(totalBalance, config.currency)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {draft.state !== 'CheckedIn' ? (
                  <button
                    type="button"
                    onClick={() => handleSave({ state: 'CheckedIn' }, 'Occupied')}
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isAr ? 'تسكين الغرفة (Check In)' : 'Check In'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSave({ state: 'Reserved' }, 'VacantClean')}
                      className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-[#1967B2] border border-slate-300 rounded flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {isAr ? 'إلغاء التسكين' : 'Undo Check In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave({ state: 'CheckedOut' }, 'VacantDirty')}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#1967B2] hover:bg-[#145594] text-white rounded"
                    >
                      {isAr ? 'تسجيل مغادرة (Check Out)' : 'Check Out'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Accordion 1: Guest Details */}
            <div className="border border-[#1967B2]/40 rounded overflow-hidden">
              <button
                type="button"
                onClick={() => setGuestOpen((v) => !v)}
                className="w-full px-4 py-2.5 bg-[#1967B2] text-white flex items-center justify-between text-sm font-semibold"
              >
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {isAr ? 'بيانات النزيل والمرافقين (Guest Details)' : 'Guest Details'}
                </span>
                {guestOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {guestOpen && (
                <div className="p-4 space-y-4 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'النزيل الرئيسي *' : 'Primary Guest *'}
                      </label>
                      <input
                        type="text"
                        value={draft.primaryGuest}
                        onChange={(e) => setDraft({ ...draft, primaryGuest: e.target.value })}
                        placeholder={isAr ? 'اسم النزيل' : 'Guest full name'}
                        className="w-full px-2.5 py-1.5 text-sm border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'إضافة مرافق (Other Guests)' : 'Add Companion Guest'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newCompanion}
                          onChange={(e) => setNewCompanion(e.target.value)}
                          placeholder={isAr ? 'اسم المرافق' : 'Companion name'}
                          className="flex-1 px-2.5 py-1.5 text-sm border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddCompanion}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          {isAr ? 'إضافة' : 'Add'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'الجنسية (Code)' : 'Nationality'}
                      </label>
                      <input
                        type="text"
                        value={draft.nationality}
                        onChange={(e) => setDraft({ ...draft, nationality: e.target.value })}
                        dir="ltr"
                        className="w-full px-2.5 py-1.5 text-sm font-mono border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Guest Chips matching Image 2 */}
                  <div className="flex flex-wrap gap-2.5">
                    {draft.primaryGuest && (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 shadow-xs rounded text-xs font-semibold text-slate-800">
                        <span>{draft.primaryGuest}</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 rounded">
                          {draft.nationality || 'EG'}
                        </span>
                      </span>
                    )}
                    {draft.otherGuests.map((cg, idx) => (
                      <span
                        key={`${cg}-${idx}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 shadow-xs rounded text-xs font-medium text-slate-700"
                      >
                        <span>{cg}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              otherGuests: draft.otherGuests.filter((_, i) => i !== idx),
                            })
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.sendBillOnCheckout}
                      onChange={(e) =>
                        setDraft({ ...draft, sendBillOnCheckout: e.target.checked })
                      }
                      className="rounded border-slate-300 text-[#1967B2]"
                    />
                    <span>
                      {isAr
                        ? 'إرسال الفاتورة النهائية لبريد النزيل عند المغادرة'
                        : "Send final bill to guest's email upon check-out"}
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Accordion 2: Reservation Details */}
            <div className="border border-[#1967B2]/40 rounded overflow-hidden">
              <button
                type="button"
                onClick={() => setResDetailsOpen((v) => !v)}
                className="w-full px-4 py-2.5 bg-[#1967B2] text-white flex items-center justify-between text-sm font-semibold"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {isAr ? 'تفاصيل الإقامة والحجز (Reservation Details)' : 'Reservation Details'}
                </span>
                {resDetailsOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {resDetailsOpen && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-white">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {isAr ? 'تاريخ الوصول (Arrival)' : 'Arrival'}
                    </label>
                    <input
                      type="date"
                      value={draft.arrival}
                      onChange={(e) => setDraft({ ...draft, arrival: e.target.value })}
                      dir="ltr"
                      className="w-full px-2 py-1.5 text-xs font-mono border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {isAr ? 'تاريخ المغادرة (Departure)' : 'Departure'}
                    </label>
                    <input
                      type="date"
                      value={draft.departure}
                      onChange={(e) => setDraft({ ...draft, departure: e.target.value })}
                      dir="ltr"
                      className="w-full px-2 py-1.5 text-xs font-mono border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {isAr ? 'القناة / الشركة (Channel)' : 'Channel'}
                    </label>
                    <select
                      value={draft.channel}
                      onChange={(e) => setDraft({ ...draft, channel: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border-b border-slate-300 bg-white focus:border-[#1967B2] focus:outline-none"
                    >
                      {CHANNELS.map((ch) => (
                        <option key={ch} value={ch}>
                          {ch}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {isAr ? 'وقت الدخول' : 'Check-In Time'}
                    </label>
                    <input
                      type="text"
                      value={draft.checkInTime}
                      onChange={(e) => setDraft({ ...draft, checkInTime: e.target.value })}
                      dir="ltr"
                      className="w-full px-2 py-1.5 text-xs font-mono border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {isAr ? 'وقت الخروج' : 'Check-Out Time'}
                    </label>
                    <input
                      type="text"
                      value={draft.checkOutTime}
                      onChange={(e) => setDraft({ ...draft, checkOutTime: e.target.value })}
                      dir="ltr"
                      className="w-full px-2 py-1.5 text-xs font-mono border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 3: Rate Plan (Image 3) */}
            <div className="border border-[#1967B2]/40 rounded overflow-hidden">
              <button
                type="button"
                onClick={() => setRateOpen((v) => !v)}
                className="w-full px-4 py-2.5 bg-[#1967B2] text-white flex items-center justify-between text-sm font-semibold"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  {isAr ? 'خطة السعر والإقامة (Rate Plan)' : 'Rate Plan'}
                </span>
                {rateOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {rateOpen && (
                <div className="p-4 space-y-4 bg-white">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'عدد البالغين *' : 'Number of Adults *'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={draft.adults}
                        onChange={(e) =>
                          setDraft({ ...draft, adults: Math.max(1, parseInt(e.target.value, 10) || 1) })
                        }
                        dir="ltr"
                        className="w-full px-2 py-1.5 text-sm font-mono border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'عدد الأطفال' : 'Number of Children'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={draft.children}
                        onChange={(e) =>
                          setDraft({ ...draft, children: Math.max(0, parseInt(e.target.value, 10) || 0) })
                        }
                        dir="ltr"
                        className="w-full px-2 py-1.5 text-sm font-mono border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'فئة الغرفة الفعلية *' : 'Room Type *'}
                      </label>
                      <select
                        value={draft.roomType}
                        onChange={(e) => setDraft({ ...draft, roomType: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border-b border-slate-300 bg-white focus:border-[#1967B2] focus:outline-none"
                      >
                        {ROOM_TYPES.map((rt) => (
                          <option key={rt} value={rt}>
                            {rt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'فئة المحاسبة (Room Type To Charge)' : 'Room Type To Charge'}
                      </label>
                      <select
                        value={draft.roomTypeToCharge}
                        onChange={(e) => setDraft({ ...draft, roomTypeToCharge: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border-b border-slate-300 bg-white focus:border-[#1967B2] focus:outline-none"
                      >
                        {ROOM_TYPES.map((rt) => (
                          <option key={rt} value={rt}>
                            {rt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'رقم الغرفة' : 'Room Number'}
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={room.roomNumber}
                        dir="ltr"
                        className="w-full px-2 py-1.5 text-sm font-mono font-bold text-slate-800 bg-slate-50 border-b border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'كود السعر (Rate)' : 'Rate Code'}
                      </label>
                      <input
                        type="text"
                        value={draft.rateCode}
                        onChange={(e) => setDraft({ ...draft, rateCode: e.target.value })}
                        dir="ltr"
                        className="w-full px-2 py-1.5 text-sm font-mono border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'نظام الوجبات (Board)' : 'Board Type'}
                      </label>
                      <select
                        value={draft.boardType}
                        onChange={(e) => setDraft({ ...draft, boardType: e.target.value as MealPlan })}
                        className="w-full px-2 py-1.5 text-xs font-mono border-b border-slate-300 bg-white focus:border-[#1967B2] focus:outline-none"
                      >
                        <option value="RO">RO (Room Only)</option>
                        <option value="BB">BB (Bed & Breakfast)</option>
                        <option value="HB">HB (Half Board)</option>
                        <option value="FB">FB (Full Board)</option>
                        <option value="AI">AI (All Inclusive)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'قيمة الليلة (Rate Amount)' : 'Rate Amount'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={draft.rateAmount}
                        onChange={(e) =>
                          setDraft({ ...draft, rateAmount: parseFloat(e.target.value) || 0 })
                        }
                        dir="ltr"
                        className="w-full px-2 py-1.5 text-sm font-mono font-semibold border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        {isAr ? 'العملة' : 'Currency'}
                      </label>
                      <select
                        value={draft.rateCurrency}
                        onChange={(e) =>
                          setDraft({ ...draft, rateCurrency: e.target.value as CurrencyCode })
                        }
                        className="w-full px-2 py-1.5 text-xs font-mono border-b border-slate-300 bg-white focus:border-[#1967B2] focus:outline-none"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 pb-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.manualRate}
                        onChange={(e) => setDraft({ ...draft, manualRate: e.target.checked })}
                        className="rounded border-slate-300 text-pink-600 focus:ring-pink-600"
                      />
                      <span>{isAr ? 'سعر يدوي (Manual Rate)' : 'Manual Rate'}</span>
                    </label>
                  </div>

                  {draft.rateCurrency !== 'EGP' && draft.rateAmount > 0 && (
                    <div className="px-3 py-2 bg-sky-50/80 border border-sky-200 rounded text-xs font-mono text-[#0B4F8C] flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {isAr ? 'المعادل التلقائي بالجنيه المصري (EGP):' : 'Auto EGP Equivalent:'}
                      </span>
                      <span className="font-bold" dir="ltr">
                        {formatMoney(
                          convertCurrency(
                            draft.rateAmount,
                            draft.rateCurrency,
                            'EGP',
                            getExchangeRates(config)
                          ),
                          'EGP'
                        )}{' '}
                        <span className="text-[11px] font-normal text-slate-600">
                          (1 {draft.rateCurrency} ={' '}
                          {convertCurrency(
                            1,
                            draft.rateCurrency,
                            'EGP',
                            getExchangeRates(config)
                          ).toFixed(2)}{' '}
                          EGP)
                        </span>
                      </span>
                    </div>
                  )}

                  {draft.roomType !== draft.roomTypeToCharge && (
                    <div className="px-4 py-2.5 bg-[#E7EFF8] border border-[#C6DAF2] rounded text-xs font-medium text-[#0B4F8C] flex items-center gap-2">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>
                        {isAr
                          ? `ترقية مجانية مطبقة: النزيل يسكن في (${draft.roomType}) ويُحاسب على فئة (${draft.roomTypeToCharge}).`
                          : `Free Room Type Upgrade is applied, the guest is currently being charged based on room type ${draft.roomTypeToCharge}.`}
                      </span>
                    </div>
                  )}

                  {/* Audit & Accounting Policy Overrides */}
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          {isAr ? 'السعر التعاقدي (Contracted)' : 'Contracted Rate'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.contractedRate ?? ''}
                          placeholder={String(draft.rateAmount)}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              contractedRate:
                                e.target.value === '' ? undefined : Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          dir="ltr"
                          className="w-full px-2 py-1.5 text-xs font-mono border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          {isAr ? 'السعر المعتمد (Approved)' : 'Approved Rate'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.approvedRate ?? ''}
                          placeholder={String(draft.rateAmount)}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              approvedRate:
                                e.target.value === '' ? undefined : Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          dir="ltr"
                          className="w-full px-2 py-1.5 text-xs font-mono border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          {isAr ? 'قيمة الخصم (Discount)' : 'Discount'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.discountAmount ?? 0}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              discountAmount: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          dir="ltr"
                          className="w-full px-2 py-1.5 text-xs font-mono border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          {isAr ? 'فرد إضافي (Extra Person)' : 'Extra Person Charge'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.extraPersonCharge ?? 0}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              extraPersonCharge: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          dir="ltr"
                          className="w-full px-2 py-1.5 text-xs font-mono border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          {isAr ? 'معتمد المجاني/الداخلي' : 'Comp/House Approved By'}
                        </label>
                        <input
                          type="text"
                          value={draft.compApprovedBy ?? ''}
                          placeholder={isAr ? 'اسم المدير المعتمد' : 'Manager / GM'}
                          onChange={(e) =>
                            setDraft({ ...draft, compApprovedBy: e.target.value })
                          }
                          className="w-full px-2 py-1.5 text-xs border-b border-slate-300 focus:border-[#1967B2] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-700">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.isEarlyCheckIn)}
                          onChange={(e) => setDraft({ ...draft, isEarlyCheckIn: e.target.checked })}
                          className="rounded border-slate-300 text-[#1967B2] focus:ring-[#1967B2]"
                        />
                        <span>{isAr ? 'تسكين مبكر (Early Check-in)' : 'Early Check-in'}</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.isLateCheckout)}
                          onChange={(e) => setDraft({ ...draft, isLateCheckout: e.target.checked })}
                          className="rounded border-slate-300 text-[#1967B2] focus:ring-[#1967B2]"
                        />
                        <span>{isAr ? 'مغادرة متأخرة (Late Checkout)' : 'Late Checkout'}</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.isEarlyDeparture)}
                          onChange={(e) => setDraft({ ...draft, isEarlyDeparture: e.target.checked })}
                          className="rounded border-slate-300 text-[#1967B2] focus:ring-[#1967B2]"
                        />
                        <span>{isAr ? 'مغادرة مبكرة (Early Departure)' : 'Early Departure'}</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.isExtendedStay)}
                          onChange={(e) => setDraft({ ...draft, isExtendedStay: e.target.checked })}
                          className="rounded border-slate-300 text-[#1967B2] focus:ring-[#1967B2]"
                        />
                        <span>{isAr ? 'تمديد إقامة (Extended Stay)' : 'Extended Stay'}</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.isNoShow)}
                          onChange={(e) => setDraft({ ...draft, isNoShow: e.target.checked })}
                          className="rounded border-slate-300 text-[#1967B2] focus:ring-[#1967B2]"
                        />
                        <span>{isAr ? 'عدم حضور (No-Show)' : 'No-Show'}</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 4: Notes */}
            <div className="border border-[#1967B2]/40 rounded overflow-hidden">
              <button
                type="button"
                onClick={() => setNotesOpen((v) => !v)}
                className="w-full px-4 py-2.5 bg-[#1967B2] text-white flex items-center justify-between text-sm font-semibold"
              >
                <span>{isAr ? 'ملاحظات المراجعة والاستقبال (Notes)' : 'Notes'}</span>
                {notesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {notesOpen && (
                <div className="p-4 bg-white">
                  <textarea
                    rows={2}
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    placeholder={isAr ? 'ملاحظات خاصة بالغرفة أو التسكين أو المراجعة...' : 'Reservation or audit notes...'}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1967B2]"
                  />
                </div>
              )}
            </div>

            {/* Bottom Save Footer */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
              <button
                type="button"
                onClick={() => handleSave()}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {isAr ? 'حفظ بيانات الغرفة (Save)' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* ==================== ROOM CASHIER (POS) & CATALOG VIEW ==================== */}
        {activeView === 'cashier' && (
          <div className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto bg-slate-50/70">
            {/* Top Room POS Context Banner */}
            <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-500">{isAr ? 'النزيل:' : 'Guest:'}</span>{' '}
                  <span className="font-bold text-slate-900">
                    {draft.primaryGuest || `Room ${room.roomNumber}`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">{isAr ? 'رقم الحجز:' : 'Res ID:'}</span>{' '}
                  <span className="font-mono font-semibold text-[#1967B2]">{draft.id}</span>
                </div>
                <div>
                  <span className="text-slate-500">{isAr ? 'رصيد الغرفة الحالي:' : 'Current Folio:'}</span>{' '}
                  <span className="font-mono font-bold text-slate-900" dir="ltr">
                    {formatMoney(totalBalance, config.currency)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave({ openedToPos: !draft.openedToPos })}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border flex items-center gap-1.5 ${
                    draft.openedToPos
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  {draft.openedToPos
                    ? isAr
                      ? 'مفتوحة لترحيل الكاشير (Opened to POS)'
                      : 'Opened to POS'
                    : isAr
                    ? 'الترحيل مغلق — اضغط للفتح'
                    : 'POS Closed — Click to Open'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowNewCatalogForm((v) => !v)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1967B2] hover:bg-[#145594] rounded flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAr ? 'إضافة صنف جديد للقائمة' : 'Add New Catalog Item'}
                </button>
              </div>
            </div>

            {draft.folioLocked && (
              <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-800 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  {isAr
                    ? 'فاتورة هذه الغرفة مقفلة حالياً (Locked). افتح القفل من تبويب Billing لإضافة مبيعات كاشير.'
                    : 'This room folio is currently locked. Unlock it in Billing to post POS charges.'}
                </span>
              </div>
            )}

            {/* Add New Catalog Item Drawer */}
            {showNewCatalogForm && (
              <form
                onSubmit={handleCreateCatalogItem}
                className="p-4 bg-white border-2 border-[#1967B2]/40 rounded-xl shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-[#1967B2]" />
                    {isAr
                      ? 'إضافة صنف جديد دائم لقائمة كاشير الفندق (يُحفظ في الخزنة بدون حذف)'
                      : 'Add Permanent POS Catalog Item'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowNewCatalogForm(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {isAr ? 'اسم الصنف (عربي) *' : 'Item Name (AR) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newItemNameAr}
                      onChange={(e) => setNewItemNameAr(e.target.value)}
                      placeholder={isAr ? 'مثال: باستا ألفريدو' : 'e.g. Alfredo Pasta'}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {isAr ? 'الاسم بالإنجليزية' : 'Item Name (EN)'}
                    </label>
                    <input
                      type="text"
                      value={newItemNameEn}
                      onChange={(e) => setNewItemNameEn(e.target.value)}
                      placeholder="Alfredo Pasta"
                      dir="ltr"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {isAr ? 'التصنيف' : 'Category'}
                    </label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => {
                        const cat = e.target.value as PosCategory;
                        setNewItemCategory(cat);
                        const match = POS_CATEGORIES.find((c) => c.id === cat);
                        if (match) setNewItemDept(match.defaultDept);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    >
                      {POS_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {isAr ? cat.labelAr : cat.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {isAr ? 'كود القسم المحاسبي' : 'Department Code'}
                    </label>
                    <input
                      type="text"
                      value={newItemDept}
                      onChange={(e) => setNewItemDept(e.target.value)}
                      dir="ltr"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {isAr ? 'السعر والعملة *' : 'Unit Price *'}
                    </label>
                    <div className="flex gap-1" dir="ltr">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                      />
                      <select
                        value={newItemCurrency}
                        onChange={(e) => setNewItemCurrency(e.target.value as CurrencyCode)}
                        className="px-1.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    {newItemCurrency !== 'EGP' && (parseFloat(newItemPrice) || 0) > 0 && (
                      <p className="mt-1 text-[10px] font-mono text-emerald-700" dir="ltr">
                        ≈{' '}
                        {formatMoney(
                          convertCurrency(
                            parseFloat(newItemPrice) || 0,
                            newItemCurrency,
                            'EGP',
                            getExchangeRates(config)
                          ),
                          'EGP'
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {isAr ? 'كود الصنف (SKU)' : 'SKU (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={newItemSku}
                      onChange={(e) => setNewItemSku(e.target.value)}
                      placeholder="FB-305"
                      dir="ltr"
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCatalogForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isAr ? 'حفظ الصنف في القائمة' : 'Save Catalog Item'}
                  </button>
                </div>
              </form>
            )}

            {/* Split POS Terminal Grid: Catalog (Left) + Room Cart (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Catalog Section */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={posSearch}
                      onChange={(e) => setPosSearch(e.target.value)}
                      placeholder={
                        isAr ? 'ابحث باسم الصنف أو الكود أو القسم...' : 'Search item, SKU, or dept...'
                      }
                      className="w-full ps-8 pe-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {filteredPosCatalog.length} {isAr ? 'صنف' : 'items'}
                  </span>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPosCategory('ALL')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                      posCategory === 'ALL'
                        ? 'bg-[#1967B2] text-white border-[#1967B2]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isAr ? 'الكل' : 'All'}
                  </button>
                  {POS_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPosCategory(cat.id)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                        posCategory === cat.id
                          ? 'bg-[#1967B2] text-white border-[#1967B2]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isAr ? cat.labelAr : cat.labelEn}
                    </button>
                  ))}
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pe-1">
                  {filteredPosCatalog.map((item) => {
                    const catMeta = POS_CATEGORIES.find((c) => c.id === item.category);
                    const inCartQty = posCart.find((l) => l.item.id === item.id)?.qty ?? 0;
                    return (
                      <div
                        key={item.id}
                        className={`relative group border rounded-lg p-3 transition-all flex items-center justify-between gap-2 ${
                          inCartQty > 0
                            ? 'border-emerald-500 bg-emerald-50/40'
                            : 'border-slate-200 bg-white hover:border-[#1967B2]/60 hover:bg-sky-50/30'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          className="flex-1 text-start min-w-0"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-[#1967B2] bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded">
                              {isAr ? catMeta?.labelAr : catMeta?.labelEn}
                            </span>
                            {item.sku && (
                              <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                            )}
                            {inCartQty > 0 && (
                              <span className="text-[10px] font-mono font-bold text-white bg-emerald-600 px-1.5 py-0.2 rounded">
                                x{inCartQty}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-900 mt-1 truncate">
                            {isAr ? item.nameAr : item.nameEn}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">{item.departmentCode}</p>
                        </button>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAddToCart(item)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-mono font-bold tabular-nums"
                            dir="ltr"
                          >
                            + {item.price} {item.currency}
                          </button>
                          <button
                            type="button"
                            onClick={() => onArchivePosCatalogItem(item.id)}
                            title={isAr ? 'أرشفة الصنف' : 'Archive Item'}
                            className="text-slate-300 hover:text-red-600 transition-colors p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Room Cashier Order Cart */}
              <div className="lg:col-span-5 bg-white border border-slate-300 rounded-xl overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 bg-[#1967B2] text-white flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Receipt className="w-4 h-4" />
                    <span>
                      {isAr
                        ? `فاتورة كاشير الغرفة #${room.roomNumber}`
                        : `Room #${room.roomNumber} POS Check`}
                    </span>
                  </div>
                  {posCart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPosCart([])}
                      className="text-[11px] bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded"
                    >
                      {isAr ? 'إفراغ السلة' : 'Clear'}
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {/* Cart Line Items */}
                  {posCart.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg">
                      <ShoppingCart className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs text-slate-500">
                        {isAr
                          ? 'اضغط على أي صنف من القائمة لإضافته لفاتورة الغرفة'
                          : 'Tap any catalog item to add to this room check'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pe-1">
                      {posCart.map((line) => (
                        <div
                          key={line.item.id}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 truncate">
                              {isAr ? line.item.nameAr : line.item.nameEn}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                              <span>{isAr ? 'السعر:' : 'Price:'}</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice}
                                onChange={(e) => {
                                  const nextPrice = Math.max(0, parseFloat(e.target.value) || 0);
                                  setPosCart((prev) =>
                                    prev.map((l) =>
                                      l.item.id === line.item.id ? { ...l, unitPrice: nextPrice } : l
                                    )
                                  );
                                }}
                                dir="ltr"
                                className="w-20 px-1.5 py-0.5 font-mono text-[11px] border border-slate-300 rounded bg-white"
                              />
                              <span className="font-mono">{line.item.currency}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(line.item.id, -1)}
                              className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-mono font-bold">{line.qty}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(line.item.id, 1)}
                              className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-end font-mono font-bold text-slate-900 min-w-[78px]" dir="ltr">
                            <div>
                              {(line.unitPrice * line.qty).toFixed(2)} {line.item.currency}
                            </div>
                            {line.item.currency !== 'EGP' && (
                              <div className="text-[10px] font-normal text-emerald-700">
                                ≈{' '}
                                {formatMoney(
                                  convertCurrency(
                                    line.unitPrice * line.qty,
                                    line.item.currency,
                                    'EGP',
                                    getExchangeRates(config)
                                  ),
                                  'EGP'
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Posting Controls */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">
                        {isAr ? 'نافذة الترحيل' : 'Folio Window'}
                      </label>
                      <select
                        value={posWindow}
                        onChange={(e) => setPosWindow(Number(e.target.value) as 1 | 2)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value={1}>Window 1 ({isAr ? 'النزيل' : 'Guest'})</option>
                        <option value={2}>Window 2 ({draft.window2Label})</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">
                        {isAr ? 'طريقة التسوية' : 'Settlement'}
                      </label>
                      <select
                        value={posSettlementMode}
                        onChange={(e) =>
                          setPosSettlementMode(e.target.value as 'room_charge' | 'cash_paid')
                        }
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value="room_charge">
                          {isAr ? 'ترحيل على الغرفة (Room Charge)' : 'Charge to Room'}
                        </option>
                        <option value="cash_paid">
                          {isAr ? 'تحصيل نقدي فوري (Cash Paid)' : 'Instant Cash Paid'}
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">
                        {isAr ? 'رقم الشيك (Check #)' : 'Check Ref #'}
                      </label>
                      <input
                        type="text"
                        value={posCheckNo}
                        onChange={(e) => setPosCheckNo(e.target.value)}
                        dir="ltr"
                        className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">
                        {isAr ? 'ملاحظة الطلب' : 'Order Note'}
                      </label>
                      <input
                        type="text"
                        value={posOrderNote}
                        onChange={(e) => setPosOrderNote(e.target.value)}
                        placeholder={isAr ? 'طاولة / توقيت...' : 'Note...'}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alsoPostLedger}
                      onChange={(e) => setAlsoPostLedger(e.target.checked)}
                      className="rounded border-slate-300 text-[#1967B2]"
                    />
                    <span>
                      {isAr
                        ? 'ترحيل قيود POS تلقائياً إلى دفتر المراجعة اليومي'
                        : 'Auto-post POS entries to Daily Income Audit Ledger'}
                    </span>
                  </label>

                  {/* Total & Submit */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      {isAr ? 'إجمالي شيك الكاشير:' : 'POS Check Total:'}
                    </span>
                    <span className="text-base font-bold font-mono tabular-nums text-slate-900" dir="ltr">
                      {formatMoney(posCartTotalBase, config.currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={
                        posCart.length === 0 ||
                        draft.folioLocked ||
                        (!draft.openedToPos && posSettlementMode === 'room_charge')
                      }
                      onClick={handlePostPosCartToRoom}
                      className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {!draft.openedToPos && posSettlementMode === 'room_charge'
                        ? isAr
                          ? 'الترحيل للغرفة مغلق (POS Closed)'
                          : 'Room POS Closed'
                        : isAr
                        ? 'اعتماد وترحيل لفاتورة الغرفة'
                        : 'Post POS Order to Room'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('billing')}
                      className="py-2.5 px-3 text-xs font-semibold text-[#1967B2] bg-sky-50 hover:bg-sky-100 border border-[#1967B2]/30 rounded-lg"
                    >
                      {isAr ? 'عرض الفاتورة' : 'View Folio'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== BILLING / SPLIT FOLIO VIEW (Image 4) ==================== */}
        {activeView === 'billing' && (
          <div className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto bg-white">
            {/* Billing Top Toolbar matching Image 4 */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <button
                type="button"
                disabled={draft.folioLocked}
                onClick={() => {
                  setPostMode('charge');
                  setPostDept('1301 Main Restaurant Beverage');
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded disabled:opacity-40 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-[#1967B2]" />
                {isAr ? 'إضافة بند (Manual Charges)' : 'Manual Charges'}
              </button>
              <button
                type="button"
                disabled={draft.folioLocked}
                onClick={() => {
                  setPostMode('deposit');
                  setPostDept('2001 Cash / Card Deposit');
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded disabled:opacity-40"
              >
                {isAr ? 'دفعة / عربون (Deposit)' : 'Deposit'}
              </button>
              <button
                type="button"
                disabled={draft.folioLocked}
                onClick={() => {
                  setPostMode('payout');
                  setPostDept('2100 Guest Paid Out');
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded disabled:opacity-40"
              >
                {isAr ? 'مصروف نقدي (Pay Out)' : 'Pay Out'}
              </button>

              <button
                type="button"
                onClick={() => handleSave({ openedToPos: !draft.openedToPos })}
                className={`px-3 py-1.5 text-xs font-semibold rounded border flex items-center gap-1.5 transition-colors ${
                  draft.openedToPos
                    ? 'bg-emerald-500 text-white border-emerald-600'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                {draft.openedToPos
                  ? isAr
                    ? 'مفتوحة للمطاعم (Opened to POS)'
                    : 'Opened to POS'
                  : isAr
                  ? 'مغلقة على POS'
                  : 'POS Closed'}
              </button>

              <button
                type="button"
                disabled={draft.folioLocked}
                onClick={() => handlePostDailyRoomCharge(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded disabled:opacity-40"
              >
                {isAr ? 'ترحيل رسوم الليلة (Post Daily)' : 'Post Daily Charges'}
              </button>

              <button
                type="button"
                onClick={() => handleSave({ state: 'CheckedOut' }, 'VacantDirty')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1967B2] hover:bg-[#145594] rounded"
              >
                {isAr ? 'تسجيل مغادرة (Check Out)' : 'Check Out'}
              </button>

              <button
                type="button"
                onClick={() => handleSave({ folioLocked: !draft.folioLocked })}
                className={`px-3 py-1.5 text-xs font-semibold rounded flex items-center gap-1 ${
                  draft.folioLocked
                    ? 'bg-red-500 text-white'
                    : 'bg-rose-400/90 hover:bg-rose-500 text-white'
                }`}
              >
                {draft.folioLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {draft.folioLocked ? (isAr ? 'مقفل (Locked)' : 'Locked') : isAr ? 'قفل الفاتورة' : 'Lock'}
              </button>
            </div>

            {duplicateDailyWarning && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
                <span>
                  {isAr
                    ? `تم ترحيل رسوم الغرفة اليومية بالفعل لتاريخ ${config.businessDate}. هل تريد تأكيد الترحيل المكرر؟`
                    : `Daily room charge already posted for ${config.businessDate}. Confirm duplicate posting?`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateDailyWarning(false)}
                    className="px-2.5 py-1 border border-amber-300 bg-white rounded text-slate-700"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePostDailyRoomCharge(true)}
                    className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded"
                  >
                    {isAr ? 'تأكيد الترحيل' : 'Confirm Post'}
                  </button>
                </div>
              </div>
            )}

            {/* Inline Quick-Post Form when Charge / Deposit / Pay Out clicked */}
            {postMode !== 'none' && (
              <form
                onSubmit={handlePostTransaction}
                className="p-4 bg-slate-50 border border-[#1967B2]/40 rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">
                    {postMode === 'deposit'
                      ? isAr
                        ? 'تسجيل دفعة / تحصيل على الفاتورة'
                        : 'Post Guest Deposit / Payment'
                      : postMode === 'payout'
                      ? isAr
                        ? 'تسجيل مصروف نقدي (Paid Out)'
                        : 'Post Cash Paid Out'
                      : isAr
                      ? 'إضافة بند / فاتورة يدوية للغرفة'
                      : 'Add Manual Charge to Folio'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setPostMode('none')}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      {isAr ? 'نافذة الفاتورة' : 'Folio Window'}
                    </label>
                    <select
                      value={postWindow}
                      onChange={(e) => setPostWindow(Number(e.target.value) as 1 | 2)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    >
                      <option value={1}>Window 1 ({isAr ? 'النزيل' : 'Guest'})</option>
                      <option value={2}>Window 2 ({draft.window2Label})</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      {isAr ? 'القسم / المنفذ' : 'Department'}
                    </label>
                    <input
                      type="text"
                      value={postDept}
                      onChange={(e) => setPostDept(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      {isAr
                        ? `مبلغ أجنبي (يحسب ${config.currency} تلقائياً)`
                        : `Foreign Amount (Auto → ${config.currency})`}
                    </label>
                    <div className="flex gap-1" dir="ltr">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={postForeignAmt}
                        onChange={(e) => handleForeignInputUpdate(e.target.value, postForeignCurr)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white focus:ring-2 focus:ring-[#1967B2] focus:outline-none"
                      />
                      <select
                        value={postForeignCurr}
                        onChange={(e) =>
                          handleForeignInputUpdate(postForeignAmt, e.target.value as CurrencyCode)
                        }
                        className="px-1.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    {postForeignCurr !== 'EGP' && (
                      <p className="mt-1 text-[10px] font-mono text-[#1967B2]" dir="ltr">
                        1 {postForeignCurr} ={' '}
                        {convertCurrency(
                          1,
                          postForeignCurr,
                          'EGP',
                          getExchangeRates(config)
                        ).toFixed(2)}{' '}
                        EGP
                        {(parseFloat(postForeignAmt) || 0) > 0 && config.currency !== 'EGP'
                          ? ` · ≈ ${formatMoney(
                              convertCurrency(
                                parseFloat(postForeignAmt) || 0,
                                postForeignCurr,
                                'EGP',
                                getExchangeRates(config)
                              ),
                              'EGP'
                            )}`
                          : ''}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      {isAr
                        ? `المبلغ المحسوب (${config.currency})`
                        : `Amount (${config.currency})`}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={postAmount}
                      onChange={(e) => setPostAmount(e.target.value)}
                      dir="ltr"
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      {isAr ? 'التفاصيل / المرجع' : 'Details / Ref'}
                    </label>
                    <input
                      type="text"
                      value={postDetails}
                      onChange={(e) => setPostDetails(e.target.value)}
                      placeholder={isAr ? 'مثال: شيك مطعم #104' : 'Check / Voucher #'}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alsoPostLedger}
                      onChange={(e) => setAlsoPostLedger(e.target.checked)}
                      className="rounded border-slate-300 text-[#1967B2]"
                    />
                    <span>
                      {isAr
                        ? 'ترحيل قيد مطابق تلقائياً إلى دفتر المراجعة اليومي (Outage Ledger)'
                        : 'Also post matching entry to Daily Income Audit Ledger'}
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1967B2] hover:bg-[#145594] rounded"
                  >
                    {isAr ? 'ترحيل البند الآن' : 'Post to Folio'}
                  </button>
                </div>
              </form>
            )}

            {/* Reservation Summary Header Strip matching Image 4 */}
            <div className="border border-[#1967B2] rounded overflow-hidden">
              <div className="px-4 py-2 bg-[#1967B2] text-white text-sm font-semibold">
                {isAr ? 'ملخص إقامة الغرفة (Reservation Summary)' : 'Reservation Summary'}
              </div>
              <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-6 gap-3 items-center text-xs bg-white">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
                    <span>{draft.state}</span>
                  </div>
                  <p className="text-slate-600">
                    Check-in: <span className="font-mono text-slate-900">{draft.checkInTime}</span>
                  </p>
                  <p className="text-slate-600">
                    Channel: <span className="font-semibold text-slate-900">{draft.channel}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-600">
                    ID: <span className="font-mono font-bold text-[#1967B2]">{draft.id}</span>
                  </p>
                  <p className="text-slate-600">
                    Check-out: <span className="font-mono text-slate-900">{draft.checkOutTime}</span>
                  </p>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <p className="text-slate-600">
                    Name: <span className="font-bold text-slate-900">{draft.primaryGuest}</span>
                  </p>
                  <p className="text-slate-600">
                    Adults: <span className="font-mono font-semibold text-slate-900">{draft.adults}</span> ·
                    Children: <span className="font-mono font-semibold text-slate-900">{draft.children}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-600">
                    Arrival: <span className="font-mono text-slate-900">{draft.arrival}</span>
                  </p>
                  <p className="text-slate-600">
                    Departure: <span className="font-mono text-slate-900">{draft.departure}</span>
                  </p>
                  <p className="text-slate-600">
                    Room: <span className="font-mono font-bold text-red-700">{room.roomNumber}</span>
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {isAr ? 'الرصيد الإجمالي (Balance)' : 'Balance'}
                  </p>
                  <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5" dir="ltr">
                    {formatMoney(totalBalance, config.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Dual Split Folio Windows (Window 1 & Window 2) matching Image 4 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Window 1: Guest Extras */}
              <div className="border border-slate-300 rounded overflow-hidden flex flex-col">
                <div className="px-3 py-2 bg-[#1967B2] text-white flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">
                    Window 1 — {isAr ? 'حساب النزيل الشخصي' : 'Guest Personal Extras'}
                  </span>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-1 bg-white/15 hover:bg-white/25 rounded text-white"
                    title="Print Window 1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-3 py-2 bg-[#236AB9] text-white flex items-center justify-between text-xs font-semibold border-t border-white/20">
                  <span>Balance: {formatMoney(window1Balance, config.currency)}</span>
                  <span className="font-mono">({window1Items.length})</span>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-[11px] text-start border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="py-2 px-2.5 text-start">Department</th>
                        <th className="py-2 px-2.5 text-end">Amount</th>
                        <th className="py-2 px-2.5 text-start">Audit</th>
                        <th className="py-2 px-2.5 text-end">Foreign</th>
                        <th className="py-2 px-2.5 text-start">Details</th>
                        <th className="py-2 px-2 text-center">✓</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {window1Items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            {isAr ? 'لا توجد بنود في Window 1' : 'No charges in Window 1'}
                          </td>
                        </tr>
                      ) : (
                        window1Items.map((fi) => (
                          <tr key={fi.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2.5 font-medium text-slate-800">
                              <span>{fi.department}</span>
                              <span className="block text-[10px] font-mono text-slate-400" dir="ltr">
                                #{fi.id.slice(-8)}
                              </span>
                            </td>
                            <td
                              className={`py-2 px-2.5 text-end font-mono font-semibold tabular-nums ${
                                fi.amount < 0 ? 'text-emerald-700' : 'text-slate-900'
                              }`}
                              dir="ltr"
                            >
                              {fi.amount.toFixed(2)}
                            </td>
                            <td className="py-2 px-2.5 font-mono text-slate-600" dir="ltr">
                              {fi.auditDate}
                            </td>
                            <td className="py-2 px-2.5 text-end font-mono text-slate-600" dir="ltr">
                              {fi.foreignAmount ? `${fi.foreignAmount} ${fi.foreignCurrency}` : '—'}
                            </td>
                            <td className="py-2 px-2.5 text-slate-600 max-w-[140px] truncate" title={fi.details}>
                              {fi.details || '—'}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onToggleFolioVerified(fi.id)}
                                  className={fi.verified ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-600'}
                                  title="Verify"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                {!draft.folioLocked && (
                                  <button
                                    type="button"
                                    onClick={() => onArchiveFolioItem(fi.id)}
                                    className="text-slate-300 hover:text-red-600"
                                    title="Archive item"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Window 2: City Ledger / Agency */}
              <div className="border border-slate-300 rounded overflow-hidden flex flex-col">
                <div className="px-3 py-2 bg-[#1967B2] text-white flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={draft.window2Label}
                    onChange={(e) => setDraft({ ...draft, window2Label: e.target.value })}
                    onBlur={() => handleSave({ window2Label: draft.window2Label })}
                    className="bg-white/15 text-white placeholder:text-white/70 text-xs font-bold px-2 py-0.5 rounded w-full focus:outline-none focus:bg-white/25"
                  />
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-1 bg-white/15 hover:bg-white/25 rounded text-white shrink-0"
                    title="Print Window 2"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-3 py-2 bg-[#236AB9] text-white flex items-center justify-between text-xs font-semibold border-t border-white/20">
                  <span>Balance: {formatMoney(window2Balance, config.currency)}</span>
                  <span className="font-mono">({window2Items.length})</span>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-[11px] text-start border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="py-2 px-2.5 text-start">Department</th>
                        <th className="py-2 px-2.5 text-end">Amount</th>
                        <th className="py-2 px-2.5 text-start">Audit</th>
                        <th className="py-2 px-2.5 text-end">Foreign</th>
                        <th className="py-2 px-2.5 text-start">Details</th>
                        <th className="py-2 px-2 text-center">✓</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {window2Items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            {isAr ? 'لا توجد بنود في Window 2' : 'No charges in Window 2'}
                          </td>
                        </tr>
                      ) : (
                        window2Items.map((fi) => (
                          <tr key={fi.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2.5 font-medium text-slate-800">
                              <span>{fi.department}</span>
                              <span className="block text-[10px] font-mono text-slate-400" dir="ltr">
                                #{fi.id.slice(-8)}
                              </span>
                            </td>
                            <td
                              className={`py-2 px-2.5 text-end font-mono font-semibold tabular-nums ${
                                fi.amount < 0 ? 'text-emerald-700' : 'text-slate-900'
                              }`}
                              dir="ltr"
                            >
                              {fi.amount.toFixed(2)}
                            </td>
                            <td className="py-2 px-2.5 font-mono text-slate-600" dir="ltr">
                              {fi.auditDate}
                            </td>
                            <td className="py-2 px-2.5 text-end font-mono text-slate-600" dir="ltr">
                              {fi.foreignAmount ? `${fi.foreignAmount} ${fi.foreignCurrency}` : '—'}
                            </td>
                            <td className="py-2 px-2.5 text-slate-600 max-w-[140px] truncate" title={fi.details}>
                              {fi.details || '—'}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onToggleFolioVerified(fi.id)}
                                  className={fi.verified ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-600'}
                                  title="Verify"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                {!draft.folioLocked && (
                                  <button
                                    type="button"
                                    onClick={() => onArchiveFolioItem(fi.id)}
                                    className="text-slate-300 hover:text-red-600"
                                    title="Archive item"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
