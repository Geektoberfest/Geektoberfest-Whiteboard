const VARIANTS = {
  error: 'bg-rose-50 text-rose-800 ring-rose-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  info: 'bg-brand-50 text-brand-800 ring-brand-200',
};

export default function Alert({ variant = 'info', children, action }) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm ring-1 ${VARIANTS[variant]}`}
    >
      <span>{children}</span>
      {action}
    </div>
  );
}
