const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = '/tmp/webapp-screenshots';
const BASE_URL = 'http://localhost:3002';

// Pages to capture
const PAGES = [
  { path: '/', name: 'homepage', description: 'Main Dashboard / Homepage' },
  { path: '/monitor', name: 'live-monitor', description: 'Live Session Monitor' },
  { path: '/agents', name: 'agents-page', description: 'Agents Management' },
  { path: '/tasks', name: 'tasks-page', description: 'Tasks Overview' },
  { path: '/task-tracker', name: 'task-tracker', description: 'Task Tracker Interface' },
  { path: '/settings', name: 'settings-page', description: 'Settings Configuration' },
  { path: '/weather', name: 'weather-page', description: 'Weather Integration Demo' }
];

async function captureScreenshots() {
  // Create screenshot directory if it doesn't exist
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log(`📸 Starting screenshot capture process...`);
  console.log(`📁 Screenshots will be saved to: ${SCREENSHOT_DIR}`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);

  const browser = await playwright.chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  const results = {
    successful: [],
    failed: []
  };

  for (const pageInfo of PAGES) {
    const url = `${BASE_URL}${pageInfo.path}`;
    const filename = `${pageInfo.name}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);

    try {
      console.log(`📍 Navigating to: ${url}`);
      console.log(`   Description: ${pageInfo.description}`);

      // Navigate to page
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Additional wait for any dynamic content
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({
        path: filepath,
        fullPage: true
      });

      console.log(`✅ Screenshot saved: ${filename}\n`);
      
      results.successful.push({
        page: pageInfo.name,
        path: pageInfo.path,
        description: pageInfo.description,
        filepath: filepath,
        url: url
      });

    } catch (error) {
      console.error(`❌ Failed to capture ${pageInfo.name}: ${error.message}\n`);
      results.failed.push({
        page: pageInfo.name,
        path: pageInfo.path,
        error: error.message
      });
    }
  }

  await browser.close();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SCREENSHOT CAPTURE SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${results.successful.length}/${PAGES.length}`);
  console.log(`❌ Failed: ${results.failed.length}/${PAGES.length}`);
  
  if (results.successful.length > 0) {
    console.log('\n✅ Successfully captured:');
    results.successful.forEach(item => {
      console.log(`   - ${item.page}: ${item.description}`);
      console.log(`     File: ${item.filepath}`);
    });
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed to capture:');
    results.failed.forEach(item => {
      console.log(`   - ${item.page}: ${item.error}`);
    });
  }

  // Save results to JSON
  const resultsPath = path.join(SCREENSHOT_DIR, 'capture-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: ${resultsPath}`);

  return results;
}

// Run the capture process
captureScreenshots()
  .then(results => {
    console.log('\n🎉 Screenshot capture process completed!');
    process.exit(results.failed.length > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
