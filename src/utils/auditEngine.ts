import { LanguageCode } from '../i18n/translations';
import {
  AuditException,
  AuditSummary,
  CashSettlement,
  CurrencyCode,
  HotelConfig,
  LedgerEntry,
  MealPlan,
  PackageAllocationRules,
  PackageBreakdown,
  RoomDiscrepancy,
} from '../types/audit';

export function roundMoney(amount: number, decimals = 2): number {
  if (!Number.isFinite(amount)) return 0;
  const d = Math.max(0, Math.min(4, Math.floor(decimals)));
  const factor = Math.pow(10, d);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export function getPackageAllocationRules(config: HotelConfig): PackageAllocationRules {
  const breakfast =
    config.packageAllocationRules?.breakfastPerPax ?? config.defaultBreakfastSplitPerPax ?? 250;
  const lunch = config.packageAllocationRules?.lunchPerPax ?? breakfast;
  const dinner = config.packageAllocationRules?.dinnerPerPax ?? breakfast;
  const other = config.packageAllocationRules?.otherPerPax ?? 0;
  const beverage = config.packageAllocationRules?.allInclusiveBeveragePerPax ?? 200;
  return {
    breakfastPerPax: Math.max(0, breakfast),
    lunchPerPax: Math.max(0, lunch),
    dinnerPerPax: Math.max(0, dinner),
    otherPerPax: Math.max(0, other),
    allInclusiveBeveragePerPax: Math.max(0, beverage),
  };
}

export function computeDetailedPackageSplit(
  mealPlan: MealPlan | undefined,
  paxCount: number | undefined,
  roomNetAmount: number,
  config: HotelConfig
): PackageBreakdown {
  const dec = config.roundingDecimals ?? 2;
  const safeNet = Math.max(0, roundMoney(roomNetAmount, dec));
  const plan: MealPlan = mealPlan ?? 'RO';

  if (plan === 'RO' || safeNet <= 0) {
    return {
      mealPlan: plan,
      originalPackageValue: safeNet,
      accommodationRevenue: safeNet,
      breakfastRevenue: 0,
      lunchRevenue: 0,
      dinnerRevenue: 0,
      beverageRevenue: 0,
      otherIncludedServices: 0,
      totalPackageAllocation: 0,
    };
  }

  const pax = Math.max(1, paxCount ?? 1);
  const rules = getPackageAllocationRules(config);

  const rawBreakfast = pax * rules.breakfastPerPax;
  const rawLunch = plan === 'FB' || plan === 'AI' ? pax * rules.lunchPerPax : 0;
  const rawDinner =
    plan === 'HB' || plan === 'FB' || plan === 'AI' ? pax * rules.dinnerPerPax : 0;
  const rawBeverage =
    plan === 'AI' ? pax * (rules.allInclusiveBeveragePerPax ?? 200) : 0;
  const rawOther = pax * rules.otherPerPax;

  const rawTotalPkg = rawBreakfast + rawLunch + rawDinner + rawBeverage + rawOther;
  const maxAllowed = roundMoney(safeNet * 0.7, dec);

  if (rawTotalPkg <= 0) {
    return {
      mealPlan: plan,
      originalPackageValue: safeNet,
      accommodationRevenue: safeNet,
      breakfastRevenue: 0,
      lunchRevenue: 0,
      dinnerRevenue: 0,
      beverageRevenue: 0,
      otherIncludedServices: 0,
      totalPackageAllocation: 0,
    };
  }

  const scale = rawTotalPkg > maxAllowed ? maxAllowed / rawTotalPkg : 1;
  let breakfastRevenue = roundMoney(rawBreakfast * scale, dec);
  let lunchRevenue = roundMoney(rawLunch * scale, dec);
  let dinnerRevenue = roundMoney(rawDinner * scale, dec);
  let beverageRevenue = roundMoney(rawBeverage * scale, dec);
  let otherIncludedServices = roundMoney(rawOther * scale, dec);

  if (scale < 1) {
    const initialSum = roundMoney(
      breakfastRevenue +
        lunchRevenue +
        dinnerRevenue +
        beverageRevenue +
        otherIncludedServices,
      dec
    );
    const residual = roundMoney(maxAllowed - initialSum, dec);
    if (residual !== 0) {
      if (beverageRevenue > 0) beverageRevenue = roundMoney(beverageRevenue + residual, dec);
      else if (dinnerRevenue > 0) dinnerRevenue = roundMoney(dinnerRevenue + residual, dec);
      else if (lunchRevenue > 0) lunchRevenue = roundMoney(lunchRevenue + residual, dec);
      else if (breakfastRevenue > 0) breakfastRevenue = roundMoney(breakfastRevenue + residual, dec);
      else if (otherIncludedServices > 0) {
        otherIncludedServices = roundMoney(otherIncludedServices + residual, dec);
      }
    }
  }

  const totalPackageAllocation = roundMoney(
    breakfastRevenue +
      lunchRevenue +
      dinnerRevenue +
      beverageRevenue +
      otherIncludedServices,
    dec
  );
  const accommodationRevenue = roundMoney(Math.max(0, safeNet - totalPackageAllocation), dec);

  return {
    mealPlan: plan,
    originalPackageValue: safeNet,
    accommodationRevenue,
    breakfastRevenue,
    lunchRevenue,
    dinnerRevenue,
    beverageRevenue,
    otherIncludedServices,
    totalPackageAllocation,
  };
}

export function computePackageSplit(
  mealPlan: MealPlan | undefined,
  paxCount: number | undefined,
  roomNetAmount: number,
  config: HotelConfig
): number {
  return computeDetailedPackageSplit(mealPlan, paxCount, roomNetAmount, config).totalPackageAllocation;
}

export function calculateTaxes(
  inputAmount: number,
  category: LedgerEntry['category'],
  config: HotelConfig
): {
  netAmount: number;
  serviceCharge: number;
  vatAmount: number;
  cityTaxAmount: number;
  grossAmount: number;
} {
  const dec = config.roundingDecimals ?? 2;
  const safeInput = roundMoney(inputAmount, dec);
  if (
    category === 'Rebate' ||
    category === 'PaidOut' ||
    category === 'Deposit' ||
    category === 'Payment'
  ) {
    return {
      netAmount: safeInput,
      serviceCharge: 0,
      vatAmount: 0,
      cityTaxAmount: 0,
      grossAmount: safeInput,
    };
  }

  const serviceRate = category === 'OtherRevenue' ? 0 : (config.serviceChargePct || 0) / 100;
  const vatRate = (config.vatPct || 0) / 100;
  const cityRate = (config.cityTaxPct || 0) / 100;

  if (config.taxInclusive) {
    const grossAmount = safeInput;
    const totalMultiplier = (1 + serviceRate) * (1 + vatRate + cityRate);
    const netAmount = totalMultiplier > 0 ? roundMoney(grossAmount / totalMultiplier, dec) : grossAmount;
    const serviceCharge = roundMoney(netAmount * serviceRate, dec);
    const taxBase = netAmount + serviceCharge;
    const vatAmount = roundMoney(taxBase * vatRate, dec);
    // Assign any 1-cent rounding residual to cityTax (or vat if cityTax == 0) so components sum cleanly
    const rawCity = roundMoney(taxBase * cityRate, dec);
    const residual = roundMoney(grossAmount - (netAmount + serviceCharge + vatAmount + rawCity), dec);
    const cityTaxAmount = cityRate > 0 ? roundMoney(rawCity + residual, dec) : 0;
    const adjustedVat = cityRate > 0 ? vatAmount : roundMoney(vatAmount + residual, dec);

    return {
      netAmount,
      serviceCharge,
      vatAmount: adjustedVat,
      cityTaxAmount,
      grossAmount,
    };
  }

  const netAmount = safeInput;
  const serviceCharge = roundMoney(netAmount * serviceRate, dec);
  const taxBase = netAmount + serviceCharge;
  const vatAmount = roundMoney(taxBase * vatRate, dec);
  const cityTaxAmount = roundMoney(taxBase * cityRate, dec);
  const grossAmount = roundMoney(netAmount + serviceCharge + vatAmount + cityTaxAmount, dec);

  return { netAmount, serviceCharge, vatAmount, cityTaxAmount, grossAmount };
}

export function detectMissingCheckNumbers(entries: LedgerEntry[]): number[] {
  const fbNumbers = entries
    .filter((e) => e.category === 'FoodBeverage')
    .map((e) => parseInt(e.referenceNo.replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n) && n > 0)
    .sort((a, b) => a - b);

  if (fbNumbers.length < 2) return [];

  const missing: number[] = [];
  const uniqueSorted = Array.from(new Set(fbNumbers));
  for (let i = 0; i < uniqueSorted.length - 1; i++) {
    const current = uniqueSorted[i];
    const next = uniqueSorted[i + 1];
    if (next - current > 1 && next - current <= 20) {
      for (let m = current + 1; m < next; m++) {
        missing.push(m);
      }
    }
  }
  return missing;
}

export function buildEntryDuplicateKey(entry: Pick<LedgerEntry, 'source' | 'category' | 'referenceNo' | 'netAmount'>): string {
  return `${entry.source}|${entry.category}|${entry.referenceNo.trim().toLowerCase()}|${roundMoney(entry.netAmount).toFixed(2)}`;
}

export function detectDuplicateEntries(
  entries: LedgerEntry[],
  candidate?: Pick<LedgerEntry, 'source' | 'category' | 'referenceNo' | 'netAmount'>
): string[] {
  if (candidate) {
    const candKey = buildEntryDuplicateKey(candidate);
    return entries
      .filter((e) => e.referenceNo.trim() !== '' && buildEntryDuplicateKey(e) === candKey)
      .map((e) => e.id);
  }
  const seen = new Map<string, string[]>();
  for (const e of entries) {
    if (!e.referenceNo.trim()) continue;
    const key = buildEntryDuplicateKey(e);
    const list = seen.get(key) ?? [];
    list.push(e.id);
    seen.set(key, list);
  }
  const duplicates: string[] = [];
  for (const ids of seen.values()) {
    if (ids.length > 1) {
      duplicates.push(...ids);
    }
  }
  return duplicates;
}

export function computeAuditSummary(
  entries: LedgerEntry[],
  settlement: CashSettlement,
  discrepancies: RoomDiscrepancy[],
  config: HotelConfig,
  lang: LanguageCode = 'ar'
): AuditSummary {
  let roomNet = 0;
  let fbNet = 0;
  let otherNet = 0;
  let packageSplitTotal = 0;
  let totalRebates = 0;
  let totalPaidOuts = 0;
  let totalDeposits = 0;
  let totalPayments = 0;
  let totalAdjustments = 0;
  let totalServiceCharge = 0;
  let totalVat = 0;
  let totalCityTax = 0;

  let expectedCash = 0;
  let expectedCreditCard = 0;
  let expectedCityLedger = 0;
  let roomChargeTransfers = 0;
  let outageEntriesCount = 0;

  const exceptions: AuditException[] = [];

  for (const entry of entries) {
    if (entry.source === 'OutageBackup') {
      outageEntriesCount += 1;
    }

    const entryCityTax =
      typeof entry.cityTaxAmount === 'number' ? entry.cityTaxAmount : 0;

    if (entry.category === 'Room') {
      roomNet += entry.netAmount;
      const split =
        typeof entry.packageSplitAmount === 'number'
          ? entry.packageSplitAmount
          : computePackageSplit(entry.mealPlan, entry.paxCount, entry.netAmount, config);
      packageSplitTotal += split;
      if (entry.netAmount < config.minRoomRate && entry.paymentMethod !== 'HouseUse') {
        exceptions.push({
          id: `exc-rate-${entry.id}`,
          severity: 'warning',
          category:
            lang === 'en'
              ? 'Rate Variance'
              : lang === 'fr'
              ? 'Écart Tarifaire'
              : 'فارق سعر الغرفة',
          title:
            lang === 'en'
              ? `Room ${entry.referenceNo} below minimum floor (${config.minRoomRate} ${config.currency})`
              : lang === 'fr'
              ? `Chambre ${entry.referenceNo} sous le tarif minimum (${config.minRoomRate} ${config.currency})`
              : `غرفة ${entry.referenceNo} أقل من الحد الأدنى (${config.minRoomRate} ${config.currency})`,
          detail:
            lang === 'en'
              ? `Posted rate ${entry.netAmount.toLocaleString()} ${config.currency} (${entry.guestOrDescription})`
              : lang === 'fr'
              ? `Tarif saisi ${entry.netAmount.toLocaleString()} ${config.currency} (${entry.guestOrDescription})`
              : `السعر المسجل ${entry.netAmount.toLocaleString()} ${config.currency} (${entry.guestOrDescription})`,
          amountImpact: roundMoney(config.minRoomRate - entry.netAmount),
        });
      }
    } else if (entry.category === 'FoodBeverage') {
      fbNet += entry.netAmount;
    } else if (entry.category === 'OtherRevenue') {
      otherNet += entry.netAmount;
    } else if (entry.category === 'Adjustment') {
      totalAdjustments += entry.netAmount;
      otherNet += entry.netAmount;
    } else if (entry.category === 'Rebate') {
      totalRebates += entry.grossAmount;
      if (
        entry.grossAmount >= config.rebateApprovalLimit &&
        !entry.approvedBy.trim()
      ) {
        exceptions.push({
          id: `exc-rebate-${entry.id}`,
          severity: 'critical',
          category:
            lang === 'en'
              ? 'Unapproved Rebate'
              : lang === 'fr'
              ? 'Remise Non Signée'
              : 'خصم غير معتمد',
          title:
            lang === 'en'
              ? `Rebate/Allowance missing manager sign-off (${entry.referenceNo})`
              : lang === 'fr'
              ? `Remise sans signature managériale (${entry.referenceNo})`
              : `سند خصم/تسوية بدون توقيع إداري (${entry.referenceNo})`,
          detail:
            lang === 'en'
              ? `Rebate ${entry.grossAmount.toLocaleString()} ${config.currency} exceeds threshold (${config.rebateApprovalLimit}) without approver name.`
              : lang === 'fr'
              ? `Remise de ${entry.grossAmount.toLocaleString()} ${config.currency} dépasse le seuil (${config.rebateApprovalLimit}) sans approbateur.`
              : `قيمة الخصم ${entry.grossAmount.toLocaleString()} ${config.currency} تتجاوز حد الاعتماد (${config.rebateApprovalLimit}) بدون اسم المعتمد.`,
          amountImpact: entry.grossAmount,
        });
      }
    } else if (entry.category === 'PaidOut') {
      totalPaidOuts += entry.grossAmount;
      if (!entry.approvedBy.trim()) {
        exceptions.push({
          id: `exc-po-${entry.id}`,
          severity: 'warning',
          category:
            lang === 'en'
              ? 'Unsigned Paid Out'
              : lang === 'fr'
              ? 'Débours Non Signé'
              : 'مصروف نثري بدون اعتماد',
          title:
            lang === 'en'
              ? `Paid Out ${entry.referenceNo} missing signature`
              : lang === 'fr'
              ? `Débours ${entry.referenceNo} sans signature`
              : `Paid Out ${entry.referenceNo} ينقصه التوقيع`,
          detail: entry.guestOrDescription,
          amountImpact: entry.grossAmount,
        });
      }
    } else if (entry.category === 'Deposit') {
      // Critical financial rule: Deposits are balance-sheet collections, NEVER revenue
      totalDeposits += entry.grossAmount;
    } else if (entry.category === 'Payment') {
      // Critical financial rule: Payments settle folio receivables, NEVER revenue
      totalPayments += entry.grossAmount;
    }

    const isNonTaxCollection =
      entry.category === 'Rebate' ||
      entry.category === 'PaidOut' ||
      entry.category === 'Deposit' ||
      entry.category === 'Payment';

    if (!isNonTaxCollection) {
      totalServiceCharge += entry.serviceCharge;
      totalVat += entry.vatAmount;
      totalCityTax += entryCityTax;
    }

    // Settlement channels
    if (entry.category === 'PaidOut' && entry.paymentMethod === 'Cash') {
      expectedCash -= entry.grossAmount;
    } else if (entry.category !== 'Rebate' && entry.category !== 'PaidOut') {
      if (entry.paymentMethod === 'Cash') {
        expectedCash += entry.grossAmount;
      } else if (entry.paymentMethod === 'CreditCard') {
        expectedCreditCard += entry.grossAmount;
      } else if (entry.paymentMethod === 'CityLedger') {
        expectedCityLedger += entry.grossAmount;
      } else if (entry.paymentMethod === 'RoomCharge') {
        roomChargeTransfers += entry.grossAmount;
      }
    }
  }

  const missingCheckNumbers = detectMissingCheckNumbers(entries);
  if (missingCheckNumbers.length > 0) {
    exceptions.push({
      id: 'exc-seq-gap',
      severity: 'critical',
      category:
        lang === 'en'
          ? 'Check Sequence'
          : lang === 'fr'
          ? 'Séquence Tickets'
          : 'تسلسل الشيكات',
      title:
        lang === 'en'
          ? `F&B check sequence gap: ${missingCheckNumbers.map((n) => `#${n}`).join(', ')}`
          : lang === 'fr'
          ? `Rupture de séquence tickets F&B : ${missingCheckNumbers.map((n) => `#${n}`).join(', ')}`
          : `فجوة في تسلسل شيكات المطاعم: ${missingCheckNumbers.map((n) => `#${n}`).join(', ')}`,
      detail:
        lang === 'en'
          ? 'Verify captain order books and confirm no missing or unposted void checks.'
          : lang === 'fr'
          ? 'Vérifiez les carnets manuels et confirmez l’absence de tickets supprimés non justifiés.'
          : 'يجب مراجعة دفتر الكابتن أوردر الورقي والتأكد من عدم وجود شيكات محذوفة أو غير مرحلة.',
    });
  }

  const duplicateEntryIds = detectDuplicateEntries(entries);
  if (duplicateEntryIds.length > 0) {
    exceptions.push({
      id: 'exc-dup-entries',
      severity: 'warning',
      category:
        lang === 'en'
          ? 'Duplicate Entry'
          : lang === 'fr'
          ? 'Doublon Détecté'
          : 'قيد مكرر محتمل',
      title:
        lang === 'en'
          ? `${duplicateEntryIds.length} potential duplicate ledger postings detected`
          : lang === 'fr'
          ? `${duplicateEntryIds.length} écritures potentiellement en double détectées`
          : `تم رصد ${duplicateEntryIds.length} قيود مكررة محتملة (نفس المرجع والمبلغ)`,
      detail:
        lang === 'en'
          ? 'Verify no double-counting occurred between PMS, POS, and Outage Backup.'
          : lang === 'fr'
          ? 'Vérifiez l’absence de double comptabilisation entre PMS, POS et secours hors ligne.'
          : 'تحقق من عدم وجود تكرار بين قيود السيستم وقيود الطوارئ أو نقاط البيع.',
    });
  }

  for (const disc of discrepancies) {
    if (!disc.resolved) {
      exceptions.push({
        id: `exc-hk-${disc.id}`,
        severity: 'critical',
        category:
          lang === 'en'
            ? 'HK Discrepancy'
            : lang === 'fr'
            ? 'Écart Gouvernance'
            : 'تضارب التدبير الفندقي',
        title:
          lang === 'en'
            ? `Room ${disc.roomNumber} status conflict (FO: ${disc.frontOfficeStatus} / HK: ${disc.housekeepingStatus})`
            : lang === 'fr'
            ? `Conflit statut chambre ${disc.roomNumber} (FO: ${disc.frontOfficeStatus} / HK: ${disc.housekeepingStatus})`
            : `تضارب حالة غرفة ${disc.roomNumber} (FO: ${disc.frontOfficeStatus} / HK: ${disc.housekeepingStatus})`,
        detail:
          disc.note ||
          (lang === 'en'
            ? 'Verify physical room occupancy with Front Office before Night Audit close.'
            : lang === 'fr'
            ? 'Vérifiez l’occupation physique avec la Réception avant la clôture.'
            : 'يرجى مطابقة الغرفة فعلياً مع الاستقبال قبل إغلاق اليوم المالي.'),
      });
    }
  }

  const grossRevenue = roundMoney(
    roomNet + fbNet + otherNet + totalServiceCharge + totalVat + totalCityTax
  );
  const netRevenueAfterRebates = roundMoney(roomNet + fbNet + otherNet - totalRebates);

  const cashVariance = roundMoney(settlement.actualCashDrop - expectedCash);
  const edcVariance = roundMoney(settlement.actualEdcBatch - expectedCreditCard);
  const cityLedgerVariance = roundMoney(
    settlement.actualCityLedgerSigned - expectedCityLedger
  );
  const totalVariance = roundMoney(cashVariance + edcVariance + cityLedgerVariance);

  if (Math.abs(cashVariance) > config.cashVarianceTolerance) {
    exceptions.push({
      id: 'exc-cash-var',
      severity: 'critical',
      category:
        lang === 'en'
          ? 'Cash Variance'
          : lang === 'fr'
          ? 'Écart Caisse'
          : 'فارق الخزينة النقدية',
      title:
        lang === 'en'
          ? `Cash ${cashVariance < 0 ? 'shortage' : 'overage'} of ${Math.abs(cashVariance).toLocaleString()} ${config.currency}`
          : lang === 'fr'
          ? `${cashVariance < 0 ? 'Manquant' : 'Excédent'} de caisse de ${Math.abs(cashVariance).toLocaleString()} ${config.currency}`
          : `فارق نقدي ${cashVariance < 0 ? 'عجز' : 'زيادة'} بقيمة ${Math.abs(cashVariance).toLocaleString()} ${config.currency}`,
      detail:
        lang === 'en'
          ? `Expected cash ${expectedCash.toLocaleString()} vs physical drop ${settlement.actualCashDrop.toLocaleString()}.`
          : lang === 'fr'
          ? `Espèces attendues ${expectedCash.toLocaleString()} vs comptage ${settlement.actualCashDrop.toLocaleString()}.`
          : `النقدية المتوقعة بالدفتر ${expectedCash.toLocaleString()} مقابل المورد الفعلي ${settlement.actualCashDrop.toLocaleString()}.`,
      amountImpact: Math.abs(cashVariance),
    });
  }

  if (Math.abs(edcVariance) > 1) {
    exceptions.push({
      id: 'exc-edc-var',
      severity: 'warning',
      category:
        lang === 'en'
          ? 'EDC Reconciliation'
          : lang === 'fr'
          ? 'Rapprochement EDC'
          : 'مطابقة الفيزا',
      title:
        lang === 'en'
          ? `Card terminal EDC variance of ${edcVariance.toLocaleString()} ${config.currency}`
          : lang === 'fr'
          ? `Écart terminal carte EDC de ${edcVariance.toLocaleString()} ${config.currency}`
          : `فارق ماكينات البطاقات EDC بقيمة ${edcVariance.toLocaleString()} ${config.currency}`,
      detail:
        lang === 'en'
          ? `Expected ${expectedCreditCard.toLocaleString()} vs Z-Report ${settlement.actualEdcBatch.toLocaleString()}.`
          : lang === 'fr'
          ? `Attendu ${expectedCreditCard.toLocaleString()} vs Z-Report ${settlement.actualEdcBatch.toLocaleString()}.`
          : `المتوقع ${expectedCreditCard.toLocaleString()} مقابل تقرير الزد ريبورت ${settlement.actualEdcBatch.toLocaleString()}.`,
      amountImpact: Math.abs(edcVariance),
    });
  }

  return {
    roomNet: roundMoney(roomNet),
    fbNet: roundMoney(fbNet),
    otherNet: roundMoney(otherNet),
    packageSplitTotal: roundMoney(packageSplitTotal),
    adjustedRoomNet: roundMoney(Math.max(0, roomNet - packageSplitTotal)),
    adjustedFbNet: roundMoney(fbNet + packageSplitTotal),
    totalRebates: roundMoney(totalRebates),
    totalPaidOuts: roundMoney(totalPaidOuts),
    totalDeposits: roundMoney(totalDeposits),
    totalPayments: roundMoney(totalPayments),
    totalAdjustments: roundMoney(totalAdjustments),
    totalServiceCharge: roundMoney(totalServiceCharge),
    totalVat: roundMoney(totalVat),
    totalCityTax: roundMoney(totalCityTax),
    grossRevenue,
    netRevenueAfterRebates,
    expectedCash: roundMoney(expectedCash),
    expectedCreditCard: roundMoney(expectedCreditCard),
    expectedCityLedger: roundMoney(expectedCityLedger),
    roomChargeTransfers: roundMoney(roomChargeTransfers),
    cashVariance,
    edcVariance,
    cityLedgerVariance,
    totalVariance,
    outageEntriesCount,
    missingCheckNumbers,
    duplicateEntryIds,
    exceptions,
  };
}

export function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

const EGP_REF_RATES: Record<CurrencyCode, number> = {
  EGP: 1,
  USD: 50.5,
  EUR: 54.8,
  SAR: 13.45,
};

export function getDefaultRatesForBase(base: CurrencyCode): Record<CurrencyCode, number> {
  const baseInEgp = EGP_REF_RATES[base] || 1;
  return {
    EGP: base === 'EGP' ? 1 : Number((EGP_REF_RATES.EGP / baseInEgp).toFixed(4)),
    USD: base === 'USD' ? 1 : Number((EGP_REF_RATES.USD / baseInEgp).toFixed(4)),
    EUR: base === 'EUR' ? 1 : Number((EGP_REF_RATES.EUR / baseInEgp).toFixed(4)),
    SAR: base === 'SAR' ? 1 : Number((EGP_REF_RATES.SAR / baseInEgp).toFixed(4)),
  };
}

export function getExchangeRates(config: HotelConfig): Record<CurrencyCode, number> {
  const defaults = getDefaultRatesForBase(config.currency);
  const raw = config.exchangeRates;
  if (!raw) return defaults;
  return {
    EGP: config.currency === 'EGP' ? 1 : raw.EGP > 0 ? raw.EGP : defaults.EGP,
    USD: config.currency === 'USD' ? 1 : raw.USD > 0 ? raw.USD : defaults.USD,
    EUR: config.currency === 'EUR' ? 1 : raw.EUR > 0 ? raw.EUR : defaults.EUR,
    SAR: config.currency === 'SAR' ? 1 : raw.SAR > 0 ? raw.SAR : defaults.SAR,
  };
}

export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  ratesInBase: Record<CurrencyCode, number>
): number {
  if (fromCurrency === toCurrency) return Number(amount.toFixed(2));
  const fromRate = ratesInBase[fromCurrency] || 1;
  const toRate = ratesInBase[toCurrency] || 1;
  return Number(((amount * fromRate) / toRate).toFixed(2));
}

export function entriesToCsv(entries: LedgerEntry[]): string {
  const headers = [
    'ID',
    'Timestamp',
    'Source',
    'Category',
    'OutletOrDept',
    'ReferenceNo',
    'Description',
    'NetAmount',
    'ServiceCharge',
    'VatAmount',
    'GrossAmount',
    'PaymentMethod',
    'ApprovedBy',
    'Reconciled',
    'CityTaxAmount',
    'FxRateApplied',
    'CashierName',
  ];
  const escape = (v: string | number | boolean | undefined) => {
    const str = String(v ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const rows = entries.map((e) =>
    [
      e.id,
      e.timestamp,
      e.source,
      e.category,
      e.outletOrDept,
      e.referenceNo,
      e.guestOrDescription,
      e.netAmount,
      e.serviceCharge,
      e.vatAmount,
      e.grossAmount,
      e.paymentMethod,
      e.approvedBy,
      e.reconciled,
      e.cityTaxAmount ?? 0,
      e.fxRateApplied ?? '',
      e.cashierName ?? '',
    ]
      .map(escape)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\r\n');
}

export function parseCsvToEntries(csvText: string): LedgerEntry[] {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const splitCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  };

  const parsed: LedgerEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 12) continue;
    const netAmount = roundMoney(parseFloat(cols[7]) || 0);
    const serviceCharge = roundMoney(parseFloat(cols[8]) || 0);
    const vatAmount = roundMoney(parseFloat(cols[9]) || 0);
    const cityTaxAmount = cols[14] !== undefined ? roundMoney(parseFloat(cols[14]) || 0) : 0;
    const grossAmount = roundMoney(
      parseFloat(cols[10]) || netAmount + serviceCharge + vatAmount + cityTaxAmount
    );
    const fxRateParsed = cols[15] ? parseFloat(cols[15]) : undefined;

    parsed.push({
      id: cols[0] || `imp-${Date.now()}-${i}`,
      timestamp: cols[1] || '00:00',
      source: (cols[2] as LedgerEntry['source']) || 'OutageBackup',
      category: (cols[3] as LedgerEntry['category']) || 'Room',
      outletOrDept: cols[4] || 'Front Office',
      referenceNo: cols[5] || '',
      guestOrDescription: cols[6] || '',
      netAmount,
      serviceCharge,
      vatAmount,
      cityTaxAmount,
      grossAmount,
      paymentMethod: (cols[11] as LedgerEntry['paymentMethod']) || 'Cash',
      approvedBy: cols[12] || '',
      reconciled: cols[13]?.toLowerCase() === 'true',
      ...(fxRateParsed && fxRateParsed > 0 ? { fxRateApplied: fxRateParsed } : {}),
      ...(cols[16] ? { cashierName: cols[16] } : {}),
    });
  }
  return parsed;
}

export function downloadTextFile(filename: string, content: string, addBom = true) {
  const payload = addBom ? '\uFEFF' + content : content;
  const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
