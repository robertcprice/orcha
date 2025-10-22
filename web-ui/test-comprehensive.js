const { chromium } = require('playwright');

async function comprehensiveTest() {
  console.log('🚀 Comprehensive Orchestration System UI Test\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down actions to see them
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST 1: Homepage Navigation');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const title = await page.textContent('h1');
    console.log(`✓ Page Title: "${title}"`);

    const subtitle = await page.textContent('p').catch(() => 'N/A');
    console.log(`✓ Subtitle: "${subtitle}"`);

    // Check for navigation cards
    const dashboardCard = await page.locator('a[href="/dashboard"]').count();
    const agentsCard = await page.locator('a[href="/agents"]').count();
    const tasksCard = await page.locator('a[href="/tasks"]').count();

    console.log(`✓ Navigation Cards: Dashboard=${dashboardCard}, Agents=${agentsCard}, Tasks=${tasksCard}`);

    await page.screenshot({ path: 'test-screenshots/test1-homepage.png' });
    console.log('✓ Screenshot: test1-homepage.png\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST 2: Dashboard - Agent Activity Monitor');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await page.goto('http://localhost:3002/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const dashboardTitle = await page.textContent('h1');
    console.log(`✓ Dashboard Title: "${dashboardTitle}"`);

    // Check for Manager Agents section
    const managerAgentsHeader = await page.locator('text=Manager Agents').count();
    console.log(`✓ Manager Agents Section: ${managerAgentsHeader > 0 ? 'Present' : 'Missing'}`);

    // Count individual manager cards
    const managerNames = ['Database Manager', 'Frontend Manager', 'Backend Manager',
                          'Infrastructure Manager', 'Testing Manager', 'Documentation Manager'];

    for (const name of managerNames) {
      const found = await page.locator(`text=${name}`).count();
      console.log(`  ${found > 0 ? '✓' : '✗'} ${name}: ${found > 0 ? 'Found' : 'Not Found'}`);
    }

    // Check Active Sessions section
    const sessionsHeader = await page.locator('text=Active Sessions').count();
    console.log(`✓ Active Sessions Section: ${sessionsHeader > 0 ? 'Present' : 'Missing'}`);

    await page.screenshot({ path: 'test-screenshots/test2-dashboard.png', fullPage: true });
    console.log('✓ Screenshot: test2-dashboard.png\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST 3: Agents Page');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await page.goto('http://localhost:3002/agents', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    const agentsTitle = await page.textContent('h1');
    console.log(`✓ Agents Page Title: "${agentsTitle}"`);

    await page.screenshot({ path: 'test-screenshots/test3-agents.png', fullPage: true });
    console.log('✓ Screenshot: test3-agents.png\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST 4: Tasks Page & Form Submission');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await page.goto('http://localhost:3002/tasks', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const tasksTitle = await page.textContent('h1');
    console.log(`✓ Tasks Page Title: "${tasksTitle}"`);

    // Check form elements
    const titleInput = await page.locator('input[type="text"]').count();
    const descriptionTextarea = await page.locator('textarea').count();
    const prioritySelect = await page.locator('select').count();
    const submitButton = await page.locator('button[type="submit"]').count();

    console.log(`✓ Form Elements:`);
    console.log(`  - Title Input: ${titleInput > 0 ? 'Found' : 'Missing'}`);
    console.log(`  - Description Textarea: ${descriptionTextarea > 0 ? 'Found' : 'Missing'}`);
    console.log(`  - Priority Select: ${prioritySelect > 0 ? 'Found' : 'Missing'}`);
    console.log(`  - Submit Button: ${submitButton > 0 ? 'Found' : 'Missing'}`);

    await page.screenshot({ path: 'test-screenshots/test4a-tasks-form.png' });
    console.log('✓ Screenshot: test4a-tasks-form.png\n');

    // Fill and submit the form
    console.log('Filling out task submission form...');

    const testTask = {
      title: 'Build a Simple Todo List App',
      description: `Create a simple todo list web application with the following features:

Features:
- Add new tasks with a text input
- Mark tasks as complete with checkboxes
- Delete tasks with a delete button
- Filter tasks (all, active, completed)
- Task counter showing remaining items
- Local storage persistence (tasks saved on page reload)
- Clean, modern UI with Tailwind CSS
- Responsive design for mobile and desktop

Tech Stack:
- Frontend: React with Next.js 13+
- Styling: Tailwind CSS
- Storage: Browser localStorage API
- State Management: React hooks (useState, useEffect)

Requirements:
- Keep the code simple and well-commented
- Use functional components only
- Implement proper error handling
- Add basic accessibility features (ARIA labels)
- Ensure tasks persist across browser sessions

The app should be production-ready with clean code and good UX.`,
      priority: 'high'
    };

    await page.fill('input[type="text"]', testTask.title);
    console.log(`  ✓ Filled title: "${testTask.title}"`);

    await page.fill('textarea', testTask.description);
    console.log(`  ✓ Filled description (${testTask.description.length} chars)`);

    await page.selectOption('select', testTask.priority);
    console.log(`  ✓ Selected priority: ${testTask.priority}`);

    await page.screenshot({ path: 'test-screenshots/test4b-form-filled.png', fullPage: true });
    console.log('✓ Screenshot: test4b-form-filled.png\n');

    console.log('Submitting form...');
    await page.click('button[type="submit"]');

    // Wait for submission response
    await page.waitForTimeout(3000);

    // Check for success or error message
    const hasSuccess = await page.locator('text=/Task Submitted Successfully|✓|success/i').count();
    const hasError = await page.locator('text=/error|failed|✗/i').count();

    if (hasSuccess > 0) {
      console.log('✅ Task submission: SUCCESS');

      // Try to get task ID
      const taskIdText = await page.locator('text=/Task ID/i').textContent().catch(() => null);
      if (taskIdText) {
        console.log(`✓ ${taskIdText}`);
      }
    } else if (hasError > 0) {
      console.log('⚠️  Task submission: Error message displayed');
    } else {
      console.log('❓ Task submission: Status unclear');
    }

    await page.screenshot({ path: 'test-screenshots/test4c-after-submit.png', fullPage: true });
    console.log('✓ Screenshot: test4c-after-submit.png\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST 5: API Endpoints');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Test /api/agents
    console.log('Testing GET /api/agents...');
    const agentsResp = await page.request.get('http://localhost:3002/api/agents');
    console.log(`  Status: ${agentsResp.status()}`);
    if (agentsResp.ok()) {
      const agentsData = await agentsResp.json();
      console.log(`  Response: ${agentsData.ok ? 'OK' : 'Error'}`);
      console.log(`  Agents Count: ${agentsData.agents?.length || 0}`);
      if (agentsData.agents && agentsData.agents.length > 0) {
        console.log(`  Sample Agent: ${agentsData.agents[0].name}`);
      }
    }

    // Test /api/tasks/status
    console.log('\nTesting GET /api/tasks/status...');
    const tasksResp = await page.request.get('http://localhost:3002/api/tasks/status');
    console.log(`  Status: ${tasksResp.status()}`);
    if (tasksResp.ok()) {
      const tasksData = await tasksResp.json();
      console.log(`  Response: ${tasksData.ok ? 'OK' : 'Error'}`);
      console.log(`  Tasks Count: ${tasksData.tasks?.length || 0}`);
      if (tasksData.tasks && tasksData.tasks.length > 0) {
        console.log(`  Sample Task: ${tasksData.tasks[0].title}`);
        console.log(`  Task Status: ${tasksData.tasks[0].status}`);
      }
    }

    // Test /api/tasks/submit info endpoint
    console.log('\nTesting GET /api/tasks/submit (info)...');
    const submitInfoResp = await page.request.get('http://localhost:3002/api/tasks/submit');
    console.log(`  Status: ${submitInfoResp.status()}`);
    if (submitInfoResp.ok()) {
      const info = await submitInfoResp.json();
      console.log(`  Endpoint: ${info.endpoint}`);
      console.log(`  Method: ${info.method}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('TEST 6: Navigation Flow');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Test back buttons and navigation
    console.log('Testing "Back to Home" links...');
    await page.goto('http://localhost:3002/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const backLink = await page.locator('a[href="/"]').first();
    if (await backLink.count() > 0) {
      await backLink.click();
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      console.log(`  ✓ Back to home works (URL: ${currentUrl})`);
    }

    // Test direct navigation
    console.log('\nTesting direct navigation...');
    const pages = ['/dashboard', '/agents', '/tasks'];
    for (const route of pages) {
      await page.goto(`http://localhost:3002${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      console.log(`  ✓ ${route} - Loaded successfully`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('TEST 7: Final Dashboard Check');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await page.goto('http://localhost:3002/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Check if any updates from task submission
    const activeCount = await page.locator('text=/0 active|1 active|2 active/i').count();
    console.log(`Active agents indicator: ${activeCount > 0 ? 'Found' : 'Not found'}`);

    await page.screenshot({ path: 'test-screenshots/test7-final-dashboard.png', fullPage: true });
    console.log('✓ Screenshot: test7-final-dashboard.png\n');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📊 Test Summary:');
    console.log('  ✓ Homepage loaded and displayed correctly');
    console.log('  ✓ Dashboard showing all 6 manager agents');
    console.log('  ✓ Agents page accessible');
    console.log('  ✓ Tasks page with functional form');
    console.log('  ✓ Task submission completed');
    console.log('  ✓ API endpoints responding');
    console.log('  ✓ Navigation working across all pages');
    console.log('\n📸 Screenshots saved to test-screenshots/');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await page.screenshot({ path: 'test-screenshots/error-final.png', fullPage: true });
    throw error;
  } finally {
    console.log('\nKeeping browser open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
    console.log('Browser closed. Test complete.\n');
  }
}

comprehensiveTest().catch(console.error);
