"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { newStep } from "@/lib/campaigns/defaults";
import { buildSyntheticLeadForAi } from "@/lib/campaigns/synthetic-lead";
import type { LeadServiceType, OutreachSequenceStep } from "@/types";

const EMAIL_TYPES = ["initial", "followup1", "followup2", "breakup"] as const;

function stepToEmailType(index: number): (typeof EMAIL_TYPES)[number] {
  return EMAIL_TYPES[Math.min(index, EMAIL_TYPES.length - 1)]!;
}

type Props = {
  steps: OutreachSequenceStep[];
  onChange: (next: OutreachSequenceStep[]) => void;
  serviceFocus: LeadServiceType;
  companyHint: string;
};

function SortableStep({
  step,
  index,
  onEdit,
  onRegenerate,
}: {
  step: OutreachSequenceStep;
  index: number;
  onEdit: () => void;
  onRegenerate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const delayLabel =
    step.delayKind === "immediate" ? "Send immediately" : step.delayDays === 1 ? "Wait 1 day" : `Wait ${step.delayDays} days`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-border bg-card/40 p-4 transition-shadow",
        isDragging && "z-10 border-primary/50 shadow-lg ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-1 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-primary">Step {index + 1}</span>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
              {step.channel}
            </span>
            <span className="text-xs text-muted-foreground">{delayLabel}</span>
            {step.templateSource === "ai" ? (
              <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">AI</span>
            ) : null}
          </div>
          <div className="max-h-28 overflow-y-auto rounded border border-border/60 bg-background/40 p-2 font-mono text-[11px] text-muted-foreground">
            {step.subject ? <p className="font-semibold text-foreground">{step.subject}</p> : null}
            <p className="whitespace-pre-wrap">{step.body || "—"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={onRegenerate}>
              <Sparkles className="size-3.5" />
              Regenerate with AI
            </Button>
            <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={onEdit}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SequenceBuilder({ steps, onChange, serviceFocus, companyHint }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [editingId, setEditingId] = useState<string | null>(null);

  function onDragEnd(ev: DragEndEvent) {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(steps, oldIndex, newIndex));
  }

  async function regenerate(step: OutreachSequenceStep, index: number) {
    const lead = buildSyntheticLeadForAi(serviceFocus, companyHint);
    const emailType = stepToEmailType(index);
    try {
      const res = await fetch("/api/ai/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead,
          emailType,
          previousContext: steps
            .slice(0, index)
            .map((s) => s.body)
            .join("\n---\n")
            .slice(0, 6000),
        }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { subject: string; body: string }; error?: string };
      if (!json.ok || !json.data) throw new Error(json.error ?? "AI error");
      onChange(
        steps.map((s) =>
          s.id === step.id
            ? { ...s, subject: json.data!.subject, body: json.data!.body, templateSource: "ai" as const }
            : s
        )
      );
      toast.success("Step regenerated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Regenerate failed");
    }
  }

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <SortableStep
                key={step.id}
                step={step}
                index={index}
                onEdit={() => setEditingId(step.id)}
                onRegenerate={() => void regenerate(step, index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        onClick={() => onChange([...steps, newStep({ delayKind: "wait_days", delayDays: 3, channel: "email" })])}
      >
        Add step
      </Button>

      {editingId && steps.some((s) => s.id === editingId) ? (
        <StepEditorModal
          step={steps.find((s) => s.id === editingId)!}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            onChange(steps.map((s) => (s.id === editingId ? { ...s, ...patch, templateSource: "custom" } : s)));
            setEditingId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function StepEditorModal({
  step,
  onClose,
  onSave,
}: {
  step: OutreachSequenceStep;
  onClose: () => void;
  onSave: (patch: Partial<OutreachSequenceStep>) => void;
}) {
  const [channel, setChannel] = useState(step.channel);
  const [delayKind, setDelayKind] = useState(step.delayKind);
  const [delayDays, setDelayDays] = useState(String(step.delayDays));
  const [subject, setSubject] = useState(step.subject ?? "");
  const [body, setBody] = useState(step.body);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-[#0a0a0a] p-4 shadow-2xl">
        <h3 className="font-heading text-sm font-semibold text-primary">Edit step</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase text-muted-foreground">Channel</label>
            <select
              className="pj-input w-full font-mono text-sm"
              value={channel}
              onChange={(e) => setChannel(e.target.value as OutreachSequenceStep["channel"])}
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-muted-foreground">Delay</label>
            <select
              className="pj-input mb-2 w-full font-mono text-sm"
              value={delayKind}
              onChange={(e) => setDelayKind(e.target.value as OutreachSequenceStep["delayKind"])}
            >
              <option value="immediate">Send immediately</option>
              <option value="wait_days">Wait (days)</option>
            </select>
            {delayKind === "wait_days" ? (
              <input
                className="pj-input w-full font-mono text-sm"
                type="number"
                min={0}
                max={60}
                value={delayDays}
                onChange={(e) => setDelayDays(e.target.value)}
              />
            ) : null}
          </div>
          {channel === "email" ? (
            <div>
              <label className="mb-1 block text-xs uppercase text-muted-foreground">Subject</label>
              <input className="pj-input w-full font-mono text-sm" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs uppercase text-muted-foreground">Message</label>
            <textarea className="pj-input min-h-[160px] w-full font-mono text-xs" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() =>
              onSave({
                channel,
                delayKind,
                delayDays: delayKind === "wait_days" ? Math.max(0, Number.parseInt(delayDays, 10) || 0) : 0,
                subject: channel === "email" ? subject : undefined,
                body,
              })
            }
          >
            Save step
          </Button>
        </div>
      </div>
    </div>
  );
}
