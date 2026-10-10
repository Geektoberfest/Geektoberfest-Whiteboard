import axios from 'axios';

const TOKEN_KEY = 'geekstober.token';
const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_URL is required. Set it in the frontend environment before starting or building the app.');
}

const client = axios.create({
  baseURL: API_BASE_URL,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = new Error(
      error.response?.data?.message || 'Could not reach the server. Check the backend URL, server status, and allowed frontend origin.',
    );
    normalized.status = error.response?.status;
    throw normalized;
  },
);

export const TOKEN_STORAGE_KEY = TOKEN_KEY;

export const authApi = {
  register: (payload) => client.post('/auth/register', payload).then((response) => response.data),
  login: (payload) => client.post('/auth/login', payload).then((response) => response.data),
  me: () => client.get('/auth/me').then((response) => response.data),
};

export const roomApi = {
  list: () => client.get('/rooms').then((response) => response.data),
  create: (payload) => client.post('/rooms', payload).then((response) => response.data),
  join: (roomCode) => client.post(`/rooms/${roomCode}/join`).then((response) => response.data),
};
