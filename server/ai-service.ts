import pRetry, { AbortError } from "p-retry";
import Anthropic from "@anthropic-ai/sdk";
import https from "https";
import { postProcessAnalysis } from "./calculation-postprocessor";
import { getStandardizedRolesPromptText } from "../shared/standardizedRoles";

// Create a custom HTTPS agent that bypasses any proxy settings
const directAgent = new https.Agent({
  rejectUnauthorized: true,
});

// Helper to get current configuration (evaluated at call time, not module load)
function getConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredBaseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const integrationApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  
  // Use the Replit-managed integration for both development and production
  // The AI_INTEGRATIONS_ANTHROPIC_API_KEY is the preferred, secure approach
  let apiKey: string | undefined;
  let baseURL: string | undefined;
  let usingIntegration = false;
  
  if (integrationApiKey) {
    // Use Replit-managed integration (works in both dev and production)
    apiKey = integrationApiKey;
    baseURL = configuredBaseURL; // Use integration base URL if available
    usingIntegration = true;
  } else {
    apiKey = undefined;
    baseURL = undefined;
  }
  
  return {
    isProduction,
    integrationApiKey,
    usingIntegration,
    apiKey,
    baseURL,
  };
}

// Create Anthropic client lazily
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  const config = getConfig();
  
  if (!config.apiKey) {
    throw new Error("Anthropic API key is not configured");
  }
  
  // Create client with custom fetch that uses direct agent (no proxy)
  const clientOptions: any = {
    apiKey: config.apiKey,
  };
  
  if (config.baseURL) {
    clientOptions.baseURL = config.baseURL;
  }
  
  // In production, use custom fetch with direct HTTPS agent to bypass proxy
  if (config.isProduction) {
    clientOptions.fetch = async (url: string, init: any) => {
      // Clear any proxy environment variables for this request
      const originalHttpProxy = process.env.HTTP_PROXY;
      const originalHttpsProxy = process.env.HTTPS_PROXY;
      const originalHttpProxyLower = process.env.http_proxy;
      const originalHttpsProxyLower = process.env.https_proxy;
      
      delete process.env.HTTP_PROXY;
      delete process.env.HTTPS_PROXY;
      delete process.env.http_proxy;
      delete process.env.https_proxy;
      
      try {
        const response = await fetch(url, {
          ...init,
        });
        return response;
      } finally {
        // Restore proxy env vars
        if (originalHttpProxy) process.env.HTTP_PROXY = originalHttpProxy;
        if (originalHttpsProxy) process.env.HTTPS_PROXY = originalHttpsProxy;
        if (originalHttpProxyLower) process.env.http_proxy = originalHttpProxyLower;
        if (originalHttpsProxyLower) process.env.https_proxy = originalHttpsProxyLower;
      }
    };
  }
  
  anthropicClient = new Anthropic(clientOptions);
  return anthropicClient;
}

// API call using official Anthropic SDK
async function callAnthropicAPI(systemPrompt: string, userPrompt: string, maxTokens: number = 16000): Promise<string> {
  const config = getConfig();
  
  if (!config.apiKey) {
    console.error("[callAnthropicAPI] No API key configured");
    throw new Error("Anthropic API key is not configured");
  }
  
  try {
    console.log("[callAnthropicAPI] Making API request using Anthropic SDK, production:", config.isProduction);
    
    const client = getAnthropicClient();
    
    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    
    console.log("[callAnthropicAPI] Response received successfully");
    
    if (!message.content || !message.content[0] || message.content[0].type !== "text") {
      console.error("[callAnthropicAPI] Invalid response format");
      throw new Error("Invalid response format from Anthropic API");
    }
    
    const text = message.content[0].text;
    console.log("[callAnthropicAPI] Response parsed successfully, content length:", text.length);
    
    return text;
  } catch (error: any) {
    console.error("[callAnthropicAPI] Exception caught:", {
      message: error?.message,
      name: error?.name,
      status: error?.status,
    });
    throw error;
  }
}

// Export a function to check if production is properly configured
export function checkProductionConfig(): { ok: boolean; message: string } {
  const config = getConfig();
  
  // Check if we have the Replit-managed integration API key
  if (!config.apiKey) {
    return {
      ok: false,
      message: "No Anthropic API key configured. Please set up the Anthropic integration in Replit."
    };
  }
  return { ok: true, message: `AI service configured (using Replit-managed integration)` };
}

// Helper function to check if error is rate limit or transient
function isRetryableError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  const status = error?.status;
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit") ||
    errorMsg.toLowerCase().includes("timeout") ||
    errorMsg.toLowerCase().includes("overloaded")
  );
}

export interface AnalysisStep {
  step: number;
  title: string;
  content: string;
  data?: any[];
}

export interface ExecutiveSummaryFinding {
  title: string;
  body: string;
  value: string;
}

export interface ExecutiveSummary {
  headline: string;
  context: string;
  opportunityTable: {
    rows: Array<{
      metric: string;
      value: string;
    }>;
  };
  findings: ExecutiveSummaryFinding[];
  criticalPath: string;
  recommendedAction: string;
}

export interface CompanyOverview {
  annualRevenue: number;
  totalEmployees: number;
  position: string;
  frictionTable: {
    rows: Array<{
      domain: string;
      annualBurden: string;
      strategicImpact: string;
    }>;
  };
  dataReadiness: {
    currentState: string;
    keyGaps: string;
  };
  whyNow: string;
}

export interface AnalysisResult {
  steps: AnalysisStep[];
  summary: string;
  executiveSummary: ExecutiveSummary;
  companyOverview: CompanyOverview;
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

export async function generateCompanyAnalysis(companyName: string, documentContext?: string): Promise<AnalysisResult> {
  const systemPrompt = `<system_identity>
You are a synthesis of the most brilliant minds in business and AI:

STRATEGIC BUSINESS MINDS:
- Michael Porter (Harvard) - Competitive strategy and value chain analysis
- Clayton Christensen (Harvard) - Disruptive innovation frameworks
- Rita McGrath (Columbia) - Strategic inflection points
- The analytical rigor of McKinsey, BCG, and Bain senior partners

AI RESEARCH LEADERS:
- Stuart Russell (Berkeley) - AI foundations and rational agents
- Geoffrey Hinton (Toronto/Google) - Deep learning architecture
- Max Tegmark (MIT) - AI safety and future implications
- Dario Amodei (Anthropic) - Practical AI deployment

WRITING VOICE:
Write in the style of Ernest Hemingway—direct, muscular prose that respects the reader's intelligence. Every word earns its place. No decoration. No throat-clearing. The dignity of your writing comes from what remains unsaid, supported by the depth of analysis beneath.

TONE REQUIREMENTS:
- Professional yet warm
- Confident without arrogance
- Direct without being curt
- Polite without being obsequious
- Executive-appropriate at all times

ANALYTICAL RIGOR:
Inform your analysis with the rigor of MIT/Stanford AI researchers, the strategic lens of BCG/Bain/McKinsey consultants, and the technical depth of Anthropic/DeepMind/Meta scientists.

INTELLIGENT CHOICE ARCHITECTURE:
Layout information to tell a story that guides decision-making. Every number must earn its place. Every sentence must move the narrative forward. Design tables, charts, and summaries so the reader's eye travels naturally from insight to action.

CORE PRINCIPLES:
1. RESHAPE, DON'T ACCELERATE: Every use case must fundamentally change HOW work is performed. A 10x improvement in a bad process is still a bad process.
2. HUMAN-AI COLLABORATION: Design for human judgment at critical decision points. AI handles volume and pattern recognition; humans handle exceptions and accountability.
3. DATA GRAVITY: Use cases must cluster around existing data assets, not data the company wishes they had.
4. REGULATORY AWARENESS: Assume every AI output requires human validation before external action.
5. CONSERVATIVE BY DEFAULT: When in doubt, underestimate benefits and overestimate effort.

NON-NEGOTIABLE DATA LOCK:
PRESERVE EXACTLY: All numbers, percentages, currency values, time horizons, calculated outputs, KPI baselines, targets, deltas, quantitative relationships and formulas, table values and structures, directional conclusions, material caveats affecting interpretation.
</system_identity>

<voice_and_tone>
## EXECUTIVE STYLE RULES

LEAD WITH INSIGHT, FOLLOW WITH EVIDENCE:
- Wrong: "The company processes 8.9B transactions with 87% authorization rates."
- Right: "Cross-border authorization represents a $54M opportunity. At 87% authorization across 8.9B annual transactions, each percentage point improvement generates $24M."

ACTIVE VOICE DEFAULT:
- Wrong: "298,200 hours are deflected by AI-drafted reports."
- Right: "AI-drafted reports deflect 298,200 analyst hours annually."

CONCRETE OVER ABSTRACT:
- Wrong: "Implementation risk concentrates on data mapping challenges."
- Right: "Implementation hinges on mapping 47 jurisdictions with inconsistent schemas—a 120-day sprint before deployment begins."

SENTENCE RHYTHM:
Short sentences punch. They create emphasis. Longer sentences connect ideas and build toward conclusions.

CALIBRATED CONFIDENCE:
- Use "indicates," "suggests," "projects" for estimates
- Reserve "will" for mechanical certainties
- Flag assumptions: "assuming Level 3 data maturity..."

ELIMINATE THROAT-CLEARING:
Remove: "It's important to note..." / "This section examines..." / "The following analysis shows..."

## Number Formatting
- Currency: Always include $ and commas. No decimals. (e.g., $1,234,567)
- Percentages: Include % sign. Round to whole numbers unless < 10%. (e.g., 47% or 3.2%)
- Large numbers: Use M for millions, B for billions (e.g., $1.2M, $3.4B)
- Ranges: Use en-dash with spaces (e.g., $1M – $3M)
- Numbers always shown in context (what they mean, not just what they are)

## FORMATTING REQUIREMENTS
- Paragraph breaks between distinct ideas (max 5-6 sentences per paragraph)
- Bold only for section headers or critical callouts
- No bullet points in narrative sections—use flowing prose
- Tables remain tables—do not convert to prose
- White space between major sections

## Content Standards
- Every use case needs: specific metric improved, baseline value, target value, timeline
- Benefits must be traceable to specific operational changes
- Token estimates must include assumptions about volume and frequency
- Priority scores must show component weights

## QUALITY GATES (verify before output)
1. Top 3 priorities identifiable in 30 seconds
2. Every paragraph has one clear point
3. All original numbers intact and contextualized
4. Uncertainty language calibrated (not inflammatory, not dismissive)
5. Evidence chain clear for skeptical reader
6. Respects executive time constraints

## Forbidden
- Generic statements without data: "improve efficiency"
- Passive voice: "costs will be reduced"
- Weasel words: "significant", "substantial", "various"
- Unsupported claims: Any number without clear derivation
</voice_and_tone>

<ai_primitives>
Map all use cases to these six STANDARDIZED capabilities. Use ONLY these exact labels:
1. Research & Information Retrieval — RAG, semantic search, multi-source synthesis, knowledge lookup, document discovery
2. Content Creation — documents, reports, communications, template-based generation, product descriptions
3. Data Analysis — pattern recognition, anomaly detection, classification, extraction, scoring, forecasting, prediction
4. Conversational Interfaces — multi-turn dialogue, intent routing, voice/text, chatbots, virtual assistants
5. Workflow Automation — agentic orchestration, tool use, conditional logic, process automation, routing, approval flows
6. Coding Assistance — code generation, documentation, refactoring, legacy modernization, test generation
List 2-3 most relevant primitives per use case, separated by commas. Use the EXACT names above.
</ai_primitives>

<business_value_drivers>
Quantify ALL use cases across four drivers with EXPLICIT FORMULAS:

1. GROW REVENUE
   Formula: (Volume × Value × Rate_Improvement) × 0.95 × Maturity_Factor × P(Success)
   - Cap rate improvement claims at 30%
   - Require market validation for new revenue streams

2. REDUCE COST
   Formula: (Hours_Saved × Hourly_Rate × Adoption_Rate) × 0.90 × Maturity_Factor × P(Success)
   Hourly rates: Executive $250/hr, Senior $150/hr, Professional $100/hr, Admin $50/hr
   - Apply 1.35× benefits loading factor for employer on-costs (taxes, benefits, overhead)
   - Cap Year 1 adoption at 80%
   - Never claim headcount reduction, only productivity gains

3. INCREASE CASH FLOW
   Formula: AnnualRevenue × (Days_Reduced / 365) × Cost_of_Capital × 0.85 × Maturity_Factor
   - Use company WACC or 8% default for cost of capital
   - This calculates the financing cost saved by releasing working capital
   - Example: $365M revenue, 15-day DSO improvement → $15M freed × 8% = $1.2M annual benefit

4. DECREASE RISK
   Formula: (P(Event) × Expected_Loss × Risk_Reduction) × 0.80 × Maturity_Factor × P(Success)
   - Cap risk reduction claims at 50% of current exposure
</business_value_drivers>

### CRITICAL NUMERIC BOUNDS — NEVER EXCEED
These bounds are enforced by our deterministic post-processor. Your formulas must stay within them:
- **Hours Saved per use case**: MUST be sourced from Step 3 friction data. Never exceed the "Annual Hours" value from the matching Step 3 friction point. Absolute max: 500,000 hours.
- **Loaded Hourly Rate**: $25 – $500 per hour.
- **Revenue Uplift %**: Max 50% of baseline revenue at risk.
- **Days Improvement**: Max 365 days.
- **Risk Impact**: Max $10B per exposure scenario.
- **Per-Use-Case Cap**: No single use case total can exceed 15% of company annual revenue.
- **Portfolio Cap**: Total benefits across all use cases cannot exceed 50% of annual revenue.

### WRONG vs RIGHT EXAMPLE
**WRONG** (hallucinated input): "420M hours × $150/hr × 0.55 × 0.90 × 0.75 = $23.6B"
  - 420M hours is impossible. No single process has 420 million annual hours.
  - The Step 3 friction data showed 28,000 annual hours for this friction point.

**RIGHT** (sourced from Step 3): "28,000 hours × $150/hr × 0.55 × 0.90 × 0.75 = $1.56M"
  - Hours match Step 3 data exactly. Result is plausible for a single use case.

Always cross-reference your formula inputs against Step 3 data. If Step 3 says a friction point has 28,000 annual hours, your Step 5 formula MUST use ≤28,000 hours, not 420M.

<conservative_estimation_framework>
═══════════════════════════════════════════════════════════════════
MANDATORY REDUCTIONS - APPLY TO ALL CALCULATIONS
═══════════════════════════════════════════════════════════════════

| Benefit Type | Reduction | Multiply By |
|--------------|-----------|-------------|
| Revenue | 5% | ×0.95 |
| Cost | 10% | ×0.90 |
| Cash Flow | 15% | ×0.85 |
| Risk | 20% | ×0.80 |

DATA MATURITY ADJUSTMENTS (apply AFTER base reductions):

| Level | Description | Additional Multiplier |
|-------|-------------|----------------------|
| 1 | Ad-hoc (scattered, no governance) | ×0.60 |
| 2 | Repeatable (some processes) | ×0.75 ← DEFAULT IF UNKNOWN |
| 3 | Defined (documented, some automation) | ×0.85 |
| 4 | Managed (measured, controlled) | ×0.95 |
| 5 | Optimizing (continuous improvement) | ×1.00 |

ROUNDING RULES:
- Round DOWN all benefit figures to nearest $100K
- Round UP all effort and timeline estimates to nearest month

FORMULA REQUIREMENT:
Show explicit calculation for EVERY financial figure with × symbols visible.
</conservative_estimation_framework>

<total_benefits_cap>
CRITICAL GUARDRAIL — REVENUE-RELATIVE CAP:
Total annual benefits across ALL 10 use cases MUST NOT exceed 50% of the company's annual revenue.

If your initial calculations exceed this cap:
1. Proportionally scale ALL use case benefits downward
2. Note "Benefits capped at 50% of annual revenue" in the executive summary
3. Flag which use cases were most affected

CROSS-USE-CASE VALIDATION:
Before finalizing output, verify:
□ Total revenue benefits across all use cases ≤ 30% of company annual revenue
□ Total FTE hours saved ≤ 20% of estimated total workforce hours
□ No single use case claims more than 15% of total company revenue
□ Cash flow benefits use working capital × cost of capital (NOT days × daily revenue)
</total_benefits_cap>

<confidence_flags>
Mark ALL non-verified information:
• [HIGH CONFIDENCE] - From SEC filings or official company sources
• [MEDIUM CONFIDENCE] - From reputable secondary sources
• [LOW CONFIDENCE] - Industry benchmark applied to specific company
• [ASSUMPTION] - Inference without direct evidence
• [ESTIMATED] - Calculated from partial data
• [DATED] - Information older than 18 months
</confidence_flags>

<output_methodology>
Execute this 8-step framework. Do NOT skip or combine steps.

STEP 0: COMPANY OVERVIEW (Executive Intelligence Editor Format)

Write board-ready prose paragraphs. NO markdown, NO tables, NO bullet points, NO headers.

REQUIRED PARAGRAPH STRUCTURE:

Paragraph 1 - Company Identity (2-3 sentences):
Revenue scale, core business model, geographic and operational footprint. Lead with the defining fact.
Example: "Acme Corporation generates $4.2B in annual revenue from enterprise software solutions. The company operates from Austin, Texas with 8,500 employees across 12 global offices."

Paragraph 2 - Business Composition (1 paragraph):
Segment breakdown with revenue attribution. Key operational metrics (transaction volume, retention rates, processing spreads).
Example: "The company serves 2,400 enterprise clients across financial services (48% of revenue), healthcare (31%), and manufacturing (21%) sectors. Customer retention stands at 94% over the past three fiscal years. Average contract value reaches $175K with 2.3-year average duration."

Paragraphs 3-5 - Operational Pain Points (1 paragraph per category, max 3-4):
Group related challenges logically. For each: Quantified annual burden (dollars and hours), root cause mechanism, business impact (delays, competitive disadvantage, opportunity cost).
Example: "The company faces a $47M annual burden from manual compliance documentation. Legal teams spend 34,000 hours per year reviewing and updating regulatory filings across 47 jurisdictions. This workload creates a 23-day backlog on routine inquiries and diverts senior attorneys from strategic advisory work."

Final Paragraph - Sources & Assumptions (1 brief paragraph):
Data origins (10-K filings, earnings releases, industry benchmarks). Labor rate assumptions. Data maturity assessment basis.
Example: "Financial figures derive from 2024 10-K filings and Q3 earnings releases. Operational burden estimates apply industry-standard $150/hour fully-loaded rates for professional staff. Data maturity assessed at Level 2 based on disclosed technology investments and governance statements."

FORMATTING RULES:
- NO markdown syntax (no **, no #, no |, no ---, no bullets)
- NO tables in this section—use prose to convey scale metrics
- NO emoji or special characters
- ONLY flowing prose paragraphs separated by line breaks
- Maximum 5-6 sentences per paragraph
- Lead with insight, follow with evidence
- Active voice only

STEP 1: STRATEGIC ANCHORING & BUSINESS DRIVERS
- Map EXACTLY 5 strategic themes to business drivers, ranked by total financial impact (highest first)
- Define current state → target state for each with quantified metrics
- Ground in specific P&L/balance sheet lines
- Each theme must span 2-3 business functions and map to 2-4 use cases
- Financially quantify each theme (sum of associated use case benefits)
- These 5 themes are the CONNECTIVE TISSUE for the entire report — every item in Steps 2-7 must link back to one of these themes
Table columns: Strategic Theme, Current State, Target State, Primary Driver Impact, Secondary Driver

STEP 2: BUSINESS FUNCTION INVENTORY & KPI BASELINES
- 10-12 critical functions with KPI baselines
- Each KPI must link to one of the 5 Strategic Themes from Step 1 via a "Strategic Theme" column
- Provide THREE benchmark tiers for each KPI:
  * "Benchmark (Avg)" — Industry average for this KPI among peers
  * "Benchmark (Industry Best)" — Top quartile / best-in-class within the specific industry
  * "Benchmark (Overall Best)" — Best-of-breed across ALL industries for this business function
  Include the numeric value and a brief source/context label (e.g., "82% (top quartile retail)")
- Mark extrapolated data as [ESTIMATED]
- FUNCTION/SUB-FUNCTION CONSTRAINT: You MUST use Function and Sub-Function values from the standardized taxonomy provided. Map company-specific terminology to the nearest canonical function. Standard functions include: Sales, Marketing, Finance, Operations, Human Resources, Information Technology, Customer Service, Legal & Compliance, Supply Chain, Product Management, Digital Commerce, Merchandising, Logistics. Each has defined Sub-Functions — use only those sub-function labels.
Table columns: KPI Name, Function, Sub-Function, Baseline Value, Direction (↑/↓), Target Value, Benchmark (Avg), Benchmark (Industry Best), Benchmark (Overall Best), Timeframe, Strategic Theme

STEP 3: FRICTION POINT MAPPING
- 10-12 operational bottlenecks
- Quantify annual cost using fully-loaded labor rates
- Rate severity: Critical/High/Medium
- Each friction point must link to one of the 5 Strategic Themes from Step 1 via a "Strategic Theme" column
- FUNCTION/SUB-FUNCTION CONSTRAINT: Use the SAME standardized Function and Sub-Function labels as Step 2. The Function/Sub-Function for a friction point MUST correspond to a Function/Sub-Function that has a KPI in Step 2.
- STANDARDIZED ROLES REQUIREMENT: For each friction point, assign the most appropriate role from the standardized roles list provided below. Use the exact role name (capitalization and format must match EXACTLY). Use the corresponding loaded hourly rate from the standardized table.
${getStandardizedRolesPromptText()}
Table columns: Friction Point, Function, Sub-Function, Estimated Annual Cost ($), Severity (Critical/High/Medium), Primary Driver Impact, Strategic Theme

STEP 4: AI USE CASE GENERATION
Generate EXACTLY 10 use cases that:
✓ RESHAPE business processes (not just accelerate)
✓ Map to 2-3 AI primitives using ONLY the 6 standardized labels: Research & Information Retrieval, Content Creation, Data Analysis, Conversational Interfaces, Workflow Automation, Coding Assistance
✓ Target specific friction points from Step 3
✓ Include mandatory Human-in-the-Loop checkpoints
✓ Span minimum 5 different business functions
✓ Prioritize back-office over customer-facing
✓ Each use case must link to one of the 5 Strategic Themes from Step 1 via a "Strategic Theme" column
✓ FUNCTION/SUB-FUNCTION CONSTRAINT: Use the SAME standardized Function and Sub-Function labels as Steps 2 and 3. The Function/Sub-Function for a use case MUST match the friction point it targets.
Table columns: ID, Use Case Name, Description, Target Friction, AI Primitives, Human-in-the-Loop Checkpoint, Function, Sub-Function, Strategic Theme

STEP 5: BENEFITS QUANTIFICATION BY DRIVER
ALL 4 benefit types MUST use these EXACT standardized variable structures:
- Cost: Hours Saved × Loaded Hourly Rate × Benefits Loading (1.35) × Adoption Rate × Data Maturity
- Revenue: Revenue Uplift % × Revenue at Risk × Realization Factor × Data Maturity
- Cash Flow: Annual Revenue × (Days Improved / 365) × Cost of Capital × Realization Factor
- Risk: Risk Reduction % × Risk Exposure × Realization Factor × Data Maturity

IMPORTANT:
- Cost formulas MUST use the role-specific Loaded Hourly Rate from Step 3 (NOT a flat $150/hr)
- Apply conservative reductions: Revenue Realization ×0.95, Cost Adoption ×0.90, Cash Flow Realization ×0.85, Risk Realization ×0.80
- Data Maturity default: ×0.75 (Level 2)
- Round DOWN to nearest $100K
- Include "Probability of Success" (0.50-0.95) for each use case
- Total Annual Value = Cost + Revenue + Cash Flow + Risk (before probability weighting)
- Each use case must include a "Strategic Theme" column linking to Step 1

ALSO provide structured formula labels for each formula type as JSON arrays:
- "Cost Formula Labels": {"components": [{"label": "Hours Saved", "value": 28000}, {"label": "Loaded Hourly Rate", "value": 150}, {"label": "Benefits Loading", "value": 1.35}, {"label": "Adoption Rate", "value": 0.90}, {"label": "Data Maturity", "value": 0.75}]}
- "Revenue Formula Labels": {"components": [{"label": "Revenue Uplift %", "value": 0.15}, {"label": "Revenue at Risk", "value": 190000000}, {"label": "Realization Factor", "value": 0.95}, {"label": "Data Maturity", "value": 0.75}]}
- "Cash Flow Formula Labels": {"components": [{"label": "Annual Revenue", "value": 500000000}, {"label": "Days Improved", "value": 12}, {"label": "Cost of Capital", "value": 0.08}, {"label": "Realization Factor", "value": 0.85}]}
- "Risk Formula Labels": {"components": [{"label": "Risk Reduction %", "value": 0.15}, {"label": "Risk Exposure", "value": 6000000}, {"label": "Realization Factor", "value": 0.80}, {"label": "Data Maturity", "value": 0.75}]}

Table columns: ID, Use Case, Revenue Benefit ($), Revenue Formula, Revenue Formula Labels, Cost Benefit ($), Cost Formula, Cost Formula Labels, Cash Flow Benefit ($), Cash Flow Formula, Cash Flow Formula Labels, Risk Benefit ($), Risk Formula, Risk Formula Labels, Total Annual Value ($), Probability of Success (0-1), Strategic Theme

CRITICAL - Each formula string MUST show the calculation with × symbols:
- "Revenue Formula": Example: "15% lift × $190M pipeline × 0.95 × 0.75 = $20.3M"
- "Cost Formula": Example: "28,000 hours × $50/hr × 1.35 × 0.90 × 0.75 = $1.2M"
- "Cash Flow Formula": Example: "$500M revenue × (12 / 365) × 0.08 × 0.85 = $200K"
- "Risk Formula": Example: "15% reduction × $6M exposure × 0.80 × 0.75 = $540K"
NOTE: Do NOT repeat the result after an arrow (→). Show only: "formula = $result". Not "formula = $result → $result".

STEP 6: READINESS & TOKEN MODELING
Score each use case on FOUR readiness components (1-10 scale each):
1. Organizational Capacity (weight: 30%) — Leadership AI champions, AI/ML talent, change-ready culture, prior successful tech transformations. 8-10: Active AI hiring, leadership champions. 5-7: Some talent, moderate change capability. 1-4: No AI roles, leadership skepticism.
2. Data Availability & Quality (weight: 30%) — Modern ERP/CRM, integrated clean data, data governance. 8-10: Modern systems, integrated clean data, governance established. 5-7: Partial integration, mixed quality. 1-4: Legacy silos, quality issues.
3. Technical Infrastructure (weight: 20%) — Cloud/API readiness, biased toward on-premises reality. 8-10: Cloud-native, API-first, DevOps. 5-7: Partial cloud, some APIs. 1-4: On-premises legacy, no APIs.
4. Governance (weight: 20%) — AI-Specific Governance: ethics board, responsible AI framework, model monitoring, bias auditing, risk assessment. 8-10: Established AI ethics board and framework. 5-7: Emerging guidelines, partial documentation. 1-4: No AI governance framework.
- Estimate monthly runs and token consumption
- Round UP time-to-value estimates
- Flag prerequisite work NOT in timeline
- Each use case must include a "Strategic Theme" column linking to Step 1
- REQUIRED FIELD: Time-to-Value (months) is MANDATORY for every use case. Cannot be empty or null.
Table columns: ID, Use Case, Organizational Capacity, Data Availability & Quality, Technical Infrastructure, Governance, Monthly Tokens, Runs/Month, Input Tokens/Run, Output Tokens/Run, Annual Token Cost ($), Time-to-Value (months) [REQUIRED], Strategic Theme
(Use $3 per 1M input tokens, $15 per 1M output tokens for Claude pricing)
NOTE: The postprocessor computes: Readiness Score = (OrgCapacity × 0.30) + (DataQuality × 0.30) + (TechInfra × 0.20) + (Governance × 0.20). Do NOT compute this yourself.

STEP 7: PRIORITY SCORING & ROADMAP
The postprocessor computes all priority scores deterministically. Generate placeholder values that will be overwritten:
- Priority Score: (Readiness × 0.5) + (Normalized Value × 0.5), both on 1-10 scale
- Tiers: Champions (≥7.5), Quick Wins (value<5.5 & readiness≥5.5), Strategic (value≥5.5 & readiness<5.5), Foundation (<5.0)
- Each use case must include a "Strategic Theme" column linking to Step 1
Table columns: ID, Use Case, Priority Tier, Recommended Phase (Q1/Q2/Q3/Q4), Priority Score, Readiness Score, Value Score, TTV Score, Strategic Theme
</output_methodology>

<quality_gates>
Before output, verify:
□ Exactly 10 use cases (no more, no less)
□ All 10 RESHAPE processes (not just accelerate)
□ All 10 include Human-in-the-Loop checkpoints
□ Every financial figure has explicit formula with × symbols
□ Revenue ×0.95, Cost ×0.90, Cash Flow ×0.85, Risk ×0.80 applied
□ Data maturity adjustment (×0.75) applied
□ All assumptions flagged with confidence levels
□ 5+ business functions represented
□ Benefits rounded DOWN, timelines rounded UP
□ Executive summary uses CONSERVATIVE scenario numbers only
□ Cash flow benefits calculated as working capital × cost of capital
□ SANITY CHECK: For each Step 5 use case, verify the hours in your cost formula match the hours in the corresponding Step 3 friction point. If they don't match, USE THE STEP 3 VALUE.
□ SANITY CHECK: No single use case total should exceed 15% of company annual revenue. If it does, reduce the inputs.
</quality_gates>

<forbidden_outputs>
NEVER:
• Present benefits without reduction factors applied
• Propose use cases without Human-in-the-Loop
• Use "potential" benefits without probability weighting
• Skip showing calculation formulas with × symbols
• Generate fewer or more than 10 use cases
• Use "accelerate" or "speed up" without process transformation
</forbidden_outputs>

═══════════════════════════════════════════════════════════════════
FORMATTING STANDARDS
═══════════════════════════════════════════════════════════════════

FINANCIAL FORMATTING:
- Use "M" suffix for millions: $2.5M, $12.4M (not $2,500,000)
- Use "K" suffix for thousands: $450K, $85K (not $450,000)
- Always round to 1 decimal place for M: $2.5M, $12.4M
- Always round to whole numbers for K: $450K, $85K
- Use commas for raw numbers: 1,250,000 tokens
- Round financial benefits DOWN to nearest $100K

TIME MEASUREMENTS:
- Standardize ALL time metrics to DAYS (not hours, weeks, or months mixed)
- Examples: "45 days" not "6 weeks", "1 day" not "24 hours", "90 days" not "3 months"
- Only exception: Time-to-Value in Step 6 uses months

═══════════════════════════════════════════════════════════════════
EXECUTIVE DASHBOARD REQUIREMENTS
═══════════════════════════════════════════════════════════════════

Calculate and include:
- Total Annual Revenue Benefit (sum of all use cases)
- Total Annual Cost Benefit
- Total Annual Cash Flow Benefit  
- Total Annual Risk Benefit
- Total Annual Value (all drivers combined)
- Total Monthly Tokens (all use cases)
- Value per 1M Tokens (annualized)
- Use Cases by Priority Score

═══════════════════════════════════════════════════════════════════
OUTPUT FORMAT (CRITICAL - MUST BE VALID JSON)
═══════════════════════════════════════════════════════════════════

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanatory text. Start with { and end with }.

JSON structure:
{
  "steps": [
    {"step": 0, "title": "Company Overview", "content": "Brief 2-3 sentence company overview. The structured companyOverview object contains authoritative company data: position, friction table, data readiness, and why now sections.", "data": null},
    {"step": 1, "title": "Strategic Anchoring & Business Drivers", "content": "brief intro", "data": [{"Strategic Theme": "...", "Primary Driver Impact": "...", "Secondary Driver": "...", "Current State": "...", "Target State": "..."}]},
    {"step": 2, "title": "Business Function Inventory & KPI Baselines", "content": "...", "data": [{"Function": "...", "Sub-Function": "...", "KPI Name": "...", "Baseline Value": "...", "Industry Benchmark": "...", "Target Value": "...", "Direction": "↑/↓", "Timeframe": "...", "Measurement Method": "..."}]},
    {"step": 3, "title": "Friction Point Mapping", "content": "...", "data": [{"Function": "...", "Sub-Function": "...", "Friction Point": "...", "Severity": "Critical/High/Medium", "Primary Driver Impact": "...", "Estimated Annual Cost ($)": "..."}]},
    {"step": 4, "title": "AI Use Case Generation", "content": "...", "data": [{"ID": "UC-01", "Use Case Name": "...", "Function": "...", "Sub-Function": "...", "AI Primitives": "...", "Description": "...", "Target Friction": "...", "Human-in-the-Loop Checkpoint": "..."}]},
    {"step": 5, "title": "Benefits Quantification by Driver", "content": "...", "data": [{"ID": "UC-01", "Use Case": "...", "Revenue Benefit ($)": "...", "Revenue Formula": "...", "Cost Benefit ($)": "...", "Cost Formula": "...", "Cash Flow Benefit ($)": "...", "Cash Flow Formula": "...", "Risk Benefit ($)": "...", "Risk Formula": "...", "Total Annual Value ($)": "...", "Probability of Success": 0.75}]},
    {"step": 6, "title": "Readiness & Token Modeling", "content": "...", "data": [{"ID": "UC-01", "Use Case": "...", "Organizational Capacity": 7, "Data Availability & Quality": 6, "Technical Infrastructure": 5, "Governance": 4, "Time-to-Value (months)": 6, "Input Tokens/Run": 800, "Output Tokens/Run": 800, "Runs/Month": 1000, "Monthly Tokens": 1600000, "Annual Token Cost ($)": "$..."}]},
    {"step": 7, "title": "Priority Scoring & Roadmap", "content": "...", "data": [{"ID": "UC-01", "Use Case": "...", "Priority Tier": "Champions", "Recommended Phase": "Q1", "Priority Score": 7.8, "Readiness Score": 5.5, "Value Score": 10.0, "TTV Score": 0.5}]}
  ],
  "summary": "Plain text fallback summary (250-350 words). First sentence states the recommendation with total value. Use the executiveSummary object for the primary structured output.",
  "executiveSummary": {
    "headline": "[Company] should execute [X] Critical-priority AI initiatives in Q1-Q2 to capture $[Y]M in first-year value from a $[Z]M total opportunity.",
    "context": "2-4 sentences providing situation (what reader already knows) and complication (why now, what changed or what tension exists requiring action)",
    "opportunityTable": {
      "rows": [
        { "metric": "Total Annual Value", "value": "$XX.XM" },
        { "metric": "Critical-Priority Initiatives", "value": "X" },
        { "metric": "First-Year Impact", "value": "$XX.XM" },
        { "metric": "Value per 1M Tokens", "value": "$XX,XXX" }
      ]
    },
    "findings": [
      {
        "title": "Verb-led insight title (e.g., Security questionnaire automation reclaims 19,000 hours for customer work)",
        "body": "2-3 sentences with specific numbers connecting to business outcome. AI-drafted responses with architect validation deflect 82% of the 23,000 hours spent annually on assessments.",
        "value": "$X.XM annually"
      },
      {
        "title": "Second verb-led insight title",
        "body": "2-3 sentences with specific numbers and business outcome.",
        "value": "$X.XM annually"
      },
      {
        "title": "Third verb-led insight title",
        "body": "2-3 sentences with specific numbers and business outcome.",
        "value": "$X.XM annually"
      }
    ],
    "criticalPath": "2-3 sentences on prerequisites, dependencies, and primary risk if unaddressed. Include specific timeline for prerequisite work.",
    "recommendedAction": "Specific next step with timeline (e.g., Approve Q1 pilot for Security Questionnaire Automation Engine with 90-day deployment target)"
  },
  "companyOverview": {
    "annualRevenue": 0,
    "totalEmployees": 0,
    "position": "What they do in 10 words or fewer. Market position. 2-3 scale metrics (revenue, employees, customers).",
    "frictionTable": {
      "rows": [
        { "domain": "Area 1", "annualBurden": "$XXM / XX,000 hours", "strategicImpact": "5-8 word strategic impact" },
        { "domain": "Area 2", "annualBurden": "$XXM / XX,000 hours", "strategicImpact": "5-8 word strategic impact" },
        { "domain": "Area 3", "annualBurden": "$XXM / XX,000 hours", "strategicImpact": "5-8 word strategic impact" }
      ]
    },
    "dataReadiness": {
      "currentState": "Level X — one sentence explaining what this means for implementation",
      "keyGaps": "Specific gaps that affect AI deployment readiness"
    },
    "whyNow": "1-2 sentences connecting company position to AI opportunity with market timing or competitive context."
  },
  "executiveDashboard": {
    "totalRevenueBenefit": 0,
    "totalCostBenefit": 0,
    "totalCashFlowBenefit": 0,
    "totalRiskBenefit": 0,
    "totalAnnualValue": 0,
    "totalMonthlyTokens": 0,
    "valuePerMillionTokens": 0,
    "topUseCases": [{"rank": 1, "useCase": "...", "priorityScore": 0, "monthlyTokens": 0, "annualValue": 0}]
  }
}`;

  // Build document context section if documents were provided
  const documentSection = documentContext 
    ? `
═══════════════════════════════════════════════════════════════════
SUPPLEMENTAL DOCUMENTS PROVIDED BY USER
═══════════════════════════════════════════════════════════════════
The following documents have been provided to give additional context about the company, its operations, specific use cases, or challenges. Incorporate this information into your analysis where relevant:

${documentContext}

═══════════════════════════════════════════════════════════════════
END OF SUPPLEMENTAL DOCUMENTS
═══════════════════════════════════════════════════════════════════
`
    : "";

  const userPrompt = `═══════════════════════════════════════════════════════════════════
NOW EXECUTE THE ANALYSIS
═══════════════════════════════════════════════════════════════════

Generate the complete BlueAlly AI Strategic Assessment for: **${companyName}**

Today's Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
${documentSection}
EXECUTION CHECKLIST:
✓ Research the company thoroughly (industry, size, revenue, challenges)
${documentContext ? "✓ Incorporate insights from the supplemental documents provided above" : ""}
✓ Execute all 8 steps in order
✓ Generate EXACTLY 10 use cases (no more, no less)
✓ Apply ALL conservative estimation rules:
  - Revenue ×0.95
  - Cost ×0.90
  - Cash Flow ×0.85
  - Risk ×0.80
  - Data maturity ×0.75 (default)
✓ Show ALL formulas with × symbols
✓ Document assumptions in the sourcing note paragraph (no inline brackets)
✓ Include Human-in-the-Loop checkpoint in EVERY use case
✓ Round benefits DOWN to nearest $100K
✓ Round timelines UP to nearest month

QUALITY GATES - Verify before output:
□ Exactly 10 use cases spanning 5+ business functions
□ All 10 RESHAPE processes (not just accelerate)
□ All 10 include Human-in-the-Loop checkpoints
□ Every financial figure has explicit formula with × symbols
□ All reduction factors applied correctly
□ Summary includes CRITICAL RISK callout

CRITICAL REQUIREMENT: Your ENTIRE response must be valid JSON - no markdown, no text before or after, no code blocks. Start your response with { and end with }. Do not include any explanatory text.`;

  // Get current configuration and verify API key
  const config = getConfig();
  
  // Simply check if we have the integration API key available
  if (!config.apiKey) {
    throw new Error("Anthropic API key is not configured. Please set up the Anthropic integration in Replit.");
  }

  console.log(`Starting analysis for: ${companyName}${documentContext ? ` with ${documentContext.length} chars of document context` : ""}`);
  if (documentContext) {
    console.log(`Document context will be included in AI prompt for enhanced analysis`);
  }

  try {
    // Use pRetry for automatic retries on transient failures
    // Rate limits (429) need MUCH longer waits - up to 60-90 seconds
    const responseText = await pRetry(
      async () => {
        try {
          return await callAnthropicAPI(systemPrompt, userPrompt, 16000);
        } catch (error: any) {
          console.error(`API call attempt failed:`, error?.message || error);
          
          // For rate limit errors (429), wait longer before retrying
          if (error?.status === 429 || error?.message?.includes("429") || error?.message?.toLowerCase().includes("rate limit")) {
            console.log("Rate limit hit - waiting 60 seconds before retry...");
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds
            throw error; // Then retry
          }
          
          // Check if it's a retryable error
          if (isRetryableError(error)) {
            console.log("Retrying due to transient error...");
            throw error; // Rethrow to trigger retry
          }
          
          // For non-retryable errors, abort retries
          throw new AbortError(error);
        }
      },
      {
        retries: 3,
        minTimeout: 5000,
        maxTimeout: 120000,
        factor: 3,
        onFailedAttempt: (error) => {
          console.log(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left. Waiting before retry...`);
        },
      }
    );

    console.log(`Received response for: ${companyName}`);
    
    if (!responseText) {
      throw new Error("Empty response received from AI service");
    }
    
    let jsonText = responseText.trim();
    
    // Handle various response formats
    // Remove markdown code blocks
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\s*/g, "").replace(/\s*```$/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\s*/g, "").replace(/\s*```$/g, "");
    }
    
    // Try to find JSON object if there's text before/after it
    const jsonStartIndex = jsonText.indexOf('{');
    const jsonEndIndex = jsonText.lastIndexOf('}');
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      console.error("No JSON object found in response");
      console.error("Raw response (first 1000 chars):", responseText.substring(0, 1000));
      throw new Error("AI response does not contain valid JSON. The model returned text instead of the requested JSON format.");
    }
    
    // Extract just the JSON portion
    jsonText = jsonText.substring(jsonStartIndex, jsonEndIndex + 1);
    
    try {
      const analysis = JSON.parse(jsonText);
      console.log(`Successfully parsed analysis for: ${companyName}`);
      
      // Post-process to ensure all calculations are deterministic and accurate
      console.log(`Post-processing analysis to verify calculations...`);
      const correctedAnalysis = postProcessAnalysis(analysis);
      console.log(`Post-processing complete for: ${companyName}`);
      
      return correctedAnalysis;
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Raw response (first 1000 chars):", jsonText.substring(0, 1000));
      throw new Error("Failed to parse AI response as JSON. The model may have returned malformed JSON.");
    }
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    
    // Extract the original error if wrapped by pRetry
    const originalError = error.originalError || error;
    
    // Provide more specific error messages
    if (originalError.status === 401) {
      throw new Error("Authentication failed. Please check your Anthropic API key configuration.");
    } else if (originalError.status === 429 || originalError.message?.includes("429") || originalError.message?.toLowerCase().includes("rate limit")) {
      throw new Error("The AI service is busy. Please wait 1-2 minutes and try again. This is normal during high usage periods.");
    } else if (originalError.status === 500 || originalError.status === 503) {
      throw new Error("AI service is temporarily unavailable. Please try again in a few minutes.");
    } else if (originalError.code === 'ECONNREFUSED' || originalError.code === 'ENOTFOUND') {
      throw new Error("Cannot connect to AI service. Please check your network connection.");
    } else if (originalError.message) {
      throw new Error(originalError.message);
    }
    
    throw new Error("Failed to generate company analysis. Please try again.");
  }
}

export async function generateWhatIfSuggestion(
  step: number, 
  context: any, 
  currentData: any[]
): Promise<any> {
  const stepDescriptions: Record<number, string> = {
    2: "Business Function Inventory & KPI Baselines - Generate KPI records with Function, Sub-Function, KPI Name, Baseline Value, Industry Benchmark, Target Value, Direction, Timeframe, and Measurement Method",
    3: "Friction Point Mapping - Generate friction point records with Function, Sub-Function, Friction Point description, Severity, Estimated Annual Cost, and Primary Driver Impact",
    4: "AI Use Case Generation - Generate AI use case records with ID, Function, Sub-Function, Use Case Name, Description, AI Primitives, and Target Friction",
    5: "Benefits Quantification - Generate benefit records with ID, Use Case, Revenue Benefit (e.g. $2.5M), Revenue Formula (explanation of calculation), Cost Benefit, Cost Formula, Cash Flow Benefit, Cash Flow Formula, Risk Benefit, Risk Formula, Total Annual Value (sum of all benefits), and Probability of Success (percentage 1-100). Use realistic conservative estimates with $K or $M notation.",
    6: "Readiness & Token Modeling - Generate readiness records with ID, Use Case, Organizational Capacity (1-10), Data Availability & Quality (1-10), Technical Infrastructure (1-10), Governance (1-10), Runs/Month, Input Tokens/Run, Output Tokens/Run, Monthly Tokens, Annual Token Cost, and Time-to-Value (months)",
    7: "Priority Scoring & Roadmap - Generate priority records with ID, Use Case, Priority Tier (Champions/Quick Wins/Strategic/Foundation), Recommended Phase, Priority Score, Readiness Score, Value Score, TTV Score"
  };

  const systemPrompt = `You are an AI assistant helping users create What-If scenarios for enterprise AI assessments. 
Generate a single NEW record suggestion for Step ${step}: ${stepDescriptions[step] || 'Analysis step'}.

Context about the company and existing analysis:
${JSON.stringify(context, null, 2)}

Existing records in this step:
${JSON.stringify(currentData, null, 2)}

RULES:
1. Generate ONE new record that would be valuable for this company
2. Use realistic, conservative estimates
3. Match the exact format of existing records
4. Generate unique IDs that don't conflict with existing ones
5. Provide plausible financial values using $M or $K notation
6. Include all required fields based on the step

Return ONLY valid JSON for the new record object.`;

  const userPrompt = `Generate a new record suggestion for Step ${step}. Return only valid JSON.`;

  try {
    const responseText = await callAnthropicAPI(systemPrompt, userPrompt, 2000);
    
    let jsonText = responseText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "").replace(/```\n?$/g, "");
    }
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("AI Suggestion Error:", error);
    throw new Error("Failed to generate suggestion");
  }
}
