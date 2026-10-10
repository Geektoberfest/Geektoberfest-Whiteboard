import { Link } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const FEATURES = [
  {
    title: 'Draw together in real time',
    body: 'Pen, shapes, arrows, text and sticky notes are relayed through the server to everyone in the room as you make them.',
  },
  {
    title: 'Rooms that stay separate',
    body: 'Each room has a six character code and its own Socket.IO channel. Nothing from one room can ever reach another.',
  },
  {
    title: 'Know who is here',
    body: 'Every participant gets a stable colour and appears in the presence bar the moment they connect.',
  },
  {
    title: 'Select, move and resize',
    body: 'Pick any object, drag it around and pull the corner handles to change its size.',
  },
  {
    title: 'Undo, redo and clear',
    body: 'Step back through your changes, redo them, or clear the board for everyone in one click.',
  },
  {
    title: 'Built to be extended',
    body: 'A small, readable codebase with clearly marked open contribution areas for the Geekstober event.',
  },
];

const STEPS = [
  {
    title: 'Create a room',
    body: 'Sign in, give the room a name and choose whether it is public or private.',
  },
  {
    title: 'Share the code',
    body: 'Copy the six character room code or the link and send it to your team.',
  },
  {
    title: 'Collaborate',
    body: 'Everyone who opens the link joins the same board and sees each other instantly.',
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Brand />
          <nav className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button>Open dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link to="/register">
                  <Button>Get started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            Geekstober open source project
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            A whiteboard your whole team can draw on at the same time.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Geekstober Whiteboard is a room based collaborative whiteboard built with React, Express,
            MongoDB and Socket.IO. Create a room, share the code, and everyone with an account lands
            on the same board with their changes arriving in real time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={isAuthenticated ? '/dashboard' : '/register'}>
              <Button className="px-6 py-3 text-base">Start collaborating</Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="secondary" className="px-6 py-3 text-base">
                How rooms work
              </Button>
            </a>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-semibold text-slate-900">What it does today</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
                  <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold text-slate-900">How rooms work</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-xl border border-slate-200 p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-brand-700">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Open a room in under a minute</h2>
              <p className="mt-2 text-brand-100">
                Free, self hosted and open source. Bring your own MongoDB instance.
              </p>
            </div>
            <Link to={isAuthenticated ? '/dashboard' : '/register'}>
              <Button className="bg-white px-6 py-3 text-base text-brand-700 hover:bg-brand-50">
                {isAuthenticated ? 'Go to dashboard' : 'Create an account'}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <p>Built by the Geekstober open source community.</p>
        </div>
      </footer>
    </div>
  );
}
