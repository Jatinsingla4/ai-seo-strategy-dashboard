import type { ClusterRecord, CompetitorGapRecord, LinkSuggestion, ContentIdea } from "@threezinc/shared";

interface RoadmapPanelProps {
  clusters: ClusterRecord[];
  gapResults: CompetitorGapRecord[];
  linkSuggestions: LinkSuggestion[];
}

function downloadClusterRoadmap(pillar: string, ideas: ContentIdea[]) {
  const headers = ["Title", "Description", "Priority", "Target Audience"];
  const rows = ideas.map((idea) => [
    `"${idea.title.replace(/"/g, '""')}"`,
    `"${idea.description.replace(/"/g, '""')}"`,
    idea.priority,
    `"${(idea.targetAudience || "General").replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `roadmap_${pillar.toLowerCase().replace(/\s+/g, "_")}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function RoadmapPanel({
  clusters,
  gapResults,
  linkSuggestions,
}: RoadmapPanelProps) {
  const highGapCount = gapResults.filter((item) => !item.inPrimaryCsv && item.inCompetitorCsv).length;

  return (
    <div className="roadmap-stack">
      <section className="feature-banner-grid">
        <article className="feature-banner premium-banner">
          <div className="banner-icon">🔗</div>
          <div className="banner-content">
            <p className="eyebrow">Internal Linking</p>
            <h3>{linkSuggestions.length} Suggestions Ready</h3>
            <p className="muted">
              Pillar-to-cluster recommendations generated based on topical density.
            </p>
          </div>
        </article>
        <article className="feature-banner premium-banner">
          <div className="banner-icon">🎯</div>
          <div className="banner-content">
            <p className="eyebrow">Competitor Gaps</p>
            <h3>{highGapCount} High-Gap Terms</h3>
            <p className="muted">
              Opportunities found in competitor data but missing from your strategy.
            </p>
          </div>
        </article>
      </section>

      {clusters.length === 0 ? (
        <div className="empty-state-card card">
          <div className="large-icon">🗺️</div>
          <h3>Your Roadmap is Waiting</h3>
          <p className="muted">No clusters found. Upload your keywords to see your content strategy unfold.</p>
        </div>
      ) : (
        <div className="clusters-flow">
          {clusters.map((cluster) => (
            <article key={cluster.id} className="roadmap-cluster card premium-card">
              <div className="roadmap-cluster-header">
                <div>
                  <span className="eyebrow">Category Pillar</span>
                  <h3>{cluster.pillar}</h3>
                  <div className="pillar-stats">
                    <span>{cluster.keywords.length} Keywords</span>
                    <span className="dot">•</span>
                    <span>{cluster.totalVolume.toLocaleString()} search volume</span>
                  </div>
                </div>
                <button 
                  className="secondary-button" 
                  onClick={() => downloadClusterRoadmap(cluster.pillar, cluster.contentIdeas)}
                >
                   Export Roadmap
                </button>
              </div>

              <div className="roadmap-list">
                {cluster.contentIdeas.map((idea, index) => (
                  <article key={`${cluster.id}-${idea.title}`} className="roadmap-item">
                    <div className="roadmap-step-container">
                      <div className="roadmap-index bg-theme-gradient">{index + 1}</div>
                      {index < cluster.contentIdeas.length - 1 && <div className="roadmap-line"></div>}
                    </div>
                    <div className="roadmap-idea-content">
                      <div className="roadmap-header">
                        <div>
                          <h4 className="idea-title">{idea.title}</h4>
                          <div className="tag-row">
                             <span className={`priority-tag p-${idea.priority.toLowerCase()}`}>
                                {idea.priority} Priority
                             </span>
                             {idea.targetAudience && (
                               <span className="audience-tag">
                                  For: {idea.targetAudience}
                               </span>
                             )}
                          </div>
                        </div>
                      </div>
                      <p className="idea-description">{idea.description}</p>
                    </div>
                  </article>
                ))}
                {cluster.contentIdeas.length === 0 && (
                  <div className="sub-empty">No specific content ideas generated for this cluster yet.</div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="dashboard-grid-2">
        <section className="card insight-section">
          <div className="section-header">
            <h3 className="section-title">Link Suggestions</h3>
            <span className="badge-count">{linkSuggestions.length}</span>
          </div>
          <div className="insight-list">
            {linkSuggestions.length > 0 ? (
              linkSuggestions.map((suggestion, i) => (
                <div key={suggestion.id ?? `link-${i}`} className="suggestion-card">
                  <div className="link-flow">
                    <span className="pillar-link">{suggestion.sourcePillar}</span>
                    <span className="link-arrow">→</span>
                    <span className="pillar-target">{suggestion.targetCluster}</span>
                  </div>
                  <p className="anchor-text"><strong>Anchor:</strong> "{suggestion.anchorText}"</p>
                  <p className="rationale-text">{suggestion.rationale}</p>
                </div>
              ))
            ) : (
              <div className="sub-empty">No link suggestions available yet.</div>
            )}
          </div>
        </section>

        <section className="card insight-section">
          <div className="section-header">
            <h3 className="section-title">Content Gaps</h3>
            <span className="badge-count">{gapResults.filter(r => !r.inPrimaryCsv).length}</span>
          </div>
          <div className="insight-list">
            {gapResults.filter(r => !r.inPrimaryCsv).length > 0 ? (
              gapResults.filter(r => !r.inPrimaryCsv).slice(0, 5).map((result) => (
                <div key={result.keyword} className="gap-card">
                  <div className="gap-header">
                    <strong>{result.keyword}</strong>
                    <span className="opp-score">Opp Score: {result.opportunityScore}</span>
                  </div>
                  <p className="muted">This keyword is only in your competitor's list. You are missing out on this traffic.</p>
                  <button className="ghost-button mini" onClick={() => alert("Added to ideas!")}>
                    + Add to Ideas
                  </button>
                </div>
              ))
            ) : (
              <div className="sub-empty">No competitor gaps found. Upload a competitor CSV to see insights.</div>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .roadmap-stack { display: flex; flex-direction: column; gap: 32px; }
        
        .premium-banner {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 24px;
        }
        .banner-icon {
          font-size: 2rem;
          background: var(--theme-primary-light);
          width: 60px;
          height: 60px;
          display: grid;
          place-items: center;
          border-radius: 16px;
        }
        
        .pillar-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: var(--muted);
          margin-top: 4px;
        }
        .dot { opacity: 0.4; }

        .roadmap-cluster { padding: 32px; }
        .roadmap-cluster-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          border-bottom: 1px solid var(--line);
          padding-bottom: 24px;
        }

        .roadmap-list { display: flex; flex-direction: column; }
        .roadmap-item {
          display: grid;
          grid-template-columns: 48px 1fr;
          gap: 24px;
          margin-bottom: 8px;
        }
        
        .roadmap-step-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .roadmap-index {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: white;
          font-weight: 700;
          z-index: 2;
        }
        .roadmap-line {
          width: 2px;
          flex: 1;
          background: var(--line);
          margin: 4px 0;
        }
        
        .roadmap-idea-content {
          padding-bottom: 24px;
        }
        
        .idea-title {
          font-size: 1.1rem;
          margin-bottom: 8px;
          font-family: var(--font-maven, sans-serif);
        }
        
        .tag-row { display: flex; gap: 8px; margin-bottom: 12px; }
        
        .priority-tag {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 6px;
          text-transform: uppercase;
        }
        .p-high { background: #fee2e2; color: #ef4444; }
        .p-medium { background: #ffedd5; color: #f59e0b; }
        .p-low { background: #f1f5f9; color: #64748b; }
        
        .audience-tag {
          font-size: 11px;
          background: var(--theme-primary-light);
          color: var(--theme-primary);
          padding: 3px 10px;
          border-radius: 6px;
          font-weight: 600;
        }
        
        .idea-description {
           font-size: 14px;
           color: var(--muted);
           line-height: 1.6;
           max-width: 800px;
        }

        .dashboard-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        
        .insight-section { padding: 24px; }
        .section-header {
           display: flex;
           justify-content: space-between;
           align-items: center;
           margin-bottom: 20px;
        }
        .badge-count {
           background: var(--soft);
           padding: 2px 10px;
           border-radius: 999px;
           font-size: 12px;
           font-weight: 600;
        }
        
        .suggestion-card, .gap-card {
           background: var(--bg);
           border: 1px solid var(--line);
           padding: 16px;
           border-radius: 14px;
           margin-bottom: 12px;
           transition: border-color 0.2s;
        }
        .suggestion-card:hover, .gap-card:hover { border-color: var(--palette-periwinkle); }
        
        .link-flow { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .pillar-link { font-weight: 700; color: var(--theme-primary); }
        .pillar-target { color: var(--text); font-weight: 600; }
        
        .gap-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .opp-score { color: var(--good); font-weight: 700; font-size: 12px; }
        
        .empty-state-card {
          padding: 60px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .large-icon { font-size: 3rem; margin-bottom: 12px; }
        .sub-empty { padding: 20px; text-align: center; color: var(--muted); border: 1px dashed var(--line); border-radius: 12px; font-size: 13px; }
      `}</style>
    </div>
  );
}
