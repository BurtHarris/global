export interface LoopAutomationOptions {
  dryRun: boolean;
  workspaceName?: string;
  workspaceDescription?: string;
  members?: string[];
  sourcePageIds?: string[];
  destinationWorkspaceId?: string;
  copyOnly: boolean;
  requireExplicitDeleteApproval: boolean;
}

export const defaultLoopAutomationOptions: LoopAutomationOptions = {
  dryRun: true,
  copyOnly: true,
  requireExplicitDeleteApproval: true,
};

export interface LoopExecutionReport {
  status: 'success' | 'warning' | 'failure';
  dryRun: boolean;
  copiedPageCount: number;
  warnings: string[];
  failures: string[];
  verificationSummary: string[];
}

export async function runLoopAutomation(
  options: Partial<LoopAutomationOptions> = {},
): Promise<LoopExecutionReport> {
  const config: LoopAutomationOptions = {
    ...defaultLoopAutomationOptions,
    ...options,
  };

  const warnings: string[] = [];
  const failures: string[] = [];

  if (!config.workspaceName && !config.dryRun) {
    failures.push('A workspace name is required unless the run is a dry-run execution.');
  }

  if (config.sourcePageIds?.length && config.copyOnly === false && config.requireExplicitDeleteApproval) {
    warnings.push('Source page deletion is gated behind explicit user approval in the current safety configuration.');
  }

  if (!config.destinationWorkspaceId && !config.dryRun) {
    warnings.push('A destination workspace was not provided; verification may need Manual confirmation in the Loop UI.');
  }

  const report: LoopExecutionReport = {
    status: failures.length > 0 ? 'failure' : warnings.length > 0 ? 'warning' : 'success',
    dryRun: config.dryRun,
    copiedPageCount: config.sourcePageIds?.length ?? 0,
    warnings,
    failures,
    verificationSummary: [
      `Dry-run mode: ${config.dryRun ? 'enabled' : 'disabled'}`,
      `Copy-only mode: ${config.copyOnly ? 'enabled' : 'disabled'}`,
      `Workspace: ${config.workspaceName ?? 'not provided yet'}`,
    ],
  };

  return report;
}

async function main(): Promise<void> {
  const report = await runLoopAutomation({
    workspaceName: 'Loop Workspace Automation',
  });

  console.log(JSON.stringify(report, null, 2));
}

const isMainModule = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMainModule) {
  await main();
}
