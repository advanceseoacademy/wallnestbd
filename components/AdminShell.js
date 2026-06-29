'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import AdminScripts from './AdminScripts';

const CACHE_PREFIX = 'wn_admin_v3:';
const CACHE_TTL_MS = 5 * 60 * 1000;

const ADMIN_PATHS = new Set([
  'dashboard',
  'orders',
  'products',
  'products/new',
  'products/edit',
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

function adminSubpath(pathname) {
  return pathname.replace(/^\/admin\/?/, '').split('?')[0] || 'dashboard';
}

function updateSidebarActive(path) {
  const slug =
    path || (typeof window !== 'undefined' ? adminSubpath(window.location.pathname) : 'dashboard');
  document.querySelectorAll('.sidebar .nav-item[data-page]').forEach((el) => {
    const navPage = el.dataset.page;
    const active = slug === navPage || slug.startsWith(`${navPage}/`);
    el.classList.toggle('active', active);
  });
}

function isAdminPath(path) {
  return ADMIN_PATHS.has(path);
}

export default function AdminShell({
  sidebarHtml,
  mainHtml,
  scriptSrcs,
  page,
  adminPath,
}) {
  const router = useRouter();
  const routeKey = adminPath || page;
  const [main, setMain] = useState(mainHtml);
  const [scripts, setScripts] = useState(scriptSrcs || []);
  const [navigating, setNavigating] = useState(false);
  const skipRouteLoadRef = useRef(false);
  const ssrSyncedRef = useRef(false);

  const applyPage = useCallback((data) => {
    setMain(data.mainHtml);
    setScripts(data.scriptSrcs || []);
    updateSidebarActive(data.adminPath || data.page);
  }, []);

  useLayoutEffect(() => {
    if (!main) return;
    document.body.style.overflow = '';
    window.dispatchEvent(new CustomEvent('wn:admin-main'));
  }, [main]);

  useEffect(() => {
    const pathSlug = adminSubpath(router.asPath.split('?')[0]);
    updateSidebarActive(pathSlug);
    if (routeKey !== pathSlug) return;

    applyPage({
      mainHtml,
      scriptSrcs: scriptSrcs || [],
      page,
      adminPath: routeKey,
    });
    if (mainHtml && router.asPath) {
      writeAdminCache(router.asPath.split('?')[0], {
        mainHtml,
        scriptSrcs: scriptSrcs || [],
        page,
        adminPath: routeKey,
      });
    }
  }, [mainHtml, scriptSrcs, page, routeKey, router.asPath, applyPage]);

  const loadPage = useCallback(
    async (pathnameWithQuery) => {
      const url = new URL(pathnameWithQuery, window.location.origin);
      const pathOnly = url.pathname;
      const subpath = adminSubpath(pathOnly);
      if (!isAdminPath(subpath)) return;

      const cacheKey = pathOnly + url.search;
      const cached = readAdminCache(cacheKey);
      if (cached && (cached.adminPath || cached.page)) {
        applyPage(cached);
        return;
      }

      setNavigating(true);
      try {
        const apiUrl = new URL('/api/admin/page', window.location.origin);
        apiUrl.searchParams.set('path', subpath);
        url.searchParams.forEach((value, key) => {
          apiUrl.searchParams.set(key, value);
        });
        const res = await fetch(apiUrl.toString(), { credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'লোড ব্যর্থ');
        applyPage(data);
        writeAdminCache(cacheKey, data);
      } catch (err) {
        console.error(err);
        window.location.href = pathnameWithQuery;
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

      const subpath = adminSubpath(url.pathname);
      if (!isAdminPath(subpath)) return;

      const target = url.pathname + url.search;
      const current = router.asPath;
      if (target === current) return;

      e.preventDefault();
      skipRouteLoadRef.current = true;
      router.push(target, undefined, { shallow: true });
      loadPage(target);
    };

    const onRoute = (url) => {
      if (!url.startsWith('/admin')) return;
      if (url.includes('/login')) return;
      if (skipRouteLoadRef.current) {
        skipRouteLoadRef.current = false;
        return;
      }

      const subpath = adminSubpath(url.split('?')[0]);
      if (!ssrSyncedRef.current && subpath === routeKey) {
        ssrSyncedRef.current = true;
        window.dispatchEvent(new CustomEvent('wn:admin-main'));
        return;
      }
      ssrSyncedRef.current = true;
      loadPage(url);
    };

    const prefetch = (e) => {
      const a = e.target.closest('a[href^="/admin"]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.includes('login')) return;
      try {
        const url = new URL(href, window.location.origin);
        const subpath = adminSubpath(url.pathname);
        if (!isAdminPath(subpath)) return;
        const apiUrl = new URL('/api/admin/page', window.location.origin);
        apiUrl.searchParams.set('path', subpath);
        url.searchParams.forEach((value, key) => {
          apiUrl.searchParams.set(key, value);
        });
        fetch(apiUrl.toString(), { credentials: 'same-origin' }).then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          writeAdminCache(url.pathname + url.search, data);
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
  }, [router, loadPage, routeKey]);

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
