import { test, expect } from '@playwright/test';

test.describe('Improved Node Clicking Test - With Correct Selectors', () => {
  test.setTimeout(240000); // 4 minutes

  test.beforeEach(async ({ page, context }) => {
    console.log('🧹 Clearing localStorage and cookies...');
    await context.clearCookies();
    await page.goto('http://localhost:3002');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.waitForTimeout(2000);
  });

  test('should click all nodes and verify panels open with correct selectors', async ({ page }) => {
    console.log('\n🎯 IMPROVED NODE CLICKING TEST');
    console.log('=========================================\n');

    console.log('📍 Step 1: Load Page');
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Handle "Previous Task Detected" if it appears
    const resumeBanner = page.locator('div:has-text("Previous Task Detected")');
    const hasResumeBanner = await resumeBanner.isVisible().catch(() => false);

    if (hasResumeBanner) {
      console.log('⚠️ Found previous task - clicking "Start Fresh"');
      const startFreshButton = page.locator('button:has-text("Start Fresh")');
      await startFreshButton.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'test-screenshots/improved-01-initial.png', fullPage: true });

    console.log('\n📍 Step 2: Submit Task');

    const taskInput = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"], input[type="text"]').first();
    await taskInput.waitFor({ state: 'visible', timeout: 10000 });

    const testGoal = 'Create a hello world program in Python';
    console.log(`Submitting task: "${testGoal}"`);

    await taskInput.fill(testGoal);
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'test-screenshots/improved-02-task-submitted.png', fullPage: true });

    console.log('\n📍 Step 3: Wait for All Nodes to Appear');

    // Wait for planning nodes
    const nodeNames = ['Claude', 'ChatGPT', 'DeepSeek', 'Grok', 'Gemini', 'Hybrid Orchestrator'];
    const nodeStatus: Record<string, {
      appeared: boolean;
      clickable: boolean;
      opensPanel: boolean;
      hasTabs: boolean;
      tabCount: number;
      error?: string;
    }> = {};

    // Initialize status
    for (const nodeName of nodeNames) {
      nodeStatus[nodeName] = {
        appeared: false,
        clickable: false,
        opensPanel: false,
        hasTabs: false,
        tabCount: 0
      };
    }

    // Wait for nodes to appear
    console.log('\nWaiting for nodes to appear...');
    await page.waitForTimeout(10000); // Give time for all nodes

    for (const nodeName of nodeNames) {
      const nodeLocator = page.locator(`text=/^${nodeName}$/i`).first();
      const isVisible = await nodeLocator.isVisible({ timeout: 5000 }).catch(() => false);

      if (isVisible) {
        nodeStatus[nodeName].appeared = true;
        console.log(`✅ ${nodeName}: APPEARED`);
      } else {
        console.log(`❌ ${nodeName}: DID NOT APPEAR`);
      }
    }

    await page.screenshot({ path: 'test-screenshots/improved-03-nodes-visible.png', fullPage: true });

    console.log('\n📍 Step 4: Click Each Node and Verify Panel Opens (Using Correct Selectors)');
    console.log('=========================================\n');

    for (const nodeName of nodeNames) {
      if (!nodeStatus[nodeName].appeared) {
        console.log(`⏭️ Skipping ${nodeName} (not visible)`);
        continue;
      }

      console.log(`\n🔍 Testing ${nodeName} Node...`);
      console.log('─────────────────────────────────────');

      try {
        const nodeLocator = page.locator(`text=/^${nodeName}$/i`).first();

        // Test 1: Is node clickable?
        const isClickable = await nodeLocator.isEnabled().catch(() => false);
        nodeStatus[nodeName].clickable = isClickable;

        if (!isClickable) {
          console.log(`❌ ${nodeName}: Not clickable`);
          nodeStatus[nodeName].error = 'Node is not clickable';
          continue;
        }

        console.log(`✅ ${nodeName}: Node is clickable`);

        // Test 2: Click the node
        console.log(`🖱️ Clicking ${nodeName} node...`);
        await nodeLocator.click();
        await page.waitForTimeout(2000); // Wait for panel to open

        await page.screenshot({
          path: `test-screenshots/improved-${nodeName.toLowerCase().replace(/\s+/g, '-')}-clicked.png`,
          fullPage: true
        });

        // Test 3: Check if panel opened using CORRECT SELECTOR
        const terminalPanel = page.locator('[data-testid="agent-terminal-panel"]');
        const panelVisible = await terminalPanel.isVisible({ timeout: 3000 }).catch(() => false);

        if (panelVisible) {
          nodeStatus[nodeName].opensPanel = true;
          console.log(`✅ ${nodeName}: Panel opened (verified with data-testid)`);

          // Test 4: Check if tabs are visible using CORRECT SELECTORS
          const tabs = ['logs', 'input', 'thoughts', 'code', 'output'];
          const foundTabs: string[] = [];

          for (const tabId of tabs) {
            const tab = page.locator(`[data-testid="terminal-tab-${tabId}"]`);
            const tabVisible = await tab.isVisible().catch(() => false);
            if (tabVisible) {
              foundTabs.push(tabId);
            }
          }

          nodeStatus[nodeName].hasTabs = foundTabs.length > 0;
          nodeStatus[nodeName].tabCount = foundTabs.length;

          if (foundTabs.length > 0) {
            console.log(`✅ ${nodeName}: Found ${foundTabs.length} tabs: ${foundTabs.join(', ')}`);

            // Verify we can see the agent ID in the header
            const agentIdElement = page.locator('[data-testid="terminal-agent-id"]');
            const agentIdVisible = await agentIdElement.isVisible().catch(() => false);
            if (agentIdVisible) {
              const agentIdText = await agentIdElement.textContent();
              console.log(`✅ ${nodeName}: Agent ID visible: "${agentIdText}"`);
            }

            // Verify content area exists
            const contentArea = page.locator('[data-testid="terminal-content"]');
            const contentVisible = await contentArea.isVisible().catch(() => false);
            if (contentVisible) {
              console.log(`✅ ${nodeName}: Content area visible`);
            }
          } else {
            console.log(`⚠️ ${nodeName}: No tabs found in panel`);
          }

          // Close the panel using CORRECT SELECTOR
          const closeButton = page.locator('[data-testid="terminal-close-button"]');
          const closeVisible = await closeButton.isVisible().catch(() => false);

          if (closeVisible) {
            try {
              // Try force click first to avoid z-index issues
              await closeButton.click({ force: true, timeout: 5000 });
              await page.waitForTimeout(500);
              console.log(`✅ ${nodeName}: Panel closed successfully`);

              // Verify panel is actually closed
              const panelStillVisible = await terminalPanel.isVisible({ timeout: 1000 }).catch(() => false);
              if (!panelStillVisible) {
                console.log(`✅ ${nodeName}: Panel confirmed closed`);
              } else {
                console.log(`⚠️ ${nodeName}: Panel still visible after close - trying ESC`);
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
              }
            } catch (closeError) {
              console.log(`⚠️ ${nodeName}: Close button click failed - trying ESC`);
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
            }
          } else {
            console.log(`⚠️ ${nodeName}: Close button not found - trying ESC`);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
          }

        } else {
          console.log(`❌ ${nodeName}: Panel did NOT open (data-testid selector found nothing)`);
          nodeStatus[nodeName].error = 'Panel did not open (verified with data-testid)';
        }

      } catch (error) {
        console.error(`❌ ${nodeName}: Error during test - ${error}`);
        nodeStatus[nodeName].error = String(error);
      }

      console.log('─────────────────────────────────────');
    }

    await page.screenshot({ path: 'test-screenshots/improved-04-final-state.png', fullPage: true });

    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=========================================');

    const results = {
      totalNodes: nodeNames.length,
      appeared: 0,
      clickable: 0,
      opensPanel: 0,
      hasTabs: 0,
      fullyWorking: 0
    };

    for (const nodeName of nodeNames) {
      const status = nodeStatus[nodeName];
      const fullyWorking = status.appeared && status.clickable && status.opensPanel && status.hasTabs;

      if (status.appeared) results.appeared++;
      if (status.clickable) results.clickable++;
      if (status.opensPanel) results.opensPanel++;
      if (status.hasTabs) results.hasTabs++;
      if (fullyWorking) results.fullyWorking++;

      const statusIcon = fullyWorking ? '✅' : status.appeared ? '⚠️' : '❌';

      console.log(`\n${statusIcon} ${nodeName}:`);
      console.log(`   Appeared: ${status.appeared ? '✅' : '❌'}`);
      console.log(`   Clickable: ${status.clickable ? '✅' : '❌'}`);
      console.log(`   Opens Panel: ${status.opensPanel ? '✅' : '❌'}`);
      console.log(`   Has Tabs: ${status.hasTabs ? '✅' : '❌'} (${status.tabCount}/5)`);

      if (status.error) {
        console.log(`   Error: ${status.error}`);
      }
    }

    console.log('\n📈 OVERALL STATISTICS:');
    console.log(`   Total Nodes: ${results.totalNodes}`);
    console.log(`   Appeared: ${results.appeared}/${results.totalNodes} (${Math.round(results.appeared/results.totalNodes*100)}%)`);
    console.log(`   Clickable: ${results.clickable}/${results.appeared} (${results.appeared ? Math.round(results.clickable/results.appeared*100) : 0}%)`);
    console.log(`   Opens Panel: ${results.opensPanel}/${results.clickable} (${results.clickable ? Math.round(results.opensPanel/results.clickable*100) : 0}%)`);
    console.log(`   Has Tabs: ${results.hasTabs}/${results.opensPanel} (${results.opensPanel ? Math.round(results.hasTabs/results.opensPanel*100) : 0}%)`);
    console.log(`   Fully Working: ${results.fullyWorking}/${results.totalNodes} (${Math.round(results.fullyWorking/results.totalNodes*100)}%)`);

    console.log('=========================================\n');

    // Assertions - Now using correct selectors, expect higher success rate
    expect(results.appeared, 'At least 5 nodes should appear').toBeGreaterThanOrEqual(5);
    expect(results.opensPanel, 'At least 5 panels should open (verified with data-testid)').toBeGreaterThanOrEqual(5);
    expect(results.hasTabs, 'At least 5 panels should have tabs').toBeGreaterThanOrEqual(5);
    expect(results.fullyWorking, 'At least 5 nodes should be fully working').toBeGreaterThanOrEqual(5);

    // Store results for reporting
    console.log('\n✅ TEST COMPLETED - Results saved in screenshots and console output');
    console.log('📊 This test uses CORRECT SELECTORS (data-testid) unlike the previous test');
  });
});
