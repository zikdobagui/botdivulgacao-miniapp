'use strict';
const $ = id => document.getElementById(id);
const tg = window.Telegram?.WebApp;
const state = {data: null, demo: false, view: 'overview'};
const number = value => Number(value || 0).toLocaleString('pt-BR');
const date = value => new Intl.DateTimeFormat('pt-BR', {timeZone:'America/Sao_Paulo', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}).format(new Date(value));
const statuses = {active:'Ativo', paused:'Pausado', completed:'Encerrado', sent:'Entregue', failed:'Falhou', pending:'Em análise', approved:'Aprovado', rejected:'Recusado'};
function el(tag, className, text) {const node = document.createElement(tag); if(className) node.className = className; if(text !== undefined) node.textContent = text; return node;}
function notice(text, kind='') {$('notice').textContent=text; $('notice').className=`notice ${kind}`;}
function dialog(title,text) {$('dialog-title').textContent=title; $('dialog-text').textContent=text; $('message-dialog').showModal();}
$('dialog-close').onclick=()=>$('message-dialog').close();
function empty(target,title,description) {const box=el('div','empty');box.append(el('strong','',title),el('span','',description));target.append(box);}
function badge(status) {return el('span',`status ${status}`,statuses[status] || 'Outro');}
function option(value,text) {const node=el('option','',text);node.value=value;return node;}
function botLink(payload='miniapp') {return state.data?.bot ? `https://t.me/${encodeURIComponent(state.data.bot)}?start=${encodeURIComponent(payload)}` : null;}
function goToBot(payload) {
  if(state.demo) {dialog('Você está na demonstração','Este painel usa dados ilustrativos. Abra o Mini App pelo seu bot para consultar seus dados ou fazer solicitações.');return;}
  const url=botLink(payload);if(!url){dialog('Abra pelo seu bot','Envie /start no chat do bot e toque em Abrir Mini App.');return;}
  if(tg?.openTelegramLink) tg.openTelegramLink(url);else window.location.assign(url);
}
$('refresh').onclick=()=>goToBot('miniapp');
function navigate(view) {
 state.view=view;
 for(const section of document.querySelectorAll('.view')) section.hidden=section.id!==view;
 for(const button of document.querySelectorAll('.bottom-nav button')) {if(button.dataset.view===view)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
 const names={overview:'Visão geral', history:'Histórico', ads:'Meus anúncios', schedules:'Meus horários'};
 $('page-title').replaceChildren(document.createTextNode(names[view]),el('span','accent','.'));
 window.scrollTo({top:0,behavior:'instant'});
}
for(const button of document.querySelectorAll('[data-view]')) button.onclick=()=>navigate(button.dataset.view);
document.querySelector('.brand').onclick=event=>{event.preventDefault();if(state.data)navigate('overview');};
function chosenAds(){const id=$('ad-filter').value;return state.data.ads.filter(ad=>id==='all'||String(ad.id)===id);}
function visibleLogs(){const id=$('ad-filter').value;const search=$('search').value.trim().toLocaleLowerCase('pt-BR');const status=$('status-filter').value;return state.data.history.filter(log=>(id==='all'||String(log.ad)===id)&&(status==='all'||log.status===status)&&log.group.toLocaleLowerCase('pt-BR').includes(search));}
function renderMetrics(){
 const period=$('period').value;
 const totals=chosenAds().reduce((result,ad)=>[result[0]+(ad.metrics[period]?.[0]||0),result[1]+(ad.metrics[period]?.[1]||0)],[0,0]);
 $('metric-sent').textContent=number(totals[0]);$('metric-failed').textContent=number(totals[1]);
 $('metric-rate').textContent=totals[0]+totals[1] ? `${(100*totals[0]/(totals[0]+totals[1])).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`:'—';
}
function logRows(target,logs) {
 target.replaceChildren();if(!logs.length){empty(target,'Nenhum envio por aqui','Os envios aparecerão após a divulgação. Se você usou filtros, tente outra busca.');return;}
 for(const log of logs){
  const row=el('div','log-row');const content=el('div');content.append(el('div','log-name',log.group),el('div','log-meta',`${date(log.date)} · horário ${log.time}`));
  const actions=el('div','log-actions');actions.append(badge(log.status));
  if(log.link && /^https:\/\/(t\.me|telegram\.me)\//i.test(log.link)) {const link=el('a','log-link','Ver publicação ↗');link.href=log.link;link.target='_blank';link.rel='noopener noreferrer';actions.append(link);}
  row.append(el('span','group-avatar',log.group.slice(0,1).toLocaleUpperCase('pt-BR')),content,actions);target.append(row);
 }
}
function renderHistory(){const logs=visibleLogs();logRows($('full-history'),logs);$('history-count').textContent=`${number(logs.length)} registros nos envios carregados`;$('history-limit').textContent=`Este painel contém os ${number(state.data.history.length)} envios mais recentes da conta, de ${number(state.data.history_total)} tentativas registradas. Atualize pelo bot para obter um novo resumo.`;$('export').disabled=!logs.length;logRows($('recent-history'),state.data.history.slice(0,4));}
function renderChart(){
 const chart=$('chart');chart.replaceChildren();const max=Math.max(1,...state.data.days.map(day=>day.count));
 chart.setAttribute('aria-label',state.data.days.map(day=>`${day.date}: ${day.count} entregas`).join('; '));
 for(const day of state.data.days){const col=el('div','bar-column');const bar=el('div','bar');bar.style.height=`${Math.max(2,day.count/max*90)}px`;bar.title=`${day.date}: ${number(day.count)} envios`;const label=new Intl.DateTimeFormat('pt-BR',{weekday:'short',timeZone:'America/Sao_Paulo'}).format(new Date(day.date+'T12:00:00-03:00')).replace('.','');col.append(el('b','',number(day.count)),bar,el('small','',label));chart.append(col);}
}
function renderAds(){
 const target=$('ad-list');target.replaceChildren();if(!state.data.ads.length){empty(target,'Seu primeiro anúncio começa aqui','Use o menu de planos no bot para começar sua divulgação.');return;}
 for(const ad of state.data.ads){const card=el('article','panel');const heading=el('div','section-heading');const title=el('div');title.append(el('div','ad-id',ad.purchase?`PLANO #${ad.purchase}`:`ANÚNCIO #${ad.id}`),el('h2','ad-title',ad.title));heading.append(title,badge(ad.status));const metrics=el('div','ad-numbers');for(const [value,label] of [[ad.metrics['30'][0],'entregas em 30 dias'],[ad.metrics['30'][1],'falhas em 30 dias']]){const item=el('div');item.append(el('strong','',number(value)),el('span','',label));metrics.append(item);}const chips=el('div','chips');for(const slot of ad.slots)chips.append(el('span','chip',slot));card.append(heading,metrics,chips);if(ad.expires)card.append(el('p','ad-expiry',ad.status==='paused'?'Validade congelada durante a pausa':`Validade até ${date(ad.expires)}`));const button=el('button','text-button','Ver relatório deste anúncio →');button.onclick=()=>{$('ad-filter').value=String(ad.id);renderMetrics();renderHistory();navigate('overview');};card.append(button);target.append(card);}
}
function renderSchedules(){
 const select=$('schedule-select');select.replaceChildren();const active=$('active-slots');active.replaceChildren();let count=0;
 for(const ad of state.data.ads)for(const schedule of ad.schedules||[]){if(!schedule.editable)continue;select.append(option(schedule.id,`${schedule.time} · ${ad.title} #${ad.purchase||ad.id}`));if(count<4){const row=el('div','slot-entry');row.append(el('span','',`${ad.title} #${ad.purchase||ad.id}`),el('strong','',schedule.time));active.append(row);}count++;}
 if(!count){select.append(option('','Nenhum horário ativo'));empty(active,'Sem horários ativos','Seus horários aparecerão quando um anúncio estiver ativo.');}
 select.disabled=!count;$('submit-request').disabled=!count;
 const times=$('new-time');times.replaceChildren(option('','Selecione um horário'));
 for(const time of state.data.available_times||[])times.append(option(time,time));
 times.disabled=!count;
 const requests=$('request-list');requests.replaceChildren();if(!state.data.requests.length){empty(requests,'Nenhuma solicitação','Seus pedidos de troca e as respostas aparecerão aqui após atualizar pelo bot.');}
 for(const request of state.data.requests){const row=el('div','request-row');const text=el('div');text.append(el('div','request-number',`PEDIDO #${request.id} · ${date(request.date)}`),el('div','request-time',`${request.old} → ${request.new}`));row.append(text,badge(request.status));requests.append(row);}
}
$('request-form').onsubmit=event=>{event.preventDefault();if(!$('new-time').value||!$('schedule-select').value)return;const id=Number($('schedule-select').value);const current=state.data.ads.flatMap(ad=>ad.schedules||[]).find(schedule=>schedule.id===id);if(current?.time===$('new-time').value){dialog('Escolha outro horário','O horário desejado é igual ao que você já utiliza.');return;}goToBot(`mreq_${id}_${$('new-time').value.replace(':','')}`);};
$('ad-filter').onchange=()=>{renderMetrics();renderHistory();};$('period').onchange=renderMetrics;$('search').oninput=renderHistory;$('status-filter').onchange=renderHistory;
$('export').onclick=()=>{
 const safe=value=>{let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 const rows=[['Destino','Data (Brasília)','Status','Horário','Link'],...visibleLogs().map(log=>[log.group,date(log.date),statuses[log.status]||log.status,log.time,log.link||''])];
 const blob=new Blob(['\ufeff'+rows.map(row=>row.map(safe).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=el('a');link.href=url;link.download='historico-divulgacao.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function showDashboard(data,isDemo=false){
 if(data.version!==1||!Array.isArray(data.ads)||!Array.isArray(data.history)||!Array.isArray(data.days)||!Array.isArray(data.requests))throw new Error('Formato de painel inválido');
 state.data=data;state.demo=isDemo;$('welcome').hidden=true;$('dashboard').hidden=false;$('navigation').hidden=false;
 $('greeting').textContent=`OLÁ, ${data.name||'CLIENTE'}`;$('updated').textContent=`Resumo gerado em ${date(data.updated)}`;
 $('ad-filter').replaceChildren(option('all','Todos os anúncios'));for(const ad of data.ads)$('ad-filter').append(option(ad.id,`${ad.title} #${ad.purchase||ad.id}`));
 if(isDemo)notice('Demonstração · dados ilustrativos. Nenhum pedido será enviado.','demo');
 else if(Date.now()-new Date(data.updated).getTime()>86400000)notice('Este resumo tem mais de 24 horas. Toque em ↻ para atualizar pelo bot.','info');
 else if(data.partial)notice('Parte dos anúncios foi incluída neste resumo. Consulte o bot para ver todos.','info');
 else notice('Resumo privado da sua conta. Toque em ↻ para atualizar pelo bot.');
 renderMetrics();renderChart();renderHistory();renderAds();renderSchedules();navigate('overview');
}
function demoData(){
 const now=new Date();const data={version:1,updated:now.toISOString(),name:'Cliente',bot:null,history_total:1875,requests:[{id:12,old:'09:00',new:'11:30',status:'pending',date:now.toISOString()}],days:[],ads:[],history:[],available_times:[]};
 for(let h=0;h<24;h++)for(let m=0;m<60;m+=5)data.available_times.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
 for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);data.days.push({date:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(d),count:[120,172,98,213,156,204,177][6-i]});}
 data.ads=[{id:1,purchase:104,title:'Plano Mensal',status:'active',slots:['09:00','15:30','20:00'],schedules:[{id:1,time:'09:00',editable:true},{id:2,time:'15:30',editable:true},{id:3,time:'20:00',editable:true}],expires:new Date(now.getTime()+14*86400000).toISOString(),metrics:{'7':[700,12],'30':[1840,35],'0':[1840,35]}}];
 for(let i=0;i<8;i++)data.history.push({ad:1,group:['Comunidade de negócios','Vitrine de ofertas','Conexão empreendedora','Oportunidades da região'][i%4],date:new Date(now.getTime()-i*2700000).toISOString(),status:i===3?'failed':'sent',time:'15:30',link:null});
 return data;
}
$('demo').onclick=()=>showDashboard(demoData(),true);
async function boot(){
 state.data=null;state.demo=false;$('dashboard').hidden=true;$('navigation').hidden=true;$('welcome').hidden=true;notice('Carregando seu painel…');
 try{
  if(tg?.initData){tg.ready();tg.expand();tg.setHeaderColor?.('#0d1219');tg.setBackgroundColor?.('#0d1219');}
  const packed=new URLSearchParams(location.hash.slice(1)).get('snapshot');
  if(!packed){notice('Abra pelo seu bot para carregar seus dados privados.','info');$('welcome').hidden=false;return;}
  if(packed.length>20000)throw new Error('Resumo muito grande');
  if(!window.DecompressionStream)throw new Error('Atualize o Telegram para abrir este painel');
  const bytes=Uint8Array.from(atob(packed.replaceAll('-','+').replaceAll('_','/')),char=>char.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  const json=await new Response(stream).text();if(json.length>1000000)throw new Error('Resumo inválido');
  showDashboard(JSON.parse(json));
 }catch(error){notice('Não foi possível abrir este resumo. Envie /start no bot e abra o Mini App novamente. Se persistir, atualize o Telegram.','error');$('welcome').hidden=false;}
}
window.addEventListener('hashchange',boot);
boot();
