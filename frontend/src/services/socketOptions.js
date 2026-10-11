export const SOCKET_RECONNECTION_OPTIONS = Object.freeze({
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
});

export function createSocketOptions(token) {
  return {
    auth: { token },
    ...SOCKET_RECONNECTION_OPTIONS,
  };
}
