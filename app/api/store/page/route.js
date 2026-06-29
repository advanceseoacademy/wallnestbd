import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import crypto from 'crypto';
import { sessionOptions, toReq } from '../../../../lib/session.js';
import {
  renderStorePageByPath,
  requestLikeFromHeaders,
} from '../../../../lib/storePageRender.js';

const STORE_PATH =
  /^\/$|^\/new-arrivals$|^\/track-order$|^\/reviews$|^\/product\/[^/]+$|^\/category\/[^/]+$/;

async function getReqLike(request) {
  const response = new NextResponse();
  const session = await getIronSession(request, response, sessionOptions);
  if (!session.cartSessionId) {
    session.cartSessionId = crypto.randomUUID();
    await session.save();
  }
  const reqLike = toReq(session, session.cartSessionId);
  reqLike.httpReq = requestLikeFromHeaders(request.headers);
  return { reqLike, response };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = (searchParams.get('path') || '/').split('?')[0];

  if (!STORE_PATH.test(path)) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  try {
    const { reqLike, response } = await getReqLike(request);
    const page = searchParams.get('page');
    const query = page ? { page } : {};
    const rendered = await renderStorePageByPath(reqLike, path, query);
    if (!rendered?.bodyHtml) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const jsonRes = NextResponse.json(rendered, {
      status: 200,
      headers: { 'Cache-Control': 'private, no-store' },
    });
    response.headers.getSetCookie?.()?.forEach((cookie) => {
      jsonRes.headers.append('Set-Cookie', cookie);
    });
    return jsonRes;
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Render failed' },
      { status: 500 }
    );
  }
}
