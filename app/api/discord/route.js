import crypto from "node:crypto";
import axios from "axios";
import { after, NextResponse } from "next/server";

const INTERACTION_TYPE = {
  ping: 1,
  applicationCommand: 2,
  messageComponent: 3,
  autocomplete: 4,
  modalSubmit: 5,
};

const INTERACTION_RESPONSE_TYPE = {
  pong: 1,
  channelMessageWithSource: 4,
  deferredChannelMessageWithSource: 5,
  deferredMessageUpdate: 6,
  autocompleteResult: 8,
};

const EPHEMERAL_FLAG = 64;
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

const createLinkCommandResponse = async (interaction) => {
  const discordUserId =
    interaction.user?.id ?? interaction.member?.user?.id ?? null;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!discordUserId || !clientId || !redirectUri) {
    return {
      data: {
        content: "Account linking is not configured. Please try again later.",
      },
    };
  }

  try {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle, OAuth2Scopes } =
      await import("discord.js");
    const [
      { createOAuthState, DISCORD_OAUTH_STATE_TTL_SECONDS, hashOAuthState },
      { getSupabaseAdmin },
    ] = await Promise.all([
      import("../../../lib/discord-account-linking.js"),
      import("../../../lib/supabase-admin.js"),
    ]);
    const state = createOAuthState();
    const expiresAt = new Date(
      Date.now() + DISCORD_OAUTH_STATE_TTL_SECONDS * 1000,
    ).toISOString();
    const supabase = getSupabaseAdmin();
    const { error: cleanupError } = await supabase
      .from("oauth_states")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (cleanupError) {
      throw cleanupError;
    }

    const { error } = await supabase.from("oauth_states").insert({
      state_hash: hashOAuthState(state),
      provider: "discord",
      discord_user_id: discordUserId,
      expires_at: expiresAt,
    });

    if (error) {
      throw error;
    }

    const authorizeUrl = new URL("https://discord.com/oauth2/authorize");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", OAuth2Scopes.Identify);
    authorizeUrl.searchParams.set("state", state);

    const linkButton = new ButtonBuilder()
      .setLabel("Link Discord account")
      .setStyle(ButtonStyle.Link)
      .setURL(authorizeUrl.toString());
    return {
      data: {
        content: "This secure account-linking link expires in 10 minutes.",
        components: [new ActionRowBuilder().addComponents(linkButton).toJSON()],
      },
    };
  } catch (error) {
    console.error(
      "Unable to start Discord account linking:",
      error instanceof Error ? error.message : error,
    );
    return {
      data: {
        content: "Unable to start account linking. Please try again later.",
      },
    };
  }
};

const completeLinkCommand = async (interaction) => {
  const applicationId = interaction.application_id;
  const interactionToken = interaction.token;

  if (!applicationId || !interactionToken) {
    console.error(
      "Cannot complete /link without an interaction callback token.",
    );
    return;
  }

  const response = await createLinkCommandResponse(interaction);
  const { content, components } = response.data;

  try {
    await axios.patch(
      `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
      { content, components },
      { timeout: 2500 },
    );
  } catch (error) {
    console.error(
      "Unable to deliver the Discord account-link response:",
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
    case INTERACTION_TYPE.ping:
      return { type: INTERACTION_RESPONSE_TYPE.pong };
    case INTERACTION_TYPE.applicationCommand:
    case INTERACTION_TYPE.modalSubmit:
      return {
        type: INTERACTION_RESPONSE_TYPE.deferredChannelMessageWithSource,
      };
    case INTERACTION_TYPE.messageComponent:
      return { type: INTERACTION_RESPONSE_TYPE.deferredMessageUpdate };
    case INTERACTION_TYPE.autocomplete:
      return {
        type: INTERACTION_RESPONSE_TYPE.autocompleteResult,
        data: { choices: [] },
      };
    default:
      return {
        type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
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

  if (interaction.type === INTERACTION_TYPE.ping) {
    return NextResponse.json(
      { type: INTERACTION_RESPONSE_TYPE.pong },
      { status: 200 },
    );
  }

  const payload = {
    method: req.method,
    headers: sanitizeHeaders(req.headers),
    interaction: { ...interaction },
    timestamp: new Date().toISOString(),
  };

  delete payload.interaction.token;

  if (
    interaction.type === INTERACTION_TYPE.applicationCommand &&
    interaction.data?.name === "link"
  ) {
    after(async () => {
      await Promise.all([
        completeLinkCommand(interaction),
        forwardDiscordEvent(payload),
      ]);
    });

    return NextResponse.json(
      {
        type: INTERACTION_RESPONSE_TYPE.deferredChannelMessageWithSource,
        data: { flags: EPHEMERAL_FLAG },
      },
      { status: 200 },
    );
  }

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
