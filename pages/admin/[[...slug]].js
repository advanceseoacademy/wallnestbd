import { getSessionFromPair } from '../../lib/session';
import { renderPageForNext } from '../../lib/renderView';

const VIEW_MAP = {
  login: 'admin/login',
  dashboard: 'admin/dashboard',
  orders: 'admin/orders',
  products: 'admin/products',
  payments: 'admin/payments',
};

export default function AdminPage({ bodyHtml }) {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: bodyHtml }} />
  );
}

export async function getServerSideProps({ req, res, params, query }) {
  const slug = params?.slug || [];
  const page = slug[0] || '';

  if (!page) {
    return { redirect: { destination: '/admin/dashboard', permanent: false } };
  }

  const viewKey = VIEW_MAP[page];
  if (!viewKey) {
    return { notFound: true };
  }

  const { session } = await getSessionFromPair(req, res);

  if (page !== 'login' && !session.admin) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }
  if (page === 'login' && session.admin) {
    return { redirect: { destination: '/admin/dashboard', permanent: false } };
  }

  const rendered = await renderPageForNext(viewKey, {
    page: page === 'login' ? undefined : page,
    admin: session.admin,
    error: query.error ? 'ভুল ইউজারনেম বা পাসওয়ার্ড' : null,
  });

  return { props: rendered };
}
