"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type FeatureFlags = {
  enableAi: boolean;
  enableWhatsApp: boolean;
  enableResendEmail: boolean;
  enableOutreachAutomation: boolean;
};

/** Fail-closed for AI until settings load so a disabled flag cannot race-enable API calls. */
const BOOT_FLAGS: FeatureFlags = {
  enableAi: false,
  enableWhatsApp: true,
  enableResendEmail: true,
  enableOutreachAutomation: true,
};

const FALLBACK_FLAGS: FeatureFlags = {
  enableAi: true,
  enableWhatsApp: true,
  enableResendEmail: true,
  enableOutreachAutomation: true,
};

type Ctx = {
  flags: FeatureFlags;
  loading: boolean;
  /** True only after flags have loaded and enableAi is on. */
  aiEnabled: boolean;
  reload: () => Promise<void>;
};

const FeatureFlagsContext = createContext<Ctx | null>(null);

async function fetchFlags(): Promise<FeatureFlags> {
  const res = await fetch("/api/settings/features.flags", { cache: "no-store" });
  const json = (await res.json()) as { ok: boolean; data?: { value?: FeatureFlags } };
  if (!json.ok || !json.data?.value) return FALLBACK_FLAGS;
  return { ...FALLBACK_FLAGS, ...json.data.value };
}

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(BOOT_FLAGS);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchFlags();
      setFlags(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load feature flags");
      setFlags(FALLBACK_FLAGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<Ctx>(
    () => ({
      flags,
      loading,
      aiEnabled: !loading && flags.enableAi,
      reload,
    }),
    [flags, loading, reload]
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): Ctx {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    return {
      flags: BOOT_FLAGS,
      loading: false,
      aiEnabled: false,
      reload: async () => {},
    };
  }
  return ctx;
}
