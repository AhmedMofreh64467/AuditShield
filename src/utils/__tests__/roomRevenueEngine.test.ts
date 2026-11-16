import { describe, expect, it } from 'vitest';
import {
  buildConsolidatedFinancialStatement,
  buildMissingRoomFolioBatch,
  buildUnifiedExceptionCenter,
  computeAllRoomsRevenueReport,
  computeRoomFinancialHistory,
  computeRoomRevenueRecord,
  evaluateNightAuditReadiness,
} from '../roomRevenueEngine';
import { computeAuditSummary } from '../auditEngine';
import {
  CashSettlement,
  HotelConfig,
  HotelRoom,
  LedgerEntry,
  RoomFolioItem,
  RoomReservation,
} from '../../types/audit';

const testConfig: HotelConfig = {
  propertyId: 'grand-nile',
  hotelName: 'Grand Nile Horizon Hotel',
  businessDate: '2026-11-15',
  currency: 'EGP',
  serviceChargePct: 12,
  vatPct: 14,
  cityTaxPct: 1,
  taxInclusive: false,
  roundingDecimals: 2,
  discountBeforeTax: true,
  extraPersonFee: 500,
  lateCheckoutFeePct: 50,
  minRoomRate: 1500,
  rebateApprovalLimit: 500,
  cashVarianceTolerance: 50,
  outlets: ['Front Office', 'Main Restaurant'],
  defaultBreakfastSplitPerPax: 250,
  packageAllocationRules: {
    breakfastPerPax: 250,
    lunchPerPax: 300,
    dinnerPerPax: 350,
    otherPerPax: 0,
    allInclusiveBeveragePerPax: 200,
  },
  exchangeRates: {
    EGP: 1,
    USD: 50,
    EUR: 55,
    SAR: 13.3,
  },
};

const settlement: CashSettlement = {
  actualCashDrop: 1000,
  actualEdcBatch: 2000,
  actualCityLedgerSigned: 0,
  generalCashierName: 'Ahmed Mofrah',
  shiftNote: '',
};

describe('roomRevenueEngine end-to-end daily hotel audit tests', () => {
  const occupiedRoom: HotelRoom = {
    id: 'rm-101',
    roomNumber: '101',
    floor: '1',
    roomType: 'Deluxe Nile View',
    baseRate: 5000,
    maxOccupancy: 2,
    status: 'Occupied',
    guestName: 'Giorgio Vacca',
  };

  it('handles Arrival/Stayover occupied rooms, EUR conversion, package split, and posted rate verification', () => {
    const res: RoomReservation = {
      id: '29239',
      roomId: 'rm-101',
      confirmationNo: 'i-000029239',
      primaryGuest: 'Giorgio Vacca',
      otherGuests: [],
      nationality: 'IT',
      arrival: '2026-11-14',
      departure: '2026-11-20',
      checkInTime: '02:00 pm',
      checkOutTime: '12:00 pm',
      channel: 'Individual',
      adults: 2,
      children: 0,
      roomType: 'Deluxe Nile View',
      roomTypeToCharge: 'Deluxe Nile View',
      rateCode: 'EUR BB',
      boardType: 'BB',
      rateAmount: 100,
      contractedRate: 100,
      approvedRate: 100,
      rateCurrency: 'EUR',
      manualRate: false,
      state: 'CheckedIn',
      openedToPos: true,
      folioLocked: false,
      sendBillOnCheckout: false,
      alerts: [],
      window2Label: 'Company',
      notes: '',
    };

    const folio: RoomFolioItem[] = [
      {
        id: 'fi-101-room',
        roomId: 'rm-101',
        reservationId: '29239',
        windowNo: 1,
        department: '1101 Room Rate Group',
        amount: 5500,
        auditDate: '2026-11-15',
        verified: true,
        kind: 'daily_room',
      },
    ];

    const record = computeRoomRevenueRecord(occupiedRoom, [res], folio, [], testConfig);
    expect(record.stayPhase).toBe('Stayover');
    expect(record.contractedRate).toBe(5500);
    expect(record.actualPostedRate).toBe(5500);
    expect(record.packageAllocation).toBe(500);
    expect(record.roomRevenueNet).toBe(5000);
    expect(record.varianceAmount).toBe(0);
    expect(record.auditStatus).toBe('Matched');
  });

  it('does NOT charge nightly rate on Departure day unless Late Checkout applies', () => {
    const resDeparture: RoomReservation = {
      id: 'res-dep',
      roomId: 'rm-101',
      confirmationNo: 'i-dep',
      primaryGuest: 'Checkout Guest',
      otherGuests: [],
      nationality: 'EG',
      arrival: '2026-11-12',
      departure: '2026-11-15',
      checkInTime: '02:00 pm',
      checkOutTime: '12:00 pm',
      channel: 'Individual',
      adults: 2,
      children: 0,
      roomType: 'Deluxe Nile View',
      roomTypeToCharge: 'Deluxe Nile View',
      rateCode: 'BAR',
      boardType: 'RO',
      rateAmount: 3000,
      rateCurrency: 'EGP',
      manualRate: false,
      state: 'CheckedIn',
      openedToPos: true,
      folioLocked: false,
      sendBillOnCheckout: false,
      alerts: [],
      window2Label: 'Company',
      notes: '',
    };

    const normalDep = computeRoomRevenueRecord(occupiedRoom, [resDeparture], [], [], testConfig);
    expect(normalDep.stayPhase).toBe('Departure');
    expect(normalDep.expectedRate).toBe(0);
    expect(normalDep.grossFolioCharge).toBe(0);

    const lateDep = computeRoomRevenueRecord(
      occupiedRoom,
      [{ ...resDeparture, isLateCheckout: true }],
      [],
      [],
      testConfig
    );
    expect(lateDep.stayPhase).toBe('Departure');
    expect(lateDep.expectedRate).toBe(1500);
  });

  it('detects duplicate daily room postings, unauthorized complimentary rooms, FX mismatch, and rate mismatches', () => {
    const compRoom: HotelRoom = {
      id: 'rm-102',
      roomNumber: '102',
      floor: '1',
      roomType: 'Junior Suite',
      baseRate: 4000,
      maxOccupancy: 2,
      status: 'Complimentary',
      guestName: 'VIP Guest',
    };
    const compRes: RoomReservation = {
      id: 'res-comp',
      roomId: 'rm-102',
      confirmationNo: 'i-comp',
      primaryGuest: 'VIP Guest',
      otherGuests: [],
      nationality: 'EG',
      arrival: '2026-11-15',
      departure: '2026-11-17',
      checkInTime: '02:00 pm',
      checkOutTime: '12:00 pm',
      channel: 'Direct',
      adults: 2,
      children: 0,
      roomType: 'Junior Suite',
      roomTypeToCharge: 'Junior Suite',
      rateCode: 'COMP',
      boardType: 'RO',
      rateAmount: 0,
      contractedRate: 4000,
      rateCurrency: 'EGP',
      manualRate: true,
      state: 'CheckedIn',
      openedToPos: true,
      folioLocked: false,
      sendBillOnCheckout: false,
      alerts: [],
      window2Label: 'Company',
      notes: '',
    };
    const compRec = computeRoomRevenueRecord(compRoom, [compRes], [], [], testConfig);
    expect(compRec.verification.anomalies.some((a) => a.type === 'unauthorized_complimentary')).toBe(
      true
    );
    expect(compRec.auditStatus).toBe('Exception');

    // Duplicate daily posting + FX mismatch on Room 101
    const dupFolios: RoomFolioItem[] = [
      {
        id: 'f1',
        roomId: 'rm-101',
        reservationId: 'r1',
        windowNo: 1,
        department: '1101 Room Rate',
        amount: 3000,
        auditDate: '2026-11-15',
        verified: false,
        kind: 'daily_room',
      },
      {
        id: 'f2',
        roomId: 'rm-101',
        reservationId: 'r1',
        windowNo: 1,
        department: '1101 Room Rate',
        amount: 3000,
        foreignCurrency: 'USD',
        foreignAmount: 100, // expected 5000, posted 3000
        auditDate: '2026-11-15',
        verified: false,
        kind: 'daily_room',
      },
    ];
    const stayRes: RoomReservation = {
      ...compRes,
      id: 'r1',
      roomId: 'rm-101',
      rateAmount: 3000,
      contractedRate: 3000,
      approvedRate: 3000,
      roomType: 'Deluxe Nile View',
      roomTypeToCharge: 'Deluxe Nile View',
    };
    const dupRec = computeRoomRevenueRecord(occupiedRoom, [stayRes], dupFolios, [], testConfig);
    expect(dupRec.verification.anomalies.some((a) => a.type === 'duplicate_daily_posting')).toBe(true);
    expect(dupRec.verification.anomalies.some((a) => a.type === 'fx_conversion_mismatch')).toBe(true);
  });

  it('prevents double counting in consolidated statement and evaluates all 14 Night Audit steps & historical buckets', () => {
    const vcRoom: HotelRoom = {
      id: 'rm-103',
      roomNumber: '103',
      floor: '1',
      roomType: 'Standard King',
      baseRate: 2500,
      maxOccupancy: 2,
      status: 'VacantClean',
    };
    const entries: LedgerEntry[] = [
      {
        id: 'pos-rc',
        timestamp: '20:00',
        source: 'POS',
        category: 'FoodBeverage',
        outletOrDept: 'Main Restaurant',
        referenceNo: 'CHK-501',
        guestOrDescription: 'Dinner Rm 101',
        netAmount: 1000,
        serviceCharge: 120,
        vatAmount: 156.8,
        cityTaxAmount: 11.2,
        grossAmount: 1288,
        paymentMethod: 'RoomCharge',
        approvedBy: 'Cashier',
        reconciled: true,
      },
    ];

    const summary = computeAuditSummary(entries, settlement, [], testConfig, 'en');
    const report = computeAllRoomsRevenueReport([occupiedRoom, vcRoom], [], [], entries, testConfig);
    expect(report.totals.totalRooms).toBe(2);
    expect(report.totals.occupiedRooms).toBe(1);

    const consolidated = buildConsolidatedFinancialStatement(
      entries,
      report.records,
      [],
      [],
      summary,
      settlement,
      testConfig
    );
    expect(consolidated.integrityChecks.posRoomChargeDoubleCountPrevented).toBe(true);
    expect(consolidated.integrityChecks.depositsExcludedFromRevenue).toBe(true);
    expect(consolidated.integrityChecks.paymentsExcludedFromRevenue).toBe(true);

    const exceptions = buildUnifiedExceptionCenter(
      report.records,
      summary,
      [],
      [],
      [],
      {},
      testConfig,
      'en'
    );
    const na = evaluateNightAuditReadiness({
      roomRecords: report.records,
      summary,
      discrepancies: [],
      tasks: [],
      edcTerminals: [],
      cashierShifts: [],
      otaBookings: [],
      cityLedgerItems: [],
      banquetEvents: [],
      unifiedExceptions: exceptions,
      kwentraSnapshot: {
        roomNet: summary.roomNet,
        fbNet: summary.fbNet,
        otherNet: summary.otherNet,
        serviceCharge: summary.totalServiceCharge,
        vatAndTaxes: summary.totalVat,
        rebates: 0,
        paidOuts: 0,
        cash: 0,
        creditCard: 0,
        cityLedger: 0,
        roomCharge: summary.roomChargeTransfers,
        lastUpdated: '2026-11-15',
        reportRef: 'KW-1',
        note: 'Verified test snapshot',
      },
      manualChecks: {},
      config: testConfig,
    });
    expect(na.items).toHaveLength(14);

    const hist = computeRoomFinancialHistory(occupiedRoom, [], [], [], [], [], testConfig, 'Daily');
    expect(hist.rows.length).toBeGreaterThanOrEqual(1);
    expect(hist.rows[0].periodKey).toBe('2026-11-15');
  });

  it('detects unposted daily room charges, generates batch folio postings, and supports All Inclusive (AI) breakdown', () => {
    const aiRes: RoomReservation = {
      id: 'res-ai-1',
      roomId: 'rm-101',
      confirmationNo: 'i-ai-1',
      primaryGuest: 'Resort Guest',
      otherGuests: [],
      nationality: 'DE',
      arrival: '2026-11-14',
      departure: '2026-11-18',
      checkInTime: '02:00 pm',
      checkOutTime: '12:00 pm',
      channel: 'TUI',
      adults: 2,
      children: 0,
      roomType: 'Deluxe Nile View',
      roomTypeToCharge: 'Deluxe Nile View',
      rateCode: 'AI EUR',
      boardType: 'AI',
      rateAmount: 100,
      contractedRate: 100,
      approvedRate: 100,
      rateCurrency: 'EUR',
      manualRate: false,
      state: 'CheckedIn',
      openedToPos: true,
      folioLocked: false,
      sendBillOnCheckout: false,
      alerts: [],
      window2Label: 'Agency',
      notes: '',
    };

    // Unposted room night should report actualPostedRate = 0 and missing_room_charge
    const preReport = computeAllRoomsRevenueReport([occupiedRoom], [aiRes], [], [], testConfig);
    expect(preReport.records[0].actualPostedRate).toBe(0);
    expect(
      preReport.records[0].verification.anomalies.some((a) => a.type === 'missing_room_charge')
    ).toBe(true);

    const batch = buildMissingRoomFolioBatch(preReport.records, [aiRes], testConfig);
    expect(batch).toHaveLength(1);
    expect(batch[0].folioItem.kind).toBe('daily_room');
    expect(batch[0].folioItem.amount).toBe(5500);
    expect(batch[0].folioItem.foreignCurrency).toBe('EUR');
    expect(batch[0].folioItem.foreignAmount).toBe(100);

    // After batch posting, anomaly clears and AI package splits meals + beverages cleanly
    const postReport = computeAllRoomsRevenueReport(
      [occupiedRoom],
      [aiRes],
      [batch[0].folioItem],
      [],
      testConfig
    );
    const rec = postReport.records[0];
    expect(rec.auditStatus).toBe('Matched');
    expect(rec.packageBreakdown.mealPlan).toBe('AI');
    expect(rec.packageBreakdown.beverageRevenue).toBe(400);
    expect(rec.packageBreakdown.totalPackageAllocation).toBe(2200);
    expect(rec.packageBreakdown.accommodationRevenue).toBe(3300);
  });
});
