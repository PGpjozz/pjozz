"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type LeadMini = { id: string; company_name: string; contact_name: string | null; email: string | null };

export type EnrollmentRow = {
  id: string;
  lead_id: string;
  current_step_index: number;
  status: string;
  next_send_after: string | null;
  leads: LeadMini | null;
  last_event: { type: string; created_at: string } | null;
};

export function CampaignLeadsTable({
  campaignId,
  rows,
  onChanged,
}: {
  campaignId: string;
  rows: EnrollmentRow[];
  onChanged: () => void;
}) {
  async function act(enrollmentId: string, action: "pause" | "resume" | "skip" | "remove") {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/enrollments/${enrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Request failed");
      toast.success("Updated");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border bg-muted/20 font-mono text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Contact</th>
            <th className="px-3 py-2">Company</th>
            <th className="px-3 py-2">Step</th>
            <th className="px-3 py-2">Last event</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                No leads enrolled — use Enroll or the campaign wizard.
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const lead = r.leads;
              return (
                <tr key={r.id} className="border-b border-border/60 hover:bg-muted/5">
                  <td className="px-3 py-2 text-foreground">{lead?.contact_name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{lead?.company_name ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.current_step_index + 1}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                    {r.last_event ? `${r.last_event.type} · ${new Date(r.last_event.created_at).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px]">{r.status}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {r.status === "active" ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => void act(r.id, "pause")}>
                          Pause
                        </Button>
                      ) : r.status === "paused" ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => void act(r.id, "resume")}>
                          Resume
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" variant="ghost" onClick={() => void act(r.id, "skip")}>
                        Skip step
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => void act(r.id, "remove")}>
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
