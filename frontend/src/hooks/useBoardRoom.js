import { useCallback, useEffect, useRef, useState } from 'react';
import { disconnectSocket, getSocket } from '../services/socket.js';
import { elementSignature, upsertElement as upsertIntoArray } from '../utils/elements.js';

const HISTORY_LIMIT = 1;
const ACTIVITY_TIMEOUT = 4000;

export function useBoardRoom(token, roomCode) {
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activity, setActivity] = useState('');
  const [room, setRoom] = useState(null);
  const [elements, setElements] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const socketRef = useRef(null);
  const elementsRef = useRef([]);
  const participantsRef = useRef([]);
  const historyRef = useRef({ past: [], future: [] });
  const activityTimerRef = useRef(null);

  // Keeping the ref in the same place as the state write means the latest
  // snapshot is always available, even before React has re-rendered.
  const applyElements = useCallback((next) => {
    elementsRef.current = next;
    setElements(next);
  }, []);

  const resetHistory = useCallback(() => {
    historyRef.current = { past: [], future: [] };
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  const commit = useCallback(
    (next) => {
      const history = historyRef.current;
      history.past = [...history.past, elementsRef.current].slice(-HISTORY_LIMIT);
      history.future = [];
      setCanUndo(true);
      setCanRedo(false);
      applyElements(next);
    },
    [applyElements],
  );

  /** Replays the difference between two snapshots so collaborators stay in sync. */
  const emitDiff = useCallback((from, to) => {
    const socket = socketRef.current;
    if (!socket) return;

    const fromById = new Map(from.map((element) => [element.id, element]));
    for (const element of to) {
      const previous = fromById.get(element.id);
      if (!previous || elementSignature(previous) !== elementSignature(element)) {
        socket.emit('board:element:upsert', { element });
      }
    }

    const toIds = new Set(to.map((element) => element.id));
    for (const element of from) {
      if (!toIds.has(element.id)) socket.emit('board:element:delete', { elementId: element.id });
    }
  }, []);

  const undo = useCallback(() => {
    const history = historyRef.current;
    const previous = history.past[history.past.length - 1];
    if (!previous) return;

    const current = elementsRef.current;
    applyElements(previous);
    emitDiff(current, previous);

    history.past = history.past.slice(0, -1);
    history.future = [current, ...history.future].slice(0, HISTORY_LIMIT);
    setCanUndo(history.past.length > 0);
    setCanRedo(true);
  }, [applyElements, emitDiff]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    const next = history.future[0];
    if (!next) return;

    const current = elementsRef.current;
    applyElements(next);
    emitDiff(current, next);

    history.future = history.future.slice(1);
    history.past = [...history.past, current].slice(-HISTORY_LIMIT);
    setCanUndo(true);
    setCanRedo(history.future.length > 0);
  }, [applyElements, emitDiff]);

  const upsertElement = useCallback(
    (element) => {
      const payload = { ...element, updatedAt: Date.now() };
      commit(upsertIntoArray(elementsRef.current, payload));
      socketRef.current?.emit('board:element:upsert', { element: payload });
    },
    [commit],
  );

  const removeElement = useCallback(
    (elementId) => {
      const current = elementsRef.current;
      const next = current.filter((element) => element.id !== elementId);
      if (next.length === current.length) return;

      commit(next);
      socketRef.current?.emit('board:element:delete', { elementId });
    },
    [commit],
  );

  const clearBoard = useCallback(() => {
    if (elementsRef.current.length === 0) return;

    commit([]);
    socketRef.current?.emit('board:clear');
  }, [commit]);

  const dismissNotice = useCallback(() => setNotice(''), []);
  const sendChatMessage = useCallback((text) => new Promise((resolve) => {
    if (!socketRef.current?.connected) return resolve({ ok: false, message: 'Not connected to the room.' });
    socketRef.current.emit('chat:send', { text }, resolve);
  }), []);

  useEffect(() => {
    const socket = getSocket(token);
    socketRef.current = socket;

    const announce = (message) => {
      setActivity(message);
      clearTimeout(activityTimerRef.current);
      activityTimerRef.current = setTimeout(() => setActivity(''), ACTIVITY_TIMEOUT);
    };

    const joinRoom = () => {
      setStatus('connecting');
      socket.emit('room:join', { roomCode }, (response) => {
        if (!response?.ok) {
          setError(response?.message || 'Could not join this room.');
          setStatus('error');
          return;
        }

        setRoom(response.room);
        setError('');
        participantsRef.current = response.participants || [];
        setParticipants(response.participants || []);
        setNotice(
          response.source === 'database'
            ? 'This board was restored from a saved snapshot.'
            : '',
        );
        applyElements(response.elements);
        resetHistory();
        setStatus('ready');
      });
    };

    const handleDisconnect = () => setStatus('reconnecting');
    const handleConnectError = (connectionError) => {
      setError(connectionError.message || 'Could not reach the collaboration server.');
      setStatus('error');
    };
    const handleRemoteUpsert = ({ element }) => {
      applyElements(upsertIntoArray(elementsRef.current, element));
    };
    const handleRemoteDelete = ({ elementId }) => {
      applyElements(elementsRef.current.filter((element) => element.id !== elementId));
    };
    const handleRemoteClear = () => applyElements([]);
    const handlePresence = ({ participants: currentParticipants }) => {
      // Also kept in a ref because presence:left needs the name of a user who
      // has already been removed from the roster.
      participantsRef.current = currentParticipants;
      setParticipants(currentParticipants);
    };
    const handlePresenceJoined = ({ participant }) => announce(`${participant.name} joined`);
    const handlePresenceLeft = ({ participantId }) => {
      const participant = participantsRef.current.find((entry) => entry.id === participantId);
      if (participant) announce(`${participant.name} left`);
    };
    const handleAppError = ({ message }) => setNotice(message);
    const handleChatMessage = (message) => setMessages((current) => [...current, message].slice(-100));

    socket.on('connect', joinRoom);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('board:element:upsert', handleRemoteUpsert);
    socket.on('board:element:delete', handleRemoteDelete);
    socket.on('board:clear', handleRemoteClear);
    socket.on('presence:list', handlePresence);
    socket.on('presence:joined', handlePresenceJoined);
    socket.on('presence:left', handlePresenceLeft);
    socket.on('app:error', handleAppError);
    socket.on('chat:message', handleChatMessage);

    if (socket.connected) joinRoom();

    return () => {
      socket.off('connect', joinRoom);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('board:element:upsert', handleRemoteUpsert);
      socket.off('board:element:delete', handleRemoteDelete);
      socket.off('board:clear', handleRemoteClear);
      socket.off('presence:list', handlePresence);
      socket.off('presence:joined', handlePresenceJoined);
      socket.off('presence:left', handlePresenceLeft);
      socket.off('app:error', handleAppError);
      socket.off('chat:message', handleChatMessage);
      socket.emit('room:leave');
      socketRef.current = null;
      setMessages([]);
      clearTimeout(activityTimerRef.current);
      disconnectSocket();
    };
  }, [token, roomCode, applyElements, resetHistory]);

  return {
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
  };
}
