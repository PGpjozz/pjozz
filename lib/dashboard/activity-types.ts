export type ActivityRow = {
  id: string;
  type: string;
  created_at: string;
  lead_id: string | null;
  metadata: unknown;
  lead_company: string | null;
};
