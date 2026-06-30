(function () {
  if (!document.getElementById('cartPage')) return;
  if (typeof window.initCartPage === 'function') {
    window.initCartPage().catch((e) => console.error(e));
  }
})();
