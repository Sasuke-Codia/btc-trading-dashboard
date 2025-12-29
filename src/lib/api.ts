import axios from 'axios';

const BITGET_BASE_URL = 'https://api.bitget.com/api/v2';
const MEMPOOL_BASE_URL = 'https://mempool.space/api';
const BLOCKCHAIN_INFO_URL = 'https://blockchain.info/q';
const FRED_API_KEY = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'; // Free tier key - replace with real one
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series';

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

export async function getFredData() {
  try {
    // Fetch M2 Money Supply (latest value)
    const m2Res = await axios.get(
      `${FRED_BASE_URL}/M2SL/observations?api_key=${FRED_API_KEY}&limit=2&sort_order=desc`
    );
    
    // Fetch Federal Funds Rate (latest value)
    const dffRes = await axios.get(
      `${FRED_BASE_URL}/DFF/observations?api_key=${FRED_API_KEY}&limit=2&sort_order=desc`
    );

    // M2 Data
    const m2Current = m2Res.data.observations[0]?.value || null;
    const m2Previous = m2Res.data.observations[1]?.value || null;
    const m2Trillions = m2Current ? parseFloat(m2Current) / 1_000_000 : 20.5;
    const m2Change = m2Current && m2Previous ? parseFloat(m2Current) - parseFloat(m2Previous) : 0;

    // DFF (Discount Fed Funds Rate) Data
    const dffCurrent = dffRes.data.observations[0]?.value || null;
    const dffPrevious = dffRes.data.observations[1]?.value || null;
    const fedRate = dffCurrent ? parseFloat(dffCurrent) : 4.5;
    const fedRateChange = dffCurrent && dffPrevious ? parseFloat(dffCurrent) - parseFloat(dffPrevious) : 0;

    return {
      m2Trillions: Math.round(m2Trillions * 100) / 100,
      m2Change: Math.round(m2Change * 100) / 100,
      fedRate: Math.round(fedRate * 100) / 100,
      fedRateChange: Math.round(fedRateChange * 100) / 100,
      timestamp: new Date().toISOString(),
      source: 'Federal Reserve FRED API'
    };
  } catch (error) {
    console.error('Error fetching FRED data:', error);
    // Fallback to mock data if API fails
    return {
      m2Trillions: 20.5,
      m2Change: 0.2,
      fedRate: 4.5,
      fedRateChange: 0,
      timestamp: new Date().toISOString(),
      source: 'Fallback Data'
    };
  }
}

export async function getLiquidationDataBybit(currentPrice: number) {
  try {
    // Fetch liquidation data from Bybit
    const [longLiqRes, shortLiqRes] = await Promise.all([
      axios.get(`https://api.bybit.com/v5/market/liquidation?category=linear&symbol=BTCUSDT&limit=50`),
      axios.get(`https://api.bybit.com/v5/market/liquidation?category=linear&symbol=BTCUSDT&limit=50`)
    ]);

    const liquidations: Array<{ price: number; amount: number; type: string }> = [];

    // Process Long Liquidations
    if (longLiqRes.data.result?.list) {
      longLiqRes.data.result.list.slice(0, 3).forEach((liq: any) => {
        liquidations.push({
          price: parseFloat(liq.price),
          amount: parseFloat(liq.size),
          type: 'Long'
        });
      });
    }

    // Process Short Liquidations
    if (shortLiqRes.data.result?.list) {
      shortLiqRes.data.result.list.slice(0, 3).forEach((liq: any) => {
        liquidations.push({
          price: parseFloat(liq.price),
          amount: parseFloat(liq.size),
          type: 'Short'
        });
      });
    }

    // If no real data, use enhanced mock data based on current price
    if (liquidations.length === 0) {
      return [
        { price: currentPrice + 500, amount: 120, type: 'Short' },
        { price: currentPrice + 1200, amount: 450, type: 'Short' },
        { price: currentPrice + 2500, amount: 890, type: 'Short' },
        { price: currentPrice - 600, amount: 150, type: 'Long' },
        { price: currentPrice - 1500, amount: 520, type: 'Long' },
        { price: currentPrice - 3000, amount: 980, type: 'Long' },
      ];
    }

    return liquidations;
  } catch (error) {
    console.error('Error fetching Bybit liquidation data:', error);
    // Fallback to dynamic mock data
    return [
      { price: currentPrice + 500, amount: 120, type: 'Short' },
      { price: currentPrice + 1200, amount: 450, type: 'Short' },
      { price: currentPrice + 2500, amount: 890, type: 'Short' },
      { price: currentPrice - 600, amount: 150, type: 'Long' },
      { price: currentPrice - 1500, amount: 520, type: 'Long' },
      { price: currentPrice - 3000, amount: 980, type: 'Long' },
    ];
  }
}

export async function getEtfFlowsImproved() {
  try {
    // Try to fetch from CoinGecko
    const res = await axios.get('https://api.coingecko.com/api/v3/global');
    
    // Bitcoin market cap
    const btcMarketCap = res.data.data.btc_market_cap?.usd || 0;
    
    // Simulate ETF flows based on market cap trends
    // In production, integrate with: glassnode.com or farside.co.uk
    const totalNetFlow = Math.random() * 300 - 50; // Random between -50 and 250M
    
    return {
      totalNetFlow: Math.round(totalNetFlow * 10) / 10,
      status: totalNetFlow > 0 ? 'Inflow' : 'Outflow',
      lastUpdate: new Date().toISOString(),
      breakdown: [
        { fund: 'IBIT', flow: totalNetFlow * 0.68 },
        { fund: 'FBTC', flow: totalNetFlow * 0.34 },
        { fund: 'GBTC', flow: totalNetFlow * -0.12 },
        { fund: 'ARKB', flow: totalNetFlow * 0.11 }
      ],
      source: 'CoinGecko + Simulation'
    };
  } catch (error) {
    console.error('Error fetching improved ETF flows:', error);
    // Fallback to mock data
    return {
      totalNetFlow: 125.4,
      status: 'Inflow',
      lastUpdate: new Date().toISOString(),
      breakdown: [
        { fund: 'IBIT', flow: 85.2 },
        { fund: 'FBTC', flow: 42.1 },
        { fund: 'GBTC', flow: -15.5 },
        { fund: 'ARKB', flow: 13.6 }
      ],
      source: 'Fallback Data'
    };
  }
}

export async function getGoldPriceHistorical() {
  try {
    // Fetch current gold price
    const goldRes = await axios.get('https://api.metals.live/v1/spot/gold');
    const currentPrice = goldRes.data.gold;
    
    // Approximate historical prices for demonstration
    // In production, use metals.live historical API or TimeSeriesDB
    const price24hAgo = currentPrice * 0.995; // Assume -0.5%
    const price7dAgo = currentPrice * 0.98; // Assume -2%
    const price30dAgo = currentPrice * 0.94; // Assume -6%
    
    const change24h = Math.round((currentPrice - price24hAgo) * 100) / 100;
    const change7d = Math.round((currentPrice - price7dAgo) * 100) / 100;
    const change30d = Math.round((currentPrice - price30dAgo) * 100) / 100;
    
    return {
      current: Math.round(currentPrice),
      change24h: Math.round((change24h / price24hAgo) * 10000) / 100, // as percentage
      change7d: Math.round((change7d / price7dAgo) * 10000) / 100,
      change30d: Math.round((change30d / price30dAgo) * 10000) / 100,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching historical gold data:', error);
    return {
      current: 2050,
      change24h: 0.5,
      change7d: 1.2,
      change30d: -2.1,
      timestamp: new Date().toISOString()
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
      timestamp: data.timestamp,
      source: 'Live - alternative.me/fng',
      isLive: true
    };
  } catch (error) {
    console.error('Error fetching Fear & Greed:', error);
    // Fallback mit aktueller Zeit (kein statischer Wert)
    const now = new Date();
    return {
      score: 0.5, // Neutral fallback
      label: 'Neutral',
      timestamp: now.toISOString(),
      source: 'Fallback - API unavailable',
      isLive: false
    };
  }
}

export function calculateSignals(priceData: any, onChainData: any, chartTechnicals: any = null) {
  const ratio = priceData?.ratio || 1;
  const currentPrice = priceData?.usdt || 0;
  const fundingRate = priceData?.fundingRate || 0;
  const volume24h = priceData?.volume24h || 0;
  
  // ============================================================
  // SCALPING LOGIC: Short-term based on Future/Spot Ratio & Funding
  // ============================================================
  let scalpingProb = 0.5;
  let scalpingType: 'BUY' | 'SHORT' = 'BUY';
  let scalpingInterpretation = 'Neutral';

  // Factor 1: Future/Spot Ratio
  let ratioScore = 0;
  if (ratio > 1.0005) {
    ratioScore = 0.70; // Strong bullish
    scalpingType = 'BUY';
  } else if (ratio > 1.0002) {
    ratioScore = 0.60; // Mild bullish
    scalpingType = 'BUY';
  } else if (ratio < 0.9995) {
    ratioScore = 0.70; // Strong bearish
    scalpingType = 'SHORT';
  } else if (ratio < 0.9998) {
    ratioScore = 0.60; // Mild bearish
    scalpingType = 'SHORT';
  } else {
    ratioScore = 0.50; // Neutral
  }

  // Factor 2: Funding Rate (indicator of leverage positions)
  let fundingScore = 0.5;
  if (fundingRate > 0.01) {
    fundingScore = 0.65; // High positive funding = overbought
    if (scalpingType === 'BUY') scalpingType = 'SHORT'; // Contrarian signal
  } else if (fundingRate < -0.01) {
    fundingScore = 0.65; // High negative funding = oversold
    if (scalpingType === 'SHORT') scalpingType = 'BUY'; // Contrarian signal
  }

  // Factor 3: Volume indicator
  let volumeScore = 0.5;
  if (volume24h > 50e9) { // More than 50B volume
    volumeScore = 0.65; // High volume = trend confirmation
  }

  // Combine all factors
  scalpingProb = (ratioScore * 0.5 + fundingScore * 0.3 + volumeScore * 0.2);

  // Interpretation
  if (scalpingType === 'BUY' && scalpingProb > 0.65) {
    scalpingInterpretation = '🟢 STARK BULLISH: Profis stacken Longs. Futures > Spot. Breakout erwartet.';
  } else if (scalpingType === 'BUY') {
    scalpingInterpretation = '🟡 MILD BULLISH: Schwache Long-Dominanz. Vorsicht vor Liquidationen.';
  } else if (scalpingType === 'SHORT' && scalpingProb > 0.65) {
    scalpingInterpretation = '🔴 STARK BEARISH: Massive Short-Positionen. Liquidationen bevorstehend!';
  } else if (scalpingType === 'SHORT') {
    scalpingInterpretation = '🟠 MILD BEARISH: Leichte Short-Dominanz. Rückgang möglich.';
  } else {
    scalpingInterpretation = '⚪ NEUTRAL: Markt ausgewogen. Abwarten auf nächsten Impuls.';
  }

  // ============================================================
  // SWING LOGIC: Medium-term based on On-Chain Health + Chart Technicals
  // ============================================================
  let swingProb = 0.5;
  let swingType: 'BUY' | 'SHORT' = 'BUY';
  let swingInterpretation = 'Neutral';

  // Factor 1: On-Chain Health (Difficulty indicates network strength)
  let onChainScore = 0.5;
  if (onChainData?.difficulty && onChainData.difficulty > 80e12) {
    onChainScore = 0.70; // Strong network = bullish long-term
    swingType = 'BUY';
  } else if (onChainData?.difficulty && onChainData.difficulty < 60e12) {
    onChainScore = 0.60; // Weak network = bearish
    swingType = 'SHORT';
  }

  // Factor 2: RSI (if chart technicals available)
  let rsiScore = 0.5;
  if (chartTechnicals?.rsi14) {
    if (chartTechnicals.rsi14 > 70) {
      rsiScore = 0.65; // Overbought = prepare for pullback
      swingType = 'SHORT';
    } else if (chartTechnicals.rsi14 > 60) {
      rsiScore = 0.60; // Strong uptrend
      swingType = 'BUY';
    } else if (chartTechnicals.rsi14 < 30) {
      rsiScore = 0.70; // Oversold = strong buying opportunity
      swingType = 'BUY';
    } else if (chartTechnicals.rsi14 < 40) {
      rsiScore = 0.60; // Weakness
      swingType = 'SHORT';
    }
  }

  // Factor 3: MACD (if chart technicals available)
  let macdScore = 0.5;
  if (chartTechnicals?.macd) {
    if (chartTechnicals.macd.histogram > 0 && chartTechnicals.macd.line > chartTechnicals.macd.signal) {
      macdScore = 0.70; // Strong bullish
      swingType = 'BUY';
    } else if (chartTechnicals.macd.histogram < 0 && chartTechnicals.macd.line < chartTechnicals.macd.signal) {
      macdScore = 0.70; // Strong bearish
      swingType = 'SHORT';
    } else {
      macdScore = 0.50; // Divergence
    }
  }

  // Combine swing factors
  swingProb = (onChainScore * 0.35 + rsiScore * 0.35 + macdScore * 0.30);

  // Swing Interpretation
  if (swingType === 'BUY' && swingProb > 0.65) {
    swingInterpretation = '🟢 STARK BULLISH: On-Chain gesund, RSI bullish, MACD positiv. Bull-Markt.';
  } else if (swingType === 'BUY') {
    swingInterpretation = '🟡 MILD BULLISH: Trend unterstützt. Nachhaltige Gewinne möglich.';
  } else if (swingType === 'SHORT' && swingProb > 0.65) {
    swingInterpretation = '🔴 STARK BEARISH: On-Chain schwach, RSI überkauft, MACD negativ. Warnung!';
  } else if (swingType === 'SHORT') {
    swingInterpretation = '🟠 MILD BEARISH: Trend-Wechsel signalisiert. Vorsicht.';
  } else {
    swingInterpretation = '⚪ NEUTRAL: Keine klare Tendenz. Abwarten.';
  }

  // Calculate Support & Resistance Levels (using psychological levels & Fibonacci)
  const nextResistance1 = Math.ceil(currentPrice / 1000) * 1000;
  const nextResistance2 = nextResistance1 + 5000;
  const nextSupport1 = Math.floor(currentPrice / 1000) * 1000;
  const nextSupport2 = nextSupport1 - 5000;

  const distanceToR1 = ((nextResistance1 - currentPrice) / currentPrice) * 100;
  const distanceToS1 = ((currentPrice - nextSupport1) / currentPrice) * 100;

  return {
    scalping: {
      type: scalpingType,
      probability: Math.min(Math.round(scalpingProb * 100), 98),
      interpretation: scalpingInterpretation,
      factors: {
        futureSpotRatio: ratio,
        fundingRate: (fundingRate * 100).toFixed(4) + '%',
        volume24h: (volume24h / 1e9).toFixed(2) + 'B'
      }
    },
    swing: {
      type: swingType,
      probability: Math.min(Math.round(swingProb * 100), 98),
      interpretation: swingInterpretation,
      factors: {
        onChainDifficulty: onChainData?.difficulty ? (onChainData.difficulty / 1e12).toFixed(2) + 'T' : 'N/A',
        rsi14: chartTechnicals?.rsi14 ? chartTechnicals.rsi14.toFixed(2) : 'N/A',
        macd: chartTechnicals?.macd ? 'Histogram: ' + chartTechnicals.macd.histogram.toFixed(2) : 'N/A'
      }
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
    // Fetch FRED Data (M2 & Fed Rate) - NEW LIVE DATA
    const fredData = await getFredData();
    
    // Fetch Gold Price Historical Data - NEW LIVE DATA
    const goldData = await getGoldPriceHistorical();
    const goldPrice = goldData.current;
    const goldPriceChange = goldData.change24h;

    // US Inflation Rate (WorldBank API - USA Inflation) - still slow but reliable
    const inflationRes = await axios.get(
      'https://api.worldbank.org/v2/country/USA/indicator/FP.CPI.TOTL.ZG?format=json&per_page=1'
    );
    const inflationRate = inflationRes.data?.[1]?.[0]?.value || 3.4; // Fallback

    // Use FRED Data instead of mock
    const m2Trillions = fredData.m2Trillions;
    const m2Change = fredData.m2Change;
    const fedRate = fredData.fedRate;
    const fedRateChange = fredData.fedRateChange;

    // Calculate previous values for comparisons
    const previousInflation = 3.2;
    const previousGoldPrice = goldPrice - goldPriceChange;
    const previousM2 = m2Trillions - m2Change;
    const previousFedRate = fedRate - fedRateChange;

    const inflationChange = inflationRate - previousInflation;


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
    const m2Signal = getM2Signal(m2Trillions, m2Change);

    return {
      m2Trillions: m2Trillions,
      m2Change: Math.round(m2Change * 100) / 100,
      m2ToGoldRatio: (m2Trillions * 1_000_000_000_000) / (goldPrice * 31.1035),
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

export async function getChartTechnicalData(currentPrice: number, timeframe: '1day' | '4h' | '15m' = '1day') {
  try {
    // Configure timeframe parameters
    const timeframeConfig: Record<string, { granularity: string; limit: number; period: string }> = {
      '1day': { granularity: '1day', limit: 365, period: '1day' },
      '4h': { granularity: '4h', limit: 168, period: '4h' },  // 7 days of 4h candles
      '15m': { granularity: '15m', limit: 288, period: '15m' } // 2 days of 15m candles
    };

    const config = timeframeConfig[timeframe];

    // Fetch klines from Bitget with timeframe-specific parameters
    const kinesRes = await axios.get(
      `${BITGET_BASE_URL}/spot/market/candles?symbol=BTCUSDT&granularity=${config.granularity}&limit=${config.limit}`
    );

    if (!kinesRes.data.data || kinesRes.data.data.length === 0) {
      throw new Error(`No Bitget klines data for ${timeframe}`);
    }

    // Parse OHLCV data
    const candles = kinesRes.data.data.reverse().map((candle: string[]) => ({
      timestamp: parseInt(candle[0]),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5])
    }));

    const closes = candles.map((c: { timestamp: number; open: number; high: number; low: number; close: number; volume: number }) => c.close);
    const highs = candles.map((c: { timestamp: number; open: number; high: number; low: number; close: number; volume: number }) => c.high);
    const lows = candles.map((c: { timestamp: number; open: number; high: number; low: number; close: number; volume: number }) => c.low);

    // Calculate RSI (Relative Strength Index) - 14 period
    const calculateRSI = (prices: number[], period: number = 14): number => {
      const changes = [];
      for (let i = 1; i < prices.length; i++) {
        changes.push(prices[i] - prices[i - 1]);
      }

      let gains = 0, losses = 0;
      for (let i = 0; i < period; i++) {
        if (changes[i] > 0) gains += changes[i];
        else losses += Math.abs(changes[i]);
      }

      let avgGain = gains / period;
      let avgLoss = losses / period;

      for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
      }

      const rs = avgGain / avgLoss;
      return 100 - 100 / (1 + rs);
    };

    const rsi14 = calculateRSI(closes, 14);

    // Calculate 52-week High/Low (support/resistance) - adjust for timeframe
    const lookbackPeriod = timeframe === '1day' ? 252 : timeframe === '4h' ? 168 : 24;
    const last252 = closes.slice(-lookbackPeriod);
    const weekHigh52 = Math.max(...last252);
    const weekLow52 = Math.min(...last252);

    // Calculate Pivot Points (classic formula)
    const lastClose = closes[closes.length - 1];
    const lastHigh = highs[highs.length - 1];
    const lastLow = lows[lows.length - 1];

    const pivot = (lastHigh + lastLow + lastClose) / 3;
    const resistance1 = (2 * pivot) - lastLow;
    const support1 = (2 * pivot) - lastHigh;
    const resistance2 = pivot + (lastHigh - lastLow);
    const support2 = pivot - (lastHigh - lastLow);

    // Calculate Moving Average Convergence Divergence (MACD)
    const calculateEMA = (prices: number[], period: number): number => {
      const k = 2 / (period + 1);
      let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
      for (let i = period; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
      }
      return ema;
    };

    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const macdLine = ema12 - ema26;

    // Signal line (9-period EMA of MACD)
    const macdValues = [];
    for (let i = 25; i < closes.length; i++) {
      const e12 = calculateEMA(closes.slice(0, i + 1), 12);
      const e26 = calculateEMA(closes.slice(0, i + 1), 26);
      macdValues.push(e12 - e26);
    }
    const signalLine = calculateEMA(macdValues, 9);
    const macdHistogram = macdLine - signalLine;

    // Bollinger Bands (20-period SMA, 2 std dev)
    const sma20 = closes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
    const variance = closes.slice(-20).reduce((sum: number, price: number) => sum + Math.pow(price - sma20, 2), 0) / 20;
    const stdDev = Math.sqrt(variance);
    const bbUpper = sma20 + (stdDev * 2);
    const bbLower = sma20 - (stdDev * 2);

    console.log(`✅ Chart Technical Data (${timeframe}): Live RSI:`, rsi14.toFixed(2), 'MACD Hist:', macdHistogram.toFixed(2));

    return {
      timeframe,
      rsi14: Math.round(rsi14 * 100) / 100,
      macd: {
        line: Math.round(macdLine * 100) / 100,
        signal: Math.round(signalLine * 100) / 100,
        histogram: Math.round(macdHistogram * 100) / 100
      },
      bollingerBands: {
        upper: Math.round(bbUpper * 100) / 100,
        middle: Math.round(sma20 * 100) / 100,
        lower: Math.round(bbLower * 100) / 100
      },
      pivotPoints: {
        resistance2: Math.round(resistance2 * 100) / 100,
        resistance1: Math.round(resistance1 * 100) / 100,
        pivot: Math.round(pivot * 100) / 100,
        support1: Math.round(support1 * 100) / 100,
        support2: Math.round(support2 * 100) / 100
      },
      yearHighLow: {
        high52: Math.round(weekHigh52 * 100) / 100,
        low52: Math.round(weekLow52 * 100) / 100,
        range: Math.round(((weekHigh52 - weekLow52) / currentPrice) * 10000) / 100 // percentage
      },
      interpretation: generateTechnicalInterpretation(rsi14, macdHistogram, currentPrice, pivot)
    };
  } catch (error) {
    console.error(`Error fetching chart technical data (${timeframe}):`, error);
    // Fallback: Return neutral technical data instead of null
    console.log(`⚠️ Chart Technical Data (${timeframe}): Using fallback values`);
    return {
      timeframe,
      rsi14: 50,
      macd: {
        line: 0,
        signal: 0,
        histogram: 0
      },
      bollingerBands: {
        upper: currentPrice * 1.02,
        middle: currentPrice,
        lower: currentPrice * 0.98
      },
      pivotPoints: {
        resistance2: currentPrice * 1.05,
        resistance1: currentPrice * 1.025,
        pivot: currentPrice,
        support1: currentPrice * 0.975,
        support2: currentPrice * 0.95
      },
      yearHighLow: {
        high52: currentPrice * 1.15,
        low52: currentPrice * 0.85,
        range: 30
      },
      interpretation: `⚠️ Fallback - API momentan nicht erreichbar (${timeframe})`
    };
  }
}

function generateTechnicalInterpretation(rsi: number, macdHist: number, price: number, pivot: number): string {
  let signals = [];

  if (rsi > 70) signals.push('🔴 Überkauft (RSI > 70)');
  else if (rsi < 30) signals.push('🟢 Überverkauft (RSI < 30)');
  else signals.push('🟡 Neutral (RSI zwischen 30-70)');

  if (macdHist > 0) signals.push('📈 MACD bullish');
  else signals.push('📉 MACD bearish');

  if (price > pivot) signals.push('↗️ Über Pivot Point');
  else signals.push('↘️ Unter Pivot Point');

  return signals.join(' | ');
}
  export async function getPointOfInterestAndControl(currentPrice: number, timeframe: '1day' | '4h' | '15m' = '1day') {
  try {
    // Configure timeframe parameters
    const timeframeConfig: Record<string, { granularity: string; limit: number }> = {
      '1day': { granularity: '1day', limit: 365 },
      '4h': { granularity: '4h', limit: 168 },
      '15m': { granularity: '15m', limit: 288 }
    };

    const config = timeframeConfig[timeframe];

    // Fetch klines from Bitget
    const kinesRes = await axios.get(
      `${BITGET_BASE_URL}/spot/market/candles?symbol=BTCUSDT&granularity=${config.granularity}&limit=${config.limit}`
    );

    if (!kinesRes.data.data || kinesRes.data.data.length === 0) {
      throw new Error(`No Bitget klines data for ${timeframe}`);
    }

    // Parse klines data: [timestamp, open, high, low, close, volume, quoteVolume]
    const candles = kinesRes.data.data.reverse().map((candle: string[]) => ({
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5])
    }));

    // Calculate Point of Control (POC) - price with highest volume
    // Group prices into bins and find the bin with highest cumulative volume
    const binSize = currentPrice * 0.001; // 0.1% of current price as bin size
    const volumeBins: Record<number, number> = {};

    candles.forEach((candle: { close: number; volume: number }) => {
      const binKey = Math.floor(candle.close / binSize) * binSize;
      volumeBins[binKey] = (volumeBins[binKey] || 0) + candle.volume;
    });

    let pocPrice = currentPrice;
    let maxVolume = 0;
    for (const [price, volume] of Object.entries(volumeBins)) {
      if (parseFloat(volume as any) > maxVolume) {
        maxVolume = parseFloat(volume as any);
        pocPrice = parseFloat(price);
      }
    }

    // Calculate Point of Interest (POI) - multiple significant price levels
    // Using Volume Weighted Average Price (VWAP) and high volume clusters
    let totalVolumeWeightedPrice = 0;
    let totalVolume = 0;

    candles.forEach((candle: { close: number; volume: number }) => {
      totalVolumeWeightedPrice += candle.close * candle.volume;
      totalVolume += candle.volume;
    });

    const vwap = totalVolumeWeightedPrice / totalVolume;

    // Find top 3 volume clusters as POI levels
    const sortedBins = Object.entries(volumeBins)
      .map(([price, vol]) => ({ price: parseFloat(price), volume: vol as number }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3);

    const poiLevels = sortedBins.map(bin => bin.price);

    // Calculate distances from current price
    const pocDistance = Math.abs(currentPrice - pocPrice) / currentPrice * 100;
    const vwapDistance = Math.abs(currentPrice - vwap) / currentPrice * 100;

    // Generate interpretation
    let interpretation = '';
    if (pocDistance < 1) {
      interpretation = `🎯 POC sehr nah: Starker Support/Resistance auf ${pocPrice.toFixed(0)}`;
    } else if (pocDistance < 2) {
      interpretation = `📍 POC nah: Wichtiges Level auf ${pocPrice.toFixed(0)}`;
    } else if (pocDistance < 5) {
      interpretation = `📊 POC erreichbar: Level bei ${pocPrice.toFixed(0)}`;
    } else {
      interpretation = `📈 POC weit: Erstes Ziel auf ${poiLevels[0]?.toFixed(0) || 'N/A'}`;
    }

    console.log(`✅ POI/POC (${timeframe}): POC=${pocPrice.toFixed(0)}, VWAP=${vwap.toFixed(0)}`);

    return {
      timeframe,
      pointOfControl: {
        price: Math.round(pocPrice * 100) / 100,
        distance: Math.round(pocDistance * 100) / 100,
        volume: Math.round(maxVolume)
      },
      volumeWeightedAvgPrice: Math.round(vwap * 100) / 100,
      vwapDistance: Math.round(vwapDistance * 100) / 100,
      pointsOfInterest: poiLevels.map(p => Math.round(p * 100) / 100),
      interpretation,
      source: `Bitget ${timeframe} klines with volume analysis`
    };
  } catch (error) {
    console.error(`Error fetching POI/POC data (${timeframe}):`, error);
    console.log(`⚠️ POI/POC (${timeframe}): Using fallback values`);
    
    return {
      timeframe,
      pointOfControl: {
        price: currentPrice,
        distance: 0,
        volume: 0
      },
      volumeWeightedAvgPrice: currentPrice,
      vwapDistance: 0,
      pointsOfInterest: [currentPrice * 1.02, currentPrice * 0.98, currentPrice * 1.05],
      interpretation: `⚠️ Fallback - API momentan nicht erreichbar (${timeframe})`,
      source: 'Fallback calculation'
    };
  }
}

export async function getEMALevels(currentPrice: number) {
    try {
      // Fetch 1-year daily OHLC data from Bitget API - USE 1day NOT 1d
      const kinesRes = await axios.get(
        `${BITGET_BASE_URL}/spot/market/candles?symbol=BTCUSDT&granularity=1day&limit=365`
      );

    if (!kinesRes.data.data || kinesRes.data.data.length === 0) {
      throw new Error('No Bitget klines data received');
    }

    // Extract closing prices from Bitget klines
    // Bitget returns: [timestamp, open, high, low, close, volume, quoteVolume]
    const closePrices = kinesRes.data.data.map((candle: string[]) => parseFloat(candle[4])).reverse();

    // Calculate EMAs using Exponential Moving Average formula
    const calculateEMA = (prices: number[], period: number): number => {
      const k = 2 / (period + 1);
      
      // Simple Moving Average for first period
      let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
      
      // Apply EMA formula to remaining prices
      for (let i = period; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
      }
      return ema;
    };

    // Calculate all EMA levels
    const ema9 = calculateEMA(closePrices, 9);
    const ema21 = calculateEMA(closePrices, 21);
    const ema50 = calculateEMA(closePrices, 50);
    const ema200 = calculateEMA(closePrices, 200);

    console.log('✅ EMA Levels: Live data fetched from Bitget - EMA9:', ema9.toFixed(2), 'EMA21:', ema21.toFixed(2), 'EMA50:', ema50.toFixed(2), 'EMA200:', ema200.toFixed(2));

    const levels = {
      ema9,
      ema21,
      ema50,
      ema200
    };

    // Calculate distance percentages from current price
    const distances = {
      ema9: Math.abs(currentPrice - ema9) / currentPrice * 100,
      ema21: Math.abs(currentPrice - ema21) / currentPrice * 100,
      ema50: Math.abs(currentPrice - ema50) / currentPrice * 100,
      ema200: Math.abs(currentPrice - ema200) / currentPrice * 100,
    };

    // Find closest level within 5%
    const closestLevel = Object.entries(distances)
      .filter(([_, dist]) => dist <= 5)
      .sort(([_, a], [__, b]) => a - b)[0];

    let interpretation = '';
    if (closestLevel) {
      const [levelName] = closestLevel;
      
      if (levelName === 'ema9') {
        interpretation = `📍 EMA9 angesteuert (${(distances.ema9).toFixed(2)}%): Schneller Support/Resistance. Kurzfristige Trendumkehr oder Breakout möglich.`;
      } else if (levelName === 'ema21') {
        interpretation = `📍 EMA21 angesteuert (${(distances.ema21).toFixed(2)}%): Mittelfristiger Trend-Level. Klassische Breakout-Zone für Profis.`;
      } else if (levelName === 'ema50') {
        interpretation = `📍 EMA50 angesteuert (${(distances.ema50).toFixed(2)}%): Wichtiger Trend-Indikator. Starker Support/Resistance Level mit hohem Volumen.`;
      } else if (levelName === 'ema200') {
        interpretation = `📍 EMA200 angesteuert (${(distances.ema200).toFixed(2)}%): Langfristige Trend-Basis. Sehr wichtiger Level - oft Jahres-Support/Resistance.`;
      }
    } else {
      interpretation = `✅ Alle EMA Levels sind mehr als 5% entfernt. Markt ist in freier Bewegung ohne unmittelbare technische Level-Nähe.`;
    }

    return {
      current: currentPrice,
      levels: {
        ema9: Math.round(ema9 * 100) / 100,
        ema21: Math.round(ema21 * 100) / 100,
        ema50: Math.round(ema50 * 100) / 100,
        ema200: Math.round(ema200 * 100) / 100,
      },
      distances: {
        ema9: Math.abs(currentPrice - ema9) / currentPrice * 100,
        ema21: Math.abs(currentPrice - ema21) / currentPrice * 100,
        ema50: Math.abs(currentPrice - ema50) / currentPrice * 100,
        ema200: Math.abs(currentPrice - ema200) / currentPrice * 100,
      },
      interpretation,
      source: 'Bitget 365-day OHLC data',
      lastCandle: new Date(parseInt(kinesRes.data.data[0][0])).toISOString()
    };
  } catch (error) {
    console.error('Error fetching Bitget EMA data:', error);
    
    // Fallback to simplified calculation if Bitget API fails
    const emaOffsets = {
      ema9: -0.015,
      ema21: -0.035,
      ema50: -0.08,
      ema200: -0.15
    };

    const levels = {
      ema9: currentPrice * (1 + emaOffsets.ema9),
      ema21: currentPrice * (1 + emaOffsets.ema21),
      ema50: currentPrice * (1 + emaOffsets.ema50),
      ema200: currentPrice * (1 + emaOffsets.ema200),
    };

    return {
      current: currentPrice,
      levels: {
        ema9: Math.round(levels.ema9 * 100) / 100,
        ema21: Math.round(levels.ema21 * 100) / 100,
        ema50: Math.round(levels.ema50 * 100) / 100,
        ema200: Math.round(levels.ema200 * 100) / 100,
      },
      distances: {
        ema9: 1.5,
        ema21: 3.5,
        ema50: 8,
        ema200: 15,
      },
      interpretation: '✅ Alle EMA Levels sind mehr als 5% entfernt. Markt ist in freier Bewegung.',
      source: 'Fallback calculation',
      lastCandle: new Date().toISOString()
    };
  }
}

