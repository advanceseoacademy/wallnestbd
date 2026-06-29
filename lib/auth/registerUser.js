const { getSupabaseAdmin } = require('../supabaseAdmin');
const { supabase } = require('../supabase');

function siteUrl() {
  return process.env.BASE_URL || 'http://localhost:3000';
}

function verificationRedirectUrl() {
  return `${siteUrl()}/auth/verify`;
}

function extractVerificationUrl(data) {
  return (
    data?.properties?.action_link ||
    data?.properties?.confirmation_url ||
    null
  );
}

async function upsertProfile(userId, firstName, lastName) {
  if (!userId) return;
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    first_name: firstName || null,
    last_name: lastName || null,
  });
  if (error) console.error('profiles upsert:', error.message);
}

async function generateSignupVerificationLink({
  email,
  password,
  firstName,
  lastName,
}) {
  const admin = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'signup',
    email: normalizedEmail,
    password,
    options: {
      redirectTo: verificationRedirectUrl(),
      data: {
        first_name: firstName || '',
        last_name: lastName || '',
      },
    },
  });

  if (error) throw error;

  const verificationUrl = extractVerificationUrl(data);
  if (!verificationUrl) {
    throw new Error('Verification link could not be generated');
  }

  await upsertProfile(data?.user?.id, firstName, lastName);

  return {
    user: data?.user || null,
    verificationUrl,
    email: normalizedEmail,
  };
}

async function registerUserWithVerification({
  email,
  password,
  firstName,
  lastName,
}) {
  return generateSignupVerificationLink({
    email,
    password,
    firstName,
    lastName,
  });
}

async function resendVerificationLink({ email, password }) {
  if (!email || !password) {
    throw new Error('ইমেইল ও পাসওয়ার্ড প্রয়োজন');
  }

  return generateSignupVerificationLink({
    email,
    password,
    firstName: '',
    lastName: '',
  });
}

function mapAuthError(err) {
  const message = err?.message || 'অনুগ্রহ করে আবার চেষ্টা করুন';
  const code = err?.code || '';

  if (
    code === 'email_not_confirmed' ||
    message.toLowerCase().includes('email not confirmed')
  ) {
    return 'ইমেইল এখনো যাচাই হয়নি। ইনবক্সে যাচাই লিংক চেক করুন।';
  }

  if (
    code === 'user_already_exists' ||
    message.toLowerCase().includes('already registered') ||
    message.toLowerCase().includes('already been registered')
  ) {
    return 'এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট আছে। লগইন করুন।';
  }

  if (code === 'invalid_credentials' || message.includes('Invalid login')) {
    return 'ইমেইল বা পাসওয়ার্ড সঠিক নয়';
  }

  return message;
}

module.exports = {
  registerUserWithVerification,
  resendVerificationLink,
  mapAuthError,
  verificationRedirectUrl,
};
