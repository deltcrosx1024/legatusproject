"use client";

import { useEffect, useState } from "react";

const serviceDetails = [
  { label: "Service", value: "Callback Relay API" },
  { label: "Entry point", value: "/api/callback" },
  { label: "Purpose", value: "Receive and forward remote callbacks" },
  { label: "Runtime", value: "Next.js app hosted as an API bridge" },
];

const operationalNotes = [
  "This app exists to receive callback payloads from external systems.",
  "The raw request data is logged in the server console for inspection.",
  "Forwarding is handled through Axios to a configured downstream endpoint.",
  "The public UI is intentionally minimal and admin-focused.",
];

const getHealthStatus = (isOk: boolean, result?: { status?: string }) => {
  if (isOk && result?.status === "ok") {
    return "online";
  }

  return "offline";
};

export default function Home() {
  const [health, setHealth] = useState({ status: "checking", uptimeSeconds: 0, environment: "" });
  const [lastUpdated, setLastUpdated] = useState("--");

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const result = await response.json();

        setHealth({
          status: getHealthStatus(response.ok, result),
          uptimeSeconds: result.uptimeSeconds ?? 0,
          environment: result.environment ?? "unknown",
        });
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

  let healthLabel = "Checking...";

  if (health.status === "online") {
    healthLabel = "Online";
  } else if (health.status === "offline") {
    healthLabel = "Offline";
  }

  let healthClasses = "border-amber-500/30 bg-amber-500/10 text-amber-300";

  if (health.status === "online") {
    healthClasses = "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  } else if (health.status === "offline") {
    healthClasses = "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col px-6 py-16 sm:px-8 lg:px-12">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/50 backdrop-blur sm:p-10">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-400">
                API bridge service
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Legatus Callback Relay
              </h1>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${healthClasses}`}
            >
              {healthLabel}
            </span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {serviceDetails.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-3 text-sm font-medium text-slate-100">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Status
              </p>
              <p className="mt-3 text-xl font-semibold text-white">{healthLabel}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Uptime
              </p>
              <p className="mt-3 text-xl font-semibold text-white">
                {health.uptimeSeconds ? `${health.uptimeSeconds}s` : "--"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Last checked
              </p>
              <p className="mt-3 text-xl font-semibold text-white">{lastUpdated}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                What this app does
              </p>
              <p className="mt-4 text-base leading-7 text-slate-300">
                This project is a lightweight web application that acts as a hosted API
                endpoint. It accepts incoming callback requests, records them in the
                console, and forwards the payload to a configured downstream service via
                Axios.
              </p>
              <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
                  Endpoint
                </p>
                <code className="mt-2 block break-all text-sm text-cyan-100">
                  POST /api/callback
                </code>
              </div>
            </section>

            <aside className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Operational notes
              </p>
              <ul className="mt-4 space-y-3">
                {operationalNotes.map((note) => (
                  <li key={note} className="flex gap-3 text-sm leading-6 text-slate-300">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
                Environment: <span className="font-medium text-white">{health.environment || "unknown"}</span>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
