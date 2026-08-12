/* Payment authoring — configura checkouts alojados; nunca toca PAN/CVV. */
(function () {
  "use strict";
  const SAFE_PROVIDER = new Set(["square", "visa", "hosted"]);
  const clean = (raw = {}) => {
    let checkoutUrl = String(raw.checkoutUrl || "").trim();
    try { if (new URL(checkoutUrl).protocol !== "https:") checkoutUrl = ""; }
    catch { checkoutUrl = ""; }
    const amount = Math.max(0, Math.min(999999, Number(raw.amount || 0)));
    return {
      enabled: raw.enabled === true,
      provider: SAFE_PROVIDER.has(raw.provider) ? raw.provider : "square",
      checkoutUrl,
      amount: Number(amount.toFixed(2)),
      currency: /^[A-Z]{3}$/.test(String(raw.currency || "EUR").toUpperCase())
        ? String(raw.currency || "EUR").toUpperCase() : "EUR",
      label: String(raw.label || "Pagar ahora").trim().slice(0, 40) || "Pagar ahora",
      trigger: raw.trigger === "marker" ? "marker" : "end",
      marker: String(raw.marker || "PAYMENT").trim().slice(0, 14) || "PAYMENT",
    };
  };
  function read(form) {
    const q = (name) => form.querySelector(`[name="${name}"]`);
    return clean({ enabled:q("payment-enabled")?.checked, provider:q("payment-provider")?.value,
      checkoutUrl:q("payment-url")?.value, amount:q("payment-amount")?.value,
      currency:q("payment-currency")?.value, label:q("payment-label")?.value,
      trigger:q("payment-trigger")?.value, marker:q("payment-marker")?.value });
  }
  function hydrate(form, value) {
    const p = clean(value); const put = (n,v) => { const el=form.querySelector(`[name="${n}"]`); if(el) el.value=v; };
    const enabled=form.querySelector('[name="payment-enabled"]'); if(enabled) enabled.checked=p.enabled;
    put("payment-provider",p.provider); put("payment-url",p.checkoutUrl); put("payment-amount",p.amount||"");
    put("payment-currency",p.currency); put("payment-label",p.label); put("payment-trigger",p.trigger); put("payment-marker",p.marker);
    form.dataset.paymentEnabled=String(p.enabled);
    form.dataset.paymentHydrated="1";
  }
  function bind(form) {
    if (!form || form.dataset.paymentBound) return; form.dataset.paymentBound="1";
    const plan=window.currentPlan?.();
    if(plan) hydrate(form,plan.payment);
    else if(!form.dataset.paymentHydrated) hydrate(form,null);
    form.addEventListener("input", () => { const plan=window.currentPlan?.(); if(!plan) return;
      plan.payment=read(form); window.saveFilmPlan?.(plan); form.dataset.paymentEnabled=String(plan.payment.enabled); });
  }
  window.AINPayment={clean,read,hydrate,bind};
  const start=()=>document.querySelectorAll("[data-payment-panel]").forEach(bind);
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
