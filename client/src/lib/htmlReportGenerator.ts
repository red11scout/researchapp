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
    },
  } = reportData;

  const {
    steps = [],
    executiveDashboard = {},
    summary = '',
  } = analysisData;

  const {
    totalRevenueBenefit = 0,
    totalCostBenefit = 0,
    totalCashFlowBenefit = 0,
    totalRiskBenefit = 0,
    totalAnnualValue = 0,
    topUseCases = [],
  } = executiveDashboard;

  // Helper function to format currency
  const formatCurrency = (value: number | string): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '$0';

    if (numValue >= 1_000_000) {
      return `$${(numValue / 1_000_000).toFixed(1)}M`;
    }
    if (numValue >= 1_000) {
      return `$${(numValue / 1_000).toFixed(1)}K`;
    }
    return `$${numValue.toFixed(0)}`;
  };

  // Helper function to escape HTML
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Generate metric card with left border color
  const generateMetricCard = (
    title: string,
    value: number | string,
    borderColor: string
  ): string => {
    const formattedValue = formatCurrency(value);
    return `
      <div class="metric-card" style="border-left: 4px solid ${borderColor};">
        <div class="metric-label">${title}</div>
        <div class="metric-value">${formattedValue}</div>
      </div>
    `;
  };

  // Generate use case table
  const generateUseCasesTable = (): string => {
    if (!topUseCases || topUseCases.length === 0) {
      return '';
    }

    const rows = topUseCases
      .map(
        (useCase: any, index: number) => `
      <tr class="${index % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="use-case-name">${escapeHtml(useCase.name || '')}</td>
        <td class="use-case-score">${useCase.priorityScore?.toFixed(1) || 'N/A'}</td>
        <td class="use-case-value">${formatCurrency(useCase.annualValue || 0)}</td>
        <td class="use-case-tokens">${useCase.monthlyTokens?.toLocaleString() || 'N/A'}</td>
      </tr>
    `
      )
      .join('');

    return `
      <div class="use-cases-container page-break-section">
        <h2>Top Use Cases</h2>
        <table class="use-cases-table">
          <thead>
            <tr>
              <th>Use Case</th>
              <th>Priority Score</th>
              <th>Annual Value</th>
              <th>Monthly Tokens</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  };

  // Generate value drivers section
  const generateValueDrivers = (): string => {
    const drivers = [
      {
        title: 'Revenue Enhancement',
        value: totalRevenueBenefit,
        description: 'New revenue streams and market expansion opportunities',
      },
      {
        title: 'Cost Optimization',
        value: totalCostBenefit,
        description: 'Operational efficiency and resource optimization',
      },
      {
        title: 'Cash Flow Improvement',
        value: totalCashFlowBenefit,
        description: 'Working capital optimization and liquidity enhancement',
      },
      {
        title: 'Risk Mitigation',
        value: totalRiskBenefit,
        description: 'Risk reduction and enhanced business resilience',
      },
    ];

    const activeDrivers = drivers.filter((d) => d.value > 0);

    if (activeDrivers.length === 0) {
      return '';
    }

    const driversHtml = activeDrivers
      .map(
        (driver) => `
      <div class="driver-card">
        <h4>${driver.title}</h4>
        <div class="driver-value">${formatCurrency(driver.value)}</div>
        <p>${driver.description}</p>
      </div>
    `
      )
      .join('');

    return `
      <div class="drivers-container page-break-section">
        <h2>Value Drivers</h2>
        <div class="drivers-grid">
          ${driversHtml}
        </div>
      </div>
    `;
  };

  // Generate detailed steps sections
  const generateDetailedSteps = (): string => {
    return steps
      .map((step: any, index: number) => {
        let stepContent = `
      <div class="step-section page-break-section">
        <h2>${escapeHtml(step.title || `Step ${index + 1}`)}</h2>
    `;

        // Add step number/identifier
        if (step.step) {
          stepContent += `<p class="step-identifier">Step: ${escapeHtml(step.step)}</p>`;
        }

        // Add data table if available
        if (step.data && Array.isArray(step.data) && step.data.length > 0) {
          stepContent += generateDataTable(step.data);
        }

        // Add content text if available
        if (step.content) {
          stepContent += `
        <div class="step-content">
          ${formatStepContent(step.content)}
        </div>
      `;
        }

        stepContent += '</div>';
        return stepContent;
      })
      .join('');
  };

  // Helper to format step content (handle text and potential HTML)
  const formatStepContent = (content: string): string => {
    if (!content) return '';

    // If content contains markdown-like formatting or plain text, wrap in paragraphs
    const paragraphs = content
      .split('\n\n')
      .filter((p) => p.trim())
      .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
      .join('');

    return paragraphs || `<p>${escapeHtml(content)}</p>`;
  };

  // Helper to generate data table
  const generateDataTable = (data: any[]): string => {
    if (!data || data.length === 0) return '';

    const firstItem = data[0];
    const columns = Object.keys(firstItem);

    const headerRow = columns
      .map((col) => `<th>${escapeHtml(col)}</th>`)
      .join('');

    const bodyRows = data
      .map(
        (row: any, idx: number) => `
      <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
        ${columns
          .map((col) => {
            let cellValue = row[col];
            // Format numbers as currency if they look like monetary values
            if (
              typeof cellValue === 'number' &&
              col.toLowerCase().includes('value')
            ) {
              cellValue = formatCurrency(cellValue);
            }
            return `<td>${escapeHtml(String(cellValue || ''))}</td>`;
          })
          .join('')}
      </tr>
    `
      )
      .join('');

    return `
      <table class="data-table">
        <thead>
          <tr>${headerRow}</tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    `;
  };

  // Generate executive summary section
  const generateExecutiveSummary = (): string => {
    if (!summary) return '';

    return `
      <div class="executive-summary page-break-section">
        <h2>Executive Summary</h2>
        <div class="summary-content">
          ${formatStepContent(summary)}
        </div>
      </div>
    `;
  };

  // Build the complete HTML document
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(companyName)} - BlueAlly AI Strategic Assessment</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @media print {
      @page {
        size: letter;
        margin: 0.5in;
      }

      body {
        font-size: 11pt;
      }

      .page-break-section {
        page-break-inside: avoid;
        page-break-after: always;
      }

      .page-break-section:last-child {
        page-break-after: auto;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      table {
        page-break-inside: avoid;
      }
    }

    @media screen {
      body {
        padding: 20px;
        background-color: #f5f7fa;
      }

      .report-container {
        background-color: white;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        overflow: hidden;
      }
    }

    html {
      font-size: 16px;
    }

    body {
      font-family: 'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1f2937;
      line-height: 1.6;
      background-color: white;
    }

    .report-container {
      max-width: 900px;
      margin: 0 auto;
    }

    /* Cover Page */
    .cover-page {
      page-break-after: always;
      padding: 60px 40px;
      background: linear-gradient(135deg, #0339AF 0%, #0256A8 100%);
      color: white;
      text-align: center;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }

    .cover-page::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 300px;
      height: 300px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 50%;
      transform: translate(100px, -100px);
    }

    .cover-page::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 250px;
      height: 250px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 50%;
      transform: translate(-80px, 80px);
    }

    .cover-content {
      position: relative;
      z-index: 1;
    }

    .blueally-logo {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 40px;
      text-transform: uppercase;
    }

    .blueally-tagline {
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 1px;
      opacity: 0.9;
      margin-bottom: 60px;
      text-transform: uppercase;
    }

    .cover-title {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 20px;
      line-height: 1.2;
    }

    .cover-company {
      font-size: 32px;
      font-weight: 600;
      margin-bottom: 60px;
    }

    .cover-footer {
      font-size: 14px;
      margin-top: 40px;
    }

    .confidential-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-top: 30px;
    }

    /* Main Content */
    .content {
      padding: 40px;
    }

    h1 {
      font-size: 32px;
      color: #0339AF;
      margin-bottom: 30px;
      font-weight: 700;
    }

    h2 {
      font-size: 24px;
      color: #0339AF;
      margin-bottom: 20px;
      font-weight: 700;
      margin-top: 30px;
    }

    h3 {
      font-size: 18px;
      color: #1f2937;
      margin-bottom: 12px;
      font-weight: 600;
    }

    h4 {
      font-size: 16px;
      color: #374151;
      margin-bottom: 10px;
      font-weight: 600;
    }

    p {
      margin-bottom: 12px;
      color: #4b5563;
      font-size: 14px;
    }

    /* Metrics Dashboard */
    .executive-dashboard {
      margin-bottom: 30px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .metric-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      transition: all 0.2s ease;
    }

    @media screen {
      .metric-card {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .metric-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }
    }

    .metric-label {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #0339AF;
    }

    /* Value Drivers */
    .drivers-container {
      background: #f8fafc;
      padding: 30px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .drivers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .driver-card {
      background: white;
      padding: 20px;
      border-radius: 6px;
      border-left: 4px solid #4C73E9;
    }

    .driver-card h4 {
      color: #0339AF;
      margin-bottom: 12px;
    }

    .driver-value {
      font-size: 24px;
      font-weight: 700;
      color: #059669;
      margin-bottom: 8px;
    }

    .driver-card p {
      font-size: 13px;
      color: #6b7280;
      margin: 0;
    }

    /* Use Cases Table */
    .use-cases-container {
      margin-bottom: 30px;
    }

    .use-cases-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }

    .use-cases-table thead {
      background: #0339AF;
      color: white;
    }

    .use-cases-table th {
      padding: 14px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.3px;
    }

    .use-cases-table td {
      padding: 12px 14px;
      font-size: 13px;
      border-bottom: 1px solid #f3f4f6;
    }

    .use-cases-table .row-even {
      background: #f9fafb;
    }

    .use-cases-table .row-odd {
      background: white;
    }

    .use-case-name {
      font-weight: 500;
      color: #0339AF;
    }

    .use-case-score {
      color: #4C73E9;
      font-weight: 600;
    }

    .use-case-value {
      color: #059669;
      font-weight: 600;
    }

    .use-case-tokens {
      color: #6b7280;
    }

    /* Data Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      margin: 20px 0;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
    }

    .data-table thead {
      background: #0339AF;
      color: white;
    }

    .data-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.3px;
    }

    .data-table td {
      padding: 10px 12px;
      font-size: 12px;
      border-bottom: 1px solid #f3f4f6;
    }

    .data-table .row-even {
      background: #f9fafb;
    }

    .data-table .row-odd {
      background: white;
    }

    /* Steps Section */
    .step-section {
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 1px solid #e5e7eb;
    }

    .step-section:last-child {
      border-bottom: none;
    }

    .step-identifier {
      font-size: 12px;
      color: #4C73E9;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }

    .step-content {
      color: #4b5563;
      line-height: 1.7;
      font-size: 14px;
    }

    /* Executive Summary */
    .executive-summary {
      background: linear-gradient(135deg, #f8fafc 0%, #f0f5ff 100%);
      padding: 30px;
      border-radius: 8px;
      border-left: 4px solid #4C73E9;
      margin-bottom: 30px;
    }

    .summary-content {
      color: #4b5563;
      line-height: 1.8;
      font-size: 14px;
    }

    .summary-content p {
      margin-bottom: 12px;
    }

    /* Footer */
    .page-footer {
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }

    @media print {
      .page-footer {
        position: fixed;
        bottom: 0.25in;
        left: 0.5in;
        right: 0.5in;
        border-top: 1px solid #e5e7eb;
        padding-top: 10px;
        z-index: 1000;
      }
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .cover-title {
        font-size: 36px;
      }

      .cover-company {
        font-size: 24px;
      }

      h1 {
        font-size: 24px;
      }

      h2 {
        font-size: 20px;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .drivers-grid {
        grid-template-columns: 1fr;
      }

      .content {
        padding: 24px;
      }

      .cover-page {
        padding: 40px 24px;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Cover Page -->
    <div class="cover-page">
      <div class="cover-content">
        <div class="blueally-logo">BlueAlly</div>
        <div class="blueally-tagline">AI Strategic Assessment</div>
        <h1 class="cover-title">Strategic Assessment Report</h1>
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
      <!-- Executive Dashboard -->
      <div class="executive-dashboard page-break-section">
        <h2>Executive Dashboard</h2>
        <div class="metrics-grid">
          ${generateMetricCard('Revenue Benefit', totalRevenueBenefit, '#059669')}
          ${generateMetricCard('Cost Benefit', totalCostBenefit, '#0339AF')}
          ${generateMetricCard('Cash Flow Benefit', totalCashFlowBenefit, '#D97706')}
          ${generateMetricCard('Risk Benefit', totalRiskBenefit, '#4C73E9')}
        </div>
        ${
          totalAnnualValue > 0
            ? `
          <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px; margin-top: 20px;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Total Annual Value</div>
            <div style="font-size: 32px; font-weight: 700; color: #0339AF;">${formatCurrency(totalAnnualValue)}</div>
          </div>
        `
            : ''
        }
      </div>

      <!-- Executive Summary -->
      ${generateExecutiveSummary()}

      <!-- Value Drivers -->
      ${generateValueDrivers()}

      <!-- Use Cases -->
      ${generateUseCasesTable()}

      <!-- Detailed Steps -->
      ${generateDetailedSteps()}

      <!-- Footer -->
      <div class="page-footer">
        © 2025 BlueAlly. Confidential & Proprietary.
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}
