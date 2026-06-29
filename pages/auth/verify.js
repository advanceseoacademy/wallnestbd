import { getSessionFromPair } from '../../lib/session';
import { renderPageForNext } from '../../lib/renderView';
import { getPageContext } from '../../lib/pageContext';

export default function AuthVerifyPage({ bodyHtml }) {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: bodyHtml }} />
  );
}

export async function getServerSideProps({ req, res, query }) {
  try {
    const { req: reqLike } = await getSessionFromPair(req, res);
    const ctx = await getPageContext(reqLike);
    const data = {
      ...ctx,
      verifyError: query.error === '1' || query.error === 'invalid',
    };
    const rendered = await renderPageForNext('auth/verify', data);
    res.setHeader('Cache-Control', 'private, no-store');
    return { props: { ...rendered } };
  } catch (err) {
    console.error(err);
    return {
      props: {
        bodyHtml: `<div class="site-wrap" style="padding:48px;text-align:center"><p>${err.message}</p></div>`,
        inlineScripts: '',
        scriptSrcs: [],
      },
    };
  }
}
