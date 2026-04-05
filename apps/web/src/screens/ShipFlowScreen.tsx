import { Link } from "react-router";
import { ExtIcon } from "@/components/Icons";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShipFlowScreen() {
  return (
    <div className="mx-auto max-w-[520px] px-12 py-12">
      <div className="mb-2 text-[13px] text-shipped">shipping</div>
      <h2 className="m-0 mb-1 text-2xl font-bold tracking-tight text-foreground-bright">
        Ship it.
      </h2>
      <p className="mb-9 text-sm text-muted-foreground">Close the loop. Show what you built.</p>

      <div className="mb-8 border-l-2 border-shipped pl-4">
        <div className="mb-1 text-[15px] font-semibold text-foreground-bright">
          a ship-only devlog platform
        </div>
        <div className="text-xs text-muted-foreground">Day 12 · 4 devlog entries · 23 commits</div>
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Live URL
        </label>
        <div className="flex items-center gap-1.5 border-b border-border-strong px-3.5 py-3 text-sm text-foreground">
          https://log.imprfct.dev <ExtIcon size={10} color="#666" />
        </div>
      </div>

      <div className="mb-9">
        <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Ship note <span className="text-[#333]">(optional)</span>
        </label>
        <Input placeholder="Finally done. Not perfect, but it's out there." />
      </div>

      <Link
        to="/feed"
        className={buttonVariants({ variant: "ship", className: "w-full font-semibold" })}
      >
        Confirm ship
      </Link>
      <div className="mt-2.5 text-center text-[11px] text-[#333]">
        This closes the commitment permanently.
      </div>
    </div>
  );
}
