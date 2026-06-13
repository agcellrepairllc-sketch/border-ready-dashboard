var VERCEL_BASE = 'https://border-ready-edgar-stripe-webhook.vercel.app';
var WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=31.7619&longitude=-106.485&current=temperature_2m,weathercode,windspeed_10m,precipitation,apparent_temperature&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FChicago';
var CBP_URL = 'https://bwt.cbp.gov/api/bwtnew';
var lang = 'en';

var T = {
  en: { heroLabel:'Live Conditions', heroTitle:'Know before you cross.', heroSub:'Bridge wait times, weather, and what to wear.', labelMxUSA:'Mexico \u2192 USA', labelNorthbound:'Northbound', labelUSAMx:'USA \u2192 Mexico', labelSouthbound:'Southbound (estimate)', feelsLike:'Feels like', wind:'Wind', open:'Open', closed:'Closed', general:'General', readyLane:'Ready Lane', sentri:'SENTRI', min:'min', lanes:'lanes open', closed2:'Closed', fastestLabel:'Fastest Bridge Right Now', fastestSub:'Ready Lane', updated:'Updated', trafficNote:'* Traffic-based estimate', light:'Light', moderate:'Moderate', heavy:'Heavy', severe:'Severe' },
  es: { heroLabel:'Condiciones en Vivo', heroTitle:'Sabe antes de cruzar.', heroSub:'Tiempos de espera, clima, y qu\u00e9 ponerte.', labelMxUSA:'M\u00e9xico \u2192 EE.UU.', labelNorthbound:'Rumbo al norte', labelUSAMx:'EE.UU. \u2192 M\u00e9xico', labelSouthbound:'Rumbo al sur (estimado)', feelsLike:'Sensaci\u00f3n', wind:'Viento', open;'Abierto', closed:'Cerrado', general:'General', readyLane:'Ready Lane', sentri:'SENTRI', min:'}min', lanes:'carriles abiertos', closed2:'Cerrado', fastestLabel:'Puente m\u00e1s r\u00e1pido ahora', fastestSub:'Ready Lane', updated:'Actualizado', trafficNote:'* Estimado de tr\u00e1fico', light:'Ligero', moderate:'Moderado', heavy:'Pesado', severe:'Severo' }
};

function t(k){ return (T[lang]&&T[lang][k]) || (T.en[k]) || k; }

function setLang(l){
  lang=l;
  document.getElementById('btn-en').classList.toggle('active',l==='en');
  document.getElementById('btn-es').classList.toggle('active',l==='es');
  updateText();
  if(window._sbData) renderSouthbound(window._sbData);
}

function updateText(){
  document.getElementById('hero-label').textContent=t('heroLabel');
  document.getElementById('hero-title').textContent=t('heroTitle');
  document.getElementById('hero-sub').textContent=t('heroSub');
  document.getElementById('label-mxusa').textContent=t('labelMxUSA');
  document.getElementById('label-northbound').textContent=t('labelNorthbound');
  document.getElementById('label-usamx').textContent=t('labelUSAMx');
  document.getElementById('label-southbound').textContent=t('labelSouthbound');
}

function weatherAdvice(temp,wind,rain){
  var a='';
  if(temp<45) a='Heavy jacket \u2014 cold.';
  else if(temp<60) a='Bring a jacket.';
  else if(temp<75) a='Comfortable \u2014 light layers optional.';
  else if(temp<90) a='Light clothes, you are fine.';
  else a='Light clothes, bring water. Do not leave phones in hot car!';
  if(wind>20) a+=' Windy.';
  if(rain>0.05) a+=' Rain \u2014 bring umbrella.';
  return a;
}

var weatherData=null, bridgeData=null;

function fetchFX(){
  fetch('https://v6.exchangerate-api.com/v6/7b06deec245c4dd4f5f5f147/latest/USD')
    .then(function(r){return r.json();})
    .then(function(r){
      var mxn=(r.conversion_rates&&r.conversion_rates.MXN)||(r.rates&&r.rates.MXN);
      if(!mxn) return;
      var el=document.getElementById('fx-container');
      el.innerHTML='<div class="fx-card"><div><div class="fx-title">\ud83d\udcb1 '
        +(lang==='es'?'Tipo de Cambio':'Exchange Rate')+'</div>'
        +'<div class="fx-rates">'
        +'<div class="fx-rate"><div class="fx-label">1 USD</div><div class="fx-value">'+mxn.toFixed(2)+'<span class="fx-unit"> MXN</span></div></div>'
        +'<div class="fx-rate"><div class="fx-label">1 MXL</div><div class="fx-value">'+(1/mxn).toFixed(4)+'<span class="fx-unit"> USD</span></div></div>'
        +'</div></div>'
        +'<div class="fx-source">exchangerate-api.com<br>'+(lang==='es'?'Actualizado hoy':'Updated today')+'</div></div>';
    })
    .catch(function(e){console.error('FX:',e);});
}

function fetchAll(){
  Promise.all([
    fetch(WEATHER_URL).then(function(r){return r.json();}),
    fetch(CBP_URL).then(function(r){return r.json();})
  ]).then(function(results){
    var wx=results[0], br=results[1];
    var c=wx.current;
    weatherData={ temperature:c.temperature_2m, feels_like:c.apparent_temperature, wind_mph:c.windspeed_10m, precipitation:c.precipitation, advice:weatherAdvice(c.temperature_2m,c.windspeed_10m,c.precipitation) };
    bridgeData=Array.isArray(br)?br.filter(function(p){
      return String(p.port_number).startsWith('2504')
        ||(p.port_name||'').toLowerCase().includes('el paso')
        ||(p.port_name||'').toLowerCase().includes('ysleta')
        ||(p.port_name||'').toLowerCase().includes('paso del norte')
        ||(p.port_name||'').toLowerCase().includes('stanton')
        ||(p.port_name||'').toLowerCase().includes('americas')
        ||(p.port_name||'').toLowerCase().includes('santa teresa');
    }):null;
    document.getElementById('update-time').textContent=t('updated')+': '+new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    renderWeather();
    renderBridges();
  }).catch(function(e){console.error(e);});
  fetchSouthbound();
}

function fetchSouthbound(){
  fetch(VERCEL_BASE+'/api/southbound')
    .then(function(r){return r.json();})
    .then(function(sb){
      if(sb.success){window._sbData=sb.routes;renderSouthbound(sb.routes);}
    })
    .catch(function(e){console.error('SB:',e);});
}

function delayColor(m){
  if(!m||isNaN(parseInt(m))) return 'time-na';
  var n=parseInt(m);
  if(n<=15) return 'time-green';
  if(n<=35) return 'time-yellow';
  return 'time-red';
}

function laneDisplay(lane){
  if(!lane) return null;
  var s=(lane.operational_status||'').toLowerCase();
  if(s.includes('cerrado')||s.includes('closed')||s==='n/a') return null;
  if(lane.delay_minutes===''&&lane.lanes_open==='') return null;
  return {delay:lane.delay_minutes||'\u2014',open:lane.lanes_open||'0'};
}

function renderWeather(){
  var el=document.getElementById('weather-container');
  if(!var d=weatherData){el.innerHTML='<div class="error-card">Could not load weather.</div>';return;}
  var d=weatherData;
  el.innerHTML='<div class="weather-strip">'
    +'<div class="weather-main">'
    +'<div class="weather-temp">'
    +Math.round(d.temperature)+'\u00b0F</div>'
    +'<div class="weather-details">'
    +'<div class="weather-feels">'
+t('feelsLike')+' '+Math.round(d.feels_like)+'\u00b0F</div>'
    +'<div class="weather-wind">'+t('wind')+' '+d.wind_mph+' mph</div>'
    +'</div></div>'
    +'<div class="weather-advice">\ud83d\udc55 '+d.advice+'</div>'
    +'</div>';
}

function renderBridges(){
  var el=document.getElementById('bridges-container');
  var fe=document.getElementById('fastest-container');
  if(!bridgeData){el.innerHTML='<div class="error-card">Could not load wait times.</div>';fe.innerHTML='';return;}
  var keys=['Bridge','Paso','Stanton','Ysleta','Santa'];
  var ports=bridgeData.filter(function(p){
    var name=p.crossing_name||'';
    return keys.some(function(k){return name.includes(k);})&&name!=='';
  });
  var fastest=null,fastestMins=999;
  ports.forEach(function(p){
    var d=laneDisplay(p.passenger_vehicle_lanes&&p.passenger_vehicle_lanes.ready_lanes);
    if(d&&d.delay!=='\u2014'&&parseInt(d.delay)<fastestMins){
      fastestMins=parseInt(d.delay);
      fastest={name:p.crossing_name||p.port_name,mins:d.delay};
    }
  });
  fe.innerHTML=fastest?'<div class="fastest-banner">'
    +'<div><div class="fastest-label">\u2b50 '+t('fastestLabel')+'</div>'
    +'<div class="fastest-name">'+fastest.name+'</div>'
    +'<div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;">'+t('fastestSub')+'</div></div>'
    +'<div><div class="fastest-time">'+fastest.mins+'</div><div class="fastest-unit">'+t('min')+'</div></div>'
    +'</div>':'';
  var html='';
  ports.forEach(function(p){
    var name=p.crossing_name||p.port_name;
    var isOpen=(p.port_status||'').toLowerCase().includes('abierto')||(p.port_status||'').toLowerCase().includes('open');
    var pv=p.passenger_vehicle_lanes||{};
    var gen=laneDisplay(pv.standard_lanes);
    var rdy=laneDisplay(pv.ready_lanes);
    var sen=laneDisplay(pv.NEXUS_SENTRI_lanes);
    var con=p.construction_notice?p.construction_notice.trim():'';
    html+='<div class="bridge-card">'
      +'<div class="bridge-header">'
      +'<div><div class="bridge-name">'+name+'</div><div class="bridge-hours">'+(p.hours||'')+'</div></div>'
      +'<div class="bridge-status '+(isOpen?'status-open':'status-closed')+'">'+(isOpen?t('open'):t('closed'))+'</div>'
      +'</div>'
      +'<div class="lane-grid">'
      +'<div class="lane-cell"><div class="lane-label">'+t('general')+'</div>'
      +(gen?'<div class="lane-time '+delayColor(gen.delay)+'">'+gen.delay+'<span class="lane-unit"> '+t('min')+'</span></div><div class="lane-lanes">'+gen.open+' '+t('lanes')+'</div>'
                                                    :'<div class="lane-time time-na">'+t('closed2')+'</div>')+'</div>'
      +'<div class="lane-cell"><div class="lane-label">'+t('readyLane')+'</div>'
      +(rdy?'<div class="lane-time '+delayColor(rdy.delay)+'">'+rdy.delay+'<span class="lane-unit"> '+t('min')+'</span></div><div class="lane-lanes">'+rdy.open+' '+t('lanes')+'</div>'
                                                    :'<div class="lane-time time-na">'+t('closed2')+'</div>')+'</div>'
      +'<div class="lane-cell"><div class="lane-label">'+t('sentri')+'</div>'
      +(sen?'<div class="lane-time '+delayColor(sen.delay)+'">'+sen.delay+'<span class="lane-unit"> '+t('min')+'</span></div><div class="lane-lanes">'+sen.open+' '+t('lanes')+'</div>'
                                                    :'<div class="lane-time time-na">'+t('closed2')+'</div>')+'</div>'
      +'</div>'
      +(con?'<div class="construction-notice">\u26a0\ufe0f '+con+'</div>':'')
      +'</div>';
  });
  el.innerHTML=html||'<div class="error-card">No bridge data found.</div>';
}

function renderSouthbound(routes){
  var el=document.getElementById('southbound-section');
  var sc={Light:'sb-light',Moderate:'sb-moderate',Heavy:'sb-heavy',Severe:'sb-severe'};
  var sl={Light:t('light'),Moderate:t('moderate'),Heavy:t('heavy'),Severe:t('severe')};
  el.innerHTML=routes.map(function(r){
    return '<div class="southbound-card">'
      +'<div><div class="sb-name">'+r.name+'</div><div class="sb-note">'+t('trafficNote')+'</div></div>'
      +'<div class="sb-status '+(sc[r.status]||'sb-light')+'">'+(sl[r.status]||r.status)+'</div>'
      +'<div><div class="sb-mins">'+r.minutes+'<span class="sb-mins-unit"> '+t('min')+'</span></div></div>'
      +'</div>';
  }).join('');
}

updateText();
fetchFX();
fetchAll();
setInterval(fetchAll, 5*60*1000);
setInterval(fetchFX, 60*60*1000);