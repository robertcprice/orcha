const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('=== COMPREHENSIVE WORKFLOW TEST ===\n');

  await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Check initial state
  console.log('1️⃣ Initial State Check:');
  const canvas = await page.locator('canvas').count();
  console.log('   - Particle canvas:', canvas === 1 ? '✅' : '❌');

  const initialNodes = await page.evaluate(() => {
    const divs = document.querySelectorAll('div[style*="left:"][style*="top:"]');
    return divs.length;
  });
  console.log('   - Orchestrator node:', initialNodes >= 1 ? '✅' : '❌');

  // 2. Submit task
  console.log('\n2️⃣ Task Submission:');
  await page.fill('input[type="text"]', 'Test complete workflow');
  await page.press('input[type="text"]', 'Enter');
  console.log('   - Task submitted: ✅');

  // 3. Check API response
  await page.waitForTimeout(1000);
  const taskSubmitted = await page.evaluate(() => {
    return document.querySelector('input[type="text"]')?.value === '';
  });
  console.log('   - Input cleared:', taskSubmitted ? '✅' : '❌');

  // 4. Wait for orchestrator to detect task
  console.log('\n3️⃣ Orchestrator Visualization (waiting 5s for polling):');
  await page.waitForTimeout(5000);

  const nodePulsing = await page.evaluate(() => {
    const nodes = document.querySelectorAll('div[style*="left:"][style*="top:"]');
    for (let node of nodes) {
      if (node.className.includes('pulse')) {
        return true;
      }
    }
    return false;
  });
  console.log('   - Node pulsing:', nodePulsing ? '✅' : '❌');

  // 5. Check active task API
  console.log('\n4️⃣ Backend Status:');
  const activeTask = await page.evaluate(async () => {
    const res = await fetch('/api/hybrid-orchestrator/active');
    const data = await res.json();
    return (data.active_tasks && data.active_tasks.length > 0) || data.active_task !== null;
  });
  console.log('   - Active task in Redis:', activeTask ? '✅' : '❌');

  console.log('\n=== TEST COMPLETE ===');
  console.log('Overall Status:',
    canvas && initialNodes && taskSubmitted && nodePulsing && activeTask ?
    '✅ ALL SYSTEMS OPERATIONAL' :
    '⚠️  SOME ISSUES DETECTED');

  await page.waitForTimeout(1000);
  await browser.close();
})();
