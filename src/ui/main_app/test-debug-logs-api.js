const { chromium } = require('playwright');

(async () => {
  console.log('\n🔍 DEBUG: Agent Logs API Test\n');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture all network requests
  const apiRequests = [];
  page.on('request', request => {
    if (request.url().includes('/api/agents/logs')) {
      apiRequests.push({
        url: request.url(),
        method: request.method()
      });
      console.log(`\n📡 API Request: ${request.url()}`);
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/agents/logs')) {
      try {
        const data = await response.json();
        console.log(`\n📥 API Response:`);
        console.log(`   Status: ${response.status()}`);
        console.log(`   Logs count: ${data.logs ? data.logs.length : 0}`);
        if (data.logs && data.logs.length > 0) {
          console.log(`   First log: ${JSON.stringify(data.logs[0]).substring(0, 200)}`);
        }
      } catch (e) {
        console.log(`\n📥 API Response: ${response.status()} (not JSON)`);
      }
    }
  });

  // Capture console logs from the page
  page.on('console', msg => {
    if (msg.text().includes('agent') || msg.text().includes('logs') || msg.text().includes('Failed')) {
      console.log(`\n🖥️  Browser console: ${msg.text()}`);
    }
  });

  try {
    await page.goto('http://localhost:3002');
    await page.waitForTimeout(2000);

    // Submit task
    const input = page.locator('input[type="text"]').first();
    await input.fill('Create add function');
    await input.press('Enter');
    console.log('\n✅ Task submitted');

    // Wait for nodes
    await page.waitForTimeout(45000);

    const nodes = await page.locator('[class*="cursor-pointer"][class*="group"]').all();
    console.log(`\n📊 Found ${nodes.length} agent nodes`);

    if (nodes.length >= 2) {
      // Get the agent ID from the node
      const agentId = await page.evaluate(() => {
        const nodes = document.querySelectorAll('[class*="cursor-pointer"][class*="group"]');
        const node = nodes[1];
        // Try to find the agent ID in the node or parent
        const dataId = node.getAttribute('data-agent-id') ||
                       node.getAttribute('id') ||
                       'unknown';
        return dataId;
      });

      console.log(`\n🎯 Agent node ID: ${agentId}`);

      // Click node
      await nodes[1].click({ force: true });
      console.log('\n✅ Node clicked');

      // Wait for API calls
      await page.waitForTimeout(5000);

      console.log(`\n📊 Total API requests captured: ${apiRequests.length}`);
      apiRequests.forEach((req, i) => {
        console.log(`   ${i + 1}. ${req.url}`);
      });

      // Check terminal content
      const terminalContent = await page.evaluate(() => {
        const terminal = document.querySelector('[class*="overflow-y-auto"]');
        return terminal ? terminal.innerText : 'NO TERMINAL FOUND';
      });

      console.log(`\n📝 Terminal content:\n${terminalContent.substring(0, 500)}`);

    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await page.screenshot({
      path: '/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/web-ui/test-screenshots/debug-logs-api.png',
      fullPage: true
    });
    await browser.close();
    console.log('\n✅ Debug complete\n');
  }
})();
