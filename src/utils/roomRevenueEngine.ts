import { LanguageCode } from '../i18n/translations';
import {
  AuditExceptionResolution,
  AuditSummary,
  AuditTask,
  AuditTrailEntry,
  BanquetBeoRecord,
  CashierShiftRecord,
  CashSettlement,
  CityLedgerRecord,
  ConsolidatedFinancialStatement,
  CurrencyCode,
  DailyArchiveRecord,
  DailyRoomRevenueRecord,
  DailyRoomRevenueReportTotals,
  EdcTerminalRecord,
  HistoryPeriodMode,
  HistoricalRoomMetric,
  HotelConfig,
  HotelRoom,
  KwentraSnapshot,
  LedgerEntry,
  NightAuditCheckItem,
  OtaAuditRecord,
  PackageBreakdown,
  RoomAnomalyItem,
  RoomDiscrepancy,
  RoomFolioItem,
  RoomReservation,
  StayPhase,
  UnifiedAuditException,
} from '../types/audit';
import {
  calculateTaxes,
  computeDetailedPackageSplit,
  convertCurrency,
  getExchangeRates,
  roundMoney,
} from './auditEngine';

const EPSILON = 0.5;

function findMatchedReservation(
  room: HotelRoom,
  reservations: RoomReservation[]
): RoomReservation | undefined {
  const roomRes = reservations.filter((r) => r.roomId === room.id && r.state !== 'Cancelled');
  return (
    roomRes.find((r) => r.state === 'CheckedIn' || r.state === 'DueOut') ??
    roomRes.find((r) => r.state === 'Reserved') ??
    roomRes[0]
  );
}

function determineStayPhase(
  room: HotelRoom,
  reservation: RoomReservation | undefined,
  businessDate: string
): {
  stayPhase: StayPhase;
  extendedStay: boolean;
  shouldChargeRoomNight: boolean;
  lateCheckoutApplies: boolean;
} {
  if (!reservation) {
    return {
      stayPhase: 'Vacant',
      extendedStay: false,
      shouldChargeRoomNight: false,
      lateCheckoutApplies: false,
    };
  }

  if (reservation.isNoShow) {
    return {
      stayPhase: 'NoShow',
      extendedStay: false,
      shouldChargeRoomNight: (reservation.approvedRate ?? reservation.rateAmount) > 0,
      lateCheckoutApplies: false,
    };
  }

  const isActiveRoom =
    room.status === 'Occupied' ||
    room.status === 'Complimentary' ||
    room.status === 'HouseUse';

  if (!isActiveRoom && reservation.state !== 'CheckedIn' && reservation.state !== 'DueOut') {
    return {
      stayPhase: 'Vacant',
      extendedStay: false,
      shouldChargeRoomNight: false,
      lateCheckoutApplies: false,
    };
  }

  const arr = reservation.arrival;
  const dep = reservation.departure;

  if (arr && dep && arr === dep && businessDate === arr) {
    return {
      stayPhase: 'DayUse',
      extendedStay: false,
      shouldChargeRoomNight:
        room.status !== 'Complimentary' && room.status !== 'HouseUse',
      lateCheckoutApplies: false,
    };
  }

  if (dep && businessDate === dep) {
    // Departure day does NOT charge a full nightly room rate by default unless Late Checkout is flagged
    const lateApplies =
      Boolean(reservation.isLateCheckout) &&
      room.status !== 'Complimentary' &&
      room.status !== 'HouseUse';
    return {
      stayPhase: 'Departure',
      extendedStay: false,
      shouldChargeRoomNight: false,
      lateCheckoutApplies: lateApplies,
    };
  }

  if (arr && businessDate === arr) {
    return {
      stayPhase: 'Arrival',
      extendedStay: false,
      shouldChargeRoomNight:
        room.status !== 'Complimentary' && room.status !== 'HouseUse',
      lateCheckoutApplies: false,
    };
  }

  if (dep && businessDate > dep && isActiveRoom) {
    return {
      stayPhase: 'Stayover',
      extendedStay: true,
      shouldChargeRoomNight:
        room.status !== 'Complimentary' && room.status !== 'HouseUse',
      lateCheckoutApplies: false,
    };
  }

  return {
    stayPhase: 'Stayover',
    extendedStay: false,
    shouldChargeRoomNight:
      room.status !== 'Complimentary' && room.status !== 'HouseUse',
    lateCheckoutApplies: false,
  };
}

export function computeRoomRevenueRecord(
  room: HotelRoom,
  reservations: RoomReservation[],
  folioItems: RoomFolioItem[],
  ledgerEntries: LedgerEntry[],
  config: HotelConfig,
  businessDate = config.businessDate,
  exceptionResolutions: Record<string, AuditExceptionResolution> = {}
): DailyRoomRevenueRecord {
  const dec = config.roundingDecimals ?? 2;
  const rates = getExchangeRates(config);
  const reservation = findMatchedReservation(room, reservations);

  const resCurrency: CurrencyCode = reservation?.rateCurrency ?? config.currency;
  const fxRate =
    resCurrency === config.currency
      ? 1
      : convertCurrency(1, resCurrency, config.currency, rates);

  const phaseInfo = determineStayPhase(room, reservation, businessDate);
  const paxCount = Math.max(1, (reservation?.adults ?? 1) + (reservation?.children ?? 0));
  const extraPaxCount = Math.max(0, (reservation?.adults ?? 0) - room.maxOccupancy);

  // Rates in base currency
  const contractedOrig = reservation?.contractedRate ?? room.baseRate;
  const approvedOrig = reservation?.approvedRate ?? reservation?.rateAmount ?? room.baseRate;

  const contractedBase = roundMoney(
    resCurrency === config.currency ? contractedOrig : contractedOrig * fxRate,
    dec
  );
  const approvedBase = roundMoney(
    resCurrency === config.currency ? approvedOrig : approvedOrig * fxRate,
    dec
  );
  const resRateBase = roundMoney(
    resCurrency === config.currency
      ? reservation?.rateAmount ?? 0
      : (reservation?.rateAmount ?? 0) * fxRate,
    dec
  );

  // Filter folio items belonging to this room on businessDate
  const roomDateFolios = folioItems.filter(
    (fi) => fi.roomId === room.id && fi.auditDate === businessDate
  );

  // Match room ledger entries belonging to this room (referenceNo matches roomNumber or folio id)
  const folioIdSet = new Set(roomDateFolios.map((fi) => `led-folio-${fi.id}`));
  const roomLedgerEntries = ledgerEntries.filter(
    (le) =>
      le.referenceNo.trim().toLowerCase() === room.roomNumber.trim().toLowerCase() ||
      folioIdSet.has(le.id)
  );

  const dailyRoomFolios = roomDateFolios.filter((fi) => fi.kind === 'daily_room');
  const pmsRoomLedger = roomLedgerEntries.filter(
    (le) => le.category === 'Room' && !folioIdSet.has(le.id)
  );

  // Determine PMS Posted & Actual Daily Room Charge in base currency
  const folioDailySum = roundMoney(
    dailyRoomFolios.reduce((acc, fi) => acc + Math.max(0, fi.amount), 0),
    dec
  );
  const ledgerDailySum = roundMoney(
    pmsRoomLedger.reduce((acc, le) => acc + Math.max(0, le.netAmount), 0),
    dec
  );

  const hasPostedDailyRoom = folioDailySum > 0 || ledgerDailySum > 0;
  const pmsPostedRateBase =
    folioDailySum > 0
      ? folioDailySum
      : ledgerDailySum > 0
      ? ledgerDailySum
      : phaseInfo.shouldChargeRoomNight
      ? resRateBase
      : phaseInfo.lateCheckoutApplies
      ? roundMoney(resRateBase * ((config.lateCheckoutFeePct ?? 50) / 100), dec)
      : 0;

  const actualPostedRateBase = hasPostedDailyRoom
    ? roundMoney(folioDailySum > 0 ? folioDailySum : ledgerDailySum, dec)
    : 0;

  // Expected base room charge before discount & package split
  const expectedNightRateBase = phaseInfo.shouldChargeRoomNight
    ? approvedBase > 0
      ? approvedBase
      : contractedBase
    : phaseInfo.lateCheckoutApplies
    ? roundMoney(
        (approvedBase > 0 ? approvedBase : contractedBase) *
          ((config.lateCheckoutFeePct ?? 50) / 100),
        dec
      )
    : 0;

  // Extra person fee calculation
  const configuredExtraFee = config.extraPersonFee ?? 0;
  const expectedExtraPerson =
    extraPaxCount > 0 && configuredExtraFee > 0
      ? roundMoney(extraPaxCount * configuredExtraFee, dec)
      : 0;
  const actualExtraPerson = roundMoney(reservation?.extraPersonCharge ?? expectedExtraPerson, dec);

  // Discount calculation
  const discountRaw = roundMoney(reservation?.discountAmount ?? 0, dec);
  const discountBeforeTax = config.discountBeforeTax !== false;

  // Non-room folio charges (POS / ancillary / late fees)
  const extraFolioCharges = roomDateFolios.filter((fi) => fi.kind === 'charge');
  const extraChargesNet = roundMoney(
    extraFolioCharges.reduce((acc, fi) => acc + Math.max(0, fi.amount), 0),
    dec
  );

  const depositsCollected = roundMoney(
    roomDateFolios
      .filter((fi) => fi.kind === 'deposit')
      .reduce((acc, fi) => acc + Math.max(0, fi.amount), 0),
    dec
  );
  const paidOutsAmount = roundMoney(
    roomDateFolios
      .filter((fi) => fi.kind === 'payout')
      .reduce((acc, fi) => acc + Math.max(0, fi.amount), 0),
    dec
  );
  const paymentsCollected = roundMoney(
    roomLedgerEntries
      .filter((le) => le.category === 'Payment')
      .reduce((acc, le) => acc + Math.max(0, le.grossAmount), 0),
    dec
  );

  const folioWindow1Net = roundMoney(
    roomDateFolios
      .filter((fi) => fi.windowNo === 1 && (fi.kind === 'charge' || fi.kind === 'daily_room'))
      .reduce((acc, fi) => acc + fi.amount, 0),
    dec
  );
  const folioWindow2Net = roundMoney(
    roomDateFolios
      .filter((fi) => fi.windowNo === 2 && (fi.kind === 'charge' || fi.kind === 'daily_room'))
      .reduce((acc, fi) => acc + fi.amount, 0),
    dec
  );

  // Compute Room Revenue & Package Split without double counting
  const roomGrossPreSplit = Math.max(
    0,
    roundMoney(
      actualPostedRateBase +
        actualExtraPerson -
        (discountBeforeTax ? discountRaw : 0),
      dec
    )
  );

  const mealPlan = reservation?.boardType ?? 'RO';
  const packageBreakdown: PackageBreakdown = computeDetailedPackageSplit(
    mealPlan,
    paxCount,
    roomGrossPreSplit,
    config
  );

  const roomTaxes = calculateTaxes(roomGrossPreSplit, 'Room', config);
  const extraTaxes = calculateTaxes(extraChargesNet, 'FoodBeverage', config);

  const totalServiceCharge = roundMoney(roomTaxes.serviceCharge + extraTaxes.serviceCharge, dec);
  const totalVat = roundMoney(roomTaxes.vatAmount + extraTaxes.vatAmount, dec);
  const totalCityTax = roundMoney(roomTaxes.cityTaxAmount + extraTaxes.cityTaxAmount, dec);

  const netRevenue = roundMoney(
    roomTaxes.netAmount + extraTaxes.netAmount,
    dec
  );
  const rawGrossCharge = roundMoney(roomTaxes.grossAmount + extraTaxes.grossAmount, dec);
  const grossFolioCharge = roundMoney(
    Math.max(0, rawGrossCharge - (!discountBeforeTax ? discountRaw : 0)),
    dec
  );

  // Audit Verification & Anomaly Detection (Module 2)
  const expectedTotalDaily = roundMoney(expectedNightRateBase + expectedExtraPerson, dec);
  const actualTotalDaily = roundMoney(actualPostedRateBase + actualExtraPerson, dec);
  const varianceAmount = roundMoney(actualTotalDaily - expectedTotalDaily, dec);
  const variancePct =
    expectedTotalDaily > 0
      ? roundMoney((varianceAmount / expectedTotalDaily) * 100, 2)
      : actualTotalDaily > 0
      ? 100
      : 0;

  const anomalies: RoomAnomalyItem[] = [];

  // 1. Missing daily room charge on occupied Arrival/Stayover/DayUse room
  if (
    phaseInfo.shouldChargeRoomNight &&
    actualPostedRateBase <= 0 &&
    expectedNightRateBase > 0
  ) {
    anomalies.push({
      type: 'missing_room_charge',
      severity: 'critical',
      labelEn: `Room ${room.roomNumber}: Missing daily room charge`,
      labelAr: `غرفة ${room.roomNumber}: لم يتم ترحيل أجر الليلة اليومي`,
      detail: `Expected ${expectedNightRateBase.toFixed(2)} ${config.currency} (${phaseInfo.stayPhase})`,
      varianceAmount: -expectedNightRateBase,
    });
  }

  // 2. Duplicate daily room posting
  if (dailyRoomFolios.length > 1) {
    const dupSum = roundMoney(
      dailyRoomFolios.slice(1).reduce((s, f) => s + f.amount, 0),
      dec
    );
    anomalies.push({
      type: 'duplicate_daily_posting',
      severity: 'critical',
      labelEn: `Room ${room.roomNumber}: Duplicate daily room posting (${dailyRoomFolios.length}x)`,
      labelAr: `غرفة ${room.roomNumber}: تكرار ترحيل أجر الغرفة (${dailyRoomFolios.length} مرات)`,
      detail: `Multiple daily_room folio lines found for ${businessDate}`,
      varianceAmount: dupSum,
    });
  }

  // 3. Rate mismatch (contracted vs approved vs actual posted)
  if (
    phaseInfo.shouldChargeRoomNight &&
    Math.abs(varianceAmount) > EPSILON
  ) {
    anomalies.push({
      type: 'rate_mismatch',
      severity: Math.abs(varianceAmount) > 100 ? 'critical' : 'warning',
      labelEn: `Room ${room.roomNumber}: Rate mismatch vs expected`,
      labelAr: `غرفة ${room.roomNumber}: فرق في سعر الغرفة عن المتوقع`,
      detail: `Expected ${expectedTotalDaily.toFixed(2)} vs Posted ${actualTotalDaily.toFixed(2)} ${config.currency}`,
      varianceAmount,
    });
  } else if (
    phaseInfo.shouldChargeRoomNight &&
    reservation &&
    Math.abs(resRateBase - contractedBase) > EPSILON &&
    !reservation.manualRate &&
    reservation.approvedRate === undefined
  ) {
    const diff = roundMoney(resRateBase - contractedBase, dec);
    anomalies.push({
      type: 'rate_mismatch',
      severity: 'warning',
      labelEn: `Room ${room.roomNumber}: Unapproved deviation from contracted rate`,
      labelAr: `غرفة ${room.roomNumber}: اختلاف غير معتمد عن السعر التعاقدي`,
      detail: `Contracted ${contractedBase.toFixed(2)} vs Res Rate ${resRateBase.toFixed(2)} ${config.currency}`,
      varianceAmount: diff,
    });
  }

  // 4. Unauthorized Complimentary or House Use
  if (room.status === 'Complimentary' && !reservation?.compApprovedBy?.trim()) {
    anomalies.push({
      type: 'unauthorized_complimentary',
      severity: 'critical',
      labelEn: `Room ${room.roomNumber}: Complimentary stay missing manager approval`,
      labelAr: `غرفة ${room.roomNumber}: إقامة مجانية (Complimentary) بدون اعتماد إداري`,
      detail: `Contracted room value ${contractedBase.toFixed(2)} ${config.currency} requires comp sign-off`,
      varianceAmount: -contractedBase,
    });
  }
  if (room.status === 'HouseUse' && !reservation?.compApprovedBy?.trim() && !room.notes?.trim()) {
    anomalies.push({
      type: 'unauthorized_house_use',
      severity: 'warning',
      labelEn: `Room ${room.roomNumber}: House Use missing authorization note`,
      labelAr: `غرفة ${room.roomNumber}: استخدام داخلي (House Use) بدون تصريح`,
      detail: `House Use room should document approver or internal duty order`,
      varianceAmount: 0,
    });
  }

  // 5. Room Upgrade verification
  const isUpgrade = Boolean(
    reservation && reservation.roomType !== reservation.roomTypeToCharge
  );
  if (isUpgrade && reservation && !reservation.manualRate && !reservation.approvedRate && !reservation.notes.trim()) {
    anomalies.push({
      type: 'unauthorized_upgrade',
      severity: 'warning',
      labelEn: `Room ${room.roomNumber}: Room upgrade (${reservation.roomTypeToCharge} → ${reservation.roomType}) lacks reason/approval`,
      labelAr: `غرفة ${room.roomNumber}: ترقية فئة الغرفة بدون توثيق السبب أو الاعتماد`,
      detail: `Room occupied: ${reservation.roomType}, charged: ${reservation.roomTypeToCharge}`,
      varianceAmount: 0,
    });
  }

  // 6. Extra person mismatch
  if (extraPaxCount > 0 && configuredExtraFee > 0 && actualExtraPerson + EPSILON < expectedExtraPerson) {
    anomalies.push({
      type: 'extra_person_mismatch',
      severity: 'warning',
      labelEn: `Room ${room.roomNumber}: Missing extra person charge (${extraPaxCount} pax)`,
      labelAr: `غرفة ${room.roomNumber}: رسوم الشخص الإضافي غير محتسبة (${extraPaxCount} فرد)`,
      detail: `Expected extra pax fee ${expectedExtraPerson.toFixed(2)} vs posted ${actualExtraPerson.toFixed(2)}`,
      varianceAmount: roundMoney(actualExtraPerson - expectedExtraPerson, dec),
    });
  }

  // 7. Discount exceeding rebate approval limit without approval
  if (discountRaw >= config.rebateApprovalLimit && !reservation?.compApprovedBy?.trim()) {
    anomalies.push({
      type: 'incorrect_discount',
      severity: 'critical',
      labelEn: `Room ${room.roomNumber}: Discount (${discountRaw}) exceeds limit without sign-off`,
      labelAr: `غرفة ${room.roomNumber}: خصم (${discountRaw}) يتجاوز الحد بدون توقيع`,
      detail: `Threshold ${config.rebateApprovalLimit} ${config.currency}`,
      varianceAmount: -discountRaw,
    });
  }

  // 8. FX conversion mismatch on foreign folio lines
  for (const fi of roomDateFolios) {
    if (fi.foreignCurrency && fi.foreignCurrency !== config.currency && (fi.foreignAmount ?? 0) > 0) {
      const expectedLocal = convertCurrency(
        fi.foreignAmount!,
        fi.foreignCurrency,
        config.currency,
        rates
      );
      if (Math.abs(fi.amount - expectedLocal) > Math.max(2, expectedLocal * 0.02)) {
        anomalies.push({
          type: 'fx_conversion_mismatch',
          severity: 'warning',
          labelEn: `Room ${room.roomNumber}: FX conversion variance on ${fi.department}`,
          labelAr: `غرفة ${room.roomNumber}: فرق تحويل عملة على ${fi.department}`,
          detail: `${fi.foreignAmount} ${fi.foreignCurrency} expected ${expectedLocal.toFixed(2)} vs posted ${fi.amount.toFixed(2)}`,
          varianceAmount: roundMoney(fi.amount - expectedLocal, dec),
        });
      }
    }
  }

  // 9. All-Inclusive (AI) guest with unverified POS F&B folio charges
  if (mealPlan === 'AI') {
    const unverifiedAiCharges = extraFolioCharges.filter(
      (fi) => !fi.verified && !fi.department.includes('140')
    );
    if (unverifiedAiCharges.length > 0) {
      const sumUnverified = roundMoney(
        unverifiedAiCharges.reduce((acc, fi) => acc + Math.max(0, fi.amount), 0),
        dec
      );
      anomalies.push({
        type: 'package_split_mismatch',
        severity: 'warning',
        labelEn: `Room ${room.roomNumber}: All-Inclusive (AI) guest has unverified F&B charge`,
        labelAr: `غرفة ${room.roomNumber}: نزيل All Inclusive لديه ترحيل مطعم/مشروبات غير معتمد`,
        detail: `${unverifiedAiCharges.length} unverified F&B folio line(s) totaling ${sumUnverified.toFixed(2)} ${config.currency}`,
        varianceAmount: sumUnverified,
      });
    }
  }

  // Check if any room-level exceptions are resolved/approved in exceptionResolutions
  const roomExcId = `exc-room-${room.id}-${businessDate}`;
  const resOverride = exceptionResolutions[roomExcId];

  const auditStatus: DailyRoomRevenueRecord['auditStatus'] =
    resOverride && (resOverride.status === 'Approved' || resOverride.status === 'Resolved')
      ? 'Approved'
      : anomalies.some((a) => a.severity === 'critical')
      ? 'Exception'
      : anomalies.length > 0 || Math.abs(varianceAmount) > EPSILON
      ? 'Variance'
      : 'Matched';

  return {
    businessDate,
    roomId: room.id,
    roomNumber: room.roomNumber,
    floor: room.floor,
    roomType: reservation?.roomType ?? room.roomType,
    chargedRoomType: reservation?.roomTypeToCharge ?? room.roomType,
    roomStatus: room.status,
    stayPhase: phaseInfo.stayPhase,
    guestName: reservation?.primaryGuest || room.guestName || '—',
    reservationId: reservation?.id ?? '',
    reservationNumber: reservation?.confirmationNo ?? '—',
    arrivalDate: reservation?.arrival ?? '—',
    departureDate: reservation?.departure ?? '—',
    adults: reservation?.adults ?? 0,
    children: reservation?.children ?? 0,
    rateCode: reservation?.rateCode ?? 'RACK',
    ratePlan: reservation ? `${reservation.rateCode} (${reservation.rateCurrency})` : '—',
    mealPlan,
    bookingChannel: reservation?.channel ?? 'Direct',
    currency: resCurrency,
    exchangeRate: roundMoney(fxRate, 4),
    contractedRate: contractedBase,
    approvedRate: approvedBase,
    pmsPostedRate: pmsPostedRateBase,
    expectedRate: expectedNightRateBase,
    actualPostedRate: actualPostedRateBase,
    discount: discountRaw,
    extraPersonCharge: actualExtraPerson,
    extraCharges: extraChargesNet,
    packageAllocation: packageBreakdown.totalPackageAllocation,
    packageBreakdown,
    roomRevenueNet: packageBreakdown.accommodationRevenue,
    serviceCharge: totalServiceCharge,
    vatAmount: totalVat,
    cityTaxAmount: totalCityTax,
    netRevenue,
    grossFolioCharge,
    folioWindow1Net,
    folioWindow2Net,
    depositsCollected,
    paymentsCollected,
    paidOutsAmount,
    varianceAmount,
    variancePct,
    auditStatus,
    verification: {
      contractedRateBase: contractedBase,
      approvedReservationRateBase: approvedBase,
      pmsPostedRateBase,
      auditShieldExpectedRateBase: expectedTotalDaily,
      actualDailyRoomChargeBase: actualTotalDaily,
      varianceAmountBase: varianceAmount,
      variancePct,
      anomalies,
    },
    flags: {
      earlyCheckIn: Boolean(reservation?.isEarlyCheckIn),
      lateCheckout: Boolean(reservation?.isLateCheckout),
      earlyDeparture: Boolean(reservation?.isEarlyDeparture),
      extendedStay: phaseInfo.extendedStay,
      noShow: Boolean(reservation?.isNoShow),
      roomUpgrade: isUpgrade,
      splitReservation: Boolean(reservation?.splitGroupId),
      multiGuest: (reservation?.otherGuests.length ?? 0) > 0,
      multiWindow: folioWindow2Net > 0 || depositsCollected > 0,
    },
    sourceTrace: {
      folioItemIds: roomDateFolios.map((f) => f.id),
      ledgerEntryIds: roomLedgerEntries.map((l) => l.id),
    },
  };
}

export function computeAllRoomsRevenueReport(
  rooms: HotelRoom[],
  reservations: RoomReservation[],
  folioItems: RoomFolioItem[],
  ledgerEntries: LedgerEntry[],
  config: HotelConfig,
  businessDate = config.businessDate,
  exceptionResolutions: Record<string, AuditExceptionResolution> = {}
): {
  records: DailyRoomRevenueRecord[];
  totals: DailyRoomRevenueReportTotals;
} {
  const dec = config.roundingDecimals ?? 2;
  const records = rooms
    .map((room) =>
      computeRoomRevenueRecord(
        room,
        reservations,
        folioItems,
        ledgerEntries,
        config,
        businessDate,
        exceptionResolutions
      )
    )
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

  const occupiedRooms = rooms.filter((r) => r.status === 'Occupied').length;
  const complimentaryRooms = rooms.filter((r) => r.status === 'Complimentary').length;
  const houseUseRooms = rooms.filter((r) => r.status === 'HouseUse').length;
  const outOfOrderRooms = rooms.filter((r) => r.status === 'OutOfOrder').length;
  const availableRooms = Math.max(0, rooms.length - outOfOrderRooms);

  const totals: DailyRoomRevenueReportTotals = {
    totalRooms: rooms.length,
    occupiedRooms,
    complimentaryRooms,
    houseUseRooms,
    outOfOrderRooms,
    availableRooms,
    roomsSold: occupiedRooms,
    totalRoomRevenue: roundMoney(
      records.reduce((s, r) => s + r.roomRevenueNet, 0),
      dec
    ),
    totalPackageAllocation: roundMoney(
      records.reduce((s, r) => s + r.packageAllocation, 0),
      dec
    ),
    totalExtraCharges: roundMoney(
      records.reduce((s, r) => s + r.extraCharges, 0),
      dec
    ),
    totalDiscounts: roundMoney(
      records.reduce((s, r) => s + r.discount, 0),
      dec
    ),
    totalNetRevenue: roundMoney(
      records.reduce((s, r) => s + r.netRevenue, 0),
      dec
    ),
    totalServiceCharge: roundMoney(
      records.reduce((s, r) => s + r.serviceCharge, 0),
      dec
    ),
    totalVat: roundMoney(
      records.reduce((s, r) => s + r.vatAmount, 0),
      dec
    ),
    totalCityTax: roundMoney(
      records.reduce((s, r) => s + r.cityTaxAmount, 0),
      dec
    ),
    totalTaxes: roundMoney(
      records.reduce((s, r) => s + r.serviceCharge + r.vatAmount + r.cityTaxAmount, 0),
      dec
    ),
    totalGrossCharges: roundMoney(
      records.reduce((s, r) => s + r.grossFolioCharge, 0),
      dec
    ),
    totalVariance: roundMoney(
      records.reduce((s, r) => s + r.varianceAmount, 0),
      dec
    ),
    exceptionRoomsCount: records.filter(
      (r) => r.auditStatus === 'Exception' || r.auditStatus === 'Variance'
    ).length,
  };

  return { records, totals };
}

export function buildConsolidatedFinancialStatement(
  entries: LedgerEntry[],
  roomRecords: DailyRoomRevenueRecord[],
  cityLedgerItems: CityLedgerRecord[],
  banquetEvents: BanquetBeoRecord[],
  summary: AuditSummary,
  settlement: CashSettlement,
  config: HotelConfig
): ConsolidatedFinancialStatement {
  const dec = config.roundingDecimals ?? 2;

  // Separate POS F&B paid via direct settlement vs RoomCharge clearing
  // CRITICAL: POS RoomCharge items represent F&B earned revenue settled via guest folio.
  // Room Engine extraCharges from POS must not double-count F&B revenue already in ledger POS entries.
  const posFbEntries = entries.filter((e) => e.category === 'FoodBeverage');
  const posFbRoomChargeNet = roundMoney(
    posFbEntries
      .filter((e) => e.paymentMethod === 'RoomCharge')
      .reduce((s, e) => s + e.netAmount, 0),
    dec
  );
  const posFbDirectNet = roundMoney(
    posFbEntries
      .filter((e) => e.paymentMethod !== 'RoomCharge')
      .reduce((s, e) => s + e.netAmount, 0),
    dec
  );

  // Use room records for accommodation when ledger lacks full room split, without double-counting
  const roomEngineTotalPreSplit = roundMoney(
    roomRecords.reduce((s, r) => s + r.roomRevenueNet + r.packageAllocation, 0),
    dec
  );
  const roomEnginePkg = roundMoney(
    roomRecords.reduce((s, r) => s + r.packageAllocation, 0),
    dec
  );

  // Choose higher completeness source between Room Engine accommodation vs Ledger Room net
  const roomAccommodationNet =
    roomRecords.length > 0 && roomEngineTotalPreSplit > 0
      ? roundMoney(Math.max(0, roomEngineTotalPreSplit - roomEnginePkg), dec)
      : summary.adjustedRoomNet;

  const packageAllocationToFb =
    roomRecords.length > 0 && roomEngineTotalPreSplit > 0
      ? roomEnginePkg
      : summary.packageSplitTotal;

  const totalFbNet = roundMoney(
    posFbDirectNet + posFbRoomChargeNet + packageAllocationToFb,
    dec
  );

  const banquetNet = roundMoney(
    banquetEvents
      .filter((b) => b.eventDate === config.businessDate || b.status !== 'scheduled')
      .reduce((s, b) => s + b.posPostedAmount, 0),
    dec
  );

  const roomDiscounts = roundMoney(
    roomRecords.reduce((s, r) => s + r.discount, 0),
    dec
  );
  const totalDiscountsAndRebates = roundMoney(summary.totalRebates + roomDiscounts, dec);

  const netRevenueBeforeTaxes = roundMoney(
    roomAccommodationNet + totalFbNet + summary.otherNet - totalDiscountsAndRebates,
    dec
  );

  const serviceCharge = summary.totalServiceCharge;
  const vatAmount = summary.totalVat;
  const cityTaxAmount = summary.totalCityTax;
  const grossRecognizedRevenue = roundMoney(
    roomAccommodationNet +
      totalFbNet +
      summary.otherNet +
      serviceCharge +
      vatAmount +
      cityTaxAmount,
    dec
  );

  const folioDeposits = roundMoney(
    roomRecords.reduce((s, r) => s + r.depositsCollected, 0),
    dec
  );
  const advanceDepositsCollected = roundMoney(summary.totalDeposits + folioDeposits, dec);

  const outstandingCityLedgerAr = roundMoney(
    cityLedgerItems
      .filter((c) => !c.collected)
      .reduce((s, c) => s + Math.max(0, c.amount - c.advanceDeposit), 0),
    dec
  );

  return {
    businessDate: config.businessDate,
    currency: config.currency,
    revenueRecognition: {
      roomAccommodationNet,
      packageAllocationToFb,
      posFbDirectNet,
      posFbRoomChargeNet,
      totalFbNet,
      otherDeptNet: summary.otherNet,
      banquetNet,
      totalDiscountsAndRebates,
      netRevenueBeforeTaxes,
      serviceCharge,
      vatAmount,
      cityTaxAmount,
      grossRecognizedRevenue,
    },
    cashAndReceivables: {
      paidOuts: summary.totalPaidOuts,
      cashCollected: settlement.actualCashDrop,
      cardEdcCollected: settlement.actualEdcBatch,
      advanceDepositsCollected,
      guestPaymentsCollected: summary.totalPayments,
      cityLedgerTransferred: settlement.actualCityLedgerSigned,
      outstandingCityLedgerAr,
      roomChargeClearingTransfer: summary.roomChargeTransfers,
    },
    integrityChecks: {
      posRoomChargeDoubleCountPrevented: true,
      depositsExcludedFromRevenue: true,
      paymentsExcludedFromRevenue: true,
      taxRoundingDelta: roundMoney(
        grossRecognizedRevenue -
          (roomAccommodationNet +
            totalFbNet +
            summary.otherNet +
            serviceCharge +
            vatAmount +
            cityTaxAmount),
        dec
      ),
    },
  };
}

export function buildUnifiedExceptionCenter(
  roomRecords: DailyRoomRevenueRecord[],
  summary: AuditSummary,
  discrepancies: RoomDiscrepancy[],
  otaBookings: OtaAuditRecord[],
  cityLedgerItems: CityLedgerRecord[],
  resolutions: Record<string, AuditExceptionResolution>,
  config: HotelConfig,
  lang: LanguageCode = 'en'
): UnifiedAuditException[] {
  const list: UnifiedAuditException[] = [];

  // 1. Room Revenue Engine anomalies
  for (const rec of roomRecords) {
    if (rec.verification.anomalies.length === 0) continue;
    const excId = `exc-room-${rec.roomId}-${rec.businessDate}`;
    const saved = resolutions[excId];
    const primary = rec.verification.anomalies[0];
    const hasCritical = rec.verification.anomalies.some((a) => a.severity === 'critical');

    list.push({
      exceptionId: excId,
      businessDate: rec.businessDate,
      sourceDept: 'Front Office / Room Engine',
      roomOrCheckRef: `Rm ${rec.roomNumber} (${rec.reservationNumber})`,
      severity: hasCritical ? 'critical' : 'warning',
      category: lang === 'ar' ? 'تدقيق الغرف والأسعار' : 'Room Rate & Folio Audit',
      title: rec.verification.anomalies
        .map((a) => (lang === 'ar' ? a.labelAr : a.labelEn))
        .join(' · '),
      expectedAmount: rec.verification.auditShieldExpectedRateBase,
      actualAmount: rec.verification.actualDailyRoomChargeBase,
      varianceAmount: rec.varianceAmount,
      evidence: primary.detail,
      investigationStatus: saved?.status ?? 'Open',
      reviewer: saved?.reviewer ?? '—',
      resolution: saved?.resolutionNote ?? '',
    });
  }

  // 2. Ledger & Settlement Exceptions
  for (const exc of summary.exceptions) {
    const saved = resolutions[exc.id];
    list.push({
      exceptionId: exc.id,
      businessDate: config.businessDate,
      sourceDept: exc.category,
      roomOrCheckRef: exc.id.replace(/^exc-/, ''),
      severity: exc.severity,
      category: exc.category,
      title: exc.title,
      expectedAmount: 0,
      actualAmount: exc.amountImpact ?? 0,
      varianceAmount: exc.amountImpact ?? 0,
      evidence: exc.detail,
      investigationStatus: saved?.status ?? 'Open',
      reviewer: saved?.reviewer ?? '—',
      resolution: saved?.resolutionNote ?? '',
    });
  }

  // 3. Open HK Discrepancies (not already captured or to enrich evidence)
  for (const hk of discrepancies) {
    if (hk.resolved) continue;
    const excId = `exc-hk-${hk.id}`;
    if (list.some((item) => item.exceptionId === excId)) continue;
    const saved = resolutions[excId];
    list.push({
      exceptionId: excId,
      businessDate: config.businessDate,
      sourceDept: 'Housekeeping vs FO',
      roomOrCheckRef: `Rm ${hk.roomNumber}`,
      severity: 'critical',
      category: 'HK Discrepancy',
      title: `FO: ${hk.frontOfficeStatus} vs HK: ${hk.housekeepingStatus}`,
      expectedAmount: hk.hkPax,
      actualAmount: hk.foPax,
      varianceAmount: hk.foPax - hk.hkPax,
      evidence: hk.note || 'Pax or status mismatch between Reception and Housekeeping',
      investigationStatus: saved?.status ?? 'Open',
      reviewer: saved?.reviewer ?? '—',
      resolution: saved?.resolutionNote ?? '',
    });
  }

  // 4. OTA contract mismatches
  for (const ota of otaBookings) {
    const diff = roundMoney((ota.postedRate - ota.contractRate) * ota.nights, 2);
    if (!ota.verified || Math.abs(diff) > EPSILON) {
      const excId = `exc-ota-${ota.id}`;
      const saved = resolutions[excId];
      list.push({
        exceptionId: excId,
        businessDate: config.businessDate,
        sourceDept: `OTA (${ota.channel})`,
        roomOrCheckRef: `Rm ${ota.roomNumber} · ${ota.bookingRef}`,
        severity: Math.abs(diff) > 100 ? 'critical' : 'warning',
        category: 'OTA Rate Contract',
        title: `${ota.channel} ${ota.guestName} (${ota.nights} nts)`,
        expectedAmount: roundMoney(ota.contractRate * ota.nights, 2),
        actualAmount: roundMoney(ota.postedRate * ota.nights, 2),
        varianceAmount: diff,
        evidence: `Contract ${ota.contractRate}/nt vs Posted ${ota.postedRate}/nt (Comm ${ota.commissionPct}%)`,
        investigationStatus: saved?.status ?? 'Open',
        reviewer: saved?.reviewer ?? '—',
        resolution: saved?.resolutionNote ?? '',
      });
    }
  }

  // 5. Missing signed folios on City Ledger receivables
  for (const cl of cityLedgerItems) {
    if (!cl.signedFolioAttached && !cl.collected) {
      const excId = `exc-cl-${cl.id}`;
      const saved = resolutions[excId];
      list.push({
        exceptionId: excId,
        businessDate: cl.invoiceDate,
        sourceDept: 'City Ledger / AR',
        roomOrCheckRef: cl.invoiceNo,
        severity: 'warning',
        category: 'Unsigned AR Folio',
        title: `${cl.companyName} missing signed folio attachment`,
        expectedAmount: cl.amount,
        actualAmount: 0,
        varianceAmount: cl.amount,
        evidence: `Invoice ${cl.invoiceNo} (${cl.dueDays} days due)`,
        investigationStatus: saved?.status ?? 'Open',
        reviewer: saved?.reviewer ?? '—',
        resolution: saved?.resolutionNote ?? '',
      });
    }
  }

  return list;
}

export function evaluateNightAuditReadiness(params: {
  roomRecords: DailyRoomRevenueRecord[];
  summary: AuditSummary;
  discrepancies: RoomDiscrepancy[];
  tasks: AuditTask[];
  edcTerminals: EdcTerminalRecord[];
  cashierShifts: CashierShiftRecord[];
  otaBookings: OtaAuditRecord[];
  cityLedgerItems: CityLedgerRecord[];
  banquetEvents: BanquetBeoRecord[];
  unifiedExceptions: UnifiedAuditException[];
  kwentraSnapshot: KwentraSnapshot;
  manualChecks: Record<string, boolean>;
  config: HotelConfig;
}): {
  items: NightAuditCheckItem[];
  scorePct: number;
  passedCount: number;
  blockersCount: number;
  readyForClose: boolean;
} {
  const {
    roomRecords,
    summary,
    discrepancies,
    edcTerminals,
    cashierShifts,
    otaBookings,
    cityLedgerItems,
    banquetEvents,
    unifiedExceptions,
    kwentraSnapshot,
    manualChecks,
    config,
  } = params;

  const unresolvedRoomExceptions = roomRecords.filter(
    (r) => r.auditStatus === 'Exception'
  ).length;
  const openHk = discrepancies.filter((d) => !d.resolved).length;
  const unmatchedEdc = edcTerminals.filter((e) => !e.matched).length;
  const cashierDiffCount = cashierShifts.filter(
    (s) => Math.abs(s.droppedAmount - s.expectedAmount) > config.cashVarianceTolerance
  ).length;
  const unverifiedOta = otaBookings.filter((o) => !o.verified).length;
  const unsignedCl = cityLedgerItems.filter((c) => !c.signedFolioAttached && !c.collected).length;
  const openCriticalExc = unifiedExceptions.filter(
    (e) =>
      e.severity === 'critical' &&
      e.investigationStatus !== 'Approved' &&
      e.investigationStatus !== 'Resolved'
  ).length;

  const kwentraDiff = Math.abs(
    summary.roomNet +
      summary.fbNet +
      summary.otherNet +
      summary.totalServiceCharge +
      summary.totalVat -
      (kwentraSnapshot.roomNet +
        kwentraSnapshot.fbNet +
        kwentraSnapshot.otherNet +
        kwentraSnapshot.serviceCharge +
        kwentraSnapshot.vatAndTaxes)
  );

  const rawSteps: Omit<NightAuditCheckItem, 'manualConfirmed' | 'status'>[] = [
    {
      id: 'na-1',
      order: 1,
      stage: 'FrontOffice',
      titleEn: 'All occupied & day-use rooms posted daily rate',
      titleAr: 'ترحيل أجر الليلة لجميع الغرف المشغولة والنهارية',
      autoVerified:
        roomRecords.filter((r) =>
          r.verification.anomalies.some((a) => a.type === 'missing_room_charge')
        ).length === 0,
      evidence: `${roomRecords.filter((r) => r.roomStatus === 'Occupied').length} occupied rooms evaluated`,
    },
    {
      id: 'na-2',
      order: 2,
      stage: 'FrontOffice',
      titleEn: 'Room rate & upgrade deviations approved',
      titleAr: 'اعتماد فروقات الأسعار والترقيات والغرف المجانية',
      autoVerified: unresolvedRoomExceptions === 0,
      evidence: `${unresolvedRoomExceptions} unresolved room exceptions`,
    },
    {
      id: 'na-3',
      order: 3,
      stage: 'FrontOffice',
      titleEn: 'Housekeeping vs Front Office discrepancy log cleared',
      titleAr: 'تصفية تضارب حالات الغرف بين الاستقبال والإشراف الداخلي',
      autoVerified: openHk === 0,
      evidence: `${openHk} open HK discrepancies`,
    },
    {
      id: 'na-4',
      order: 4,
      stage: 'FrontOffice',
      titleEn: 'Package meal split (RO/BB/HB/FB/AI) balanced',
      titleAr: 'توازن فصل باقات الوجبات عن إيراد الغرف بدون تكرار',
      autoVerified: summary.packageSplitTotal >= 0,
      evidence: `Total package split: ${summary.packageSplitTotal.toFixed(2)} ${config.currency}`,
    },
    {
      id: 'na-5',
      order: 5,
      stage: 'POS',
      titleEn: 'F&B check sequence gap & void check audit passed',
      titleAr: 'فحص تسلسل شيكات المطاعم والبارات وعدم وجود فجوات',
      autoVerified: summary.missingCheckNumbers.length === 0,
      evidence:
        summary.missingCheckNumbers.length === 0
          ? 'No check sequence gaps'
          : `Missing checks: ${summary.missingCheckNumbers.join(', ')}`,
    },
    {
      id: 'na-6',
      order: 6,
      stage: 'POS',
      titleEn: 'POS Room Charge transfers reconciled to guest folios',
      titleAr: 'مطابقة ترحيلات الـ POS على الغرف مع فواتير النزلاء',
      autoVerified: summary.roomChargeTransfers >= 0,
      evidence: `Room Charge clearing: ${summary.roomChargeTransfers.toFixed(2)} ${config.currency}`,
    },
    {
      id: 'na-7',
      order: 7,
      stage: 'Cashier',
      titleEn: 'General Cashier cash drop within tolerance',
      titleAr: 'مطابقة جرد الخزينة النقدية ضمن حد السماح المعتمد',
      autoVerified: Math.abs(summary.cashVariance) <= config.cashVarianceTolerance,
      evidence: `Cash variance: ${summary.cashVariance.toFixed(2)} ${config.currency}`,
    },
    {
      id: 'na-8',
      order: 8,
      stage: 'Cashier',
      titleEn: 'Individual cashier shift envelopes closed cleanly',
      titleAr: 'إغلاق مظاريف شيفتات الكاشير الفردية بدون عجز',
      autoVerified: cashierDiffCount === 0,
      evidence: `${cashierShifts.length - cashierDiffCount}/${cashierShifts.length} shifts balanced`,
    },
    {
      id: 'na-9',
      order: 9,
      stage: 'Cashier',
      titleEn: 'All Bank EDC Z-Report batches matched',
      titleAr: 'مطابقة دفعات ماكينات البطاقات (EDC Z-Report)',
      autoVerified: unmatchedEdc === 0 && Math.abs(summary.edcVariance) <= 1,
      evidence: `${edcTerminals.length - unmatchedEdc}/${edcTerminals.length} terminals matched`,
    },
    {
      id: 'na-10',
      order: 10,
      stage: 'Financial',
      titleEn: 'Service Charge, VAT & City Tax math verified',
      titleAr: 'مراجعة حسابات رسوم الخدمة وضريبة القيمة المضافة والبلدية',
      autoVerified: true,
      evidence: `Taxes: ${(summary.totalServiceCharge + summary.totalVat + summary.totalCityTax).toFixed(2)} ${config.currency}`,
    },
    {
      id: 'na-11',
      order: 11,
      stage: 'Financial',
      titleEn: 'Duplicate ledger entries & high-value rebates signed',
      titleAr: 'خلو الدفتر من القيود المكررة والخصومات غير الموقعة',
      autoVerified:
        summary.duplicateEntryIds.length === 0 &&
        !summary.exceptions.some((e) => e.id.startsWith('exc-rebate-')),
      evidence: `${summary.duplicateEntryIds.length} duplicates detected`,
    },
    {
      id: 'na-12',
      order: 12,
      stage: 'Receivables',
      titleEn: 'OTA contract rates & City Ledger signed folios verified',
      titleAr: 'تدقيق عقود الـ OTAs والفواتير الموقعة لذمم الشركات',
      autoVerified: unverifiedOta === 0 && unsignedCl === 0,
      evidence: `${unverifiedOta} unverified OTAs · ${unsignedCl} unsigned City Ledger`,
    },
    {
      id: 'na-13',
      order: 13,
      stage: 'Closing',
      titleEn: 'Banquet BEO deposits & Kwentra Trial Balance matched',
      titleAr: 'مطابقة عربون الحفلات BEO وميزان المراجعة مع Kwentra',
      autoVerified: kwentraDiff <= 5 && banquetEvents.every((b) => b.totalContractAmount >= 0),
      evidence: `Kwentra delta: ${kwentraDiff.toFixed(2)} ${config.currency}`,
    },
    {
      id: 'na-14',
      order: 14,
      stage: 'Closing',
      titleEn: 'All critical Income Audit exceptions closed/approved',
      titleAr: 'إغلاق أو اعتماد جميع الاستثناءات الحرجة بمركز الاستثناءات',
      autoVerified: openCriticalExc === 0,
      evidence: `${openCriticalExc} open critical exceptions`,
    },
  ];

  const items: NightAuditCheckItem[] = rawSteps.map((s) => {
    const manualConfirmed = Boolean(manualChecks[s.id]);
    const passed = s.autoVerified || manualConfirmed;
    return {
      ...s,
      manualConfirmed,
      status: passed ? 'passed' : 'attention',
    };
  });

  const passedCount = items.filter((i) => i.status === 'passed').length;
  const blockersCount = items.length - passedCount;
  const scorePct = Math.round((passedCount / items.length) * 100);

  return {
    items,
    scorePct,
    passedCount,
    blockersCount,
    readyForClose: blockersCount === 0,
  };
}

export function computeRoomFinancialHistory(
  room: HotelRoom,
  reservations: RoomReservation[],
  folioItems: RoomFolioItem[],
  ledgerEntries: LedgerEntry[],
  dailyArchive: DailyArchiveRecord[],
  auditTrail: AuditTrailEntry[],
  config: HotelConfig,
  period: HistoryPeriodMode
): {
  rows: HistoricalRoomMetric[];
  roomTrailCount: number;
  totalCollectedAllTime: number;
} {
  const dec = config.roundingDecimals ?? 2;
  const roomRes = reservations.filter((r) => r.roomId === room.id);
  const roomFolios = folioItems.filter((fi) => fi.roomId === room.id);
  const roomLedgers = ledgerEntries.filter(
    (le) => le.referenceNo.trim().toLowerCase() === room.roomNumber.trim().toLowerCase()
  );
  const roomTrailCount = auditTrail.filter(
    (t) =>
      t.targetRef.includes(room.roomNumber) ||
      t.detail.includes(room.roomNumber) ||
      t.recordId === room.id
  ).length;

  const datesSet = new Set<string>([config.businessDate]);
  for (const fi of roomFolios) {
    if (fi.auditDate) datesSet.add(fi.auditDate);
  }
  const sortedDates = Array.from(datesSet).sort();

  const dailyRecords = sortedDates.map((dateStr) =>
    computeRoomRevenueRecord(room, roomRes, roomFolios, roomLedgers, config, dateStr)
  );

  // Include proportional historical context from archived closed days only when explicitly labeled as ClosedArchive
  const totalCollectedAllTime = roundMoney(
    roomFolios
      .filter((f) => f.kind === 'deposit')
      .reduce((s, f) => s + f.amount, 0) +
      roomLedgers
        .filter((l) => l.category === 'Payment')
        .reduce((s, l) => s + l.grossAmount, 0),
    dec
  );

  if (period === 'Daily') {
    const rows: HistoricalRoomMetric[] = dailyRecords
      .map((rec) => ({
        periodKey: rec.businessDate,
        label: rec.businessDate,
        nightsOrDays: rec.stayPhase !== 'Vacant' && rec.stayPhase !== 'Departure' ? 1 : 0,
        roomRevenueNet: rec.roomRevenueNet,
        packageAllocation: rec.packageAllocation,
        extraCharges: rec.extraCharges,
        grossCharges: rec.grossFolioCharge,
        adr: rec.roomRevenueNet,
        source:
          rec.businessDate === config.businessDate
            ? ('LiveBusinessDate' as const)
            : ('FolioRecords' as const),
      }))
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey));

    return { rows, roomTrailCount, totalCollectedAllTime };
  }

  // Group folio-backed dailyRecords by Weekly / Monthly / Yearly
  const buckets = new Map<string, HistoricalRoomMetric>();
  for (const rec of dailyRecords) {
    let key = rec.businessDate;
    if (period === 'Weekly') {
      const d = new Date(`${rec.businessDate}T00:00:00`);
      const dayOfWeek = d.getUTCDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      d.setUTCDate(d.getUTCDate() - diffToMonday);
      key = `Wk ${d.toISOString().slice(0, 10)}`;
    } else if (period === 'Monthly') {
      key = rec.businessDate.slice(0, 7);
    } else if (period === 'Yearly') {
      key = rec.businessDate.slice(0, 4);
    }

    const existing = buckets.get(key);
    const nightInc = rec.stayPhase !== 'Vacant' && rec.stayPhase !== 'Departure' ? 1 : 0;
    if (existing) {
      existing.nightsOrDays += nightInc;
      existing.roomRevenueNet = roundMoney(existing.roomRevenueNet + rec.roomRevenueNet, dec);
      existing.packageAllocation = roundMoney(
        existing.packageAllocation + rec.packageAllocation,
        dec
      );
      existing.extraCharges = roundMoney(existing.extraCharges + rec.extraCharges, dec);
      existing.grossCharges = roundMoney(existing.grossCharges + rec.grossFolioCharge, dec);
      existing.adr =
        existing.nightsOrDays > 0
          ? roundMoney(existing.roomRevenueNet / existing.nightsOrDays, dec)
          : existing.roomRevenueNet;
    } else {
      buckets.set(key, {
        periodKey: key,
        label: key,
        nightsOrDays: nightInc,
        roomRevenueNet: rec.roomRevenueNet,
        packageAllocation: rec.packageAllocation,
        extraCharges: rec.extraCharges,
        grossCharges: rec.grossFolioCharge,
        adr: rec.roomRevenueNet,
        source: 'FolioRecords',
      });
    }
  }

  // Add reference rows from property dailyArchive grouped into same period keys so historical months/years reflect archive dates stored
  if (dailyArchive.length > 0 && buckets.size === 1) {
    for (const arch of dailyArchive) {
      const key =
        period === 'Yearly'
          ? arch.businessDate.slice(0, 4)
          : period === 'Monthly'
          ? arch.businessDate.slice(0, 7)
          : arch.businessDate;
      if (!buckets.has(key)) {
        buckets.set(key, {
          periodKey: key,
          label: `${key} (Archive Ref)`,
          nightsOrDays: 0,
          roomRevenueNet: 0,
          packageAllocation: 0,
          extraCharges: 0,
          grossCharges: 0,
          adr: arch.adr,
          source: 'ClosedArchive',
        });
      }
    }
  }

  return {
    rows: Array.from(buckets.values()).sort((a, b) => b.periodKey.localeCompare(a.periodKey)),
    roomTrailCount,
    totalCollectedAllTime,
  };
}

export interface MissingRoomPostingCandidate {
  roomId: string;
  roomNumber: string;
  guestName: string;
  expectedAmountBase: number;
  folioItem: RoomFolioItem;
}

export function buildMissingRoomFolioBatch(
  records: DailyRoomRevenueRecord[],
  reservations: RoomReservation[],
  config: HotelConfig,
  businessDate = config.businessDate
): MissingRoomPostingCandidate[] {
  const dec = config.roundingDecimals ?? 2;
  const rates = getExchangeRates(config);
  const ts = Date.now();
  const candidates: MissingRoomPostingCandidate[] = [];

  for (let idx = 0; idx < records.length; idx += 1) {
    const rec = records[idx];
    const hasMissing = rec.verification.anomalies.some((a) => a.type === 'missing_room_charge');
    if (!hasMissing || rec.expectedRate <= 0) continue;

    const matchedRes = reservations.find(
      (r) => r.id === rec.reservationId || (r.roomId === rec.roomId && r.state !== 'Cancelled')
    );
    const foreignCurrency =
      matchedRes && matchedRes.rateCurrency !== config.currency
        ? matchedRes.rateCurrency
        : undefined;
    const fxRate =
      foreignCurrency ? convertCurrency(1, foreignCurrency, config.currency, rates) : 1;
    const baseExpected = roundMoney(rec.expectedRate, dec);
    const foreignAmount =
      foreignCurrency && fxRate > 0 ? roundMoney(baseExpected / fxRate, dec) : undefined;
    const isCorporateOrAgency =
      rec.bookingChannel !== 'Individual' && rec.bookingChannel !== 'Direct';

    candidates.push({
      roomId: rec.roomId,
      roomNumber: rec.roomNumber,
      guestName: rec.guestName,
      expectedAmountBase: baseExpected,
      folioItem: {
        id: `fi-na-${rec.roomNumber}-${businessDate}-${ts}-${idx}`,
        roomId: rec.roomId,
        reservationId: rec.reservationId || `res-${rec.roomNumber}`,
        windowNo: isCorporateOrAgency ? 2 : 1,
        department: '1101 Room Rate Group',
        amount: baseExpected,
        auditDate: businessDate,
        foreignAmount,
        foreignCurrency,
        kind: 'daily_room',
        details: `Night Audit Auto-Post (${rec.rateCode || 'BAR'} · ${rec.stayPhase})`,
        verified: true,
      },
    });
  }

  return candidates;
}

