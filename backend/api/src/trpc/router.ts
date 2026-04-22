import { z } from "zod";
import { router, publicProcedure, authProcedure } from "./trpc";
import { AIService } from "../services/ai";
import { DBService } from "../services/db";
import { checkRateLimit } from "../lib/rateLimit";
import { TRPCError } from "@trpc/server";
import { ProjectRecord, KeywordRecord, CompetitorGapRecord, ContentIdea } from "@threezinc/shared";

// ── Input schemas ──────────────────────────────────────────────────────────────

// Strip control characters + newlines that could break prompt structure
const safeString = (max: number) =>
  z.string().max(max).transform(s => s.replace(/[\x00-\x1F\x7F`{}\\]/g, " ").trim());

const KeywordSchema = z.object({
  id: safeString(100),
  keyword: safeString(200).pipe(z.string().min(1)),
  volume: z.number().int().min(0).max(10_000_000),
  difficulty: z.number().min(0).max(100),
  pillarTopic: safeString(200).optional(),
  primaryTheme: safeString(200).optional(),
  secondaryTheme: safeString(200).optional(),
  intent: z.enum(["Transactional", "Commercial", "Informational", "Navigational"]).optional(),
  aidaStage: z.enum(["Awareness", "Interest", "Desire", "Action"]).optional(),
  suggestedTitle: safeString(500).optional(),
  suggestedPageType: z.enum(["Blog", "Landing Page", "Product Page", "Guide"]).optional(),
  priority: z.number().min(0).max(10_000_000).optional(),
  cpc: z.number().optional(),
  serpData: z.any().optional(),
}).transform(({ serpData: _serpData, ...rest }) => rest);

const SerpDataSchema = z.object({
  keywordId: z.string().max(100),
  provider: z.string().max(50),
  fetchedAt: z.string().max(30),
  rank: z.number().int().min(1).max(100),
  title: z.string().max(500),
  url: z.string().url().max(2000),
  competitors: z.array(z.string().max(200)).max(20),
});

const PublicProjectSchema = z.object({
  id: safeString(100),
  name: safeString(200).pipe(z.string().min(1)),
  // userId from client is ignored — guests have no server-side identity
  keywords: z.array(KeywordSchema).max(2000),
  competitorKeywords: z.array(KeywordSchema).max(2000).optional(),
  clusters: z.any().optional(),
  linkSuggestions: z.any().optional(),
  gapAnalysisResults: z.any().optional(),
  userId: z.string().optional(),
  createdAt: z.string().max(30).optional(),
  updatedAt: z.string().max(30).optional(),
}).transform(({ clusters: _c, linkSuggestions: _l, gapAnalysisResults: _g, userId: _u, ...rest }) => rest);

// ── Router ─────────────────────────────────────────────────────────────────────

export const appRouter = router({
  projects: router({
    list: authProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.id;

      const { results } = await ctx.env.DB.prepare(
        "SELECT id, name, data, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC"
      )
        .bind(userId)
        .all<{ id: string; name: string; data: string; created_at: string; updated_at: string }>();

      return results.map((row) => ({
        ...JSON.parse(row.data),
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }),

    create: authProcedure
      .input(z.object({
        id: z.string().max(100),
        name: z.string().min(1).max(200),
        keywords: z.array(KeywordSchema).max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = new DBService(ctx.env);
        const now = new Date().toISOString();
        const project: ProjectRecord = {
          id: input.id,
          name: input.name,
          userId: ctx.user.id,
          createdAt: now,
          updatedAt: now,
          keywords: (input.keywords as KeywordRecord[]) || [],
          clusters: [],
        };
        await db.saveProject(project);
        return { success: true, id: project.id };
      }),

    process: authProcedure
      .input(z.object({ projectId: z.string().max(100) }))
      .mutation(async ({ ctx, input }) => {
        const db = new DBService(ctx.env);
        // Ownership check: only fetch project belonging to the calling user
        const project = await db.getProject(input.projectId, ctx.user.id);

        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        const ai = new AIService(ctx.env.GEMINI_API_KEY, (msg) => {
          notifyProgress(msg, ctx.env.REALTIME_URL, ctx.env.BROADCAST_SECRET);
        });
        const enrichedProject = await performAnalysis(project, ai, ctx.env.REALTIME_URL, ctx.env.BROADCAST_SECRET);

        await db.saveProject(enrichedProject);

        return {
          success: true,
          clusterCount: enrichedProject.clusters.length,
          linkCount: enrichedProject.linkSuggestions?.length ?? 0,
          gapCount: enrichedProject.gapAnalysisResults?.length ?? 0,
        };
      }),

    // Guest mode: accepts the full project payload instead of a DB id.
    // Strictly validated to prevent prompt injection and runaway API usage.
    processPublic: publicProcedure
      .input(z.object({ project: PublicProjectSchema }))
      .mutation(async ({ ctx, input }) => {
        // Rate limit: 5 analyses per IP per minute
        const ip = ctx.clientIp ?? "unknown";
        const { allowed } = await checkRateLimit(ctx.env.RATE_LIMIT, ip, 5);
        if (!allowed) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many requests. Please wait a moment before trying again.",
          });
        }
        try {
          // Explicitly set userId to "guest" — satisfies ProjectRecord type.
          // processPublic never calls saveProject, so this value is never written to DB.
          const now = new Date().toISOString();
          const project: ProjectRecord = {
            clusters: [],
            linkSuggestions: [],
            gapAnalysisResults: [],
            ...input.project,
            createdAt: input.project.createdAt ?? now,
            updatedAt: input.project.updatedAt ?? now,
            userId: "guest",
          };
        const ai = new AIService(ctx.env.GEMINI_API_KEY, (msg) => {
          notifyProgress(msg, ctx.env.REALTIME_URL, ctx.env.BROADCAST_SECRET);
        });
        const enrichedProject = await performAnalysis(project, ai, ctx.env.REALTIME_URL, ctx.env.BROADCAST_SECRET);
          return { project: enrichedProject };
        } catch (err: any) {
          console.error("[TRPC] processPublic Error:", err.message || err);
          // Do not leak internal error details to the client
          const isKnown = err instanceof TRPCError;
          throw new TRPCError({
            code: isKnown ? err.code : "INTERNAL_SERVER_ERROR",
            message: isKnown ? err.message : "Analysis failed. Please try again.",
          });
        }
      }),

    delete: authProcedure
      .input(z.object({ id: z.string().max(100) }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        await ctx.env.DB.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?")
          .bind(input.id, userId)
          .run();
        return { success: true };
      }),
  }),

  auth: router({
    // Returns the verified session user; null when unauthenticated.
    getSession: publicProcedure.query(({ ctx }) => {
      if (!ctx.userId) return { user: null };
      return { user: { id: ctx.userId } };
    }),
  }),

  serp: router({
    lookup: authProcedure
      .input(z.object({ keyword: z.string().min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        return { rank: 1, title: "Mock SERP Result", url: "https://example.com" };
      }),
  }),

  system: router({
    health: publicProcedure.query(async ({ ctx }) => {
      console.log("[AI] Health check triggered");
      const apiKey = ctx.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY" || apiKey.includes("PLACEHOLDER")) {
        console.warn("[AI] Health check failed: API key not configured");
        return { status: "error", message: "API key not configured." };
      }

      try {
        console.log(`[AI] Calling Gemini API (Key: ${apiKey.slice(0, 4)}...${apiKey.slice(-4)})`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash?key=${apiKey}`,
          {
            signal: AbortSignal.timeout(5_000),
          }
        );

        if (response.ok) {
          console.log("[AI] Health check OK");
          return { status: "ok" };
        }

        const errorData: any = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || response.statusText || "AI service unavailable.";
        console.error("[AI] Health check Gemini Error:", msg);
        return { status: "error", message: `Gemini API Error: ${msg}` };
      } catch (err: any) {
        console.error("[AI] Health check Connection Error:", err.message || err);
        return { status: "error", message: `AI connection error: ${err.message || 'Unknown'}` };
      }
    }),

    ready: publicProcedure.query(async ({ ctx }) => {
      try {
        await ctx.env.DB.prepare("SELECT 1").run();
        return { status: "ok" };
      } catch {
        return { status: "error", message: "Database unavailable." };
      }
    }),
  }),
});

async function performAnalysis(
  project: ProjectRecord,
  ai: AIService,
  realtimeUrl?: string,
  broadcastSecret?: string
): Promise<ProjectRecord> {
  await notifyProgress("Starting AI Keyword Analysis...", realtimeUrl, broadcastSecret);

  const batchSize = 50;
  const keywords = project.keywords.map(k => k.keyword);
  const enrichmentResults: Partial<KeywordRecord>[] = [];
  const allPillarIdeas: Record<string, ContentIdea[]> = {};

  const totalBatches = Math.ceil(keywords.length / batchSize);
  for (let i = 0; i < keywords.length; i += batchSize) {
    const currentBatchNum = Math.floor(i / batchSize) + 1;
    await notifyProgress(`Step 1/3: Strategic AI Analysis (Batch ${currentBatchNum}/${totalBatches})...`, realtimeUrl, broadcastSecret);

    const batch = keywords.slice(i, i + batchSize);
    const { enrichedKeywords, pillarContentIdeas } = await ai.getStrategicAnalysis(batch);

    enrichmentResults.push(...enrichedKeywords);
    Object.assign(allPillarIdeas, pillarContentIdeas);

    if (i + batchSize < keywords.length) {
      await new Promise(r => setTimeout(r, 3000)); // Increased delay for free tier quota
    }
  }

  project.keywords = project.keywords.map(k => {
    const analysis = enrichmentResults.find(r => r.keyword?.toLowerCase() === k.keyword.toLowerCase());
    const opportunityScore = Number((k.volume / (k.difficulty + 1)).toFixed(1));
    return {
      ...k,
      ...(analysis || {}),
      priority: opportunityScore,
      serpData: {
        keywordId: k.id,
        provider: "serpapi",
        fetchedAt: new Date().toISOString(),
        rank: Math.max(1, Math.min(20, Math.round(k.difficulty / 5) || 7)),
        title: k.keyword,
        url: `https://example.com/mock-serp`,
        competitors: ["competitorA.com", "competitorB.com"],
      },
    };
  });

  await notifyProgress("Step 2/3: Clustering keywords into semantic pillars...", realtimeUrl, broadcastSecret);
  const clusters = ai.clusterKeywords(project.keywords as KeywordRecord[]);

  await notifyProgress("Step 3/3: Mapping strategic content roadmaps...", realtimeUrl, broadcastSecret);
  clusters.forEach(cluster => {
    if (allPillarIdeas[cluster.pillar]) {
      cluster.contentIdeas = allPillarIdeas[cluster.pillar];
    }
  });

  const linkSuggestions = clusters.flatMap((cluster) =>
    cluster.keywords.slice(0, 2).map((keyword, index) => ({
      id: `${cluster.id}-link-${index}`,
      sourcePillar: cluster.pillar,
      targetCluster: keyword.primaryTheme || keyword.keyword,
      anchorText: keyword.keyword,
      rationale: `Use the pillar page on ${cluster.pillar} to link into the ${keyword.keyword} cluster and reinforce semantic depth.`,
    }))
  );

  const gapAnalysisResults =
    project.competitorKeywords && project.competitorKeywords.length > 0
      ? computeGapResults(project.keywords as KeywordRecord[], project.competitorKeywords as KeywordRecord[])
      : [];

  project.clusters = clusters;
  project.linkSuggestions = linkSuggestions;
  project.gapAnalysisResults = gapAnalysisResults;
  project.updatedAt = new Date().toISOString();

  await notifyProgress("Finalizing strategy and saving results...", realtimeUrl, broadcastSecret);

  return project;
}

async function notifyProgress(message: string, realtimeUrl?: string, broadcastSecret?: string) {
  if (!realtimeUrl || !broadcastSecret) return;
  try {
    await fetch(`${realtimeUrl}/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${broadcastSecret}`,
      },
      body: JSON.stringify({ type: "progress", message }),
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Non-fatal: realtime updates are best-effort
  }
}

function computeGapResults(
  primaryKeywords: KeywordRecord[],
  competitorKeywords: KeywordRecord[]
): CompetitorGapRecord[] {
  const primarySet = new Set(primaryKeywords.map((item) => item.keyword.toLowerCase()));
  const competitorSet = new Set(competitorKeywords.map((item) => item.keyword.toLowerCase()));
  const combined = Array.from(new Set([...primarySet, ...competitorSet]));

  return combined
    .map((keyword) => {
      const competitor = competitorKeywords.find((item) => item.keyword.toLowerCase() === keyword);
      const primary = primaryKeywords.find((item) => item.keyword.toLowerCase() === keyword);
      const inPrimaryCsv = primarySet.has(keyword);
      const inCompetitorCsv = competitorSet.has(keyword);
      const opportunityBase = competitor?.volume ?? primary?.volume ?? 0;

      return {
        keyword,
        inPrimaryCsv,
        inCompetitorCsv,
        opportunityScore: Number(
          (
            opportunityBase /
            ((competitor?.difficulty ?? primary?.difficulty ?? 0) + 1)
          ).toFixed(1)
        ),
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}

export type AppRouter = typeof appRouter;
