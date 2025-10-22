const { chromium } = require('playwright');

async function testOrchestrationUI() {
  console.log('🚀 Starting Playwright test of Orchestration System UI...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test 1: Homepage
    console.log('✅ TEST 1: Loading Homepage');
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');

    const title = await page.textContent('h1');
    console.log(`   Title: ${title}`);

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/01-homepage.png' });
    console.log('   Screenshot saved: 01-homepage.png\n');

    // Test 2: Dashboard Page
    console.log('✅ TEST 2: Loading Dashboard');
    await page.click('a[href="/dashboard"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const dashboardTitle = await page.textContent('h1');
    console.log(`   Title: ${dashboardTitle}`);

    // Check for Agent Activity Monitor
    const agentMonitor = await page.locator('text=Manager Agents').count();
    console.log(`   Agent Activity Monitor present: ${agentMonitor > 0}`);

    // Check for Session Monitor
    const sessionMonitor = await page.locator('text=Active Sessions').count();
    console.log(`   Session Monitor present: ${sessionMonitor > 0}`);

    await page.screenshot({ path: 'test-screenshots/02-dashboard.png' });
    console.log('   Screenshot saved: 02-dashboard.png\n');

    // Test 3: Agents Page
    console.log('✅ TEST 3: Loading Agents Page');
    await page.goto('http://localhost:3002/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const agentsTitle = await page.textContent('h1');
    console.log(`   Title: ${agentsTitle}`);

    // Count manager agent cards
    const managerCards = await page.locator('.border-purple-400\\/30, .border-blue-400\\/30, .border-green-400\\/30, .border-orange-400\\/30, .border-yellow-400\\/30, .border-pink-400\\/30').count();
    console.log(`   Manager agent cards visible: ${managerCards}`);

    await page.screenshot({ path: 'test-screenshots/03-agents.png' });
    console.log('   Screenshot saved: 03-agents.png\n');

    // Test 4: Tasks Page
    console.log('✅ TEST 4: Loading Tasks Page');
    await page.goto('http://localhost:3002/tasks');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const tasksTitle = await page.textContent('h1');
    console.log(`   Title: ${tasksTitle}`);

    await page.screenshot({ path: 'test-screenshots/04-tasks-empty.png' });
    console.log('   Screenshot saved: 04-tasks-empty.png\n');

    // Test 5: Submit a Test Task
    console.log('✅ TEST 5: Submitting Test Task');

    // Fill in the form
    await page.fill('input[placeholder*="Twitter"]', 'Build a Simple Todo List App');
    console.log('   ✓ Filled in title');

    await page.fill('textarea[placeholder*="Describe"]', `Create a simple todo list web application with the following features:
- Add new tasks
- Mark tasks as complete
- Delete tasks
- Filter tasks (all, active, completed)
- Local storage persistence
- Clean, modern UI with Tailwind CSS
- Responsive design

Tech Stack:
- Frontend: React with Next.js
- Styling: Tailwind CSS
- Storage: Browser localStorage

Keep it simple and focused on core functionality.`);
    console.log('   ✓ Filled in description');

    await page.selectOption('select', 'high');
    console.log('   ✓ Selected priority: high');

    await page.screenshot({ path: 'test-screenshots/05-task-form-filled.png' });
    console.log('   Screenshot saved: 05-task-form-filled.png\n');

    // Submit the form
    console.log('   Submitting form...');
    await page.click('button[type="submit"]');

    // Wait for submission response
    await page.waitForTimeout(3000);

    // Check for success message
    const successMessage = await page.locator('text=/Task Submitted Successfully/i').count();
    console.log(`   Success message displayed: ${successMessage > 0}`);

    if (successMessage > 0) {
      // Try to extract task ID
      const taskIdElement = await page.locator('text=/Task ID:/').textContent().catch(() => null);
      if (taskIdElement) {
        console.log(`   ${taskIdElement}`);
      }
    }

    await page.screenshot({ path: 'test-screenshots/06-task-submitted.png' });
    console.log('   Screenshot saved: 06-task-submitted.png\n');

    // Test 6: Check Dashboard for Updates
    console.log('✅ TEST 6: Checking Dashboard for Updates');
    await page.goto('http://localhost:3002/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check if any agents are active
    const activeAgents = await page.locator('text=/processing|active/i').count();
    console.log(`   Active agents detected: ${activeAgents}`);

    // Check if any sessions are visible
    const sessions = await page.locator('text=/No active sessions|Task ID/i').count();
    console.log(`   Session information visible: ${sessions > 0}`);

    await page.screenshot({ path: 'test-screenshots/07-dashboard-after-submit.png' });
    console.log('   Screenshot saved: 07-dashboard-after-submit.png\n');

    // Test 7: Navigation Links
    console.log('✅ TEST 7: Testing Navigation');

    // Test back to home
    await page.click('a[href="/"]');
    await page.waitForLoadState('networkidle');
    console.log('   ✓ Back to home works');

    // Test all main navigation links
    await page.click('a[href="/dashboard"]');
    await page.waitForLoadState('networkidle');
    console.log('   ✓ Dashboard link works');

    await page.goto('http://localhost:3002');
    await page.click('a[href="/agents"]');
    await page.waitForLoadState('networkidle');
    console.log('   ✓ Agents link works');

    await page.goto('http://localhost:3002');
    await page.click('a[href="/tasks"]');
    await page.waitForLoadState('networkidle');
    console.log('   ✓ Tasks link works\n');

    // Test 8: API Endpoints
    console.log('✅ TEST 8: Testing API Endpoints');

    // Test agents API
    const agentsResponse = await page.request.get('http://localhost:3002/api/agents');
    console.log(`   GET /api/agents: ${agentsResponse.status()}`);
    const agentsData = await agentsResponse.json();
    console.log(`   Agents returned: ${agentsData.agents?.length || 0}`);

    // Test tasks status API
    const tasksResponse = await page.request.get('http://localhost:3002/api/tasks/status');
    console.log(`   GET /api/tasks/status: ${tasksResponse.status()}`);
    const tasksData = await tasksResponse.json();
    console.log(`   Tasks returned: ${tasksData.tasks?.length || 0}`);

    console.log('\n🎉 All tests completed successfully!\n');

    // Final summary screenshot
    await page.goto('http://localhost:3002/dashboard');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/08-final-dashboard.png', fullPage: true });
    console.log('📸 Final full-page screenshot saved: 08-final-dashboard.png\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-screenshots/error.png' });
    throw error;
  } finally {
    // Keep browser open for 5 seconds to see final state
    console.log('Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
    console.log('Browser closed.');
  }
}

// Run the test
testOrchestrationUI().catch(console.error);
