"use client";

import type { KeywordRecord, ClusterRecord } from "@threezinc/shared";
import { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Bar,
  BarChart,
  CartesianGrid,
} from "recharts";

interface AnalyticsPanelProps {
  keywords: KeywordRecord[];
  clusters: ClusterRecord[];
}

const INTENT_COLORS: Record<string, string> = {
  Informational: "#5ca7ff",
  Commercial: "#29c5ff",
  Transactional: "#00f5d4",
  Navigational: "#7d5fff",
};

const AIDA_COLORS: Record<string, string> = {
  Awareness: "#818cf8",
  Interest: "#38bdf8",
  Desire: "#34d399",
  Action: "#4ade80",
};

export function AnalyticsPanel({ keywords, clusters }: AnalyticsPanelProps) {
  // Aggregate Metrics (KPIs)
  const totalVolume = useMemo(() => keywords.reduce((s, kw) => s + kw.volume, 0), [keywords]);
  const avgDifficulty = useMemo(() => 
    keywords.length > 0 ? Math.round(keywords.reduce((s, kw) => s + kw.difficulty, 0) / keywords.length) : 0, 
  [keywords]);
  const avgPriority = useMemo(() => 
    keywords.length > 0 ? (keywords.reduce((s, kw) => s + (kw.priority ?? 0), 0) / keywords.length).toFixed(1) : "0", 
  [keywords]);

  // Search Intent Data
  const intentData = useMemo(() => {
    const counts = keywords.reduce<Record<string, number>>((acc, kw) => {
      const key = kw.intent ?? "Unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [keywords]);

  // AIDA Funnel Data
  const aidaData = useMemo(() => {
    const counts = keywords.reduce<Record<string, number>>((acc, kw) => {
      const key = kw.aidaStage ?? "Unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: AIDA_COLORS[name] ?? "#94a3b8",
    }));
  }, [keywords]);

  // Pillar Volume Data (New)
  const pillarVolumeData = useMemo(() => {
    return [...clusters]
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 8)
      .map(c => ({
        name: c.pillar,
        volume: c.totalVolume
      }));
  }, [clusters]);

  // Top 5 Opportunity List (New)
  const topOpportunities = useMemo(() => {
    return [...keywords]
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .slice(0, 5);
  }, [keywords]);

  const scatterData = useMemo(() => {
    return keywords
      .filter((kw) => kw.volume > 0)
      .map((kw) => ({
        x: kw.difficulty,
        y: kw.volume,
        z: Math.max((kw.priority ?? 0) * 10, 20),
        name: kw.keyword,
      }));
  }, [keywords]);

  return (
    <div className="analytics-stack">
      {/* Strategic KPI Row */}
      <section className="metric-row">
        <article className="mini-card">
          <span className="label">Total Traffic Potential</span>
          <strong className="value">{totalVolume.toLocaleString()}</strong>
          <span className="sub">Combined Volume</span>
        </article>
        <article className="mini-card">
          <span className="label">Complexity Index</span>
          <strong className="value">{avgDifficulty}%</strong>
          <span className="sub">Avg. KD Score</span>
        </article>
        <article className="mini-card">
          <span className="label">Targeting Precision</span>
          <strong className="value">{avgPriority}</strong>
          <span className="sub">Avg. Priority Score</span>
        </article>
        <article className="mini-card">
          <span className="label">Strategic Pillars</span>
          <strong className="value">{clusters.length}</strong>
          <span className="sub">Content Verticals</span>
        </article>
      </section>

      <div className="analytics-grid">
        <article className="card analytics-card">
          <div className="card-header-flex">
            <h3>Search Intent Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={intentData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                animationBegin={0}
                animationDuration={1000}
              >
                {intentData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={INTENT_COLORS[entry.name] ?? "#94a3b8"}
                  />
                ))}
              </Pie>
              <Tooltip 
                 contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </article>

        <article className="card analytics-card">
          <h3>Market Size by Pillar</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart layout="vertical" data={pillarVolumeData} margin={{ left: 20, right: 30 }}>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 11, fill: "var(--muted)" }} 
                width={100}
              />
              <Tooltip 
                 cursor={{ fill: 'rgba(var(--accent-rgb), 0.05)' }}
                 contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="volume" radius={[0, 6, 6, 0]} fill="url(#blueGradient)" />
              <defs>
                 <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--palette-periwinkle)" />
                    <stop offset="100%" stopColor="var(--palette-cyan)" />
                 </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="card analytics-card analytics-wide">
          <div className="matrix-layout">
            <div className="matrix-chart">
               <h3>Opportunity Matrix — Volume vs. Difficulty</h3>
               <p className="muted" style={{ marginBottom: 16 }}>
                 Bubble size represents priority score. Target the top-left quadrant for maximum impact.
               </p>
               <ResponsiveContainer width="100%" height={320}>
                 <ScatterChart margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="var(--soft)" vertical={false} />
                   <XAxis
                     type="number"
                     dataKey="x"
                     name="Difficulty"
                     tick={{ fontSize: 12, fill: "var(--muted)" }}
                   />
                   <YAxis
                     type="number"
                     dataKey="y"
                     name="Volume"
                     tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                     tick={{ fontSize: 12, fill: "var(--muted)" }}
                   />
                   <ZAxis type="number" dataKey="z" range={[50, 600]} />
                   <Tooltip
                     cursor={{ strokeDasharray: "3 3" }}
                     content={({ active, payload }) => {
                       if (!active || !payload?.length) return null;
                       const d = payload[0]?.payload as { name: string; x: number; y: number };
                       return (
                         <div className="premium-tooltip">
                           <strong>{d.name}</strong>
                           <div className="tooltip-meta">
                             <span>Vol: {d.y.toLocaleString()}</span>
                             <span className="dot">•</span>
                             <span>KD: {d.x}</span>
                           </div>
                         </div>
                       );
                     }}
                   />
                   <Scatter
                     name="Keywords"
                     data={scatterData}
                     fill="var(--accent)"
                     fillOpacity={0.7}
                   />
                 </ScatterChart>
               </ResponsiveContainer>
            </div>
            
            <div className="top-wins-list">
               <h4 className="eyebrow" style={{ marginBottom: 12 }}>Top 5 Quick Wins</h4>
               {topOpportunities.map((kw, i) => (
                 <div key={kw.id} className="win-item">
                    <div className="win-rank">{i+1}</div>
                    <div className="win-content">
                       <strong>{kw.keyword}</strong>
                       <span className="muted">{kw.volume.toLocaleString()} Vol · {kw.difficulty} KD</span>
                    </div>
                    <div className="win-score">{(kw.priority ?? 0).toFixed(1)}</div>
                 </div>
               ))}
            </div>
          </div>
        </article>
      </div>

      <style jsx>{`
        .analytics-stack { display: flex; flex-direction: column; gap: 32px; }
        
        .metric-row {
           display: grid;
           grid-template-columns: repeat(4, 1fr);
           gap: 20px;
        }
        .mini-card {
           background: var(--card-bg);
           border: 1px solid var(--border);
           padding: 20px;
           border-radius: 16px;
           display: flex;
           flex-direction: column;
        }
        .mini-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 700; margin-bottom: 4px; }
        .mini-card .value { font-size: 1.6rem; font-weight: 800; color: var(--theme-primary); }
        .mini-card .sub { font-size: 11px; color: var(--muted); opacity: 0.8; }

        .analytics-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 24px;
        }
        .analytics-wide { grid-column: span 2; }
        
        .matrix-layout {
           display: grid;
           grid-template-columns: 1.5fr 1fr;
           gap: 40px;
        }
        
        .premium-tooltip {
           background: white;
           padding: 12px 16px;
           border-radius: 12px;
           box-shadow: 0 10px 40px rgba(0,0,0,0.12);
           border: 1px solid rgba(0,0,0,0.05);
        }
        .tooltip-meta {
           display: flex;
           align-items: center;
           gap: 6px;
           font-size: 12px;
           color: var(--muted);
           margin-top: 4px;
        }
        .dot { opacity: 0.4; }
        
        .win-item {
           display: flex;
           align-items: center;
           gap: 12px;
           padding: 12px;
           border-bottom: 1px solid var(--soft);
           transition: background 0.2s;
        }
        .win-rank {
           width: 24px;
           height: 24px;
           background: var(--theme-primary-light);
           color: var(--theme-primary);
           display: grid;
           place-items: center;
           border-radius: 6px;
           font-size: 11px;
           font-weight: 800;
        }
        .win-content { flex: 1; display: flex; flex-direction: column; }
        .win-content strong { font-size: 13px; }
        .win-content span { font-size: 11px; }
        .win-score { font-weight: 700; color: var(--good); font-size: 14px; }
      `}</style>
    </div>
  );
}
