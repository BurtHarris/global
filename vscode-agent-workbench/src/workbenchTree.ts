import * as vscode from 'vscode';
import type { RunRecord } from './runStore';

export class RunHistoryProvider implements vscode.TreeDataProvider<RunRecord | undefined> {
	private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<RunRecord | undefined | void>();

	public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

	public constructor(private readonly getRuns: () => readonly RunRecord[]) {}

	public refresh(): void {
		this.onDidChangeTreeDataEmitter.fire();
	}

	public getTreeItem(element: RunRecord | undefined): vscode.TreeItem {
		if (!element) {
			const item = new vscode.TreeItem('No Agent Workbench runs yet', vscode.TreeItemCollapsibleState.None);
			item.description = 'Run @agent-workbench or the command palette action to start';
			return item;
		}

		const item = new vscode.TreeItem(element.title, vscode.TreeItemCollapsibleState.None);
		item.description = formatTimestamp(element.createdAt);
		item.tooltip = `${element.summary}\n${element.createdAt}`;
		item.contextValue = 'agentWorkbenchRun';
		item.iconPath = new vscode.ThemeIcon(iconForKind(element.kind));
		item.command = {
			command: 'agentWorkbench.showRunDetails',
			title: 'Show Run Details',
			arguments: [element],
		};
		return item;
	}

	public getChildren(element?: RunRecord): Thenable<(RunRecord | undefined)[]> {
		if (element) {
			return Promise.resolve([]);
		}

		const runs = this.getRuns();
		return Promise.resolve(runs.length ? [...runs] : [undefined]);
	}
}

function iconForKind(kind: RunRecord['kind']): string {
	switch (kind) {
		case 'instruction':
			return 'play';
		case 'skill-debug':
			return 'beaker';
		case 'agent-inspection':
			return 'inspect';
		case 'trace':
			return 'history';
	}
}

function formatTimestamp(value: string): string {
	const timestamp = new Date(value);
	return Number.isNaN(timestamp.valueOf()) ? value : timestamp.toLocaleString();
}
