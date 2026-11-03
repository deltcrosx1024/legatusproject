import axios from "axios";
import { OAuth2Scopes } from "discord.js";
import { NextResponse } from "next/server";
import {
  encryptOAuthToken,
  getOAuthEncryptionKey,
  hashOAuthState,
} from "../../../../lib/discord-account-linking.js";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "../../../../lib/supabase-admin.js";

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const FORWARD_URL =
  process.env.DISCORD_OAUTH_FORWARD_URL ||
  process.env.DISCORD_FORWARD_URL ||
  process.env.CALLBACK_FORWARD_URL;

const exchangeCodeForToken = async (code) => {
  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: DISCORD_REDIRECT_URI,
  });

  const response = await axios.post(
    "https://discord.com/api/oauth2/token",
    body.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    },
  );

  return response.data;
};

const getDiscordUser = async (accessToken) => {
  const response = await axios.get("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 10000,
  });

  return response.data;
};

const createUserSummary = (user) => ({
  id: user.id,
  username: user.username,
  globalName: user.global_name ?? null,
  avatar: user.avatar ?? null,
});

export async function GET(req) {
  if (
    !DISCORD_CLIENT_ID ||
    !DISCORD_CLIENT_SECRET ||
    !DISCORD_REDIRECT_URI ||
    !isSupabaseConfigured()
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Discord OAuth or Supabase is not configured.",
      },
      { status: 503 },
    );
  }

  let supabase;

  try {
    supabase = getSupabaseAdmin();
    getOAuthEncryptionKey();
  } catch (error) {
    console.error(
      "Discord account-link storage configuration is invalid:",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Discord account-link storage is not configured.",
      },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (url.searchParams.has("error")) {
    return NextResponse.json(
      {
        success: false,
        message: "Discord authorization was not completed.",
      },
      { status: 400 },
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      {
        success: false,
        message: "Discord OAuth callback requires both code and state.",
      },
      { status: 400 },
    );
  }

  let token;
  let discordUser;

  try {
    token = await exchangeCodeForToken(code);
    const scopes =
      typeof token.scope === "string" ? token.scope.split(/\s+/) : [];

    if (!token.access_token || !scopes.includes(OAuth2Scopes.Identify)) {
      return NextResponse.json(
        {
          success: false,
          message: "Discord OAuth must grant the identify scope.",
        },
        { status: 400 },
      );
    }

    discordUser = await getDiscordUser(token.access_token);
  } catch (error) {
    console.error(
      "Discord OAuth token exchange or identity lookup failed:",
      axios.isAxiosError(error) ? error.message : error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Discord OAuth verification failed.",
      },
      { status: 502 },
    );
  }

  let matchingStates;
  let stateError;

  try {
    ({ data: matchingStates, error: stateError } = await supabase.rpc(
      "consume_oauth_state",
      {
        p_state_hash: hashOAuthState(state),
        p_provider: "discord",
        p_discord_user_id: discordUser.id,
      },
    ));
  } catch (error) {
    console.error(
      "Unable to validate Discord OAuth state:",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to validate Discord OAuth state.",
      },
      { status: 500 },
    );
  }

  if (stateError) {
    console.error(
      "Unable to validate Discord OAuth state:",
      stateError.message,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to validate Discord OAuth state.",
      },
      { status: 500 },
    );
  }

  if (!matchingStates?.length) {
    return NextResponse.json(
      {
        success: false,
        message: "Discord OAuth state is invalid, expired, or already used.",
      },
      { status: 400 },
    );
  }

  const profile = createUserSummary(discordUser);
  const expiresIn = Number(token.expires_in);
  let linkError;

  try {
    ({ error: linkError } = await supabase
      .from("account_provider_links")
      .upsert(
        {
          discord_user_id: discordUser.id,
          provider: "discord",
          provider_user_id: discordUser.id,
          username: discordUser.username,
          profile,
          oauth_token_encrypted: encryptOAuthToken(token),
          token_expires_at:
            Number.isFinite(expiresIn) && expiresIn > 0
              ? new Date(Date.now() + expiresIn * 1000).toISOString()
              : null,
          scopes:
            typeof token.scope === "string" ? token.scope.split(/\s+/) : [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "discord_user_id,provider" },
      ));
  } catch (error) {
    console.error(
      "Unable to save Discord account link:",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Discord account link could not be saved.",
      },
      { status: 500 },
    );
  }

  if (linkError) {
    console.error("Unable to save Discord account link:", linkError.message);

    return NextResponse.json(
      {
        success: false,
        message: "Discord account link could not be saved.",
      },
      { status: 500 },
    );
  }

  let backendNotified = false;

  if (FORWARD_URL && !FORWARD_URL.includes("example.com")) {
    try {
      await axios.post(
        FORWARD_URL,
        {
          version: 1,
          source: "discord-oauth",
          event: "account.linked",
          state,
          user: profile,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      );
      backendNotified = true;
    } catch (error) {
      console.error(
        "Discord account link was saved, but backend notification failed:",
        axios.isAxiosError(error) ? error.message : error,
      );
    }
  }

  return NextResponse.json(
    {
      success: true,
      service: "discord-oauth2-callback",
      message: "Discord account linked successfully.",
      user: profile,
      backendNotified,
    },
    { status: 200 },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
