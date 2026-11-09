# Caixa Preta — plataforma de demonstração

Protótipo funcional para apresentar à produtora o gerenciamento de divulgação. Todo o produto está em português brasileiro e funciona sem serviços externos. A identidade é uma proposta de demonstração baseada nas três capturas fornecidas, sem validação formal da marca.

## Executar e acessar

Na pasta `plataforma`, com Node.js instalado:

```powershell
npm.cmd start
```

Não é necessário instalar dependências para executar a aplicação. Abra:

| Área | Endereço local |
| --- | --- |
| Landing page | http://127.0.0.1:4173/ |
| Página pública de links | http://127.0.0.1:4173/links |
| Painel demonstrativo | http://127.0.0.1:4173/admin |
| Prévia de links, incluindo rascunhos e agendados | http://127.0.0.1:4173/links?preview=1 |
| Prévia da landing | http://127.0.0.1:4173/?preview=1 |

O servidor aceita `--port 4174` para outra porta. `localhost` e `127.0.0.1` são origens diferentes: use sempre o mesmo endereço durante a apresentação. A versão hospedada também possui um armazenamento separado da versão local.

## Funcionalidades operacionais

- Entrada 3D da landing: caixa preta giratória com a marca, exploração por arraste e abertura por clique, toque, Enter ou Espaço. A tampa e as faces se abrem antes de revelar a landing completa.
- Controle de rotação, entrada direta e botão **Ver abertura 3D** na landing. A entrada aparece sempre que a página inicial é aberta ou recarregada, mesmo após abrir a caixa ou pular a introdução.

- Links: criar, editar, categorizar, escolher ícone, enviar imagem ou usar URL, reordenar dentro da categoria, ativar/desativar, excluir com confirmação, destacar e agendar exibição.
- Categorias: criar, editar e excluir. Ao excluir, os links ficam preservados em “Sem categoria”.
- Campanhas: use links com destaque, descrição, arte e início/fim de exibição; não há um cadastro separado que duplique esses conteúdos.
- Eventos: título, descrição, capa, data, horário, local, URL externa de ingressos/informações, rascunho, ativação, agendamento, destaque e escolha das páginas em que aparecem. Próximos e encerrados são separados.
- Destaque principal compartilhado: selecionar um link ou evento substitui a seleção anterior. Conteúdo inativo, agendado ou expirado não aparece no destaque público.
- Aparência: nome, logo, frase da marca, frase de abertura, descrição, apresentação, cor de destaque, Instagram, e-mail e WhatsApp. Campos vazios não geram contatos inventados.
- Prévia com rascunhos e agendados, claramente identificada e sem coleta de cliques. Exibe os dados salvos; salve o formulário antes de abri-la.
- Métricas: contagem real dos cliques em links e ações de eventos realizados neste navegador, filtros de 7/30 dias ou todo o período, ranking e gráfico dos últimos 7 dias. Não há visitantes fictícios ou estimativa de audiência geral.
- Confirmação de exclusão/restauração, aviso de alterações não salvas, proteção ao descartar, navegação por teclado, estados vazios e mensagens de erro/gravação.
- Atualização entre abas da mesma origem. A agenda é reavaliada ao abrir/recarregar e a cada 30 segundos enquanto a página estiver visível e sem edição em andamento.

## Abertura interativa

A entrada adapta o conceito indicado pelo usuário no [site de referência](https://filipenava.github.io/caixa-preta/). A referência usa Three.js para criar uma caixa por geometria; não foi identificada dependência de `jpg2threejs` no seu código público. Nossa cena e integração foram implementadas com código próprio.

Three.js 0.180.0, seu helper de geometria e a licença MIT estão em `assets/vendor/three`. A biblioteca é carregada somente ao mostrar a entrada, sem CDN ou serviço de conversão de imagens. Para atualizar/reproduzir as cópias locais após `npm ci`, execute `npm.cmd run vendor:three`.

`/links`, `/admin`, as prévias e os endereços com âncora, como `/#agenda`, abrem diretamente. A opção **Pular introdução** e a tecla Escape também levam imediatamente ao conteúdo. **Ver abertura 3D** permite rever a experiência sem apagar os dados ou sair da página.

A preferência de movimento reduzido inicia a caixa parada e evita a transição longa ao entrar. Se a cena/WebGL não puder iniciar, uma caixa em CSS mantém a interação e o acesso direto. Nome e logo acompanham as configurações compartilhadas do painel, inclusive com a entrada já aberta em outra aba. Ao revelar o conteúdo, a cena libera seus recursos e interrompe a renderização; não há 3D rodando continuamente por trás das demais áreas.

O padrão visual principal é o modelo Three.js. Durante a preparação aparece apenas “Preparando a caixa”; o cubo é mostrado depois de sua marca ser desenhada, evitando a troca entre dois modelos no início. A caixa CSS fica reservada à falha da cena ou ao limite de dez segundos de preparação, e não é substituída por um carregamento atrasado. Pular introdução e Escape continuam disponíveis durante toda a espera.

A abertura não depende de armazenamento da sessão. A chave `caixa-preta-entrance-v1` deixada por versões anteriores é ignorada, sem exigir limpeza dos dados do navegador. Atualizações do conteúdo na mesma página não reiniciam a introdução. A persistência do conteúdo e as métricas permanecem independentes. Imagens e identidade seguem o caráter provisório já informado.

## Persistência e limites desta versão

Os dados ficam no `localStorage` daquele navegador, na chave `caixa-preta-demo-v1`. Recarregar preserva alterações já salvas. Outro navegador, perfil, dispositivo ou endereço não recebe essas mudanças. Apagar os dados do navegador as remove.

O painel é demonstrativo: não há autenticação administrativa, autorização de produção, banco de dados remoto ou publicação compartilhada para visitantes. Não use esta versão para gerenciar conteúdo real em produção. A hospedagem privada, quando disponível, controla acesso à demonstração; não substitui a autenticação de um produto conectado.

As imagens enviadas são otimizadas no navegador para até 1.400 pixels no lado maior e armazenadas junto aos dados. Evite muitas imagens grandes: o limite do armazenamento varia. Se a gravação falhar, a aplicação informa o erro e mantém o estado anterior; não declara uma alteração como salva. Ao receber dados corrompidos, informa o problema e oferece recuperação pela restauração da demonstração.

São mantidos os últimos 5.000 cliques locais. O número de cliques não representa pessoas únicas, visitantes gerais, tráfego do Instagram ou acessos em outros dispositivos. As ações em prévia não são contadas. Links de navegação e contatos não têm coleta; a contagem cobre os links cadastrados e ações de eventos.

Horários são interpretados no fuso do dispositivo. Início da exibição é inclusivo; fim é exclusivo e oculta o conteúdo também do arquivo. Eventos passados sem prazo de exibição encerrado continuam no arquivo. Inativo ou rascunho fica fora das páginas públicas.

Use **Restaurar demonstração** no painel para remover personalizações, cadastros e cliques locais e recuperar os exemplos. No celular, a ação fica no ícone de restauração da barra superior. Ela pede confirmação.

## Conteúdo demonstrativo e referências

Os eventos Caixa Sessions, Frequência Aberta, Encontros que ficam e Uma nova ideia são fictícios. Suas datas são geradas relativamente ao dia da restauração/inicialização e não representam programação da produtora. Não há venda de ingressos na aplicação. Sem destino configurado, aparece “Informações em breve”.

As artes SVG e os textos de apresentação/abertura são propostas de demonstração editáveis. A frase “Onde o interior encontra o centro do baile.” e o símbolo mostrado na captura vêm do material fornecido; isso não equivale à aprovação da nova interface pela produtora. As fotos no hero são recortes visuais via CSS das capturas fornecidas, preservadas nos arquivos originais.

O Instagram é o endereço fornecido pelo usuário. Não foram inferidos contatos, clientes, parceiros, depoimentos, anos de atuação, preços ou resultados. Datas e ofertas presentes nas capturas não foram cadastradas como informações atuais.

## Materiais oficiais pendentes

1. Logotipo original em SVG/PNG, suas variações e regras de aplicação.
2. Paleta e tipografias oficiais, se houver, e validação da direção proposta.
3. Fotografias e artes originais autorizadas, em resolução adequada.
4. Programação confirmada: datas, horários, locais e URLs oficiais de ingressos.
5. Texto institucional aprovado, contatos e endereços oficiais das redes.

## Roteiro de demonstração — três minutos

| Tempo | Ação |
| --- | --- |
| 0:00–0:30 | Abra `/`, explore o cubo e clique em Abrir a caixa. A animação revela a landing; apresente marca, destaque e agenda e avise que eventos e identidade estão em demonstração. Para repetir, use Ver abertura 3D. |
| 0:30–1:00 | Abra `/links`, o endereço para a bio. Mostre destaque, categorias, cards de eventos e Instagram configurado. |
| 1:00–1:50 | Em outra aba da mesma origem, abra `/admin` → Links e categorias. Edite “Encontre seu próximo rolê” para “Agenda da Caixa — Demonstração”, ajuste a descrição, mantenha o destino interno configurado e salve. Destaque o link. |
| 1:50–2:20 | Retorne à aba pública e mostre a mudança e o destaque compartilhados. Recarregue para comprovar persistência. |
| 2:20–2:45 | No painel, abra Eventos e mostre a seleção landing/links, imagem e data. Explique o agendamento de campanhas e os estados de publicação. |
| 2:45–3:00 | Mostre Aparência e Métricas locais. Explique que o próximo passo é validar requisitos e conectar autenticação/banco para uma equipe real. |

## Cinco perguntas para a reunião

1. Quem vai cadastrar conteúdo e quem precisa aprovar uma publicação?
2. Quais canais e tipos de campanha geram mais demanda para a equipe hoje?
3. Como a equipe decide prioridades, categorias e duração de cada destaque?
4. Quais plataformas de ingressos e contatos devem aparecer oficialmente?
5. Quais métricas ajudariam a decidir a próxima divulgação e quem deve acessá-las?

## Estrutura e evolução

`src/domain.js` contém as regras puras; `src/store.js` centraliza leitura/gravação, CRUD e assinatura; `src/data.js` contém os exemplos. As páginas públicas e o painel consomem o mesmo repositório. A conexão futura substitui a persistência nessa fronteira por uma API autenticada e coleta centralizada, preservando os componentes de apresentação. Firebase não foi utilizado e não há configuração externa pendente para execução local.

## Verificação e build

```powershell
npm.cmd test
npm.cmd run build
```

O build valida a sintaxe dos módulos e copia a aplicação estática para `dist`, incluindo entradas para as três rotas. Para servir o build: `node scripts/serve.mjs --dist`.

Para os cenários de navegador:

```powershell
npm.cmd ci
npm.cmd run test:e2e
```

Os testes usam Chrome instalado e cobrem desktop de 1.440 pixels e celular de 390 pixels. `PLAYWRIGHT_CHANNEL` permite selecionar outro canal compatível; para o Chromium fornecido pelo Playwright, instale-o com `npx.cmd playwright install chromium` e selecione `chromium`. A aplicação em si não depende do Playwright. Ambiente verificado: Windows e Node.js 24.19.0.

O comando `node scripts/capture.mjs` produz capturas locais em `artifacts` quando o servidor está em execução.
