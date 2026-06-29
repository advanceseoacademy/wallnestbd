'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { readPageCache, writePageCache, refreshNavContext } from './StorePage';
import {
  readAccountCache,
  writeAccountCache,
} from './AccountPage';
import { ensureAccountStylesheet } from '../lib/client/ensureAccountStylesheet';

const STORE_PATHS = /^\/$|^\/new-arrivals$|^\/track-order$|^\/checkout$|^\/reviews$|^\/product\/[^/]+$|^\/category\/[^/]+$/;
const ACCOUNT_PATH = '/account';

const prefetchInflight = new Set();
const accountPrefetchInflight = { current: false };

function shouldSkip(a, e) {
  if (!a?.href) return true;
  if (a.target === '_blank' || a.download) return true;
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return true;
  if (a.getAttribute('onclick')) return true;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return true;
  if (href.startsWith('mailto:') || href.startsWith('tel:')) return true;
  return false;
}

function storePath(pathname) {
  return STORE_PATHS.test(pathname);
}

function accountPath(pathname) {
  return pathname === ACCOUNT_PATH;
}

async function fetchStorePage(pathWithQuery) {
  const pathname = pathWithQuery.split('?')[0].split('#')[0];
  const qs = pathWithQuery.includes('?') ? pathWithQuery.split('?')[1].split('#')[0] : '';
  const pageParam = qs ? new URLSearchParams(qs).get('page') : null;
  let url = `/api/store/page?path=${encodeURIComponent(pathname)}`;
  if (pageParam) url += `&page=${encodeURIComponent(pageParam)}`;
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) return null;
  return res.json();
}

async function fetchAccountPage() {
  const res = await fetch('/api/account/page', { credentials: 'same-origin' });
  if (!res.ok) return null;
  return res.json();
}

function prefetchStorePage(path) {
  const clean = path.split('?')[0].split('#')[0];
  if (!storePath(clean)) return;
  const cacheKey = path.split('#')[0];
  if (readPageCache(cacheKey)) return;
  if (prefetchInflight.has(cacheKey)) return;

  prefetchInflight.add(cacheKey);
  fetchStorePage(cacheKey)
    .then((data) => {
      if (data?.bodyHtml) writePageCache(cacheKey, data);
    })
    .catch(() => {})
    .finally(() => prefetchInflight.delete(cacheKey));
}

function prefetchAccountPage() {
  ensureAccountStylesheet();
  if (readAccountCache(ACCOUNT_PATH)) return;
  if (accountPrefetchInflight.current) return;
  accountPrefetchInflight.current = true;
  fetchAccountPage()
    .then((data) => {
      if (data?.bodyHtml) writeAccountCache(ACCOUNT_PATH, data);
    })
    .catch(() => {})
    .finally(() => {
      accountPrefetchInflight.current = false;
    });
}

async function loadStorePage(path) {
  const cacheKey = path.split('#')[0];
  const cached = readPageCache(cacheKey);
  if (cached?.bodyHtml) return cached;

  const data = await fetchStorePage(cacheKey);
  if (data?.bodyHtml) {
    writePageCache(cacheKey, data);
    return data;
  }
  return null;
}

async function loadAccountPage() {
  const cached = readAccountCache(ACCOUNT_PATH);
  if (cached?.bodyHtml) return cached;

  const data = await fetchAccountPage();
  if (data?.bodyHtml) {
    writeAccountCache(ACCOUNT_PATH, data);
    return data;
  }
  return null;
}

export default function FastNav() {
  const router = useRouter();

  useEffect(() => {
    const prefetchPath = (path) => {
      const clean = path.split('?')[0];
      if (storePath(clean)) {
        router.prefetch(path);
        prefetchStorePage(path);
      } else if (accountPath(clean)) {
        router.prefetch(ACCOUNT_PATH);
        prefetchAccountPage();
      }
    };

    const onClick = async (e) => {
      const a = e.target.closest('a[href]');
      if (shouldSkip(a, e)) return;

      let url;
      try {
        url = new URL(a.href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const path = url.pathname + url.search + url.hash;
      const current = router.asPath;
      if (path === current || path === router.pathname) return;

      if (storePath(url.pathname)) {
        e.preventDefault();
        document.body.classList.add('route-loading');
        try {
          const page = await loadStorePage(path);
          if (page?.bodyHtml) {
            window.dispatchEvent(new CustomEvent('wn:fast-page', { detail: page }));
          }
          await router.push(path);
        } finally {
          document.body.classList.remove('route-loading');
          refreshNavContext();
        }
        return;
      }

      if (accountPath(url.pathname)) {
        e.preventDefault();
        ensureAccountStylesheet();
        document.body.classList.add('route-loading');
        try {
          const page = await loadAccountPage();
          if (page?.bodyHtml) {
            window.dispatchEvent(new CustomEvent('wn:fast-account', { detail: page }));
          }
          await router.push(ACCOUNT_PATH);
        } finally {
          document.body.classList.remove('route-loading');
        }
      }
    };

    const onPointerDown = (e) => {
      const a = e.target.closest('a[href]');
      if (!a || shouldSkip(a, e)) return;
      try {
        const url = new URL(a.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        prefetchPath(url.pathname + url.search);
      } catch {
        /* ignore */
      }
    };

    const onOver = (e) => {
      const a = e.target.closest('a[href]');
      if (!a || shouldSkip(a, e)) return;
      try {
        const url = new URL(a.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        prefetchPath(url.pathname + url.search);
      } catch {
        /* ignore */
      }
    };

    document.addEventListener('click', onClick);
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('mouseover', onOver);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('mouseover', onOver);
    };
  }, [router]);

  useEffect(() => {
    const skipBar = (url) =>
      url.startsWith('/admin') || url.startsWith('/account');

    const start = (url) => {
      if (skipBar(url)) return;
      if (!document.body.classList.contains('route-loading')) {
        document.body.classList.add('route-loading');
      }
    };
    const end = () => document.body.classList.remove('route-loading');

    const done = (url) => {
      end();
      if (!skipBar(url)) refreshNavContext();
    };

    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', done);
    router.events.on('routeChangeError', end);
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', done);
      router.events.off('routeChangeError', end);
    };
  }, [router]);

  useEffect(() => {
    if (!router.isReady) return;
    const path = router.pathname || router.asPath.split('?')[0];

    ['/', '/new-arrivals', '/reviews'].forEach((p) => {
      router.prefetch(p);
      prefetchStorePage(p);
    });

    if (path.startsWith('/account')) {
      ['/', '/new-arrivals', '/reviews'].forEach((p) => prefetchStorePage(p));
    } else {
      router.prefetch(ACCOUNT_PATH);
      fetch('/api/nav-context', { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.user) prefetchAccountPage();
        })
        .catch(() => {});
    }

    document.querySelectorAll('a[href="/account"], a[href^="/account?"]').forEach(() => {
      prefetchAccountPage();
    });

    document.querySelectorAll('a[href^="/product/"], a[href^="/category/"]').forEach((a) => {
      try {
        const url = new URL(a.href, window.location.origin);
        router.prefetch(url.pathname);
        prefetchStorePage(url.pathname);
      } catch {
        /* ignore */
      }
    });
  }, [router.isReady, router.asPath]);

  return null;
}
