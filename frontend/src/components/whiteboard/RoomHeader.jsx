import { useState } from 'react';
import { Link } from 'react-router-dom';
import { copyToClipboard } from '../../utils/clipboard.js';
import Brand from '../Brand.jsx';
import Button from '../ui/Button.jsx';
import Modal from '../ui/Modal.jsx';
import ExportDialog from './ExportDialog.jsx';
import PresenceBar from './PresenceBar.jsx';

export default function RoomHeader({ room, participants, onClear, onToggleChat, chatOpen }) {
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const handleCopyLink = async () => {
    const didCopy = await copyToClipboard(window.location.href);
    setCopied(didCopy);
    if (didCopy) setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-4">
        <Link to="/dashboard" className="hidden sm:block">
          <Brand />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-slate-900">{room?.name || 'Room'}</h1>
          <p className="text-xs text-slate-500">
            Code <span className="font-mono tracking-widest">{room?.code}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <PresenceBar participants={participants} />
        <Button variant="secondary" onClick={onToggleChat} aria-pressed={chatOpen}>Chat</Button>

        <Button variant="secondary" onClick={handleCopyLink} aria-label="Copy the room link">
          {copied ? 'Copied' : 'Copy link'}
        </Button>

        <Button variant="secondary" onClick={() => setShowExport(true)}>
          Export PNG
        </Button>

        <Button variant="danger" onClick={() => setConfirmClear(true)}>
          Clear
        </Button>

        <Link to="/dashboard">
          <Button variant="ghost">Leave</Button>
        </Link>
      </div>

      <Modal
        open={confirmClear}
        title="Clear the board for everyone?"
        onClose={() => setConfirmClear(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onClear();
                setConfirmClear(false);
              }}
            >
              Clear board
            </Button>
          </>
        }
      >
        <p>
          Every object is removed for all {participants.length} connected collaborator
          {participants.length === 1 ? '' : 's'} straight away. The person who clears the board can
          step back to the previous state with undo.
        </p>
      </Modal>

      <ExportDialog open={showExport} onClose={() => setShowExport(false)} />
    </header>
  );
}
