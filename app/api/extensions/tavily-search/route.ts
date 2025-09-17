const TAVILY_ENDPOINT = "https://api.tavily.com/search";

interface TavilySearchRequest {
  query?: string;
  apiKey?: string;
  maxResults?: number;
  searchDepth?: "basic" | "advanced";
  includeAnswer?: boolean;
  includeRawContent?: boolean;
  useCache?: boolean;
  language?: string;
  excludeWebsites?: string | string[];
}

interface TavilySearchResult {
  id?: string;
  title?: string;
  url?: string;
  content?: string;
  snippet?: string;
  score?: number;
  position?: number;
}

interface TavilySearchResponse {
  query?: string;
  answer?: string | null;
  results?: TavilySearchResult[];
  search_type?: string;
  evaluation_time?: number;
}

const MAX_QUERY_LENGTH = 400;
const DEFAULT_MAX_RESULTS = 5;
const MAX_RESULTS_LIMIT = 50;

export async function POST(req: Request) {
  let payload: TavilySearchRequest;

  try {
    payload = (await req.json()) as TavilySearchRequest;
  } catch (error) {
    console.error("Invalid Tavily search payload:", error);
    return new Response("Invalid JSON body", { status: 400 });
  }

  const rawQuery = payload.query?.trim() ?? "";
  if (!rawQuery) {
    return new Response("Query is required", { status: 400 });
  }

  const query = rawQuery.slice(0, MAX_QUERY_LENGTH);
  const providedApiKey = payload.apiKey?.trim();
  const envApiKey = process.env.TAVILY_API_KEY?.trim();
  const apiKey = providedApiKey || envApiKey;

  if (!apiKey) {
    return new Response("Missing Tavily API key", { status: 401 });
  }

  const requestedMax =
    typeof payload.maxResults === "number"
      ? payload.maxResults
      : DEFAULT_MAX_RESULTS;
  const maxResults = Math.max(
    1,
    Math.min(Number.isFinite(requestedMax) ? Math.round(requestedMax) : DEFAULT_MAX_RESULTS, MAX_RESULTS_LIMIT)
  );

  const searchDepth = payload.searchDepth === "advanced" ? "advanced" : "basic";
  const includeAnswer = payload.includeAnswer ?? false;
  const includeRawContent = payload.includeRawContent ?? false;
  const includeCacheFlag = typeof payload.useCache === "boolean";
  const language = payload.language?.trim();

  const excludeWebsitesRaw = payload.excludeWebsites;
  const excludeDomains = Array.isArray(excludeWebsitesRaw)
    ? excludeWebsitesRaw
    : typeof excludeWebsitesRaw === "string"
      ? excludeWebsitesRaw.split(",")
      : [];
  const normalizedExcludeDomains = excludeDomains
    .map((domain) => domain.trim())
    .filter((domain) => domain.length > 0);

  const body = {
    api_key: apiKey,
    query,
    max_results: maxResults,
    search_depth: searchDepth,
    include_answer: includeAnswer,
    include_raw_content: includeRawContent,
    include_images: false,
    ...(includeCacheFlag ? { cache: payload.useCache } : {}),
    ...(language ? { language } : {}),
    ...(normalizedExcludeDomains.length > 0
      ? { exclude_domains: normalizedExcludeDomains }
      : {}),
  };

  try {
    const response = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Tavily search failed:", response.status, errorText);
      return new Response(errorText || "Tavily search failed", {
        status: response.status,
      });
    }

    const data = (await response.json()) as TavilySearchResponse;
    const normalizedResults = Array.isArray(data.results)
      ? data.results.slice(0, maxResults).flatMap((result, index) => {
          const url = result.url?.trim();
          if (!url) {
            return [] as const;
          }

          const snippet = result.snippet?.trim() || result.content?.trim() || "";
          const title = result.title?.trim() || url;

          return [
            {
              id: result.id?.trim() || `source-${index + 1}`,
              index: (result.position && result.position > 0
                ? result.position
                : index + 1) as number,
              title,
              url,
              snippet,
              score:
                typeof result.score === "number" && !Number.isNaN(result.score)
                  ? result.score
                  : undefined,
            },
          ];
        })
      : [];

    return Response.json({
      query,
      searchDepth,
      results: normalizedResults,
      answer: includeAnswer ? data.answer ?? null : undefined,
      evaluationTime:
        typeof data.evaluation_time === "number"
          ? data.evaluation_time
          : undefined,
    });
  } catch (error) {
    console.error("Unexpected Tavily search error:", error);
    return new Response("Failed to reach Tavily search", { status: 500 });
  }
}
