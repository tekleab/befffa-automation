require('dotenv').config();
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 600000, // 10 ደቂቃ
    expect: { timeout: 30000 }, // 30 ሰከንድ መጠበቂያ
    fullyParallel: false,
    workers: process.env.CI ? 1 : undefined, // በ CI ላይ አንድ በአንድ እንዲሮጥ
    reporter: [['html', { open: 'never' }], ['list']],
    use: {
        baseURL: process.env.BASE_URL || 'http://157.180.20.112:4173',
        // 🖥️ ስክሪኑን ትልቅ በማድረግ የ "Desktop only" ስህተትን ይፈታል
        viewport: { width: 1920, height: 1080 },
        actionTimeout: 40000,
        navigationTimeout: 60000,
        trace: 'on',
        video: 'on',
        screenshot: 'on',
        headless: process.env.CI ? true : false,
    },
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});