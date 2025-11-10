import { test, expect } from '@playwright/test';

test.describe('Click All Nodes Test - Verify Each Node Opens', () => {
  test.setTimeout(240000); // 4 minutes

  test('should submit task and click every node to verify they open correctly', async ({ page }) => {
    console.log('\n🎯 CLICK ALL NODES TEST');
    console.log('=========================================\n');

    console.log('📍 Step 1: Load Page & Handle Previous Task');
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

    await page.screenshot({ path: 'test-screenshots/nodes-01-initial.png', fullPage: true });

    console.log('\n📍 Step 2: Submit New Task');

    const taskInput = page.locator('input[placeholder*="Describe"], textarea[placeholder*="Describe"], input[type="text"]').first();
    await taskInput.waitFor({ state: 'visible', timeout: 10000 });

    const testGoal = 'Create a hello world program in Python';
    console.log(`Submitting task: "${testGoal}"`);

    await taskInput.fill(testGoal);
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'test-screenshots/nodes-02-task-submitted.png', fullPage: true });

    console.log('\n📍 Step 3: Wait for All Nodes to Appear');

    // Wait for planning nodes
    const nodeNames = ['Claude', 'ChatGPT', 'DeepSeek', 'Grok', 'Gemini', 'Hybrid Orchestrator'];
    const nodeStatus: Record<string, { appeared: boolean; clickable: boolean; opensPanel: boolean; hasContent: boolean; error?: string }> = {};

    // Initialize status
    for (const nodeName of nodeNames) {
      nodeStatus[nodeName] = {
        appeared: false,
        clickable: false,
        opensPanel: false,
        hasContent: false
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

    await page.screenshot({ path: 'test-screenshots/nodes-03-all-nodes-visible.png', fullPage: true });

    console.log('\n📍 Step 4: Click Each Node and Verify Panel Opens');
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
          path: `test-screenshots/nodes-04-${nodeName.toLowerCase().replace(/\s+/g, '-')}-clicked.png`,
          fullPage: true
        });

        // Test 3: Check if panel/terminal opened
        const terminalPanel = page.locator('div[class*="terminal"], div[class*="modal"], div[class*="panel"]').first();
        const panelVisible = await terminalPanel.isVisible({ timeout: 3000 }).catch(() => false);

        if (panelVisible) {
          nodeStatus[nodeName].opensPanel = true;
          console.log(`✅ ${nodeName}: Panel/terminal opened`);

          // Test 4: Check if panel has content
          const panelContent = await terminalPanel.textContent();
          const hasContent = panelContent && panelContent.trim().length > 10;

          nodeStatus[nodeName].hasContent = hasContent;

          if (hasContent) {
            console.log(`✅ ${nodeName}: Panel has content (${panelContent.substring(0, 100)}...)`);
          } else {
            console.log(`⚠️ ${nodeName}: Panel opened but appears empty`);
          }

          // Check for tabs (Logs, Input, Thoughts, Code, Output)
          const tabs = ['Logs', 'Input', 'Thoughts', 'Code', 'Output'];
          const foundTabs: string[] = [];

          for (const tabName of tabs) {
            const tab = page.locator(`button:has-text("${tabName}")`);
            const tabVisible = await tab.isVisible().catch(() => false);
            if (tabVisible) {
              foundTabs.push(tabName);
            }
          }

          if (foundTabs.length > 0) {
            console.log(`✅ ${nodeName}: Found tabs: ${foundTabs.join(', ')}`);

            // Click each tab to verify
            for (const tabName of foundTabs) {
              const tab = page.locator(`button:has-text("${tabName}")`);
              await tab.click();
              await page.waitForTimeout(500);

              await page.screenshot({
                path: `test-screenshots/nodes-05-${nodeName.toLowerCase().replace(/\s+/g, '-')}-${tabName.toLowerCase()}-tab.png`,
                fullPage: true
              });

              console.log(`  📑 ${nodeName} - ${tabName} tab clicked`);
            }
          } else {
            console.log(`⚠️ ${nodeName}: No tabs found in panel`);
          }

          // Close the panel
          const closeButton = page.locator('button[title="Close"], button:has-text("×")').first();
          const closeVisible = await closeButton.isVisible().catch(() => false);

          if (closeVisible) {
            await closeButton.click();
            await page.waitForTimeout(500);
            console.log(`✅ ${nodeName}: Panel closed successfully`);
          } else {
            console.log(`⚠️ ${nodeName}: No close button found`);
            // Try ESC key
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
            console.log(`✅ ${nodeName}: Attempted to close with ESC key`);
          }

        } else {
          console.log(`❌ ${nodeName}: Panel did NOT open after clicking`);
          nodeStatus[nodeName].error = 'Panel did not open after click';
        }

      } catch (error) {
        console.error(`❌ ${nodeName}: Error during test - ${error}`);
        nodeStatus[nodeName].error = String(error);
      }

      console.log('─────────────────────────────────────');
    }

    await page.screenshot({ path: 'test-screenshots/nodes-06-final-state.png', fullPage: true });

    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=========================================');

    const results = {
      totalNodes: nodeNames.length,
      appeared: 0,
      clickable: 0,
      opensPanel: 0,
      hasContent: 0,
      fullyWorking: 0
    };

    for (const nodeName of nodeNames) {
      const status = nodeStatus[nodeName];
      const fullyWorking = status.appeared && status.clickable && status.opensPanel;

      if (status.appeared) results.appeared++;
      if (status.clickable) results.clickable++;
      if (status.opensPanel) results.opensPanel++;
      if (status.hasContent) results.hasContent++;
      if (fullyWorking) results.fullyWorking++;

      const statusIcon = fullyWorking ? '✅' : status.appeared ? '⚠️' : '❌';

      console.log(`\n${statusIcon} ${nodeName}:`);
      console.log(`   Appeared: ${status.appeared ? '✅' : '❌'}`);
      console.log(`   Clickable: ${status.clickable ? '✅' : '❌'}`);
      console.log(`   Opens Panel: ${status.opensPanel ? '✅' : '❌'}`);
      console.log(`   Has Content: ${status.hasContent ? '✅' : '⚠️'}`);

      if (status.error) {
        console.log(`   Error: ${status.error}`);
      }
    }

    console.log('\n📈 OVERALL STATISTICS:');
    console.log(`   Total Nodes: ${results.totalNodes}`);
    console.log(`   Appeared: ${results.appeared}/${results.totalNodes} (${Math.round(results.appeared/results.totalNodes*100)}%)`);
    console.log(`   Clickable: ${results.clickable}/${results.appeared} (${results.appeared ? Math.round(results.clickable/results.appeared*100) : 0}%)`);
    console.log(`   Opens Panel: ${results.opensPanel}/${results.clickable} (${results.clickable ? Math.round(results.opensPanel/results.clickable*100) : 0}%)`);
    console.log(`   Has Content: ${results.hasContent}/${results.opensPanel} (${results.opensPanel ? Math.round(results.hasContent/results.opensPanel*100) : 0}%)`);
    console.log(`   Fully Working: ${results.fullyWorking}/${results.totalNodes} (${Math.round(results.fullyWorking/results.totalNodes*100)}%)`);

    console.log('=========================================\n');

    // Assertions
    expect(results.appeared, 'At least 5 nodes should appear').toBeGreaterThanOrEqual(5);
    expect(results.fullyWorking, 'At least 3 nodes should be fully working (appear, clickable, opens panel)').toBeGreaterThanOrEqual(3);

    // Store results for reporting
    console.log('\n✅ TEST COMPLETED - Results saved in screenshots and console output');
  });
});
