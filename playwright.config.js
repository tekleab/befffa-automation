// 1. መጀመሪያ .env ፋይሉን እንዲያነብ ይሄን መስመር ጨምር
require('dotenv').config();

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 450000,
    expect: { timeout: 15000 },
    // E2E ስለሆነ አንዱ ቴስት የሌላኛውን ዳታ ስለሚጠቀም parallel መሆን የለበትም
    fullyParallel: false,
    reporter: [['html', { open: 'never' }], ['list']], // CI ላይ 'always' አይሰራም፣ 'never' እናድርገው
    use: {
        baseURL: process.env.BASE_URL || 'http://157.180.20.112:4173',
        viewport: null,
        launchOptions: {
            args: [
                '--start-maximized',
                '--force-device-scale-factor=0.8'
            ],
        },
        trace: 'on',
        video: 'on',
        screenshot: 'on',
        // GitHub Actions ላይ እንዲሰራ የግድ true መሆን አለበት
        headless: process.env.CI ? true : false,
    },
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});