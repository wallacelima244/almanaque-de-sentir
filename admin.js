/* Administração do Almanaque · JavaScript puro.
   O acesso real é controlado no Supabase por Auth + RLS, NÃO apenas por este arquivo. */
(()=>{
'use strict';
const cfg=window.ALMANAQUE_CONFIG||{};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const sessionKey='almanaque_admin_session';
let token='',userId='',categories=[],thoughts=[],contents=[],products=[],orders=[],reviews=[],assets=[],visibleThoughts=30;
const notify=msg=>{$('#adminStatus').textContent=msg};
const formatMoney=cents=>(Number(cents||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const toSlug=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
async function api(path,{method='GET',body=null,auth=true,prefer=null}={}){
 if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY)throw Error('Configure Supabase em config.js');
 const headers={apikey:cfg.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'};
 if(auth&&token)headers.Authorization='Bearer '+token;
 if(prefer)headers.Prefer=prefer;
 const res=await fetch(cfg.SUPABASE_URL+path,{method,headers,body:body?JSON.stringify(body):undefined});
 const text=await res.text();let data;
 try{data=text?JSON.parse(text):null}catch{data=null}
 if(!res.ok){if(res.status===401&&auth)clearSession();throw Error(data?.message||data?.error_description||data?.msg||data?.hint||('Erro '+res.status))}
 return data;
}
function clearSession(){sessionStorage.removeItem(sessionKey);token='';userId='';$('#dashboard').hidden=true;$('#loginPanel').hidden=false;}
async function authorize(jwt,uid){token=jwt;userId=uid;const data=await api('/rest/v1/admin_users?select=user_id&user_id=eq.'+encodeURIComponent(uid));if(!Array.isArray(data)||!data.length)throw Error('Essa conta não foi autorizada como administradora. Cadastre-a em admin_users.');}
async function login(email,password){
 const session=await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},auth:false});
 if(!session?.access_token||!session?.user?.id)throw Error('Login não confirmado');
 await authorize(session.access_token,session.user.id);
 sessionStorage.setItem(sessionKey,JSON.stringify({token,uid:userId}));
 await showDashboard();
}
async function showDashboard(){
 $('#loginPanel').hidden=true;$('#dashboard').hidden=false;
 notify('Carregando dados...');
 await refresh();notify('Dados atualizados.');
}
async function refresh(){
 const [c,t,tc,p,o,r,a]=await Promise.all([
 api('/rest/v1/categories?select=id,name,slug&order=display_order.asc'),
 api('/rest/v1/thoughts?select=id,slug,title,teaser,category_id,status,access_level,scripture_reference&order=created_at.desc&limit=250'),
 api('/rest/v1/thought_contents?select=thought_id,body&limit=250'),
 api('/rest/v1/products?select=id,slug,title,description,product_type,price_cents,is_active&order=created_at.desc&limit=150'),
 api('/rest/v1/orders?select=id,merchant_reference,customer_email,amount_cents,status,created_at&order=created_at.desc&limit=80'),
 api('/rest/v1/site_reviews?select=id,display_name,rating,comment,status,created_at,approved_at&order=created_at.desc&limit=250'),
 api('/rest/v1/product_assets?select=id,product_id,file_path,display_name,mime_type&limit=150')
 ]);
 categories=c||[];thoughts=t||[];contents=tc||[];products=p||[];orders=o||[];reviews=r||[];assets=a||[];
 $('#statsThoughts').textContent=thoughts.length;$('#statsProducts').textContent=products.length;$('#statsOrders').textContent=orders.length;
 const catSelect=$('#thoughtCategory');catSelect.replaceChildren();categories.forEach(c=>catSelect.add(new Option(c.name,c.id)));
 drawThoughts();drawProducts();drawProductAssets();drawOrders();drawReviews();
}
function newEl(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=String(text);return e}
function drawList(target,rows,callback){const root=$(target);root.replaceChildren();if(!rows.length){root.append(newEl('p','hint','Nenhum registro por enquanto.'));return}rows.forEach(r=>{const div=newEl('article','data-item'),info=newEl('div'),name=newEl('strong','',r.name),sub=newEl('small','',r.sub),button=r.edit?newEl('button','',r.action||'Editar'):null;info.append(name,sub);div.append(info);if(button){button.type='button';button.addEventListener('click',()=>callback(r.raw));div.append(button)}root.append(div)})}
function drawThoughts(){
 const query=String($('#thoughtSearch')?.value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),type=$('#thoughtFilter')?.value||'all';
 const found=thoughts.filter(t=>{const hay=[t.title,t.slug,t.teaser,categories.find(c=>c.id===t.category_id)?.name||''].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return (!query||hay.includes(query))&&(type==='all'||(type==='draft'?t.status==='draft':t.access_level===type))});
 const batch=found.slice(0,visibleThoughts);drawList('#thoughtList',batch.map(t=>({name:t.title,sub:`${t.access_level==='paid'?'Premium':'Grátis'} · ${t.status} · ${t.slug}`,edit:true,raw:t})),editThought);
 if($('#thoughtResults'))$('#thoughtResults').textContent=`Mostrando ${batch.length} de ${found.length} pensamentos`;
 if($('#moreThoughts'))$('#moreThoughts').hidden=found.length<=batch.length;
}
$('#thoughtSearch')?.addEventListener('input',()=>{visibleThoughts=30;drawThoughts()});$('#thoughtFilter')?.addEventListener('change',()=>{visibleThoughts=30;drawThoughts()});$('#moreThoughts')?.addEventListener('click',()=>{visibleThoughts+=30;drawThoughts()});
function drawProducts(){drawList('#productList',products.map(p=>({name:p.title,sub:`${formatMoney(p.price_cents)} · ${p.is_active?'Visível na vitrine':'Rascunho'}`,edit:true,raw:p})),editProduct)}
function drawProductAssets(){
 const select=$('#assetProduct'),old=select.value,root=$('#assetList');select.replaceChildren();root.replaceChildren();
 if(!products.length){root.append(newEl('p','hint','Cadastre produtos antes de enviar PDFs.'));return}
 for(const p of [...products].sort((x,y)=>x.title.localeCompare(y.title,'pt-BR'))){const opt=new Option(p.title,p.id);select.add(opt)}
 if(products.some(p=>p.id===old))select.value=old;
 for(const p of products){const a=assets.find(a=>a.product_id===p.id);const row=newEl('article','data-item asset-row');const left=newEl('div');left.append(newEl('strong','',p.title),newEl('small','',a?'PDF privado: '+a.display_name:'PDF não enviado. Ainda não existe arquivo liberável para este produto.'));row.append(left);if(a){const btn=newEl('button','', 'Baixar para conferir');btn.type='button';btn.addEventListener('click',()=>downloadPrivateAsset(a));row.append(btn)}root.append(row)}
}
async function uploadProductAsset(e){
 e.preventDefault();if(!token||!userId)throw Error('Entre novamente como administrador.');
 const product=products.find(p=>p.id===$('#assetProduct').value),file=$('#assetFile').files?.[0];
 if(!product||!file)throw Error('Selecione o produto e o PDF correspondente.');
 if(!/\.pdf$/i.test(file.name)||file.size<100||file.size>20*1024*1024)throw Error('Escolha um arquivo PDF de até 20 MB.');
 const magic=Array.from(new Uint8Array(await file.slice(0,5).arrayBuffer())).map(c=>String.fromCharCode(c)).join('');
 if(magic!=='%PDF-')throw Error('O arquivo não parece ser um PDF válido.');
 const btn=$('#uploadAsset'),name=product.slug+'.pdf',url=cfg.SUPABASE_URL+'/storage/v1/object/almanaque-produtos/'+encodeURIComponent(name);
 btn.disabled=true;notify('Enviando PDF privado para '+product.title+'...');
 try{
  const res=await fetch(url,{method:'POST',headers:{apikey:cfg.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+token,'Content-Type':'application/pdf','x-upsert':'true'},body:file});
  if(!res.ok){const msg=await res.text();throw Error('Falha no armazenamento privado: '+res.status+' '+msg.slice(0,130))}
  const meta={product_id:product.id,file_path:name,display_name:file.name,mime_type:'application/pdf'};
  const existing=assets.find(a=>a.product_id===product.id);
  if(existing)await api('/rest/v1/product_assets?id=eq.'+encodeURIComponent(existing.id),{method:'PATCH',body:meta,prefer:'return=representation'});
  else await api('/rest/v1/product_assets',{method:'POST',body:meta,prefer:'return=representation'});
  $('#assetUploadForm').reset();await refresh();notify('PDF enviado com proteção e vinculado a '+product.title+'. Pagamentos permanecem desativados até a integração.');
 }finally{btn.disabled=false}
}
async function downloadPrivateAsset(asset){
 try{notify('Preparando download protegido...');const path=encodeURIComponent(asset.file_path),url=cfg.SUPABASE_URL+'/storage/v1/object/authenticated/almanaque-produtos/'+path;
 const res=await fetch(url,{headers:{apikey:cfg.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+token}});if(!res.ok)throw Error('Não foi possível abrir o arquivo privado ('+res.status+').');
 const blob=await res.blob(),obj=URL.createObjectURL(blob),link=document.createElement('a');link.href=obj;link.download=asset.display_name||'arquivo.pdf';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(obj),4500);notify('Arquivo privado preparado para conferência.');
 }catch(e){notify(e.message)}
}
function drawOrders(){drawList('#orderList',orders.map(o=>({name:formatMoney(o.amount_cents)+' · '+o.status,sub:`${o.customer_email||'Sem e-mail'} · ${new Date(o.created_at).toLocaleDateString('pt-BR')} · ${o.merchant_reference}`,edit:false,raw:o})),()=>{})}
function editThought(t){
 $('#thoughtForm').hidden=false;$('#thoughtFormTitle').textContent=t?'Editar pensamento':'Novo pensamento';
 $('#thoughtId').value=t?.id||'';$('#thoughtTitle').value=t?.title||'';$('#thoughtSlug').value=t?.slug||'';
 $('#thoughtCategory').value=t?.category_id||categories[0]?.id||'';
 $('#thoughtBody').value=contents.find(c=>c.thought_id===t?.id)?.body||'';
 $('#thoughtTeaser').value=t?.teaser||'';$('#thoughtScripture').value=t?.scripture_reference||'';
 $('#thoughtAccess').value=t?.access_level||'free';$('#thoughtStatus').value=t?.status||'draft';
 $('#thoughtForm').scrollIntoView({behavior:'smooth',block:'start'});
}
function editProduct(p){
 $('#productForm').hidden=false;$('#productFormTitle').textContent=p?'Editar produto':'Novo produto';
 $('#productId').value=p?.id||'';$('#productTitle').value=p?.title||'';$('#productSlug').value=p?.slug||'';
 $('#productDescription').value=p?.description||'';$('#productType').value=p?.product_type||'thought';
 $('#productPrice').value=p?(Number(p.price_cents)/100).toFixed(2):'19.90';$('#productActive').checked=!!p?.is_active;
 $('#productForm').scrollIntoView({behavior:'smooth',block:'start'});
}
async function saveThought(e){
 e.preventDefault();const id=$('#thoughtId').value,desired=$('#thoughtStatus').value,body=$('#thoughtBody').value.trim();
 if(!body)throw Error('Escreva o conteúdo do pensamento.');
 const values={title:$('#thoughtTitle').value.trim(),slug:toSlug($('#thoughtSlug').value||$('#thoughtTitle').value),teaser:$('#thoughtTeaser').value.trim()||null,category_id:$('#thoughtCategory').value||null,scripture_reference:$('#thoughtScripture').value.trim()||null,access_level:$('#thoughtAccess').value};
 if(id){
  // Primeiro o conteúdo, depois os metadados. Publicações pagas continuam com RLS.
  await api('/rest/v1/thought_contents?on_conflict=thought_id',{method:'POST',body:{thought_id:id,body},prefer:'resolution=merge-duplicates,return=representation'});
  await api('/rest/v1/thoughts?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:{...values,status:desired,published_at:desired==='published'?new Date().toISOString():null},prefer:'return=representation'});
 }else{
  const result=await api('/rest/v1/thoughts',{method:'POST',body:{...values,status:'draft'},prefer:'return=representation'});
  const newId=result?.[0]?.id;if(!newId)throw Error('Não foi possível identificar o novo pensamento.');
  await api('/rest/v1/thought_contents',{method:'POST',body:{thought_id:newId,body},prefer:'return=representation'});
  if(desired!=='draft')await api('/rest/v1/thoughts?id=eq.'+encodeURIComponent(newId),{method:'PATCH',body:{status:desired,published_at:desired==='published'?new Date().toISOString():null}});
 }
 $('#thoughtForm').hidden=true;await refresh();notify('Pensamento salvo com sucesso.');
}
async function saveProduct(e){
 e.preventDefault();const id=$('#productId').value;
 const values={title:$('#productTitle').value.trim(),slug:toSlug($('#productSlug').value||$('#productTitle').value),description:$('#productDescription').value.trim(),product_type:$('#productType').value,price_cents:Math.round(Number($('#productPrice').value)*100),is_active:$('#productActive').checked};
 if(!values.price_cents||values.price_cents<1)throw Error('Informe um preço maior que zero.');
 if(id)await api('/rest/v1/products?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:values,prefer:'return=representation'});
 else await api('/rest/v1/products',{method:'POST',body:values,prefer:'return=representation'});
 $('#productForm').hidden=true;await refresh();notify('Produto salvo. A publicação na vitrine não ativa o checkout automaticamente.');
}

function drawReviews(){
 const root=$('#adminReviewList');root.replaceChildren();const waiting=reviews.filter(r=>r.status==='pending').length;
 $('#reviewPendingCount').textContent=waiting?`(${waiting} pendentes)`:'';
 if(!reviews.length){root.append(newEl('p','hint','Nenhuma avaliação enviada até agora.'));return}
 const ordered=[...reviews].sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1));
 for(const r of ordered){
  const item=newEl('article','review-admin-item');
  const head=newEl('div','review-admin-head');head.append(newEl('strong','',r.display_name+' · '+r.rating+' de 5 estrelas'),newEl('small','',new Date(r.created_at).toLocaleDateString('pt-BR')+' · '+r.status));
  item.append(head,newEl('p','',r.comment));
  if(r.status==='pending'){
   const controls=newEl('div','review-admin-actions');
   const yes=newEl('button','primary','Aprovar e publicar');yes.type='button';yes.addEventListener('click',()=>moderateReview(r,'approved'));
   const no=newEl('button','secondary','Rejeitar');no.type='button';no.addEventListener('click',()=>moderateReview(r,'rejected'));
   controls.append(yes,no);item.append(controls);
  }else if(r.status==='approved'){
   const controls=newEl('div','review-admin-actions');const no=newEl('button','secondary','Retirar do site');no.type='button';no.addEventListener('click',()=>moderateReview(r,'rejected'));controls.append(no);item.append(controls)
  }
  root.append(item);
 }
}
async function moderateReview(r,status){
 if(!confirm(status==='approved'?'Publicar esta avaliação real no site?':'Retirar esta avaliação do site?'))return;
 try{await api('/rest/v1/site_reviews?id=eq.'+encodeURIComponent(r.id),{method:'PATCH',body:{status,approved_at:status==='approved'?new Date().toISOString():null},prefer:'return=representation'});await refresh();notify(status==='approved'?'Avaliação aprovada e publicada.':'Avaliação retirada da vitrine.')}catch(err){notify('Falha ao moderar avaliação: '+err.message)}
}

function bind(){
 $('#loginForm').addEventListener('submit',async e=>{e.preventDefault();$('#loginError').textContent='Entrando...';try{await login($('#email').value,$('#password').value);$('#loginError').textContent=''}catch(err){clearSession();$('#loginError').textContent=err.message}});
 $('#logout').addEventListener('click',async()=>{try{await api('/auth/v1/logout',{method:'POST'})}catch{}clearSession()});
 $$('.tab').forEach(btn=>btn.addEventListener('click',()=>{$$('.tab').forEach(b=>b.classList.toggle('active',b===btn));$$('.tab-panel').forEach(p=>p.hidden=p.id!=='tab-'+btn.dataset.tab)}));
 $('#newThought').addEventListener('click',()=>editThought(null));$('#cancelThought').addEventListener('click',()=>$('#thoughtForm').hidden=true);
 $('#newProduct').addEventListener('click',()=>editProduct(null));$('#cancelProduct').addEventListener('click',()=>$('#productForm').hidden=true);
 $('#thoughtForm').addEventListener('submit',async e=>{try{await saveThought(e)}catch(err){notify('Erro ao salvar pensamento: '+err.message)}});
 $('#productForm').addEventListener('submit',async e=>{try{await saveProduct(e)}catch(err){notify('Erro ao salvar produto: '+err.message)}});
 $('#assetUploadForm').addEventListener('submit',async e=>{try{await uploadProductAsset(e)}catch(err){notify('Erro ao enviar PDF: '+err.message)}});
 $('#refreshOrders').addEventListener('click',async()=>{try{await refresh();notify('Pedidos atualizados.')}catch(err){notify(err.message)}});
 $('#refreshReviews').addEventListener('click',async()=>{try{await refresh();notify('Avaliações atualizadas.')}catch(err){notify(err.message)}});
 $('#thoughtTitle').addEventListener('input',()=>{if(!$('#thoughtId').value)$('#thoughtSlug').value=toSlug($('#thoughtTitle').value)});
 $('#productTitle').addEventListener('input',()=>{if(!$('#productId').value)$('#productSlug').value=toSlug($('#productTitle').value)});
}
async function init(){bind();const saved=sessionStorage.getItem(sessionKey);if(saved){try{const data=JSON.parse(saved);await authorize(data.token,data.uid);await showDashboard()}catch(err){clearSession();$('#loginError').textContent='Entre novamente para acessar o painel.'}}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
