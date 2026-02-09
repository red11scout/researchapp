// server/calculation-postprocessor.ts
// Post-processes AI-generated analysis to ensure all calculations are deterministic and accurate

import {
  calculateCostBenefit,
  calculateRevenueBenefit,
  calculateCashFlowBenefit,
  calculateRiskBenefit,
  calculateCostBenefitSafe,
  calculateRevenueBenefitSafe,
  calculateCashFlowBenefitSafe,
  calculateRiskBenefitSafe,
  calculateTokenCost,
  calculateTotalAnnualValue,
  calculatePriorityScore,
  calculateValuePerMillionTokens,
  getPriorityTier,
  getRecommendedPhase,
  formatMoney,
  formatHours,
  calculateFrictionCost,
  calculateFrictionSeverity,
  crossValidateUseCases,
  calculateFrictionRecovery,
  generateThreeScenarioSummary,
  calculateMultiYearProjection,
  DEFAULT_MULTIPLIERS,
  INPUT_BOUNDS,
  validateInputs,
} from "../src/calc/formulas";

import {
  normalizeFunctionName,
  normalizeSubFunction,
  normalizeAIPrimitive,
  annotateFormula,
  verifyFunctionConsistency,
  reorderColumns,
} from "../shared/taxonomy";

import { verifyAndNormalizeRoles, STANDARDIZED_BENEFITS_LOADING } from '../shared/standardizedRoles';

// ============================================================================
// PER-USE-CASE REVENUE CAP — No single use case can exceed 15% of revenue
// ============================================================================
const PER_USE_CASE_REVENUE_CAP_PCT = 0.15;

// ============================================================================
// STEP 3 CROSS-REFERENCE: Build lookup of actual hours by friction point
// ============================================================================
interface FrictionHoursLookup {
  frictionPoint: string;
  actualHours: number;
  loadedHourlyRate: number;
}

function buildFrictionHoursLookup(step3Data: Step3Record[]): Map<string, FrictionHoursLookup> {
  const lookup = new Map<string, FrictionHoursLookup>();
  for (const record of step3Data) {
    const fp = record["Friction Point"] || "";
    const hours = typeof record["Annual Hours"] === "number"
      ? record["Annual Hours"]
      : parseFloat(String(record["Annual Hours"] || "0").replace(/,/g, "")) || 0;
    const rate = typeof record["Hourly Rate"] === "number"
      ? record["Hourly Rate"]
      : parseFloat(String(record["Hourly Rate"] || DEFAULT_MULTIPLIERS.loadedHourlyRate).replace(/[$,]/g, "")) || DEFAULT_MULTIPLIERS.loadedHourlyRate;
    if (fp && hours > 0) {
      lookup.set(fp, { frictionPoint: fp, actualHours: hours, loadedHourlyRate: rate });
    }
  }
  return lookup;
}

/**
 * Cross-reference parsed cost hours against Step 3 friction data.
 * If the AI hallucinated a wildly inflated number (e.g. 420M instead of 28K),
 * use the Step 3 actual hours as ground truth.
 */
function validateCostHoursAgainstStep3(
  parsedHours: number,
  useCaseId: string,
  step4Data: Step4Record[] | null,
  frictionLookup: Map<string, FrictionHoursLookup>,
  totalStep3Hours: number,
): { correctedHours: number; warning: string | null } {
  // If parsedHours is within reasonable bounds (< 500K), trust it
  if (parsedHours <= INPUT_BOUNDS.hoursSaved.max) {
    return { correctedHours: parsedHours, warning: null };
  }

  // Try to find matching Step 3 friction point via Step 4 link
  if (step4Data) {
    const step4Record = step4Data.find(r => r.ID === useCaseId);
    const targetFriction = step4Record?.["Target Friction"] || "";
    const frictionData = frictionLookup.get(targetFriction);
    if (frictionData && frictionData.actualHours > 0) {
      const warning = `[SANITY CHECK] ${useCaseId}: AI formula claimed ${parsedHours.toLocaleString()} hours, but Step 3 friction data shows ${frictionData.actualHours.toLocaleString()} hours for "${targetFriction.substring(0, 50)}...". Using Step 3 value.`;
      console.warn(warning);
      return { correctedHours: frictionData.actualHours, warning };
    }
  }

  // Fallback: If no Step 3 match, cap at a reasonable fraction of total Step 3 hours
  // No single use case should consume more than total friction hours
  const cappedHours = Math.min(parsedHours, totalStep3Hours, INPUT_BOUNDS.hoursSaved.max);
  const warning = `[SANITY CHECK] ${useCaseId}: AI formula claimed ${parsedHours.toLocaleString()} hours, capped to ${cappedHours.toLocaleString()} (max of Step 3 total ${totalStep3Hours.toLocaleString()} or INPUT_BOUNDS max ${INPUT_BOUNDS.hoursSaved.max.toLocaleString()}).`;
  console.warn(warning);
  return { correctedHours: cappedHours, warning };
}

interface Step0Record {
  "Annual Revenue ($)"?: string;
  "Total Employees"?: number | string;
}

interface Step3Record {
  Function: string;
  "Sub-Function": string;
  "Friction Point": string;
  Severity?: string;
  "Primary Driver Impact"?: string;
  "Estimated Annual Cost ($)"?: string;
  "Annual Hours"?: number | string;
  "Hourly Rate"?: number | string;
  "Cost Formula"?: string;
  "Target Friction"?: string; // Link to Step 4
}

interface Step4Record {
  ID: string;
  "Use Case": string;
  "Target Friction"?: string;
}

interface Step5Record {
  ID: string;
  "Use Case": string;
  "Revenue Benefit ($)"?: string;
  "Revenue Formula"?: string;
  "Revenue Formula Labels"?: any;
  "Cost Benefit ($)"?: string;
  "Cost Formula"?: string;
  "Cost Formula Labels"?: any;
  "Cash Flow Benefit ($)"?: string;
  "Cash Flow Formula"?: string;
  "Cash Flow Formula Labels"?: any;
  "Risk Benefit ($)"?: string;
  "Risk Formula"?: string;
  "Risk Formula Labels"?: any;
  "Total Annual Value ($)"?: string;
  "Probability of Success"?: number;
  "Strategic Theme"?: string;
  [key: string]: any;
}

interface Step6Record {
  ID: string;
  "Use Case": string;
  // Support both original (1-5) suffix and normalized names
  "Data Readiness (1-5)"?: number;
  "Data Readiness"?: number;
  "Integration Complexity (1-5)"?: number;
  "Integration Complexity"?: number;
  "Change Mgmt (1-5)"?: number;
  "Change Mgmt"?: number;
  "Effort Score (1-5)"?: number;
  "Effort Score"?: number;
  "Time-to-Value (months)"?: number;
  "Time-to-Value"?: number;
  "Input Tokens/Run": number;
  "Output Tokens/Run": number;
  "Runs/Month": number;
  "Monthly Tokens"?: number;
  "Annual Token Cost ($)"?: string;
  "Annual Token Cost"?: string;
  "Strategic Theme"?: string;
  [key: string]: any;
}

interface Step7Record {
  ID: string;
  "Use Case": string;
  "Value Score (0-40)"?: number;
  "TTV Score (0-30)"?: number;
  "Effort Score (0-30)"?: number;
  "Priority Score (0-100)"?: number;
  "Priority Tier"?: string;
  "Recommended Phase"?: string;
  "Strategic Theme"?: string;
  [key: string]: any;
}

// Parse a number from a string that may contain currency symbols, commas, M/K suffixes
function parseNumber(str: string | number | undefined): number {
  if (typeof str === "number") return str;
  if (!str) return 0;

  const cleaned = str.replace(/[$,]/g, "").trim();

  if (cleaned.endsWith("M")) {
    return parseFloat(cleaned.slice(0, -1)) * 1_000_000;
  }
  if (cleaned.endsWith("K")) {
    return parseFloat(cleaned.slice(0, -1)) * 1_000;
  }
  if (cleaned.endsWith("B")) {
    return parseFloat(cleaned.slice(0, -1)) * 1_000_000_000;
  }

  return parseFloat(cleaned) || 0;
}

// Check if a formula indicates no benefit
function isNoValue(formula: string | undefined): boolean {
  if (!formula) return true;
  const lower = formula.toLowerCase();
  return (
    lower.includes("no direct") ||
    lower.includes("no quantifiable") ||
    lower.includes("no additional") ||
    lower.includes("n/a") ||
    lower.includes("not applicable") ||
    lower === "$0" ||
    lower === "0"
  );
}

// Extract numbers from a formula string, taking ONLY the left side of =
function extractInputNumbers(formula: string): number[] {
  if (!formula || isNoValue(formula)) return [];

  // Take only the left side of = (the inputs, not the AI's calculated result)
  const formulaPart = formula.split("=")[0] || formula;

  const numbers: number[] = [];

  // Match patterns: 23,000 or 23000 or 100 or 0.85 or 15% or $100 or $2.1M
  const patterns = formulaPart.match(/[\d,]+\.?\d*[%MKB]?|\d+\.?\d*[%MKB]?/g) || [];

  for (const match of patterns) {
    let value = parseFloat(match.replace(/,/g, ""));

    if (match.endsWith("%")) {
      value = parseFloat(match.slice(0, -1)) / 100;
    } else if (match.endsWith("M")) {
      value = parseFloat(match.slice(0, -1)) * 1_000_000;
    } else if (match.endsWith("K")) {
      value = parseFloat(match.slice(0, -1)) * 1_000;
    } else if (match.endsWith("B")) {
      value = parseFloat(match.slice(0, -1)) * 1_000_000_000;
    }

    if (!isNaN(value) && value > 0) {
      numbers.push(value);
    }
  }

  return numbers;
}

// Categorize numbers into formula inputs based on typical ranges
interface CostInputs {
  hoursSaved: number;
  loadedHourlyRate: number;
  efficiencyMultiplier: number;
  adoptionMultiplier: number;
  dataMaturityMultiplier: number;
}

function parseCostFormulaInputs(formula: string): CostInputs | null {
  const numbers = extractInputNumbers(formula);
  if (numbers.length < 2) return null;

  // Default multipliers from spec
  let hoursSaved = 0;
  let loadedHourlyRate = DEFAULT_MULTIPLIERS.loadedHourlyRate;
  let efficiencyMultiplier = DEFAULT_MULTIPLIERS.costRealizationMultiplier;
  let adoptionMultiplier = DEFAULT_MULTIPLIERS.costRealizationMultiplier;
  let dataMaturityMultiplier = DEFAULT_MULTIPLIERS.dataMaturityMultiplier;

  const decimals: number[] = [];
  const largeNumbers: number[] = [];

  for (const num of numbers) {
    if (num > 0 && num <= 1) {
      decimals.push(num);
    } else if (num >= 1000) {
      largeNumbers.push(num);
    } else if (num >= 50 && num <= 500) {
      // Likely hourly rate
      loadedHourlyRate = num;
    }
  }

  // First large number is typically hours saved
  if (largeNumbers.length > 0) {
    hoursSaved = largeNumbers[0];
  }

  // Assign decimals to multipliers in order (efficiency, realization/adoption, data maturity)
  // The formula shows: hours × rate × savings% × 0.90 × 0.75
  // Where savings% is the efficiency, 0.90 is cost realization, 0.75 is data maturity
  if (decimals.length >= 1) efficiencyMultiplier = decimals[0];
  if (decimals.length >= 2) adoptionMultiplier = decimals[1]; // This is actually cost realization (0.90)
  if (decimals.length >= 3) dataMaturityMultiplier = decimals[2];

  if (hoursSaved === 0) return null;

  return {
    hoursSaved,
    loadedHourlyRate,
    efficiencyMultiplier,
    adoptionMultiplier,
    dataMaturityMultiplier,
  };
}

// Recalculate cost benefit using deterministic formula WITH Step 3 cross-reference
function recalculateCostBenefit(
  formula: string,
  useCaseId?: string,
  step4Data?: Step4Record[] | null,
  frictionLookup?: Map<string, FrictionHoursLookup>,
  totalStep3Hours?: number,
): { value: number; formulaText: string; warnings: string[] } {
  const warnings: string[] = [];

  if (isNoValue(formula)) {
    return { value: 0, formulaText: "No direct cost reduction", warnings };
  }

  const inputs = parseCostFormulaInputs(formula);

  if (!inputs) {
    console.log(`[recalculateCostBenefit] Could not parse inputs from: ${formula}`);
    return { value: 0, formulaText: formula, warnings };
  }

  // CRITICAL FIX: Cross-reference parsed hours against Step 3 friction data
  let correctedHours = inputs.hoursSaved;
  if (useCaseId && frictionLookup && totalStep3Hours !== undefined) {
    const validation = validateCostHoursAgainstStep3(
      inputs.hoursSaved,
      useCaseId,
      step4Data || null,
      frictionLookup,
      totalStep3Hours,
    );
    correctedHours = validation.correctedHours;
    if (validation.warning) {
      warnings.push(validation.warning);
    }
  }

  // Use the SAFE deterministic formula function (enforces INPUT_BOUNDS)
  const result = calculateCostBenefitSafe({
    hoursSaved: correctedHours,
    loadedHourlyRate: inputs.loadedHourlyRate,
    benefitsLoading: DEFAULT_MULTIPLIERS.benefitsLoading,
    costRealizationMultiplier: inputs.adoptionMultiplier,
    dataMaturityMultiplier: inputs.dataMaturityMultiplier,
  });

  if (result.inputsClamped) {
    warnings.push(...result.validationWarnings);
  }

  // Generate formula text with correct result - includes BenefitsLoading (1.35)
  const newFormula = `${formatHours(correctedHours)} × $${inputs.loadedHourlyRate}/hr × 1.35 × ${inputs.adoptionMultiplier.toFixed(2)} × ${inputs.dataMaturityMultiplier.toFixed(2)} = ${formatMoney(result.trace.output)} → ${formatMoney(result.value)}`;

  return { value: result.value, formulaText: newFormula, warnings };
}

// Parse revenue formula inputs
interface RevenueInputs {
  upliftPct: number;
  baselineRevenueAtRisk: number;
  marginPct: number;
  revenueRealizationMultiplier: number;
  dataMaturityMultiplier: number;
}

function parseRevenueFormulaInputs(formula: string): RevenueInputs | null {
  const numbers = extractInputNumbers(formula);
  if (numbers.length < 2) return null;

  let upliftPct = 0;
  let baselineRevenueAtRisk = 0;
  let marginPct = 1.0;
  let revenueRealizationMultiplier = DEFAULT_MULTIPLIERS.revenueRealizationMultiplier;
  let dataMaturityMultiplier = DEFAULT_MULTIPLIERS.dataMaturityMultiplier;

  const decimals: number[] = [];
  const largeNumbers: number[] = [];

  for (const num of numbers) {
    if (num > 0 && num < 1) {
      decimals.push(num);
    } else if (num >= 1_000_000) {
      largeNumbers.push(num);
    }
  }

  // First decimal is likely the uplift percentage
  if (decimals.length >= 1) upliftPct = decimals[0];
  // Remaining decimals are multipliers
  if (decimals.length >= 2) revenueRealizationMultiplier = decimals[1];
  if (decimals.length >= 3) dataMaturityMultiplier = decimals[2];

  // Large number is the baseline revenue at risk
  if (largeNumbers.length > 0) baselineRevenueAtRisk = largeNumbers[0];

  if (upliftPct === 0 || baselineRevenueAtRisk === 0) return null;

  return {
    upliftPct,
    baselineRevenueAtRisk,
    marginPct,
    revenueRealizationMultiplier,
    dataMaturityMultiplier,
  };
}

function recalculateRevenueBenefit(formula: string): { value: number; formulaText: string; warnings: string[] } {
  const warnings: string[] = [];

  if (isNoValue(formula)) {
    return { value: 0, formulaText: "No direct revenue impact", warnings };
  }

  const inputs = parseRevenueFormulaInputs(formula);

  if (!inputs) {
    // Cannot parse - log warning and return 0 to avoid incorrect values
    console.warn(`[recalculateRevenueBenefit] Could not parse formula, returning 0: ${formula}`);
    return { value: 0, formulaText: formula + " (could not validate)", warnings };
  }

  // Use the SAFE wrapper (enforces INPUT_BOUNDS on uplift % and baseline revenue)
  const result = calculateRevenueBenefitSafe(inputs);

  if (result.inputsClamped) {
    warnings.push(...result.validationWarnings);
  }

  const newFormula = `${(inputs.upliftPct * 100).toFixed(0)}% × ${formatMoney(inputs.baselineRevenueAtRisk)} × ${inputs.revenueRealizationMultiplier.toFixed(2)} × ${inputs.dataMaturityMultiplier.toFixed(2)} = ${formatMoney(result.trace.output)} → ${formatMoney(result.value)}`;

  return { value: result.value, formulaText: newFormula, warnings };
}

// Parse cash flow formula inputs
interface CashFlowInputs {
  daysImprovement: number;
  annualRevenue: number;
  costOfCapital: number;
  cashFlowRealizationMultiplier: number;
  dataMaturityMultiplier: number;
}

function parseCashFlowFormulaInputs(formula: string): CashFlowInputs | null {
  const numbers = extractInputNumbers(formula);
  if (numbers.length < 2) return null;

  let daysImprovement = 0;
  let annualRevenue = 0;
  let costOfCapital = DEFAULT_MULTIPLIERS.defaultCostOfCapital;
  let cashFlowRealizationMultiplier = DEFAULT_MULTIPLIERS.cashFlowRealizationMultiplier;
  let dataMaturityMultiplier = DEFAULT_MULTIPLIERS.dataMaturityMultiplier;

  const decimals: number[] = [];
  const smallNumbers: number[] = [];
  const largeNumbers: number[] = [];

  for (const num of numbers) {
    if (num > 0 && num < 1) {
      decimals.push(num);
    } else if (num >= 1 && num <= 365) {
      smallNumbers.push(num);
    } else if (num >= 1000) {
      largeNumbers.push(num);
    }
  }

  // First small number is days improvement
  if (smallNumbers.length > 0) daysImprovement = smallNumbers[0];
  // Large number is annual revenue
  if (largeNumbers.length > 0) annualRevenue = largeNumbers[0];
  // Decimals are multipliers
  if (decimals.length >= 1) costOfCapital = decimals[0];
  if (decimals.length >= 2) cashFlowRealizationMultiplier = decimals[1];
  if (decimals.length >= 3) dataMaturityMultiplier = decimals[2];

  if (daysImprovement === 0 || annualRevenue === 0) return null;

  return {
    daysImprovement,
    annualRevenue,
    costOfCapital,
    cashFlowRealizationMultiplier,
    dataMaturityMultiplier,
  };
}

function recalculateCashFlowBenefit(formula: string): { value: number; formulaText: string; warnings: string[] } {
  const warnings: string[] = [];

  if (isNoValue(formula)) {
    return { value: 0, formulaText: "No direct cash flow impact", warnings };
  }

  const inputs = parseCashFlowFormulaInputs(formula);

  if (!inputs) {
    // Cannot parse - log warning and return 0 to avoid incorrect values
    console.warn(`[recalculateCashFlowBenefit] Could not parse formula, returning 0: ${formula}`);
    return { value: 0, formulaText: formula + " (could not validate)", warnings };
  }

  // Use the SAFE wrapper (enforces INPUT_BOUNDS on days, revenue, cost of capital)
  const result = calculateCashFlowBenefitSafe({
    daysImprovement: inputs.daysImprovement,
    annualRevenue: inputs.annualRevenue,
    costOfCapital: inputs.costOfCapital,
    cashFlowRealizationMultiplier: inputs.cashFlowRealizationMultiplier,
    dataMaturityMultiplier: inputs.dataMaturityMultiplier,
  });

  if (result.inputsClamped) {
    warnings.push(...result.validationWarnings);
  }

  // Updated formula text to show correct working capital calculation
  const newFormula = `${inputs.annualRevenue.toLocaleString()} × (${inputs.daysImprovement} / 365) × ${inputs.costOfCapital.toFixed(2)} × ${inputs.cashFlowRealizationMultiplier.toFixed(2)} × ${inputs.dataMaturityMultiplier.toFixed(2)} = ${formatMoney(result.trace.output)} → ${formatMoney(result.value)}`;

  return { value: result.value, formulaText: newFormula, warnings };
}

// Parse risk formula inputs
interface RiskInputs {
  probBefore: number;
  impactBefore: number;
  probAfter: number;
  impactAfter: number;
  riskRealizationMultiplier: number;
  dataMaturityMultiplier: number;
}

function parseRiskFormulaInputs(formula: string): RiskInputs | null {
  const numbers = extractInputNumbers(formula);
  if (numbers.length < 2) return null;

  // Risk formulas are more complex, often showing reduction %
  // E.g., "15% reduction × $6M exposure × 0.80 × 0.75"
  let reductionPct = 0;
  let exposure = 0;
  let riskRealizationMultiplier = DEFAULT_MULTIPLIERS.riskRealizationMultiplier;
  let dataMaturityMultiplier = DEFAULT_MULTIPLIERS.dataMaturityMultiplier;

  const decimals: number[] = [];
  const largeNumbers: number[] = [];

  for (const num of numbers) {
    if (num > 0 && num < 1) {
      decimals.push(num);
    } else if (num >= 100000) {
      largeNumbers.push(num);
    }
  }

  // First decimal is likely the reduction percentage
  if (decimals.length >= 1) reductionPct = decimals[0];
  if (decimals.length >= 2) riskRealizationMultiplier = decimals[1];
  if (decimals.length >= 3) dataMaturityMultiplier = decimals[2];

  // Large number is the exposure
  if (largeNumbers.length > 0) exposure = largeNumbers[0];

  if (reductionPct === 0 || exposure === 0) return null;

  // Convert to before/after format
  return {
    probBefore: reductionPct, // Treating reduction % as risk reduction
    impactBefore: exposure,
    probAfter: 0,
    impactAfter: 0,
    riskRealizationMultiplier,
    dataMaturityMultiplier,
  };
}

function recalculateRiskBenefit(formula: string): { value: number; formulaText: string; warnings: string[] } {
  const warnings: string[] = [];

  if (isNoValue(formula)) {
    return { value: 0, formulaText: "No quantifiable risk reduction", warnings };
  }

  const inputs = parseRiskFormulaInputs(formula);

  if (!inputs) {
    // Cannot parse - log warning and return 0 to avoid incorrect values
    console.warn(`[recalculateRiskBenefit] Could not parse formula, returning 0: ${formula}`);
    return { value: 0, formulaText: formula + " (could not validate)", warnings };
  }

  // Use the SAFE wrapper (enforces INPUT_BOUNDS on probabilities and impact)
  const result = calculateRiskBenefitSafe({
    probBefore: inputs.probBefore,
    impactBefore: inputs.impactBefore,
    probAfter: inputs.probAfter,
    impactAfter: inputs.impactAfter,
    riskRealizationMultiplier: inputs.riskRealizationMultiplier,
    dataMaturityMultiplier: inputs.dataMaturityMultiplier,
  });

  if (result.inputsClamped) {
    warnings.push(...result.validationWarnings);
  }

  const newFormula = `${(inputs.probBefore * 100).toFixed(0)}% × ${formatMoney(inputs.impactBefore)} × ${inputs.riskRealizationMultiplier.toFixed(2)} × ${inputs.dataMaturityMultiplier.toFixed(2)} = ${formatMoney(result.trace.output)} → ${formatMoney(result.value)}`;

  return { value: result.value, formulaText: newFormula, warnings };
}

// Parse friction point cost from AI-generated text
function parseFrictionCostInputs(costText: string): { annualHours: number; loadedHourlyRate: number } | null {
  if (!costText || costText.toLowerCase().includes("no ") || costText === "$0") {
    return null;
  }

  // Try to parse from formula format: "X hours × $Y/hr"
  const hoursMatch = costText.match(/([\d,]+(?:\.\d+)?)\s*(?:hours|hrs)/i);
  const rateMatch = costText.match(/\$([\d,]+(?:\.\d+)?)\/(?:hr|hour)/i);

  if (hoursMatch && rateMatch) {
    const annualHours = parseFloat(hoursMatch[1].replace(/,/g, ""));
    const loadedHourlyRate = parseFloat(rateMatch[1].replace(/,/g, ""));
    return { annualHours, loadedHourlyRate };
  }

  // Try to extract hours and infer rate from $X format
  if (hoursMatch) {
    const annualHours = parseFloat(hoursMatch[1].replace(/,/g, ""));
    return { annualHours, loadedHourlyRate: DEFAULT_MULTIPLIERS.loadedHourlyRate };
  }

  // Try to parse from total cost and infer hours
  const costMatch = costText.match(/\$([\d,]+(?:\.\d+)?)(M|K)?/i);
  if (costMatch) {
    let totalCost = parseFloat(costMatch[1].replace(/,/g, ""));
    if (costMatch[2]?.toUpperCase() === "M") totalCost *= 1_000_000;
    if (costMatch[2]?.toUpperCase() === "K") totalCost *= 1_000;

    // Infer hours from cost at default rate
    const annualHours = totalCost / DEFAULT_MULTIPLIERS.loadedHourlyRate;
    return { annualHours, loadedHourlyRate: DEFAULT_MULTIPLIERS.loadedHourlyRate };
  }

  return null;
}

// Recalculate friction point cost using deterministic formula
function recalculateFrictionCost(record: Step3Record): {
  value: number;
  formulaText: string;
  annualHours: number;
  loadedHourlyRate: number;
  severity: string;
} {
  const costText = record["Estimated Annual Cost ($)"] || "";
  const existingHours = record["Annual Hours"];
  const existingRate = record["Hourly Rate"];

  let annualHours: number = 0;
  let loadedHourlyRate: number = DEFAULT_MULTIPLIERS.loadedHourlyRate;

  // Try to use explicit inputs if available
  if (existingHours !== undefined) {
    annualHours = typeof existingHours === "number" ? existingHours : parseFloat(String(existingHours).replace(/,/g, "")) || 0;
  }
  if (existingRate !== undefined) {
    loadedHourlyRate = typeof existingRate === "number" ? existingRate : parseFloat(String(existingRate).replace(/[$,]/g, "")) || DEFAULT_MULTIPLIERS.loadedHourlyRate;
  }

  // If no explicit inputs, try to parse from the cost text
  if (annualHours === 0) {
    const parsed = parseFrictionCostInputs(costText);
    if (parsed) {
      annualHours = parsed.annualHours;
      loadedHourlyRate = parsed.loadedHourlyRate;
    }
  }

  if (annualHours === 0) {
    console.warn(`[recalculateFrictionCost] Could not parse inputs from: ${costText}`);
    return {
      value: 0,
      formulaText: costText + " (could not validate)",
      annualHours: 0,
      loadedHourlyRate,
      severity: "Low"
    };
  }

  // Use the deterministic friction cost formula
  const result = calculateFrictionCost({
    annualHours,
    loadedHourlyRate,
  });

  // Calculate severity based on the cost
  const driverImpact = record["Primary Driver Impact"]?.toLowerCase() || "";
  const severity = calculateFrictionSeverity({
    annualCost: result.value,
    affectsRevenue: driverImpact.includes("revenue") || driverImpact.includes("sales"),
    affectsCompliance: driverImpact.includes("compliance") || driverImpact.includes("regulatory") || driverImpact.includes("legal"),
    affectsCustomer: driverImpact.includes("customer") || driverImpact.includes("client"),
  });

  const formulaText = `${formatHours(annualHours)} × $${loadedHourlyRate}/hr = ${formatMoney(result.trace.output)} → ${formatMoney(result.value)}`;

  return {
    value: result.value,
    formulaText,
    annualHours,
    loadedHourlyRate,
    severity
  };
}

// Calculate token cost from Step 6 data
function calculateTokenCostFromStep6(record: Step6Record): { monthlyTokens: number; annualCost: number } {
  const runsPerMonth = record["Runs/Month"] || 0;
  const inputTokensPerRun = record["Input Tokens/Run"] || 0;
  const outputTokensPerRun = record["Output Tokens/Run"] || 0;

  const result = calculateTokenCost({
    runsPerMonth,
    inputTokensPerRun,
    outputTokensPerRun,
  });

  const monthlyTokens = runsPerMonth * (inputTokensPerRun + outputTokensPerRun);

  return { monthlyTokens, annualCost: result.value };
}

// Post-process the entire analysis result
export function postProcessAnalysis(analysisResult: any): any {
  if (!analysisResult || !analysisResult.steps) {
    return analysisResult;
  }

  const steps = [...analysisResult.steps];

  // Find all steps
  const step0 = steps.find((s: any) => s.step === 0);
  const step3 = steps.find((s: any) => s.step === 3);
  const step4 = steps.find((s: any) => s.step === 4);
  const step5 = steps.find((s: any) => s.step === 5);
  const step6 = steps.find((s: any) => s.step === 6);
  const step7 = steps.find((s: any) => s.step === 7);

  // Extract Step 0 metadata for revenue and employee count
  let annualRevenueFromStep0 = 0;
  let totalEmployeesFromStep0 = 0;

  if (step0?.data) {
    const step0Data = Array.isArray(step0.data) ? step0.data[0] : step0.data;
    if (step0Data) {
      annualRevenueFromStep0 = parseNumber(step0Data["Annual Revenue ($)"]);
      totalEmployeesFromStep0 = typeof step0Data["Total Employees"] === "number"
        ? step0Data["Total Employees"]
        : parseNumber(String(step0Data["Total Employees"] || 0));
    }
  }

  // ============================================
  // STEP 3: FRICTION POINT PROCESSING
  // ============================================
  let totalFrictionCost = 0;
  const frictionCostMap = new Map<string, number>(); // Map friction points to costs

  if (step3?.data && Array.isArray(step3.data)) {
    console.log("[postProcessAnalysis] Processing", step3.data.length, "friction points with deterministic formulas");

    const correctedStep3Data: Step3Record[] = [];

    for (const record of step3.data as Step3Record[]) {
      const frictionResult = recalculateFrictionCost(record);
      totalFrictionCost += frictionResult.value;

      // Store friction cost by name for later linking to benefits
      const frictionPoint = record["Friction Point"] || "";
      frictionCostMap.set(frictionPoint, frictionResult.value);

      correctedStep3Data.push({
        ...record,
        "Estimated Annual Cost ($)": formatMoney(frictionResult.value),
        "Cost Formula": frictionResult.formulaText,
        "Annual Hours": Math.round(frictionResult.annualHours),
        "Hourly Rate": frictionResult.loadedHourlyRate,
        Severity: frictionResult.severity,
      });

      console.log(`[postProcessAnalysis] Friction: ${record["Friction Point"]?.substring(0, 30)}... = ${formatMoney(frictionResult.value)} (${frictionResult.severity})`);
    }

    step3.data = correctedStep3Data;
    console.log(`[postProcessAnalysis] Total Friction Cost: ${formatMoney(totalFrictionCost)}`);
  }

  // ============================================
  // FUNCTION/SUB-FUNCTION NORMALIZATION (Steps 2, 3, 4)
  // ============================================
  const step2 = steps.find((s: any) => s.step === 2);

  // Normalize Step 2 (KPIs)
  if (step2?.data && Array.isArray(step2.data)) {
    for (const record of step2.data) {
      if (record["Function"]) {
        record["Function"] = normalizeFunctionName(record["Function"]);
      }
      if (record["Sub-Function"]) {
        record["Sub-Function"] = normalizeSubFunction(record["Function"] || "", record["Sub-Function"]);
      }
    }
    console.log(`[postProcessAnalysis] Normalized ${step2.data.length} Step 2 Function/Sub-Function values`);
  }

  // Normalize Step 3 (Friction Points)
  if (step3?.data && Array.isArray(step3.data)) {
    for (const record of step3.data) {
      if (record["Function"]) {
        record["Function"] = normalizeFunctionName(record["Function"]);
      }
      if (record["Sub-Function"]) {
        record["Sub-Function"] = normalizeSubFunction(record["Function"] || "", record["Sub-Function"]);
      }
    }
    console.log(`[postProcessAnalysis] Normalized ${step3.data.length} Step 3 Function/Sub-Function values`);

    // Normalize roles to standardized table
    const roleVerification = verifyAndNormalizeRoles(step3.data, 'Function', 'Hourly Rate');
    console.log('[postProcessAnalysis] Role verification:', roleVerification.map(r =>
      `${r.frictionPoint}: ${r.originalRole || 'none'} → ${r.matchedRole} ($${r.standardizedRate}/hr) [${r.confidence}]`
    ).join('\n'));
  }

  // Normalize Step 4 (Use Cases) - Function/Sub-Function + AI Primitives
  if (step4?.data && Array.isArray(step4.data)) {
    for (const record of step4.data) {
      if (record["Function"]) {
        record["Function"] = normalizeFunctionName(record["Function"]);
      }
      if (record["Sub-Function"]) {
        record["Sub-Function"] = normalizeSubFunction(record["Function"] || "", record["Sub-Function"]);
      }
      if (record["AI Primitives"]) {
        record["AI Primitives"] = normalizeAIPrimitive(record["AI Primitives"]);
      }
    }
    console.log(`[postProcessAnalysis] Normalized ${step4.data.length} Step 4 Function/Sub-Function/AI Primitives values`);
  }

  // Cross-step verification
  if (step2?.data && step3?.data && step4?.data) {
    const verification = verifyFunctionConsistency(step2.data, step3.data, step4.data);
    if (verification.warnings.length > 0) {
      console.log(`[postProcessAnalysis] Function consistency warnings:`);
      verification.warnings.forEach(w => console.log(`  - ${w}`));
    }
  }

  // ============================================
  // BUILD STEP 3 FRICTION HOURS LOOKUP (for cross-referencing)
  // ============================================
  let frictionLookup = new Map<string, FrictionHoursLookup>();
  let totalStep3Hours = 0;
  if (step3?.data && Array.isArray(step3.data)) {
    frictionLookup = buildFrictionHoursLookup(step3.data as Step3Record[]);
    frictionLookup.forEach((entry) => {
      totalStep3Hours += entry.actualHours;
    });
    console.log(`[postProcessAnalysis] Built friction lookup: ${frictionLookup.size} entries, total Step 3 hours = ${totalStep3Hours.toLocaleString()}`);
  }

  // ============================================
  // STEP 5: BENEFITS QUANTIFICATION PROCESSING
  // ============================================
  if (!step5?.data || !Array.isArray(step5.data)) {
    console.log("[postProcessAnalysis] Step 5 data not found or invalid");
    return analysisResult;
  }

  console.log("[postProcessAnalysis] Processing", step5.data.length, "use cases with deterministic formulas + Step 3 cross-reference");

  // Recalculate all Step 5 benefits using deterministic formulas
  const correctedStep5Data: Step5Record[] = [];
  let totalCostBenefit = 0;
  let totalRevenueBenefit = 0;
  let totalCashFlowBenefit = 0;
  let totalRiskBenefit = 0;

  const useCaseBenefitsForValidation: Array<{
    id: string;
    costBenefit: number;
    revenueBenefit: number;
    cashFlowBenefit: number;
    riskBenefit: number;
    hoursSaved?: number;
  }> = [];

  // Accumulate all per-use-case warnings during recalculation
  const allUseCaseWarnings: string[] = [];

  // Per-use-case revenue cap (15% of annual revenue)
  const perUseCaseMaxValue = annualRevenueFromStep0 > 0
    ? annualRevenueFromStep0 * PER_USE_CASE_REVENUE_CAP_PCT
    : Infinity;

  for (const record of step5.data as Step5Record[]) {
    // CRITICAL FIX: Pass Step 3 cross-reference data to cost recalculation
    const costResult = recalculateCostBenefit(
      record["Cost Formula"] || "",
      record.ID,
      step4?.data ? (step4.data as Step4Record[]) : null,
      frictionLookup,
      totalStep3Hours,
    );
    const revenueResult = recalculateRevenueBenefit(record["Revenue Formula"] || "");
    const cashFlowResult = recalculateCashFlowBenefit(record["Cash Flow Formula"] || "");
    const riskResult = recalculateRiskBenefit(record["Risk Formula"] || "");

    // Collect all warnings from individual recalculations
    const ucWarnings = [
      ...costResult.warnings,
      ...revenueResult.warnings,
      ...cashFlowResult.warnings,
      ...riskResult.warnings,
    ];

    let costVal = costResult.value;
    let revVal = revenueResult.value;
    let cfVal = cashFlowResult.value;
    let riskVal = riskResult.value;
    let ucTotal = costVal + revVal + cfVal + riskVal;

    // PER-USE-CASE REVENUE CAP: No single use case exceeds 15% of annual revenue
    if (annualRevenueFromStep0 > 0 && ucTotal > perUseCaseMaxValue) {
      const ucCapScale = perUseCaseMaxValue / ucTotal;
      const warning = `[PER-UC CAP] ${record.ID} "${record["Use Case"]}": Total ${formatMoney(ucTotal)} exceeds ${(PER_USE_CASE_REVENUE_CAP_PCT * 100).toFixed(0)}% of revenue (${formatMoney(perUseCaseMaxValue)}). Scaling by ${ucCapScale.toFixed(3)}.`;
      console.warn(warning);
      ucWarnings.push(warning);

      costVal *= ucCapScale;
      revVal *= ucCapScale;
      cfVal *= ucCapScale;
      riskVal *= ucCapScale;
      ucTotal = perUseCaseMaxValue;
    }

    const prob = record["Probability of Success"] || 0.75;

    totalCostBenefit += costVal;
    totalRevenueBenefit += revVal;
    totalCashFlowBenefit += cfVal;
    totalRiskBenefit += riskVal;

    // Extract hours saved for cross-validation
    const costFormula = record["Cost Formula"] || "";
    const costInputs = parseCostFormulaInputs(costFormula);
    const hoursSaved = costInputs?.hoursSaved || 0;

    useCaseBenefitsForValidation.push({
      id: record.ID,
      costBenefit: costVal,
      revenueBenefit: revVal,
      cashFlowBenefit: cfVal,
      riskBenefit: riskVal,
      hoursSaved,
    });

    // Annotate formulas with labeled components for UI display
    const revenueAnnotation = annotateFormula(revenueResult.formulaText, "revenue");
    const costAnnotation = annotateFormula(costResult.formulaText, "cost");
    const cashFlowAnnotation = annotateFormula(cashFlowResult.formulaText, "cashflow");
    const riskAnnotation = annotateFormula(riskResult.formulaText, "risk");

    correctedStep5Data.push({
      ...record,
      "Cost Benefit ($)": formatMoney(costVal),
      "Cost Formula": costResult.formulaText,
      "Cost Formula Labels": costAnnotation,
      "Revenue Benefit ($)": formatMoney(revVal),
      "Revenue Formula": revenueResult.formulaText,
      "Revenue Formula Labels": revenueAnnotation,
      "Cash Flow Benefit ($)": formatMoney(cfVal),
      "Cash Flow Formula": cashFlowResult.formulaText,
      "Cash Flow Formula Labels": cashFlowAnnotation,
      "Risk Benefit ($)": formatMoney(riskVal),
      "Risk Formula": riskResult.formulaText,
      "Risk Formula Labels": riskAnnotation,
      "Total Annual Value ($)": formatMoney(ucTotal),
    });

    // Collect per-use-case warnings for the validation report
    allUseCaseWarnings.push(...ucWarnings);

    console.log(`[postProcessAnalysis] ${record.ID}: Cost=${formatMoney(costVal)}, Revenue=${formatMoney(revVal)}, CashFlow=${formatMoney(cfVal)}, Risk=${formatMoney(riskVal)}, Total=${formatMoney(ucTotal)}${ucWarnings.length > 0 ? ` [${ucWarnings.length} warnings]` : ''}`);
  }

  // ============================================
  // STEP 5: CROSS-VALIDATION & BENEFITS CAP
  // ============================================
  const validationWarnings: string[] = [...allUseCaseWarnings];
  let benefitsCapped = false;
  let capScaleFactor = 1.0;

  if (annualRevenueFromStep0 > 0) {
    const validationResult = crossValidateUseCases({
      useCaseBenefits: useCaseBenefitsForValidation,
      annualRevenue: annualRevenueFromStep0,
      totalEmployees: totalEmployeesFromStep0,
    });

    validationWarnings.push(...validationResult.warnings);

    if (validationResult.metrics.benefitsCapped) {
      benefitsCapped = true;
      capScaleFactor = validationResult.metrics.scaleFactor;
      console.log(`[postProcessAnalysis] Benefits capped: scale factor = ${capScaleFactor.toFixed(2)}, reducing all benefits proportionally`);

      // Apply proportional scaling to all corrected Step 5 records
      const totalBenefitsBeforeCap = totalCostBenefit + totalRevenueBenefit + totalCashFlowBenefit + totalRiskBenefit;
      const totalBenefitsAfterCap = totalBenefitsBeforeCap * capScaleFactor;

      for (let i = 0; i < correctedStep5Data.length; i++) {
        const record = correctedStep5Data[i];
        const uc = useCaseBenefitsForValidation[i];

        // Scale each benefit type by the cap scale factor
        const scaledCostBenefit = uc.costBenefit * capScaleFactor;
        const scaledRevenueBenefit = uc.revenueBenefit * capScaleFactor;
        const scaledCashFlowBenefit = uc.cashFlowBenefit * capScaleFactor;
        const scaledRiskBenefit = uc.riskBenefit * capScaleFactor;

        const scaledTotal = scaledCostBenefit + scaledRevenueBenefit + scaledCashFlowBenefit + scaledRiskBenefit;

        record["Cost Benefit ($)"] = formatMoney(scaledCostBenefit);
        record["Revenue Benefit ($)"] = formatMoney(scaledRevenueBenefit);
        record["Cash Flow Benefit ($)"] = formatMoney(scaledCashFlowBenefit);
        record["Risk Benefit ($)"] = formatMoney(scaledRiskBenefit);
        record["Total Annual Value ($)"] = formatMoney(scaledTotal);
      }

      totalCostBenefit *= capScaleFactor;
      totalRevenueBenefit *= capScaleFactor;
      totalCashFlowBenefit *= capScaleFactor;
      totalRiskBenefit *= capScaleFactor;
    }
  }

  // Update Step 5 data with scaled benefits
  step5.data = correctedStep5Data;

  // ============================================
  // FRICTION RECOVERY: LINK STEP 3 TO STEP 5
  // ============================================
  const frictionRecoveryMap = new Map<string, Array<{
    useCaseId: string;
    useCaseName: string;
    recoveryAmount: number;
    recoveryPct: number;
  }>>();

  if (step4?.data && Array.isArray(step4.data)) {
    for (const step4Record of step4.data as Step4Record[]) {
      const targetFriction = step4Record["Target Friction"]?.toString() || "";
      if (!targetFriction) continue;

      // Find the friction cost for this target
      const frictionCost = frictionCostMap.get(targetFriction) || 0;
      if (frictionCost === 0) continue;

      // Find the corresponding Step 5 benefit
      const step5Record = correctedStep5Data.find(r => r.ID === step4Record.ID);
      if (!step5Record) continue;

      const useCaseBenefit = parseNumber(step5Record["Total Annual Value ($)"]);
      const recovery = calculateFrictionRecovery(frictionCost, useCaseBenefit);

      if (!frictionRecoveryMap.has(targetFriction)) {
        frictionRecoveryMap.set(targetFriction, []);
      }
      frictionRecoveryMap.get(targetFriction)!.push({
        useCaseId: step4Record.ID,
        useCaseName: step4Record["Use Case"],
        recoveryAmount: recovery.recoveryAmount,
        recoveryPct: recovery.recoveryPct,
      });

      console.log(`[postProcessAnalysis] Friction Recovery: Use Case ${step4Record.ID} recovers ${formatMoney(recovery.recoveryAmount)} (${(recovery.recoveryPct * 100).toFixed(0)}%) from friction "${targetFriction}"`);
    }
  }

  // Recalculate Step 6 token costs using deterministic formula
  // AND reorder columns into logical groups:
  //   AI Execution: ID, Use Case, Runs/Month, Input Tokens/Run, Output Tokens/Run, Monthly Tokens, Annual Token Cost
  //   Implementation: Effort Score, Data Readiness, Integration Complexity, Change Mgmt, Time-to-Value
  let totalMonthlyTokens = 0;

  if (step6?.data && Array.isArray(step6.data)) {
    const correctedStep6Data: any[] = [];

    // Ensure Time-to-Value exists
    for (const row of step6.data as Step6Record[]) {
      if (!row['Time-to-Value'] && !row['Time-to-Value (months)']) {
        row['Time-to-Value'] = 6; // Default 6 months
      }
    }

    for (const record of step6.data as Step6Record[]) {
      const tokenResult = calculateTokenCostFromStep6(record);
      totalMonthlyTokens += tokenResult.monthlyTokens;

      // Build record with logically ordered columns (matches STEP_COLUMN_ORDER[6] in taxonomy.ts)
      const orderedRecord: Record<string, any> = {
        // Group 1: Identity
        "ID": record.ID,
        "Use Case": record["Use Case"],
        // Group 2: Implementation Readiness
        "Data Readiness": record["Data Readiness (1-5)"] ?? record["Data Readiness"],
        "Integration Complexity": record["Integration Complexity (1-5)"] ?? record["Integration Complexity"],
        "Effort Score": record["Effort Score (1-5)"] ?? record["Effort Score"],
        "Change Mgmt": record["Change Mgmt (1-5)"] ?? record["Change Mgmt"],
        // Group 3: AI Execution
        "Monthly Tokens": tokenResult.monthlyTokens,
        "Runs/Month": record["Runs/Month"],
        "Input Tokens/Run": record["Input Tokens/Run"],
        "Output Tokens/Run": record["Output Tokens/Run"],
        "Annual Token Cost": formatMoney(tokenResult.annualCost),
        // Group 4: Timeline
        "Time-to-Value": record["Time-to-Value (months)"] ?? record["Time-to-Value"],
      };

      // Preserve Strategic Theme if present
      if (record["Strategic Theme"]) {
        orderedRecord["Strategic Theme"] = record["Strategic Theme"];
      }

      correctedStep6Data.push(orderedRecord);
    }

    step6.data = correctedStep6Data;
  }

  // Recalculate Step 7 priority scores using deterministic formula
  if (step7?.data && Array.isArray(step7.data) && step6?.data) {
    const correctedStep7Data: Step7Record[] = [];

    for (const record of step7.data as Step7Record[]) {
      // Find matching Step 5 and Step 6 records
      const step5Record = correctedStep5Data.find(r => r.ID === record.ID);
      const step6Record = (step6.data as Step6Record[]).find(r => r.ID === record.ID);

      if (step5Record && step6Record) {
        const totalValue = parseNumber(step5Record["Total Annual Value ($)"]);
        const ttv = step6Record["Time-to-Value"] ?? step6Record["Time-to-Value (months)"] ?? 6;
        const dataReadiness = step6Record["Data Readiness"] ?? step6Record["Data Readiness (1-5)"] ?? 3;
        const integrationComplexity = step6Record["Integration Complexity"] ?? step6Record["Integration Complexity (1-5)"] ?? 3;
        const changeMgmt = step6Record["Change Mgmt"] ?? step6Record["Change Mgmt (1-5)"] ?? 3;

        // Use the deterministic priority score function
        const priorityResult = calculatePriorityScore({
          totalAnnualValue: totalValue,
          timeToValueMonths: ttv,
          dataReadiness,
          integrationComplexity,
          changeMgmt,
        });

        const tier = getPriorityTier(priorityResult.value);
        const phase = getRecommendedPhase(priorityResult.value, ttv as number);

        const step7Entry: any = {
          ...record,
          "Value Score (0-40)": Math.round(priorityResult.financialScore * 0.4),
          "TTV Score (0-30)": Math.round(priorityResult.ttvScore * 0.3),
          "Effort Score (0-30)": Math.round(priorityResult.complexityScore * 0.3),
          "Priority Score (0-100)": priorityResult.value,
          "Priority Tier": tier,
          "Recommended Phase": phase,
        };
        // Preserve Strategic Theme if present
        if (record["Strategic Theme"]) {
          step7Entry["Strategic Theme"] = record["Strategic Theme"];
        }
        correctedStep7Data.push(step7Entry);
      } else {
        correctedStep7Data.push(record);
      }
    }

    step7.data = correctedStep7Data;
  }

  // ============================================
  // STEP 7: POST-PROCESSING - THREE-SCENARIO SUMMARY & NPV
  // ============================================
  const totalAnnualValue = totalCostBenefit + totalRevenueBenefit + totalCashFlowBenefit + totalRiskBenefit;

  // Generate three-scenario summary
  const scenarioSummary = generateThreeScenarioSummary({
    baseBenefitAtFullAdoption: totalAnnualValue,
    implementationCost: totalFrictionCost * 0.5, // Use 50% of friction cost as proxy for implementation cost
  });

  // Calculate multi-year projection (5-year NPV and payback)
  const multiYearProjection = calculateMultiYearProjection({
    annualBenefit: totalAnnualValue,
    implementationCost: totalFrictionCost * 0.5,
  });

  console.log(`[postProcessAnalysis] Three-Scenario Summary: ${scenarioSummary.headline}`);
  console.log(`[postProcessAnalysis] NPV (5-year): ${formatMoney(multiYearProjection.npv)}, Payback: ${multiYearProjection.paybackMonths} months`);

  // ============================================
  // Update executive dashboard with deterministic calculations
  // ============================================

  // Use the deterministic value per million tokens function
  const valuePerMillion = calculateValuePerMillionTokens({
    totalAnnualValue,
    totalMonthlyTokens,
  });

  // Get top 5 use cases by priority score
  const sortedUseCases = [...(step7?.data || [])].sort(
    (a: any, b: any) => (b["Priority Score (0-100)"] || 0) - (a["Priority Score (0-100)"] || 0)
  );

  const topUseCases = sortedUseCases.slice(0, 5).map((uc: any, index: number) => {
    const step5Record = correctedStep5Data.find(r => r.ID === uc.ID);
    return {
      rank: index + 1,
      useCase: uc["Use Case"],
      priorityScore: uc["Priority Score (0-100)"] || 0,
      monthlyTokens: (step6?.data as Step6Record[])?.find(r => r.ID === uc.ID)?.["Monthly Tokens"] || 0,
      annualValue: parseNumber(step5Record?.["Total Annual Value ($)"]),
    };
  });

  const correctedResult = {
    ...analysisResult,
    steps,
    validationWarnings,
    benefitsCapped,
    capScaleFactor,
    frictionRecovery: Array.from(frictionRecoveryMap.entries()).map(([friction, recoveries]) => ({
      frictionPoint: friction,
      recoveries,
    })),
    scenarioAnalysis: {
      conservative: {
        annualBenefit: formatMoney(scenarioSummary.conservative.totalBenefit),
        npv: formatMoney(scenarioSummary.conservative.npv),
        paybackMonths: scenarioSummary.conservative.paybackMonths,
      },
      moderate: {
        annualBenefit: formatMoney(scenarioSummary.moderate.totalBenefit),
        npv: formatMoney(scenarioSummary.moderate.npv),
        paybackMonths: scenarioSummary.moderate.paybackMonths,
      },
      aggressive: {
        annualBenefit: formatMoney(scenarioSummary.aggressive.totalBenefit),
        npv: formatMoney(scenarioSummary.aggressive.npv),
        paybackMonths: scenarioSummary.aggressive.paybackMonths,
      },
    },
    multiYearProjection: {
      npv: formatMoney(multiYearProjection.npv),
      paybackMonths: multiYearProjection.paybackMonths,
      irr: multiYearProjection.irr !== null ? `${(multiYearProjection.irr * 100).toFixed(1)}%` : 'N/A',
      totalBenefitOverPeriod: formatMoney(multiYearProjection.totalBenefitOverPeriod),
    },
    executiveDashboard: {
      totalRevenueBenefit,
      totalCostBenefit,
      totalCashFlowBenefit,
      totalRiskBenefit,
      totalAnnualValue,
      totalMonthlyTokens,
      valuePerMillionTokens: valuePerMillion.value,
      topUseCases,
    },
  };

  console.log(`[postProcessAnalysis] Dashboard totals: TotalValue=${formatMoney(totalAnnualValue)}, Cost=${formatMoney(totalCostBenefit)}, Revenue=${formatMoney(totalRevenueBenefit)}, CashFlow=${formatMoney(totalCashFlowBenefit)}, Risk=${formatMoney(totalRiskBenefit)}`);

  return correctedResult;
}
