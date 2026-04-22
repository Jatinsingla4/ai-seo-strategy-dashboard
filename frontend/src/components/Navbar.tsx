"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import type { ProjectRecord } from "@threezinc/shared";
import type { View } from "./types";

import { trpc } from "../lib/trpc";

interface NavbarProps {
  view: View;
  project: ProjectRecord | null;
  onChangeView: (view: View) => void;
  onNewAnalysis: () => void;
}

export function Navbar({ view, project, onChangeView, onNewAnalysis }: NavbarProps) {
  const { data: session, status } = useSession();
  const user = session?.user;
  const loading = status === "loading";

  // AI Health Check
  const aiHealth = trpc.system.health.useQuery(undefined, {
    refetchInterval: 120000, 
    retry: 1,
  });

  // Root Work: Debug AI Status
  if (typeof window !== "undefined") {
    (window as any).debugAI = { status: aiHealth.status, data: aiHealth.data, error: aiHealth.error };
  }

  const aiStatus = aiHealth.status === "pending" ? "loading" : (aiHealth.data?.status || "error");
  const aiMessage = aiHealth.status === "pending" 
    ? "Checking AI Status..." 
    : (aiHealth.data?.message || (aiHealth.status === "error" ? "AI Connection Failed" : "AI Offline"));

  return (
    <header className="navbar">
      {/* Brand */}
      <div className="navbar-brand" onClick={() => onChangeView("dashboard")} style={{ cursor: "pointer" }}>
        <div className="brand-mark">TZ</div>
        <div className="navbar-brand-text">
          <span className="navbar-brand-name">ThreeZinc</span>
          <span className="navbar-brand-sub">SEO Strategy</span>
        </div>
        <div 
          className={`ai-status-badge ${aiStatus}`} 
          title={aiMessage}
          onClick={(e) => {
            e.stopPropagation();
            alert(`AI Status: ${aiMessage}`);
          }}
        >
          <span className="status-dot"></span>
          AI {aiStatus === "ok" ? "Online" : aiStatus === "error" ? "Offline" : "Checking..."}
        </div>
      </div>

      {/* Nav links */}
      <nav className="navbar-nav">
        <button
          className={`navbar-link${view === "list" ? " active" : ""}`}
          onClick={() => onChangeView("list")}
        >
          Projects
        </button>
        {project && view === "dashboard" && (
          <button className="navbar-link active" onClick={() => onChangeView("dashboard")}>
            {project.name}
          </button>
        )}
      </nav>

      {/* Right: project meta + auth */}
      <div className="navbar-right">
        {view === "dashboard" && project && (
          <div className="navbar-project-meta">
            <span>{project.keywords.length} keywords</span>
            <span className="navbar-dot">·</span>
            <span>{project.clusters.length} clusters</span>
          </div>
        )}

        {/* Always show New Analysis if guest or on list view to prevent getting stuck */}
        {(!session || view === "list" || view === "dashboard") && (
          <button className="primary-button" onClick={onNewAnalysis}>
            + New Analysis
          </button>
        )}

        {/* Auth */}
        {loading ? null : user ? (
          <div className="navbar-user">
            {user.image ? (
              <img src={user.image} alt={user.name ?? "User"} className="navbar-avatar" referrerPolicy="no-referrer" />
            ) : (
              <div className="navbar-avatar navbar-avatar-placeholder">
                {user.name?.slice(0, 1) ?? "U"}
              </div>
            )}
            <div className="navbar-user-info">
              <span className="navbar-user-name">{user.name}</span>
            </div>
            <button className="ghost-button navbar-signout" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        ) : (
          <button className="navbar-signin-btn" onClick={() => signIn("google")}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        )}
      </div>
      <style jsx>{`
        .ai-status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          margin-left: 12px;
          background: rgba(var(--accent-rgb), 0.05);
          border: 1px solid rgba(var(--accent-rgb), 0.1);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ai-status-badge.ok {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        .ai-status-badge.error {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        .ai-status-badge.loading {
          opacity: 0.6;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .ai-status-badge.ok .status-dot {
          box-shadow: 0 0 8px #10b981;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
      `}</style>
    </header>
  );
}
