import { Link } from 'react-router-dom';
import Brand from './Brand.jsx';

export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link to="/" className="mb-6">
        <Brand />
      </Link>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      {footer}
    </main>
  );
}
