// Cloud-native Firestore Client API Service
// Enables real-time bidirectional synchronization between Gemini Studio and Netlify deployments.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

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
  site_title?: string;
  login_title?: string;
  login_desc?: string;
  welcome_hero_title?: string;
  version_tag?: string;
  status_tag?: string;
  marquee_text?: string;
  line_id?: string;
  line_url?: string;
  line_desc?: string;
  help_text?: string;
  version_intro_text?: string;
  maintenance_mode?: boolean;
  maintenance_message?: string;
  countdown_enabled?: boolean;
  countdown_title?: string;
  countdown_target_date?: string;
  countdown_slogan?: string;
  footer_text?: string;
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

export interface LiveStream {
  id: string;
  title: string;
  subject: string;
  streamType: 'youtube' | 'builtin';
  youtubeUrl?: string;
  streamUrl?: string;
  isLive: boolean;
  broadcaster: string;
  broadcasterNickname: string;
  broadcasterRole: 'student' | 'admin' | 'tutor';
  tutorSubject?: string;
  viewers: number;
  likes: number;
  startedAt: string;
  endedAt?: string;
  allowChat: boolean;
  whiteboardEnabled?: boolean;
}

export interface LiveStreamMessage {
  id: string;
  streamId: string;
  username: string;
  nickname: string;
  role: 'student' | 'admin' | 'tutor';
  content: string;
  isQuestion?: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Cloud Firestore Database Operations with Seed Initialization
// ---------------------------------------------------------------------------

let hasSeeded = false;

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  site_title: '我的網站 - 會員系統',
  login_title: '歡迎來到<br><span class="font-normal text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">會員整合系統</span>',
  login_desc: '請在右側輸入您的帳號密碼。當您專注輸入時，系統角色將與您互動；登入成功後更將解鎖完整面板與講義資源。',
  welcome_hero_title: '歡迎來到您的專屬空間',
  version_tag: 'v.0.0.1 Beta 3',
  status_tag: '目前網站開站中',
  marquee_text: '歡迎來到網站！目前系統功能全面運作中，即時直播教室、講義與會考倒數已跨端雙向同步連線。',
  line_id: '@682knyxn',
  line_url: 'https://line.me',
  line_desc: '獲得即時一對一解答與講義更新通知！',
  help_text: '【系統幫助與操作指引】\n\n1. 登入與註冊：輸入使用者帳號與密碼即可登入。初次使用預設密碼時需依照安全規則變更密碼。\n2. 直播功能：管理員與各科小老師可隨時開啟 YouTube 或內建即時直播課堂，學生可即時發問、點擊愛心與使用獨立網址觀看。\n3. 講義閱讀：點選講義資料夾可展開瀏覽並預覽 PDF，支援科目篩選、連續滾動與放大下載。\n4. 成績登記：填寫考試科目、範圍與分數，即可自動計入個人學習歷程。\n5. 問題發問：發問時可選擇指定科目，當科小老師與管理員皆可即時為您解答。',
  version_intro_text: '【我的網站 - 全功能簡介與版本說明】\n\n🔹 1. 直播課堂功能\n   - 管理員與各科小老師可隨時開啟 YouTube 或內建即時直播。\n   - 支援獨立網址分享、相機/螢幕分享廣播、講課白板、即時問答與按讚互動。\n\n🔹 2. 安全身分驗證與個人化\n   - 支援深色與亮色模式。\n   - 靈動幾何角色與互動眼球。\n   - 支援生物辨識登入。\n\n🔹 3. 小老師與科目分科制度\n   - 管理員可指派各學科小老師 (數學、物理、化學、英文、國文、綜合、不分科)。\n   - 小老師可上傳發布講義與主持直播課堂。\n\n🔹 4. 116年會考倒數計時\n   - 即時倒數天、時、分、秒，陪伴學員全力衝刺！',
  maintenance_mode: false,
  maintenance_message: '⚠️ 系統目前正在進行伺服器維護與升級修復，暫時關閉所有功能，請稍候再試。',
  countdown_enabled: true,
  countdown_title: '116年 國中教育會考倒數',
  countdown_target_date: '2027-05-15T08:00',
  countdown_slogan: '全力以赴，金榜題名！每一步努力都在成就更好的自己',
  footer_text: 'My Website System',
};

async function ensureInitialSeed(): Promise<void> {
  if (hasSeeded) return;
  hasSeeded = true;
  try {
    // Check if admin user exists in Firestore
    const adminDocRef = doc(db, 'users', 'u_hsliang-admin');
    const adminSnap = await getDoc(adminDocRef);

    if (!adminSnap.exists()) {
      // Seed default admin
      await setDoc(adminDocRef, {
        username: 'hsliang-admin',
        password: 'admin123',
        nickname: '系統管理員',
        isAdmin: true,
        isTutor: false,
        tutorSubjects: [],
        must_change_password: false,
        isBanned: false,
        isOnline: true,
        last_login: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      // Seed math tutor
      await setDoc(doc(db, 'users', 'u_tutor-math'), {
        username: 'tutor-math',
        password: 'tutor123',
        nickname: '數學科小老師',
        isAdmin: false,
        isTutor: true,
        tutorSubjects: ['數學'],
        must_change_password: false,
        isBanned: false,
        isOnline: false,
        last_login: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    // Check site config
    const configDocRef = doc(db, 'site_config', 'general');
    const configSnap = await getDoc(configDocRef);
    if (!configSnap.exists()) {
      await setDoc(configDocRef, DEFAULT_SITE_CONFIG);
    }

    // Check announcement
    const annColl = collection(db, 'announcements');
    const annSnap = await getDocs(annColl);
    if (annSnap.empty) {
      await setDoc(doc(db, 'announcements', 'ann-initial'), {
        id: 'ann-initial',
        content: '🎉 歡迎各位學員！即時線上直播教室與各學科講義已全面上架，雙向即時雲端同步已啟動！',
        created_by: 'hsliang-admin',
        created_at: new Date().toISOString(),
      });
    }

    // Check sample handout
    const handColl = collection(db, 'handouts');
    const handSnap = await getDocs(handColl);
    if (handSnap.empty) {
      await setDoc(doc(db, 'handouts', 'folder-math-1'), {
        id: 'folder-math-1',
        title: '高一數學講義與試題',
        subject: '數學',
        url: '',
        is_folder: true,
        parent_id: null,
        created_by: 'hsliang-admin',
        created_at: new Date().toISOString(),
      });
      await setDoc(doc(db, 'handouts', 'file-math-1'), {
        id: 'file-math-1',
        title: '第一單元：數與式重點精華講義.pdf',
        subject: '數學',
        url: '/samples/math_sample.pdf',
        is_folder: false,
        parent_id: 'folder-math-1',
        created_by: 'hsliang-admin',
        created_at: new Date().toISOString(),
      });
    }

    // Check sample live stream
    const streamColl = collection(db, 'streams');
    const streamSnap = await getDocs(streamColl);
    if (streamSnap.empty) {
      const sampleStreamId = 'stream-sample-math';
      await setDoc(doc(db, 'streams', sampleStreamId), {
        id: sampleStreamId,
        title: '【熱門解題】116國中教育會考 - 數與式考前精華特訓直播',
        subject: '數學',
        streamType: 'builtin',
        youtubeUrl: '',
        streamUrl: '',
        isLive: true,
        broadcaster: 'hsliang-admin',
        broadcasterNickname: '系統管理員',
        broadcasterRole: 'admin',
        viewers: 28,
        likes: 92,
        startedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        allowChat: true,
        whiteboardEnabled: true,
      });

      await setDoc(doc(db, 'stream_messages', 'smsg-1'), {
        id: 'smsg-1',
        streamId: sampleStreamId,
        username: 'hsliang-admin',
        nickname: '系統管理員',
        role: 'admin',
        content: '同學好！歡迎來到直播課堂，右上方可切換白板與螢幕，有問題請隨時發問！',
        isQuestion: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      });
      await setDoc(doc(db, 'stream_messages', 'smsg-2'), {
        id: 'smsg-2',
        streamId: sampleStreamId,
        username: 'student1',
        nickname: '林同學',
        role: 'student',
        content: '老師請問絕對值不等式的幾何意義要怎麼快速判斷？',
        isQuestion: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      });
    }
  } catch (err) {
    console.warn('Initial Firestore seed warning:', err);
  }
}

// Trigger bootstrap check immediately
ensureInitialSeed();

export const api = {
  // Heartbeat & Online check
  async heartbeat(username: string): Promise<{ ok: boolean; maintenance_mode: boolean }> {
    try {
      if (username) {
        const uRef = doc(db, 'users', `u_${username.toLowerCase()}`);
        updateDoc(uRef, {
          isOnline: true,
          last_seen: new Date().toISOString(),
        }).catch(() => {});
      }
      const cfgRef = doc(db, 'site_config', 'general');
      const cfgSnap = await getDoc(cfgRef);
      const isMaint = cfgSnap.exists() ? !!cfgSnap.data().maintenance_mode : false;
      return { ok: true, maintenance_mode: isMaint };
    } catch {
      return { ok: true, maintenance_mode: false };
    }
  },

  // Auth: Login
  async login(username: string, password: string): Promise<{ user: User }> {
    const rawUsername = username.trim();
    if (!rawUsername || !password) throw new Error('請輸入帳號與密碼');

    await ensureInitialSeed();

    const userDocId = `u_${rawUsername.toLowerCase()}`;
    const userRef = doc(db, 'users', userDocId);
    let snap = await getDoc(userRef);

    // If not found by lowercased ID, query by username field
    if (!snap.exists()) {
      const q = query(collection(db, 'users'), where('username', '==', rawUsername));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        snap = querySnap.docs[0];
      }
    }

    if (!snap.exists()) {
      throw new Error('使用者不存在，請確認帳號或進行註冊');
    }

    const userData = snap.data() as AdminUserRecord;
    if (userData.isBanned) {
      throw new Error('此帳號已被管理員停權');
    }
    if (userData.password !== password) {
      throw new Error('密碼錯誤，請重新確認');
    }

    try {
      await updateDoc(snap.ref, {
        last_login: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        isOnline: true,
      });
    } catch {
      // background update ignore
    }

    return {
      user: {
        username: userData.username,
        nickname: userData.nickname || userData.username,
        isAdmin: !!userData.isAdmin || userData.username === 'hsliang-admin',
        isTutor: !!userData.isTutor,
        tutorSubjects: userData.tutorSubjects || [],
        must_change_password: !!userData.must_change_password,
      },
    };
  },

  // Auth: Register (允許任何人在 Netlify 或任何裝置即時建立帳號)
  async register(username: string, password: string): Promise<{ success: boolean; message: string }> {
    const rawUsername = username.trim();
    if (!rawUsername || !password) throw new Error('請填寫完整帳號與密碼');
    if (rawUsername.length < 2) throw new Error('帳號長度至少需 2 個字元');
    if (password.length < 4) throw new Error('密碼長度至少需 4 個字元');

    await ensureInitialSeed();

    const userDocId = `u_${rawUsername.toLowerCase()}`;
    const userRef = doc(db, 'users', userDocId);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      throw new Error('此帳號已被註冊，請直接登入或使用其他帳號');
    }

    const newUser: AdminUserRecord = {
      username: rawUsername,
      password: password,
      nickname: rawUsername,
      isAdmin: rawUsername === 'hsliang-admin',
      isTutor: false,
      tutorSubjects: [],
      must_change_password: false,
      isBanned: false,
      isOnline: false,
      last_login: null,
      last_seen: null,
      created_at: new Date().toISOString(),
    };

    await setDoc(userRef, newUser);
    return { success: true, message: '註冊成功！請直接登入' };
  },

  // Auth: Force Change Password
  async forceChangePassword(username: string, newPassword: string): Promise<{ user: User }> {
    const rawUsername = username.trim();
    const userDocId = `u_${rawUsername.toLowerCase()}`;
    const userRef = doc(db, 'users', userDocId);
    const snap = await getDoc(userRef);

    if (!snap.exists()) throw new Error('使用者不存在');

    await updateDoc(userRef, {
      password: newPassword,
      must_change_password: false,
    });

    const updated = (await getDoc(userRef)).data() as AdminUserRecord;
    return {
      user: {
        username: updated.username,
        nickname: updated.nickname,
        isAdmin: !!updated.isAdmin || updated.username === 'hsliang-admin',
        isTutor: !!updated.isTutor,
        tutorSubjects: updated.tutorSubjects || [],
        must_change_password: false,
      },
    };
  },

  // Auth: Update User Profile
  async updateUser(username: string, updates: { nickname?: string; password?: string }): Promise<{ user: User }> {
    const rawUsername = username.trim();
    const userDocId = `u_${rawUsername.toLowerCase()}`;
    const userRef = doc(db, 'users', userDocId);
    const snap = await getDoc(userRef);

    if (!snap.exists()) throw new Error('使用者不存在');

    const updatePayload: any = {};
    if (updates.nickname) updatePayload.nickname = updates.nickname;
    if (updates.password) updatePayload.password = updates.password;

    await updateDoc(userRef, updatePayload);
    const updated = (await getDoc(userRef)).data() as AdminUserRecord;

    return {
      user: {
        username: updated.username,
        nickname: updated.nickname,
        isAdmin: !!updated.isAdmin || updated.username === 'hsliang-admin',
        isTutor: !!updated.isTutor,
        tutorSubjects: updated.tutorSubjects || [],
        must_change_password: !!updated.must_change_password,
      },
    };
  },

  // Admin: Create User (後台管理員建立學員/小老師，雙向即時寫入雲端)
  async createUser(data: {
    username: string;
    password: string;
    nickname?: string;
    mustChangePassword?: boolean;
    isTutor?: boolean;
    tutorSubjects?: string[];
  }): Promise<{ success: boolean; message: string; user: AdminUserRecord }> {
    const rawUsername = data.username.trim();
    if (!rawUsername) throw new Error('請輸入帳號名稱');
    if (!data.password) throw new Error('請輸入密碼');

    await ensureInitialSeed();

    const userDocId = `u_${rawUsername.toLowerCase()}`;
    const userRef = doc(db, 'users', userDocId);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      throw new Error(`帳號「${rawUsername}」已被使用，請更換其他帳號`);
    }

    const newUser: AdminUserRecord = {
      username: rawUsername,
      password: data.password,
      nickname: data.nickname?.trim() || rawUsername,
      isAdmin: false,
      isTutor: !!data.isTutor,
      tutorSubjects: data.tutorSubjects || [],
      must_change_password: data.mustChangePassword !== undefined ? !!data.mustChangePassword : true,
      isBanned: false,
      isOnline: false,
      last_login: null,
      last_seen: null,
      created_at: new Date().toISOString(),
    };

    await setDoc(userRef, newUser);
    return { success: true, message: `成功建立使用者「${rawUsername}」`, user: newUser };
  },

  // Admin: Get all users
  async getAdminUsers(): Promise<AdminUserRecord[]> {
    await ensureInitialSeed();
    const usersColl = collection(db, 'users');
    const snap = await getDocs(usersColl);
    const list: AdminUserRecord[] = [];
    snap.forEach((d) => {
      list.push(d.data() as AdminUserRecord);
    });
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  },

  // Admin: Toggle Ban
  async toggleBan(username: string, ban?: boolean): Promise<{ success: boolean; isBanned: boolean }> {
    const userDocId = `u_${username.trim().toLowerCase()}`;
    const userRef = doc(db, 'users', userDocId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) throw new Error('使用者不存在');

    const curBanned = !!snap.data().isBanned;
    const nextBanned = ban !== undefined ? ban : !curBanned;
    await updateDoc(userRef, { isBanned: nextBanned });
    return { success: true, isBanned: nextBanned };
  },

  // Admin: Force password change
  async forcePasswordChange(username: string, force?: boolean): Promise<{ success: boolean; must_change_password: boolean }> {
    const userDocId = `u_${username.trim().toLowerCase()}`;
    const userRef = doc(db, 'users', userDocId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) throw new Error('使用者不存在');

    const curForce = !!snap.data().must_change_password;
    const nextForce = force !== undefined ? force : !curForce;
    await updateDoc(userRef, { must_change_password: nextForce });
    return { success: true, must_change_password: nextForce };
  },

  // Admin: Update user password
  async adminUpdatePassword(username: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const userDocId = `u_${username.trim().toLowerCase()}`;
    const userRef = doc(db, 'users', userDocId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) throw new Error('使用者不存在');

    await updateDoc(userRef, { password: newPassword });
    return { success: true, message: '密碼已修改完成' };
  },

  // Admin: Delete user
  async adminDeleteUser(username: string): Promise<{ success: boolean; message: string }> {
    const userDocId = `u_${username.trim().toLowerCase()}`;
    const userRef = doc(db, 'users', userDocId);
    await deleteDoc(userRef);
    return { success: true, message: '已刪除使用者' };
  },

  // Admin: Set Tutor Role
  async setTutor(username: string, isTutor: boolean, tutorSubjects: string[]): Promise<{ success: boolean; user: any }> {
    const userDocId = `u_${username.trim().toLowerCase()}`;
    const userRef = doc(db, 'users', userDocId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) throw new Error('使用者不存在');

    await updateDoc(userRef, {
      isTutor,
      tutorSubjects,
    });
    const updated = (await getDoc(userRef)).data();
    return { success: true, user: updated };
  },

  // Admin: Maintenance Mode
  async setMaintenance(enabled: boolean, message?: string): Promise<{ success: boolean; maintenance_mode: boolean; config: SiteConfig }> {
    const configRef = doc(db, 'site_config', 'general');
    const updatePayload: any = { maintenance_mode: enabled };
    if (message) updatePayload.maintenance_message = message;
    await updateDoc(configRef, updatePayload);
    const snap = await getDoc(configRef);
    return { success: true, maintenance_mode: enabled, config: snap.data() as SiteConfig };
  },

  // Site Config
  async getSiteConfig(): Promise<SiteConfig> {
    await ensureInitialSeed();
    const configRef = doc(db, 'site_config', 'general');
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      return { ...DEFAULT_SITE_CONFIG, ...snap.data() };
    }
    return DEFAULT_SITE_CONFIG;
  },

  async saveSiteConfig(config: Partial<SiteConfig>): Promise<{ success: boolean; config: SiteConfig }> {
    const configRef = doc(db, 'site_config', 'general');
    await setDoc(configRef, config, { merge: true });
    const snap = await getDoc(configRef);
    return { success: true, config: snap.data() as SiteConfig };
  },

  async updateSiteConfig(config: Partial<SiteConfig>): Promise<{ success: boolean; config: SiteConfig }> {
    return this.saveSiteConfig(config);
  },

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    await ensureInitialSeed();
    const annColl = collection(db, 'announcements');
    const snap = await getDocs(annColl);
    const list: Announcement[] = [];
    snap.forEach((d) => list.push(d.data() as Announcement));
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  },

  async postAnnouncement(content: string, created_by: string): Promise<{ success: boolean; announcement: Announcement }> {
    const id = 'ann-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newAnn: Announcement = {
      id,
      content,
      created_by,
      created_at: new Date().toISOString(),
    };
    await setDoc(doc(db, 'announcements', id), newAnn);
    return { success: true, announcement: newAnn };
  },

  async deleteAnnouncement(id: string): Promise<{ success: boolean }> {
    await deleteDoc(doc(db, 'announcements', id));
    return { success: true };
  },

  // Handouts & Folders
  async getHandouts(parentId: string | null, subject?: string): Promise<HandoutItem[]> {
    await ensureInitialSeed();
    const handColl = collection(db, 'handouts');
    const snap = await getDocs(handColl);
    let list: HandoutItem[] = [];
    snap.forEach((d) => list.push(d.data() as HandoutItem));

    if (parentId !== undefined) {
      list = list.filter((h) => (parentId === null ? h.parent_id === null : h.parent_id === parentId));
    }
    if (subject && subject !== '全部') {
      list = list.filter((h) => h.subject === subject);
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  },

  async createFolder(title: string, parentId: string | null, subject?: string, created_by?: string): Promise<{ success: boolean; handout: HandoutItem }> {
    const id = 'folder-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const folderItem: HandoutItem = {
      id,
      title,
      subject: subject || '數學',
      url: '',
      is_folder: true,
      parent_id: parentId,
      created_by: created_by || 'hsliang-admin',
      created_at: new Date().toISOString(),
    };
    await setDoc(doc(db, 'handouts', id), folderItem);
    return { success: true, handout: folderItem };
  },

  async uploadFile(data: {
    title: string;
    fileName: string;
    fileData: string;
    parent_id: string | null;
    subject?: string;
    created_by?: string;
  }): Promise<{ success: boolean; handout: HandoutItem; url: string }> {
    const id = 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const fileItem: HandoutItem = {
      id,
      title: data.title || data.fileName,
      subject: data.subject || '數學',
      url: data.fileData,
      is_folder: false,
      parent_id: data.parent_id,
      created_by: data.created_by || 'hsliang-admin',
      created_at: new Date().toISOString(),
    };
    await setDoc(doc(db, 'handouts', id), fileItem);
    return { success: true, handout: fileItem, url: data.fileData };
  },

  async deleteHandout(id: string): Promise<{ success: boolean }> {
    await deleteDoc(doc(db, 'handouts', id));
    const handColl = collection(db, 'handouts');
    const snap = await getDocs(handColl);
    const batchDeletes: Promise<void>[] = [];
    snap.forEach((d) => {
      const data = d.data() as HandoutItem;
      if (data.parent_id === id) {
        batchDeletes.push(deleteDoc(d.ref));
      }
    });
    await Promise.all(batchDeletes);
    return { success: true };
  },

  // Forum Messages
  async getForumMessages(subject?: string): Promise<ForumMessage[]> {
    const fColl = collection(db, 'forum_messages');
    const snap = await getDocs(fColl);
    let list: ForumMessage[] = [];
    snap.forEach((d) => list.push(d.data() as ForumMessage));
    if (subject && subject !== '全部') {
      list = list.filter((m) => m.subject === subject);
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  },

  async postForumMessage(username: string, content: string, subject: string): Promise<{ success: boolean; message: ForumMessage }> {
    const id = 'forum-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newMsg: ForumMessage = {
      id,
      username,
      content,
      subject: subject || '數學',
      created_at: new Date().toISOString(),
    };
    await setDoc(doc(db, 'forum_messages', id), newMsg);
    return { success: true, message: newMsg };
  },

  async deleteForumMessage(id: string): Promise<{ success: boolean }> {
    await deleteDoc(doc(db, 'forum_messages', id));
    return { success: true };
  },

  // Grades
  async getGrades(): Promise<GradeItem[]> {
    const gColl = collection(db, 'grades');
    const snap = await getDocs(gColl);
    const list: GradeItem[] = [];
    snap.forEach((d) => list.push(d.data() as GradeItem));
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  },

  async postGrade(data: { username: string; subject: string; range_text: string; score: number }): Promise<{ success: boolean; grade: GradeItem }> {
    const id = 'grade-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newGrade: GradeItem = {
      id,
      username: data.username,
      subject: data.subject || '不分科',
      range_text: data.range_text,
      score: Number(data.score),
      created_at: new Date().toISOString(),
    };
    await setDoc(doc(db, 'grades', id), newGrade);
    return { success: true, grade: newGrade };
  },

  async deleteGrade(id: string): Promise<{ success: boolean }> {
    await deleteDoc(doc(db, 'grades', id));
    return { success: true };
  },

  // FAQ / Consultation Messages
  async getFaqMessages(username?: string, subject?: string): Promise<FaqMessage[]> {
    const faqColl = collection(db, 'faq_messages');
    const snap = await getDocs(faqColl);
    let list: FaqMessage[] = [];
    snap.forEach((d) => list.push(d.data() as FaqMessage));

    if (username) {
      list = list.filter((m) => m.username === username);
    }
    if (subject && subject !== '全部') {
      if (subject === '不分科') {
        list = list.filter((m) => !m.subject || m.subject === '不分科');
      } else {
        list = list.filter((m) => m.subject === subject);
      }
    }
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return list;
  },

  async postFaqMessage(data: {
    username: string;
    sender: string;
    subject?: string;
    content: string;
    is_admin_reply: boolean;
    sender_role?: 'student' | 'admin' | 'tutor';
    tutor_subject?: string;
  }): Promise<{ success: boolean; message: FaqMessage }> {
    const id = 'faq-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newFaq: FaqMessage = {
      id,
      username: data.username,
      sender: data.sender || data.username,
      subject: data.subject || '數學',
      sender_role: data.sender_role || (data.is_admin_reply ? 'admin' : 'student'),
      tutor_subject: data.tutor_subject || '',
      content: data.content,
      is_admin_reply: !!data.is_admin_reply,
      created_at: new Date().toISOString(),
    };
    await setDoc(doc(db, 'faq_messages', id), newFaq);
    return { success: true, message: newFaq };
  },

  async deleteUserFaqConversation(username: string): Promise<{ success: boolean }> {
    const faqColl = collection(db, 'faq_messages');
    const snap = await getDocs(faqColl);
    const batchDeletes: Promise<void>[] = [];
    snap.forEach((d) => {
      const data = d.data() as FaqMessage;
      if (data.username === username) {
        batchDeletes.push(deleteDoc(d.ref));
      }
    });
    await Promise.all(batchDeletes);
    return { success: true };
  },

  async deleteFaqMessage(id: string): Promise<{ success: boolean }> {
    await deleteDoc(doc(db, 'faq_messages', id));
    return { success: true };
  },

  // Live Streams
  async getStreams(): Promise<LiveStream[]> {
    await ensureInitialSeed();
    const sColl = collection(db, 'streams');
    const snap = await getDocs(sColl);
    const list: LiveStream[] = [];
    snap.forEach((d) => list.push(d.data() as LiveStream));
    list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    return list;
  },

  async createStream(data: {
    title: string;
    subject: string;
    streamType: 'youtube' | 'builtin';
    youtubeUrl?: string;
    streamUrl?: string;
    broadcaster: string;
    broadcasterNickname: string;
    broadcasterRole: 'student' | 'admin' | 'tutor';
    tutorSubject?: string;
    allowChat?: boolean;
    whiteboardEnabled?: boolean;
  }): Promise<{ success: boolean; stream: LiveStream }> {
    const id = 'stream-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newStream: LiveStream = {
      id,
      title: data.title,
      subject: data.subject || '不分科',
      streamType: data.streamType === 'youtube' ? 'youtube' : 'builtin',
      youtubeUrl: data.youtubeUrl || '',
      streamUrl: data.streamUrl || '',
      isLive: true,
      broadcaster: data.broadcaster,
      broadcasterNickname: data.broadcasterNickname || data.broadcaster,
      broadcasterRole: data.broadcasterRole || 'admin',
      tutorSubject: data.tutorSubject || '',
      viewers: 1,
      likes: 0,
      startedAt: new Date().toISOString(),
      allowChat: data.allowChat !== false,
      whiteboardEnabled: !!data.whiteboardEnabled,
    };
    await setDoc(doc(db, 'streams', id), newStream);
    return { success: true, stream: newStream };
  },

  async endStream(id: string): Promise<{ success: boolean; stream?: LiveStream }> {
    const sRef = doc(db, 'streams', id);
    await updateDoc(sRef, {
      isLive: false,
      endedAt: new Date().toISOString(),
    });
    const snap = await getDoc(sRef);
    return { success: true, stream: snap.data() as LiveStream };
  },

  async likeStream(id: string): Promise<{ success: boolean; likes: number }> {
    const sRef = doc(db, 'streams', id);
    const snap = await getDoc(sRef);
    if (!snap.exists()) throw new Error('直播不存在');
    const curLikes = (snap.data().likes || 0) + 1;
    await updateDoc(sRef, { likes: curLikes });
    return { success: true, likes: curLikes };
  },

  async deleteStream(id: string): Promise<{ success: boolean }> {
    await deleteDoc(doc(db, 'streams', id));
    // Also clean up messages of this stream
    const msgColl = collection(db, 'stream_messages');
    const snap = await getDocs(msgColl);
    const batchDeletes: Promise<void>[] = [];
    snap.forEach((d) => {
      const data = d.data() as LiveStreamMessage;
      if (data.streamId === id) {
        batchDeletes.push(deleteDoc(d.ref));
      }
    });
    await Promise.all(batchDeletes);
    return { success: true };
  },

  async getStreamMessages(streamId: string): Promise<LiveStreamMessage[]> {
    const msgColl = collection(db, 'stream_messages');
    const snap = await getDocs(msgColl);
    const list: LiveStreamMessage[] = [];
    snap.forEach((d) => {
      const data = d.data() as LiveStreamMessage;
      if (data.streamId === streamId) list.push(data);
    });
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  },

  async sendStreamMessage(
    streamId: string,
    data: {
      username: string;
      nickname: string;
      role: 'student' | 'admin' | 'tutor';
      content: string;
      isQuestion?: boolean;
    }
  ): Promise<{ success: boolean; message: LiveStreamMessage }> {
    const id = 'smsg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newMsg: LiveStreamMessage = {
      id,
      streamId,
      username: data.username,
      nickname: data.nickname || data.username,
      role: data.role || 'student',
      content: data.content,
      isQuestion: !!data.isQuestion,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'stream_messages', id), newMsg);
    return { success: true, message: newMsg };
  },

  async deleteStreamMessage(streamId: string, messageId: string): Promise<{ success: boolean }> {
    await deleteDoc(doc(db, 'stream_messages', messageId));
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // Real-time Firestore Subscriptions (跨平台雙向即時同步)
  // ---------------------------------------------------------------------------

  subscribeLiveStreams(callback: (streams: LiveStream[]) => void): () => void {
    const sColl = collection(db, 'streams');
    return onSnapshot(
      sColl,
      (snap) => {
        const list: LiveStream[] = [];
        snap.forEach((d) => list.push(d.data() as LiveStream));
        list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        callback(list);
      },
      (err) => console.warn('LiveStreams snapshot error:', err)
    );
  },

  subscribeLiveStreamMessages(streamId: string, callback: (msgs: LiveStreamMessage[]) => void): () => void {
    const msgColl = collection(db, 'stream_messages');
    return onSnapshot(
      msgColl,
      (snap) => {
        const list: LiveStreamMessage[] = [];
        snap.forEach((d) => {
          const data = d.data() as LiveStreamMessage;
          if (data.streamId === streamId) list.push(data);
        });
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        callback(list);
      },
      (err) => console.warn('StreamMessages snapshot error:', err)
    );
  },

  subscribeFaqMessages(callback: (msgs: FaqMessage[]) => void): () => void {
    const faqColl = collection(db, 'faq_messages');
    return onSnapshot(
      faqColl,
      (snap) => {
        const list: FaqMessage[] = [];
        snap.forEach((d) => list.push(d.data() as FaqMessage));
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        callback(list);
      },
      (err) => console.warn('FaqMessages snapshot error:', err)
    );
  },

  subscribeAnnouncements(callback: (anns: Announcement[]) => void): () => void {
    const annColl = collection(db, 'announcements');
    return onSnapshot(
      annColl,
      (snap) => {
        const list: Announcement[] = [];
        snap.forEach((d) => list.push(d.data() as Announcement));
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        callback(list);
      },
      (err) => console.warn('Announcements snapshot error:', err)
    );
  },

  subscribeAdminUsers(callback: (users: AdminUserRecord[]) => void): () => void {
    const usersColl = collection(db, 'users');
    return onSnapshot(
      usersColl,
      (snap) => {
        const list: AdminUserRecord[] = [];
        snap.forEach((d) => list.push(d.data() as AdminUserRecord));
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        callback(list);
      },
      (err) => console.warn('AdminUsers snapshot error:', err)
    );
  },

  subscribeSiteConfig(callback: (cfg: SiteConfig) => void): () => void {
    const configRef = doc(db, 'site_config', 'general');
    return onSnapshot(
      configRef,
      (snap) => {
        if (snap.exists()) {
          callback({ ...DEFAULT_SITE_CONFIG, ...snap.data() });
        }
      },
      (err) => console.warn('SiteConfig snapshot error:', err)
    );
  },
};
