import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.NEXTCLASS_CONFIG || {};
const ready = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
let supabase = null;
let mode = 'signin';
let currentUser = null;
const $ = (s) => document.querySelector(s);
const status = (id, message, type='') => { const el=$('#'+id); if(el){el.textContent=message;el.className='status '+type;} };
const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const overlays = ['#auth-overlay','#saved-overlay'];
function openOverlay(id){$(id)?.classList.add('open');}
function closeOverlay(id){$(id)?.classList.remove('open');}
function setAuthMode(next){mode=next;$('#auth-submit').textContent=next==='signin'?'Sign in':'Create account';$('#auth-tab-signin').className='button '+(next==='signin'?'primary':'outline');$('#auth-tab-signup').className='button '+(next==='signup'?'primary':'outline');$('#auth-password').autocomplete=next==='signin'?'current-password':'new-password';status('auth-status','');}
function updateHeader(user){currentUser=user||null;const btn=$('#account-btn');const avatar=$('#user-avatar');if(user){btn.textContent='Sign out';avatar.textContent=(user.email||'NC').slice(0,2).toUpperCase();avatar.title=user.email||'Signed in';}else{btn.textContent='Sign in';avatar.textContent='NC';avatar.title='Teacher workspace';}}
function currentOutput(){const active=document.querySelector('.view.active');if(!active)return null;const output=active.querySelector('.output');if(!output)return null;const key=output.id;const tool=key.replace(/-output$/,'');const names={tk:'Teacher Toolkit',sub:'Sub Plan Wizard',df:'Differentiation',gr:'Gradebook Insight',mf:'Material Finder'};return {key,tool,title:names[tool]||'NextClass resource',content:output.innerText.trim()};}
async function getSession(){if(!supabase)return null;const {data}=await supabase.auth.getSession();return data.session||null;}
async function apiGenerate(tool,inputs){const session=await getSession();if(!session)throw new Error('Please sign in first to use AI generation.');const res=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify({tool,inputs})});const body=await res.json().catch(()=>({error:'The server returned an unreadable response.'}));if(!res.ok)throw new Error(body.error||'AI generation failed.');return body.content;}
function readInputs(tool){const ids={toolkit:['tk-mode','tk-subject','tk-grade','tk-topic','tk-time','tk-count','tk-tiers'],sub:['sub-teacher','sub-date','sub-grade','sub-schedule','sub-topics','sub-routines','sub-emergency'],diff:['df-material','df-grade','df-need','df-language','df-vocab','df-steps','df-sentence','df-extension'],grade:['gr-title','gr-data'],finder:['mf-item','mf-kind','mf-budget','mf-grade']}[tool]||[];const out={};for(const id of ids){const el=document.getElementById(id);if(el)out[id]=el.type==='checkbox'?el.checked:el.value;}return out;}
function markdownToHTML(md){
 const esc=(s)=>escapeHTML(s);const lines=String(md||'').replace(/\r/g,'').split('\n');let html='',list=null,table=false;
 const closeList=()=>{if(list){html+=`</${list}>`;list=null;}};
 const inline=(s)=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');
 for(const raw of lines){const line=raw.trim();if(!line){closeList();continue;}if(/^\|?\s*:?-{3,}/.test(line))continue;
  if(line.startsWith('|')&&line.endsWith('|')){closeList();const cells=line.slice(1,-1).split('|').map(x=>x.trim());if(!table){html+='<table><tbody>';table=true;}html+='<tr>'+cells.map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>';continue;}else if(table){html+='</tbody></table>';table=false;}
  const h=line.match(/^(#{1,3})\s+(.+)$/);if(h){closeList();const level=h[1].length;html+=`<h${level}>${inline(h[2])}</h${level}>`;continue;}
  const li=line.match(/^[-*]\s+(.+)$/);const ol=line.match(/^\d+[.)]\s+(.+)$/);if(li||ol){const next=li?'ul':'ol';if(list!==next){closeList();list=next;html+=`<${list}>`;}html+='<li>'+inline((li||ol)[1])+'</li>';continue;}
  closeList();html+='<p>'+inline(line)+'</p>';
 }
 closeList();if(table)html+='</tbody></table>';return html;
}
async function generateAI(tool){
 const statusIds={toolkit:'tk-status',sub:'sub-status',diff:'df-status',grade:'gr-status',finder:'mf-status'};const outputIds={toolkit:'tk-output',sub:'sub-output',diff:'df-output',grade:'gr-output',finder:'mf-output'};
 const sid=statusIds[tool],oid=outputIds[tool];const btn=document.querySelector('#'+({toolkit:'tk-generate',sub:'sub-generate',diff:'df-generate',grade:'gr-generate',finder:'mf-generate'}[tool]));
 if(!ready||!supabase){status(sid,'Setup needed: configure Supabase in public/config.js and deploy the backend.');openOverlay('#auth-overlay');return;}
 const session=await getSession();if(!session){status(sid,'Sign in to generate an AI-powered resource.');openOverlay('#auth-overlay');return;}
 const inputs=readInputs(tool);if(tool==='toolkit'&&!String(inputs['tk-topic']||'').trim()){status(sid,'Enter a topic or skill first.','error');return;}if(tool==='diff'&&!String(inputs['df-material']||'').trim()){status(sid,'Paste the lesson or directions you want to adapt.','error');return;}if(tool==='grade'&&!String(inputs['gr-data']||'').trim()){status(sid,'Paste a score table first. Remove student names and identifying details.','error');return;}if(tool==='finder'&&!String(inputs['mf-item']||'').trim()){status(sid,'Enter a resource or material to search for.','error');return;}
 const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='✦ Working…';}status(sid,'Creating your draft with AI…');
 try{const content=await apiGenerate(tool,inputs);const out=$('#'+oid);out.innerHTML=markdownToHTML(content);out.dataset.markdown=content;out.dataset.tool=tool;status(sid,'AI draft ready. Review it before using it with students.','success');}
 catch(e){status(sid,e.message||'Could not generate content. Check your setup and try again.','error');}
 finally{if(btn){btn.disabled=false;btn.textContent=old||'Generate';}}
}
async function saveOutput(outputId){if(!supabase||!ready){openOverlay('#auth-overlay');return;}const session=await getSession();if(!session){openOverlay('#auth-overlay');status('auth-status','Sign in to save your work.');return;}const el=$('#'+outputId);const content=(el?.dataset.markdown||el?.innerText||'').trim();if(!content||el?.querySelector('.placeholder')){alert('Generate a resource before saving it.');return;}const tool=el.dataset.tool||outputId.replace('-output','');const title=content.split('\n').find(x=>x.trim())?.replace(/^#+\s*/,'').slice(0,140)||'Saved resource';const {error}=await supabase.from('saved_resources').insert({user_id:session.user.id,title,tool,content});if(error){alert('Could not save this resource: '+error.message);return;}alert('Saved to My saved work.');}
async function loadSaved(){const list=$('#saved-list');if(!supabase||!ready){list.innerHTML='<div class="saved-empty">Configure Supabase before saving resources.</div>';return;}const session=await getSession();if(!session){list.innerHTML='<div class="saved-empty">Sign in to see your saved resources.</div>';return;}list.innerHTML='<div class="saved-empty">Loading your library…</div>';const {data,error}=await supabase.from('saved_resources').select('id,title,tool,content,created_at').order('created_at',{ascending:false}).limit(100);if(error){list.innerHTML='<div class="saved-empty">Could not load saved work. Check your database setup.</div>';status('saved-status',error.message,'error');return;}if(!data.length){list.innerHTML='<div class="saved-empty">No saved resources yet. Generate a draft and choose Save.</div>';return;}list.innerHTML=data.map(r=>`<div class="saved-item"><div><strong>${escapeHTML(r.title)}</strong><p>${escapeHTML(r.tool)} · ${new Date(r.created_at).toLocaleDateString()}</p></div><div class="saved-item-actions"><button class="button outline small" data-open-saved="${r.id}">Open</button><button class="button outline small" data-delete-saved="${r.id}">Delete</button></div></div>`).join('');list.querySelectorAll('[data-open-saved]').forEach(b=>b.addEventListener('click',()=>openSaved(data.find(x=>x.id===b.dataset.openSaved))));list.querySelectorAll('[data-delete-saved]').forEach(b=>b.addEventListener('click',()=>deleteSaved(b.dataset.deleteSaved)));}
function openSaved(item){if(!item)return;const map={toolkit:'tk-output',sub:'sub-output',diff:'df-output',grade:'gr-output',finder:'mf-output'};const id=map[item.tool]||'tk-output';const el=$('#'+id);el.innerHTML=markdownToHTML(item.content);el.dataset.markdown=item.content;el.dataset.tool=item.tool;closeOverlay('#saved-overlay');const view={tk:'toolkit',sub:'sub',df:'diff',gr:'grade',mf:'finder'}[item.tool]||'toolkit';document.querySelector(`[data-view="${view}"]`)?.click();}
async function deleteSaved(id){if(!confirm('Delete this saved resource?'))return;const {error}=await supabase.from('saved_resources').delete().eq('id',id);if(error){status('saved-status',error.message,'error');return;}loadSaved();}
if(ready){supabase=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);supabase.auth.onAuthStateChange((_event,session)=>{updateHeader(session?.user||null);});supabase.auth.getSession().then(({data})=>updateHeader(data.session?.user||null));}else{updateHeader(null);}
$('#account-btn')?.addEventListener('click',async()=>{if(currentUser&&supabase){const {error}=await supabase.auth.signOut();if(error)status('auth-status',error.message,'error');else{updateHeader(null);status('auth-status','Signed out.');}}else{openOverlay('#auth-overlay');}});
$('#auth-close')?.addEventListener('click',()=>closeOverlay('#auth-overlay'));$('#saved-close')?.addEventListener('click',()=>closeOverlay('#saved-overlay'));
$('#auth-tab-signin')?.addEventListener('click',()=>setAuthMode('signin'));$('#auth-tab-signup')?.addEventListener('click',()=>setAuthMode('signup'));
$('#auth-form')?.addEventListener('submit',async(e)=>{e.preventDefault();if(!ready||!supabase){status('auth-status','Setup needed: add your Supabase URL and anon key in public/config.js.','error');return;}const email=$('#auth-email').value.trim(),password=$('#auth-password').value;const submit=$('#auth-submit');submit.disabled=true;status('auth-status',mode==='signin'?'Signing in…':'Creating account…');try{if(mode==='signup'){const {data,error}=await supabase.auth.signUp({email,password});if(error)throw error;if(data.session){updateHeader(data.user);closeOverlay('#auth-overlay');}else status('auth-status','Account created. Check your email for a confirmation link, then sign in.','success');}else{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;updateHeader(data.user);closeOverlay('#auth-overlay');}}catch(err){status('auth-status',err.message||'Authentication failed.','error');}finally{submit.disabled=false;}});
$('#saved-work-btn')?.addEventListener('click',async()=>{if(!currentUser){openOverlay('#auth-overlay');status('auth-status','Sign in to access your saved work.');return;}openOverlay('#saved-overlay');await loadSaved();});
document.querySelectorAll('[data-save-output]').forEach(b=>b.addEventListener('click',()=>saveOutput(b.dataset.saveOutput)));

// PDF text extraction runs in the teacher's browser. The original PDF file is not uploaded
// to NextClass's server; extracted text enters the normal AI request only when Generate is clicked.
const pdfExtractState = { loading: null };
async function extractPdf(inputId, targetId, statusId, buttonId, label) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  const file = input?.files?.[0];
  if (!file) { status(statusId, 'Choose a PDF file first.', 'error'); return; }
  if (!(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
    status(statusId, 'Please choose a PDF file.', 'error'); return;
  }
  if (file.size > 15 * 1024 * 1024) { status(statusId, 'This PDF is larger than 15 MB. Please use a smaller file.', 'error'); return; }
  const target = document.getElementById(targetId);
  const oldLabel = button?.textContent;
  if (button) { button.disabled = true; button.textContent = 'Reading PDF…'; }
  status(statusId, 'Reading PDF text in your browser…');
  try {
    const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data: bytes, useWorkerFetch: true }).promise;
    if (pdf.numPages > 35) { await pdf.destroy(); throw new Error('This PDF has more than 35 pages. Please split it into a shorter document.'); }
    const pageText = [];
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const line = content.items.map(item => item.str || '').join(' ').replace(/[ \t]+/g, ' ').trim();
      if (line) pageText.push(`[Page ${pageNo}]\n${line}`);
    }
    await pdf.destroy();
    const extracted = pageText.join('\n\n');
    if (!extracted.trim()) throw new Error('No selectable text was found. This may be a scanned/image-only PDF; run OCR on it first, then upload the searchable PDF or paste its text.');
    if (extracted.length > 35000) throw new Error('This PDF contains too much text. Please split it into a shorter document (maximum extracted text: 35,000 characters).');
    const existing = target.value.trim();
    target.value = existing ? `${existing}\n\n--- Extracted from ${file.name} ---\n${extracted}` : extracted;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    status(statusId, `Extracted text from ${pageText.length} page(s) of “${file.name}”. Review the text before generating.`, 'success');
  } catch (err) {
    console.error('PDF text extraction failed:', err?.message || err);
    status(statusId, err?.message || 'Could not read this PDF. Try a searchable PDF or paste the text manually.', 'error');
  } finally {
    if (button) { button.disabled = false; button.textContent = oldLabel || 'Extract PDF text'; }
  }
}
function clearPdf(inputId, statusId) {
  const input = document.getElementById(inputId);
  if (input) input.value = '';
  status(statusId, 'Selected PDF removed. Any extracted text remains in the text box until you clear it.');
}
document.getElementById('df-pdf-extract')?.addEventListener('click', () => extractPdf('df-pdf', 'df-material', 'df-status', 'df-pdf-extract', 'lesson'));
document.getElementById('gr-pdf-extract')?.addEventListener('click', () => extractPdf('gr-pdf', 'gr-data', 'gr-status', 'gr-pdf-extract', 'gradebook'));
document.getElementById('df-pdf-clear')?.addEventListener('click', () => clearPdf('df-pdf', 'df-status'));
document.getElementById('gr-pdf-clear')?.addEventListener('click', () => clearPdf('gr-pdf', 'gr-status'));

window.addEventListener('keydown',e=>{if(e.key==='Escape')overlays.forEach(closeOverlay);});
window.NextClassAI={generateAI,apiGenerate};


// Expose safe UI actions for the sidebar navigation. Secrets are never exposed here.
window.NextClassAuth = {
  openAccount() {
    if (currentUser) { alert('Signed in as: ' + (currentUser.email || 'Teacher account') + '. Use Sign Out to end this session.'); }
    else { openOverlay('#auth-overlay'); status('auth-status', 'Sign in or create a teacher account.'); }
  },
  async openSaved() {
    if (!currentUser) { openOverlay('#auth-overlay'); status('auth-status', 'Sign in to access your saved resources.'); return; }
    openOverlay('#saved-overlay'); await loadSaved();
  },
  async signOut() {
    if (!currentUser) { openOverlay('#auth-overlay'); status('auth-status', 'You are not signed in.'); return; }
    const { error } = await supabase.auth.signOut();
    if (error) status('auth-status', error.message, 'error');
    else { updateHeader(null); status('auth-status', 'Signed out.'); }
  }
};
