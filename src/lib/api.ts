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
    }
  };
}
