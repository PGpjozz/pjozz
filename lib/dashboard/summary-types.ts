export type DashboardSummaryResponse = {
  pipelineValueZar: number;
  activeLeadsCount: number;
  winRate90d: number | null;
  mrrZar: number;
  openInvoicesZar: number;
  overdueInvoicesZar: number;
  dueNext30DaysZar: number;
  pipelineByStage: Array<{ stage: string; count: number; valueZar: number }>;
  revenueByService: Array<{ service: string; label: string; valueZar: number }>;
  /** Compact JSON for AI chat context */
  contextBlock: string;
};
