const { renderPageForNext } = require('./renderView');
const { getAccountPageData } = require('./storeData');

async function renderAccountPageProps(reqLike) {
  const data = await getAccountPageData(reqLike);
  if (data.redirect) return { redirect: data.redirect };
  const rendered = await renderPageForNext('account/dashboard', data);
  return rendered;
}

module.exports = { renderAccountPageProps };
