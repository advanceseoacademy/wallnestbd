'use client';

import Script from 'next/script';
import { useEffect, useMemo, useState } from 'react';

const ADMIN_COMMON = '/js/admin-common.js';

function adminCommonReady() {
  return typeof window !== 'undefined' && typeof window.runAdminPageInit === 'function';
}

/** Page scripts run only after admin-common.js (defines runAdminPageInit). */
export default function AdminScripts({ scriptSrcs = [] }) {
  const ordered = useMemo(
    () => (scriptSrcs || []).filter((s) => s !== ADMIN_COMMON),
    [scriptSrcs]
  );

  const loadKey = ordered.join('|');
  const [commonReady, setCommonReady] = useState(adminCommonReady);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    if (adminCommonReady()) {
      setCommonReady(true);
      setLoaded(ordered.length ? 1 : 0);
      return undefined;
    }

    let cancelled = false;
    const poll = setInterval(() => {
      if (cancelled) return;
      if (adminCommonReady()) {
        clearInterval(poll);
        setCommonReady(true);
        setLoaded(ordered.length ? 1 : 0);
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
  }, [loadKey, ordered.length]);

  if (!ordered.length) return null;
  if (!commonReady) return null;

  return (
    <>
      {ordered.slice(0, loaded).map((src, i) => (
        <Script
          key={`${loadKey}-${src}`}
          src={src}
          strategy="afterInteractive"
          onLoad={() => {
            if (i === loaded - 1 && loaded < ordered.length) {
              setLoaded((n) => n + 1);
            }
          }}
        />
      ))}
    </>
  );
}
