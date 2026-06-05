import { getSessionFromPair } from '../../lib/session';
import { renderAdminPageForNext, renderPageForNext } from '../../lib/renderView';
import AdminShell from '../../components/AdminShell';

const VIEW_MAP = {
  login: 'admin/login',
  dashboard: 'admin/dashboard',
  orders: 'admin/orders',
  products: 'admin/products',
  categories: 'admin/categories',
  payments: 'admin/payments',
  settings: 'admin/settings',
};

export default function AdminPage(props) {
  if (props.isLogin) {
    return (
      <div className="admin-login-page">
        <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: props.bodyHtml }} />
      </div>
    );
  }
  return (
    <AdminShell
      sidebarHtml={props.sidebarHtml}
      mainHtml={props.mainHtml}
      scriptSrcs={props.scriptSrcs}
      page={props.page}
    />
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

  if (page === 'login') {
    const rendered = await renderPageForNext('admin/login', {
      error: query.error ? 'ভুল ইউজারনেম বা পাসওয়ার্ড' : null,
    });
    return { props: { ...rendered, isLogin: true } };
  }

  const rendered = await renderAdminPageForNext(viewKey, {
    page,
    admin: session.admin,
  });

  return {
    props: {
      ...rendered,
      page,
      isLogin: false,
    },
  };
}
