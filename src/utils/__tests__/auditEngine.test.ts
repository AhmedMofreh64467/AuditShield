import { describe, expect, it } from 'vitest';
import {
  calculateTaxes,
  computeAuditSummary,
  computeDetailedPackageSplit,
  convertCurrency,
  detectDuplicateEntries,
  detectMissingCheckNumbers,
  roundMoney,
} from '../auditEngine';
import { CashSettlement, HotelConfig, LedgerEntry } from '../../types/audit';

const baseConfig: HotelConfig = {
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

const emptySettlement: CashSettlement = {
  actualCashDrop: 0,
  actualEdcBatch: 0,
  actualCityLedgerSigned: 0,
  generalCashierName: 'Ahmed Mofrah',
  shiftNote: '',
};

describe('auditEngine core financial & control tests', () => {
  it('rounds money cleanly for 0, 2, and 3 decimal policies', () => {
    expect(roundMoney(123.456, 2)).toBe(123.46);
    expect(roundMoney(123.456, 0)).toBe(123);
    expect(roundMoney(123.4567, 3)).toBe(123.457);
    expect(roundMoney(Number.NaN, 2)).toBe(0);
  });

  it('calculates taxes accurately in exclusive and inclusive modes without rounding drift', () => {
    const excl = calculateTaxes(1000, 'Room', { ...baseConfig, taxInclusive: false });
    expect(excl.netAmount).toBe(1000);
    expect(excl.serviceCharge).toBe(120);
    // taxBase = 1120 -> 14% VAT = 156.8, 1% CityTax = 11.2
    expect(excl.vatAmount).toBe(156.8);
    expect(excl.cityTaxAmount).toBe(11.2);
    expect(excl.grossAmount).toBe(1288);

    const incl = calculateTaxes(1288, 'Room', { ...baseConfig, taxInclusive: true });
    expect(incl.grossAmount).toBe(1288);
    expect(incl.netAmount).toBe(1000);
    expect(
      roundMoney(incl.netAmount + incl.serviceCharge + incl.vatAmount + incl.cityTaxAmount, 2)
    ).toBe(1288);

    // Non-tax categories carry zero service charge, VAT, or city tax
    const depositTax = calculateTaxes(5000, 'Deposit', baseConfig);
    expect(depositTax.serviceCharge).toBe(0);
    expect(depositTax.vatAmount).toBe(0);
    expect(depositTax.grossAmount).toBe(5000);
  });

  it('converts foreign currency amounts accurately into EGP using configured exchange rates', () => {
    const rates = baseConfig.exchangeRates!;
    expect(convertCurrency(100, 'EUR', 'EGP', rates)).toBe(5500);
    expect(convertCurrency(200, 'USD', 'EGP', rates)).toBe(10000);
    expect(convertCurrency(500, 'EGP', 'EGP', rates)).toBe(500);
  });

  it('splits RO / BB / HB / FB packages without double counting and honors the 70% cap', () => {
    const ro = computeDetailedPackageSplit('RO', 2, 3000, baseConfig);
    expect(ro.totalPackageAllocation).toBe(0);
    expect(ro.accommodationRevenue).toBe(3000);

    const bb = computeDetailedPackageSplit('BB', 2, 3000, baseConfig);
    expect(bb.breakfastRevenue).toBe(500);
    expect(bb.totalPackageAllocation).toBe(500);
    expect(bb.accommodationRevenue).toBe(2500);

    const hb = computeDetailedPackageSplit('HB', 2, 3000, baseConfig);
    expect(hb.breakfastRevenue).toBe(500);
    expect(hb.dinnerRevenue).toBe(700);
    expect(hb.totalPackageAllocation).toBe(1200);
    expect(hb.accommodationRevenue).toBe(1800);

    const fbCapped = computeDetailedPackageSplit('FB', 2, 1000, baseConfig);
    // Raw package for 2 pax FB = 500 + 600 + 700 = 1800, capped at 70% of 1000 = 700
    expect(fbCapped.totalPackageAllocation).toBe(700);
    expect(fbCapped.accommodationRevenue).toBe(300);

    const ai = computeDetailedPackageSplit('AI', 2, 4000, baseConfig);
    // 2 pax AI = Breakfast (500) + Lunch (600) + Dinner (700) + Beverages/Snacks (400) = 2200
    expect(ai.breakfastRevenue).toBe(500);
    expect(ai.lunchRevenue).toBe(600);
    expect(ai.dinnerRevenue).toBe(700);
    expect(ai.beverageRevenue).toBe(400);
    expect(ai.totalPackageAllocation).toBe(2200);
    expect(ai.accommodationRevenue).toBe(1800);
  });

  it('excludes Deposit and Payment transactions from recognized revenue while tracking collections', () => {
    const entries: LedgerEntry[] = [
      {
        id: 'e1',
        timestamp: '10:00',
        source: 'PMS',
        category: 'Room',
        outletOrDept: 'Front Office',
        referenceNo: '101',
        guestOrDescription: 'Room Night',
        netAmount: 2000,
        serviceCharge: 240,
        vatAmount: 313.6,
        cityTaxAmount: 22.4,
        grossAmount: 2576,
        paymentMethod: 'RoomCharge',
        approvedBy: 'System',
        reconciled: true,
      },
      {
        id: 'e2',
        timestamp: '11:00',
        source: 'PMS',
        category: 'Deposit',
        outletOrDept: 'Cashier',
        referenceNo: 'DEP-101',
        guestOrDescription: 'Advance Deposit',
        netAmount: 5000,
        serviceCharge: 0,
        vatAmount: 0,
        cityTaxAmount: 0,
        grossAmount: 5000,
        paymentMethod: 'Cash',
        approvedBy: 'FO',
        reconciled: true,
      },
      {
        id: 'e3',
        timestamp: '12:00',
        source: 'PMS',
        category: 'Payment',
        outletOrDept: 'Cashier',
        referenceNo: 'PAY-101',
        guestOrDescription: 'Folio Payment',
        netAmount: 2576,
        serviceCharge: 0,
        vatAmount: 0,
        cityTaxAmount: 0,
        grossAmount: 2576,
        paymentMethod: 'CreditCard',
        approvedBy: 'FO',
        reconciled: true,
      },
    ];

    const summary = computeAuditSummary(entries, { ...emptySettlement, actualCashDrop: 4980 }, [], baseConfig, 'en');
    expect(summary.roomNet).toBe(2000);
    expect(summary.grossRevenue).toBe(2576);
    expect(summary.totalDeposits).toBe(5000);
    expect(summary.totalPayments).toBe(2576);
    expect(summary.expectedCash).toBe(5000);
    expect(summary.cashVariance).toBe(-20);
  });

  it('detects duplicate ledger entries and missing F&B check sequence numbers', () => {
    const baseEntry: LedgerEntry = {
      id: 'fb-1',
      timestamp: '13:00',
      source: 'POS',
      category: 'FoodBeverage',
      outletOrDept: 'Main Restaurant',
      referenceNo: 'CHK-1001',
      guestOrDescription: 'Lunch',
      netAmount: 400,
      serviceCharge: 48,
      vatAmount: 62.72,
      cityTaxAmount: 4.48,
      grossAmount: 515.2,
      paymentMethod: 'Cash',
      approvedBy: '',
      reconciled: false,
    };

    const list: LedgerEntry[] = [
      baseEntry,
      { ...baseEntry, id: 'fb-1-dup' },
      { ...baseEntry, id: 'fb-3', referenceNo: 'CHK-1004', netAmount: 250 },
    ];

    expect(detectDuplicateEntries(list)).toEqual(['fb-1', 'fb-1-dup']);
    expect(detectMissingCheckNumbers(list)).toEqual([1002, 1003]);
  });
});
