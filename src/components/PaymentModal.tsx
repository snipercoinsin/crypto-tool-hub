import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { createOrder } from "@/lib/api/orders.functions";
import type { ToolCard } from "@/lib/api/storefront.functions";

export function PaymentModal({
  open,
  onClose,
  tool,
}: {
  open: boolean;
  onClose: () => void;
  tool: ToolCard;
}) {
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState<"BTC" | "XMR">("BTC");
  const [loading, setLoading] = useState(false);
  const create = useServerFn(createOrder);
  const navigate = useNavigate();

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const o = await create({ data: { toolId: tool.id, email, currency } });
      navigate({ to: "/pay/$orderId", params: { orderId: o.id } });
    } catch (err) {
      toast.error((err as Error).message || "Could not create order");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card-elev w-full max-w-md rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 text-sm uppercase tracking-widest text-muted-foreground">
          Checkout
        </div>
        <h2 className="mb-4 text-2xl font-semibold">{tool.name}</h2>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-muted-foreground">Email address</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border bg-[color:var(--input)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            />
          </label>

          <div>
            <span className="mb-2 block text-sm text-muted-foreground">
              Choose crypto to pay with:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(["BTC", "XMR"] as const).map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`rounded-xl border px-4 py-3 font-medium transition ${
                    currency === c
                      ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--primary)]"
                      : "border-border bg-secondary hover:bg-accent"
                  }`}
                >
                  {c === "BTC" ? "Bitcoin (BTC)" : "Monero (XMR)"}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[color:var(--primary)] px-4 py-3 font-semibold text-[color:var(--primary-foreground)] transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Creating order…" : `Pay $${tool.price_usd.toFixed(2)} USD`}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
