import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient, updateLead } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_status"),
    ids: z.array(z.string().uuid()).min(1).max(500),
    status: z.enum(["new", "contacted", "qualified", "meeting", "proposal", "won", "lost"]),
  }),
  z.object({
    action: z.literal("export_csv"),
    ids: z.array(z.string().uuid()).min(1).max(500),
  }),
  z.object({
    action: z.literal("mailto"),
    ids: z.array(z.string().uuid()).min(1).max(100),
  }),
]);

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;
    const supabase = createServerSupabaseClient();

    if (body.action === "set_status") {
      for (const id of body.ids) {
        await updateLead(id, { status: body.status });
      }
      return NextResponse.json({ ok: true as const, data: { updated: body.ids.length } });
    }

    if (body.action === "mailto") {
      const { data, error } = await supabase.from("leads").select("id, email, company_name").in("id", body.ids);
      if (error) throw new Error(error.message);
      const emails = (data ?? []).map((r) => r.email).filter(Boolean) as string[];
      return NextResponse.json({ ok: true as const, data: { emails } });
    }

    const { data, error } = await supabase.from("leads").select("*").in("id", body.ids);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const header = [
      "id",
      "company_name",
      "contact_name",
      "email",
      "status",
      "lead_score",
      "service_type",
      "source",
      "updated_at",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          csvEscape(r.company_name),
          csvEscape(r.contact_name ?? ""),
          csvEscape(r.email ?? ""),
          r.status,
          r.lead_score,
          r.service_type ?? "",
          csvEscape(r.source ?? ""),
          r.updated_at,
        ].join(",")
      );
    }
    return NextResponse.json({
      ok: true as const,
      data: { csv: lines.join("\n"), count: rows.length },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
