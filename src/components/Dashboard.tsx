'use client';

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Newspaper, 
  Cpu, 
  Clock, 
  Gift, 
  BarChart3,
  AlertCircle,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Wallet
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-lg font-medium">Loading Bitcoin Intelligence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="bg-red-900/20 border border-red-500 p-6 rounded-xl flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-xl font-bold">Error</p>
          <p className="text-red-200">{error}</p>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-yellow-200 bg-clip-text text-transparent">
            BTC Intelligence Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">Real-time analysis & market signals</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Last Update</p>
            <p className="text-sm font-mono">{new Date(data.timestamp).toLocaleTimeString()}</p>
          </div>
          <button 
            onClick={fetchData}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Price & Derivatives Section */}
        <section className="col-span-1 md:col-span-2 lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Market & Derivatives</h2>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">BTC / USDT</p>
                <p className="text-2xl font-bold font-mono text-white">
                  ${data.prices.usdt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">BTC / EUR</p>
                <p className="text-2xl font-bold font-mono text-slate-300">
                  €{data.prices.eur.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Funding Rate</p>
                <p className={cn(
                  "text-lg font-mono font-bold",
                  data.prices.fundingRate > 0 ? "text-green-400" : "text-red-400"
                )}>
                  {(data.prices.fundingRate * 100).toFixed(4)}%
                </p>
                <p className="text-[9px] text-slate-500 mt-1">
                  {data.prices.fundingRate > 0 ? "Long zahlt Short (Top-Gefahr)" : "Short zahlt Long (Boden-Suche)"}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Open Interest</p>
                <p className="text-lg font-mono font-bold text-white">
                  {data.prices.openInterest.toLocaleString()} BTC
                </p>
                <p className="text-[9px] text-slate-500 mt-1">
                  {data.prices.ratio > 1 ? "Trend-Stärke (Long)" : "Liquiditäts-getrieben"}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-400 text-sm">Future / Spot Ratio</span>
                <span className={cn(
                  "font-mono font-bold",
                  data.prices.ratio > 1 ? "text-green-400" : "text-red-400"
                )}>
                  {data.prices.ratio.toFixed(6)}
                </span>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Markt-Analyse</p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {data.prices.ratio > 1.0005 
                      ? "Starker Optimismus (Contango). Trader zahlen Aufpreis für Longs. Trend ist stabil, aber auf Überhitzung achten." 
                      : data.prices.ratio > 1
                      ? "Leichtes Contango. Gesunder Aufwärtsmarkt. Institutionelles Interesse ist vorhanden."
                      : data.prices.ratio > 0.9995
                      ? "Leichte Backwardation. Markt ist unsicher oder sichert sich gegen fallende Kurse ab."
                      : "Starke Backwardation. Panik oder massive Absicherung. Oft ein Zeichen für eine baldige Bodenbildung."}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-700">
                  <p className="text-[10px] text-yellow-500 uppercase font-bold mb-2">🎯 Markt erwartet</p>
                  <p className="text-xs text-yellow-300 font-semibold">
                    {data.signals.scalping.interpretation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ETF & Flows Section */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-6">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">ETF & Exchange Flows</h2>
          </div>
          <div className="space-y-6">
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-400">Total Net ETF Flow</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                  data.etf.totalNetFlow > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                )}>
                  {data.etf.status}
                </span>
              </div>
              <p className="text-3xl font-bold text-white">
                {data.etf.totalNetFlow > 0 ? '+' : ''}{data.etf.totalNetFlow}M USD
              </p>
              <p className="text-[10px] text-slate-500 mt-2">Quelle: Farside Investors (Aggregiert)</p>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Spot Aktivität</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                  <p className="text-[10px] text-slate-500 mb-1">24h Volume</p>
                  <p className="text-sm font-mono font-bold text-white">${(data.prices.volume24h / 1e6).toFixed(2)}M</p>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                  <p className="text-[10px] text-slate-500 mb-1">Dominanz</p>
                  <p className="text-sm font-mono font-bold text-white">Überwiegend Inflow</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-3">ETF Breakdown</p>
              <div className="space-y-2">
                {data.etf.breakdown.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">{item.fund}</span>
                    <span className={cn("font-mono", item.flow > 0 ? "text-green-400" : "text-red-400")}>
                      {item.flow > 0 ? '+' : ''}{item.flow}M
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Trading Signals */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold">Trading Signals</h2>
          </div>
          <div className="space-y-6">
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-slate-400">Scalping (15m)</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                  data.signals.scalping.type === 'BUY' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                )}>
                  {data.signals.scalping.type}
                </span>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-2xl font-bold text-white">{data.signals.scalping.probability}%</span>
                <span className="text-xs text-slate-500 mb-1">Probability</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mb-3">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000",
                    data.signals.scalping.type === 'BUY' ? "bg-green-500" : "bg-red-500"
                  )}
                  style={{ width: `${data.signals.scalping.probability}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 italic border-t border-slate-700 pt-2">
                {data.signals.scalping.interpretation}
              </p>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-slate-400">Swing Trade (4h/1d)</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                  data.signals.swing.type === 'BUY' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                )}>
                  {data.signals.swing.type}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-white">{data.signals.swing.probability}%</span>
                <span className="text-xs text-slate-500 mb-1">Probability</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000",
                    data.signals.swing.type === 'BUY' ? "bg-green-500" : "bg-red-500"
                  )}
                  style={{ width: `${data.signals.swing.probability}%` }}
                />
              </div>
            </div>

            {/* Support & Resistance Levels */}
            <div className="pt-4 border-t border-slate-700 space-y-3">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Support & Resistance</p>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Resistance Levels */}
                <div className="space-y-2">
                  <p className="text-[9px] font-bold text-red-400 uppercase">Resistance</p>
                  {data.signals.levels?.resistance?.map((level: any, i: number) => (
                    <div key={i} className="p-2 bg-red-500/10 border border-red-500/30 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-red-300">${level.price.toLocaleString()}</span>
                        <span className="text-[9px] text-red-400 font-bold">+{level.distance.toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Support Levels */}
                <div className="space-y-2">
                  <p className="text-[9px] font-bold text-green-400 uppercase">Support</p>
                  {data.signals.levels?.support?.map((level: any, i: number) => (
                    <div key={i} className="p-2 bg-green-500/10 border border-green-500/30 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-green-300">${level.price.toLocaleString()}</span>
                        <span className="text-[9px] text-green-400 font-bold">-{level.distance.toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fear & Greed Section */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold">Fear & Greed Index</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Psychological State</span>
              <span className={cn(
                "font-bold",
                data.sentiment.score > 0.6 ? "text-green-400" : data.sentiment.score < 0.4 ? "text-red-400" : "text-yellow-400"
              )}>
                {data.sentiment.label}
              </span>
            </div>
            <div className="relative h-24 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={cn(
                  "w-20 h-20 rounded-full border-4 border-slate-800 animate-[spin_3s_linear_infinite]",
                  data.sentiment.score > 0.6 ? "border-t-green-500" : data.sentiment.score < 0.4 ? "border-t-red-500" : "border-t-yellow-500"
                )} />
              </div>
              <span className="text-3xl font-bold text-white">{(data.sentiment.score * 100).toFixed(0)}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed italic">
              {data.sentiment.summary}
            </p>
          </div>
        </section>

        {/* Macroeconomic Indicators */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-6">
            <Cpu className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold">Macro Indicators</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Inflation */}
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-[10px] text-slate-500">Inflation</p>
                  <span className="text-[8px] font-bold text-slate-400">
                    {data.macro.inflationChange > 0 ? '📈' : data.macro.inflationChange < 0 ? '📉' : '➡️'} {Math.abs(data.macro.inflationChange).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xl font-bold text-orange-400">{data.macro.inflationRate}%</p>
                <p className="text-[8px] text-slate-400 mt-1">{data.macro.inflationSignal}</p>
                <p className="text-[7px] text-slate-500 italic mt-0.5">{data.macro.inflationConsequence}</p>
              </div>

              {/* Fed Rate */}
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-[10px] text-slate-500">Fed Funds</p>
                  <span className="text-[8px] font-bold text-slate-400">
                    {data.macro.fedRateChange > 0 ? '📈' : data.macro.fedRateChange < 0 ? '📉' : '➡️'} {Math.abs(data.macro.fedRateChange).toFixed(2)}%
                  </span>
                </div>
                <p className="text-xl font-bold text-red-400">{data.macro.fedRate}%</p>
                <p className="text-[8px] text-slate-400 mt-1">{data.macro.fedSignal}</p>
                <p className="text-[7px] text-slate-500 italic mt-0.5">{data.macro.fedConsequence}</p>
              </div>

              {/* M2 Expansion */}
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-[10px] text-slate-500">M2 Expansion</p>
                  <span className="text-[8px] font-bold text-slate-400">
                    {data.macro.m2Change > 0 ? '📈' : data.macro.m2Change < 0 ? '📉' : '➡️'} {Math.abs(data.macro.m2Change).toFixed(2)}T
                  </span>
                </div>
                <p className="text-lg font-bold text-white">${data.macro.m2Trillions}T</p>
                <p className="text-[8px] text-slate-400 mt-1">{data.macro.m2Signal}</p>
                <p className="text-[7px] text-slate-500 italic mt-0.5">{data.macro.m2Consequence}</p>
              </div>

              {/* Gold Price */}
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-[10px] text-slate-500">Gold Price</p>
                  <span className="text-[8px] font-bold text-slate-400">
                    {data.macro.goldPriceChange > 0 ? '📈' : data.macro.goldPriceChange < 0 ? '📉' : '➡️'} ${Math.abs(data.macro.goldPriceChange)}
                  </span>
                </div>
                <p className="text-lg font-bold text-yellow-500">${data.macro.goldPrice}</p>
                <p className="text-[8px] text-slate-400 mt-1">{data.macro.goldSignal}</p>
                <p className="text-[7px] text-slate-500 italic mt-0.5">{data.macro.goldConsequence}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-700">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">M2 to Gold Ratio</span>
                <span className="font-mono text-white font-bold">{data.macro.m2ToGoldRatio.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">M2 to BTC Ratio</span>
                <span className="font-mono text-white font-bold">{data.macro.m2ToBtcRatio.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Liquidation Heatmap Section */}
        <section className="col-span-1 md:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-6">
            <Layers className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold">Liquidation Heatmap (Clusters)</h2>
          </div>
          <div className="relative h-48 bg-slate-950/50 rounded-xl border border-slate-800 overflow-hidden flex items-center">
            {/* Simple Heatmap Visualization */}
            <div className="absolute inset-0 flex flex-col justify-between py-4 px-8">
              {data.liquidations.map((liq: any, i: number) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-[10px] font-mono text-slate-500 w-16">${liq.price.toLocaleString()}</span>
                  <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden relative">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        liq.type === 'Short' ? "bg-red-500/40" : "bg-green-500/40"
                      )}
                      style={{ width: `${Math.min(liq.amount / 10, 100)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
                      {liq.amount}M {liq.type}s
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-yellow-500/50 dashed shadow-[0_0_10px_rgba(234,179,8,0.5)]">
              <span className="absolute top-0 -translate-x-1/2 bg-yellow-500 text-[8px] text-black px-1 font-bold rounded">CURRENT PRICE</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-4 text-center italic">
            Visualisierung zeigt Preiszonen mit hoher Liquidations-Dichte. Bitcoin tendiert dazu, diese Zonen "abzugrasen".
          </p>
        </section>

        {/* On-Chain Data */}
        <section className="col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-6">
            <Cpu className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold">On-Chain Metrics</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Activity className="w-3 h-3" />
                <span className="text-[10px] uppercase font-bold">Difficulty</span>
              </div>
              <p className="text-xl font-mono font-bold text-white">
                {data.onChain?.difficulty ? (data.onChain.difficulty / 1e12).toFixed(2) : '--'}T
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Clock className="w-3 h-3" />
                <span className="text-[10px] uppercase font-bold">Block Height</span>
              </div>
              <p className="text-xl font-mono font-bold text-white">
                {data.onChain.blockHeight.toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Gift className="w-3 h-3" />
                <span className="text-[10px] uppercase font-bold">Block Reward</span>
              </div>
              <p className="text-xl font-mono font-bold text-white">
                {data.onChain.reward} BTC
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <RefreshCw className="w-3 h-3" />
                <span className="text-[10px] uppercase font-bold">Next Retarget</span>
              </div>
              <p className="text-sm font-mono text-slate-300">
                {data.onChain.remainingBlocks} blocks left
              </p>
            </div>
          </div>
        </section>

        {/* News Section */}
        <section className="col-span-1 lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-6">
            <Newspaper className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold">Top 5 News</h2>
          </div>
          <div className="space-y-4">
            {data.news.map((item: any, i: number) => (
              <a 
                key={i} 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-yellow-500/50 transition-all group"
              >
                <h3 className="text-sm font-medium text-slate-200 group-hover:text-yellow-400 transition-colors line-clamp-2 mb-2">
                  {item.title}
                </h3>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">{item.source}</span>
                  <span className="text-[10px] text-slate-600">{new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </a>
            ))}
          </div>
        </section>

      </main>
      <footer className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-900 text-center">
        <p className="text-slate-600 text-xs">
          Data provided by Bitget & Mempool.space. Not financial advice.
        </p>
      </footer>
    </div>
  );
}
