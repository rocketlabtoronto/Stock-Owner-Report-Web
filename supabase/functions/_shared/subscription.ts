// Ported from src/layouts/login/login.jsx so the expiry rule stays identical between
// the (removed) client-side check and this server-side check.
//
// Strategy for "add one month" (subscription_interval === 'month'):
//   We use Date's built-in month arithmetic. JavaScript's Date constructor rolls over
//   automatically when the resulting day would not exist in the target month (e.g.
//   Jan 31 + 1 month -> Feb 31 -> Mar 3 in a non-leap year). To avoid inadvertently
//   granting a few extra days in short months, we let the Date object overflow and
//   then compare: if the day-of-month changed after setMonth(), we went past the end
//   of the target month, so we back up to the last day of that month (day 0).
//
// Strategy for "add one year" (subscription_interval === 'year'):
//   Same principle with setFullYear(+1). The only edge case is Feb 29 in a leap year.
export function computeSubscriptionExpiry(
  subscriptionInterval: string | null | undefined,
  lastPaymentAt: string | null | undefined
): Date | null {
  if (!subscriptionInterval || !lastPaymentAt) return null;

  const paymentDate = new Date(lastPaymentAt);
  const expiry = new Date(paymentDate);

  if (subscriptionInterval === "month") {
    const originalDay = expiry.getDate();
    expiry.setMonth(expiry.getMonth() + 1);
    if (expiry.getDate() !== originalDay) {
      expiry.setDate(0);
    }
  } else if (subscriptionInterval === "year") {
    const originalDay = expiry.getDate();
    expiry.setFullYear(expiry.getFullYear() + 1);
    if (expiry.getDate() !== originalDay) {
      expiry.setDate(0);
    }
  } else {
    // Unrecognised interval: treat as non-expiring, matching prior client behavior.
    return null;
  }

  return expiry;
}
