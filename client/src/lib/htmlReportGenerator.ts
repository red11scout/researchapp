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

  // Unified color palette
  const colors = {
    primary: '#0339AF',
    accent: '#4C73E9',
    sky: '#00A3E0',
    navy: '#0F172A',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    indigo: '#6366F1',
    slate: '#64748B',
    neutral50: '#F8FAFC',
    neutral100: '#F1F5F9',
    neutral200: '#E2E8F0',
    neutral300: '#CBD5E1',
    neutral400: '#94A3B8',
    neutral500: '#64748B',
    neutral600: '#475569',
    neutral700: '#334155',
    neutral800: '#1E293B',
    neutral900: '#0F172A',
    white: '#FFFFFF',
  };

  // Pillar colors for value drivers
  const pillarColors = {
    revenue: { text: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
    cost: { text: '#0066CC', bg: '#EFF6FF', border: '#BFDBFE' },
    cashflow: { text: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    risk: { text: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' },
  };

  // Intelligent currency formatter (handles pre-formatted $XM/$XK/$XB strings)
  const formatCurrency = (value: number | string): string => {
    let numValue: number;
    if (typeof value === 'number') {
      numValue = value;
    } else {
      const str = String(value).trim();
      const m = str.match(/^\$?([\d,.]+)\s*([KkMmBb])?/);
      if (!m) { numValue = 0; }
      else {
        const base = parseFloat(m[1].replace(/,/g, ''));
        const s = m[2]?.toUpperCase();
        numValue = isNaN(base) ? 0 : s === 'B' ? base * 1e9 : s === 'M' ? base * 1e6 : s === 'K' ? base * 1e3 : base;
      }
    }
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

  // Calculate % of total
  const pctOfTotal = (value: number): string => {
    if (!totalAnnualValue || totalAnnualValue === 0) return '0%';
    return `${Math.round((value / totalAnnualValue) * 100)}%`;
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

  // Split long text into multiple <p> tags for readability
  const splitIntoParagraphs = (text: string): string => {
    if (!text) return '<p></p>';
    // First split on double-newlines
    let paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    // For any remaining long paragraphs (>300 chars), split on sentence boundaries
    const result: string[] = [];
    for (const para of paragraphs) {
      if (para.length > 300) {
        // Split on ". " followed by an uppercase letter (sentence boundary)
        const sentences = para.split(/(?<=\.\s)(?=[A-Z])/);
        let chunk = '';
        for (const sentence of sentences) {
          if (chunk.length + sentence.length > 350 && chunk.length > 0) {
            result.push(chunk.trim());
            chunk = sentence;
          } else {
            chunk += sentence;
          }
        }
        if (chunk.trim()) result.push(chunk.trim());
      } else {
        result.push(para.trim());
      }
    }
    return result.map(p => `<p class="body-text">${p}</p>`).join('\n          ');
  };

  // Get step data
  const getStepData = (stepIndex: number): any => {
    return steps[stepIndex] || {};
  };

  // Generate table of contents
  const generateTableOfContents = (): string => {
    const sections = [
      { id: 'executive-summary', title: 'Executive Summary', num: '01' },
      { id: 'financial-sensitivity', title: 'Financial Sensitivity Analysis', num: '02' },
      { id: 'value-drivers', title: 'Value Drivers', num: '03' },
      { id: 'company-overview', title: 'Company Overview', num: '04' },
      { id: 'strategic-anchoring', title: 'Strategic Anchoring & Business Drivers', num: '05' },
      { id: 'business-function', title: 'Business Function Inventory & KPI Baselines', num: '06' },
      { id: 'friction-mapping', title: 'Friction Point Mapping', num: '07' },
      { id: 'use-cases', title: 'AI Use Case Generation', num: '08' },
      { id: 'benefits', title: 'Benefits Quantification', num: '09' },
      { id: 'effort-tokens', title: 'Feasibility & Token Modeling', num: '10' },
      { id: 'priority-roadmap', title: 'Priority Scoring & Roadmap', num: '11' },
      { id: 'appendix', title: 'Appendix', num: '12' },
    ];

    return `
      <div class="section toc-section" id="toc">
        <h2 class="section-heading">Table of Contents</h2>
        <nav class="toc-nav">
          ${sections.map((s) => `
            <a href="#${s.id}" class="toc-item">
              <span class="toc-num">${s.num}</span>
              <span class="toc-title">${escapeHtml(s.title)}</span>
              <span class="toc-dots"></span>
            </a>
          `).join('')}
        </nav>
      </div>
    `;
  };

  // Generate executive summary
  const generateExecutiveSummary = (): string => {
    const summaryData = executiveSummaryData || {};
    const narrative = summaryData.context || summary || 'Strategic AI assessment completed.';

    const useCasesHtml =
      topUseCases && topUseCases.length > 0
        ? `
        <div class="subsection">
          <h3 class="subsection-heading">AI Use Cases by Priority</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Use Case</th>
                <th class="text-right">Annual Value</th>
                <th class="text-right">Priority Score</th>
              </tr>
            </thead>
            <tbody>
              ${topUseCases
                .slice(0, 10)
                .map(
                  (uc: any, idx: number) => `
              <tr>
                <td class="text-center font-semibold" style="color: ${colors.primary};">${idx + 1}</td>
                <td class="font-medium">${escapeHtml(uc.useCase || uc.name || '')}</td>
                <td class="text-right font-semibold">${formatCurrency(uc.annualValue || 0)}</td>
                <td class="text-right"><span class="score-pill">${(uc.priorityScore || 0).toFixed(0)}</span></td>
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
      <div class="section" id="executive-summary">
        <h2 class="section-heading">Executive Summary</h2>

        <div class="hero-banner">
          <div class="hero-label">Total Annual Value Opportunity</div>
          <div class="hero-value">${formatCurrency(totalAnnualValue)}</div>
          <div class="hero-sub">Value per Million Tokens: ${formatCurrency(valuePerMillionTokens)}</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card" style="border-left: 4px solid ${pillarColors.revenue.text};">
            <div class="kpi-label">Revenue Enhancement</div>
            <div class="kpi-value" style="color: ${pillarColors.revenue.text};">${formatCurrency(totalRevenueBenefit)}</div>
            <div class="kpi-pct">${pctOfTotal(totalRevenueBenefit)} of total value</div>
          </div>
          <div class="kpi-card" style="border-left: 4px solid ${pillarColors.cost.text};">
            <div class="kpi-label">Cost Optimization</div>
            <div class="kpi-value" style="color: ${pillarColors.cost.text};">${formatCurrency(totalCostBenefit)}</div>
            <div class="kpi-pct">${pctOfTotal(totalCostBenefit)} of total value</div>
          </div>
          <div class="kpi-card" style="border-left: 4px solid ${pillarColors.cashflow.text};">
            <div class="kpi-label">Cash Flow Improvement</div>
            <div class="kpi-value" style="color: ${pillarColors.cashflow.text};">${formatCurrency(totalCashFlowBenefit)}</div>
            <div class="kpi-pct">${pctOfTotal(totalCashFlowBenefit)} of total value</div>
          </div>
          <div class="kpi-card" style="border-left: 4px solid ${pillarColors.risk.text};">
            <div class="kpi-label">Risk Mitigation</div>
            <div class="kpi-value" style="color: ${pillarColors.risk.text};">${formatCurrency(totalRiskBenefit)}</div>
            <div class="kpi-pct">${pctOfTotal(totalRiskBenefit)} of total value</div>
          </div>
        </div>

        <div class="subsection">
          <h3 class="subsection-heading">Executive Overview</h3>
          ${splitIntoParagraphs(escapeHtml(narrative))}
        </div>

        ${useCasesHtml}
      </div>
    `;
  };

  // Generate financial sensitivity analysis
  const generateFinancialSensitivity = (): string => {
    const { conservative = {}, moderate = {}, aggressive = {} } = scenarioAnalysis;

    return `
      <div class="section" id="financial-sensitivity">
        <h2 class="section-heading">Financial Sensitivity Analysis</h2>
        <p class="section-intro">Understanding the range of potential outcomes helps frame investment decisions. The three scenarios below model different adoption speeds and organizational readiness levels.</p>

        <div class="scenario-cards">
          <div class="scenario-card scenario-conservative">
            <div class="scenario-header">
              <span class="scenario-pill" style="background: ${colors.neutral100}; color: ${colors.slate};">Conservative</span>
            </div>
            <p class="scenario-desc">Cautious estimate accounting for organizational friction, slower adoption, and extended timelines.</p>
            <div class="scenario-details">
              <div class="scenario-detail"><span class="detail-label">Adoption</span><span class="detail-value">70% of use cases</span></div>
              <div class="scenario-detail"><span class="detail-label">Timeline</span><span class="detail-value">18-month ramp</span></div>
              <div class="scenario-detail"><span class="detail-label">Realization</span><span class="detail-value">75% of baseline</span></div>
            </div>
            <div class="scenario-metrics">
              <div class="scenario-metric">
                <div class="metric-label">Annual Benefit</div>
                <div class="metric-value" style="color: ${colors.slate};">${formatCurrency((conservative as any).annualBenefit || 0)}</div>
              </div>
              <div class="scenario-metric">
                <div class="metric-label">5-Year NPV</div>
                <div class="metric-value" style="color: ${colors.slate};">${formatCurrency((conservative as any).npv || 0)}</div>
              </div>
            </div>
          </div>

          <div class="scenario-card scenario-base">
            <div class="scenario-header">
              <span class="scenario-pill" style="background: ${colors.primary}; color: white;">Base Case</span>
              <span class="recommended-badge">Recommended</span>
            </div>
            <p class="scenario-desc">Expected outcome based on standard implementation practices and normal change management cadence.</p>
            <div class="scenario-details">
              <div class="scenario-detail"><span class="detail-label">Adoption</span><span class="detail-value">85% of use cases</span></div>
              <div class="scenario-detail"><span class="detail-label">Timeline</span><span class="detail-value">12-month ramp</span></div>
              <div class="scenario-detail"><span class="detail-label">Realization</span><span class="detail-value">100% of baseline</span></div>
            </div>
            <div class="scenario-metrics">
              <div class="scenario-metric">
                <div class="metric-label">Annual Benefit</div>
                <div class="metric-value" style="color: ${colors.primary};">${formatCurrency((moderate as any).annualBenefit || 0)}</div>
              </div>
              <div class="scenario-metric">
                <div class="metric-label">5-Year NPV</div>
                <div class="metric-value" style="color: ${colors.primary};">${formatCurrency((moderate as any).npv || 0)}</div>
              </div>
            </div>
          </div>

          <div class="scenario-card scenario-optimistic">
            <div class="scenario-header">
              <span class="scenario-pill" style="background: #DCFCE7; color: ${colors.success};">Optimistic</span>
            </div>
            <p class="scenario-desc">Best-case outcome with strong executive sponsorship, accelerated adoption, and compounding network effects.</p>
            <div class="scenario-details">
              <div class="scenario-detail"><span class="detail-label">Adoption</span><span class="detail-value">95%+ of use cases</span></div>
              <div class="scenario-detail"><span class="detail-label">Timeline</span><span class="detail-value">9-month ramp</span></div>
              <div class="scenario-detail"><span class="detail-label">Realization</span><span class="detail-value">125% of baseline</span></div>
            </div>
            <div class="scenario-metrics">
              <div class="scenario-metric">
                <div class="metric-label">Annual Benefit</div>
                <div class="metric-value" style="color: ${colors.success};">${formatCurrency((aggressive as any).annualBenefit || 0)}</div>
              </div>
              <div class="scenario-metric">
                <div class="metric-label">5-Year NPV</div>
                <div class="metric-value" style="color: ${colors.success};">${formatCurrency((aggressive as any).npv || 0)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="comparison-table-wrap">
          <h3 class="subsection-heading">Scenario Comparison Summary</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th class="text-right">Conservative</th>
                <th class="text-right" style="background: #EFF6FF;">Base Case</th>
                <th class="text-right">Optimistic</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-semibold">Annual Benefit</td>
                <td class="text-right">${formatCurrency((conservative as any).annualBenefit || 0)}</td>
                <td class="text-right font-semibold" style="background: #F8FAFF;">${formatCurrency((moderate as any).annualBenefit || 0)}</td>
                <td class="text-right">${formatCurrency((aggressive as any).annualBenefit || 0)}</td>
              </tr>
              <tr>
                <td class="font-semibold">5-Year NPV</td>
                <td class="text-right">${formatCurrency((conservative as any).npv || 0)}</td>
                <td class="text-right font-semibold" style="background: #F8FAFF;">${formatCurrency((moderate as any).npv || 0)}</td>
                <td class="text-right">${formatCurrency((aggressive as any).npv || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  // Generate value drivers section
  const generateValueDrivers = (): string => {
    const drivers = [
      { label: 'Revenue Growth', value: totalRevenueBenefit, colors: pillarColors.revenue, icon: '&#8599;' },
      { label: 'Cost Reduction', value: totalCostBenefit, colors: pillarColors.cost, icon: '&#8600;' },
      { label: 'Cash Flow Acceleration', value: totalCashFlowBenefit, colors: pillarColors.cashflow, icon: '&#8634;' },
      { label: 'Risk Mitigation', value: totalRiskBenefit, colors: pillarColors.risk, icon: '&#9737;' },
    ];

    return `
      <div class="section" id="value-drivers">
        <h2 class="section-heading">Value Drivers</h2>
        <p class="section-intro">Breakdown of the total value opportunity across four key business impact pillars.</p>
        <div class="driver-grid">
          ${drivers.map(d => `
            <div class="driver-card" style="background: ${d.colors.bg}; border: 1px solid ${d.colors.border};">
              <div class="driver-label" style="color: ${d.colors.text};">${d.label}</div>
              <div class="driver-value" style="color: ${d.colors.text};">${formatCurrency(d.value)}</div>
              <div class="driver-bar-wrap">
                <div class="driver-bar" style="width: ${totalAnnualValue > 0 ? Math.max(2, (d.value / totalAnnualValue) * 100) : 0}%; background: ${d.colors.text};"></div>
              </div>
              <div class="driver-pct" style="color: ${colors.neutral500};">${pctOfTotal(d.value)} of total value</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  // Generate company overview
  const generateCompanyOverview = (): string => {
    const step0 = getStepData(0);
    const content = step0.content || '';

    return `
      <div class="section" id="company-overview">
        <h2 class="section-heading">Company Overview</h2>
        <div class="prose">
          ${splitIntoParagraphs(escapeHtml(content))}
        </div>
      </div>
    `;
  };

  // Generate strategic anchoring table
  const generateStrategicAnchoring = (): string => {
    const step1 = getStepData(1);
    const data = (step1.data as any[]) || [];

    if (!data || data.length === 0) return '';

    return `
      <div class="section" id="strategic-anchoring">
        <h2 class="section-heading">Strategic Anchoring & Business Drivers</h2>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Strategic Theme</th>
                <th>Current State</th>
                <th>Target State</th>
                <th>Primary Driver</th>
                <th>Secondary Driver</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row: any) => `
              <tr>
                <td class="font-semibold">${escapeHtml(row['Strategic Theme'] || '')}</td>
                <td>${escapeHtml(row['Current State'] || '')}</td>
                <td>${escapeHtml(row['Target State'] || '')}</td>
                <td><span class="tag tag-blue">${escapeHtml(row['Primary Driver Impact'] || row['Primary Driver'] || '')}</span></td>
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

    if (!data || data.length === 0) return '';

    return `
      <div class="section" id="business-function">
        <h2 class="section-heading">Business Function Inventory & KPI Baselines</h2>
        <div class="table-wrap scrollable">
          <table class="data-table compact">
            <thead>
              <tr>
                <th>Strategic Theme</th>
                <th>KPI Name</th>
                <th>Function</th>
                <th>Sub-Function</th>
                <th>Baseline</th>
                <th class="text-center">Direction</th>
                <th>Target</th>
                <th>Industry Best</th>
                <th>Overall Best</th>
                <th>Timeframe</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row: any) => `
              <tr>
                <td>${escapeHtml(row['Strategic Theme'] || '')}</td>
                <td class="font-medium">${escapeHtml(row['KPI Name'] || '')}</td>
                <td>${escapeHtml(row['Function'] || '')}</td>
                <td>${escapeHtml(row['Sub-Function'] || '')}</td>
                <td>${escapeHtml(row['Baseline Value'] || '')}</td>
                <td class="text-center font-semibold">${escapeHtml(row['Direction'] || '')}</td>
                <td>${escapeHtml(row['Target Value'] || '')}</td>
                <td class="muted">${escapeHtml(row['Benchmark (Industry Best)'] || '')}</td>
                <td class="muted">${escapeHtml(row['Benchmark (Overall Best)'] || '')}</td>
                <td>${escapeHtml(row['Timeframe'] || '')}</td>
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

    if (!data || data.length === 0) return '';

    // Theme accent colors
    const themeAccents = ['#0339AF', '#059669', '#D97706', '#6366F1', '#DC2626', '#0D9488', '#7C3AED', '#0891B2'];

    const groupedByTheme = data.reduce(
      (acc: any, row: any) => {
        const theme = row['Strategic Theme'] || 'Other';
        if (!acc[theme]) acc[theme] = [];
        acc[theme].push(row);
        return acc;
      },
      {}
    );

    let totalCost = 0;
    let themeIdx = 0;
    const themeHtmls = Object.keys(groupedByTheme)
      .sort()
      .map((theme) => {
        const themeRows = groupedByTheme[theme];
        const themeCost = themeRows.reduce((sum: number, row: any) => {
          const costStr = String(row['Estimated Annual Cost ($)'] || '0').trim();
          const costMatch = costStr.match(/^\$?([\d,.]+)\s*([KkMmBb])?/);
          let cost = 0;
          if (costMatch) {
            const base = parseFloat(costMatch[1].replace(/,/g, ''));
            const s = costMatch[2]?.toUpperCase();
            cost = isNaN(base) ? 0 : s === 'B' ? base * 1e9 : s === 'M' ? base * 1e6 : s === 'K' ? base * 1e3 : base;
          }
          return sum + cost;
        }, 0);
        totalCost += themeCost;
        const accentColor = themeAccents[themeIdx % themeAccents.length];
        themeIdx++;

        return `
          <tr class="theme-group-row">
            <td colspan="7">
              <div class="theme-group-label" style="border-left-color: ${accentColor};">
                <span class="theme-name">${escapeHtml(theme)}</span>
                <span class="theme-cost">${formatCurrency(themeCost)}</span>
              </div>
            </td>
          </tr>
          ${themeRows
            .map(
              (row: any) => `
          <tr>
            <td>${escapeHtml(row['Friction Point'] || '')}</td>
            <td>${escapeHtml(row['Function'] || '')}</td>
            <td>${escapeHtml(row['Sub-Function'] || '')}</td>
            <td>${escapeHtml(row['Role'] || 'N/A')}</td>
            <td class="text-right font-semibold">${formatCurrency(row['Estimated Annual Cost ($)'] || 0)}</td>
            <td class="text-center"><span class="severity-badge severity-${String(row['Severity'] || '').toLowerCase()}">${escapeHtml(row['Severity'] || '')}</span></td>
            <td>${escapeHtml(row['Primary Driver Impact'] || '')}</td>
          </tr>
        `
            )
            .join('')}
        `;
      })
      .join('');

    return `
      <div class="section" id="friction-mapping">
        <h2 class="section-heading">Friction Point Mapping</h2>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Friction Point</th>
                <th>Function</th>
                <th>Sub-Function</th>
                <th>Role</th>
                <th class="text-right">Annual Cost</th>
                <th class="text-center">Severity</th>
                <th>Primary Driver</th>
              </tr>
            </thead>
            <tbody>
              ${themeHtmls}
              <tr class="total-row">
                <td colspan="4" class="text-right font-bold">Total Annual Friction</td>
                <td class="text-right font-bold" style="color: ${colors.error};">${formatCurrency(totalCost)}</td>
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

    if (!data || data.length === 0) return '';

    return `
      <div class="section" id="use-cases">
        <h2 class="section-heading">AI Use Case Generation</h2>
        <div class="table-wrap scrollable">
          <table class="data-table compact">
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
                  (row: any) => `
              <tr>
                <td class="font-semibold">${escapeHtml(row['ID'] || '')}</td>
                <td class="font-medium">${escapeHtml(row['Use Case Name'] || row['Use Case'] || '')}</td>
                <td class="desc-cell">${escapeHtml(row['Description'] || '')}</td>
                <td class="desc-cell">${escapeHtml(row['Target Friction'] || '')}</td>
                <td class="desc-cell">${escapeHtml(row['AI Primitives'] || '')}</td>
                <td class="desc-cell">${escapeHtml(row['Human-in-the-Loop Checkpoint'] || '')}</td>
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

    if (!data || data.length === 0) return '';

    return `
      <div class="section" id="benefits">
        <h2 class="section-heading">Benefits Quantification by Driver</h2>

        <div class="formula-grid">
          <div class="formula-card" style="border-left-color: ${pillarColors.cost.text};">
            <div class="formula-title">Cost Benefit</div>
            <p class="formula-text">Hours Saved &times; Hourly Rate &times; Benefits Loading &times; Adoption Rate &times; Data Maturity</p>
            <p class="formula-note">Applies 1.35&times; employer loading; conservative adoption &amp; data readiness factors</p>
          </div>
          <div class="formula-card" style="border-left-color: ${pillarColors.revenue.text};">
            <div class="formula-title">Revenue Benefit</div>
            <p class="formula-text">Revenue Uplift % &times; Revenue at Risk &times; Realization Factor &times; Data Maturity</p>
            <p class="formula-note">Market-tested conversion assumptions; reflects gradual adoption curves</p>
          </div>
          <div class="formula-card" style="border-left-color: ${pillarColors.cashflow.text};">
            <div class="formula-title">Cash Flow Benefit</div>
            <p class="formula-text">Annual Revenue &times; (Days Improved / 365) &times; Cost of Capital &times; Realization Factor</p>
            <p class="formula-note">Working capital release at 8% cost of capital; applies to inventory reduction</p>
          </div>
          <div class="formula-card" style="border-left-color: ${pillarColors.risk.text};">
            <div class="formula-title">Probability Weight</div>
            <p class="formula-text">Expected Value = Annual Benefit &times; Probability of Success</p>
            <p class="formula-note">Weighted by implementation confidence and market maturity of AI capability</p>
          </div>
        </div>

        <div class="table-wrap scrollable">
          <table class="data-table compact">
            <thead>
              <tr>
                <th>ID</th>
                <th>Use Case</th>
                <th class="text-right">Cost Benefit</th>
                <th class="text-right">Revenue Benefit</th>
                <th class="text-right">Cash Flow</th>
                <th class="text-right">Risk Benefit</th>
                <th class="text-right">Total Annual Value</th>
                <th class="text-center">Prob. Success</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row: any) => `
              <tr>
                <td class="font-semibold">${escapeHtml(row['ID'] || '')}</td>
                <td class="font-medium">${escapeHtml(row['Use Case'] || '')}</td>
                <td class="text-right">${formatCurrency(row['Cost Benefit ($)'] || 0)}</td>
                <td class="text-right" style="color: ${pillarColors.revenue.text};">${formatCurrency(row['Revenue Benefit ($)'] || 0)}</td>
                <td class="text-right" style="color: ${pillarColors.cashflow.text};">${formatCurrency(row['Cash Flow Benefit ($)'] || 0)}</td>
                <td class="text-right">${formatCurrency(row['Risk Benefit ($)'] || 0)}</td>
                <td class="text-right font-bold" style="color: ${colors.primary};">${formatCurrency(row['Total Annual Value ($)'] || 0)}</td>
                <td class="text-center">${((row['Probability of Success'] || 0) * 100).toFixed(0)}%</td>
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

    if (!data || data.length === 0) return '';

    return `
      <div class="section" id="effort-tokens">
        <h2 class="section-heading">Feasibility & Token Modeling</h2>
        <div class="table-wrap scrollable">
          <table class="data-table compact">
            <thead>
              <tr>
                <th>ID</th>
                <th>Use Case</th>
                <th class="text-center">Feasibility</th>
                <th class="text-center">Org Capacity</th>
                <th class="text-center">Data Quality</th>
                <th class="text-center">Tech Infra</th>
                <th class="text-center">Governance</th>
                <th class="text-center">TTV (mo)</th>
                <th class="text-right">Monthly Tokens</th>
                <th class="text-right">Runs/Mo</th>
                <th class="text-right">Input/Run</th>
                <th class="text-right">Output/Run</th>
                <th class="text-right">Annual Cost</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row: any) => `
              <tr>
                <td class="font-semibold">${escapeHtml(row['ID'] || '')}</td>
                <td class="font-medium">${escapeHtml(row['Use Case'] || row['Use Case Name'] || '')}</td>
                <td class="text-center"><span class="score-pill">${row['Feasibility Score'] || row['Effort Score'] || '–'}</span></td>
                <td class="text-center"><span class="score-circle">${row['Organizational Capacity'] || row['Change Mgmt'] || '–'}</span></td>
                <td class="text-center"><span class="score-circle">${row['Data Availability & Quality'] || row['Data Readiness'] || '–'}</span></td>
                <td class="text-center"><span class="score-circle">${row['Technical Infrastructure'] || row['Integration Complexity'] || '–'}</span></td>
                <td class="text-center"><span class="score-circle">${row['Governance'] || '–'}</span></td>
                <td class="text-center">${row['Time To Value'] || row['Time-to-Value'] || '–'}</td>
                <td class="text-right">${formatNumber(row['Monthly Tokens'] || 0)}</td>
                <td class="text-right">${formatNumber(row['Runs/Month'] || 0)}</td>
                <td class="text-right">${formatNumber(row['Input Tokens/Run'] || 0)}</td>
                <td class="text-right">${formatNumber(row['Output Tokens/Run'] || 0)}</td>
                <td class="text-right font-semibold">${escapeHtml(row['Annual Token Cost'] || '–')}</td>
              </tr>
            `
                )
                .join('')}
            </tbody>
          </table>
        </div>
        <p class="table-footnote">
          Scoring Scale: All components scored 1&ndash;10 (weighted: Org Capacity 30%, Data Quality 30%, Tech Infra 20%, Governance 20%) |
          TTV = Time-to-Value in months | Token costs at $3/1M input, $15/1M output
        </p>
      </div>
    `;
  };

  // Generate priority scoring & roadmap
  const generatePriorityScoringRoadmap = (): string => {
    const step7 = getStepData(7);
    const data = (step7.data as any[]) || [];

    if (!data || data.length === 0) return '';

    return `
      <div class="section" id="priority-roadmap">
        <h2 class="section-heading">Priority Scoring & Roadmap</h2>
        <div class="table-wrap scrollable">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Use Case</th>
                <th>Priority Tier</th>
                <th>Recommended Phase</th>
                <th class="text-center">Priority Score</th>
                <th class="text-center">Feasibility Score</th>
                <th class="text-center">Value Score</th>
                <th class="text-center">TTV Score</th>
                <th>Strategic Theme</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row: any) => `
              <tr>
                <td class="font-semibold">${escapeHtml(row['ID'] || '')}</td>
                <td class="font-medium">${escapeHtml(row['Use Case'] || '')}</td>
                <td>${escapeHtml(row['Priority Tier'] || '')}</td>
                <td><span class="tag tag-sky">${escapeHtml(row['Recommended Phase'] || '')}</span></td>
                <td class="text-center"><span class="score-pill">${row['Priority Score'] || row['Priority Score (0-100)'] || 0}</span></td>
                <td class="text-center">${row['Feasibility Score'] || '–'}</td>
                <td class="text-center">${row['Value Score'] || row['Value Score (0-40)'] || 0}</td>
                <td class="text-center">${row['TTV Score'] || row['TTV Score (0-30)'] || 0}</td>
                <td>${escapeHtml(row['Strategic Theme'] || '')}</td>
              </tr>
            `
                )
                .join('')}
            </tbody>
          </table>
        </div>
        <p class="table-footnote">
          Priority Score = (Feasibility &times; 0.5) + (Normalized Value &times; 0.5) on 1&ndash;10 scale |
          Tiers: Champions (&ge;7), Quick Wins, Strategic, Foundation
        </p>
      </div>
    `;
  };

  // Generate appendix
  const generateAppendix = (): string => {
    return `
      <div class="section" id="appendix">
        <h2 class="section-heading">Appendix</h2>

        <div class="appendix-block">
          <h3 class="subsection-heading">Standardized Roles & Labor Rates</h3>
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
              <tr>
                <td>Store Associates</td>
                <td>$15–$22</td>
                <td>1.35&times;</td>
                <td>$100/hr</td>
              </tr>
              <tr>
                <td>Professional Services / Sales</td>
                <td>$35–$45</td>
                <td>1.35&times;</td>
                <td>$150/hr</td>
              </tr>
              <tr>
                <td>Merchandising / Supply Chain Analysts</td>
                <td>$40–$52</td>
                <td>1.35&times;</td>
                <td>$175/hr</td>
              </tr>
            </tbody>
          </table>
          <p class="table-footnote">
            Benefits loading (1.35&times;) includes payroll taxes, health insurance, retirement, PTO, and overhead allocation per BlueAlly methodology.
          </p>
        </div>

        <div class="appendix-block">
          <h3 class="subsection-heading">Methodology & Assumptions</h3>

          <p style="margin-bottom: 12px;"><strong>Probability of Success (0.50&ndash;0.95):</strong> Confidence that the use case will deliver projected value at production scale. Derived from maturity of underlying AI technology, availability of training data, organizational readiness, and market precedent. A conversation AI returning 0.85 reflects proven technology; a novel predictive model at 0.60 reflects emerging capability.</p>

          <p style="margin-bottom: 12px;"><strong>Realization Factor (0.80&ndash;0.95):</strong> The fraction of theoretical benefit that survives contact with operational reality. Accounts for adoption lag, process friction, and measurement imprecision. Revenue benefits carry 0.95 (most measurable). Risk benefits carry 0.80 (most uncertain, actuarial nature).</p>

          <p style="margin-bottom: 12px;"><strong>Adoption Rate (0.75&ndash;0.95):</strong> The percentage of eligible users and processes that will adopt the AI solution within the measurement period. Reflects change management readiness, training investment, and cultural fit.</p>

          <p style="margin-bottom: 12px;"><strong>Data Maturity (0.60&ndash;1.00):</strong> Organizational data quality and accessibility scaled from Level 1 (ad-hoc, 0.60) to Level 5 (optimizing, 1.00). Most organizations assess at Level 2 (0.75). Derived from data governance maturity, system integration level, and data quality metrics.</p>

          <p style="margin-bottom: 12px;"><strong>Value Normalization (1&ndash;10):</strong> Min-max normalization across all use cases: Score = 1 + ((Value &minus; Min) / (Max &minus; Min)) &times; 9. Ensures relative comparison is deterministic and scales dynamically with report data.</p>

          <p style="margin-bottom: 12px;"><strong>Feasibility Score (1&ndash;10):</strong> Weighted composite of four components: Organizational Capacity (30%), Data Availability &amp; Quality (30%), Technical Infrastructure (20%), and AI-Specific Governance (20%). Each component scored 1&ndash;10 based on organizational assessment.</p>

          <p style="margin-bottom: 12px;"><strong>Priority Score (1&ndash;10):</strong> Equal-weighted average of Feasibility Score and Normalized Value Score: (Feasibility &times; 0.5) + (Value &times; 0.5). Determines tier placement: Champions (&ge;7.5), Quick Wins, Strategic, or Foundation.</p>

          <h4 style="margin: 16px 0 8px; font-size: 14px;">Standard Benefit Formulas</h4>
          <ul class="assumption-list">
            <li><strong>Cost Benefit:</strong> Hours Saved &times; Loaded Hourly Rate &times; Benefits Loading (1.35&times;) &times; Adoption Rate &times; Data Maturity</li>
            <li><strong>Revenue Benefit:</strong> Revenue Uplift % &times; Revenue at Risk &times; Realization Factor &times; Data Maturity</li>
            <li><strong>Cash Flow Benefit:</strong> Annual Revenue &times; (Days Improved / 365) &times; Cost of Capital &times; Realization Factor</li>
            <li><strong>Risk Benefit:</strong> Risk Reduction % &times; Risk Exposure &times; Realization Factor &times; Data Maturity</li>
            <li><strong>Expected Value:</strong> Total Annual Benefit &times; Probability of Success</li>
          </ul>

          <h4 style="margin: 16px 0 8px; font-size: 14px;">Additional Assumptions</h4>
          <ul class="assumption-list">
            <li><strong>Cost of Capital:</strong> 8% applied to working capital improvements per company WACC proxy</li>
            <li><strong>Token Modeling:</strong> Based on Claude API pricing ($3/1M input, $15/1M output); actual costs scale with usage patterns</li>
            <li><strong>TTV Bubble Sizing:</strong> Score = 1 &minus; MIN(TTV/12, 1). Shorter time-to-value produces larger bubbles on the matrix chart.</li>
          </ul>
        </div>

        <div class="appendix-block">
          <h3 class="subsection-heading">Recommended Next Steps</h3>
          <div class="next-steps-card">
            <h4>Drive Implementation Forward</h4>
            <p>BlueAlly recommends a facilitated workshop with cross-functional leadership to:</p>
            <ul class="next-steps-list">
              <li>Validate use case prioritization and sequencing against strategic roadmap</li>
              <li>Assign executive sponsors and establish governance structures</li>
              <li>Confirm data access, system integration, and change management approach</li>
              <li>Define success metrics and establish baseline tracking</li>
            </ul>
            <div class="contact-box">
              <strong>Contact BlueAlly</strong> to arrange a facilitated workshop and begin a 90-day sprint toward implementation readiness. Typical engagement: 2-week strategy alignment + 4-week pilot design.
            </div>
          </div>
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* ===== RESET & BASE ===== */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    html { font-size: 15px; scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: ${colors.neutral700};
      line-height: 1.65;
      background: ${colors.white};
    }

    .report-container { max-width: 960px; margin: 0 auto; }

    @media screen {
      body { background: ${colors.neutral100}; padding: 24px; }
      .report-container {
        background: ${colors.white};
        box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04);
        border-radius: 12px;
        overflow: hidden;
      }
    }

    /* ===== COVER PAGE ===== */
    .cover-page {
      background: ${colors.white};
      padding: 80px 60px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      position: relative;
      border-bottom: 4px solid ${colors.primary};
      page-break-after: always;
    }

    .cover-page::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, ${colors.primary} 0%, ${colors.accent} 50%, ${colors.sky} 100%);
    }

    .cover-brand {
      margin-bottom: 16px;
    }

    .cover-tagline {
      font-size: 13px;
      font-weight: 500;
      color: ${colors.neutral400};
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 64px;
    }

    .cover-divider {
      width: 48px;
      height: 2px;
      background: ${colors.primary};
      margin: 0 auto 48px;
    }

    .cover-title {
      font-size: 42px;
      font-weight: 700;
      color: ${colors.navy};
      line-height: 1.15;
      margin-bottom: 12px;
      letter-spacing: -1px;
    }

    .cover-company {
      font-size: 42px;
      font-weight: 700;
      color: ${colors.primary};
      margin-bottom: 32px;
      letter-spacing: -1px;
    }

    .cover-value {
      display: inline-block;
      font-size: 20px;
      font-weight: 600;
      color: ${colors.primary};
      background: #EFF6FF;
      padding: 12px 32px;
      border-radius: 8px;
      border: 1px solid #BFDBFE;
      margin-bottom: 80px;
    }

    .cover-meta {
      font-size: 13px;
      color: ${colors.neutral400};
      line-height: 2;
    }

    .cover-confidential {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      color: ${colors.neutral400};
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 8px 20px;
      border: 1px solid ${colors.neutral200};
      border-radius: 6px;
      margin-top: 16px;
    }

    /* ===== TABLE OF CONTENTS ===== */
    .toc-section { padding: 48px 60px; background: ${colors.neutral50}; }

    .toc-nav { margin-top: 24px; }

    .toc-item {
      display: flex;
      align-items: baseline;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid ${colors.neutral200};
      text-decoration: none;
      color: ${colors.neutral700};
      transition: color 0.15s;
    }

    .toc-item:hover { color: ${colors.primary}; }

    .toc-num {
      font-size: 12px;
      font-weight: 600;
      color: ${colors.primary};
      min-width: 24px;
    }

    .toc-title { font-size: 14px; font-weight: 500; }

    .toc-dots { flex: 1; border-bottom: 1px dotted ${colors.neutral300}; margin: 0 8px; min-width: 40px; }

    /* ===== SECTIONS ===== */
    .section { padding: 48px 60px; border-bottom: 1px solid ${colors.neutral200}; }
    .section:last-child { border-bottom: none; }

    .section-heading {
      font-size: 24px;
      font-weight: 700;
      color: ${colors.navy};
      padding-left: 16px;
      border-left: 4px solid ${colors.primary};
      margin-bottom: 24px;
      letter-spacing: -0.3px;
    }

    .section-intro {
      font-size: 14px;
      color: ${colors.neutral500};
      margin-bottom: 28px;
      line-height: 1.7;
      max-width: 680px;
    }

    .subsection { margin-top: 32px; }

    .subsection-heading {
      font-size: 16px;
      font-weight: 700;
      color: ${colors.navy};
      margin-bottom: 16px;
    }

    /* ===== HERO BANNER ===== */
    .hero-banner {
      background: ${colors.navy};
      color: ${colors.white};
      padding: 32px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 28px;
    }

    .hero-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      opacity: 0.8;
      margin-bottom: 8px;
    }

    .hero-value {
      font-size: 48px;
      font-weight: 700;
      letter-spacing: -1px;
      margin-bottom: 4px;
    }

    .hero-sub {
      font-size: 13px;
      opacity: 0.7;
    }

    /* ===== KPI CARDS ===== */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }

    .kpi-card {
      background: ${colors.white};
      border: 1px solid ${colors.neutral200};
      border-radius: 12px;
      padding: 20px;
    }

    .kpi-label {
      font-size: 11px;
      font-weight: 600;
      color: ${colors.neutral500};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .kpi-value {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 4px;
      letter-spacing: -0.5px;
    }

    .kpi-pct {
      font-size: 12px;
      color: ${colors.neutral400};
    }

    /* ===== SCENARIO CARDS ===== */
    .scenario-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }

    .scenario-card {
      background: ${colors.white};
      border: 1px solid ${colors.neutral200};
      border-radius: 12px;
      padding: 24px;
    }

    .scenario-conservative { background: ${colors.neutral50}; }
    .scenario-base {
      background: #F8FAFF;
      border: 2px solid ${colors.primary};
      box-shadow: 0 0 0 3px rgba(3, 57, 175, 0.08);
    }
    .scenario-optimistic { background: #F0FDF4; border-color: #BBF7D0; }

    .scenario-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .scenario-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 100px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .recommended-badge {
      font-size: 10px;
      font-weight: 600;
      color: ${colors.primary};
      background: #DBEAFE;
      padding: 2px 8px;
      border-radius: 100px;
    }

    .scenario-desc {
      font-size: 13px;
      color: ${colors.neutral500};
      margin-bottom: 16px;
      line-height: 1.5;
    }

    .scenario-details {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid ${colors.neutral200};
    }

    .scenario-detail {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }

    .detail-label {
      font-size: 12px;
      color: ${colors.neutral400};
      font-weight: 500;
    }

    .detail-value {
      font-size: 12px;
      color: ${colors.neutral700};
      font-weight: 600;
    }

    .scenario-metrics {}

    .scenario-metric {
      padding: 8px 0;
    }

    .metric-label {
      font-size: 11px;
      font-weight: 500;
      color: ${colors.neutral400};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .metric-value {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    /* ===== VALUE DRIVERS ===== */
    .driver-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .driver-card {
      padding: 24px;
      border-radius: 12px;
    }

    .driver-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .driver-value {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
    }

    .driver-bar-wrap {
      height: 4px;
      background: rgba(0,0,0,0.06);
      border-radius: 2px;
      margin-bottom: 8px;
      overflow: hidden;
    }

    .driver-bar {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s;
    }

    .driver-pct {
      font-size: 12px;
    }

    /* ===== TABLES ===== */
    .table-wrap {
      overflow-x: auto;
      margin: 20px 0;
      border-radius: 8px;
      border: 1px solid ${colors.neutral200};
    }

    .table-wrap.scrollable {
      max-height: 600px;
      overflow-y: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .data-table.compact { font-size: 12px; }

    .data-table thead {
      background: ${colors.neutral50};
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .data-table th {
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      color: ${colors.neutral500};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid ${colors.neutral200};
      white-space: nowrap;
    }

    .data-table td {
      padding: 10px 16px;
      border-bottom: 1px solid ${colors.neutral100};
      color: ${colors.neutral700};
    }

    .data-table tbody tr:nth-child(even) { background: ${colors.neutral50}; }
    .data-table tbody tr:hover { background: #F1F5F9; }

    .desc-cell { font-size: 12px; max-width: 220px; color: ${colors.neutral600}; }

    /* Theme group rows */
    .theme-group-row td { padding: 0; border-bottom: none; background: transparent !important; }
    .theme-group-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      margin: 8px 0 2px;
      border-left: 4px solid ${colors.primary};
      background: ${colors.neutral50};
      border-radius: 0 6px 6px 0;
    }
    .theme-name { font-weight: 700; font-size: 13px; color: ${colors.navy}; }
    .theme-cost { font-weight: 700; font-size: 13px; color: ${colors.error}; }

    .total-row td {
      padding: 14px 16px;
      border-top: 2px solid ${colors.neutral300};
      background: ${colors.neutral50} !important;
    }

    .comparison-table-wrap { margin-top: 28px; }

    /* ===== TAGS & BADGES ===== */
    .tag {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 600;
    }

    .tag-blue { background: #EFF6FF; color: ${colors.primary}; }
    .tag-sky { background: #E0F7FF; color: #0077AA; }

    .severity-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 100px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .severity-critical { background: #FEE2E2; color: ${colors.error}; }
    .severity-high { background: #FEF3C7; color: #92400E; }
    .severity-medium { background: ${colors.neutral100}; color: ${colors.neutral600}; }
    .severity-low { background: #F0FDF4; color: ${colors.success}; }

    .score-pill {
      display: inline-block;
      background: ${colors.navy};
      color: ${colors.white};
      padding: 3px 12px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 700;
    }

    .score-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: ${colors.neutral100};
      color: ${colors.neutral700};
      font-size: 11px;
      font-weight: 700;
    }

    /* ===== FORMULA CARDS ===== */
    .formula-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }

    .formula-card {
      background: ${colors.white};
      padding: 20px;
      border-radius: 8px;
      border: 1px solid ${colors.neutral200};
      border-left: 4px solid ${colors.primary};
    }

    .formula-title {
      font-weight: 700;
      color: ${colors.navy};
      margin-bottom: 6px;
      font-size: 13px;
    }

    .formula-text { font-size: 12px; color: ${colors.neutral700}; margin-bottom: 4px; }
    .formula-note { font-size: 11px; color: ${colors.neutral400}; margin-bottom: 0; }

    /* ===== BODY TEXT ===== */
    .body-text {
      font-size: 14px;
      color: ${colors.neutral600};
      line-height: 1.8;
    }

    .prose p { margin-bottom: 16px; font-size: 14px; color: ${colors.neutral600}; line-height: 1.8; }

    .table-footnote {
      margin-top: 16px;
      font-size: 12px;
      color: ${colors.neutral400};
      line-height: 1.6;
    }

    /* ===== APPENDIX ===== */
    .appendix-block { margin-bottom: 36px; }

    .assumption-list {
      list-style: none;
      margin: 0;
    }

    .assumption-list li {
      padding: 10px 0;
      border-bottom: 1px solid ${colors.neutral100};
      font-size: 13px;
      color: ${colors.neutral600};
      line-height: 1.7;
    }

    .assumption-list li:last-child { border-bottom: none; }

    .next-steps-card {
      background: ${colors.neutral50};
      border: 1px solid ${colors.neutral200};
      border-radius: 12px;
      padding: 28px;
    }

    .next-steps-card h4 {
      font-size: 16px;
      font-weight: 700;
      color: ${colors.navy};
      margin-bottom: 12px;
    }

    .next-steps-card p { font-size: 14px; color: ${colors.neutral600}; margin-bottom: 16px; }

    .next-steps-list {
      margin: 0 0 20px 20px;
      color: ${colors.neutral600};
      font-size: 13px;
      line-height: 2;
    }

    .contact-box {
      background: ${colors.white};
      border: 1px solid ${colors.neutral200};
      border-left: 4px solid ${colors.success};
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      color: ${colors.neutral600};
    }

    /* ===== FOOTER ===== */
    .report-footer {
      text-align: center;
      padding: 32px 60px;
      border-top: 1px solid ${colors.neutral200};
      background: ${colors.neutral50};
    }

    .footer-brand {
      margin-bottom: 8px;
    }

    .footer-text {
      font-size: 12px;
      color: ${colors.neutral400};
      line-height: 1.8;
    }

    /* ===== UTILITY CLASSES ===== */
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .muted { color: ${colors.neutral400}; font-size: 12px; }

    /* ===== PRINT ===== */
    @media print {
      @page { size: letter; margin: 0.5in; }
      body { background: white; padding: 0; font-size: 10pt; }
      .report-container { max-width: 100%; box-shadow: none; border-radius: 0; }
      .section { page-break-inside: avoid; padding: 32px 0; }
      .cover-page { min-height: auto; padding: 48px 0; }
      .data-table { page-break-inside: avoid; }
      .table-wrap.scrollable { max-height: none; overflow: visible; }
      a { color: inherit; text-decoration: none; }
      .scenario-cards { page-break-inside: avoid; }
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 768px) {
      .section { padding: 32px 24px; }
      .toc-section { padding: 32px 24px; }
      .cover-page { padding: 48px 24px; }
      .cover-title, .cover-company { font-size: 28px; }
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .scenario-cards { grid-template-columns: 1fr; }
      .driver-grid { grid-template-columns: 1fr; }
      .formula-grid { grid-template-columns: 1fr; }
      .hero-value { font-size: 36px; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Cover Page -->
    <div class="cover-page">
      <div>
        <div class="cover-brand"><img src="https://www.blueally.com/wp-content/uploads/2023/11/blue-header-logo.png" alt="BlueAlly" style="height: 40px; width: auto;" /></div>
        <div class="cover-tagline">AI Strategic Assessment</div>
        <div class="cover-divider"></div>
        <div class="cover-title">AI Value Assessment for</div>
        <div class="cover-company">${escapeHtml(companyName)}</div>
        <div class="cover-value">Total Value Opportunity: ${formatCurrency(totalAnnualValue)}</div>
      </div>
      <div>
        <div class="cover-meta">
          ${formattedDate}<br>
          Prepared by BlueAlly AI Consulting
        </div>
        <div class="cover-confidential">Confidential & Proprietary</div>
      </div>
    </div>

    <!-- Table of Contents -->
    ${generateTableOfContents()}

    <!-- Main Content -->
    ${generateExecutiveSummary()}
    ${generateFinancialSensitivity()}
    ${generateValueDrivers()}
    ${generateCompanyOverview()}
    ${generateStrategicAnchoring()}
    ${generateBusinessFunctionInventory()}
    ${generateFrictionMapping()}
    ${generateUseCasesTable()}
    ${generateBenefitsQuantification()}
    ${generateEffortTokenModeling()}
    ${generatePriorityScoringRoadmap()}
    ${generateAppendix()}

    <!-- Footer -->
    <div class="report-footer">
      <div class="footer-brand"><img src="https://www.blueally.com/wp-content/uploads/2023/11/blue-header-logo.png" alt="BlueAlly" style="height: 24px; width: auto;" /></div>
      <div class="footer-text">
        &copy; ${new Date().getFullYear()} BlueAlly. Confidential &amp; Proprietary.<br>
        This assessment contains forward-looking projections and assumptions subject to substantial business and market risks.
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}
