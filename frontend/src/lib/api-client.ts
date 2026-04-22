import type { ProjectRecord } from "@threezinc/shared";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export async function fetchProjects(userId: string): Promise<ProjectRecord[]> {
  const res = await fetch(`${BASE}/api/projects?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`fetchProjects failed: ${res.status}`);
  return res.json();
}

export async function saveProject(project: ProjectRecord): Promise<void> {
  const res = await fetch(`${BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error(`saveProject failed: ${res.status}`);
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`deleteProject failed: ${res.status}`);
}
