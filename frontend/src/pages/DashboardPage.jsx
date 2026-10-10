import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../components/ui/Alert.jsx';
import Brand from '../components/Brand.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import { PageLoader, Spinner } from '../components/ui/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { roomApi } from '../services/api.js';
import { copyToClipboard } from '../utils/clipboard.js';

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function RoomListItem({ room }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const copiedCode = await copyToClipboard(room.code);
    setCopied(copiedCode);
    if (copiedCode) setTimeout(() => setCopied(false), 2000);
  };

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">{room.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono tracking-wider">{room.code}</span>
          <span className="rounded bg-brand-50 px-1.5 py-0.5 font-medium text-brand-700">{room.visibility}</span>
          <span>{room.members.length} member{room.members.length === 1 ? '' : 's'}</span>
          <span>created {formatDate(room.createdAt)}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleCopy} aria-label={`Copy the code for ${room.name}`}>
          {copied ? 'Copied' : 'Copy code'}
        </Button>
        <Link to={`/room/${room.code}`}>
          <Button>Open</Button>
        </Link>
      </div>
    </li>
  );
}

export default function DashboardPage() {
  const { user, logout, status } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [roomName, setRoomName] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    let cancelled = false;

    roomApi
      .list()
      .then((data) => {
        if (!cancelled) setRooms(data.rooms);
      })
      .catch((error) => {
        if (!cancelled) setListError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') return <PageLoader />;

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    if (roomName.trim().length < 2) {
      setCreateError('Room name must be at least 2 characters.');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const { room } = await roomApi.create({ name: roomName.trim(), visibility });
      navigate(`/room/${room.code}`);
    } catch (error) {
      setCreateError(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (event) => {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinError('Room codes are six characters long.');
      return;
    }

    setJoining(true);
    setJoinError('');
    try {
      const { room } = await roomApi.join(code);
      navigate(`/room/${room.code}`);
    } catch (error) {
      setJoinError(error.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/">
            <Brand />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              Signed in as <strong className="font-medium text-slate-900">{user?.name}</strong>
            </span>
            <Button variant="secondary" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">Your rooms</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create a room for a new idea, or paste a code a friend sent you.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
            <h2 className="font-semibold text-slate-900">Create a room</h2>
            <form onSubmit={handleCreateRoom} className="mt-4 space-y-4" noValidate>
              {createError ? <Alert variant="error">{createError}</Alert> : null}

              <Input
                id="roomName"
                label="Room name"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="Sprint retro"
                hint="Everyone in the room sees this name."
              />

              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Visibility</legend>
                <div className="mt-2 space-y-2">
                  {[
                    { value: 'public', label: 'Public', hint: 'Anyone with the code can join.' },
                    { value: 'private', label: 'Private', hint: 'Only you can open it.' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-start gap-2 text-sm text-slate-600"
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={option.value}
                        checked={visibility === option.value}
                        onChange={() => setVisibility(option.value)}
                        className="mt-0.5"
                      />
                      <span>
                        <strong className="font-medium text-slate-900">{option.label}</strong> - {option.hint}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <Button type="submit" disabled={creating} className="w-full">
                {creating ? 'Creating...' : 'Create room'}
              </Button>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
            <h2 className="font-semibold text-slate-900">Join a room</h2>
            <form onSubmit={handleJoinRoom} className="mt-4 space-y-4" noValidate>
              {joinError ? <Alert variant="error">{joinError}</Alert> : null}

              <Input
                id="joinCode"
                label="Room code"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="K7P2QX"
                maxLength={6}
                className="font-mono tracking-widest"
              />

              <Button type="submit" variant="secondary" disabled={joining} className="w-full">
                {joining ? 'Joining...' : 'Join room'}
              </Button>
            </form>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="font-semibold text-slate-900">Rooms you can open</h2>

          {loading ? (
            <div className="mt-4">
              <Spinner label="Loading your rooms" />
            </div>
          ) : listError ? (
            <div className="mt-4">
              <Alert variant="error">{listError}</Alert>
            </div>
          ) : rooms.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              No rooms yet. Create one above, or join a room with a code from a teammate.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {rooms.map((room) => (
                <RoomListItem key={room.id} room={room} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
