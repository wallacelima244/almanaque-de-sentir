/* Almanaque de Sentir | HTML/CSS/JavaScript sem frameworks | Página de vendas honesta */
(()=>{
'use strict';
const cfg=window.ALMANAQUE_CONFIG||{};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const money=c=>(Number(c||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const text=(e,v)=>{if(e)e.textContent=String(v??'')};
const once=(arr)=>arr[Math.floor(Math.random()*arr.length)];
const FALLBACK=[
{id:'local-1',title:'Presença',body:'Nem toda presença precisa fazer barulho. Há quem nos abrace sem mover os braços, apenas escolhendo ficar.',category_slug:'amor'},
{id:'local-2',title:'Cuidado',body:'Amar também é lembrar do detalhe, perguntar pelo dia e fazer do comum um lugar seguro.',category_slug:'amor'},
{id:'local-3',title:'Saudade',body:'Saudade é quando a lembrança visita sem pedir licença. Às vezes dói; às vezes aquece. Quase sempre, faz as duas coisas.',category_slug:'saudade'},
{id:'local-4',title:'Recomeço',body:'Recomeçar não apaga os caminhos antigos. Apenas devolve às mãos a coragem de desenhar outros.',category_slug:'recomecos'},
{id:'local-5',title:'Florescer',body:'Há transformações que acontecem longe dos aplausos. Uma raiz também cresce no escuro antes de sustentar uma flor.',category_slug:'recomecos'},
{id:'local-6',title:'Acolhimento',body:'Quando faltam palavras para explicar a dor, a fé pode ser um lugar de descanso. Você não precisa fingir força para buscar a presença de Deus.',category_slug:'fe',scripture_reference:'Salmos 34:18'},
{id:'local-7',title:'Tempo',body:'Nem todas as respostas chegam na pressa. Há estações de semear, de cuidar e de confiar no que ainda não floresceu.',category_slug:'fe',scripture_reference:'Eclesiastes 3:1'},
{id:'local-8',title:'Esperança',body:'Que a tristeza de hoje não te convença de que todos os amanhãs terão a mesma cor.',category_slug:'esperanca'},
{id:'local-9',title:'Um dia de cada vez',body:'Você não precisa vencer a semana inteira nesta manhã. Comece pelo que cabe no seu coração hoje.',category_slug:'esperanca'},
{id:'local-10',title:'Permissão',body:'O coração não é uma máquina de estar bem. Respeitar o próprio ritmo também é uma forma de coragem.',category_slug:'autoconhecimento'}
];
const PREVIEW=[
{id:'preview-4',slug:'ebook-30-dias-de-reflexoes',title:'30 Dias para Sentir e Refletir',description:'E-book de 75 páginas: 30 encontros, 30 práticas, uma frase para guardar por dia e 90 perguntas para refletir.',product_type:'ebook',price_cents:2490,is_active:false},
{id:'preview-3',slug:'colecao-pensamentos-alma',title:'Pensamentos para a Alma',description:'12 reflexões inéditas sobre o que sentimos, com gestos práticos e perguntas para levar cada leitura à vida.',product_type:'collection',price_cents:1490,is_active:false},
{id:'preview-1',slug:'pensamento-especial-confiar',title:'Pensamento Especial: Confiar',description:'Uma mensagem exclusiva de fé e confiança, com leitura guiada e um gesto concreto para o dia.',product_type:'thought',price_cents:299,is_active:false},
{id:'preview-2',slug:'pensamento-especial-virada',title:'Pensamento Especial: Virada',description:'Uma mensagem exclusiva sobre recomeçar, com leitura guiada e um convite à ação.',product_type:'thought',price_cents:299,is_active:false}
];
const COVERS={'pensamento-especial-confiar':'capa-confiar.svg','pensamento-especial-virada':'capa-virada.svg','colecao-pensamentos-alma':'capa-alma.svg','ebook-30-dias-de-reflexoes':'capa-30-dias.webp'};
let thoughts=FALLBACK,products=PREVIEW,current=null,selectedCategory='todos',isOpening=false,writeInterval=null,revealTimeout=null,finishWriting=null,selectedRating=0,reviewCache=[];
function el(tag,cls,content){const node=document.createElement(tag);if(cls)node.className=cls;if(content!==undefined)node.textContent=content;return node}
function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('icon');svg.setAttribute('aria-hidden','true');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#i-'+name);svg.append(use);return svg}
function connected(){return /^https:\/\/[\w.-]+\.supabase\.co$/.test(cfg.SUPABASE_URL||'')&&!!cfg.SUPABASE_PUBLISHABLE_KEY}
async function api(table,params,options={}){if(!connected())throw new Error('Banco de dados não configurado');const headers={apikey:cfg.SUPABASE_PUBLISHABLE_KEY,...(options.method?{'Content-Type':'application/json'}:{})};const res=await fetch(cfg.SUPABASE_URL+'/rest/v1/'+table+(params?'?'+params:''),{method:options.method||'GET',headers,body:options.body?JSON.stringify(options.body):undefined});if(!res.ok){const err=await res.text();throw Error('Erro ao conectar: '+res.status+' '+err.slice(0,80))}if(res.status===204||options.method)return null;return res.json()}
async function loadContent(){try{const[cats,ts,bodies,active]=await Promise.all([
api('categories','select=id,slug,name&order=display_order.asc'),
api('thoughts','select=id,slug,title,teaser,scripture_reference,category_id,access_level,status&status=eq.published&access_level=eq.free&limit=250'),
api('thought_contents','select=thought_id,body&limit=250'),
api('products','select=id,slug,title,description,product_type,price_cents,is_active&is_active=eq.true&limit=200')]);
const cm=Object.fromEntries(cats.map(c=>[c.id,c.slug])),bm=Object.fromEntries(bodies.map(t=>[t.thought_id,t.body]));const real=ts.filter(t=>bm[t.id]).map(t=>({...t,body:bm[t.id],category_slug:cm[t.category_id]||'todos'}));if(real.length)thoughts=real;
const bySlug=new Map((active||[]).map(p=>[p.slug,p]));products=PREVIEW.map(p=>bySlug.get(p.slug)||p);for(const p of active||[])if(!PREVIEW.some(v=>v.slug===p.slug))products.push(p);renderProducts();
}catch(err){console.info('Vitrine usando prévias originais:',err.message)}}
function setupMenu(){const t=$('#menuToggle'),nav=$('#mobileNav');t.addEventListener('click',()=>{const op=t.getAttribute('aria-expanded')==='true';t.setAttribute('aria-expanded',String(!op));nav.hidden=op});$$('#mobileNav a').forEach(a=>a.addEventListener('click',()=>{t.setAttribute('aria-expanded','false');nav.hidden=true}));}
const GIFT_KEY='almanaque-primeiro-presente-v3';
function savedGift(){try{const value=JSON.parse(localStorage.getItem(GIFT_KEY)||'null');return value&&typeof value.body==='string'&&value.body.length>12?value:null}catch(_){return null}}
function storeGift(t){try{localStorage.setItem(GIFT_KEY,JSON.stringify({id:t.id,title:t.title,body:t.body,scripture_reference:t.scripture_reference||'',category_slug:t.category_slug||'todos'}))}catch(_){/* Armazenamento privado pode estar indisponível; não fingir proteção por pessoa */}}
function updateGiftUI(){const used=!!savedGift();const newBtn=$('#newThought');if(newBtn)newBtn.innerHTML='<svg class="icon"><use href="#i-book"></use></svg> Outro pensamento · R$ 2,99';const reminder=$('.free-reminder');if(reminder)text(reminder,used?'Sua primeira palavra já foi revelada. As próximas são edições especiais.':'Uma única palavra de cortesia por navegador. Depois, edições a R$ 2,99.');const gift=$('.gift-tag');if(gift)text(gift,used?'SEU PRESENTE JÁ FOI ABERTO':'1ª PALAVRA GRÁTIS');const label=$('#openLabel');if(label&&!isOpening)text(label,used?'Reabrir a minha primeira palavra':'Toque no selo para abrir');}
function openPaidThought(){const chosen=products.find(p=>p.slug==='pensamento-especial-confiar')||PREVIEW[0];showProduct(chosen);text($('#stageStatus'),'Seu primeiro pensamento foi gratuito. Uma nova edição custa R$ 2,99.');}
function category(cat){selectedCategory=cat;$$('.mood').forEach(b=>b.classList.toggle('is-active',b.dataset.category===cat));resetThought();text($('#stageStatus'),'Escolha feita. O envelope está pronto para abrir.');}
function resetThought(){const offer=$('#afterRevealOffer');if(offer){offer.hidden=true;offer.classList.remove('show-offer')}stopHandwriting();clearTimeout(revealTimeout);isOpening=false;$('#envelopeScene').classList.remove('opening');$('#envelopeScene').hidden=false;$('#thoughtScene').hidden=true;$('#openEnvelope').disabled=false;$('#openText').disabled=false;text($('#openLabel'),savedGift()?'Reabrir a minha primeira palavra':'Toque no selo para abrir');$$('.mini-action').forEach(b=>b.disabled=true);$('#skipWriting').hidden=true}
function chooseThought(){
 const pool=thoughts.filter(t=>selectedCategory==='todos'||t.category_slug===selectedCategory);
 const all=pool.length?pool:thoughts;
 let recent=[];
 try{recent=JSON.parse(sessionStorage.getItem('almanaque-thought-history')||'[]');if(!Array.isArray(recent))recent=[]}catch(_){recent=[]}
 const maxHistory=Math.max(1,Math.min(18,Math.floor(all.length*.58)));
 const candidates=all.filter(t=>t.id!==current?.id&&!recent.includes(t.id));
 const notLast=all.filter(t=>t.id!==current?.id);
 current=once(candidates.length?candidates:notLast.length?notLast:all);
 try{sessionStorage.setItem('almanaque-thought-history',JSON.stringify([...recent.filter(id=>id!==current.id),current.id].slice(-maxHistory)))}catch(_){}
}
function openEnvelope(){if(isOpening)return;isOpening=true;const previous=savedGift();if(previous)current=previous;else{chooseThought();storeGift(current)}updateGiftUI();$('#openEnvelope').disabled=true;$('#openText').disabled=true;$('#envelopeScene').classList.add('opening');text($('#openLabel'),'Abrindo o seu pergaminho…');text($('#stageStatus'),'Seu pensamento está chegando.');const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;revealTimeout=setTimeout(()=>{ $('#envelopeScene').hidden=true;$('#thoughtScene').hidden=false;text($('#thoughtTitle'),current.title);text($('#thoughtScripture'),current.scripture_reference?'Inspirado em '+current.scripture_reference:'');writeThought(reduced);},reduced?10:1180)}
/* Caligrafia em canvas: a tinta é revelada continuamente e a ponta da pena acompanha a borda do traço.
 * Funciona com textos variáveis do Supabase e recalcula as linhas no mobile. */
let handwritingFrame=0,handwritingLayout=null,handwritingStart=0;
function inkLayout(){
 const area=$('#writingArea'),canvas=$('#inkCanvas');if(!area||!canvas)return null;
 const width=Math.max(160,Math.floor(area.clientWidth||300));
 const mobile=width<325,small=width<400;
 let size=mobile?20:small?23:27;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 const full=String(current?.body||'').replace(/\s+/g,' ').trim();
 const family='"Cormorant Garamond", Georgia, serif';
 let lines=[];
 function wrap(fontSize){
   ctx.font='italic 500 '+fontSize+'px '+family;
   const result=[];let line='';
   const words=full.split(' ');
   for(const word of words){const part=line?line+' '+word:word;
     if(line&&ctx.measureText(part).width>width-14){result.push(line);line=word;}else line=part;
   }
   if(line)result.push(line);return result;
 }
 lines=wrap(size);
 while(lines.length>7&&size>18){size-=1;lines=wrap(size)}
 const lineHeight=size*1.33;
 const height=Math.max(176,Math.ceil(lines.length*lineHeight+30));
 area.style.height=height+'px';canvas.style.height=height+'px';canvas.style.width=width+'px';
 const dpr=Math.min(window.devicePixelRatio||1,3);
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.font='italic 500 '+size+'px '+family;
 const top=(height-lines.length*lineHeight)/2+size;
 const entries=lines.map((line,i)=>({line,y:top+i*lineHeight,w:ctx.measureText(line).width}));
 return {ctx,width,height,dpr,size,font:'italic 500 '+size+'px '+family,entries,duration:Math.min(10600,Math.max(4700,full.length*36)),totalWeight:entries.reduce((a,e)=>a+e.w,0)};
}
function drawHandwriting(progress){
 const data=handwritingLayout;if(!data)return;
 const {ctx,width,height,entries,font,totalWeight}=data;
 ctx.clearRect(0,0,width,height);
 ctx.font=font;ctx.textAlign='left';ctx.textBaseline='alphabetic';
 let done=totalWeight*Math.max(0,Math.min(1,progress));
 let tip=null;
 for(const line of entries){
   const x=(width-line.w)/2;const visible=Math.max(0,Math.min(line.w,done));
   if(visible>0){ctx.save();ctx.beginPath();ctx.rect(x-1,line.y-data.size-3,visible+2,data.size*1.44);ctx.clip();ctx.fillStyle='#483327';ctx.fillText(line.line,x,line.y);ctx.restore();}
   if(done<=line.w&&tip===null)tip={x:x+visible,y:line.y+4};
   done-=line.w;
 }
 if(!tip){const last=entries.at(-1);if(last)tip={x:(width+last.w)/2,y:last.y+4}}
 const pen=$('#writingQuill');if(tip&&!pen.hidden){pen.style.left=tip.x+'px';pen.style.top=tip.y+'px';pen.style.transform='translate(-9%,-99%) rotate('+(-8+Math.sin(progress*33)*1.2)+'deg)';}
}
function stopHandwriting(){cancelAnimationFrame(handwritingFrame);handwritingFrame=0;clearInterval(writeInterval)}
function writeThought(reduced){
 stopHandwriting();
 const written=$('#writtenText'),pen=$('#writingQuill'),skip=$('#skipWriting'),area=$('#writingArea');
 written.textContent='';area.classList.add('is-writing');
 handwritingLayout=inkLayout();
 if(!handwritingLayout){written.classList.add('fallback-visible');written.textContent=current.body;pen.hidden=true;return}
 pen.hidden=!!reduced;skip.hidden=!!reduced;
 let completed=false;
 finishWriting=()=>{
   if(completed)return;completed=true;stopHandwriting();drawHandwriting(1);
   written.textContent=current.body;pen.hidden=true;skip.hidden=true;area.classList.remove('is-writing');
   $$('.mini-action').forEach(b=>b.disabled=false);
   text($('#stageStatus'),'Sua palavra foi escrita. Salve o pergaminho ou compartilhe com alguém.');
   const offer=$('#afterRevealOffer');if(offer){offer.hidden=false;offer.classList.add('show-offer')}
 };
 if(reduced){finishWriting();return}
 const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
 handwritingStart=performance.now();
 function frame(now){
   if(completed)return;
   const elapsed=Math.min(1,(now-handwritingStart)/handwritingLayout.duration);
   // Início e fim mais delicados, movimento contínuo entre eles.
   drawHandwriting(ease(elapsed));
   if(elapsed>=1)finishWriting();else handwritingFrame=requestAnimationFrame(frame);
 }
 handwritingFrame=requestAnimationFrame(frame);
}
function setupExperience(){ $$('.mood').forEach(b=>b.addEventListener('click',()=>category(b.dataset.category)));$('#openEnvelope').addEventListener('click',openEnvelope);$('#openText').addEventListener('click',openEnvelope);$('#skipWriting').addEventListener('click',()=>finishWriting&&finishWriting());$('#newThought').addEventListener('click',openPaidThought);$('#saveThought').addEventListener('click',saveThought);$('#shareThought').addEventListener('click',shareThought);window.addEventListener('resize',()=>{if($('#thoughtScene').hidden||!current)return;const wasVisible=!$('#writingQuill').hidden;const completed=!$('#saveThought').disabled;if(wasVisible){stopHandwriting();writeThought(false)}else if(completed){handwritingLayout=inkLayout();drawHandwriting(1)}});}
async function loadArt(src){const image=new Image();image.src=src;await image.decode();return image}
function canvasLetters(ctx,value,x,y,space){const chars=[...value];const widths=chars.map(c=>ctx.measureText(c).width);const all=widths.reduce((a,b)=>a+b,0)+space*(chars.length-1);let pos=x-all/2;chars.forEach((c,i)=>{ctx.fillText(c,pos,y);pos+=widths[i]+space})}
function drawBotanical(ctx,x,y,flipX=1,flipY=1){ctx.save();ctx.translate(x,y);ctx.scale(flipX,flipY);ctx.strokeStyle='rgba(123,88,54,.57)';ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,245);ctx.bezierCurveTo(20,175,70,115,160,15);ctx.stroke();for(let i=0;i<8;i++){const t=i/8;const bx=20+130*t,by=225-210*t;ctx.save();ctx.translate(bx,by);ctx.rotate(-.48+t*.5);ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(16,-23,45,-24,52,-5);ctx.bezierCurveTo(33,14,12,13,0,0);ctx.stroke();ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(18,9,45,6,48,3);ctx.stroke();ctx.restore()};ctx.restore()}
function ornateRule(ctx,y,width){ctx.save();ctx.strokeStyle='#956d45';ctx.fillStyle='#8f6541';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(540-width/2,y);ctx.lineTo(500,y);ctx.moveTo(580,y);ctx.lineTo(540+width/2,y);ctx.stroke();ctx.translate(540,y);ctx.rotate(Math.PI/4);ctx.fillRect(-6,-6,12,12);ctx.strokeRect(-11,-11,22,22);ctx.restore()}
async function loadCardImage(path){const image=new Image();image.src=path;try{await image.decode();return image}catch(_){return null}}
function wrappedLines(ctx,words,maxWidth){const lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);return lines}
function canvasDecor(ctx,x,y,flip=1){ctx.save();ctx.translate(x,y);ctx.scale(flip,1);ctx.strokeStyle='#8e6d43';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(40,-24,79,-11,108,-65);ctx.stroke();for(let i=0;i<4;i++){const a=i*22+20,by=-10-i*10;ctx.beginPath();ctx.ellipse(a,by,16,5,-0.45-i*.12,0,Math.PI*2);ctx.stroke()}ctx.restore()}
async function makeThoughtCard(){
if(!current)throw Error('Abra primeiro seu pensamento');
const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
const ctx=canvas.getContext('2d');if(!ctx)throw Error('Navegador sem suporte a canvas');
const bg=await loadCardImage('papel-salvar.webp');
if(bg)ctx.drawImage(bg,0,0,1080,1350);else{ctx.fillStyle='#eee1c5';ctx.fillRect(0,0,1080,1350)}
ctx.save();ctx.textAlign='center';
// Monogram and brand seal, rendered entirely on the local canvas.
ctx.strokeStyle='#855a37';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(540,164,42,0,Math.PI*2);ctx.stroke();
ctx.fillStyle='#7c5436';ctx.font='italic 43px Georgia, serif';ctx.fillText('A',540,179);
ctx.fillStyle='#84613d';ctx.font='bold 21px Georgia, serif';ctx.fillText('UMA PALAVRA PARA GUARDAR',540,246);
canvasDecor(ctx,240,382,1);canvasDecor(ctx,840,382,-1);
ctx.fillStyle='#62402e';ctx.font='italic 66px "DM Serif Display", Georgia, serif';
const title=current.title.length>32?current.title.slice(0,32)+'…':current.title;
ctx.fillText(title,540,344,780);
// Choose type size based on actual text length, keeping generous margins.
const parts=current.body.split(/\s+/).filter(Boolean);let fontSize=55,lines=[];
for(;fontSize>=35;fontSize-=2){ctx.font=`${fontSize}px "DM Serif Display", Georgia, serif`;lines=wrappedLines(ctx,parts,735);if(lines.length*(fontSize*1.53)<580)break}
const lineH=fontSize*1.55;const first=Math.max(470,750-((lines.length-1)*lineH)/2);
ctx.fillStyle='#372a22';ctx.font=`${fontSize}px "DM Serif Display", Georgia, serif`;
lines.forEach((line,i)=>ctx.fillText(line,540,first+i*lineH,790));
if(current.scripture_reference){ctx.font='italic 25px Georgia, serif';ctx.fillStyle='#856445';ctx.fillText('Inspirado em '+current.scripture_reference,540,1078,820)}
ctx.strokeStyle='#a27d53';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(350,1171);ctx.lineTo(730,1171);ctx.stroke();
ctx.fillStyle='#6b432c';ctx.font='italic 47px "Italianno", "Brush Script MT", Georgia, cursive';
ctx.fillText('Almanaque de Viver',540,1232,820);
ctx.fillStyle='#8c7458';ctx.font='17px Georgia, serif';ctx.fillText('PALAVRAS QUE ENCONTRAM O CORAÇÃO',540,1265);
ctx.restore();return canvas;
}
async function cardBlob(canvas){return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Não foi possível renderizar')),'image/png',1))}
async function saveThought(){if(!current)return;const status=$('#stageStatus');text(status,'Preparando seu pergaminho para guardar…');try{
await document.fonts?.ready;
const canvas=await makeThoughtCard();const blob=await cardBlob(canvas);const url=URL.createObjectURL(blob);const link=document.createElement('a');link.download='almanaque-de-viver-pensamento.png';link.href=url;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);text(status,'Seu pergaminho está pronto para salvar ou compartilhar.');
}catch(e){console.error('Falha ao exportar pergaminho:',e);text(status,'Não foi possível gerar a imagem neste navegador. Tente novamente.')}}
async function shareThought(){if(!current)return;const message=current.title+'\n\n'+current.body+'\n\nAlmanaque de Sentir';try{if(navigator.share){await navigator.share({title:'Uma palavra especial',text:message,url:location.href})}else if(navigator.clipboard){await navigator.clipboard.writeText(message);text($('#stageStatus'),'Pensamento copiado para compartilhar.')}else{text($('#stageStatus'),'Use o botão Salvar imagem para compartilhar.')}}catch(e){if(e.name!=='AbortError')text($('#stageStatus'),'Não foi possível compartilhar neste navegador.')}}
function renderProducts(){const root=$('#shopGrid');root.replaceChildren();const filter=$('.shop-tab.active')?.dataset.filter||'all';products.forEach((p,i)=>{if(filter!=='all'&&p.product_type!==filter)return;const art=el('div','product-art');const label=el('span','product-label',p.product_type==='ebook'?'E-BOOK DIGITAL':p.product_type==='collection'?'COLEÇÃO AUTORAL':'PENSAMENTO ESPECIAL');const img=el('img');img.src=COVERS[p.slug]||'capa-alma.svg';img.alt='Capa da edição '+p.title;img.loading='lazy';art.append(label,img);
const body=el('div','product-info');body.append(el('div','product-category',p.product_type==='ebook'?'LEITURA ESPECIAL':p.product_type==='collection'?'PARA REVISITAR':'UMA PALAVRA PARA GUARDAR'),el('h3','',p.title.replace('Pensamento Especial: ','')),el('p','',p.description||'Uma edição original para um momento especial.'));
const features=el('div','product-features');const info=p.product_type==='ebook'?'75 páginas · 30 encontros':p.product_type==='collection'?'12 reflexões inéditas':'Arte + leitura guiada';for(const f of [info,p.product_type==='ebook'?'90 perguntas de reflexão':p.product_type==='collection'?'Gestos e perguntas práticas':'Entrega digital em PDF']){const line=el('span');line.append(icon('check'),el('span','',f));features.append(line)};
const footer=el('div','product-footer');const price=el('div','product-price');price.append(el('small','', 'VALOR DA EDIÇÃO'),el('strong','',money(p.price_cents)));const btn=el('button','product-view');btn.type='button';btn.append(el('span','', 'Conhecer edição'),icon('arrow'));btn.addEventListener('click',()=>showProduct(p));footer.append(price,btn);body.append(features,footer);const card=el('article','product-card');if(p.product_type==='collection'||p.product_type==='ebook')card.classList.add('product-featured');card.append(art,body);root.append(card)});if(!root.childElementCount)root.append(el('p','no-products','Nenhuma edição nesta categoria por enquanto.'))}
function openSample(){const d=$('#sampleDialog'),f=$('#sampleFrame');if(!d)return;if(f&&f.src==='about:blank')f.src='amostra-gratis-30-dias.pdf#toolbar=0&navpanes=0';if(typeof d.showModal==='function'&&!d.open)d.showModal();}
function setupSample(){const d=$('#sampleDialog');if(!d)return;$('#closeSample').addEventListener('click',()=>d.close());d.addEventListener('click',event=>{if(event.target===d)d.close()});for(const id of ['ebookFreeSample','ebookPreviewPages'])$('#'+id)?.addEventListener('click',openSample);$('#ebookDetails')?.addEventListener('click',()=>showProduct(products.find(p=>p.slug==='ebook-30-dias-de-reflexoes')||PREVIEW[0]));}
function setupShop(){ $$('.shop-tab').forEach(b=>b.addEventListener('click',()=>{$$('.shop-tab').forEach(x=>x.classList.toggle('active',x===b));renderProducts()}));$('#closeProduct').addEventListener('click',()=>$('#productDialog').close());$('#productDialog').addEventListener('click',e=>{if(e.target===$('#productDialog'))$('#productDialog').close()});$('#modalFree').addEventListener('click',()=>$('#productDialog').close());}
function showProduct(p){const dialog=$('#productDialog');text($('#modalTitle'),p.title);text($('#modalDescription'),p.description||'Edição especial do Almanaque de Sentir.');text($('#modalPrice'),money(p.price_cents));const specifics=$('#modalSpecifics');
const featureDetails=p.product_type==='ebook'?'75 páginas · 30 capítulos · 90 perguntas · 30 exercícios':p.product_type==='collection'?'15 páginas · 12 reflexões inéditas · perguntas e exercícios':'2 páginas · frase original · aplicação prática';
text(specifics,featureDetails);
const sampleLink=$('#modalSample');if(sampleLink)sampleLink.hidden=p.product_type!=='ebook';const cover=$('#modalCover');cover.src=COVERS[p.slug]||'capa-alma.svg';cover.alt='Capa de '+p.title;
const secure=Boolean(p.is_active&&/^https:\/\//.test(cfg.CHECKOUT_ENDPOINT||''));const pay=$('#checkoutButton');pay.hidden=!secure;$('#previewButton').hidden=secure;text($('#modalNote'),secure?'Confira os detalhes do pedido antes de efetuar o pagamento.':'A loja está preparando o pagamento e a entrega segura. Este botão ainda não realiza nenhuma cobrança.');pay.onclick=null;
if(secure&&cfg.CHECKOUT_ENDPOINT){pay.href='#';pay.removeAttribute('target');pay.onclick=async e=>{e.preventDefault();pay.style.pointerEvents='none';try{const res=await fetch(cfg.CHECKOUT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:p.id})});const data=await res.json();if(!res.ok||!/^https:\/\//.test(data.checkout_url||''))throw Error('Indisponível');location.href=data.checkout_url}catch(_){text($('#modalNote'),'Pagamento indisponível no momento. Nenhuma cobrança foi realizada.')}finally{pay.style.pointerEvents=''}}}
if(typeof dialog.showModal==='function')dialog.showModal();}
function starLine(n,cls='review-stars'){const group=el('div',cls);group.setAttribute('aria-label',n+' de 5 estrelas');for(let i=0;i<Math.round(n);i++)group.append(icon('star'));return group}
function safeDate(iso){try{return new Date(iso).toLocaleDateString('pt-BR',{month:'short',year:'numeric'})}catch{return ''}}
function renderReviews(){const root=$('#reviewList');root.replaceChildren();const count=reviewCache.length;const summary=$('#reviewSummary');const old=$('#summaryStars');old.replaceChildren();if(!count){text($('#scoreNumber'),'Ainda sem avaliações');text($('#scoreCaption'),'Sua opinião pode ser a primeira.');const box=el('div','reviews-empty');box.append(icon('quote'),el('p','','Os primeiros relatos ainda estão por chegar.\nSeja uma das primeiras pessoas a contar sua experiência.'));root.append(box);return}
const avg=reviewCache.reduce((s,r)=>s+Number(r.rating),0)/count;old.append(...Array.from(starLine(avg).children));text($('#scoreNumber'),avg.toLocaleString('pt-BR',{maximumFractionDigits:1})+' de 5');text($('#scoreCaption'),count+' '+(count===1?'avaliação real publicada':'avaliações reais publicadas'));
for(const r of reviewCache.slice(0,9)){const card=el('article','review-card'),quote=el('p','', '“'+r.comment+'”'),meta=el('div','review-card-meta');const author=el('span','review-author');author.append(el('span','review-monogram',String(r.display_name||'A').trim().slice(0,1).toUpperCase()),el('strong','',r.display_name));meta.append(author,el('time','',safeDate(r.created_at)));card.append(starLine(r.rating),quote,meta);root.append(card)}}
async function loadReviews(){try{const data=await api('site_reviews','select=id,display_name,rating,comment,created_at&status=eq.approved&order=created_at.desc&limit=90');reviewCache=data||[];renderReviews()}catch(err){console.info('Avaliações indisponíveis:',err.message);text($('#scoreCaption'),'Avaliações temporariamente indisponíveis.')}}
function paintRating(n){$$('.rating-picker label').forEach((l,i)=>l.classList.toggle('is-selected',i<n))}
function setupReviews(){const inputs=$$('input[name=rating]'),labels=$$('.rating-picker label');inputs.forEach(i=>i.addEventListener('change',()=>{selectedRating=Number(i.value);paintRating(selectedRating)}));labels.forEach((label,i)=>{label.addEventListener('mouseenter',()=>labels.forEach((l,j)=>l.classList.toggle('is-hover',j<=i)));label.addEventListener('mouseleave',()=>labels.forEach(l=>l.classList.remove('is-hover')))});
$('#reviewForm').addEventListener('submit',async e=>{e.preventDefault();const btn=$('#sendReview'),st=$('#reviewStatus'),name=$('#reviewName').value.trim().replace(/\s+/g,' '),comment=$('#reviewText').value.trim();const rating=Number($('input[name=rating]:checked')?.value||0);if($('#reviewWebsite').value)return;if(!/^.{2,48}$/.test(name)||comment.length<18||comment.length>850||!/^[1-5]$/.test(String(rating))){text(st,'Preencha seu nome, escolha as estrelas e escreva ao menos 18 caracteres.');return}if(/https?:\/\/|www\./i.test(comment)){text(st,'Por segurança, não inclua links no comentário.');return}try{const last=Number(localStorage.getItem('almanaque-review-last')||0);if(Date.now()-last<60000){text(st,'Aguarde um minuto antes de enviar outra avaliação.');return}}catch(_){}
btn.disabled=true;text(st,'Enviando sua avaliação…');try{await api('site_reviews','',{method:'POST',body:{display_name:name,rating,comment}});try{localStorage.setItem('almanaque-review-last',String(Date.now()))}catch(_){}$('#reviewForm').reset();selectedRating=0;paintRating(0);text(st,'Avaliação recebida! Obrigado. Ela aparecerá aqui após moderação.');}catch(err){console.warn('Review failed',err);text(st,'Não foi possível enviar agora. Confira sua conexão e tente novamente.')}finally{btn.disabled=false}})}
function setupStickyCTA(){
 const sticky=$('#mobileSticky'),stage=$('#experiencia');if(!sticky||!stage||!('IntersectionObserver' in window))return;
 const obs=new IntersectionObserver(entries=>{for(const entry of entries)sticky.classList.toggle('is-suppressed',entry.isIntersecting)},{threshold:.16});obs.observe(stage);
}
function setupPolish(){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 if('IntersectionObserver' in window){
   const targets=[...document.querySelectorAll('.benefit,.ebook-description,.ebook-main-cover,.ebook-path-steps article,.shop-heading,.product-card,.story-copy,.guarantee-copy,.faq-layout,.review-form-wrap,.last-cta .wrap')];
   // Observer initialized before opacity class so no visual flash on JS failure.
   const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}})},{rootMargin:'0px 0px -35px 0px',threshold:.08});
   document.documentElement.classList.add('js-motion');
   targets.forEach((target,i)=>{target.classList.add('reveal-on-scroll');observer.observe(target)});
 }
 const book=$('#showcaseBook'),hero=$('#heroShowcase');
 if(book&&hero&&matchMedia('(hover:hover) and (pointer:fine)').matches){
    hero.classList.add('is-in-view');
    let active=false;
    hero.addEventListener('pointermove',event=>{
      if(active)return;active=true;
      requestAnimationFrame(()=>{active=false;const r=hero.getBoundingClientRect();const dx=(event.clientX-r.left)/r.width-.5;const dy=(event.clientY-r.top)/r.height-.5;
         book.style.transform=`perspective(1000px) rotateY(${-11+dx*7}deg) rotateX(${-dy*5}deg) rotateZ(${-6+dx*2}deg) translateY(${-4-dy*5}px)`;});
    });
    hero.addEventListener('pointerleave',()=>book.style.transform='');
 }
}
function init(){setupMenu();setupPolish();const offer=$('#offerExplore');if(offer)offer.addEventListener('click',()=>showProduct(products.find(p=>p.slug==='pensamento-especial-confiar')||products[0]));setupStickyCTA();setupSample();setupExperience();updateGiftUI();setupShop();setupReviews();renderProducts();renderReviews();loadContent();loadReviews();text($('#year'),new Date().getFullYear())}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
