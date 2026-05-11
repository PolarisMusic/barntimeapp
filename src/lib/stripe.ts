import Stripe from "stripe";

declare global {
  var __barntimeStripe: Stripe | undefined;
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!globalThis.__barntimeStripe) {
    globalThis.__barntimeStripe = new Stripe(key);
  }
  return globalThis.__barntimeStripe;
}

export function appUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}
