export const getBackendUrl = (): string => {
  let url = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://group-projects.onrender.com';
  return url.replace(/\/$/, '');
};
