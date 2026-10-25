// Client API service with full cloud storage and feature endpoints

export interface User {
  username: string;
  nickname: string;
  isAdmin: boolean;
  isTutor?: boolean;
  tutorSubjects?: string[];
  must_change_password?: boolean;
}

export interface AdminUserRecord {
  username: string;
  password?: string;
  nickname: string;
  isAdmin: boolean;
  isTutor?: boolean;
  tutorSubjects?: string[];
  isBanned: boolean;
  must_change_password: boolean;
  isOnline: boolean;
  last_seen?: string | null;
  last_login?: string | null;
  created_at: string;
}

export interface SiteConfig {
  login_title?: string;
  login_desc?: string;
  version_tag?: string;
  status_tag?: string;
  marquee_text?: string;
  help_text?: string;
  version_intro_text?: string;
  maintenance_mode?: boolean;
  maintenance_message?: string;
  countdown_enabled?: boolean;
  countdown_title?: string;
  countdown_target_date?: string;
  countdown_slogan?: string;
  [key: string]: any;
}

export interface Announcement {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
}

export interface HandoutItem {
  id: string;
  title: string;
  subject: string;
  url: string;
  is_folder: boolean;
  parent_id: string | null;
  created_by?: string;
  created_at: string;
}

export interface ForumMessage {
  id: string;
  username: string;
  subject?: string;
  content: string;
  created_at: string;
}

export interface GradeItem {
  id: string;
  username: string;
  subject: string;
  range_text: string;
  score: number;
  created_at: string;
}

export interface FaqMessage {
  id: string;
  username: string;
  sender: string;
  subject?: string;
  sender_role?: 'student' | 'admin' | 'tutor';
  tutor_subject?: string;
  content: string;
  is_admin_reply: boolean;
  created_at: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `請求失敗 (${res.status})`);
  }
  return data as T;
}

export const api = {
  // Heartbeat
  async heartbeat(username: string): Promise<{ ok: boolean; maintenance_mode: boolean }> {
    return request('/api/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  // Auth
  async login(username: string, password: string): Promise<{ user: User }> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async register(username: string, password: string): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async forceChangePassword(username: string, newPassword: string): Promise<{ user: User }> {
    return request('/api/auth/force-change-password', {
      method: 'POST',
      body: JSON.stringify({ username, newPassword }),
    });
  },

  async updateUser(username: string, updates: { nickname?: string; password?: string }): Promise<{ user: User }> {
    return request('/api/auth/update-user', {
      method: 'POST',
      body: JSON.stringify({ username, ...updates }),
    });
  },

  // Admin
  async createUser(data: {
    username: string;
    password: string;
    nickname?: string;
    mustChangePassword?: boolean;
    isTutor?: boolean;
    tutorSubjects?: string[];
  }) {
    return request<{ success: boolean; message: string; user: AdminUserRecord }>('/api/admin/create-user', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAdminUsers(): Promise<AdminUserRecord[]> {
    return request('/api/admin/users');
  },

  async toggleBan(username: string, ban?: boolean): Promise<{ success: boolean; isBanned: boolean }> {
    return request('/api/admin/toggle-ban', {
      method: 'POST',
      body: JSON.stringify({ username, ban }),
    });
  },

  async forcePasswordChange(username: string, force?: boolean): Promise<{ success: boolean; must_change_password: boolean }> {
    return request('/api/admin/force-pw', {
      method: 'POST',
      body: JSON.stringify({ username, force }),
    });
  },

  async adminUpdatePassword(username: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return request('/api/admin/update-user-password', {
      method: 'POST',
      body: JSON.stringify({ username, newPassword }),
    });
  },

  async adminDeleteUser(username: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/admin/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
    });
  },

  async setTutor(username: string, isTutor: boolean, tutorSubjects: string[]): Promise<{ success: boolean; user: any }> {
    return request('/api/admin/set-tutor', {
      method: 'POST',
      body: JSON.stringify({ username, isTutor, tutorSubjects }),
    });
  },

  async setMaintenance(enabled: boolean, message?: string): Promise<{ success: boolean; maintenance_mode: boolean; config: SiteConfig }> {
    return request('/api/admin/maintenance', {
      method: 'POST',
      body: JSON.stringify({ enabled, message }),
    });
  },

  // Site Config
  async getSiteConfig(): Promise<SiteConfig> {
    return request('/api/site-config');
  },

  async updateSiteConfig(config: Partial<SiteConfig>): Promise<{ success: boolean; config: SiteConfig }> {
    return request('/api/site-config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    return request('/api/announcements');
  },

  async postAnnouncement(content: string, created_by: string): Promise<{ success: boolean; announcement: Announcement }> {
    return request('/api/announcements', {
      method: 'POST',
      body: JSON.stringify({ content, created_by }),
    });
  },

  async deleteAnnouncement(id: string): Promise<{ success: boolean }> {
    return request(`/api/announcements/${id}`, { method: 'DELETE' });
  },

  // Handouts
  async getHandouts(parentId?: string | null, subject?: string): Promise<HandoutItem[]> {
    const params = new URLSearchParams();
    if (parentId !== undefined) params.append('parent_id', parentId === null ? 'null' : parentId);
    if (subject && subject !== '全部') params.append('subject', subject);
    const q = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/handouts${q}`);
  },

  async createFolder(title: string, parent_id: string | null, subject?: string, created_by?: string): Promise<{ success: boolean; handout: HandoutItem }> {
    return request('/api/handouts', {
      method: 'POST',
      body: JSON.stringify({ title, is_folder: true, parent_id, subject: subject || '數學', created_by }),
    });
  },

  async uploadFile(data: {
    title: string;
    fileName: string;
    fileData: string;
    parent_id: string | null;
    subject?: string;
    created_by?: string;
  }): Promise<{ success: boolean; handout: HandoutItem; url: string }> {
    return request('/api/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteHandout(id: string): Promise<{ success: boolean }> {
    return request(`/api/handouts/${id}`, { method: 'DELETE' });
  },

  // Forum
  async getForumMessages(subject?: string): Promise<ForumMessage[]> {
    const q = subject && subject !== '全部' ? `?subject=${encodeURIComponent(subject)}` : '';
    return request(`/api/forum-messages${q}`);
  },

  async postForumMessage(username: string, content: string, subject?: string): Promise<{ success: boolean; message: ForumMessage }> {
    return request('/api/forum-messages', {
      method: 'POST',
      body: JSON.stringify({ username, content, subject: subject || '數學' }),
    });
  },

  async deleteForumMessage(id: string): Promise<{ success: boolean }> {
    return request(`/api/forum-messages/${id}`, { method: 'DELETE' });
  },

  // Grades
  async getGrades(): Promise<GradeItem[]> {
    return request('/api/grades');
  },

  async postGrade(data: { username: string; subject: string; range_text: string; score: number }): Promise<{ success: boolean; grade: GradeItem }> {
    return request('/api/grades', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteGrade(id: string): Promise<{ success: boolean }> {
    return request(`/api/grades/${id}`, { method: 'DELETE' });
  },

  // FAQ
  async getFaqMessages(username?: string, subject?: string): Promise<FaqMessage[]> {
    const params = new URLSearchParams();
    if (username) params.append('username', username);
    if (subject && subject !== '全部') params.append('subject', subject);
    const q = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/faq-messages${q}`);
  },

  async postFaqMessage(data: {
    username: string;
    sender: string;
    content: string;
    is_admin_reply: boolean;
    subject?: string;
    sender_role?: 'student' | 'admin' | 'tutor';
    tutor_subject?: string;
  }): Promise<{ success: boolean; message: FaqMessage }> {
    return request('/api/faq-messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteFaqMessage(id: string): Promise<{ success: boolean }> {
    return request(`/api/faq-messages/${id}`, { method: 'DELETE' });
  },

  async deleteUserFaqConversation(username: string): Promise<{ success: boolean }> {
    return request(`/api/faq-messages/user/${encodeURIComponent(username)}`, { method: 'DELETE' });
  },
};
