import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { LanguageCode, TranslationDict } from '../i18n/translations';
import { AuditSummary, HotelConfig } from '../types/audit';
import { formatMoney } from '../utils/auditEngine';

interface SystemGuideProps {
  lang: LanguageCode;
  t: TranslationDict;
  config: HotelConfig;
  summary: AuditSummary;
  totalEntries: number;
  isOutageMode: boolean;
  onNavigateToTab: (tab: 'dashboard' | 'ledger' | 'recovery' | 'settings') => void;
}

const STEP_ICONS = {
  dashboard: LayoutDashboard,
  ledger: ClipboardList,
  recovery: FileSpreadsheet,
  settings: SlidersHorizontal,
};

export const SystemGuide: React.FC<SystemGuideProps> = ({
  lang,
  t,
  config,
  summary,
  totalEntries,
  isOutageMode,
  onNavigateToTab,
}) => {
  const [scenario, setScenario] = useState<'outage' | 'daily'>('outage');
  const FlowArrow = lang === 'ar' ? ArrowLeft : ArrowRight;

  // Live metrics mapped into the 4 pipeline infographic nodes
  const stageMetrics = [
    isOutageMode ? t.connection.outage : t.connection.normal,
    `${totalEntries}`,
    `${summary.exceptions.length}`,
    `${summary.outageEntriesCount}`,
  ];

  // Live tax equation example using 1000 base unit
  const sampleNet = 1000;
  const sampleSvc = Number(((sampleNet * config.serviceChargePct) / 100).toFixed(2));
  const sampleVat = Number(
    (((sampleNet + sampleSvc) * (config.vatPct + config.cityTaxPct)) / 100).toFixed(2)
  );
  const sampleGross = Number((sampleNet + sampleSvc + sampleVat).toFixed(2));

  const activeSteps =
    scenario === 'outage' ? t.guide.outageSteps : t.guide.dailySteps;

  return (
    <div className="space-y-8">
      {/* Intro Hero Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>{t.guide.kicker}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
            {t.guide.heroTitle}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">{t.guide.heroDesc}</p>
        </div>
      </section>

      {/* Infographic 1: Live Outage-to-Recovery Pipeline */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {t.guide.pipelineTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{t.guide.pipelineSubtitle}</p>
          </div>
          <span className="text-xs font-mono text-slate-500" dir="ltr">
            {config.hotelName}
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
          {t.guide.pipelineStages.map((stage, idx) => (
            <div
              key={stage.step}
              className="relative p-4 rounded-xl border border-slate-200 bg-[#F4F6FA] flex flex-col justify-between gap-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#0F1E36] text-white font-mono text-xs font-semibold flex items-center justify-center">
                  {stage.step}
                </span>
                {idx < t.guide.pipelineStages.length - 1 && (
                  <FlowArrow className="w-4 h-4 text-blue-600 hidden md:block" />
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900">{stage.title}</h4>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{stage.sub}</p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">{stage.metricLabel}</span>
                <span className="font-mono font-bold text-blue-700 tabular-nums">
                  {stageMetrics[idx]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Infographic 2: Tax & Revenue Equation Visual */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">
            {t.guide.taxInfographicTitle}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{t.guide.taxInfographicSubtitle}</p>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">{t.guide.taxBase}</span>
            <p className="mt-2 text-lg font-mono font-bold text-slate-900 tabular-nums" dir="ltr">
              {formatMoney(sampleNet, config.currency)}
            </p>
            <div className="mt-3 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-slate-700" style={{ width: '78%' }} />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">
              {t.guide.taxSvc} ({config.serviceChargePct}%)
            </span>
            <p className="mt-2 text-lg font-mono font-bold text-blue-700 tabular-nums" dir="ltr">
              +{formatMoney(sampleSvc, config.currency)}
            </p>
            <div className="mt-3 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600"
                style={{ width: `${Math.min(100, config.serviceChargePct * 3)}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">
              {t.guide.taxVat} ({config.vatPct + config.cityTaxPct}%)
            </span>
            <p className="mt-2 text-lg font-mono font-bold text-sky-700 tabular-nums" dir="ltr">
              +{formatMoney(sampleVat, config.currency)}
            </p>
            <div className="mt-3 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-600"
                style={{ width: `${Math.min(100, (config.vatPct + config.cityTaxPct) * 3)}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1E36] text-white flex flex-col justify-between">
            <span className="text-xs font-medium text-blue-200">{t.guide.taxGross}</span>
            <p className="mt-2 text-lg font-mono font-bold text-white tabular-nums" dir="ltr">
              {formatMoney(sampleGross, config.currency)}
            </p>
            <div className="mt-3 h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </section>

      {/* What the System Does: 6 Core Engines */}
      <section aria-label={t.guide.capabilitiesTitle} className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {t.guide.capabilitiesTitle}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{t.guide.capabilitiesSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {t.guide.capabilities.map((cap) => (
            <article
              key={cap.index}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-2"
            >
              <div>
                <span className="text-xs font-mono font-semibold text-blue-600">
                  {cap.index}.
                </span>
                <h4 className="mt-1.5 text-sm font-semibold text-slate-900">{cap.title}</h4>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">{cap.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Interactive Step-by-Step Workflow */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {t.guide.workflowTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{t.guide.workflowSubtitle}</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setScenario('outage')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                scenario === 'outage'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.guide.scenarioOutage}
            </button>
            <button
              type="button"
              onClick={() => setScenario('daily')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                scenario === 'daily'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.guide.scenarioDaily}
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {activeSteps.map((item) => {
            const Icon = STEP_ICONS[item.target] ?? CheckCircle2;
            return (
              <div
                key={item.step}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#0F1E36] text-white font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                    {item.step}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-2xl">
                      {item.detail}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateToTab(item.target)}
                  className="px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-center"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.actionLabel}</span>
                  <FlowArrow className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Active Policy Thresholds Reference */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {t.guide.rulesTitle} ({config.hotelName})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{t.guide.rulesSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('settings')}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {t.guide.editRulesBtn}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-200">
          <div className="p-4">
            <p className="text-xs text-slate-500">{t.guide.ruleTaxes}</p>
            <p className="mt-1.5 text-sm font-mono font-semibold text-slate-900 tabular-nums" dir="ltr">
              {config.serviceChargePct}% Svc + {config.vatPct}% VAT
              {config.cityTaxPct > 0 ? ` + ${config.cityTaxPct}% Tax` : ''}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500">{t.guide.ruleMinRate}</p>
            <p className="mt-1.5 text-sm font-mono font-semibold text-slate-900 tabular-nums" dir="ltr">
              {config.minRoomRate.toLocaleString()} {config.currency}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500">{t.guide.ruleRebate}</p>
            <p className="mt-1.5 text-sm font-mono font-semibold text-slate-900 tabular-nums" dir="ltr">
              {config.rebateApprovalLimit.toLocaleString()} {config.currency}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500">{t.guide.ruleCashTol}</p>
            <p className="mt-1.5 text-sm font-mono font-semibold text-slate-900 tabular-nums" dir="ltr">
              +/- {config.cashVarianceTolerance.toLocaleString()} {config.currency}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
