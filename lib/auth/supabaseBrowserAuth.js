function projectRefFromUrl(url) {
  const match = String(url || '').match(/https?:\/\/([^.]+)\.supabase\.co/i);
  return match?.[1] || '';
}

function supabaseAuthStorageKey(url) {
  const ref = projectRefFromUrl(url);
  return ref ? `sb-${ref}-auth-token` : 'sb-auth-token';
}

function supabaseBrowserAuthOptions(url) {
  return {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: supabaseAuthStorageKey(url),
    },
  };
}

module.exports = {
  projectRefFromUrl,
  supabaseAuthStorageKey,
  supabaseBrowserAuthOptions,
};
