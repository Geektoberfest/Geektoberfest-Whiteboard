function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function PresenceBar({ participants }) {
  if (participants.length === 0) return null;

  return (
    <div className="flex items-center" aria-label={`${participants.length} people in this room`}>
      <ul className="flex -space-x-2">
        {participants.slice(0, 6).map((participant) => (
          <li
            key={participant.id}
            title={participant.name}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-white"
            style={{ backgroundColor: participant.color }}
          >
            <span aria-hidden="true">{initials(participant.name)}</span>
            <span className="sr-only">{participant.name}</span>
          </li>
        ))}
      </ul>
      {participants.length > 6 ? (
        <span className="ml-2 text-xs text-slate-500">+{participants.length - 5} more</span>
      ) : null}
    </div>
  );
}
