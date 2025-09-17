export type SearchResultItem = {
  id: string;
  index: number;
  title: string;
  url: string;
  snippet?: string;
  score?: number;
};
