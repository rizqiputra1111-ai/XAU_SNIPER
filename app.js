let chart, candleSeries;
let entryLine, slLine, tp1Line, tp2Line;

function initInteractiveChart() {
    const chartElement = document.getElementById('interactiveChart');
    chart = LightweightCharts.createChart(chartElement, {
        layout: { backgroundColor: '#131722', textColor: '#cbd5e1' },
        grid: { vertLines: { color: '#1e222d' }, horzLines: { color: '#1e222d' } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        priceScale: { borderColor: '#2a2e39' },
        timeScale: { borderColor: '#2a2e39', timeVisible: true },
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: '#10b981', downColor: '#ef4444',
        borderUpColor: '#10b981', borderDownColor: '#ef4444',
        wickUpColor: '#10b981', wickDownColor: '#ef4444',
    });

    let t = Math.floor(Date.now() / 1000);
    candleSeries.setData([
        { time: t - 120, open: 4122.0, high: 4125.0, low: 4120.0, close: 4123.5 },
        { time: t - 60,  open: 4123.5, high: 4126.0, low: 4122.0, close: 4124.6 }
    ]);
}

function updateChartLines(entry, sl, tp1, tp2, showLines) {
    if (entryLine) { candleSeries.removePriceLine(entryLine); entryLine = null; }
    if (slLine) { candleSeries.removePriceLine(slLine); slLine = null; }
    if (tp1Line) { candleSeries.removePriceLine(tp1Line); tp1Line = null; }
    if (tp2Line) { candleSeries.removePriceLine(tp2Line); tp2Line = null; }

    if (!showLines) return;

    entryLine = candleSeries.createPriceLine({ price: entry, color: '#eab308', lineWidth: 2, title: 'ENTRY OTE' });
    slLine = candleSeries.createPriceLine({ price: sl, color: '#ef4444', lineWidth: 2, title: 'STOP LOSS' });
    tp1Line = candleSeries.createPriceLine({ price: tp1, color: '#10b981', lineWidth: 1, title: 'TP 1' });
    tp2Line = candleSeries.createPriceLine({ price: tp2, color: '#10b981', lineWidth: 2, title: 'TP 2' });
}

async function calculateMatrix() {
    let currentPrice = 4124.67;

    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=XAUUSDT');
        if(response.ok) {
            const resData = await response.json();
            if(resData && resData.price) currentPrice = parseFloat(resData.price);
        }
    } catch (e) { }

    document.getElementById('livePriceMonitor').innerText = "Live Price: $" + currentPrice.toFixed(2);

    let lastTime = Math.floor(Date.now() / 1000);
    candleSeries.update({ time: lastTime, open: currentPrice - 0.2, high: currentPrice + 0.4, low: currentPrice - 0.5, close: currentPrice });

    const bias = document.getElementById('arahBias').value;
    const balance = parseFloat(document.getElementById('accountSizeInput').value) || 10000;
    const riskPercent = parseFloat(document.getElementById('riskPercentInput').value) || 1.0;

    let rangeProyeksi = 9.5;
    let ote705, slLevel, tp1, tp2, pipsSL;

    if (bias === "BULLISH" || bias === "KONFLIK") {
        ote705 = currentPrice - (rangeProyeksi * 0.705);
        slLevel = currentPrice - (rangeProyeksi * 0.79) - 0.75;
        pipsSL = (ote705 - slLevel) * 10;
        tp1 = ote705 + (pipsSL * 0.3);
        tp2 = ote705 + (pipsSL * 0.5);
    } else {
        ote705 = currentPrice + (rangeProyeksi * 0.705);
        slLevel = currentPrice + (rangeProyeksi * 0.79) + 0.75;
        pipsSL = (slLevel - ote705) * 10;
        tp1 = ote705 - (pipsSL * 0.3);
        tp2 = ote705 - (pipsSL * 0.5);
    }

    let riskAmount = balance * (riskPercent / 100);
    let targetLot = riskAmount / pipsSL;

    if (bias === "KONFLIK") {
        document.getElementById('valVerdict').innerText = "SKIP SETUP";
        document.getElementById('valKeyLevel').innerText = "CONFLICTING";
        document.getElementById('valLot').innerText = "0.00 Lot";
        updateChartLines(0, 0, 0, 0, false);
    } else {
        document.getElementById('valVerdict').innerText = "🎯 ACTIVE ZONE";
        document.getElementById('valKeyLevel').innerText = "$" + ote705.toFixed(2);
        document.getElementById('valLot').innerText = targetLot.toFixed(2) + " Lot";
        document.getElementById('valSlPips').innerText = "Refined SL: " + pipsSL.toFixed(1) + " Pips";
        updateChartLines(ote705, slLevel, tp1, tp2, true);
    }

    document.getElementById('terminalOutput').innerText = `• Entry Target : $${ote705.toFixed(2)}\n• Stop Loss    : $${slLevel.toFixed(2)}\n• Lot Size     : ${targetLot.toFixed(2)}`;
}

document.getElementById('btnCalculate').addEventListener('click', calculateMatrix);
document.getElementById('arahBias').addEventListener('change', calculateMatrix);

window.onload = function() {
    initInteractiveChart();
    setTimeout(calculateMatrix, 500);
    setInterval(calculateMatrix, 5000);
};
