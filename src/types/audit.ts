export type CurrencyCode = 'EGP' | 'USD' | 'SAR' | 'EUR';

export type UserRole =
  | 'Administrator'
  | 'IncomeAuditor'
  | 'NightAuditor'
  | 'FrontOffice'
  | 'Cashier'
  | 'ReadOnly';

export type EntryCategory =
  | 'Room'
  | 'FoodBeverage'
  | 'OtherRevenue'
  | 'Rebate'
  | 'PaidOut'
  | 'Deposit'
  | 'Payment'
  | 'Adjustment';

export type EntrySource = 'PMS' | 'POS' | 'OutageBackup' | 'ManualEntry';

export type PaymentMethod =
  | 'Cash'
  | 'CreditCard'
  | 'CityLedger'
  | 'RoomCharge'
  | 'HouseUse';

export type MealPlan = 'RO' | 'BB' | 'HB' | 'FB' | 'AI';

export interface PackageAllocationRules {
  breakfastPerPax: number;
  lunchPerPax: number;
  dinnerPerPax: number;
  otherPerPax: number;
  allInclusiveBeveragePerPax?: number;
}

export interface HotelConfig {
  propertyId: string;
  hotelName: string;
  businessDate: string;
  currency: CurrencyCode;
  serviceChargePct: number;
  vatPct: number;
  cityTaxPct: number;
  taxInclusive?: boolean;
  minRoomRate: number;
  rebateApprovalLimit: number;
  cashVarianceTolerance: number;
  outlets: string[];
  exchangeRates?: Record<CurrencyCode, number>;
  totalAvailableRooms?: number;
  budgetDailyRevenue?: number;
  defaultBreakfastSplitPerPax?: number;
  packageAllocationRules?: PackageAllocationRules;
  extraPersonFee?: number;
  lateCheckoutFeePct?: number;
  discountBeforeTax?: boolean;
  roundingDecimals?: number;
}

export interface LedgerEntry {
  id: string;
  timestamp: string;
  source: EntrySource;
  category: EntryCategory;
  outletOrDept: string;
  referenceNo: string;
  guestOrDescription: string;
  netAmount: number;
  serviceCharge: number;
  vatAmount: number;
  cityTaxAmount?: number;
  grossAmount: number;
  taxInclusive?: boolean;
  originalCurrency?: CurrencyCode;
  originalNetAmount?: number;
  fxRateApplied?: number;
  mealPlan?: MealPlan;
  paxCount?: number;
  packageSplitAmount?: number;
  paymentMethod: PaymentMethod;
  cashierName?: string;
  approvedBy: string;
  reconciled: boolean;
}

export interface CashSettlement {
  actualCashDrop: number;
  actualEdcBatch: number;
  actualCityLedgerSigned: number;
  generalCashierName: string;
  shiftNote: string;
}

export interface RoomDiscrepancy {
  id: string;
  roomNumber: string;
  frontOfficeStatus: 'Occupied' | 'Vacant' | 'DueOut';
  housekeepingStatus: 'Occupied' | 'VacantClean' | 'VacantDirty' | 'SleepOut';
  foPax: number;
  hkPax: number;
  resolved: boolean;
  note: string;
}

export type AuditTaskStatus = 'pending' | 'verified' | 'flagged';

export interface AuditTask {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  status: AuditTaskStatus;
  notes: string;
}

export interface AuditException {
  id: string;
  severity: 'critical' | 'warning';
  category: string;
  title: string;
  detail: string;
  amountImpact?: number;
}

export interface AuditSummary {
  roomNet: number;
  fbNet: number;
  otherNet: number;
  packageSplitTotal: number;
  adjustedRoomNet: number;
  adjustedFbNet: number;
  totalRebates: number;
  totalPaidOuts: number;
  totalDeposits: number;
  totalPayments: number;
  totalAdjustments: number;
  totalServiceCharge: number;
  totalVat: number;
  totalCityTax: number;
  grossRevenue: number;
  netRevenueAfterRebates: number;
  expectedCash: number;
  expectedCreditCard: number;
  expectedCityLedger: number;
  roomChargeTransfers: number;
  cashVariance: number;
  edcVariance: number;
  cityLedgerVariance: number;
  totalVariance: number;
  outageEntriesCount: number;
  missingCheckNumbers: number[];
  duplicateEntryIds: string[];
  exceptions: AuditException[];
}

export type ReconciliationStatus = 'Pending' | 'Investigating' | 'Resolved' | 'Approved';

export interface KwentraSnapshot {
  reportRef: string;
  lastUpdated: string;
  roomNet: number;
  fbNet: number;
  otherNet: number;
  serviceCharge: number;
  vatAndTaxes: number;
  rebates: number;
  paidOuts: number;
  cash: number;
  creditCard: number;
  cityLedger: number;
  roomCharge: number;
  note: string;
  investigationStatus?: ReconciliationStatus;
  approvedBy?: string;
}

export interface OccupancyInputs {
  roomsSold: number;
  complimentaryRooms: number;
  houseUseRooms: number;
  outOfOrderRooms: number;
}

export interface DailyArchiveRecord {
  id: string;
  businessDate: string;
  roomsSold: number;
  totalAvailableRooms: number;
  occupancyPct: number;
  adr: number;
  revpar: number;
  roomNet: number;
  fbNet: number;
  otherNet: number;
  grossRevenue: number;
  totalVariance: number;
  kwentraVariance: number;
  lockedAt: string;
  auditorName: string;
}

export interface EdcTerminalRecord {
  id: string;
  bankName: string;
  cardScheme: 'Visa' | 'Mastercard' | 'Meeza' | 'Amex';
  batchNo: string;
  grossAmount: number;
  bankFeePct: number;
  matched: boolean;
}

export interface CashierShiftRecord {
  id: string;
  cashierName: string;
  shift: 'Morning' | 'Afternoon' | 'Night';
  expectedAmount: number;
  droppedAmount: number;
  note: string;
}

export interface OtaAuditRecord {
  id: string;
  channel: string;
  bookingRef: string;
  guestName: string;
  roomNumber: string;
  nights: number;
  contractRate: number;
  postedRate: number;
  commissionPct: number;
  verified: boolean;
}

export interface CityLedgerRecord {
  id: string;
  companyName: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDays: number;
  amount: number;
  advanceDeposit: number;
  signedFolioAttached: boolean;
  collected: boolean;
}

export interface BanquetBeoRecord {
  id: string;
  beoNo: string;
  eventName: string;
  clientName: string;
  eventDate: string;
  hallOrOutlet: string;
  pax: number;
  totalContractAmount: number;
  advanceDepositPaid: number;
  posPostedAmount: number;
  status: 'scheduled' | 'posted' | 'settled';
}

export type AuditTrailAction =
  | 'create'
  | 'delete'
  | 'approve'
  | 'reconcile'
  | 'lock'
  | 'unlock'
  | 'archive'
  | 'settlement'
  | 'rate_change'
  | 'security_change';

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  action: AuditTrailAction;
  actor: string;
  actorRole?: UserRole;
  targetRef: string;
  recordId?: string;
  detail: string;
  oldValues?: string;
  newValues?: string;
  amountImpact?: number;
}

export interface SecurityOperatorAccount {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  passcode: string;
}

export interface SecuritySettings {
  username: string;
  passcode: string;
  activeRole?: UserRole;
  roleUsers?: SecurityOperatorAccount[];
  requireStrictCredentials: boolean;
  requireSecurityCheck: boolean;
  requirePinForDayUnlock: boolean;
  supervisorPin: string;
  updatedAt?: string;
}

export type RoomRackStatus =
  | 'Occupied'
  | 'VacantClean'
  | 'VacantDirty'
  | 'OutOfOrder'
  | 'Complimentary'
  | 'HouseUse';

export interface HotelRoom {
  id: string;
  roomNumber: string;
  floor: string;
  roomType: string;
  baseRate: number;
  maxOccupancy: number;
  status: RoomRackStatus;
  guestName?: string;
  notes?: string;
}

export type ReservationState =
  | 'CheckedIn'
  | 'Reserved'
  | 'CheckedOut'
  | 'DueOut'
  | 'Cancelled';

export interface RoomReservation {
  id: string;
  roomId: string;
  confirmationNo: string;
  primaryGuest: string;
  otherGuests: string[];
  nationality: string;
  arrival: string;
  departure: string;
  checkInTime: string;
  checkOutTime: string;
  channel: string;
  adults: number;
  children: number;
  roomType: string;
  roomTypeToCharge: string;
  rateCode: string;
  boardType: MealPlan;
  rateAmount: number;
  rateCurrency: CurrencyCode;
  manualRate: boolean;
  state: ReservationState;
  openedToPos: boolean;
  folioLocked: boolean;
  sendBillOnCheckout: boolean;
  alerts: string[];
  window2Label: string;
  notes: string;
  contractedRate?: number;
  approvedRate?: number;
  discountAmount?: number;
  extraPersonCharge?: number;
  isEarlyCheckIn?: boolean;
  isLateCheckout?: boolean;
  isEarlyDeparture?: boolean;
  isExtendedStay?: boolean;
  isNoShow?: boolean;
  splitGroupId?: string;
  compApprovedBy?: string;
}

export interface RoomFolioItem {
  id: string;
  roomId: string;
  reservationId: string;
  windowNo: 1 | 2;
  department: string;
  amount: number;
  auditDate: string;
  foreignAmount?: number;
  foreignCurrency?: CurrencyCode;
  kind: 'charge' | 'deposit' | 'payout' | 'daily_room';
  details?: string;
  verified: boolean;
}

export type PosCategory =
  | 'Restaurant'
  | 'Bar'
  | 'RoomService'
  | 'MiniBar'
  | 'SpaLaundry'
  | 'Other';

export interface PosCatalogItem {
  id: string;
  nameAr: string;
  nameEn: string;
  category: PosCategory;
  departmentCode: string;
  price: number;
  currency: CurrencyCode;
  sku?: string;
}

export type StayPhase =
  | 'Arrival'
  | 'Stayover'
  | 'Departure'
  | 'DayUse'
  | 'NoShow'
  | 'Vacant';

export type RoomAuditStatus = 'Matched' | 'Variance' | 'Exception' | 'Approved';

export type RoomAnomalyType =
  | 'rate_mismatch'
  | 'missing_room_charge'
  | 'incorrect_discount'
  | 'unauthorized_upgrade'
  | 'extra_person_mismatch'
  | 'package_split_mismatch'
  | 'fx_conversion_mismatch'
  | 'duplicate_daily_posting'
  | 'unauthorized_complimentary'
  | 'unauthorized_house_use';

export interface PackageBreakdown {
  mealPlan: MealPlan;
  originalPackageValue: number;
  accommodationRevenue: number;
  breakfastRevenue: number;
  lunchRevenue: number;
  dinnerRevenue: number;
  beverageRevenue: number;
  otherIncludedServices: number;
  totalPackageAllocation: number;
}

export interface RoomAnomalyItem {
  type: RoomAnomalyType;
  severity: 'critical' | 'warning';
  labelEn: string;
  labelAr: string;
  detail: string;
  varianceAmount: number;
}

export interface RoomRateVerificationResult {
  contractedRateBase: number;
  approvedReservationRateBase: number;
  pmsPostedRateBase: number;
  auditShieldExpectedRateBase: number;
  actualDailyRoomChargeBase: number;
  varianceAmountBase: number;
  variancePct: number;
  anomalies: RoomAnomalyItem[];
}

export interface DailyRoomRevenueRecord {
  businessDate: string;
  roomId: string;
  roomNumber: string;
  floor: string;
  roomType: string;
  chargedRoomType: string;
  roomStatus: RoomRackStatus;
  stayPhase: StayPhase;
  guestName: string;
  reservationId: string;
  reservationNumber: string;
  arrivalDate: string;
  departureDate: string;
  adults: number;
  children: number;
  rateCode: string;
  ratePlan: string;
  mealPlan: MealPlan;
  bookingChannel: string;
  currency: CurrencyCode;
  exchangeRate: number;
  contractedRate: number;
  approvedRate: number;
  pmsPostedRate: number;
  expectedRate: number;
  actualPostedRate: number;
  discount: number;
  extraPersonCharge: number;
  extraCharges: number;
  packageAllocation: number;
  packageBreakdown: PackageBreakdown;
  roomRevenueNet: number;
  serviceCharge: number;
  vatAmount: number;
  cityTaxAmount: number;
  netRevenue: number;
  grossFolioCharge: number;
  folioWindow1Net: number;
  folioWindow2Net: number;
  depositsCollected: number;
  paymentsCollected: number;
  paidOutsAmount: number;
  varianceAmount: number;
  variancePct: number;
  auditStatus: RoomAuditStatus;
  verification: RoomRateVerificationResult;
  flags: {
    earlyCheckIn: boolean;
    lateCheckout: boolean;
    earlyDeparture: boolean;
    extendedStay: boolean;
    noShow: boolean;
    roomUpgrade: boolean;
    splitReservation: boolean;
    multiGuest: boolean;
    multiWindow: boolean;
  };
  sourceTrace: {
    folioItemIds: string[];
    ledgerEntryIds: string[];
  };
}

export interface DailyRoomRevenueReportTotals {
  totalRooms: number;
  occupiedRooms: number;
  complimentaryRooms: number;
  houseUseRooms: number;
  outOfOrderRooms: number;
  availableRooms: number;
  roomsSold: number;
  totalRoomRevenue: number;
  totalPackageAllocation: number;
  totalExtraCharges: number;
  totalDiscounts: number;
  totalNetRevenue: number;
  totalServiceCharge: number;
  totalVat: number;
  totalCityTax: number;
  totalTaxes: number;
  totalGrossCharges: number;
  totalVariance: number;
  exceptionRoomsCount: number;
}

export type ExceptionInvestigationStatus =
  | 'Open'
  | 'Investigating'
  | 'Approved'
  | 'Resolved'
  | 'Escalated';

export interface AuditExceptionResolution {
  exceptionId: string;
  status: ExceptionInvestigationStatus;
  reviewer: string;
  resolutionNote: string;
  updatedAt: string;
}

export interface UnifiedAuditException {
  exceptionId: string;
  businessDate: string;
  sourceDept: string;
  roomOrCheckRef: string;
  severity: 'critical' | 'warning';
  category: string;
  title: string;
  expectedAmount: number;
  actualAmount: number;
  varianceAmount: number;
  evidence: string;
  investigationStatus: ExceptionInvestigationStatus;
  reviewer: string;
  resolution: string;
}

export interface ConsolidatedFinancialStatement {
  businessDate: string;
  currency: CurrencyCode;
  revenueRecognition: {
    roomAccommodationNet: number;
    packageAllocationToFb: number;
    posFbDirectNet: number;
    posFbRoomChargeNet: number;
    totalFbNet: number;
    otherDeptNet: number;
    banquetNet: number;
    totalDiscountsAndRebates: number;
    netRevenueBeforeTaxes: number;
    serviceCharge: number;
    vatAmount: number;
    cityTaxAmount: number;
    grossRecognizedRevenue: number;
  };
  cashAndReceivables: {
    paidOuts: number;
    cashCollected: number;
    cardEdcCollected: number;
    advanceDepositsCollected: number;
    guestPaymentsCollected: number;
    cityLedgerTransferred: number;
    outstandingCityLedgerAr: number;
    roomChargeClearingTransfer: number;
  };
  integrityChecks: {
    posRoomChargeDoubleCountPrevented: boolean;
    depositsExcludedFromRevenue: boolean;
    paymentsExcludedFromRevenue: boolean;
    taxRoundingDelta: number;
  };
}

export interface NightAuditCheckItem {
  id: string;
  order: number;
  stage: 'FrontOffice' | 'POS' | 'Cashier' | 'Financial' | 'Receivables' | 'Closing';
  titleEn: string;
  titleAr: string;
  autoVerified: boolean;
  manualConfirmed: boolean;
  status: 'passed' | 'attention' | 'pending';
  evidence: string;
}

export type HistoryPeriodMode = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export interface HistoricalRoomMetric {
  periodKey: string;
  label: string;
  nightsOrDays: number;
  roomRevenueNet: number;
  packageAllocation: number;
  extraCharges: number;
  grossCharges: number;
  adr: number;
  source: 'LiveBusinessDate' | 'FolioRecords' | 'ClosedArchive' | 'AuditTrail';
}


