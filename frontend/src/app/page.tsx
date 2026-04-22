"use client";

import type { ProjectRecord } from "@threezinc/shared";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Dashboard } from "../components/Dashboard";
import { Navbar } from "../components/Navbar";
import { ProjectLibrary } from "../components/ProjectLibrary";
import type { View } from "../components/types";
import { UploadPanel } from "../components/UploadPanel";
import { trpc } from "../lib/trpc";



export default function HomePage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? "guest";
  const authReady = status !== "loading";

  const [view, setView] = useState<View>("dashboard");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [localProject, setLocalProject] = useState<ProjectRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState("Artificial Intelligence is analyzing your keywords...");

  // WebSocket for Realtime Progress
  useEffect(() => {
    const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL ?? "ws://127.0.0.1:8788";
    const ws = new WebSocket(realtimeUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "progress") {
          setStatusMessage(data.message);
        }
      } catch (e) {
        // Not JSON or unknown format
      }
    };

    return () => ws.close();
  }, []);

  // tRPC Queries
  const projectList = trpc.projects.list.useQuery(undefined, {
    enabled: authReady && !!session,
  });

  const processMutation = trpc.projects.process.useMutation({
    onSuccess: () => {
      projectList.refetch();
    },
  });

  const processPublicMutation = trpc.projects.processPublic.useMutation({
    onSuccess: (data) => {
      setLocalProject(data.project);
    },
  });

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      projectList.refetch();
    }
  });

  const projects = (projectList.data as ProjectRecord[]) ?? [];
  
  // activeProject logic: prioritize local project, then projects from list
  const activeProject = localProject || projects.find((p: ProjectRecord) => p.id === activeProjectId) || projects[0] || null;

  // Set initial view and active project
  useEffect(() => {
    if (!authReady) return;

    // Only perform automatic redirects if we are in a 'default' state (no active project/local project)
    if (!session && !localProject) {
      if (view !== "upload") setView("upload");
    } else if (projectList.isSuccess && projects.length > 0 && !activeProjectId && !localProject) {
      // ONLY redirect to list if we are not already on an intentional screen like 'upload'
      if (view !== "list" && view !== "upload" && view !== "dashboard") {
        setView("list");
      }
    } else if (projectList.isSuccess && projects.length === 0 && !localProject) {
      if (view !== "upload") setView("upload");
    }
  }, [authReady, session, localProject, projectList.isSuccess, projects.length, activeProjectId, view]);

  function handleUploadComplete(project: ProjectRecord) {
    if (project.id.startsWith("local_")) {
      setLocalProject(project);
      setActiveProjectId(null);
      // Auto-trigger for guests
      processPublicMutation.mutate({ project });
    } else {
      setLocalProject(project); // Set as local buffer so it opens immediately
      projectList.refetch();
      setActiveProjectId(project.id);
      // Auto-trigger for auth users
      processMutation.mutate({ projectId: project.id });
    }
    setView("dashboard");
  }

  function handleOpenProject(project: ProjectRecord) {
    setLocalProject(null);
    setActiveProjectId(project.id);
    setView("dashboard");
  }

  function handleNewAnalysis() {
    setLocalProject(null);
    setActiveProjectId(null);
    setView("upload");
  }

  function handleDeleteProject(id: string) {
    deleteMutation.mutate({ id });
    if (activeProjectId === id) {
      setActiveProjectId(null);
    }
  }

  function handleProcessProject() {
    if (!activeProject) return;
    
    if (activeProject.id.startsWith("local_")) {
      processPublicMutation.mutate({ project: activeProject });
    } else {
      processMutation.mutate({ projectId: activeProject.id });
    }
  }

  const isPending = processMutation.isPending || processPublicMutation.isPending;
  const showDashboard = view === "dashboard" && activeProject;

  return (
    <div className="app-shell">
      <Navbar
        view={view}
        project={activeProject}
        onChangeView={setView}
        onNewAnalysis={handleNewAnalysis}
      />

      <main className="main-content">
        <section className="content-area">
          {view === "list" ? (
            <ProjectLibrary
              projects={projects}
              activeProjectId={activeProject?.id}
              onOpen={handleOpenProject}
              onDelete={handleDeleteProject}
              onNew={handleNewAnalysis}
            />
          ) : null}
          {view === "upload" ? (
            <UploadPanel onComplete={handleUploadComplete} />
          ) : null}
          {showDashboard ? (
            <div className="dashboard-container">
              {isPending && (
                <div className="processing-overlay">
                  <div className="loader"></div>
                  <p>{statusMessage}</p>
                </div>
              )}
              
              <Dashboard
                project={activeProject}
                linkSuggestions={activeProject.linkSuggestions ?? []}
                gapResults={activeProject.gapAnalysisResults ?? []}
              />
            </div>
          ) : null}
        </section>
      </main>

      <style jsx>{`
        .dashboard-container {
          position: relative;
          height: 100%;
        }
        .processing-overlay {
          position: absolute;
          inset: 0;
          background: rgba(var(--background-rgb), 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 100;
          border-radius: 12px;
        }
        .loader {
          border: 4px solid rgba(var(--accent-rgb), 0.1);
          border-top: 4px solid var(--accent);
          border-radius: 50%;
          width: 48px;
          height: 48px;
          animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          margin-bottom: 1.5rem;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .analysis-cta {
          padding: 4rem 2rem;
          text-align: center;
          background: linear-gradient(135deg, var(--card-bg) 0%, rgba(var(--accent-rgb), 0.05) 100%);
          border: 1px solid rgba(var(--accent-rgb), 0.2);
          margin-bottom: 2rem;
          display: flex;
          justify-content: center;
        }
        .cta-content {
          max-width: 500px;
        }
        .cta-content h2 {
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        .cta-content p {
          font-size: 1.1rem;
          margin-bottom: 2rem;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
