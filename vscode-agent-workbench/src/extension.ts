import * as vscode from 'vscode';
import {
	type InventoryKind,
	type WorkspaceInventory,
	collectWorkspaceInventory,
	filterInventory,
	summarizeInventory,
} from './inventory';
import { RunStore, type RunKind, type RunRecord } from './runStore';
import { RunHistoryProvider } from './workbenchTree';

const INTERNAL_COMMANDS = {
	openCustomizations: 'aiCustomization.openManagementEditor',
	openAgentDebugLogs: 'workbench.action.chat.openAgentDebugPanel',
	openChatDebugView: 'github.copilot.debug.showChatLogView',
	listMcpServers: 'workbench.mcp.listServer',
} as const;

class DebugSessionTracker {
	private readonly sessions = new Map<string, vscode.DebugSession>();

	public constructor(context: vscode.ExtensionContext) {
		for (const session of vscode.debug.activeDebugSession ? [vscode.debug.activeDebugSession] : []) {
			this.sessions.set(session.id, session);
		}

		context.subscriptions.push(
			vscode.debug.onDidStartDebugSession((session) => {
				this.sessions.set(session.id, session);
			}),
			vscode.debug.onDidTerminateDebugSession((session) => {
				this.sessions.delete(session.id);
			}),
		);
	}

	public names(): string[] {
		return [...this.sessions.values()].map((session) => `${session.name} (${session.type})`);
	}
}

export function activate(context: vscode.ExtensionContext): void {
	const runStore = new RunStore(context.workspaceState);
	const historyProvider = new RunHistoryProvider(() => runStore.list());
	const debugTracker = new DebugSessionTracker(context);
	const output = vscode.window.createOutputChannel('Agent Workbench');

	context.subscriptions.push(output);
	context.subscriptions.push(vscode.window.registerTreeDataProvider('agentWorkbench.runs', historyProvider));

	registerCommands(context, runStore, historyProvider, debugTracker, output);
	registerChatParticipant(context, runStore, historyProvider, debugTracker);
	registerLanguageModelTools(context, runStore, debugTracker);
}

export function deactivate(): void {}

function registerCommands(
	context: vscode.ExtensionContext,
	runStore: RunStore,
	historyProvider: RunHistoryProvider,
	debugTracker: DebugSessionTracker,
	output: vscode.OutputChannel,
): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('agentWorkbench.openCustomizations', () =>
			executeInternalCommand(INTERNAL_COMMANDS.openCustomizations, 'Open Customizations'),
		),
		vscode.commands.registerCommand('agentWorkbench.openAgentDebugLogs', () =>
			executeInternalCommand(INTERNAL_COMMANDS.openAgentDebugLogs, 'Open Agent Debug Logs'),
		),
		vscode.commands.registerCommand('agentWorkbench.openChatDebugView', () =>
			executeInternalCommand(INTERNAL_COMMANDS.openChatDebugView, 'Show Chat Debug View'),
		),
		vscode.commands.registerCommand('agentWorkbench.listMcpServers', () =>
			executeInternalCommand(INTERNAL_COMMANDS.listMcpServers, 'MCP: List Servers'),
		),
		vscode.commands.registerCommand('agentWorkbench.runInstruction', async () => {
			const input = await vscode.window.showInputBox({
				prompt: 'Instruction to capture for the current agent debugging workflow',
				placeHolder: 'Debug the research skill against the current repo',
				ignoreFocusOut: true,
			});
			if (!input?.trim()) {
				return;
			}

			const inventory = await collectWorkspaceInventory();
			const run = await addRun(runStore, historyProvider, {
				kind: 'instruction',
				title: `Instruction: ${truncate(input.trim(), 48)}`,
				input: input.trim(),
				summary: summarizeInventory(inventory),
				debugSessions: debugTracker.names(),
			});

			output.appendLine(`[${run.createdAt}] ${run.title}`);
			output.appendLine(run.summary);
			output.show(true);

			const choice = await vscode.window.showInformationMessage(
				'Instruction recorded in Agent Workbench.',
				'Open Customizations',
				'Open Agent Debug Logs',
				'Open Chat Debug View',
			);
			await handleChoice(choice);
		}),
		vscode.commands.registerCommand('agentWorkbench.prepareWazaEval', async () => {
			const inventory = await collectWorkspaceInventory();
			const skills = inventory.sections.find((section) => section.kind === 'skills')?.items ?? [];
			if (!skills.length) {
				void vscode.window.showWarningMessage('No SKILL.md files were found in the current workspace.');
				return;
			}

			const picks = skills.map((uri) => ({
				label: vscode.workspace.asRelativePath(uri),
				uri,
			}));
			const picked = await vscode.window.showQuickPick(picks, {
				placeHolder: 'Select a skill to scaffold a Waza evaluation for',
				ignoreFocusOut: true,
			});
			if (!picked) {
				return;
			}

			const terminal = vscode.window.createTerminal({
				name: 'Agent Workbench Waza',
				cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
			});
			terminal.show();
			terminal.sendText(`waza eval new "${picked.uri.fsPath}"`, true);
		}),
		vscode.commands.registerCommand('agentWorkbench.showRunDetails', async (record: RunRecord) => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'json',
				content: JSON.stringify(record, null, 2),
			});
			await vscode.window.showTextDocument(doc, { preview: false });
		}),
		vscode.commands.registerCommand('agentWorkbench.clearRunHistory', async () => {
			await runStore.clear();
			historyProvider.refresh();
			void vscode.window.showInformationMessage('Agent Workbench run history cleared.');
		}),
	);
}

function registerChatParticipant(
	context: vscode.ExtensionContext,
	runStore: RunStore,
	historyProvider: RunHistoryProvider,
	debugTracker: DebugSessionTracker,
): void {
	const handler: vscode.ChatRequestHandler = async (request, _chatContext, stream, token) => {
		const inventory = await collectWorkspaceInventory(token);
		const debugSessions = debugTracker.names();

		switch (request.command) {
			case 'debug-skill':
				await respondWithInventoryRun(
					stream,
					runStore,
					historyProvider,
					kindAndTitle('skill-debug', request.prompt, 'Skill Debug'),
					inventory,
					debugSessions,
					'skills',
					request.prompt,
					`Prepared a skill-debugging workflow. Use **Prepare Waza Eval** to scaffold or refresh a Waza evaluation for a selected skill.`,
				);
				stream.button({
					command: 'agentWorkbench.prepareWazaEval',
					title: 'Prepare Waza Eval',
					arguments: [],
				});
				return;
			case 'inspect-agent':
				await respondWithInventoryRun(
					stream,
					runStore,
					historyProvider,
					kindAndTitle('agent-inspection', request.prompt, 'Agent Inspection'),
					inventory,
					debugSessions,
					'all',
					request.prompt,
					'Use the inventory below to inspect agent assets, plugin-capable extension manifests, and MCP configuration files in this workspace.',
				);
				return;
			case 'show-trace':
				await addRun(runStore, historyProvider, {
					kind: 'trace',
					title: 'Trace Review',
					input: request.prompt?.trim() || undefined,
					summary: summarizeInventory(inventory),
					debugSessions,
				});
				stream.markdown(renderTraceMarkdown(runStore.list(), debugSessions));
				addNavigationButtons(stream);
				return;
			case 'run-instruction':
			default:
				await respondWithInventoryRun(
					stream,
					runStore,
					historyProvider,
					kindAndTitle('instruction', request.prompt, 'Instruction Run'),
					inventory,
					debugSessions,
					'all',
					request.prompt,
					'Instruction captured. Use the buttons below to jump into the built-in VS Code debugging surfaces that complement this workflow.',
				);
				return;
		}
	};

	const participant = vscode.chat.createChatParticipant('agentWorkbench.participant', handler);
	participant.iconPath = new vscode.ThemeIcon('debug-alt');
	context.subscriptions.push(participant);
}

function registerLanguageModelTools(
	context: vscode.ExtensionContext,
	runStore: RunStore,
	debugTracker: DebugSessionTracker,
): void {
	context.subscriptions.push(
		vscode.lm.registerTool('agent_workbench_workspace_inventory', new WorkspaceInventoryTool()),
		vscode.lm.registerTool('agent_workbench_debug_context', new DebugContextTool(runStore, debugTracker)),
	);
}

class WorkspaceInventoryTool implements vscode.LanguageModelTool<{
	kind?: InventoryKind | 'all';
	limit?: number;
	query?: string;
}> {
	public async invoke(
		options: vscode.LanguageModelToolInvocationOptions<{
			kind?: InventoryKind | 'all';
			limit?: number;
			query?: string;
		}>,
		token: vscode.CancellationToken,
	): Promise<vscode.LanguageModelToolResult> {
		const inventory = await collectWorkspaceInventory(token);
		const filtered = filterInventory(
			inventory,
			options.input.kind ?? 'all',
			options.input.query,
			options.input.limit ?? 10,
		);

		const payload = filtered.sections.map((section) => ({
			kind: section.kind,
			label: section.label,
			count: section.items.length,
			paths: section.items.map((uri) => uri.fsPath),
		}));

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify(payload, null, 2)),
		]);
	}

	public async prepareInvocation(
		options: vscode.LanguageModelToolInvocationPrepareOptions<{
			kind?: InventoryKind | 'all';
			limit?: number;
			query?: string;
		}>,
	): Promise<vscode.PreparedToolInvocation> {
		const kind = options.input.kind ?? 'all';
		return {
			invocationMessage: `Inspecting ${kind} inventory`,
		};
	}
}

class DebugContextTool implements vscode.LanguageModelTool<{ includeRecentRuns?: boolean }> {
	public constructor(
		private readonly runStore: RunStore,
		private readonly debugTracker: DebugSessionTracker,
	) {}

	public async invoke(
		options: vscode.LanguageModelToolInvocationOptions<{ includeRecentRuns?: boolean }>,
	): Promise<vscode.LanguageModelToolResult> {
		const payload = {
			activeDebugSessions: this.debugTracker.names(),
			recentRuns: options.input.includeRecentRuns === false
				? []
				: this.runStore.list().slice(0, 5),
			workspaceFolders: (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath),
		};

		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify(payload, null, 2)),
		]);
	}

	public async prepareInvocation(): Promise<vscode.PreparedToolInvocation> {
		return {
			invocationMessage: 'Collecting debug context',
		};
	}
}

async function respondWithInventoryRun(
	stream: vscode.ChatResponseStream,
	runStore: RunStore,
	historyProvider: RunHistoryProvider,
	run: { readonly kind: RunKind; readonly title: string; readonly input?: string },
	inventory: WorkspaceInventory,
	debugSessions: readonly string[],
	kind: InventoryKind | 'all',
	query: string | undefined,
	intro: string,
): Promise<void> {
	const filtered = filterInventory(inventory, kind, query, 8);
	const summary = summarizeInventory(inventory);

	await addRun(runStore, historyProvider, {
		kind: run.kind,
		title: run.title,
		input: run.input,
		summary,
		debugSessions,
	});

	stream.markdown([
		intro,
		'',
		`**Workspace inventory:** ${summary}`,
		debugSessions.length ? `**Active debug sessions:** ${debugSessions.join(', ')}` : '**Active debug sessions:** none',
		'',
		...filtered.sections.map((section) => renderSection(section.label, section.items)),
	].join('\n'));

	for (const section of filtered.sections) {
		for (const uri of section.items.slice(0, 3)) {
			stream.reference(uri);
		}
	}

	addNavigationButtons(stream);
}

async function addRun(
	runStore: RunStore,
	historyProvider: RunHistoryProvider,
	record: Omit<RunRecord, 'id' | 'createdAt'>,
): Promise<RunRecord> {
	const saved = await runStore.add(record);
	historyProvider.refresh();
	return saved;
}

function renderSection(label: string, items: readonly vscode.Uri[]): string {
	if (!items.length) {
		return `- **${label}:** none found`;
	}

	const lines = items.map((uri) => `  - \`${vscode.workspace.asRelativePath(uri)}\``);
	return [`- **${label}:** ${items.length}`, ...lines].join('\n');
}

function renderTraceMarkdown(runs: readonly RunRecord[], debugSessions: readonly string[]): string {
	if (!runs.length) {
		return 'No Agent Workbench runs have been recorded yet.';
	}

	return [
		'## Recent Agent Workbench runs',
		'',
		...runs.slice(0, 10).map((run) =>
			`- **${run.title}** — ${run.kind} — ${new Date(run.createdAt).toLocaleString()}${run.input ? ` — ${run.input}` : ''}`,
		),
		'',
		debugSessions.length
			? `**Active debug sessions:** ${debugSessions.join(', ')}`
			: '**Active debug sessions:** none',
	].join('\n');
}

function addNavigationButtons(stream: vscode.ChatResponseStream): void {
	stream.button({
		command: 'agentWorkbench.openCustomizations',
		title: 'Open Customizations',
		arguments: [],
	});
	stream.button({
		command: 'agentWorkbench.openAgentDebugLogs',
		title: 'Open Agent Debug Logs',
		arguments: [],
	});
	stream.button({
		command: 'agentWorkbench.openChatDebugView',
		title: 'Open Chat Debug View',
		arguments: [],
	});
	stream.button({
		command: 'agentWorkbench.listMcpServers',
		title: 'List MCP Servers',
		arguments: [],
	});
}

async function executeInternalCommand(command: string, label: string): Promise<void> {
	try {
		await vscode.commands.executeCommand(command);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		void vscode.window.showWarningMessage(`${label} is not available in this VS Code environment: ${message}`);
	}
}

async function handleChoice(choice: string | undefined): Promise<void> {
	switch (choice) {
		case 'Open Customizations':
			await executeInternalCommand(INTERNAL_COMMANDS.openCustomizations, 'Open Customizations');
			return;
		case 'Open Agent Debug Logs':
			await executeInternalCommand(INTERNAL_COMMANDS.openAgentDebugLogs, 'Open Agent Debug Logs');
			return;
		case 'Open Chat Debug View':
			await executeInternalCommand(INTERNAL_COMMANDS.openChatDebugView, 'Show Chat Debug View');
			return;
		default:
			return;
	}
}

function kindAndTitle(kind: RunKind, prompt: string, fallbackTitle: string): { readonly kind: RunKind; readonly title: string; readonly input?: string } {
	const trimmed = prompt.trim();
	return {
		kind,
		title: trimmed ? `${fallbackTitle}: ${truncate(trimmed, 48)}` : fallbackTitle,
		input: trimmed || undefined,
	};
}

function truncate(value: string, maxLength: number): string {
	return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}
