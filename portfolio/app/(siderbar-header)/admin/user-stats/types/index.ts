type RangeUnit = "day" | "week" | "month" | "year";

type UserSummary = {
  id: string; // Firestore doc id (== uid 라고 가정)
  email: string;
  name: string;
  avatar_url?: string | null;
};

type UserStats = {
  user: UserSummary;
  todayTokens: number;
  monthTokens: number;
  totalTokens: number;
  avgTokensPerSession: number;
  daily: {
    labels: string[];
    values: number[];
  };
  sourceUsage: {
    chatbot: number;
    builder: number;
    board: number;
  };
  topScenarios: {
    name: string;
    runs: number;
    tokens: number;
  }[];
};

export type {
  RangeUnit,
  UserSummary,
  UserStats,
};