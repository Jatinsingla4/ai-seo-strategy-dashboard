import { GoogleGenAI, Type } from "@google/genai";
import type { AIDAMarketingStage, ClusterRecord, ContentIdea, KeywordRecord, SearchIntent } from "@threezinc/shared";

export const AI_KEY_STORAGE = "tz_gemini_api_key";
export const BATCH_SIZE = 25;

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(AI_KEY_STORAGE) ?? "";
}

export function saveApiKey(key: string) {
  if (typeof window === "undefined") return;
  if (key.trim()) {
    localStorage.setItem(AI_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(AI_KEY_STORAGE);
  }
}

function buildClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

const KEYWORD_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      keyword: { type: Type.STRING },
      intent: {
        type: Type.STRING,
        enum: ["Transactional", "Commercial", "Informational", "Navigational"],
      },
      aidaStage: {
        type: Type.STRING,
        enum: ["Awareness", "Interest", "Desire", "Action"],
      },
      pillarTopic: { type: Type.STRING },
      primaryTheme: { type: Type.STRING },
      secondaryTheme: { type: Type.STRING },
      suggestedTitle: { type: Type.STRING },
      suggestedPageType: {
        type: Type.STRING,
        enum: ["Blog", "Landing Page", "Product Page", "Guide"],
      },
    },
    required: ["keyword", "intent", "aidaStage", "pillarTopic", "suggestedTitle", "suggestedPageType"],
  },
};

const IDEAS_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      targetAudience: { type: Type.STRING },
      priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
    },
    required: ["title", "description", "targetAudience", "priority"],
  },
};

export async function enrichKeywordBatch(
  keywords: KeywordRecord[],
  apiKey: string,
  systemPrompt: string,
): Promise<KeywordRecord[]> {
  const client = buildClient(apiKey);

  const keywordList = keywords
    .map((k) => `- ${k.keyword} (volume: ${k.volume}, KD: ${k.difficulty})`)
    .join("\n");

  const prompt = `You are an expert SEO strategist. ${systemPrompt}

Analyze the following SEO keywords and return enriched data for each:

${keywordList}

For each keyword, determine:
- search intent (Transactional, Commercial, Informational, or Navigational)
- AIDA marketing stage (Awareness, Interest, Desire, or Action)
- a short pillar topic (2-4 words, broad topical cluster)
- primary theme (2-4 words, more specific)
- secondary theme (2-4 words, even more specific)
- an SEO-optimized suggested title for a page targeting this keyword
- the best page type (Blog, Landing Page, Product Page, or Guide)

Return a JSON array with one object per keyword.`;

  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: KEYWORD_SCHEMA,
    },
  });

  const text = response.text ?? "[]";
  let results: Array<Record<string, string>> = [];

  try {
    // Handle Gemini sometimes wrapping in markdown code blocks
    const cleaned = text.replace(/^```json\n?/i, "").replace(/\n?```$/i, "").trim();
    results = JSON.parse(cleaned);
  } catch {
    return keywords; // Fall back to unenriched if parse fails
  }

  return keywords.map((kw) => {
    const match = results.find(
      (r) => r.keyword?.toLowerCase() === kw.keyword.toLowerCase(),
    );
    if (!match) return kw;
    return {
      ...kw,
      intent: (match.intent as SearchIntent) ?? kw.intent,
      aidaStage: (match.aidaStage as AIDAMarketingStage) ?? kw.aidaStage,
      pillarTopic: match.pillarTopic ?? kw.pillarTopic,
      primaryTheme: match.primaryTheme ?? kw.primaryTheme,
      secondaryTheme: match.secondaryTheme ?? kw.secondaryTheme,
      suggestedTitle: match.suggestedTitle ?? kw.suggestedTitle,
      suggestedPageType: match.suggestedPageType ?? kw.suggestedPageType,
    };
  });
}

export async function generateClusterIdeas(
  cluster: ClusterRecord,
  apiKey: string,
  systemPrompt: string,
): Promise<ContentIdea[]> {
  const client = buildClient(apiKey);

  const topKeywords = cluster.keywords
    .slice(0, 8)
    .map((k) => `${k.keyword} (vol: ${k.volume})`)
    .join(", ");

  const prompt = `You are an expert content strategist. ${systemPrompt}

Generate 5 high-value content ideas for the topical cluster: "${cluster.pillar}"

Top keywords in this cluster: ${topKeywords}
Total search volume: ${cluster.totalVolume.toLocaleString()}
Average keyword difficulty: ${cluster.avgDifficulty}

Create 5 diverse content ideas ranging from pillar pages to cluster articles. Each should:
- Have a compelling, SEO-optimized title
- Target a specific audience segment
- Have a clear purpose (pillar, cluster, comparison, guide, etc.)
- Include a concise description of the content angle

Return a JSON array of 5 content ideas.`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: IDEAS_SCHEMA,
      },
    });

    const text = response.text ?? "[]";
    const cleaned = text.replace(/^```json\n?/i, "").replace(/\n?```$/i, "").trim();
    return JSON.parse(cleaned) as ContentIdea[];
  } catch {
    return cluster.contentIdeas; // Fall back to existing ideas
  }
}
