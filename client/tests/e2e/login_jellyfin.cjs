const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = '/home/dwip/.gemini/antigravity-ide/brain/09111447-dbb2-48a7-a470-c81066653fb3';

(async () => {
  console.log('🚀 Logging in to Jellyfin via Locator...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://127.0.0.1:8096/web/index.html', { waitUntil: 'commit', timeout: 10000 });
  
  console.log('Waiting for login form fields...');
  const userLocator = page.locator('input:not([type="password"]):not([type="checkbox"])').first();
  await userLocator.waitFor({ state: 'visible', timeout: 10000 });
  await userLocator.click();
  await userLocator.fill('');
  await userLocator.fill('Dwip');

  const pwLocator = page.locator('input[type="password"]').first();
  await pwLocator.waitFor({ state: 'visible', timeout: 5000 });
  await pwLocator.click();
  await pwLocator.fill('1234dwip1234');

  await page.waitForTimeout(500);

  const btnLocator = page.locator('button:has-text("Sign In"), button[type="submit"]').first();
  await btnLocator.click();

  console.log('Clicked Sign In! Waiting for home dashboard...');
  await page.waitForTimeout(7000);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screen_jellyfin_home.png') });
  console.log('Saved screen_jellyfin_home.png');
  console.log('Final URL:', page.url());

  await browser.close();
  console.log('Done!');
})();
