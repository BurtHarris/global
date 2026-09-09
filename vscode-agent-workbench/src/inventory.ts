import * as vscode from 'vscode';

export type InventoryKind =
	| 'skills'
	| 'agents'
	| 'hooks'
	| 'instructions'
	| 'prompts'
	| 'mcpServers'
	| 'pluginManifests';

export interface InventorySection {
	readonly kind: InventoryKind;
	readonly label: string;
	readonly items: readonly vscode.Uri[];
}

export interface WorkspaceInventory {
	readonly sections: readonly InventorySection[];
}

const DEFAULT_EXCLUDE = '**/{node_modules,dist,.git}/**';

const SECTION_LABELS: Record<InventoryKind, string> = {
	skills: 'Skills',
	agents: 'Agents',
	hooks: 'Hooks',
	instructions: 'Instructions',
	prompts: 'Prompts',
	mcpServers: 'MCP Servers',
	pluginManifests: 'Plugin Manifests',
};

export async function collectWorkspaceInventory(token?: vscode.CancellationToken): Promise<WorkspaceInventory> {
	const [skills, agents, hooks, instructions, prompts, mcpServers, pluginManifests] = await Promise.all([
		collectFiles(
			[
				'**/.agents/skills/*/SKILL.md',
				'**/.github/skills/*/SKILL.md',
				'**/.claude/skills/*/SKILL.md',
			],
			token,
		),
		collectFiles(['**/*.agent.md'], token),
		collectFiles(
			[
				'**/.agents/hooks/**',
				'**/.github/hooks/**',
				'**/.claude/hooks/**',
			],
			token,
		),
		collectFiles(
			[
				'**/*.instructions.md',
				'**/copilot-instructions.md',
				'**/AGENTS.md',
				'**/CLAUDE.md',
			],
			token,
		),
		collectFiles(['**/*.prompt.md'], token),
		collectFiles(['**/.vscode/mcp.json', '**/mcp.json'], token),
		collectPluginManifests(token),
	]);

	return {
		sections: [
			makeSection('skills', skills),
			makeSection('agents', agents),
			makeSection('hooks', hooks),
			makeSection('instructions', instructions),
			makeSection('prompts', prompts),
			makeSection('mcpServers', mcpServers),
			makeSection('pluginManifests', pluginManifests),
		],
	};
}

export function summarizeInventory(inventory: WorkspaceInventory): string {
	return inventory.sections
		.map((section) => `${section.label}: ${section.items.length}`)
		.join(', ');
}

export function filterInventory(
	inventory: WorkspaceInventory,
	kind: InventoryKind | 'all',
	query: string | undefined,
	limit: number,
): WorkspaceInventory {
	const normalizedQuery = query?.trim().toLowerCase();
	const sections = inventory.sections
		.filter((section) => kind === 'all' || section.kind === kind)
		.map((section) => {
			const filtered = normalizedQuery
				? section.items.filter((uri) => uri.fsPath.toLowerCase().includes(normalizedQuery))
				: section.items;
			return {
				...section,
				items: filtered.slice(0, Math.max(limit, 0)),
			};
		});

	return { sections };
}

function makeSection(kind: InventoryKind, items: readonly vscode.Uri[]): InventorySection {
	return {
		kind,
		label: SECTION_LABELS[kind],
		items,
	};
}

async function collectFiles(
	patterns: readonly string[],
	token?: vscode.CancellationToken,
): Promise<readonly vscode.Uri[]> {
	const results = await Promise.all(
		patterns.map((pattern) => vscode.workspace.findFiles(pattern, DEFAULT_EXCLUDE, undefined, token)),
	);

	return dedupeUris(results.flat());
}

async function collectPluginManifests(token?: vscode.CancellationToken): Promise<readonly vscode.Uri[]> {
	const packageJsonUris = await vscode.workspace.findFiles('**/package.json', DEFAULT_EXCLUDE, undefined, token);
	const matches: vscode.Uri[] = [];

	for (const uri of packageJsonUris) {
		try {
			const raw = await vscode.workspace.fs.readFile(uri);
			const parsed = JSON.parse(Buffer.from(raw).toString('utf8')) as {
				readonly contributes?: Record<string, unknown>;
			};
			const contributes = parsed.contributes ?? {};
			const isAgentCapable =
				'chatParticipants' in contributes ||
				'languageModelTools' in contributes ||
				'chatSkills' in contributes ||
				'mcpServerDefinitionProviders' in contributes;

			if (isAgentCapable) {
				matches.push(uri);
			}
		} catch {
			continue;
		}
	}

	return dedupeUris(matches);
}

function dedupeUris(uris: readonly vscode.Uri[]): readonly vscode.Uri[] {
	const seen = new Set<string>();
	const deduped: vscode.Uri[] = [];

	for (const uri of uris) {
		if (seen.has(uri.fsPath)) {
			continue;
		}
		seen.add(uri.fsPath);
		deduped.push(uri);
	}

	return deduped.sort((left, right) => left.fsPath.localeCompare(right.fsPath));
}
