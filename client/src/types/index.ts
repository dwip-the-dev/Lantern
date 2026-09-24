export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: 'admin' | 'user' | 'guest';
  avatar_url?: string;
  created_at?: string;
}

export interface FamilyMember {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: 'admin' | 'user' | 'guest';
  avatar_url?: string;
  avatar_color?: string;
  avatar_icon?: string;
  is_admin: boolean;
  created_at?: string;
}

export interface OnboardingPayload {
  server_name: string;
  tagline: string;
  admin_name: string;
  admin_username: string;
  admin_password: string;
  admin_email?: string;
  family_members?: {
    username: string;
    name: string;
    role: string;
    password?: string;
  }[];
}

export interface ContinueWatchingItem {
  id: string;
  platform: string;
  title: string;
  progress: number;
  thumbnail: string;
  badge_color: string;
  icon: string;
  target_url: string;
  is_real_file?: boolean;
  file_path?: string;
  stream_url?: string;
  size_mb?: number;
  file_size_formatted?: string;
  position_sec?: number;
  duration_sec?: number;
  duration_formatted?: string;
  resolution?: string;
  quality_label?: string;
  video_codec?: string;
  fps?: number;
  width?: number;
  height?: number;
  audio_codec?: string;
  audio_layout?: string;
  audio_display?: string;
  bitrate_mbps?: number;
  bitrate_formatted?: string;
  container?: string;
}

export interface UserPortalApp {
  id: string;
  slug?: string;
  name: string;
  category: string;
  icon: string;
  icon_url?: string;
  color: string;
  default_port?: number;
  url?: string;
  is_online?: boolean;
  status?: string;
  description?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ActivityItem {
  id: number;
  icon: string;
  color: string;
  title: string;
  time_ago: string;
  created_at?: string;
}

export interface StorageCategory {
  name: string;
  gb?: number;
  size_gb?: number;
  color: string;
  hex?: string;
  percent?: number;
}

export interface StorageBreakdown {
  percent: number;
  used_gb: number;
  total_gb: number;
  categories: StorageCategory[];
}

export interface SystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  arch: string;
  local_ip: string;
  boot_time: number;
  uptime_human: string;
  uptime_seconds: number;
  cpu_model: string;
  cpu_count_logical: number;
  cpu_count_physical: number;
  docker_running: boolean;
  server_name: string;
  tagline: string;
  version: string;
}

export interface DiskInfo {
  device: string;
  mountpoint: string;
  fstype: string;
  total: number;
  used: number;
  free: number;
  percent: number;
}

export interface DiskAlert {
  severity: 'warning' | 'critical';
  mountpoint: string;
  percent: number;
  message: string;
}

export interface SystemStats {
  timestamp: number;
  cpu: {
    percent: number;
    cores: number[];
    frequency_mhz: number | null;
    load_avg: number[];
  };
  memory: {
    total: number;
    available: number;
    used: number;
    free: number;
    percent: number;
    cached?: number;
    buffers?: number;
  };
  swap: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  disks: DiskInfo[];
  disk_alerts: DiskAlert[];
  network: {
    bytes_sent: number;
    bytes_recv: number;
    speed_rx_bytes: number;
    speed_tx_bytes: number;
    connections: number;
  };
  disk_io: {
    read_speed_bytes: number;
    write_speed_bytes: number;
  };
  temperatures?: Record<string, Array<{ label: string; current: number; high: number | null; critical: number | null }>>;
}

export interface Container {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | string;
  created: number | string;
  ports: string[];
  category?: string;
  cpu_percent?: number;
  memory_usage?: string;
  uptime?: string;
  is_real_docker: boolean;
  logs?: string[];
}

export interface AppStoreItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  developer?: string;
  tagline?: string;
  description: string;
  icon: string;
  icon_url?: string;
  image: string;
  port: number;
  container_port?: number;
  volumes: string[];
  env: Record<string, string>;
  featured: boolean;
  badge?: string;
  is_installed?: boolean;
  installed_id?: string;
  status?: string;
  active_port?: number;
  exposed?: boolean;
  public_url?: string;
}

export interface InstallTask {
  task_id: string;
  status: 'running' | 'completed' | 'error';
  logs: string[];
  app_id: string;
  slug: string;
  port: number;
  error?: string | null;
}


export interface InstalledApp {
  id: string;
  name: string;
  slug: string;
  icon: string;
  category: string;
  image: string;
  port: number;
  container_id: string;
  status: string;
  volumes: string[];
  env: Record<string, string>;
  exposed: number;
  public_url?: string;
  installed_at: string;
  updated_at: string;
}

export interface Tunnel {
  id: string;
  name: string;
  target_port: number;
  subdomain: string;
  public_url: string;
  service_id?: string;
  status: string;
  ssl_enabled: boolean | number;
  protocol: string;
  created_at: string;
}

export interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  size_human: string;
  modified: number;
  modified_human: string;
  extension: string;
}

export interface Bookmark {
  name: string;
  path: string;
  icon: string;
}

export interface DirectoryResponse {
  current_path: string;
  parent_path: string | null;
  items: FileItem[];
  bookmarks: Bookmark[];
  error?: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error' | 'critical';
  read: number;
  created_at: string;
  time_ago?: string;
}

export interface Settings {
  server_name: string;
  tagline: string;
  disk_warning_threshold: string;
  disk_critical_threshold: string;
  base_domain: string;
  http_port: string;
}
