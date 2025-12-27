'use client';

import React, { useEffect, useRef, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChartProps {
  price: number;
  supportLevels: number[];
  resistanceLevels: number[];
  liquidationZones: { price: number; amount: number; type: 'BUY' | 'SELL' }[];
}

export default function TradingViewChart({ 
  price, 
  supportLevels, 
  resistanceLevels, 
  liquidationZones 
}: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState<'1m' | '15m' | '4h' | '1d'>('1m');

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;

    // Dynamically import to avoid SSR issues
    import('lightweight-charts')
      .then(({ createChart, ColorType }) => {
        const chart = createChart(container, {
          layout: {
            background: { type: ColorType.Solid, color: '#0f172a' },
            textColor: '#cbd5e1',
          },
          width: container.clientWidth,
          height: 400,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
          },
        });

        // Add area series (simple price chart)
        const areaSeries = (chart as any).addAreaSeries({
          lineColor: '#3b82f6',
          topColor: '#3b82f6',
          bottomColor: 'rgba(59, 130, 246, 0.1)',
          lineWidth: 2,
        });

        // Generate mock price data
        const now = Math.floor(Date.now() / 1000);
        const priceData = [];
        const timeframeSeconds: Record<string, number> = {
          '1m': 60,
          '15m': 900,
          '4h': 14400,
          '1d': 86400,
        };

        const interval = timeframeSeconds[timeframe] || 60;

        for (let i = 50; i >= 0; i--) {
          const time = now - i * interval;
          const variance = (Math.random() - 0.5) * 2000;
          const value = price + variance;

          priceData.push({
            time: time as any,
            value,
          });
        }

        areaSeries.setData(priceData);

        // Add Support Lines (Grün)
        supportLevels.forEach((level, index) => {
          areaSeries.createPriceLine({
            price: level,
            color: '#10b981',
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: `Support ${index + 1}: $${level.toLocaleString()}`,
          });
        });

        // Add Resistance Lines (Blau)
        resistanceLevels.forEach((level, index) => {
          areaSeries.createPriceLine({
            price: level,
            color: '#3b82f6',
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: `Resistance ${index + 1}: $${level.toLocaleString()}`,
          });
        });

        // Add Liquidation Zones (Rot)
        liquidationZones.forEach((zone) => {
          areaSeries.createPriceLine({
            price: zone.price,
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: 3,
            axisLabelVisible: true,
            title: `Liquidation ${zone.type}: ${zone.amount}M`,
          });
        });

        chart.timeScale().fitContent();

        const handleResize = () => {
          if (container && chart) {
            chart.applyOptions({ width: container.clientWidth });
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          chart.remove();
        };
      })
      .catch((err) => {
        console.error('Error loading chart:', err);
      });
  }, [timeframe, price, supportLevels, resistanceLevels, liquidationZones]);

  return (
    <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm col-span-1 md:col-span-2 lg:col-span-3">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">BTC/USDT Chart</h2>
        <div className="flex gap-2">
          {(['1m', '15m', '4h', '1d'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-3 py-1 rounded text-xs font-bold uppercase transition-all",
                timeframe === tf
                  ? "bg-yellow-500/30 text-yellow-400 border border-yellow-500/50"
                  : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50"
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 mb-4 text-[10px] text-slate-400">
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-500" />
            <span>Resistance Levels</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-green-500" />
            <span>Support Levels</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500" />
            <span>Liquidation Zones</span>
          </div>
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="rounded-xl border border-slate-700 overflow-hidden"
      />
    </section>
  );
}
