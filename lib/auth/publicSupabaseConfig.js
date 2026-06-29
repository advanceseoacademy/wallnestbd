/** Safe for client import — does not load the server Supabase client. */
function getPublicSupabaseConfig() {
  const url = process.env.SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  return { url, key };
}

module.exports = { getPublicSupabaseConfig };
