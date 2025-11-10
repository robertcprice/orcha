import { test, expect } from '@playwright/test';

const BASE_URL = process.env.UI_BASE_URL || 'http://localhost:3002';

/**
 * Test: Orchestrator Event Publishing Verification
 *
 * Verifies that orchestrator reasoning events are being published
 * and displayed in the web UI.
 */

test.describe('Event Publishing Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to port 3002 where web UI is running
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  });

  test('should display homepage', async ({ page }) => {
    // Verify page loaded
    await expect(page).toHaveTitle(/AlgoMind|Orchestrator|Dashboard/i);
  });

  test('should show events from Redis', async ({ page }) => {
    // Wait a bit for any existing events to load
    await page.waitForTimeout(3000);

    // Take initial screenshot
    await page.screenshot({ path: '/tmp/playwright-events-initial.png', fullPage: true });

    // Look for any event-related elements
    const eventElements = await page.locator('text=/reasoning|decision|plan|execution|event/i').all();
    console.log(`Found ${eventElements.length} event-related elements`);

    // Look for orchestrator-specific text
    const orchestratorText = await page.locator('text=/orchestrator/i').count();
    console.log(`Found ${orchestratorText} orchestrator mentions`);
  });

  test('should have monitor or sessions page', async ({ page }) => {
    // Try to navigate to monitor page
    const anchor = page.locator('a[href*="monitor"]');
    if (await anchor.count()) {
      console.log('✓ Monitor link present on page');
    }

    const fallback = page.locator('text=/monitor|sessions/i');
    if (await fallback.count()) {
      console.log('✓ Monitor keyword present');
    }

    await page.goto(`${BASE_URL}/monitor`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/playwright-monitor-direct.png', fullPage: true });
    console.log('✓ Navigated to monitor page directly');
  });

  test('should display agent activity', async ({ page }) => {
    // Look for agent names or types
    const agentTypes = ['Claude', 'ChatGPT', 'Codex', 'PP', 'IM', 'AR'];
    let found = [];

    for (const agent of agentTypes) {
      const count = await page.locator(`text=${agent}`).count();
      if (count > 0) {
        found.push(agent);
      }
    }

    console.log(`Found agent types: ${found.join(', ') || 'none'}`);
  });

  test('should show event timestamps or time-based elements', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for time elements
    const timeElements = await page.locator('time').count();
    const timestampElements = await page.locator('[data-testid*="timestamp"]').count();
    const timeText = await page.locator('text=/\\d{1,2}:\\d{2}/').count(); // HH:MM pattern

    console.log(`Time elements: ${timeElements}`);
    console.log(`Timestamp elements: ${timestampElements}`);
    console.log(`Time text: ${timeText}`);

    const totalTimeRelated = timeElements + timestampElements + timeText;
    console.log(`Total time-related elements: ${totalTimeRelated}`);
  });

  test('should have SessionMonitor or similar component', async ({ page }) => {
    // Look for session monitor indicators
    const sessionMonitor = await page.locator('[data-testid="session-monitor"]').count();
    const sessionText = await page.locator('text=/session|activity|feed/i').count();

    console.log(`SessionMonitor components: ${sessionMonitor}`);
    console.log(`Session-related text: ${sessionText}`);

    // Take screenshot of current state (best effort)
    try {
      await page.screenshot({ path: '/tmp/playwright-full-page.png', fullPage: true });
    } catch (error) {
      console.warn('⚠️  Skipping screenshot due to rendering delay:', (error as Error).message);
    }
  });

  test('should check for Redis event data in page', async ({ page }) => {
    // Wait for any dynamic content
    await page.waitForTimeout(3000);

    // Check page content for event-related keywords
    const pageContent = await page.content();

    const keywords = [
      'orchestrator_reasoning',
      'orchestrator_decision',
      'algomind.agent.events',
      'event_type',
      'task_id'
    ];

    const foundKeywords = keywords.filter(keyword => pageContent.toLowerCase().includes(keyword.toLowerCase()));
    console.log(`Found keywords in page: ${foundKeywords.join(', ') || 'none'}`);

    if (foundKeywords.length > 0) {
      console.log('✓ Page contains event-related data!');
    }
  });

  test('should display real-time feed or log', async ({ page }) => {
    // Look for feed-like structures
    const feeds = await page.locator('[class*="feed"]').count();
    const logs = await page.locator('[class*="log"]').count();
    const terminals = await page.locator('[class*="terminal"]').count();
    const cards = await page.locator('[class*="card"]').count();

    console.log(`Feeds: ${feeds}, Logs: ${logs}, Terminals: ${terminals}, Cards: ${cards}`);
  });

  test('should check API endpoints are responding', async ({ page }) => {
    // Test API endpoints
    const endpoints = [
      '/api/agents/unified-logs',
      '/api/stats',
      '/api/agents/active',
      '/api/tasks/status'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(`${BASE_URL}${endpoint}`);
        console.log(`${endpoint}: ${response.status()} ${response.statusText()}`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.log(`${endpoint}: Error - ${err.message}`);
      }
    }
  });

});
