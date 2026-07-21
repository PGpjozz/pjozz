export type DashboardSummaryResponse = {
  pipelineValueZar: number;
  activeLeadsCount: number;
  winRate90d: number | null;
  mrrZar: number;
  /** Sum of paid invoice totals (collected revenue). */
  collectedRevenueZar: number;
  openInvoicesZar: number;
  overdueInvoicesZar: number;
  dueNext30DaysZar: number;
  pipelineByStage: Array<{ stage: string; count: number; valueZar: number }>;
  /** Pipeline deal value by lead service type (not collected cash). */
  revenueByService: Array<{ service: string; label: string; valueZar: number }>;
  /** Compact JSON for AI chat context */
  contextBlock: string;
};
