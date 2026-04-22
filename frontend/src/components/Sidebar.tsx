"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import type { View } from "./types";

interface SidebarProps {
  view: View;
  onChangeView: (view: View) => void;
}

export function Sidebar({ view, onChangeView }: SidebarProps) {
  const { data: session, status } = useSession();
  const user = session?.user;
  const loading = status === "loading";

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">TZ</div>
        <div>
          <p className="eyebrow">ThreeZinc</p>
          <h1>SEO Strategy</h1>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={view === "list" ? "nav-item active" : "nav-item"}
          onClick={() => onChangeView("list")}
        >
          Project Library
        </button>
        <button
          className={view === "upload" ? "nav-item active" : "nav-item"}
          onClick={() => onChangeView("upload")}
        >
          New Analysis
        </button>
      </nav>

      <section className="sidebar-auth">
        {loading ? (
          <div className="auth-card">
            <p className="muted" style={{ fontSize: 13 }}>Loading…</p>
          </div>
        ) : user ? (
          <div className="user-card">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name ?? "User"}
                className="user-avatar-img"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="user-avatar">{user.name?.slice(0, 1) ?? "U"}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="user-name">{user.name}</p>
              <p className="user-email">{user.email}</p>
            </div>
            <button
              className="ghost-button"
              style={{ fontSize: 12, padding: "4px 8px", flexShrink: 0 }}
              onClick={() => signOut()}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="auth-card">
            <p className="eyebrow">Sign in</p>
            <h3>Save your work</h3>
            <p className="muted">
              Projects and runs are saved to your account. Sign in with Google to
              keep your history across sessions.
            </p>
            <button
              className="primary-button full-width google-btn"
              onClick={() => signIn("google")}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>
        )}
      </section>

      <div className="sidebar-footer">
        <p>Stack</p>
        <span>Next.js · Cloudflare Workers · D1 · R2</span>
      </div>
    </aside>
  );
}
