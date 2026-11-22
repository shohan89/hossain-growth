export type ToastType = 'success' | 'error' | 'info';

export interface ToastDetail {
  type: ToastType;
  message: string;
}

const EVENT_NAME = 'admin-toast';

function emit(type: ToastType, message: string) {
  window.dispatchEvent(new CustomEvent<ToastDetail>(EVENT_NAME, { detail: { type, message } }));
}

export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
  info: (message: string) => emit('info', message),
};

export function onToast(handler: (detail: ToastDetail) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<ToastDetail>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
