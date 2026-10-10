import { Link } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import Button from '../components/ui/Button.jsx';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center">
      <Brand />
      <div>
        <p className="text-6xl font-semibold text-brand-600">404</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">This page does not exist</h1>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          The link may be out of date, or the room code may have a typo.
        </p>
      </div>
      <Link to="/">
        <Button>Back to home</Button>
      </Link>
    </main>
  );
}
