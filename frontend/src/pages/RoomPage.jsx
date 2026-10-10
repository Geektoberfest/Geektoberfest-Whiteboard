import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import RoomHeader from '../components/whiteboard/RoomHeader.jsx';
import Toolbar from '../components/whiteboard/Toolbar.jsx';
import Whiteboard from '../components/whiteboard/Whiteboard.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useBoardRoom } from '../hooks/useBoardRoom.js';
import { STICKY_COLORS, TOOLS, TOOL_SELECT } from '../constants/tools.js';
import { TOKEN_STORAGE_KEY } from '../services/api.js';
import ChatPanel from '../components/whiteboard/ChatPanel.jsx';

const INITIAL_STYLE = { color: '#111827', strokeWidth: 4, stickyColor: STICKY_COLORS[0] };

export default function RoomPage() {
  const { roomId } = useParams();
  const roomCode = roomId.toUpperCase();
  const token = localStorage.getItem(TOKEN_STORAGE_KEY) || '';

  const {
    status,
    error,
    notice,
    activity,
    room,
    elements,
    participants,
    messages,
    canUndo,
    canRedo,
    upsertElement,
    removeElement,
    clearBoard,
    undo,
    redo,
    dismissNotice,
    sendChatMessage,
  } = useBoardRoom(token, roomCode);

  const [tool, setTool] = useState(TOOL_SELECT);
  const [style, setStyle] = useState(INITIAL_STYLE);
  const [selectedId, setSelectedId] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const isTyping =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isTyping) return;

      const usesModifier = event.metaKey || event.ctrlKey;

      if (usesModifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if (usesModifier && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        removeElement(selectedId);
        setSelectedId(null);
        return;
      }

      if (event.key === 'Escape') {
        setSelectedId(null);
        return;
      }

      if (!usesModifier) {
        const shortcut = TOOLS.find((item) => item.shortcut.toLowerCase() === event.key.toLowerCase());
        if (shortcut) setTool(shortcut.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, undo, redo, removeElement]);

  if (status === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <Alert variant="error">{error || 'Something went wrong while joining this room.'}</Alert>
        <Link to="/dashboard">
          <Button>Back to dashboard</Button>
        </Link>
      </main>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <RoomHeader room={room} participants={participants} onClear={clearBoard} onToggleChat={() => setChatOpen((open) => !open)} chatOpen={chatOpen} />

      {status !== 'ready' ? (
        <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
          {status === 'reconnecting' ? 'Connection lost. Rejoining the room...' : 'Joining room...'}
        </div>
      ) : null}

      {notice ? (
        <div className="px-4 pt-2">
          <Alert
            variant="info"
            action={
              <Button variant="ghost" onClick={dismissNotice} aria-label="Dismiss message">
                Dismiss
              </Button>
            }
          >
            {notice}
          </Alert>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        <Toolbar
          tool={tool}
          onToolChange={setTool}
          style={style}
          onStyleChange={setStyle}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
        />

        <div className="relative min-h-0 flex-1">
          {status === 'ready' ? (
            <Whiteboard
              elements={elements}
              upsertElement={upsertElement}
              removeElement={removeElement}
              tool={tool}
              style={style}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : null}

          {activity ? (
            <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/85 px-4 py-1.5 text-sm text-white">
              {activity}
            </p>
          ) : null}
        </div>
        {chatOpen && <ChatPanel messages={messages} sendMessage={sendChatMessage} onClose={() => setChatOpen(false)} />}
      </div>
    </div>
  );
}
