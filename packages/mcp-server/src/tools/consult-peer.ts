import type { LoomContext } from '../types.js';
import { createProvider, resolveProviderName } from '../providers/provider-factory.js';

interface ConsultPeerInput {
  problem: string;
  context: string;
  code?: string;
  question: string;
  provider?: string;
}

interface ConsultPeerResult {
  provider?: string;
  model?: string;
  response?: string;
  tokens_used?: number;
  error?: string;
}

function buildPrompt(input: ConsultPeerInput): string {
  const parts = [
    `## Problem\n${input.problem}`,
    `## Context\n${input.context}`,
  ];

  if (input.code) {
    parts.push(`## Code\n\`\`\`\n${input.code}\n\`\`\``);
  }

  parts.push(`## Question\n${input.question}`);

  return parts.join('\n\n');
}

export async function handleConsultPeer(
  ctx: LoomContext,
  input: ConsultPeerInput
): Promise<ConsultPeerResult> {
  const { peer_consultation } = ctx.config;

  if (!peer_consultation.enabled) {
    return { error: 'Peer consultation is disabled in config' };
  }

  const providerName = resolveProviderName(input.provider, ctx.config);

  if (!peer_consultation.allowed_providers.includes(providerName)) {
    return { error: `Provider "${providerName}" is not in allowed_providers` };
  }

  let provider;
  try {
    provider = createProvider(providerName, ctx.config);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Failed to create provider: ${msg}` };
  }

  if (!provider.isAvailable()) {
    return { error: `Provider "${providerName}" is not available. Check credentials/configuration.` };
  }

  const prompt = buildPrompt(input);

  try {
    const result = await provider.call(prompt);
    return {
      provider: providerName,
      model: result.model,
      response: result.response,
      tokens_used: result.tokens_used,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Provider call failed: ${msg}` };
  }
}
