import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const future = days => {const date=new Date();date.setDate(date.getDate()+days);date.setHours(22,0,0,0);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T22:00`;};
test.beforeEach(async({page})=>{page.on('dialog',dialog=>dialog.accept());});

async function newLink(page,title='Link de teste') {
  await page.getByRole('button',{name:'Novo link',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel(/^Título/).fill(title);
  await dialog.getByLabel(/^Endereço de destino/).fill('/#sobre');
  await dialog.getByLabel('Descrição',{exact:true}).fill('Conteúdo criado na demonstração.');
  await dialog.getByLabel('Categoria',{exact:true}).selectOption({label:'Na pista'});
  await dialog.getByRole('button',{name:'Salvar link',exact:true}).click();
  await expect(dialog).toHaveCount(0);
}

test('rotas carregam sem erro e cabem na largura disponivel',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const path of ['/','/links','/admin','/admin?tab=links','/admin?tab=eventos','/admin?tab=aparencia','/admin?tab=metricas']){
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBe(true);
    await expect(page.getByText('Não foi possível abrir esta página.')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('criar editar ordenar categorizar destacar desativar e agendar link',async({page,context})=>{
  await page.goto('/admin?tab=links');await newLink(page);
  const publicPage=await context.newPage();await publicPage.goto('/links');
  await expect(publicPage.locator('.links-card').filter({hasText:'Link de teste'})).toBeVisible();
  let row=page.getByRole('article',{name:'Link de teste',exact:true});
  await row.getByRole('button',{name:'Editar Link de teste',exact:true}).click();
  await page.getByRole('dialog').getByLabel(/^Título/).fill('Destino atualizado');
  await page.getByRole('dialog').getByLabel(/^Endereço de destino/).fill('/#agenda');
  await page.getByRole('dialog').getByRole('button',{name:'Salvar link',exact:true}).click();
  row=page.getByRole('article',{name:'Destino atualizado',exact:true});
  await row.getByRole('button',{name:'Subir Destino atualizado na categoria',exact:true}).click();
  await row.getByRole('button',{name:'Subir Destino atualizado na categoria',exact:true}).click();
  await expect(publicPage.locator('.links-group').filter({has:publicPage.getByRole('heading',{name:'Na pista',exact:true})}).locator('.links-card').first()).toContainText('Destino atualizado');
  await row.getByRole('button',{name:'Editar Destino atualizado',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Categoria',{exact:true}).selectOption({label:'Conecte-se'});
  await page.getByRole('dialog').getByRole('button',{name:'Salvar link',exact:true}).click();
  await expect(publicPage.locator('.links-group').filter({has:publicPage.getByRole('heading',{name:'Conecte-se',exact:true})})).toContainText('Destino atualizado');
  await row.getByRole('button',{name:'Destacar Destino atualizado',exact:true}).click();
  await expect(publicPage.locator('.public-featured h2')).toHaveText('Destino atualizado');
  await row.getByRole('switch',{name:'Desativar Destino atualizado',exact:true}).click();
  await expect(publicPage.locator('.links-card').filter({hasText:'Destino atualizado'})).toHaveCount(0);
  await expect(publicPage.locator('.public-featured h2')).toHaveCount(0);
  await row.getByRole('button',{name:'Editar Destino atualizado',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('Conteúdo ativo',{exact:true}).check();
  await dialog.getByLabel('Início da exibição',{exact:true}).fill(future(2));
  await dialog.getByLabel('Fim da exibição',{exact:true}).fill(future(3));
  await dialog.getByRole('button',{name:'Salvar link',exact:true}).click();
  await page.reload();await expect(row).toContainText('Agendado');
  await publicPage.goto('/links?preview=1');await expect(publicPage.getByText('Você está no modo de prévia')).toBeVisible();
  await expect(publicPage.locator('.links-card').filter({hasText:'Destino atualizado'})).toBeVisible();
});

test('evento criado aparece nas duas paginas e edicao sincroniza abas',async({page,context})=>{
  await page.goto('/admin?tab=eventos');await page.getByRole('button',{name:'Novo evento',exact:true}).click();
  let dialog=page.getByRole('dialog');await dialog.getByLabel(/^Título/).fill('Evento de teste');
  await dialog.getByLabel(/^Data e horário/).fill(future(8));await dialog.getByLabel('Local',{exact:true}).fill('Local de demonstração');
  await dialog.getByLabel('Endereço para ingressos',{exact:true}).fill('/#agenda');
  await dialog.getByRole('button',{name:'Salvar evento',exact:true}).click();
  const landing=await context.newPage();await landing.goto('/');
  const links=await context.newPage();await links.goto('/links');
  await expect(landing.getByRole('heading',{name:'Evento de teste',exact:true})).toBeVisible();
  await expect(links.getByRole('heading',{name:'Evento de teste',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Editar Evento de teste',exact:true}).click();dialog=page.getByRole('dialog');
  await dialog.getByLabel(/^Título/).fill('Evento atualizado');await dialog.getByLabel('Exibir na página de links',{exact:true}).uncheck();
  await dialog.getByRole('button',{name:'Salvar evento',exact:true}).click();
  await expect(landing.getByRole('heading',{name:'Evento atualizado',exact:true})).toBeVisible();
  await expect(links.getByRole('heading',{name:'Evento de teste',exact:true})).toHaveCount(0);
  await expect(links.getByRole('heading',{name:'Evento atualizado',exact:true})).toHaveCount(0);
  await page.reload();await expect(page.getByRole('article',{name:'Evento atualizado',exact:true})).toBeVisible();
});

test('validacao impede URL insegura e intervalo invertido sem perder formulario',async({page})=>{
  await page.goto('/admin?tab=links');await page.getByRole('button',{name:'Novo link',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel(/^Título/).fill('Link inválido');await dialog.getByLabel(/^Endereço de destino/).fill('javascript:alert(1)');
  await expect(dialog.getByText('Alterações não salvas')).toBeVisible();
  await dialog.getByRole('button',{name:'Salvar link',exact:true}).click();await expect(page.locator('.toast-error').last()).toContainText('endereço válido');
  expect(await page.locator('.toast-error').last().evaluate(element=>{const rect=element.getBoundingClientRect();return element.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2));})).toBe(true);
  await dialog.getByLabel(/^Endereço de destino/).fill('/#agenda');await dialog.getByLabel('Início da exibição',{exact:true}).fill(future(3));await dialog.getByLabel('Fim da exibição',{exact:true}).fill(future(2));
  await dialog.getByRole('button',{name:'Salvar link',exact:true}).click();await expect(page.locator('.toast-error').last()).toContainText('posterior');
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByRole('article',{name:'Link inválido',exact:true})).toHaveCount(0);
});

test('aparencia e textos persistem nas duas paginas sem contato inventado',async({page})=>{
  await page.goto('/admin?tab=aparencia');await page.getByLabel('Descrição curta',{exact:true}).fill('Uma descrição editada na reunião.');
  await page.getByLabel('Frase de abertura',{exact:true}).fill('A CENA\nÉ SUA.');
  await expect(page.getByText('Alterações não salvas')).toBeVisible();await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  await expect(page.locator('.toast').last()).toContainText('atualizadas');
  await page.goto('/');await expect(page.getByText('Uma descrição editada na reunião.',{exact:true})).toBeVisible();
  await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(0);await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await page.goto('/links');await expect(page.getByText('Uma descrição editada na reunião.',{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText('Uma descrição editada na reunião.',{exact:true})).toBeVisible();
});

test('clique publico navega e gera metrica local enquanto previa nao conta',async({page})=>{
  await page.goto('/links?preview=1');await page.getByRole('link',{name:/Encontre seu próximo rolê/}).click();await expect(page).toHaveURL(/\/#agenda$/);
  await page.goto('/admin?tab=metricas');await expect(page.locator('.metrics-totals article').first().locator('strong')).toHaveText('00');
  await page.goto('/links');await page.getByRole('link',{name:/Encontre seu próximo rolê/}).click();await expect(page).toHaveURL(/\/#agenda$/);
  await page.goto('/admin?tab=metricas');await expect(page.locator('.metrics-totals article').first().locator('strong')).toHaveText('01');await expect(page.locator('.metrics-ranking')).toContainText('Encontre seu próximo rolê');
});

test('categorias e exclusao preservam links e pedem confirmacao',async({page})=>{
  await page.goto('/admin?tab=links');await page.getByRole('button',{name:'Categorias',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Nova categoria',exact:true}).click();
  const editor=page.getByRole('dialog').last();await editor.getByLabel('Nome da categoria',{exact:true}).fill('Campanhas');await editor.getByRole('button',{name:'Salvar categoria',exact:true}).click();
  await expect(page.getByRole('dialog').getByText('Campanhas',{exact:true})).toBeVisible();
  await page.getByRole('dialog').getByRole('button',{name:'Concluir',exact:true}).click();await newLink(page);
  const row=page.getByRole('article',{name:'Link de teste',exact:true});await row.getByRole('button',{name:'Excluir Link de teste',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();await expect(row).toBeVisible();
  await row.getByRole('button',{name:'Excluir Link de teste',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Excluir link',exact:true}).click();await expect(row).toHaveCount(0);
});

test('envio de logo otimiza imagem e restauracao recupera exemplos',async({page})=>{
  await page.goto('/admin?tab=aparencia');
  await page.locator('input[data-image-upload=logo]').setInputFiles(fileURLToPath(new URL('../assets/perfil-referencia.jpeg',import.meta.url)));
  await expect(page.locator('.toast').last()).toContainText('Imagem pronta');
  await page.getByLabel('Descrição curta',{exact:true}).fill('Descrição temporária para restauração.');
  await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();await expect(page.locator('.toast').last()).toContainText('atualizadas');
  await page.goto('/links');await expect(page.locator('.brand-custom').first()).toHaveAttribute('src',/^data:image\/webp;base64,/);
  await page.goto('/admin');await page.getByRole('button',{name:'Restaurar demonstração',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Restaurar dados',exact:true}).click();
  await page.goto('/links');await expect(page.locator('.brand-custom')).toHaveCount(0);await expect(page.getByText('Descrição temporária para restauração.',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Música, encontros e cultura em movimento.',{exact:true})).toBeVisible();
});

test('armazenamento corrompido oferece recuperacao e teclado alcanca conteudo',async({page})=>{
  await page.addInitScript(()=>{if(!sessionStorage.getItem('corruption-tested')){localStorage.setItem('caixa-preta-demo-v1','{broken');sessionStorage.setItem('corruption-tested','1');}});
  await page.goto('/admin');await expect(page.locator('.admin-storage-warning')).toContainText('Não foi possível ler');
  await page.keyboard.press('Tab');await expect(page.locator('.skip-link')).toBeFocused();await page.keyboard.press('Enter');
  await page.getByRole('button',{name:'Restaurar demonstração',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Restaurar dados',exact:true}).click();await expect(page.locator('.admin-storage-warning')).toHaveCount(0);
  await page.reload();await expect(page.locator('.admin-storage-warning')).toHaveCount(0);
});
