import { NextResponse } from 'next/server';
import { 
  getBitgetPrices, 
  getOnChainData, 
  getNews, 
  getFearAndGreed, 
  calculateSignals,
  getEtfFlowsImproved,
  getLiquidationDataBybit,
  getMacroeconomicData,
  getEMALevels,
  getChartTechnicalData
} from '@/lib/api';

export async function GET() {
  try {
    const [prices, onChain, news, fng] = await Promise.all([
      getBitgetPrices(),
      getOnChainData(),
      getNews(),
      getFearAndGreed()
    ]);

    // Fetch improved data sources in parallel
    const [etf, liquidations, macro, chartTechnicals] = await Promise.all([
      getEtfFlowsImproved(),
      getLiquidationDataBybit(prices?.usdt || 87000),
      getMacroeconomicData(),
      getChartTechnicalData(prices?.usdt || 87000)
    ]);

    const signals = calculateSignals(prices, onChain, chartTechnicals);
    
    // Berechne EMA Levels (now from Bitget klines)
    const emaLevels = prices ? await getEMALevels(prices.usdt) : null;

    // Berechne M2 zu BTC Verhältnis
    const m2ToBtcRatio = prices && prices.usdt ? (macro.m2Trillions * 1_000_000_000_000) / prices.usdt : 0;

    return NextResponse.json({
      prices,
      onChain,
      news,
      signals,
      etf,
      liquidations,
      macro: {
        ...macro,
        m2ToBtcRatio: Math.round(m2ToBtcRatio)
      },
      emaLevels,
      chartTechnicals,
      sentiment: {
        score: fng?.score || 0.5,
        label: fng?.label || 'Neutral',
        summary: `The Fear & Greed Index is currently ${fng?.label}. This psychological indicator reflects market sentiment based on volatility, social media, and market momentum.`,
        source: fng?.source || 'Unknown',
        isLive: fng?.isLive || false
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
