import type { CampaignSendWindow, CampaignSettings, OutreachSequenceStep } from "@/types";

export const DEFAULT_SEND_WINDOW: CampaignSendWindow = {
  weekdays: [1, 2, 3, 4, 5],
  startHour: 8,
  endHour: 17,
  timezone: "Africa/Johannesburg",
};

export function defaultCampaignSettings(): CampaignSettings {
  return {
    sendWindow: { ...DEFAULT_SEND_WINDOW },
    dailySendLimit: 50,
    pauseOnReply: true,
    blocklistOnUnsubscribe: true,
  };
}

function randomStepId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function newStep(partial?: Partial<OutreachSequenceStep>): OutreachSequenceStep {
  return {
    id: randomStepId(),
    channel: "email",
    delayKind: "immediate",
    delayDays: 0,
    subject: "",
    body: "",
    templateSource: "custom",
    ...partial,
  };
}
