import { KeywordRecord, ContentIdea, ClusterRecord } from "@threezinc/shared";

export class AIService {
  private geminiKey: string;
  private onRetry?: (message: string) => void;

  constructor(geminiKey: string, onRetry?: (message: string) => void) {
    this.geminiKey = geminiKey;
    this.onRetry = onRetry;
  }

  private async callProvider(prompt: string, retries = 5, baseDelay = 5000): Promise<string> {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.geminiKey,
          },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: AbortSignal.timeout(45_000), // Increased timeout for heavy analysis
        }
      );

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || response.statusText || "Unknown API error";
        throw { status: response.status, message: errorMsg };
      }

      const data: any = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (!text) throw { status: 500, message: "AI returned an empty response" };
      return text;

    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes("quota");
      const isTransient = isRateLimit || error?.status >= 500 || error?.name === "TimeoutError";

      if (isTransient && retries > 0) {
        // Exponential backoff: 5s, 10s, 20s, 40s... + jitter
        const backoff = baseDelay * Math.pow(2, 5 - retries) + Math.random() * 1000;
        const seconds = Math.round(backoff / 1000);
        const reason = isRateLimit ? "Rate Limited (Quota)" : "Transient Error";
        
        const logMsg = `[AI] ${reason}. Retrying in ${seconds}s... (${retries} left)`;
        console.warn(logMsg);
        
        if (this.onRetry) {
          this.onRetry(`AI Quota reached. Waiting ${seconds}s to retry...`);
        }

        await new Promise(r => setTimeout(r, backoff));
        return this.callProvider(prompt, retries - 1, baseDelay);
      }

      console.error(`[AI] FATAL ERROR [${error?.status || 'UNKNOWN'}]:`, error?.message || error);
      throw error;
    }
  }

  private async callAI(prompt: string): Promise<string> {
    const raw = await this.callProvider(prompt);
    return this.extractJson(raw);
  }

  private extractJson(text: string): string {
    // 1. Try to find content between ```json and ```
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match?.[1]) return match[1].trim();

    // 2. Fallback: Find the first { and last } to extract a raw object
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return text.slice(firstBrace, lastBrace + 1).trim();
    }

    return text.trim();
  }


  clusterKeywords(keywords: KeywordRecord[]): ClusterRecord[] {
    const clusters: { [key: string]: KeywordRecord[] } = {};
    keywords.forEach(k => {
      const pillar = k.pillarTopic || "Uncategorized";
      if (!clusters[pillar]) clusters[pillar] = [];
      clusters[pillar].push(k);
    });

    return Object.entries(clusters).map(([pillar, kws]) => ({
      id: crypto.randomUUID(),
      pillar,
      keywords: kws,
      totalVolume: kws.reduce((sum, k) => sum + k.volume, 0),
      avgDifficulty: kws.length > 0 ? kws.reduce((sum, k) => sum + k.difficulty, 0) / kws.length : 0,
      contentIdeas: [],
    }));
  }

  async getStrategicAnalysis(keywords: string[]): Promise<{
    enrichedKeywords: Partial<KeywordRecord>[];
    pillarContentIdeas: Record<string, ContentIdea[]>;
  }> {
    if (keywords.length === 0) return { enrichedKeywords: [], pillarContentIdeas: {} };

    // JSON-encode the keyword list so special chars cannot escape the prompt structure
    const keywordJson = JSON.stringify(keywords);
    const prompt = `Analyze the following SEO keywords and perform two tasks:
    1. For EACH keyword, provide semantic clustering (pillar topic), search intent, AIDA marketing stage, and themes.
    2. For EACH unique Pillar Topic identified, generate 5 high-value strategic content ideas.

    Keywords: ${keywordJson}

    Return ONLY a raw JSON object:
    {
      "enrichedKeywords": [
        {
          "keyword": "string",
          "intent": "Transactional" | "Commercial" | "Informational" | "Navigational",
          "aidaStage": "Awareness" | "Interest" | "Desire" | "Action",
          "pillarTopic": "string",
          "primaryTheme": "string",
          "secondaryTheme": "string",
          "suggestedTitle": "string",
          "suggestedPageType": "Blog" | "Landing Page" | "Product Page" | "Guide"
        }
      ],
      "pillarContentIdeas": {
        "Pillar Name": [
          {
            "title": "...",
            "description": "...",
            "targetAudience": "...",
            "priority": "High" | "Medium" | "Low"
          }
        ]
      }
    }`;

    const response = await this.callAI(prompt);
    const parsed = JSON.parse(response);
    return {
      enrichedKeywords: parsed.enrichedKeywords || [],
      pillarContentIdeas: parsed.pillarContentIdeas || {},
    };
  }

  async processKeywordsBatch(keywords: string[]): Promise<Partial<KeywordRecord>[]> {
    if (keywords.length === 0) return [];

    const prompt = `Analyze the following SEO keywords and provide semantic clustering, search intent, and AIDA marketing stage for each.
    Keywords: ${JSON.stringify(keywords)}

    Return ONLY a raw JSON array of objects:
    {
      "keyword": "string",
      "intent": "Transactional" | "Commercial" | "Informational" | "Navigational",
      "aidaStage": "Awareness" | "Interest" | "Desire" | "Action",
      "pillarTopic": "string",
      "primaryTheme": "string",
      "secondaryTheme": "string",
      "suggestedTitle": "string",
      "suggestedPageType": "Blog" | "Landing Page" | "Product Page" | "Guide"
    }`;

    const response = await this.callAI(prompt);
    return JSON.parse(response);
  }

  async generateBulkContentIdeas(
    clusters: { id: string; pillar: string; keywords: string[] }[]
  ): Promise<{ clusterId: string; ideas: ContentIdea[] }[]> {
    if (clusters.length === 0) return [];

    const context = clusters
      .map(c => `ID: ${JSON.stringify(c.id)}, Pillar: ${JSON.stringify(c.pillar)}, KWs: ${JSON.stringify(c.keywords)}`)
      .join("\n\n");

    const prompt = `Generate 5 high-value content ideas for EACH of these clusters.

    Clusters:
    ${context}

    Return ONLY a JSON object where keys are cluster IDs and values are arrays of ideas:
    { "id": [ { "title": "...", "description": "...", "targetAudience": "...", "priority": "High" | "Medium" | "Low" } ] }`;

    const response = await this.callAI(prompt);
    const parsed = JSON.parse(response);
    return Object.entries(parsed).map(([clusterId, ideas]) => ({
      clusterId,
      ideas: ideas as ContentIdea[],
    }));
  }
}
