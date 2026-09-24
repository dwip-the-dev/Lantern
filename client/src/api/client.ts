import {
  SystemInfo,
  SystemStats,
  Container,
  AppStoreItem,
  InstalledApp,
  Tunnel,
  DirectoryResponse,
  NotificationItem,
  Settings,
  User,
  AuthResponse,
  ActivityItem,
  StorageBreakdown,
  ContinueWatchingItem,
  UserPortalApp,
  InstallTask,
  FamilyMember,
  OnboardingPayload
} from '../types';


let authToken: string | null = localStorage.getItem('lantern_token');

export function setStoredToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('lantern_token', token);
  } else {
    localStorage.removeItem('lantern_token');
  }
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      if (err.detail) errMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
    } catch (_) {}
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetchJson<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setStoredToken(res.token);
    return res;
  },

  async register(data: { username: string; name: string; password: string; email?: string }): Promise<AuthResponse> {
    const res = await fetchJson<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    setStoredToken(res.token);
    return res;
  },

  async guestLogin(): Promise<AuthResponse> {
    const res = await fetchJson<AuthResponse>('/api/auth/guest', { method: 'POST' });
    setStoredToken(res.token);
    return res;
  },

  async getAuthStatus(): Promise<{ configured: boolean; user_count: number }> {
    return fetchJson('/api/auth/status');
  },

  async getFamilyMembers(): Promise<FamilyMember[]> {
    return fetchJson('/api/auth/family-members');
  },

  async switchProfile(username: string, password?: string): Promise<AuthResponse> {
    const res = await fetchJson<AuthResponse>('/api/auth/switch-profile', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setStoredToken(res.token);
    return res;
  },

  async completeOnboarding(data: OnboardingPayload): Promise<AuthResponse> {
    const res = await fetchJson<AuthResponse>('/api/auth/onboarding', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    setStoredToken(res.token);
    return res;
  },

  async setupAdmin(data: { username: string; name: string; password: string; email?: string }): Promise<AuthResponse> {
    const res = await fetchJson<AuthResponse>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User | null; role: string; is_default?: boolean }> {
    return fetchJson('/api/auth/me');
  },

  async updateMediaProgress(data: { file_path: string; title: string; progress: number; position_sec: number; duration_sec: number }): Promise<void> {
    return fetchJson('/api/media/progress', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getSystemServices(): Promise<{ services: any[] }> {
    return fetchJson('/api/system/services');
  },

  async logout(): Promise<void> {
    try {
      await fetchJson('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  // Telemetry & Widgets
  async getSystemInfo(): Promise<SystemInfo> {
    return fetchJson<SystemInfo>('/api/system/info');
  },

  async getSystemStats(): Promise<SystemStats> {
    return fetchJson<SystemStats>('/api/system/stats');
  },

  async getStorageBreakdown(): Promise<StorageBreakdown> {
    return fetchJson<StorageBreakdown>('/api/storage/breakdown');
  },

  async getActivity(): Promise<ActivityItem[]> {
    return fetchJson<ActivityItem[]>('/api/activity');
  },

  async getContinueWatching(): Promise<ContinueWatchingItem[]> {
    return fetchJson<ContinueWatchingItem[]>('/api/media/continue-watching');
  },

  async getUserApps(): Promise<UserPortalApp[]> {
    return fetchJson<UserPortalApp[]>('/api/media/user-apps');
  },

  connectStatsWebSocket(onMessage: (stats: SystemStats) => void, onError?: () => void): () => void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/system/stats`;
    let ws: WebSocket | null = null;
    let isClosed = false;

    function connect() {
      if (isClosed) return;
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (_) {}
        };
        ws.onerror = () => {
          if (onError) onError();
        };
        ws.onclose = () => {
          if (!isClosed) setTimeout(connect, 3000);
        };
      } catch (err) {
        if (!isClosed) setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      isClosed = true;
      if (ws) ws.close();
    };
  },

  // Containers
  async getContainers(): Promise<{ docker_active: boolean; containers: Container[] }> {
    return fetchJson('/api/containers');
  },

  async startContainer(id: string): Promise<{ success: boolean }> {
    return fetchJson(`/api/containers/${id}/start`, { method: 'POST' });
  },

  async stopContainer(id: string): Promise<{ success: boolean }> {
    return fetchJson(`/api/containers/${id}/stop`, { method: 'POST' });
  },

  async restartContainer(id: string): Promise<{ success: boolean }> {
    return fetchJson(`/api/containers/${id}/restart`, { method: 'POST' });
  },

  async removeContainer(id: string): Promise<{ success: boolean }> {
    return fetchJson(`/api/containers/${id}`, { method: 'DELETE' });
  },

  async getContainerLogs(id: string, tail: number = 100): Promise<{ logs: string[] }> {
    return fetchJson(`/api/containers/${id}/logs?tail=${tail}`);
  },

  // App Store
  async getAppCatalog(): Promise<{ catalog: AppStoreItem[]; total: number }> {
    return fetchJson('/api/apps/store');
  },

  async getInstalledApps(): Promise<InstalledApp[]> {
    return fetchJson('/api/apps/installed');
  },

  async installApp(
    param: string | {
      slug: string;
      custom_port?: number;
      custom_name?: string;
      custom_image?: string;
      custom_category?: string;
      custom_env?: Record<string, string>;
      custom_volumes?: string[];
    },
    customPort?: number
  ): Promise<{ success: boolean; task_id: string; slug: string }> {
    const payload = typeof param === 'string'
      ? { slug: param, custom_port: customPort }
      : param;
    return fetchJson('/api/apps/install', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getInstallTask(taskId: string): Promise<InstallTask> {
    return fetchJson<InstallTask>(`/api/apps/tasks/${taskId}`);
  },

  async uninstallApp(slug: string): Promise<{ success: boolean }> {
    return fetchJson(`/api/apps/uninstall/${slug}`, { method: 'POST' });
  },

  // Expose / Tunnels
  async getTunnels(): Promise<{ tunnels: Tunnel[]; base_domain: string }> {
    return fetchJson('/api/expose/tunnels');
  },

  async createTunnel(data: { name: string; target_port: number; subdomain?: string; service_id?: string; protocol?: string }): Promise<Tunnel> {
    return fetchJson('/api/expose/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteTunnel(tunnelId: string): Promise<{ success: boolean }> {
    return fetchJson(`/api/expose/${tunnelId}`, { method: 'DELETE' });
  },

  async getTunnelConfigs(): Promise<{ cloudflare: string; caddy: string }> {
    return fetchJson('/api/expose/configs');
  },

  // Files
  async getFiles(path?: string): Promise<DirectoryResponse> {
    const url = path ? `/api/files?path=${encodeURIComponent(path)}` : '/api/files';
    return fetchJson(url);
  },

  async createFolder(parentPath: string, name: string): Promise<{ success: boolean; path: string }> {
    return fetchJson('/api/files/mkdir', {
      method: 'POST',
      body: JSON.stringify({ parent_path: parentPath, name })
    });
  },

  async deleteFile(path: string): Promise<{ success: boolean; error?: string }> {
    return fetchJson('/api/files/delete', {
      method: 'POST',
      body: JSON.stringify({ path })
    });
  },

  async renameFile(path: string, newName: string): Promise<{ success: boolean; new_path?: string }> {
    return fetchJson('/api/files/rename', {
      method: 'POST',
      body: JSON.stringify({ path, new_name: newName })
    });
  },

  async previewFile(path: string): Promise<{ content?: string; path?: string; name?: string; error?: string }> {
    return fetchJson(`/api/files/preview?path=${encodeURIComponent(path)}`);
  },

  async saveFile(path: string, content: string): Promise<{ success: boolean }> {
    return fetchJson('/api/files/save', {
      method: 'POST',
      body: JSON.stringify({ path, content })
    });
  },

  async uploadFile(targetPath: string, file: File): Promise<{ success: boolean; filename: string }> {
    const formData = new FormData();
    formData.append('target_path', targetPath);
    formData.append('file', file);
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch('/api/files/upload', {
      method: 'POST',
      headers,
      body: formData
    });
    return res.json();
  },

  getDownloadUrl(path: string): string {
    const qToken = authToken ? `&token=${encodeURIComponent(authToken)}` : '';
    return `/api/files/download?path=${encodeURIComponent(path)}${qToken}`;
  },

  // Terminal Exec
  async execCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; exit_code: number }> {
    return fetchJson('/api/terminal/exec', {
      method: 'POST',
      body: JSON.stringify({ command, cwd })
    });
  },

  // Settings & Notifications
  async getSettings(): Promise<Settings> {
    return fetchJson('/api/settings');
  },

  async updateSettings(settings: Partial<Settings>): Promise<{ success: boolean }> {
    return fetchJson('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  },

  async getNotifications(): Promise<NotificationItem[]> {
    return fetchJson('/api/notifications');
  },

  async pruneDocker(): Promise<{ stdout: string; stderr: string; exit_code: number }> {
    return this.execCommand('docker system prune -f');
  },

  async restartServer(): Promise<{ stdout: string; stderr: string; exit_code: number }> {
    return this.execCommand('sync');
  }
};
