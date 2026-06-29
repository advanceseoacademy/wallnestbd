import AuthCallbackClient from '../../components/AuthCallbackClient';
import { getPublicSupabaseConfig } from '../../lib/auth/publicSupabaseConfig';

export default function AuthCallbackPage({ supabaseConfig }) {
  return <AuthCallbackClient supabaseConfig={supabaseConfig} />;
}

export async function getServerSideProps() {
  return {
    props: {
      supabaseConfig: getPublicSupabaseConfig(),
    },
  };
}
