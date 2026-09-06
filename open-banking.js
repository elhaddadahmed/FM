(function(){
  const FN='open-banking';
  const call=p=>sb.functions.invoke(FN,{body:p}).then(({data,error})=>{if(error)throw error;if(data?.error)throw Error(data.error);return data});
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const close=b=>b?.remove();
  function shell(title,html){const b=document.createElement('div');b.className='modal-bg';b.innerHTML=`<div class="modal" style="max-width:760px;width:min(760px,calc(100vw - 28px));"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;"><h3 style="margin:0">${title}</h3><button class="icon-btn" id="ob-close">×</button></div><div id="ob-body" style="margin-top:14px">${html}</div></div>`;document.body.appendChild(b);b.querySelector('#ob-close').onclick=()=>close(b);b.onclick=e=>{if(e.target===b)close(b)};return b}
  const body=(b,h)=>b.querySelector('#ob-body').innerHTML=h;
  const err=(b,id,e)=>{const x=b.querySelector('#'+id);if(x)x.textContent=e?.message||String(e)};

  async function importTransactions(result,connectionId){
    let n=0;
    const importedByAccount={};
    for(const tx of result.transactions||[]){
      let k=state.data.konten.find(x=>x.openBankingAccountId===tx.account_id);
      if(!k){
        k={id:crypto.randomUUID(),name:tx.account_name||'Bankkonto',typ:'bank',startsaldo:0,openBankingConnectionId:connectionId,openBankingAccountId:tx.account_id,iban:tx.iban||null};
        state.data.konten.push(k);
      }
      if(state.data.buchungen.some(x=>x.bankTransactionId===tx.id))continue;
      const amount=Number(tx.amount), inc=amount>=0;
      const desc=tx.counterparty?`${tx.counterparty}${tx.description?' — '+tx.description:''}`:(tx.description||'Bankbuchung');
      state.data.buchungen.push({id:crypto.randomUUID(),bankTransactionId:tx.id,openBankingAccountId:tx.account_id,kontoId:k.id,datum:tx.booking_date||tx.value_date||new Date().toISOString().slice(0,10),beschreibung:desc,betrag:Math.abs(amount),istEinnahme:inc,istUeberweisung:false,kategorie:guessKategorie(desc,inc)||(inc?allCats(true)[0]?.key:allCats(false)[0]?.key)||'Sonstiges',notiz:`Open Banking · ${tx.currency||'EUR'}`,erstellt:new Date().toISOString()});
      n++;
      importedByAccount[tx.account_id]=(importedByAccount[tx.account_id]||0)+amount;
    }
    await persist();
    return {n,importedByAccount};
  }

  window.openOpenBankingModal=async function(){
    const b=shell('🏦 Bank verbinden',`<div style="color:var(--muted);margin-bottom:12px">Wähle eine Sandbox-Bank. Danach wirst du zur sicheren Enable-Banking-/Bank-Autorisierung weitergeleitet.</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><select id="ob-country" class="input" style="flex:0 0 150px"><option value="DE">🇩🇪 Deutschland</option><option value="AT">🇦🇹 Österreich</option><option value="ES">🇪🇸 Spanien</option><option value="FR">🇫🇷 Frankreich</option><option value="NL">🇳🇱 Niederlande</option></select><input id="ob-search" class="input" placeholder="Bank suchen…" style="flex:1;min-width:180px"></div><div id="ob-banks" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px"><div class="card" style="padding:18px;text-align:center;color:var(--muted)">Banken werden geladen…</div></div><div id="ob-error" style="color:var(--danger,#f8506e);margin-top:12px"></div>`);
    let banks=[];
    const render=()=>{const q=b.querySelector('#ob-search').value.trim().toLowerCase(),el=b.querySelector('#ob-banks'),list=banks.filter(x=>!q||String(x.name).toLowerCase().includes(q)||String(x.bic||'').toLowerCase().includes(q)).sort((x,y)=>String(x.name).localeCompare(String(y.name)));el.innerHTML=list.slice(0,100).map(x=>`<button class="card" data-bank="${esc(x.id)}" style="display:flex;align-items:center;gap:12px;text-align:left;border:1px solid var(--border);cursor:pointer;padding:12px;background:var(--card)">${x.logo?`<img src="${esc(x.logo)}" style="width:38px;height:38px;object-fit:contain;border-radius:8px;background:#fff">`:`<div style="width:38px;height:38px;display:grid;place-items:center;font-size:22px">🏦</div>`}<div style="min-width:0"><div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.name)}</div><div style="font-size:11px;color:var(--muted)">${esc(x.bic||x.country||'')}</div></div></button>`).join('')||`<div class="card" style="padding:18px;color:var(--muted)">Keine Bank gefunden.</div>`;el.querySelectorAll('[data-bank]').forEach(x=>x.onclick=()=>start(banks.find(y=>y.id===x.dataset.bank)))};
    const load=async()=>{try{banks=await call({action:'institutions',country:b.querySelector('#ob-country').value});render()}catch(e){err(b,'ob-error',e)}};
    b.querySelector('#ob-search').oninput=render;b.querySelector('#ob-country').onchange=load;await load();
    async function start(bank){try{body(b,`<div style="padding:28px;text-align:center"><div style="font-size:42px">🏦</div><h3>${esc(bank.name)}</h3><p style="color:var(--muted)">Verbindung wird vorbereitet…</p></div>`);const redirect=`${location.origin}${location.pathname}?openbanking=callback`;const r=await call({action:'create-auth',institution_name:bank.name,country:bank.country||b.querySelector('#ob-country').value,institution_logo:bank.logo||null,redirect});sessionStorage.setItem('fm_ob_pending',JSON.stringify({connection_id:r.connection_id,state:r.state}));location.href=r.url}catch(e){body(b,`<div style="color:var(--danger,#f8506e)"><b>Verbindung konnte nicht gestartet werden.</b><div style="margin-top:8px">${esc(e.message||e)}</div></div>`)}}
  };

  async function callback(){
    const p=new URLSearchParams(location.search);if(p.get('openbanking')!=='callback')return;
    const raw=sessionStorage.getItem('fm_ob_pending');if(!raw)return;
    let pending;try{pending=JSON.parse(raw)}catch{return}
    const code=p.get('code'),stateParam=p.get('state'),oauthError=p.get('error');
    history.replaceState({},document.title,location.origin+location.pathname);
    const b=shell('🏦 Bankverbindung',`<div style="padding:28px;text-align:center"><div style="font-size:42px">⏳</div><h3>Bankverbindung wird geprüft…</h3></div>`);
    if(oauthError){sessionStorage.removeItem('fm_ob_pending');return body(b,`<div style="color:var(--danger,#f8506e)"><b>Bank-Autorisierung abgebrochen.</b><div style="margin-top:8px">${esc(p.get('error_description')||oauthError)}</div></div>`)}
    if(!code)return body(b,`<div style="color:var(--danger,#f8506e)">Kein Autorisierungscode von Enable Banking erhalten.</div>`);
    try{
      const r=await call({action:'complete',connection_id:pending.connection_id,state:stateParam||pending.state,code});
      const accounts=r.accounts||[];if(!accounts.length)throw Error('Die Bank hat keine Konten zurückgegeben.');
      body(b,`<div style="color:var(--muted);margin-bottom:14px">Wähle die Konten aus, die synchronisiert werden sollen.</div><div id="ob-list" style="display:grid;gap:10px">${accounts.map(a=>`<label class="card" style="display:flex;align-items:center;gap:12px;padding:14px;cursor:pointer"><input type="checkbox" data-a="${esc(a.provider_account_id)}" checked><div style="font-size:22px">🏦</div><div><div style="font-weight:700">${esc(a.account_name||'Bankkonto')}</div><div style="font-size:12px;color:var(--muted)">${esc(a.iban||a.provider_account_id)}${a.current_balance!=null?' · '+esc(Number(a.current_balance).toFixed(2))+' '+esc(a.currency||'EUR'):''}</div></div></label>`).join('')}</div><div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="btn btn-primary" id="ob-sync">✓ Konten übernehmen & synchronisieren</button></div><div id="ob-err" style="color:var(--danger,#f8506e);margin-top:10px"></div>`);
      b.querySelector('#ob-sync').onclick=async()=>{const ids=[...b.querySelectorAll('[data-a]:checked')].map(x=>x.dataset.a);if(!ids.length){err(b,'ob-err',new Error('Bitte mindestens ein Konto auswählen.'));return}const btn=b.querySelector('#ob-sync');btn.disabled=true;btn.textContent='⏳ Synchronisiere…';try{const s=await call({action:'sync',connection_id:pending.connection_id,account_ids:ids});const result=await importTransactions(s,pending.connection_id);sessionStorage.removeItem('fm_ob_pending');body(b,`<div style="padding:16px 0;text-align:center"><div style="font-size:46px">✅</div><h3>Synchronisierung abgeschlossen</h3><p style="color:var(--muted)">${result.n} neue Transaktion${result.n===1?'':'en'} importiert.</p><button class="btn btn-primary" id="ob-done">Fertig</button></div>`);b.querySelector('#ob-done').onclick=()=>{close(b);render()}}catch(e){err(b,'ob-err',e);btn.disabled=false;btn.textContent='✓ Erneut synchronisieren'}};
    }catch(e){sessionStorage.removeItem('fm_ob_pending');body(b,`<div style="color:var(--danger,#f8506e)"><b>Bankverbindung konnte nicht abgeschlossen werden.</b><div style="margin-top:8px">${esc(e.message||e)}</div></div>`)}
  }
  function boot(){if(typeof sb==='undefined'||typeof state==='undefined'||!state.authId){setTimeout(boot,500);return}callback()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
