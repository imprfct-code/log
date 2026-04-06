import { Link } from "react-router";

export function CommitmentDetailScreen() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-12">
      <div className="feed-in mb-8 text-[13px] opacity-0">
        <Link to="/feed" className="text-muted-foreground no-underline hover:text-foreground">
          ← feed
        </Link>
      </div>
      <div className="py-16 text-center text-sm text-muted-foreground">commitment not found.</div>
    </div>
  );
}
