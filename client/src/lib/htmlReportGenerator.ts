export function generateProfessionalHTMLReport(
  reportData: any,
  companyName: string
): string {
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const {
    analysisData = {
      steps: [],
      executiveDashboard: {},
      summary: '',
      scenarioAnalysis: {},
      multiYearProjection: {},
      executiveSummary: {},
    },
  } = reportData;

  const {
    steps = [],
    executiveDashboard = {},
    summary = '',
    scenarioAnalysis = {},
    multiYearProjection = {},
    executiveSummary: executiveSummaryData = {},
  } = analysisData;

  const {
    totalRevenueBenefit = 0,
    totalCostBenefit = 0,
    totalCashFlowBenefit = 0,
    totalRiskBenefit = 0,
    totalAnnualValue = 0,
    topUseCases = [],
    valuePerMillionTokens = 0,
  } = executiveDashboard;

  // Brand colors from index.ts
  const colors = {
    navy: '#003366',
    blue: '#0066CC',
    sky: '#00A3E0',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    neutral50: '#F8FAFC',
    neutral100: '#F1F5F9',
    neutral200: '#E2E8F0',
    neutral400: '#94A3B8',
    neutral600: '#475569',
    neutral700: '#334155',
    neutral900: '#0F172A',
    white: '#FFFFFF',
  };

  // Intelligent currency formatter
  const formatCurrency = (value: number | string): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '$0';

    if (numValue >= 1_000_000_000) {
      return `$${(numValue / 1_000_000_000).toFixed(1)}B`;
    }
    if (numValue >= 1_000_000) {
      return `$${(numValue / 1_000_000).toFixed(1)}M`;
    }
    if (numValue >= 1_000) {
      return `$${(numValue / 1_000).toFixed(1)}K`;
    }
    return `$${numValue.toFixed(0)}`;
  };

  // Format numbers with thousands separator
  const formatNumber = (value: any): string => {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  // Safe HTML escape
  const escapeHtml = (text: any): string => {
    if (!text) return '';
    const str = String(text);
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return str.replace(/[&<>"']/g, (char) => map[char]);
  };

  // Get step data
  const getStepData = (stepIndex: number): any => {
    return steps[stepIndex] || {};
  };

  // Generate table of contents
  const generateTableOfContents = (): string => {
    const sections = [
      { id: 'executive-summary', title: 'Executive Summary' },
      { id: 'financial-sensitivity', title: 'Financial Sensitivity Analysis' },
      { id: 'company-overview', title: 'Step 0: Company Overview' },
      { id: 'strategic-anchoring', title: 'Step 1: Strategic Anchoring & Business Drivers' },
      {
        id: 'business-function',
        title: 'Step 2: Business Function Inventory & KPI Baselines',
      },
      { id: 'friction-mapping', title: 'Step 3: Friction Point Mapping' },
      { id: 'use-cases', title: 'Step 4: AI Use Case Generation' },
      { id: 'benefits', title: 'Step 5: Benefits Quantification' },
      { id: 'effort-tokens', title: 'Step 6: Effort & Token Modeling' },
      { id: 'priority-roadmap', title: 'Step 7: Priority Scoring & Roadmap' },
      { id: 'appendix', title: 'Appendix' },
    ];

    return `
      <div class="page-break-section toc-section">
        <h2>Table of Contents</h2>
        <nav class="toc-nav">
          ${sections.map((s) => `<a href="#${s.id}" class="toc-link">${escapeHtml(s.title)}</a>`).join('')}
        </nav>
      </div>
    `;
  };

  // Generate executive summary with KPI cards
  const generateExecutiveSummary = (): string => {
    const summaryData = executiveSummaryData || {};
    const narrative = summaryData.context || summary || 'Strategic AI assessment completed.';

    // Use cases table
    const useCasesHtml =
      topUseCases && topUseCases.length > 0
        ? `
        <div class="summary-subsection">
          <h3>Top 5 AI Use Cases</h3>
          <table class="data-table compact">
            <thead>
              <tr>
                <th>Use Case</th>
                <th style="text-align: right;">Annual Value</th>
                <th style="text-align: right;">Priority Score</th>
              </tr>
            </thead>
            <tbody>
              ${topUseCases
                .slice(0, 5)
                .map(
                  (uc: any, idx: number) => `
              <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
                <td>${escapeHtml(uc.useCase || uc.name || '')}</td>
                <td style="text-align: right;">${formatCurrency(uc.annualValue || 0)}</td>
                <td style="text-align: right; font-weight: 600; color: ${colors.blue};">${(uc.priorityScore || 0).toFixed(0)}</td>
              </tr>
            `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
        : '';

    return `
      <div class="page-break-section" id="executive-summary">
        <h2>Executive Summary</h2>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Revenue Enhancement</div>
            <div class="kpi-value" style="color: ${colors.success};">${formatCurrency(totalRevenueBenefit)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Cost Optimization</div>
            <div class="kpi-value" style="color: ${colors.blue};">${formatCurrency(totalCostBenefit)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Cash Flow Improvement</div>
            <div class="kpi-value" style="color: ${colors.warning};">${formatCurrency(totalCashFlowBenefit)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Risk Mitigation</div>
            <div class="kpi-value" style="color: ${colors.navy};">${formatCurrency(totalRiskBenefit)}</div>
          </div>
        </div>

        <div class="hero-metric">
          <div class="hero-label">Total Annual Value</div>
          <div class="hero-value">${formatCurrency(totalAnnualValue)}</div>
          <div class="hero-subtext">Value per Million Tokens: ${formatCurrency(valuePerMillionTokens)}</div>
        </div>

        <div class="summary-subsection">
          <h3>Executive Overview</h3>
          <p class="summary-text">${escapeHtml(narrative)}</p>
        </div>

        ${useCasesHtml}
      </div>
    `;
  };

  // Generate financial sensitivity analysis
  const generateFinancialSensitivity = (): string => {
    const { conservative = {}, moderate = {}, aggressive = {} } = scenarioAnalysis;

    return `
      <div class="page-break-section" id="financial-sensitivity">
        <h2>Financial Sensitivity Analysis</h2>

        <div class="sensitivity-definition">
          <h3>Scenario Definitions</h3>
          <div class="definition-grid">
            <div class="definition-card">
              <div class="scenario-label" style="background: ${colors.neutral200};">Conservative</div>
              <p><strong>Adoption:</strong> 70% of identified use cases; slower change management</p>
              <p><strong>Timeline:</strong> 18-month ramp with learning curve</p>
              <p><strong>Benefits:</strong> Realize 75% of projected value with extended payback</p>
            </div>
            <div class="definition-card">
              <div class="scenario-label" style="background: ${colors.blue}; color: white;">Base Case</div>
              <p><strong>Adoption:</strong> 85% of identified use cases; normal implementation</p>
              <p><strong>Timeline:</strong> 12-month ramp with standard change management</p>
              <p><strong>Benefits:</strong> Realize 100% of projected benefits per plan</p>
            </div>
            <div class="definition-card">
              <div class="scenario-label" style="background: ${colors.sky}; color: white;">Optimistic</div>
              <p><strong>Adoption:</strong> 95%+ of use cases with accelerated rollout</p>
              <p><strong>Timeline:</strong> 9-month ramp with strong exec sponsorship</p>
              <p><strong>Benefits:</strong> Realize 125% of baseline with network effects</p>
            </div>
          </div>
        </div>

        <table class="sensitivity-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th style="background: ${colors.neutral200};">Conservative</th>
              <th style="background: ${colors.blue}; color: white;">Base Case</th>
              <th style="background: ${colors.sky}; color: white;">Optimistic</th>
            </tr>
          </thead>
          <tbody>
            <tr class="row-even">
              <td style="font-weight: 600;">Annual Benefit</td>
              <td>${formatCurrency((conservative as any).annualBenefit || 0)}</td>
              <td style="font-weight: 600;">${formatCurrency((moderate as any).annualBenefit || 0)}</td>
              <td>${formatCurrency((aggressive as any).annualBenefit || 0)}</td>
            </tr>
            <tr class="row-odd">
              <td style="font-weight: 600;">5-Year NPV</td>
              <td>${formatCurrency((conservative as any).npv || 0)}</td>
              <td style="font-weight: 600;">${formatCurrency((moderate as any).npv || 0)}</td>
              <td>${formatCurrency((aggressive as any).npv || 0)}</td>
            </tr>
            <tr class="row-even">
              <td style="font-weight: 600;">Payback Period</td>
              <td>${((conservative as any).paybackMonths || 0) > 0 ? `${(conservative as any).paybackMonths} months` : 'Year 1'}</td>
              <td style="font-weight: 600;">${((moderate as any).paybackMonths || 0) > 0 ? `${(moderate as any).paybackMonths} months` : 'Year 1'}</td>
              <td>${((aggressive as any).paybackMonths || 0) > 0 ? `${(aggressive as any).paybackMonths} months` : 'Year 1'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  };

  // Generate company overview
  const generateCompanyOverview = (): string => {
    const step0 = getStepData(0);
    const content = step0.content || '';

    return `
      <div class="page-break-section" id="company-overview">
        <h2>Step 0: Company Overview</h2>
        <div class="section-content">
          ${escapeHtml(content)
            .split('\n\n')
            .map((p: string) => `<p>${p}</p>`)
            .join('')}
        </div>
      </div>
    `;
  };

  // Generate strategic anchoring table
  const generateStrategicAnchoring = (): string => {
    const step1 = getStepData(1);
    const data = (step1.data as any[]) || [];

    if (!data || data.length === 0) {
      return '';
    }

    return `
      <div class="page-break-section" id="strategic-anchoring">
        <h2>Step 1: Strategic Anchoring & Business Drivers</h2>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Strategic Theme</th>
                <th>Current State</th>
                <th>Target State</th>
                <th>Primary Driver Impact</th>
                <th>Secondary Driver</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row: any, idx: number) => `
              <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
                <td style="font-weight: 600;">${escapeHtml(row['Strategic Theme'] || '')}</td>
                <td>${escapeHtml(row['Current State'] || '')}</td>
                <td>${escapeHtml(row['Target State'] || '')}</td>
                <td><span class="driver-badge">${escapeHtml(row['Primary Driver'] || '')}</span></td>
                <td>${escapeHtml(row['Secondary Driver'] || '')}</td>
              </tr>
            `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  // Generate business function inventory
  const generateBusinessFunctionInventory = (): string => {
    const step2 = getStepData(2);
    const data = (step2.data as any[]) || [];

    if (!data || data.length === 0) {
      return '';
    }

    return `
      <div class="page-break-section" id="business-function">
        <h2>Step 2: Business Function Inventory & KPI Baselines</h2>
        <div class="table-responsive scrollable-table">
          <table class="data-table small">
            <thead>
              <tr>
                <th>KPI Name</th>
                <th>Function</th>
                <th>Sub-Function</th>
                <th>Baseline</th>
                <th>Direction</th>
                <th>Target</th>
                <th>Industry Best</th>
                <th>Overall Best</th>
                <th>Timeframe</th>
                <th>Strategic Theme</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row: any, idx: number) => `
              <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
                <td style="font-weight: 600;">${escapeHtml(row['KPI Name'] || '')}</td>
                <td>${escapeHtml(row['Function'] || '')}</td>
                <td>${escapeHtml(row['Sub-Function'] || '')}</td>
                <td>${escapeHtml(row['Baseline Value'] || '')}</td>
                <td style="text-align: center; font-weight: bold;">${escapeHtml(row['Direction'] || '')}</td>
                <td>${escapeHtml(row['Target Value'] || '')}</td>
                <td style="font-size: 0.9em;">${escapeHtml(row['Benchmark (Industry Best)'] || '')}</td>
                <td style="font-size: 0.9em;">${escapeHtml(row['Benchmark (Overall Best)'] || '')}</td>
                <td>${escapeHtml(row['Timeframe'] || '')}</td>
                <td>${escapeHtml(row['Strategic Theme'] || '')}</td>
              </tr>
            `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  // Generate friction point mapping (grouped by strategic theme)
  const generateFrictionMapping = (): string => {
    const step3 = getStepData(3);
    const data = (step3.data as any[]) || [];

    if (!data || data.length === 0) {
      return '';
    }

    // Group by strategic theme
    const groupedByTheme = data.reduce(
      (acc: any, row: any) => {
        const theme = row['Strategic Theme'] || 'Other';
        if (!acc[theme]) {
          acc[theme] = [];
        }
        acc[theme].push(row);
        return acc;
      },
      {}
    );

    let totalCost = 0;
    const themeHtmls = Object.keys(groupedByTheme)
      .sort()
      .map((theme) => {
        const themeRows = groupedByTheme[theme];
        const themeCost = themeRows.reduce((sum: number, row: any) => {
          const cost = parseFloat(
            String(row['Estimated Annual Cost ($)'] || 0).replace(/[^\d.-]/g, '')
          );
          return sum + (isNaN(cost) ? 0 : cost);
        }, 0);
        totalCost += themeCost;

        return `
          <tr class="theme-header-row">
            <td colspan="7" style="background: ${colors.navy}; color: white; font-weight: 700; padding: 12px;">
              ${escapeHtml(theme)} — ${formatCurrency(themeCost)}
            </td>
          </tr>
          ${themeRows
            .map(
              (row: any, idx: number) => `
          <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
            <td>${escapeHtml(row['Friction Point'] || '')}</td>
            <td>${escapeHtml(row['Function'] || '')}</td>
            <td>${escapeHtml(row['Sub-Function'] || '')}</td>
            <td>${escapeHtml(row['Role'] || 'N/A')}</td>
            <td style="text-align: right; font-weight: 600;">${formatCurrency(row['Estimated Annual Cost ($)'] || 0)}</td>
            <td style="text-align: center;"><span class="severity-badge severity-${String(row['Severity'] || '').toLowerCase()}">${escapeHtml(row['Severity'] || '')}</span></td>
            <td>${escapeHtml(row['Primary Driver Impact'] || '')}</td>
          </tr>
        `
            )
            .join('')}
        `;
      })
      .join('');

    return `
      <div class="page-break-section" id="friction-mapping">
        <h2>Step 3: Friction Point Mapping</h2>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Friction Point</th>
                <th>Function</th>
                <th>Sub-Function</th>
                <th>Role</th>
                <th style="text-align: right;">Annual Cost</th>
                <th>Severity</th>
                <th>Primary Driver</th>
              </tr>
            </thead>
            <tbody>
              ${themeHtmls}
              <tr class="grand-total-row">
                <td colspan="4" style="text-align: right; font-weight: 700; padding: 12px;">TOTAL ANNUAL FRICTION</td>
                <td style="text-align: right; font-weight: 700; font-size: 1.1em; color: ${colors.error}; padding: 12px;">
                  ${formatCurrency(totalCost)}
                </td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  // Generate use cases table
  const generateUseCasesTable = (): string => {
    const step4 = getStepData(4);
    const data = (step4.data as any[]) || [];

    if (!data || data.length === 0) {
      return '';
    }

    return `
      <div class="page-break-section" id="use-cases">
        <h2>Step 4: AI Use Case Generation</h2>
        <div class="table-responsive scrollable-table">
          <table class="data-table small">
            <thead>
              <tr>
                <th>ID</th>
                <th>Use Case Name</th>
                <th>Description</th>
                <th>Target Friction</th>
                <th>AI Primitives</th>
                <th>Human Checkpoint</th>
                <th>Function</th>
                <th>Sub-Function</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row: any, idx: number) => `
              <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
                <td style="font-weight: 600;">${escapeHtml(row['ID'] || '')}</td>
                <td style="font-weight: 600;">${escapeHtml(row['Use Case Name'] || '')}</td>
                <td style="font-size: 0.9em; max-width: 250px;">${escapeHtml(row['Description'] || '')}</td>
                <td style="font-size: 0.9em;">${escapeHtml(row['Target Friction'] || '')}</td>
                <td style="font-size: 0.9em;">${escapeHtml(row['AI Primitives'] || '')}</td>
                <td style="font-size: 0.85em;">${escapeHtml(row['Human-in-the-Loop Checkpoint'] || '')}</td>
                <td>${escapeHtml(row['Function'] || '')}</td>
                <td>${escapeHtml(row['Sub-Function'] || '')}</td>
              </tr>
            `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  // Generate benefits quantification
  const generateBenefitsQuantification = (): string => {
    const step5 = getStepData(5);
    const data = (step5.data as any[]) || [];

    if (!data || data.length === 0) {
      return '';
    }

    return `
      <div class="page-break-section" id="benefits">
        <h2>Step 5: Benefits Quantification by Driver</h2>

        <div class="benefits-formula">
          <h3>Benefit Formulas</h3>
          <div class="formula-grid">
            <div class="formula-card">
              <div class="formula-title">Cost Benefit</div>
              <p>Hours Saved × Hourly Rate × Benefits Loading × Adoption Rate × Data Maturity</p>
              <p style="color: ${colors.neutral600}; font-size: 0.9em;">Applies 1.35× employer loading; conservative adoption &amp; data readiness factors</p>
            </div>
            <div class="formula-card">
              <div class="formula-title">Revenue Benefit</div>
              <p>Revenue Uplift % × Revenue at Risk × Realization Factor × Data Maturity</p>
              <p style="color: ${colors.neutral600}; font-size: 0.9em;">Market-tested conversion assumptions; reflects gradual adoption curves</p>
            </div>
            <div class="formula-card">
              <div class="formula-title">Cash Flow Benefit</div>
              <p>Annual Revenue × (Days Improved / 365) × Cost of Capital × Realization Factor</p>
              <p style="color: ${colors.neutral600}; font-size: 0.9em;">Working capital release at 8% cost of capital; applies to inventory reduction</p>
            </div>
            <div class="formula-card">
              <div class="formula-title">Probability Weight</div>
              <p>Expected Value = Annual Benefit × Probability of Success</p>
              <p style="color: ${colors.neutral600}; font-size: 0.9em;">Weighted by implementation confidence and market maturity of AI capability</p>
            </div>
          </div>
        </div>

        <div class="table-responsive scrollable-table">
          <table class="data-table small">
            <thead>
              <tr>
                <th>ID</th>
                <th>Use Case</th>
                <th style="text-align: right;">Cost Benefit</th>
                <th style="text-align: right;">Revenue Benefit</th>
                <th style="text-align: right;">Cash Flow</th>
                <th style="text-align: right;">Risk Benefit</th>
                <th style="text-align: right;">Total Annual Value</th>
                <th style="text-align: center;">Prob. Success</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row: any, idx: number) => `
              <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
                <td style="font-weight: 600;">${escapeHtml(row['ID'] || '')}</td>
                <td style="font-weight: 600;">${escapeHtml(row['Use Case'] || '')}</td>
                <td style="text-align: right;">${formatCurrency(row['Cost Benefit ($)'] || 0)}</td>
                <td style="text-align: right; color: ${colors.success};">${formatCurrency(row['Revenue Benefit ($)'] || 0)}</td>
                <td style="text-align: right; color: ${colors.warning};">${formatCurrency(row['Cash Flow Benefit ($)'] || 0)}</td>
                <td style="text-align: right;">${formatCurrency(row['Risk Benefit ($)'] || 0)}</td>
                <td style="text-align: right; font-weight: 600; color: ${colors.navy};">${formatCurrency(row['Total Annual Value ($)'] || 0)}</td>
                <td style="text-align: center;">${((row['Probability of Success'] || 0) * 100).toFixed(0)}%</td>
              </tr>
            `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  // Generate effort & token modeling
  const generateEffortTokenModeling = (): string => {
    const step6 = getStepData(6);
    const data = (step6.data as any[]) || [];

    if (!data || data.length === 0) {
      return '';
    }

    return `
      <div class="page-break-section" id="effort-tokens">
        <h2>Step 6: Effort & Token Modeling</h2>
        <div class="table-responsive scrollable-table">
          <table class="data-table small">
            <thead>
              <tr>
                <th>ID</th>
                <th>Use Case Name</th>
                <th style="text-align: center;">TTV (mo)</th>
                <th style="text-align: center;">Data Ready</th>
                <th style="text-align: center;">Integration</th>
                <th style="text-align: center;">Effort</th>
                <th style="text-align: center;">Change Mgmt</th>
                <th style="text-align: right;">Monthly Tokens</th>
                <th style="text-align: right;">Runs/Mo</th>
                <th style="text-align: right;">Input/Run</th>
                <th style="text-align: right;">Output/Run</th>
                <th style="text-align: right;">Annual Cost</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row: any, idx: number) => `
              <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
                <td style="font-weight: 600;">${escapeHtml(row['ID'] || '')}</td>
                <td style="font-weight: 600;">${escapeHtml(row['Use Case Name'] || '')}</td>
                <td style="text-align: center;">${row['Time-to-Value'] || '–'}</td>
                <td style="text-align: center;"><span class="score-badge">${row['Data Readiness'] || '–'}</span></td>
                <td style="text-align: center;"><span class="score-badge">${row['Integration Complexity'] || '–'}</span></td>
                <td style="text-align: center;"><span class="score-badge">${row['Effort Score'] || '–'}</span></td>
                <td style="text-align: center;"><span class="score-badge">${row['Change Mgmt'] || '–'}</span></td>
                <td style="text-align: right;">${formatNumber(row['Monthly Tokens'] || 0)}</td>
                <td style="text-align: right;">${formatNumber(row['Runs/Month'] || 0)}</td>
                <td style="text-align: right;">${formatNumber(row['Input Tokens/Run'] || 0)}</td>
                <td style="text-align: right;">${formatNumber(row['Output Tokens/Run'] || 0)}</td>
                <td style="text-align: right; font-weight: 600;">${escapeHtml(row['Annual Token Cost'] || '–')}</td>
              </tr>
            `
                )
                .join('')}
            </tbody>
          </table>
        </div>
        <p style="margin-top: 20px; font-size: 0.9em; color: ${colors.neutral600};">
          <strong>Scoring Scale:</strong> Data Readiness, Integration Complexity, Effort Score, Change Mgmt (1=Low to 5=High) |
          TTV = Time-to-Value in months | Token costs at $3/1M input, $15/1M output
        </p>
      </div>
    `;
  };

  // Generate priority scoring & roadmap
  const generatePriorityScoringRoadmap = (): string => {
    const step7 = getStepData(7);
    const data = (step7.data as any[]) || [];

    if (!data || data.length === 0) {
      return '';
    }

    return `
      <div class="page-break-section" id="priority-roadmap">
        <h2>Step 7: Priority Scoring & Roadmap</h2>
        <div class="table-responsive scrollable-table">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Use Case</th>
                <th>Priority Tier</th>
                <th style="text-align: center;">Score (0-100)</th>
                <th style="text-align: center;">Value (0-40)</th>
                <th style="text-align: center;">TTV (0-30)</th>
                <th style="text-align: center;">Effort (0-30)</th>
                <th>Recommended Phase</th>
                <th>Strategic Theme</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row: any, idx: number) => `
              <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
                <td style="font-weight: 600;">${escapeHtml(row['ID'] || '')}</td>
                <td style="font-weight: 600;">${escapeHtml(row['Use Case'] || '')}</td>
                <td>${escapeHtml(row['Priority Tier'] || '')}</td>
                <td style="text-align: center;"><span class="priority-score">${row['Priority Score (0-100)'] || 0}</span></td>
                <td style="text-align: center;">${row['Value Score (0-40)'] || 0}</td>
                <td style="text-align: center;">${row['TTV Score (0-30)'] || 0}</td>
                <td style="text-align: center;">${row['Effort Score (0-30)'] || 0}</td>
                <td><span class="phase-badge">${escapeHtml(row['Recommended Phase'] || '')}</span></td>
                <td>${escapeHtml(row['Strategic Theme'] || '')}</td>
              </tr>
            `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  // Generate appendix
  const generateAppendix = (): string => {
    return `
      <div class="page-break-section" id="appendix">
        <h2>Appendix</h2>

        <div class="appendix-section">
          <h3>Standardized Roles & Labor Rates</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Role / Function</th>
                <th>Base Hourly Rate</th>
                <th>Benefits Loading</th>
                <th>Fully-Loaded Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr class="row-even">
                <td>Store Associates</td>
                <td>$15–$22</td>
                <td>1.35×</td>
                <td>$100/hr</td>
              </tr>
              <tr class="row-odd">
                <td>Professional Services / Sales</td>
                <td>$35–$45</td>
                <td>1.35×</td>
                <td>$150/hr</td>
              </tr>
              <tr class="row-even">
                <td>Merchandising / Supply Chain Analysts</td>
                <td>$40–$52</td>
                <td>1.35×</td>
                <td>$175/hr</td>
              </tr>
            </tbody>
          </table>
          <p style="margin-top: 12px; font-size: 0.85em; color: ${colors.neutral600};">
            Benefits loading (1.35×) includes payroll taxes, health insurance, retirement, PTO, and overhead allocation per BlueAlly methodology.
          </p>
        </div>

        <div class="appendix-section">
          <h3>Methodology & Assumptions</h3>
          <ul style="color: ${colors.neutral700}; line-height: 1.8;">
            <li><strong>Data Maturity:</strong> Current state assessed at Level 2 based on enterprise system investments with limited AI deployment</li>
            <li><strong>Adoption Ramps:</strong> Conservative 90% adoption in Year 1; assumes 10% resistance or pilot scope limitations</li>
            <li><strong>Revenue Assumptions:</strong> Market-tested uplift percentages applied to relevant revenue pools with 0.95 realization factors for execution risk</li>
            <li><strong>Cost of Capital:</strong> 8% applied to working capital improvements per company WACC proxy</li>
            <li><strong>Token Modeling:</strong> Based on Claude API pricing ($3/1M input, $15/1M output); actual costs scale with usage patterns</li>
            <li><strong>Probability Weighting:</strong> Success rates reflect technology maturity, data availability, and organizational change readiness</li>
          </ul>
        </div>

        <div class="appendix-section">
          <h3>Next Steps & Workshop</h3>
          <div class="cta-box">
            <h4>Drive Implementation Forward</h4>
            <p>BlueAlly recommends a facilitated workshop with cross-functional leadership to:</p>
            <ul style="margin: 12px 0;">
              <li>Validate use case prioritization and sequencing against strategic roadmap</li>
              <li>Assign executive sponsors and establish governance structures</li>
              <li>Confirm data access, system integration, and change management approach</li>
              <li>Define success metrics and establish baseline tracking</li>
            </ul>
            <p style="margin-top: 16px; padding: 12px; background: ${colors.neutral100}; border-radius: 4px; font-size: 0.9em;">
              <strong>Contact BlueAlly:</strong> Arrange facilitated workshop to begin 90-day sprint toward implementation readiness. Typical engagement: 2-week strategy alignment + 4-week pilot design.
            </p>
          </div>
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid ${colors.neutral200}; text-align: center; font-size: 0.85em; color: ${colors.neutral600};">
          <p>© 2025 BlueAlly. Confidential & Proprietary.<br>This assessment contains forward-looking projections and assumptions subject to substantial business and market risks.</p>
        </div>
      </div>
    `;
  };

  // Build complete HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(companyName)} - BlueAlly AI Strategic Assessment</title>
  <style>
    :root {
      --navy: ${colors.navy};
      --blue: ${colors.blue};
      --sky: ${colors.sky};
      --success: ${colors.success};
      --warning: ${colors.warning};
      --error: ${colors.error};
      --neutral-50: ${colors.neutral50};
      --neutral-100: ${colors.neutral100};
      --neutral-200: ${colors.neutral200};
      --neutral-400: ${colors.neutral400};
      --neutral-600: ${colors.neutral600};
      --neutral-700: ${colors.neutral700};
      --neutral-900: ${colors.neutral900};
      --white: ${colors.white};
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html {
      font-size: 16px;
      scroll-behavior: smooth;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;
      color: var(--neutral-700);
      line-height: 1.6;
      background-color: var(--white);
    }

    .report-container {
      max-width: 1000px;
      margin: 0 auto;
    }

    @media screen {
      body {
        background: var(--neutral-50);
        padding: 20px;
      }
      .report-container {
        background: var(--white);
        box-shadow: 0 4px 12px rgba(0, 51, 102, 0.12);
        border-radius: 8px;
        overflow: hidden;
      }
    }

    /* Cover Page */
    .cover-page {
      background: linear-gradient(135deg, var(--navy) 0%, var(--blue) 50%, var(--sky) 100%);
      color: var(--white);
      padding: 80px 40px;
      text-align: center;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }

    .cover-page::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 500px;
      height: 500px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 50%;
    }

    .cover-page::after {
      content: '';
      position: absolute;
      bottom: -20%;
      left: -10%;
      width: 400px;
      height: 400px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 50%;
    }

    .cover-content {
      position: relative;
      z-index: 2;
    }

    .cover-brand {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 48px;
      text-transform: uppercase;
      opacity: 0.95;
    }

    .cover-title {
      font-size: 56px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 24px;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .cover-company {
      font-size: 42px;
      font-weight: 600;
      margin-bottom: 80px;
      opacity: 0.95;
    }

    .cover-footer {
      font-size: 14px;
      line-height: 1.8;
    }

    .confidential-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-top: 20px;
      text-transform: uppercase;
    }

    /* Table of Contents */
    .toc-section {
      background: var(--neutral-100);
      padding: 40px;
    }

    .toc-nav {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 20px;
    }

    .toc-link {
      color: var(--blue);
      text-decoration: none;
      font-size: 14px;
      padding: 8px 0;
      border-bottom: 1px solid var(--neutral-200);
      transition: all 0.2s ease;
    }

    .toc-link:hover {
      color: var(--navy);
      padding-left: 8px;
    }

    /* Main Content */
    .content {
      padding: 40px;
    }

    h2 {
      font-size: 28px;
      color: var(--white);
      background: linear-gradient(135deg, var(--navy) 0%, var(--blue) 100%);
      padding: 20px 24px;
      margin: 40px -40px 24px -40px;
      margin-top: 0;
      font-weight: 700;
      border-bottom: 4px solid var(--sky);
    }

    h3 {
      font-size: 18px;
      color: var(--navy);
      margin: 24px 0 16px 0;
      font-weight: 700;
    }

    h4 {
      font-size: 16px;
      color: var(--neutral-900);
      margin: 16px 0 12px 0;
      font-weight: 600;
    }

    p {
      margin-bottom: 12px;
      color: var(--neutral-600);
      font-size: 14px;
    }

    ul, ol {
      margin-left: 24px;
      margin-bottom: 12px;
    }

    li {
      margin-bottom: 8px;
    }

    a {
      color: var(--blue);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    /* Executive Summary KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .kpi-card {
      background: var(--neutral-50);
      border: 1px solid var(--neutral-200);
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 51, 102, 0.06);
    }

    .kpi-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--neutral-600);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .kpi-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--blue);
      margin-bottom: 4px;
    }

    /* Hero Metric */
    .hero-metric {
      background: linear-gradient(135deg, var(--navy) 0%, var(--blue) 100%);
      color: var(--white);
      padding: 32px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 32px;
      box-shadow: 0 4px 14px rgba(0, 51, 102, 0.15);
    }

    .hero-label {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.95;
      margin-bottom: 8px;
    }

    .hero-value {
      font-size: 44px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .hero-subtext {
      font-size: 13px;
      opacity: 0.9;
    }

    /* Summary Subsection */
    .summary-subsection {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--neutral-200);
    }

    .summary-text {
      color: var(--neutral-600);
      line-height: 1.8;
      font-size: 14px;
    }

    /* Sensitivity Analysis */
    .sensitivity-definition {
      background: var(--neutral-100);
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 32px;
    }

    .definition-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-top: 16px;
    }

    .definition-card {
      background: var(--white);
      padding: 20px;
      border-radius: 6px;
      border: 1px solid var(--neutral-200);
    }

    .scenario-label {
      font-weight: 700;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 12px;
      display: inline-block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .definition-card p {
      margin-bottom: 8px;
      font-size: 13px;
    }

    .sensitivity-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--white);
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0, 51, 102, 0.08);
      border-radius: 6px;
      overflow: hidden;
    }

    .sensitivity-table th {
      padding: 14px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      border-bottom: 2px solid var(--neutral-200);
    }

    .sensitivity-table td {
      padding: 14px;
      border-bottom: 1px solid var(--neutral-200);
      font-size: 13px;
    }

    /* Tables */
    .table-responsive {
      overflow-x: auto;
      margin: 20px 0;
    }

    .scrollable-table {
      display: block;
      max-height: 600px;
      overflow-y: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--white);
      border: 1px solid var(--neutral-200);
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 51, 102, 0.08);
    }

    .data-table.compact {
      font-size: 13px;
    }

    .data-table.small {
      font-size: 12px;
    }

    .data-table thead {
      background: var(--navy);
      color: var(--white);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .data-table th {
      padding: 14px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      border-bottom: 2px solid var(--blue);
    }

    .data-table td {
      padding: 12px;
      border-bottom: 1px solid var(--neutral-200);
    }

    .data-table .row-even {
      background: var(--neutral-50);
    }

    .data-table .row-odd {
      background: var(--white);
    }

    .data-table .theme-header-row {
      font-weight: 700 !important;
    }

    .data-table .grand-total-row {
      background: var(--neutral-100) !important;
      font-weight: 700;
      font-size: 13px;
    }

    .data-table .grand-total-row td {
      border-top: 2px solid var(--navy);
      border-bottom: 2px solid var(--navy);
    }

    /* Badges */
    .driver-badge {
      display: inline-block;
      background: var(--blue);
      color: var(--white);
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
    }

    .severity-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .severity-badge.severity-critical {
      background: var(--error);
      color: var(--white);
    }

    .severity-badge.severity-high {
      background: var(--warning);
      color: var(--white);
    }

    .severity-badge.severity-medium {
      background: var(--neutral-400);
      color: var(--white);
    }

    .score-badge {
      display: inline-block;
      background: var(--blue);
      color: var(--white);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 12px;
    }

    .priority-score {
      display: inline-block;
      background: linear-gradient(135deg, var(--navy) 0%, var(--blue) 100%);
      color: var(--white);
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 12px;
    }

    .phase-badge {
      display: inline-block;
      background: var(--sky);
      color: var(--white);
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    /* Benefits Formula */
    .benefits-formula {
      background: var(--neutral-100);
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .formula-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-top: 16px;
    }

    .formula-card {
      background: var(--white);
      padding: 16px;
      border-radius: 6px;
      border-left: 4px solid var(--blue);
    }

    .formula-title {
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 8px;
      font-size: 13px;
    }

    .formula-card p {
      font-size: 12px;
      margin-bottom: 8px;
    }

    /* CTA Box */
    .cta-box {
      background: var(--neutral-100);
      padding: 24px;
      border-radius: 8px;
      border-left: 4px solid var(--success);
    }

    .cta-box h4 {
      color: var(--navy);
      margin-top: 0;
    }

    /* Page breaks */
    .page-break-section {
      page-break-inside: avoid;
      page-break-after: always;
    }

    .page-break-section:last-child {
      page-break-after: auto;
    }

    /* Section content */
    .section-content {
      color: var(--neutral-600);
      line-height: 1.8;
      font-size: 14px;
    }

    .section-content p {
      margin-bottom: 16px;
    }

    /* Print styles */
    @media print {
      @page {
        size: letter;
        margin: 0.5in;
      }

      body {
        background: var(--white);
        padding: 0;
        font-size: 11pt;
      }

      .report-container {
        max-width: 100%;
        box-shadow: none;
        border-radius: 0;
      }

      .page-break-section {
        page-break-inside: avoid;
        page-break-after: always;
      }

      .data-table {
        page-break-inside: avoid;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      h2 {
        margin: 20px 0 16px 0;
      }

      .scrollable-table {
        max-height: none;
        overflow: visible;
      }
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .cover-title {
        font-size: 36px;
      }

      .cover-company {
        font-size: 28px;
      }

      h2 {
        font-size: 22px;
        padding: 16px 20px;
        margin-left: -24px;
        margin-right: -24px;
      }

      h3 {
        font-size: 16px;
      }

      .content {
        padding: 24px;
      }

      .kpi-grid {
        grid-template-columns: 1fr;
      }

      .definition-grid {
        grid-template-columns: 1fr;
      }

      .formula-grid {
        grid-template-columns: 1fr;
      }

      .data-table {
        font-size: 11px;
      }

      .data-table th,
      .data-table td {
        padding: 8px;
      }

      .table-responsive {
        font-size: 0.9em;
      }
    }

    /* Utility classes */
    .text-right {
      text-align: right;
    }

    .text-center {
      text-align: center;
    }

    .font-bold {
      font-weight: 700;
    }

    .margin-top {
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Cover Page -->
    <div class="cover-page">
      <div class="cover-content">
        <div class="cover-brand">BlueAlly</div>
        <div class="cover-title">AI Strategic Assessment</div>
        <div class="cover-company">${escapeHtml(companyName)}</div>
      </div>
      <div class="cover-content">
        <div class="cover-footer">
          <div>${formattedDate}</div>
          <div class="confidential-badge">Confidential & Proprietary</div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content">
      <!-- Table of Contents -->
      ${generateTableOfContents()}

      <!-- Executive Summary -->
      ${generateExecutiveSummary()}

      <!-- Financial Sensitivity Analysis -->
      ${generateFinancialSensitivity()}

      <!-- Company Overview -->
      ${generateCompanyOverview()}

      <!-- Strategic Anchoring -->
      ${generateStrategicAnchoring()}

      <!-- Business Function Inventory -->
      ${generateBusinessFunctionInventory()}

      <!-- Friction Point Mapping -->
      ${generateFrictionMapping()}

      <!-- Use Cases -->
      ${generateUseCasesTable()}

      <!-- Benefits Quantification -->
      ${generateBenefitsQuantification()}

      <!-- Effort & Token Modeling -->
      ${generateEffortTokenModeling()}

      <!-- Priority Scoring & Roadmap -->
      ${generatePriorityScoringRoadmap()}

      <!-- Appendix -->
      ${generateAppendix()}
    </div>
  </div>
</body>
</html>
  `;

  return html;
}
