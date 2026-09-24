const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = '/home/dwip/.gemini/antigravity-ide/brain/09111447-dbb2-48a7-a470-c81066653fb3';

(async () => {
  console.log('🚀 Loading Jellyfin UI...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Navigate with commit
  console.log('Navigating to http://127.0.0.1:8096/web/index.html...');
  await page.goto('http://127.0.0.1:8096/web/index.html', { waitUntil: 'commit', timeout: 10000 });
  
  console.log('Waiting 5s for client-side rendering...');
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screen_jellyfin_login.png') });
  console.log('Saved screen_jellyfin_login.png');

  // Check page title and url
  console.log('Page Title:', await page.title());
  console.log('Page URL:', page.url());

  // Attempt login if form is present
  const userCard = await page.$('.card, .cardBox, [data-username="Dwip"]');
  if (userCard) {
    console.log('Found user card, clicking...');
    await userCard.click();
    await page.waitForTimeout(1500);
  }

  const pwField = await page.$('input[type="password"]');
  if (pwField) {
    console.log('Typing password 1234dwip1234...');
    await pwField.fill('1234dwip1234');
    await page.waitForTimeout(500);
    await pwField.press('Enter');
    console.log('Pressed Enter, waiting 5s for home screen...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screen_jellyfin_dashboard.png') });
    console.log('Saved screen_jellyfin_dashboard.png');
  }

  await browser.close();
  console.log('Done!');
})();
