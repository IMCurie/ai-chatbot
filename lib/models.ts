export type ModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "openrouter"
  | "grok";

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
}

export function getModelsByProvider(models: Model[], provider: ModelProvider): Model[] {
  return models.filter((model) => model.provider === provider);
}

export function getModelById(models: Model[], id: string): Model | undefined {
  return models.find((model) => model.id === id);
}

export function getProvidersWithModels(models: Model[]): ModelProvider[] {
  const providers = new Set<ModelProvider>();
  models.forEach((model) => providers.add(model.provider));
  return Array.from(providers);
}
