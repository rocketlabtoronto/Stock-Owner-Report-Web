import React, { useEffect } from "react";

export default function BillingSection() {
  const pricingTableId = process.env.REACT_APP_STRIPE_PRICING_TABLE_ID;
  const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

  useEffect(() => {
    // Dynamically add Stripe Pricing Table script
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/pricing-table.js";
    script.async = true;
    document.body.appendChild(script);

    // Inject custom CSS for Stripe Pricing Table width
    const style = document.createElement("style");
    style.innerHTML = `
      stripe-pricing-table .PricingTableSelector__Select,
      stripe-pricing-table .PricingTableSelector__Button {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.body.removeChild(script);
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: `<stripe-pricing-table pricing-table-id="${pricingTableId}" publishable-key="${publishableKey}"></stripe-pricing-table>`,
      }}
    />
  );
}
