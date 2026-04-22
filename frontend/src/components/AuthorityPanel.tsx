import type { ClusterRecord } from "@threezinc/shared";
import { useMemo } from "react";

interface AuthorityPanelProps {
  clusters: ClusterRecord[];
  onFocus: (pillar: string) => void;
}

export function AuthorityPanel({ clusters, onFocus }: AuthorityPanelProps) {
  // Edge case: Empty clusters
  if (clusters.length === 0) {
    return <div className="empty-row">No topical clusters available for analysis.</div>;
  }

  // Sort by Total Volume by default for strategic priority
  const sortedClusters = useMemo(() => {
    return [...clusters].sort((a, b) => b.totalVolume - a.totalVolume);
  }, [clusters]);

  const maxVolume = Math.max(...clusters.map((cluster) => cluster.totalVolume));

  return (
    <div className="authority-grid">
      {sortedClusters.map((cluster) => {
        // Calculate a simple Topic Authority Score (0-100 scale)
        // High volume + Low difficulty = High Score
        const volumeWeight = Math.min(cluster.totalVolume / 10000, 1) * 60; // Up to 60 points for volume
        const easeWeight = (1 - cluster.avgDifficulty / 100) * 40; // Up to 40 points for ease of entry
        const authorityScore = Math.round(volumeWeight + easeWeight);

        return (
          <article key={cluster.id} className="card authority-card premium-card">
            <div className="authority-header">
              <div>
                <span className="eyebrow">Topical Pillar</span>
                <h3 className="pillar-title">{cluster.pillar}</h3>
                <div className="pillar-meta">
                  <span className="meta-item">{cluster.keywords.length} Keywords</span>
                  <span className="meta-dot">•</span>
                  <span className={`difficulty-badge ${getDifficultyClass(cluster.avgDifficulty)}`}>
                    {cluster.avgDifficulty}% Difficulty
                  </span>
                </div>
              </div>
              <div className="authority-score-box">
                <div className="score-label">Authority Score</div>
                <div className="score-value">{authorityScore}</div>
              </div>
            </div>

            <div className="meter-section">
              <div className="meter-label">
                <span>Topical Density</span>
                <strong>{cluster.totalVolume.toLocaleString()} Total Vol.</strong>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill bg-theme-gradient-horizontal"
                  style={{ width: `${(cluster.totalVolume / maxVolume) * 100}%` }}
                />
              </div>
            </div>

            <div className="keyword-chip-row">
              {cluster.keywords.slice(0, 5).map((keyword) => (
                <span key={keyword.id} className="chip">
                  {keyword.keyword}
                </span>
              ))}
            </div>

            <div className="card-footer">
              <button 
                className="secondary-button full-width focus-topic-btn"
                onClick={() => onFocus(cluster.pillar)}
              >
                Focus on Topic
              </button>
            </div>
          </article>
        );
      })}

      <style jsx>{`
        .authority-card {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 24px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .authority-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
          border-color: var(--palette-periwinkle);
        }
        .pillar-title {
          font-size: 1.25rem;
          margin-bottom: 4px;
          font-family: var(--font-maven, sans-serif);
        }
        .pillar-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--muted);
        }
        .meta-dot { opacity: 0.3; }
        .difficulty-badge {
          padding: 2px 8px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 11px;
        }
        .diff-low { background: #ecfdf5; color: #10b981; }
        .diff-med { background: #fff7ed; color: #f59e0b; }
        .diff-high { background: #fef2f2; color: #ef4444; }

        .authority-score-box {
          text-align: right;
          background: var(--theme-primary-light);
          padding: 10px 14px;
          border-radius: 16px;
          border: 1px solid rgba(var(--accent-rgb), 0.1);
        }
        .score-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
          font-weight: 700;
          margin-bottom: 2px;
        }
        .score-value {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--theme-primary);
        }
        .meter-section {
          margin-top: 4px;
        }
        .meter-label {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin-bottom: 8px;
          color: var(--muted);
        }
        .bg-theme-gradient-horizontal {
          background: var(--gradient-horizontal);
        }
      `}</style>
    </div>
  );
}

function getDifficultyClass(diff: number) {
  if (diff < 30) return "diff-low";
  if (diff < 60) return "diff-med";
  return "diff-high";
}
