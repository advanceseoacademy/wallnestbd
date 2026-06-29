(function () {
const keys = ['bkash', 'rocket', 'nagad'];
const labels = { bkash: 'bKash', rocket: 'Rocket', nagad: 'Nagad' };
const defaultNumbers = {
  bkash: '01309093407',
  nagad: '01309093407',
  rocket: '01757591788',
};

function renderForm(payments) {
  const form = document.getElementById('paymentsForm');
  if (!form) return;
  form.innerHTML = keys
    .map((key) => {
      const p = payments[key] || {};
      return `
      <div class="card" style="margin-bottom:16px;padding:20px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;">
        <h4 style="font-family:Syne;margin-bottom:12px;">${labels[key]}</h4>
        <label style="display:flex;gap:8px;margin-bottom:12px;"><input type="checkbox" data-key="${key}" data-field="enabled" ${p.enabled !== false ? 'checked' : ''}> সক্রিয়</label>
        <div class="form-group"><label class="form-label">নম্বর</label><input class="form-input" data-key="${key}" data-field="number" value="${p.number || ''}"></div>
        <div class="form-group"><label class="form-label">অ্যাকাউন্ট টাইপ</label><input class="form-input" data-key="${key}" data-field="account_type" value="${p.account_type || 'Personal'}"></div>
        <div class="form-group"><label class="form-label">নির্দেশনা</label><input class="form-input" data-key="${key}" data-field="instructions" value="${p.instructions || ''}"></div>
      </div>`;
    })
    .join('');
}

function initPaymentsPage() {
  const saveBtn = document.getElementById('savePayments');
  if (!saveBtn) return;

  saveBtn.onclick = async () => {
    const payments = {};
    keys.forEach((key) => {
      payments[key] = { label: labels[key], enabled: true, account_type: 'Personal', number: '', instructions: '' };
      document.querySelectorAll(`[data-key="${key}"]`).forEach((el) => {
        const field = el.dataset.field;
        if (field === 'enabled') payments[key].enabled = el.checked;
        else payments[key][field] = el.value;
      });
    });
    await adminApi('/settings/payments', {
      method: 'PUT',
      body: JSON.stringify({ payments }),
    });
    alert('পেমেন্ট সেটিংস সেভ হয়েছে!');
  };

  return adminApi('/settings/payments')
    .then((d) => renderForm(d.payments || {}))
    .catch(console.error);
}

bootAdminPage('payments', initPaymentsPage);
})();
