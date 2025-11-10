const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3002');
  await page.waitForTimeout(2000);
  
  // Type a task
  await page.fill('input[type="text"]', 'Create a hello world function');
  
  // Submit
  await page.press('input[type="text"]', 'Enter');
  
  // Wait and capture console errors
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error));
  
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
