import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
for(const [name,width,height,path] of [['landing-desktop',1440,1000,'/'],['painel-desktop',1440,1000,'/admin'],['links-celular',390,844,'/links'],['painel-celular',390,844,'/admin?tab=links']]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  await page.goto(`http://127.0.0.1:4173${path}`);await page.locator('h1').first().waitFor();await page.locator('img').evaluateAll(images=>Promise.all(images.map(async image=>{image.loading='eager';try{await image.decode();}catch{}})));await page.screenshot({path:`artifacts/${name}.png`,fullPage:true});await page.close();
}
await browser.close();console.log('Quatro capturas em artifacts/.');
