// Collegamento Pulsante "Offrimi un caffè" al link di Buy Me a Coffee
document.getElementById('btnCoffee').addEventListener('click', function() {
    window.open('https://www.buymeacoffee.com/tuonome', '_blank');
});

// Riferimenti agli elementi UI
const rangeSolar = document.getElementById('rangeSolar');
const rangeLoad = document.getElementById('rangeLoad');
const sliderSolarVal = document.getElementById('sliderSolarVal');
const sliderLoadVal = document.getElementById('sliderLoadVal');

const valProduction = document.getElementById('valProduction');
const valSurplus = document.getElementById('valSurplus');
const valSavings = document.getElementById('valSavings');
const valBattery = document.getElementById('valBattery');

const descWeather = document.getElementById('descWeather');
const descHouseLoad = document.getElementById('descHouseLoad');
const descKwhToday = document.getElementById('descKwhToday');
const descBatteryStatus = document.getElementById('descBatteryStatus');

const inputPower = document.getElementById('inputPower');
const inputBatteryCapacity = document.getElementById('inputBatteryCapacity');
const inputTariff = document.getElementById('inputTariff');

const btnGps = document.getElementById('btnGps');
const weatherCondition = document.getElementById('weatherCondition');
const weatherTemp = document.getElementById('weatherTemp');

// Inizializzazione Grafico Chart.js Orario
const ctx = document.getElementById('hourlyChart').getContext('2d');
const hourlyChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
        datasets: [{
            label: 'Produzione (kW)',
            data: [0.8, 2.5, 4.1, 3.9, 2.1, 0.5],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
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

// Funzione di interpretazione codici meteo Open-Meteo WMO
function interpretWeatherCode(code) {
    if (code === 0) return { text: "☀️ Sereno / Soleggiato", percent: 90 };
    if (code >= 1 && code <= 3) return { text: "⛅ Parz. Nuvoloso", percent: 60 };
    if (code >= 51 && code <= 67) return { text: "🌧️ Pioggia / Diluvio", percent: 15 };
    if (code >= 71 && code <= 77) return { text: "🌨️ Neve", percent: 10 };
    if (code >= 95) return { text: "⛈️ Temporale", percent: 10 };
    return { text: "☁️ Nuvoloso / Coperto", percent: 30 };
}

// Integrazione GPS reale + API Meteo Open-Meteo in tempo reale
btnGps.addEventListener('click', function() {
    if (!navigator.geolocation) {
        weatherCondition.innerText = "❌ GPS non supportato dal browser";
        return;
    }

    weatherCondition.innerText = "🛰️ Rilevamento coordinate GPS in corso...";
    weatherTemp.innerText = "--°C";

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            weatherCondition.innerText = "🌐 Connessione al satellite meteo...";

            try {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
                const data = await response.json();

                const temp = data.current.temperature_2m;
                const weatherCode = data.current.weather_code;
                const info = interpretWeatherCode(weatherCode);

                weatherCondition.innerText = `📍 Posizione Reale: ${info.text}`;
                weatherTemp.innerText = `${temp}°C`;

                // Aggiorna lo slider e ricalcola tutto (inclusa la curva del grafico)
                rangeSolar.value = info.percent;
                updateSimulation();

            } catch (error) {
                weatherCondition.innerText = "⚠️ Errore nel download dati meteo";
                weatherTemp.innerText = "--°C";
            }
        },
        (error) => {
            weatherCondition.innerText = "⚠️ Permesso GPS negato o errore";
            weatherTemp.innerText = "--°C";
        },
        { timeout: 10000 }
    );
});

// Funzione principale di aggiornamento (Simulatore + Grafico Orario)
function updateSimulation() {
    const powerKw = parseFloat(inputPower.value) || 4.1;
    const batteryCap = parseFloat(inputBatteryCapacity.value) || 6.0;
    const tariff = parseFloat(inputTariff.value) || 0.28;
    const solarPercent = parseInt(rangeSolar.value);
    const houseLoad = parseFloat(rangeLoad.value);

    // Aggiorna etichette slider
    sliderSolarVal.innerText = solarPercent;
    sliderLoadVal.innerText = houseLoad.toFixed(1);

    // Calcoli produzione attuale
    const maxProd = powerKw * (solarPercent / 100);
    valProduction.innerText = maxProd.toFixed(2) + ' kW';

    descWeather.innerText = `Irradiazione ${solarPercent}%`;

    // Surplus e Batteria
    const surplus = maxProd - houseLoad;
    valSurplus.innerText = (surplus > 0 ? surplus.toFixed(2) : '0.00') + ' kW';
    valBattery.innerText = (surplus > 0 ? '+' : '') + surplus.toFixed(2) + ' kW';
    
    if (surplus > 0) {
        valBattery.style.color = '#38bdf8';
        descHouseLoad.innerText = `Consumo casa: ${houseLoad} kW`;
        descBatteryStatus.innerText = `In carica (${batteryCap} kWh cap.)`;
    } else {
        valBattery.style.color = '#f87171';
        descHouseLoad.innerText = `Prelievo rete: ${Math.abs(surplus).toFixed(2)} kW`;
        descBatteryStatus.innerText = `In scarica (${batteryCap} kWh cap.)`;
    }

    // Risparmio stimato giornaliero in euro
    const kwhToday = maxProd * 4.5; 
    const savingsEuro = kwhToday * tariff;
    valSavings.innerText = savingsEuro.toFixed(2) + ' €';
    descKwhToday.innerText = `Resa oggi: ~${kwhToday.toFixed(1)} kWh`;

    // AGGIORNAMENTO DINAMICO DEL GRAFICO ORARIO
    // Fattore di scala basato sulla potenza e sull'irraggiamento percentuale corrente
    const factor = (powerKw / 4.1) * (solarPercent / 100);
    
    // Curva a campana simulata per le fasce orarie (08:00, 10:00, 12:00, 14:00, 16:00, 18:00)
    const newHourlyData = [
        parseFloat((0.8 * factor).toFixed(2)),
        parseFloat((2.5 * factor).toFixed(2)),
        parseFloat((4.1 * factor).toFixed(2)),
        parseFloat((3.9 * factor).toFixed(2)),
        parseFloat((2.1 * factor).toFixed(2)),
        parseFloat((0.5 * factor).toFixed(2))
    ];

    hourlyChart.data.datasets[0].data = newHourlyData;
    hourlyChart.update();
}

// Ascoltatori eventi
rangeSolar.addEventListener('input', updateSimulation);
rangeLoad.addEventListener('input', updateSimulation);
inputPower.addEventListener('input', updateSimulation);
inputBatteryCapacity.addEventListener('input', updateSimulation);
inputTariff.addEventListener('input', updateSimulation);

// Interazione simulazione ottimizzazione carichi
document.io = document.getElementById('btnOptimize').addEventListener('click', function() {
    const resultBox = document.getElementById('optimizeResult');
    resultBox.classList.remove('hidden');
});

// Esegui calcolo iniziale al caricamento
updateSimulation();
