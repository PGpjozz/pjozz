import type { CampaignSendWindow } from "@/types";

/** Weekday in campaign settings: 1 = Monday … 7 = Sunday */
function johannesburgWeekdayAndHour(now: Date, timeZone: string): { weekday: number; hour: number } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const hour = Number.parseInt(hourStr, 10);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return { weekday: map[wd] ?? 1, hour: Number.isFinite(hour) ? hour : 0 };
}

export function isWithinSendWindow(now: Date, w: CampaignSendWindow): boolean {
  const tz = w.timezone || "Africa/Johannesburg";
  const { weekday, hour } = johannesburgWeekdayAndHour(now, tz);
  if (!w.weekdays.includes(weekday)) return false;
  return hour >= w.startHour && hour < w.endHour;
}

export function addDaysIso(fromIso: string, days: number): string {
  const d = new Date(fromIso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}
