(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const nav=$$('.nav'),views=$$('.view'),file=$('#playlist');
const catalog={'ao-vivo':[],filmes:[],series:[]}; let section='inicio',xtream=null;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const typeLabel=t=>({'ao-vivo':'Canal ao vivo',filmes:'Filme',series:'Série'}[t]||t);
function show(id){if(!$('#'+id))id='inicio';section=id;views.forEach(v=>v.classList.toggle('active',v.id===id));nav.forEach(b=>b.classList.toggle('active',b.dataset.target===id));if(id==='pesquisa')$('#query').focus();if(id==='minha-lista')render(saved(),$('#saved'),'Sua lista está vazia');}
nav.forEach(b=>b.addEventListener('click',()=>show(b.dataset.target)));
$('#explore').onclick=()=>show('filmes');$('#go-list').onclick=()=>show('minha-lista');$('#search-open').onclick=()=>show('pesquisa');$('#settings').onclick=()=>show('configuracoes');
function pick(){show('configuracoes');file.click()}$$('.import').forEach(b=>b.addEventListener('click',pick));
function inferType(name,group,url,attrs=''){const s=(name+' '+group+' '+url+' '+attrs).toLocaleLowerCase('pt-BR');if(/\b(series|série|séries|temporada|season|epis[oó]dio|tv show)\b|s\d{1,2}\s*e\d{1,2}/i.test(s))return'series';if(/\b(filme|filmes|movie|movies|cinema|vod)\b/i.test(s)||/\.(mkv|mp4|avi|mov)(\?|$)/i.test(url))return'filmes';return'ao-vivo';}
function parseM3U(text){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/),out=[];let meta=null;for(const raw of lines){const l=raw.trim();if(!l)continue;if(l.startsWith('#EXTINF')){const comma=l.lastIndexOf(',');const a={};const re=/([\w-]+)="([^"]*)"/g;let m;while((m=re.exec(l))!==null)a[m[1].toLowerCase()]=m[2];meta={name:comma>=0?l.slice(comma+1).trim():'Item sem título',group:a['group-title']||'',logo:a['tvg-logo']||'',tvgId:a['tvg-id']||'',attrs:l};}else if(!l.startsWith('#')&&meta){const type=inferType(meta.name,meta.group,l,meta.attrs);out.push({...meta,type,url:l,id:l,source:'m3u'});meta=null;}}return out;}
function saved(){try{return JSON.parse(localStorage.getItem('gsplayer.saved')||'[]')}catch(e){return[]}}
function readFileAsText(file){if(file&&typeof file.text==='function')return file.text();return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Falha ao ler o arquivo'));reader.readAsText(file);});}
function persistSaved(a){try{localStorage.setItem('gsplayer.saved',JSON.stringify(a))}catch(e){alert('Não foi possível salvar favoritos neste dispositivo.')}}
function emptyMarkup(t,m){return '<strong>'+esc(t)+'</strong><p>'+esc(m)+'</p>'}
function render(items,target,empty='Nenhum item encontrado'){if(!target)return;if(!items.length){target.className='empty';target.innerHTML=emptyMarkup(empty,'O catálogo é carregado automaticamente quando a fonte está acessível. Você também pode conectar sua própria fonte nas configurações.');return;}target.className='results';target.innerHTML=items.slice(0,500).map((x,i)=>'<button type="button" class="result" data-result="'+i+'" aria-label="Abrir '+esc(x.name)+'">'+(x.logo?'<img class="poster" loading="lazy" src="'+esc(x.logo)+'" alt="" onerror="this.style.display=\'none\'">':'<span class="poster-placeholder">'+esc((x.name||'GS').slice(0,2).toUpperCase())+'</span>')+'<strong>'+esc(x.name)+'</strong><small>'+esc(x.group||typeLabel(x.type))+'</small></button>').join('');target.onclick=e=>{const b=e.target.closest('[data-result]');if(!b||!target.contains(b))return;e.preventDefault();e.stopPropagation();const i=Number(b.getAttribute('data-result'));if(Number.isInteger(i)&&items[i]){if(items[i].type==='filmes'&&items[i].url)play(items[i]);else details(items[i]);}};}
function renderSections(){for(const [id,items] of Object.entries(catalog))render(items,$('#list-'+id),id==='ao-vivo'?'Nenhum canal carregado':id==='filmes'?'Nenhum filme identificado':'Nenhuma série identificada');$('#catalog-count').textContent=Object.values(catalog).reduce((n,a)=>n+a.length,0)+' itens carregados';}
function loadCatalog(items,message=''){for(const k of Object.keys(catalog))catalog[k].length=0;items.forEach(x=>catalog[catalog[x.type]?x.type:'ao-vivo'].push(x));renderSections();$('#source-status').textContent=message||'Fonte carregada';}
async function loadPublicLive(){
 const status=$('#public-status');
 const sources=[
  {url:'https://iptv-org.github.io/iptv/countries/br.m3u',label:'IPTV-org · Brasil'},
  {url:'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8',label:'Free-TV · lista global'}
 ];
 if(status)status.textContent='Carregando canais públicos…';
 let lastError=null;
 for(const source of sources){
  try{
   const response=await fetch(source.url,{cache:'no-cache'});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const text=await response.text();
   if(!text.includes('#EXTINF'))throw new Error('Lista vazia ou formato inválido');
   try{localStorage.setItem('gsplayer.public.ao-vivo',text)}catch(ignore){}
   const items=parseM3U(text).map(x=>({...x,type:'ao-vivo',source:'public-m3u',id:'public-live-'+x.url}));
   if(!items.length)throw new Error('Nenhum canal reconhecido');
   catalog['ao-vivo'].length=0;catalog['ao-vivo'].push(...items);
   renderSections();
   if(status)status.textContent=items.length+' canais públicos carregados de '+source.label+'. Alguns podem ter restrição regional ou estar temporariamente fora do ar.';
   $('#source-status').textContent='Canais públicos carregados';
   return items.length;
  }catch(e){lastError=e;}
 }
 try{
  const cached=localStorage.getItem('gsplayer.public.ao-vivo');
  if(cached){const items=parseM3U(cached).map(x=>({...x,type:'ao-vivo',source:'public-m3u-cache',id:'public-live-'+x.url}));catalog['ao-vivo'].length=0;catalog['ao-vivo'].push(...items);renderSections();if(status)status.textContent='Sem conexão com as listas públicas. Exibindo '+items.length+' canais da última carga.';return items.length;}
 }catch(ignore){}
 if(status)status.textContent='Não foi possível baixar listas públicas de canais ('+(lastError&&lastError.message||'erro de rede')+'). Tente novamente ou importe uma playlist autorizada.';
 return 0;
}
async function loadPublicList(kind, options={}){
 const status=$('#public-status');
 const urls={filmes:'https://raw.githubusercontent.com/OnlineM3U/publicdomainm3u/main/movies.m3u',series:'https://raw.githubusercontent.com/OnlineM3U/publicdomainm3u/main/series.m3u'};
 if(status)status.textContent='Baixando lista de '+kind+'…';
 try{
  let text='';
  const response=await fetch(urls[kind],{cache:'no-cache'});
  if(!response.ok)throw new Error('HTTP '+response.status);
  text=await response.text();
  if(!text.trim())throw new Error('A fonte retornou uma lista vazia');
  try{localStorage.setItem('gsplayer.public.'+kind,text);localStorage.setItem('gsplayer.public.lastLoaded',kind)}catch(ignore){}
  const items=parseM3U(text).map(x=>({...x,type:kind,source:'publicdomainm3u',id:'public-'+kind+'-'+x.url}));
  if(!items.length)throw new Error('A lista não contém itens reconhecidos');
  const existing=new Set(catalog[kind].map(x=>x.url));
  const fresh=items.filter(x=>!existing.has(x.url));
  catalog[kind].push(...fresh);renderSections();
  if(status)status.textContent=fresh.length+' novos itens de '+kind+' carregados ('+items.length+' na lista).';
  $('#source-status').textContent='Catálogo público carregado';
  return items.length;
 }catch(error){
  // Use a previously downloaded public list when the TV is offline or the source is temporarily unavailable.
  try{
   const cached=localStorage.getItem('gsplayer.public.'+kind);
   if(cached){const items=parseM3U(cached).map(x=>({...x,type:kind,source:'publicdomainm3u-cache',id:'public-'+kind+'-'+x.url}));const existing=new Set(catalog[kind].map(x=>x.url));catalog[kind].push(...items.filter(x=>!existing.has(x.url)));renderSections();if(status)status.textContent='Usando catálogo salvo anteriormente ('+items.length+' itens). A atualização online falhou.';return items.length;}
  }catch(ignore){}
  // Candidate fallback catalogue; links are not automatically verified and may have moved.
  if(kind==='filmes'){
   const fallback=[
    {name:'Night of the Living Dead (1968)',group:'Terror · Filme clássico',logo:'https://archive.org/download/night-of-the-living-dead-movie-poster/NOTLD2x1200.jpg',url:'https://archive.org/download/Night.Of.The.Living.Dead_1080p/NightOfTheLivingDead.mp4'},
    {name:'House on Haunted Hill (1959)',group:'Terror · Filme clássico',logo:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/House_on_Haunted_Hill.jpg/330px-House_on_Haunted_Hill.jpg',url:'https://archive.org/download/house_on_haunted_hill_ipod/house_on_haunted_hill_512kb.mp4'},
    {name:'Carnival of Souls (1962)',group:'Terror · Filme clássico',logo:'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/Carnival_of_Souls_%281962_pressbook_cover%29.jpg/330px-Carnival_of_Souls_%281962_pressbook_cover%29.jpg',url:'https://archive.org/download/CarnivalofSouls/CarnivalOfSouls_512kb.mp4'},
    {name:'Popeye Meets Sinbad the Sailor (1936)',group:'Animação · Curta clássico',logo:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Popeye_Meets_Sinbad.PNG/330px-Popeye_Meets_Sinbad.PNG',url:'https://archive.org/download/Popeye_meetsSinbadtheSailor/Popeye_meetsSinbadtheSailor_512kb.mp4'}
   ].map((x,i)=>({...x,type:'filmes',id:'public-fallback-'+i,source:'publicdomain-fallback'}));
   const existing=new Set(catalog.filmes.map(x=>x.url));catalog.filmes.push(...fallback.filter(x=>!existing.has(x.url)));renderSections();
   if(status)status.textContent='A lista online não respondeu. Mostrando '+fallback.length+' filmes candidatos de reserva; os links precisam ser testados e podem estar indisponíveis.';
   return fallback.length;
  }
  if(status)status.textContent='Não foi possível carregar '+kind+' pela internet: '+(error.message||'erro de rede')+'. Confira a conexão da TV; a fonte também pode bloquear requisições externas.';
  return 0;
 }
}
$('#load-public-live').addEventListener('click',loadPublicLive);$('#load-public-movies').addEventListener('click',()=>loadPublicList('filmes'));$('#load-public-series').addEventListener('click',()=>loadPublicList('series'));
function closeOverlay(overlay){if(!overlay)return;const v=overlay.querySelector('video');if(v){try{v.pause();v.removeAttribute('src');v.load();}catch(ignore){}}overlay.remove();}
function makeOverlay(className){const overlay=document.createElement('div');overlay.className='gs-overlay '+className;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');document.body.appendChild(overlay);return overlay;}
function play(item){
 if(!item.url){alert('Este item não tem um endereço de vídeo.');return;}
 const overlay=makeOverlay('player-overlay');
 overlay.innerHTML='<div class="player-panel"><div class="player-head"><strong>'+esc(item.name)+'</strong><button class="secondary" id="player-close">Fechar ✕</button></div><video id="player-video" controls autoplay playsinline tabindex="0"></video><div class="dialog-actions"><button class="primary" id="player-play">▶ Reproduzir</button><button class="secondary" id="player-pause">Ⅱ Pausar</button></div><p id="player-status" class="note">Conectando à transmissão…</p><p class="note">Se a TV bloquear a reprodução automática, selecione Reproduzir. Alguns canais também podem usar codecs incompatíveis.</p></div>';
 const v=overlay.querySelector('video'),status=overlay.querySelector('#player-status');let hls=null,started=false;
 const close=()=>{if(hls){try{hls.destroy()}catch(ignore){}hls=null}closeOverlay(overlay)};
 overlay.querySelector('#player-close').onclick=close;
 const startPlayback=()=>{try{const p=v.play();if(p&&p.catch)p.catch(()=>{status.textContent='A reprodução automática foi bloqueada. Toque em Reproduzir no player.'});}catch(error){status.textContent='Não foi possível iniciar o vídeo neste dispositivo.'}};
 overlay.querySelector('#player-play').onclick=startPlayback;
 overlay.querySelector('#player-pause').onclick=()=>{v.pause();status.textContent='Reprodução pausada.'};
 v.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '||e.key==='MediaPlay'||e.key==='Play'){e.preventDefault();startPlayback()}else if(e.key==='MediaPause'||e.key==='Pause'){e.preventDefault();v.pause()}});
 overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 const onKey=e=>{if(e.key==='Escape'){close();document.removeEventListener('keydown',onKey)}};
 document.addEventListener('keydown',onKey);
 v.onloadedmetadata=()=>status.textContent='Canal reconhecido; iniciando vídeo…';
 v.oncanplay=()=>status.textContent='Vídeo pronto. Se não iniciar, selecione Reproduzir.';
 v.onplaying=()=>{started=true;status.textContent='Reproduzindo ao vivo.'};
 v.onwaiting=()=>{if(!started)status.textContent='Aguardando dados do canal…'};
 v.onerror=()=>status.textContent='A transmissão falhou. O canal pode estar fora do ar, bloqueado por região ou incompatível com a TV. Tente outro canal.';
 const url=String(item.url),isHls=/\.m3u8(?:$|[?#])/i.test(url);
 if(isHls&&v.canPlayType('application/vnd.apple.mpegurl')){v.src=url;const p=v.play();if(p&&p.catch)p.catch(()=>{status.textContent='Toque no botão Reproduzir do player para iniciar no celular.'});}
 else if(isHls&&window.Hls&&window.Hls.isSupported()){
  hls=new Hls({enableWorker:false});
  hls.loadSource(url);hls.attachMedia(v);
  hls.on(Hls.Events.MANIFEST_PARSED,()=>{status.textContent='Lista de vídeo carregada; iniciando…';const p=v.play();if(p&&p.catch)p.catch(()=>status.textContent='Toque no botão Reproduzir do player para iniciar no celular.')});
  hls.on(Hls.Events.ERROR,(_event,data)=>{if(data&&data.fatal){status.textContent='Não foi possível carregar esta transmissão (erro HLS). Pode estar offline ou bloquear acesso externo.';try{hls.destroy()}catch(ignore){}hls=null;}});
 }else{v.src=url;const p=v.play();if(p&&p.catch)p.catch(()=>status.textContent='Toque no botão Reproduzir do player para iniciar no celular.')}
 // Put keyboard/remote focus on the video first so the TV's Play key targets the player.
 v.focus();
}
function apiUrl(action,extra={}){const u=new URL(xtream.server+'/player_api.php');u.searchParams.set('username',xtream.username);u.searchParams.set('password',xtream.password);if(action)u.searchParams.set('action',action);Object.entries(extra).forEach(([k,v])=>u.searchParams.set(k,v));return u.toString();}
async function getJson(url){const r=await fetch(url);if(!r.ok)throw new Error('Resposta HTTP '+r.status);return r.json();}
async function showSeriesEpisodes(item){if(!xtream||item.source!=='xtream'){detailsBasic(item);return;}const status=$('#source-status');status.textContent='Carregando episódios de '+item.name+'…';try{const data=await getJson(apiUrl('get_series_info',{series_id:item.seriesId}));const eps=[];const episodeGroups=data.episodes||{};Object.keys(episodeGroups).forEach(k=>{const group=episodeGroups[k];if(Array.isArray(group))group.forEach(e=>eps.push(e));});if(!eps.length){alert('O servidor não retornou episódios para esta série.');return;}const overlay=makeOverlay('details-overlay');const rows=eps.map((e,i)=>{const id=e.id!=null?e.id:(e.episode_id!=null?e.episode_id:i),ext=(e.container_extension||'mp4').replace(/[^a-z0-9]/gi,'');const title=(e.title||e.episode_num&&('Episódio '+e.episode_num)||'Episódio '+(i+1));const url=xtream.server+'/series/'+encodeURIComponent(xtream.username)+'/'+encodeURIComponent(xtream.password)+'/'+encodeURIComponent(id)+'.'+ext;return {id:String(id),name:title,group:item.name+' · '+(e.season?'Temporada '+e.season:''),type:'series',url,source:'xtream'};});overlay.innerHTML='<div class="details-panel"><button class="secondary dialog-close" id="close">Fechar ✕</button><div class="eyebrow">SÉRIE</div><h2>'+esc(item.name)+'</h2><div id="episode-list" class="results">'+rows.map((e,i)=>'<button class="result" data-ep="'+i+'"><strong>'+esc(e.name)+'</strong><small>'+esc(e.group)+'</small></button>').join('')+'</div></div>';overlay.querySelector('#close').onclick=()=>closeOverlay(overlay);overlay.addEventListener('click',e=>{if(e.target===overlay)closeOverlay(overlay)});$$('[data-ep]',overlay).forEach((b,i)=>b.onclick=()=>{closeOverlay(overlay);play(rows[i])});const firstEpisode=overlay.querySelector('[data-ep]');if(firstEpisode)firstEpisode.focus();}catch(e){alert('Não foi possível carregar os episódios. O servidor pode não oferecer essa função ou bloquear a conexão.');}}
function detailsBasic(item){const overlay=makeOverlay('details-overlay');overlay.innerHTML='<div class="details-panel"><button class="secondary dialog-close" id="close">Fechar ✕</button><div class="eyebrow">'+esc(typeLabel(item.type).toUpperCase())+'</div><h2>'+esc(item.name)+'</h2><p class="note">'+esc(item.group||'Sem categoria')+'</p><div class="dialog-actions"><button class="primary" id="watch">▶ Reproduzir</button><button class="secondary" id="save-item">＋ Minha lista</button></div></div>';overlay.querySelector('#close').onclick=()=>closeOverlay(overlay);overlay.addEventListener('click',e=>{if(e.target===overlay)closeOverlay(overlay)});overlay.querySelector('#watch').onclick=()=>{closeOverlay(overlay);play(item)};overlay.querySelector('#save-item').onclick=()=>{const a=saved();if(!a.some(x=>x.id===item.id))a.push(item);persistSaved(a);closeOverlay(overlay);if(section==='minha-lista')render(saved(),$('#saved'),'Sua lista está vazia')};overlay.querySelector('#close').focus();}
function details(item){if(item.type==='series'&&item.seriesId){showSeriesEpisodes(item);return;}detailsBasic(item);}
file.addEventListener('change',async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;try{const items=parseM3U(await readFileAsText(f));if(!items.length){alert('Nenhum item encontrado. Verifique se o arquivo contém entradas #EXTINF e URLs.');return;}xtream=null;loadCatalog(items,'Arquivo: '+f.name+' · '+items.length+' itens');$('#query').value='';alert('Playlist carregada: '+items.length+' itens.\nCanais: '+catalog['ao-vivo'].length+' · Filmes: '+catalog.filmes.length+' · Séries: '+catalog.series.length);show('ao-vivo');}catch(e){alert('Não foi possível ler a playlist.')}finally{file.value=''}});
$('#query').addEventListener('input',e=>{const q=e.target.value.trim().toLocaleLowerCase('pt-BR'),all=[].concat(catalog['ao-vivo'],catalog.filmes,catalog.series);render(q?all.filter(x=>(x.name+' '+x.group).toLocaleLowerCase('pt-BR').includes(q)):[],$('#results'),q?'Nenhum resultado encontrado':'Digite para pesquisar');});
$('#clear').onclick=()=>{if(confirm('Apagar os favoritos salvos neste dispositivo?')){localStorage.removeItem('gsplayer.saved');render([],$('#saved'),'Sua lista está vazia')}};
$('#connect-xtream').addEventListener('click',async()=>{const server=$('#xt-server').value.trim().replace(/\/+$/,''),username=$('#xt-user').value.trim(),password=$('#xt-pass').value;if(!server||!username||!password){$('#xt-status').textContent='Preencha endereço, usuário e senha fornecidos pelo serviço.';return;}try{const parsed=new URL(server);if(!['http:','https:'].includes(parsed.protocol))throw new Error('Use endereço HTTP ou HTTPS.');}catch(e){$('#xt-status').textContent='Endereço inválido. Inclua http:// ou https:// e a porta, se houver.';return;}$('#xt-status').textContent='Testando conexão…';try{xtream={server,username,password};const auth=await getJson(apiUrl(''));if(auth.user_info&&Number(auth.user_info.auth)===0)throw new Error('O servidor recusou a autenticação.');const calls=[['ao-vivo','get_live_streams'],['filmes','get_vod_streams'],['series','get_series']];const data=await Promise.all(calls.map(async([type,action])=>[type,await getJson(apiUrl(action))]));const items=[];for(const [type,arr] of data){if(!Array.isArray(arr))continue;for(const x of arr){const id=x.stream_id!=null?x.stream_id:(x.series_id!=null?x.series_id:(x.num!=null?x.num:x.id));if(id==null)continue;const name=x.name||x.title||'Item sem título';let url='';if(type==='ao-vivo')url=server+'/live/'+encodeURIComponent(username)+'/'+encodeURIComponent(password)+'/'+id+'.ts';else if(type==='filmes')url=server+'/movie/'+encodeURIComponent(username)+'/'+encodeURIComponent(password)+'/'+id+'.'+((x.container_extension||'mp4').replace(/[^a-z0-9]/gi,''));items.push({id:String(id),name,group:x.category_name||'',logo:x.stream_icon||x.cover||'',type,url,seriesId:type==='series'?id:undefined,source:'xtream'});}}loadCatalog(items,'Conectado · '+items.length+' itens recebidos');$('#xt-status').textContent='Catálogo: '+catalog['ao-vivo'].length+' canais, '+catalog.filmes.length+' filmes e '+catalog.series.length+' séries. Séries podem abrir a lista de episódios. Se falhar, o servidor pode bloquear requisições externas (CORS).';$('#xt-pass').value='';show('ao-vivo');}catch(e){xtream=null;$('#xt-status').textContent='Falha na conexão: '+(e.message||'erro de rede')+'. Confira o endereço e se o servidor permite conexões deste aplicativo (CORS).';}});
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;const cards=$$('.view.active [data-result],.view.active [data-ep]');if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&cards.length){const i=Math.max(0,cards.indexOf(document.activeElement));let n=i;if(e.key==='ArrowRight')n=Math.min(cards.length-1,i+1);if(e.key==='ArrowLeft')n=Math.max(0,i-1);if(e.key==='ArrowDown')n=Math.min(cards.length-1,i+4);if(e.key==='ArrowUp')n=Math.max(0,i-4);e.preventDefault();cards[n].focus();return;}if(['ArrowLeft','ArrowRight'].includes(e.key)){const i=nav.findIndex(b=>b.dataset.target===section),n=e.key==='ArrowRight'?Math.min(nav.length-1,i+1):Math.max(0,i-1);if(nav[n])nav[n].focus()}if(e.key==='Enter'&&e.target.classList.contains('nav'))e.target.click()});
render(saved(),$('#saved'),'Sua lista está vazia');renderSections();
try{if('serviceWorker' in navigator && location.protocol.indexOf('http')===0){navigator.serviceWorker.register('./sw.js').catch(function(){});}}catch(ignore){}
// Start populating the public catalog automatically; no manual import is required.
setTimeout(()=>{Promise.all([loadPublicLive(),loadPublicList('filmes'),loadPublicList('series')]).then(([live,movies,series])=>{if(!live&&!movies&&!series)$('#public-status').textContent='Catálogo online indisponível neste momento. Você ainda pode conectar uma fonte própria nas configurações.';});},250);
})();
