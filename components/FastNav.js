'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { readPageCache, refreshNavContext } from './StorePage';

const STORE_PATHS = /^\/$|^\/product\/[^/]+$/;

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

export default function FastNav() {
  const router = useRouter();

  useEffect(() => {
    const prefetchPath = (path) => {
      if (!storePath(path.split('?')[0])) return;
      router.prefetch(path);
    };

    const onClick = (e) => {
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
      if (!storePath(url.pathname)) return;

      const cached = readPageCache(path);
      if (cached) {
        e.preventDefault();
        document.body.classList.add('route-loading');
        window.dispatchEvent(new CustomEvent('wn:fast-page', { detail: cached }));
        router.push(path).finally(() => {
          document.body.classList.remove('route-loading');
          refreshNavContext();
        });
        return;
      }

      e.preventDefault();
      document.body.classList.add('route-loading');
      router.push(path);
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
    const start = () => document.body.classList.add('route-loading');
    const end = () => document.body.classList.remove('route-loading');

    const done = () => {
      end();
      refreshNavContext();
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
    ['/'].forEach((p) => router.prefetch(p));
  }, [router.isReady]);

  return null;
}
