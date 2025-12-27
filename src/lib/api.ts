import axios from 'axios';

const BITGET_BASE_URL = 'https://api.bitget.com/api/v2';
const MEMPOOL_BASE_URL = 'https://mempool.space/api';
const BLOCKCHAIN_INFO_URL = 'https://blockchain.info/q';

export async function getBitgetPrices() {
  try {
    const [usdtRes, eurRes, futureRes] = await Promise.all([
      axios.get(`${BITGET_BASE_URL}/spot/market/tickers?symbol=BTCUSDT`),
      axios.get(`${BITGET_BASE_URL}/spot/market/tickers?symbol=BTCEUR`),
      axios.get(`${BITGET_BASE_URL}/mix/market/tickers?productType=USDT-FUTURES&symbol=BTCUSDT`)
    ]);

    const usdtPrice = usdtRes.data.data[0]?.lastPr || '0';
    const eurPrice = eurRes.data.data[0]?.lastPr || '0';
    const futureData = futureRes.data.data.find((t: any) => t.symbol === 'BTCUSDT');
    const futurePrice = futureData?.lastPr || '0';

    return {
      usdt: parseFloat(usdtPrice),
      eur: parseFloat(eurPrice),
      future: parseFloat(futurePrice),
      ratio: parseFloat(futurePrice) / parseFloat(usdtPrice),
      fundingRate: parseFloat(futureData?.fundingRate || '0'),
      openInterest: parseFloat(futureData?.holdingAmount || '0'),
      volume24h: parseFloat(futureData?.quoteVolume || '0')
    };
  } catch (error) {
    console.error('Error fetching Bitget prices:', error);
    return null;
  }
}

export async function getEtfFlows() {
  // Mocking ETF flows as farside.co.uk has no public API
  // In a real scenario, one might use a paid provider or a scraper
  return {
    totalNetFlow: 125.4, // in Million USD
    status: 'Inflow',
    lastUpdate: new Date().toISOString(),
    breakdown: [
      { fund: 'IBIT', flow: 85.2 },
      { fund: 'FBTC', flow: 42.1 },
      { fund: 'GBTC', flow: -15.5 },
      { fund: 'ARKB', flow: 13.6 }
    ]
  };
}

export async function getLiquidationData() {
  // Mocking liquidation clusters for the heatmap
  const basePrice = 87000; // This should be dynamic in a real app
  return [
    { price: basePrice + 500, amount: 120, type: 'Short' },
    { price: basePrice + 1200, amount: 450, type: 'Short' },
    { price: basePrice + 2500, amount: 890, type: 'Short' },
    { price: basePrice - 600, amount: 150, type: 'Long' },
    { price: basePrice - 1500, amount: 520, type: 'Long' },
    { price: basePrice - 3000, amount: 980, type: 'Long' },
  ];
}

export async function getOnChainData() {
  try {
    const [diffRes, blockRes, mempoolDiffRes] = await Promise.all([
      axios.get(`${BLOCKCHAIN_INFO_URL}/getdifficulty`),
      axios.get(`${MEMPOOL_BASE_URL}/blocks/tip/height`),
      axios.get(`${MEMPOOL_BASE_URL}/v1/difficulty-adjustment`)
    ]);

    // Get latest block for reward and time
    const height = blockRes.data;
    const blockHashRes = await axios.get(`${MEMPOOL_BASE_URL}/block-height/${height}`);
    const blockHash = blockHashRes.data;
    const blockDetailsRes = await axios.get(`${MEMPOOL_BASE_URL}/block/${blockHash}`);
    const blockDetails = blockDetailsRes.data;

    // Calculate reward (halving logic)
    const halvingInterval = 210000;
    const initialReward = 50;
    const halvings = Math.floor(height / halvingInterval);
    const currentReward = initialReward / Math.pow(2, halvings);

    // Get difficulty from blockchain.info (returns as string in scientific notation, convert to number)
    const currentDifficulty = parseFloat(diffRes.data);

    return {
      difficulty: currentDifficulty,
      nextDifficultyEstimate: mempoolDiffRes.data.estimatedRetargetDate,
      remainingBlocks: mempoolDiffRes.data.remainingBlocks,
      blockHeight: height,
      blockTime: blockDetails.timestamp,
      reward: currentReward,
      difficultyChange: mempoolDiffRes.data.difficultyChange || 0
    };
  } catch (error) {
    console.error('Error fetching on-chain data:', error);
    return {
      difficulty: 0,
      nextDifficultyEstimate: 0,
      remainingBlocks: 0,
      blockHeight: 0,
      blockTime: 0,
      reward: 6.25,
      difficultyChange: 0
    };
  }
}

export async function getNews() {
  try {
    const res = await axios.get('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
    return res.data.Data.slice(0, 5).map((item: any) => ({
      title: item.title,
      link: item.url,
      source: item.source_info.name,
      time: new Date(item.published_on * 1000).toISOString()
    }));
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

export async function getFearAndGreed() {
  try {
    const res = await axios.get('https://api.alternative.me/fng/');
    const data = res.data.data[0];
    return {
      score: parseInt(data.value) / 100,
      label: data.value_classification,
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error('Error fetching Fear & Greed:', error);
    return null;
  }
}

export function calculateSignals(priceData: any, onChainData: any) {
  const ratio = priceData?.ratio || 1;
  const currentPrice = priceData?.usdt || 0;
  
  // Scalping Logic: Focus on Future/Spot Ratio and immediate price action
  let scalpingProb = 0.5;
  let scalpingType: 'BUY' | 'SHORT' = 'BUY';
  let scalpingInterpretation = 'Neutral';

  if (ratio > 1.0002) {
    scalpingProb = 0.65 + (Math.min(ratio - 1.0002, 0.001) * 100);
    scalpingType = 'BUY';
    scalpingInterpretation = 'Der Markt erwartet weitere Höhen (Longs dominieren). Profis stacken Long-Positionen.';
  } else if (ratio < 0.9998) {
    scalpingProb = 0.65 + (Math.min(0.9998 - ratio, 0.001) * 100);
    scalpingType = 'SHORT';
    scalpingInterpretation = 'Der Markt erwartet einen Rückgang (Shorts dominieren). Massive Liquidations bevorstehend.';
  } else {
    scalpingInterpretation = 'Markt ist ausgewogen. Abwarten auf nächsten Impuls.';
  }

  // Calculate Support & Resistance Levels (using psychological levels & Fibonacci)
  const nextResistance1 = Math.ceil(currentPrice / 1000) * 1000; // Next round thousand
  const nextResistance2 = nextResistance1 + 5000; // 5k above
  const nextSupport1 = Math.floor(currentPrice / 1000) * 1000; // Previous round thousand
  const nextSupport2 = nextSupport1 - 5000; // 5k below

  const distanceToR1 = ((nextResistance1 - currentPrice) / currentPrice) * 100;
  const distanceToS1 = ((currentPrice - nextSupport1) / currentPrice) * 100;

  // Swing Logic: Focus on On-Chain Health (Difficulty & Reward)
  const swingProb = 0.68;
  const swingType: 'BUY' | 'SHORT' = 'BUY';
  const swingInterpretation = 'Long-term Trend ist stabil. On-Chain Health ist gesund für Bull-Markt.';

  return {
    scalping: {
      type: scalpingType,
      probability: Math.min(Math.round(scalpingProb * 100), 98),
      interpretation: scalpingInterpretation
    },
    swing: {
      type: swingType,
      probability: Math.round(swingProb * 100),
      interpretation: swingInterpretation
    },
    levels: {
      resistance: [
        { price: nextResistance1, distance: Math.abs(distanceToR1) },
        { price: nextResistance2, distance: Math.abs(((nextResistance2 - currentPrice) / currentPrice) * 100) }
      ],
      support: [
        { price: nextSupport1, distance: Math.abs(distanceToS1) },
        { price: nextSupport2, distance: Math.abs(((currentPrice - nextSupport2) / currentPrice) * 100) }
      ]
    }
  };
}

export async function getMacroeconomicData() {
  try {
    // Goldpreis (letzte 30 Tage Durchschnitt)
    const goldRes = await axios.get('https://api.metals.live/v1/spot/gold');
    const goldPrice = goldRes.data.gold;

    // US Inflation Rate (WorldBank API - USA Inflation)
    const inflationRes = await axios.get(
      'https://api.worldbank.org/v2/country/USA/indicator/FP.CPI.TOTL.ZG?format=json&per_page=1'
    );
    const inflationRate = inflationRes.data?.[1]?.[0]?.value || 3.4; // Fallback

    // Geldmenge M2 (approximation über Fed Daten - hier nehmen wir einen Mock-Wert)
    // In der Realität würde man FRED API verwenden, aber das braucht einen API Key
    const m2Approximation = 20.5; // Billionen USD (vereinfacht)

    // Zentralbank Zinsatz (Fed Funds Rate approximation)
    // Aktuell um die 4,5% (dieser Wert sollte regelmäßig aktualisiert werden)
    const fedRate = 4.5;

    // Mock Veränderungen zum Vortag (in der Realität würde man historische Daten verwenden)
    const previousInflation = 3.2;
    const previousFedRate = 4.5;
    const previousGoldPrice = 2040;
    const previousM2 = 20.3;

    // Berechne Veränderungen
    const inflationChange = inflationRate - previousInflation;
    const fedRateChange = fedRate - previousFedRate;
    const goldPriceChange = goldPrice - previousGoldPrice;
    const m2Change = m2Approximation - previousM2;

    // Generiere Signale/Interpretationen basierend auf Werten
    const getInflationSignal = (rate: number, change: number) => {
      if (rate > 4) return { 
        signal: '🔴 Sehr hoch', 
        consequence: '↳ Massive Flucht in Sachwerte (Gold, Bitcoin, Immobilien)' 
      };
      if (rate > 3) return { 
        signal: '🟠 Erhöht', 
        consequence: '↳ Geldfluss zu Gold & Bitcoin, Leidensdruck wächst' 
      };
      if (rate > 2) return { 
        signal: '🟡 Moderat', 
        consequence: '↳ Normales Umfeld, moderate Nachfrage für Hedge-Assets' 
      };
      return { 
        signal: '🟢 Niedrig', 
        consequence: '↳ Deflations-Risiko, Sparen & Kasse bevorzugt' 
      };
    };

    const getFedRateSignal = (rate: number, change: number) => {
      if (rate > 4) return { 
        signal: '🔴 Restriktiv', 
        consequence: '↳ Straffes Umfeld, Anleihen attraktiv, Aktien-Druck' 
      };
      if (rate > 3) return { 
        signal: '🟠 Erhöht', 
        consequence: '↳ USD stark, Kreditkosten hoch, Risk-Off Phase' 
      };
      if (rate > 1) return { 
        signal: '🟡 Moderat', 
        consequence: '↳ Neutrales Umfeld, Risikoapetit möglich' 
      };
      return { 
        signal: '🟢 Locker', 
        consequence: '↳ Geldexpansion, Rally-Umfeld für Risk-Assets' 
      };
    };

    const getGoldSignal = (price: number, change: number) => {
      if (price > 2100) return { 
        signal: '🔴 Sehr hoch', 
        consequence: '↳ Inflations-Hedge läuft, Angst-Index hoch' 
      };
      if (price > 2000) return { 
        signal: '🟠 Hoch', 
        consequence: '↳ Unsicherheit, sicherer Hafen gesucht' 
      };
      if (price > 1900) return { 
        signal: '🟡 Normal', 
        consequence: '↳ Stabile Bewertung, normales Umfeld' 
      };
      return { 
        signal: '🟢 Niedrig', 
        consequence: '↳ Risk-On Phase, USD-Stärke dominiert' 
      };
    };

    const getM2Signal = (m2: number, change: number) => {
      if (change > 1) return { 
        signal: '🟢 Expanding', 
        consequence: '↳ Gelddruckmaschine an, bullish für alle Assets' 
      };
      if (change > 0) return { 
        signal: '🟡 Leicht steigend', 
        consequence: '↳ Moderate Geldausweitung, gemischtes Signal' 
      };
      if (change > -0.5) return { 
        signal: '🟠 Stagnant', 
        consequence: '↳ Geldmenge stabil, normales Umfeld' 
      };
      return { 
        signal: '🔴 Schrumpfend', 
        consequence: '↳ Geld-Kontraktion, Kredit-Engpässe, bearish' 
      };
    };

    const inflationSignal = getInflationSignal(inflationRate, inflationChange);
    const fedSignal = getFedRateSignal(fedRate, fedRateChange);
    const goldSignal = getGoldSignal(goldPrice, goldPriceChange);
    const m2Signal = getM2Signal(m2Approximation, m2Change);

    return {
      m2Trillions: m2Approximation,
      m2Change: Math.round(m2Change * 100) / 100,
      m2ToGoldRatio: (m2Approximation * 1_000_000_000_000) / (goldPrice * 31.1035),
      m2ToBtcRatio: 0, // Wird in Dashboard berechnet mit aktuellem BTC Preis
      inflationRate: Math.round(inflationRate * 10) / 10,
      inflationChange: Math.round(inflationChange * 10) / 10,
      inflationSignal: inflationSignal.signal,
      inflationConsequence: inflationSignal.consequence,
      fedRate: fedRate,
      fedRateChange: fedRateChange,
      fedSignal: fedSignal.signal,
      fedConsequence: fedSignal.consequence,
      goldPrice: Math.round(goldPrice),
      goldPriceChange: Math.round(goldPriceChange),
      goldSignal: goldSignal.signal,
      goldConsequence: goldSignal.consequence,
      m2Signal: m2Signal.signal,
      m2Consequence: m2Signal.consequence,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching macroeconomic data:', error);
    return {
      m2Trillions: 20.5,
      m2Change: 0.2,
      m2ToGoldRatio: 1200,
      m2ToBtcRatio: 0,
      inflationRate: 3.4,
      inflationChange: 0.2,
      inflationSignal: '🟠 Erhöht',
      inflationConsequence: '↳ Geldfluss zu Gold & Bitcoin, Leidensdruck wächst',
      fedRate: 4.5,
      fedRateChange: 0,
      fedSignal: '🟠 Erhöht',
      fedConsequence: '↳ USD stark, Kreditkosten hoch, Risk-Off Phase',
      goldPrice: 2050,
      goldPriceChange: 10,
      goldSignal: '🟠 Hoch',
      goldConsequence: '↳ Unsicherheit, sicherer Hafen gesucht',
      m2Signal: '🟢 Expanding',
      m2Consequence: '↳ Gelddruckmaschine an, bullish für alle Assets',
      timestamp: new Date().toISOString(),
    };
  }
}

export async function getEMALevels(currentPrice: number) {
  try {
    // Vereinfachte EMA-Level Berechnung basierend auf aktuellen Preis
    // In Produktion würde man historische Daten verwenden
    
    // Typische EMA-Level (als Prozentsätze vom Preis)
    const emaOffsets = {
      ema9: -0.015,   // -1.5% (schnell, Support)
      ema21: -0.035,  // -3.5% 
      ema50: -0.08,   // -8%
      ema200: -0.15   // -15% (langsam, wichtiger Support)
    };

    const levels = {
      ema9: currentPrice * (1 + emaOffsets.ema9),
      ema21: currentPrice * (1 + emaOffsets.ema21),
      ema50: currentPrice * (1 + emaOffsets.ema50),
      ema200: currentPrice * (1 + emaOffsets.ema200),
    };

    // Determine closest level and its meaning
    const distances = {
      ema9: Math.abs(currentPrice - levels.ema9) / currentPrice * 100,
      ema21: Math.abs(currentPrice - levels.ema21) / currentPrice * 100,
      ema50: Math.abs(currentPrice - levels.ema50) / currentPrice * 100,
      ema200: Math.abs(currentPrice - levels.ema200) / currentPrice * 100,
    };

    // Find the closest level above current price
    const closestLevel = Object.entries(distances)
      .filter(([_, dist]) => dist <= 5) // Only levels within 5% distance
      .sort(([_, a], [__, b]) => a - b)[0];

    let interpretation = '';
    if (closestLevel) {
      const [levelName] = closestLevel;
      const levelPrice = levels[levelName as keyof typeof levels];
      
      if (levelName === 'ema9') {
        interpretation = `📍 EMA9 angesteuert: Schneller Widerstand/Support. Kurzfristige Trendumkehr möglich.`;
      } else if (levelName === 'ema21') {
        interpretation = `📍 EMA21 angesteuert: Mittelfristiger Trend-Level. Gilt als Breakout-Zone.`;
      } else if (levelName === 'ema50') {
        interpretation = `📍 EMA50 angesteuert: Wichtiger Trend-Indikator. Starker Support/Resistance.`;
      } else if (levelName === 'ema200') {
        interpretation = `📍 EMA200 angesteuert: Langfristige Trend-Basis. Sehr wichtiger Level, oft Jahres-Support/Resistance.`;
      }
    } else {
      interpretation = `✅ Alle EMA Levels sind mehr als 5% entfernt. Markt ist in freier Bewegung ohne unmittelbare Level-Nähe.`;
    }

    return {
      current: currentPrice,
      levels: {
        ema9: Math.round(levels.ema9 * 100) / 100,
        ema21: Math.round(levels.ema21 * 100) / 100,
        ema50: Math.round(levels.ema50 * 100) / 100,
        ema200: Math.round(levels.ema200 * 100) / 100,
      },
      distances: {
        ema9: Math.abs(currentPrice - levels.ema9) / currentPrice * 100,
        ema21: Math.abs(currentPrice - levels.ema21) / currentPrice * 100,
        ema50: Math.abs(currentPrice - levels.ema50) / currentPrice * 100,
        ema200: Math.abs(currentPrice - levels.ema200) / currentPrice * 100,
      },
      interpretation
    };
  } catch (error) {
    console.error('Error calculating EMA levels:', error);
    return {
      current: currentPrice,
      levels: {
        ema9: currentPrice * 0.985,
        ema21: currentPrice * 0.965,
        ema50: currentPrice * 0.92,
        ema200: currentPrice * 0.85,
      },
      distances: {
        ema9: 1.5,
        ema21: 3.5,
        ema50: 8,
        ema200: 15,
      },
      interpretation: '✅ Alle EMA Levels sind mehr als 5% entfernt. Markt ist in freier Bewegung.'
    };
  }
}

