const { chromium } = require('playwright');
const path = require('path');
const ARTIFACTS_DIR = '/home/dwip/.gemini/antigravity-ide/brain/09111447-dbb2-48a7-a470-c81066653fb3';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://127.0.0.1:4533/app/#/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const userField = await page.$('input[name="username"], input#username');
  if (userField) {
    await userField.fill('Dwip');
    const pwField = await page.$('input[type="password"]');
    if (pwField) await pwField.fill('1234dwip1234');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await page.waitForTimeout(3500);
  }

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screen_navidrome_dashboard.png') });
  console.log('Saved screen_navidrome_dashboard.png');
  await browser.close();
})();
