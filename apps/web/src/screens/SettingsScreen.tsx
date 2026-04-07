import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/react";
import { useSearchParams } from "react-router";
import { api } from "@convex/_generated/api";
import { Radio, Wifi, ExternalLink, Loader2, Check } from "lucide-react";
import { GhIcon } from "@/components/Icons";
import { cn } from "@/lib/utils";

type SyncMode = "polling" | "webhook";

function SyncModeCard({
  mode,
  title,
  description,
  icon: Icon,
  selected,
  onSelect,
  disabled,
}: {
  mode: SyncMode;
  title: string;
  description: string;
  icon: typeof Radio;
  selected: boolean;
  onSelect: (mode: SyncMode) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(mode)}
      className={cn(
        "group flex w-full cursor-pointer items-start gap-3 border bg-transparent p-4 text-left transition-colors",
        selected
          ? "border-accent/50 text-foreground-bright"
          : "border-border hover:border-border-strong",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Icon
        size={14}
        className={cn(
          "mt-0.5 shrink-0 transition-colors",
          selected ? "text-accent" : "text-muted-foreground",
        )}
      />
      <div className="min-w-0 flex-1">
        <span className="text-[13px] font-medium">{title}</span>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Check size={13} className={cn("mt-0.5 shrink-0 text-accent", !selected && "invisible")} />
    </button>
  );
}

function SettingsSection({
  label,
  description,
  delay = 0,
  children,
}: {
  label: string;
  description?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="feed-in opacity-0" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-4 flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      {description && (
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      )}
      {children}
    </section>
  );
}

export function SettingsScreen() {
  const me = useQuery(api.users.getMe);
  const { user } = useUser();
  const updateSyncMode = useMutation(api.users.updateSyncMode);
  const checkWebhookScope = useAction(api.github.checkWebhookScope);
  const [searchParams, setSearchParams] = useSearchParams();

  const [saving, setSaving] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const handledCallback = useRef(false);

  const currentMode: SyncMode = me?.syncMode ?? "polling";

  // Handle OAuth redirect back from GitHub
  useEffect(() => {
    if (searchParams.get("webhook_authorized") !== "1") return;
    if (handledCallback.current) return;
    handledCallback.current = true;

    setSearchParams({}, { replace: true });

    setSaving(true);
    setError(null);
    checkWebhookScope({})
      .then((result) => {
        if (result.hasScope) {
          return updateSyncMode({ syncMode: "webhook" }).then(() => flashSaved());
        } else {
          setError("GitHub did not grant webhook permissions. Try again.");
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to verify permissions");
      })
      .finally(() => setSaving(false));
  }, [searchParams, setSearchParams, checkWebhookScope, updateSyncMode]);

  async function triggerReauthorize() {
    if (!user) return;
    const ghAccount = user.externalAccounts.find((a) => a.provider === "github");
    if (!ghAccount) {
      setError("No GitHub account linked");
      return;
    }
    setAuthorizing(true);
    try {
      const reauth = await ghAccount.reauthorize({
        additionalScopes: ["admin:repo_hook"],
        redirectUrl: "/settings?webhook_authorized=1",
      });
      const redirectUrl = reauth?.verification?.externalVerificationRedirectURL;
      if (redirectUrl) {
        window.location.href = redirectUrl.href;
      } else {
        setError("Could not start GitHub authorization");
        setAuthorizing(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to request GitHub permissions");
      setAuthorizing(false);
    }
  }

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSelect(mode: SyncMode) {
    if (mode === currentMode || saving || authorizing) return;
    setError(null);
    setSaved(false);

    if (mode === "polling") {
      setSaving(true);
      try {
        await updateSyncMode({ syncMode: "polling" });
        flashSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Switching to webhook — check if token already has the scope
    setSaving(true);
    try {
      const result = await checkWebhookScope({});
      if (result.hasScope) {
        await updateSyncMode({ syncMode: "webhook" });
        flashSaved();
      } else {
        setSaving(false);
        await triggerReauthorize();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check permissions");
    } finally {
      setSaving(false);
    }
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-12">
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const busy = saving || authorizing;

  return (
    <div className="mx-auto max-w-[720px] px-4 py-6 sm:px-12 sm:py-8">
      <div className="feed-in mb-8 opacity-0">
        <h1 className="text-lg font-bold text-foreground-bright">settings</h1>
      </div>

      <div className="space-y-10">
        {/* GitHub Sync */}
        <SettingsSection
          label="github sync"
          description="How we track commits from your repos. Applies to all active commitments."
          delay={60}
        >
          <div className="flex flex-col gap-2">
            <SyncModeCard
              mode="polling"
              title="Polling"
              description="Checks for new commits every 15 minutes. No extra permissions needed."
              icon={Radio}
              selected={currentMode === "polling"}
              onSelect={handleSelect}
              disabled={busy}
            />
            <SyncModeCard
              mode="webhook"
              title="Webhook"
              description="Real-time commit tracking via GitHub webhooks. Needs admin:repo_hook to register push listeners — we never read your code or modify repo settings."
              icon={Wifi}
              selected={currentMode === "webhook"}
              onSelect={handleSelect}
              disabled={busy}
            />
          </div>

          {/* Inline status */}
          {(busy || error || saved) && (
            <div className="mt-3">
              {authorizing && (
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Redirecting to GitHub for permissions...</span>
                </div>
              )}
              {saving && !authorizing && (
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" />
                  <span>saving...</span>
                </div>
              )}
              {saved && !busy && (
                <div className="flex items-center gap-2 text-[12px] text-accent">
                  <Check size={12} />
                  <span>saved</span>
                </div>
              )}
              {error && <p className="text-[12px] text-destructive">{error}</p>}
            </div>
          )}

          {/* Webhook info */}
          {currentMode === "webhook" && !busy && !error && (
            <div className="feed-in mt-4 opacity-0" style={{ animationDelay: "120ms" }}>
              <div className="flex items-start gap-2.5 text-[12px] leading-relaxed text-muted-foreground">
                <GhIcon size={16} color="#444" />
                <div className="min-w-0">
                  <p>
                    Webhooks are registered when you connect a repo. If registration fails (missing
                    admin access), commits are still tracked via polling as fallback.
                  </p>
                  <a
                    href="https://docs.github.com/en/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] no-underline transition-colors hover:text-foreground"
                  >
                    learn more about github webhooks
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>
          )}
        </SettingsSection>
      </div>
    </div>
  );
}
