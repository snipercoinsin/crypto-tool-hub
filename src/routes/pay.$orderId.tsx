import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { getOrder, checkPayment } from "@/lib/api/orders.functions";

const orderQuery = (id: string) =>
  queryOptions({
    queryKey: ["order", id],
    queryFn: () => getOrder({ data: { id } }),
  });

export const Route = createFileRoute("/pay/$orderId")({
  head: () => ({ meta: [{ title: "Complete payment" }] }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(orderQuery(params.orderId)),
  component: PayPage,
});

function PayPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const { data: order, refetch } = useQuery(orderQuery(orderId));
  const check = useServerFn(checkPayment);

  const checkMut = useMutation({
    mutationFn: () => check({ data: { id: orderId } }),
    onSuccess: async (r) => {
      if (r.status === "paid") {
        navigate({
          to: "/download/$orderId",
          params: { orderId },
          search: { t: r.downloadToken! },
        });
      } else if (r.status === "expired") {
        await refetch();
      }
    },
  });

  // poll every 12s
  useEffect(() => {
    if (!order || order.status !== "pending") return;
    const t = setInterval(() => checkMut.mutate(), 12_000);
    return () => clearInterval(t);
  }, [order, checkMut]);

  if (!order) return null;

  return (
    <div className="hero-bg min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to catalog
        </Link>

        {order.status === "paid" ? (
          <PaidState orderId={orderId} token={order.downloadToken!} />
        ) : order.status === "expired" ? (
          <ExpiredState />
        ) : (
          <PendingState order={order} onCheck={() => checkMut.mutate()} checking={checkMut.isPending} />
        )}
      </div>
    </div>
  );
}

function PendingState({
  order,
  onCheck,
  checking,
}: {
  order: NonNullable<ReturnType<typeof useQuery<typeof orderQuery>>["data"]>;
  onCheck: () => void;
  checking: boolean;
}) {
  const [qr, setQr] = useState<string>("");
  const uri = useMemo(() => {
    const scheme = order.currency === "BTC" ? "bitcoin" : "monero";
    return `${scheme}:${order.depositAddress}?amount=${order.cryptoAmount}`;
  }, [order]);

  useEffect(() => {
    QRCode.toDataURL(uri, { margin: 1, width: 320, color: { dark: "#0e0e12", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [uri]);

  const expires = new Date(order.expiresAt).getTime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, Math.floor((expires - now) / 1000));
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="card-elev mt-6 rounded-2xl p-6">
      <div className="text-sm uppercase tracking-widest text-muted-foreground">Awaiting payment</div>
      <h1 className="mt-1 text-2xl font-semibold">{order.toolName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sent to:{" "}
        <span className="font-mono text-foreground">{order.email}</span>
      </p>

      <div className="mt-6 flex flex-col items-center gap-4">
        {qr && (
          <img
            src={qr}
            alt="Payment QR"
            className="h-72 w-72 rounded-xl bg-white p-2 shadow-[var(--shadow-card)]"
          />
        )}
        <div className="text-center">
          <div className={`font-mono text-3xl ${remaining < 60 ? "text-[color:var(--destructive)]" : "text-[color:var(--primary)]"}`}>
            {mm}:{ss}
          </div>
          <div className="text-xs text-muted-foreground">Time remaining to send payment</div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <ReadOnlyField
          label={`Amount (${order.currency})`}
          value={order.cryptoAmount.toString()}
          mono
        />
        <ReadOnlyField label="Send to address" value={order.depositAddress} mono />
        <ReadOnlyField label="Price (USD reference)" value={`$${order.priceUsd.toFixed(2)}`} />
      </div>

      <button
        onClick={onCheck}
        disabled={checking}
        className="mt-6 w-full rounded-xl bg-[color:var(--primary)] px-4 py-3 font-semibold text-[color:var(--primary-foreground)] disabled:opacity-60"
      >
        {checking ? "Checking…" : `Pay  ·  $${order.priceUsd.toFixed(2)} USD`}
      </button>

      {order.currency === "XMR" && (
        <p className="mt-4 rounded-lg border border-border bg-secondary p-3 text-xs text-muted-foreground">
          Monero payments are confirmed by the operator once the deposit clears. The
          download link will appear here automatically.
        </p>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        readOnly
        value={value}
        className={`w-full select-all rounded-xl border border-border bg-[color:var(--input)] px-3 py-2.5 text-sm ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function PaidState({ orderId, token }: { orderId: string; token: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/download/$orderId", params: { orderId }, search: { t: token } });
  }, [navigate, orderId, token]);
  return null;
}

function ExpiredState() {
  return (
    <div className="card-elev mt-6 rounded-2xl p-10 text-center">
      <h1 className="text-2xl font-semibold text-[color:var(--destructive)]">Order expired</h1>
      <p className="mt-2 text-muted-foreground">
        No payment was received in time. Please start a new order from the catalog.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-xl bg-[color:var(--primary)] px-5 py-3 font-semibold text-[color:var(--primary-foreground)]"
      >
        Back to catalog
      </Link>
    </div>
  );
}
