export interface OpenAIProviderConfig {
  model: string;
}

export interface VertexProviderConfig {
  model: string;
  project: string;
  location: string;
}

export interface OllamaProviderConfig {
  model: string;
  host: string;
}

export interface ProvidersConfig {
  openai?: OpenAIProviderConfig;
  vertex?: VertexProviderConfig;
  ollama?: OllamaProviderConfig;
}

export interface ArchiveThresholdsConfig {
  warning: number;
  archive: number;
}

export interface PeerConsultationConfig {
  enabled: boolean;
  allowed_providers: string[];
}

export interface LoomConfig {
  default_provider: string;
  providers: ProvidersConfig;
  archive_thresholds: ArchiveThresholdsConfig;
  peer_consultation: PeerConsultationConfig;
}
