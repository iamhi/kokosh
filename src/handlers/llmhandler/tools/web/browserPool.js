import puppeteer from 'puppeteer';

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-background-networking',
  '--disable-extensions',
  '--mute-audio',
];

let browser = null;

export const getBrowser = async () => {
  if (browser && browser.connected) return browser;

  const launchOptions = {
    headless: true,
    args: LAUNCH_ARGS,
  };

  if (process.env.CHROMIUM_PATH) {
    launchOptions.executablePath = process.env.CHROMIUM_PATH;
  }

  console.log('[browserPool] Launching Chromium...');
  browser = await puppeteer.launch(launchOptions);

  browser.on('disconnected', () => {
    console.warn(
      '[browserPool] Browser disconnected — will relaunch on next request'
    );
    browser = null;
  });

  console.log('[browserPool] Chromium launched');
  return browser;
};

export const closeBrowser = async () => {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
    console.log('[browserPool] Chromium closed');
  }
};

process.on('SIGTERM', closeBrowser);
process.on('SIGINT', closeBrowser);
process.on('exit', () => {
  if (browser) browser.close().catch(() => {});
});
