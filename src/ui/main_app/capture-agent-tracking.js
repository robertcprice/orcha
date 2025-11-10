#!/usr/bin/env node
/**
 * Capture screenshots of agent tracking in real-time
 */
const { chromium } = require('playwright');
const path = require('path');

async function captureAgentTracking() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('📸 Opening web UI at http://localhost:3002...');
  await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });

  // Wait for initial load
  console.log('⏳ Waiting for initial load...');
  await page.waitForTimeout(2000);

  // Screenshot 1: Homepage with SessionMonitor
  console.log('📸 Capturing homepage...');
  await page.screenshot({
    path: '/tmp/agent-tracking-01-homepage.png',
    fullPage: true
  });

  // Check for agent activity
  console.log('🔍 Checking for active sessions...');
  const sessionText = await page.textContent('body');
  if (sessionText.includes('Active') || sessionText.includes('session')) {
    console.log('✅ Found session monitoring elements');
  }

  // Wait for potential agent activity
  console.log('⏳ Waiting for agent activity (10 seconds)...');
  await page.waitForTimeout(10000);

  // Screenshot 2: After waiting for activity
  console.log('📸 Capturing after waiting for activity...');
  await page.screenshot({
    path: '/tmp/agent-tracking-02-activity.png',
    fullPage: true
  });

  // Navigate to Agents page
  console.log('🔗 Navigating to /agents page...');
  await page.goto('http://localhost:3002/agents', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Screenshot 3: Agents page
  console.log('📸 Capturing agents page...');
  await page.screenshot({
    path: '/tmp/agent-tracking-03-agents.png',
    fullPage: true
  });

  // Navigate to Monitor page
  console.log('🔗 Navigating to /monitor page...');
  await page.goto('http://localhost:3002/monitor', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Screenshot 4: Monitor page
  console.log('📸 Capturing monitor page...');
  await page.screenshot({
    path: '/tmp/agent-tracking-04-monitor.png',
    fullPage: true
  });

  // Wait longer for agent activity
  console.log('⏳ Waiting longer for agent activity (20 seconds)...');
  await page.waitForTimeout(20000);

  // Screenshot 5: Monitor page after longer wait
  console.log('📸 Capturing monitor page after longer wait...');
  await page.screenshot({
    path: '/tmp/agent-tracking-05-monitor-final.png',
    fullPage: true
  });

  // Go back to homepage to check for updates
  console.log('🔗 Returning to homepage...');
  await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Screenshot 6: Final homepage state
  console.log('📸 Capturing final homepage state...');
  await page.screenshot({
    path: '/tmp/agent-tracking-06-homepage-final.png',
    fullPage: true
  });

  // Get page content for analysis
  console.log('📄 Analyzing page content...');
  const content = await page.content();

  // Check for agent-related keywords
  const keywords = ['codex', 'claude', 'gemini', 'agent', 'enrichment', 'session'];
  const found = keywords.filter(kw => content.toLowerCase().includes(kw));

  console.log(`✅ Found keywords: ${found.join(', ')}`);

  // Check for EventSource connection
  const hasSSE = await page.evaluate(() => {
    return window.EventSource !== undefined;
  });
  console.log(`SSE Support: ${hasSSE ? '✅ Yes' : '❌ No'}`);

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log('✅ AGENT TRACKING SCREENSHOTS CAPTURED');
  console.log('='.repeat(70));
  console.log('📁 /tmp/agent-tracking-01-homepage.png');
  console.log('📁 /tmp/agent-tracking-02-activity.png');
  console.log('📁 /tmp/agent-tracking-03-agents.png');
  console.log('📁 /tmp/agent-tracking-04-monitor.png');
  console.log('📁 /tmp/agent-tracking-05-monitor-final.png');
  console.log('📁 /tmp/agent-tracking-06-homepage-final.png');
  console.log('='.repeat(70));
}

captureAgentTracking().catch(console.error);
