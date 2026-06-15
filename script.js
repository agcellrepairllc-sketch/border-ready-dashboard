const VERCEL_BASE = 'https://border-ready-edgar-stripe-webhook.vercel.app';
  const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=31.7619&longitude=-106.485&current=temperature_2m,weathercode,windspeed_10m,precipitation,apparent_temperature&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FChicago';
  const CBP_URL = 'https://bwt.cbp.gov/api/bwtnew';

  let lang = 'en';

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
      updated: 'Updated',
      trafficNote: '* Traffic-based estimate, not official wait time',
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
      updated: 'Actualizado',
      trafficNote: '* Estimado basado en tráfico, no tiempo oficial',
      light: 'Ligero', moderate: 'Moderado', heavy: 'Pesado', severe: 'Severo',
    }
  };

  function t(key) { return T[lang][key] || T['en'][key] || key; }

  function setLang(l) {
    lang = l;
    document.getElementById('btn-en').classList.toggle('active', l === 'en');
    document.getElementById('btn-es').classList.toggle('active', l === 'es');
    function fetchFX() {
  fetch('https://v6.exchangerate-api.com/v6/7b06deec245c4dd4f5f5f147/latest/USD')
    .then(function(r){ return r.json(); })
    .then(function(r){
      var mxn = (r.conversion_rates && r.conversion_rates.MXN) || (r.rates && r.rates.MXN);
      if (!mxn) return;
      var el = document.getElementById('fx-container');
      if (!el) return;
      el.innerHTML = '<div class="fx-card"><div><div class="fx-title">💱 Exchange Rate</div>'
        + '<div class="fx-rates">'
        + '<div class="fx-rate"><div class="fx-label">1 USD</div><div class="fx-value">' + mxn.toFixed(2) + '<span class="fx-unit"> MXN</span></div></div>'
        + '</div></div>'
        + '<div class="fx-source">exchangerate-api.com<br>Updated today</div></div>';
    })
    .catch(function(e){ console.error('FX:', e); });
}
    updateText();
    if (window._sbData) renderSouthbound(window._sbData);
  }

  function updateText() {
    document.getElementById('hero-label').textContent = t('heroLabel');
    document.getElementById('hero-title').textContent = t('heroTitle');
    document.getElementById('hero-sub').textContent = t('heroSub');
    document.getElementById('label-mxusa').textContent = t('labelMxUSA');
    document.getElementById('label-northbound').textContent = t('labelNorthbound');
    document.getElementById('label-usamx').textContent = t('labelUSAMx');
    document.getElementById('label-southbound').textContent = t('labelSouthbound');
  }

  function getWeatherAdvice(temp, wind, rain) {
    let a = '';
    if (temp < 45) a = 'Heavy jacket — cold, especially if waiting outside.';
    else if (temp < 60) a = 'Bring a jacket.';
    else if (temp < 75) a = 'Comfortable — light layers optional.';
    else if (temp < 90) a = 'Light clothes, you will be fine.';
    else a = 'Light clothes, bring water, do not leave pets or phones in a hot car.';
    if (wind > 20) a += ' Windy — will feel cooler.';
    if (rain > 0.05) a += ' Rain detected — bring an umbrella.';
    return a;
  }

  let weatherData = null, bridgeData = null;

  async function fetchAll() {
    try {
      const [wx, br] = await Promise.all([
        fetch(WEATHER_URL).then(r => r.json()),
        fetch(CBP_URL).then(r => r.json()),
      ]);
      const c = wx.current;
      weatherData = {
        temperature: c.temperature_2m,
        feels_like: c.apparent_temperature,
        wind_mph: c.windspeed_10m,
        precipitation: c.precipitation,
        advice: getWeatherAdvice(c.temperature_2m, c.windspeed_10m, c.precipitation)
      };
      bridgeData = Array.isArray(br) ? br.filter(p =>
        String(p.port_number).startsWith('2504') ||
        (p.port_name||'').toLowerCase().includes('el paso') ||
        (p.port_name||'').toLowerCase().includes('ysleta') ||
        (p.port_name||'').toLowerCase().includes('paso del norte') ||
        (p.port_name||'').toLowerCase().includes('stanton') ||
        (p.port_name||'').toLowerCase().includes('americas') ||
        (p.port_name||'').toLowerCase().includes('santa teresa')
      ) : null;
      document.getElementById('update-time').textContent =
        `${t('updated')}: ${new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}`;
      renderWeather();
      renderBridges();
      if (typeof google !== 'undefined') initMaps();
    } catch(e) { console.error(e); }
    fetchSouthbound();
  }

  async function fetchSouthbound() {
    try {
      const sb = await fetch(`${VERCEL_BASE}/api/southbound`).then(r => r.json());
      if (sb.success) {
        window._sbData = sb.routes;
        renderSouthbound(sb.routes);
      }
    } catch(e) { console.error(e); }
  }

  function delayColor(m) {
    if (!m || isNaN(parseInt(m))) return 'time-na';
    const n = parseInt(m);
    if (n <= 15) return 'time-green';
    if (n <= 35) return 'time-yellow';
    return 'time-red';
  }

  function laneDisplay(lane) {
    if (!lane) return null;
    const s = (lane.operational_status||'').toLowerCase();
    if (s.includes('cerrado') || s.includes('closed') || s === 'n/a') return null;
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
      const d = laneDisplay(p.passenger_vehicle_lanes?.ready_lanes);
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
          <div class="lane-cell"><div class="lane-label">${t('general')}</div>
            ${general?`<div class="lane-time ${delayColor(general.delay)}">${general.delay}<span class="lane-unit"> ${t('min')}</span></div><div class="lane-lanes">${general.open} ${t('lanes')}</div>`:`<div class="lane-time time-na">${t('closed2')}</div>`}
          </div>
          <div class="lane-cell"><div class="lane-label">${t('readyLane')}</div>
            ${ready?`<div class="lane-time ${delayColor(ready.delay)}">${ready.delay}<span class="lane-unit"> ${t('min')}</span></div><div class="lane-lanes">${ready.open} ${t('lanes')}</div>`:`<div class="lane-time time-na">${t('closed2')}</div>`}
          </div>
          <div class="lane-cell"><div class="lane-label">${t('sentri')}</div>
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
    const sc = { Light:'sb-light', Moderate:'sb-moderate', Heavy:'sb-heavy', Severe:'sb-severe' };
    const sl = { Light: t('light'), Moderate: t('moderate'), Heavy: t('heavy'), Severe: t('severe') };
    el.innerHTML = routes.map(r => `
      <div class="southbound-card">
        <div><div class="sb-name">${r.name}</div><div class="sb-note">${t('trafficNote')}</div></div>
        <div class="sb-status ${sc[r.status]||'sb-light'}">${sl[r.status]||r.status}</div>
        <div><div class="sb-mins">${r.minutes}<span class="sb-mins-unit"> ${t('min')}</span></div></div>
      </div>`).join('');
  }
window.initMaps = function() {
    if (!document.querySelector('.bridge-card')) {
      setTimeout(initMaps, 500);
      return;
    }
    document.querySelectorAll('.bridge-map').forEach(el => el.remove());
    const BRIDGE_COORDS = {
      'Bridge': { lat: 31.7606, lng: -106.4522 },
      'Stanton': { lat: 31.7456, lng: -106.4831 },
      'Ysleta': { lat: 31.6741, lng: -106.3357 },
    };

    document.querySelectorAll('.bridge-card').forEach(card => {
      const name = card.querySelector('.bridge-name')?.textContent || '';
      const key = Object.keys(BRIDGE_COORDS).find(k => name.includes(k));
      if (!key) return;
      const mapDiv = document.createElement('div');
mapDiv.className = 'bridge-map';
mapDiv.style.cssText = 'height:280px;border-top:1px solid #e2e8ed;';
card.appendChild(mapDiv);
const legend = document.createElement('div');
legend.style.cssText = 'padding:6px 14px;font-size:10px;color:#7a8fa0;display:flex;gap:12px;border-top:1px solid #e2e8ed;flex-wrap:wrap;';
legend.innerHTML = '<span>🟢 Free flow</span><span>🟡 Moderate</span><span>🔴 Heavy</span><span>⬛ Standstill</span>';
card.appendChild(legend);
      const map = new google.maps.Map(mapDiv, {
        center: BRIDGE_COORDS[key],
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
      });
      new google.maps.TrafficLayer().setMap(map);
      new google.maps.Marker({ position: BRIDGE_COORDS[key], map, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#e8354a', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
    });
  }

  updateText();
fetchFX();
fetchAll();
setInterval(fetchAll, 5 * 60 * 1000);
setInterval(fetchFX, 60 * 60 * 1000);
