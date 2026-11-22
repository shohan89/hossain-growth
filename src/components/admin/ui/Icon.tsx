import { ADMIN_ICON_PATHS, type AdminIconName } from '../../../lib/admin/icons';

export default function Icon({
  name,
  className = 'h-4 w-4',
}: {
  name: AdminIconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ADMIN_ICON_PATHS[name]} />
    </svg>
  );
}
