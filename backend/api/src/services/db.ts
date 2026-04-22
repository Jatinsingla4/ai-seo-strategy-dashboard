import { ProjectRecord, KeywordRecord, ClusterRecord } from "@threezinc/shared";
import { Env } from "../index";

export class DBService {
  constructor(private env: Env) {}

  async getProject(id: string, userId: string): Promise<ProjectRecord | null> {
    const { results } = await this.env.DB.prepare(
      "SELECT id, name, data, created_at, updated_at FROM projects WHERE id = ? AND user_id = ?"
    )
      .bind(id, userId)
      .all<{ id: string; name: string; data: string; created_at: string; updated_at: string }>();

    if (results.length === 0) return null;

    const row = results[0];
    return {
      ...JSON.parse(row.data),
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async saveProject(project: ProjectRecord): Promise<void> {
    if (!project.userId) throw new Error("saveProject: userId is required");
    const now = new Date().toISOString();
    await this.env.DB.prepare(
      `INSERT INTO projects (id, user_id, name, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         data = excluded.data,
         updated_at = excluded.updated_at
       WHERE user_id = excluded.user_id`
    )
      .bind(
        project.id,
        project.userId,
        project.name,
        JSON.stringify(project),
        project.createdAt || now,
        now
      )
      .run();
  }

  async deleteProject(id: string, userId: string): Promise<void> {
    await this.env.DB.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .run();
  }
}
