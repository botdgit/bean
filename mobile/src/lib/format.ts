const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

export function formatPence(cents: number): string {
  return gbp.format(cents / 100);
}

const beansFmt = new Intl.NumberFormat('en-GB');

export function formatBeans(beans: number): string {
  return `${beansFmt.format(beans)} Beans`;
}

// Earn rule: 1 Bean per £0.10 (i.e., 10 pence) of pre-tip, post-redemption subtotal.
export function beansEarnedFor(subtotalCents: number): number {
  return Math.floor(subtotalCents / 10);
}

// Redemption: single tier — 400 Beans = £4 off, one redemption per order.
export const REDEMPTION_THRESHOLD_BEANS = 400;
export const REDEMPTION_VALUE_CENTS = 400;

export function canRedeem(balance: number, subtotalCents: number): boolean {
  return balance >= REDEMPTION_THRESHOLD_BEANS && subtotalCents >= REDEMPTION_VALUE_CENTS;
}
