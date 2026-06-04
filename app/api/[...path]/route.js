import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import crypto from 'crypto';
import { handleApiRequest } from '../../../lib/apiHandler.js';
import { sessionOptions, toReq } from '../../../lib/session.js';

async function getReqSession(request) {
  const response = new NextResponse();
  const session = await getIronSession(request, response, sessionOptions);
  if (!session.cartSessionId) {
    session.cartSessionId = crypto.randomUUID();
    await session.save();
  }
  return {
    req: toReq(session, session.cartSessionId),
    session,
    response,
  };
}

function mergeSessionCookies(jsonResponse, sessionResponse) {
  sessionResponse.headers.getSetCookie?.()?.forEach((cookie) => {
    jsonResponse.headers.append('Set-Cookie', cookie);
  });
  return jsonResponse;
}

export async function GET(request, { params }) {
  const { req, response } = await getReqSession(request);
  const { searchParams } = new URL(request.url);
  const query = Object.fromEntries(searchParams.entries());
  const resolved = await params;
  const result = await handleApiRequest('GET', resolved.path || [], req, {
    query,
  });
  const jsonRes = NextResponse.json(result.body, { status: result.status });
  return mergeSessionCookies(jsonRes, response);
}

export async function POST(request, { params }) {
  const { req, response } = await getReqSession(request);
  const body = await request.json().catch(() => ({}));
  const resolved = await params;
  const result = await handleApiRequest('POST', resolved.path || [], req, { body });
  const jsonRes = NextResponse.json(result.body, { status: result.status });
  return mergeSessionCookies(jsonRes, response);
}

export async function PATCH(request, { params }) {
  const { req, response } = await getReqSession(request);
  const body = await request.json().catch(() => ({}));
  const resolved = await params;
  const result = await handleApiRequest('PATCH', resolved.path || [], req, { body });
  const jsonRes = NextResponse.json(result.body, { status: result.status });
  return mergeSessionCookies(jsonRes, response);
}

export async function DELETE(request, { params }) {
  const { req, response } = await getReqSession(request);
  const resolved = await params;
  const result = await handleApiRequest('DELETE', resolved.path || [], req, {});
  const jsonRes = NextResponse.json(result.body, { status: result.status });
  return mergeSessionCookies(jsonRes, response);
}
