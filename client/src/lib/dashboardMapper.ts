import type { DashboardData, KPI, MatrixDataPoint, UseCase, ValueInsight } from "@/components/Dashboard";
import { format } from "@/lib/formatters";

// Sanitize text to remove markdown artifacts and ensure professional prose
function sanitizeForProse(text: string): string {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^[-_*]{3,}\s*$/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\|\s*[-:]+\s*\|/g, '')
    .replace(/^\|(.+)\|$/gm, (match, content) => {
      const cells = content.split('|').map((c: string) => c.trim()).filter((c: string) => c);
      return cells.join(', ');
    })
    .replace(/\|/g, ' ')
    .replace(/⚠️?/g, '')
    .replace(/[\u2600-\u26FF\u2700-\u27BF]/g, '')
    .replace(/[→←↑↓↗↘]/g, '')
    .replace(/\[(HIGH|MEDIUM|LOW|ASSUMPTION|ESTIMATED|DATED)[^\]]*\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const BRAND = {
  primary: '#0339AF',
  accent: '#4C73E9',
  success: '#059669',
  teal: '#0D9488',
  gray: '#94A3B8',
};

interface ReportAnalysisData {
  steps: Array<{
    step: number;
    title: string;
    content: string;
    data: any;
  }>;
  summary: string;
  executiveDashboard: {
    totalRevenueBenefit: number;
    totalCostBenefit: number;
    totalCashFlowBenefit: number;
    totalRiskBenefit: number;
    totalAnnualValue: number;
    totalMonthlyTokens: number;
    valuePerMillionTokens: number;
    topUseCases: Array<{
      rank: number;
      useCase: string;
      priorityScore: number;
      monthlyTokens: number;
      annualValue: number;
    }>;
  };
}

interface Report {
  id: string;
  companyName: string;
  analysisData: ReportAnalysisData;
  createdAt: string | Date;
  updatedAt: string | Date;
}

function formatValue(value: number): string {
  return format.currencyAuto(value);
}

function formatTokens(tokens: number): string {
  return format.tokensPerMonth(tokens);
}

function calculateGrowthPercent(value: number, total: number): string {
  if (total === 0) return "+0%";
  const percent = Math.round((value / total) * 100);
  return `+${percent}%`;
}

function getComplexityLabel(score: number): string {
  if (score >= 4.5) return "Critical";
  if (score >= 3.5) return "High";
  if (score >= 2.5) return "Medium";
  return "Low";
}

// ============================================================================
// VALUE-READINESS MATRIX: Calculate Implementation Readiness composite score
// ============================================================================
function calculateReadinessScore(
  dataReadiness: number,
  integrationComplexity: number,
  changeMgmt: number,
): number {
  // Higher scores = MORE ready to implement
  // Data Readiness is 1-5 where 5=best → use as-is
  // Integration Complexity is 1-5 where 5=worst → invert: (6 - score)
  // Change Mgmt is 1-5 where 5=worst → invert: (6 - score)
  const dataReady = dataReadiness || 3;
  const intReady = (6 - (integrationComplexity || 3));
  const changeReady = (6 - (changeMgmt || 3));

  // Weighted composite, normalized to 0-100
  const composite = (dataReady * 0.40 + intReady * 0.35 + changeReady * 0.25);
  return Math.round((composite / 5) * 100);
}

function calculateBusinessValueScore(annualValue: number, maxValue: number): number {
  if (maxValue === 0) return 50;
  // Normalize to 0-100 scale
  return Math.round(Math.min((annualValue / maxValue) * 100, 100));
}

function getQuadrantType(valueScore: number, readinessScore: number): string {
  if (valueScore >= 50 && readinessScore >= 50) return "Quick Win";
  if (valueScore >= 50 && readinessScore < 50) return "Strategic Bet";
  if (valueScore < 50 && readinessScore >= 50) return "Easy Gain";
  return "Defer";
}

function getQuadrantColor(type: string): string {
  switch (type) {
    case "Quick Win": return BRAND.success;
    case "Strategic Bet": return BRAND.primary;
    case "Easy Gain": return BRAND.teal;
    case "Defer": return BRAND.gray;
    default: return BRAND.accent;
  }
}

// ============================================================================
// VALUE DRIVER INSIGHTS: Generate structured insight cards from dashboard data
// ============================================================================
function generateValueInsights(dashboard: ReportAnalysisData['executiveDashboard']): ValueInsight[] {
  const totalValue = dashboard.totalAnnualValue || 0;
  const insights: ValueInsight[] = [];

  const pillars = [
    {
      pillar: "Revenue",
      title: "Revenue Growth",
      value: dashboard.totalRevenueBenefit || 0,
      iconName: "TrendingUp",
      descTemplate: (pct: number) =>
        `${pct}% of total value from commercial growth, sales enablement, and market expansion opportunities.`
    },
    {
      pillar: "Cost",
      title: "Cost Reduction",
      value: dashboard.totalCostBenefit || 0,
      iconName: "Activity",
      descTemplate: (pct: number) =>
        `${pct}% of total value from back-office automation, process optimization, and labor efficiency.`
    },
    {
      pillar: "CashFlow",
      title: "Cash Flow Acceleration",
      value: dashboard.totalCashFlowBenefit || 0,
      iconName: "Banknote",
      descTemplate: (pct: number) =>
        `${pct}% of total value from working capital optimization and cycle time reduction.`
    },
    {
      pillar: "Risk",
      title: "Risk Mitigation",
      value: dashboard.totalRiskBenefit || 0,
      iconName: "Shield",
      descTemplate: (pct: number) =>
        `${pct}% of total value from enhanced compliance, fraud detection, and risk management.`
    },
  ];

  for (const p of pillars) {
    if (p.value > 0) {
      const pct = totalValue > 0 ? Math.round((p.value / totalValue) * 100) : 0;
      insights.push({
        pillar: p.pillar,
        title: p.title,
        metric: formatValue(p.value),
        description: p.descTemplate(pct),
        pctOfTotal: pct,
        iconName: p.iconName,
      });
    }
  }

  return insights;
}

// ============================================================================
// EXTRACT USE CASE DETAILS from step data
// ============================================================================
function extractUseCaseDetails(steps: ReportAnalysisData['steps'], useCaseName: string): {
  function?: string;
  description?: string;
  tags: string[];
  effortScore?: number;
  timeToValue?: number;
  monthlyTokens?: number;
  dataReadiness?: number;
  integrationComplexity?: number;
  changeMgmt?: number;
} {
  const result: {
    function?: string; description?: string; tags: string[];
    effortScore?: number; timeToValue?: number; monthlyTokens?: number;
    dataReadiness?: number; integrationComplexity?: number; changeMgmt?: number;
  } = { tags: [] };

  const step4 = steps.find(s => s.step === 4);
  if (step4?.data && Array.isArray(step4.data)) {
    const useCase = step4.data.find((uc: any) =>
      uc["Use Case Name"] === useCaseName || uc["Use Case"] === useCaseName || uc.useCase === useCaseName || uc.name === useCaseName
    );
    if (useCase) {
      result.function = useCase.Function || useCase.function;
      result.description = useCase.Description || useCase.description;
      if (result.function) {
        result.tags.push(result.function);
      }
    }
  }

  const step6 = steps.find(s => s.step === 6);
  if (step6?.data && Array.isArray(step6.data)) {
    const effort = step6.data.find((e: any) =>
      e["Use Case"] === useCaseName || e.useCase === useCaseName
    );
    if (effort) {
      result.effortScore = effort["Effort Score (1-5)"] || effort["Effort Score"] || effort.effortScore || 3;
      result.timeToValue = effort["Time-to-Value (months)"] || effort.timeToValue || effort["Time-to-Value"] || 6;
      result.monthlyTokens = effort["Monthly Tokens"] || effort.monthlyTokens || 0;
      result.dataReadiness = effort["Data Readiness (1-5)"] || effort["Data Readiness"] || effort.dataReadiness || 3;
      result.integrationComplexity = effort["Integration Complexity (1-5)"] || effort["Integration Complexity"] || effort.integrationComplexity || 3;
      result.changeMgmt = effort["Change Mgmt (1-5)"] || effort["Change Mgmt"] || effort.changeMgmt || 3;
    }
  }

  const step5 = steps.find(s => s.step === 5);
  if (step5?.data && Array.isArray(step5.data)) {
    const benefit = step5.data.find((b: any) =>
      b["Use Case"] === useCaseName || b.useCase === useCaseName
    );
    if (benefit) {
      const totalVal = benefit["Total Annual Value ($)"] || benefit.totalAnnualValue || 0;
      if (typeof totalVal === 'string' ? parseFloat(totalVal.replace(/[$,]/g, '')) > 5000000 : totalVal > 5000000) {
        result.tags.push("High Impact");
      }
      if ((benefit["Revenue Benefit ($)"] || benefit.revenueBenefit || 0) !== "$0" &&
          (benefit["Revenue Benefit ($)"] || benefit.revenueBenefit || 0) !== 0) {
        result.tags.push("Growth");
      }
      if ((benefit["Risk Benefit ($)"] || benefit.riskBenefit || 0) !== "$0" &&
          (benefit["Risk Benefit ($)"] || benefit.riskBenefit || 0) !== 0) {
        result.tags.push("Risk");
      }
    }
  }

  if (result.tags.length === 0) {
    result.tags.push("AI", "Optimization");
  }

  return result;
}

// ============================================================================
// MAIN MAPPER: Transform report data into dashboard display format
// ============================================================================
export function mapReportToDashboardData(report: Report): DashboardData {
  const analysis = report.analysisData;
  const dashboard = analysis.executiveDashboard;

  const totalValue = dashboard.totalAnnualValue || 0;

  // Safe formatting for any value range including sub-$1K
  let totalValueFormatted: string;
  let valueSuffix: string;
  if (totalValue >= 1000000) {
    totalValueFormatted = (totalValue / 1000000).toFixed(1);
    valueSuffix = "M";
  } else if (totalValue >= 1000) {
    totalValueFormatted = (totalValue / 1000).toFixed(0);
    valueSuffix = "K";
  } else if (totalValue > 0) {
    totalValueFormatted = totalValue.toFixed(0);
    valueSuffix = "";
  } else {
    totalValueFormatted = "0";
    valueSuffix = "";
  }

  const useCaseCount = dashboard.topUseCases?.length || 0;
  const heroDescription = `We identified ${useCaseCount > 0 ? useCaseCount : 'multiple'} high-impact AI use cases focused on operational optimization and risk mitigation to drive efficiency.`;

  // KPI cards (kept for backward compatibility)
  const kpis: KPI[] = [
    {
      id: 1,
      label: "Revenue Growth",
      value: formatValue(dashboard.totalRevenueBenefit || 0),
      growth: calculateGrowthPercent(dashboard.totalRevenueBenefit || 0, totalValue),
      iconName: "TrendingUp",
      desc: "Commercial growth opportunities"
    },
    {
      id: 2,
      label: "Cost Reduction",
      value: formatValue(dashboard.totalCostBenefit || 0),
      growth: totalValue > 0 ? `-${Math.round(((dashboard.totalCostBenefit || 0) / totalValue) * 100)}%` : "-0%",
      iconName: "Activity",
      desc: "Back-office automation"
    },
    {
      id: 3,
      label: "Cash Flow",
      value: formatValue(dashboard.totalCashFlowBenefit || 0),
      growth: calculateGrowthPercent(dashboard.totalCashFlowBenefit || 0, totalValue),
      iconName: "Banknote",
      desc: "Cycle time optimization"
    },
    {
      id: 4,
      label: "Risk Mitigation",
      value: formatValue(dashboard.totalRiskBenefit || 0),
      growth: totalValue > 0 ? `-${Math.round(((dashboard.totalRiskBenefit || 0) / totalValue) * 100)}%` : "-0%",
      iconName: "Shield",
      desc: "Compliance & fraud detection"
    }
  ];

  // NEW: Generate structured Value Driver insights
  const insights = generateValueInsights(dashboard);

  // NEW: Value-Readiness Matrix with composite readiness scoring
  const matrixData: MatrixDataPoint[] = [];
  if (dashboard.topUseCases && dashboard.topUseCases.length > 0) {
    // Find max annual value for normalization
    const maxAnnualValue = Math.max(...dashboard.topUseCases.map(uc => uc.annualValue || 0), 1);

    dashboard.topUseCases.forEach((uc) => {
      const details = extractUseCaseDetails(analysis.steps, uc.useCase);
      const effortScore = details.effortScore || 3;
      const dataReadiness = details.dataReadiness || 3;
      const integrationComplexity = details.integrationComplexity || 3;
      const changeMgmt = details.changeMgmt || 3;

      // Calculate composite scores
      const readinessScore = calculateReadinessScore(dataReadiness, integrationComplexity, changeMgmt);
      const businessValueScore = calculateBusinessValueScore(uc.annualValue || 0, maxAnnualValue);
      const type = getQuadrantType(businessValueScore, readinessScore);

      matrixData.push({
        name: uc.useCase,
        x: readinessScore,
        y: businessValueScore,
        z: effortScore,
        type,
        color: getQuadrantColor(type),
      });
    });
  }

  // Use Case cards
  const useCaseItems: UseCase[] = [];
  if (dashboard.topUseCases && dashboard.topUseCases.length > 0) {
    dashboard.topUseCases.slice(0, 6).forEach((uc, idx) => {
      const details = extractUseCaseDetails(analysis.steps, uc.useCase);
      const step5 = analysis.steps.find(s => s.step === 5);
      let impactText = "Improves operational efficiency";

      if (step5?.data && Array.isArray(step5.data)) {
        const benefit = step5.data.find((b: any) =>
          b["Use Case"] === uc.useCase || b.useCase === uc.useCase
        );
        if (benefit) {
          const revFormula = benefit["Revenue Formula"] || benefit.revenueFormula;
          const costFormula = benefit["Cost Formula"] || benefit.costFormula;
          if (revFormula && !revFormula.toLowerCase().includes('no direct')) {
            impactText = revFormula.split('=')[0]?.trim() || impactText;
          } else if (costFormula && !costFormula.toLowerCase().includes('no direct')) {
            impactText = costFormula.split('=')[0]?.trim() || impactText;
          }
        }
      }

      useCaseItems.push({
        id: `UC-${String(idx + 1).padStart(2, '0')}`,
        title: uc.useCase,
        value: formatValue(uc.annualValue || 0),
        impact: impactText,
        tokens: formatTokens(uc.monthlyTokens || details.monthlyTokens || 0),
        complexity: getComplexityLabel(details.effortScore || 3),
        tags: details.tags.slice(0, 3)
      });
    });
  }

  const createdDate = new Date(report.createdAt);
  const reportDate = createdDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return {
    clientName: report.companyName,
    reportDate,
    hero: {
      titlePrefix: "Unlocking",
      titleHighlight: "Value",
      totalValue: totalValueFormatted,
      valueSuffix,
      description: heroDescription
    },
    executiveSummary: {
      title: "Value Drivers",
      description: sanitizeForProse(analysis.summary) || `Our analysis projects ${formatValue(totalValue)} in annual value across four strategic pillars.`,
      kpis,
      insights,
    },
    priorityMatrix: {
      title: "Value-Readiness Matrix",
      description: "Initiatives mapped by Business Value vs. Implementation Readiness.\nBubble size indicates Implementation Effort (smaller = easier).",
      data: matrixData
    },
    useCases: {
      title: "Use Case Discovery",
      description: `Explore the high-impact engines of the AI Strategy for ${report.companyName}.`,
      items: useCaseItems
    }
  };
}

export type { Report as ReportForDashboard };
