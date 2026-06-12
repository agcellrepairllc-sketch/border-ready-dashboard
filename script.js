const API_BASE = 'https://border-ready-edgar-stripe-webhook.vercel.app';
  let lang = 'en';
  let unlocked = localStorage.getItem('br_unlocked') === 'true';

  const T = {
    en: {
      heroLabel: 'Live Conditions', heroTitle: 'Know before you cross.',
      heroSub: 'Bridge wait times, weather, and what to wear.',
      labelMxUSA: 'Mexico → USA', labelNorthbound: 'Northbound',
      labelUSAMx: 'USA → Mexico', labelSouthbound: 'Southbound (estimate)',
      feelsLike: 'Feels like', wind: 'Wind', open: 'Open', closed: 'Closed',
      general: 'General', readyLane: 'Ready Lane', sentri: 'SENTRI',
      min: 'min', lanes: 'lanes open', closed2: 'Closed',
      fastestLabel: 'Fastest Bridge Right Now', fastestSub: 'Ready Lane',
      payTitle: 'Unlock Southbound + Full Dashboard',
      paySub: 'Enter your email for free access. No password needed.',
      payCta: 'Get Access',
      feat1: '✓ Southbound traffic', feat2: '✓ All 5 bridges',
      feat3: '✓ No ads', feat4: '✓ Free',
      updated: 'Updated',
      sbLock: '🔒 Unlock to see southbound traffic',
      trafficNote: '* Traffic-based estimate, not official wait time',
      successEmail: '✅ Check your email for your access link!',
      light: 'Light', moderate: 'Moderate', heavy: 'Heavy', severe: 'Severe',
    },
    es: {
      heroLabel: 'Condiciones en Vivo', heroTitle: 'Sabe antes de cruzar.',
      heroSub: 'Tiempos de espera, clima, y qué ponerte.',
      labelMxUSA: 'México → EE.UU.', labelNorthbound: 'Rumbo al norte',
      labelUSAMx: 'EE.UU. → México', labelSouthbound: 'Rumbo al sur (estimado)',
      feelsLike: 'Sensación', wind: 'Viento', open: 'Abierto', closed: 'Cerrado',
      general: 'General', readyLane: 'Ready Lane', sentri: 'SENTRI',
      min: 'min', lanes: 'carriles abiertos', closed2: 'Cerrado',
      fastestLabel: 'Puente más rápido ahora', fastestSub: 'Ready Lane',
      payTitle: 'Accede al sur + tablero completo',
      paySub: 'Ingresa tu correo para acceso gratis. Sin contraseña.',
      payCta: 'Acceder',
      feat1: '✓ Tráfico al sur', feat2: '✓ Los 5 puentes',
      feat3: '✓ Sin anuncios', feat4: '✓ Gratis',
      updated: 'Actualizado',
      sbLock: '🔒 Desbloquea para ver el tráfico al sur',
      trafficNote: '* Estimado basado en tráfico, no tiempo oficial',
      successEmail: '✅ Revisa tu correo para el enlace de acceso.',
      light: 'Ligero', moderate: 'Moderado', heavy: 'Pesado', severe: 'Severo',
    }
  };

  function t(key) { return T[lang][key] || T['en'][key] || key; }

  function setLang(l) {
    lang = l;
    document.getElementById('btn-en').classList.toggle('active', l === 'en');
    document.getElementById('btn-es').classList.toggle('active', l === 'es');
    updateStaticText();
    if (window._sbData) renderSouthbound(window._sbData);
  }

  function updateStaticText() {
    document.getElementById('hero-label').textContent = t('heroLabel');
    document.getElementById('hero-title').textContent = t('heroTitle');
    document.getElementById('hero-sub').textContent = t('heroSub');
    document.getElementById('label-mxusa').textContent = t('labelMxUSA');
    document.getElementById('label-northbound').textContent = t('labelNorthbound');
    document.getElementById('label-usamx').textContent = t('labelUSAMx');
    document.getElementById('label-southbound').textContent = t('labelSouthbound');
    if (document.getElementById('paywall-title')) {
      document.getElementById('paywall-title').textContent = t('payTitle');
      document.getElementById('paywall-sub').textContent = t('paySub');
      document.getElementById('paywall-cta').textContent = t('payCta');
      document.getElementById('feat1').textContent = t('feat1');
      document.getElementById('feat2').textContent = t('feat2');
      document.getElementById('feat3').textContent = t('feat3');
      document.getElementById('feat4').textContent = t('feat4');
    }
    const lockMsg = document.getElementById('sb-lock-msg');
    if (lockMsg) lockMsg.textContent = t('sbLock');
  }

  let weatherData = null, bridgeData = null;

  async function fetchAll() {
    try {
      const [wx, br] = await Promise.all([
        fetch(`${API_BASE}/api/weather`).then(r => r.json()),
        fetch(`${API_BASE}/api/border`).then(r => r.json()),
      ]);
      weatherData = wx.success ? wx : null;
      bridgeData = br.success ? br.ports : null;
      document.getElementById('update-time').textContent =
        `${t('updated')}: ${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}`;
      renderWeather();
      renderBridges();
    } catch(e) { console.error(e); }

    if (unlocked) fetchSouthbound();
  }

  async function fetchSouthbound() {
    try {
      const sb = await fetch(`${API_BASE}/api/southbound`).then(r => r.json());
      if (sb.success) { window._sbData = sb.routes; renderSouthbound(sb.routes); }
    } catch(e) { console.error(e); }
  }

  function delayColor(mins) {
    if (!mins || isNaN(parseInt(mins))) return 'time-na';
    const m = parseInt(mins);
    if (m <= 15) return 'time-green';
    if (m <= 35) return 'time-yellow';
    return 'time-red';
  }

  function laneDisplay(lane) {
    if (!lane) return null;
    const status = (lane.operational_status || '').toLowerCase();
    if (status.includes('cerrado') || status.includes('closed') || status === 'n/a') return null;
    if (lane.delay_minutes === '' && lane.lanes_open === '') return null;
    return { delay: lane.delay_minutes || '—', open: lane.lanes_open || '0' };
  }

  function renderWeather() {
    const el = document.getElementById('weather-container');
    if (!weatherData) { el.innerHTML = `<div class="error-card">Could not load weather.</div>`; return; }
    const { temperature, feels_like, wind_mph, advice } = weatherData;
    el.innerHTML = `<div class="weather-strip">
      <div class="weather-main">
        <div class="weather-temp">${Math.round(temperature)}°F</div>
        <div class="weather-details">
          <div class="weather-feels">${t('feelsLike')} ${Math.round(feels_like)}°F</div>
          <div class="weather-wind">${t('wind')} ${wind_mph} mph</div>
        </div>
      </div>
      <div class="weather-advice">👕 ${advice}</div>
    </div>`;
  }

  function renderBridges() {
    const el = document.getElementById('bridges-container');
    const fe = document.getElementById('fastest-container');
    if (!bridgeData) { el.innerHTML = `<div class="error-card">Could not load wait times.</div>`; fe.innerHTML=''; return; }

    const mainBridges = ['Bridge of the Americas (BOTA)', 'Paso Del Norte (PDN)', 'Stanton DCL', 'Ysleta', 'Santa Teresa Port of Entry'];
    const ports = bridgeData.filter(p => {
      const name = p.crossing_name || '';
      return mainBridges.some(n => name.includes(n.split(' ')[0])) && name !== '';
    });

    let fastest = null, fastestMins = 999;
    ports.forEach(p => {
      const rl = p.passenger_vehicle_lanes?.ready_lanes;
      const d = laneDisplay(rl);
      if (d && d.delay !== '—' && parseInt(d.delay) < fastestMins) {
        fastestMins = parseInt(d.delay);
        fastest = { name: p.crossing_name || p.port_name, mins: d.delay };
      }
    });

    fe.innerHTML = fastest ? `<div class="fastest-banner">
      <div>
        <div class="fastest-label">⚡ ${t('fastestLabel')}</div>
        <div class="fastest-name">${fastest.name}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;">${t('fastestSub')}</div>
      </div>
      <div><div class="fastest-time">${fastest.mins}</div><div class="fastest-unit">${t('min')}</div></div>
    </div>` : '';

    let html = '';
    ports.forEach(p => {
      const name = p.crossing_name || p.port_name;
      const isOpen = (p.port_status||'').toLowerCase().includes('abierto') || (p.port_status||'').toLowerCase().includes('open');
      const pv = p.passenger_vehicle_lanes;
      const ped = p.pedestrian_lanes;
      const general = laneDisplay(pv?.standard_lanes);
      const ready = laneDisplay(pv?.ready_lanes);
      const sentri = laneDisplay(pv?.NEXUS_SENTRI_lanes);
      const construction = p.construction_notice?.trim();

      html += `<div class="bridge-card">
        <div class="bridge-header">
          <div><div class="bridge-name">${name}</div><div class="bridge-hours">${p.hours||''}</div></div>
          <div class="bridge-status ${isOpen?'status-open':'status-closed'}">${isOpen?t('open'):t('closed')}</div>
        </div>
        <div class="lane-grid">
          <div class="lane-cell">
            <div class="lane-label">${t('general')}</div>
            ${general?`<div class="lane-time ${delayColor(general.delay)}">${general.delay}<span class="lane-unit"> ${t('min')}</span></div><div class="lane-lanes">${general.open} ${t('lanes')}</div>`:`<div class="lane-time time-na">${t('closed2')}</div>`}
          </div>
          <div class="lane-cell">
            <div class="lane-label">${t('readyLane')}</div>
            ${ready?`<div class="lane-time ${delayColor(ready.delay)}">${ready.delay}<span class="lane-unit"> ${t('min')}</span></div><div class="lane-lanes">${ready.open} ${t('lanes')}</div>`:`<div class="lane-time time-na">${t('closed2')}</div>`}
          </div>
          <div class="lane-cell">
            <div class="lane-label">${t('sentri')}</div>
            ${sentri?`<div class="lane-time ${delayColor(sentri.delay)}">${sentri.delay}<span class="lane-unit"> ${t('min')}</span></div><div class="lane-lanes">${sentri.open} ${t('lanes')}</div>`:`<div class="lane-time time-na">${t('closed2')}</div>`}
          </div>
        </div>
        ${construction?`<div class="construction-notice">⚠️ ${construction}</div>`:''}
      </div>`;
    });
    el.innerHTML = html || `<div class="error-card">No bridge data found.</div>`;
  }

  function renderSouthbound(routes) {
    const el = document.getElementById('southbound-section');
    const statusClass = { Light:'sb-light', Moderate:'sb-moderate', Heavy:'sb-heavy', Severe:'sb-severe' };
    const statusLabel = { Light: t('light'), Moderate: t('moderate'), Heavy: t('heavy'), Severe: t('severe') };
    let html = routes.map(r => `
      <div class="southbound-card">
        <div>
          <div class="sb-name">${r.name}</div>
          <div class="sb-note">${t('trafficNote')}</div>
        </div>
        <div class="sb-status ${statusClass[r.status]||'sb-light'}">${statusLabel[r.status]||r.status}</div>
        <div><div class="sb-mins">${r.minutes}<span class="sb-mins-unit"> ${t('min')}</span></div></div>
      </div>`).join('');
    el.innerHTML = html;
  }

  function requestAccess() {
    const email = document.getElementById('paywall-email').value.trim();
    if (!email || !email.includes('@')) return;
    const btn = document.getElementById('paywall-cta');
    btn.textContent = '...';
    btn.disabled = true;
    setTimeout(() => {
      localStorage.setItem('br_unlocked', 'true');
      unlocked = true;
      document.getElementById('paywall-section').innerHTML = `
        <div style="text-align:center;padding:20px;">
          <div style="font-size:28px;margin-bottom:8px;">📬</div>
          <div style="font-size:15px;font-weight:700;color:var(--ink);">${t('successEmail')}</div>
        </div>`;
      fetchSouthbound();
    }, 800);
  }

  updateStaticText();
  fetchAll();
  setInterval(fetchAll, 5 * 60 * 1000);