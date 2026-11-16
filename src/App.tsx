import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import {
  AlertOctagon,
  Archive,
  BedDouble,
  BookOpen,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  LogOut,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react';
import { AuditDashboard } from './components/AuditDashboard';
import { AuditSettings } from './components/AuditSettings';
import { AuditSuite } from './components/AuditSuite';
import { DailyIncomeAudit } from './components/DailyIncomeAudit';
import { KwentraCompare } from './components/KwentraCompare';
import { LoginPage } from './components/LoginPage';
import { OutageLedger } from './components/OutageLedger';
import { ReceivablesAndBeo } from './components/ReceivablesAndBeo';
import { RecoveryExport } from './components/RecoveryExport';
import { ReportsCenter } from './components/ReportsCenter';
import { RoomRackManager } from './components/RoomRackManager';
import { SystemGuide } from './components/SystemGuide';
import {
  DEFAULT_AUDIT_TASKS,
  DEFAULT_AUDIT_TRAIL,
  DEFAULT_BANQUET_EVENTS,
  DEFAULT_CASH_DENOMINATIONS,
  DEFAULT_CASHIER_SHIFTS,
  DEFAULT_CITY_LEDGER,
  DEFAULT_CONFIG,
  DEFAULT_DAILY_ARCHIVE,
  DEFAULT_EDC_TERMINALS,
  DEFAULT_HOTEL_ROOMS,
  DEFAULT_OCCUPANCY,
  DEFAULT_OTA_BOOKINGS,
  DEFAULT_POS_CATALOG,
  DEFAULT_ROOM_FOLIO_ITEMS,
  DEFAULT_ROOM_RESERVATIONS,
  PROPERTY_PRESETS,
  SAMPLE_DISCREPANCIES,
  SAMPLE_ENTRIES,
  SAMPLE_SETTLEMENT,
} from './data/sampleAuditData';
import { LanguageCode, TRANSLATIONS } from './i18n/translations';
import {
  AuditExceptionResolution,
  AuditTask,
  AuditTaskStatus,
  AuditTrailAction,
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
  SecurityOperatorAccount,
  SecuritySettings,
  UserRole,
} from './types/audit';
import { auth, signInWithGoogleCloud, signOutGoogleCloud } from './firebase';
import {
  ArchivedLedgerItem,
  ArchivedOperationalItem,
  ArchivedRoomItem,
  CloudWorkspaceSnapshot,
  createCloudBackupSnapshot,
  createCloudLedgerEntriesBulk,
  createCloudLedgerEntry,
  ensureUserAndWorkspace,
  setCloudOperationalRecordArchived,
  setCloudRoomArchived,
  subscribeToCloudVault,
  syncWorkspacePatch,
  updateCloudLedgerEntry,
  upsertCloudOperationalRecord,
  upsertCloudRoom,
  upsertCloudRoomsBulk,
} from './services/firestoreVault';
import {
  enqueueSyncMutation,
  listPendingSyncMutations,
  loadWorkspaceSnapshotFromIDB,
  markSyncMutationFailed,
  QueuedMutation,
  removePendingSyncMutation,
  saveWorkspaceSnapshotToIDB,
  SyncStatusState,
} from './services/offlineVault';
import { PWAInstallButton, SyncStatusBadge } from './components/ConnectivityAndPwaBar';
import {
  calculateTaxes,
  computeAuditSummary,
  computePackageSplit,
  downloadTextFile,
  entriesToCsv,
  getDefaultRatesForBase,
  getExchangeRates,
  roundMoney,
} from './utils/auditEngine';
import { getRolePermissions } from './utils/rbac';

type ActiveTab =
  | 'dashboard'
  | 'incomeAudit'
  | 'ledger'
  | 'rooms'
  | 'compare'
  | 'auditSuite'
  | 'receivables'
  | 'reports'
  | 'recovery'
  | 'settings'
  | 'guide';

const STORAGE_KEY = 'auditshield_kwentra_pms_v2';
const LANG_STORAGE_KEY = 'auditshield_lang_v1';
const SECURITY_STORAGE_KEY = 'hia_security_v1';

const DEFAULT_ROLE_USERS: SecurityOperatorAccount[] = [
  {
    id: 'op-admin',
    username: 'a.mofrah',
    displayName: 'Ahmed Mofrah (Income Audit / Admin)',
    role: 'Administrator',
    passcode: 'hotel-audit-2026',
  },
  {
    id: 'op-income',
    username: 'income.auditor',
    displayName: 'Income Auditor',
    role: 'IncomeAuditor',
    passcode: 'audit-2026',
  },
  {
    id: 'op-night',
    username: 'night.auditor',
    displayName: 'Night Auditor',
    role: 'NightAuditor',
    passcode: 'night-2026',
  },
  {
    id: 'op-fo',
    username: 'front.office',
    displayName: 'Front Office Desk',
    role: 'FrontOffice',
    passcode: 'fo-2026',
  },
  {
    id: 'op-cashier',
    username: 'pos.cashier',
    displayName: 'Outlet Cashier',
    role: 'Cashier',
    passcode: 'pos-2026',
  },
  {
    id: 'op-readonly',
    username: 'gm.viewer',
    displayName: 'Executive Viewer (Read Only)',
    role: 'ReadOnly',
    passcode: 'view-2026',
  },
];

const DEFAULT_SECURITY: SecuritySettings = {
  username: 'a.mofrah',
  passcode: 'hotel-audit-2026',
  activeRole: 'Administrator',
  roleUsers: DEFAULT_ROLE_USERS,
  requireStrictCredentials: true,
  requireSecurityCheck: true,
  requirePinForDayUnlock: false,
  supervisorPin: '1234',
};

function loadInitialSecurity(): SecuritySettings {
  try {
    const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SecuritySettings>;
      return {
        ...DEFAULT_SECURITY,
        ...parsed,
        username: parsed.username?.trim() || DEFAULT_SECURITY.username,
        passcode: parsed.passcode || DEFAULT_SECURITY.passcode,
        supervisorPin: parsed.supervisorPin || DEFAULT_SECURITY.supervisorPin,
        activeRole: parsed.activeRole ?? DEFAULT_SECURITY.activeRole,
        roleUsers:
          Array.isArray(parsed.roleUsers) && parsed.roleUsers.length > 0
            ? parsed.roleUsers
            : DEFAULT_ROLE_USERS,
      };
    }
  } catch {
    // Fallback to default security
  }
  return DEFAULT_SECURITY;
}

interface PropertyState {
  config: HotelConfig;
  entries: LedgerEntry[];
  settlement: CashSettlement;
  tasks: AuditTask[];
  discrepancies: RoomDiscrepancy[];
  isOutageMode: boolean;
  kwentraSnapshot?: KwentraSnapshot;
  dayLocked?: boolean;
  occupancyInputs?: OccupancyInputs;
  dailyArchive?: DailyArchiveRecord[];
  cashDenominations?: Record<string, number>;
  edcTerminals?: EdcTerminalRecord[];
  cashierShifts?: CashierShiftRecord[];
  otaBookings?: OtaAuditRecord[];
  cityLedgerItems?: CityLedgerRecord[];
  banquetEvents?: BanquetBeoRecord[];
  auditTrail?: AuditTrailEntry[];
  hotelRooms?: HotelRoom[];
  roomReservations?: RoomReservation[];
  roomFolioItems?: RoomFolioItem[];
  posCatalog?: PosCatalogItem[];
  exceptionResolutions?: Record<string, AuditExceptionResolution>;
  nightAuditChecks?: Record<string, boolean>;
  archivedRooms?: HotelRoom[];
  archivedEntries?: LedgerEntry[];
  localSnapshots?: { id: string; title: string; createdAtLabel: string; summaryText: string }[];
}

interface MultiPropertyStore {
  activePropertyId: string;
  properties: Record<string, PropertyState>;
}

function buildSeedStore(): MultiPropertyStore {
  const properties: Record<string, PropertyState> = {};
  for (const preset of PROPERTY_PRESETS) {
    properties[preset.id] = {
      config: preset.config,
      entries: preset.entries,
      settlement: preset.settlement,
      tasks: preset.tasks,
      discrepancies: preset.discrepancies,
      isOutageMode: preset.id === 'grand-nile',
      kwentraSnapshot: preset.kwentraBaseline,
      dayLocked: false,
      occupancyInputs: preset.occupancyInputs,
      dailyArchive: preset.dailyArchive,
      cashDenominations: preset.cashDenominations,
      edcTerminals: preset.edcTerminals,
      cashierShifts: preset.cashierShifts,
      otaBookings: preset.otaBookings,
      cityLedgerItems: preset.cityLedgerItems,
      banquetEvents: preset.banquetEvents,
      auditTrail: preset.auditTrail,
      hotelRooms: preset.hotelRooms ?? DEFAULT_HOTEL_ROOMS,
      roomReservations: preset.roomReservations ?? DEFAULT_ROOM_RESERVATIONS,
      roomFolioItems: preset.roomFolioItems ?? DEFAULT_ROOM_FOLIO_ITEMS,
      posCatalog: preset.posCatalog ?? DEFAULT_POS_CATALOG,
      exceptionResolutions: {},
      nightAuditChecks: {},
      archivedRooms: [],
      archivedEntries: [],
      localSnapshots: [],
    };
  }
  return {
    activePropertyId: PROPERTY_PRESETS[0].id,
    properties,
  };
}

function loadInitialStore(): MultiPropertyStore {
  const seed = buildSeedStore();
  const singleId = PROPERTY_PRESETS[0].id;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MultiPropertyStore>;
      const savedProp = parsed.properties?.[singleId];
      if (savedProp && savedProp.config) {
        const baseSeed = seed.properties[singleId].config;
        return {
          activePropertyId: singleId,
          properties: {
            [singleId]: {
              ...savedProp,
              config: {
                ...baseSeed,
                ...savedProp.config,
                exchangeRates:
                  savedProp.config.exchangeRates ??
                  baseSeed.exchangeRates ??
                  getDefaultRatesForBase(savedProp.config.currency),
              },
              dayLocked: savedProp.dayLocked ?? false,
              occupancyInputs: savedProp.occupancyInputs ?? DEFAULT_OCCUPANCY,
              dailyArchive: savedProp.dailyArchive ?? DEFAULT_DAILY_ARCHIVE,
              cashDenominations: savedProp.cashDenominations ?? DEFAULT_CASH_DENOMINATIONS,
              edcTerminals: savedProp.edcTerminals ?? DEFAULT_EDC_TERMINALS,
              cashierShifts: savedProp.cashierShifts ?? DEFAULT_CASHIER_SHIFTS,
              otaBookings: savedProp.otaBookings ?? DEFAULT_OTA_BOOKINGS,
              cityLedgerItems: savedProp.cityLedgerItems ?? DEFAULT_CITY_LEDGER,
              banquetEvents: savedProp.banquetEvents ?? DEFAULT_BANQUET_EVENTS,
              auditTrail: savedProp.auditTrail ?? DEFAULT_AUDIT_TRAIL,
              hotelRooms: Array.isArray(savedProp.hotelRooms)
                ? savedProp.hotelRooms
                : DEFAULT_HOTEL_ROOMS,
              roomReservations: Array.isArray(savedProp.roomReservations)
                ? savedProp.roomReservations
                : DEFAULT_ROOM_RESERVATIONS,
              roomFolioItems: Array.isArray(savedProp.roomFolioItems)
                ? savedProp.roomFolioItems
                : DEFAULT_ROOM_FOLIO_ITEMS,
              posCatalog: Array.isArray(savedProp.posCatalog)
                ? savedProp.posCatalog
                : DEFAULT_POS_CATALOG,
              exceptionResolutions:
                savedProp.exceptionResolutions && typeof savedProp.exceptionResolutions === 'object'
                  ? savedProp.exceptionResolutions
                  : {},
              nightAuditChecks:
                savedProp.nightAuditChecks && typeof savedProp.nightAuditChecks === 'object'
                  ? savedProp.nightAuditChecks
                  : {},
              archivedRooms: Array.isArray(savedProp.archivedRooms) ? savedProp.archivedRooms : [],
              archivedEntries: Array.isArray(savedProp.archivedEntries)
                ? savedProp.archivedEntries
                : [],
              localSnapshots: Array.isArray(savedProp.localSnapshots)
                ? savedProp.localSnapshots
                : [],
            },
          },
        };
      }
    }
  } catch {
    // Fall back cleanly to seed store
  }
  return seed;
}

function loadInitialLang(): LanguageCode {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'ar' || saved === 'en' || saved === 'fr') {
      return saved;
    }
  } catch {
    // Ignore storage read errors
  }
  return 'ar';
}

const LANGUAGE_OPTIONS: { code: LanguageCode; label: string }[] = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
];

export default function App() {
  const [store, setStore] = useState<MultiPropertyStore>(() => loadInitialStore());
  const [lang, setLang] = useState<LanguageCode>(() => loadInitialLang());
  const [security, setSecurity] = useState<SecuritySettings>(() => loadInitialSecurity());
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinAttempt, setPinAttempt] = useState('');
  const [pinError, setPinError] = useState('');
  const [authUser, setAuthUser] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('hia_auth_user_v1');
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [requestedRoomId, setRequestedRoomId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [opsOpen, setOpsOpen] = useState(true);
  const [specOpen, setSpecOpen] = useState(true);
  const [cfgOpen, setCfgOpen] = useState(true);

  const t = TRANSLATIONS[lang];
  const isRtl = t.dir === 'rtl';

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [cloudSyncReady, setCloudSyncReady] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'OFFLINE' : 'ONLINE'
  );
  const [pendingMutations, setPendingMutations] = useState<QueuedMutation[]>([]);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);
  const [rbacNotice, setRbacNotice] = useState<string | null>(null);
  const [cloudVaultMeta, setCloudVaultMeta] = useState<{
    archivedRooms: ArchivedRoomItem[];
    archivedEntries: ArchivedLedgerItem[];
    archivedRecords: ArchivedOperationalItem[];
    backupSnapshots: { id: string; title: string; createdAtLabel: string; summaryText: string }[];
  }>({
    archivedRooms: [],
    archivedEntries: [],
    archivedRecords: [],
    backupSnapshots: [],
  });

  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }
  }, [lang, t.dir]);

  // Recover from IndexedDB on initial load if localStorage had no saved store
  useEffect(() => {
    let active = true;
    const recoverFromIdb = async () => {
      try {
        const hasLocal = Boolean(localStorage.getItem(STORAGE_KEY));
        if (!hasLocal) {
          const idbSnap = await loadWorkspaceSnapshotFromIDB<MultiPropertyStore>('active_store_v1');
          if (active && idbSnap?.data?.properties) {
            setStore(idbSnap.data);
          }
        }
      } catch {
        // Ignore IDB errors
      }
      const queued = await listPendingSyncMutations();
      if (active) {
        setPendingMutations(queued);
      }
    };
    void recoverFromIdb();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Ignore quota errors
    }
    void saveWorkspaceSnapshotToIDB('active_store_v1', store);
  }, [store]);

  useEffect(() => {
    try {
      localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(security));
    } catch {
      // Ignore quota errors
    }
  }, [security]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setCloudSyncReady(false);
        setCloudError(null);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) {
      return;
    }
    let cancelled = false;
    let unsubVault: (() => void) | undefined;

    const snapshotProp =
      storeRef.current.properties[storeRef.current.activePropertyId] ??
      Object.values(storeRef.current.properties)[0];

    const seedPayload = {
      config: snapshotProp.config,
      entries: snapshotProp.entries,
      settlement: snapshotProp.settlement,
      tasks: snapshotProp.tasks,
      discrepancies: snapshotProp.discrepancies,
      isOutageMode: snapshotProp.isOutageMode,
      kwentraSnapshot: snapshotProp.kwentraSnapshot ?? PROPERTY_PRESETS[0].kwentraBaseline,
      dayLocked: snapshotProp.dayLocked ?? false,
      occupancyInputs: snapshotProp.occupancyInputs ?? DEFAULT_OCCUPANCY,
      dailyArchive: snapshotProp.dailyArchive ?? DEFAULT_DAILY_ARCHIVE,
      cashDenominations: snapshotProp.cashDenominations ?? DEFAULT_CASH_DENOMINATIONS,
      edcTerminals: snapshotProp.edcTerminals ?? DEFAULT_EDC_TERMINALS,
      cashierShifts: snapshotProp.cashierShifts ?? DEFAULT_CASHIER_SHIFTS,
      otaBookings: snapshotProp.otaBookings ?? DEFAULT_OTA_BOOKINGS,
      cityLedgerItems: snapshotProp.cityLedgerItems ?? DEFAULT_CITY_LEDGER,
      banquetEvents: snapshotProp.banquetEvents ?? DEFAULT_BANQUET_EVENTS,
      auditTrail: snapshotProp.auditTrail ?? DEFAULT_AUDIT_TRAIL,
      hotelRooms: snapshotProp.hotelRooms ?? DEFAULT_HOTEL_ROOMS,
      roomReservations: snapshotProp.roomReservations ?? DEFAULT_ROOM_RESERVATIONS,
      roomFolioItems: snapshotProp.roomFolioItems ?? DEFAULT_ROOM_FOLIO_ITEMS,
      posCatalog: snapshotProp.posCatalog ?? DEFAULT_POS_CATALOG,
      exceptionResolutions: snapshotProp.exceptionResolutions ?? {},
      nightAuditChecks: snapshotProp.nightAuditChecks ?? {},
    };

    const initVault = async () => {
      try {
        setCloudError(null);
        await ensureUserAndWorkspace(
          firebaseUser.uid,
          firebaseUser.displayName || firebaseUser.email || 'Income Auditor',
          seedPayload
        );
        if (cancelled) return;
        unsubVault = subscribeToCloudVault(
          firebaseUser.uid,
          (cloudData: CloudWorkspaceSnapshot) => {
            if (cancelled) return;
            setStore((prev) => {
              const pid = prev.activePropertyId;
              const existing = prev.properties[pid] ?? snapshotProp;
              return {
                ...prev,
                properties: {
                  ...prev.properties,
                  [pid]: {
                    ...existing,
                    config: cloudData.config ?? existing.config,
                    settlement: cloudData.settlement ?? existing.settlement,
                    kwentraSnapshot: cloudData.kwentraSnapshot ?? existing.kwentraSnapshot,
                    occupancyInputs: cloudData.occupancyInputs ?? existing.occupancyInputs,
                    cashDenominations: cloudData.cashDenominations ?? existing.cashDenominations,
                    isOutageMode:
                      cloudData.isOutageMode !== undefined
                        ? cloudData.isOutageMode
                        : existing.isOutageMode,
                    dayLocked:
                      cloudData.dayLocked !== undefined ? cloudData.dayLocked : existing.dayLocked,
                    hotelRooms: cloudData.rooms,
                    entries: cloudData.entries,
                    tasks: cloudData.tasks.length > 0 ? cloudData.tasks : existing.tasks,
                    discrepancies: cloudData.discrepancies,
                    dailyArchive: cloudData.dailyArchive,
                    edcTerminals: cloudData.edcTerminals,
                    cashierShifts: cloudData.cashierShifts,
                    otaBookings: cloudData.otaBookings,
                    cityLedgerItems: cloudData.cityLedgerItems,
                    banquetEvents: cloudData.banquetEvents,
                    auditTrail: cloudData.auditTrail,
                    roomReservations: cloudData.roomReservations,
                    roomFolioItems: cloudData.roomFolioItems,
                    posCatalog:
                      cloudData.posCatalog.length > 0
                        ? cloudData.posCatalog
                        : existing.posCatalog ?? DEFAULT_POS_CATALOG,
                    exceptionResolutions:
                      Object.keys(cloudData.exceptionResolutions).length > 0
                        ? cloudData.exceptionResolutions
                        : existing.exceptionResolutions ?? {},
                    nightAuditChecks:
                      Object.keys(cloudData.nightAuditChecks).length > 0
                        ? cloudData.nightAuditChecks
                        : existing.nightAuditChecks ?? {},
                  },
                },
              };
            });
            setCloudVaultMeta({
              archivedRooms: cloudData.archivedRooms,
              archivedEntries: cloudData.archivedEntries,
              archivedRecords: cloudData.archivedRecords,
              backupSnapshots: cloudData.backupSnapshots,
            });
            setCloudSyncReady(true);
          },
          (err) => {
            if (!cancelled) {
              setCloudError(err.message);
            }
          }
        );
      } catch (err) {
        if (!cancelled) {
          setCloudError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    void initVault();
    return () => {
      cancelled = true;
      if (unsubVault) unsubVault();
    };
  }, [firebaseUser]);

  const currentProperty =
    store.properties[store.activePropertyId] ?? Object.values(store.properties)[0];

  const handleLoginSuccess = (username: string, matchedRole?: UserRole) => {
    setAuthUser(username);
    if (matchedRole) {
      setSecurity((prev) => ({ ...prev, activeRole: matchedRole }));
    }
    try {
      sessionStorage.setItem('hia_auth_user_v1', username);
    } catch {
      // Ignore sessionStorage errors
    }
  };

  const handleLogout = () => {
    setAuthUser(null);
    setMobileMenuOpen(false);
    try {
      sessionStorage.removeItem('hia_auth_user_v1');
    } catch {
      // Ignore sessionStorage errors
    }
    if (firebaseUser) {
      void signOutGoogleCloud();
    }
  };

  const cloudUid =
    firebaseUser && firebaseUser.emailVerified ? firebaseUser.uid : null;

  const permissions = useMemo(
    () => getRolePermissions(security.activeRole ?? 'Administrator'),
    [security.activeRole]
  );

  const notifyRbacDenied = (actionLabelAr: string, actionLabelEn: string) => {
    const msg =
      lang === 'ar'
        ? `الصلاحية الحالية (${permissions.labelAr}) لا تسمح بتنفيذ: ${actionLabelAr}`
        : `Current role (${permissions.labelEn}) does not permit: ${actionLabelEn}`;
    setRbacNotice(msg);
    window.setTimeout(() => {
      setRbacNotice((prev) => (prev === msg ? null : prev));
    }, 5000);
  };

  const executeQueuedMutation = async (mut: QueuedMutation) => {
    const p = mut.payload;
    switch (mut.actionType) {
      case 'syncWorkspacePatch':
        await syncWorkspacePatch(mut.uid, p as Parameters<typeof syncWorkspacePatch>[1]);
        break;
      case 'upsertCloudRoom':
        await upsertCloudRoom(mut.uid, p.room as HotelRoom, Boolean(p.isNew));
        break;
      case 'upsertCloudRoomsBulk':
        await upsertCloudRoomsBulk(mut.uid, p.rooms as HotelRoom[]);
        break;
      case 'setCloudRoomArchived':
        await setCloudRoomArchived(mut.uid, String(p.roomId), Boolean(p.archived));
        break;
      case 'createCloudLedgerEntry':
        await createCloudLedgerEntry(mut.uid, p.entry as LedgerEntry);
        break;
      case 'createCloudLedgerEntriesBulk':
        await createCloudLedgerEntriesBulk(mut.uid, p.entries as LedgerEntry[]);
        break;
      case 'updateCloudLedgerEntry':
        await updateCloudLedgerEntry(
          mut.uid,
          String(p.entryId),
          p.patch as Parameters<typeof updateCloudLedgerEntry>[2]
        );
        break;
      case 'upsertCloudOperationalRecord':
        await upsertCloudOperationalRecord(
          mut.uid,
          p.recordType as Parameters<typeof upsertCloudOperationalRecord>[1],
          String(p.id),
          String(p.title),
          p.data as Record<string, unknown>,
          Boolean(p.isNew)
        );
        break;
      case 'setCloudOperationalRecordArchived':
        await setCloudOperationalRecordArchived(
          mut.uid,
          p.recordType as Parameters<typeof setCloudOperationalRecordArchived>[1],
          String(p.id),
          Boolean(p.archived),
          Boolean(p.skipPrefix)
        );
        break;
    }
  };

  const flushPendingSyncQueue = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('OFFLINE');
      return;
    }
    const queue = await listPendingSyncMutations(cloudUid ?? undefined);
    setPendingMutations(queue);
    if (!cloudUid || queue.length === 0) {
      setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'OFFLINE' : 'ONLINE');
      return;
    }

    setSyncStatus('SYNCING');
    setSyncErrorMsg(null);
    for (const mut of queue) {
      try {
        await executeQueuedMutation(mut);
        await removePendingSyncMutation(mut.opId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await markSyncMutationFailed(mut.opId, msg);
        setSyncErrorMsg(msg);
        setSyncStatus('SYNC_ERROR');
        const remaining = await listPendingSyncMutations(cloudUid);
        setPendingMutations(remaining);
        return;
      }
    }
    const remaining = await listPendingSyncMutations(cloudUid);
    setPendingMutations(remaining);
    setSyncStatus('ONLINE');
  };

  useEffect(() => {
    const handleOnline = () => {
      void flushPendingSyncQueue();
    };
    const handleOffline = () => {
      setSyncStatus('OFFLINE');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (cloudUid && navigator.onLine) {
      void flushPendingSyncQueue();
    }
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudUid]);

  const dispatchCloudWrite = (
    dedupeKey: string,
    actionType: QueuedMutation['actionType'],
    payload: Record<string, unknown>,
    executor: () => Promise<unknown>
  ) => {
    if (!cloudUid) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('OFFLINE');
      void enqueueSyncMutation({ dedupeKey, uid: cloudUid, actionType, payload }).then(async () => {
        setPendingMutations(await listPendingSyncMutations(cloudUid));
      });
      return;
    }

    setSyncStatus('SYNCING');
    void executor()
      .then(async () => {
        setSyncErrorMsg(null);
        const remaining = await listPendingSyncMutations(cloudUid);
        setPendingMutations(remaining);
        setSyncStatus(remaining.length > 0 ? 'SYNC_ERROR' : 'ONLINE');
      })
      .catch(async (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        await enqueueSyncMutation({ dedupeKey, uid: cloudUid, actionType, payload });
        setPendingMutations(await listPendingSyncMutations(cloudUid));
        setSyncErrorMsg(msg);
        setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'OFFLINE' : 'SYNC_ERROR');
      });
  };

  const { config, entries, settlement, tasks, discrepancies, isOutageMode } =
    currentProperty;

  const fallbackBaseline = PROPERTY_PRESETS[0].kwentraBaseline;

  const kwentraSnapshot: KwentraSnapshot =
    currentProperty.kwentraSnapshot ?? fallbackBaseline;
  const dayLocked = currentProperty.dayLocked ?? false;
  const occupancyInputs = currentProperty.occupancyInputs ?? DEFAULT_OCCUPANCY;
  const dailyArchive = currentProperty.dailyArchive ?? DEFAULT_DAILY_ARCHIVE;
  const cashDenominations = currentProperty.cashDenominations ?? DEFAULT_CASH_DENOMINATIONS;
  const edcTerminals = currentProperty.edcTerminals ?? DEFAULT_EDC_TERMINALS;
  const cashierShifts = currentProperty.cashierShifts ?? DEFAULT_CASHIER_SHIFTS;
  const otaBookings = currentProperty.otaBookings ?? DEFAULT_OTA_BOOKINGS;
  const cityLedgerItems = currentProperty.cityLedgerItems ?? DEFAULT_CITY_LEDGER;
  const banquetEvents = currentProperty.banquetEvents ?? DEFAULT_BANQUET_EVENTS;
  const auditTrail = currentProperty.auditTrail ?? DEFAULT_AUDIT_TRAIL;
  const hotelRooms = currentProperty.hotelRooms ?? DEFAULT_HOTEL_ROOMS;
  const roomReservations = currentProperty.roomReservations ?? DEFAULT_ROOM_RESERVATIONS;
  const roomFolioItems = currentProperty.roomFolioItems ?? DEFAULT_ROOM_FOLIO_ITEMS;
  const posCatalog = currentProperty.posCatalog ?? DEFAULT_POS_CATALOG;
  const exceptionResolutions = currentProperty.exceptionResolutions ?? {};
  const nightAuditChecks = currentProperty.nightAuditChecks ?? {};

  const updateCurrentProperty = (
    updater: (prev: PropertyState) => PropertyState
  ) => {
    setStore((prevStore) => {
      const pid = prevStore.activePropertyId;
      const existing = prevStore.properties[pid] ?? currentProperty;
      return {
        ...prevStore,
        properties: {
          ...prevStore.properties,
          [pid]: updater(existing),
        },
      };
    });
  };

  const makeTrailEntry = (
    action: AuditTrailAction,
    targetRef: string,
    detail: string,
    amountImpact?: number,
    actorName?: string,
    meta?: { recordId?: string; oldValues?: string; newValues?: string }
  ): AuditTrailEntry => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    return {
      id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: hhmm,
      action,
      actor: actorName || authUser || settlement.generalCashierName || 'Income Auditor',
      actorRole: security.activeRole ?? 'Administrator',
      targetRef,
      recordId: meta?.recordId,
      detail,
      oldValues: meta?.oldValues,
      newValues: meta?.newValues,
      amountImpact,
    };
  };

  const summary = useMemo(
    () => computeAuditSummary(entries, settlement, discrepancies, config, lang),
    [entries, settlement, discrepancies, config, lang]
  );

  const handleUpdateConfig = (nextConfig: HotelConfig) => {
    if (!permissions.canEditSettings) {
      notifyRbacDenied('تعديل إعدادات الفندق وأسعار الصرف', 'Modify Property & FX Settings');
      return;
    }
    const currencyChanged =
      nextConfig.currency !== config.currency ||
      JSON.stringify(nextConfig.exchangeRates) !== JSON.stringify(config.exchangeRates);
    const trailEntry = currencyChanged
      ? makeTrailEntry(
          'rate_change',
          nextConfig.currency,
          `Updated base currency (${nextConfig.currency}) or FX rates`,
          undefined,
          undefined,
          {
            recordId: 'config',
            oldValues: JSON.stringify({ currency: config.currency, exchangeRates: config.exchangeRates }),
            newValues: JSON.stringify({ currency: nextConfig.currency, exchangeRates: nextConfig.exchangeRates }),
          }
        )
      : null;

    updateCurrentProperty((p) => ({
      ...p,
      config: nextConfig,
      auditTrail: trailEntry
        ? [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)]
        : p.auditTrail,
    }));

    if (cloudUid) {
      dispatchCloudWrite(
        'patch:config',
        'syncWorkspacePatch',
        { config: nextConfig },
        () => syncWorkspacePatch(cloudUid, { config: nextConfig })
      );
      if (trailEntry) {
        dispatchCloudWrite(
          `trail:${trailEntry.id}`,
          'upsertCloudOperationalRecord',
          {
            recordType: 'auditTrail',
            id: trailEntry.id,
            title: `${trailEntry.action}: ${trailEntry.targetRef}`,
            data: { ...trailEntry },
            isNew: true,
          },
          () =>
            upsertCloudOperationalRecord(
              cloudUid,
              'auditTrail',
              trailEntry.id,
              `${trailEntry.action}: ${trailEntry.targetRef}`,
              { ...trailEntry },
              true
            )
        );
      }
    }
  };

  const handleUpdateSettlement = (nextSettlement: CashSettlement) => {
    updateCurrentProperty((p) => ({ ...p, settlement: nextSettlement }));
    if (cloudUid) {
      dispatchCloudWrite(
        'patch:settlement',
        'syncWorkspacePatch',
        { settlement: nextSettlement },
        () => syncWorkspacePatch(cloudUid, { settlement: nextSettlement })
      );
    }
  };

  const handleSetOutageMode = (val: boolean) => {
    updateCurrentProperty((p) => ({ ...p, isOutageMode: val }));
    if (cloudUid) {
      dispatchCloudWrite(
        'patch:isOutageMode',
        'syncWorkspacePatch',
        { isOutageMode: val },
        () => syncWorkspacePatch(cloudUid, { isOutageMode: val })
      );
    }
  };

  const handleAddEntry = (entry: LedgerEntry) => {
    if (!permissions.canCreateLedger) {
      notifyRbacDenied('إضافة قيد مالي', 'Create Ledger Entry');
      return;
    }
    const enrichedEntry: LedgerEntry = {
      ...entry,
      cashierName: entry.cashierName || authUser || settlement.generalCashierName,
    };
    const trailEntry = makeTrailEntry(
      'create',
      enrichedEntry.referenceNo,
      `${enrichedEntry.category} · ${enrichedEntry.guestOrDescription}`,
      enrichedEntry.category === 'Rebate' || enrichedEntry.category === 'PaidOut'
        ? -enrichedEntry.grossAmount
        : enrichedEntry.grossAmount,
      enrichedEntry.approvedBy || undefined,
      {
        recordId: enrichedEntry.id,
        newValues: `${enrichedEntry.category}: ${enrichedEntry.grossAmount} ${config.currency}`,
      }
    );
    updateCurrentProperty((p) => ({
      ...p,
      entries: [enrichedEntry, ...p.entries],
      auditTrail: [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)],
    }));
    if (cloudUid) {
      dispatchCloudWrite(
        `ledger:${enrichedEntry.id}`,
        'createCloudLedgerEntry',
        { entry: enrichedEntry },
        () => createCloudLedgerEntry(cloudUid, enrichedEntry)
      );
      dispatchCloudWrite(
        `trail:${trailEntry.id}`,
        'upsertCloudOperationalRecord',
        {
          recordType: 'auditTrail',
          id: trailEntry.id,
          title: `${trailEntry.action}: ${trailEntry.targetRef}`,
          data: { ...trailEntry },
          isNew: true,
        },
        () =>
          upsertCloudOperationalRecord(
            cloudUid,
            'auditTrail',
            trailEntry.id,
            `${trailEntry.action}: ${trailEntry.targetRef}`,
            { ...trailEntry },
            true
          )
      );
    }
  };

  const handleToggleReconciled = (id: string) => {
    if (!permissions.canReconcileLedger) {
      notifyRbacDenied('مراجعة واعتماد القيود', 'Verify / Reconcile Entry');
      return;
    }
    const target = entries.find((e) => e.id === id);
    const nextReconciled = target ? !target.reconciled : true;
    const trailEntry = target
      ? makeTrailEntry(
          'reconcile',
          target.referenceNo,
          `${nextReconciled ? 'Verified' : 'Unverified'} ${target.guestOrDescription}`,
          target.grossAmount,
          undefined,
          {
            recordId: target.id,
            oldValues: `reconciled=${Boolean(target.reconciled)}`,
            newValues: `reconciled=${nextReconciled}`,
          }
        )
      : null;

    updateCurrentProperty((p) => ({
      ...p,
      entries: p.entries.map((e) =>
        e.id === id ? { ...e, reconciled: !e.reconciled } : e
      ),
      auditTrail: trailEntry
        ? [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)]
        : p.auditTrail,
    }));

    if (cloudUid && target) {
      dispatchCloudWrite(
        `ledger-upd:${id}`,
        'updateCloudLedgerEntry',
        { entryId: id, patch: { reconciled: nextReconciled } },
        () => updateCloudLedgerEntry(cloudUid, id, { reconciled: nextReconciled })
      );
      if (trailEntry) {
        dispatchCloudWrite(
          `trail:${trailEntry.id}`,
          'upsertCloudOperationalRecord',
          {
            recordType: 'auditTrail',
            id: trailEntry.id,
            title: `${trailEntry.action}: ${trailEntry.targetRef}`,
            data: { ...trailEntry },
            isNew: true,
          },
          () =>
            upsertCloudOperationalRecord(
              cloudUid,
              'auditTrail',
              trailEntry.id,
              `${trailEntry.action}: ${trailEntry.targetRef}`,
              { ...trailEntry },
              true
            )
        );
      }
    }
  };

  const handleApproveEntry = (id: string, approverName: string) => {
    if (!permissions.canApproveRebates) {
      notifyRbacDenied('اعتماد الخصومات والقيود', 'Approve Entry / Rebate');
      return;
    }
    const target = entries.find((e) => e.id === id);
    const trailEntry = target
      ? makeTrailEntry(
          'approve',
          target.referenceNo,
          `Approved by ${approverName}: ${target.guestOrDescription}`,
          target.grossAmount,
          approverName,
          {
            recordId: target.id,
            oldValues: `approvedBy=${target.approvedBy || 'none'}`,
            newValues: `approvedBy=${approverName}`,
          }
        )
      : null;

    updateCurrentProperty((p) => ({
      ...p,
      entries: p.entries.map((e) =>
        e.id === id ? { ...e, approvedBy: approverName } : e
      ),
      auditTrail: trailEntry
        ? [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)]
        : p.auditTrail,
    }));

    if (cloudUid && target) {
      dispatchCloudWrite(
        `ledger-upd:${id}`,
        'updateCloudLedgerEntry',
        { entryId: id, patch: { approvedBy: approverName } },
        () => updateCloudLedgerEntry(cloudUid, id, { approvedBy: approverName })
      );
      if (trailEntry) {
        dispatchCloudWrite(
          `trail:${trailEntry.id}`,
          'upsertCloudOperationalRecord',
          {
            recordType: 'auditTrail',
            id: trailEntry.id,
            title: `${trailEntry.action}: ${trailEntry.targetRef}`,
            data: { ...trailEntry },
            isNew: true,
          },
          () =>
            upsertCloudOperationalRecord(
              cloudUid,
              'auditTrail',
              trailEntry.id,
              `${trailEntry.action}: ${trailEntry.targetRef}`,
              { ...trailEntry },
              true
            )
        );
      }
    }
  };

  // Zero-Delete Policy: moves entry to permanent archive instead of hard deletion
  const handleDeleteEntry = (id: string) => {
    if (!permissions.canArchiveRecords) {
      notifyRbacDenied('أرشفة السجلات المالية', 'Archive Financial Record');
      return;
    }
    const target = entries.find((e) => e.id === id);
    const trailEntry = target
      ? makeTrailEntry(
          'delete',
          target.referenceNo,
          `Archived (Protected) ${target.category}: ${target.guestOrDescription}`,
          -target.grossAmount,
          undefined,
          {
            recordId: target.id,
            oldValues: 'isArchived=false',
            newValues: 'isArchived=true',
          }
        )
      : null;

    updateCurrentProperty((p) => ({
      ...p,
      entries: p.entries.filter((e) => e.id !== id),
      archivedEntries: target
        ? [target, ...(p.archivedEntries ?? []).filter((ae) => ae.id !== target.id)]
        : p.archivedEntries,
      auditTrail: trailEntry
        ? [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)]
        : p.auditTrail,
    }));

    if (cloudUid && target) {
      dispatchCloudWrite(
        `ledger-upd:${id}`,
        'updateCloudLedgerEntry',
        { entryId: id, patch: { isArchived: true } },
        () => updateCloudLedgerEntry(cloudUid, id, { isArchived: true })
      );
      if (trailEntry) {
        dispatchCloudWrite(
          `trail:${trailEntry.id}`,
          'upsertCloudOperationalRecord',
          {
            recordType: 'auditTrail',
            id: trailEntry.id,
            title: `${trailEntry.action}: ${trailEntry.targetRef}`,
            data: { ...trailEntry },
            isNew: true,
          },
          () =>
            upsertCloudOperationalRecord(
              cloudUid,
              'auditTrail',
              trailEntry.id,
              `${trailEntry.action}: ${trailEntry.targetRef}`,
              { ...trailEntry },
              true
            )
        );
      }
    }
  };

  const handleUpdateTask = (id: string, status: AuditTaskStatus, notes?: string) => {
    const existing = tasks.find((tItem) => tItem.id === id);
    const updatedTask = existing
      ? { ...existing, status, notes: notes !== undefined ? notes : existing.notes }
      : null;
    updateCurrentProperty((p) => ({
      ...p,
      tasks: p.tasks.map((task) =>
        task.id === id ? { ...task, status, notes: notes !== undefined ? notes : task.notes } : task
      ),
    }));
    if (cloudUid && updatedTask) {
      void upsertCloudOperationalRecord(
        cloudUid,
        'task',
        updatedTask.id,
        updatedTask.titleEn || updatedTask.titleAr,
        { ...updatedTask },
        false
      );
    }
  };

  const handleToggleDiscrepancyResolved = (id: string) => {
    const existing = discrepancies.find((d) => d.id === id);
    const updated = existing ? { ...existing, resolved: !existing.resolved } : null;
    updateCurrentProperty((p) => ({
      ...p,
      discrepancies: p.discrepancies.map((d) =>
        d.id === id ? { ...d, resolved: !d.resolved } : d
      ),
    }));
    if (cloudUid && updated) {
      void upsertCloudOperationalRecord(
        cloudUid,
        'discrepancy',
        updated.id,
        `Room ${updated.roomNumber}`,
        { ...updated },
        false
      );
    }
  };

  const handleAddDiscrepancy = (d: Omit<RoomDiscrepancy, 'id'>) => {
    const newItem: RoomDiscrepancy = { ...d, id: `disc-${Date.now()}` };
    updateCurrentProperty((p) => ({
      ...p,
      discrepancies: [newItem, ...p.discrepancies],
    }));
    if (cloudUid) {
      void upsertCloudOperationalRecord(
        cloudUid,
        'discrepancy',
        newItem.id,
        `Room ${newItem.roomNumber}`,
        { ...newItem },
        true
      );
    }
  };

  const handleImportEntries = (imported: LedgerEntry[], replaceExisting: boolean) => {
    if (replaceExisting) {
      updateCurrentProperty((p) => ({
        ...p,
        archivedEntries: [...p.entries, ...(p.archivedEntries ?? [])],
        entries: imported,
      }));
      if (cloudUid) {
        void createCloudBackupSnapshot(
          cloudUid,
          `Pre-Import Snapshot (${config.businessDate})`,
          `Archived ${entries.length} entries before CSV import`
        ).then(() => createCloudLedgerEntriesBulk(cloudUid, imported));
      }
      return;
    }

    const existingIds = new Set(entries.map((item) => item.id));
    const uniqueNew = imported.filter((item) => !existingIds.has(item.id));
    updateCurrentProperty((p) => ({ ...p, entries: [...uniqueNew, ...p.entries] }));
    if (cloudUid && uniqueNew.length > 0) {
      void createCloudLedgerEntriesBulk(cloudUid, uniqueNew);
    }
  };

  const handleResetSampleData = () => {
    const preset =
      PROPERTY_PRESETS.find((pr) => pr.id === store.activePropertyId) ??
      PROPERTY_PRESETS[0];

    const snapSummary = `Saved ${hotelRooms.length} rooms & ${entries.length} ledger entries before sample reset`;
    const localSnap = {
      id: `snap-${Date.now()}`,
      title: `Auto-Backup (${config.businessDate})`,
      createdAtLabel: new Date().toISOString().slice(0, 16).replace('T', ' '),
      summaryText: snapSummary,
    };

    if (cloudUid) {
      void createCloudBackupSnapshot(cloudUid, localSnap.title, snapSummary);
    }

    updateCurrentProperty((prev) => ({
      config: preset.config ?? DEFAULT_CONFIG,
      entries: preset.entries ?? SAMPLE_ENTRIES,
      settlement: preset.settlement ?? SAMPLE_SETTLEMENT,
      tasks: preset.tasks ?? DEFAULT_AUDIT_TASKS,
      discrepancies: preset.discrepancies ?? SAMPLE_DISCREPANCIES,
      isOutageMode: preset.id === 'grand-nile',
      kwentraSnapshot: preset.kwentraBaseline,
      dayLocked: false,
      occupancyInputs: preset.occupancyInputs ?? DEFAULT_OCCUPANCY,
      dailyArchive: preset.dailyArchive ?? DEFAULT_DAILY_ARCHIVE,
      cashDenominations: preset.cashDenominations ?? DEFAULT_CASH_DENOMINATIONS,
      edcTerminals: preset.edcTerminals ?? DEFAULT_EDC_TERMINALS,
      cashierShifts: preset.cashierShifts ?? DEFAULT_CASHIER_SHIFTS,
      otaBookings: preset.otaBookings ?? DEFAULT_OTA_BOOKINGS,
      cityLedgerItems: preset.cityLedgerItems ?? DEFAULT_CITY_LEDGER,
      banquetEvents: preset.banquetEvents ?? DEFAULT_BANQUET_EVENTS,
      auditTrail: preset.auditTrail ?? DEFAULT_AUDIT_TRAIL,
      hotelRooms: preset.hotelRooms ?? DEFAULT_HOTEL_ROOMS,
      roomReservations: preset.roomReservations ?? DEFAULT_ROOM_RESERVATIONS,
      roomFolioItems: preset.roomFolioItems ?? DEFAULT_ROOM_FOLIO_ITEMS,
      posCatalog: preset.posCatalog ?? DEFAULT_POS_CATALOG,
      exceptionResolutions: {},
      nightAuditChecks: {},
      archivedRooms: [...(prev.hotelRooms ?? []), ...(prev.archivedRooms ?? [])],
      archivedEntries: [...(prev.entries ?? []), ...(prev.archivedEntries ?? [])],
      localSnapshots: [localSnap, ...(prev.localSnapshots ?? [])],
    }));
  };

  const handleUpdateKwentraSnapshot = (nextSnapshot: KwentraSnapshot) => {
    updateCurrentProperty((p) => ({ ...p, kwentraSnapshot: nextSnapshot }));
    if (cloudUid) {
      void syncWorkspacePatch(cloudUid, { kwentraSnapshot: nextSnapshot });
    }
  };

  const executeDayLockToggle = (overrideReason?: string) => {
    const nextLocked = !dayLocked;
    const trailEntry = makeTrailEntry(
      nextLocked ? 'lock' : 'unlock',
      config.businessDate,
      nextLocked
        ? overrideReason
          ? `Locked ${config.businessDate} with Supervisor Override: ${overrideReason}`
          : `Locked business date ${config.businessDate} for final sign-off`
        : `Unlocked business date ${config.businessDate} for adjustments`,
      summary.grossRevenue,
      undefined,
      {
        recordId: config.businessDate,
        oldValues: `dayLocked=${dayLocked}`,
        newValues: `dayLocked=${nextLocked}${overrideReason ? ` (Override: ${overrideReason})` : ''}`,
      }
    );
    updateCurrentProperty((p) => ({
      ...p,
      dayLocked: nextLocked,
      auditTrail: [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)],
    }));
    if (cloudUid) {
      dispatchCloudWrite(
        'patch:dayLocked',
        'syncWorkspacePatch',
        { dayLocked: nextLocked },
        () => syncWorkspacePatch(cloudUid, { dayLocked: nextLocked })
      );
      dispatchCloudWrite(
        `trail:${trailEntry.id}`,
        'upsertCloudOperationalRecord',
        {
          recordType: 'auditTrail',
          id: trailEntry.id,
          title: `${trailEntry.action}: ${trailEntry.targetRef}`,
          data: { ...trailEntry },
          isNew: true,
        },
        () =>
          upsertCloudOperationalRecord(
            cloudUid,
            'auditTrail',
            trailEntry.id,
            `${trailEntry.action}: ${trailEntry.targetRef}`,
            { ...trailEntry },
            true
          )
      );
    }
  };

  const handleToggleDayLock = (overrideReason?: string) => {
    if (!dayLocked && !permissions.canLockDay) {
      notifyRbacDenied('إغلاق وقفل اليوم المالي', 'Lock Business Day');
      return;
    }
    if (dayLocked && !permissions.canUnlockDay) {
      notifyRbacDenied('إعادة فتح يوم مغلق', 'Unlock Closed Day');
      return;
    }
    if (dayLocked && security.requirePinForDayUnlock) {
      setPinAttempt('');
      setPinError('');
      setPinModalOpen(true);
      return;
    }
    executeDayLockToggle(overrideReason);
  };

  const handleConfirmPinUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinAttempt !== security.supervisorPin) {
      setPinError(
        lang === 'ar'
          ? 'رمز المشرف (PIN) غير صحيح.'
          : lang === 'fr'
          ? 'Code PIN Superviseur incorrect.'
          : 'Incorrect Supervisor PIN.'
      );
      return;
    }
    setPinModalOpen(false);
    setPinAttempt('');
    setPinError('');
    executeDayLockToggle();
  };

  const handleUpdateSecurity = (nextSecurity: SecuritySettings, detailSummary: string) => {
    setSecurity(nextSecurity);
    updateCurrentProperty((p) => ({
      ...p,
      auditTrail: [
        makeTrailEntry('security_change', nextSecurity.username, detailSummary),
        ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL),
      ],
    }));
  };

  const handleResetSecurity = () => {
    setSecurity(DEFAULT_SECURITY);
    updateCurrentProperty((p) => ({
      ...p,
      auditTrail: [
        makeTrailEntry(
          'security_change',
          DEFAULT_SECURITY.username,
          'Restored default login & security policy'
        ),
        ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL),
      ],
    }));
  };

  const handleArchiveDay = (record: DailyArchiveRecord) => {
    const trailEntry = makeTrailEntry(
      'archive',
      record.businessDate,
      `Archived & locked ${record.businessDate} (Occ ${record.occupancyPct}%, ADR ${record.adr})`,
      record.grossRevenue
    );
    updateCurrentProperty((p) => {
      const existing = (p.dailyArchive ?? DEFAULT_DAILY_ARCHIVE).filter(
        (r) => r.businessDate !== record.businessDate
      );
      return {
        ...p,
        dayLocked: true,
        dailyArchive: [record, ...existing],
        auditTrail: [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)],
      };
    });
    if (cloudUid) {
      void syncWorkspacePatch(cloudUid, { dayLocked: true });
      void upsertCloudOperationalRecord(
        cloudUid,
        'dailyArchive',
        record.id,
        `Archive ${record.businessDate}`,
        { ...record },
        true
      );
      void upsertCloudOperationalRecord(
        cloudUid,
        'auditTrail',
        trailEntry.id,
        `${trailEntry.action}: ${trailEntry.targetRef}`,
        { ...trailEntry },
        true
      );
    }
  };

  const handleSaveExceptionResolution = (res: AuditExceptionResolution) => {
    const existing = exceptionResolutions[res.exceptionId];
    const trailEntry = makeTrailEntry(
      'approve',
      res.exceptionId,
      `Exception ${res.status}: ${res.resolutionNote || res.exceptionId}`,
      undefined,
      res.reviewer,
      {
        recordId: res.exceptionId,
        oldValues: existing?.status ?? 'Open',
        newValues: `${res.status}${res.resolutionNote ? ` (${res.resolutionNote})` : ''}`,
      }
    );
    updateCurrentProperty((p) => ({
      ...p,
      exceptionResolutions: {
        ...(p.exceptionResolutions ?? {}),
        [res.exceptionId]: res,
      },
      auditTrail: [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)],
    }));
    if (cloudUid) {
      dispatchCloudWrite(
        `exc-res:${res.exceptionId}`,
        'upsertCloudOperationalRecord',
        {
          recordType: 'exceptionResolution',
          id: res.exceptionId,
          title: `Exception ${res.exceptionId} (${res.status})`,
          data: { ...res },
          isNew: !existing,
        },
        () =>
          upsertCloudOperationalRecord(
            cloudUid,
            'exceptionResolution',
            res.exceptionId,
            `Exception ${res.exceptionId} (${res.status})`,
            { ...res },
            !existing
          )
      );
      dispatchCloudWrite(
        `trail:${trailEntry.id}`,
        'upsertCloudOperationalRecord',
        {
          recordType: 'auditTrail',
          id: trailEntry.id,
          title: `${trailEntry.action}: ${trailEntry.targetRef}`,
          data: { ...trailEntry },
          isNew: true,
        },
        () =>
          upsertCloudOperationalRecord(
            cloudUid,
            'auditTrail',
            trailEntry.id,
            `${trailEntry.action}: ${trailEntry.targetRef}`,
            { ...trailEntry },
            true
          )
      );
    }
  };

  const handleToggleNightAuditCheck = (checkId: string) => {
    const prevChecked = Boolean(nightAuditChecks[checkId]);
    const nextChecked = !prevChecked;
    updateCurrentProperty((p) => ({
      ...p,
      nightAuditChecks: {
        ...(p.nightAuditChecks ?? {}),
        [checkId]: nextChecked,
      },
    }));
    if (cloudUid) {
      dispatchCloudWrite(
        `na-check:${checkId}`,
        'upsertCloudOperationalRecord',
        {
          recordType: 'nightAuditCheck',
          id: checkId,
          title: `Night Audit ${checkId}`,
          data: { checkId, completed: nextChecked },
          isNew: nightAuditChecks[checkId] === undefined,
        },
        () =>
          upsertCloudOperationalRecord(
            cloudUid,
            'nightAuditCheck',
            checkId,
            `Night Audit ${checkId}`,
            { checkId, completed: nextChecked },
            nightAuditChecks[checkId] === undefined
          )
      );
    }
  };

  const handleBatchPostMissingRoomCharges = (items: RoomFolioItem[]) => {
    if (items.length === 0) return;
    if (!permissions.canPostRoomCashier) {
      notifyRbacDenied('الترحيل الجماعي لأجر الغرف', 'Batch Post Daily Room Charges');
      return;
    }
    if (dayLocked) {
      notifyRbacDenied('اليوم مقفل — افتح اليوم أولاً', 'Business Date is locked');
      return;
    }

    const ratesMap = getExchangeRates(config);
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const totalBasePosted = roundMoney(
      items.reduce((acc, fi) => acc + Math.max(0, fi.amount), 0),
      config.roundingDecimals ?? 2
    );

    const newLedgerEntries: LedgerEntry[] = items.map((item) => {
      const amountAbs = roundMoney(Math.abs(item.amount), config.roundingDecimals ?? 2);
      const fxApplied =
        item.foreignCurrency && ratesMap[item.foreignCurrency]
          ? ratesMap[item.foreignCurrency]
          : undefined;
      const taxes = calculateTaxes(amountAbs, 'Room', config);
      const matchedRes = roomReservations.find(
        (r) => r.id === item.reservationId || (r.roomId === item.roomId && r.state !== 'Cancelled')
      );
      const paxCount = matchedRes ? Math.max(1, matchedRes.adults + matchedRes.children) : 1;
      const mealPlan = matchedRes?.boardType ?? 'RO';
      const packageSplitAmount = computePackageSplit(
        mealPlan,
        paxCount,
        taxes.netAmount,
        config
      );
      return {
        id: `led-folio-${item.id}`,
        timestamp: hhmm,
        source: isOutageMode ? 'OutageBackup' : 'PMS',
        category: 'Room',
        outletOrDept: item.department,
        referenceNo:
          hotelRooms.find((r) => r.id === item.roomId)?.roomNumber || item.reservationId,
        guestOrDescription: item.details || 'Night Audit Auto-Post Room Night',
        netAmount: taxes.netAmount,
        serviceCharge: taxes.serviceCharge,
        vatAmount: taxes.vatAmount,
        cityTaxAmount: taxes.cityTaxAmount,
        grossAmount: taxes.grossAmount,
        taxInclusive: Boolean(config.taxInclusive),
        originalCurrency: item.foreignCurrency,
        originalNetAmount: item.foreignAmount,
        fxRateApplied: fxApplied,
        mealPlan,
        paxCount,
        packageSplitAmount,
        paymentMethod: item.windowNo === 2 ? 'CityLedger' : 'RoomCharge',
        cashierName: authUser || settlement.generalCashierName || 'Night Auditor',
        approvedBy: settlement.generalCashierName || 'Income Auditor',
        reconciled: true,
      };
    });

    const trailEntry = makeTrailEntry(
      'create',
      `Batch Night Post (${items.length} rooms)`,
      `Auto-posted ${items.length} missing daily_room charges for ${config.businessDate}`,
      totalBasePosted,
      undefined,
      {
        recordId: `batch-${config.businessDate}`,
        newValues: `${items.length} folio lines · ${totalBasePosted} ${config.currency}`,
      }
    );

    updateCurrentProperty((p) => ({
      ...p,
      roomFolioItems: [...items, ...(p.roomFolioItems ?? DEFAULT_ROOM_FOLIO_ITEMS)],
      entries: [...newLedgerEntries, ...p.entries],
      auditTrail: [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)],
    }));

    if (cloudUid) {
      for (const item of items) {
        dispatchCloudWrite(
          `folio:${item.id}`,
          'upsertCloudOperationalRecord',
          {
            recordType: 'roomFolioItem',
            id: item.id,
            title: `Folio W${item.windowNo}: ${item.department}`,
            data: { ...item },
            isNew: true,
          },
          () =>
            upsertCloudOperationalRecord(
              cloudUid,
              'roomFolioItem',
              item.id,
              `Folio W${item.windowNo}: ${item.department}`,
              { ...item },
              true
            )
        );
      }
      dispatchCloudWrite(
        `ledger-batch:${Date.now()}`,
        'createCloudLedgerEntriesBulk',
        { entries: newLedgerEntries },
        () => createCloudLedgerEntriesBulk(cloudUid, newLedgerEntries)
      );
      dispatchCloudWrite(
        `trail:${trailEntry.id}`,
        'upsertCloudOperationalRecord',
        {
          recordType: 'auditTrail',
          id: trailEntry.id,
          title: `${trailEntry.action}: ${trailEntry.targetRef}`,
          data: { ...trailEntry },
          isNew: true,
        },
        () =>
          upsertCloudOperationalRecord(
            cloudUid,
            'auditTrail',
            trailEntry.id,
            `${trailEntry.action}: ${trailEntry.targetRef}`,
            { ...trailEntry },
            true
          )
      );
    }
  };

  const handleQuickExportCsv = () => {
    const csv = entriesToCsv(entries);
    downloadTextFile(`AuditLedger_${config.businessDate}.csv`, csv, true);
  };

  const handleExportJsonBackup = () => {
    downloadTextFile(
      `HotelIncomeAuditor_Backup_${config.businessDate}.json`,
      JSON.stringify(currentProperty, null, 2),
      false
    );
  };

  const handleImportJsonBackup = (jsonText: string): boolean => {
    try {
      const parsed = JSON.parse(jsonText) as Partial<PropertyState>;
      if (!parsed.config || !Array.isArray(parsed.entries)) return false;
      updateCurrentProperty((p) => ({
        config: { ...p.config, ...parsed.config, propertyId: p.config.propertyId },
        entries: parsed.entries ?? p.entries,
        settlement: parsed.settlement ?? p.settlement,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : p.tasks,
        discrepancies: Array.isArray(parsed.discrepancies)
          ? parsed.discrepancies
          : p.discrepancies,
        isOutageMode:
          typeof parsed.isOutageMode === 'boolean' ? parsed.isOutageMode : p.isOutageMode,
        dayLocked: typeof parsed.dayLocked === 'boolean' ? parsed.dayLocked : p.dayLocked,
        occupancyInputs: parsed.occupancyInputs ?? p.occupancyInputs,
        dailyArchive: Array.isArray(parsed.dailyArchive) ? parsed.dailyArchive : p.dailyArchive,
        cashDenominations: parsed.cashDenominations ?? p.cashDenominations,
        edcTerminals: Array.isArray(parsed.edcTerminals) ? parsed.edcTerminals : p.edcTerminals,
        cashierShifts: Array.isArray(parsed.cashierShifts) ? parsed.cashierShifts : p.cashierShifts,
        otaBookings: Array.isArray(parsed.otaBookings) ? parsed.otaBookings : p.otaBookings,
        cityLedgerItems: Array.isArray(parsed.cityLedgerItems)
          ? parsed.cityLedgerItems
          : p.cityLedgerItems,
        banquetEvents: Array.isArray(parsed.banquetEvents) ? parsed.banquetEvents : p.banquetEvents,
        auditTrail: Array.isArray(parsed.auditTrail) ? parsed.auditTrail : p.auditTrail,
        hotelRooms: Array.isArray(parsed.hotelRooms) ? parsed.hotelRooms : p.hotelRooms,
        roomReservations: Array.isArray(parsed.roomReservations)
          ? parsed.roomReservations
          : p.roomReservations,
        roomFolioItems: Array.isArray(parsed.roomFolioItems)
          ? parsed.roomFolioItems
          : p.roomFolioItems,
        posCatalog: Array.isArray(parsed.posCatalog) ? parsed.posCatalog : p.posCatalog,
        exceptionResolutions:
          parsed.exceptionResolutions && typeof parsed.exceptionResolutions === 'object'
            ? parsed.exceptionResolutions
            : p.exceptionResolutions,
        nightAuditChecks:
          parsed.nightAuditChecks && typeof parsed.nightAuditChecks === 'object'
            ? parsed.nightAuditChecks
            : p.nightAuditChecks,
      }));
      return true;
    } catch {
      return false;
    }
  };

  const operationsNav: { id: ActiveTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'incomeAudit', label: t.nav.incomeAudit, icon: ShieldCheck },
    { id: 'ledger', label: t.nav.ledger, icon: ClipboardList },
    { id: 'rooms', label: t.nav.rooms, icon: BedDouble },
    { id: 'compare', label: t.nav.compare, icon: GitCompareArrows },
    { id: 'reports', label: t.nav.reports, icon: FileText },
    { id: 'recovery', label: t.nav.recovery, icon: FileSpreadsheet },
  ];

  const specializedNav: { id: ActiveTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'auditSuite', label: t.nav.auditSuite, icon: Archive },
    { id: 'receivables', label: t.nav.receivables, icon: Briefcase },
  ];

  const systemNav: { id: ActiveTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'settings', label: t.nav.settings, icon: SlidersHorizontal },
    { id: 'guide', label: t.nav.guide, icon: BookOpen },
  ];

  if (!authUser) {
    return (
      <LoginPage
        lang={lang}
        hotelName={config.hotelName}
        security={security}
        onChangeLang={setLang}
        onLoginSuccess={handleLoginSuccess}
        onResetDefaultSecurity={handleResetSecurity}
      />
    );
  }

  return (
    <div dir={t.dir} className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col">
      {/* Kwentra Cloud PMS Style Full-Width Top Navigation Bar */}
      <header className="h-14 bg-white border-b border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileMenuOpen(true);
              } else {
                setSidebarOpen((v) => !v);
              }
            }}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label={t.actions.openMenu}
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 bg-[#008C99] text-white px-3.5 py-1.5 rounded-sm shrink-0 hover:bg-[#007782] transition-colors"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap">
              {t.brandName}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-700 shrink-0">
          <SyncStatusBadge
            lang={lang}
            syncStatus={syncStatus}
            pendingCount={pendingMutations.length}
            lastError={syncErrorMsg || cloudError}
            hasCloudAuth={Boolean(cloudUid)}
            onRetrySync={() => void flushPendingSyncQueue()}
          />

          <PWAInstallButton lang={lang} />

          <div className="hidden md:flex items-center gap-1.5 font-mono tabular-nums text-slate-700" dir="ltr">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Audit Date {config.businessDate}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 font-mono text-slate-700" dir="ltr">
            <User className="w-4 h-4 text-slate-500" />
            <span>{authUser}</span>
            <span className="px-1.5 py-0.5 text-[10px] font-sans font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200">
              {security.activeRole ?? 'Administrator'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('compare')}
            title={t.nav.compare}
            className="hidden sm:inline-flex p-1.5 text-slate-600 hover:text-[#0088CC] hover:bg-slate-100 rounded-md transition-colors"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <div className="hidden sm:inline-flex items-center gap-0.5 border border-slate-200 rounded-md p-0.5 bg-slate-50">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => setLang(opt.code)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                  lang === opt.code
                    ? 'bg-[#0088CC] text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className="hidden xl:inline text-sm font-serif font-medium text-slate-800 truncate max-w-[180px]">
            {config.hotelName}
          </span>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            title={t.nav.settings}
            className="p-1.5 text-slate-700 hover:text-[#0088CC] hover:bg-slate-100 rounded-md transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title={lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Desktop White Kwentra-Style Navigation Sidebar */}
        {sidebarOpen && (
          <aside className="hidden lg:flex lg:w-64 lg:flex-col shrink-0 bg-white border-e border-slate-200 no-print">
            <div className="px-5 pt-5 pb-3 border-b border-slate-100">
              <p className="text-base font-bold text-[#0088CC]">
                {lang === 'ar'
                  ? 'مراجعة الإيرادات'
                  : lang === 'fr'
                  ? 'Audit Revenus'
                  : 'Income Audit'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{config.hotelName}</p>
            </div>

            <nav className="flex-1 py-2 overflow-y-auto" aria-label={t.navGroups.operations}>
              {/* Operations Section */}
              <div>
                <button
                  type="button"
                  onClick={() => setOpsOpen((v) => !v)}
                  className="w-full px-5 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <span>{t.navGroups.operations}</span>
                  {opsOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>
                {opsOpen && (
                  <div className="space-y-0.5 pb-2">
                    {operationsNav.map((item) => {
                      const Icon = item.icon;
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center gap-3 px-6 py-2.5 text-[13px] transition-colors whitespace-nowrap text-start ${
                            active
                              ? 'text-[#0088CC] bg-sky-50/70 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              active ? 'text-[#0088CC]' : 'text-slate-500'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Specialized Suite Section */}
              <div className="border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSpecOpen((v) => !v)}
                  className="w-full px-5 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <span>{t.navGroups.specialized}</span>
                  {specOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>
                {specOpen && (
                  <div className="space-y-0.5 pb-2">
                    {specializedNav.map((item) => {
                      const Icon = item.icon;
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center gap-3 px-6 py-2.5 text-[13px] transition-colors whitespace-nowrap text-start ${
                            active
                              ? 'text-[#0088CC] bg-sky-50/70 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              active ? 'text-[#0088CC]' : 'text-slate-500'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Configuration & Help Section */}
              <div className="border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCfgOpen((v) => !v)}
                  className="w-full px-5 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <span>{t.navGroups.configuration}</span>
                  {cfgOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>
                {cfgOpen && (
                  <div className="space-y-0.5 pb-2">
                    {systemNav.map((item) => {
                      const Icon = item.icon;
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center gap-3 px-6 py-2.5 text-[13px] transition-colors whitespace-nowrap text-start ${
                            active
                              ? 'text-[#0088CC] bg-sky-50/70 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              active ? 'text-[#0088CC]' : 'text-slate-500'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>

            {/* System Contingency Mode Switch */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-2.5">
              <p className="text-xs font-semibold text-slate-700">{t.connection.title}</p>
              <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleSetOutageMode(false)}
                  className={`py-1.5 px-2 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                    !isOutageMode
                      ? 'bg-[#0088CC] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.connection.normal}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetOutageMode(true)}
                  className={`py-1.5 px-2 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                    isOutageMode
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.connection.outage}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {isOutageMode ? t.connection.outageDesc : t.connection.normalDesc}
              </p>
            </div>
          </aside>
        )}

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex no-print">
            <div
              className="fixed inset-0 bg-slate-950/40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              className={`relative w-64 max-w-full bg-white text-slate-900 h-full border-slate-200 flex flex-col z-50 ${
                isRtl ? 'border-l' : 'border-r'
              }`}
            >
              <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-[#0088CC] truncate">{t.brandName}</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 border-b border-slate-100 space-y-2">
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {config.hotelName}
                </div>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setLang(opt.code)}
                      className={`py-1 px-1.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                        lang === opt.code
                          ? 'bg-[#0088CC] text-white font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
                {[...operationsNav, ...specializedNav, ...systemNav].map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium rounded-lg text-start ${
                        active
                          ? 'bg-sky-50 text-[#0088CC] font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Sub-Toolbar for Quick CSV & Outage Posting */}
          <div className="bg-white/80 border-b border-slate-200 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 truncate">{t.breadcrumbs[activeTab]}</p>
              <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                {t.nav[activeTab]}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleQuickExportCsv}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                {t.actions.exportCsv}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0088CC] hover:bg-[#0070AA] rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                {t.actions.addOutageEntry}
              </button>
            </div>
          </div>

          {/* Contingency Banner inside workspace when Outage Mode is active */}
          {isOutageMode && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 no-print">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{t.connection.bannerText}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('recovery')}
                className="font-semibold text-amber-900 underline underline-offset-4 hover:text-amber-700 whitespace-nowrap"
              >
                {t.connection.bannerAction}
              </button>
            </div>
          )}

          {dayLocked && (
            <div className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-xs no-print">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {lang === 'ar'
                    ? `اليوم المالي (${config.businessDate}) مقفل للمراجعة النهائية.`
                    : lang === 'fr'
                    ? `Journée comptable (${config.businessDate}) clôturée.`
                    : `Business Date (${config.businessDate}) is locked for final sign-off.`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleDayLock()}
                className="font-semibold text-amber-300 underline underline-offset-4 hover:text-white whitespace-nowrap"
              >
                {lang === 'ar' ? 'فتح اليوم' : lang === 'fr' ? 'Déverrouiller' : 'Unlock Day'}
              </button>
            </div>
          )}

          {rbacNotice && (
            <div className="bg-red-50 border-b border-red-200 px-4 sm:px-8 py-2.5 flex items-center justify-between gap-2 text-xs text-red-900 no-print">
              <span className="font-semibold">{rbacNotice}</span>
              <button
                type="button"
                onClick={() => setRbacNotice(null)}
                className="text-red-700 hover:text-red-900 font-bold"
              >
                ×
              </button>
            </div>
          )}

        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <AuditDashboard
              lang={lang}
              t={t}
              config={config}
              entries={entries}
              summary={summary}
              settlement={settlement}
              onUpdateSettlement={handleUpdateSettlement}
              tasks={tasks}
              onUpdateTask={handleUpdateTask}
              discrepancies={discrepancies}
              onToggleDiscrepancyResolved={handleToggleDiscrepancyResolved}
              onAddDiscrepancy={handleAddDiscrepancy}
              onNavigateToTab={setActiveTab}
              occupancyInputs={occupancyInputs}
              dayLocked={dayLocked}
              hotelRooms={hotelRooms}
              roomReservations={roomReservations}
              roomFolioItems={roomFolioItems}
              exceptionResolutions={exceptionResolutions}
              dailyArchive={dailyArchive}
            />
          )}

          {activeTab === 'incomeAudit' && (
            <DailyIncomeAudit
              lang={lang}
              config={config}
              rooms={hotelRooms}
              reservations={roomReservations}
              folioItems={roomFolioItems}
              entries={entries}
              summary={summary}
              settlement={settlement}
              tasks={tasks}
              discrepancies={discrepancies}
              edcTerminals={edcTerminals}
              cashierShifts={cashierShifts}
              otaBookings={otaBookings}
              cityLedgerItems={cityLedgerItems}
              banquetEvents={banquetEvents}
              dailyArchive={dailyArchive}
              auditTrail={auditTrail}
              kwentraSnapshot={kwentraSnapshot}
              exceptionResolutions={exceptionResolutions}
              nightAuditChecks={nightAuditChecks}
              dayLocked={dayLocked}
              currentAuditor={authUser || settlement.generalCashierName || 'Income Auditor'}
              onSaveExceptionResolution={handleSaveExceptionResolution}
              onToggleNightAuditCheck={handleToggleNightAuditCheck}
              onToggleDayLock={() => handleToggleDayLock()}
              onOpenRoomProfile={(roomId) => {
                setRequestedRoomId(roomId);
                setActiveTab('rooms');
              }}
              onBatchPostMissingRoomCharges={handleBatchPostMissingRoomCharges}
            />
          )}

          {activeTab === 'ledger' && (
            <OutageLedger
              t={t}
              config={config}
              entries={entries}
              summary={summary}
              dayLocked={dayLocked}
              hotelRooms={hotelRooms}
              currentCashierName={authUser || settlement.generalCashierName}
              onAddEntry={handleAddEntry}
              onToggleReconciled={handleToggleReconciled}
              onApproveEntry={handleApproveEntry}
              onDeleteEntry={handleDeleteEntry}
            />
          )}

          {activeTab === 'rooms' && (
            <RoomRackManager
              lang={lang}
              config={config}
              rooms={hotelRooms}
              reservations={roomReservations}
              folioItems={roomFolioItems}
              posCatalog={posCatalog}
              focusRoomId={requestedRoomId}
              onClearFocusRoom={() => setRequestedRoomId(null)}
              onSaveReservation={(res, updatedRoom) => {
                const exists = roomReservations.some((r) => r.id === res.id);
                const trailEntry = makeTrailEntry(
                  'create',
                  `Res #${res.id}`,
                  `${res.state}: ${res.primaryGuest} (${res.roomType})`,
                  res.rateAmount
                );
                updateCurrentProperty((p) => {
                  const currentRes = p.roomReservations ?? DEFAULT_ROOM_RESERVATIONS;
                  const nextRes = exists
                    ? currentRes.map((r) => (r.id === res.id ? res : r))
                    : [res, ...currentRes];
                  const nextRooms = updatedRoom
                    ? (p.hotelRooms ?? DEFAULT_HOTEL_ROOMS).map((rm) =>
                        rm.id === updatedRoom.id ? updatedRoom : rm
                      )
                    : p.hotelRooms;
                  return {
                    ...p,
                    roomReservations: nextRes,
                    hotelRooms: nextRooms,
                    auditTrail: [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)],
                  };
                });
                if (cloudUid) {
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'roomReservation',
                    res.id,
                    `Res #${res.id} (${res.primaryGuest})`,
                    { ...res },
                    !exists
                  );
                  if (updatedRoom) {
                    void upsertCloudRoom(cloudUid, updatedRoom, false);
                  }
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'auditTrail',
                    trailEntry.id,
                    `${trailEntry.action}: ${trailEntry.targetRef}`,
                    { ...trailEntry },
                    true
                  );
                }
              }}
              onAddFolioItem={(item, alsoPostToLedger) => {
                if (!permissions.canPostRoomCashier) {
                  notifyRbacDenied('الترحيل على فواتير الغرف', 'Post Room Folio Transaction');
                  return;
                }
                const trailEntry = makeTrailEntry(
                  'create',
                  `Folio ${item.id.slice(-6)}`,
                  `W${item.windowNo} · ${item.department} (${item.details || ''})`,
                  item.amount,
                  undefined,
                  {
                    recordId: item.id,
                    newValues: `${item.amount} ${config.currency}`,
                  }
                );
                let createdLedger: LedgerEntry | null = null;
                if (alsoPostToLedger) {
                  const isPos = item.details?.startsWith('POS-');
                  const isPaidOut = item.kind === 'payout';
                  const isDeposit = item.kind === 'deposit';
                  const cat: LedgerEntry['category'] = isDeposit
                    ? 'Deposit'
                    : isPaidOut
                    ? 'PaidOut'
                    : item.kind === 'daily_room'
                    ? 'Room'
                    : item.department.includes('140')
                    ? 'OtherRevenue'
                    : 'FoodBeverage';

                  const amountAbs = roundMoney(Math.abs(item.amount));
                  const ratesMap = getExchangeRates(config);
                  const fxApplied =
                    item.foreignCurrency && ratesMap[item.foreignCurrency]
                      ? ratesMap[item.foreignCurrency]
                      : undefined;

                  let calcInput = amountAbs;
                  if (!config.taxInclusive && cat !== 'PaidOut' && cat !== 'Deposit') {
                    const taxFactor =
                      (1 + (cat === 'OtherRevenue' ? 0 : config.serviceChargePct / 100)) *
                      (1 + (config.vatPct + config.cityTaxPct) / 100);
                    calcInput = roundMoney(amountAbs / taxFactor);
                  }
                  const taxes = calculateTaxes(calcInput, cat, config);
                  const now = new Date();
                  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
                    now.getMinutes()
                  ).padStart(2, '0')}`;
                  createdLedger = {
                    id: `led-folio-${item.id}`,
                    timestamp: hhmm,
                    source: isPos ? 'POS' : 'OutageBackup',
                    category: cat,
                    outletOrDept: item.department,
                    referenceNo: item.details?.split('·')[0]?.trim() || `FOL-${item.reservationId}`,
                    guestOrDescription: item.details || item.department,
                    netAmount: taxes.netAmount,
                    serviceCharge: taxes.serviceCharge,
                    vatAmount: taxes.vatAmount,
                    cityTaxAmount: taxes.cityTaxAmount,
                    grossAmount: amountAbs,
                    taxInclusive: Boolean(config.taxInclusive),
                    originalCurrency: item.foreignCurrency,
                    originalNetAmount: item.foreignAmount,
                    fxRateApplied: fxApplied,
                    paymentMethod:
                      isDeposit
                        ? 'Cash'
                        : item.windowNo === 2
                        ? 'CityLedger'
                        : 'RoomCharge',
                    cashierName: authUser || settlement.generalCashierName || 'Front Office',
                    approvedBy: settlement.generalCashierName || 'Income Auditor',
                    reconciled: item.verified,
                  };
                }
                updateCurrentProperty((p) => ({
                  ...p,
                  roomFolioItems: [item, ...(p.roomFolioItems ?? DEFAULT_ROOM_FOLIO_ITEMS)],
                  entries: createdLedger ? [createdLedger, ...p.entries] : p.entries,
                  auditTrail: [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)],
                }));
                if (cloudUid) {
                  dispatchCloudWrite(
                    `folio:${item.id}`,
                    'upsertCloudOperationalRecord',
                    {
                      recordType: 'roomFolioItem',
                      id: item.id,
                      title: `Folio W${item.windowNo}: ${item.department}`,
                      data: { ...item },
                      isNew: true,
                    },
                    () =>
                      upsertCloudOperationalRecord(
                        cloudUid,
                        'roomFolioItem',
                        item.id,
                        `Folio W${item.windowNo}: ${item.department}`,
                        { ...item },
                        true
                      )
                  );
                  if (createdLedger) {
                    const led = createdLedger;
                    dispatchCloudWrite(
                      `ledger:${led.id}`,
                      'createCloudLedgerEntry',
                      { entry: led },
                      () => createCloudLedgerEntry(cloudUid, led)
                    );
                  }
                  dispatchCloudWrite(
                    `trail:${trailEntry.id}`,
                    'upsertCloudOperationalRecord',
                    {
                      recordType: 'auditTrail',
                      id: trailEntry.id,
                      title: `${trailEntry.action}: ${trailEntry.targetRef}`,
                      data: { ...trailEntry },
                      isNew: true,
                    },
                    () =>
                      upsertCloudOperationalRecord(
                        cloudUid,
                        'auditTrail',
                        trailEntry.id,
                        `${trailEntry.action}: ${trailEntry.targetRef}`,
                        { ...trailEntry },
                        true
                      )
                  );
                }
              }}
              onToggleFolioVerified={(itemId) => {
                const existing = roomFolioItems.find((fi) => fi.id === itemId);
                const updated = existing ? { ...existing, verified: !existing.verified } : null;
                updateCurrentProperty((p) => ({
                  ...p,
                  roomFolioItems: (p.roomFolioItems ?? DEFAULT_ROOM_FOLIO_ITEMS).map((fi) =>
                    fi.id === itemId ? { ...fi, verified: !fi.verified } : fi
                  ),
                }));
                if (cloudUid && updated) {
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'roomFolioItem',
                    updated.id,
                    `Folio W${updated.windowNo}: ${updated.department}`,
                    { ...updated },
                    false
                  );
                }
              }}
              onArchiveFolioItem={(itemId) => {
                updateCurrentProperty((p) => ({
                  ...p,
                  roomFolioItems: (p.roomFolioItems ?? DEFAULT_ROOM_FOLIO_ITEMS).filter(
                    (fi) => fi.id !== itemId
                  ),
                }));
                if (cloudUid) {
                  void setCloudOperationalRecordArchived(cloudUid, 'roomFolioItem', itemId, true);
                }
              }}
              onAddPosCatalogItem={(item) => {
                const trailEntry = makeTrailEntry(
                  'create',
                  item.sku || item.id,
                  `Added POS Catalog Item: ${item.nameAr} (${item.price} ${item.currency})`,
                  item.price
                );
                updateCurrentProperty((p) => ({
                  ...p,
                  posCatalog: [item, ...(p.posCatalog ?? DEFAULT_POS_CATALOG)],
                  auditTrail: [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)],
                }));
                if (cloudUid) {
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'posCatalogItem',
                    item.id,
                    `${item.nameEn} (${item.nameAr})`,
                    { ...item },
                    true
                  );
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'auditTrail',
                    trailEntry.id,
                    `${trailEntry.action}: ${trailEntry.targetRef}`,
                    { ...trailEntry },
                    true
                  );
                }
              }}
              onArchivePosCatalogItem={(itemId) => {
                updateCurrentProperty((p) => ({
                  ...p,
                  posCatalog: (p.posCatalog ?? DEFAULT_POS_CATALOG).filter(
                    (ci) => ci.id !== itemId
                  ),
                }));
                if (cloudUid) {
                  void setCloudOperationalRecordArchived(cloudUid, 'posCatalogItem', itemId, true);
                }
              }}
              onAddRoom={(room) => {
                const trailEntry = makeTrailEntry(
                  'create',
                  `Room ${room.roomNumber}`,
                  `Added room ${room.roomNumber} (${room.roomType})`,
                  room.baseRate
                );
                updateCurrentProperty((p) => ({
                  ...p,
                  hotelRooms: [room, ...(p.hotelRooms ?? DEFAULT_HOTEL_ROOMS)],
                  auditTrail: [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)],
                }));
                if (cloudUid) {
                  void upsertCloudRoom(cloudUid, room, true);
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'auditTrail',
                    trailEntry.id,
                    `${trailEntry.action}: ${trailEntry.targetRef}`,
                    { ...trailEntry },
                    true
                  );
                }
              }}
              onAddRoomsBulk={(newRooms) => {
                const trailEntry = makeTrailEntry(
                  'create',
                  `${newRooms.length} Rooms`,
                  `Added ${newRooms.length} hotel rooms to inventory`
                );
                updateCurrentProperty((p) => ({
                  ...p,
                  hotelRooms: [...newRooms, ...(p.hotelRooms ?? DEFAULT_HOTEL_ROOMS)],
                  auditTrail: [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)],
                }));
                if (cloudUid) {
                  void upsertCloudRoomsBulk(cloudUid, newRooms);
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'auditTrail',
                    trailEntry.id,
                    `${trailEntry.action}: ${trailEntry.targetRef}`,
                    { ...trailEntry },
                    true
                  );
                }
              }}
              onUpdateRoom={(updatedRoom) => {
                updateCurrentProperty((p) => ({
                  ...p,
                  hotelRooms: (p.hotelRooms ?? DEFAULT_HOTEL_ROOMS).map((r) =>
                    r.id === updatedRoom.id ? updatedRoom : r
                  ),
                }));
                if (cloudUid) {
                  void upsertCloudRoom(cloudUid, updatedRoom, false);
                }
              }}
              onDeleteRoom={(id) => {
                const targetRoom = hotelRooms.find((r) => r.id === id);
                updateCurrentProperty((p) => ({
                  ...p,
                  hotelRooms: (p.hotelRooms ?? DEFAULT_HOTEL_ROOMS).filter((r) => r.id !== id),
                  archivedRooms: targetRoom
                    ? [
                        targetRoom,
                        ...(p.archivedRooms ?? []).filter((ar) => ar.id !== targetRoom.id),
                      ]
                    : p.archivedRooms,
                }));
                if (cloudUid) {
                  void setCloudRoomArchived(cloudUid, id, true);
                }
              }}
              onSyncToOccupancy={(syncedRooms) => {
                const roomsSold = syncedRooms.filter((r) => r.status === 'Occupied').length;
                const complimentaryRooms = syncedRooms.filter(
                  (r) => r.status === 'Complimentary'
                ).length;
                const houseUseRooms = syncedRooms.filter((r) => r.status === 'HouseUse').length;
                const outOfOrderRooms = syncedRooms.filter((r) => r.status === 'OutOfOrder').length;
                const nextConfig: HotelConfig = {
                  ...config,
                  totalAvailableRooms: syncedRooms.length,
                };
                const nextOccupancy: OccupancyInputs = {
                  roomsSold,
                  complimentaryRooms,
                  houseUseRooms,
                  outOfOrderRooms,
                };
                const trailEntry = makeTrailEntry(
                  'rate_change',
                  `${syncedRooms.length} Rooms`,
                  `Synced room rack stats (${roomsSold} Occupied / ${syncedRooms.length} Total)`
                );
                updateCurrentProperty((p) => ({
                  ...p,
                  config: nextConfig,
                  occupancyInputs: nextOccupancy,
                  auditTrail: [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)],
                }));
                if (cloudUid) {
                  void syncWorkspacePatch(cloudUid, {
                    config: nextConfig,
                    occupancyInputs: nextOccupancy,
                  });
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'auditTrail',
                    trailEntry.id,
                    `${trailEntry.action}: ${trailEntry.targetRef}`,
                    { ...trailEntry },
                    true
                  );
                }
              }}
            />
          )}

          {activeTab === 'compare' && (
            <KwentraCompare
              t={t}
              config={config}
              summary={summary}
              snapshot={kwentraSnapshot}
              currentAuditorName={authUser || settlement.generalCashierName}
              onUpdateSnapshot={handleUpdateKwentraSnapshot}
            />
          )}

          {activeTab === 'auditSuite' && (
            <AuditSuite
              lang={lang}
              config={config}
              summary={summary}
              settlement={settlement}
              kwentraSnapshot={kwentraSnapshot}
              dayLocked={dayLocked}
              canOverrideDayClose={permissions.canOverrideDayClose}
              supervisorPin={security.supervisorPin}
              occupancyInputs={occupancyInputs}
              dailyArchive={dailyArchive}
              cashDenominations={cashDenominations}
              edcTerminals={edcTerminals}
              cashierShifts={cashierShifts}
              auditTrail={auditTrail}
              onToggleDayLock={handleToggleDayLock}
              onUpdateOccupancy={(next) => {
                updateCurrentProperty((p) => ({ ...p, occupancyInputs: next }));
                if (cloudUid) {
                  void syncWorkspacePatch(cloudUid, { occupancyInputs: next });
                }
              }}
              onArchiveDay={handleArchiveDay}
              onDeleteArchive={(id) => {
                updateCurrentProperty((p) => ({
                  ...p,
                  dailyArchive: (p.dailyArchive ?? DEFAULT_DAILY_ARCHIVE).filter(
                    (r) => r.id !== id
                  ),
                }));
                if (cloudUid) {
                  void setCloudOperationalRecordArchived(cloudUid, 'dailyArchive', id, true);
                }
              }}
              onUpdateDenominations={(next) => {
                updateCurrentProperty((p) => ({ ...p, cashDenominations: next }));
                if (cloudUid) {
                  void syncWorkspacePatch(cloudUid, { cashDenominations: next });
                }
              }}
              onApplyCashToSettlement={(amount) => {
                const nextSettlement: CashSettlement = {
                  ...settlement,
                  actualCashDrop: Number(amount.toFixed(2)),
                };
                const trailEntry = makeTrailEntry(
                  'settlement',
                  'Cash Drop',
                  `Applied Cash Denomination Count to General Cashier Drop`,
                  amount
                );
                updateCurrentProperty((p) => ({
                  ...p,
                  settlement: nextSettlement,
                  auditTrail: [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)],
                }));
                if (cloudUid) {
                  void syncWorkspacePatch(cloudUid, { settlement: nextSettlement });
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'auditTrail',
                    trailEntry.id,
                    `${trailEntry.action}: ${trailEntry.targetRef}`,
                    { ...trailEntry },
                    true
                  );
                }
              }}
              onAddEdcTerminal={(item) => {
                updateCurrentProperty((p) => ({
                  ...p,
                  edcTerminals: [item, ...(p.edcTerminals ?? DEFAULT_EDC_TERMINALS)],
                }));
                if (cloudUid) {
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'edcTerminal',
                    item.id,
                    `${item.bankName} ${item.batchNo}`,
                    { ...item },
                    true
                  );
                }
              }}
              onToggleEdcMatched={(id) => {
                const existing = edcTerminals.find((e) => e.id === id);
                const updated = existing ? { ...existing, matched: !existing.matched } : null;
                updateCurrentProperty((p) => ({
                  ...p,
                  edcTerminals: (p.edcTerminals ?? DEFAULT_EDC_TERMINALS).map((e) =>
                    e.id === id ? { ...e, matched: !e.matched } : e
                  ),
                }));
                if (cloudUid && updated) {
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'edcTerminal',
                    updated.id,
                    `${updated.bankName} ${updated.batchNo}`,
                    { ...updated },
                    false
                  );
                }
              }}
              onDeleteEdcTerminal={(id) => {
                updateCurrentProperty((p) => ({
                  ...p,
                  edcTerminals: (p.edcTerminals ?? DEFAULT_EDC_TERMINALS).filter(
                    (e) => e.id !== id
                  ),
                }));
                if (cloudUid) {
                  void setCloudOperationalRecordArchived(cloudUid, 'edcTerminal', id, true);
                }
              }}
              onSyncEdcToSettlement={(totalGross) => {
                const nextSettlement: CashSettlement = {
                  ...settlement,
                  actualEdcBatch: Number(totalGross.toFixed(2)),
                };
                const trailEntry = makeTrailEntry(
                  'settlement',
                  'EDC Batch',
                  `Synchronized Bank EDC terminal totals to Settlement`,
                  totalGross
                );
                updateCurrentProperty((p) => ({
                  ...p,
                  settlement: nextSettlement,
                  auditTrail: [trailEntry, ...(p.auditTrail ?? DEFAULT_AUDIT_TRAIL)],
                }));
                if (cloudUid) {
                  void syncWorkspacePatch(cloudUid, { settlement: nextSettlement });
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'auditTrail',
                    trailEntry.id,
                    `${trailEntry.action}: ${trailEntry.targetRef}`,
                    { ...trailEntry },
                    true
                  );
                }
              }}
              onAddCashierShift={(item) => {
                updateCurrentProperty((p) => ({
                  ...p,
                  cashierShifts: [item, ...(p.cashierShifts ?? DEFAULT_CASHIER_SHIFTS)],
                }));
                if (cloudUid) {
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'cashierShift',
                    item.id,
                    `${item.cashierName} (${item.shift})`,
                    { ...item },
                    true
                  );
                }
              }}
              onDeleteCashierShift={(id) => {
                updateCurrentProperty((p) => ({
                  ...p,
                  cashierShifts: (p.cashierShifts ?? DEFAULT_CASHIER_SHIFTS).filter(
                    (s) => s.id !== id
                  ),
                }));
                if (cloudUid) {
                  void setCloudOperationalRecordArchived(cloudUid, 'cashierShift', id, true);
                }
              }}
            />
          )}

          {activeTab === 'receivables' && (
            <ReceivablesAndBeo
              lang={lang}
              config={config}
              otaBookings={otaBookings}
              cityLedgerItems={cityLedgerItems}
              banquetEvents={banquetEvents}
              onAddOta={(item) => {
                updateCurrentProperty((p) => ({
                  ...p,
                  otaBookings: [item, ...(p.otaBookings ?? DEFAULT_OTA_BOOKINGS)],
                }));
                if (cloudUid) {
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'otaBooking',
                    item.id,
                    `${item.channel} ${item.bookingRef}`,
                    { ...item },
                    true
                  );
                }
              }}
              onToggleOtaVerified={(id) => {
                const existing = otaBookings.find((o) => o.id === id);
                const updated = existing ? { ...existing, verified: !existing.verified } : null;
                updateCurrentProperty((p) => ({
                  ...p,
                  otaBookings: (p.otaBookings ?? DEFAULT_OTA_BOOKINGS).map((o) =>
                    o.id === id ? { ...o, verified: !o.verified } : o
                  ),
                }));
                if (cloudUid && updated) {
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'otaBooking',
                    updated.id,
                    `${updated.channel} ${updated.bookingRef}`,
                    { ...updated },
                    false
                  );
                }
              }}
              onDeleteOta={(id) => {
                updateCurrentProperty((p) => ({
                  ...p,
                  otaBookings: (p.otaBookings ?? DEFAULT_OTA_BOOKINGS).filter((o) => o.id !== id),
                }));
                if (cloudUid) {
                  void setCloudOperationalRecordArchived(cloudUid, 'otaBooking', id, true);
                }
              }}
              onAddCityLedger={(item) => {
                updateCurrentProperty((p) => ({
                  ...p,
                  cityLedgerItems: [item, ...(p.cityLedgerItems ?? DEFAULT_CITY_LEDGER)],
                }));
                if (cloudUid) {
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'cityLedger',
                    item.id,
                    `${item.companyName} ${item.invoiceNo}`,
                    { ...item },
                    true
                  );
                }
              }}
              onToggleCityLedgerSigned={(id) => {
                const existing = cityLedgerItems.find((cl) => cl.id === id);
                const updated = existing
                  ? { ...existing, signedFolioAttached: !existing.signedFolioAttached }
                  : null;
                updateCurrentProperty((p) => ({
                  ...p,
                  cityLedgerItems: (p.cityLedgerItems ?? DEFAULT_CITY_LEDGER).map((cl) =>
                    cl.id === id
                      ? { ...cl, signedFolioAttached: !cl.signedFolioAttached }
                      : cl
                  ),
                }));
                if (cloudUid && updated) {
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'cityLedger',
                    updated.id,
                    `${updated.companyName} ${updated.invoiceNo}`,
                    { ...updated },
                    false
                  );
                }
              }}
              onToggleCityLedgerCollected={(id) => {
                const existing = cityLedgerItems.find((cl) => cl.id === id);
                const updated = existing
                  ? { ...existing, collected: !existing.collected }
                  : null;
                updateCurrentProperty((p) => ({
                  ...p,
                  cityLedgerItems: (p.cityLedgerItems ?? DEFAULT_CITY_LEDGER).map((cl) =>
                    cl.id === id ? { ...cl, collected: !cl.collected } : cl
                  ),
                }));
                if (cloudUid && updated) {
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'cityLedger',
                    updated.id,
                    `${updated.companyName} ${updated.invoiceNo}`,
                    { ...updated },
                    false
                  );
                }
              }}
              onDeleteCityLedger={(id) => {
                updateCurrentProperty((p) => ({
                  ...p,
                  cityLedgerItems: (p.cityLedgerItems ?? DEFAULT_CITY_LEDGER).filter(
                    (cl) => cl.id !== id
                  ),
                }));
                if (cloudUid) {
                  void setCloudOperationalRecordArchived(cloudUid, 'cityLedger', id, true);
                }
              }}
              onAddBanquet={(item) => {
                updateCurrentProperty((p) => ({
                  ...p,
                  banquetEvents: [item, ...(p.banquetEvents ?? DEFAULT_BANQUET_EVENTS)],
                }));
                if (cloudUid) {
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'banquetEvent',
                    item.id,
                    `${item.beoNo} ${item.eventName}`,
                    { ...item },
                    true
                  );
                }
              }}
              onUpdateBanquetPos={(id, posPostedAmount) => {
                const existing = banquetEvents.find((b) => b.id === id);
                const updated = existing ? { ...existing, posPostedAmount } : null;
                updateCurrentProperty((p) => ({
                  ...p,
                  banquetEvents: (p.banquetEvents ?? DEFAULT_BANQUET_EVENTS).map((b) =>
                    b.id === id ? { ...b, posPostedAmount } : b
                  ),
                }));
                if (cloudUid && updated) {
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'banquetEvent',
                    updated.id,
                    `${updated.beoNo} ${updated.eventName}`,
                    { ...updated },
                    false
                  );
                }
              }}
              onCycleBanquetStatus={(id) => {
                const existing = banquetEvents.find((b) => b.id === id);
                const nextStatus = existing
                  ? existing.status === 'scheduled'
                    ? ('posted' as const)
                    : existing.status === 'posted'
                    ? ('settled' as const)
                    : ('scheduled' as const)
                  : null;
                const updated = existing && nextStatus ? { ...existing, status: nextStatus } : null;
                updateCurrentProperty((p) => ({
                  ...p,
                  banquetEvents: (p.banquetEvents ?? DEFAULT_BANQUET_EVENTS).map((b) =>
                    b.id === id && nextStatus ? { ...b, status: nextStatus } : b
                  ),
                }));
                if (cloudUid && updated) {
                  void upsertCloudOperationalRecord(
                    cloudUid,
                    'banquetEvent',
                    updated.id,
                    `${updated.beoNo} ${updated.eventName}`,
                    { ...updated },
                    false
                  );
                }
              }}
              onDeleteBanquet={(id) => {
                updateCurrentProperty((p) => ({
                  ...p,
                  banquetEvents: (p.banquetEvents ?? DEFAULT_BANQUET_EVENTS).filter(
                    (b) => b.id !== id
                  ),
                }));
                if (cloudUid) {
                  void setCloudOperationalRecordArchived(cloudUid, 'banquetEvent', id, true);
                }
              }}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsCenter
              lang={lang}
              t={t}
              config={config}
              entries={entries}
              summary={summary}
              settlement={settlement}
              tasks={tasks}
              discrepancies={discrepancies}
              kwentraSnapshot={kwentraSnapshot}
              occupancyInputs={occupancyInputs}
              dailyArchive={dailyArchive}
              edcTerminals={edcTerminals}
              cashierShifts={cashierShifts}
              otaBookings={otaBookings}
              cityLedgerItems={cityLedgerItems}
              banquetEvents={banquetEvents}
              auditTrail={auditTrail}
              rooms={hotelRooms}
              roomReservations={roomReservations}
              roomFolioItems={roomFolioItems}
              exceptionResolutions={exceptionResolutions}
            />
          )}

          {activeTab === 'settings' && (
            <AuditSettings
              lang={lang}
              t={t}
              config={config}
              security={security}
              auditTrail={auditTrail}
              cloudUserEmail={firebaseUser?.email ?? null}
              cloudSyncReady={cloudSyncReady}
              cloudError={cloudError}
              archivedRooms={
                cloudUid
                  ? cloudVaultMeta.archivedRooms
                  : (currentProperty.archivedRooms ?? []).map((room) => ({
                      docId: room.id,
                      room,
                    }))
              }
              archivedEntries={
                cloudUid
                  ? cloudVaultMeta.archivedEntries
                  : (currentProperty.archivedEntries ?? []).map((entry) => ({
                      docId: entry.id,
                      entry,
                    }))
              }
              archivedRecords={cloudUid ? cloudVaultMeta.archivedRecords : []}
              backupSnapshots={
                cloudUid
                  ? cloudVaultMeta.backupSnapshots
                  : currentProperty.localSnapshots ?? []
              }
              onConnectGoogleCloud={async () => {
                await signInWithGoogleCloud();
              }}
              onDisconnectGoogleCloud={async () => {
                await signOutGoogleCloud();
              }}
              onCreateSnapshotNow={async () => {
                const summaryText = `${hotelRooms.length} Rooms · ${entries.length} Entries · Net ${summary.netRevenueAfterRebates.toFixed(0)} ${config.currency}`;
                const localSnap = {
                  id: `snap-${Date.now()}`,
                  title: `Manual Vault Snapshot (${config.businessDate})`,
                  createdAtLabel: new Date().toISOString().slice(0, 16).replace('T', ' '),
                  summaryText,
                };
                updateCurrentProperty((p) => ({
                  ...p,
                  localSnapshots: [localSnap, ...(p.localSnapshots ?? [])],
                }));
                if (cloudUid) {
                  await createCloudBackupSnapshot(cloudUid, localSnap.title, summaryText);
                }
              }}
              onRestoreArchivedRoom={(docIdOrRoomId) => {
                if (cloudUid) {
                  void setCloudRoomArchived(cloudUid, docIdOrRoomId, false);
                  return;
                }
                const target = (currentProperty.archivedRooms ?? []).find(
                  (r) => r.id === docIdOrRoomId
                );
                if (!target) return;
                updateCurrentProperty((p) => ({
                  ...p,
                  hotelRooms: [target, ...(p.hotelRooms ?? DEFAULT_HOTEL_ROOMS)],
                  archivedRooms: (p.archivedRooms ?? []).filter((r) => r.id !== docIdOrRoomId),
                }));
              }}
              onRestoreArchivedEntry={(docIdOrEntryId) => {
                if (cloudUid) {
                  void updateCloudLedgerEntry(cloudUid, docIdOrEntryId, { isArchived: false });
                  return;
                }
                const target = (currentProperty.archivedEntries ?? []).find(
                  (e) => e.id === docIdOrEntryId
                );
                if (!target) return;
                updateCurrentProperty((p) => ({
                  ...p,
                  entries: [target, ...p.entries],
                  archivedEntries: (p.archivedEntries ?? []).filter(
                    (e) => e.id !== docIdOrEntryId
                  ),
                }));
              }}
              onRestoreArchivedRecord={(docId) => {
                if (cloudUid) {
                  void setCloudOperationalRecordArchived(cloudUid, 'task', docId, false, true);
                }
              }}
              onUpdateConfig={handleUpdateConfig}
              onUpdateSecurity={handleUpdateSecurity}
              onResetSecurity={handleResetSecurity}
              onLockNow={handleLogout}
              onExportJsonBackup={handleExportJsonBackup}
              onImportJsonBackup={handleImportJsonBackup}
            />
          )}

          {activeTab === 'recovery' && (
            <RecoveryExport
              t={t}
              config={config}
              entries={entries}
              summary={summary}
              settlement={settlement}
              hotelRoomsCount={hotelRooms.length}
              archivedCount={
                (currentProperty.archivedEntries?.length ?? 0) +
                (currentProperty.archivedRooms?.length ?? 0)
              }
              onImportEntries={handleImportEntries}
              onResetSampleData={handleResetSampleData}
              onExportJsonBackup={handleExportJsonBackup}
              onImportJsonBackup={handleImportJsonBackup}
            />
          )}

          {activeTab === 'guide' && (
            <SystemGuide
              lang={lang}
              t={t}
              config={config}
              summary={summary}
              totalEntries={entries.length}
              isOutageMode={isOutageMode}
              onNavigateToTab={setActiveTab}
            />
          )}
        </main>
        </div>
      </div>

      {/* Supervisor PIN Modal for Unlocking Closed Day */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4 no-print">
          <form
            onSubmit={handleConfirmPinUnlock}
            className="w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-lg p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#0088CC]" />
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'ar'
                    ? 'إدخال رمز المشرف لفتح اليوم'
                    : lang === 'fr'
                    ? 'Code PIN Superviseur requis'
                    : 'Enter Supervisor PIN to Unlock'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPinModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {lang === 'ar'
                ? `اليوم المالي (${config.businessDate}) محمي برمز PIN. أدخل الرمز للمتابعة:`
                : lang === 'fr'
                ? `La journée (${config.businessDate}) est protégée par PIN :`
                : `Business Date (${config.businessDate}) is protected by Supervisor PIN:`}
            </p>

            <input
              type="password"
              autoFocus
              value={pinAttempt}
              onChange={(e) => setPinAttempt(e.target.value)}
              placeholder="••••"
              dir="ltr"
              className="w-full px-3 py-2 text-sm font-mono tracking-widest border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0088CC]"
            />

            {pinError && <p className="text-xs font-medium text-red-600">{pinError}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPinModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                {t.actions.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0088CC] hover:bg-[#0070AA] rounded-lg"
              >
                {lang === 'ar' ? 'فتح اليوم' : lang === 'fr' ? 'Déverrouiller' : 'Unlock Day'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
