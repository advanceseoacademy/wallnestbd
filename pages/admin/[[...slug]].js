import { getSessionFromPair } from '../../lib/session';
import { renderAdminPageForNext, renderPageForNext } from '../../lib/renderView';
import { resolveAdminRoute } from '../../lib/adminRoutes';
import AdminShell from '../../components/AdminShell';

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
      adminPath={props.adminPath}
    />
  );
}

export async function getServerSideProps({ req, res, params, query }) {
  const slugParts = params?.slug || [];

  if (!slugParts.length) {
    return { redirect: { destination: '/admin/dashboard', permanent: false } };
  }

  const resolved = resolveAdminRoute(slugParts, query);

  if (!resolved) {
    return { notFound: true };
  }
  if (resolved.redirect) {
    return { redirect: { destination: resolved.redirect, permanent: false } };
  }

  const { session } = await getSessionFromPair(req, res);

  if (!resolved.isLogin && !session.admin) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }
  if (resolved.isLogin && session.admin) {
    return { redirect: { destination: '/admin/dashboard', permanent: false } };
  }

  if (resolved.isLogin) {
    const rendered = await renderPageForNext('admin/login', {
      error: query.error ? 'ভুল ইউজারনেম বা পাসওয়ার্ড' : null,
    });
    return { props: { ...rendered, isLogin: true } };
  }

  const rendered = await renderAdminPageForNext(resolved.view, {
    ...resolved.data,
    admin: session.admin,
  });

  return {
    props: {
      ...rendered,
      page: resolved.navPage,
      adminPath: resolved.path,
      isLogin: false,
    },
  };
}
