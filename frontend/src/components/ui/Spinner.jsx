export function Spinner({ label = 'Loading' }) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center gap-2 text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      <span className="text-sm">{label}</span>
    </span>
  );
}

export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Spinner label={label} />
    </div>
  );
}
