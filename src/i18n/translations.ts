export type LanguageCode = 'ar' | 'en' | 'fr';

export interface TranslationDict {
  dir: 'rtl' | 'ltr';
  brandName: string;
  languageLabel: string;
  propertyLabel: string;
  entriesUnit: string;
  navGroups: {
    operations: string;
    specialized: string;
    configuration: string;
  };
  nav: {
    dashboard: string;
    incomeAudit: string;
    ledger: string;
    rooms: string;
    compare: string;
    auditSuite: string;
    receivables: string;
    reports: string;
    recovery: string;
    settings: string;
    guide: string;
  };
  breadcrumbs: {
    dashboard: string;
    incomeAudit: string;
    ledger: string;
    rooms: string;
    compare: string;
    auditSuite: string;
    receivables: string;
    reports: string;
    recovery: string;
    settings: string;
    guide: string;
  };
  connection: {
    title: string;
    normal: string;
    outage: string;
    normalDesc: string;
    outageDesc: string;
    bannerText: string;
    bannerAction: string;
  };
  actions: {
    exportCsv: string;
    addOutageEntry: string;
    openMenu: string;
    adjustRules: string;
    openLedger: string;
    registerNew: string;
    addRoom: string;
    save: string;
    cancel: string;
    yes: string;
    printReport: string;
    resetSample: string;
    confirmReset: string;
  };
  dashboard: {
    kpiGross: string;
    kpiRoomsLabel: string;
    kpiFbLabel: string;
    kpiOutage: string;
    kpiOutageUnit: string;
    kpiVariance: string;
    kpiVarianceOk: string;
    kpiVarianceAlert: string;
    kpiExceptions: string;
    kpiExceptionsUnit: string;
    kpiTasksVerified: string;
    kpiTasksFlagged: string;
    infographicTitle: string;
    infographicSubtitle: string;
    waterfallTitle: string;
    grossTotalLabel: string;
    taxesAndSvcLabel: string;
    rebatesLabel: string;
    netRealizedLabel: string;
    collectionMixTitle: string;
    cashLabel: string;
    cardLabel: string;
    cityLedgerLabel: string;
    roomChargeLabel: string;
    deptChartTitle: string;
    deptChartSubtitle: string;
    netMode: string;
    grossMode: string;
    barMode: string;
    pieMode: string;
    emptyChartTitle: string;
    emptyChartDesc: string;
    colDept: string;
    colCount: string;
    colShare: string;
    colAmount: string;
    exceptionsTitle: string;
    exceptionsSubtitle: string;
    noExceptionsTitle: string;
    noExceptionsDesc: string;
    critical: string;
    warning: string;
    settlementTitle: string;
    settlementSubtitle: string;
    expectedCash: string;
    actualCashLabel: string;
    expectedCard: string;
    actualCardLabel: string;
    expectedCityLedger: string;
    actualCityLedgerLabel: string;
    roomChargeTransfers: string;
    checklistTitle: string;
    completedLabel: string;
    statusVerified: string;
    statusFlagged: string;
    statusPending: string;
    notePlaceholder: string;
    hkTitle: string;
    hkSubtitle: string;
    roomNumber: string;
    foStatus: string;
    hkStatus: string;
    hkNotePlaceholder: string;
    saveDiscrepancy: string;
    hkResolved: string;
    hkOpen: string;
  };
  ledger: {
    formTitle: string;
    formSubtitle: string;
    liveGross: string;
    sourceLabel: string;
    categoryLabel: string;
    outletLabel: string;
    refLabelCheck: string;
    refLabelRoom: string;
    descLabel: string;
    descPlaceholder: string;
    netLabel: string;
    paymentLabel: string;
    approverLabel: string;
    approverPlaceholder: string;
    addBtn: string;
    seqAlertPrefix: string;
    seqAlertSuffix: string;
    seqVoidHint: string;
    filterAll: string;
    allDepts: string;
    searchPlaceholder: string;
    colTimeSource: string;
    colTypeDept: string;
    colRef: string;
    colDesc: string;
    colNet: string;
    colGross: string;
    colPay: string;
    colApproval: string;
    colAction: string;
    noResults: string;
    approveNow: string;
    reconciled: string;
    reconcile: string;
    categories: {
      Room: string;
      FoodBeverage: string;
      OtherRevenue: string;
      Rebate: string;
      PaidOut: string;
      Deposit: string;
      Payment: string;
      Adjustment: string;
    };
    sources: {
      PMS: string;
      POS: string;
      OutageBackup: string;
      ManualEntry: string;
    };
    payments: {
      Cash: string;
      CreditCard: string;
      CityLedger: string;
      RoomCharge: string;
      HouseUse: string;
    };
  };
  recovery: {
    title: string;
    subtitle: string;
    resetDoneMsg: string;
    importFailMsg: string;
    importOkPrefix: string;
    card1Title: string;
    card1Desc: string;
    card1Btn: string;
    card2Title: string;
    card2Desc: string;
    card2Btn: string;
    card3Title: string;
    card3Desc: string;
    card3Btn: string;
    reportTitle: string;
    businessDateLabel: string;
    auditorLabel: string;
    revBreakdownTitle: string;
    roomNet: string;
    fbNet: string;
    otherNet: string;
    svcAndVat: string;
    totalGross: string;
    totalRebates: string;
    settlementSummaryTitle: string;
    cashExpAct: string;
    cardExpAct: string;
    clExpAct: string;
    netVariance: string;
    shiftNote: string;
  };
  settings: {
    policyTitle: string;
    policySubtitle: string;
    hotelName: string;
    businessDate: string;
    currency: string;
    svcPct: string;
    vatPct: string;
    cityTaxPct: string;
    minRoomRate: string;
    rebateLimit: string;
    cashTolerance: string;
    totalRooms: string;
    budgetDaily: string;
    breakfastSplitPerPax: string;
    outletsTitle: string;
    outletsSubtitle: string;
    outletPlaceholder: string;
    addOutletBtn: string;
    backupTitle: string;
    backupSubtitle: string;
    exportJsonBtn: string;
    importJsonBtn: string;
    backupOk: string;
    backupErr: string;
    exchangeRatesTitle: string;
    exchangeRatesSubtitle: string;
    baseCurrencyTag: string;
    resetRatesBtn: string;
    currencyNames: {
      EGP: string;
      USD: string;
      EUR: string;
      SAR: string;
    };
  };
  guide: {
    kicker: string;
    heroTitle: string;
    heroDesc: string;
    pipelineTitle: string;
    pipelineSubtitle: string;
    pipelineStages: {
      step: string;
      title: string;
      sub: string;
      metricLabel: string;
    }[];
    taxInfographicTitle: string;
    taxInfographicSubtitle: string;
    taxBase: string;
    taxSvc: string;
    taxVat: string;
    taxGross: string;
    capabilitiesTitle: string;
    capabilitiesSubtitle: string;
    workflowTitle: string;
    workflowSubtitle: string;
    scenarioOutage: string;
    scenarioDaily: string;
    rulesTitle: string;
    rulesSubtitle: string;
    editRulesBtn: string;
    ruleTaxes: string;
    ruleMinRate: string;
    ruleRebate: string;
    ruleCashTol: string;
    capabilities: { index: string; title: string; desc: string }[];
    outageSteps: { step: string; title: string; detail: string; actionLabel: string; target: 'dashboard' | 'ledger' | 'recovery' | 'settings' }[];
    dailySteps: { step: string; title: string; detail: string; actionLabel: string; target: 'dashboard' | 'ledger' | 'recovery' | 'settings' }[];
  };
  kwentraCompare: {
    title: string;
    subtitle: string;
    reportRefLabel: string;
    lastUpdatedLabel: string;
    importCsvBtn: string;
    copyLocalBtn: string;
    zeroOutBtn: string;
    printBtn: string;
    importSuccess: string;
    importError: string;
    kpiLocalGross: string;
    kpiKwentraGross: string;
    kpiNetDiff: string;
    kpiMatchRate: string;
    kpiMatched: string;
    kpiHasDiff: string;
    kpiLinesMatched: string;
    kpiTopDriver: string;
    kpiNoDriver: string;
    chartTitle: string;
    chartSubtitle: string;
    seriesLocal: string;
    seriesKwentra: string;
    matrixTitle: string;
    matrixSubtitle: string;
    filterAll: string;
    filterDiffsOnly: string;
    colItem: string;
    colGroup: string;
    colLocal: string;
    colKwentra: string;
    colVariance: string;
    colPct: string;
    colStatus: string;
    statusMatch: string;
    statusOver: string;
    statusShort: string;
    groupRevenue: string;
    groupDeductions: string;
    groupSettlement: string;
    rows: {
      roomNet: string;
      fbNet: string;
      otherNet: string;
      serviceCharge: string;
      vatAndTaxes: string;
      grossTotal: string;
      rebates: string;
      paidOuts: string;
      cash: string;
      creditCard: string;
      cityLedger: string;
      roomCharge: string;
    };
    noteLabel: string;
    notePlaceholder: string;
  };
  reports: {
    title: string;
    subtitle: string;
    exportFormatsLabel: string;
    exportCsv: string;
    exportExcel: string;
    exportJson: string;
    exportHtml: string;
    printBtn: string;
    exportPackJson: string;
    exportedNotice: string;
    reportTabs: {
      executive: string;
      departments: string;
      kwentra: string;
      exceptions: string;
      ledger: string;
      checklist: string;
      archive: string;
      cashiers: string;
      otas: string;
      beoTrail: string;
    };
    executiveDesc: string;
    departmentsDesc: string;
    kwentraDesc: string;
    exceptionsDesc: string;
    ledgerDesc: string;
    checklistDesc: string;
    archiveDesc: string;
    cashiersDesc: string;
    otasDesc: string;
    beoTrailDesc: string;
    outageOnlyToggle: string;
    signOffAuditor: string;
    signOffCashier: string;
    signOffController: string;
    cols: {
      metric: string;
      amountBase: string;
      equivUsd: string;
      equivEur: string;
      equivEgp: string;
      dept: string;
      entriesCount: string;
      net: string;
      svc: string;
      vat: string;
      gross: string;
      share: string;
      severity: string;
      category: string;
      title: string;
      detail: string;
      task: string;
      status: string;
      notes: string;
    };
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationDict> = {
  ar: {
    dir: 'rtl',
    brandName: 'Hotel Income Auditor',
    languageLabel: 'اللغة / Language',
    propertyLabel: 'الفندق الحالي',
    entriesUnit: 'قيد',
    navGroups: {
      operations: 'العمليات والمراجعة',
      specialized: 'وحدات التدقيق المتقدمة',
      configuration: 'التكوين والمساعدة',
    },
    nav: {
      dashboard: 'لوحة المراجعة اليومية',
      incomeAudit: 'محرك الغرف والتدقيق اليومي',
      ledger: 'دفتر الترحيل والطوارئ',
      rooms: 'غرف الفندق (Room Rack)',
      compare: 'مطابقة سيستم Kwentra',
      auditSuite: 'الأرشيف، الكاشير والـ Trail',
      receivables: 'الـ OTAs، الشركات والحفلات',
      reports: 'مركز التقارير والتصدير',
      recovery: 'المزامنة وملفات التعافي',
      settings: 'إعدادات الفندق والمنافذ',
      guide: 'دليل الاستخدام والإنفوجرافيك',
    },
    breadcrumbs: {
      dashboard: 'العمليات السحابية / لوحة المراقبة والإنفوجرافيك',
      incomeAudit: 'مراجعة الإيرادات / محرك الغرف، الاستثناءات، وجاهزية الإغلاق',
      ledger: 'المكتب الأمامي والمنافذ / سجل الحركات',
      rooms: 'المكتب الأمامي / إدارة وإضافة غرف الفندق يدوياً',
      compare: 'مطابقة المراجع / مقارنة القيم مع Kwentra الأصلي',
      auditSuite: 'وحدات التدقيق المتقدمة / الأرشيف اليومي، جرد الكاش، وفصل الباقات',
      receivables: 'وحدات التدقيق المتقدمة / عقود OTAs، أعمار الذمم، والحفلات BEO',
      reports: 'مركز التقارير / التصدير الشامل والطباعة',
      recovery: 'الإغلاق الليلي / التصدير والطباعة',
      settings: 'إدارة المنشأة / الضرائب وحدود الرقابة',
      guide: 'مركز المساعدة / الإنفوجرافيك وشرح التشغيل',
    },
    connection: {
      title: 'حالة الاتصال بالـ PMS / POS',
      normal: 'متصل (Normal)',
      outage: 'طوارئ (Outage)',
      normalDesc: 'السيستم الفعلي يعمل — يمكنك مراجعة الإيرادات ومطابقة الـ POS والخزينة.',
      outageDesc: 'السيستم الفعلي متوقف — الحفظ يتم تلقائياً في المتصفح مع تجهيز ملفات الترحيل.',
      bannerText: 'وضع طوارئ توقف السيستم مُفعّل: يتم حفظ كافة حركات الغرف والمطاعم محلياً في المتصفح مع تجهيز ملف التعافي لإعادة الترحيل إلى PMS.',
      bannerAction: 'تصدير ملفات التعافي',
    },
    actions: {
      exportCsv: 'تصدير CSV',
      addOutageEntry: 'تسجيل قيد طوارئ',
      openMenu: 'فتح القائمة',
      adjustRules: 'ضبط حدود المراجعة',
      openLedger: 'فتح دفتر الترحيل والطوارئ',
      registerNew: 'تسجيل قيد جديد',
      addRoom: 'إضافة غرفة',
      save: 'حفظ',
      cancel: 'إلغاء',
      yes: 'نعم',
      printReport: 'طباعة تقرير المراجعة',
      resetSample: 'إعادة ضبط البيانات التجريبية',
      confirmReset: 'تأكيد إعادة الضبط؟',
    },
    dashboard: {
      kpiGross: 'إجمالي الإيرادات شامل الضرائب',
      kpiRoomsLabel: 'صافي الغرف',
      kpiFbLabel: 'المطاعم',
      kpiOutage: 'قيود الطوارئ (وقت توقف السيستم)',
      kpiOutageUnit: 'قيد يدوي',
      kpiVariance: 'صافي فرق التسوية (الخزينة والبطاقات)',
      kpiVarianceOk: 'مطابق ضمن حد السماح',
      kpiVarianceAlert: 'يوجد فرق يتطلب المراجعة',
      kpiExceptions: 'ملاحظات واستثناءات المراجعة',
      kpiExceptionsUnit: 'تنبيه',
      kpiTasksVerified: 'مهام المراجعة',
      kpiTasksFlagged: 'به ملاحظة',
      infographicTitle: 'إنفوجرافيك التدفق المالي والتحصيل اليومي',
      infographicSubtitle: 'ملخص بصري لهيكل الإيرادات من الإجمالي إلى الصافي ونسب طرق التحصيل',
      waterfallTitle: 'تدفق الإيراد والضرائب والخصومات',
      grossTotalLabel: 'إجمالي الفواتير (Gross)',
      taxesAndSvcLabel: 'الخدمة والضرائب',
      rebatesLabel: 'الخصومات (Rebates)',
      netRealizedLabel: 'صافي الإيراد المحقق',
      collectionMixTitle: 'توزيع قنوات التحصيل (Collection Mix)',
      cashLabel: 'نقدي (Cash)',
      cardLabel: 'بطاقات (EDC)',
      cityLedgerLabel: 'ذمم شركات',
      roomChargeLabel: 'ترحيل غرف',
      deptChartTitle: 'توزيع الإيرادات حسب الأقسام والمنافذ',
      deptChartSubtitle: 'تحليل فوري لقيود الدفتر الحالية (الغرف، المطاعم، المشروبات، والخدمات الأخرى)',
      netMode: 'الصافي (Net)',
      grossMode: 'الإجمالي (Gross)',
      barMode: 'أعمدة بيانية',
      pieMode: 'نسب مئوية',
      emptyChartTitle: 'لا توجد قيود إيرادات مسجلة لعرض الرسم البياني',
      emptyChartDesc: 'أضف قيود غرف أو شيكات مطاعم من دفتر الترحيل والطوارئ ليظهر التوزيع هنا تلقائياً.',
      colDept: 'القسم / المنفذ',
      colCount: 'القيود',
      colShare: 'النسبة',
      colAmount: 'القيمة',
      exceptionsTitle: 'نتائج الفحص التلقائي للاستثناءات والفروقات',
      exceptionsSubtitle: 'كشف تلقائي لفجوات الشيكات، الأسعار الأقل من الحد الأدنى، الخصومات غير المعتمدة، وعجز الخزينة',
      noExceptionsTitle: 'لا توجد استثناءات أو فروقات مسجلة',
      noExceptionsDesc: 'جميع القيود وتسلسل الشيكات ومطابقة الخزينة سليمة.',
      critical: 'حرج',
      warning: 'تحذير',
      settlementTitle: 'مطابقة الخزينة والبطاقات وذمم الشركات',
      settlementSubtitle: 'مقارنة المتوقع دفترياً مع الجرد الفعلي للخزينة وتقارير ماكينات الـ EDC',
      expectedCash: 'النقدية المتوقعة (بعد خصم Paid Outs)',
      actualCashLabel: 'الجرد الفعلي لمظاريف الكاش (General Cashier Drop)',
      expectedCard: 'مبيعات البطاقات بالدفاتر (Visa / Mastercard)',
      actualCardLabel: 'إجمالي تسوية ماكينات البنك (EDC Z-Report Batch)',
      expectedCityLedger: 'آجل الشركات المتوقع (City Ledger)',
      actualCityLedgerLabel: 'إجمالي الفواتير الموقعة المستلمة',
      roomChargeTransfers: 'إجمالي ترحيلات الغرف من المطاعم والخدمات (Room Charge)',
      checklistTitle: 'قائمة مهام مراجع الإيرادات اليومية (Income Audit Checklist)',
      completedLabel: 'مكتمل',
      statusVerified: 'معتمد',
      statusFlagged: 'ملاحظة',
      statusPending: 'قيد الفحص',
      notePlaceholder: 'أضف ملاحظة المراجع أو رقم السند المرجعي...',
      hkTitle: 'تقرير تضارب الغرف (HK Discrepancy)',
      hkSubtitle: 'مقارنة كشف التدبير الفندقي الفعلي مع حالة الاستقبال',
      roomNumber: 'رقم الغرفة',
      foStatus: 'الاستقبال (FO)',
      hkStatus: 'الإشراف (HK)',
      hkNotePlaceholder: 'سبب التضارب أو نتيجة الفحص الفعلي...',
      saveDiscrepancy: 'حفظ التضارب',
      hkResolved: 'تمت المطابقة',
      hkOpen: 'مفتوح للمراجعة',
    },
    ledger: {
      formTitle: 'دفتر الترحيل الفوري للطوارئ (عند توقف الـ PMS / POS)',
      formSubtitle: 'سجّل فواتير الغرف أو شيكات المطاعم أو التسويات محلياً مع حساب تلقائي للخدمة والضريبة',
      liveGross: 'معاينة الإجمالي',
      sourceLabel: 'مصدر القيد',
      categoryLabel: 'نوع المعاملة',
      outletLabel: 'القسم / المنفذ',
      refLabelCheck: 'رقم الشيك #',
      refLabelRoom: 'رقم الغرفة / السند',
      descLabel: 'اسم النزيل أو بيان المعاملة',
      descPlaceholder: 'مثال: Walk-in Deluxe / Dinner Table 8',
      netLabel: 'المبلغ الصافي',
      paymentLabel: 'طريقة السداد',
      approverLabel: 'المعتمد / التوقيع (إلزامي للخصومات)',
      approverPlaceholder: 'Duty Manager / F&B Supervisor',
      addBtn: 'إضافة للدفتر',
      seqAlertPrefix: 'تنبيه تسلسل شيكات المطاعم: الشيكات المفقودة',
      seqAlertSuffix: 'غير موجودة في الدفتر.',
      seqVoidHint: 'يجب إرفاق أصل الشيك الملغى (Void Check) أو تسجيله يدوياً',
      filterAll: 'الكل',
      allDepts: 'كل الأقسام',
      searchPlaceholder: 'بحث برقم الغرفة، الشيك، أو النزيل...',
      colTimeSource: 'الوقت · المصدر',
      colTypeDept: 'النوع · القسم',
      colRef: 'المرجع',
      colDesc: 'البيان / النزيل',
      colNet: 'الصافي',
      colGross: 'الإجمالي',
      colPay: 'السداد',
      colApproval: 'الاعتماد والمراجعة',
      colAction: 'إجراء',
      noResults: 'لا توجد قيود مطابقة لمعايير البحث الحالية.',
      approveNow: 'بدون توقيع · اعتماد الآن',
      reconciled: 'مراجع',
      reconcile: 'مراجعة',
      categories: {
        Room: 'إيراد غرف',
        FoodBeverage: 'أغذية ومشروبات (F&B)',
        OtherRevenue: 'إيرادات أخرى',
        Rebate: 'خصم / تسوية (Rebate)',
        PaidOut: 'مصروف نثري (Paid Out)',
        Deposit: 'تأمين / مقدم حجز (Deposit)',
        Payment: 'تحصيل / سداد (Payment)',
        Adjustment: 'تعديل / تسوية مالية (Adjustment)',
      },
      sources: {
        PMS: 'PMS',
        POS: 'POS',
        OutageBackup: 'طوارئ أوفلاين',
        ManualEntry: 'إدخال يدوي',
      },
      payments: {
        Cash: 'نقدي (Cash)',
        CreditCard: 'بطاقة ائتمان (EDC)',
        CityLedger: 'آجل شركات (City Ledger)',
        RoomCharge: 'ترحيل للغرفة (Room Charge)',
        HouseUse: 'استخدام داخلي (House Use)',
      },
    },
    recovery: {
      title: 'ملفات التعافي والمزامنة مع Excel والـ PMS',
      subtitle: 'استورد ملفات الـ CSV المستخرجة من السيستم أو Excel للمراجعة البصرية، أو صدّر ملف إعادة الترحيل بعد عودة الـ PMS',
      resetDoneMsg: 'تمت استعادة بيانات الحالة التجريبية بنجاح.',
      importFailMsg: 'تعذر قراءة قيود صالحة من الملف. تأكد أن تنسيق الـ CSV مطابق لبنية الجدول.',
      importOkPrefix: 'تم استيراد قيود بنجاح:',
      card1Title: '1. تصدير الدفتر الكامل (CSV / Excel)',
      card1Desc: 'يحفظ الدفتر الكامل بترميز UTF-8 لفتحه مباشرة في Excel أو أرشفته.',
      card1Btn: 'تنزيل الدفتر الكامل',
      card2Title: '2. ملف إعادة الترحيل للـ PMS',
      card2Desc: 'يستخرج فقط القيود التي سُجّلت أثناء توقف السيستم لإدخالها في Opera أو Micros فور عودته.',
      card2Btn: 'تصدير قيود الطوارئ',
      card3Title: '3. استيراد ملف CSV للمراجعة',
      card3Desc: 'ارفع ملف الـ CSV المسجل من أجهزة الاستقبال أو المطاعم لدمجه في لوحة المراجعة وكشف الأخطاء.',
      card3Btn: 'استيراد ملف CSV',
      reportTitle: 'تقرير مراجعة الإيرادات اليومي',
      businessDateLabel: 'تاريخ اليوم المالي',
      auditorLabel: 'المراجع',
      revBreakdownTitle: 'تحليل الإيرادات والضرائب',
      roomNet: 'صافي إيرادات الغرف (Room Net)',
      fbNet: 'صافي الأغذية والمشروبات (F&B Net)',
      otherNet: 'إيرادات أخرى (Spa / Laundry)',
      svcAndVat: 'رسوم الخدمة + الضرائب',
      totalGross: 'إجمالي الإيراد المحقق',
      totalRebates: 'إجمالي الخصومات والتسويات (Rebates)',
      settlementSummaryTitle: 'ملخص مطابقة التحصيل والخزينة',
      cashExpAct: 'النقدية المتوقعة / الموردة',
      cardExpAct: 'البطاقات المتوقعة / تسوية EDC',
      clExpAct: 'ذمم الشركات المتوقعة / الموقعة',
      netVariance: 'صافي العجز / الزيادة',
      shiftNote: 'ملاحظة الشيفت',
    },
    settings: {
      policyTitle: 'إعدادات الفندق والضرائب وحدود الرقابة',
      policySubtitle: 'تُستخدم هذه القواعد تلقائياً في حساب الفواتير وكشف فروقات الأسعار والخصومات غير المعتمدة',
      hotelName: 'اسم الفندق',
      businessDate: 'تاريخ اليوم المالي (Business Date)',
      currency: 'العملة الأساسية',
      svcPct: 'نسبة رسوم الخدمة (Service Charge %)',
      vatPct: 'ضريبة القيمة المضافة (VAT %)',
      cityTaxPct: 'رسوم بلدية / سياحية إضافية (%)',
      minRoomRate: 'الحد الأدنى المعتمد لسعر الغرفة',
      rebateLimit: 'حد اعتماد الخصومات بدون توقيع',
      cashTolerance: 'حد السماحية لفرق الخزينة',
      totalRooms: 'إجمالي الغرف المتاحة بالفندق',
      budgetDaily: 'الموازنة التقديرية اليومية (Budget)',
      breakfastSplitPerPax: 'قيمة فصل الوجبة للفرد (Package Split)',
      outletsTitle: 'منافذ الأغذية والمشروبات (F&B Outlets)',
      outletsSubtitle: 'تظهر هذه المنافذ في قائمة الترحيل السريع عند تسجيل شيكات المطاعم والبارات',
      outletPlaceholder: 'مثال: Beach Bar أو Banquet Hall',
      addOutletBtn: 'إضافة منفذ',
      backupTitle: 'النسخ الاحتياطي الكامل على المتصفح (JSON Backup)',
      backupSubtitle: 'البيانات محفوظة تلقائياً في متصفحك لتعمل حتى لو انقطع السيستم، ويمكنك أخذ نسخة احتياطية كاملة لنقلها لأي جهاز',
      exportJsonBtn: 'تنزيل نسخة احتياطية كاملة (.json)',
      importJsonBtn: 'استعادة نسخة (.json)',
      backupOk: 'تمت استعادة نسخة المراجعة الكاملة بنجاح.',
      backupErr: 'تعذر قراءة ملف النسخة الاحتياطية. تأكد من صحة ملف الـ JSON.',
      exchangeRatesTitle: 'أسعار الصرف والعملة الأساسية (اليورو / الدولار / الجنيه المصري)',
      exchangeRatesSubtitle: 'حدد العملة الأساسية للفندق وعدّل سعر صرف كل عملة مقابلها ليتم التحويل تلقائياً في الدفتر ولوحة المراجعة',
      baseCurrencyTag: 'العملة الأساسية الحالية',
      resetRatesBtn: 'استعادة الأسعار الافتراضية',
      currencyNames: {
        EGP: 'جنيه مصري (EGP)',
        USD: 'دولار أمريكي (USD)',
        EUR: 'يورو أوروبي (EUR)',
        SAR: 'ريال سعودي (SAR)',
      },
    },
    guide: {
      kicker: 'إنفوجرافيك التشغيل السحابي · نظام المراجعة وبديل الطوارئ',
      heroTitle: 'كيف يعمل نظام Hotel Income Auditor في المراجعة اليومية وأثناء توقف سيستم الفندق',
      heroDesc: 'مخطط بصري متكامل يوضح مسار العمل من لحظة توقف الـ PMS/POS وحتى المراجعة التلقائية وإعادة الترحيل، مع حسبة الضرائب التلقائية والرقابة على التسرب المالي.',
      pipelineTitle: 'إنفوجرافيك دورة العمل والتعافي من توقف السيستم',
      pipelineSubtitle: 'مرتبط مباشرة بأرقام الشيفت الحالي للمنشأة المحددة',
      pipelineStages: [
        { step: '01', title: 'رصد توقف السيستم', sub: 'تفعيل وضع الطوارئ وعزل قيود الانقطاع', metricLabel: 'وضع الطوارئ' },
        { step: '02', title: 'التسجيل الفوري أوفلاين', sub: 'ترحيل الغرف والمطاعم وحساب الضرائب بالمتصفح', metricLabel: 'قيود مسجلة' },
        { step: '03', title: 'محرك الفحص التلقائي', sub: 'كشف الشيكات المفقودة وفروقات الأسعار والخزينة', metricLabel: 'تنبيهات مرصودة' },
        { step: '04', title: 'ملف التعافي والترحيل', sub: 'تصدير CSV جاهز لإدخاله في Opera / Micros', metricLabel: 'قيود للتعافي' },
      ],
      taxInfographicTitle: 'إنفوجرافيك معادلة احتساب الإيراد والضريبة',
      taxInfographicSubtitle: 'كيف يحسب النظام الفاتورة تلقائياً بناءً على نسب الضرائب النشطة لفندقك',
      taxBase: 'المبلغ الصافي (Net)',
      taxSvc: 'رسوم الخدمة',
      taxVat: 'الضرائب والرسوم',
      taxGross: 'الإجمالي المحصّل (Gross)',
      capabilitiesTitle: 'الوظائف الرقابية التلقائية للنظام',
      capabilitiesSubtitle: '6 محركات فحص تعمل لحظياً على كل قيد يتم تسجيله أو استيراده',
      workflowTitle: 'طريقة الاستخدام خطوة بخطوة',
      workflowSubtitle: 'اختر سيناريو التشغيل المناسب لعرض تسلسل العمل الموصى به',
      scenarioOutage: 'أثناء توقف السيستم (طوارئ)',
      scenarioDaily: 'المراجعة اليومية الاعتيادية',
      rulesTitle: 'قواعد الفحص التلقائي المطبقة حالياً',
      rulesSubtitle: 'القيم النشطة التي يقيس عليها النظام لاكتشاف التنبيهات الحرجة والتحذيرات',
      editRulesBtn: 'تعديل القواعد والنسب',
      ruleTaxes: 'الضرائب والخدمة المحسوبة',
      ruleMinRate: 'الحد الأدنى لسعر الغرفة',
      ruleRebate: 'حد اعتماد الخصم بدون توقيع',
      ruleCashTol: 'سماحية فرق الخزينة المسموح',
      capabilities: [
        { index: '01', title: 'مطابقة الإيرادات والضرائب تلقائياً', desc: 'فصل صافي إيرادات الغرف والأغذية والمشروبات والخدمات الأخرى، وحساب رسوم الخدمة والضريبة آلياً لكل معاملة مع رسم بياني تفاعلي.' },
        { index: '02', title: 'كشف فجوات تسلسل الشيكات', desc: 'فحص أرقام شيكات المطاعم والبارات لاكتشاف أي رقم مفقود أو ملغى غير مسجل بين شيكين متتاليين لمنع تسرب الإيرادات.' },
        { index: '03', title: 'الرقابة على أسعار الغرف والخصومات', desc: 'رصد أي غرفة بسعر أقل من الحد الأدنى المعتمد، وتنبيه المراجع فوراً لأي خصم (Rebate) يتجاوز الحد بدون توقيع إداري.' },
        { index: '04', title: 'مطابقة الخزينة وماكينات البطاقات', desc: 'مقارنة النقدية المتوقعة (بعد خصم Paid Outs) مع الجرد الفعلي للخزينة، ومطابقة تسوية ماكينات الـ EDC وذمم الشركات.' },
        { index: '05', title: 'متابعة تضارب الغرف (HK Discrepancy)', desc: 'تسجيل ومطابقة الفروقات بين تقرير الاستقبال وتقرير التدبير الفندقي لاكتشاف الغرف المسكونة غير المرحلة.' },
        { index: '06', title: 'تعدد العملات واللغات (EGP / USD / EUR)', desc: 'إدارة كاملة للعملة الأساسية وأسعار الصرف مع دعم فوري للترحيل بعدة عملات والعمل بالعربية والإنجليزية والفرنسية.' },
      ],
      outageSteps: [
        { step: '01', title: 'تفعيل وضع الطوارئ (Outage Mode)', detail: 'من أسفل القائمة الجانبية، اختر «طوارئ (Outage)» لتنبيه الفريق بأن السيستم الأساسي متوقف وأن الترحيل يتم محلياً.', actionLabel: 'انتقل إلى دفتر الطوارئ', target: 'ledger' },
        { step: '02', title: 'تسجيل الغرف وشيكات المطاعم والخصومات', detail: 'في صفحة «دفتر الترحيل والطوارئ»، سجّل فواتير النزلاء الجدد وشيكات المطاعم والمصروفات النثرية مع حساب الضريبة تلقائياً.', actionLabel: 'إضافة قيد طوارئ الآن', target: 'ledger' },
        { step: '03', title: 'مراجعة الفروقات وجرد نهاية الشيفت', detail: 'افتح «لوحة المراجعة اليومية» لمراجعة التنبيهات والإنفوجرافيك المالي، ثم أدخل أرقام جرد الكاش الفعلي وتقرير الـ EDC.', actionLabel: 'عرض لوحة المراجعة', target: 'dashboard' },
        { step: '04', title: 'إعادة الترحيل بعد عودة السيستم', detail: 'من صفحة «المزامنة وملفات التعافي»، اضغط «تصدير قيود الطوارئ» لتنزيل ملف CSV جاهز للإدخال في الـ PMS.', actionLabel: 'فتح ملفات التعافي', target: 'recovery' },
      ],
      dailySteps: [
        { step: '01', title: 'ضبط سياسة الفندق والضرائب والمنافذ', detail: 'تأكد من ضبط نسب الخدمة والضريبة، والحد الأدنى لسعر الغرفة، وأسماء منافذ الأغذية والمشروبات في صفحة الإعدادات.', actionLabel: 'مراجعة الإعدادات', target: 'settings' },
        { step: '02', title: 'استيراد أو تسجيل بيانات اليوم المالي', detail: 'استورد ملف CSV المستخرج من تقارير اليوم أو أضف الحركات يدوياً، واستعرض الإنفوجرافيك والرسوم البيانية للأقسام.', actionLabel: 'استيراد أو تصدير CSV', target: 'recovery' },
        { step: '03', title: 'فحص الاستثناءات واعتماد السندات المعلقة', detail: 'راجع التنبيهات الحرجة وتضارب التدبير الفندقي واعتمد الخصومات المستوفية للتوقيع مباشرة من الجدول.', actionLabel: 'فحص الاستثناءات', target: 'dashboard' },
        { step: '04', title: 'إتمام قائمة المهام وطباعة التقرير النهائي', detail: 'استكمل حالة المهام الثمانية في قائمة المراجعة مع تدوين الملاحظات، ثم اطبع تقرير المراجعة اليومي للاعتماد.', actionLabel: 'الانتقال للطباعة والتصدير', target: 'recovery' },
      ],
    },
    kwentraCompare: {
      title: 'مقارنة ومطابقة القيم مع سيستم Kwentra الأصلي',
      subtitle: 'أدخل أرقام تقرير الـ Night Audit أو الـ Manager Flash من سيستم Kwentra الأصلي (أو استورد ملف CSV) لاكتشاف أي فرق مع السجل المحلي فوراً',
      reportRefLabel: 'رقم مرجع تقرير Kwentra',
      lastUpdatedLabel: 'آخر تحديث / وقت التقرير',
      importCsvBtn: 'استيراد ملف Kwentra CSV',
      copyLocalBtn: 'نسخ القيم الحالية كمرجع',
      zeroOutBtn: 'تصفير أرقام Kwentra',
      printBtn: 'طباعة ورقة المطابقة',
      importSuccess: 'تم تحديث أرقام Kwentra من الملف بنجاح:',
      importError: 'تعذر قراءة أرقام صالحة من الملف. استخدم ملف CSV يحتوي على الأعمدة القياسية أو جدول الملخص.',
      kpiLocalGross: 'إجمالي الإيراد هنا (Hotel Income Auditor)',
      kpiKwentraGross: 'إجمالي الإيراد في Kwentra',
      kpiNetDiff: 'صافي الفرق (هنا - Kwentra)',
      kpiMatchRate: 'معدل تطابق البنود',
      kpiMatched: 'مطابق تماماً ضمن حد السماح',
      kpiHasDiff: 'يوجد فرق يتطلب المراجعة',
      kpiLinesMatched: 'بند مطابق من أصل',
      kpiTopDriver: 'أكبر فرق في:',
      kpiNoDriver: 'لا توجد فروقات مسجلة',
      chartTitle: 'مقارنة مرئية: Hotel Income Auditor مقابل سيستم Kwentra الأصلي',
      chartSubtitle: 'مقارنة مباشرة للأقسام والضرائب وقنوات التحصيل لكشف مكان الفرق بصرياً',
      seriesLocal: 'القيمة هنا (Hotel Income Auditor)',
      seriesKwentra: 'سيستم Kwentra الأصلي',
      matrixTitle: 'جدول المطابقة التفصيلي (تعديل مباشر لأرقام Kwentra)',
      matrixSubtitle: 'اكتب الرقم الظاهر أمامك على شاشة Kwentra في عمود "سيستم Kwentra الأصلي" وسيتم حساب الفرق والنسبة تلقائياً',
      filterAll: 'كل البنود (12)',
      filterDiffsOnly: 'الفروقات فقط',
      colItem: 'البند المالي',
      colGroup: 'التصنيف',
      colLocal: 'المسجل هنا',
      colKwentra: 'سيستم Kwentra الأصلي',
      colVariance: 'الفرق (هنا - Kwentra)',
      colPct: 'نسبة الفرق',
      colStatus: 'الحالة',
      statusMatch: 'مطابق',
      statusOver: 'زيادة هنا',
      statusShort: 'نقص عن Kwentra',
      groupRevenue: 'الإيرادات والضرائب',
      groupDeductions: 'الخصومات والمصروفات',
      groupSettlement: 'طرق التحصيل',
      rows: {
        roomNet: 'صافي إيرادات الغرف (Room Net)',
        fbNet: 'صافي الأغذية والمشروبات (F&B Net)',
        otherNet: 'إيرادات أخرى (Spa / Laundry)',
        serviceCharge: 'رسوم الخدمة (Service Charge)',
        vatAndTaxes: 'الضرائب والرسوم (VAT + City Tax)',
        grossTotal: 'إجمالي الإيرادات (Gross Revenue)',
        rebates: 'الخصومات والتسويات (Rebates)',
        paidOuts: 'المصروفات النثرية (Paid Outs)',
        cash: 'التحصيل النقدي (Cash)',
        creditCard: 'البطاقات الائتمانية (EDC / Cards)',
        cityLedger: 'ذمم الشركات (City Ledger)',
        roomCharge: 'ترحيلات الغرف (Room Charge)',
      },
      noteLabel: 'ملاحظات المراجع حول أسباب الفرق مع Kwentra',
      notePlaceholder: 'دوّن هنا رقم الفاتورة المفقودة أو سبب التباين بين السيستم الأصلي وهذا السجل...',
    },
    reports: {
      title: 'مركز التقارير الشامل (معاينة · تصدير لكافة الصيغ · طباعة)',
      subtitle: 'اختر أي تقرير من تقارير مراجع الإيرادات لاستعراضه وتصديره بصيغ Excel أو CSV أو HTML أو JSON أو طباعته مباشرة',
      exportFormatsLabel: 'تصدير التقرير المحدد:',
      exportCsv: 'تصدير CSV',
      exportExcel: 'تصدير Excel (.xls)',
      exportJson: 'تصدير JSON',
      exportHtml: 'تصدير HTML',
      printBtn: 'طباعة / حفظ PDF',
      exportPackJson: 'تصدير حزمة كل التقارير (.json)',
      exportedNotice: 'تم تنزيل التقرير بنجاح:',
      reportTabs: {
        executive: '1. تقرير المراجعة اليومي التنفيذي',
        departments: '2. تقرير إيرادات الأقسام والمنافذ',
        kwentra: '3. تقرير مطابقة سيستم Kwentra',
        exceptions: '4. تقرير الاستثناءات وتضارب الغرف',
        ledger: '5. تقرير دفتر الحركات والطوارئ',
        checklist: '6. تقرير قائمة مهام المراجع (8 نقاط)',
        archive: '7. أرشيف الأيام ومؤشرات الفندق (KPIs)',
        cashiers: '8. تقرير البنوك EDC وشيفتات الكاشير',
        otas: '9. تقرير عقود OTAs وأعمار ذمم الشركات',
        beoTrail: '10. تقرير الحفلات BEO وسجل المراجعة',
      },
      executiveDesc: 'ملخص الإيرادات الصافية والضرائب وتسوية الخزينة والبطاقات بالعملة الأساسية وما يعادلها باليورو والدولار والمصري.',
      departmentsDesc: 'تحليل تفصيلي لإيرادات كل قسم ومنفذ أطعمة ومشروبات مع رسوم الخدمة والضريبة ونسبة المساهمة.',
      kwentraDesc: 'ورقة المقارنة الكاملة بين القيم المسجلة هنا وأرقام سيستم Kwentra الأصلي مع الفروقات ونسب التباين.',
      exceptionsDesc: 'كافة التنبيهات الحرجة والتحذيرات (الشيكات المفقودة، الأسعار المنخفضة، الخصومات) بالإضافة لتضارب التدبير الفندقي.',
      ledgerDesc: 'كشف الحركات التفصيلي بالوقت والمصدر وطريقة السداد والاعتماد (مع خيار عزل قيود الطوارئ فقط).',
      checklistDesc: 'تقرير اعتماد مهام المراجعة اليومية الثمانية جاهز للتوقيع والطباعة.',
      archiveDesc: 'سجل الأيام المالية المغلقة ونسب الإشغال وADR وRevPAR والإيراد التراكمي للشهر.',
      cashiersDesc: 'مطابقة دفعات ماكينات البنوك (EDC) وعمولاتها ومظاريف شيفتات الكاشير (العجز والزيادة).',
      otasDesc: 'تدقيق أسعار وعمولات قنوات الحجز (Booking / Expedia) وجدول أعمار ذمم الشركات (0-90+ يوم).',
      beoTrailDesc: 'متابعة عقود الحفلات والمؤتمرات (BEO) والعربون المحصل مع سجل التدقيق الزمني غير القابل للتعديل.',
      outageOnlyToggle: 'عرض قيود الطوارئ فقط (Outage Backup)',
      signOffAuditor: 'توقيع مراجع الإيرادات',
      signOffCashier: 'توقيع أمين الخزينة العام',
      signOffController: 'اعتماد المدير المالي',
      cols: {
        metric: 'البند المالي',
        amountBase: 'القيمة بالعملة الأساسية',
        equivUsd: 'المعادل بالدولار (USD)',
        equivEur: 'المعادل باليورو (EUR)',
        equivEgp: 'المعادل بالمصري (EGP)',
        dept: 'القسم / المنفذ',
        entriesCount: 'عدد القيود',
        net: 'الصافي (Net)',
        svc: 'رسوم الخدمة',
        vat: 'الضرائب',
        gross: 'الإجمالي (Gross)',
        share: 'النسبة %',
        severity: 'الخطورة',
        category: 'التصنيف',
        title: 'العنوان',
        detail: 'التفاصيل',
        task: 'بند المراجعة',
        status: 'الحالة',
        notes: 'ملاحظات المراجع',
      },
    },
  },
  en: {
    dir: 'ltr',
    brandName: 'Hotel Income Auditor',
    languageLabel: 'Language',
    propertyLabel: 'Hotel Property',
    entriesUnit: 'Entries',
    navGroups: {
      operations: 'Operations & Audit',
      specialized: 'Specialized Audit Suite',
      configuration: 'Configuration & Help',
    },
    nav: {
      dashboard: 'Daily Audit Dashboard',
      incomeAudit: 'Income Audit & Room Engine',
      ledger: 'Outage & Posting Ledger',
      rooms: 'Hotel Rooms (Room Rack)',
      compare: 'Kwentra PMS Compare',
      auditSuite: 'Archive, Cashiers & Trail',
      receivables: 'OTAs, City Ledger & BEO',
      reports: 'Reports & Export Center',
      recovery: 'Sync & Recovery Pack',
      settings: 'Property & Tax Rules',
      guide: 'Infographic & User Guide',
    },
    breadcrumbs: {
      dashboard: 'Cloud Operations / Executive Audit & Infographics',
      incomeAudit: 'Income Audit / Daily Room Revenue Engine, Exceptions & Closing Gate',
      ledger: 'Front Office & Outlets / Transaction Ledger',
      rooms: 'Front Office / Manual Hotel Room Inventory & Room Rack',
      compare: 'Auditor Reconciliation / Local vs Original Kwentra PMS',
      auditSuite: 'Specialized Audit / Daily Archive, Cash Count, EDC & Trail',
      receivables: 'Specialized Audit / OTA Audit, City Ledger Aging & Banquet BEO',
      reports: 'Reports Center / Multi-Format Export & Print',
      recovery: 'Night Audit / Recovery & Print Pack',
      settings: 'Property Admin / Taxes & Control Thresholds',
      guide: 'Help Center / Operational Infographic & Guide',
    },
    connection: {
      title: 'PMS / POS Connection State',
      normal: 'Online (Normal)',
      outage: 'Outage Mode',
      normalDesc: 'Primary PMS/POS is active — reconcile daily revenues, EDC batches, and cash drops.',
      outageDesc: 'Primary PMS/POS is down — transactions save locally in browser for recovery posting.',
      bannerText: 'System Outage Contingency Active: All Room & F&B postings are stored locally with recovery CSV ready for PMS re-entry.',
      bannerAction: 'Export Recovery Files',
    },
    actions: {
      exportCsv: 'Export CSV',
      addOutageEntry: 'Post Outage Entry',
      openMenu: 'Open navigation',
      adjustRules: 'Configure Rules',
      openLedger: 'Open Outage Ledger',
      registerNew: 'Post First Entry',
      addRoom: 'Add Room',
      save: 'Save',
      cancel: 'Cancel',
      yes: 'Confirm',
      printReport: 'Print Audit Report',
      resetSample: 'Reset Sample Data',
      confirmReset: 'Confirm reset?',
    },
    dashboard: {
      kpiGross: 'Total Gross Revenue (Incl. Taxes)',
      kpiRoomsLabel: 'Rooms Net',
      kpiFbLabel: 'F&B Net',
      kpiOutage: 'Contingency Entries (During Outage)',
      kpiOutageUnit: 'Manual Postings',
      kpiVariance: 'Net Settlement Variance',
      kpiVarianceOk: 'Reconciled within tolerance',
      kpiVarianceAlert: 'Variance requires investigation',
      kpiExceptions: 'Automated Audit Exceptions',
      kpiExceptionsUnit: 'Alerts',
      kpiTasksVerified: 'Checklist',
      kpiTasksFlagged: 'flagged',
      infographicTitle: 'Revenue Flow & Collection Mix Infographic',
      infographicSubtitle: 'Visual waterfall from Gross Billings to Net Realized Revenue and payment channel shares',
      waterfallTitle: 'Revenue, Taxes & Allowances Flow',
      grossTotalLabel: 'Gross Billings',
      taxesAndSvcLabel: 'Service & VAT',
      rebatesLabel: 'Rebates / Allowances',
      netRealizedLabel: 'Net Realized Revenue',
      collectionMixTitle: 'Collection Channels Share',
      cashLabel: 'Cash',
      cardLabel: 'Credit Card (EDC)',
      cityLedgerLabel: 'City Ledger',
      roomChargeLabel: 'Room Charge',
      deptChartTitle: 'Revenue Distribution by Department & Outlet',
      deptChartSubtitle: 'Live breakdown of Rooms, Restaurants, Lounges, and Ancillary revenue',
      netMode: 'Net Revenue',
      grossMode: 'Gross Revenue',
      barMode: 'Bar Chart',
      pieMode: 'Share Donut',
      emptyChartTitle: 'No revenue postings recorded yet',
      emptyChartDesc: 'Add room or F&B transactions in the Outage Ledger to visualize department distribution.',
      colDept: 'Department / Outlet',
      colCount: 'Count',
      colShare: 'Share',
      colAmount: 'Amount',
      exceptionsTitle: 'Automated Exception & Anomaly Engine',
      exceptionsSubtitle: 'Detects F&B check sequence gaps, below-floor room rates, unapproved rebates, and cash variances',
      noExceptionsTitle: 'Zero audit exceptions detected',
      noExceptionsDesc: 'All postings, check sequences, and cash/EDC drops are balanced.',
      critical: 'Critical',
      warning: 'Warning',
      settlementTitle: 'General Cashier, EDC & City Ledger Settlement',
      settlementSubtitle: 'Compare ledger expectations against physical cash drop and bank terminal Z-Reports',
      expectedCash: 'Expected Cash (Net of Paid Outs)',
      actualCashLabel: 'Physical Cash Drop Count (General Cashier)',
      expectedCard: 'Expected Card Sales (Visa / Mastercard)',
      actualCardLabel: 'Actual Bank Terminal Batch (EDC Z-Report)',
      expectedCityLedger: 'Expected City Ledger (Direct Billing)',
      actualCityLedgerLabel: 'Signed Corporate Folios Received',
      roomChargeTransfers: 'POS-to-PMS Room Charge Transfers',
      checklistTitle: 'Daily Income Auditor Checklist',
      completedLabel: 'completed',
      statusVerified: 'Verified',
      statusFlagged: 'Flagged',
      statusPending: 'Pending',
      notePlaceholder: 'Add auditor note or voucher reference...',
      hkTitle: 'Housekeeping Room Discrepancy',
      hkSubtitle: 'Compare physical Housekeeping count against Front Office status',
      roomNumber: 'Room #',
      foStatus: 'Front Office',
      hkStatus: 'Housekeeping',
      hkNotePlaceholder: 'Discrepancy reason or verification result...',
      saveDiscrepancy: 'Save Discrepancy',
      hkResolved: 'Resolved',
      hkOpen: 'Open Review',
    },
    ledger: {
      formTitle: 'Outage & Contingency Posting Desk',
      formSubtitle: 'Record Room folios, F&B checks, or allowances locally with live Service Charge & VAT calculation',
      liveGross: 'Live Gross Preview',
      sourceLabel: 'Source',
      categoryLabel: 'Transaction Type',
      outletLabel: 'Department / Outlet',
      refLabelCheck: 'Check #',
      refLabelRoom: 'Room / Voucher #',
      descLabel: 'Guest Name / Description',
      descPlaceholder: 'e.g., Walk-in Deluxe / Dinner Table 8',
      netLabel: 'Net Amount',
      paymentLabel: 'Settlement Method',
      approverLabel: 'Approved By (Required for Rebates)',
      approverPlaceholder: 'Duty Manager / F&B Supervisor',
      addBtn: 'Add to Ledger',
      seqAlertPrefix: 'F&B Check Sequence Alert: Missing checks',
      seqAlertSuffix: 'not found in ledger sequence.',
      seqVoidHint: 'Attach signed Void Check copy or post the missing ticket.',
      filterAll: 'All',
      allDepts: 'All Departments',
      searchPlaceholder: 'Search room #, check #, or guest...',
      colTimeSource: 'Time · Source',
      colTypeDept: 'Type · Dept',
      colRef: 'Ref #',
      colDesc: 'Description',
      colNet: 'Net',
      colGross: 'Gross',
      colPay: 'Payment',
      colApproval: 'Approval & Audit',
      colAction: 'Action',
      noResults: 'No entries match your active filters.',
      approveNow: 'Unapproved · Approve',
      reconciled: 'Audited',
      reconcile: 'Verify',
      categories: {
        Room: 'Room Revenue',
        FoodBeverage: 'Food & Beverage',
        OtherRevenue: 'Other Revenue',
        Rebate: 'Rebate / Allowance',
        PaidOut: 'Paid Out',
        Deposit: 'Advance Deposit',
        Payment: 'Guest Payment',
        Adjustment: 'Financial Adjustment',
      },
      sources: {
        PMS: 'PMS',
        POS: 'POS',
        OutageBackup: 'Outage Backup',
        ManualEntry: 'Manual Entry',
      },
      payments: {
        Cash: 'Cash',
        CreditCard: 'Credit Card (EDC)',
        CityLedger: 'City Ledger',
        RoomCharge: 'Room Charge',
        HouseUse: 'House Use',
      },
    },
    recovery: {
      title: 'PMS Recovery Files & Excel CSV Sync',
      subtitle: 'Import CSV sheets exported from PMS/Excel for audit inspection, or export outage-only postings for PMS recovery',
      resetDoneMsg: 'Property sample dataset restored successfully.',
      importFailMsg: 'Could not parse valid entries. Ensure CSV columns match the standard ledger format.',
      importOkPrefix: 'Imported entries successfully:',
      card1Title: '1. Export Full Ledger (CSV / Excel)',
      card1Desc: 'Downloads UTF-8 BOM CSV compatible with Microsoft Excel and archive records.',
      card1Btn: 'Download Full Ledger',
      card2Title: '2. PMS Recovery Postings Only',
      card2Desc: 'Extracts only Outage Backup transactions for fast re-entry into Opera or Micros upon recovery.',
      card2Btn: 'Export Outage Postings',
      card3Title: '3. Import CSV for Audit Review',
      card3Desc: 'Upload CSV sheets recorded at Front Desk or Outlets to merge and run exception checks.',
      card3Btn: 'Import CSV File',
      reportTitle: 'Daily Income Audit Report',
      businessDateLabel: 'Business Date',
      auditorLabel: 'Auditor',
      revBreakdownTitle: 'Revenue & Tax Breakdown',
      roomNet: 'Room Revenue (Net)',
      fbNet: 'Food & Beverage (Net)',
      otherNet: 'Other Revenue (Spa / Laundry)',
      svcAndVat: 'Service Charge + Taxes',
      totalGross: 'Total Gross Revenue',
      totalRebates: 'Total Rebates & Allowances',
      settlementSummaryTitle: 'Settlement Reconciliation Summary',
      cashExpAct: 'Cash Expected / Dropped',
      cardExpAct: 'Card Expected / EDC Batch',
      clExpAct: 'City Ledger Expected / Signed',
      netVariance: 'Net Settlement Variance',
      shiftNote: 'Shift Remarks',
    },
    settings: {
      policyTitle: 'Property Policy, Taxes & Audit Control Thresholds',
      policySubtitle: 'Rules used automatically for tax extraction, rate variance checks, and rebate authorization alerts',
      hotelName: 'Property Name',
      businessDate: 'Business Date',
      currency: 'Base Currency',
      svcPct: 'Service Charge (%)',
      vatPct: 'VAT (%)',
      cityTaxPct: 'Municipality / City Tax (%)',
      minRoomRate: 'Minimum Approved Room Rate',
      rebateLimit: 'Rebate Signature Threshold',
      cashTolerance: 'Cash Variance Tolerance',
      totalRooms: 'Total Available Hotel Rooms',
      budgetDaily: 'Daily Revenue Budget Target',
      breakfastSplitPerPax: 'Package Meal Split per Pax',
      outletsTitle: 'F&B Outlets & Revenue Centers',
      outletsSubtitle: 'Configured outlets appear in the posting desk and department distribution charts',
      outletPlaceholder: 'e.g., Beach Bar or Banquet Hall',
      addOutletBtn: 'Add Outlet',
      backupTitle: 'Full Browser Snapshot (JSON Backup)',
      backupSubtitle: 'Data persists automatically offline in your browser. Export a full JSON snapshot to transfer across workstations.',
      exportJsonBtn: 'Download Full Backup (.json)',
      importJsonBtn: 'Restore Backup (.json)',
      backupOk: 'Full property audit snapshot restored successfully.',
      backupErr: 'Invalid JSON backup file.',
      exchangeRatesTitle: 'Base Currency & Exchange Rates (EUR / USD / EGP)',
      exchangeRatesSubtitle: 'Choose the hotel base currency and adjust exchange rates used for ledger conversion and multi-currency equivalents',
      baseCurrencyTag: 'Active Base',
      resetRatesBtn: 'Reset Default Rates',
      currencyNames: {
        EGP: 'Egyptian Pound (EGP)',
        USD: 'US Dollar (USD)',
        EUR: 'Euro (EUR)',
        SAR: 'Saudi Riyal (SAR)',
      },
    },
    guide: {
      kicker: 'Cloud Operations Infographic · Income Audit & Contingency Workflow',
      heroTitle: 'How Hotel Income Auditor Protects Hotel Revenue During Daily Audits & System Outages',
      heroDesc: 'An end-to-end visual guide showing the contingency pipeline from PMS/POS downtime to automated exception detection, tax calculation, and PMS recovery.',
      pipelineTitle: 'Outage-to-Recovery Visual Pipeline',
      pipelineSubtitle: 'Connected live to your active property metrics',
      pipelineStages: [
        { step: '01', title: 'Outage Detection', sub: 'Activate Contingency Mode to isolate manual postings', metricLabel: 'System Mode' },
        { step: '02', title: 'Offline Ledger Entry', sub: 'Post Rooms & F&B with instant Service & VAT math', metricLabel: 'Logged Entries' },
        { step: '03', title: 'Exception Audit Engine', sub: 'Catch missing checks, low rates & cash variances', metricLabel: 'Active Alerts' },
        { step: '04', title: 'PMS Recovery Export', sub: 'Download Outage CSV ready for Opera / Micros re-entry', metricLabel: 'Recovery Rows' },
      ],
      taxInfographicTitle: 'Tax & Revenue Calculation Infographic',
      taxInfographicSubtitle: 'How every folio and F&B check is computed using your active property tax rates',
      taxBase: 'Net Amount',
      taxSvc: 'Service Charge',
      taxVat: 'VAT & City Tax',
      taxGross: 'Total Gross Billed',
      capabilitiesTitle: 'Automated Audit Engines',
      capabilitiesSubtitle: 'Six real-time controls running continuously across all recorded and imported entries',
      workflowTitle: 'Step-by-Step Operational Guide',
      workflowSubtitle: 'Switch between Outage Contingency and Standard Daily Audit workflows',
      scenarioOutage: 'During System Outage',
      scenarioDaily: 'Standard Daily Income Audit',
      rulesTitle: 'Active Property Control Thresholds',
      rulesSubtitle: 'Current rules governing critical and warning alerts',
      editRulesBtn: 'Edit Rules & Taxes',
      ruleTaxes: 'Active Service & Tax Rates',
      ruleMinRate: 'Minimum Room Rate Floor',
      ruleRebate: 'Rebate Approval Limit',
      ruleCashTol: 'Cash Drop Tolerance',
      capabilities: [
        { index: '01', title: 'Automated Revenue & Tax Split', desc: 'Separates Room, F&B, and Other Revenue net totals while extracting Service Charge and VAT automatically with live Recharts visuals.' },
        { index: '02', title: 'Sequential Check Gap Detection', desc: 'Scans F&B check numbers to catch missing or unrecorded void tickets between consecutive check numbers.' },
        { index: '03', title: 'Rate Floor & Rebate Governance', desc: 'Flags any room billed below minimum contract rate and catches rebates above limit lacking manager sign-off.' },
        { index: '04', title: 'Cash Drop & EDC Reconciliation', desc: 'Reconciles expected cash (after Paid Outs) against General Cashier counts, EDC terminal batches, and City Ledger vouchers.' },
        { index: '05', title: 'Housekeeping Discrepancy Tracking', desc: 'Tracks Front Office vs Housekeeping room status conflicts to uncover unposted sleepers or outage walk-ins.' },
        { index: '06', title: 'Multi-Currency & Multilingual Engine', desc: 'Configure base currency and exchange rates (EGP, USD, EUR) with full Arabic (RTL), English, and French support.' },
      ],
      outageSteps: [
        { step: '01', title: 'Enable Outage Mode', detail: 'Select Outage Mode at the bottom of the sidebar so all team members know postings are running on local contingency.', actionLabel: 'Open Outage Ledger', target: 'ledger' },
        { step: '02', title: 'Post Walk-ins & F&B Checks', detail: 'Record every manual room folio, restaurant check, and paid-out in the Outage Ledger with instant tax calculation.', actionLabel: 'Post Entry Now', target: 'ledger' },
        { step: '03', title: 'Verify Exceptions & Cash Drop', detail: 'Review automated alerts, collection mix infographic, and enter actual General Cashier cash & EDC Z-Report totals.', actionLabel: 'View Dashboard', target: 'dashboard' },
        { step: '04', title: 'Export Recovery CSV', detail: 'When PMS/POS comes back online, export Outage-only postings from Sync & Recovery for fast re-entry.', actionLabel: 'Open Recovery Pack', target: 'recovery' },
      ],
      dailySteps: [
        { step: '01', title: 'Verify Property Tax & Control Rules', detail: 'Confirm Service Charge, VAT, minimum room rates, and outlet names in Property Settings.', actionLabel: 'Check Settings', target: 'settings' },
        { step: '02', title: 'Import or Record Daily Activity', detail: 'Import PMS/POS CSV exports or enter transactions manually, then review department distribution charts.', actionLabel: 'Import / Export CSV', target: 'recovery' },
        { step: '03', title: 'Clear Exceptions & Discrepancies', detail: 'Investigate missing check sequences, approve pending rebates inline, and resolve HK room discrepancies.', actionLabel: 'Inspect Exceptions', target: 'dashboard' },
        { step: '04', title: 'Complete Checklist & Print Sign-Off', detail: 'Finalize all 8 Income Audit Checklist items and print the daily sign-off report for Financial Controller review.', actionLabel: 'Print Audit Report', target: 'recovery' },
      ],
    },
    kwentraCompare: {
      title: 'Original Kwentra PMS Value Comparison',
      subtitle: 'Enter figures from your original Kwentra Night Audit / Manager Flash report (or import a Kwentra CSV) to detect exact line-by-line variances',
      reportRefLabel: 'Kwentra Report Reference',
      lastUpdatedLabel: 'Kwentra Cutoff / Time',
      importCsvBtn: 'Import Kwentra CSV',
      copyLocalBtn: 'Copy Local as Baseline',
      zeroOutBtn: 'Clear Kwentra Values',
      printBtn: 'Print Reconciliation Sheet',
      importSuccess: 'Kwentra values populated from CSV:',
      importError: 'Could not extract valid figures from the CSV file.',
      kpiLocalGross: 'Local Gross (Hotel Income Auditor)',
      kpiKwentraGross: 'Original Kwentra Gross',
      kpiNetDiff: 'Net Variance (Local - Kwentra)',
      kpiMatchRate: 'Line Match Score',
      kpiMatched: 'Matched within tolerance',
      kpiHasDiff: 'Variance requires review',
      kpiLinesMatched: 'lines matched out of',
      kpiTopDriver: 'Largest gap:',
      kpiNoDriver: 'All lines balanced',
      chartTitle: 'Visual Comparison: Hotel Income Auditor vs Original Kwentra PMS',
      chartSubtitle: 'Side-by-side chart across departments, taxes, and payment channels',
      seriesLocal: 'Local (Hotel Income Auditor)',
      seriesKwentra: 'Original Kwentra PMS',
      matrixTitle: 'Line-by-Line Reconciliation Matrix (Editable Kwentra Column)',
      matrixSubtitle: 'Type the numbers shown on your Kwentra screen directly into the Kwentra column to compute live differences',
      filterAll: 'All Lines (12)',
      filterDiffsOnly: 'Variances Only',
      colItem: 'Financial Line Item',
      colGroup: 'Group',
      colLocal: 'Local (Hotel Income Auditor)',
      colKwentra: 'Original Kwentra',
      colVariance: 'Variance (Local - Kwentra)',
      colPct: 'Diff %',
      colStatus: 'Status',
      statusMatch: 'Matched',
      statusOver: 'Higher Locally',
      statusShort: 'Lower vs Kwentra',
      groupRevenue: 'Revenue & Taxes',
      groupDeductions: 'Deductions',
      groupSettlement: 'Payment Channels',
      rows: {
        roomNet: 'Room Revenue (Net)',
        fbNet: 'Food & Beverage (Net)',
        otherNet: 'Other Revenue (Spa / Laundry)',
        serviceCharge: 'Service Charge',
        vatAndTaxes: 'VAT & City Taxes',
        grossTotal: 'Total Gross Revenue',
        rebates: 'Rebates & Allowances',
        paidOuts: 'Paid Outs',
        cash: 'Cash Receipts',
        creditCard: 'Credit Card (EDC)',
        cityLedger: 'City Ledger (AR)',
        roomCharge: 'Room Charge Transfers',
      },
      noteLabel: 'Auditor Reconciliation Notes (Kwentra vs Local)',
      notePlaceholder: 'Document missing folio numbers, unposted outage checks, or timing differences...',
    },
    reports: {
      title: 'Unified Reports Center (Preview · Multi-Format Export · Print)',
      subtitle: 'Select any Income Audit report to preview, export as Excel, CSV, HTML, or JSON, or print cleanly as PDF',
      exportFormatsLabel: 'Export Active Report:',
      exportCsv: 'Export CSV',
      exportExcel: 'Export Excel (.xls)',
      exportJson: 'Export JSON',
      exportHtml: 'Export HTML',
      printBtn: 'Print / Save PDF',
      exportPackJson: 'Export All Reports Pack (.json)',
      exportedNotice: 'Report downloaded:',
      reportTabs: {
        executive: '1. Executive Daily Audit Summary',
        departments: '2. Revenue by Department & Outlet',
        kwentra: '3. Original Kwentra Variance Report',
        exceptions: '4. Exceptions & HK Discrepancies',
        ledger: '5. Full & Outage Transaction Ledger',
        checklist: '6. 8-Point Audit Checklist Sign-Off',
        archive: '7. Daily Archive & Hotel KPIs (Occ/ADR/RevPAR)',
        cashiers: '8. Bank EDC Batches & Cashier Shifts',
        otas: '9. OTA Contract Audit & City Ledger Aging',
        beoTrail: '10. Banquet BEO Deposits & Audit Trail',
      },
      executiveDesc: 'Complete revenue, taxes, and cashier/EDC settlement summary with live USD, EUR, and EGP equivalents.',
      departmentsDesc: 'Departmental breakdown across Front Office and F&B outlets with Service Charge, VAT, and share %.',
      kwentraDesc: 'Line-by-line reconciliation comparing local figures against your original Kwentra PMS values.',
      exceptionsDesc: 'Automated critical/warning alerts (missing checks, rate floor, rebates) plus Housekeeping room discrepancies.',
      ledgerDesc: 'Detailed transaction sheet with timestamp, source, settlement method, and outage-only filter.',
      checklistDesc: 'Printable 8-point Daily Income Audit Checklist with sign-off signature blocks.',
      archiveDesc: 'Closed business dates history with Occupancy %, ADR, RevPAR, MTD totals, and Kwentra variance.',
      cashiersDesc: 'Bank-by-bank EDC card terminal batches, commission fees, and individual cashier shift over/short envelopes.',
      otasDesc: 'OTA contract rate & commission verification plus corporate City Ledger receivables aging (0-90+ days).',
      beoTrailDesc: 'Banquet Event Orders (BEO), advance deposits held, and the immutable timestamped audit trail log.',
      outageOnlyToggle: 'Outage Backup Postings Only',
      signOffAuditor: 'Income Auditor Signature',
      signOffCashier: 'General Cashier Signature',
      signOffController: 'Financial Controller Approval',
      cols: {
        metric: 'Financial Line Item',
        amountBase: 'Base Currency',
        equivUsd: 'USD Equivalent',
        equivEur: 'EUR Equivalent',
        equivEgp: 'EGP Equivalent',
        dept: 'Department / Outlet',
        entriesCount: 'Count',
        net: 'Net',
        svc: 'Service',
        vat: 'VAT / Tax',
        gross: 'Gross',
        share: 'Share %',
        severity: 'Severity',
        category: 'Category',
        title: 'Title',
        detail: 'Detail',
        task: 'Audit Control Item',
        status: 'Status',
        notes: 'Auditor Notes',
      },
    },
  },
  fr: {
    dir: 'ltr',
    brandName: 'Hotel Income Auditor',
    languageLabel: 'Langue',
    propertyLabel: 'Hôtel Actuel',
    entriesUnit: 'Écritures',
    navGroups: {
      operations: 'Opérations & Audit',
      specialized: 'Modules d’Audit Avancés',
      configuration: 'Configuration & Aide',
    },
    nav: {
      dashboard: 'Tableau de Bord Audit',
      incomeAudit: 'Moteur Chambres & Audit',
      ledger: 'Journal de Secours (Outage)',
      rooms: 'Chambres (Room Rack)',
      compare: 'Comparaison Kwentra PMS',
      auditSuite: 'Archives, Caisses & Trail',
      receivables: 'OTAs, Débiteurs & Banquets',
      reports: 'Centre de Rapports & Export',
      recovery: 'Synchronisation & Reprise',
      settings: 'Paramètres & Taxes',
      guide: 'Infographie & Guide',
    },
    breadcrumbs: {
      dashboard: 'Opérations Cloud / Audit Quotidien & Infographie',
      incomeAudit: 'Audit des Revenus / Moteur Chambres, Anomalies & Clôture',
      ledger: 'Réception & Points de Vente / Journal',
      rooms: 'Réception / Gestion Manuelle des Chambres (Room Rack)',
      compare: 'Rapprochement Auditeur / Local vs Kwentra Original',
      auditSuite: 'Audit Avancé / Archives, Comptage Espèces, EDC & Piste',
      receivables: 'Audit Avancé / Contrats OTA, Âge Débiteurs & BEO',
      reports: 'Centre de Rapports / Export Multi-Formats & Impression',
      recovery: 'Clôture Nocturne / Reprise PMS',
      settings: 'Administration Hôtel / Taxes & Seuils',
      guide: 'Centre d’Aide / Infographie Opérationnelle',
    },
    connection: {
      title: 'État du Système PMS / POS',
      normal: 'En ligne (Normal)',
      outage: 'Mode Panne (Outage)',
      normalDesc: 'Le PMS/POS principal est actif — contrôlez les recettes, lots EDC et caisses.',
      outageDesc: 'Le PMS/POS est hors ligne — saisie locale persistante pour reprise ultérieure.',
      bannerText: 'Mode Panne Activé : Toutes les écritures Chambres & F&B sont sauvegardées localement pour réintégration dans le PMS.',
      bannerAction: 'Exporter Reprise',
    },
    actions: {
      exportCsv: 'Exporter CSV',
      addOutageEntry: 'Saisir Écriture Secours',
      openMenu: 'Ouvrir le menu',
      adjustRules: 'Régler les Seuils',
      openLedger: 'Ouvrir le Journal',
      registerNew: 'Nouvelle Écriture',
      addRoom: 'Ajouter Chambre',
      save: 'Enregistrer',
      cancel: 'Annuler',
      yes: 'Confirmer',
      printReport: 'Imprimer Rapport',
      resetSample: 'Réinitialiser Données',
      confirmReset: 'Confirmer ?',
    },
    dashboard: {
      kpiGross: 'Chiffre d’Affaires Brut (TTC)',
      kpiRoomsLabel: 'Hébergement Net',
      kpiFbLabel: 'Restauration Net',
      kpiOutage: 'Écritures de Secours (Hors Ligne)',
      kpiOutageUnit: 'Saisies Manuelles',
      kpiVariance: 'Écart Net de Règlement',
      kpiVarianceOk: 'Conforme dans la tolérance',
      kpiVarianceAlert: 'Écart à vérifier',
      kpiExceptions: 'Anomalies Détectées',
      kpiExceptionsUnit: 'Alertes',
      kpiTasksVerified: 'Contrôles',
      kpiTasksFlagged: 'signalé(s)',
      infographicTitle: 'Infographie des Flux Financiers & Encaissements',
      infographicSubtitle: 'Synthèse visuelle du Brut au Net et répartition par mode de règlement',
      waterfallTitle: 'Flux Revenus, Taxes & Remises',
      grossTotalLabel: 'Facturation Brute (TTC)',
      taxesAndSvcLabel: 'Service & TVA',
      rebatesLabel: 'Remises / Avoirs',
      netRealizedLabel: 'Revenu Net Réalisé',
      collectionMixTitle: 'Répartition des Encaissements',
      cashLabel: 'Espèces (Cash)',
      cardLabel: 'Cartes Bancaires (EDC)',
      cityLedgerLabel: 'Débiteurs Divers',
      roomChargeLabel: 'Report Chambre',
      deptChartTitle: 'Répartition des Revenus par Département',
      deptChartSubtitle: 'Analyse en temps réel des chambres, restaurants, bars et services annexes',
      netMode: 'Net HT',
      grossMode: 'Brut TTC',
      barMode: 'Histogramme',
      pieMode: 'Répartition %',
      emptyChartTitle: 'Aucune écriture de revenu enregistrée',
      emptyChartDesc: 'Ajoutez des transactions dans le journal pour afficher les graphiques.',
      colDept: 'Département / Point de Vente',
      colCount: 'Nb',
      colShare: 'Part',
      colAmount: 'Montant',
      exceptionsTitle: 'Moteur de Détection des Anomalies',
      exceptionsSubtitle: 'Détecte les tickets manquants, tarifs inférieurs au seuil, remises non signées et écarts de caisse',
      noExceptionsTitle: 'Aucune anomalie détectée',
      noExceptionsDesc: 'Toutes les séquences, tarifs et caisses sont équilibrés.',
      critical: 'Critique',
      warning: 'Avertissement',
      settlementTitle: 'Rapprochement Caisse Générale, EDC & Débiteurs',
      settlementSubtitle: 'Comparez les totaux attendus aux comptages physiques et Z-Reports bancaires',
      expectedCash: 'Espèces Attendues (après Paid Outs)',
      actualCashLabel: 'Comptage Physique Caisse Générale',
      expectedCard: 'Ventes Cartes Attendues',
      actualCardLabel: 'Total Lot Terminal Bancaire (EDC)',
      expectedCityLedger: 'Débiteurs Attendus (City Ledger)',
      actualCityLedgerLabel: 'Factures Signées Reçues',
      roomChargeTransfers: 'Transferts POS vers Chambres (Room Charge)',
      checklistTitle: 'Checklist Quotidienne de l’Auditeur',
      completedLabel: 'validés',
      statusVerified: 'Validé',
      statusFlagged: 'Signalé',
      statusPending: 'En cours',
      notePlaceholder: 'Ajouter une note d’audit ou n° de pièce...',
      hkTitle: 'Écarts Gouvernance / Réception (HK)',
      hkSubtitle: 'Comparez le statut physique des chambres avec la Réception',
      roomNumber: 'Chambre',
      foStatus: 'Réception (FO)',
      hkStatus: 'Étages (HK)',
      hkNotePlaceholder: 'Motif de l’écart ou vérification...',
      saveDiscrepancy: 'Enregistrer',
      hkResolved: 'Résolu',
      hkOpen: 'À vérifier',
    },
    ledger: {
      formTitle: 'Saisie de Secours & Journal d’Audit',
      formSubtitle: 'Enregistrez chambres, tickets F&B ou avoirs hors ligne avec calcul automatique Service & TVA',
      liveGross: 'Aperçu Brut TTC',
      sourceLabel: 'Source',
      categoryLabel: 'Catégorie',
      outletLabel: 'Département / Point de Vente',
      refLabelCheck: 'N° Ticket',
      refLabelRoom: 'Chambre / Bon',
      descLabel: 'Client / Libellé',
      descPlaceholder: 'ex. Walk-in Deluxe / Dîner Table 8',
      netLabel: 'Montant Net',
      paymentLabel: 'Mode de Règlement',
      approverLabel: 'Approuvé par (Requis pour remises)',
      approverPlaceholder: 'Duty Manager / F&B Supervisor',
      addBtn: 'Ajouter',
      seqAlertPrefix: 'Alerte Séquence Tickets F&B : Tickets manquants',
      seqAlertSuffix: 'absents du journal.',
      seqVoidHint: 'Joindre le ticket annulé signé (Void) ou saisir le ticket manquant.',
      filterAll: 'Tous',
      allDepts: 'Tous Départements',
      searchPlaceholder: 'Rechercher chambre, ticket ou client...',
      colTimeSource: 'Heure · Source',
      colTypeDept: 'Type · Service',
      colRef: 'Réf.',
      colDesc: 'Libellé',
      colNet: 'Net',
      colGross: 'Brut TTC',
      colPay: 'Règlement',
      colApproval: 'Validation',
      colAction: 'Action',
      noResults: 'Aucune écriture ne correspond à vos filtres.',
      approveNow: 'Non signé · Approuver',
      reconciled: 'Vérifié',
      reconcile: 'Vérifier',
      categories: {
        Room: 'Hébergement',
        FoodBeverage: 'Restauration (F&B)',
        OtherRevenue: 'Autres Revenus',
        Rebate: 'Remise / Avoir',
        PaidOut: 'Débours (Paid Out)',
        Deposit: 'Acompte / Dépôt',
        Payment: 'Paiement / Encaissement',
        Adjustment: 'Ajustement Financier',
      },
      sources: {
        PMS: 'PMS',
        POS: 'POS',
        OutageBackup: 'Secours Hors Ligne',
        ManualEntry: 'Saisie Manuelle',
      },
      payments: {
        Cash: 'Espèces',
        CreditCard: 'Carte Bancaire (EDC)',
        CityLedger: 'Débiteurs (City Ledger)',
        RoomCharge: 'Note Chambre',
        HouseUse: 'Usage Interne',
      },
    },
    recovery: {
      title: 'Fichiers de Reprise PMS & Synchronisation CSV',
      subtitle: 'Importez des fichiers CSV depuis Excel/PMS ou exportez uniquement les saisies de panne pour réintégration',
      resetDoneMsg: 'Données de démonstration réinitialisées.',
      importFailMsg: 'Fichier CSV invalide. Vérifiez la structure des colonnes.',
      importOkPrefix: 'Écritures importées :',
      card1Title: '1. Exporter le Journal Complet (CSV)',
      card1Desc: 'Télécharge un fichier UTF-8 BOM prêt pour Microsoft Excel et l’archivage.',
      card1Btn: 'Télécharger Journal Complet',
      card2Title: '2. Écritures de Reprise PMS Uniquement',
      card2Desc: 'Extrait uniquement les saisies de panne pour ressaisie rapide dans Opera ou Micros.',
      card2Btn: 'Exporter Saisies Panne',
      card3Title: '3. Importer un CSV pour Audit',
      card3Desc: 'Importez les fichiers saisis en réception ou restaurant pour contrôle immédiat.',
      card3Btn: 'Importer CSV',
      reportTitle: 'Rapport Quotidien d’Audit des Revenus',
      businessDateLabel: 'Date Comptable',
      auditorLabel: 'Auditeur',
      revBreakdownTitle: 'Détail des Revenus & Taxes',
      roomNet: 'Hébergement Net',
      fbNet: 'Restauration Net',
      otherNet: 'Autres Revenus (Spa / Lingerie)',
      svcAndVat: 'Service + TVA & Taxes',
      totalGross: 'Total Revenu Brut TTC',
      totalRebates: 'Total Remises & Avoirs',
      settlementSummaryTitle: 'Synthèse des Règlements',
      cashExpAct: 'Espèces Attendues / Remises',
      cardExpAct: 'Cartes Attendues / Lot EDC',
      clExpAct: 'Débiteurs Attendus / Signés',
      netVariance: 'Écart Net',
      shiftNote: 'Notes de Shift',
    },
    settings: {
      policyTitle: 'Politique Hôtelière, Taxes & Seuils de Contrôle',
      policySubtitle: 'Règles appliquées automatiquement aux calculs fiscaux et alertes d’anomalies',
      hotelName: 'Nom de l’Établissement',
      businessDate: 'Date Comptable',
      currency: 'Devise',
      svcPct: 'Frais de Service (%)',
      vatPct: 'TVA (%)',
      cityTaxPct: 'Taxe de Séjour / Municipale (%)',
      minRoomRate: 'Tarif Minimum Autorisé',
      rebateLimit: 'Seuil Signature Remise',
      cashTolerance: 'Tolérance Écart Caisse',
      totalRooms: 'Nombre Total de Chambres',
      budgetDaily: 'Budget Revenu Quotidien',
      breakfastSplitPerPax: 'Forfait Repas par Personne',
      outletsTitle: 'Points de Vente (F&B Outlets)',
      outletsSubtitle: 'Apparaissent dans la saisie de secours et les graphiques par département',
      outletPlaceholder: 'ex. Beach Bar ou Banquet Hall',
      addOutletBtn: 'Ajouter',
      backupTitle: 'Sauvegarde Complète Navigateur (JSON)',
      backupSubtitle: 'Les données restent enregistrées hors ligne. Exportez un fichier JSON pour transférer vers un autre poste.',
      exportJsonBtn: 'Télécharger Sauvegarde (.json)',
      importJsonBtn: 'Restaurer (.json)',
      backupOk: 'Sauvegarde restaurée avec succès.',
      backupErr: 'Fichier JSON invalide.',
      exchangeRatesTitle: 'Devise de Base & Taux de Change (EUR / USD / EGP)',
      exchangeRatesSubtitle: 'Définissez la devise de base et ajustez les taux de change appliqués aux saisies et équivalences',
      baseCurrencyTag: 'Devise de Base',
      resetRatesBtn: 'Taux par Défaut',
      currencyNames: {
        EGP: 'Livre Égyptienne (EGP)',
        USD: 'Dollar US (USD)',
        EUR: 'Euro (EUR)',
        SAR: 'Riyal Saoudien (SAR)',
      },
    },
    guide: {
      kicker: 'Infographie Opérations Cloud · Audit des Revenus & Continuité',
      heroTitle: 'Comment Hotel Income Auditor Sécurise Vos Revenus au Quotidien et en Cas de Panne PMS',
      heroDesc: 'Une vue infographique complète du processus : continuité hors ligne, contrôle automatique des anomalies, calcul fiscal et réintégration PMS.',
      pipelineTitle: 'Infographie du Flux Panne-à-Reprise',
      pipelineSubtitle: 'Connecté en direct aux compteurs de votre établissement actif',
      pipelineStages: [
        { step: '01', title: 'Activation Secours', sub: 'Basculer en mode panne pour isoler les saisies manuelles', metricLabel: 'État Système' },
        { step: '02', title: 'Saisie Locale Hors Ligne', sub: 'Chambres & F&B avec calcul Service et TVA instantané', metricLabel: 'Écritures' },
        { step: '03', title: 'Moteur d’Audit Auto', sub: 'Détection tickets manquants, tarifs bas & écarts caisse', metricLabel: 'Alertes' },
        { step: '04', title: 'Export Reprise PMS', sub: 'CSV dédié prêt pour ressaisie dans Opera / Micros', metricLabel: 'À Réintégrer' },
      ],
      taxInfographicTitle: 'Infographie de Calcul Fiscal & Revenu',
      taxInfographicSubtitle: 'Décomposition automatique appliquée selon les taux configurés pour cet hôtel',
      taxBase: 'Montant Net HT',
      taxSvc: 'Frais de Service',
      taxVat: 'TVA & Taxes',
      taxGross: 'Total Brut TTC',
      capabilitiesTitle: 'Contrôles Automatisés d’Audit',
      capabilitiesSubtitle: 'Six moteurs d’analyse exécutés en temps réel sur chaque écriture',
      workflowTitle: 'Mode d’Emploi Étape par Étape',
      workflowSubtitle: 'Choisissez le scénario adapté à votre situation',
      scenarioOutage: 'En Cas de Panne (Outage)',
      scenarioDaily: 'Audit Quotidien Standard',
      rulesTitle: 'Seuils de Contrôle Actifs',
      rulesSubtitle: 'Paramètres utilisés pour déclencher les alertes critiques',
      editRulesBtn: 'Modifier les Règles',
      ruleTaxes: 'Taux Service & Taxes Actifs',
      ruleMinRate: 'Tarif Chambre Minimum',
      ruleRebate: 'Seuil Validation Remise',
      ruleCashTol: 'Tolérance Caisse',
      capabilities: [
        { index: '01', title: 'Ventilation Revenus & Taxes', desc: 'Sépare Chambres, F&B et Autres revenus avec extraction automatique du Service et de la TVA et graphiques Recharts.' },
        { index: '02', title: 'Contrôle Séquence Tickets F&B', desc: 'Analyse la numérotation des tickets restaurant pour repérer tout numéro manquant ou non justifié.' },
        { index: '03', title: 'Contrôle Tarifs & Remises', desc: 'Signale les tarifs inférieurs au contrat et toute remise dépassant le seuil sans signature managériale.' },
        { index: '04', title: 'Rapprochement Caisse & EDC', desc: 'Compare espèces attendues (après débours), lots cartes bancaires EDC et factures sociétés.' },
        { index: '05', title: 'Écarts Gouvernance (HK)', desc: 'Suit les divergences entre Réception et Étages pour détecter les chambres occupées non facturées.' },
        { index: '06', title: 'Multi-Devises & Multilingue (EGP / USD / EUR)', desc: 'Gérez la devise de base et les taux de change avec support complet Arabe (RTL), Français et Anglais.' },
      ],
      outageSteps: [
        { step: '01', title: 'Activer le Mode Panne', detail: 'Sélectionnez Mode Panne dans la barre latérale pour signaler que les saisies basculent en mode secours.', actionLabel: 'Ouvrir le Journal', target: 'ledger' },
        { step: '02', title: 'Saisir Chambres & Tickets F&B', detail: 'Enregistrez arrivées, notes restaurant et débours dans le journal avec calcul fiscal automatique.', actionLabel: 'Saisir Maintenant', target: 'ledger' },
        { step: '03', title: 'Contrôler Alertes & Caisse', detail: 'Vérifiez l’infographie des encaissements et saisissez les comptages réels caisse et Z-Report EDC.', actionLabel: 'Voir Tableau de Bord', target: 'dashboard' },
        { step: '04', title: 'Exporter le CSV de Reprise', detail: 'Au retour du PMS/POS, exportez uniquement les écritures de secours pour ressaisie rapide.', actionLabel: 'Ouvrir Reprise', target: 'recovery' },
      ],
      dailySteps: [
        { step: '01', title: 'Vérifier Taxes & Seuils', detail: 'Validez les taux Service/TVA, tarifs minimums et points de vente dans Paramètres.', actionLabel: 'Voir Paramètres', target: 'settings' },
        { step: '02', title: 'Importer ou Saisir l’Activité', detail: 'Importez les exports CSV du jour ou saisissez les écritures puis consultez les graphiques.', actionLabel: 'Importer / Exporter', target: 'recovery' },
        { step: '03', title: 'Traiter Anomalies & Écarts HK', detail: 'Résolvez les tickets manquants, approuvez les remises signées et clôturez les écarts gouvernance.', actionLabel: 'Voir Anomalies', target: 'dashboard' },
        { step: '04', title: 'Valider Checklist & Imprimer', detail: 'Complétez les 8 points de contrôle et imprimez le rapport quotidien pour signature.', actionLabel: 'Imprimer Rapport', target: 'recovery' },
      ],
    },
    kwentraCompare: {
      title: 'Comparaison avec le Système Kwentra Original',
      subtitle: 'Saisissez les chiffres de votre rapport Night Audit / Manager Flash Kwentra (ou importez un CSV) pour détecter chaque écart ligne par ligne',
      reportRefLabel: 'Référence Rapport Kwentra',
      lastUpdatedLabel: 'Heure d’Arrêté Kwentra',
      importCsvBtn: 'Importer CSV Kwentra',
      copyLocalBtn: 'Copier Valeurs Locales',
      zeroOutBtn: 'Remettre Kwentra à Zéro',
      printBtn: 'Imprimer Rapprochement',
      importSuccess: 'Valeurs Kwentra mises à jour depuis le CSV :',
      importError: 'Impossible d’extraire des montants valides depuis ce CSV.',
      kpiLocalGross: 'Brut Local (Hotel Income Auditor)',
      kpiKwentraGross: 'Brut Kwentra Original',
      kpiNetDiff: 'Écart Net (Local - Kwentra)',
      kpiMatchRate: 'Taux de Concordance',
      kpiMatched: 'Conforme dans la tolérance',
      kpiHasDiff: 'Écart à investiguer',
      kpiLinesMatched: 'lignes concordantes sur',
      kpiTopDriver: 'Écart principal :',
      kpiNoDriver: 'Aucun écart détecté',
      chartTitle: 'Comparaison Visuelle : Hotel Income Auditor vs Kwentra Original',
      chartSubtitle: 'Graphique comparatif par département, taxes et encaissements',
      seriesLocal: 'Local (Hotel Income Auditor)',
      seriesKwentra: 'Kwentra Original',
      matrixTitle: 'Matrice de Rapprochement Ligne par Ligne (Éditable)',
      matrixSubtitle: 'Saisissez les montants affichés sur votre écran Kwentra dans la colonne Kwentra pour calculer les écarts en direct',
      filterAll: 'Toutes les Lignes (12)',
      filterDiffsOnly: 'Écarts Uniquement',
      colItem: 'Poste Financier',
      colGroup: 'Catégorie',
      colLocal: 'Local (Hotel Income Auditor)',
      colKwentra: 'Kwentra Original',
      colVariance: 'Écart (Local - Kwentra)',
      colPct: 'Écart %',
      colStatus: 'Statut',
      statusMatch: 'Conforme',
      statusOver: 'Excédent Local',
      statusShort: 'Inférieur à Kwentra',
      groupRevenue: 'Revenus & Taxes',
      groupDeductions: 'Déductions',
      groupSettlement: 'Encaissements',
      rows: {
        roomNet: 'Hébergement Net (Room Net)',
        fbNet: 'Restauration Net (F&B Net)',
        otherNet: 'Autres Revenus (Spa / Lingerie)',
        serviceCharge: 'Frais de Service',
        vatAndTaxes: 'TVA & Taxes Séjour',
        grossTotal: 'Total Revenu Brut (Gross)',
        rebates: 'Remises & Avoirs (Rebates)',
        paidOuts: 'Débours (Paid Outs)',
        cash: 'Espèces (Cash)',
        creditCard: 'Cartes Bancaires (EDC)',
        cityLedger: 'Débiteurs (City Ledger)',
        roomCharge: 'Reports Chambre (Room Charge)',
      },
      noteLabel: 'Notes de l’Auditeur sur les Écarts Kwentra',
      notePlaceholder: 'Notez les factures manquantes, tickets hors ligne non ressaisis ou écarts de caisse...',
    },
    reports: {
      title: 'Centre de Rapports Unifié (Aperçu · Export Tous Formats · Impression)',
      subtitle: 'Sélectionnez n’importe quel rapport pour le consulter, l’exporter en Excel, CSV, HTML ou JSON, ou l’imprimer en PDF',
      exportFormatsLabel: 'Exporter le rapport actif :',
      exportCsv: 'Exporter CSV',
      exportExcel: 'Exporter Excel (.xls)',
      exportJson: 'Exporter JSON',
      exportHtml: 'Exporter HTML',
      printBtn: 'Imprimer / PDF',
      exportPackJson: 'Exporter Pack Complet (.json)',
      exportedNotice: 'Rapport téléchargé :',
      reportTabs: {
        executive: '1. Synthèse Quotidienne Exécutive',
        departments: '2. Revenus par Département',
        kwentra: '3. Écarts vs Kwentra Original',
        exceptions: '4. Anomalies & Écarts Chambres',
        ledger: '5. Journal Complet & Secours',
        checklist: '6. Checklist Audit (8 Points)',
        archive: '7. Archives & KPIs (Occ/ADR/RevPAR)',
        cashiers: '8. Lots Bancaires EDC & Caissiers',
        otas: '9. Audit OTAs & Âge Débiteurs',
        beoTrail: '10. Banquets BEO & Piste d’Audit',
      },
      executiveDesc: 'Synthèse complète des revenus, taxes et règlements avec équivalences en USD, EUR et EGP.',
      departmentsDesc: 'Ventilation détaillée par département et point de vente avec Service, TVA et part %.',
      kwentraDesc: 'Tableau comparatif ligne par ligne entre le local et le système Kwentra original.',
      exceptionsDesc: 'Toutes les anomalies critiques et avertissements ainsi que les écarts Réception/Étages.',
      ledgerDesc: 'Journal détaillé des écritures avec filtre dédié aux saisies hors ligne (Outage).',
      checklistDesc: 'Feuille de contrôle en 8 points prête pour impression et signature managériale.',
      archiveDesc: 'Historique des journées clôturées avec Occupation %, ADR, RevPAR et cumul mensuel.',
      cashiersDesc: 'Lots de terminaux bancaires EDC, commissions et écarts individuels des caissiers.',
      otasDesc: 'Vérification des tarifs et commissions OTA et balance âgée des débiteurs (0-90+ jours).',
      beoTrailDesc: 'Suivi des banquets BEO, acomptes reçus et journal d’audit horodaté immuable.',
      outageOnlyToggle: 'Écritures de Secours Uniquement',
      signOffAuditor: 'Signature Auditeur des Revenus',
      signOffCashier: 'Signature Caissier Général',
      signOffController: 'Visa Contrôleur Financier',
      cols: {
        metric: 'Poste Financier',
        amountBase: 'Devise de Base',
        equivUsd: 'Équivalent USD',
        equivEur: 'Équivalent EUR',
        equivEgp: 'Équivalent EGP',
        dept: 'Département / PDV',
        entriesCount: 'Nb',
        net: 'Net HT',
        svc: 'Service',
        vat: 'TVA & Taxes',
        gross: 'Brut TTC',
        share: 'Part %',
        severity: 'Gravité',
        category: 'Catégorie',
        title: 'Libellé',
        detail: 'Détail',
        task: 'Point de Contrôle',
        status: 'Statut',
        notes: 'Notes Auditeur',
      },
    },
  },
};
