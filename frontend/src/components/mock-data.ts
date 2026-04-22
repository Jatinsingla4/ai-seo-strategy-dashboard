import type {
  ClusterRecord,
  CompetitorGapRecord,
  LinkSuggestion,
  ProjectRecord,
  PromptTemplate,
  UserRecord,
} from "@threezinc/shared";

export const mockUser: UserRecord = {
  id: "user_demo",
  email: "demo@threezinc.com",
  name: "Demo User",
  image: "https://placehold.co/64x64",
  createdAt: "2026-04-14T10:00:00.000Z",
};

export const mockPrompts: PromptTemplate[] = [
  {
    id: "prompt_default_v1",
    projectId: "proj_demo",
    userId: "user_demo",
    name: "Default Clustering Prompt",
    systemPrompt:
      "Cluster by semantic meaning, assign intent and AIDA stage, and suggest SEO titles and page types.",
    version: 1,
    isDefault: true,
    createdAt: "2026-04-14T10:00:00.000Z",
  },
  {
    id: "prompt_conversion_v2",
    projectId: "proj_demo",
    userId: "user_demo",
    name: "Conversion-Focused Prompt",
    systemPrompt:
      "Bias clustering toward commercial and action-stage opportunities while preserving topical authority.",
    version: 2,
    isDefault: false,
    createdAt: "2026-04-14T10:10:00.000Z",
  },
];

export const mockLinkSuggestions: LinkSuggestion[] = [
  {
    sourcePillar: "AI SEO",
    targetCluster: "AI SEO tools",
    anchorText: "best AI SEO tools",
    rationale: "Commercial intent cluster supports the pillar and shortens the path to evaluation content.",
  },
  {
    sourcePillar: "AI SEO",
    targetCluster: "internal linking automation",
    anchorText: "internal linking automation workflow",
    rationale: "Implementation cluster strengthens authority and cross-links to roadmap content.",
  },
];

export const mockGapResults: CompetitorGapRecord[] = [
  {
    keyword: "ai seo internal linking",
    inPrimaryCsv: false,
    inCompetitorCsv: true,
    opportunityScore: 88,
  },
  {
    keyword: "semantic content gap analysis",
    inPrimaryCsv: false,
    inCompetitorCsv: true,
    opportunityScore: 81,
  },
  {
    keyword: "semantic clustering workflow",
    inPrimaryCsv: true,
    inCompetitorCsv: true,
    opportunityScore: 42,
  },
];

const clusters: ClusterRecord[] = [
  {
    id: "cluster_ai_seo",
    pillar: "AI SEO",
    totalVolume: 94200,
    avgDifficulty: 32,
    linkSuggestions: mockLinkSuggestions,
    keywords: [
      {
        id: "kw_1",
        keyword: "ai seo tools",
        volume: 22000,
        difficulty: 38,
        cpc: 7.4,
        priority: 564.1,
        intent: "Commercial",
        aidaStage: "Interest",
        pillarTopic: "AI SEO",
        primaryTheme: "tool comparison",
        secondaryTheme: "evaluation",
        suggestedTitle: "Best AI SEO Tools for Modern Content Teams",
        suggestedPageType: "Landing Page",
        serpData: {
          keywordId: "kw_1",
          provider: "serpapi",
          fetchedAt: "2026-04-14T10:00:00.000Z",
          rank: 4,
          title: "Best AI SEO Tools in 2026",
          url: "https://example.com/best-ai-seo-tools",
          competitors: ["competitor-a.com", "competitor-b.com"],
        },
      },
      {
        id: "kw_2",
        keyword: "ai seo workflow",
        volume: 14800,
        difficulty: 29,
        cpc: 5.1,
        priority: 493.3,
        intent: "Informational",
        aidaStage: "Awareness",
        pillarTopic: "AI SEO",
        primaryTheme: "process design",
        secondaryTheme: "workflow",
        suggestedTitle: "How to Build an AI SEO Workflow That Scales",
        suggestedPageType: "Guide",
      },
      {
        id: "kw_3",
        keyword: "ai seo internal linking",
        volume: 6800,
        difficulty: 24,
        cpc: 4.2,
        priority: 272,
        intent: "Informational",
        aidaStage: "Desire",
        pillarTopic: "AI SEO",
        primaryTheme: "internal linking",
        secondaryTheme: "automation",
        suggestedTitle: "AI SEO Internal Linking Tactics That Actually Work",
        suggestedPageType: "Blog",
      },
    ],
    contentIdeas: [
      {
        title: "The Complete Pillar Guide to AI SEO Workflows",
        description: "A broad pillar page designed to support multiple internal cluster links.",
        targetAudience: "Content strategists and SEO leads",
        priority: "High",
      },
      {
        title: "How to Build an Internal Linking Engine from Keyword Clusters",
        description: "An execution-focused article tying authority mapping to page architecture.",
        targetAudience: "SEO managers and content ops teams",
        priority: "High",
      },
    ],
  },
  {
    id: "cluster_content_ops",
    pillar: "Content Operations",
    totalVolume: 61200,
    avgDifficulty: 37,
    keywords: [
      {
        id: "kw_4",
        keyword: "content ops framework",
        volume: 9600,
        difficulty: 31,
        cpc: 3.6,
        priority: 300,
        intent: "Informational",
        aidaStage: "Awareness",
        pillarTopic: "Content Operations",
        primaryTheme: "workflow",
        secondaryTheme: "team design",
        suggestedTitle: "Content Ops Frameworks for Scaling SEO Teams",
        suggestedPageType: "Guide",
      },
      {
        id: "kw_5",
        keyword: "seo content production system",
        volume: 7400,
        difficulty: 43,
        cpc: 4.8,
        priority: 168.2,
        intent: "Commercial",
        aidaStage: "Interest",
        pillarTopic: "Content Operations",
        primaryTheme: "production systems",
        secondaryTheme: "team execution",
        suggestedTitle: "Building an SEO Content Production System",
        suggestedPageType: "Blog",
      },
    ],
    contentIdeas: [
      {
        title: "Content Ops Systems Every SEO Team Should Standardize",
        description: "A cluster article focused on operational maturity and repeatable publishing systems.",
        targetAudience: "Heads of content and editorial operations",
        priority: "Medium",
      },
    ],
  },
];

export const mockProject: ProjectRecord = {
  id: "proj_demo",
  userId: "user_demo",
  name: "Q2 SEO Opportunity Map",
  createdAt: "2026-04-14T10:00:00.000Z",
  updatedAt: "2026-04-14T10:00:00.000Z",
  sourceFilename: "keywords.csv",
  competitorFilename: "competitor-keywords.csv",
  keywords: clusters.flatMap((cluster) => cluster.keywords),
  clusters,
  promptTemplate: mockPrompts[0],
};

export const mockProjects: ProjectRecord[] = [mockProject];
