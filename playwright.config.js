const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  
  /* 1. ጠቅላላ የቴስት ጊዜ ገደብ (5 ደቂቃ) */
  timeout: 300000, 
  expect: { 
    timeout: 15000 
  },

  /* 2. Parallel Execution Setup */
  fullyParallel: true,

  // 🚀 ወደ 3 ዝቅ ተደርጓል - ሰርቨሩ እንዳይጨናነቅ እና ቴስቱ እንዳይከሽፍ
  workers: process.env.CI ? 3 : undefined,

  reporter: 'html',

  /* 3. Global Settings */
  use: {
    baseURL: 'http://157.180.20.112:4173',
    viewport: { width: 1600, height: 900 },

    launchOptions: {
      args: ['--start-maximized']
    },

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /* ፓራለል በሚሆንበት ጊዜ ሰርቨሩ ስለሚቆይ እነዚህ ታይም-አውቶች ወሳኝ ናቸው */
    actionTimeout: 40000,    
    navigationTimeout: 80000, 
  },

  /* 4. ብሮውዘር ፕሮጀክቶች */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1600, height: 900 },
      },
    },
  ],

  outputDir: 'test-results/',
});
