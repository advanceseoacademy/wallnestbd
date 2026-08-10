/**
 * Meta Pixel event helpers (browser).
 * Base pixel is loaded from pages/_document.js
 */
(function (w) {
  const PIXEL_ID = '1557022736121204';

  function fbqReady(cb) {
    if (typeof w.fbq === 'function') {
      cb(w.fbq);
      return;
    }
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      if (typeof w.fbq === 'function') {
        clearInterval(t);
        cb(w.fbq);
      } else if (tries > 40) {
        clearInterval(t);
      }
    }, 50);
  }

  function track(eventName, params, eventID) {
    fbqReady((fbq) => {
      if (eventID) {
        fbq('track', eventName, params || {}, { eventID: String(eventID) });
      } else {
        fbq('track', eventName, params || {});
      }
    });
  }

  w.wnMetaPixel = {
    id: PIXEL_ID,
    track,
    pageView() {
      track('PageView');
    },
    lead(params) {
      track('Lead', params || { content_name: 'Motion Sensor Offer COD' });
    },
    initiateCheckout(params) {
      track('InitiateCheckout', params || {});
    },
    purchase({ value, currency, orderNumber, contentIds, numItems }) {
      const eventID = orderNumber ? String(orderNumber) : undefined;
      track(
        'Purchase',
        {
          value: Number(value) || 0,
          currency: currency || 'BDT',
          content_type: 'product',
          content_ids: contentIds || ['e27-pir-motion-sensor-light'],
          content_name: 'E27 PIR Motion Sensor LED Bulb 15W',
          num_items: Number(numItems) || 1,
          order_id: orderNumber || undefined,
        },
        eventID
      );
    },
  };
})(window);
