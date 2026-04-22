import type {
  AIDAMarketingStage,
  ClusterRecord,
  CompetitorGapRecord,
  ContentIdea,
  KeywordRecord,
  LinkSuggestion,
  PromptTemplate,
  ProjectRecord,
  SearchIntent,
  SerpSnapshot,
} from "@threezinc/shared";
import { numeric, parseCsv, type CsvRow } from "./csv";

const STOP_WORDS = new Set([
  "for",
  "and",
  "the",
  "with",
  "best",
  "guide",
  "tools",
  "tool",
  "software",
  "services",
  "service",
  "how",
  "what",
  "why",
  "2026",
  "2025",
]);

const DEFAULT_PROMPT = "Cluster by semantic meaning, map intent and AIDA stage, and generate SEO roadmap ideas.";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function sentenceCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}



export function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

function deriveIntent(keyword: string): SearchIntent {
  const lower = keyword.toLowerCase();
  if (/\b(buy|price|pricing|cost|agency|service|hire|demo)\b/.test(lower)) {
    return "Transactional";
  }
  if (/\b(best|top|compare|comparison|review|reviews|software|tool|tools|platform)\b/.test(lower)) {
    return "Commercial";
  }
  if (/\b(login|near me|brand|homepage|website)\b/.test(lower)) {
    return "Navigational";
  }
  return "Informational";
}

function deriveAidaStage(intent: SearchIntent, keyword: string): AIDAMarketingStage {
  const lower = keyword.toLowerCase();
  if (intent === "Transactional" || /\b(book|demo|trial|buy|pricing)\b/.test(lower)) {
    return "Action";
  }
  if (intent === "Commercial") {
    return "Desire";
  }
  if (/\b(compare|template|workflow|process|strategy)\b/.test(lower)) {
    return "Interest";
  }
  return "Awareness";
}

function deriveTopicTokens(keyword: string) {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word));
}

function derivePillarTopic(keyword: string) {
  const tokens = deriveTopicTokens(keyword);
  if (tokens.length === 0) {
    return "Uncategorized";
  }

  return sentenceCase(tokens.slice(0, Math.min(2, tokens.length)).join(" "));
}

function deriveThemes(keyword: string) {
  const tokens = deriveTopicTokens(keyword);
  return {
    primaryTheme: sentenceCase(tokens.slice(0, 2).join(" ")) || "General SEO",
    secondaryTheme: sentenceCase(tokens.slice(2, 4).join(" ")) || "Execution",
  };
}

function derivePageType(intent: SearchIntent) {
  if (intent === "Transactional") return "Landing Page";
  if (intent === "Commercial") return "Product Page";
  return "Blog";
}

function deriveTitle(keyword: string, promptText: string) {
  const lead = /conversion/i.test(promptText)
    ? "Best"
    : /authority/i.test(promptText)
      ? "Complete Guide to"
      : "How to Use";
  return `${lead} ${sentenceCase(keyword)}`;
}

export function buildKeywordRecords(rows: CsvRow[], promptText = DEFAULT_PROMPT): KeywordRecord[] {
  const getVal = (row: CsvRow, keys: string[]) => {
    const rowKeys = Object.keys(row);
    const foundKey = rowKeys.find(rk => {
      const normalized = rk.toLowerCase().replace(/[^a-z0-9]/g, "");
      return keys.some(k => normalized.includes(k.toLowerCase().replace(/[^a-z0-9]/g, "")));
    });
    return foundKey ? row[foundKey] : "0";
  };

  const getKeyword = (row: CsvRow) => {
    const rowKeys = Object.keys(row);
    const foundKey = rowKeys.find(rk => {
      const normalized = rk.toLowerCase().replace(/[^a-z0-9]/g, "");
      return ["keyword", "query", "term", "searchterm"].some(k => normalized.includes(k));
    });
    return (foundKey ? row[foundKey] : "").trim();
  };

  return rows
    .filter((row) => getKeyword(row))
    .map((row, index) => {
      const keyword = getKeyword(row);
      let volume = numeric(getVal(row, ["volume", "searchvolume", "vol"]));
      let difficulty = numeric(getVal(row, ["difficulty", "kd", "competition", "keyworddifficulty"]));

      // If missing from CSV, provide smart defaults so the dashboard works
      if (volume === 0) volume = 100; 
      if (difficulty === 0) difficulty = 30;

      const cpc = numeric(getVal(row, ["cpc", "costperclick"]));
      const intent = deriveIntent(keyword);
      const { primaryTheme, secondaryTheme } = deriveThemes(keyword);

      return {
        id: `${slugify(keyword)}-${index}`,
        keyword,
        volume,
        difficulty,
        cpc,
        priority: Number((volume / (difficulty + 1)).toFixed(1)),
        intent,
        aidaStage: deriveAidaStage(intent, keyword),
        pillarTopic: derivePillarTopic(keyword),
        primaryTheme,
        secondaryTheme,
        suggestedTitle: deriveTitle(keyword, promptText),
        suggestedPageType: derivePageType(intent),
        serpData: {
          keywordId: `${slugify(keyword)}-${index}`,
          provider: "serpapi",
          fetchedAt: new Date().toISOString(),
          rank: Math.max(1, Math.min(20, Math.round(difficulty / 5) || 7)),
          title: keyword,
          url: `https://example.com/${slugify(keyword)}`,
          competitors: ["competitor1.com", "competitor2.com"]
        }
      };
    });
}

function buildContentIdeasForCluster(cluster: ClusterRecord, promptText: string): ContentIdea[] {
  const keywordSamples = cluster.keywords.slice(0, 3).map((item) => item.keyword);
  const emphasis = /conversion/i.test(promptText)
    ? "that converts high-intent traffic"
    : /authority/i.test(promptText)
      ? "to build topical authority"
      : "for your content roadmap";

  return [
    {
      title: `The Complete ${cluster.pillar} Guide ${emphasis}`,
      description: `A pillar page covering ${keywordSamples.join(", ")} and related queries in one structured resource.`,
      targetAudience: "SEO leads and content strategists",
      priority: "High",
    },
    {
      title: `${cluster.pillar}: Best Practices, Examples, and Execution Steps`,
      description: `A mid-funnel resource designed to support internal links from the pillar to cluster pages.`,
      targetAudience: "Marketing managers and operators",
      priority: "Medium",
    },
    {
      title: `Quick Wins in ${cluster.pillar} for the Next Quarter`,
      description: `A planning-focused article prioritizing lower-difficulty terms inside the cluster.`,
      targetAudience: "Growth teams and SEO managers",
      priority: "Low",
    },
  ];
}

export function clusterKeywords(keywords: KeywordRecord[], promptText = DEFAULT_PROMPT): ClusterRecord[] {
  const clusterMap = new Map<string, KeywordRecord[]>();

  for (const keyword of keywords) {
    const pillar = keyword.pillarTopic || "Uncategorized";
    const existing = clusterMap.get(pillar) ?? [];
    existing.push(keyword);
    clusterMap.set(pillar, existing);
  }

  return Array.from(clusterMap.entries())
    .map(([pillar, clusterKeywords], index) => {
      const cluster: ClusterRecord = {
        id: `cluster-${slugify(pillar)}-${index}`,
        pillar,
        keywords: clusterKeywords.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
        totalVolume: clusterKeywords.reduce((sum, item) => sum + item.volume, 0),
        avgDifficulty: Number(
          (
            clusterKeywords.reduce((sum, item) => sum + item.difficulty, 0) /
            Math.max(clusterKeywords.length, 1)
          ).toFixed(1),
        ),
        contentIdeas: [],
      };

      cluster.contentIdeas = buildContentIdeasForCluster(cluster, promptText);
      return cluster;
    })
    .sort((a, b) => b.totalVolume - a.totalVolume);
}

export function buildLinkSuggestions(clusters: ClusterRecord[]): LinkSuggestion[] {
  return clusters.flatMap((cluster) =>
    cluster.keywords.slice(0, 2).map((keyword, index) => ({
      id: `${cluster.id}-link-${index}`,
      sourcePillar: cluster.pillar,
      targetCluster: keyword.primaryTheme || keyword.keyword,
      anchorText: keyword.keyword,
      rationale: `Use the pillar page on ${cluster.pillar} to link into the ${keyword.keyword} cluster and reinforce semantic depth.`,
    })),
  );
}

export function buildGapResults(
  primaryKeywords: KeywordRecord[],
  competitorKeywords: KeywordRecord[],
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
          ).toFixed(1),
        ),
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}

export function createPromptTemplates(): PromptTemplate[] {
  const createdAt = new Date().toISOString();
  return [
    {
      id: "prompt-default-v1",
      name: "Default Clustering Prompt",
      systemPrompt: DEFAULT_PROMPT,
      version: 1,
      isDefault: true,
      createdAt,
    },
    {
      id: "prompt-authority-v1",
      name: "Authority-Led Prompt",
      systemPrompt: "Cluster by semantic meaning with an emphasis on topical authority and pillar coverage.",
      version: 1,
      createdAt,
    },
  ];
}

export function createProject(params: {
  name: string;
  sourceFilename: string;
  competitorFilename?: string;
  keywords: KeywordRecord[];
  competitorKeywords?: KeywordRecord[];
  userId?: string;
  promptTemplate?: PromptTemplate;
}): ProjectRecord {
  const createdAt = new Date().toISOString();
  const clusters = clusterKeywords(params.keywords, params.promptTemplate?.systemPrompt);
  const linkSuggestions = buildLinkSuggestions(clusters);
  const gapAnalysisResults = params.competitorKeywords?.length
    ? buildGapResults(params.keywords, params.competitorKeywords)
    : [];

  return {
    id: `project-${Date.now()}`,
    userId: params.userId ?? "local-user",
    name: params.name,
    createdAt,
    updatedAt: createdAt,
    sourceFilename: params.sourceFilename,
    competitorFilename: params.competitorFilename,
    keywords: params.keywords,
    competitorKeywords: params.competitorKeywords ?? [],
    clusters,
    linkSuggestions,
    gapAnalysisResults,
    promptTemplate: params.promptTemplate,
    promptTemplates: params.promptTemplate ? [params.promptTemplate] : createPromptTemplates(),
  };
}

export function buildSerpSnapshot(keyword: KeywordRecord): SerpSnapshot {
  const rank = Math.max(1, Math.min(20, Math.round(keyword.difficulty / 5) || 7));
  return {
    keywordId: keyword.id,
    provider: "serpapi",
    fetchedAt: new Date().toISOString(),
    rank,
    title: keyword.suggestedTitle || sentenceCase(keyword.keyword),
    url: `https://example.com/${slugify(keyword.keyword)}`,
    competitors: [
      `${slugify(keyword.pillarTopic || "seo")}.com`,
      `best-${slugify(keyword.keyword)}.com`,
      `compare-${slugify(keyword.keyword)}.com`,
    ],
  };
}

export function updateProjectPrompt(project: ProjectRecord, prompt: PromptTemplate): ProjectRecord {
  const keywords = buildKeywordRecords(
    project.keywords.map((keyword) => ({
      Keyword: keyword.keyword,
      Volume: String(keyword.volume),
      Difficulty: String(keyword.difficulty),
      CPC: String(keyword.cpc),
    })),
    prompt.systemPrompt,
  );

  const competitorKeywords = (project.competitorKeywords ?? []).map((keyword) => ({
    ...keyword,
  }));

  return {
    ...createProject({
      name: project.name,
      sourceFilename: project.sourceFilename || `${project.name}.csv`,
      competitorFilename: project.competitorFilename,
      keywords,
      competitorKeywords,
      userId: project.userId,
      promptTemplate: prompt,
    }),
    id: project.id,
    createdAt: project.createdAt,
    updatedAt: new Date().toISOString(),
    promptTemplates: dedupePrompts([...(project.promptTemplates ?? []), prompt]),
  };
}

export function dedupePrompts(prompts: PromptTemplate[]) {
  const map = new Map<string, PromptTemplate>();
  prompts.forEach((prompt) => map.set(prompt.id, prompt));
  return Array.from(map.values()).sort((a, b) => a.version - b.version);
}
