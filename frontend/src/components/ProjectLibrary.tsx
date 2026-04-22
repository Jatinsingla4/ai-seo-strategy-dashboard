import { signIn, useSession } from "next-auth/react";
import type { ProjectRecord } from "@threezinc/shared";

interface ProjectLibraryProps {
  projects: ProjectRecord[];
  activeProjectId?: string;
  onOpen: (project: ProjectRecord) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function ProjectLibrary({ projects, activeProjectId, onOpen, onDelete, onNew }: ProjectLibraryProps) {
  const { data: session } = useSession();

  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon-badge large">🗂️</div>
        <h2>No Projects Found</h2>
        {!session ? (
          <>
            <p className="muted">You are currently in <strong>Guest Mode</strong>. Projects created here are not saved to the library.</p>
            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button className="primary-button" onClick={() => signIn("google")}>
                Sign in to save projects
              </button>
              <button className="secondary-button" onClick={onNew}>
                Try as Guest
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">Upload a keyword CSV to start building your library.</p>
            <button className="primary-button" onClick={onNew} style={{ marginTop: 20 }}>
              + Create First Project
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="project-grid">
      {/* New Project Action Card */}
      <article
        className="card project-card new-project-card"
        onClick={onNew}
        style={{ cursor: "pointer" }}
      >
        <div className="new-project-content">
          <div className="plus-icon">+</div>
          <span>Create New Project</span>
        </div>
      </article>

      {projects.map((project) => (
        <article
          key={project.id}
          className={`card project-card ${project.id === activeProjectId ? "selected" : ""}`}
          onClick={() => onOpen(project)}
          style={{ cursor: "pointer" }}
        >
          <div className="project-card-header">
            <div className="icon-badge">SE</div>
            <button
              className="ghost-button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project.id);
              }}
            >
              Delete
            </button>
          </div>
          <h3>{project.name}</h3>
          <p className="muted">Created on {project.createdAt.slice(0, 10)}</p>
          {project.sourceFilename ? (
            <p className="muted" style={{ fontSize: 13 }}>
              {project.sourceFilename}
              {project.competitorFilename ? ` + ${project.competitorFilename}` : ""}
            </p>
          ) : null}
          <div className="project-stats">
            <div>
              <span>Keywords</span>
              <strong>{project.keywords.length}</strong>
            </div>
            <div>
              <span>Clusters</span>
              <strong>{project.clusters.length}</strong>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
