"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Calendar, Eye, Mail } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

import { LeadScoreBadge } from "@/components/leads/LeadScoreBadge";
import { SERVICE_LABEL } from "@/components/leads/lead-constants";
import {
  COLUMN_META,
  type KanbanStage,
  type PipelineBoardCard,
  columnIdToStage,
  daysBetween,
  KANBAN_STAGE_ORDER,
} from "@/lib/pipeline/kanban";

type Props = {
  cards: PipelineBoardCard[];
  hideLost: boolean;
  onMoveCard: (leadId: string, toStage: KanbanStage) => Promise<void>;
};

function groupByStage(cards: PipelineBoardCard[]): Record<KanbanStage, PipelineBoardCard[]> {
  const acc = {} as Record<KanbanStage, PipelineBoardCard[]>;
  for (const s of KANBAN_STAGE_ORDER) acc[s] = [];
  for (const c of cards) {
    acc[c.stage].push(c);
  }
  return acc;
}

export function PipelineKanban({ cards, hideLost, onMoveCard }: Props) {
  const columns = useMemo(() => groupByStage(cards), [cards]);
  const visibleStages = useMemo(
    () => (hideLost ? KANBAN_STAGE_ORDER.filter((s) => s !== "Lost ✗") : [...KANBAN_STAGE_ORDER]),
    [hideLost]
  );

  const [active, setActive] = useState<PipelineBoardCard | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function onDragStart(ev: DragStartEvent) {
    const id = String(ev.active.id);
    if (!id.startsWith("lead:")) return;
    const leadId = id.slice(5);
    setActive(cards.find((c) => c.leadId === leadId) ?? null);
  }

  async function onDragEnd(ev: DragEndEvent) {
    setActive(null);
    const overId = ev.over?.id != null ? String(ev.over.id) : null;
    const activeId = String(ev.active.id);
    if (!overId || !activeId.startsWith("lead:")) return;
    const leadId = activeId.slice(5);
    const toStage = columnIdToStage(overId);
    const card = cards.find((c) => c.leadId === leadId);
    if (!card || card.stage === toStage) return;
    await onMoveCard(leadId, toStage);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-full min-h-[480px] gap-4 overflow-x-auto pb-2">
        {visibleStages.map((stage) => (
          <KanbanColumn key={stage} stage={stage} cards={columns[stage] ?? []} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className="w-[260px] cursor-grabbing">
            <PipelineCardBody card={active} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({ stage, cards }: { stage: KanbanStage; cards: PipelineBoardCard[] }) {
  const meta = COLUMN_META[stage];
  const { setNodeRef, isOver } = useDroppable({ id: meta.id });
  const total = cards.reduce((s, c) => s + (c.dealValue ?? 0), 0);
  const won = stage === "Won ✓";
  const lost = stage === "Lost ✗";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-xl border border-border bg-[#0A0A0A]/90",
        isOver && "ring-2 ring-primary/60",
        won && "border-emerald-500/40",
        lost && "border-red-500/40"
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-1 border-b border-border px-3 py-2",
          won && "rounded-t-xl bg-emerald-500/15",
          lost && "rounded-t-xl bg-red-500/15",
          meta.headerClass && !won && !lost && meta.headerClass
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-heading text-xs font-semibold uppercase tracking-wide text-foreground">{stage}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            {cards.length}
          </span>
        </div>
        <p className="font-mono text-[11px] text-primary">R {total.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}</p>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {cards.map((c) => (
          <DraggableLeadCard key={c.leadId} card={c} />
        ))}
      </div>
    </div>
  );
}

function DraggableLeadCard({ card }: { card: PipelineBoardCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lead:${card.leadId}`,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn(isDragging && "opacity-40")}>
      <PipelineCardBody card={card} />
    </div>
  );
}

function PipelineCardBody({ card, isOverlay }: { card: PipelineBoardCard; isOverlay?: boolean }) {
  const stageDays = daysBetween(card.pipelineUpdatedAt ?? card.lastActivityAt);
  const warn = stageDays > 14;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card/50 p-3 shadow-sm transition-colors hover:border-primary/50 hover:shadow-md",
        isOverlay && "border-primary/60 bg-card shadow-2xl"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-heading text-sm font-semibold leading-tight text-foreground">{card.companyName}</p>
        <LeadScoreBadge score={card.leadScore} size="sm" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {card.contactName ?? "—"}{" "}
        {card.serviceType ? (
          <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
            {SERVICE_LABEL[card.serviceType] ?? card.serviceType}
          </span>
        ) : null}
      </p>
      <p className="mt-2 font-mono text-xs text-foreground">
        R {(card.dealValue ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 0 })}
      </p>
      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className={cn("inline-block size-1.5 rounded-full", warn ? "bg-amber-400" : "bg-muted-foreground/40")} />
        <span className="font-mono">{stageDays}d in stage</span>
      </div>
      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
        Last: {new Date(card.lastActivityAt).toLocaleDateString()}
      </p>
      <div
        className="mt-2 flex items-center justify-end gap-1 border-t border-border/60 pt-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {card.email ? (
          <a
            href={`mailto:${card.email}`}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
            title="Email"
          >
            <Mail className="size-4" />
          </a>
        ) : null}
        <a
          href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Call: " + card.companyName)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
          title="Calendar"
        >
          <Calendar className="size-4" />
        </a>
        <Link
          href={`/leads/${card.leadId}`}
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
          title="View lead"
        >
          <Eye className="size-4" />
        </Link>
      </div>
    </div>
  );
}
