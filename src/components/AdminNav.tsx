import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { adminLogout } from "@/lib/api/admin.functions";

export function AdminNav() {
  const navigate = useNavigate();
  const logout = useServerFn(adminLogout);

  async function doLogout() {
    await logout();
    navigate({ to: "/admin-x7k9q2m3p8" });
  }

  const linkCls =
    "rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground";
  const activeCls = "bg-accent text-foreground";

  return (
    <header className="border-b border-border/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-2">
          <h1 className="mr-4 text-lg font-semibold">Admin</h1>
          <Link to="/admin-x7k9q2m3p8/dashboard" className={linkCls} activeProps={{ className: `${linkCls} ${activeCls}` }}>
            Tools & Orders
          </Link>
          <Link to="/admin-x7k9q2m3p8/customization" className={linkCls} activeProps={{ className: `${linkCls} ${activeCls}` }}>
            Customization
          </Link>
          <Link to="/admin-x7k9q2m3p8/email" className={linkCls} activeProps={{ className: `${linkCls} ${activeCls}` }}>
            Email
          </Link>
          <Link to="/admin-x7k9q2m3p8/emails" className={linkCls} activeProps={{ className: `${linkCls} ${activeCls}` }}>
            Customers
          </Link>

        </div>
        <button onClick={doLogout} className="text-sm text-muted-foreground hover:text-foreground">
          Sign out
        </button>
      </div>
    </header>
  );
}
