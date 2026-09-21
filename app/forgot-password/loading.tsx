import { Spinner } from "../components/spinner";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] items-center justify-center"
    >
      <span className="flex items-center gap-3 text-sm font-medium text-muted">
        <Spinner className="h-5 w-5 text-primary-500" />
        Loading…
      </span>
    </div>
  );
}
