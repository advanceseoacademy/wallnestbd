import { getSessionFromPair } from '../../lib/session';
import { renderPageForNext } from '../../lib/renderView';
import { getAccountPageData } from '../../lib/storeData';

export default function AccountPage({ bodyHtml }) {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: bodyHtml }} />
  );
}

export async function getServerSideProps({ req, res }) {
  try {
    const { req: reqLike } = await getSessionFromPair(req, res);
    const data = await getAccountPageData(reqLike);
    if (data.redirect) {
      return { redirect: { destination: data.redirect, permanent: false } };
    }
    const rendered = await renderPageForNext('account/dashboard', data);
    return { props: rendered };
  } catch (err) {
    console.error(err);
    return {
      props: {
        bodyHtml: `<div style="padding:48px"><p>${err.message}</p></div>`,
        inlineScripts: '',
        scriptSrcs: [],
      },
    };
  }
}
