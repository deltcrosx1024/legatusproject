import crypto from "node:crypto";
import axios from "axios";
import { InteractionResponseType, InteractionType } from "discord.js";
import { after, NextResponse } from "next/server";

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const FORWARD_URL =
  process.env.DISCORD_FORWARD_URL ||
  process.env.CALLBACK_FORWARD_URL ||
  "https://example.com/discord-endpoint";

const sanitizeHeaders = (headers) => Object.fromEntries(headers.entries());

const verifyDiscordInteraction = async (rawBody, signature, timestamp) => {
  if (!DISCORD_PUBLIC_KEY || !signature || !timestamp) {
    return false;
  }

  const publicKeyHex = DISCORD_PUBLIC_KEY.trim().replace(/^0x/i, "");

  if (
    !/^[\da-f]{64}$/i.test(publicKeyHex) ||
    !/^[\da-f]{128}$/i.test(signature) ||
    !/^\d+$/.test(timestamp)
  ) {
    return false;
  }

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      Buffer.from(publicKeyHex, "hex"),
      { name: "Ed25519" },
      false,
      ["verify"],
    );

    return crypto.subtle.verify(
      "Ed25519",
      key,
      Buffer.from(signature, "hex"),
      Buffer.from(`${timestamp}${rawBody}`, "utf8"),
    );
  } catch (error) {
    console.error("Discord interaction signature verification failed:", error);
    return false;
  }
};

const forwardDiscordEvent = async (payload) => {
  if (FORWARD_URL.includes("example.com")) {
    return;
  }

  try {
    await axios.post(
      FORWARD_URL,
      {
        source: "discord-interaction",
        ...payload,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    );
  } catch (error) {
    console.error(
      "Error forwarding Discord interaction payload:",
      axios.isAxiosError(error) ? error.message : error,
    );
  }
};

const parseInteractionPayload = async (req) => {
  const rawBody = await req.text();

  try {
    const interaction = JSON.parse(rawBody);

    if (
      !interaction ||
      typeof interaction !== "object" ||
      Array.isArray(interaction)
    ) {
      return { rawBody, interaction: null, parseError: true };
    }

    return { rawBody, interaction };
  } catch {
    return { rawBody, interaction: null, parseError: true };
  }
};

const createInteractionResponse = (interaction) => {
  switch (interaction.type) {
    case InteractionType.Ping:
      return { type: InteractionResponseType.Pong };
    case InteractionType.ApplicationCommand:
    case InteractionType.ModalSubmit:
      return { type: InteractionResponseType.DeferredChannelMessageWithSource };
    case InteractionType.MessageComponent:
      return { type: InteractionResponseType.DeferredMessageUpdate };
    case InteractionType.ApplicationCommandAutocomplete:
      return {
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: { choices: [] },
      };
    default:
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: "This interaction type is not supported." },
      };
  }
};

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      service: "discord-interaction-endpoint",
      message: "Discord interaction endpoint is active.",
      methods: ["POST"],
    },
    { status: 200 },
  );
}

export async function POST(req) {
  if (!DISCORD_PUBLIC_KEY) {
    return NextResponse.json(
      {
        success: false,
        message: "Discord signature verification is not configured.",
      },
      { status: 503 },
    );
  }

  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const { rawBody, interaction, parseError } =
    await parseInteractionPayload(req);

  if (!signature || !timestamp) {
    return NextResponse.json(
      { success: false, message: "invalid request signature" },
      { status: 401 },
    );
  }

  const isVerified = await verifyDiscordInteraction(
    rawBody,
    signature,
    timestamp,
  );

  if (!isVerified) {
    return NextResponse.json(
      { success: false, message: "invalid request signature" },
      { status: 401 },
    );
  }

  if (parseError) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid Discord interaction payload",
      },
      { status: 400 },
    );
  }

  const payload = {
    method: req.method,
    headers: sanitizeHeaders(req.headers),
    interaction,
    timestamp: new Date().toISOString(),
  };

  after(() => forwardDiscordEvent(payload));

  return NextResponse.json(createInteractionResponse(interaction), {
    status: 200,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-signature-ed25519, x-signature-timestamp",
    },
  });
}
