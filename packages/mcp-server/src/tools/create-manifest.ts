import fs from 'node:fs';
import path from 'node:path';
import { slugify } from '../lib/slugify.js';
import type { LoomContext } from '../types.js';

interface CreateManifestInput {
  name: string;
  content: string;
}

interface CreateManifestResult {
  name: string;
  slug: string;
  path: string;
  launch_command: string;
}

export async function handleCreateManifest(
  ctx: LoomContext,
  input: CreateManifestInput
): Promise<CreateManifestResult> {
  const slug = slugify(input.name);
  const filename = `${slug}.md`;
  const relativePath = path.join('docs', 'loom', 'manifests', filename);
  const absolutePath = path.join(ctx.manifestsDir, filename);
  const launchCommand = `claude --dangerously-skip-permissions -p "Read ${relativePath} and implement it fully, logging progress to Loom as you go"`;

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const header = `# Manifest: ${input.name}\nGenerated: ${timestamp}\nSource project: ${ctx.projectRoot}\n`;
  const footer = `\n---\nLaunch command:\n\`\`\`bash\n${launchCommand}\n\`\`\`\n`;
  const fullContent = `${header}\n${input.content}\n${footer}`;

  fs.mkdirSync(ctx.manifestsDir, { recursive: true });
  fs.writeFileSync(absolutePath, fullContent);

  return {
    name: input.name,
    slug,
    path: relativePath,
    launch_command: launchCommand,
  };
}
