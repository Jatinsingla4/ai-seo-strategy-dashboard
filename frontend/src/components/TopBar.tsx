import type { ProjectRecord } from "@threezinc/shared";
import type { View } from "./types";

interface TopBarProps {
  view: View;
  project: ProjectRecord;
  onNewAnalysis: () => void;
}

export function TopBar({ view, project, onNewAnalysis }: TopBarProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">ThreeZinc SEO Platform</p>
        <h2>
          {view === "list" && "Project Library"}
          {view === "upload" && "Create New Analysis"}
          {view === "dashboard" && project.name}
        </h2>
      </div>
      {view === "dashboard" ? (
        <div className="topbar-meta">
          <span>
            {project.keywords.length} keywords · {project.clusters.length} clusters
          </span>
          <span>Created: {project.createdAt ? project.createdAt.slice(0, 10) : "N/A"}</span>
          <button className="primary-button" onClick={onNewAnalysis}>
            New Analysis
          </button>
        </div>
      ) : null}
    </header>
  );
}
