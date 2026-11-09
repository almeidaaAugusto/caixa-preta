import {test,expect} from '@playwright/test';

test('primeira visita oferece caixa 3D e abertura revela landing',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');const entrance=page.getByRole('dialog',{name:'Abra a Caixa Preta.'});
  await expect(entrance).toBeVisible();
  await expect(entrance.locator('[data-entrance-stage]')).toHaveAttribute('data-renderer','webgl',{timeout:15000});
  await expect(entrance.getByRole('button',{name:'Abrir a caixa',exact:true})).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await entrance.getByRole('button',{name:'Abrir a caixa',exact:true}).click();
  await expect(entrance).toHaveCount(0,{timeout:7000});
  await expect(page.locator('.landing-hero h1')).toBeVisible();await expect(page.locator('.landing-hero h1')).toBeFocused();
  await expect(page.locator('[data-entrance-canvas]')).toHaveCount(0);
  expect(await page.evaluate(()=>sessionStorage.getItem('caixa-preta-entrance-v1'))).toBe('entered');
  await page.reload();await expect(entrance).toHaveCount(0);expect(errors).toEqual([]);
});

test('pular entra imediatamente e permite rever a abertura',async({page})=>{
  await page.goto('/');const entrance=page.getByRole('dialog',{name:'Abra a Caixa Preta.'});
  await entrance.getByRole('button',{name:'Pular introdução',exact:true}).click();await expect(entrance).toHaveCount(0);
  await page.getByRole('button',{name:'Ver abertura 3D',exact:true}).click();await expect(entrance).toBeVisible();
  await page.keyboard.press('Escape');await expect(entrance).toHaveCount(0);
  await expect(page.getByRole('link',{name:/Explore a agenda/})).toBeVisible();
});

test('rotacao pode ser pausada e teclado abre a caixa',async({page})=>{
  await page.goto('/');const entrance=page.getByRole('dialog',{name:'Abra a Caixa Preta.'});
  await entrance.getByRole('button',{name:'Pausar rotação',exact:true}).click();
  await expect(entrance.getByRole('button',{name:'Ativar rotação',exact:true})).toHaveAttribute('aria-pressed','true');
  await entrance.getByRole('button',{name:'Abrir a caixa',exact:true}).focus();await page.keyboard.press('Space');
  await expect(entrance).toHaveCount(0,{timeout:7000});
});

test('movimento reduzido inicia parado e abre sem transicao prolongada',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  const entrance=page.getByRole('dialog',{name:'Abra a Caixa Preta.'});
  await expect(entrance.getByRole('button',{name:'Ativar rotação',exact:true})).toBeVisible();
  await entrance.getByRole('button',{name:'Abrir a caixa',exact:true}).click();await expect(entrance).toHaveCount(0,{timeout:1500});
  await expect(page.locator('.landing-hero h1')).toBeVisible();
});

test('cena indisponivel mantem caixa alternativa e acesso ao conteudo',async({page})=>{
  await page.route('**/src/box-scene.js',route=>route.abort());await page.goto('/');
  const entrance=page.getByRole('dialog',{name:'Abra a Caixa Preta.'});
  await expect(entrance.locator('[data-entrance-stage]')).toHaveAttribute('data-renderer','fallback');
  await entrance.getByRole('button',{name:'Abrir a caixa em 3D',exact:true}).click();await expect(entrance).toHaveCount(0,{timeout:7000});
  await expect(page.locator('.landing-hero h1')).toBeVisible();
});

test('ancoras previas links e painel continuam com acesso direto sem carregar Three',async({page})=>{
  const requests=[];page.on('request',request=>requests.push(request.url()));
  for(const route of ['/#agenda','/?preview=1','/links','/admin']){
    await page.goto(route);await expect(page.locator('main')).toBeVisible();await expect(page.locator('.entrance-dialog')).toHaveCount(0);
  }
  expect(requests.some(url=>url.includes('/vendor/three/'))).toBe(false);
});

test('WebGL indisponivel usa alternativa e nao impede entrada direta',async({page})=>{
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:original.call(this,kind,...args);};});
  await page.goto('/');const entrance=page.getByRole('dialog',{name:'Abra a Caixa Preta.'});
  await expect(entrance.locator('[data-entrance-stage]')).toHaveAttribute('data-renderer','fallback');
  await entrance.getByRole('button',{name:'Pular introdução',exact:true}).click();await expect(entrance).toHaveCount(0);
  await expect(page.locator('.landing-hero h1')).toBeVisible();
});

test('arrastar explora a caixa sem abrir por engano',async({page})=>{
  await page.goto('/');const entrance=page.getByRole('dialog',{name:'Abra a Caixa Preta.'});
  await expect(entrance.locator('[data-entrance-stage]')).toHaveAttribute('data-renderer','webgl');
  await entrance.getByRole('button',{name:'Pausar rotação',exact:true}).click();
  const canvas=entrance.locator('canvas');const before=await canvas.screenshot();
  const bounds=await entrance.getByRole('button',{name:'Abrir a caixa em 3D',exact:true}).boundingBox();
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width/2+65,bounds.y+bounds.height/2+10,{steps:8});await page.mouse.up();
  await expect(entrance).toBeVisible();expect((await canvas.screenshot()).equals(before)).toBe(false);
  await entrance.getByRole('button',{name:'Abrir a caixa',exact:true}).click();await expect(entrance).toHaveCount(0,{timeout:7000});
});

test('marca editada no painel atualiza tambem a textura do cubo aberto',async({page,context})=>{
  await page.goto('/');const entrance=page.getByRole('dialog',{name:'Abra a Caixa Preta.'});
  await expect(entrance.locator('[data-entrance-stage]')).toHaveAttribute('data-renderer','webgl');
  await entrance.getByRole('button',{name:'Pausar rotação',exact:true}).click();
  const canvas=entrance.locator('canvas');const before=await canvas.screenshot();
  const admin=await context.newPage();await admin.goto('/admin?tab=aparencia');
  await admin.getByLabel('Nome da produtora',{exact:true}).fill('Marca ajustada');await admin.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  await page.bringToFront();await expect(entrance.locator('[data-entrance-brand]')).toContainText('Marca ajustada');
  expect((await canvas.screenshot()).equals(before)).toBe(false);
});
