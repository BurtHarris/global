import * as vscode from 'vscode';

export type RunKind = 'instruction' | 'skill-debug' | 'agent-inspection' | 'trace';

export interface RunRecord {
	readonly id: string;
	readonly kind: RunKind;
	readonly title: string;
	readonly input?: string | undefined;
	readonly summary: string;
	readonly createdAt: string;
	readonly debugSessions: readonly string[];
}

const RUNS_KEY = 'agentWorkbench.runs';
const MAX_RUNS = 25;

export class RunStore {
	public constructor(private readonly storage: vscode.Memento) {}

	public list(): RunRecord[] {
		return [...this.storage.get<RunRecord[]>(RUNS_KEY, [])];
	}

	public async add(record: Omit<RunRecord, 'id' | 'createdAt'>): Promise<RunRecord> {
		const next: RunRecord = {
			...record,
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			createdAt: new Date().toISOString(),
		};
		const updated = [next, ...this.list()].slice(0, MAX_RUNS);
		await this.storage.update(RUNS_KEY, updated);
		return next;
	}

	public async clear(): Promise<void> {
		await this.storage.update(RUNS_KEY, []);
	}
}
