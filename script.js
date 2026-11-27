// Dizionario delle traduzioni (Italiano / Inglese)
const translations = {
    it: {
        proTag: "PRO (GRATUITO)",
        coffeeBtn: "☕ Offrimi un caffè",
        gpsBtn: "🛰️ Rilevamento Posizione e Meteo Reale",
        pvSimTitle: "⚡ Produzione PV & Monitoraggio Live",
        configPlant: "Configurazione Impianto",
        panelsLabel: "Pannelli (kW)",
        tariffLabel: "Tariffa (€/kWh)",
        prodTitle: "Produzione PV Attuale",
        savingsTitle: "Risparmio Stimato Oggi",
        manageTitle: "⚙️ Gestione Intelligente Carichi & ROI",
        manageDesc: "Verifica in tempo reale se puoi avviare gli elettrodomestici a costo zero.",
        selectAppliance: "Seleziona Elettrodomestico:",
        verifyBtn: "Verifica Disponibilità per Avvio Immediato",
        monthlySavingsTitle: "Risparmio Stimato (Mese)",
        chartTitle: "📈 Previsione Rendimento PV Orario (Oggi)",
        visitsText: "Visite totali:",
        nightText: "🌙 Notte / Sereno",
        sunnyText: "☀️ Sereno / Soleggiato",
        partCloudyText: "⛅ Parz. Nuvoloso",
        rainText: "🌧️ Pioggia / Diluvio",
        snowText: "🌨️ Neve",
        stormText: "⛈️ Temporale",
        cloudyText: "☁️ Nuvoloso / Coperto",
        gpsNotSupported: "❌ GPS non supportato dal browser",
        gpsLocating: "🛰️ Rilevamento coordinate GPS in corso...",
        gpsConnecting: "🌐 Connessione al satellite meteo...",
        gpsError: "⚠️ Errore nel download dati meteo",
        gpsDenied: "⚠️ Permesso GPS negato o errore"
    },
    en: {
        proTag: "PRO (FREE)",
        coffeeBtn: "☕ Buy me a coffee",
        gpsBtn: "🛰️ Detect GPS & Real Weather",
        pvSimTitle: "⚡ PV Production & Live Monitoring",
        configPlant: "Plant Configuration",
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
        rainText: "🌧️ Rain / Heavy Rain",
        snowText: "🌨️ Snow",
        stormText: "⛈️ Thunderstorm",
        cloudyText: "☁️ Cloudy / Overcast",
        gpsNotSupported: "❌ GPS not supported by browser",
        gpsLocating: "🛰️ Detecting GPS coordinates...",
        gpsConnecting: "🌐 Connecting to weather satellite...",
        gpsError: "⚠️ Error downloading weather data",
        gpsDenied: "⚠️ GPS permission denied or error"
    }
};

let currentLang = 'it'; // Lingua predefinita
let currentSolarPercent = 60; // Valore predefinito di irraggiamento

function setLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.innerText = t[key];
    });

    updateSimulation();
}

// Gestione contatore visite locale sicuro
try {
    let visits = localStorage.getItem('solarpulse_visits');
    if (!visits) {
        visits = 1420;
    } else {
        visits = parseInt(visits) + 1;
    }
    localStorage.setItem('solarpulse_visits', visits);
    document.getElementById('visitCount').innerText = visits.toLocaleString();
} catch (e) {
    document.getElementById('visitCount').innerText = "Online";
}

// Riferimenti agli elementi UI (senza cursori, surplus e batteria)
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

// Inizializzazione Grafico Chart.js Orario
const ctx = document.getElementById('hourlyChart').getContext('2d');
const hourlyChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
        datasets: [{
            label: 'Produzione (kW)',
            data: [0, 0, 0, 0, 0, 0],
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
        plugins: {
            legend: { display: false }
        },
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

// Funzione di interpretazione codici meteo bilingue
function interpretWeatherCode(code, isDay) {
    const oraLocale = new Date().getHours();
    const t = translations[currentLang];
    
    if (oraLocale < 6 || oraLocale >= 21 || isDay === 0) {
        return { text: t.nightText, percent: 60 }; 
    }
    
    if (code === 0) return { text: t.sunnyText, percent: 90 };
    if (code >= 1 && code <= 3) return { text: t.partCloudyText, percent: 60 };
    if (code >= 51 && code <= 67) return { text: t.rainText, percent: 15 };
    if (code >= 71 && code <= 77) return { text: t.snowText, percent: 10 };
    if (code >= 95) return { text: t.stormText, percent: 10 };
    return { text: t.cloudyText, percent: 30 };
}

// Integrazione GPS reale + API Meteo Open-Meteo in tempo reale
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
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`);
                const data = await response.json();

                const temp = data.current.temperature_2m;
                const weatherCode = data.current.weather_code;
                const isDay = data.current.is_day;
                
                const info = interpretWeatherCode(weatherCode, isDay);

                weatherCondition.innerText = `📍 ${currentLang === 'it' ? 'Posizione Reale' : 'Real Position'}: ${info.text}`;
                weatherTemp.innerText = `${temp}°C`;

                currentSolarPercent = info.percent;
                updateSimulation();

            } catch (error) {
                weatherCondition.innerText = t.gpsError;
                weatherTemp.innerText = "--°C";
            }
        },
        (error) => {
            weatherCondition.innerText = t.gpsDenied;
            weatherTemp.innerText = "--°C";
        },
        { timeout: 10000 }
    );
});

// Funzione principale di aggiornamento
function updateSimulation() {
    const powerKw = parseFloat(inputPower.value) || 4.1;
    const tariff = parseFloat(inputTariff.value) || 0.28;
    const solarPercent = currentSolarPercent;

    const oraLocale = new Date().getHours();
    const isNotte = (oraLocale < 6 || oraLocale >= 21);

    const maxProdPotenziale = powerKw * (solarPercent / 100);
    const produzioneAttualeKw = isNotte ? 0 : maxProdPotenziale;

    valProduction.innerText = produzioneAttualeKw.toFixed(2) + ' kW';
    
    if (currentLang === 'it') {
        descWeather.innerText = isNotte ? `Notte (Irragg. rif. ${solarPercent}%)` : `Irraggiamento ${solarPercent}%`;
    } else {
        descWeather.innerText = isNotte ? `Night (Ref. irr. ${solarPercent}%)` : `Irradiance ${solarPercent}%`;
    }

    const kwhToday = maxProdPotenziale * 4.5; 
    const savingsEuro = kwhToday * tariff;
    valSavings.innerText = savingsEuro.toFixed(2) + ' €';
    descKwhToday.innerText = `${currentLang === 'it' ? 'Resa oggi' : 'Yield today'}: ~${kwhToday.toFixed(1)} kWh`;

    const monthlySavingsVal = savingsEuro * 30;
    valMonthlySavings.innerText = monthlySavingsVal.toFixed(2) + ' €';

    const peak = maxProdPotenziale;
    const newHourlyData = [
        parseFloat((peak * 0.2).toFixed(2)),
        parseFloat((peak * 0.6).toFixed(2)),
        parseFloat((peak * 1.0).toFixed(2)),
        parseFloat((peak * 0.9).toFixed(2)),
        parseFloat((peak * 0.5).toFixed(2)),
        parseFloat((peak * 0.15).toFixed(2))
    ];

    hourlyChart.data.datasets[0].data = newHourlyData;
    hourlyChart.update();
}

// Logica Intelligente per i Carichi (Verifica se la produzione copre l'elettrodomestico)
btnOptimize.addEventListener('click', function() {
    const appliancePower = parseFloat(applianceSelect.value);
    const powerKw = parseFloat(inputPower.value) || 4.1;
    const solarPercent = currentSolarPercent;
    
    const oraLocale = new Date().getHours();
    const isNotte = (oraLocale < 6 || oraLocale >= 21);
    const produzioneAttualeKw = isNotte ? 0 : (powerKw * (solarPercent / 100));

    optimizeResult.classList.remove('hidden');

    if (produzioneAttualeKw >= appliancePower) {
        optimizeResult.style.background = 'rgba(34, 197, 94, 0.1)';
        optimizeResult.style.borderColor = 'var(--success-green)';
        optimizeText.innerHTML = currentLang === 'it' ? 
            `✅ <strong>Via libera!</strong> La produzione attuale (${produzioneAttualeKw.toFixed(2)} kW) è sufficiente per accendere l'elettrodomestico (${appliancePower} kW) <strong>a costo zero</strong>.` :
            `✅ <strong>Go ahead!</strong> Current production (${produzioneAttualeKw.toFixed(2)} kW) is enough to run the appliance (${appliancePower} kW) <strong>at zero cost</strong>.`;
    } else if (produzioneAttualeKw > 0) {
        const deficit = (appliancePower - produzioneAttualeKw).toFixed(2);
        optimizeResult.style.background = 'rgba(245, 158, 11, 0.1)';
        optimizeResult.style.borderColor = 'var(--accent)';
        optimizeText.innerHTML = currentLang === 'it' ?
            `⚠️ <strong>Copertura parziale:</strong> La produzione attuale è di ${produzioneAttualeKw.toFixed(2)} kW. Mancano ${deficit} kW per coprire interamente l'elettrodomestico.` :
            `⚠️ <strong>Partial coverage:</strong> Current production is ${produzioneAttualeKw.toFixed(2)} kW. You need ${deficit} kW more to run it entirely on solar.`;
    } else {
        optimizeResult.style.background = 'rgba(248, 113, 113, 0.1)';
        optimizeResult.style.borderColor = 'var(--danger-red)';
        optimizeText.innerHTML = currentLang === 'it' ?
            `❌ <strong>Sconsigliato:</strong> In questo momento la produzione solare è a zero (è notte o assente). L'accensione peserà interamente sulla bolletta.` :
            `❌ <strong>Not recommended:</strong> Solar production is currently zero (nighttime or no sun). Turning it on will impact your bill entirely.`;
    }
});

// Ascoltatori eventi di configurazione
inputPower.addEventListener('input', updateSimulation);
inputTariff.addEventListener('input', updateSimulation);

// Esegui calcolo iniziale al caricamento
updateSimulation();
                                        
