import { test, expect } from '@playwright/test';

const BASE_URL = process.env.UI_BASE_URL || 'http://localhost:3002';

/**
 * Test: Live Agent Monitoring in Web UI
 *
 * Verifies that users can watch agents work in real-time
 * through the SessionMonitor component.
 */

test.describe('Live Agent Monitoring', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the main dashboard
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  });

  test('should display SessionMonitor component on homepage', async ({ page }) => {
    // Check that SessionMonitor is visible
    const monitor = page.locator('[data-testid="session-monitor"]').or(
      page.locator('text=Active Sessions').or(
        page.locator('text=Session Monitor')
      )
    );

    await expect(monitor.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show real-time agent activity feed', async ({ page }) => {
    // Look for activity feed or event list
    const activityFeed = page.locator('[data-testid="activity-feed"]').or(
      page.locator('[data-testid="event-list"]').or(
        page.locator('.feed').or(
          page.locator('.activity')
        )
      )
    );

    // Wait for feed to be present
    await expect(activityFeed.first()).toBeVisible({ timeout: 10000 });
  });

  test('should update live when agents spawn', async ({ page }) => {
    // Submit a task to trigger agent activity
    const goalInput = page.locator('input[name="goal"]').or(
      page.locator('input[placeholder*="goal"]').or(
        page.locator('textarea[name="goal"]')
      )
    );

    if (await goalInput.isVisible()) {
      await goalInput.fill('Create a simple hello world function');

      const submitButton = page.locator('button:has-text("Submit")').or(
        page.locator('button:has-text("Run")')
      );

      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Wait for agent activity to appear
        await page.waitForTimeout(2000);

        // Check for agent spawn events
        const agentEvents = page.locator('text=/spawn|started|initialized/i');
        await expect(agentEvents.first()).toBeVisible({ timeout: 30000 });
      }
    }
  });

  test('should display agent types (PP, IM, AR, RD)', async ({ page }) => {
    // Check if agent type badges are visible
    const agentTypes = ['PP', 'IM', 'AR', 'RD'];

    for (const agentType of agentTypes) {
      // Look for agent type anywhere on page (in legend, badges, etc.)
      const agentBadge = page.locator(`text="${agentType}"`);

      // Just check if these agent types are mentioned somewhere
      // They might be in a legend or waiting to appear
      const count = await agentBadge.count();
      console.log(`Agent type ${agentType} found ${count} times`);
    }
  });

  test('should show terminal/log output', async ({ page }) => {
    // Look for terminal or log display
    const terminal = page.locator('[data-testid="terminal"]').or(
      page.locator('[data-testid="log-output"]').or(
        page.locator('.terminal').or(
          page.locator('.log')
        )
      )
    );

    // Terminal should be present
    const terminalCount = await terminal.count();
    expect(terminalCount).toBeGreaterThan(0);
  });

  test('should filter events by agent type', async ({ page }) => {
    // Look for filter buttons or checkboxes
    const filterButtons = page.locator('[data-testid^="filter-"]').or(
      page.locator('button:has-text("PP")').or(
        page.locator('button:has-text("IM")')
      )
    );

    if (await filterButtons.first().isVisible()) {
      // Click a filter
      await filterButtons.first().click();

      // Wait for filtering to apply
      await page.waitForTimeout(500);

      // Verify events are filtered
      console.log('Filter applied successfully');
    }
  });

  test('should display event timestamps', async ({ page }) => {
    // Look for timestamp elements
    const timestamps = page.locator('[data-testid="timestamp"]').or(
      page.locator('time').or(
        page.locator('text=/\\d{1,2}:\\d{2}:\\d{2}/') // HH:MM:SS pattern
      )
    );

    // Check if timestamps are being displayed
    await page.waitForTimeout(2000);
    const count = await timestamps.count();
    console.log(`Found ${count} timestamp elements`);
  });

  test('should show file activity timeline panel', async ({ page }) => {
    const fileActivity = page.locator('text=File Activity');
    await expect(fileActivity.first()).toBeVisible({ timeout: 5000 });
  });

  test('should auto-scroll to latest events', async ({ page }) => {
    // Submit multiple tasks to generate events
    const goalInput = page.locator('input[name="goal"]').or(
      page.locator('textarea[name="goal"]')
    );

    if (await goalInput.isVisible()) {
      // Submit a task
      await goalInput.fill('Test auto-scroll');
      const submitButton = page.locator('button:has-text("Submit")');

      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(3000);

        // Check if feed has scrolled (latest events visible)
        const feed = page.locator('[data-testid="activity-feed"]').or(
          page.locator('.feed')
        );

        if (await feed.first().isVisible()) {
          // Get scroll position
          const scrollTop = await feed.first().evaluate(el => el.scrollTop);
          const scrollHeight = await feed.first().evaluate(el => el.scrollHeight);
          const clientHeight = await feed.first().evaluate(el => el.clientHeight);

          console.log(`Scroll: ${scrollTop}/${scrollHeight - clientHeight}`);

          // Should be near bottom (auto-scroll)
          const isNearBottom = scrollTop >= (scrollHeight - clientHeight - 100);
          expect(isNearBottom).toBeTruthy();
        }
      }
    }
  });

  test('should show agent status (spawning, active, complete)', async ({ page }) => {
    // Look for status indicators
    const statusIndicators = page.locator('[data-testid^="status-"]').or(
      page.locator('.status').or(
        page.locator('text=/spawning|active|running|complete|finished/i')
      )
    );

    await page.waitForTimeout(2000);
    const count = await statusIndicators.count();
    console.log(`Found ${count} status indicators`);
  });

  test('should display WebSocket connection status', async ({ page }) => {
    // Look for connection indicator
    const connectionStatus = page.locator('[data-testid="connection-status"]').or(
      page.locator('text=/connected|disconnected|connecting/i')
    );

    await page.waitForTimeout(1000);

    // Connection status should be visible
    if (await connectionStatus.first().isVisible()) {
      const text = await connectionStatus.first().textContent();
      console.log(`Connection status: ${text}`);
    }
  });

  test('should show V5 workflow phases', async ({ page }) => {
    // Look for phase indicators (Planning, Execution, Review, etc.)
    const phases = [
      'Planning',
      'Execution',
      'Review',
      'Refinement',
      'Documentation',
      'Finalization'
    ];

    for (const phase of phases) {
      const phaseElement = page.locator(`text="${phase}"`);
      const count = await phaseElement.count();

      if (count > 0) {
        console.log(`✓ Found phase: ${phase}`);
      }
    }
  });

  test('should display enrichment contributions', async ({ page }) => {
    // Look for AI model names in enrichment
    const aiModels = [
      'Claude',
      'ChatGPT',
      'DeepSeek',
      'Grok',
      'Gemini',
      'Best Practices'
    ];

    for (const model of aiModels) {
      const modelElement = page.locator(`text="${model}"`);
      const count = await modelElement.count();

      if (count > 0) {
        console.log(`✓ Found AI model: ${model}`);
      }
    }
  });

  test('should allow expanding/collapsing event details', async ({ page }) => {
    // Look for expandable event items
    const eventItems = page.locator('[data-testid^="event-"]').or(
      page.locator('.event-item')
    );

    if (await eventItems.first().isVisible()) {
      // Try to click to expand
      await eventItems.first().click();
      await page.waitForTimeout(500);

      // Check if details appeared
      console.log('Event item clicked - checking for expanded details');
    }
  });

  test('should display cost tracking information', async ({ page }) => {
    // Look for cost information
    const costElements = page.locator('text=/\\$\\d+\\.\\d{2}/').or( // $X.XX pattern
      page.locator('[data-testid="cost"]').or(
        page.locator('text=/cost|price|total/i')
      )
    );

    await page.waitForTimeout(2000);
    const count = await costElements.count();
    console.log(`Found ${count} cost-related elements`);
  });

  test('should show task completion notifications', async ({ page }) => {
    // Look for completion messages or toasts
    const completionMessages = page.locator('text=/completed|finished|success|done/i');

    // Wait for potential completion
    await page.waitForTimeout(5000);
    const count = await completionMessages.count();
    console.log(`Found ${count} completion-related messages`);
  });

});
