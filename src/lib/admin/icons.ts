export type AdminIconName =
  | 'grid'
  | 'layers'
  | 'image'
  | 'filetext'
  | 'edit'
  | 'tag'
  | 'quote'
  | 'users'
  | 'folder'
  | 'menu'
  | 'search'
  | 'settings'
  | 'shield'
  | 'activity'
  | 'sun'
  | 'moon'
  | 'logout'
  | 'chevronDown'
  | 'chevronLeft'
  | 'chevronRight'
  | 'plus'
  | 'trash'
  | 'x'
  | 'check'
  | 'upload'
  | 'download'
  | 'alertTriangle'
  | 'filter'
  | 'externalLink'
  | 'refresh'
  | 'mail'
  | 'phone'
  | 'calendar'
  | 'copy';

export const ADMIN_ICON_PATHS: Record<AdminIconName, string> = {
  grid: 'M4 4h7v7H4V4ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7ZM13 13h7v7h-7v-7Z',
  layers: 'M12 3 2 8l10 5 10-5-10-5ZM2 13l10 5 10-5M2 18l10 5 10-5',
  image: 'M4 4h16v16H4V4ZM4 16l5-5 4 4 3-3 4 4M9 9m-1.5 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0',
  filetext: 'M6 2h9l5 5v15H6V2ZM15 2v5h5M9 13h6M9 17h6',
  edit: 'M4 20h4L19.5 8.5a2 2 0 0 0-4-4L4 15v5Z',
  tag: 'M3 11V4h7l10 10-7 7L3 11ZM7 7h.01',
  quote:
    'M7 7a3 3 0 0 0-3 3v3h3v4H4v-7a4 4 0 0 1 4-4v1ZM17 7a3 3 0 0 0-3 3v3h3v4h-3v-7a4 4 0 0 1 4-4v1Z',
  users:
    'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 2.5-5 6-5s6 2 6 5M17 11a3 3 0 1 0 0-6M15 15c2.8 0 7 1.5 7 5',
  folder: 'M3 6h6l2 3h10v10H3V6Z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM21 21l-4.3-4.3',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V20a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 18.33a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87A1.7 1.7 0 0 0 3.1 12.6H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.66 7.6a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 3.24 1.7 1.7 0 0 0 10.04 1.68V1.6a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V7a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.46Z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z',
  activity: 'M3 12h4l3 8 4-16 3 8h4',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  moon: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  chevronDown: 'M6 9l6 6 6-6',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M4 12l5 5L20 6',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  alertTriangle: 'M12 3 2 20h20L12 3ZM12 10v4M12 17h.01',
  filter: 'M4 5h16M7 12h10M10 19h4',
  externalLink: 'M14 4h6v6M20 4 10 14M8 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  refresh: 'M4 12a8 8 0 0 1 14.6-4.6M20 12a8 8 0 0 1-14.6 4.6M4 4v5h5M20 20v-5h-5',
  mail: 'M4 5h16v14H4V5ZM4 6l8 7 8-7',
  phone:
    'M6 3h3l1.5 5-2 2a12 12 0 0 0 6 6l2-2 5 1.5v3a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2Z',
  calendar: 'M4 5h16v16H4V5ZM4 10h16M8 2v6M16 2v6',
  copy: 'M9 9h10v10H9V9ZM5 15V5h10',
};
