import { useState } from 'react';
import Button from '../ui/Button.jsx';

export default function ChatPanel({ messages, sendMessage, onClose }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    const result = await sendMessage(value);
    setSending(false);
    if (result?.ok) { setText(''); setError(''); }
    else setError(result?.message || 'Message could not be sent.');
  };

  return (
    <aside className="absolute inset-0 z-10 flex min-h-0 flex-col border-l border-slate-200 bg-white md:relative md:inset-auto md:w-80 md:shrink-0" aria-label="Room chat">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-900">Room chat</h2>
        <Button variant="ghost" onClick={onClose} aria-label="Close chat">Close</Button>
      </div>
      <ol className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length ? messages.map((message) => (
          <li key={message.id} className="break-words text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-slate-900">{message.user.name}</span>
              <time className="shrink-0 text-xs text-slate-400" dateTime={message.createdAt}>
                {new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </time>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-slate-700">{message.text}</p>
          </li>
        )) : <li className="m-auto max-w-52 text-center text-sm text-slate-500">No messages yet. Say hello to the room.</li>}
      </ol>
      <form className="border-t border-slate-200 p-3" onSubmit={submit}>
        {error && <p className="mb-2 text-xs text-red-600" role="alert">{error}</p>}
        <label className="sr-only" htmlFor="room-chat-message">Message</label>
        <textarea id="room-chat-message" className="w-full resize-none rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" rows="3" maxLength={1000} value={text} onChange={(event) => setText(event.target.value)} placeholder="Message everyone…" />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-400">{text.length}/1000</span>
          <Button type="submit" disabled={!text.trim() || sending}>{sending ? 'Sending…' : 'Send'}</Button>
        </div>
      </form>
    </aside>
  );
}
