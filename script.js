let apiData = null;
let lat = 45.62;
let lon = 12.24;

const dict = {
    it: {
        status: "Meteo Live Satellitare",
        cfgTitle: "Configurazione Pro",
        gpsBtn: "📍 GPS Posizione",
        langLbl: "Lingua / Language:",
        powerLbl: "Potenza (kW):",
        orientLbl: "Orientamento:",
        costLbl: "Costo Energia (€/kWh):",
        themeLbl: "Tema UI:",
        saveBtn: "Salva & Aggiorna",
        savingTitle: "Risparmio Stimato (7 Giorni)",
        savingSub: "Energia autoprodotta",
        outlook: "📅 Outlook 7 Giorni",
        tap: "Tocca per dettagli",
        chartTitle: "Potenza Istantanea (Watt)",
        closeBtn: "Chiudi Analisi",
        loading: "Connessione ai satelliti meteo...",
        weather: { sunny: "☀️ Soleggiato", cloudy: "⛅ Nuvoloso", rain: "🌧️ Pioggia", var: "🌤️ Variabile" }
    },
    en: {
        status: "Live Satellite Weather",
        cfgTitle: "Pro Configuration",
        gpsBtn: "📍 GPS Position",
        langLbl: "Language:",
        powerLbl: "Power (kW):",
        orientLbl: "Orientation:",
        costLbl: "Energy Cost (€/kWh):",
        themeLbl: "UI Theme:",
        saveBtn: "Save & Refresh",
        savingTitle: "Estimated Savings (7 Days)",
        savingSub: "Self-produced energy",
        outlook: "📅 7-Day Outlook",
        tap: "Tap for details",
        chartTitle: "Instant Power (Watts)",
        closeBtn: "Close Analysis",
        loading: "Connecting to weather satellites...",
        weather: { sunny: "☀️ Sunny", cloudy: "⛅ Cloudy", rain: "🌧️ Rain", var: "🌤️ Variable" }
    }
};

const themes = {
    slate: { bgMain: '#090d16', bgCard: '#131b2e', bgInner: '#090d16', accent: '#38bdf8', border: '#1e293b', grad: 'linear-gradient(to top, #38bdf8, #34d399)' },
    amber: { bgMain: '#140f0a', bgCard: '#211810', bgInner: '#140f0a', accent: '#fbbf24', border: '#332415', grad: 'linear-gradient(to top, #fbbf24, #f97316)' },
    emerald: { bgMain: '#042f2e', bgCard: '#064e3b', bgInner: '#022c22', accent: '#34d399', border: '#065f46', grad: 'linear-gradient(to top, #34d399, #10b981)' }
};

window.onload = () => {
    if(localStorage.getItem('pro_power')) {
        document.getElementById('pv-power').value = localStorage.getItem('pro_power');
        document.getElementById('pv-orient').value = localStorage.getItem('pro_orient');
        document.getElementById('energy-cost').value = localStorage.getItem('pro_cost') || "0.25";
        document.getElementById('setting-theme').value = localStorage.getItem('pro_theme') || "slate";
        document.getElementById('setting-lang').value = localStorage.getItem('pro_lang') || "it";
        lat = parseFloat(localStorage.getItem('pro_lat')) || 45.62;
        lon = parseFloat(localStorage.getItem('pro_lon')) || 12.24;
        document.getElementById('display-location').innerText = localStorage.getItem('pro_locname') || "Zero Branco";
    }
    applyTheme();
    updateTexts();
    fetchWeatherData();
};

function toggleConfig() {
    document.getElementById('config-panel').classList.toggle('open');
}

function applyTheme() {
    let tKey = document.getElementById('setting-theme').value;
    let t = themes[tKey] || themes.slate;
    let r = document.documentElement;
    r.style.setProperty('--bg-main', t.bgMain);
    r.style.setProperty('--bg-card', t.bgCard);
    r.style.setProperty('--bg-inner', t.bgInner);
    r.style.setProperty('--accent', t.accent);
    r.style.setProperty('--border', t.border);
    r.style.setProperty('--bar-gradient', t.grad);
}

function updateTexts() {
    let lang = document.getElementById('setting-lang').value;
    let d = dict[lang] || dict.it;
    document.getElementById('status-text').innerText = d.status;
    document.getElementById('lbl-cfg-title').innerText = d.cfgTitle;
    document.getElementById('btn-gps').innerText = d.gpsBtn;
    document.getElementById('lbl-lang').innerText = d.langLbl;
    document.getElementById('lbl-power').innerText = d.powerLbl;
    document.getElementById('lbl-orient').innerText = d.orientLbl;
    document.getElementById('lbl-cost').innerText = d.costLbl;
    document.getElementById('lbl-theme').innerText = d.themeLbl;
    document.getElementById('btn-save').innerText = d.saveBtn;
    document.getElementById('lbl-saving-title').innerText = d.savingTitle;
    document.getElementById('lbl-saving-sub').innerText = d.savingSub;
    document.getElementById('lbl-outlook').innerText = d.outlook;
    document.getElementById('lbl-tap').innerText = d.tap;
    document.getElementById('lbl-chart-title').innerText = d.chartTitle;
    document.getElementById('btn-close').innerText = d.closeBtn;
}

function saveAndReload() {
    localStorage.setItem('pro_power', document.getElementById('pv-power').value);
    localStorage.setItem('pro_orient', document.getElementById('pv-orient').value);
    localStorage.setItem('pro_cost', document.getElementById('energy-cost').value);
    localStorage.setItem('pro_theme', document.getElementById('setting-theme').value);
    localStorage.setItem('pro_lang', document.getElementById('setting-lang').value);
    toggleConfig();
    applyTheme();
    updateTexts();
    fetchWeatherData();
}

function requestGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
            document.getElementById('display-location').innerText = "GPS Position";
            localStorage.setItem('pro_lat', lat);
            localStorage.setItem('pro_lon', lon);
            localStorage.setItem('pro_locname', "GPS Position");
            toggleConfig();
            fetchWeatherData();
        }, () => alert("GPS error."));
    }
}

async function fetchWeatherData() {
    let lang = document.getElementById('setting-lang').value;
    let d = dict[lang] || dict.it;
    const list = document.getElementById('forecast-list');
    list.innerHTML = `<div class="loading">${d.loading}</div>`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=shortwave_radiation_sum,weathercode,temperature_2m_max,temperature_2m_min&hourly=shortwave_radiation&timezone=Europe/Rome`;
        
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if(!res.ok) throw new Error("Errore rete");

        apiData = await res.json();
        renderForecast();
    } catch(err) {
        console.warn("Fallback meteo locale attivato:", err);
        apiData = generateProData();
        renderForecast();
    }
}

function renderForecast() {
    const list = document.getElementById('forecast-list');
    list.innerHTML = '';

    let lang = document.getElementById('setting-lang').value;
    let d = dict[lang] || dict.it;

    const kw = parseFloat(document.getElementById('pv-power').value) || 4.1;
    const orient = parseFloat(document.getElementById('pv-orient').value) || 0.8;
    const costPerKwh = parseFloat(document.getElementById('energy-cost').value) || 0.25;

    const days = apiData.daily.time;
    const rad = apiData.daily.shortwave_radiation_sum;
    const codes = apiData.daily.weathercode;
    const tMax = apiData.daily.temperature_2m_max;
    const tMin = apiData.daily.temperature_2m_min;

    let totalWeekKwh = 0;

    for(let i=0; i<days.length; i++) {
        let kwhM2 = rad[i] / 3.6;
        let estKwh = kwhM2 * kw * 0.78 * orient;
        totalWeekKwh += estKwh;
        let dayMoney = estKwh * costPerKwh;

        let dObj = new Date(days[i]);
        let dStr = dObj.toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
        let wDesc = getWeatherDesc(codes[i], d);

        let item = document.createElement('div');
        item.className = 'forecast-item';
        item.onclick = () => openDetail(i, dStr, wDesc);
        item.innerHTML = `
            <div class="day-info">
                <span class="day-name">${dStr}</span>
                <span class="day-weather">${wDesc}</span>
                <span class="day-temps">🌡️ ${Math.round(tMax[i])}° / ${Math.round(tMin[i])}°C</span>
            </div>
            <div class="day-prod-box">
                <span class="day-prod">${estKwh.toFixed(1)} kWh</span>
                <span class="day-money">+${dayMoney.toFixed(2)} €</span>
            </div>
        `;
        list.appendChild(item);
    }

    let totalMoneyWeek = totalWeekKwh * costPerKwh;
    document.getElementById('total-money-saving').innerText = totalMoneyWeek.toFixed(2) + " €";
}

function openDetail(index, dStr, wDesc) {
    let lang = document.getElementById('setting-lang').value;
    let d = dict[lang] || dict.it;

    document.getElementById('modal-day-title').innerText = dStr;
    document.getElementById('modal-day-weather').innerText = wDesc;

    const area = document.getElementById('vertical-chart-area');
    area.innerHTML = '';

    const kw = parseFloat(document.getElementById('pv-power').value) || 4.1;
    const orient = parseFloat(document.getElementById('pv-orient').value) || 0.8;
    const hRad = apiData.hourly.shortwave_radiation;

    let start = index * 24;
    let maxW = 1;
    let dData = [];

    for(let h=7; h<=19; h++) {
        let wM2 = hRad[start + h] || 0;
        let watts = Math.max(0, wM2 * kw * 0.78 * orient);
        if(watts > maxW) maxW = watts;
        dData.push({ hour: h, watts: watts });
    }

    dData.forEach(item => {
        let pct = (item.watts / maxW) * 100;
        let col = document.createElement('div');
        col.className = 'v-bar-col';
        col.innerHTML = `
            <div style="font-size:0.4rem; color:#34d399; margin-bottom:2px;">${Math.round(item.watts)}W</div>
            <div class="v-bar" style="height: ${pct}%;"></div>
            <span class="v-bar-label">${item.hour}:00</span>
        `;
        area.appendChild(col);
    });

    document.getElementById('detail-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('detail-modal').classList.remove('active');
}

function getWeatherDesc(code, d) {
    if (code === 0) return d.weather.sunny;
    if (code >= 1 && code <= 3) return d.weather.cloudy;
    if (code >= 50 && code <= 67) return d.weather.rain;
    return d.weather.var;
}

function generateProData() {
    let days = [], rad = [], codes = [], tMax = [], tMin = [], hRad = [];
    let now = new Date();
    for(let i=0; i<7; i++) {
        let d = new Date(now);
        d.setDate(now.getDate() + i);
        days.push(d.toISOString().split('T')[0]);
        rad.push(58 + Math.random() * 24);
        codes.push(Math.random() > 0.4 ? 0 : 2);
        tMax.push(20 + Math.random() * 4);
        tMin.push(11 + Math.random() * 3);

        for(let h=0; h<24; h++) {
            let p = (h >= 7 && h <= 19) ? Math.max(0, Math.sin((h - 7) / 12 * Math.PI) * 800) : 0;
            hRad.push(p);
        }
    }
    return {
        daily: { time: days, shortwave_radiation_sum: rad, weathercode: codes, temperature_2m_max: tMax, temperature_2m_min: tMin },
        hourly: { time: [], shortwave_radiation: hRad }
    };
      }
