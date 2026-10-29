"use client";

import { useEffect, useState } from "react";

const serviceDetails = [
  { label: "Service", value: "Callback Relay API" },
  { label: "Entry point", value: "/api/callback" },
  { label: "Purpose", value: "Receive and forward remote callbacks" },
  { label: "Runtime", value: "Next.js app hosted as an API bridge" },
];

const getHealthStatus = (isOk: boolean, result?: { status?: string }) => {
  if (isOk && result?.status === "ok") {
    return "online";
  }

  return "offline";
};

const formatUptime = (totalSeconds: number) => {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "0s";
  }

  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const days = Math.floor(totalSeconds / 86400);

  const parts = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0 || parts.length > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 || parts.length > 0) {
    parts.push(`${minutes}m`);
  }

  parts.push(`${seconds}s`);

  return parts.join(" ");
};

export default function Home() {
  const [health, setHealth] = useState({ status: "checking", uptimeSeconds: 0, environment: "" });
  const [lastUpdated, setLastUpdated] = useState("--");
  const [liveUptime, setLiveUptime] = useState(0);
  const [lastHealthSampleAt, setLastHealthSampleAt] = useState<number | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [testStatus, setTestStatus] = useState<"online" | "offline" | "checking">("checking");

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const result = await response.json();
        const nextUptime = result.uptimeSeconds ?? 0;

        setHealth({
          status: getHealthStatus(response.ok, result),
          uptimeSeconds: nextUptime,
          environment: result.environment ?? "unknown",
        });
        setLiveUptime(nextUptime);
        setLastHealthSampleAt(Date.now());
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch {
        setHealth({ status: "offline", uptimeSeconds: 0, environment: "unknown" });
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    };

    fetchHealth().catch(() => undefined);

    const interval = setInterval(() => {
      fetchHealth().catch(() => undefined);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lastHealthSampleAt === null) {
      return undefined;
    }

    const tick = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - lastHealthSampleAt) / 1000);
      setLiveUptime(health.uptimeSeconds + elapsedSeconds);
    }, 1000);

    return () => clearInterval(tick);
  }, [health.uptimeSeconds, lastHealthSampleAt]);

  const effectiveHealthStatus = testMode ? testStatus : health.status;

  let healthLabel = "Checking...";

  if (effectiveHealthStatus === "online") {
    healthLabel = "Online";
  } else if (effectiveHealthStatus === "offline") {
    healthLabel = "Offline";
  }

  let healthClasses = "border-amber-500/30 bg-amber-500/10 text-amber-300";
  let statusTextClasses = "text-amber-300";

  if (effectiveHealthStatus === "online") {
    healthClasses = "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    statusTextClasses = "text-emerald-300";
  } else if (effectiveHealthStatus === "offline") {
    healthClasses = "border-red-500/30 bg-red-500/10 text-red-300";
    statusTextClasses = "text-red-300";
  }

  return (
    <main
      className="min-h-screen bg-[#000000] text-[#f1f2ff] antialiased uppercase"
      style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}
    >
      <div className="mx-auto flex max-w-5xl flex-col px-6 py-16 sm:px-8 lg:px-12">
        <div className="rounded-[6px] border border-[#353535] bg-[#1e1e1e] p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.8)] sm:p-10">
          <div className="flex flex-col gap-4 border-b border-[#353535] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {/* Typography hook: change label font/size here */}
              <p className="text-[10px] font-medium tracking-[0.32em] text-[#d4d4d4]" style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}>
                API BRIDGE SERVICE
              </p>
              {/* Typography hook: change main heading style here */}
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#f1f2ff] sm:text-4xl" style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}>
                LEGATUS CALLBACK RELAY
              </h1>
            </div>
            <span
              className={`inline-flex items-center rounded-[4px] border px-3 py-1 text-[11px] font-medium tracking-[0.12em] ${healthClasses}`}
              style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}
            >
              {healthLabel}
            </span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {serviceDetails.map((item) => (
              <div
                key={item.label}
                className="rounded-[4px] border border-[#353535] bg-[#1e1e1e] p-4"
              >
                {/* Typography hook: change card label sizes here */}
                <p className="text-[10px] tracking-[0.18em] text-[#d4d4d4]" style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}>
                  {item.label.toUpperCase()}
                </p>
                {/* Typography hook: change card body text here */}
                <p
                  className={`mt-3 text-sm font-medium text-[#f1f2ff] ${item.label === "Service" || item.label === "Entry point" ? "normal-case font-mono" : "normal-case"}`}
                  style={{
                    fontFamily:
                      item.label === "Service" || item.label === "Entry point"
                        ? "var(--font-geist-mono), monospace"
                        : "var(--font-novecento-bld), sans-serif",
                  }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* TEMP TEST MODE UI: comment out this block to hide the temporary status simulation controls. */}
          <div className="mt-6 border border-[#353535] bg-[#1e1e1e] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <button
                type="button"
                aria-label="Toggle test mode"
                aria-pressed={testMode}
                onClick={() => setTestMode((current) => !current)}
                className={`inline-flex items-center gap-3 rounded-[4px] border px-3 py-2 text-[10px] tracking-[0.18em] transition-colors ${
                  testMode
                    ? "border-[#f1f2ff] bg-[#f1f2ff] text-[#000000]"
                    : "border-[#353535] bg-[#1e1e1e] text-[#d4d4d4]"
                }`}
                style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}
              >
                <span
                  className={`relative inline-flex h-5 w-10 items-center rounded-full border ${
                    testMode ? "border-[#000000] bg-[#000000]" : "border-[#515151] bg-[#000000]"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full transition-transform ${
                      testMode ? "translate-x-5 bg-[#f1f2ff]" : "translate-x-1 bg-[#f1f2ff]"
                    }`}
                  />
                </span><span>TEST MODE</span>
              </button>

              {testMode && (
                <div className="flex flex-wrap gap-2">
                  {(["online", "offline", "checking"] as const).map((state) => (
                    <button
                      key={state}
                      type="button"
                      onClick={() => setTestStatus(state)}
                      className={[
                        "rounded-[4px] border px-3 py-1 text-[10px] tracking-[0.15em] transition-colors",
                        testStatus === state
                          ? "border-[#f1f2ff] bg-[#f1f2ff] text-[#000000]"
                          : "border-[#353535] bg-[#1e1e1e] text-[#d4d4d4] hover:border-[#515151]",
                      ].join(" ")}
                      style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}
                    >
                      {state === "checking" ? "Checking test" : `${state.charAt(0).toUpperCase() + state.slice(1)} test`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[4px] border border-[#353535] bg-[#1e1e1e] p-4">
              {/* Typography hook: change stat label styling here */}
              <p className="text-[10px] tracking-[0.18em] text-[#d4d4d4]" style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}>
                STATUS
              </p>
              {/* Typography hook: change stat value styling here */}
              <p
                className={`mt-3 text-xl font-semibold tracking-[-0.03em] ${statusTextClasses}`}
                style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}
              >
                {healthLabel}
              </p>
            </div>
            <div className="rounded-[4px] border border-[#353535] bg-[#1e1e1e] p-4">
              <p className="text-[10px] tracking-[0.18em] text-[#d4d4d4] lowercase" style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}>
                uptime
              </p>
              <p
                className="mt-3 text-xl font-semibold tracking-[-0.03em] lowercase text-[#f1f2ff]"
                style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}
              >
                {liveUptime > 0 ? formatUptime(liveUptime) : "--"}
              </p>
            </div>
            <div className="rounded-[4px] border border-[#353535] bg-[#1e1e1e] p-4">
              <p className="text-[10px] tracking-[0.18em] text-[#d4d4d4]" style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}>
                LAST CHECKED
              </p>
              <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[#f1f2ff]" style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}>{lastUpdated}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[4px] border border-[#353535] bg-[#1e1e1e] p-4">
              <p className="text-[10px] tracking-[0.18em] text-[#d4d4d4]" style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}>
                ENDPOINT
              </p>
              <p className="mt-3 text-sm font-medium text-[#f1f2ff] normal-case font-mono" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                POST /api/callback
              </p>
            </div>

            <div className="rounded-[4px] border border-[#353535] bg-[#1e1e1e] p-4">
              <p className="text-[10px] tracking-[0.18em] text-[#d4d4d4]" style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}>
                ENVIRONMENT
              </p>
              <p className="mt-3 text-sm font-medium text-[#f1f2ff] normal-case font-mono" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                {health.environment || "unknown"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
