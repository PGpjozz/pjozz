"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type FeatureFlags = {
  enableAi: boolean;
  enableWhatsApp: boolean;
  enableResendEmail: boolean;
  enableOutreachAutomation: boolean;
};

const DEFAULT_FLAGS: FeatureFlags = {
  enableAi: true,
  enableWhatsApp: true,
  enableResendEmail: true,
  enableOutreachAutomation: true,
};

type Ctx = {
  flags: FeatureFlags;
  loading: boolean;
  reload: () => Promise<void>;
};

const FeatureFlagsContext = createContext<Ctx | null>(null);

async function fetchFlags(): Promise<FeatureFlags> {
  const res = await fetch("/api/settings/features.flags", { cache: "no-store" });
  const json = (await res.json()) as { ok: boolean; data?: { value?: FeatureFlags } };
  if (!json.ok || !json.data?.value) return DEFAULT_FLAGS;
  return { ...DEFAULT_FLAGS, ...json.data.value };
}

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchFlags();
      setFlags(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load feature flags");
      setFlags(DEFAULT_FLAGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<Ctx>(() => ({ flags, loading, reload }), [flags, loading, reload]);

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): Ctx {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    return { flags: DEFAULT_FLAGS, loading: false, reload: async () => {} };
  }
  return ctx;
}

