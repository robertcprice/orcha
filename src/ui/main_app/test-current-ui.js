const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🚀 Starting UI exploration...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const screenshotDir = path.join(__dirname, 'test-screenshots', 'current-ui');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    pages: [],
    components: [],
    apiCalls: [],
    design: {
      colors: new Set(),
      fonts: new Set(),
      animations: []
    },
    issues: []
  };

  // Monitor network requests
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      report.apiCalls.push({
        url: request.url(),
        method: request.method()
      });
    }
  });

  // Monitor console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      report.issues.push({
        type: 'console_error',
        message: msg.text()
      });
    }
  });

  const testPage = async (name, path, actions = []) => {
    console.log(`📄 Testing ${name}...`);

    try {
      await page.goto(`http://localhost:3002${path}`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      await page.waitForTimeout(2000); // Let animations settle

      // Capture screenshot
      const screenshotPath = `${screenshotDir}/${name.replace(/\s+/g, '-').toLowerCase()}.png`;
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });

      // Analyze page structure
      const pageData = await page.evaluate(() => {
        const getComputedStyles = () => {
          const styles = window.getComputedStyle(document.body);
          return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            fontFamily: styles.fontFamily
          };
        };

        const getComponents = () => {
          const components = [];
          document.querySelectorAll('[class*="component"], [class*="panel"], [class*="card"]').forEach(el => {
            components.push({
              class: el.className,
              tag: el.tagName
            });
          });
          return components;
        };

        return {
          title: document.title,
          h1: document.querySelector('h1')?.textContent || 'No H1',
          styles: getComputedStyles(),
          componentCount: document.querySelectorAll('[class]').length,
          buttons: document.querySelectorAll('button').length,
          inputs: document.querySelectorAll('input, textarea').length,
          hasCanvas: !!document.querySelector('canvas'),
          hasSVG: !!document.querySelector('svg')
        };
      });

      report.pages.push({
        name,
        path,
        screenshot: screenshotPath,
        data: pageData,
        status: 'success'
      });

      // Run custom actions if provided
      for (const action of actions) {
        try {
          await action(page);
        } catch (actionError) {
          report.issues.push({
            type: 'action_error',
            page: name,
            error: actionError.message
          });
        }
      }

      console.log(`  ✅ ${name} captured`);

    } catch (error) {
      console.log(`  ❌ ${name} failed: ${error.message}`);
      report.pages.push({
        name,
        path,
        status: 'failed',
        error: error.message
      });
    }
  };

  // Test all pages
  await testPage('Home', '/', [
    async (page) => {
      // Try to find main components
      const hasOrchestrator = await page.locator('text=Orchestr').count() > 0;
      const hasTaskForm = await page.locator('input, textarea').count() > 0;
      console.log(`    - Has orchestrator UI: ${hasOrchestrator}`);
      console.log(`    - Has task form: ${hasTaskForm}`);
    }
  ]);

  await testPage('Agents', '/agents', [
    async (page) => {
      const agentCount = await page.locator('[class*="agent"]').count();
      console.log(`    - Agent elements found: ${agentCount}`);
    }
  ]);

  await testPage('Agent Branching', '/agents/branching', [
    async (page) => {
      const hasSVG = await page.locator('svg').count() > 0;
      const hasCanvas = await page.locator('canvas').count() > 0;
      console.log(`    - Has SVG: ${hasSVG}`);
      console.log(`    - Has Canvas: ${hasCanvas}`);
    }
  ]);

  await testPage('Vault', '/vault', [
    async (page) => {
      const hasFileTree = await page.locator('text=Files,text=Documents').count() > 0;
      console.log(`    - Has file browser: ${hasFileTree}`);
    }
  ]);

  await testPage('Settings', '/settings', [
    async (page) => {
      const inputCount = await page.locator('input').count();
      const selectCount = await page.locator('select').count();
      console.log(`    - Inputs: ${inputCount}`);
      console.log(`    - Selects: ${selectCount}`);
    }
  ]);

  await testPage('Monitor', '/monitor');
  await testPage('Tasks', '/tasks');

  // Get computed styles from the main page
  await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
  const designAnalysis = await page.evaluate(() => {
    const getColors = () => {
      const colors = new Set();
      const elementsWithColor = document.querySelectorAll('*');
      elementsWithColor.forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          colors.add(styles.backgroundColor);
        }
        if (styles.color) {
          colors.add(styles.color);
        }
      });
      return Array.from(colors);
    };

    const getFonts = () => {
      const fonts = new Set();
      document.querySelectorAll('*').forEach(el => {
        const font = window.getComputedStyle(el).fontFamily;
        if (font) fonts.add(font);
      });
      return Array.from(fonts);
    };

    return {
      colors: getColors(),
      fonts: getFonts(),
      cssVariables: Array.from(document.styleSheets)
        .flatMap(sheet => {
          try {
            return Array.from(sheet.cssRules);
          } catch { return []; }
        })
        .filter(rule => rule.selectorText === ':root')
        .flatMap(rule => Array.from(rule.style))
        .filter(prop => prop.startsWith('--'))
    };
  });

  report.design = {
    ...designAnalysis,
    apiCallsSummary: {
      total: report.apiCalls.length,
      unique: [...new Set(report.apiCalls.map(c => c.url))].length
    }
  };

  // Save report
  const reportPath = path.join(screenshotDir, 'exploration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Generate markdown summary
  const mdReport = `# Current UI Exploration Report
Generated: ${report.timestamp}

## Pages Tested
${report.pages.map(p => `
### ${p.name}
- Path: ${p.path}
- Status: ${p.status}
- Screenshot: ${p.screenshot}
${p.data ? `- Title: ${p.data.title}
- Components: ${p.data.componentCount}
- Buttons: ${p.data.buttons}
- Inputs: ${p.data.inputs}
- Has Canvas: ${p.data.hasCanvas}
- Has SVG: ${p.data.hasSVG}` : ''}
${p.error ? `- Error: ${p.error}` : ''}
`).join('\n')}

## Design System Analysis
### Colors (Sample)
${designAnalysis.colors.slice(0, 10).map(c => `- ${c}`).join('\n')}

### Fonts
${designAnalysis.fonts.map(f => `- ${f}`).join('\n')}

### CSS Variables
${designAnalysis.cssVariables.slice(0, 20).map(v => `- ${v}`).join('\n')}

## API Calls Detected
Total: ${report.design.apiCallsSummary.total}
Unique endpoints: ${report.design.apiCallsSummary.unique}

${[...new Set(report.apiCalls.map(c => c.url))].slice(0, 15).map(url => `- ${url}`).join('\n')}

## Issues Found
${report.issues.length === 0 ? 'None detected' : report.issues.map(i => `- [${i.type}] ${i.message || i.error}`).join('\n')}

## Screenshots Location
\`${screenshotDir}\`
`;

  const mdPath = path.join(screenshotDir, 'REPORT.md');
  fs.writeFileSync(mdPath, mdReport);

  console.log(`\n✅ Exploration complete!`);
  console.log(`📸 Screenshots saved to: ${screenshotDir}`);
  console.log(`📊 Report: ${mdPath}`);
  console.log(`📋 JSON data: ${reportPath}`);

  await browser.close();
})();
