export default function Input({ label, id, error, hint, className = '', ...props }) {
  const describedById = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedById}
        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${
          error ? 'border-rose-400' : 'border-slate-300'
        }`}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
