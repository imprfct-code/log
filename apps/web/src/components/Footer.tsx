import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[720px] items-center justify-between px-4 py-6 sm:px-12">
        <span className="text-[11px] text-muted-foreground">
          &copy; {new Date().getFullYear()} imprfct
        </span>
        <nav className="flex gap-4">
          <Link
            to="/privacy"
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
