'use strict';
const KEY='shoplist.v1',$=s=>document.querySelector(s),uid=()=>Math.random().toString(36).slice(2,10);
const HUES=[110,30,200,265,45,340,170,15,230,80];
function defaults(){const id=uid();return{v:1,cur:id,stores:[{id,name:'South St. George Costco',sections:['Produce','Bakery','Drinks','Freezer','Dry goods'].map((n,i)=>({id:uid(),name:n,hue:HUES[i]}))}],items:[],tags:{},trips:[],hide:false,theme:null}}
let S;try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}if(!S||!S.stores||!S.stores.length)S=defaults();
const expanded=new Set();
const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
const store=()=>S.stores.find(s=>s.id===S.cur)||S.stores[0];
const tkey=(n,st=S.cur)=>st+'::'+n.trim().toLowerCase();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mine=()=>S.items.filter(i=>i.storeId===store().id);
function theme(){const t=S.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;$('#themeBtn').textContent=t==='dark'?'☀':'☾';$('#themeBtn').setAttribute('aria-label',t==='dark'?'Switch to light theme':'Switch to dark theme');document.querySelector('meta[name=theme-color]').content=getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-surface-container').trim()}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(!S.theme)theme()});
// undo
let undoSnap=null,snackT;function snapshot(){return JSON.stringify(S)}
function snack(msg,snap){undoSnap=snap;$('#snackMsg').textContent=msg;$('#snack').classList.add('on');clearTimeout(snackT);snackT=setTimeout(()=>$('#snack').classList.remove('on'),4000)}
$('#undoBtn').onclick=()=>{if(undoSnap){S=JSON.parse(undoSnap);undoSnap=null;save();render()}$('#snack').classList.remove('on')};
function render(){
 const st=store(),its=mine(),secIds=new Set(st.sections.map(s=>s.id));
 its.forEach(i=>{if(!secIds.has(i.sectionId))i.sectionId=st.sections[0]&&st.sections[0].id});
 $('#storeName').textContent=st.name;
 const M=its.length,N=its.filter(i=>!i.checked).length,p=$('#prog');
 p.textContent=M&&N===0?'Done':`${N} of ${M} left`;p.classList.toggle('done',M>0&&N===0);
 const pct=M?Math.round((M-N)/M*100):0;$('#bar i').style.width=pct+'%';$('#bar').setAttribute('aria-valuenow',pct);
 const hb=$('#hideBtn');hb.setAttribute('aria-pressed',S.hide);hb.innerHTML=(S.hide?'◌ Hidden':'◉ Shown');hb.setAttribute('aria-label',S.hide?'Checked items hidden. Tap to show':'Checked items shown. Tap to hide');
 const L=$('#list');
 if(!M){L.innerHTML=`<div class="empty"><h2>Your list is empty</h2><p>Add what you need at ${esc(st.name)}. Items land in their section in walk order.</p><div class="actions" style="justify-content:center"><button class="btn" data-a="add">Add item</button><button class="btn tonal" data-a="import">Import JSON</button></div></div>`+st.sections.map(sec=>`<section class="card"><div class="chead"><h2>${esc(sec.name)}</h2><span class="n">0 left</span></div></section>`).join('');return}
 L.innerHTML=st.sections.map(sec=>{
  const all=its.filter(i=>i.sectionId===sec.id).sort((a,b)=>a.order-b.order),un=all.filter(i=>!i.checked),ch=all.filter(i=>i.checked);
  const open=!S.hide||expanded.has(sec.id);
  let rows=un.map(row).join('');
  if(ch.length){if(S.hide)rows+=`<button class="tri${open?' open':''}" data-tri="${sec.id}" aria-expanded="${open}"><b>▶</b>${ch.length} checked</button>`;if(open)rows+=ch.map(row).join('')}
  if(!all.length)rows=`<div class="emptysec">Nothing here yet</div>`;
  return `<section class="card" data-sec="${sec.id}"><div class="chead"><h2>${esc(sec.name)}</h2><span class="n">${un.length} left</span></div>${rows}</section>`}).join('');
}
const row=i=>`<div class="row${i.checked?' checked':''}" data-id="${i.id}" role="checkbox" aria-checked="${i.checked}" tabindex="0"><span class="cb"><i></i></span><span class="nm">${esc(i.name)}</span>${i.qty>1?`<span class="q">×${i.qty}</span>`:''}<span class="grip" data-grip aria-label="Drag to reorder">⠿</span></div>`;
function toggle(id){const it=S.items.find(i=>i.id===id);if(!it)return;const snap=snapshot();it.checked=!it.checked;
 S.trips.push({t:Date.now(),store:it.storeId,name:it.name,qty:it.qty,checked:it.checked});if(S.trips.length>5000)S.trips.splice(0,S.trips.length-5000);
 save();render();snack(`${it.checked?'Checked':'Unchecked'} ${it.name}`,snap)}
// interactions on list
const L=$('#list');let press=null,suppress=false;
L.addEventListener('click',e=>{const a=e.target.closest('[data-a]');if(a){a.dataset.a==='add'?openAdd():openImport();return}
 const t=e.target.closest('[data-tri]');if(t){const id=t.dataset.tri;expanded.has(id)?expanded.delete(id):expanded.add(id);render();return}
 if(suppress){suppress=false;return}const r=e.target.closest('.row');if(r&&!e.target.closest('[data-grip]'))toggle(r.dataset.id)});
L.addEventListener('keydown',e=>{const r=e.target.closest('.row');if(r&&(e.key===' '||e.key==='Enter')){e.preventDefault();toggle(r.dataset.id)}});
L.addEventListener('contextmenu',e=>{if(e.target.closest('.row'))e.preventDefault()});
L.addEventListener('pointerdown',e=>{suppress=false;const r=e.target.closest('.row');if(!r)return;
 if(e.target.closest('[data-grip]'))return startDrag(e,r);
 press={x:e.clientX,y:e.clientY,t:setTimeout(()=>{press=null;suppress=true;navigator.vibrate&&navigator.vibrate(10);openEdit(r.dataset.id)},500)}});
const cancelPress=()=>{if(press){clearTimeout(press.t);press=null}};
L.addEventListener('pointermove',e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>10)cancelPress()});
['pointerup','pointercancel','pointerleave'].forEach(ev=>L.addEventListener(ev,cancelPress));
function startDrag(e,r){e.preventDefault();const card=r.closest('.card'),rows=[...card.querySelectorAll('.row')],idx=rows.indexOf(r),h=r.getBoundingClientRect().height,mids=rows.map(x=>{const b=x.getBoundingClientRect();return b.top+b.height/2}),y0=e.clientY;let to=idx;
 const g=e.target.closest('[data-grip]');g.setPointerCapture(e.pointerId);r.classList.add('drag');navigator.vibrate&&navigator.vibrate(10);
 const mv=ev=>{const dy=ev.clientY-y0;r.style.transform=`translateY(${dy}px)`;const c=mids[idx]+dy;to=mids.filter((m,k)=>k!==idx&&m<c).length;
  rows.forEach((x,k)=>{if(x===r)return;let s=0;if(k>idx&&k<=to)s=-h;if(k<idx&&k>=to)s=h;x.style.transform=s?`translateY(${s}px)`:''})};
 const up=()=>{g.removeEventListener('pointermove',mv);g.removeEventListener('pointerup',up);g.removeEventListener('pointercancel',up);
  const ids=rows.map(x=>x.dataset.id);ids.splice(to,0,ids.splice(idx,1)[0]);
  if(to!==idx){const sec=card.dataset.sec,rest=mine().filter(i=>i.sectionId===sec&&!ids.includes(i.id)).sort((a,b)=>a.order-b.order).map(i=>i.id);
   [...ids,...rest].forEach((id,k)=>{const it=S.items.find(i=>i.id===id);it.order=k;const tg=S.tags[tkey(it.name)];if(tg)tg.order=k});save()}
  render()};
 g.addEventListener('pointermove',mv);g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up)}
// sheets
const sheet=$('#sheet'),scrim=$('#scrim');
function openSheet(html){sheet.innerHTML='<div class="handle"></div>'+html;scrim.classList.add('on');requestAnimationFrame(()=>sheet.classList.add('on'))}
function closeSheet(){sheet.classList.remove('on');scrim.classList.remove('on')}
scrim.onclick=closeSheet;document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
const chips=(sel,name='sec')=>`<div class="chips" role="radiogroup">${store().sections.map(s=>`<button class="chip" data-${name}="${s.id}" aria-pressed="${s.id===sel}">${esc(s.name)}</button>`).join('')}</div>`;
const stepper=(id,v)=>`<div class="step"><button data-dec="${id}" aria-label="Less">−</button><output id="${id}">${v}</output><button data-inc="${id}" aria-label="More">+</button></div>`;
sheet.addEventListener('click',e=>{const d=e.target.closest('[data-dec],[data-inc]');if(d){const o=$('#'+(d.dataset.dec||d.dataset.inc));o.textContent=Math.max(1,(+o.textContent)+(d.dataset.dec?-1:1))}
 const c=e.target.closest('[data-sec]');if(c){sheet.querySelectorAll('[data-sec]').forEach(x=>x.setAttribute('aria-pressed',x===c))}});
const selSec=()=>{const c=sheet.querySelector('[data-sec][aria-pressed=true]');return c&&c.dataset.sec};
function nextOrder(sec){const o=mine().filter(i=>i.sectionId===sec).map(i=>i.order);return o.length?Math.max(...o)+1:0}
function openAdd(){const st=store();if(!st.sections.length){openStores();return}
 openSheet(`<h3>Add item</h3><label class="f" for="nm">Name</label><input class="t" id="nm" autocomplete="off" placeholder="e.g. Bananas"><div class="sugg" id="sugg"></div><div id="usual"></div><label class="f">Section</label>${chips(st.sections[0].id)}<label class="f">Quantity</label>${stepper('qty',1)}<div class="actions"><button class="btn text" id="cx">Cancel</button><button class="btn" id="ok">Add</button></div>`);
 const nm=$('#nm');setTimeout(()=>nm.focus(),50);
 const apply=()=>{const tg=S.tags[tkey(nm.value)];if(tg){sheet.querySelectorAll('[data-sec]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.sec===tg.sectionId))}
  $('#usual').innerHTML=tg&&tg.usual>1?`<div class="usual"><span>${tg.usual} like usual?</span><button class="btn tonal" id="yes">Yes, ${tg.usual}</button></div>`:'';
  const y=$('#yes');if(y)y.onclick=()=>{$('#qty').textContent=tg.usual;$('#usual').innerHTML=''}};
 nm.oninput=()=>{const q=nm.value.trim().toLowerCase();const list=q?Object.entries(S.tags).filter(([k,t])=>k.startsWith(st.id+'::')&&t.name.toLowerCase().includes(q)&&t.name.toLowerCase()!==q).slice(0,5):[];
  $('#sugg').innerHTML=list.map(([k,t])=>`<button data-s="${esc(t.name)}">${esc(t.name)}<small>${esc((st.sections.find(s=>s.id===t.sectionId)||{}).name||'')}</small></button>`).join('');apply()};
 $('#sugg').onclick=e=>{const b=e.target.closest('[data-s]');if(b){nm.value=b.dataset.s;$('#sugg').innerHTML='';apply()}};
 $('#cx').onclick=closeSheet;
 const add=()=>{const name=nm.value.trim();if(!name){nm.focus();return}const sec=selSec(),qty=+$('#qty').textContent,k=tkey(name),tg=S.tags[k]||(S.tags[k]={name,usual:1});
  tg.name=name;const moved=tg.sectionId&&tg.sectionId!==sec;tg.sectionId=sec;const order=(!moved&&tg.order!=null&&!mine().some(i=>i.sectionId===sec&&i.order===tg.order))?tg.order:nextOrder(sec);tg.order=order;
  S.items.push({id:uid(),storeId:st.id,name,sectionId:sec,qty,checked:false,order});save();render();closeSheet()};
 $('#ok').onclick=add;nm.onkeydown=e=>{if(e.key==='Enter')add()}}
function openEdit(id){const it=S.items.find(i=>i.id===id);if(!it)return;const tg=S.tags[tkey(it.name)]||(S.tags[tkey(it.name)]={name:it.name,sectionId:it.sectionId,order:it.order,usual:1});
 openSheet(`<h3>${esc(it.name)}</h3><label class="f">Quantity this trip</label>${stepper('qty',it.qty)}<label class="f">Usual quantity</label>${stepper('usu',tg.usual||1)}<label class="f">Section</label>${chips(it.sectionId)}<div class="actions"><button class="btn danger" id="rm">Remove</button><span style="flex:1"></span><button class="btn text" id="cx">Cancel</button><button class="btn" id="ok">Save</button></div>`);
 $('#cx').onclick=closeSheet;
 $('#rm').onclick=()=>{const snap=snapshot();S.items=S.items.filter(i=>i.id!==id);save();render();closeSheet();snack(`Removed ${it.name}`,snap)};
 $('#ok').onclick=()=>{const sec=selSec();it.qty=+$('#qty').textContent;tg.usual=+$('#usu').textContent;if(sec!==it.sectionId){it.sectionId=sec;it.order=nextOrder(sec)}tg.sectionId=sec;tg.order=it.order;save();render();closeSheet()}}
function openStores(){const st=store();
 openSheet(`<h3>Stores</h3><div class="menu">${S.stores.map(s=>`<button data-store="${s.id}" aria-current="${s.id===st.id}">${esc(s.name)}</button>`).join('')}<button id="newStore">＋ Add store</button></div><hr>
 <label class="f" for="sn">Store name</label><input class="t" id="sn" value="${esc(st.name)}">
 <label class="f">Sections in walk order</label><div id="secs">${st.sections.map((s,i)=>`<div class="secrow" data-i="${i}"><input class="t" value="${esc(s.name)}" data-rn="${s.id}" aria-label="Section name"><button class="mini" data-up="${i}" aria-label="Move up">↑</button><button class="mini" data-dn="${i}" aria-label="Move down">↓</button><button class="mini" data-del="${i}" aria-label="Delete section">✕</button></div>`).join('')}</div>
 <div class="actions" style="justify-content:flex-start"><button class="btn tonal" id="addSec">＋ Section</button></div><hr>
 <div class="actions" style="justify-content:flex-start;margin-top:0"><button class="btn tonal" id="imp">Import / Export JSON</button><button class="btn tonal" id="clr">Clear checked</button>${S.stores.length>1?'<button class="btn danger" id="delStore">Delete store</button>':''}</div>
 <div class="actions"><button class="btn" id="done">Done</button></div>`);
 const commit=()=>{const v=$('#sn').value.trim();if(v)st.name=v;sheet.querySelectorAll('[data-rn]').forEach(x=>{const s=st.sections.find(z=>z.id===x.dataset.rn);if(s&&x.value.trim())s.name=x.value.trim()});save();render()};
 sheet.onchange=commit;
 sheet.querySelector('.menu').onclick=e=>{const b=e.target.closest('[data-store]');if(b){commit();S.cur=b.dataset.store;expanded.clear();save();render();openStores()}};
 $('#newStore').onclick=()=>{commit();const id=uid();S.stores.push({id,name:'New store',sections:[{id:uid(),name:'Produce',hue:HUES[0]}]});S.cur=id;save();render();openStores();setTimeout(()=>{$('#sn').focus();$('#sn').select()},60)};
 $('#secs').onclick=e=>{const b=e.target.closest('[data-up],[data-dn],[data-del]');if(!b)return;commit();const s=st.sections;
  if(b.dataset.up){const i=+b.dataset.up;if(i>0)[s[i-1],s[i]]=[s[i],s[i-1]]}
  if(b.dataset.dn){const i=+b.dataset.dn;if(i<s.length-1)[s[i+1],s[i]]=[s[i],s[i+1]]}
  if(b.dataset.del){const i=+b.dataset.del;if(s.length<2)return alert('A store needs at least one section.');const gone=s[i],n=mine().filter(x=>x.sectionId===gone.id).length;
   if(n&&!confirm(`Move ${n} item(s) from ${gone.name} to ${s[i?0:1].name}?`))return;const tgt=s[i?0:1].id;mine().forEach(x=>{if(x.sectionId===gone.id){x.sectionId=tgt;x.order=nextOrder(tgt)}});Object.values(S.tags).forEach(t=>{if(t.sectionId===gone.id)t.sectionId=tgt});s.splice(i,1)}
  save();render();openStores()};
 $('#addSec').onclick=()=>{commit();const used=new Set(st.sections.map(s=>s.hue));st.sections.push({id:uid(),name:'New section',hue:HUES.find(h=>!used.has(h))??Math.floor(Math.random()*360)});save();render();openStores();const ins=sheet.querySelectorAll('[data-rn]');const l=ins[ins.length-1];l.focus();l.select()};
 $('#imp').onclick=()=>{commit();openImport()};
 $('#clr').onclick=()=>{const snap=snapshot();S.items=S.items.filter(i=>!(i.storeId===st.id&&i.checked));save();render();closeSheet();snack('Cleared checked items',snap)};
 const ds=$('#delStore');if(ds)ds.onclick=()=>{if(!confirm(`Delete ${st.name} and its list?`))return;const snap=snapshot();S.stores=S.stores.filter(s=>s.id!==st.id);S.items=S.items.filter(i=>i.storeId!==st.id);S.cur=S.stores[0].id;save();render();closeSheet();snack('Store deleted',snap)};
 $('#done').onclick=()=>{commit();closeSheet()}}
function openImport(){const st=store();
 const exp=JSON.stringify({store:st.name,sections:st.sections.map(s=>s.name),items:mine().sort((a,b)=>a.order-b.order).map(i=>({name:i.name,section:(st.sections.find(s=>s.id===i.sectionId)||{}).name,qty:i.qty,checked:i.checked}))},null,1);
 openSheet(`<h3>Import / Export</h3><p class="sub" style="padding:0">Paste a list to add it to ${esc(st.name)}. Format: <code>{"items":[{"name":"Bananas","section":"Produce","qty":2}]}</code>. A plain array of names, or one name per line, also works. A full backup (Export all) replaces everything.</p>
 <textarea id="ta" placeholder='{"items":[{"name":"Bananas","section":"Produce"}]}'></textarea>
 <div class="actions" style="justify-content:flex-start"><button class="btn" id="doImp">Import</button><button class="btn tonal" id="expL">Export list</button><button class="btn tonal" id="expA">Export all</button><button class="btn tonal" id="file">Load file…</button></div><input type="file" id="fi" accept=".json,.txt,application/json" hidden>
 <div class="actions"><button class="btn text" id="cx">Close</button></div>`);
 $('#cx').onclick=closeSheet;$('#expL').onclick=()=>{$('#ta').value=exp;$('#ta').select()};$('#expA').onclick=()=>{$('#ta').value=JSON.stringify(S);$('#ta').select()};
 $('#file').onclick=()=>$('#fi').click();$('#fi').onchange=async e=>{const f=e.target.files[0];if(f)$('#ta').value=await f.text()};
 $('#doImp').onclick=()=>{const raw=$('#ta').value.trim();if(!raw)return;let d;try{d=JSON.parse(raw)}catch(e){d=raw.split('\n').map(s=>s.trim()).filter(Boolean)}
  const snap=snapshot();
  if(d&&d.stores&&d.items&&d.v){S=d;save();render();closeSheet();snack('Backup restored',snap);return}
  const arr=Array.isArray(d)?d:(d.items||[]);
  if(d.sections&&Array.isArray(d.sections))d.sections.forEach(n=>{if(!st.sections.some(s=>s.name.toLowerCase()===String(n).toLowerCase()))st.sections.push({id:uid(),name:String(n),hue:HUES[st.sections.length%HUES.length]})});
  let n=0;arr.forEach(x=>{const o=typeof x==='string'?{name:x}:x;if(!o||!o.name)return;const name=String(o.name).trim(),k=tkey(name),tg=S.tags[k];
   let sec=o.section&&st.sections.find(s=>s.name.toLowerCase()===String(o.section).toLowerCase());
   if(!sec&&o.section){sec={id:uid(),name:String(o.section),hue:HUES[st.sections.length%HUES.length]};st.sections.push(sec)}
   const sid=sec?sec.id:(tg&&tg.sectionId)||st.sections[0].id,order=nextOrder(sid);
   S.tags[k]=Object.assign(tg||{usual:1},{name,sectionId:sid,order});S.items.push({id:uid(),storeId:st.id,name,sectionId:sid,qty:Math.max(1,+o.qty||1),checked:!!o.checked,order});n++});
  save();render();closeSheet();snack(`Imported ${n} item${n===1?'':'s'}`,snap)}}
$('#addBtn').onclick=openAdd;$('#storeBtn').onclick=openStores;
$('#hideBtn').onclick=()=>{S.hide=!S.hide;expanded.clear();save();render()};
$('#themeBtn').onclick=()=>{S.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';save();theme()};
theme();render();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
