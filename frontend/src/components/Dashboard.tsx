"use client";

import { useState } from "react";
import type {
  CompetitorGapRecord,
  LinkSuggestion,
  ProjectRecord,
} from "@threezinc/shared";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { AuthorityPanel } from "./AuthorityPanel";
import { KeywordStrategyTable } from "./KeywordStrategyTable";
import { RoadmapPanel } from "./RoadmapPanel";
import type { Tab } from "./types";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "strategy", label: "Keyword Strategy" },
  { id: "authority", label: "Topic Authority" },
  { id: "roadmap", label: "Content Roadmap" },
  { id: "analytics", label: "Interactive Analytics" },
];

interface DashboardProps {
  project: ProjectRecord;
  linkSuggestions: LinkSuggestion[];
  gapResults: CompetitorGapRecord[];
}

export function Dashboard({
  project,
  linkSuggestions,
  gapResults,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("strategy");
  const [focusedPillar, setFocusedPillar] = useState<string | null>(null);

  const totalVolume = project.keywords.reduce((sum, kw) => sum + kw.volume, 0);
  const avgDiff =
    project.keywords.length > 0
      ? Math.round(
          project.keywords.reduce((sum, kw) => sum + kw.difficulty, 0) /
            project.keywords.length,
        )
      : 0;

  function handleFocusPillar(pillar: string) {
    setFocusedPillar(pillar);
    setActiveTab("strategy");
  }

  return (
    <div className="dashboard-stack">
      <section className="stat-grid">
        <article className="card stat-card">
          <span>Total Keywords</span>
          <strong>{project.keywords.length.toLocaleString()}</strong>
        </article>
        <article className="card stat-card">
          <span>Topical Clusters</span>
          <strong>{project.clusters.length}</strong>
        </article>
        <article className="card stat-card">
          <span>Total Search Volume</span>
          <strong>{totalVolume.toLocaleString()}</strong>
        </article>
        <article className="card stat-card">
          <span>Avg. Difficulty</span>
          <strong>{avgDiff}</strong>
        </article>
      </section>

      <section className="tab-strip">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "tab active" : "tab"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      <section className="card dashboard-panel">
        {activeTab === "strategy" ? (
          <KeywordStrategyTable 
            keywords={project.keywords} 
            focusedPillar={focusedPillar}
            onClearPillar={() => setFocusedPillar(null)}
          />
        ) : null}
        {activeTab === "authority" ? (
          <AuthorityPanel 
            clusters={project.clusters} 
            onFocus={handleFocusPillar}
          />
        ) : null}
        {activeTab === "roadmap" ? (
          <RoadmapPanel
            clusters={project.clusters}
            gapResults={gapResults}
            linkSuggestions={linkSuggestions}
          />
        ) : null}
        {activeTab === "analytics" ? (
          <AnalyticsPanel 
            keywords={project.keywords} 
            clusters={project.clusters}
          />
        ) : null}
      </section>

    </div>
  );
}
