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

test('caixa CSS inicia fechada durante carregamento lento e falha do 3D',async({page})=>{
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  await page.route('**/src/box-scene.js',async route=>{await pending;await route.abort().catch(()=>{});});
  try {
    await page.goto('/',{waitUntil:'domcontentloaded'});
    const stage=page.locator('[data-entrance-stage]');
    await expect(stage).toHaveAttribute('data-renderer','loading');
    await expectClosedCube(page);
    release();
    await expect(stage).toHaveAttribute('data-renderer','fallback');
    await expectClosedCube(page);
    await page.getByRole('button',{name:'Pular introdução',exact:true}).click();
    await expect(page.locator('.entrance-dialog')).toHaveCount(0);
  } finally {release();}
});
