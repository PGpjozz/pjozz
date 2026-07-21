import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const raw = readFileSync(".env.local", "utf8");
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[m[1]]) process.env[m[1]] = v;
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const probe = await sb.from("receipts").select("id", { count: "exact", head: true });
console.log("probe", { count: probe.count, error: probe.error });

const { data: inv, error: invErr } = await sb
  .from("invoices")
  .select("id,total,currency,client_id,status")
  .limit(1)
  .maybeSingle();
console.log("invoice", inv, invErr);

if (!inv) process.exit(1);

const { data, error } = await sb
  .from("receipts")
  .insert({
    invoice_id: inv.id,
    receipt_number: `RCP-TEST-${Date.now()}`,
    amount: Number(inv.total) || 0,
    currency: inv.currency || "ZAR",
    payment_method: "eft",
  })
  .select("*")
  .single();

console.log("insert data", data);
console.log("insert error", error);
