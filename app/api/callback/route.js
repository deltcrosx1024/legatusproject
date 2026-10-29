import axios from 'axios';
import { NextResponse } from 'next/server';

const FORWARD_URL = process.env.CALLBACK_FORWARD_URL || 'https://example.com/forward-endpoint';

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

const handleCallback = async (req) => {
  const url = new URL(req.url);
  const body = await parseRequestBody(req);
  const callbackData = {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: sanitizeHeaders(req.headers),
    body,
    timestamp: new Date().toISOString(),
  };

  console.log('Received callback data:', callbackData);
  console.dir(callbackData, { depth: null });

  try {
    const response = await axios.post(FORWARD_URL, callbackData, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
      validateStatus: (status) => status >= 200 && status < 500,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Callback received and processed successfully',
        forwarded: {
          status: response.status,
          data: response.data ?? null,
        },
        receivedData: {
          method: callbackData.method,
          path: callbackData.path,
          query: callbackData.query,
          timestamp: callbackData.timestamp,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error processing callback:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Error processing callback',
        error: axios.isAxiosError(error) ? error.message : 'Unknown error',
      },
      { status: 200 },
    );
  }
};

export async function GET(req) {
  return handleCallback(req);
}

export async function POST(req) {
  return handleCallback(req);
}

export async function PUT(req) {
  return handleCallback(req);
}

export async function PATCH(req) {
  return handleCallback(req);
}

export async function DELETE(req) {
  return handleCallback(req);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}