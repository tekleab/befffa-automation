// 1. መጀመሪያ .env ፋይሉን እንዲያነብ ይሄን መስመር ጨምር
require('dotenv').config();

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 450000,
    expect: { timeout: 15000 },
    // E2E ስለሆነ አንዱ ቴስት የሌላኛውን ዳታ ስለሚጠቀም parallel መሆን የለበትም
    fullyParallel: false,
    reporter: [['html', { open: 'always' }], ['list']],
    use: {
        // በ .env ውስጥ ያለውን baseURL መጠቀም ይቻላል ወይም ይሄው ይቆይ
        baseURL: process.env.BASE_URL || 'http://157.180.20.112:4173',
        viewport: null,
        launchOptions: {
            args: [
                '--start-maximized',
                '--force-device-scale-factor=0.8'
            ],
        },
        trace: 'on-first-retry',
        video: 'on', // 🎥 ቪዲዮ ሁልጊዜ እንዲቀዳ መደረጉ ለ CI/CD በጣም አሪፍ ነው
        screenshot: 'only-on-failure',
        headless: false,
    },
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});