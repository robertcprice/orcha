#!/usr/bin/env node
/**
 * Dedicated script to capture homepage with extended timeout
 * The homepage has heavy component loading (SessionMonitor, LiveSessionViewer, etc.)
 * so we need a more patient approach
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3002';
const SCREENSHOT_DIR = '/tmp/webapp-screenshots-before-redesign';

async function captureHomepage() {
  console.log('🚀 Starting extended homepage capture...');
  console.log(`📁 Target: ${SCREENSHOT_DIR}`);
  console.log();

  // Ensure directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  try {
    console.log('📍 Navigating to homepage...');
    console.log(`   URL: ${BASE_URL}/`);

    // Navigate with longer timeout and don't wait for networkidle
    await page.goto(BASE_URL, {
      waitUntil: 'domcontentloaded', // Changed from 'networkidle'
      timeout: 60000 // 60 seconds
    });

    console.log('✅ Page loaded (DOM ready)');

    // Wait for key components to appear
    console.log('⏳ Waiting for key components to render...');

    try {
      // Wait for main content areas (with generous timeouts)
      await page.waitForSelector('body', { timeout: 5000 });
      console.log('   ✅ Body rendered');

      // Give React time to hydrate and components to mount
      await page.waitForTimeout(5000);
      console.log('   ⏳ Waited 5s for React hydration');

      // Additional wait for any async data loading
      await page.waitForTimeout(5000);
      console.log('   ⏳ Waited additional 5s for data loading');

    } catch (waitError) {
      console.log(`   ⚠️  Some elements didn't load, but continuing: ${waitError.message}`);
    }

    // Scroll to ensure all content is loaded
    console.log('📜 Scrolling page to trigger lazy loading...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);

    console.log('📸 Capturing screenshot...');
    const screenshotPath = path.join(SCREENSHOT_DIR, '01-homepage.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    console.log('✅ Screenshot saved successfully!');
    console.log(`   Path: ${screenshotPath}`);

    // Get page info for debugging
    const title = await page.title();
    const url = page.url();
    console.log();
    console.log('📄 Page Info:');
    console.log(`   Title: ${title}`);
    console.log(`   URL: ${url}`);

    // Save result metadata
    const result = {
      page: '01-homepage',
      path: '/',
      description: 'Dashboard with orchestration panel, session monitor, and live viewer',
      screenshot: screenshotPath,
      timestamp: new Date().toISOString(),
      success: true,
      pageTitle: title,
      capturedUrl: url
    };

    const resultsPath = path.join(SCREENSHOT_DIR, 'homepage-capture-result.json');
    fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2));
    console.log(`   Metadata: ${resultsPath}`);

    console.log();
    console.log('=' .repeat(70));
    console.log('✅ HOMEPAGE SCREENSHOT CAPTURED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log(`📁 ${screenshotPath}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error();
    console.error('=' .repeat(70));
    console.error('❌ ERROR CAPTURING HOMEPAGE');
    console.error('='.repeat(70));
    console.error(`Error: ${error.message}`);
    console.error();
    console.error('Stack trace:');
    console.error(error.stack);
    console.error('='.repeat(70));

    // Save error result
    const errorResult = {
      page: '01-homepage',
      path: '/',
      description: 'Dashboard with orchestration panel, session monitor, and live viewer',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    const resultsPath = path.join(SCREENSHOT_DIR, 'homepage-capture-result.json');
    fs.writeFileSync(resultsPath, JSON.stringify(errorResult, null, 2));

    throw error;
  } finally {
    await browser.close();
  }
}

// Run the capture
captureHomepage().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
