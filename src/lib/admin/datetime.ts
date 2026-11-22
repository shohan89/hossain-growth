/** Converts an ISO timestamp (or null/undefined) into the value format
 * `<input type="datetime-local">` expects: `YYYY-MM-DDTHH:mm`, in the
 * viewer's local time. */
export function toDateTimeLocalValue(iso: unknown): string {
  if (!iso || typeof iso !== 'string') return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
