import { NextResponse } from 'next/server';
import { 
  getBitgetPrices, 
  getOnChainData, 
  getNews, 
  getFearAndGreed, 
  calculateSignals,
  getEtfFlows,
  getLiquidationData,
  getMacroeconomicData
} from '@/lib/api';

export async function GET() {
  try {
    const [prices, onChain, news, fng, etf, liquidations, macro] = await Promise.all([
      getBitgetPrices(),
      getOnChainData(),
      getNews(),
      getFearAndGreed(),
      getEtfFlows(),
      getLiquidationData(),
      getMacroeconomicData()
    ]);

    const signals = calculateSignals(prices, onChain);

    // Berechne M2 zu BTC Verhältnis
    const m2ToBtcRatio = (macro.m2Trillions * 1_000_000_000_000) / prices.usdt;

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
      sentiment: {
        score: fng?.score || 0.5,
        label: fng?.label || 'Neutral',
        summary: `The Fear & Greed Index is currently ${fng?.label}. This psychological indicator reflects market sentiment based on volatility, social media, and market momentum.`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
