require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 120000, // 2 ደቂቃ ለእያንዳንዱ ቴስት
    fullyParallel: false, // ዳታ እንዳይጋጭ አንድ በአንድ እንዲሮጥ
    workers: 1,
    reporter: [['html'], ['list']],
    use: {
        baseURL: process.env.BASE_URL || 'http://157.180.20.112:4173',
        viewport: { width: 1920, height: 1080 }, // ትልቅ ስክሪን
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }, // በ Chrome ብቻ እንዲሰራ
        },
    ],
});