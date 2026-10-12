'use strict';
/* System of record: three JSON objects (stores, items, trips) + ui prefs, each in localStorage. */
const DATA_VERSION=4,K={v:'shop.version',stores:'shop.stores',items:'shop.items',trips:'shop.trips',ui:'shop.ui'};
const $=s=>document.querySelector(s),uid=()=>Math.random().toString(36).slice(2,10),today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s).trim().toLowerCase().replace(/\s+/g,' ');
/* South St. George Costco counterclockwise walk. kw routes new items (typing, voice, paste); hint is the optional example line. */
const COSTCO_LAYOUT=[
 ['center','Center','Protein shakes, jerky, nuts, register snacks, seasonal, books, gifts, plants, clothing',/\b(protein shakes?|jerky|nuts|trail mix|seasonal|books?|gifts?|plants?|flowers|clothing|shirts?|socks|shoes|gum|candy bars?)\b/i],
 ['electronics','Electronics','TVs, laptops, phones, headphones',/\b(tv|television|laptop|tablet|ipad|phone|headphones|earbuds|camera|printer|ink|monitor|electronics?|charger|cables?|batteries for)\b/i],
 ['home-kitchen','Home & kitchen','Hardware, fans, lights, compressors, bikes, blenders, microwaves, plates, pots, Tupperware',/\b(hardware|tools?|ceiling fans?|fans?|lights?|bulbs|lamps?|air compressors?|bikes?|bicycles?|blenders?|microwaves?|toasters?|silverware|utensils|pots|pans|tupperware|containers|knives|kitchen)\b/i],
 ['bedding-bath','Bedding & bath','Pillows, blankets, floor mats, towels',/\b(pillows?|blankets?|sheets|comforters?|floor mats?|mats?|towels?|bath)\b/i],
 ['outdoor-auto','Outdoor & auto','Camping chairs, motor oil, coolant, batteries, coolers, grills, stud finder',/\b(camping|chairs?|motor oil|oil|coolant|antifreeze|batteries|battery|coolers?|awnings?|grills?|stud finder|tires?|wiper|auto|propane)\b/i],
 ['produce','Produce','Melons, apples, bananas, pineapple, peaches, mandarins, grapes',/\b(melons?|watermelon|cantaloupe|apples?|bananas?|pineapples?|peaches|peach|mandarins?|oranges?|grapes|avocados?|onions?|potatoes|tomatoes|lemons?|limes?|garlic)\b/i],
 ['cold-produce','Cold produce','Salad kits, broccoli, spinach, berries, peppers, corn',/\b(salad|lettuce|broccoli|spinach|strawberr\w*|berries|blueberr\w*|raspberr\w*|peppers?|corn|carrots?|celery|cucumbers?|kale|asparagus|mushrooms?)\b/i],
 ['bakery','Bakery','Muffins, breads, cakes, pizza crust',/\b(muffins?|bread|sourdough|bagels?|croissants?|cakes?|buns|rolls|pies?|pizza crust|cookies)\b/i],
 ['open-air-coolers','Open air coolers','Meat, seafood, Kevin\u2019s meals, kits, block cheese, pickles, sausages, lunch meat',/\b(ground beef|beef|bison|turkey|chicken(?! wings)|steaks?|tri-?tip|pork|seafood|salmon|shrimp|fish|kevin'?s|curr(y|ies)(?! soup)|carnitas|kits?|block cheese|pickles|sausages?|hot dogs|lunch meat|deli|bacon|salsa|hummus)\b/i],
 ['breakfast','Breakfast','',/\b(breakfast(?! sandwich)|pancakes?|waffles?|oatmeal|granola)\b/i],
 ['dairy','Dairy','Eggs, butter, milk, half and half, creamer, cottage cheese, cream',/\b(eggs?|butter|milk|half and half|creamer|cottage cheese|cream|sour cream)\b/i],
 ['household','Household','Ziploc, pet food, toilet paper, paper towels, plates, soap, detergent',/\b(ziploc|bags|cat food|dog food|litter|toilet paper|paper towels?|paper plates|napkins|dish soap|soap|laundry|detergent|trash bags|cleaner|wipes)\b/i],
 ['drinks','Drinks','Soda, White Claw, Modelo, juice, coconut water/milk, Poppi, sparkling ice, Gatorade',/\b(soda|white claw|modelo|beer|wine|juices?|coconut water|coconut milk|poppi|sparkling|water|gatorade|body armor|energy drinks?|lyte|coke|pepsi|drinks?)\b/i],
 ['chips','Chips','Doritos, corn chips, Cheez-Its, chip bags',/\b(chips?|doritos|cheez-?its|pretzels|popcorn|crackers? snack)\b/i],
 ['glass-door-coolers','Glass-door coolers','Cheese sticks, yogurt, tortillas, kombucha, smoothie mixes',/\b(cheese sticks?|string cheese|yogurt|tortillas?|kombucha|smoothie)\b/i],
 ['freezer','Freezer','Everything frozen: patties, burritos, ice cream, pizzas, wings, Uncrustables',/\b(frozen|patties|burritos?|shredded cheese|breakfast sandwich\w*|ice cream|dole whips?|popsicles?|outshine|pizzas?|chicken wings|wings|taquitos|mini tacos|uncrustables|fried rice)\b/i],
 ['coffee-cereal','Coffee & cereal','Coffee, Cocoa Puffs',/\b(coffee|k-?cups|espresso|cereal|cocoa puffs|cheerios)\b/i],
 ['pantry','Pantry','Canned and jarred goods, crackers, syrup, ramen, rice, brownie mix, gummies',/\b(canned|cans?|jar|tomato sauce|tomato paste|paste|beans|olives|crackers|maple syrup|syrup|ramen|chili|soup|sriracha|rooster|sauce|brownie|mix|rice|pasta|flour|sugar|oil|peanut butter|gummy|gummies|fruit snacks|frollies|chocolate almonds|mayo|ketchup|mustard|spices?)\b/i]];
/* seed + migration placement for known items (normalized name -> section id) */
const COSTCO_PLACE={};Object.entries({
 'outdoor-auto':['stud finder','sae 5w-30 motor oil','engine coolant'],
 'center':['gum'],
 'produce':['apples','bananas','peaches','pineapple','mandarin oranges','grapes'],
 'cold-produce':['berries','salad pack','caesar salad packs'],
 'bakery':['sourdough pizza crust','chocolate muffins'],
 'open-air-coolers':['ground beef','pork belly','chicken thighs','tri-tip','lunch meat','jimmy dean sausage','chicken and maple sausage','microwavable bacon','salsa'],
 'dairy':['butter','heavy whipping cream'],
 'household':['ziploc bags','cat food','paper plates'],
 'drinks':['coconut milk','kirkland sparkling ice','kirkland energy drinks','poppi','body armor lyte'],
 'chips':['chip bags','cheez-its'],
 'freezer':['chicken wings','breakfast sandwiches','dole whips','outshine popsicles','uncrustables','frozen hamburger patties','taquitos','mini tacos','fried rice','vanilla ice cream','frozen pizzas'],
 'coffee-cereal':['cocoa puffs'],
 'pantry':['maple syrup','gummy bears','fruit snacks','frollies','chocolate almonds','red rooster sauce','eatiful yellow curry soup packets','mayo','chili','ramen','sticky white rice','ghirardelli brownie mix','canned chicken breast']}).forEach(([k,l])=>l.forEach(n=>COSTCO_PLACE[n]=k));
/* ---------- seed ---------- */
function seed(){
 const SID='costco-desert-color',sec=['Produce','Bakery','Open air coolers','Drinks','Freezer','Dry goods'],sid=n=>n.toLowerCase().replace(/\s+/g,'-');
 const stores=[{id:SID,name:'South St. George Costco (Desert Color)',sections:COSTCO_LAYOUT.map(([id,name,hint])=>({id,name,hint}))}];
 // [name, section, aliases]
 const CAT=[['Apples','Produce'],['Bananas','Produce'],['Berries','Produce'],['Grapes','Produce'],['Salad pack','Produce',['salad']],['Caesar salad packs','Produce'],['Peaches','Produce'],['Pineapple','Produce'],['Mandarin oranges','Produce'],
 ['Sourdough pizza crust','Bakery'],['Chocolate muffins','Bakery'],
 ['Coconut milk','Drinks'],['Kirkland sparkling ice','Drinks'],['Kirkland energy drinks','Drinks'],['Poppi','Drinks'],['Body Armor Lyte','Drinks'],
 ['Chicken wings','Freezer',['sweet chipotle chicken wings','frozen bbq chipotle chicken wings']],['Breakfast sandwiches','Freezer',['frozen breakfast sandwiches']],['Dole Whips','Freezer'],['Outshine popsicles','Freezer'],['Uncrustables','Freezer'],['Frozen hamburger patties','Freezer'],['Taquitos','Freezer'],['Frollies','Freezer'],['Mini tacos','Freezer'],['Fried rice','Freezer'],['Vanilla ice cream','Freezer',['ice cream']],['Frozen pizzas','Freezer'],
 ['Jimmy Dean sausage','Open air coolers'],['Chicken and maple sausage','Open air coolers'],['Ground beef','Open air coolers'],['Pork belly','Open air coolers'],['Chicken thighs','Open air coolers'],['Tri-tip','Open air coolers'],['Lunch meat','Open air coolers'],['Microwavable bacon','Open air coolers'],['Heavy whipping cream','Open air coolers'],['Butter','Open air coolers'],['Salsa','Open air coolers'],
 ['Maple syrup','Dry goods'],['Gummy bears','Dry goods'],['Fruit snacks','Dry goods'],['Red rooster sauce','Dry goods'],['Eatiful yellow curry soup packets','Dry goods'],['Mayo','Dry goods'],['Chili','Dry goods'],['Ramen','Dry goods'],['Cheez-Its','Dry goods'],['Chocolate almonds','Dry goods'],['Cocoa Puffs','Dry goods'],['Chip bags','Dry goods'],['Sticky white rice','Dry goods',['sticky rice']],['Ghirardelli brownie mix','Dry goods'],['Canned chicken breast','Dry goods'],
 ['Cat food','Dry goods'],['Paper plates','Dry goods'],['Ziploc bags','Dry goods'],['Gum','Dry goods'],['Stud finder','Dry goods'],['SAE 5W-30 motor oil','Dry goods'],['Engine coolant','Dry goods']];
 const ord={};const items=CAT.map(([name,s,al])=>{const k=COSTCO_PLACE[norm(name)];if(!k)throw Error('no place '+name);ord[k]=(ord[k]||0);return{id:'i-'+sid(name).replace(/[^a-z0-9-]/g,''),name,aliases:al||[],stores:{[SID]:{section:k,order:ord[k]++}},usualQty:1,turnover:'auto',inStock:null}});
 const find=n=>items.find(i=>norm(i.name)===norm(n)||i.aliases.includes(norm(n)));
 items.find(i=>i.name==='Mayo').turnover='low';
 ['Frollies','Uncrustables','breakfast sandwiches','cat food','gum','Ziploc bags','sticky white rice','chip bags','fruit snacks','lunch meat','fried rice','chicken and maple sausage','ice cream','ground beef','paper plates'].forEach(n=>find(n).inStock='2026-10-12');
 const P={'2026-08-09':'salsa, maple syrup, bananas, fruit snacks, Dole Whips, frozen breakfast sandwiches, stud finder, Outshine popsicles, red rooster sauce, salad, pork belly, apples, peaches, pineapple, grapes, berries, chocolate muffins',
 '2026-08-15':'Uncrustables, sweet chipotle chicken wings, Jimmy Dean sausage, berries, sticky rice, Eatiful yellow curry soup packets, mayo, Caesar salad packs, Kirkland energy drinks, Kirkland sparkling ice, frozen hamburger patties, ground beef, cat food, taquitos, paper plates, Frollies, SAE 5W-30 motor oil, engine coolant, microwavable bacon, chili, Poppi, ramen, Cheez-Its, chocolate almonds, heavy whipping cream, mini tacos, Cocoa Puffs, chicken thighs, butter',
 '2026-09-06':'chip bags, berries, coconut milk, frozen BBQ chipotle chicken wings, Frollies, Kirkland sparkling ice, Body Armor Lyte, lunch meat, gummy bears, sticky white rice, fruit snacks, fried rice, chicken and maple sausage, vanilla ice cream, Uncrustables, frozen pizzas, tri-tip, pineapple, bananas, mandarin oranges, Ghirardelli brownie mix, canned chicken breast',
 '2026-09-25':'Ziploc bags, berries, bananas, apples, breakfast sandwiches, Uncrustables, cat food, gum, Frollies',
 '2026-10-09':'apples, bananas, berries, grapes, coconut milk, sourdough pizza crust, maple syrup, gummy bears, salad pack, chicken wings, Kirkland sparkling ice'};
 const trips=Object.entries(P).map(([date,l])=>({id:'t-'+date,storeId:SID,date,active:false,items:[...new Set(l.split(',').map(n=>{const it=find(n);if(!it)throw Error('seed miss '+n);return it.id}))].map(itemId=>({itemId,qty:1,checkedAt:date+'T12:00:00'}))}));
 trips.push({id:'t-2026-10-12',storeId:SID,date:'2026-10-12',active:true,items:['Apples','Bananas','Berries','Grapes','Salad pack','Sourdough pizza crust','Coconut milk','Kirkland sparkling ice','Chicken wings','Maple syrup','Gummy bears'].map(n=>({itemId:find(n).id,qty:1,checkedAt:null}))});
 return{stores,items,trips,ui:{cur:SID,hide:false,theme:null}};
}
/* keyword map: routes unknown items to a section; uses the Costco layout kw by section id or name, then falls back to the last pantry-like section */
function guessSection(name,st=store()){const has=id=>st.sections.find(s=>s.id===id)||null;
 if(/coconut milk/i.test(name)){const d=has('drinks')||st.sections.find(s=>norm(s.name)==='drinks');if(d)return d.id}
 const pri=/\bfrozen\b/i.test(name)?['freezer']:/paper towels?|toilet paper|paper plates/i.test(name)?['household']:[];
 for(const [id,nm,,re] of [...COSTCO_LAYOUT.filter(x=>pri.includes(x[0])),...COSTCO_LAYOUT])if(pri.includes(id)||re.test(name)){const s=has(id)||st.sections.find(x=>norm(x.name)===norm(nm));if(s)return s.id}
 const d=st.sections.find(s=>['pantry','dry goods'].includes(norm(s.name)));return d?d.id:null}
/* v2 -> v3: add Open air coolers after Bakery and re-section items; trips and checks untouched */
function migrate(d,from){if(from<3){const st=d.stores.find(s=>s.id==='costco-desert-color');if(st){
  let oac=st.sections.find(s=>norm(s.name)==='open air coolers');if(!oac){oac={id:'open-air-coolers',name:'Open air coolers'};const bi=st.sections.findIndex(s=>s.id==='bakery');st.sections.splice(bi>=0?bi+1:st.sections.length,0,oac)}
  const fz=st.sections.find(s=>s.id==='freezer');
  const toOAC=['jimmy dean sausage','chicken and maple sausage','ground beef','pork belly','chicken thighs','tri-tip','lunch meat','microwavable bacon','heavy whipping cream','butter','salsa'];
  const toFZ=['frozen hamburger patties','breakfast sandwiches','vanilla ice cream','dole whips','outshine popsicles','frozen pizzas','chicken wings','taquitos','mini tacos','uncrustables','fried rice'];
  const put=(it,sec)=>{let m=-1;d.items.forEach(i=>{const p=i.stores[st.id];if(p&&p.section===sec)m=Math.max(m,p.order)});it.stores[st.id]={section:sec,order:m+1}};
  d.items.forEach(it=>{const n=norm(it.name);if(toOAC.includes(n)&&(!it.stores[st.id]||it.stores[st.id].section!==oac.id))put(it,oac.id);else if(fz&&toFZ.includes(n)&&(!it.stores[st.id]||it.stores[st.id].section!==fz.id))put(it,fz.id)})}}
 if(from<4){const st=d.stores.find(s=>s.id==='costco-desert-color');if(st){
  const old=st.sections,ids=new Set(COSTCO_LAYOUT.map(x=>x[0]));
  st.sections=COSTCO_LAYOUT.map(([id,name,hint])=>({id,name,hint}));
  const keep=old.filter(o=>!ids.has(o.id)&&!['produce','bakery','open air coolers','drinks','freezer','dry goods'].includes(norm(o.name)));
  const ord={};const put=(it,sec)=>{ord[sec]=(ord[sec]||0);it.stores[st.id]={section:sec,order:ord[sec]++}};
  // known items by table, others by keyword; user-made unlisted sections kept only if still used
  const used=new Set();d.items.slice().sort((a,b)=>((a.stores[st.id]||{}).order||0)-((b.stores[st.id]||{}).order||0)).forEach(it=>{const p=it.stores[st.id];if(!p)return;
   const k=COSTCO_PLACE[norm(it.name)];if(k)return put(it,k);
   if(keep.some(o=>o.id===p.section)){used.add(p.section);return put(it,p.section)}
   if(ids.has(p.section)&&!['produce','bakery','open-air-coolers','drinks','freezer'].includes(p.section))return put(it,p.section);
   const g=guessSection(it.name,st)||'pantry';put(it,g)});
  keep.filter(o=>used.has(o.id)).forEach(o=>st.sections.push(o))}}
 return d}
/* ---------- load / save ---------- */
let DB;
function load(){try{const v=+localStorage.getItem(K.v);if(v>=2&&v<=DATA_VERSION){const d={stores:JSON.parse(localStorage.getItem(K.stores)),items:JSON.parse(localStorage.getItem(K.items)),trips:JSON.parse(localStorage.getItem(K.trips)),ui:JSON.parse(localStorage.getItem(K.ui))||{}};if(d.stores&&d.stores.length&&d.items&&d.trips){if(v<DATA_VERSION){migrate(d,v);save(d)}return d}}}catch(e){}
 const d=seed();save(d);return d}
function save(d=DB){localStorage.setItem(K.v,DATA_VERSION);localStorage.setItem(K.stores,JSON.stringify(d.stores));localStorage.setItem(K.items,JSON.stringify(d.items));localStorage.setItem(K.trips,JSON.stringify(d.trips));localStorage.setItem(K.ui,JSON.stringify(d.ui))}
DB=load();
const expanded=new Set();
const store=()=>DB.stores.find(s=>s.id===DB.ui.cur)||DB.stores[0];
const item=id=>DB.items.find(i=>i.id===id);
const findItem=n=>{const q=norm(n);return DB.items.find(i=>norm(i.name)===q||(i.aliases||[]).includes(q))};
function trip(){const st=store();let t=DB.trips.find(t=>t.active&&t.storeId===st.id);if(!t){t={id:uid(),storeId:st.id,date:today(),active:true,items:[]};DB.trips.push(t)}return t}
function place(it,st=store()){let p=it.stores[st.id];if(!p||!st.sections.some(s=>s.id===p.section)){p=it.stores[st.id]={section:st.sections[0].id,order:nextOrder(st.sections[0].id)}}return p}
function nextOrder(sec,st=store()){let m=-1;DB.items.forEach(i=>{const p=i.stores[st.id];if(p&&p.section===sec)m=Math.max(m,p.order)});return m+1}
/* learning */
function history(it){return DB.trips.filter(t=>!t.active).map(t=>({t,e:t.items.find(x=>x.itemId===it.id)})).filter(x=>x.e)}
function learn(it){const q=history(it).map(x=>x.e.qty).sort((a,b)=>a-b);if(q.length){const m=q.length>>1;it.usualQty=Math.max(1,Math.round(q.length%2?q[m]:(q[m-1]+q[m])/2))}}
function cadence(it){const d=history(it).map(x=>+new Date(x.t.date)).sort((a,b)=>a-b);const gaps=d.slice(1).map((v,i)=>(v-d[i])/864e5);return{count:d.length,avgGap:gaps.length?Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length):null,last:d.length?new Date(d[d.length-1]):null}}
function usualPicks(){const t=trip(),on=new Set(t.items.map(e=>e.itemId)),now=Date.now();
 return DB.items.filter(i=>!on.has(i.id)&&i.turnover!=='low'&&!i.inStock).map(i=>{const c=cadence(i);const due=c.avgGap&&c.last?(now-c.last)/864e5/c.avgGap:0;return{i,c,score:c.count*2+Math.min(due,2)}}).filter(x=>x.c.count>=2).sort((a,b)=>b.score-a.score).slice(0,10)}
/* ---------- theme ---------- */
function theme(){const t=DB.ui.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;$('#themeBtn').textContent=t==='dark'?'☀':'☾';$('#themeBtn').setAttribute('aria-label',t==='dark'?'Switch to light theme':'Switch to dark theme');document.querySelector('meta[name=theme-color]').content=getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-surface-container').trim()}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(!DB.ui.theme)theme()});
/* ---------- undo ---------- */
let undoSnap=null,snackT;const snapshot=()=>JSON.stringify(DB);
function snack(msg,snap){undoSnap=snap;$('#snackMsg').textContent=msg;$('#undoBtn').hidden=!snap;$('#snack').classList.add('on');clearTimeout(snackT);snackT=setTimeout(()=>$('#snack').classList.remove('on'),4000)}
$('#undoBtn').onclick=()=>{if(undoSnap){DB=JSON.parse(undoSnap);undoSnap=null;save();render()}$('#snack').classList.remove('on')};
/* ---------- render ---------- */
function render(){
 const st=store(),t=trip(),rows=t.items.map(e=>({e,it:item(e.itemId)})).filter(x=>x.it);rows.forEach(x=>x.p=place(x.it,st));
 $('#storeName').textContent=st.name;
 const M=rows.length,N=rows.filter(x=>!x.e.checkedAt).length,p=$('#prog');
 p.textContent=M&&N===0?'Done':`${N} of ${M} left`;p.classList.toggle('done',M>0&&N===0);
 const pct=M?Math.round((M-N)/M*100):0;$('#bar i').style.width=pct+'%';$('#bar').setAttribute('aria-valuenow',pct);
 const hb=$('#hideBtn');hb.setAttribute('aria-pressed',!!DB.ui.hide);hb.textContent=DB.ui.hide?'◌ Hidden':'◉ Shown';hb.setAttribute('aria-label',DB.ui.hide?'Checked items hidden. Tap to show':'Checked items shown. Tap to hide');
 const L=$('#list');
 const cards=st.sections.map(sec=>{
  const all=rows.filter(x=>x.p.section===sec.id).sort((a,b)=>a.p.order-b.p.order),un=all.filter(x=>!x.e.checkedAt),ch=all.filter(x=>x.e.checkedAt);
  const open=!DB.ui.hide||expanded.has(sec.id);let h=un.map(row).join('');
  if(ch.length){if(DB.ui.hide)h+=`<button class="tri${open?' open':''}" data-tri="${sec.id}" aria-expanded="${open}"><b>▶</b>${ch.length} checked</button>`;if(open)h+=ch.map(row).join('')}
  if(!all.length)return "";
  return `<section class="card" data-sec="${sec.id}"><div class="chead"><h2>${esc(sec.name)}</h2><span class="n">${un.length} left</span></div>${h}</section>`}).join('');
 L.innerHTML=(M?'':`<div class="empty"><h2>Your list is empty</h2><p>Add what you need at ${esc(st.name)}, or pick from your usuals. Items land in their section in walk order.</p><div class="actions" style="justify-content:center"><button class="btn" data-a="add">Add item</button><button class="btn tonal" data-a="import">Import JSON</button></div></div>`)+cards+(M?`<div class="finish"><button class="btn tonal" data-a="finish">Finish trip</button></div>`:'');
}
const row=({e,it})=>`<div class="row${e.checkedAt?' checked':''}" data-id="${it.id}" role="checkbox" aria-checked="${!!e.checkedAt}" tabindex="0"><span class="cb"><i></i></span><span class="nm">${esc(it.name)}</span>${e.qty>1?`<span class="q">×${e.qty}</span>`:''}<span class="grip" data-grip aria-label="Drag to reorder">⠿</span></div>`;
function toggle(id){const e=trip().items.find(x=>x.itemId===id);if(!e)return;const snap=snapshot();e.checkedAt=e.checkedAt?null:new Date().toISOString();save();render();snack(`${e.checkedAt?'Checked':'Unchecked'} ${item(id).name}`,snap)}
function finishTrip(){const t=trip();if(!t.items.length)return;const snap=snapshot();t.active=false;t.date=t.date||today();
 t.items.forEach(e=>{const it=item(e.itemId);if(it){learn(it);if(e.checkedAt)it.inStock=null}});
 DB.trips.push({id:uid(),storeId:t.storeId,date:today(),active:true,items:[]});expanded.clear();save();render();snack('Trip finished. New empty trip started',snap)}
/* ---------- list interactions ---------- */
const L=$('#list');let press=null,suppress=false;
L.addEventListener('click',e=>{const a=e.target.closest('[data-a]');if(a){({add:openAdd,import:openImport,finish:()=>{if(confirm('Finish this trip and start an empty one?'))finishTrip()}})[a.dataset.a]();return}
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
  if(to!==idx){const st=store(),sec=card.dataset.sec;
   // orders for this store only: dragged rows first in new order, then other items of this section keep relative order
   const rest=DB.items.filter(i=>i.stores[st.id]&&i.stores[st.id].section===sec&&!ids.includes(i.id)).sort((a,b)=>a.stores[st.id].order-b.stores[st.id].order).map(i=>i.id);
   [...ids,...rest].forEach((id,k)=>{item(id).stores[st.id].order=k});save()}
  render()};
 g.addEventListener('pointermove',mv);g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up)}
/* ---------- sheets ---------- */
const sheet=$('#sheet'),scrim=$('#scrim');
function openSheet(html){stopVoice();sheet.onchange=null;sheet.innerHTML='<div class="handle"></div>'+html;scrim.classList.add('on');requestAnimationFrame(()=>sheet.classList.add('on'))}
function closeSheet(){stopVoice();sheet.classList.remove('on');scrim.classList.remove('on')}
scrim.onclick=closeSheet;document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
const chips=sel=>`<div class="chips" role="radiogroup">${store().sections.map(s=>`<button class="chip" data-sec="${s.id}" aria-pressed="${s.id===sel}">${esc(s.name)}</button>`).join('')}</div>`;
const stepper=(id,v)=>`<div class="step"><button data-dec="${id}" aria-label="Less">−</button><output id="${id}">${v}</output><button data-inc="${id}" aria-label="More">+</button></div>`;
sheet.addEventListener('click',e=>{const d=e.target.closest('[data-dec],[data-inc]');if(d){const o=$('#'+(d.dataset.dec||d.dataset.inc));o.textContent=Math.max(1,(+o.textContent)+(d.dataset.dec?-1:1))}
 const c=e.target.closest('[data-sec]');if(c){sheet.querySelectorAll('[data-sec]').forEach(x=>x.setAttribute('aria-pressed',x===c))}});
const selSec=()=>{const c=sheet.querySelector('[data-sec][aria-pressed=true]');return c&&c.dataset.sec};
/* add one item to the active trip; section (optional) writes back to this store only */
function addToTrip(name,qty,sec){const st=store(),t=trip();name=name.trim();if(!name)return null;
 let it=findItem(name);if(!it){it={id:uid(),name,aliases:[],stores:{},usualQty:1,turnover:'auto',inStock:null};DB.items.push(it)}
 const p=it.stores[st.id];if(!sec&&!p)sec=guessSection(name,st);if(sec&&(!p||p.section!==sec))it.stores[st.id]={section:sec,order:nextOrder(sec)};else place(it,st);
 it.inStock=null;const e=t.items.find(x=>x.itemId===it.id);if(e){e.qty=qty||e.qty;e.checkedAt=null}else t.items.push({itemId:it.id,qty:qty||1,checkedAt:null});return it}
const NUM={one:1,a:1,an:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,couple:2};
function parseSpoken(s){return s.split(/,|\band\b|\n/i).map(x=>x.trim()).filter(Boolean).map(x=>{let q=1;const m=x.match(/^(\d+|one|a|an|two|three|four|five|six|seven|eight|nine|ten|couple)\s+(?:of\s+)?(?:(?:bags?|boxes?|packs?|cases?|bottles?)\s+(?:of\s+)?)?(.+)$/i);if(m){q=+m[1]||NUM[m[1].toLowerCase()]||1;x=m[2]}return{name:x.charAt(0).toUpperCase()+x.slice(1),qty:q}})}
function addMany(list){const snap=snapshot();const added=list.map(o=>addToTrip(o.name,o.qty)).filter(Boolean);save();render();closeSheet();snack(`Added ${added.length} item${added.length===1?'':'s'}`,snap)}
let rec=null;function stopVoice(){if(rec){try{rec.stop()}catch(e){}rec=null}}
function openAdd(){const st=store();if(!st.sections.length){openStores();return}
 const picks=usualPicks(),SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 openSheet(`<h3>Add item</h3>${picks.length?`<label class="f">Usual picks</label><div class="picks">${picks.map(x=>`<button class="chip" data-pick="${x.i.id}">${esc(x.i.name)}<small>${x.c.count} trips${x.c.avgGap?` · ~${x.c.avgGap}d`:''}</small></button>`).join('')}</div>`:''}
 <label class="f" for="nm">Name</label><div class="field"><input class="t" id="nm" autocomplete="off" placeholder="e.g. Bananas — or paste a list">${SR?'<button class="mic" id="mic" aria-label="Add by voice">🎤</button>':''}</div><p class="hint" id="hint">${SR?'Say "two bags of apples and bananas". ':''}Paste several lines to add them all.</p><div class="sugg" id="sugg"></div><div id="usual"></div><label class="f">Section</label>${chips(st.sections[0].id)}<label class="f">Quantity</label>${stepper('qty',1)}<div class="actions"><button class="btn text" id="cx">Cancel</button><button class="btn" id="ok">Add</button></div>`);
 const nm=$('#nm');setTimeout(()=>nm.focus(),50);
 const apply=()=>{const it=findItem(nm.value),p=it&&it.stores[st.id],g=p?p.section:(nm.value.trim()&&guessSection(nm.value,st));if(g)sheet.querySelectorAll('[data-sec]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.sec===g));
  $('#usual').innerHTML=it&&it.usualQty>1?`<div class="usual"><span>${it.usualQty} like usual?</span><button class="btn tonal" id="yes">Yes, ${it.usualQty}</button></div>`:'';
  const y=$('#yes');if(y)y.onclick=()=>{$('#qty').textContent=it.usualQty;$('#usual').innerHTML=''}};
 nm.oninput=()=>{const q=norm(nm.value);const list=q?DB.items.filter(i=>(norm(i.name).includes(q)||i.aliases.some(a=>a.includes(q)))&&norm(i.name)!==q).slice(0,5):[];
  $('#sugg').innerHTML=list.map(i=>{const p=i.stores[st.id];return `<button data-s="${esc(i.name)}">${esc(i.name)}<small>${esc(p?(st.sections.find(s=>s.id===p.section)||{}).name||'':'')}</small></button>`}).join('');apply()};
 nm.addEventListener('paste',e=>{const tx=(e.clipboardData||window.clipboardData).getData('text');if(/\n/.test(tx.trim())){e.preventDefault();addMany(parseSpoken(tx))}});
 $('#sugg').onclick=e=>{const b=e.target.closest('[data-s]');if(b){nm.value=b.dataset.s;$('#sugg').innerHTML='';apply()}};
 sheet.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const it=item(b.dataset.pick);nm.value=it.name;apply();if(it.usualQty>1)$('#qty').textContent=1;nm.focus()});
 const mic=$('#mic');if(mic)mic.onclick=()=>{if(rec){stopVoice();mic.classList.remove('on');return}
  rec=new SR();rec.lang='en-US';rec.interimResults=true;rec.onresult=ev=>{const r=[...ev.results].map(x=>x[0].transcript).join(' ');nm.value=r;nm.oninput();
   if(ev.results[ev.results.length-1].isFinal){const list=parseSpoken(r);stopVoice();mic.classList.remove('on');if(list.length>1)addMany(list);else if(list[0]){nm.value=list[0].name;$('#qty').textContent=list[0].qty;nm.oninput()}}};
  rec.onerror=ev=>{$('#hint').textContent='Voice unavailable: '+ev.error;mic.classList.remove('on');rec=null};rec.onend=()=>{mic.classList.remove('on');rec=null};rec.start();mic.classList.add('on')};
 $('#cx').onclick=closeSheet;
 const add=()=>{const name=nm.value.trim();if(!name){nm.focus();return}if(/[\n,]/.test(name)&&parseSpoken(name).length>1)return addMany(parseSpoken(name));
  const snap=snapshot();const it=addToTrip(name,+$('#qty').textContent,selSec());save();render();closeSheet();snack(`Added ${it.name}`,snap)};
 $('#ok').onclick=add;nm.onkeydown=e=>{if(e.key==='Enter')add()}}
function openEdit(id){const st=store(),it=item(id),e=trip().items.find(x=>x.itemId===id);if(!it||!e)return;const p=place(it,st),c=cadence(it);
 openSheet(`<h3>${esc(it.name)}</h3><p class="hint">${c.count?`Bought on ${c.count} trip${c.count>1?'s':''}${c.avgGap?`, about every ${c.avgGap} days`:''}.`:'New item.'}</p><label class="f">Quantity this trip</label>${stepper('qty',e.qty)}<label class="f">Usual quantity</label>${stepper('usu',it.usualQty||1)}<label class="f">Section</label>${chips(p.section)}
 <label class="f">Turnover</label><div class="chips"><button class="chip" data-turn="auto" aria-pressed="${it.turnover!=='low'}">Auto</button><button class="chip" data-turn="low" aria-pressed="${it.turnover==='low'}">Low (don't suggest)</button></div>
 <div class="actions"><button class="btn danger" id="rm">Remove</button><span style="flex:1"></span><button class="btn text" id="cx">Cancel</button><button class="btn" id="ok">Save</button></div>`);
 sheet.querySelectorAll('[data-turn]').forEach(b=>b.onclick=()=>sheet.querySelectorAll('[data-turn]').forEach(x=>x.setAttribute('aria-pressed',x===b)));
 $('#cx').onclick=closeSheet;
 $('#rm').onclick=()=>{const snap=snapshot(),t=trip();t.items=t.items.filter(x=>x.itemId!==id);save();render();closeSheet();snack(`Removed ${it.name}`,snap)};
 $('#ok').onclick=()=>{const sec=selSec();e.qty=+$('#qty').textContent;it.usualQty=+$('#usu').textContent;it.turnover=sheet.querySelector('[data-turn][aria-pressed=true]').dataset.turn;if(sec!==p.section)it.stores[st.id]={section:sec,order:nextOrder(sec)};save();render();closeSheet()}}
function openStores(){const st=store();
 openSheet(`<h3>Stores</h3><div class="menu">${DB.stores.map(s=>`<button data-store="${s.id}" aria-current="${s.id===st.id}">${esc(s.name)}</button>`).join('')}<button id="newStore">＋ Add store</button></div><hr>
 <label class="f" for="sn">Store name</label><input class="t" id="sn" value="${esc(st.name)}">
 <label class="f">Sections in walk order</label><div id="secs">${st.sections.map((s,i)=>`<div class="secrow"><input class="t" value="${esc(s.name)}" data-rn="${s.id}" aria-label="Section name" title="${esc(s.hint||'')}"><button class="mini" data-up="${i}" aria-label="Move up">↑</button><button class="mini" data-dn="${i}" aria-label="Move down">↓</button><button class="mini" data-del="${i}" aria-label="Delete section">✕</button></div>`).join('')}</div>
 <div class="actions" style="justify-content:flex-start"><button class="btn tonal" id="addSec">＋ Section</button></div><hr>
 <div class="actions" style="justify-content:flex-start;margin-top:0"><button class="btn tonal" id="imp">Import / Export JSON</button><button class="btn tonal" id="fin">Finish trip</button><button class="btn tonal" id="clr">Clear checked</button>${DB.stores.length>1?'<button class="btn danger" id="delStore">Delete store</button>':''}</div>
 <div class="actions"><button class="btn" id="done">Done</button></div>`);
 const commit=()=>{if(!$('#sn'))return;const v=$('#sn').value.trim();if(v)st.name=v;sheet.querySelectorAll('[data-rn]').forEach(x=>{const s=st.sections.find(z=>z.id===x.dataset.rn);if(s&&x.value.trim())s.name=x.value.trim()});save();render()};
 sheet.onchange=commit;
 sheet.querySelector('.menu').onclick=e=>{const b=e.target.closest('[data-store]');if(b){commit();DB.ui.cur=b.dataset.store;expanded.clear();save();render();openStores()}};
 $('#newStore').onclick=()=>{commit();const id=uid();DB.stores.push({id,name:'New store',sections:[{id:uid(),name:'Produce'}]});DB.ui.cur=id;save();render();openStores();setTimeout(()=>{$('#sn').focus();$('#sn').select()},60)};
 $('#secs').onclick=e=>{const b=e.target.closest('[data-up],[data-dn],[data-del]');if(!b)return;commit();const s=st.sections;
  if(b.dataset.up){const i=+b.dataset.up;if(i>0)[s[i-1],s[i]]=[s[i],s[i-1]]}
  if(b.dataset.dn){const i=+b.dataset.dn;if(i<s.length-1)[s[i+1],s[i]]=[s[i],s[i+1]]}
  if(b.dataset.del){const i=+b.dataset.del;if(s.length<2)return alert('A store needs at least one section.');const gone=s[i],tgt=s[i?0:1],moving=DB.items.filter(x=>x.stores[st.id]&&x.stores[st.id].section===gone.id);
   if(moving.length&&!confirm(`Move ${moving.length} item(s) from ${gone.name} to ${tgt.name}?`))return;moving.forEach(x=>x.stores[st.id]={section:tgt.id,order:nextOrder(tgt.id)});s.splice(i,1)}
  save();render();openStores()};
 $('#addSec').onclick=()=>{commit();st.sections.push({id:uid(),name:'New section'});save();render();openStores();const ins=sheet.querySelectorAll('[data-rn]');const l=ins[ins.length-1];l.focus();l.select()};
 $('#imp').onclick=()=>{commit();openImport()};
 $('#fin').onclick=()=>{commit();closeSheet();if(confirm('Finish this trip and start an empty one?'))finishTrip()};
 $('#clr').onclick=()=>{const snap=snapshot(),t=trip();t.items=t.items.filter(x=>!x.checkedAt);save();render();closeSheet();snack('Cleared checked items',snap)};
 const ds=$('#delStore');if(ds)ds.onclick=()=>{if(!confirm(`Delete ${st.name}? Its trips are removed too.`))return;const snap=snapshot();DB.stores=DB.stores.filter(s=>s.id!==st.id);DB.trips=DB.trips.filter(t=>t.storeId!==st.id);DB.items.forEach(i=>delete i.stores[st.id]);DB.ui.cur=DB.stores[0].id;save();render();closeSheet();snack('Store deleted',snap)};
 $('#done').onclick=()=>{commit();closeSheet()}}
function openImport(){
 openSheet(`<h3>Import / Export</h3><p class="hint">Export covers all three objects: stores, items and trips. Importing a full export replaces everything. You can also paste a simple list to add to the active trip: one name per line, a JSON array of names, or <code>{"items":[{"name":"Bananas","section":"Produce","qty":2}]}</code>.</p>
 <textarea id="ta" placeholder='{"version":2,"stores":[…],"items":[…],"trips":[…]}'></textarea>
 <div class="actions" style="justify-content:flex-start"><button class="btn" id="doImp">Import</button><button class="btn tonal" id="exp">Export</button><button class="btn tonal" id="dl">Download</button><button class="btn tonal" id="file">Load file…</button></div><input type="file" id="fi" accept=".json,.txt,application/json" hidden>
 <div class="actions"><button class="btn text" id="cx">Close</button></div>`);
 const dump=()=>JSON.stringify({version:DATA_VERSION,stores:DB.stores,items:DB.items,trips:DB.trips},null,1);
 $('#cx').onclick=closeSheet;$('#exp').onclick=()=>{$('#ta').value=dump();$('#ta').select();navigator.clipboard&&navigator.clipboard.writeText($('#ta').value).catch(()=>{})};
 $('#dl').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([dump()],{type:'application/json'}));a.download='shopping-list-'+today()+'.json';a.click()};
 $('#file').onclick=()=>$('#fi').click();$('#fi').onchange=async e=>{const f=e.target.files[0];if(f)$('#ta').value=await f.text()};
 $('#doImp').onclick=()=>{const raw=$('#ta').value.trim();if(!raw)return;let d;try{d=JSON.parse(raw)}catch(e){d=null}const snap=snapshot();const st=store();
  if(d&&Array.isArray(d.stores)&&Array.isArray(d.items)&&Array.isArray(d.trips)){DB={stores:d.stores,items:d.items,trips:d.trips,ui:Object.assign(DB.ui,{cur:d.stores[0]&&d.stores[0].id})};save();render();closeSheet();snack('Imported stores, items and trips',snap);return}
  const arr=d?(Array.isArray(d)?d:(d.items||[])):parseSpoken(raw);let n=0;
  arr.forEach(x=>{const o=typeof x==='string'?{name:x}:x;if(!o||!o.name)return;let sec=null;
   if(o.section){let s=st.sections.find(s=>norm(s.name)===norm(o.section));if(!s){s={id:uid(),name:String(o.section)};st.sections.push(s)}sec=s.id}
   const it=addToTrip(String(o.name),Math.max(1,+o.qty||1),sec);if(it){if(o.checked){trip().items.find(e=>e.itemId===it.id).checkedAt=new Date().toISOString()}n++}});
  save();render();closeSheet();snack(`Imported ${n} item${n===1?'':'s'}`,snap)}}
$('#addBtn').onclick=openAdd;$('#storeBtn').onclick=openStores;
$('#hideBtn').onclick=()=>{DB.ui.hide=!DB.ui.hide;expanded.clear();save();render()};
$('#themeBtn').onclick=()=>{DB.ui.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';save();theme()};
theme();render();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
