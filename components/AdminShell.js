'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import AdminScripts from './AdminScripts';

const CACHE_PREFIX = 'wn_admin_v1:';
const CACHE_TTL_MS = 5 * 60 * 1000;

const ADMIN_PAGES = new Set([
  'dashboard',
  'orders',
  'products',
  'categories',
  'payments',
  'settings',
]);

function readAdminCache(path) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + path);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_PREFIX + path);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeAdminCache(path, data) {
  if (typeof window === 'undefined' || !data?.mainHtml) return;
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + path,
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {
    /* quota */
  }
}

function slugFromPath(pathname) {
  const part = pathname.replace(/^\/admin\/?/, '').split('/')[0];
  return part || 'dashboard';
}

function updateSidebarActive(page) {
  const slug =
    page ||
    (typeof window !== 'undefined' ? slugFromPath(window.location.pathname) : 'dashboard');
  document.querySelectorAll('.sidebar .nav-item[data-page]').forEach((el) => {
    el.classList.toggle('active', el.dataset.page === slug);
  });
}

export default function AdminShell({
  sidebarHtml,
  mainHtml,
  scriptSrcs,
  page,
}) {
  const router = useRouter();
  const [main, setMain] = useState(mainHtml);
  const [scripts, setScripts] = useState(scriptSrcs || []);
  const [navigating, setNavigating] = useState(false);
  const pendingScriptsRef = useRef(null);
  const skipRouteLoadRef = useRef(false);

  const applyPage = useCallback((data, slug) => {
    setScripts([]);
    setMain(data.mainHtml);
    pendingScriptsRef.current = data.scriptSrcs || [];
    updateSidebarActive(data.page || slug);
  }, []);

  useLayoutEffect(() => {
    if (pendingScriptsRef.current === null) return;
    const next = pendingScriptsRef.current;
    pendingScriptsRef.current = null;
    setScripts(next);
  }, [main]);

  useEffect(() => {
    const pathSlug = slugFromPath(router.asPath.split('?')[0]);
    updateSidebarActive(pathSlug);
    // Shallow client nav: props stay from first SSR page; loadPage owns #adminMain.
    if (page !== pathSlug) return;

    applyPage({ mainHtml, scriptSrcs: scriptSrcs || [], page: pathSlug }, pathSlug);
    if (mainHtml && router.asPath) {
      writeAdminCache(router.asPath.split('?')[0], {
        mainHtml,
        scriptSrcs: scriptSrcs || [],
        page,
      });
    }
  }, [mainHtml, scriptSrcs, page, router.asPath, applyPage]);

  const loadPage = useCallback(
    async (pathname) => {
      const path = pathname.split('?')[0];
      const slug = slugFromPath(path);
      if (!ADMIN_PAGES.has(slug)) return;

      const cached = readAdminCache(path);
      if (cached && (cached.page || slug) === slug) {
        applyPage(cached, cached.page || slug);
        return;
      }
      if (cached) {
        try {
          sessionStorage.removeItem(CACHE_PREFIX + path);
        } catch {
          /* ignore */
        }
      }

      setNavigating(true);
      try {
        const res = await fetch(`/api/admin/page?slug=${encodeURIComponent(slug)}`, {
          credentials: 'same-origin',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'লোড ব্যর্থ');
        applyPage(data, data.page || slug);
        writeAdminCache(path, data);
      } catch (err) {
        console.error(err);
        window.location.href = path;
      } finally {
        setNavigating(false);
      }
    },
    [applyPage]
  );

  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest('a[href^="/admin"]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const href = a.getAttribute('href');
      if (!href || href.includes('/admin/login')) return;

      let url;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const path = url.pathname + url.search;
      const current = router.asPath.split('?')[0];
      if (url.pathname === current) return;

      const slug = slugFromPath(url.pathname);
      if (!ADMIN_PAGES.has(slug)) return;

      e.preventDefault();
      skipRouteLoadRef.current = true;
      router.push(url.pathname + url.search, undefined, { shallow: true });
      loadPage(url.pathname);
    };

    const onRoute = (url) => {
      if (!url.startsWith('/admin')) return;
      if (url.includes('/login')) return;
      if (skipRouteLoadRef.current) {
        skipRouteLoadRef.current = false;
        return;
      }
      loadPage(url);
    };

    const prefetch = (e) => {
      const a = e.target.closest('a[href^="/admin"]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.includes('login')) return;
      try {
        const url = new URL(href, window.location.origin);
        const slug = slugFromPath(url.pathname);
        if (!ADMIN_PAGES.has(slug)) return;
        fetch(`/api/admin/page?slug=${encodeURIComponent(slug)}`, {
          credentials: 'same-origin',
        }).then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          writeAdminCache(url.pathname, data);
        });
      } catch {
        /* ignore */
      }
    };

    document.addEventListener('click', onClick);
    document.addEventListener('mouseover', prefetch, { passive: true });
    router.events.on('routeChangeComplete', onRoute);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('mouseover', prefetch);
      router.events.off('routeChangeComplete', onRoute);
    };
  }, [router, loadPage]);

  return (
    <div className={`admin-app-shell${navigating ? ' admin-navigating' : ''}`}>
      <div
        id="adminSidebar"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: sidebarHtml || '' }}
      />
      <div
        id="adminMain"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: main || '' }}
      />
      <AdminScripts scriptSrcs={scripts} />
    </div>
  );
}
