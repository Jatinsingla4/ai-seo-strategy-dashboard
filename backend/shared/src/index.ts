export type SerpProvider = "serpapi" | "zenserp";
export type AIProvider = "openai" | "anthropic" | "gemini" | "runpod";
export type SearchIntent =
  | "Transactional"
  | "Commercial"
  | "Informational"
  | "Navigational";
export type AIDAMarketingStage =
  | "Awareness"
  | "Interest"
  | "Desire"
  | "Action";

export interface KeywordRecord {
  id: string;
  keyword: string;
  volume: number;
  difficulty: number;
  cpc?: number;
  priority?: number;
  intent?: SearchIntent;
  aidaStage?: AIDAMarketingStage;
  primaryTheme?: string;
  secondaryTheme?: string;
  pillarTopic?: string;
  suggestedTitle?: string;
  suggestedPageType?: "Blog" | "Landing Page" | "Product Page" | "Guide";
  serpData?: SerpSnapshot;
}

export interface SerpSnapshot {
  id?: string;
  keywordId: string;
  provider: SerpProvider;
  fetchedAt: string;
  rank?: number;
  title?: string;
  url?: string;
  competitors: string[];
}

export interface CompetitorGapRecord {
  keyword: string;
  inPrimaryCsv: boolean;
  inCompetitorCsv: boolean;
  opportunityScore: number;
}

export interface PromptTemplate {
  id: string;
  projectId?: string;
  userId?: string;
  name: string;
  systemPrompt: string;
  version: number;
  isDefault?: boolean;
  createdAt: string;
}

export interface LinkSuggestion {
  id?: string;
  sourcePillar: string;
  targetCluster: string;
  anchorText: string;
  rationale: string;
}

export interface ContentIdea {
  id?: string;
  title: string;
  description: string;
  targetAudience: string;
  priority: "High" | "Medium" | "Low";
}

export interface ClusterRecord {
  id: string;
  pillar: string;
  keywords: KeywordRecord[];
  totalVolume: number;
  avgDifficulty: number;
  contentIdeas: ContentIdea[];
  linkSuggestions?: LinkSuggestion[];
}

export interface ProjectRecord {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sourceFilename?: string;
  competitorFilename?: string;
  keywords: KeywordRecord[];
  clusters: ClusterRecord[];
  competitorKeywords?: KeywordRecord[];
  gapAnalysisResults?: CompetitorGapRecord[];
  linkSuggestions?: LinkSuggestion[];
  promptTemplates?: PromptTemplate[];
  promptTemplate?: PromptTemplate;
}

export interface UserRecord {
  id: string;
  email: string;
  name?: string;
  image?: string;
  createdAt: string;
}

export interface AuthSession {
  user: UserRecord;
  expiresAt: string;
}

export interface ProjectHistoryEvent {
  id: string;
  projectId: string;
  userId: string;
  eventType: string;
  message: string;
  createdAt: string;
  metadataJson: string;
}

export interface UploadBundle {
  primaryCsvKey: string;
  competitorCsvKey?: string;
}

export interface FeatureFlags {
  googleAuth: boolean;
  serpIntegration: boolean;
  internalLinking: boolean;
  competitorGapAnalysis: boolean;
  persistentProjects: boolean;
  customPrompting: boolean;
}

export type DashboardTab =
  | "strategy"
  | "authority"
  | "roadmap"
  | "analytics";

export interface LegacyFlowContract {
  primaryViews: Array<"list" | "upload" | "dashboard">;
  dashboardTabs: DashboardTab[];
  preserveVisualParity: boolean;
}

export const legacyFlowContract: LegacyFlowContract = {
  primaryViews: ["list", "upload", "dashboard"],
  dashboardTabs: ["strategy", "authority", "roadmap", "analytics"],
  preserveVisualParity: true,
};

export const defaultFeatureFlags: FeatureFlags = {
  googleAuth: true,
  serpIntegration: true,
  internalLinking: true,
  competitorGapAnalysis: true,
  persistentProjects: true,
  customPrompting: false,
};
