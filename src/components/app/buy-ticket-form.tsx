"use client";

import { useState, useTransition } from "react";
import { createCheckoutSession } from "@/lib/actions/tickets";

export function BuyTicketForm({
  eventId,
  pricePerTicketCents,
  remaining,
}: {
  eventId: string;
  pricePerTicketCents: number;
  remaining: number | null;
}) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const soldOut = remaining != null && remaining <= 0;
  const max = Math.max(
    1,
    Math.min(6, remaining ?? 6)
  );

  function handleBuy() {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSession(eventId, quantity);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      window.location.href = result.url;
    });
  }

  if (soldOut) {
    return (
      <button
        type="button"
        disabled
        className="mt-4 w-full rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-600"
      >
        Sold out
      </button>
    );
  }

  const totalCents = quantity * pricePerTicketCents;
  const totalDollars = `$${(totalCents / 100).toFixed(totalCents % 100 === 0 ? 0 : 2)}`;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-3">
        <label htmlFor="ticket_quantity" className="text-sm text-gray-700">
          Quantity
        </label>
        <select
          id="ticket_quantity"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          disabled={isPending}
        >
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-gray-500">{totalDollars}</span>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="button"
        onClick={handleBuy}
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isPending ? "Redirecting to Stripe…" : `Buy ${quantity} ticket${quantity > 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
