import crypto from 'node:crypto';
import axios from 'axios';
import { NextResponse } from 'next/server';

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const FORWARD_URL = process.env.DISCORD_FORWARD_URL || process.env.CALLBACK_FORWARD_URL || 'https://example.com/discord-endpoint';

const sanitizeHeaders = (headers) => {
  const entries = Object.entries(Object.fromEntries(headers.entries()));

  return Object.fromEntries(
    entries.map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value]),
  );
};

const verifyDiscordInteraction = async (rawBody, signature, timestamp) => {
  if (!DISCORD_PUBLIC_KEY) {
    return true;
  }

  if (!signature || !timestamp) {
    return false;
  }

  try {
    const publicKeyHex = DISCORD_PUBLIC_KEY.replace(/^0x/, '').trim();
    const keyData = Uint8Array.from(Buffer.from(publicKeyHex, 'hex'));
    const signatureData = Uint8Array.from(Buffer.from(signature, 'hex'));
    const signedPayload = new TextEncoder().encode(`${timestamp}${rawBody}`);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'NODE-ED25519' },
      false,
      ['verify'],
    );

    return crypto.subtle.verify('NODE-ED25519', key, signatureData, signedPayload);
  } catch (error) {
    console.error('Discord interaction signature verification failed:', error);
    return false;
  }
};

const forwardDiscordEvent = async (payload) => {
  if (!FORWARD_URL || FORWARD_URL.includes('example.com')) {
    return null;
  }

  try {
    const response = await axios.post(
      FORWARD_URL,
      {
        source: 'discord-interaction',
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
    console.error('Error forwarding Discord interaction payload:', error);
    return null;
  }
};

async function handleDiscordInteraction(req) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature-ed25519') || '';
  const timestamp = req.headers.get('x-signature-timestamp') || '';

  if (signature || timestamp) {
    const valid = await verifyDiscordInteraction(rawBody, signature, timestamp);

    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid Discord interaction signature',
        },
        { status: 401 },
      );
    }
  }

  const interaction = rawBody ? JSON.parse(rawBody) : {};
  const payload = {
    method: req.method,
    headers: sanitizeHeaders(req.headers),
    interaction,
    timestamp: new Date().toISOString(),
  };

  console.log('Received Discord interaction payload:', payload);

  await forwardDiscordEvent(payload);

  if (interaction?.type === 1) {
    return NextResponse.json({ type: 1 }, { status: 200 });
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Discord interaction received successfully',
      interaction: interaction?.type ?? null,
    },
    { status: 200 },
  );
}

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      service: 'discord-interaction-endpoint',
      message: 'Discord interaction endpoint is active.',
      methods: ['POST'],
    },
    { status: 200 },
  );
}

export async function POST(req) {
  return handleDiscordInteraction(req);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-signature-ed25519, x-signature-timestamp',
    },
  });
}
