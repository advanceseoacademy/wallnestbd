'use client';

import { useEffect, useMemo, useState } from 'react';

const ADMIN_COMMON = '/js/admin-common.js';

function adminCommonReady() {
  return typeof window !== 'undefined' && typeof window.runAdminPageInit === 'function';
}

/** Load admin page scripts with cache-bust so inits re-run after client-side nav. */
export default function AdminScripts({ scriptSrcs = [] }) {
  const ordered = useMemo(
    () => (scriptSrcs || []).filter((s) => s !== ADMIN_COMMON),
    [scriptSrcs]
  );

  const loadKey = ordered.join('|');
  const [commonReady, setCommonReady] = useState(adminCommonReady);

  useEffect(() => {
    if (adminCommonReady()) {
      setCommonReady(true);
      return undefined;
    }

    let cancelled = false;
    const poll = setInterval(() => {
      if (cancelled) return;
      if (adminCommonReady()) {
        clearInterval(poll);
        setCommonReady(true);
      }
    }, 20);

    const timeout = setTimeout(() => {
      cancelled = true;
      clearInterval(poll);
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, [loadKey]);

  useEffect(() => {
    if (!commonReady || !ordered.length) return undefined;

    let cancelled = false;
    let index = 0;

    const loadNext = () => {
      if (cancelled || index >= ordered.length) return;
      const src = ordered[index];
      index += 1;
      const el = document.createElement('script');
      const bust = `_=${Date.now()}_${index}`;
      el.src = src.includes('?') ? `${src}&${bust}` : `${src}?${bust}`;
      el.async = false;
      el.onload = () => loadNext();
      el.onerror = () => {
        console.error('[admin] script failed:', src);
        loadNext();
      };
      document.body.appendChild(el);
    };

    loadNext();

    return () => {
      cancelled = true;
    };
  }, [loadKey, commonReady, ordered]);

  return null;
}
