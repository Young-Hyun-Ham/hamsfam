// app/(siderbar-header)/admin/stats/types/index.ts
type StatsRange = "recent7" | "day" | "week" | "month";

type StatsResponse = {
  ok: boolean;
  기준시각: string;
  range: StatsRange;
  anchor: string;

  kpi: {
    todayTokens: number;
    monthTokens: number;
    totalTokens: number;
    avgTokensPerSession: number;
    totalUsers: number;
    activeUsers: number;
  };

  line: { labels: string[]; values: number[] };

  sourceUsage: {
    chatbot: number;
    builder: number;
    board: number;
  };

  topUsers: Array<{
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    tokens: number;
  }>;

  topScenarios: Array<{ name: string; runs: number; tokens: number }>;
};

export type {
  StatsResponse,
  StatsRange,
};