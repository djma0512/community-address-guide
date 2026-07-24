(() => {
  'use strict';

  const DATA_URL = './data/community-data.json';
  const PICKER_ITEM_HEIGHT = 52;
  let mapData = null;
  let selectedMode = '';
  let currentAddress = '';
  let pendingAddress = '';
  let availableAddresses = [];
  let pickerRaf = 0;

  const $ = (id) => document.getElementById(id);
  const addressInput = $('addressInput');
  const transportButtons = [...document.querySelectorAll('.transport-btn')];
  const viewMapBtn = $('viewMapBtn');
  const homeScreen = $('homeScreen');
  const mapScreen = $('mapScreen');
  const backBtn = $('backBtn');
  const addressPill = $('addressPill');
  const modePill = $('modePill');
  const addressPicker = $('addressPicker');
  const addressWheel = $('addressWheel');
  const pickerCancel = $('pickerCancel');
  const pickerDone = $('pickerDone');
  const stepsList = $('stepsList');
  const stepsCard = $('stepsCard');
  const restartBtn = $('restartBtn');
  const mapDimmer = $('mapDimmer');
  const routeLayer = $('routeLayer');
  const routeLine = $('routeLine');
  const routeShadow = $('routeShadow');
  const routeEnd = $('routeEnd');
  const routeStart = $('routeStart');
  const buildingTarget = $('buildingTarget');
  const targetLabel = $('targetLabel');
  const loadingLayer = $('loadingLayer');
  const loadingCard = $('loadingCard');
  const loadingMessage = $('loadingMessage');

  function validateMapData(data) {
    if (!data || !data.blocks || !data.houses || !data.routing) return false;
    return Object.values(data.houses).every(blockCode => Boolean(data.blocks[blockCode]));
  }

  async function loadMapData() {
    try {
      const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!validateMapData(data)) throw new Error('資料結構不完整');
      mapData = data;
      applySettings();
      buildAddressPicker();
      updateButtonState();
      updateAddressPill();
      loadingLayer.classList.add('hidden');
    } catch (error) {
      loadingCard.classList.add('error');
      loadingCard.querySelector('strong').textContent = '導航資料載入失敗';
      loadingMessage.textContent = '請確認 data/community-data.json 已上傳到 GitHub，然後重新整理頁面。';
      console.error(error);
    }
  }

  function applySettings() {
    const settings = mapData.settings || {};
    const title = settings.appTitle || '社區門牌導引';
    document.title = title;
    $('appTitle').textContent = title;
    $('locationText').textContent = settings.locationText || '您目前位於：社區入口';
    $('questionText').textContent = settings.questionText || '您要前往幾號？';
    $('transportText').textContent = settings.transportText || '請選擇交通方式';
    $('communityMapImage').alt = settings.mapAlt || `${settings.communityName || ''}社區配置圖`;
    $('versionBadge').textContent = mapData.metadata?.appVersion || 'V18';
    $('routeTitle').textContent = settings.textNavigationTitle || '文字導航';
    stepsCard.hidden = settings.showTextNavigation === false;
    setSelectedMode(settings.defaultTransport === '機車' ? '機車' : '汽車');
  }

  function normalizedAddress(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.replace(/^0+(?=\d)/, '');
  }

  function getBlockCode(address) {
    return mapData?.houses?.[String(address)] || '';
  }

  function getBlockAddresses(blockCode) {
    if (Array.isArray(mapData?.blockHouses?.[blockCode])) return mapData.blockHouses[blockCode];
    return Object.entries(mapData?.houses || {})
      .filter(([, code]) => code === blockCode)
      .map(([house]) => Number(house))
      .sort((a, b) => a - b);
  }

  function updateAddressPill() {
    addressPill.textContent = currentAddress ? `${currentAddress} 號` : '選擇門牌';
    addressPill.setAttribute('aria-label', currentAddress
      ? `目前為 ${currentAddress} 號，點一下選擇其他門牌`
      : '選擇門牌');
  }

  function buildAddressPicker() {
    availableAddresses = Object.keys(mapData?.houses || {})
      .map(Number).filter(Number.isFinite).sort((a, b) => a - b).map(String);
    addressWheel.innerHTML = availableAddresses.map(address => `
      <button class="picker-item" type="button" role="option" data-address="${address}" aria-selected="false">${address} 號</button>
    `).join('');
    refreshPickerSelection();
  }

  function refreshPickerSelection() {
    [...addressWheel.querySelectorAll('.picker-item')].forEach(item => {
      const selected = item.dataset.address === pendingAddress;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  function setPendingAddress(address, shouldScroll = false, smooth = false) {
    const value = String(address || '');
    const index = availableAddresses.indexOf(value);
    if (index < 0) return;
    pendingAddress = value;
    refreshPickerSelection();
    if (shouldScroll) addressWheel.scrollTo({ top: index * PICKER_ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'auto' });
  }

  function openAddressPicker() {
    const initial = availableAddresses.includes(currentAddress) ? currentAddress : availableAddresses[0];
    setPendingAddress(initial, true, false);
    addressPicker.classList.add('active');
    addressPicker.setAttribute('aria-hidden', 'false');
    document.body.classList.add('picker-open');
  }

  function closeAddressPicker() {
    addressPicker.classList.remove('active');
    addressPicker.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('picker-open');
  }

  function applyPickedAddress() {
    const blockCode = getBlockCode(pendingAddress);
    if (!blockCode) return;
    currentAddress = pendingAddress;
    addressInput.value = currentAddress;
    updateButtonState();
    updateAddressPill();
    renderDestination(currentAddress, blockCode);
    closeAddressPicker();
  }

  function updateButtonState() {
    if (!mapData) return;
    const address = normalizedAddress(addressInput.value);
    const blockCode = address ? getBlockCode(address) : '';
    viewMapBtn.disabled = !(blockCode && selectedMode);
    viewMapBtn.textContent = address ? `查看 ${address} 號位置` : (mapData.settings?.viewButtonText || '查看門牌位置');
  }

  function setSelectedMode(mode) {
    if (!['機車', '汽車'].includes(mode)) return;
    selectedMode = mode;
    transportButtons.forEach(item => item.classList.toggle('selected', item.dataset.mode === mode));
    modePill.textContent = mode;
    modePill.setAttribute('aria-label', `目前為${mode}，點一下切換交通方式`);
    updateButtonState();
  }

  function buildRoute(blockCode) {
    const routeMode = selectedMode === '機車' ? 'motorcycle' : 'car';
    const route = mapData.routing?.routes?.[routeMode]?.[blockCode];
    if (!Array.isArray(route) || route.length < 2) return '';
    return route.map(([x, y]) => `${Number(x).toFixed(0)},${Number(y).toFixed(0)}`).join(' ');
  }

  function defaultRouteText(blockCode, addressList) {
    const modeExplanation = selectedMode === '機車'
      ? '目前使用機車路線，已包含機車可通行小路並避開禁止通行區域。'
      : '目前使用汽車路線，只會沿灰褐色可行車道路並避開禁止通行區域。';
    const sharedText = addressList.length > 1
      ? `橘色區塊包含 ${addressList.join('、')} 號，抵達後請確認實際門戶。`
      : `抵達橘色標示的 ${blockCode} 區塊，即為 ${addressList[0]} 號所在位置。`;
    return ['從黃色入口位置出發，沿地圖上的藍色路線前進。', modeExplanation, sharedText];
  }

  function replaceNavigationTokens(text, blockCode, addressList) {
    const current = currentAddress || String(addressList[0] || '');
    const addresses = addressList.map(number => `${number}號`).join('、');
    return String(text || '')
      .replaceAll('{block}', blockCode)
      .replaceAll('{addresses}', addresses)
      .replaceAll('{address}', current ? `${current}號` : '')
      .replaceAll('{mode}', selectedMode);
  }

  function routeText(blockCode, addressList) {
    const routeMode = selectedMode === '機車' ? 'motorcycle' : 'car';
    const customSteps = mapData.textNavigation?.[blockCode]?.[routeMode];
    if (Array.isArray(customSteps)) {
      const resolved = customSteps
        .map(step => replaceNavigationTokens(step, blockCode, addressList).trim())
        .filter(Boolean);
      if (resolved.length) return resolved;
    }
    return defaultRouteText(blockCode, addressList);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
    }[char]));
  }

  function renderDestination(address, blockCode) {
    const box = mapData.blocks[blockCode];
    if (!box) return;
    const addressList = getBlockAddresses(blockCode);
    const sharedLabel = addressList.length > 1 ? `${addressList.join('／')}號` : `${address}號`;

    mapDimmer.classList.add('active');
    const points = buildRoute(blockCode);
    routeLayer.classList.toggle('active', Boolean(points));
    routeLine.setAttribute('points', points);
    routeShadow.setAttribute('points', points);

    buildingTarget.classList.add('active');
    buildingTarget.style.left = `${box.x}%`;
    buildingTarget.style.top = `${box.y}%`;
    buildingTarget.style.width = `${box.w}%`;
    buildingTarget.style.height = `${box.h}%`;
    targetLabel.textContent = sharedLabel;

    const routeMode = selectedMode === '機車' ? 'motorcycle' : 'car';
    const arrival = mapData.routing?.arrivals?.[routeMode]?.[blockCode];
    if (Array.isArray(arrival)) {
      routeEnd.setAttribute('cx', Number(arrival[0]).toFixed(0));
      routeEnd.setAttribute('cy', Number(arrival[1]).toFixed(0));
    }
    const entrance = mapData.routing?.entrance;
    if (entrance) {
      routeStart.setAttribute('cx', Number(entrance.x).toFixed(0));
      routeStart.setAttribute('cy', Number(entrance.y).toFixed(0));
    }

    modePill.textContent = selectedMode;
    updateAddressPill();
    const steps = routeText(blockCode, addressList);
    stepsList.innerHTML = steps.map((text, index) => `
      <div class="step"><div class="step-number">${index + 1}</div><p>${escapeHtml(text)}</p></div>
    `).join('');
  }

  function resetMapVisuals() {
    mapDimmer.classList.remove('active');
    routeLayer.classList.remove('active');
    routeLine.setAttribute('points', '');
    routeShadow.setAttribute('points', '');
    buildingTarget.classList.remove('active');
  }

  addressInput.addEventListener('input', () => {
    addressInput.value = normalizedAddress(addressInput.value);
    updateButtonState();
  });
  addressInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !viewMapBtn.disabled) viewMapBtn.click();
  });
  transportButtons.forEach(btn => btn.addEventListener('click', () => setSelectedMode(btn.dataset.mode)));
  modePill.addEventListener('click', () => {
    setSelectedMode(selectedMode === '汽車' ? '機車' : '汽車');
    if (currentAddress) {
      const blockCode = getBlockCode(currentAddress);
      if (blockCode) renderDestination(currentAddress, blockCode);
    }
  });
  addressPill.addEventListener('click', openAddressPicker);
  pickerCancel.addEventListener('click', closeAddressPicker);
  pickerDone.addEventListener('click', applyPickedAddress);
  addressPicker.addEventListener('click', event => { if (event.target === addressPicker) closeAddressPicker(); });
  addressWheel.addEventListener('click', event => {
    const item = event.target.closest('.picker-item');
    if (item) setPendingAddress(item.dataset.address, true, true);
  });
  addressWheel.addEventListener('scroll', () => {
    if (pickerRaf) cancelAnimationFrame(pickerRaf);
    pickerRaf = requestAnimationFrame(() => {
      const index = Math.max(0, Math.min(availableAddresses.length - 1, Math.round(addressWheel.scrollTop / PICKER_ITEM_HEIGHT)));
      if (availableAddresses[index]) setPendingAddress(availableAddresses[index], false);
    });
  }, { passive: true });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && addressPicker.classList.contains('active')) closeAddressPicker();
  });
  viewMapBtn.addEventListener('click', () => {
    currentAddress = normalizedAddress(addressInput.value);
    const blockCode = getBlockCode(currentAddress);
    if (!blockCode) return updateButtonState();
    homeScreen.classList.remove('active');
    mapScreen.classList.add('active');
    renderDestination(currentAddress, blockCode);
    window.scrollTo(0, 0);
  });
  backBtn.addEventListener('click', () => {
    mapScreen.classList.remove('active');
    homeScreen.classList.add('active');
    window.scrollTo(0, 0);
  });
  restartBtn.addEventListener('click', () => {
    resetMapVisuals();
    mapScreen.classList.remove('active');
    homeScreen.classList.add('active');
    addressInput.value = '';
    currentAddress = '';
    pendingAddress = '';
    updateButtonState();
    updateAddressPill();
    window.scrollTo(0, 0);
    addressInput.focus();
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.error));
  }
  loadMapData();
})();
