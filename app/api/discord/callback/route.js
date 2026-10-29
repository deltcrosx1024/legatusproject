import axios from 'axios';
import { NextResponse } from 'next/server';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const FORWARD_URL = process.env.DISCORD_FORWARD_URL || process.env.CALLBACK_FORWARD_URL || 'https://example.com/discord-oauth-endpoint';

const sanitizeHeaders = (headers) => {
  const entries = Object.entries(Object.fromEntries(headers.entries()));

  return Object.fromEntries(
    entries.map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value]),
  );
};

const parseRequestBody = async (req) => {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return req.json().catch(() => ({}));
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text();

    if (!text) {
      return {};
    }

    const params = new URLSearchParams(text);
    return Object.fromEntries(params.entries());
  }

  const text = await req.text().catch(() => '');
  return text ? { raw: text } : {};
};

const exchangeCodeForToken = async (code) => {
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
    return null;
  }

  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: DISCORD_REDIRECT_URI,
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || 'Discord OAuth token exchange failed');
  }

  return data;
};

const forwardDiscordOauthData = async (payload) => {
  if (!FORWARD_URL || FORWARD_URL.includes('example.com')) {
    return null;
  }

  try {
    const response = await axios.post(
      FORWARD_URL,
      {
        source: 'discord-oauth',
        ...payload,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 500,
      },
    );

    return response.data ?? null;
  } catch (error) {
    console.error('Error forwarding Discord OAuth payload:', error);
    return null;
  }
};

export async function GET(req) {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams.entries());

  const payload = {
    method: req.method,
    path: url.pathname,
    query,
    headers: sanitizeHeaders(req.headers),
    timestamp: new Date().toISOString(),
  };

  console.log('Received Discord OAuth callback:', payload);

  let tokenData = null;

  if (query.code) {
    try {
      tokenData = await exchangeCodeForToken(query.code);
    } catch (error) {
      console.error('Discord OAuth token exchange failed:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Discord OAuth callback received but token exchange failed',
          error: error.message,
          callback: payload,
        },
        { status: 400 },
      );
    }
  }

  await forwardDiscordOauthData({ ...payload, token: tokenData });

  return NextResponse.json(
    {
      success: true,
      service: 'discord-oauth2-callback',
      callback: payload,
      token: tokenData,
    },
    { status: 200 },
  );
}

export async function POST(req) {
  const body = await parseRequestBody(req);
  const payload = {
    method: req.method,
    headers: sanitizeHeaders(req.headers),
    body,
    timestamp: new Date().toISOString(),
  };

  console.log('Received Discord OAuth POST payload:', payload);

  await forwardDiscordOauthData(payload);

  return NextResponse.json(
    {
      success: true,
      message: 'Discord OAuth payload received successfully',
      payload,
    },
    { status: 200 },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
