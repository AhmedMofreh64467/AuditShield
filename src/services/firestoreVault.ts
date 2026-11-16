import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  AuditExceptionResolution,
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
  PosCatalogItem,
  RoomDiscrepancy,
  RoomFolioItem,
  RoomReservation,
} from '../types/audit';

export type OperationalRecordType =
  | 'task'
  | 'discrepancy'
  | 'dailyArchive'
  | 'edcTerminal'
  | 'cashierShift'
  | 'otaBooking'
  | 'cityLedger'
  | 'banquetEvent'
  | 'auditTrail'
  | 'backupSnapshot'
  | 'roomReservation'
  | 'roomFolioItem'
  | 'posCatalogItem'
  | 'exceptionResolution'
  | 'nightAuditCheck';

export interface ArchivedRoomItem {
  docId: string;
  room: HotelRoom;
}

export interface ArchivedLedgerItem {
  docId: string;
  entry: LedgerEntry;
}

export interface ArchivedOperationalItem {
  docId: string;
  recordType: OperationalRecordType;
  title: string;
  payload: Record<string, unknown>;
}

export interface CloudWorkspaceSnapshot {
  config?: HotelConfig;
  settlement?: CashSettlement;
  kwentraSnapshot?: KwentraSnapshot;
  occupancyInputs?: OccupancyInputs;
  cashDenominations?: Record<string, number>;
  isOutageMode?: boolean;
  dayLocked?: boolean;
  rooms: HotelRoom[];
  archivedRooms: ArchivedRoomItem[];
  entries: LedgerEntry[];
  archivedEntries: ArchivedLedgerItem[];
  tasks: AuditTask[];
  discrepancies: RoomDiscrepancy[];
  dailyArchive: DailyArchiveRecord[];
  edcTerminals: EdcTerminalRecord[];
  cashierShifts: CashierShiftRecord[];
  otaBookings: OtaAuditRecord[];
  cityLedgerItems: CityLedgerRecord[];
  banquetEvents: BanquetBeoRecord[];
  auditTrail: AuditTrailEntry[];
  roomReservations: RoomReservation[];
  roomFolioItems: RoomFolioItem[];
  posCatalog: PosCatalogItem[];
  exceptionResolutions: Record<string, AuditExceptionResolution>;
  nightAuditChecks: Record<string, boolean>;
  backupSnapshots: { id: string; title: string; createdAtLabel: string; summaryText: string }[];
  archivedRecords: ArchivedOperationalItem[];
}

export interface LocalPropertySeedPayload {
  config: HotelConfig;
  entries: LedgerEntry[];
  settlement: CashSettlement;
  tasks: AuditTask[];
  discrepancies: RoomDiscrepancy[];
  isOutageMode: boolean;
  kwentraSnapshot: KwentraSnapshot;
  dayLocked: boolean;
  occupancyInputs: OccupancyInputs;
  dailyArchive: DailyArchiveRecord[];
  cashDenominations: Record<string, number>;
  edcTerminals: EdcTerminalRecord[];
  cashierShifts: CashierShiftRecord[];
  otaBookings: OtaAuditRecord[];
  cityLedgerItems: CityLedgerRecord[];
  banquetEvents: BanquetBeoRecord[];
  auditTrail: AuditTrailEntry[];
  hotelRooms: HotelRoom[];
  roomReservations: RoomReservation[];
  roomFolioItems: RoomFolioItem[];
  posCatalog: PosCatalogItem[];
  exceptionResolutions?: Record<string, AuditExceptionResolution>;
  nightAuditChecks?: Record<string, boolean>;
}

const VALID_CURRENCIES = new Set(['EGP', 'USD', 'SAR', 'EUR']);
const VALID_ROOM_STATUSES = new Set([
  'Occupied',
  'VacantClean',
  'VacantDirty',
  'OutOfOrder',
  'Complimentary',
  'HouseUse',
]);

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return cleaned.length > 0 ? cleaned : `id_${Date.now()}`;
}

export function getWorkspaceId(uid: string): string {
  return sanitizeId(`ws_${uid}`);
}

function clampStr(val: string | undefined, maxLen: number, fallback = ''): string {
  const s = (val ?? fallback).trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function sanitizeConfig(config: HotelConfig): HotelConfig {
  return {
    propertyId: clampStr(config.propertyId, 80, 'grand-nile') || 'grand-nile',
    hotelName: clampStr(config.hotelName, 160, 'Grand Nile Horizon Hotel — Cairo') || 'Grand Nile Horizon Hotel',
    businessDate: clampStr(config.businessDate, 20, new Date().toISOString().slice(0, 10)),
    currency: VALID_CURRENCIES.has(config.currency) ? config.currency : 'EGP',
    serviceChargePct: Number(config.serviceChargePct ?? 12),
    vatPct: Number(config.vatPct ?? 14),
    cityTaxPct: Number(config.cityTaxPct ?? 0),
    taxInclusive: Boolean(config.taxInclusive ?? false),
    minRoomRate: Number(config.minRoomRate ?? 1800),
    rebateApprovalLimit: Number(config.rebateApprovalLimit ?? 500),
    cashVarianceTolerance: Number(config.cashVarianceTolerance ?? 50),
    outlets: (config.outlets ?? []).slice(0, 40).map((o) => clampStr(o, 80, 'Outlet') || 'Outlet'),
    exchangeRates: config.exchangeRates,
    totalAvailableRooms: Number(config.totalAvailableRooms ?? 120),
    budgetDailyRevenue: Number(config.budgetDailyRevenue ?? 45000),
    defaultBreakfastSplitPerPax: Number(config.defaultBreakfastSplitPerPax ?? 250),
    ...(config.packageAllocationRules ? { packageAllocationRules: config.packageAllocationRules } : {}),
    ...(typeof config.extraPersonFee === 'number' ? { extraPersonFee: config.extraPersonFee } : {}),
    ...(typeof config.lateCheckoutFeePct === 'number'
      ? { lateCheckoutFeePct: config.lateCheckoutFeePct }
      : {}),
    ...(typeof config.discountBeforeTax === 'boolean'
      ? { discountBeforeTax: config.discountBeforeTax }
      : {}),
    ...(typeof config.roundingDecimals === 'number'
      ? { roundingDecimals: config.roundingDecimals }
      : {}),
  };
}

function sanitizeSettlement(s: CashSettlement): CashSettlement {
  return {
    actualCashDrop: Number(s.actualCashDrop ?? 0),
    actualEdcBatch: Number(s.actualEdcBatch ?? 0),
    actualCityLedgerSigned: Number(s.actualCityLedgerSigned ?? 0),
    generalCashierName: clampStr(s.generalCashierName, 120, 'Income Auditor'),
    shiftNote: clampStr(s.shiftNote, 240, ''),
  };
}

function buildRoomPayload(uid: string, workspaceId: string, room: HotelRoom, isArchived = false) {
  const roomId = sanitizeId(room.id);
  const base: Record<string, unknown> = {
    ownerId: uid,
    workspaceId,
    roomId,
    roomNumber: clampStr(room.roomNumber, 24, '101') || '101',
    floor: clampStr(room.floor, 24, '1') || '1',
    roomType: clampStr(room.roomType, 80, 'Standard King') || 'Standard King',
    baseRate: Math.max(0, Number(room.baseRate) || 0),
    maxOccupancy: Math.min(20, Math.max(1, Number(room.maxOccupancy) || 2)),
    status: VALID_ROOM_STATUSES.has(room.status) ? room.status : 'VacantClean',
    isArchived,
  };
  if (room.guestName && room.guestName.trim()) {
    base.guestName = clampStr(room.guestName, 120);
  }
  if (room.notes && room.notes.trim()) {
    base.notes = clampStr(room.notes, 300);
  }
  return { roomId, data: base };
}

function buildLedgerPayload(
  uid: string,
  workspaceId: string,
  entry: LedgerEntry,
  isArchived = false
) {
  const entryId = sanitizeId(entry.id);
  const base: Record<string, unknown> = {
    ownerId: uid,
    workspaceId,
    entryId,
    timestamp: clampStr(entry.timestamp, 32, '00:00') || '00:00',
    source: entry.source,
    category: entry.category,
    outletOrDept: clampStr(entry.outletOrDept, 100, 'Front Office') || 'Front Office',
    referenceNo: clampStr(entry.referenceNo, 80, ''),
    guestOrDescription: clampStr(entry.guestOrDescription, 240, 'Audit Entry') || 'Audit Entry',
    netAmount: Number(entry.netAmount) || 0,
    serviceCharge: Number(entry.serviceCharge) || 0,
    vatAmount: Number(entry.vatAmount) || 0,
    grossAmount: Number(entry.grossAmount) || 0,
    paymentMethod: entry.paymentMethod,
    approvedBy: clampStr(entry.approvedBy, 120, ''),
    reconciled: Boolean(entry.reconciled),
    isArchived,
  };
  if (typeof entry.cityTaxAmount === 'number') {
    base.cityTaxAmount = entry.cityTaxAmount;
  }
  if (typeof entry.taxInclusive === 'boolean') {
    base.taxInclusive = entry.taxInclusive;
  }
  if (entry.originalCurrency && VALID_CURRENCIES.has(entry.originalCurrency)) {
    base.originalCurrency = entry.originalCurrency;
  }
  if (typeof entry.originalNetAmount === 'number') {
    base.originalNetAmount = entry.originalNetAmount;
  }
  if (typeof entry.fxRateApplied === 'number') {
    base.fxRateApplied = entry.fxRateApplied;
  }
  if (entry.mealPlan) {
    base.mealPlan = entry.mealPlan;
  }
  if (typeof entry.paxCount === 'number') {
    base.paxCount = entry.paxCount;
  }
  if (typeof entry.packageSplitAmount === 'number') {
    base.packageSplitAmount = entry.packageSplitAmount;
  }
  if (entry.cashierName && entry.cashierName.trim()) {
    base.cashierName = clampStr(entry.cashierName, 120);
  }
  return { entryId, data: base };
}

function buildOperationalPayload(
  uid: string,
  workspaceId: string,
  recordType: OperationalRecordType,
  rawId: string,
  title: string,
  payload: Record<string, unknown>,
  isArchived = false
) {
  const recordId = sanitizeId(`${recordType}_${rawId}`);
  const cleanPayload: Record<string, unknown> = {};
  const entries = Object.entries(payload).slice(0, 38);
  for (const [k, v] of entries) {
    if (v !== undefined) {
      cleanPayload[k] = v;
    }
  }
  return {
    recordId,
    data: {
      ownerId: uid,
      workspaceId,
      recordId,
      recordType,
      title: clampStr(title, 180, recordType) || recordType,
      payload: cleanPayload,
      isArchived,
    },
  };
}

export async function ensureUserAndWorkspace(
  uid: string,
  displayName: string,
  seed: LocalPropertySeedPayload
): Promise<{ hydratedFromCloud: boolean }> {
  const workspaceId = getWorkspaceId(uid);
  const userRef = doc(db, 'users', uid);
  const wsRef = doc(db, 'workspaces', workspaceId);

  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid,
        displayName: clampStr(displayName, 120, 'Income Auditor') || 'Income Auditor',
        role: 'auditor',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }

  let wsExists = false;
  try {
    const wsSnap = await getDoc(wsRef);
    wsExists = wsSnap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `workspaces/${workspaceId}`);
  }

  if (wsExists) {
    return { hydratedFromCloud: true };
  }

  // First time creating workspace: write parent workspace FIRST so subcollection Master Gate exists() passes
  const safeConfig = sanitizeConfig(seed.config);
  try {
    await setDoc(wsRef, {
      ownerId: uid,
      hotelName: safeConfig.hotelName,
      businessDate: safeConfig.businessDate,
      currency: safeConfig.currency,
      isOutageMode: Boolean(seed.isOutageMode),
      dayLocked: Boolean(seed.dayLocked),
      config: safeConfig,
      settlement: sanitizeSettlement(seed.settlement),
      kwentraSnapshot: seed.kwentraSnapshot,
      occupancyInputs: seed.occupancyInputs,
      cashDenominations: seed.cashDenominations,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `workspaces/${workspaceId}`);
  }

  // Seed subcollections in batches (< 400 writes per batch)
  const ops: { ref: ReturnType<typeof doc>; data: Record<string, unknown> }[] = [];

  for (const room of seed.hotelRooms) {
    const { roomId, data } = buildRoomPayload(uid, workspaceId, room, false);
    ops.push({
      ref: doc(db, 'workspaces', workspaceId, 'rooms', roomId),
      data: { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
    });
  }

  for (const entry of seed.entries) {
    const { entryId, data } = buildLedgerPayload(uid, workspaceId, entry, false);
    ops.push({
      ref: doc(db, 'workspaces', workspaceId, 'ledgerEntries', entryId),
      data: { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
    });
  }

  const pushRecord = (
    type: OperationalRecordType,
    id: string,
    title: string,
    payload: Record<string, unknown>
  ) => {
    const { recordId, data } = buildOperationalPayload(uid, workspaceId, type, id, title, payload);
    ops.push({
      ref: doc(db, 'workspaces', workspaceId, 'records', recordId),
      data: { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
    });
  };

  seed.tasks.forEach((t) => pushRecord('task', t.id, t.titleEn || t.titleAr, { ...t }));
  seed.discrepancies.forEach((d) =>
    pushRecord('discrepancy', d.id, `Room ${d.roomNumber}`, { ...d })
  );
  seed.dailyArchive.forEach((a) =>
    pushRecord('dailyArchive', a.id, `Archive ${a.businessDate}`, { ...a })
  );
  seed.edcTerminals.forEach((e) =>
    pushRecord('edcTerminal', e.id, `${e.bankName} ${e.batchNo}`, { ...e })
  );
  seed.cashierShifts.forEach((s) =>
    pushRecord('cashierShift', s.id, `${s.cashierName} (${s.shift})`, { ...s })
  );
  seed.otaBookings.forEach((o) =>
    pushRecord('otaBooking', o.id, `${o.channel} ${o.bookingRef}`, { ...o })
  );
  seed.cityLedgerItems.forEach((c) =>
    pushRecord('cityLedger', c.id, `${c.companyName} ${c.invoiceNo}`, { ...c })
  );
  seed.banquetEvents.forEach((b) =>
    pushRecord('banquetEvent', b.id, `${b.beoNo} ${b.eventName}`, { ...b })
  );
  seed.auditTrail.forEach((tr) =>
    pushRecord('auditTrail', tr.id, `${tr.action}: ${tr.targetRef}`, { ...tr })
  );
  seed.roomReservations.forEach((res) =>
    pushRecord('roomReservation', res.id, `Res #${res.id} (${res.primaryGuest})`, { ...res })
  );
  seed.roomFolioItems.forEach((fi) =>
    pushRecord('roomFolioItem', fi.id, `Folio W${fi.windowNo}: ${fi.department}`, { ...fi })
  );
  seed.posCatalog.forEach((item) =>
    pushRecord('posCatalogItem', item.id, `${item.nameEn} (${item.nameAr})`, { ...item })
  );
  Object.values(seed.exceptionResolutions ?? {}).forEach((res) =>
    pushRecord('exceptionResolution', res.exceptionId, `Exception ${res.exceptionId}`, { ...res })
  );
  Object.entries(seed.nightAuditChecks ?? {}).forEach(([checkId, confirmed]) =>
    pushRecord('nightAuditCheck', checkId, `Night Audit Check ${checkId}`, { checkId, confirmed })
  );

  try {
    for (let i = 0; i < ops.length; i += 350) {
      const batch = writeBatch(db);
      for (const op of ops.slice(i, i + 350)) {
        batch.set(op.ref, op.data);
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `workspaces/${workspaceId}`);
  }

  return { hydratedFromCloud: false };
}

export function subscribeToCloudVault(
  uid: string,
  onUpdate: (snapshot: CloudWorkspaceSnapshot) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const workspaceId = getWorkspaceId(uid);

  const state: CloudWorkspaceSnapshot = {
    rooms: [],
    archivedRooms: [],
    entries: [],
    archivedEntries: [],
    tasks: [],
    discrepancies: [],
    dailyArchive: [],
    edcTerminals: [],
    cashierShifts: [],
    otaBookings: [],
    cityLedgerItems: [],
    banquetEvents: [],
    auditTrail: [],
    roomReservations: [],
    roomFolioItems: [],
    posCatalog: [],
    exceptionResolutions: {},
    nightAuditChecks: {},
    backupSnapshots: [],
    archivedRecords: [],
  };

  let readyCount = 0;
  const seenSources = new Set<string>();
  const emitIfReady = (sourceName: string) => {
    seenSources.add(sourceName);
    readyCount = seenSources.size;
    if (readyCount >= 4) {
      onUpdate({ ...state });
    }
  };

  const unsubWs = onSnapshot(
    doc(db, 'workspaces', workspaceId),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        state.config = d.config as HotelConfig;
        state.settlement = d.settlement as CashSettlement;
        state.kwentraSnapshot = d.kwentraSnapshot as KwentraSnapshot | undefined;
        state.occupancyInputs = d.occupancyInputs as OccupancyInputs | undefined;
        state.cashDenominations = d.cashDenominations as Record<string, number> | undefined;
        state.isOutageMode = Boolean(d.isOutageMode);
        state.dayLocked = Boolean(d.dayLocked);
      }
      emitIfReady('ws');
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, `workspaces/${workspaceId}`);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );

  const unsubRooms = onSnapshot(
    query(collection(db, 'workspaces', workspaceId, 'rooms'), where('ownerId', '==', uid)),
    (snap) => {
      const active: HotelRoom[] = [];
      const archived: ArchivedRoomItem[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const room: HotelRoom = {
          id: String(d.roomId ?? docSnap.id),
          roomNumber: String(d.roomNumber ?? ''),
          floor: String(d.floor ?? '1'),
          roomType: String(d.roomType ?? 'Standard King'),
          baseRate: Number(d.baseRate ?? 0),
          maxOccupancy: Number(d.maxOccupancy ?? 2),
          status: (d.status as HotelRoom['status']) ?? 'VacantClean',
          guestName: typeof d.guestName === 'string' ? d.guestName : undefined,
          notes: typeof d.notes === 'string' ? d.notes : undefined,
        };
        if (d.isArchived) {
          archived.push({ docId: docSnap.id, room });
        } else {
          active.push(room);
        }
      });
      active.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
      state.rooms = active;
      state.archivedRooms = archived;
      emitIfReady('rooms');
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, `workspaces/${workspaceId}/rooms`);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );

  const unsubEntries = onSnapshot(
    query(collection(db, 'workspaces', workspaceId, 'ledgerEntries'), where('ownerId', '==', uid)),
    (snap) => {
      const active: LedgerEntry[] = [];
      const archived: ArchivedLedgerItem[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const entry: LedgerEntry = {
          id: String(d.entryId ?? docSnap.id),
          timestamp: String(d.timestamp ?? '00:00'),
          source: d.source as LedgerEntry['source'],
          category: d.category as LedgerEntry['category'],
          outletOrDept: String(d.outletOrDept ?? ''),
          referenceNo: String(d.referenceNo ?? ''),
          guestOrDescription: String(d.guestOrDescription ?? ''),
          netAmount: Number(d.netAmount ?? 0),
          serviceCharge: Number(d.serviceCharge ?? 0),
          vatAmount: Number(d.vatAmount ?? 0),
          cityTaxAmount: typeof d.cityTaxAmount === 'number' ? d.cityTaxAmount : undefined,
          grossAmount: Number(d.grossAmount ?? 0),
          taxInclusive: typeof d.taxInclusive === 'boolean' ? d.taxInclusive : undefined,
          originalCurrency: d.originalCurrency as LedgerEntry['originalCurrency'],
          originalNetAmount:
            typeof d.originalNetAmount === 'number' ? d.originalNetAmount : undefined,
          fxRateApplied: typeof d.fxRateApplied === 'number' ? d.fxRateApplied : undefined,
          mealPlan: d.mealPlan as LedgerEntry['mealPlan'],
          paxCount: typeof d.paxCount === 'number' ? d.paxCount : undefined,
          packageSplitAmount:
            typeof d.packageSplitAmount === 'number' ? d.packageSplitAmount : undefined,
          paymentMethod: d.paymentMethod as LedgerEntry['paymentMethod'],
          cashierName: typeof d.cashierName === 'string' ? d.cashierName : undefined,
          approvedBy: String(d.approvedBy ?? ''),
          reconciled: Boolean(d.reconciled),
        };
        if (d.isArchived) {
          archived.push({ docId: docSnap.id, entry });
        } else {
          active.push(entry);
        }
      });
      state.entries = active;
      state.archivedEntries = archived;
      emitIfReady('entries');
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, `workspaces/${workspaceId}/ledgerEntries`);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );

  const unsubRecords = onSnapshot(
    query(collection(db, 'workspaces', workspaceId, 'records'), where('ownerId', '==', uid)),
    (snap) => {
      const tasks: AuditTask[] = [];
      const discrepancies: RoomDiscrepancy[] = [];
      const dailyArchive: DailyArchiveRecord[] = [];
      const edcTerminals: EdcTerminalRecord[] = [];
      const cashierShifts: CashierShiftRecord[] = [];
      const otaBookings: OtaAuditRecord[] = [];
      const cityLedgerItems: CityLedgerRecord[] = [];
      const banquetEvents: BanquetBeoRecord[] = [];
      const auditTrail: AuditTrailEntry[] = [];
      const roomReservations: RoomReservation[] = [];
      const roomFolioItems: RoomFolioItem[] = [];
      const posCatalog: PosCatalogItem[] = [];
      const exceptionResolutions: Record<string, AuditExceptionResolution> = {};
      const nightAuditChecks: Record<string, boolean> = {};
      const backupSnapshots: CloudWorkspaceSnapshot['backupSnapshots'] = [];
      const archivedRecords: ArchivedOperationalItem[] = [];

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const recordType = d.recordType as OperationalRecordType;
        const payload = (d.payload ?? {}) as Record<string, unknown>;
        if (d.isArchived) {
          archivedRecords.push({
            docId: docSnap.id,
            recordType,
            title: String(d.title ?? docSnap.id),
            payload,
          });
          return;
        }
        switch (recordType) {
          case 'task':
            tasks.push(payload as unknown as AuditTask);
            break;
          case 'discrepancy':
            discrepancies.push(payload as unknown as RoomDiscrepancy);
            break;
          case 'dailyArchive':
            dailyArchive.push(payload as unknown as DailyArchiveRecord);
            break;
          case 'edcTerminal':
            edcTerminals.push(payload as unknown as EdcTerminalRecord);
            break;
          case 'cashierShift':
            cashierShifts.push(payload as unknown as CashierShiftRecord);
            break;
          case 'otaBooking':
            otaBookings.push(payload as unknown as OtaAuditRecord);
            break;
          case 'cityLedger':
            cityLedgerItems.push(payload as unknown as CityLedgerRecord);
            break;
          case 'banquetEvent':
            banquetEvents.push(payload as unknown as BanquetBeoRecord);
            break;
          case 'auditTrail':
            auditTrail.push(payload as unknown as AuditTrailEntry);
            break;
          case 'roomReservation':
            roomReservations.push(payload as unknown as RoomReservation);
            break;
          case 'roomFolioItem':
            roomFolioItems.push(payload as unknown as RoomFolioItem);
            break;
          case 'posCatalogItem':
            posCatalog.push(payload as unknown as PosCatalogItem);
            break;
          case 'exceptionResolution': {
            const res = payload as unknown as AuditExceptionResolution;
            if (res.exceptionId) exceptionResolutions[res.exceptionId] = res;
            break;
          }
          case 'nightAuditCheck': {
            const checkId = String(payload.checkId ?? '');
            if (checkId) nightAuditChecks[checkId] = Boolean(payload.confirmed);
            break;
          }
          case 'backupSnapshot':
            backupSnapshots.push({
              id: docSnap.id,
              title: String(d.title ?? 'Snapshot'),
              createdAtLabel: String(payload.createdAtLabel ?? ''),
              summaryText: String(payload.summaryText ?? ''),
            });
            break;
        }
      });

      dailyArchive.sort((a, b) => b.businessDate.localeCompare(a.businessDate));
      state.tasks = tasks;
      state.discrepancies = discrepancies;
      state.dailyArchive = dailyArchive;
      state.edcTerminals = edcTerminals;
      state.cashierShifts = cashierShifts;
      state.otaBookings = otaBookings;
      state.cityLedgerItems = cityLedgerItems;
      state.banquetEvents = banquetEvents;
      state.auditTrail = auditTrail;
      state.roomReservations = roomReservations;
      state.roomFolioItems = roomFolioItems;
      state.posCatalog = posCatalog;
      state.exceptionResolutions = exceptionResolutions;
      state.nightAuditChecks = nightAuditChecks;
      state.backupSnapshots = backupSnapshots;
      state.archivedRecords = archivedRecords;
      emitIfReady('records');
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, `workspaces/${workspaceId}/records`);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );

  return () => {
    unsubWs();
    unsubRooms();
    unsubEntries();
    unsubRecords();
  };
}

export async function syncWorkspacePatch(
  uid: string,
  patch: {
    config?: HotelConfig;
    settlement?: CashSettlement;
    kwentraSnapshot?: KwentraSnapshot;
    occupancyInputs?: OccupancyInputs;
    cashDenominations?: Record<string, number>;
    isOutageMode?: boolean;
    dayLocked?: boolean;
  }
): Promise<void> {
  const workspaceId = getWorkspaceId(uid);
  const wsRef = doc(db, 'workspaces', workspaceId);
  const updateBody: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (patch.config) {
    const safeCfg = sanitizeConfig(patch.config);
    updateBody.config = safeCfg;
    updateBody.hotelName = safeCfg.hotelName;
    updateBody.businessDate = safeCfg.businessDate;
    updateBody.currency = safeCfg.currency;
  }
  if (patch.settlement) {
    updateBody.settlement = sanitizeSettlement(patch.settlement);
  }
  if (patch.kwentraSnapshot) {
    updateBody.kwentraSnapshot = patch.kwentraSnapshot;
  }
  if (patch.occupancyInputs) {
    updateBody.occupancyInputs = patch.occupancyInputs;
  }
  if (patch.cashDenominations) {
    updateBody.cashDenominations = patch.cashDenominations;
  }
  if (typeof patch.isOutageMode === 'boolean') {
    updateBody.isOutageMode = patch.isOutageMode;
  }
  if (typeof patch.dayLocked === 'boolean') {
    updateBody.dayLocked = patch.dayLocked;
  }

  try {
    await updateDoc(wsRef, updateBody);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `workspaces/${workspaceId}`);
  }
}

export async function upsertCloudRoom(uid: string, room: HotelRoom, isNew = true): Promise<void> {
  const workspaceId = getWorkspaceId(uid);
  const { roomId, data } = buildRoomPayload(uid, workspaceId, room, false);
  const ref = doc(db, 'workspaces', workspaceId, 'rooms', roomId);
  try {
    if (isNew) {
      await setDoc(ref, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const updateFields: Record<string, unknown> = {
        roomNumber: data.roomNumber,
        floor: data.floor,
        roomType: data.roomType,
        baseRate: data.baseRate,
        maxOccupancy: data.maxOccupancy,
        status: data.status,
        updatedAt: serverTimestamp(),
      };
      if (data.guestName !== undefined) updateFields.guestName = data.guestName;
      if (data.notes !== undefined) updateFields.notes = data.notes;
      await updateDoc(ref, updateFields);
    }
  } catch (err) {
    handleFirestoreError(
      err,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      `workspaces/${workspaceId}/rooms/${roomId}`
    );
  }
}

export async function upsertCloudRoomsBulk(uid: string, rooms: HotelRoom[]): Promise<void> {
  if (rooms.length === 0) return;
  const workspaceId = getWorkspaceId(uid);
  try {
    for (let i = 0; i < rooms.length; i += 350) {
      const batch = writeBatch(db);
      for (const room of rooms.slice(i, i + 350)) {
        const { roomId, data } = buildRoomPayload(uid, workspaceId, room, false);
        batch.set(doc(db, 'workspaces', workspaceId, 'rooms', roomId), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `workspaces/${workspaceId}/rooms`);
  }
}

export async function setCloudRoomArchived(
  uid: string,
  roomRawId: string,
  isArchived: boolean
): Promise<void> {
  const workspaceId = getWorkspaceId(uid);
  const roomId = sanitizeId(roomRawId);
  try {
    await updateDoc(doc(db, 'workspaces', workspaceId, 'rooms', roomId), {
      isArchived,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `workspaces/${workspaceId}/rooms/${roomId}`
    );
  }
}

export async function createCloudLedgerEntry(uid: string, entry: LedgerEntry): Promise<void> {
  const workspaceId = getWorkspaceId(uid);
  const { entryId, data } = buildLedgerPayload(uid, workspaceId, entry, false);
  try {
    await setDoc(doc(db, 'workspaces', workspaceId, 'ledgerEntries', entryId), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.CREATE,
      `workspaces/${workspaceId}/ledgerEntries/${entryId}`
    );
  }
}

export async function createCloudLedgerEntriesBulk(
  uid: string,
  entries: LedgerEntry[]
): Promise<void> {
  if (entries.length === 0) return;
  const workspaceId = getWorkspaceId(uid);
  try {
    for (let i = 0; i < entries.length; i += 350) {
      const batch = writeBatch(db);
      for (const entry of entries.slice(i, i + 350)) {
        const { entryId, data } = buildLedgerPayload(uid, workspaceId, entry, false);
        batch.set(doc(db, 'workspaces', workspaceId, 'ledgerEntries', entryId), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `workspaces/${workspaceId}/ledgerEntries`);
  }
}

export async function updateCloudLedgerEntry(
  uid: string,
  entryRawId: string,
  patch: { reconciled?: boolean; approvedBy?: string; isArchived?: boolean }
): Promise<void> {
  const workspaceId = getWorkspaceId(uid);
  const entryId = sanitizeId(entryRawId);
  const updateBody: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (typeof patch.reconciled === 'boolean') updateBody.reconciled = patch.reconciled;
  if (typeof patch.approvedBy === 'string') {
    updateBody.approvedBy = clampStr(patch.approvedBy, 120, '');
  }
  if (typeof patch.isArchived === 'boolean') updateBody.isArchived = patch.isArchived;

  try {
    await updateDoc(doc(db, 'workspaces', workspaceId, 'ledgerEntries', entryId), updateBody);
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `workspaces/${workspaceId}/ledgerEntries/${entryId}`
    );
  }
}

export async function upsertCloudOperationalRecord(
  uid: string,
  recordType: OperationalRecordType,
  rawId: string,
  title: string,
  payload: Record<string, unknown>,
  isNew = true
): Promise<void> {
  const workspaceId = getWorkspaceId(uid);
  const { recordId, data } = buildOperationalPayload(
    uid,
    workspaceId,
    recordType,
    rawId,
    title,
    payload,
    false
  );
  const ref = doc(db, 'workspaces', workspaceId, 'records', recordId);
  try {
    if (isNew) {
      await setDoc(ref, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        title: data.title,
        payload: data.payload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(
      err,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      `workspaces/${workspaceId}/records/${recordId}`
    );
  }
}

export async function setCloudOperationalRecordArchived(
  uid: string,
  recordType: OperationalRecordType,
  rawIdOrDocId: string,
  isArchived: boolean,
  isAlreadyDocId = false
): Promise<void> {
  const workspaceId = getWorkspaceId(uid);
  const recordId = isAlreadyDocId
    ? sanitizeId(rawIdOrDocId)
    : sanitizeId(`${recordType}_${rawIdOrDocId}`);
  try {
    await updateDoc(doc(db, 'workspaces', workspaceId, 'records', recordId), {
      isArchived,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(
      err,
      OperationType.UPDATE,
      `workspaces/${workspaceId}/records/${recordId}`
    );
  }
}

export async function createCloudBackupSnapshot(
  uid: string,
  label: string,
  summaryText: string
): Promise<void> {
  const snapId = `snap_${Date.now()}`;
  const createdAtLabel = new Date().toISOString().slice(0, 16).replace('T', ' ');
  await upsertCloudOperationalRecord(
    uid,
    'backupSnapshot',
    snapId,
    label,
    {
      createdAtLabel,
      summaryText: clampStr(summaryText, 240, ''),
    },
    true
  );
}

export async function archiveAllActiveEntriesBeforeReplace(uid: string): Promise<void> {
  const workspaceId = getWorkspaceId(uid);
  try {
    const qSnap = await getDocs(
      query(collection(db, 'workspaces', workspaceId, 'ledgerEntries'), where('ownerId', '==', uid))
    );
    const docs = qSnap.docs.filter((d) => !d.data().isArchived);
    for (let i = 0; i < docs.length; i += 350) {
      const batch = writeBatch(db);
      for (const d of docs.slice(i, i + 350)) {
        batch.update(d.ref, { isArchived: true, updatedAt: serverTimestamp() });
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `workspaces/${workspaceId}/ledgerEntries`);
  }
}
