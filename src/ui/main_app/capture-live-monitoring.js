#!/usr/bin/env node
/**
 * Capture screenshots of live agent monitoring in the web UI
 */
const { chromium } = require('playwright');

async function captureLiveMonitoring() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('📸 Navigating to web UI...');
  await page.goto('http://localhost:3002');
  await page.waitForLoadState('networkidle');

  // Wait a bit for WebSocket connections and initial data
  console.log('⏳ Waiting for live data to load...');
  await page.waitForTimeout(3000);

  // Screenshot 1: Full homepage with SessionMonitor
  console.log('📸 Capturing homepage with SessionMonitor...');
  await page.screenshot({ path: '/tmp/live-monitoring-01-homepage.png', fullPage: true });

  // Try to find activity feed
  console.log('🔍 Looking for activity feed...');
  const feedSelectors = [
    '[data-testid="activity-feed"]',
    '[data-testid="event-list"]',
    'text=Active Sessions',
    'text=Session Monitor'
  ];

  for (const selector of feedSelectors) {
    try {
      const element = await page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        console.log(`✅ Found element with selector: ${selector}`);
        break;
      }
    } catch (e) {
      continue;
    }
  }

  // Screenshot 2: After waiting for more activity
  console.log('⏳ Waiting for more agent activity...');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/live-monitoring-02-activity.png', fullPage: true });

  // Check for agent events
  console.log('🔍 Checking for agent spawn events...');
  try {
    const events = await page.locator('text=/spawn|started|initialized|codex|claude/i').all();
    console.log(`✅ Found ${events.length} agent-related events`);
  } catch (e) {
    console.log('⚠️ No agent events found yet');
  }

  // Screenshot 3: Scroll to see more activity
  console.log('📸 Capturing full page with all activity...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/live-monitoring-03-scrolled.png', fullPage: true });

  // Get page content to inspect structure
  console.log('📄 Analyzing page structure...');
  const content = await page.content();

  // Look for SessionMonitor or monitoring components
  if (content.includes('SessionMonitor') || content.includes('Active Sessions')) {
    console.log('✅ SessionMonitor component found on page!');
  } else {
    console.log('⚠️ SessionMonitor component not visible');
  }

  if (content.toLowerCase().includes('codex') || content.toLowerCase().includes('claude')) {
    console.log('✅ Agent activity visible in page content!');
  } else {
    console.log('⚠️ No agent activity visible yet');
  }

  // Screenshot 4: Final state
  await page.screenshot({ path: '/tmp/live-monitoring-04-final.png', fullPage: true });

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log('✅ SCREENSHOTS CAPTURED');
  console.log('='.repeat(70));
  console.log('📁 /tmp/live-monitoring-01-homepage.png');
  console.log('📁 /tmp/live-monitoring-02-activity.png');
  console.log('📁 /tmp/live-monitoring-03-scrolled.png');
  console.log('📁 /tmp/live-monitoring-04-final.png');
  console.log('='.repeat(70));
}

captureLiveMonitoring().catch(console.error);
