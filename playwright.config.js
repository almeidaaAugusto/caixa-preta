import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests',testMatch:'**/*.spec.js',fullyParallel:false,workers:1,timeout:30000,
  reporter:[['list']],use:{baseURL:'http://127.0.0.1:4173',channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[{name:'desktop',use:{viewport:{width:1440,height:1000}}},{name:'celular',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
  webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:true,timeout:15000},
});
