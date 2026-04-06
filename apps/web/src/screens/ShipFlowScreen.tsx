import { Link } from "react-router";

export function ShipFlowScreen() {
  return (
    <div className="mx-auto max-w-[520px] px-12 py-12">
      <div className="mb-2 text-[13px] text-shipped">shipping</div>
      <h2 className="m-0 mb-1 text-2xl font-bold tracking-tight text-foreground-bright">
        Ship it.
      </h2>
      <p className="mb-9 text-sm text-muted-foreground">nothing to ship yet.</p>
      <Link to="/feed" className="text-sm text-muted-foreground hover:text-foreground">
        back to feed
      </Link>
    </div>
  );
}
