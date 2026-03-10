export interface PeerResponse {
  response: string;
  model: string;
  tokens_used?: number;
}

export interface PeerProvider {
  readonly name: string;
  isAvailable(): boolean;
  call(prompt: string): Promise<PeerResponse>;
}
