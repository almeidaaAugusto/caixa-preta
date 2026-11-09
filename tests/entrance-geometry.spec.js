import {test,expect} from '@playwright/test';

async function expectClosedCube(page) {
  const faces=await page.locator('.entrance-face').evaluateAll(elements=>elements.map(face=>{
    const style=getComputedStyle(face);
    const origin=style.transformOrigin.split(' ').map(parseFloat);
    const matrix=new DOMMatrix(style.transform);
    const size=face.parentElement.offsetWidth;
    const corners=[[0,0],[face.offsetWidth,0],[face.offsetWidth,face.offsetHeight],[0,face.offsetHeight]].map(([x,y])=>{
      const point=new DOMPoint(x-origin[0],y-origin[1],-(origin[2]||0)).matrixTransform(matrix);
      return [(point.x+origin[0]+face.offsetLeft)/size,(point.y+origin[1]+face.offsetTop)/size,(point.z+(origin[2]||0))/size];
    });
    return {name:face.classList[1],bounds:[0,1,2].flatMap(axis=>[Math.min(...corners.map(p=>p[axis])),Math.max(...corners.map(p=>p[axis]))])};
  }));
  // Seis quadrados fecham o mesmo volume: x/y de 0 a 1, z de -0,5 a 0,5.
  const expected={
    'entrance-face-front':[0,1,0,1,.5,.5],
    'entrance-face-back':[0,1,0,1,-.5,-.5],
    'entrance-face-left':[0,0,0,1,-.5,.5],
    'entrance-face-right':[1,1,0,1,-.5,.5],
    'entrance-face-top':[0,1,0,0,-.5,.5],
    'entrance-face-bottom':[0,1,1,1,-.5,.5],
  };
  expect(faces).toHaveLength(6);
  for(const face of faces)face.bounds.forEach((value,index)=>expect(value,`${face.name} limite ${index}`).toBeCloseTo(expected[face.name][index],3));
}

test('caixa CSS aparece fechada somente quando o 3D falha',async({page})=>{
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  await page.route('**/src/box-scene.js',async route=>{await pending;await route.abort().catch(()=>{});});
  try {
    await page.goto('/',{waitUntil:'domcontentloaded'});
    const stage=page.locator('[data-entrance-stage]');
    await expect(stage).toHaveAttribute('data-renderer','loading');
    await expect(page.locator('.entrance-fallback')).toBeHidden();
    await expect(page.locator('[data-entrance-canvas]')).toBeHidden();
    await expect(page.getByRole('status')).toContainText('Preparando a caixa');
    await expect(page.locator('[data-entrance-open]')).toBeDisabled();
    release();
    await expect(stage).toHaveAttribute('data-renderer','fallback');
    await expect(page.locator('.entrance-fallback')).toBeVisible();
    await expectClosedCube(page);
    await page.getByRole('button',{name:'Pular introdução',exact:true}).click();
    await expect(page.locator('.entrance-dialog')).toHaveCount(0);
  } finally {release();}
});

test('modelo 3D aparece com a marca pronta sem trocar de cubo',async({page})=>{
  let releaseModule,releaseImage;
  const moduleGate=new Promise(resolve=>{releaseModule=resolve;});
  const imageGate=new Promise(resolve=>{releaseImage=resolve;});
  await page.route('**/src/box-scene.js',async route=>{await moduleGate;await route.continue().catch(()=>{});});
  await page.route('**/assets/perfil-referencia.jpeg',async route=>{await imageGate;await route.continue().catch(()=>{});});
  try {
    await page.goto('/',{waitUntil:'domcontentloaded'});
    const stage=page.locator('[data-entrance-stage]');
    const canvas=page.locator('[data-entrance-canvas]');
    await expect(stage).toHaveAttribute('data-renderer','loading');
    await expect(page.locator('.entrance-fallback')).toBeHidden();
    releaseModule();
    await expect.poll(()=>canvas.evaluate(element=>element.width),{timeout:15000}).not.toBe(300);
    await expect(stage).toHaveAttribute('data-renderer','loading');
    await expect(canvas).toBeHidden();
    releaseImage();
    await expect(stage).toHaveAttribute('data-renderer','webgl',{timeout:15000});
    await expect(canvas).toBeVisible();
    await expect(page.locator('.entrance-fallback')).toBeHidden();
    await expect(page.locator('[data-entrance-open]')).toBeEnabled();
  } finally {releaseModule();releaseImage();}
});

test('pular durante a carga impede que o modulo atrasado reabra a entrada',async({page})=>{
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  await page.route('**/src/box-scene.js',async route=>{await pending;await route.continue().catch(()=>{});});
  try {
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await expect(page.locator('[data-entrance-stage]')).toHaveAttribute('data-renderer','loading');
    await page.locator('[data-entrance-skip]').click();
    release();
    await page.evaluate(()=>import('/src/box-scene.js').then(()=>{}));
    await expect(page.locator('.entrance-dialog')).toHaveCount(0);
    await expect(page.locator('[data-entrance-canvas]')).toHaveCount(0);
    await expect(page.locator('.landing-hero h1')).toBeFocused();
  } finally {release();}
});
