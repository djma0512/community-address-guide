(() => {
  'use strict';
  const DATA_URL = './data/community-data.json';
  const W = 503, H = 571;
  let data = null;
  let selectedBlockedIndex = -1;
  let routeEditing = false;
  let routeDraft = [];
  let originalRoute = [];

  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const sortedBlocks = () => Object.keys(data.blocks || {}).sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));

  async function init() {
    try {
      const response = await fetch(`${DATA_URL}?v=${Date.now()}`, {cache:'no-store'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
      ensureStructure();
      bindTabs(); bindSettings(); bindAddresses(); bindBlocked(); bindRoutes(); bindExport();
      renderAll();
      $('dataStatus').textContent = `已載入 ${Object.keys(data.houses).length} 個門牌、${Object.keys(data.blocks).length} 個區塊、${data.routing.blockedZones.length} 個禁止點。`;
    } catch (error) {
      $('dataStatus').textContent = '資料載入失敗。請確認 data/community-data.json 存在。';
      console.error(error);
    }
  }

  function ensureStructure() {
    data.settings ||= {};
    data.houses ||= {};
    data.blocks ||= {};
    data.blockHouses ||= {};
    data.routing ||= {};
    data.routing.blockedZones ||= [];
    data.routing.routes ||= {car:{}, motorcycle:{}};
    data.routing.routes.car ||= {};
    data.routing.routes.motorcycle ||= {};
    data.routing.arrivals ||= {car:{}, motorcycle:{}};
    data.routing.arrivals.car ||= {};
    data.routing.arrivals.motorcycle ||= {};
    data.routing.entrance ||= {x:238,y:543};
  }

  function bindTabs() {
    document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === btn));
      document.querySelectorAll('.panel').forEach(x => x.classList.toggle('active', x.id === `panel-${btn.dataset.tab}`));
    }));
  }

  function bindSettings() {
    const map = {
      appTitleInput:'appTitle', communityNameInput:'communityName', locationInput:'locationText',
      questionInput:'questionText', transportInput:'transportText', defaultTransportInput:'defaultTransport'
    };
    Object.entries(map).forEach(([id,key]) => $(id).addEventListener('input', e => data.settings[key] = e.target.value));
    $('showTextInput').addEventListener('change', e => data.settings.showTextNavigation = e.target.value === 'true');
  }

  function renderSettings() {
    const s = data.settings;
    $('appTitleInput').value = s.appTitle || '';
    $('communityNameInput').value = s.communityName || '';
    $('locationInput').value = s.locationText || '';
    $('questionInput').value = s.questionText || '';
    $('transportInput').value = s.transportText || '';
    $('defaultTransportInput').value = s.defaultTransport || '汽車';
    $('showTextInput').value = s.showTextNavigation === false ? 'false' : 'true';
  }

  function bindAddresses() {
    $('addAddressBtn').addEventListener('click', () => {
      const nums = Object.keys(data.houses).map(Number).filter(Number.isFinite);
      const next = String((nums.length ? Math.max(...nums) : 0) + 1);
      data.houses[next] = sortedBlocks()[0] || 'A1';
      renderAddresses();
    });
    $('addressTableBody').addEventListener('input', e => {
      const row = e.target.closest('tr'); if (!row) return;
      const oldAddress = row.dataset.address;
      if (e.target.classList.contains('address-number')) {
        const next = e.target.value.replace(/\D/g,'').replace(/^0+(?=\d)/,'');
        if (!next || (next !== oldAddress && data.houses[next])) { e.target.value = oldAddress; return; }
        const block = data.houses[oldAddress]; delete data.houses[oldAddress]; data.houses[next] = block; row.dataset.address = next;
      }
      if (e.target.classList.contains('address-block')) data.houses[row.dataset.address] = e.target.value;
      rebuildBlockHouses(); updateCounts();
    });
    $('addressTableBody').addEventListener('click', e => {
      const btn = e.target.closest('[data-delete-address]'); if (!btn) return;
      delete data.houses[btn.closest('tr').dataset.address]; rebuildBlockHouses(); renderAddresses();
    });
  }

  function renderAddresses() {
    const blocks = sortedBlocks();
    const options = current => blocks.map(b => `<option ${b===current?'selected':''}>${b}</option>`).join('');
    $('addressTableBody').innerHTML = Object.entries(data.houses).sort((a,b)=>Number(a[0])-Number(b[0])).map(([address,block]) => `
      <tr data-address="${address}"><td><input class="address-number" inputmode="numeric" value="${address}"></td><td><select class="address-block">${options(block)}</select></td><td><button class="btn danger" data-delete-address>刪除</button></td></tr>
    `).join('');
    updateCounts();
  }

  function rebuildBlockHouses() {
    const bh = {};
    Object.entries(data.houses).sort((a,b)=>Number(a[0])-Number(b[0])).forEach(([a,b]) => (bh[b] ||= []).push(Number(a)));
    data.blockHouses = bh;
  }
  function updateCounts() { $('addressCount').textContent = `${Object.keys(data.houses).length} 個門牌`; }

  function svgPoint(event, svg) {
    const rect = svg.getBoundingClientRect();
    return {x:Math.round((event.clientX-rect.left)*W/rect.width), y:Math.round((event.clientY-rect.top)*H/rect.height)};
  }

  function bindBlocked() {
    $('blockedSvg').addEventListener('click', e => {
      if (e.target.dataset.blockedIndex !== undefined) {
        selectedBlockedIndex = Number(e.target.dataset.blockedIndex); renderBlocked(); return;
      }
      const p = svgPoint(e, $('blockedSvg'));
      data.routing.blockedZones.push({x:p.x,y:p.y,r:Number($('blockedRadius').value)||17});
      selectedBlockedIndex = data.routing.blockedZones.length-1; renderBlocked();
    });
    $('blockedRadius').addEventListener('input', e => {
      if (selectedBlockedIndex < 0) return;
      data.routing.blockedZones[selectedBlockedIndex].r = Math.max(5,Math.min(50,Number(e.target.value)||17)); renderBlocked();
    });
    $('deleteBlockedBtn').addEventListener('click', () => {
      if (selectedBlockedIndex < 0) return;
      data.routing.blockedZones.splice(selectedBlockedIndex,1); selectedBlockedIndex=-1; renderBlocked();
    });
    $('blockedList').addEventListener('click', e => {
      const row=e.target.closest('[data-blocked-row]'); if (!row) return; selectedBlockedIndex=Number(row.dataset.blockedRow); renderBlocked();
    });
  }

  function renderBlocked() {
    const zones=data.routing.blockedZones;
    $('blockedSvg').innerHTML = zones.map((z,i)=>`<circle data-blocked-index="${i}" cx="${z.x}" cy="${z.y}" r="${z.r}" fill="rgba(220,38,38,.22)" stroke="${i===selectedBlockedIndex?'#7f1d1d':'#dc2626'}" stroke-width="${i===selectedBlockedIndex?4:2}"/>`).join('');
    $('blockedList').innerHTML = zones.map((z,i)=>`<button class="point-row" data-blocked-row="${i}"><span>禁止點 ${i+1}：${z.x}, ${z.y}</span><small>r=${z.r}</small></button>`).join('');
    $('deleteBlockedBtn').disabled=selectedBlockedIndex<0;
    if (selectedBlockedIndex>=0) $('blockedRadius').value=zones[selectedBlockedIndex].r;
  }

  function bindRoutes() {
    $('routeMode').addEventListener('change', renderRoute);
    $('routeBlock').addEventListener('change', renderRoute);
    $('redrawRouteBtn').addEventListener('click', () => {
      originalRoute=clone(currentStoredRoute()); routeDraft=[[data.routing.entrance.x,data.routing.entrance.y]]; routeEditing=true; updateRouteButtons(); renderRoute();
    });
    $('undoRouteBtn').addEventListener('click', () => { if(routeDraft.length>1) routeDraft.pop(); renderRoute(); });
    $('cancelRouteBtn').addEventListener('click', () => { routeEditing=false; routeDraft=[]; renderRoute(); });
    $('saveRouteBtn').addEventListener('click', () => {
      if(routeDraft.length<2) return;
      const mode=$('routeMode').value, block=$('routeBlock').value;
      data.routing.routes[mode][block]=clone(routeDraft);
      data.routing.arrivals[mode][block]=clone(routeDraft.at(-1));
      routeEditing=false; routeDraft=[]; renderRoute();
    });
    $('routeSvg').addEventListener('click', e => {
      if(!routeEditing) return;
      if(e.target.closest('[data-no-route-add]')) return;
      const p=svgPoint(e,$('routeSvg')); routeDraft.push([p.x,p.y]); renderRoute();
    });
  }

  function currentStoredRoute() { return data.routing.routes[$('routeMode').value]?.[$('routeBlock').value] || []; }
  function updateRouteButtons() { $('undoRouteBtn').disabled=!routeEditing||routeDraft.length<=1; $('saveRouteBtn').disabled=!routeEditing||routeDraft.length<2; $('cancelRouteBtn').disabled=!routeEditing; }
  function renderRoute() {
    const mode=$('routeMode').value, block=$('routeBlock').value;
    const points=routeEditing?routeDraft:currentStoredRoute();
    const poly=points.map(p=>p.join(',')).join(' ');
    const circles=points.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${i===0?'#facc15':'#2563eb'}" stroke="white" stroke-width="2"/>`).join('');
    const box=data.blocks[block];
    const rect=box?`<rect x="${box.x*W/100}" y="${box.y*H/100}" width="${box.w*W/100}" height="${box.h*H/100}" fill="rgba(245,158,11,.28)" stroke="#f59e0b" stroke-width="3"/>`:'';
    $('routeSvg').innerHTML=`${rect}<polyline points="${poly}" fill="none" stroke="#2563eb" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
    $('routePointList').innerHTML=points.map((p,i)=>`<div class="point-row"><span>${i===0?'入口':`點 ${i}`}</span><small>${p[0]}, ${p[1]}</small></div>`).join('');
    $('routeStatus').textContent=routeEditing?`正在重新繪製 ${mode==='car'?'汽車':'機車'}前往 ${block} 的路線，目前 ${points.length} 個點。`:`目前顯示 ${mode==='car'?'汽車':'機車'}前往 ${block} 的路線，共 ${points.length} 個點。`;
    updateRouteButtons();
  }

  function bindExport() {
    $('downloadJsonBtn').addEventListener('click', downloadJson);
    $('importJsonInput').addEventListener('change', async e => {
      const file=e.target.files?.[0]; if(!file) return;
      try { const next=JSON.parse(await file.text()); if(!next.blocks||!next.houses||!next.routing) throw new Error(); data=next; ensureStructure(); renderAll(); $('dataStatus').textContent='已匯入新資料，尚未上傳 GitHub。'; }
      catch { alert('這個 JSON 檔案格式不正確。'); }
      e.target.value='';
    });
  }

  function downloadJson() {
    rebuildBlockHouses();
    data.metadata ||= {};
    data.metadata.appVersion='V17';
    data.metadata.updatedAt=new Date().toISOString();
    data.metadata.addressCount=Object.keys(data.houses).length;
    data.metadata.blockCount=Object.keys(data.blocks).length;
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='community-data.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  function renderAll() {
    renderSettings(); rebuildBlockHouses(); renderAddresses(); renderBlocked();
    $('routeBlock').innerHTML=sortedBlocks().map(b=>`<option>${b}</option>`).join(''); renderRoute();
  }

  init();
})();
