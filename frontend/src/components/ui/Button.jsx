const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
};

export default function Button({ variant = 'primary', type = 'button', className = '', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
