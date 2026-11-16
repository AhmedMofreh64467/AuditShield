import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BedDouble,
  Bell,
  CheckCircle2,
  DollarSign,
  DoorOpen,
  Grid2x2,
  ImagePlus,
  Layers,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { LanguageCode } from '../i18n/translations';
import {
  HotelConfig,
  HotelRoom,
  PosCatalogItem,
  RoomFolioItem,
  RoomRackStatus,
  RoomReservation,
} from '../types/audit';
import { formatMoney } from '../utils/auditEngine';
import { RoomProfileModal } from './RoomProfileModal';

interface RoomRackManagerProps {
  lang: LanguageCode;
  config: HotelConfig;
  rooms: HotelRoom[];
  reservations?: RoomReservation[];
  folioItems?: RoomFolioItem[];
  posCatalog?: PosCatalogItem[];
  onAddRoom: (room: HotelRoom) => void;
  onAddRoomsBulk: (newRooms: HotelRoom[]) => void;
  onUpdateRoom: (room: HotelRoom) => void;
  onDeleteRoom: (id: string) => void;
  onSyncToOccupancy: (rooms: HotelRoom[]) => void;
  onSaveReservation?: (res: RoomReservation, updatedRoom?: HotelRoom) => void;
  onAddFolioItem?: (item: RoomFolioItem, alsoPostToLedger: boolean) => void;
  onToggleFolioVerified?: (itemId: string) => void;
  onArchiveFolioItem?: (itemId: string) => void;
  onAddPosCatalogItem?: (item: PosCatalogItem) => void;
  onArchivePosCatalogItem?: (itemId: string) => void;
  focusRoomId?: string | null;
  onClearFocusRoom?: () => void;
}

const ROOM_TYPES = [
  'Standard King',
  'Twin Classic',
  'Deluxe Nile View',
  'Junior Suite',
  'Executive Suite',
  'Family Room',
];

const STATUS_META: Record<
  RoomRackStatus,
  {
    bg: string;
    border: string;
    text: string;
    ar: string;
    en: string;
    fr: string;
  }
> = {
  Occupied: {
    bg: 'bg-sky-50/80',
    border: 'border-[#0088CC]',
    text: 'text-[#006699]',
    ar: 'مسكونة (Occupied)',
    en: 'Occupied',
    fr: 'Occupée',
  },
  VacantClean: {
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-500',
    text: 'text-emerald-800',
    ar: 'شاغرة نظيفة (VC)',
    en: 'Vacant Clean',
    fr: 'Libre Propre',
  },
  VacantDirty: {
    bg: 'bg-amber-50/70',
    border: 'border-amber-500',
    text: 'text-amber-800',
    ar: 'تحت النظافة (VD)',
    en: 'Vacant Dirty',
    fr: 'Libre Sale',
  },
  OutOfOrder: {
    bg: 'bg-red-50/70',
    border: 'border-red-500',
    text: 'text-red-800',
    ar: 'خارج الخدمة (OOO)',
    en: 'Out of Order',
    fr: 'Hors Service',
  },
  Complimentary: {
    bg: 'bg-purple-50/70',
    border: 'border-purple-500',
    text: 'text-purple-800',
    ar: 'مجانية (Comp)',
    en: 'Complimentary',
    fr: 'Gratuite (Comp)',
  },
  HouseUse: {
    bg: 'bg-slate-100',
    border: 'border-slate-400',
    text: 'text-slate-700',
    ar: 'استخدام داخلي (House)',
    en: 'House Use',
    fr: 'Usage Interne',
  },
};

const COPY: Record<
  LanguageCode,
  {
    title: string;
    subtitle: string;
    importImageBtn: string;
    syncBtn: string;
    syncedNotice: string;
    totalRooms: string;
    occupied: string;
    vacantClean: string;
    vacantDirty: string;
    ooo: string;
    compHouse: string;
    addSingleTitle: string;
    addBulkToggle: string;
    bulkTitle: string;
    roomNumber: string;
    floor: string;
    roomType: string;
    baseRate: string;
    maxOcc: string;
    status: string;
    guestName: string;
    notes: string;
    addBtn: string;
    rangeStart: string;
    rangeEnd: string;
    generateRangeBtn: string;
    duplicateErr: string;
    addedMsg: string;
    bulkAddedMsg: string;
    bulkNoneMsg: string;
    searchPlaceholder: string;
    allFloors: string;
    allStatuses: string;
    gridView: string;
    tableView: string;
    emptyMsg: string;
    imageScanTitle: string;
    imageScanSubtitle: string;
    scanningText: string;
    noRoomsExtracted: string;
    extractedReadyTitle: string;
    confirmImportRoomsBtn: string;
    cancelImportBtn: string;
    alreadyExistsTag: string;
  }
> = {
  ar: {
    title: 'إدارة وإضافة غرف الفندق (يدوياً أو باستيراد صورة)',
    subtitle:
      'أضف غرف الفندق يدوياً غرفة بغرفة، أو بنطاق أرقام، أو استورد صورة كشف الغرف / شاشة Kwentra ليتم التعرف عليها وإضافتها تلقائياً',
    importImageBtn: 'استيراد غرف من صورة',
    syncBtn: 'مزامنة العدد والإشغال مع اللوحة',
    syncedNotice: 'تمت مزامنة إجمالي الغرف ونسبة الإشغال مع الإعدادات ولوحة المراجعة.',
    totalRooms: 'إجمالي الغرف المعرّفة',
    occupied: 'مسكونة',
    vacantClean: 'شاغرة نظيفة',
    vacantDirty: 'تحت النظافة',
    ooo: 'خارج الخدمة (OOO)',
    compHouse: 'مجانية / داخلي',
    addSingleTitle: 'إضافة غرفة يدوياً',
    addBulkToggle: 'إضافة مجموعة غرف بنطاق أرقام',
    bulkTitle: 'توليد مجموعة غرف دفعة واحدة (مثال: 101 إلى 120)',
    roomNumber: 'رقم الغرفة',
    floor: 'الدور / الطابق',
    roomType: 'نوع الغرفة',
    baseRate: 'السعر الأساسي',
    maxOcc: 'أقصى نزلاء',
    status: 'الحالة الحالية',
    guestName: 'اسم النزيل (اختياري)',
    notes: 'ملاحظات',
    addBtn: 'إضافة الغرفة',
    rangeStart: 'من غرفة رقم',
    rangeEnd: 'إلى غرفة رقم',
    generateRangeBtn: 'إضافة النطاق الآن',
    duplicateErr: 'رقم الغرفة مسجل بالفعل في قائمة الفندق.',
    addedMsg: 'تمت إضافة الغرفة بنجاح:',
    bulkAddedMsg: 'تمت إضافة غرف جديدة:',
    bulkNoneMsg: 'جميع الأرقام في هذا النطاق مسجلة مسبقاً أو النطاق غير صالح.',
    searchPlaceholder: 'بحث برقم الغرفة، النوع، أو اسم النزيل...',
    allFloors: 'كل الأدوار',
    allStatuses: 'كل الحالات',
    gridView: 'عرض الشبكة (Rack)',
    tableView: 'عرض الجدول',
    emptyMsg: 'لا توجد غرف مطابقة لمعايير التصفية الحالية.',
    imageScanTitle: 'استخراج غرف الفندق تلقائياً من صورة',
    imageScanSubtitle:
      'ارفع صورة شاشة Room Rack أو جدول غرف من Excel أو ورقة مطبوعة وسيتم قراءة الغرف وإضافتها تلقائياً',
    scanningText: 'جاري قراءة الصورة واستخراج أرقام الغرف والأسعار والحالات...',
    noRoomsExtracted: 'لم يتم العثور على غرف واضحة في الصورة. جرّب صورة أوضح أو أضفها يدوياً.',
    extractedReadyTitle: 'الغرف المستخرجة من الصورة (راجعها ثم اضغط اعتماد الإضافة)',
    confirmImportRoomsBtn: 'اعتماد وإضافة الغرف المحددة',
    cancelImportBtn: 'إلغاء المعاينة',
    alreadyExistsTag: 'مسجلة مسبقاً',
  },
  en: {
    title: 'Hotel Rooms & Room Rack (Manual or Image Import)',
    subtitle:
      'Add hotel rooms manually one by one, generate a room number range, or upload a room sheet/PMS screenshot to extract rooms automatically',
    importImageBtn: 'Import Rooms from Image',
    syncBtn: 'Sync Room Counts to Dashboard KPIs',
    syncedNotice: 'Total rooms and occupancy KPIs synchronized with Room Rack.',
    totalRooms: 'Total Defined Rooms',
    occupied: 'Occupied',
    vacantClean: 'Vacant Clean',
    vacantDirty: 'Vacant Dirty',
    ooo: 'Out of Order',
    compHouse: 'Comp / House',
    addSingleTitle: 'Add Room Manually',
    addBulkToggle: 'Bulk Range Builder',
    bulkTitle: 'Generate Room Range in Bulk (e.g., 101 to 120)',
    roomNumber: 'Room #',
    floor: 'Floor',
    roomType: 'Room Type',
    baseRate: 'Base Rate',
    maxOcc: 'Max Pax',
    status: 'Status',
    guestName: 'Guest Name (Optional)',
    notes: 'Notes',
    addBtn: 'Add Room',
    rangeStart: 'Start Room #',
    rangeEnd: 'End Room #',
    generateRangeBtn: 'Add Room Range',
    duplicateErr: 'This room number already exists in the hotel inventory.',
    addedMsg: 'Room added successfully:',
    bulkAddedMsg: 'Rooms added:',
    bulkNoneMsg: 'All rooms in this range already exist or range is invalid.',
    searchPlaceholder: 'Search room #, type, or guest...',
    allFloors: 'All Floors',
    allStatuses: 'All Statuses',
    gridView: 'Room Rack Grid',
    tableView: 'Table View',
    emptyMsg: 'No rooms match your current filter.',
    imageScanTitle: 'Automatic Room Extraction from Image',
    imageScanSubtitle:
      'Upload a screenshot of Kwentra/Opera Room Rack, an Excel table photo, or floor sheet to import rooms automatically',
    scanningText: 'Scanning image and extracting room numbers, types, rates, and statuses...',
    noRoomsExtracted: 'No clear room entries were detected in this image.',
    extractedReadyTitle: 'Extracted Rooms Preview (Review & Confirm)',
    confirmImportRoomsBtn: 'Add Selected Rooms to Inventory',
    cancelImportBtn: 'Discard Preview',
    alreadyExistsTag: 'Already Exists',
  },
  fr: {
    title: 'Chambres d’Hôtel (Ajout Manuel ou Import Image)',
    subtitle:
      'Ajoutez des chambres manuellement, par série numérique, ou importez une image/capture d’écran pour extraire automatiquement les chambres',
    importImageBtn: 'Importer via Image',
    syncBtn: 'Synchroniser avec le Tableau de Bord',
    syncedNotice: 'Nombre de chambres et indicateurs synchronisés.',
    totalRooms: 'Total Chambres',
    occupied: 'Occupées',
    vacantClean: 'Libres Propres',
    vacantDirty: 'Libres Sales',
    ooo: 'Hors Service',
    compHouse: 'Comp / Interne',
    addSingleTitle: 'Ajouter une Chambre',
    addBulkToggle: 'Générateur par Série',
    bulkTitle: 'Ajouter une Série de Chambres (ex. 101 à 120)',
    roomNumber: 'Chambre #',
    floor: 'Étage',
    roomType: 'Catégorie',
    baseRate: 'Tarif de Base',
    maxOcc: 'Capacité Max',
    status: 'Statut',
    guestName: 'Nom Client (Optionnel)',
    notes: 'Remarques',
    addBtn: 'Ajouter Chambre',
    rangeStart: 'De la chambre',
    rangeEnd: 'À la chambre',
    generateRangeBtn: 'Générer la Série',
    duplicateErr: 'Ce numéro de chambre existe déjà.',
    addedMsg: 'Chambre ajoutée :',
    bulkAddedMsg: 'Chambres ajoutées :',
    bulkNoneMsg: 'Plage invalide ou chambres déjà existantes.',
    searchPlaceholder: 'Rechercher chambre, type ou client...',
    allFloors: 'Tous les Étages',
    allStatuses: 'Tous les Statuts',
    gridView: 'Vue Room Rack',
    tableView: 'Vue Tableau',
    emptyMsg: 'Aucune chambre ne correspond aux filtres.',
    imageScanTitle: 'Extraction Automatique des Chambres depuis une Image',
    imageScanSubtitle:
      'Importez une capture d’écran PMS (Kwentra/Opera) ou photo d’un tableau Excel pour créer les chambres automatiquement',
    scanningText: 'Analyse de l’image et extraction des numéros de chambres...',
    noRoomsExtracted: 'Aucune chambre détectée dans cette image.',
    extractedReadyTitle: 'Aperçu des Chambres Extraites',
    confirmImportRoomsBtn: 'Ajouter les Chambres Sélectionnées',
    cancelImportBtn: 'Annuler',
    alreadyExistsTag: 'Existe déjà',
  },
};

export const RoomRackManager: React.FC<RoomRackManagerProps> = ({
  lang,
  config,
  rooms,
  reservations = [],
  folioItems = [],
  posCatalog = [],
  onAddRoom,
  onAddRoomsBulk,
  onUpdateRoom,
  onDeleteRoom,
  onSyncToOccupancy,
  onSaveReservation,
  onAddFolioItem,
  onToggleFolioVerified,
  onArchiveFolioItem,
  onAddPosCatalogItem,
  onArchivePosCatalogItem,
  focusRoomId,
  onClearFocusRoom,
}) => {
  const c = COPY[lang];
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'reservations'>('grid');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [modalInitialView, setModalInitialView] = useState<'reservation' | 'cashier' | 'billing'>('reservation');

  useEffect(() => {
    if (focusRoomId) {
      setSelectedRoomId(focusRoomId);
      setModalInitialView('reservation');
      onClearFocusRoom?.();
    }
  }, [focusRoomId, onClearFocusRoom]);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [floorFilter, setFloorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RoomRackStatus>('ALL');
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Image AI Extraction State
  const [scanningImage, setScanningImage] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [extractedDrafts, setExtractedDrafts] = useState<
    (HotelRoom & { selected: boolean; duplicate: boolean })[]
  >([]);

  // Single Room Add State
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('1');
  const [roomType, setRoomType] = useState('Deluxe Nile View');
  const [baseRateStr, setBaseRateStr] = useState(String(config.minRoomRate || 2400));
  const [maxOccupancy, setMaxOccupancy] = useState(2);
  const [status, setStatus] = useState<RoomRackStatus>('VacantClean');
  const [guestName, setGuestName] = useState('');
  const [notes, setNotes] = useState('');

  // Bulk Range Builder State
  const [rangeStart, setRangeStart] = useState('105');
  const [rangeEnd, setRangeEnd] = useState('115');
  const [bulkFloor, setBulkFloor] = useState('1');
  const [bulkType, setBulkType] = useState('Standard King');
  const [bulkRateStr, setBulkRateStr] = useState(String(config.minRoomRate || 2400));
  const [bulkStatus, setBulkStatus] = useState<RoomRackStatus>('VacantClean');

  const stats = useMemo(() => {
    const occupied = rooms.filter((r) => r.status === 'Occupied').length;
    const vacantClean = rooms.filter((r) => r.status === 'VacantClean').length;
    const vacantDirty = rooms.filter((r) => r.status === 'VacantDirty').length;
    const ooo = rooms.filter((r) => r.status === 'OutOfOrder').length;
    const compHouse = rooms.filter(
      (r) => r.status === 'Complimentary' || r.status === 'HouseUse'
    ).length;
    const salable = Math.max(1, rooms.length - ooo);
    const occPct = rooms.length > 0 ? Number(((occupied / salable) * 100).toFixed(1)) : 0;
    return { occupied, vacantClean, vacantDirty, ooo, compHouse, occPct };
  }, [rooms]);

  const uniqueFloors = useMemo(() => {
    const set = new Set(rooms.map((r) => r.floor));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [rooms]);

  const sortedFilteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...rooms]
      .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }))
      .filter((r) => {
        if (floorFilter !== 'ALL' && r.floor !== floorFilter) return false;
        if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
        if (q) {
          return (
            r.roomNumber.toLowerCase().includes(q) ||
            r.roomType.toLowerCase().includes(q) ||
            (r.guestName ?? '').toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [rooms, searchQuery, floorFilter, statusFilter]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg('');
    setNotice('');
    setExtractedDrafts([]);
    setScanningImage(true);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      });

      setPreviewImageUrl(dataUrl);

      const response = await fetch('/api/rooms/extract-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: file.type || 'image/png',
          defaultRate: config.minRoomRate || 2400,
        }),
      });

      const payload = (await response.json()) as {
        rooms?: HotelRoom[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to analyze image.');
      }

      const detected = payload.rooms ?? [];
      if (detected.length === 0) {
        setErrorMsg(c.noRoomsExtracted);
      } else {
        const existingNums = new Set(rooms.map((r) => r.roomNumber.trim().toLowerCase()));
        setExtractedDrafts(
          detected.map((rm) => {
            const isDup = existingNums.has(rm.roomNumber.trim().toLowerCase());
            return {
              ...rm,
              duplicate: isDup,
              selected: !isDup,
            };
          })
        );
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Image scan failed.');
    } finally {
      setScanningImage(false);
    }
  };

  const handleConfirmExtractedImport = () => {
    const chosen = extractedDrafts
      .filter((d) => d.selected && !d.duplicate)
      .map(({ selected: _s, duplicate: _d, ...room }) => room);

    if (chosen.length === 0) {
      setErrorMsg(c.bulkNoneMsg);
      return;
    }

    onAddRoomsBulk(chosen);
    setNotice(`${c.bulkAddedMsg} ${chosen.length}`);
    setExtractedDrafts([]);
    setPreviewImageUrl(null);
  };

  const handleCreateSingle = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setNotice('');
    const cleanNum = roomNumber.trim();
    if (!cleanNum) return;

    const duplicate = rooms.some(
      (r) => r.roomNumber.trim().toLowerCase() === cleanNum.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg(c.duplicateErr);
      return;
    }

    onAddRoom({
      id: `rm-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      roomNumber: cleanNum,
      floor: floor.trim() || '1',
      roomType: roomType.trim() || 'Standard King',
      baseRate: Math.max(0, parseFloat(baseRateStr) || 0),
      maxOccupancy: Math.max(1, maxOccupancy),
      status,
      guestName: guestName.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setNotice(`${c.addedMsg} #${cleanNum}`);
    setRoomNumber('');
    setGuestName('');
    setNotes('');
  };

  const handleGenerateRange = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setNotice('');
    const start = parseInt(rangeStart, 10);
    const end = parseInt(rangeEnd, 10);
    if (Number.isNaN(start) || Number.isNaN(end) || end < start || end - start > 300) {
      setErrorMsg(c.bulkNoneMsg);
      return;
    }

    const existingNums = new Set(rooms.map((r) => r.roomNumber.trim().toLowerCase()));
    const created: HotelRoom[] = [];
    const rate = Math.max(0, parseFloat(bulkRateStr) || 0);

    for (let num = start; num <= end; num++) {
      const strNum = String(num);
      if (!existingNums.has(strNum.toLowerCase())) {
        created.push({
          id: `rm-${Date.now()}-${num}`,
          roomNumber: strNum,
          floor: bulkFloor.trim() || String(Math.floor(num / 100) || 1),
          roomType: bulkType.trim() || 'Standard King',
          baseRate: rate,
          maxOccupancy: 2,
          status: bulkStatus,
        });
      }
    }

    if (created.length === 0) {
      setErrorMsg(c.bulkNoneMsg);
      return;
    }

    onAddRoomsBulk(created);
    setNotice(`${c.bulkAddedMsg} ${created.length}`);
    setShowBulkForm(false);
  };

  const getStatusLabel = (st: RoomRackStatus) =>
    lang === 'ar' ? STATUS_META[st].ar : lang === 'fr' ? STATUS_META[st].fr : STATUS_META[st].en;

  return (
    <div className="space-y-6">
      {/* Header + Live Inventory Summary Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0088CC] text-white flex items-center justify-center shrink-0">
              <BedDouble className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">{c.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">{c.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={scanningImage}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0088CC] hover:bg-[#0070AA] disabled:opacity-60 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {scanningImage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImagePlus className="w-3.5 h-3.5" />
              )}
              {c.importImageBtn}
            </button>

            <button
              type="button"
              onClick={() => setShowBulkForm((v) => !v)}
              className="px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5" />
              {c.addBulkToggle}
            </button>

            <button
              type="button"
              onClick={() => {
                onSyncToOccupancy(rooms);
                setNotice(c.syncedNotice);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0F1E36] hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {c.syncBtn}
            </button>
          </div>
        </div>

        {/* 6 Live Inventory Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 block">{c.totalRooms}</span>
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
              {rooms.length}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-200">
            <span className="text-[11px] text-[#006699] block">{c.occupied}</span>
            <span className="text-xl font-bold font-mono tabular-nums text-[#0088CC]">
              {stats.occupied}{' '}
              <span className="text-xs font-normal text-slate-500">({stats.occPct}%)</span>
            </span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
            <span className="text-[11px] text-emerald-700 block">{c.vacantClean}</span>
            <span className="text-xl font-bold font-mono tabular-nums text-emerald-700">
              {stats.vacantClean}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200">
            <span className="text-[11px] text-amber-800 block">{c.vacantDirty}</span>
            <span className="text-xl font-bold font-mono tabular-nums text-amber-700">
              {stats.vacantDirty}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-red-50/70 border border-red-200">
            <span className="text-[11px] text-red-700 block">{c.ooo}</span>
            <span className="text-xl font-bold font-mono tabular-nums text-red-700">
              {stats.ooo}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-200">
            <span className="text-[11px] text-purple-700 block">{c.compHouse}</span>
            <span className="text-xl font-bold font-mono tabular-nums text-purple-700">
              {stats.compHouse}
            </span>
          </div>
        </div>
      </section>

      {/* Image Scan Progress / Extracted Rooms Preview */}
      {(scanningImage || extractedDrafts.length > 0) && (
        <section className="bg-white border-2 border-[#0088CC] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {scanningImage ? c.imageScanTitle : c.extractedReadyTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{c.imageScanSubtitle}</p>
            </div>
            {!scanningImage && (
              <button
                type="button"
                onClick={() => {
                  setExtractedDrafts([]);
                  setPreviewImageUrl(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700"
                aria-label={c.cancelImportBtn}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {scanningImage && (
            <div className="py-6 flex items-center justify-center gap-3 text-xs font-medium text-[#0088CC]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{c.scanningText}</span>
            </div>
          )}

          {!scanningImage && extractedDrafts.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {previewImageUrl && (
                  <div className="lg:col-span-3 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <img
                      src={previewImageUrl}
                      alt="Uploaded room list"
                      className="w-full max-h-56 object-contain"
                    />
                  </div>
                )}

                <div
                  className={`${
                    previewImageUrl ? 'lg:col-span-9' : 'lg:col-span-12'
                  } overflow-x-auto border border-slate-200 rounded-lg`}
                >
                  <table className="w-full text-xs text-start border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2 px-3 text-start">#</th>
                        <th className="py-2 px-3 text-start">{c.roomNumber}</th>
                        <th className="py-2 px-3 text-start">{c.floor}</th>
                        <th className="py-2 px-3 text-start">{c.roomType}</th>
                        <th className="py-2 px-3 text-start">{c.baseRate}</th>
                        <th className="py-2 px-3 text-start">{c.status}</th>
                        <th className="py-2 px-3 text-start">{c.guestName}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {extractedDrafts.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={item.duplicate ? 'bg-slate-50 opacity-60' : 'hover:bg-sky-50/40'}
                        >
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              disabled={item.duplicate}
                              checked={item.selected}
                              onChange={(e) =>
                                setExtractedDrafts((prev) =>
                                  prev.map((d, i) =>
                                    i === idx ? { ...d, selected: e.target.checked } : d
                                  )
                                )
                              }
                              className="rounded border-slate-300 text-[#0088CC]"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            #{item.roomNumber}
                            {item.duplicate && (
                              <span className="ms-1.5 text-[10px] font-sans font-semibold text-amber-700">
                                ({c.alreadyExistsTag})
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono">{item.floor}</td>
                          <td className="py-2 px-3">{item.roomType}</td>
                          <td className="py-2 px-3 font-mono tabular-nums" dir="ltr">
                            {formatMoney(item.baseRate, config.currency)}
                          </td>
                          <td className="py-2 px-3 font-medium">{getStatusLabel(item.status)}</td>
                          <td className="py-2 px-3 text-slate-600">{item.guestName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExtractedDrafts([]);
                    setPreviewImageUrl(null);
                  }}
                  className="px-3.5 py-2 text-xs text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  {c.cancelImportBtn}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExtractedImport}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0088CC] hover:bg-[#0070AA] rounded-lg"
                >
                  {c.confirmImportRoomsBtn} (
                  {extractedDrafts.filter((d) => d.selected && !d.duplicate).length})
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Bulk Range Generator (Collapsible) */}
      {showBulkForm && (
        <section className="bg-white border border-[#0088CC] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">{c.bulkTitle}</h3>
          <form
            onSubmit={handleGenerateRange}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end"
          >
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">{c.rangeStart}</label>
              <input
                type="number"
                required
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">{c.rangeEnd}</label>
              <input
                type="number"
                required
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">{c.floor}</label>
              <input
                type="text"
                value={bulkFloor}
                onChange={(e) => setBulkFloor(e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">{c.roomType}</label>
              <select
                value={bulkType}
                onChange={(e) => setBulkType(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {ROOM_TYPES.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">
                {c.baseRate} ({config.currency})
              </label>
              <input
                type="number"
                min="0"
                value={bulkRateStr}
                onChange={(e) => setBulkRateStr(e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">{c.status}</label>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as RoomRackStatus)}
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {(Object.keys(STATUS_META) as RoomRackStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {getStatusLabel(st)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#0088CC] hover:bg-[#0070AA] rounded-lg transition-colors"
            >
              {c.generateRangeBtn}
            </button>
          </form>
        </section>
      )}

      {/* Manual Single Room Addition Form */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">{c.addSingleTitle}</h3>
        <form
          onSubmit={handleCreateSingle}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end"
        >
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              {c.roomNumber} *
            </label>
            <input
              type="text"
              required
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="305"
              dir="ltr"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0088CC]"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              {c.floor}
            </label>
            <input
              type="text"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="3"
              dir="ltr"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              {c.roomType}
            </label>
            <input
              list="hotel-room-types-list"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            />
            <datalist id="hotel-room-types-list">
              {ROOM_TYPES.map((rt) => (
                <option key={rt} value={rt} />
              ))}
            </datalist>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              {c.baseRate} ({config.currency})
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={baseRateStr}
              onChange={(e) => setBaseRateStr(e.target.value)}
              dir="ltr"
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 rounded-lg"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              {c.maxOcc}
            </label>
            <input
              type="number"
              min="1"
              max="8"
              value={maxOccupancy}
              onChange={(e) => setMaxOccupancy(Math.max(1, parseInt(e.target.value, 10) || 1))}
              dir="ltr"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              {c.status}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as RoomRackStatus)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              {(Object.keys(STATUS_META) as RoomRackStatus[]).map((st) => (
                <option key={st} value={st}>
                  {getStatusLabel(st)}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              {c.guestName}
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="lg:col-span-10">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={c.notes}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              className="w-full py-2 px-4 text-xs font-semibold text-white bg-[#0088CC] hover:bg-[#0070AA] rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {c.addBtn}
            </button>
          </div>
        </form>

        {errorMsg && <p className="text-xs font-medium text-red-600">{errorMsg}</p>}
        {notice && (
          <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{notice}</span>
          </p>
        )}
      </section>

      {/* Filter Toolbar & Room Rack / Table Display */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={c.searchPlaceholder}
                className="ps-8 pe-3 py-1.5 text-xs border border-slate-300 rounded-lg w-56"
              />
            </div>

            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">{c.allFloors}</option>
              {uniqueFloors.map((fl) => (
                <option key={fl} value={fl}>
                  {c.floor} {fl}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | RoomRackStatus)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">{c.allStatuses}</option>
              {(Object.keys(STATUS_META) as RoomRackStatus[]).map((st) => (
                <option key={st} value={st}>
                  {getStatusLabel(st)}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid2x2 className="w-3.5 h-3.5" />
              {c.gridView}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('reservations')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'reservations'
                  ? 'bg-[#1967B2] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              {lang === 'ar'
                ? 'الحجوزات الفردية (Individual)'
                : lang === 'fr'
                ? 'Réservations Individuelles'
                : 'Individual Reservations'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              {c.tableView}
            </button>
          </div>
        </div>

        {sortedFilteredRooms.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">{c.emptyMsg}</div>
        ) : viewMode === 'grid' ? (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {sortedFilteredRooms.map((room) => {
              const meta = STATUS_META[room.status];
              const res = reservations.find((r) => r.roomId === room.id);
              const roomBalance = folioItems
                .filter((fi) => fi.roomId === room.id)
                .reduce((sum, fi) => sum + fi.amount, 0);

              return (
                <div
                  key={room.id}
                  className={`p-3.5 rounded-lg border ${meta.bg} ${meta.border} space-y-2.5`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoomId(room.id);
                        setModalInitialView('reservation');
                      }}
                      className="text-start group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold font-mono text-slate-900 group-hover:text-[#1967B2] group-hover:underline">
                          #{room.roomNumber}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          F{room.floor} · {room.maxOccupancy}P
                        </span>
                        {res && res.alerts.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">
                            <Bell className="w-2.5 h-2.5" />
                            {res.alerts.length}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">{room.roomType}</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteRoom(room.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      aria-label={`Delete room ${room.roomNumber}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {(res?.primaryGuest || room.guestName) && (
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {res?.primaryGuest || room.guestName}
                    </p>
                  )}
                  {room.notes && (
                    <p className="text-[11px] text-slate-500 truncate">{room.notes}</p>
                  )}

                  {/* Quick Entry Buttons into Room Profile, Cashier & Billing Folio */}
                  <div className="flex items-center gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoomId(room.id);
                        setModalInitialView('reservation');
                      }}
                      className="flex-1 py-1 px-1.5 text-[11px] font-semibold text-[#1967B2] bg-white hover:bg-sky-50 border border-[#1967B2]/40 rounded flex items-center justify-center gap-1"
                    >
                      <DoorOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">{lang === 'ar' ? 'الغرفة' : 'Room'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoomId(room.id);
                        setModalInitialView('cashier');
                      }}
                      className="py-1 px-2 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded flex items-center gap-1 shrink-0"
                      title={lang === 'ar' ? 'كاشير الغرفة والأصناف' : 'Room Cashier POS'}
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span>{lang === 'ar' ? 'كاشير' : 'POS'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoomId(room.id);
                        setModalInitialView('billing');
                      }}
                      className="py-1 px-2 text-[11px] font-semibold text-white bg-[#1967B2] hover:bg-[#145594] rounded flex items-center gap-1 shrink-0"
                      title="Open Billing Folio"
                    >
                      <DollarSign className="w-3 h-3" />
                      <span>{lang === 'ar' ? 'فاتورة' : 'Bill'}</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                    <div>
                      <span
                        className="text-xs font-mono font-bold tabular-nums text-slate-900 block"
                        dir="ltr"
                      >
                        {formatMoney(room.baseRate, config.currency)}
                      </span>
                      {roomBalance !== 0 && (
                        <span className="text-[10px] font-mono text-[#1967B2]" dir="ltr">
                          Bal: {formatMoney(roomBalance, config.currency)}
                        </span>
                      )}
                    </div>

                    <select
                      value={room.status}
                      onChange={(e) =>
                        onUpdateRoom({
                          ...room,
                          status: e.target.value as RoomRackStatus,
                        })
                      }
                      className={`px-2 py-1 text-[11px] font-semibold rounded border border-slate-300 bg-white ${meta.text}`}
                    >
                      {(Object.keys(STATUS_META) as RoomRackStatus[]).map((st) => (
                        <option key={st} value={st}>
                          {getStatusLabel(st)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'reservations' ? (
          /* Kwentra-Style Individual Reservations Table (Image 1) */
          <div className="overflow-x-auto">
            <div className="px-4 py-2.5 bg-[#1967B2] text-white text-sm font-semibold flex items-center justify-between">
              <span>
                {lang === 'ar' ? 'الحجوزات الفردية والغرف (Individual Reservations)' : 'Individual Reservations'}
              </span>
              <span className="text-xs font-mono opacity-90">
                {sortedFilteredRooms.length} Rooms
              </span>
            </div>
            <table className="w-full text-xs text-start border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="py-2.5 px-3 text-start font-semibold">ID</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Name</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Arrival</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Departure</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Channel</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Ad / Ch</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Room Type</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Room</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Rate</th>
                  <th className="py-2.5 px-3 text-end font-semibold">Rate Amount</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Billing</th>
                  <th className="py-2.5 px-3 text-end font-semibold">Balance</th>
                  <th className="py-2.5 px-3 text-center font-semibold">State</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Alerts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedFilteredRooms.map((room) => {
                  const res = reservations.find((r) => r.roomId === room.id);
                  const roomBalance = folioItems
                    .filter((fi) => fi.roomId === room.id)
                    .reduce((sum, fi) => sum + fi.amount, 0);
                  const stateLabel =
                    res?.state ?? (room.status === 'Occupied' ? 'CheckedIn' : room.status);

                  return (
                    <tr key={room.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomId(room.id);
                            setModalInitialView('reservation');
                          }}
                          className="text-[#1967B2] hover:underline font-semibold"
                        >
                          {res?.id || room.roomNumber}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#1967B2]">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomId(room.id);
                            setModalInitialView('reservation');
                          }}
                          className="text-start hover:underline"
                        >
                          {res?.primaryGuest || room.guestName || (lang === 'ar' ? 'شاغرة — اضغط للتسكين' : 'Vacant — Click to Assign')}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700" dir="ltr">
                        {res?.arrival || config.businessDate}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700" dir="ltr">
                        {res?.departure || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{res?.channel || '—'}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-700">
                        {res ? `${res.adults} / ${res.children}` : `0 / 0`}
                      </td>
                      <td className="py-2.5 px-3 text-sky-700 font-medium">
                        {res?.roomType || room.roomType}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomId(room.id);
                            setModalInitialView('reservation');
                          }}
                          className={`px-2.5 py-1.5 font-mono font-bold text-white rounded w-14 text-center ${
                            room.status === 'Occupied'
                              ? 'bg-red-600 hover:bg-red-700'
                              : room.status === 'VacantClean'
                              ? 'bg-emerald-600 hover:bg-emerald-700'
                              : 'bg-slate-600 hover:bg-slate-700'
                          }`}
                        >
                          {room.roomNumber}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#1967B2]">
                        {res?.rateCode || 'BAR'}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono font-semibold text-[#1967B2]" dir="ltr">
                        {res
                          ? `${res.rateAmount.toFixed(2)} ${res.rateCurrency}`
                          : formatMoney(room.baseRate, config.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRoomId(room.id);
                              setModalInitialView('cashier');
                            }}
                            className="text-emerald-700 hover:underline font-semibold"
                          >
                            {lang === 'ar' ? 'كاشير' : 'POS'}
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRoomId(room.id);
                              setModalInitialView('billing');
                            }}
                            className="text-[#1967B2] hover:underline font-semibold"
                          >
                            Billing
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono font-bold text-slate-900" dir="ltr">
                        {roomBalance.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-1 text-[11px] font-semibold rounded text-white ${
                            stateLabel === 'CheckedIn'
                              ? 'bg-emerald-600'
                              : stateLabel === 'Reserved'
                              ? 'bg-[#1967B2]'
                              : 'bg-slate-500'
                          }`}
                        >
                          {stateLabel === 'CheckedIn' ? 'Checked In' : stateLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomId(room.id);
                            setModalInitialView('reservation');
                          }}
                          className="relative inline-flex items-center justify-center p-1 text-slate-600 hover:text-red-600"
                        >
                          <Bell className="w-4 h-4" />
                          {res && res.alerts.length > 0 && (
                            <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                              {res.alerts.length}
                            </span>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-4 text-start font-semibold">{c.roomNumber}</th>
                  <th className="py-2.5 px-3 text-start font-semibold">{c.floor}</th>
                  <th className="py-2.5 px-3 text-start font-semibold">{c.roomType}</th>
                  <th className="py-2.5 px-3 text-start font-semibold">{c.guestName}</th>
                  <th className="py-2.5 px-3 text-start font-semibold">
                    {c.baseRate} ({config.currency})
                  </th>
                  <th className="py-2.5 px-3 text-start font-semibold">{c.status}</th>
                  <th className="py-2.5 px-3 text-center font-semibold">
                    {lang === 'ar' ? 'ملف الغرفة / الفاتورة' : 'Room / Billing'}
                  </th>
                  <th className="py-2.5 px-4 text-end font-semibold">—</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedFilteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoomId(room.id);
                          setModalInitialView('reservation');
                        }}
                        className="text-[#1967B2] hover:underline"
                      >
                        #{room.roomNumber}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{room.floor}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{room.roomType}</td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={room.guestName ?? ''}
                        onChange={(e) =>
                          onUpdateRoom({ ...room, guestName: e.target.value })
                        }
                        placeholder="—"
                        className="w-full max-w-[180px] px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        value={room.baseRate}
                        onChange={(e) =>
                          onUpdateRoom({
                            ...room,
                            baseRate: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        dir="ltr"
                        className="w-24 px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded bg-white"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={room.status}
                        onChange={(e) =>
                          onUpdateRoom({
                            ...room,
                            status: e.target.value as RoomRackStatus,
                          })
                        }
                        className={`px-2 py-1 text-xs font-semibold rounded border border-slate-200 bg-white ${STATUS_META[room.status].text}`}
                      >
                        {(Object.keys(STATUS_META) as RoomRackStatus[]).map((st) => (
                          <option key={st} value={st}>
                            {getStatusLabel(st)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomId(room.id);
                            setModalInitialView('reservation');
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-[#1967B2] bg-sky-50 hover:bg-sky-100 border border-[#1967B2]/30 rounded"
                        >
                          {lang === 'ar' ? 'دخول' : 'Open'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomId(room.id);
                            setModalInitialView('cashier');
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded"
                        >
                          {lang === 'ar' ? 'كاشير' : 'POS'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomId(room.id);
                            setModalInitialView('billing');
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-white bg-[#1967B2] hover:bg-[#145594] rounded"
                        >
                          Billing
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-end">
                      <button
                        type="button"
                        onClick={() => onDeleteRoom(room.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        aria-label={`Delete room ${room.roomNumber}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Individual Room Reservation & Split Billing Folio Modal */}
      {selectedRoomId &&
        (() => {
          const activeRoom = rooms.find((r) => r.id === selectedRoomId);
          if (!activeRoom) return null;
          const activeReservation = reservations.find((r) => r.roomId === activeRoom.id) ?? null;
          return (
            <RoomProfileModal
              lang={lang}
              config={config}
              room={activeRoom}
              reservation={activeReservation}
              folioItems={folioItems}
              posCatalog={posCatalog}
              initialView={modalInitialView}
              onClose={() => setSelectedRoomId(null)}
              onSaveReservation={(res, updatedRoom) => {
                onSaveReservation?.(res, updatedRoom);
              }}
              onAddFolioItem={(item, alsoPostToLedger) => {
                onAddFolioItem?.(item, alsoPostToLedger);
              }}
              onToggleFolioVerified={(itemId) => {
                onToggleFolioVerified?.(itemId);
              }}
              onArchiveFolioItem={(itemId) => {
                onArchiveFolioItem?.(itemId);
              }}
              onAddPosCatalogItem={(item) => {
                onAddPosCatalogItem?.(item);
              }}
              onArchivePosCatalogItem={(itemId) => {
                onArchivePosCatalogItem?.(itemId);
              }}
            />
          );
        })()}
    </div>
  );
};

