export const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://127.0.0.1:8000';
  }
  return 'https://group-projects.onrender.com';
};
