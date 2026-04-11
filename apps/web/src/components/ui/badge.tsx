import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center border px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      building: "border-border-strong text-foreground",
      released: "border-release/50 text-release",
    },
  },
  defaultVariants: {
    variant: "building",
  },
});

function Badge({
  className,
  variant = "building",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
