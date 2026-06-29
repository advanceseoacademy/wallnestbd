(function () {
  if (!document.getElementById('checkoutPage')) return;
  if (typeof window.initCheckoutPage === 'function') {
    window.initCheckoutPage().catch((e) => console.error(e));
  }
})();
