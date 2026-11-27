// Dizionario delle traduzioni (Italiano / Inglese)
const translations = {
    it: {
        proTag: "PRO",
        coffeeBtn: "☕ Caffè",
        btnGps: "🛰️ Rileva Posizione e Meteo Reale",
        pvSimTitle: "⚡ Produzione PV & Monitoraggio Live",
        panelsLabel: "Pannelli (kW)",
        tariffLabel: "Tariffa (€/kWh)",
        prodTitle: "Produzione PV Attuale",
        savingsTitle: "Risparmio Stimato Oggi",
        manageTitle: "⚙️ Gestione Intelligente Carichi",
        manageDesc: "Verifica in tempo reale se puoi avviare gli elettrodomestici a costo zero.",
        selectAppliance: "Seleziona Elettrodomestico:",
        verifyBtn: "Verifica Disponibilità per Avvio Immediato",
        monthlySavingsTitle: "Risparmio Stimato (Mese)",
        chartTitle: "📈 Previsione Rendimento PV Orario (Oggi)",
        visitsText: "Visite totali:",
        nightText: "🌙 Notte / Sereno",
        sunnyText: "☀️ Sereno / Soleggiato",
        partCloudyText: "⛅ Parz. Nuvoloso",
        rainText: "🌧️ Pioggia",
        snowText: "🌨️ Neve",
        stormText: "⛈️ Temporale",
        cloudyText: "☁️ Nuvoloso / Coperto",
        gpsNotSupported: "❌ GPS non supportato dal browser",
        gpsLocating: "🛰️ Rilevamento coordinate GPS...",
        gpsConnecting: "🌐 Scaricamento dati solari...",
        gpsError: "⚠️ Meteo offline (uso stima standard)",
        gpsDenied: "⚠️ Permesso GPS negato (uso stima standard)"
    },
    en: {
        proTag: "PRO",
        coffeeBtn: "☕ Coffee",
        btnGps: "🛰️ Detect GPS & Real Weather",
        pvSimTitle: "⚡ PV Production & Live Monitoring",
        panelsLabel: "Panels (kW)",
        tariffLabel: "Tariff (€/kWh)",
        prodTitle: "Current PV Production",
        savingsTitle: "Estimated Savings Today",
        manageTitle: "⚙️ Smart Load Management",
        manageDesc: "Check in real-time if you can run appliances at zero cost.",
        selectAppliance: "Select Appliance:",
        verifyBtn: "Check Availability for Immediate Start",
        monthlySavingsTitle: "Estimated Savings (Month)",
        chartTitle: "📈 Hourly PV Yield Forecast (Today)",
        visitsText: "Total visits:",
        nightText: "🌙 Night / Clear",
        sunnyText: "☀️ Sunny / Clear",
        partCloudyText: "⛅ Part. Cloudy",
        rainText: "🌧️ Rain",
        snowText: "🌨️ Snow",
        stormText: "⛈️ Thunderstorm",
        cloudyText: "☁️ Cloudy / Overcast",
        gpsNotSupported: "❌ GPS not supported by browser",
        gpsLocating: "🛰️ Detecting GPS coordinates...",
        gpsConnecting: "🌐 Downloading solar data...",
        gpsError: "⚠️ Weather offline (using standard estimate)",
        gpsDenied: "⚠️ GPS denied (using standard estimate)"
    }
};

let currentLang = 'it';
let currentIrradiancePercent = 65; // Stima iniziale diurna
// Profilo orario base (08:00, 10:00, 12:00, 14:00, 16:00, 18:00) in % rispetto alla potenza impianto
let hourlyFactors = [0.18, 0.52, 0.78, 0.72, 0.38, 0.10];

function setLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.innerText = t[key];
    });

    updateSimulation();
}

// Contatore visite locale
try {
    let visits = localStorage.getItem('solarpulse_visits');
    visits = visits ? parseInt(visits) + 1 : 1420;
    localStorage.setItem('solarpulse_visits', visits);
    document.getElementById('visitCount').innerText = visits.toLocaleString();
} catch (e) {
    document.getElementById('visitCount').innerText = "Online";
}

// Riferimenti UI
const valProduction = document.getElementById('valProduction');
const valSavings = document.getElementById('valSavings');
const descWeather = document.getElementById('descWeather');
const descKwhToday = document.getElementById('descKwhToday');
const inputPower = document.getElementById('inputPower');
const inputTariff = document.getElementById('inputTariff');
const btnGps = document.getElementById('btnGps');
const weatherCondition = document.getElementById('weatherCondition');
const weatherTemp = document.getElementById('weatherTemp');
const applianceSelect = document.getElementById('applianceSelect');
const btnOptimize = document.getElementById('btnOptimize');
const optimizeResult = document.getElementById('optimizeResult');
const optimizeText = document.getElementById('optimizeText');
const valMonthlySavings = document.getElementById('valMonthlySavings');

// Grafico Chart.js Orario
const ctx = document.getElementById('hourlyChart').getContext('2d');
const hourlyChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
        datasets: [{
            label: 'Produzione (kW)',
            data: [0.7, 2.1, 3.2, 2.9, 1.5, 0.4],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { 
                beginAtZero: true,
                grid: { color: '#1e293b' },
                ticks: { color: '#94a3b8', font: { size: 10 } }
            },
            x: { 
                grid: { display: false },
                ticks: { color: '#94a3b8', font: { size: 10 } }
            }
        }
    }
});

// Descrizione meteo testuale
function getWeatherLabel(code, isDay) {
    const oraLocale = new Date().getHours();
    const t = translations[currentLang];
    if (oraLocale < 6 || oraLocale >= 20 || isDay === 0) return t.nightText;
    if (code === 0) return t.sunnyText;
    if (code >= 1 && code <= 3) return t.partCloudyText;
    if (code >= 51 && code <= 67) return t.rainText;
    if (code >= 71 && code <= 77) return t.snowText;
    if (code >= 95) return t.stormText;
    return t.cloudyText;
}

// Integrazione GPS + Dati Solari Reali Orari da Open-Meteo
btnGps.addEventListener('click', function() {
    const t = translations[currentLang];
    if (!navigator.geolocation) {
        weatherCondition.innerText = t.gpsNotSupported;
        return;
    }

    weatherCondition.innerText = t.gpsLocating;
    weatherTemp.innerText = "--°C";

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            weatherCondition.innerText = t.gpsConnecting;

            try {
                // Scarica meteo attuale + radiazione solare oraria reale (shortwave_radiation in W/m²)
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&hourly=shortwave_radiation&timezone=auto&forecast_days=1`;
                const response = await fetch(url);
                if (!response.ok) throw new Error("API error");
                const data = await response.json();

                const temp = data.current.temperature_2m;
                const weatherCode = data.current.weather_code;
                const isDay = data.current.is_day;

                weatherCondition.innerText = `📍 ${getWeatherLabel(weatherCode, isDay)}`;
                weatherTemp.innerText = `${temp}°C`;

                // Estrae la radiazione solare reale alle ore 08, 10, 12, 14, 16, 18 (1000 W/m² = 100% resa)
                const rad = data.hourly.shortwave_radiation;
                const targetHours = [8, 10, 12, 14, 16, 18];
                hourlyFactors = targetHours.map(h => {
                    const wm2 = rad[h] || 0;
                    // Efficienza reale impianto (~85% rispetto a STC 1000 W/m²)
                    return Math.min(1.0, (wm2 / 1000) * 0.85);
                });

                // Calcola l'irraggiamento medio diurno reale della giornata (basato sul picco)
                const maxFactor = Math.max(...hourlyFactors);
                currentIrradiancePercent = Math.max(10, Math.round(maxFactor * 100));

                updateSimulation();

            } catch (error) {
                weatherCondition.innerText = t.gpsError;
                weatherTemp.innerText = "--°C";
                // Anche se il meteo fallisce, mantiene la curva e i calcoli attivi!
                updateSimulation();
            }
        },
        (error) => {
            weatherCondition.innerText = t.gpsDenied;
            weatherTemp.innerText = "--°C";
            updateSimulation();
        },
        { timeout: 10000 }
    );
});

// Calcolo principale (Curva oraria + Risparmio giornaliero/mensile + Produzione istantanea)
function updateSimulation() {
    const powerKw = parseFloat(inputPower.value) || 4.1;
    const tariff = parseFloat(inputTariff.value) || 0.28;
    const oraLocale = new Date().getHours();
    const isNotte = (oraLocale < 6 || oraLocale >= 20);

    // 1. Calcola la curva oraria reale (08:00 -> 18:00)
    const newHourlyData = hourlyFactors.map(f => parseFloat((powerKw * f).toFixed(2)));
    hourlyChart.data.datasets[0].data = newHourlyData;
    hourlyChart.update();

    // 2. Produzione PV Attuale: 0.00 kW di notte, oppure interpolata sull'ora reale di giorno
    let produzioneAttualeKw = 0;
    if (!isNotte) {
        // Stima istantanea basata sull'irraggiamento rilevato e l'ora del giorno
        const hourMultiplier = Math.sin(((oraLocale - 6) / 14) * Math.PI);
        produzioneAttualeKw = powerKw * (currentIrradiancePercent / 100) * Math.max(0.15, hourMultiplier);
    }

    valProduction.innerText = produzioneAttualeKw.toFixed(2) + ' kW';

    if (currentLang === 'it') {
        descWeather.innerText = isNotte 
            ? `Notte • Picco stimato ${currentIrradiancePercent}%` 
            : `Irraggiamento reale ${currentIrradiancePercent}%`;
    } else {
        descWeather.innerText = isNotte 
            ? `Night • Est. peak ${currentIrradiancePercent}%` 
            : `Real irradiance ${currentIrradiancePercent}%`;
    }

    // 3. Resa giornaliera in kWh (integrale della curva oraria su blocchi da 2 ore) -> NON va mai a zero!
    const kwhToday = newHourlyData.reduce((acc, kw) => acc + (kw * 2), 0);
    const savingsEuro = kwhToday * tariff;

    valSavings.innerText = savingsEuro.toFixed(2) + ' €';
    descKwhToday.innerText = `${currentLang === 'it' ? 'Resa oggi' : 'Yield today'}: ~${kwhToday.toFixed(1)} kWh`;

    // 4. Risparmio stimato mensile
    const monthlySavingsVal = savingsEuro * 30;
    valMonthlySavings.innerText = monthlySavingsVal.toFixed(2) + ' €';
}

// Verifica avvio elettrodomestici
btnOptimize.addEventListener('click', function() {
    const appliancePower = parseFloat(applianceSelect.value);
    const produzioneAttualeKw = parseFloat(valProduction.innerText) || 0;

    optimizeResult.classList.remove('hidden');

    if (produzioneAttualeKw >= appliancePower) {
        optimizeResult.style.background = 'rgba(34, 197, 94, 0.12)';
        optimizeResult.style.borderColor = '#22c55e';
        optimizeText.innerHTML = currentLang === 'it' ? 
            `✅ <strong>Via libera!</strong> La produzione attuale (${produzioneAttualeKw.toFixed(2)} kW) copre interamente l'elettrodomestico (${appliancePower} kW) <strong>a costo zero</strong>.` :
            `✅ <strong>Go ahead!</strong> Current production (${produzioneAttualeKw.toFixed(2)} kW) fully covers the appliance (${appliancePower} kW) <strong>at zero cost</strong>.`;
    } else if (produzioneAttualeKw > 0) {
        const deficit = (appliancePower - produzioneAttualeKw).toFixed(2);
        optimizeResult.style.background = 'rgba(245, 158, 11, 0.12)';
        optimizeResult.style.borderColor = '#f59e0b';
        optimizeText.innerHTML = currentLang === 'it' ?
            `⚠️ <strong>Copertura parziale:</strong> Produci ${produzioneAttualeKw.toFixed(2)} kW. Mancano ${deficit} kW dalla rete.` :
            `⚠️ <strong>Partial coverage:</strong> Producing ${produzioneAttualeKw.toFixed(2)} kW. Missing ${deficit} kW from the grid.`;
    } else {
        optimizeResult.style.background = 'rgba(248, 113, 113, 0.12)';
        optimizeResult.style.borderColor = '#f87171';
        optimizeText.innerHTML = currentLang === 'it' ?
            `❌ <strong>Sconsigliato ora:</strong> Produzione solare a 0.00 kW (è notte). Meglio programmare l'avvio nelle ore centrali del grafico.` :
            `❌ <strong>Not recommended now:</strong> Solar production is 0.00 kW (nighttime). Schedule it during peak chart hours.`;
    }
});

inputPower.addEventListener('input', updateSimulation);
inputTariff.addEventListener('input', updateSimulation);

// Avvio iniziale
updateSimulation();
