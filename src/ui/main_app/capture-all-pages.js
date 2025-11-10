#!/usr/bin/env node
/**
 * Capture screenshots of all webapp pages before redesign
 * Saves to /tmp/webapp-screenshots-before-redesign/
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3002';
const SCREENSHOT_DIR = '/tmp/webapp-screenshots-before-redesign';

const pages = [
  { path: '/', name: '01-homepage', description: 'Dashboard with orchestration panel, session monitor, and live viewer' },
  { path: '/monitor', name: '02-live-monitor', description: 'Real-time agent feed and terminal view' },
  { path: '/agents', name: '03-agents', description: 'Active agent sessions and tracking' },
  { path: '/tasks', name: '04-tasks', description: 'Task submission and management' },
  { path: '/task-tracker', name: '05-task-tracker', description: 'Personal task tracker (TO BE REMOVED)' },
  { path: '/settings', name: '06-settings', description: 'System configuration' },
  { path: '/weather', name: '07-weather', description: 'Weather dashboard (TO BE REMOVED)' }
];

async function captureScreenshots() {
  // Create screenshot directory
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('🚀 Starting screenshot capture...');
  console.log(`📁 Saving to: ${SCREENSHOT_DIR}\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  const results = [];

  for (const pageInfo of pages) {
    try {
      console.log(`📸 Capturing: ${pageInfo.name}`);
      console.log(`   URL: ${BASE_URL}${pageInfo.path}`);

      await page.goto(`${BASE_URL}${pageInfo.path}`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait a bit for any animations
      await page.waitForTimeout(2000);

      const screenshotPath = path.join(SCREENSHOT_DIR, `${pageInfo.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });

      results.push({
        page: pageInfo.name,
        path: pageInfo.path,
        description: pageInfo.description,
        screenshot: screenshotPath,
        timestamp: new Date().toISOString(),
        success: true
      });

      console.log(`   ✅ Saved: ${screenshotPath}\n`);

    } catch (error) {
      console.error(`   ❌ Error capturing ${pageInfo.name}:`);
      console.error(`      ${error.message}\n`);

      results.push({
        page: pageInfo.name,
        path: pageInfo.path,
        description: pageInfo.description,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  await browser.close();

  // Save results to JSON
  const resultsPath = path.join(SCREENSHOT_DIR, 'capture-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  // Print summary
  console.log('=' .repeat(70));
  console.log('📊 SCREENSHOT CAPTURE SUMMARY');
  console.log('='.repeat(70));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}/${pages.length}`);
  console.log(`❌ Failed: ${failed}/${pages.length}`);
  console.log(`📁 Location: ${SCREENSHOT_DIR}`);
  console.log(`📋 Results: ${resultsPath}`);
  console.log('='.repeat(70));

  // List all captured files
  if (successful > 0) {
    console.log('\n📸 Captured Screenshots:');
    results.filter(r => r.success).forEach(r => {
      console.log(`   ${r.page} - ${r.description}`);
    });
  }

  if (failed > 0) {
    console.log('\n⚠️  Failed Captures:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   ${r.page} - ${r.error}`);
    });
  }

  console.log('\n✨ Screenshot capture complete!\n');
}

captureScreenshots().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
