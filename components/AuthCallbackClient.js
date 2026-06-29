'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const AUTH_STORAGE_KEY_RE = /https?:\/\/([^.]+)\.supabase\.co/i;

function authStorageKey(url) {
  const ref = String(url || '').match(AUTH_STORAGE_KEY_RE)?.[1];
  return ref ? `sb-${ref}-auth-token` : 'sb-auth-token';
}

function readOAuthCode() {
  const query = new URLSearchParams(window.location.search);
  const fromQuery = query.get('code');
  if (fromQuery) return fromQuery;

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  return hashParams.get('code');
}

export default function AuthCallbackClient({ supabaseConfig }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || '/account';
      const errorParam = params.get('error_description') || params.get('error');

      if (errorParam) {
        if (!cancelled) setError(decodeURIComponent(errorParam));
        return;
      }

      const url = supabaseConfig?.url;
      const key = supabaseConfig?.key;
      if (!url || !key) {
        if (!cancelled) setError('Supabase কনফিগার করা নেই।');
        return;
      }

      const code = readOAuthCode();
      if (!code) {
        if (!cancelled) setError('OAuth কোড পাওয়া যায়নি। আবার Google দিয়ে লগইন করুন।');
        return;
      }

      try {
        const sb = createClient(url, key, {
          auth: {
            flowType: 'pkce',
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storageKey: authStorageKey(url),
          },
        });
        const { data, error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          const msg = (exchangeError.message || '').toLowerCase();
          if (msg.includes('code verifier') || msg.includes('pkce')) {
            throw new Error(
              'লগইন শেষ হয়নি। একই সাইট থেকে (যেখানে Google বাটন চাপেছেন) আবার লগইন করুন।'
            );
          }
          throw exchangeError;
        }

        const accessToken = data?.session?.access_token;
        if (!accessToken) throw new Error('সেশন তৈরি হয়নি');

        const res = await fetch('/api/auth/oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ access_token: accessToken }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'সার্ভার লগইন ব্যর্থ');

        try {
          Object.keys(sessionStorage).forEach((key) => {
            if (key.startsWith('wn_page_') || key.startsWith('wn_account_')) {
              sessionStorage.removeItem(key);
            }
          });
        } catch {
          /* ignore */
        }

        window.location.replace(next.startsWith('/') ? next : '/account');
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'অনুগ্রহ করে আবার চেষ্টা করুন');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabaseConfig]);

  if (error) {
    return (
      <div
        className="site-wrap"
        style={{
          padding: '48px 16px',
          textAlign: 'center',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>লগইন ব্যর্থ</p>
        <p style={{ color: '#6B7280', marginBottom: 20 }}>{error}</p>
        <a href="/" style={{ color: '#0071CE', fontWeight: 600 }}>
          হোমে ফিরুন
        </a>
      </div>
    );
  }

  return (
    <div
      className="site-wrap"
      style={{
        padding: '48px 16px',
        textAlign: 'center',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
        Google দিয়ে লগইন হচ্ছে…
      </p>
      <p style={{ color: '#6B7280' }}>অনুগ্রহ করে অপেক্ষা করুন।</p>
    </div>
  );
}
