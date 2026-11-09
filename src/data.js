function localDate(offset, hour = 22) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(hour, 0, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(hour).padStart(2,'0')}:00`;
}

export function createDemoState() {
  const base = { active:true, draft:false, startAt:'', endAt:'', demo:true };
  return {
    version:1,
    settings: {
      name:'Caixa Preta',
      tagline:'Onde o interior encontra o centro do baile.',
      heroTitle:'O INTERIOR\nFAZ BARULHO.',
      description:'Música, encontros e cultura em movimento.',
      about:'Uma plataforma para aproximar quem faz a cena de quem vive a pista. Explore esta apresentação e descubra como eventos, links e novidades podem se encontrar em um só lugar.',
      accent:'#f2e600', logo:'', instagram:'https://www.instagram.com/prod.caixapreta/', email:'', whatsapp:'',
    },
    categories:[{id:'agenda',title:'Na pista'},{id:'conecte',title:'Conecte-se'}],
    links:[
      {...base,id:'link-agenda',title:'Encontre seu próximo rolê',description:'Explore a agenda nesta demonstração.',url:'/#agenda',icon:'ticket',image:'',categoryId:'agenda'},
      {...base,id:'link-instagram',title:'Acompanhe no Instagram',description:'O perfil da Caixa Preta. A cena continua por lá.',url:'https://www.instagram.com/prod.caixapreta/',icon:'instagram',image:'',categoryId:'conecte',demo:false},
      {...base,id:'link-sobre',title:'Conheça a proposta',description:'Uma nova forma de encontrar tudo da produtora.',url:'/#sobre',icon:'music',image:'',categoryId:'conecte'},
      {...base,id:'link-campanha',title:'A próxima frequência',description:'Exemplo de campanha com início programado.',url:'/#agenda',icon:'clock',image:'',categoryId:'agenda',startAt:localDate(7,12)},
    ],
    events:[
      {...base,id:'evento-sessions',title:'Caixa Sessions',description:'Um encontro de sons, pessoas e novas possibilidades. Evento fictício criado para apresentar a plataforma.',image:'/assets/sessions.svg',date:localDate(12),location:'Local a definir',url:'',onLanding:true,onLinks:true},
      {...base,id:'evento-frequencia',title:'Frequência Aberta',description:'Uma noite para explorar outras frequências. Evento fictício; programação, local e ingressos ainda não existem.',image:'/assets/frequencia.svg',date:localDate(26,21),location:'Local a definir',url:'',onLanding:true,onLinks:true},
      {...base,id:'evento-arquivo',title:'Encontros que ficam',description:'Exemplo de evento encerrado no arquivo. Não representa um evento real da produtora.',image:'/assets/arquivo.svg',date:localDate(-21),location:'Arquivo demonstrativo',url:'',onLanding:true,onLinks:false},
      {...base,id:'evento-rascunho',title:'Uma nova ideia',description:'Rascunho de demonstração para explorar o painel.',image:'/assets/frequencia.svg',date:localDate(42),location:'',url:'',onLanding:true,onLinks:true,draft:true},
    ],
    featured:{kind:'event',id:'evento-sessions'},
    clicks:[],
  };
}
