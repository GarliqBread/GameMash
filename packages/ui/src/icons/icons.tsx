import { Icon, type IconProps } from "./Icon.js";

export const ShieldCheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3 L20 6 V12 C20 16.5 16.5 20 12 21 C7.5 20 4 16.5 4 12 V6 Z" />
    <path d="M8.5 12 L11 14.5 L15.5 9.5" />
  </Icon>
);

export const EyeOffIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 12 C5.5 7.5 8.5 5.5 12 5.5 C15.5 5.5 18.5 7.5 21 12 C18.5 16.5 15.5 18.5 12 18.5 C8.5 18.5 5.5 16.5 3 12 Z" />
    <circle cx="12" cy="12" r="3" />
    <path d="M4 4 L20 20" />
  </Icon>
);

export const PlusIcon = (props: IconProps) => (
  <Icon strokeWidth={2.2} {...props}>
    <path d="M12 5 V19" />
    <path d="M5 12 H19" />
  </Icon>
);

export const CameraIcon = (props: IconProps) => (
  <Icon strokeWidth={1.8} {...props}>
    <path d="M4 8 H7 L9 5.5 H15 L17 8 H20 V19 H4 Z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
);

export const MonitorIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20 H16" />
    <path d="M12 16 V20" />
  </Icon>
);

export const PlayIcon = (props: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...props}>
    <path d="M7 4 L19 12 L7 20 Z" />
  </Icon>
);

export const CopyIcon = (props: IconProps) => (
  <Icon strokeWidth={1.8} {...props}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8 V5 A1 1 0 0 0 15 4 H5 A1 1 0 0 0 4 5 V15 A1 1 0 0 0 5 16 H8" />
  </Icon>
);

export const TrashIcon = (props: IconProps) => (
  <Icon strokeWidth={1.8} {...props}>
    <path d="M4 7 H20" />
    <path d="M9 7 V4 H15 V7" />
    <path d="M6 7 L7 20 H17 L18 7" />
  </Icon>
);

export const ImageIcon = (props: IconProps) => (
  <Icon strokeWidth={1.8} {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="2" />
    <path d="M21 16 L15 11 L5 20" />
  </Icon>
);

export const ClockIcon = (props: IconProps) => (
  <Icon strokeWidth={2.2} {...props}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9 V13 L14.5 15" />
    <path d="M10 2.5 H14" />
  </Icon>
);

export const UndoIcon = (props: IconProps) => (
  <Icon strokeWidth={1.8} {...props}>
    <path d="M9 7 L4 12 L9 17" />
    <path d="M4 12 H15 A4.5 4.5 0 0 1 15 21 H11" />
  </Icon>
);

export const EraserIcon = (props: IconProps) => (
  <Icon strokeWidth={1.8} {...props}>
    <path d="M8 20 H20" />
    <path d="M4 15 L14 5 L20 11 L11 20 H8 Z" />
    <path d="M9 10 L15 16" />
  </Icon>
);

export const DragHandleIcon = (props: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...props}>
    <circle cx="9" cy="6" r="1.6" />
    <circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" />
    <circle cx="15" cy="18" r="1.6" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon strokeWidth={2.6} {...props}>
    <path d="M5 12.5 L10 17 L19 7" />
  </Icon>
);

export const PencilIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 20 L5 15 L16 4 L20 8 L9 19 Z" />
    <path d="M13.5 6.5 L17.5 10.5" />
  </Icon>
);

export const BoltIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M13 2 L4 14 H12 L11 22 L20 10 H12 Z" />
  </Icon>
);

export const CrownIcon = (props: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...props}>
    <path d="M3 18 L5 7 L9.5 11 L12 5 L14.5 11 L19 7 L21 18 Z" />
  </Icon>
);

export const TriangleUpIcon = (props: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...props}>
    <path d="M12 5 L20 17 H4 Z" />
  </Icon>
);

export const TriangleDownIcon = (props: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...props}>
    <path d="M12 19 L4 7 H20 Z" />
  </Icon>
);

export const DashIcon = (props: IconProps) => (
  <Icon strokeWidth={3} {...props}>
    <path d="M6 12 H18" />
  </Icon>
);

export const ArrowDownIcon = (props: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...props}>
    <path d="M12 21 L5 12 H10 V4 H14 V12 H19 Z" />
  </Icon>
);

export const ShuffleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 7 H6.5 C10.5 7 13.5 17 17.5 17 H21" />
    <path d="M3 17 H6.5 C8.5 17 10 15 11 13" />
    <path d="M13 11 C14 9 15.5 7 17.5 7 H21" />
    <path d="M18 4 L21 7 L18 10" />
    <path d="M18 14 L21 17 L18 20" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon strokeWidth={2.2} {...props}>
    <path d="M6 6 L18 18" />
    <path d="M18 6 L6 18" />
  </Icon>
);
