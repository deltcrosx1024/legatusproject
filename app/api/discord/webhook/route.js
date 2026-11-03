import crypto from "node:crypto";
import axios from "axios";
import { NextResponse } from "next/server";

const WEBHOOK_SECRET = process.env.DISCORD_WEBHOOK_SECRET;
const FORWARD_URL =
  process.env.DISCORD_WEBHOOK_FORWARD_URL ||
  process.env.DISCORD_FORWARD_URL ||
  process.env.CALLBACK_FORWARD_URL;

const isConfiguredUrl = (url) => url && !url.includes("example.com");

const hasValidAuthorization = (req) => {
  if (!WEBHOOK_SECRET) {
    return false;
  }

  const authorization = req.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return false;
  }

  const providedDigest = crypto.createHash("sha256").update(match[1]).digest();
  const expectedDigest = crypto
    .createHash("sha256")
    .update(WEBHOOK_SECRET)
    .digest();

  return crypto.timingSafeEqual(providedDigest, expectedDigest);
};

const parseWebhookEvent = async (req) => {
  try {
    const event = await req.json();

    if (
      !event ||
      typeof event !== "object" ||
      Array.isArray(event) ||
      event.version !== 1 ||
      typeof event.source !== "string" ||
      !event.source.trim() ||
      typeof event.event !== "string" ||
      !event.event.trim() ||
      !event.data ||
      typeof event.data !== "object" ||
      Array.isArray(event.data)
    ) {
      return null;
    }

    return event;
  } catch {
    return null;
  }
};

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      service: "discord-webhook-bridge",
      methods: ["POST"],
      eventFormat: {
        version: 1,
        source: "discord | twitch | other integration",
        event: "provider.event_name",
        state: "optional OAuth correlation identifier",
        sessionId: "optional shared session identifier",
        data: "event-specific object",
      },
      authentication: "Bearer token configured with DISCORD_WEBHOOK_SECRET",
    },
    { status: 200 },
  );
}

export async function POST(req) {
  if (!WEBHOOK_SECRET || !isConfiguredUrl(FORWARD_URL)) {
    return NextResponse.json(
      {
        success: false,
        message: "Webhook authentication or forwarding is not configured.",
      },
      { status: 503 },
    );
  }

  if (!hasValidAuthorization(req)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized webhook request." },
      { status: 401 },
    );
  }

  const event = await parseWebhookEvent(req);

  if (!event) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Invalid event. Expected version 1, source, event, and object data.",
      },
      { status: 400 },
    );
  }

  try {
    await axios.post(
      FORWARD_URL,
      {
        ...event,
        receivedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    );

    return NextResponse.json(
      {
        success: true,
        message: "Webhook event forwarded.",
        source: event.source,
        event: event.event,
        sessionId: event.sessionId ?? null,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error(
      "Discord webhook forwarding failed:",
      axios.isAxiosError(error) ? error.message : error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Webhook event could not be forwarded.",
      },
      { status: 502 },
    );
  }
}
