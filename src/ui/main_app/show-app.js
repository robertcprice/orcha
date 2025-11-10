const { chromium } = require('playwright');

async function showApp() {
  console.log('🚀 Opening Orchestration System UI with Project Management...\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();

  try {
    // Navigate to homepage
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    console.log('✅ App loaded successfully!');
    console.log('📂 You can now:');
    console.log('   - Create new projects using the "New Project" button');
    console.log('   - Select existing projects by clicking on them');
    console.log('   - Delete projects using the trash icon');
    console.log('   - Navigate to Dashboard, Agents, or Tasks pages');
    console.log('\n🌐 URL: http://localhost:3002');
    console.log('\n⌨️  Press Ctrl+C in the terminal to stop the server when done\n');

    // Keep browser open indefinitely until manually closed
    await page.waitForEvent('close', { timeout: 0 }).catch(() => {});

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
    console.log('\nBrowser closed.');
  }
}

showApp();
