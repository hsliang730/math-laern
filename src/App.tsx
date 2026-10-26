import React, { useState, useEffect, useRef } from 'react';
import {
  api,
  User,
  AdminUserRecord,
  SiteConfig,
  Announcement,
  HandoutItem,
  ForumMessage,
  GradeItem,
  FaqMessage,
  LiveStream,
  LiveStreamMessage,
} from './api.ts';

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

const SUBJECT_LIST = ['不分科', '數學', '物理', '化學', '國文', '英文', '綜合'] as const;

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Toast Notification state (replaces window.alert for 100% iframe compatibility)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'info',
  });
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3200);
  };

  // Custom In-App Confirm Dialog state (replaces window.confirm for 100% iframe compatibility)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const requestConfirm = (opts: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }) => {
    setConfirmDialog({
      open: true,
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || '確定',
      cancelText: opts.cancelText || '取消',
      isDestructive: opts.isDestructive !== false,
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        opts.onConfirm();
      },
    });
  };

  // Auth & View state
  const [currentView, setCurrentView] = useState<'auth' | 'admin-dash' | 'user-dash' | 'user-panel'>('auth');
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [showForceChangePw, setShowForceChangePw] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [impersonatingUser, setImpersonatingUser] = useState<string | null>(() => {
    return sessionStorage.getItem('impersonating_user');
  });

  // Inputs - NO PLACEHOLDERS
  const [usernameInput, setUsernameInput] = useState<string>(() => localStorage.getItem('remember_username') || '');
  const [passwordInput, setPasswordInput] = useState<string>(() => localStorage.getItem('remember_password') || '');
  const [rememberMe, setRememberMe] = useState<boolean>(() => !!localStorage.getItem('remember_username'));
  const [authErrorMsg, setAuthErrorMsg] = useState<string>('');

  // Eye character state
  const [isShy, setIsShy] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [authCardAnimate, setAuthCardAnimate] = useState<'' | 'success-animate' | 'error-animate'>('');
  const pupilLeftRef = useRef<HTMLDivElement>(null);
  const pupilRightRef = useRef<HTMLDivElement>(null);

  // Force Change Password Inputs - NO PLACEHOLDERS
  const [newPwInput, setNewPwInput] = useState<string>('');
  const [confirmPwInput, setConfirmPwInput] = useState<string>('');
  const [forcePwMsg, setForcePwMsg] = useState<string>('');

  // Site Config
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    site_title: '我的網站 - 會員系統',
    login_title: '歡迎來到<br><span class="font-normal text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">會員整合系統</span>',
    login_desc: '請在右側輸入您的帳號密碼。當您專注輸入時，系統角色將與您互動；登入成功後更將解鎖完整面板與講義資源。',
    welcome_hero_title: '歡迎來到您的專屬空間',
    version_tag: 'v.0.0.1 Beta 3',
    status_tag: '目前網站開站中',
    marquee_text: '歡迎來到網站！目前系統功能全面運作中，講義與成績系統已連線。',
    line_id: '@682knyxn',
    line_url: 'https://line.me',
    line_desc: '獲得即時一對一解答與講義更新通知！',
    help_text: '【系統幫助與操作指引】\n\n1. 登入與註冊：輸入使用者帳號與密碼即可登入。初次使用預設密碼時需依照安全規則變更密碼。\n2. 講義閱讀：點選講義資料夾可展開瀏覽並預覽 PDF，支援科目篩選、連續滾動與放大下載。\n3. 成績登記：填寫考試科目、範圍與分數，即可自動計入個人學習歷程。\n4. 問題發問：發問時可選擇指定科目，當科小老師與管理員皆可即時為您解答。',
    version_intro_text: '【我的網站 - 全功能簡介與版本說明】\n\n🔹 1. 安全身分驗證與個人化\n   - 支援深色與亮色模式。\n   - 靈動幾何角色與互動眼球。\n   - 支援生物辨識登入。\n\n🔹 2. 小老師與科目分科制度\n   - 管理員可指派各學科小老師 (數學、物理、化學、英文、國文)。\n   - 小老師可上傳與發布當科講義。\n   - 發問聊天支援科目標籤，當科小老師與管理員均可直接在 LINE 模式中回覆。\n\n🔹 3. 伺服器修復模式\n   - 管理員可一鍵開啟伺服器修復維護，關閉一般功能保護資料。\n\n🔹 4. 即時在線監控\n   - 管理員可即時查看成員上線狀態 (🟢 在線 / ⚪ 離線)。',
    maintenance_mode: false,
    maintenance_message: '⚠️ 系統目前正在進行伺服器維護與升級修復，暫時關閉所有功能，請稍候再試。',
    countdown_enabled: true,
    countdown_title: '116年 國中教育會考倒數',
    countdown_target_date: '2027-05-15T08:00',
    countdown_slogan: '全力以赴，金榜題名！每一步努力都在成就更好的自己',
    footer_text: 'My Website System',
  });

  // 會考倒數計時狀態
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPassed: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: false });

  // Tabs
  const [activeTab, setActiveTab] = useState<'home' | 'live' | 'grades' | 'settings' | 'faq' | 'help' | 'version'>('home');
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);

  // Live Streaming state
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [activeStream, setActiveStream] = useState<LiveStream | null>(null);
  const [streamMessages, setStreamMessages] = useState<LiveStreamMessage[]>([]);
  const [streamChatInput, setStreamChatInput] = useState<string>('');
  const [streamIsQuestion, setStreamIsQuestion] = useState<boolean>(false);
  const [streamFilterSubject, setStreamFilterSubject] = useState<string>('全部');
  const [createStreamModalOpen, setCreateStreamModalOpen] = useState<boolean>(false);
  const [newStreamTitle, setNewStreamTitle] = useState<string>('');
  const [newStreamSubject, setNewStreamSubject] = useState<string>('不分科');
  const [newStreamType, setNewStreamType] = useState<'builtin' | 'youtube'>('builtin');
  const [newStreamYoutubeUrl, setNewStreamYoutubeUrl] = useState<string>('');
  const [newStreamCustomUrl, setNewStreamCustomUrl] = useState<string>('');
  const [newStreamAllowChat, setNewStreamAllowChat] = useState<boolean>(true);
  const [newStreamWhiteboard, setNewStreamWhiteboard] = useState<boolean>(true);

  // Broadcaster Media Controls & Whiteboard
  const [broadcasterMediaStream, setBroadcasterMediaStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [whiteboardActive, setWhiteboardActive] = useState<boolean>(false);
  const [whiteboardColor, setWhiteboardColor] = useState<string>('#ef4444');
  const [whiteboardBrushSize, setWhiteboardBrushSize] = useState<number>(3);
  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: number; emoji: string; x: number }>>([]);
  const broadcasterVideoRef = useRef<HTMLVideoElement | null>(null);
  const whiteboardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const streamChatBoxRef = useRef<HTMLDivElement | null>(null);

  // Subject filtering
  const [selectedSubject, setSelectedSubject] = useState<string>('全部');

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announceInput, setAnnounceInput] = useState<string>('');

  // Handouts & Folders
  const [handouts, setHandouts] = useState<HandoutItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: '根目錄' },
  ]);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [handoutTitleInput, setHandoutTitleInput] = useState<string>('');
  const [handoutSubjectInput, setHandoutSubjectInput] = useState<string>('數學');
  const handoutFileInputRef = useRef<HTMLInputElement>(null);

  // Forum
  const [forumMessages, setForumMessages] = useState<ForumMessage[]>([]);
  const [forumInput, setForumInput] = useState<string>('');
  const [forumSubjectInput, setForumSubjectInput] = useState<string>('數學');
  const forumListRef = useRef<HTMLDivElement>(null);

  // Grades
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [gradeSubject, setGradeSubject] = useState<string>('數學');
  const [gradeRange, setGradeRange] = useState<string>('');
  const [gradeScore, setGradeScore] = useState<string>('');

  // FAQ
  const [allFaqMessages, setAllFaqMessages] = useState<FaqMessage[]>([]);
  const [userFaqInput, setUserFaqInput] = useState<string>('');
  const [userFaqSubject, setUserFaqSubject] = useState<string>('數學');
  const userFaqBoxRef = useRef<HTMLDivElement>(null);

  // Admin Features: Users List
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [selectedAdminChatUser, setSelectedAdminChatUser] = useState<string | null>(null);
  const [adminReplyInput, setAdminReplyInput] = useState<string>('');
  const [adminMobileChatOpen, setAdminMobileChatOpen] = useState<boolean>(false);

  // Admin: Visible Password Toggle Set
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [allPasswordsVisible, setAllPasswordsVisible] = useState<boolean>(false);

  // Admin: Change User Password Modal
  const [editPwUser, setEditPwUser] = useState<AdminUserRecord | null>(null);
  const [adminNewUserPw, setAdminNewUserPw] = useState<string>('');

  // Admin: Add User Inputs
  const [newAdminUsername, setNewAdminUsername] = useState<string>('');
  const [newAdminPassword, setNewAdminPassword] = useState<string>('00000000');
  const [newAdminNickname, setNewAdminNickname] = useState<string>('');
  const [newAdminMustChangePw, setNewAdminMustChangePw] = useState<boolean>(true);
  const [newAdminIsTutor, setNewAdminIsTutor] = useState<boolean>(false);
  const [newAdminTutorSubject, setNewAdminTutorSubject] = useState<string>('數學');
  const [adminAddUserMsg, setAdminAddUserMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Tutor Appointment Modal
  const [tutorModalUser, setTutorModalUser] = useState<AdminUserRecord | null>(null);
  const [tutorSelectedSubjects, setTutorSelectedSubjects] = useState<string[]>([]);

  // Settings inputs - NO PLACEHOLDERS
  const [settingNickname, setSettingNickname] = useState<string>('');
  const [settingNewPw, setSettingNewPw] = useState<string>('');
  const [bioSetupMsg, setBioSetupMsg] = useState<string>('');

  // Editable Texts Form State (All functional texts editable in settings)
  const [editableTexts, setEditableTexts] = useState<Record<string, string>>({});

  // PDF & File Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewIsImage, setPreviewIsImage] = useState<boolean>(false);
  const [previewPdfDoc, setPreviewPdfDoc] = useState<any>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Active user logic
  const activeUserName = impersonatingUser || currentUser?.username || '訪客';
  const isAdmin = currentUser?.username === 'hsliang-admin' || (!impersonatingUser && currentUser?.isAdmin);
  const isTutor = !!currentUser?.isTutor;
  const userTutorSubjects = currentUser?.tutorSubjects || [];

  // Dark mode effect
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Load initial site config & users
  useEffect(() => {
    loadSiteConfig();
    loadAdminUsers();
  }, []);

  // Update browser title
  useEffect(() => {
    if (siteConfig.site_title) {
      document.title = siteConfig.site_title;
    }
  }, [siteConfig.site_title]);

  // Heartbeat loop (every 15s) for real-time online status
  useEffect(() => {
    if (!currentUser?.username) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.heartbeat(currentUser.username);
        if (res.maintenance_mode !== siteConfig.maintenance_mode) {
          setSiteConfig((prev) => ({ ...prev, maintenance_mode: res.maintenance_mode }));
        }
      } catch (err) {
        // quiet ignore
      }
    }, 15000);
    api.heartbeat(currentUser.username).catch(() => {});
    return () => clearInterval(interval);
  }, [currentUser?.username]);

  // 會考倒數計時即時計算 (每秒更新)
  useEffect(() => {
    function updateCountdown() {
      const targetStr = siteConfig.countdown_target_date || '2027-05-15T08:00';
      const target = new Date(targetStr).getTime();
      const now = Date.now();
      const diff = target - now;

      if (isNaN(diff) || diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setCountdown({ days, hours, minutes, seconds, isPassed: false });
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [siteConfig.countdown_target_date]);

  // Hash listener for independent room URL (#live-room-<id>)
  useEffect(() => {
    loadStreams();
    const handleHash = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#live-room-')) {
        const streamId = hash.replace('#live-room-', '');
        try {
          const list = await api.getStreams();
          setStreams(list);
          const found = list.find((s) => s.id === streamId);
          if (found) {
            setActiveStream(found);
            setActiveTab('live');
            if (currentView === 'auth') {
              setCurrentView('user-panel');
            }
          }
        } catch (e) {
          console.warn('Hash live room error:', e);
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Real-time stream messages when viewing an active stream
  useEffect(() => {
    if (activeStream?.id) {
      loadStreamMessages(activeStream.id);
      const unsubscribe = api.subscribeLiveStreamMessages(activeStream.id, (msgs) => {
        setStreamMessages(msgs);
        setTimeout(() => {
          if (streamChatBoxRef.current) {
            streamChatBoxRef.current.scrollTop = streamChatBoxRef.current.scrollHeight;
          }
        }, 50);
      });
      return () => unsubscribe();
    }
  }, [activeStream?.id]);

  // Real-time bidirectional sync across Gemini Studio and Netlify
  useEffect(() => {
    const unsubStreams = api.subscribeLiveStreams((list) => {
      setStreams(list);
      if (activeStream) {
        const refreshed = list.find((s) => s.id === activeStream.id);
        if (refreshed) setActiveStream(refreshed);
      }
    });

    const unsubUsers = api.subscribeAdminUsers((list) => {
      setAdminUsers(list);
    });

    const unsubAnn = api.subscribeAnnouncements((list) => {
      setAnnouncements(list);
    });

    const unsubFaq = api.subscribeFaqMessages((list) => {
      setAllFaqMessages(list);
    });

    const unsubConfig = api.subscribeSiteConfig((cfg) => {
      setSiteConfig((prev) => ({ ...prev, ...cfg }));
    });

    return () => {
      unsubStreams();
      unsubUsers();
      unsubAnn();
      unsubFaq();
      unsubConfig();
    };
  }, [activeStream?.id]);

  async function loadSiteConfig() {
    try {
      const cfg = await api.getSiteConfig();
      setSiteConfig((prev) => {
        const merged = { ...prev, ...cfg };
        setEditableTexts({
          site_title: merged.site_title || '我的網站 - 會員系統',
          login_title: merged.login_title || '',
          login_desc: merged.login_desc || '',
          welcome_hero_title: merged.welcome_hero_title || '歡迎來到您的專屬空間',
          marquee_text: merged.marquee_text || '',
          version_tag: merged.version_tag || 'v.0.0.1 Beta 3',
          status_tag: merged.status_tag || '目前網站開站中',
          countdown_enabled: merged.countdown_enabled !== false ? 'true' : 'false',
          countdown_title: merged.countdown_title || '116年 國中教育會考倒數',
          countdown_target_date: merged.countdown_target_date || '2027-05-15T08:00',
          countdown_slogan: merged.countdown_slogan || '全力以赴，金榜題名！每一步努力都在成就更好的自己',
          line_id: merged.line_id || '@682knyxn',
          line_url: merged.line_url || 'https://line.me',
          line_desc: merged.line_desc || '獲得即時一對一解答與講義更新通知！',
          maintenance_message: merged.maintenance_message || '',
          help_text: merged.help_text || '',
          version_intro_text: merged.version_intro_text || '',
          footer_text: merged.footer_text || 'My Website System',
        });
        return merged;
      });
    } catch (err) {
      console.error('Failed to load site config:', err);
    }
  }

  // Session timer
  useEffect(() => {
    let interval: any = null;
    if (currentView === 'user-panel') {
      interval = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSessionSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentView]);

  // Mouse move eye pupil tracker
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const pupils = [pupilLeftRef.current, pupilRightRef.current];
      pupils.forEach((pupil) => {
        if (!pupil || !pupil.parentElement) return;
        const rect = pupil.parentElement.getBoundingClientRect();
        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - eyeCenterY, e.clientX - eyeCenterX);
        const distance = Math.min(3, Math.hypot(e.clientX - eyeCenterX, e.clientY - eyeCenterY) / 10);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        pupil.style.transform = `translate(${x}px, ${y}px)`;
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Refresh Login Panel
  const refreshLoginPanel = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setUsernameInput('');
      setPasswordInput('');
      setRememberMe(false);
      setAuthErrorMsg('');
      setIsRefreshing(false);
      showToast('已清除輸入欄位', 'info');
    }, 400);
  };

  // Password strength checker helper
  function evaluatePasswordStrength(password: string) {
    if (!password) return { score: 0, text: '尚未輸入', color: 'bg-gray-200', valid: false };
    if (password.length < 8) return { score: 20, text: '太短（至少需要 8 碼）', color: 'bg-red-500', valid: false };

    const sequential = /(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|qwert|asdfg|zxcvb)/i;
    const repeated = /(.)\1{3,}/;

    if (sequential.test(password)) return { score: 30, text: '包含連續字元，不安全', color: 'bg-red-500', valid: false };
    if (repeated.test(password)) return { score: 30, text: '包含重複字元，不安全', color: 'bg-red-500', valid: false };

    let score = 40;
    if (/[a-z]/.test(password)) score += 20;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 10;
    if (/[^A-Za-z0-9]/.test(password)) score += 10;

    if (score < 70) return { score: 50, text: '強度不足（請混合大小寫英文與數字）', color: 'bg-orange-500', valid: false };
    if (score < 90) return { score: 80, text: '強度良好', color: 'bg-blue-500', valid: true };
    return { score: 100, text: '強度極佳', color: 'bg-green-500', valid: true };
  }

  // Handle Login & Register
  async function handleAuth() {
    setAuthErrorMsg('');
    const userInput = usernameInput.trim();
    const passInput = passwordInput;

    if (!userInput || !passInput) {
      setAuthErrorMsg('請填寫帳號與密碼');
      setAuthCardAnimate('error-animate');
      setTimeout(() => setAuthCardAnimate(''), 400);
      return;
    }

    if (rememberMe) {
      localStorage.setItem('remember_username', userInput);
      localStorage.setItem('remember_password', passInput);
    } else {
      localStorage.removeItem('remember_username');
      localStorage.removeItem('remember_password');
    }

    if (isSignUp) {
      try {
        await api.register(userInput, passInput);
        setAuthCardAnimate('success-animate');
        setTimeout(() => {
          setAuthCardAnimate('');
          showToast('註冊成功！請直接登入', 'success');
          setIsSignUp(false);
        }, 500);
      } catch (err: any) {
        setAuthErrorMsg(err.message || '註冊失敗');
        setAuthCardAnimate('error-animate');
        setTimeout(() => setAuthCardAnimate(''), 400);
      }
    } else {
      try {
        const res = await api.login(userInput, passInput);
        const user = res.user;

        if (user.must_change_password) {
          setCurrentUser(user);
          setAuthCardAnimate('success-animate');
          setTimeout(() => {
            setAuthCardAnimate('');
            setShowForceChangePw(true);
            showToast('初次登入請先修改預設密碼', 'info');
          }, 500);
          return;
        }

        setCurrentUser(user);
        setAuthCardAnimate('success-animate');
        setTimeout(() => {
          setAuthCardAnimate('');
          showToast(`歡迎回來，${user.nickname || user.username}！`, 'success');
          if (user.isAdmin || user.username === 'hsliang-admin') {
            setCurrentView('admin-dash');
            loadAdminUsers();
          } else {
            setCurrentView('user-dash');
          }
        }, 500);
      } catch (err: any) {
        setAuthErrorMsg(err.message || '登入失敗：帳號或密碼錯誤');
        setAuthCardAnimate('error-animate');
        setTimeout(() => setAuthCardAnimate(''), 400);
      }
    }
  }

  // Handle Force Change Password
  async function handleForceChangePassword() {
    setForcePwMsg('');
    if (!newPwInput || !confirmPwInput) {
      setForcePwMsg('請輸入新密碼');
      return;
    }
    if (newPwInput !== confirmPwInput) {
      setForcePwMsg('兩次輸入的密碼不一致');
      return;
    }
    const strength = evaluatePasswordStrength(newPwInput);
    if (!strength.valid) {
      setForcePwMsg('密碼強度不足：' + strength.text);
      return;
    }

    try {
      const res = await api.forceChangePassword(currentUser?.username || usernameInput, newPwInput);
      setCurrentUser(res.user);
      setShowForceChangePw(false);
      showToast('密碼修改成功！歡迎進入系統。', 'success');
      if (res.user.isAdmin || res.user.username === 'hsliang-admin') {
        setCurrentView('admin-dash');
        loadAdminUsers();
      } else {
        setCurrentView('user-dash');
      }
    } catch (err: any) {
      setForcePwMsg(err.message || '修改失敗');
    }
  }

  // Biometric Login
  function handleBiometricLogin() {
    const userInput = usernameInput.trim();
    if (!userInput) {
      setAuthErrorMsg('請先輸入您的帳號名稱');
      setAuthCardAnimate('error-animate');
      setTimeout(() => setAuthCardAnimate(''), 400);
      return;
    }
    const isBio = localStorage.getItem(`bio_enabled_${userInput}`);
    if (isBio === 'true') {
      setAuthCardAnimate('success-animate');
      setTimeout(async () => {
        setAuthCardAnimate('');
        try {
          const userRecs = await api.getAdminUsers();
          const target = userRecs.find((u) => u.username.toLowerCase() === userInput.toLowerCase());
          const loggedUser: User = {
            username: userInput,
            nickname: target?.nickname || '',
            isAdmin: target?.isAdmin || userInput === 'hsliang-admin',
            isTutor: target?.isTutor,
            tutorSubjects: target?.tutorSubjects,
          };
          setCurrentUser(loggedUser);
          showToast(`生物辨識驗證成功！`, 'success');
          if (loggedUser.isAdmin) {
            setCurrentView('admin-dash');
            loadAdminUsers();
          } else {
            setCurrentView('user-dash');
          }
        } catch (err) {
          const loggedUser: User = {
            username: userInput,
            nickname: '',
            isAdmin: userInput === 'hsliang-admin',
          };
          setCurrentUser(loggedUser);
          if (loggedUser.isAdmin) setCurrentView('admin-dash');
          else setCurrentView('user-dash');
        }
      }, 500);
    } else {
      setAuthErrorMsg('此帳號尚未在該裝置綁定生物辨識，請先以密碼登入後至設定綁定。');
      setAuthCardAnimate('error-animate');
      setTimeout(() => setAuthCardAnimate(''), 400);
    }
  }

  function registerBiometric() {
    if (!currentUser) return;
    try {
      localStorage.setItem(`bio_enabled_${currentUser.username}`, 'true');
      setBioSetupMsg('✅ 生物辨識已成功綁定本裝置！');
      showToast('生物辨識綁定成功！下次可直接快速登入。', 'success');
    } catch (err: any) {
      setBioSetupMsg('綁定失敗：' + err.message);
      showToast('綁定失敗：' + err.message, 'error');
    }
  }

  // Logout
  function logout() {
    setCurrentUser(null);
    sessionStorage.removeItem('impersonating_user');
    setImpersonatingUser(null);
    setCurrentView('auth');
    setShowForceChangePw(false);
    showToast('已安全登出', 'info');
  }

  // Load Admin Users
  async function loadAdminUsers() {
    try {
      const users = await api.getAdminUsers();
      setAdminUsers(users);
    } catch (err) {
      console.error('Failed to load admin users:', err);
    }
  }

  // Admin: Create User (加入使用者)
  async function handleAdminCreateUser() {
    setAdminAddUserMsg(null);
    if (!newAdminUsername.trim()) {
      setAdminAddUserMsg({ text: '請輸入學員帳號名稱', isError: true });
      return;
    }
    if (!newAdminPassword.trim()) {
      setAdminAddUserMsg({ text: '請輸入初始密碼', isError: true });
      return;
    }

    try {
      const res = await api.createUser({
        username: newAdminUsername.trim(),
        password: newAdminPassword.trim(),
        nickname: newAdminNickname.trim(),
        mustChangePassword: newAdminMustChangePw,
        isTutor: newAdminIsTutor,
        tutorSubjects: newAdminIsTutor ? [newAdminTutorSubject] : [],
      });

      setAdminAddUserMsg({ text: res.message, isError: false });
      showToast(res.message, 'success');
      setNewAdminUsername('');
      setNewAdminPassword('00000000');
      setNewAdminNickname('');
      setNewAdminMustChangePw(true);
      setNewAdminIsTutor(false);
      await loadAdminUsers();
    } catch (err: any) {
      setAdminAddUserMsg({ text: err.message || '建立使用者失敗', isError: true });
      showToast(err.message || '建立使用者失敗', 'error');
    }
  }

  // Admin: Toggle Password View
  const togglePasswordVisibility = (username: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [username]: !prev[username],
    }));
  };

  // Admin: Toggle All Passwords View
  const toggleAllPasswordsVisibility = () => {
    const nextState = !allPasswordsVisible;
    setAllPasswordsVisible(nextState);
    const updated: Record<string, boolean> = {};
    adminUsers.forEach((u) => {
      updated[u.username] = nextState;
    });
    setVisiblePasswords(updated);
    showToast(nextState ? '已顯示全體用戶密碼' : '已隱藏全體用戶密碼', 'info');
  };

  // Admin: Open Edit Password Modal
  const openEditPasswordModal = (u: AdminUserRecord) => {
    setEditPwUser(u);
    setAdminNewUserPw('');
  };

  // Admin: Submit New Password
  const handleSubmitAdminUserPassword = async () => {
    if (!editPwUser || !adminNewUserPw.trim()) {
      showToast('請輸入新密碼', 'error');
      return;
    }
    try {
      const res = await api.adminUpdatePassword(editPwUser.username, adminNewUserPw.trim());
      showToast(res.message || '密碼已修改！', 'success');
      setEditPwUser(null);
      setAdminNewUserPw('');
      await loadAdminUsers();
    } catch (err: any) {
      showToast(err.message || '修改密碼失敗', 'error');
    }
  };

  // Admin: Delete User
  const handleDeleteUser = (username: string) => {
    requestConfirm({
      title: '刪除學員帳號',
      message: `確定要永久刪除學員【${username}】的帳號與所有資料嗎？此操作不可逆。`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await api.adminDeleteUser(username);
          showToast(res.message || '已刪除使用者！', 'success');
          await loadAdminUsers();
        } catch (err: any) {
          showToast(err.message || '刪除失敗', 'error');
        }
      },
    });
  };

  // Admin: Open Tutor Assign Modal
  function openTutorAssignModal(u: AdminUserRecord) {
    setTutorModalUser(u);
    setTutorSelectedSubjects(u.tutorSubjects || []);
  }

  // Admin: Save Tutor Appointment
  async function handleSaveTutor() {
    if (!tutorModalUser) return;
    try {
      const isTut = tutorSelectedSubjects.length > 0;
      await api.setTutor(tutorModalUser.username, isTut, tutorSelectedSubjects);
      showToast(`已成功更新【${tutorModalUser.username}】的小老師身分與科目！`, 'success');
      setTutorModalUser(null);
      await loadAdminUsers();
    } catch (err: any) {
      showToast('更新小老師失敗：' + err.message, 'error');
    }
  }

  // Impersonate
  function impersonate(username: string) {
    sessionStorage.setItem('impersonating_user', username);
    setImpersonatingUser(username);
    showToast(`已切換至【模擬登入】模式，正以 ${username} 視角瀏覽`, 'info');
    goToUserPanel();
  }

  function exitImpersonation() {
    sessionStorage.removeItem('impersonating_user');
    setImpersonatingUser(null);
    showToast('已退出模擬登入模式，恢復管理員身分。', 'info');
    goToUserPanel();
  }

  async function toggleBan(username: string, currentBan: boolean) {
    const actionText = !currentBan ? 'Ban 封鎖' : '解封';
    requestConfirm({
      title: `${actionText}學員`,
      message: `確定要將學員【${username}】進行 ${actionText} 嗎？`,
      isDestructive: !currentBan,
      onConfirm: async () => {
        try {
          await api.toggleBan(username, !currentBan);
          showToast(`已成功將 ${username} ${actionText}！`, 'success');
          loadAdminUsers();
        } catch (err: any) {
          showToast('操作失敗：' + err.message, 'error');
        }
      },
    });
  }

  async function forcePasswordChange(username: string) {
    requestConfirm({
      title: '強制變更密碼',
      message: `確定要求學員【${username}】下次登入時強制變更密碼嗎？`,
      isDestructive: false,
      onConfirm: async () => {
        try {
          await api.forcePasswordChange(username, true);
          showToast(`已設定學員 ${username} 下次登入須改密碼！`, 'success');
          loadAdminUsers();
        } catch (err: any) {
          showToast('設定失敗：' + err.message, 'error');
        }
      },
    });
  }

  // Server Maintenance Mode Toggle
  async function handleToggleMaintenance() {
    const nextState = !siteConfig.maintenance_mode;
    const action = nextState ? '開啟伺服器修復模式（將關閉一般會員所有功能）' : '關閉伺服器修復模式（恢復全站功能）';
    requestConfirm({
      title: '伺服器修復功能設定',
      message: `確定要${action}嗎？`,
      isDestructive: nextState,
      onConfirm: async () => {
        try {
          const res = await api.setMaintenance(nextState);
          setSiteConfig((prev) => ({ ...prev, maintenance_mode: res.maintenance_mode }));
          showToast(
            nextState ? '已開啟伺服器修復模式！一般會員功能已全部關閉。' : '伺服器修復完成！全站功能已恢復正常。',
            nextState ? 'info' : 'success'
          );
        } catch (err: any) {
          showToast('操作失敗：' + err.message, 'error');
        }
      },
    });
  }

  // Go to full user panel
  function goToUserPanel() {
    setCurrentView('user-panel');
    switchTab('home');
  }

  // Switch tab
  function switchTab(tab: 'home' | 'live' | 'grades' | 'settings' | 'faq' | 'help' | 'version') {
    setActiveTab(tab);
    if (tab === 'home') {
      loadAnnouncements();
      loadHandouts(currentFolderId, selectedSubject);
      loadForum(selectedSubject);
      loadStreams();
    } else if (tab === 'live') {
      loadStreams();
    } else if (tab === 'grades') {
      loadGrades();
    } else if (tab === 'settings') {
      loadAdminUsers();
    } else if (tab === 'faq') {
      loadFaqChat();
      if (isAdmin || isTutor) loadAdminUsers();
    }
  }

  // --- Live Stream Logic ---
  async function loadStreams() {
    try {
      const list = await api.getStreams();
      setStreams(list);
      if (activeStream) {
        const refreshed = list.find((s) => s.id === activeStream.id);
        if (refreshed) setActiveStream(refreshed);
      }
    } catch (err) {
      console.error('Failed to load streams:', err);
    }
  }

  function extractYouTubeId(url: string): string {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes('?')) return trimmed;
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/);
    return match ? match[1] : trimmed;
  }

  function getStreamStandaloneUrl(streamId: string): string {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}#live-room-${streamId}`;
  }

  function handleCopyStreamUrl(streamId: string) {
    const url = getStreamStandaloneUrl(streamId);
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          showToast('已複製獨立觀看網址！您可以直接分享給同學觀看。', 'success');
        })
        .catch(() => {
          showToast(url, 'info');
        });
    } else {
      showToast(url, 'info');
    }
  }

  async function startBroadcastingCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      setBroadcasterMediaStream(mediaStream);
      setIsScreenSharing(false);
      setIsVideoOff(false);
      setIsMicMuted(false);
      if (broadcasterVideoRef.current) {
        broadcasterVideoRef.current.srcObject = mediaStream;
        broadcasterVideoRef.current.play().catch(() => {});
      }
      showToast('攝影機與麥克風已啟動！', 'success');
    } catch (err: any) {
      console.warn('Camera access:', err);
      showToast('無法啟用攝影機（請檢查瀏覽器授權或使用白板模式）：' + (err.message || ''), 'error');
    }
  }

  async function startBroadcastingScreenShare() {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      setBroadcasterMediaStream(mediaStream);
      setIsScreenSharing(true);
      setIsVideoOff(false);
      if (broadcasterVideoRef.current) {
        broadcasterVideoRef.current.srcObject = mediaStream;
        broadcasterVideoRef.current.play().catch(() => {});
      }
      mediaStream.getVideoTracks()[0].onended = () => {
        stopBroadcastingMedia();
      };
      showToast('已切換為螢幕桌面分享！', 'success');
    } catch (err: any) {
      console.warn('Screen share:', err);
      showToast('取消或無法啟動螢幕分享：' + (err.message || ''), 'info');
    }
  }

  function toggleMic() {
    if (broadcasterMediaStream) {
      const audioTracks = broadcasterMediaStream.getAudioTracks();
      const nextState = !isMicMuted;
      audioTracks.forEach((track) => (track.enabled = !nextState));
      setIsMicMuted(nextState);
      showToast(nextState ? '麥克風已靜音' : '麥克風已開啟', 'info');
    }
  }

  function toggleVideo() {
    if (broadcasterMediaStream) {
      const videoTracks = broadcasterMediaStream.getVideoTracks();
      const nextState = !isVideoOff;
      videoTracks.forEach((track) => (track.enabled = !nextState));
      setIsVideoOff(nextState);
      showToast(nextState ? '鏡頭已關閉' : '鏡頭已開啟', 'info');
    }
  }

  function stopBroadcastingMedia() {
    if (broadcasterMediaStream) {
      broadcasterMediaStream.getTracks().forEach((track) => track.stop());
      setBroadcasterMediaStream(null);
    }
    setIsScreenSharing(false);
  }

  async function loadStreamMessages(streamId: string) {
    try {
      const msgs = await api.getStreamMessages(streamId);
      setStreamMessages(msgs);
    } catch (err) {
      console.error('Failed to load stream messages:', err);
    }
  }

  async function handleSendStreamMessage() {
    if (!activeStream) return;
    if (!streamChatInput.trim()) return;

    const role: 'student' | 'admin' | 'tutor' = isAdmin
      ? 'admin'
      : isTutor
      ? 'tutor'
      : 'student';

    try {
      const res = await api.sendStreamMessage(activeStream.id, {
        username: activeUserName,
        nickname: currentUser?.nickname || activeUserName,
        role,
        content: streamChatInput.trim(),
        isQuestion: streamIsQuestion,
      });
      setStreamChatInput('');
      setStreamMessages((prev) => [...prev, res.message]);
      setTimeout(() => {
        if (streamChatBoxRef.current) {
          streamChatBoxRef.current.scrollTop = streamChatBoxRef.current.scrollHeight;
        }
      }, 100);
    } catch (err: any) {
      showToast('發送留言失敗：' + err.message, 'error');
    }
  }

  async function handleDeleteStreamMessage(streamId: string, msgId: string) {
    try {
      await api.deleteStreamMessage(streamId, msgId);
      setStreamMessages((prev) => prev.filter((m) => m.id !== msgId));
      showToast('已刪除該則留言', 'info');
    } catch (err: any) {
      showToast('刪除失敗：' + err.message, 'error');
    }
  }

  async function handleLikeStream(streamId: string) {
    try {
      const res = await api.likeStream(streamId);
      setStreams((prev) =>
        prev.map((s) => (s.id === streamId ? { ...s, likes: res.likes } : s))
      );
      if (activeStream && activeStream.id === streamId) {
        setActiveStream((prev) => (prev ? { ...prev, likes: res.likes } : null));
      }
      const emojis = ['❤️', '🔥', '👏', '🌟', '💯', '✨'];
      const newHeart = {
        id: Date.now() + Math.random(),
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        x: 30 + Math.random() * 40,
      };
      setFloatingHearts((prev) => [...prev, newHeart]);
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
      }, 1800);
    } catch (err: any) {
      console.error('Like error:', err);
    }
  }

  async function handleCreateStream() {
    if (!newStreamTitle.trim()) {
      return showToast('請填寫直播課堂標題', 'error');
    }
    if (newStreamType === 'youtube' && !newStreamYoutubeUrl.trim()) {
      return showToast('請填寫 YouTube 影片連結或直播代碼', 'error');
    }

    const role: 'student' | 'admin' | 'tutor' = isAdmin ? 'admin' : 'tutor';
    const tutorSubj = isTutor ? userTutorSubjects[0] || '學科' : '';

    try {
      const res = await api.createStream({
        title: newStreamTitle.trim(),
        subject: newStreamSubject || '不分科',
        streamType: newStreamType,
        youtubeUrl: newStreamYoutubeUrl.trim(),
        streamUrl: newStreamCustomUrl.trim(),
        broadcaster: activeUserName,
        broadcasterNickname: currentUser?.nickname || activeUserName,
        broadcasterRole: role,
        tutorSubject: tutorSubj,
        allowChat: newStreamAllowChat,
        whiteboardEnabled: newStreamWhiteboard,
      });

      setCreateStreamModalOpen(false);
      setNewStreamTitle('');
      setNewStreamYoutubeUrl('');
      setNewStreamCustomUrl('');
      showToast('🎉 直播課堂已成功開播！', 'success');
      await loadStreams();
      setActiveStream(res.stream);
      window.location.hash = `#live-room-${res.stream.id}`;
      if (res.stream.streamType === 'builtin') {
        startBroadcastingCamera();
      }
    } catch (err: any) {
      showToast('開啟直播失敗：' + err.message, 'error');
    }
  }

  async function handleEndStream(streamId: string) {
    requestConfirm({
      title: '結束直播',
      message: '確定要結束目前的直播課堂嗎？結束後學員將看到課堂回放狀態。',
      onConfirm: async () => {
        try {
          const res = await api.endStream(streamId);
          stopBroadcastingMedia();
          showToast('直播已順利結束！感謝開播。', 'info');
          await loadStreams();
          if (activeStream?.id === streamId) {
            setActiveStream(res.stream || null);
          }
        } catch (err: any) {
          showToast('結束直播失敗：' + err.message, 'error');
        }
      },
    });
  }

  async function handleDeleteStream(streamId: string) {
    requestConfirm({
      title: '刪除直播記錄',
      message: '確定要刪除此直播紀錄嗎？所有留言與統計將一併移除。',
      onConfirm: async () => {
        try {
          await api.deleteStream(streamId);
          if (activeStream?.id === streamId) {
            stopBroadcastingMedia();
            setActiveStream(null);
            window.location.hash = '';
          }
          await loadStreams();
          showToast('直播記錄已刪除', 'success');
        } catch (err: any) {
          showToast('刪除失敗：' + err.message, 'error');
        }
      },
    });
  }

  function initWhiteboardCanvas() {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width && rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }

  function handleCanvasMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = whiteboardColor;
    ctx.lineWidth = whiteboardBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    isDrawingRef.current = true;
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function handleCanvasMouseUp() {
    isDrawingRef.current = false;
  }

  function clearWhiteboard() {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // --- Tab: Home logic ---
  async function loadAnnouncements() {
    try {
      const data = await api.getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handlePostAnnouncement() {
    if (!announceInput.trim()) return showToast('請輸入公告內容', 'error');
    try {
      await api.postAnnouncement(announceInput.trim(), activeUserName);
      setAnnounceInput('');
      loadAnnouncements();
      showToast('公告發布成功！', 'success');
    } catch (err: any) {
      showToast('發布失敗：' + err.message, 'error');
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    requestConfirm({
      title: '刪除公告',
      message: '確定要刪除這條公告訊息嗎？',
      onConfirm: async () => {
        try {
          await api.deleteAnnouncement(id);
          setAnnouncements((prev) => prev.filter((a) => a.id !== id));
          showToast('公告已刪除！', 'success');
        } catch (err: any) {
          showToast('刪除失敗：' + err.message, 'error');
        }
      },
    });
  }

  // Handouts & Folders
  async function loadHandouts(parentId: string | null, subject?: string) {
    try {
      const data = await api.getHandouts(parentId, subject);
      setHandouts(data);
    } catch (err) {
      console.error(err);
    }
  }

  function enterSubFolder(id: string, name: string) {
    setCurrentFolderId(id);
    setFolderBreadcrumbs((prev) => [...prev, { id, name }]);
    loadHandouts(id, selectedSubject);
  }

  function navigateParentFolder() {
    if (folderBreadcrumbs.length > 1) {
      const updated = [...folderBreadcrumbs];
      updated.pop();
      const parent = updated[updated.length - 1];
      setCurrentFolderId(parent.id);
      setFolderBreadcrumbs(updated);
      loadHandouts(parent.id, selectedSubject);
    }
  }

  async function handleCreateNewFolder() {
    if (!newFolderName.trim()) return showToast('請輸入資料夾名稱', 'error');
    try {
      await api.createFolder(newFolderName.trim(), currentFolderId, handoutSubjectInput, activeUserName);
      setNewFolderName('');
      showToast('資料夾建立成功！', 'success');
      loadHandouts(currentFolderId, selectedSubject);
    } catch (err: any) {
      showToast('建立資料夾失敗：' + err.message, 'error');
    }
  }

  async function handleUploadHandoutRealFile() {
    const file = handoutFileInputRef.current?.files?.[0];
    const title = handoutTitleInput.trim() || file?.name || '';
    if (!file) return showToast('請選擇檔案', 'error');

    if (file.size > 20 * 1024 * 1024) {
      return showToast('⚠️ 檔案容量過大！檔案上限為 20MB。', 'error');
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = e.target?.result as string;
        await api.uploadFile({
          title,
          fileName: file.name,
          fileData,
          parent_id: currentFolderId,
          subject: handoutSubjectInput,
          created_by: activeUserName,
        });
        setHandoutTitleInput('');
        if (handoutFileInputRef.current) handoutFileInputRef.current.value = '';
        showToast('講義檔案上傳成功！', 'success');
        loadHandouts(currentFolderId, selectedSubject);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast('上傳失敗：' + err.message, 'error');
    }
  }

  async function handleDeleteHandout(id: string) {
    requestConfirm({
      title: '刪除講義或資料夾',
      message: '確定要刪除此講義檔案或資料夾嗎？若為資料夾將一併清除內部檔案。',
      onConfirm: async () => {
        try {
          await api.deleteHandout(id);
          setHandouts((prev) => prev.filter((h) => h.id !== id));
          showToast('項目已成功刪除！', 'success');
        } catch (err: any) {
          showToast('刪除失敗：' + err.message, 'error');
        }
      },
    });
  }

  // Can publish handouts? Admin or Tutor for this subject
  const canPublishHandout =
    isAdmin || isTutor || (userTutorSubjects.length > 0 && userTutorSubjects.includes(handoutSubjectInput));

  // Forum
  async function loadForum(subject?: string) {
    try {
      const data = await api.getForumMessages(subject);
      setForumMessages(data);
      setTimeout(() => {
        if (forumListRef.current) forumListRef.current.scrollTop = forumListRef.current.scrollHeight;
      }, 50);
    } catch (err) {
      console.error(err);
    }
  }

  async function handlePostForumMessage() {
    if (!forumInput.trim()) return;
    try {
      await api.postForumMessage(activeUserName, forumInput.trim(), forumSubjectInput);
      setForumInput('');
      await loadForum(selectedSubject);
      showToast('留言發布成功！', 'success');
    } catch (err: any) {
      showToast('發送聊天失敗：' + err.message, 'error');
    }
  }

  async function handleDeleteForumMessage(id: string) {
    requestConfirm({
      title: '刪除論壇留言',
      message: '確定要刪除這條留言嗎？',
      onConfirm: async () => {
        try {
          await api.deleteForumMessage(id);
          setForumMessages((prev) => prev.filter((m) => m.id !== id));
          showToast('留言已刪除！', 'success');
        } catch (err: any) {
          showToast('刪除失敗：' + err.message, 'error');
        }
      },
    });
  }

  // --- Tab: Grades logic ---
  async function loadGrades() {
    try {
      const data = await api.getGrades();
      setGrades(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmitGrade() {
    if (!gradeSubject.trim() || !gradeRange.trim() || !gradeScore.trim()) {
      return showToast('請完整填寫成績資訊', 'error');
    }
    try {
      await api.postGrade({
        username: activeUserName,
        subject: gradeSubject.trim(),
        range_text: gradeRange.trim(),
        score: parseFloat(gradeScore.trim()),
      });
      setGradeRange('');
      setGradeScore('');
      showToast('成績登記送出成功！', 'success');
      loadGrades();
    } catch (err: any) {
      showToast('送出成績失敗：' + err.message, 'error');
    }
  }

  async function handleDeleteGrade(id: string) {
    requestConfirm({
      title: '刪除成績紀錄',
      message: '確定要刪除這筆成績紀錄嗎？',
      onConfirm: async () => {
        try {
          await api.deleteGrade(id);
          setGrades((prev) => prev.filter((g) => g.id !== id));
          showToast('成績紀錄已刪除！', 'success');
        } catch (err: any) {
          showToast('刪除失敗：' + err.message, 'error');
        }
      },
    });
  }

  // --- Tab: FAQ logic ---
  async function loadFaqChat() {
    try {
      const data = await api.getFaqMessages();
      setAllFaqMessages(data);
      setTimeout(() => {
        if (userFaqBoxRef.current) userFaqBoxRef.current.scrollTop = userFaqBoxRef.current.scrollHeight;
      }, 50);
    } catch (err) {
      console.error(err);
    }
  }

  // Student FAQ send
  async function handleSubmitUserFaq() {
    if (!userFaqInput.trim()) return showToast('請輸入要發問的內容', 'error');
    try {
      await api.postFaqMessage({
        username: activeUserName,
        sender: activeUserName,
        subject: userFaqSubject,
        content: userFaqInput.trim(),
        is_admin_reply: false,
        sender_role: 'student',
      });
      setUserFaqInput('');
      await loadFaqChat();
      showToast('問題已發送給客服與小老師！', 'success');
    } catch (err: any) {
      showToast('發送失敗：' + err.message, 'error');
    }
  }

  // Admin / Tutor FAQ send
  async function handleSendAdminReply() {
    if (!selectedAdminChatUser) return showToast('請先選擇對話學員', 'error');
    if (!adminReplyInput.trim()) return showToast('請輸入回覆內容', 'error');

    const role = isAdmin ? 'admin' : 'tutor';
    const tutorSubj = isTutor ? userTutorSubjects[0] || '學科' : '';

    try {
      await api.postFaqMessage({
        username: selectedAdminChatUser,
        sender: activeUserName,
        content: adminReplyInput.trim(),
        is_admin_reply: true,
        sender_role: role,
        tutor_subject: tutorSubj,
      });
      setAdminReplyInput('');
      await loadFaqChat();
      showToast('回覆已送達學員！', 'success');
    } catch (err: any) {
      showToast('傳送回覆失敗：' + err.message, 'error');
    }
  }

  // Delete single FAQ message
  async function handleDeleteFaqMessage(id: string) {
    requestConfirm({
      title: '刪除聊天訊息',
      message: '確定要刪除這條訊息嗎？',
      onConfirm: async () => {
        try {
          await api.deleteFaqMessage(id);
          setAllFaqMessages((prev) => prev.filter((m) => m.id !== id));
          showToast('訊息已刪除！', 'success');
        } catch (err: any) {
          showToast('刪除訊息失敗：' + err.message, 'error');
        }
      },
    });
  }

  // Clear entire user FAQ conversation
  async function handleClearUserFaq(username: string) {
    requestConfirm({
      title: '清空學員對話',
      message: `確定要清空學員【${username}】的所有對話紀錄嗎？`,
      onConfirm: async () => {
        try {
          await api.deleteUserFaqConversation(username);
          setAllFaqMessages((prev) => prev.filter((m) => m.username !== username));
          showToast('已清空對話！', 'success');
        } catch (err: any) {
          showToast('清空失敗：' + err.message, 'error');
        }
      },
    });
  }

  // --- Calculate sorted student list for Admin / Tutor FAQ view ---
  const studentFaqMap = new Map<string, { latestMsg: FaqMessage; count: number }>();
  allFaqMessages.forEach((m) => {
    const existing = studentFaqMap.get(m.username);
    if (!existing || new Date(m.created_at).getTime() > new Date(existing.latestMsg.created_at).getTime()) {
      studentFaqMap.set(m.username, {
        latestMsg: m,
        count: (existing?.count || 0) + 1,
      });
    } else {
      studentFaqMap.set(m.username, {
        latestMsg: existing.latestMsg,
        count: existing.count + 1,
      });
    }
  });

  const sortedStudentFaqUsers = Array.from(studentFaqMap.keys()).sort((a, b) => {
    const timeA = new Date(studentFaqMap.get(a)!.latestMsg.created_at).getTime();
    const timeB = new Date(studentFaqMap.get(b)!.latestMsg.created_at).getTime();
    return timeB - timeA;
  });

  // Settings updates
  async function handleUpdateNickname() {
    if (!settingNickname.trim()) return showToast('請輸入暱稱', 'error');
    try {
      const res = await api.updateUser(activeUserName, { nickname: settingNickname.trim() });
      if (currentUser && currentUser.username === activeUserName) {
        setCurrentUser(res.user);
      }
      showToast('暱稱設定成功！', 'success');
    } catch (err: any) {
      showToast('更新失敗：' + err.message, 'error');
    }
  }

  async function handleUpdatePassword() {
    const strength = evaluatePasswordStrength(settingNewPw);
    if (!strength.valid) return showToast('密碼強度不足：' + strength.text, 'error');
    try {
      await api.updateUser(activeUserName, { password: settingNewPw });
      setSettingNewPw('');
      showToast('密碼變更成功！下次登入請使用新密碼。', 'success');
    } catch (err: any) {
      showToast('密碼修改失敗：' + err.message, 'error');
    }
  }

  // Save All Editable Texts
  async function handleSaveAllEditableTexts() {
    try {
      const payload: any = { ...editableTexts };
      if ('countdown_enabled' in payload) {
        payload.countdown_enabled = payload.countdown_enabled === 'true' || payload.countdown_enabled === true;
      }
      const res = await api.updateSiteConfig(payload);
      setSiteConfig((prev) => ({ ...prev, ...res.config }));
      showToast('已成功儲存全站所有文字與標題設定！', 'success');
    } catch (err: any) {
      showToast('儲存文字失敗：' + err.message, 'error');
    }
  }

  // --- PDF & File Preview Handlers ---
  function openFilePreview(url: string, title: string) {
    setPreviewTitle(title);
    setPreviewUrl(url);
    setPreviewZoom(100);
    setPreviewModalOpen(true);
    setPreviewLoading(true);

    const isImg = url.startsWith('data:image/') || /\.(jpeg|jpg|gif|png|webp)($|\?)/i.test(url);
    setPreviewIsImage(isImg);

    if (isImg) {
      setPreviewLoading(false);
      return;
    }

    if (window.pdfjsLib) {
      window.pdfjsLib
        .getDocument(url)
        .promise.then((pdf: any) => {
          setPreviewPdfDoc(pdf);
          renderPdfPages(pdf, 100);
          setPreviewLoading(false);
        })
        .catch((err: any) => {
          console.error('PDF preview error:', err);
          setPreviewLoading(false);
        });
    } else {
      setPreviewLoading(false);
    }
  }

  async function renderPdfPages(pdf: any, zoomPct: number) {
    if (!pdf || !pdfContainerRef.current) return;
    const container = pdfContainerRef.current;
    container.innerHTML = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const scale = (zoomPct / 100) * 1.5;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.className = 'shadow-md rounded mb-4 max-w-full';
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = { canvasContext: context, viewport };
        await page.render(renderContext).promise;
        container.appendChild(canvas);
      } catch (err) {
        console.error('Page render error:', err);
      }
    }
  }

  function handleZoomIn() {
    if (previewZoom < 250) {
      const next = previewZoom + 25;
      setPreviewZoom(next);
      if (previewPdfDoc) renderPdfPages(previewPdfDoc, next);
    }
  }

  function handleZoomOut() {
    if (previewZoom > 50) {
      const next = previewZoom - 25;
      setPreviewZoom(next);
      if (previewPdfDoc) renderPdfPages(previewPdfDoc, next);
    }
  }

  function handleZoomReset() {
    setPreviewZoom(100);
    if (previewPdfDoc) renderPdfPages(previewPdfDoc, 100);
  }

  function handleDownloadFile() {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = previewTitle || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const forcePwStrength = evaluatePasswordStrength(newPwInput);
  const settingPwStrength = evaluatePasswordStrength(settingNewPw);
  const isMaintenanceBlocked = siteConfig.maintenance_mode && !isAdmin;

  return (
    <div className="bg-gray-50 dark:bg-gray-950 flex items-center justify-center min-h-screen text-gray-800 dark:text-gray-100 p-2 sm:p-6 transition-colors duration-200 relative overflow-x-hidden font-sans">
      {/* 全域 Toast 提示訊息 (取代 window.alert，100% 確保不被 iframe 攔截) */}
      {toast.show && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2 border backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-600/95 text-white border-emerald-500'
                : toast.type === 'error'
                ? 'bg-rose-600/95 text-white border-rose-500'
                : 'bg-gray-900/90 text-white border-gray-700'
            }`}
          >
            <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 全域 In-App 確認對話框 (取代 window.confirm，100% 確保刪除及設定按鈕必能運作) */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              {confirmDialog.title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
                className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition cursor-pointer"
              >
                {confirmDialog.cancelText || '取消'}
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition cursor-pointer ${
                  confirmDialog.isDestructive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmDialog.confirmText || '確定執行'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 全域佈景主題切換按鈕 (固定右上角) */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50">
        <button
          type="button"
          onClick={() => setIsDark(!isDark)}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-1.5 cursor-pointer"
        >
          <span>{isDark ? '☀️' : '🌙'}</span>
          <span>{isDark ? '亮色模式' : '深色模式'}</span>
        </button>
      </div>

      {/* 伺服器修復模式 (管理員提示橫幅) */}
      {siteConfig.maintenance_mode && isAdmin && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center py-2 px-4 z-50 shadow-md flex items-center justify-center gap-4 text-xs font-medium">
          <span>⚠️ 伺服器修復模式已啟用（一般會員功能已暫停使用）</span>
          <button
            type="button"
            onClick={handleToggleMaintenance}
            className="bg-white text-red-700 px-3 py-1 rounded font-bold hover:bg-red-100 transition shadow-sm cursor-pointer"
          >
            一鍵解除修復模式
          </button>
        </div>
      )}

      {/* 模擬登入提示橫幅 */}
      {impersonatingUser && !siteConfig.maintenance_mode && (
        <div className="fixed top-0 left-0 w-full bg-amber-500 text-white text-center py-2 px-4 z-50 shadow-md flex items-center justify-center gap-4 text-xs font-medium">
          <span>
            ⚠️ 您目前正在使用【模擬登入】模式（正在檢視帳號：
            <span className="font-bold underline">{impersonatingUser}</span>）
          </span>
          <button
            type="button"
            onClick={exitImpersonation}
            className="bg-white text-amber-700 px-3 py-1 rounded font-bold hover:bg-amber-100 transition shadow-sm cursor-pointer"
          >
            退出並返回管理員
          </button>
        </div>
      )}

      {/* ==================== 1. AUTH SCREEN ==================== */}
      {currentView === 'auth' && (
        <div
          id="main-auth-layout"
          className={`w-full max-w-5xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-colors duration-200 relative z-10 ${authCardAnimate}`}
        >
          {/* 左側：幾何圖形角色動態視覺區 */}
          <div className="lg:col-span-6 bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-purple-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6 sm:p-12 flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800">
            <div className="relative z-10">
              <span className="inline-block text-[11px] font-semibold tracking-widest text-blue-600 dark:text-blue-400 uppercase bg-blue-100 dark:bg-blue-950/60 px-3 py-1 rounded-full mb-4">
                Interactive Portal
              </span>
              <h2
                className="text-3xl sm:text-4xl font-light tracking-tight text-gray-900 dark:text-white mb-3"
                dangerouslySetInnerHTML={{ __html: siteConfig.login_title || '歡迎來到會員整合系統' }}
              />
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {siteConfig.login_desc}
              </p>
            </div>

            {/* 幾何背景動畫角色實體 */}
            <div className="geometric-hero-container my-6">
              <div className="geo-shape shape-circle"></div>
              <div className="geo-shape shape-square"></div>
              <div className="geo-shape shape-triangle"></div>
              <div className="geo-shape shape-ring"></div>

              {/* 互動眼睛置於中央 */}
              <div
                id="character-eyes"
                className={`eye-container relative z-10 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/60 dark:border-gray-700 shadow-sm ${
                  isShy ? 'shy-eyes' : ''
                }`}
              >
                <div className="eye">
                  <div className="pupil" ref={pupilLeftRef}></div>
                </div>
                <div className="eye">
                  <div className="pupil" ref={pupilRightRef}></div>
                </div>
              </div>
            </div>

            <div className="relative z-10 text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-between">
              <span>Secure Authentication</span>
              <span>{siteConfig.version_tag || 'v.0.0.1 Beta 3'}</span>
            </div>
          </div>

          {/* 右側：登入與驗證表單區 */}
          <div className="lg:col-span-6 p-6 sm:p-12 flex flex-col justify-center">
            {!showForceChangePw ? (
              <div id="auth-card" className="w-full max-w-sm mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-light tracking-wide text-gray-900 dark:text-white">
                    {isSignUp ? '註冊新帳號' : '會員登入'}
                  </h1>
                  <button
                    type="button"
                    onClick={refreshLoginPanel}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                    title="即時重新整理面板"
                  >
                    <svg
                      className={`w-4 h-4 ${isRefreshing ? 'refreshing' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      ></path>
                    </svg>
                  </button>
                </div>

                {/* 帳號輸入框 - 灰底字刪除 */}
                <div className="mb-4">
                  <label className="block text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider font-medium mb-2">
                    帳號名稱
                  </label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-black dark:focus:border-white transition text-gray-900 dark:text-gray-100 text-xs"
                    placeholder=""
                  />
                </div>

                {/* 密碼輸入框 - 灰底字刪除 */}
                <div className="mb-4">
                  <label className="block text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider font-medium mb-2">
                    密碼
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onFocus={() => setIsShy(true)}
                    onBlur={() => setIsShy(false)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-black dark:focus:border-white transition text-gray-900 dark:text-gray-100 text-xs"
                    placeholder=""
                  />
                </div>

                <div className="mb-6 flex items-center justify-between">
                  <label className="flex items-center text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-700 text-black focus:ring-0 mr-2"
                    />
                    記住我的帳號與密碼
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleAuth}
                  className="w-full bg-black dark:bg-white text-white dark:text-black font-medium py-2.5 px-4 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition mb-2 shadow-md text-xs cursor-pointer"
                >
                  {isSignUp ? '註冊' : '登入'}
                </button>

                {/* 生物辨識登入按鈕 */}
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition mb-4 flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  <span>🛡️</span> 使用生物辨識 (Touch/Face ID) 登入
                </button>

                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setAuthErrorMsg('');
                    }}
                    className="hover:text-black dark:hover:text-white transition cursor-pointer"
                  >
                    {isSignUp ? '已有帳號？點此登入' : '沒有帳號？點此註冊'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      showToast('忘記密碼請聯絡系統管理員或使用客服 LINE 官方帳號進行密碼重置請求。', 'info')
                    }
                    className="hover:text-black dark:hover:text-white transition cursor-pointer"
                  >
                    忘記密碼？
                  </button>
                </div>

                {authErrorMsg && <p className="mt-4 text-center text-xs text-red-500">{authErrorMsg}</p>}
              </div>
            ) : (
              /* 變更密碼卡片 (強制修改) */
              <div id="change-password-card" className="w-full max-w-sm mx-auto">
                <h1 className="text-2xl font-light mb-4 text-center tracking-wide text-gray-900 dark:text-white">
                  帳戶安全設定
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center leading-relaxed">
                  偵測到您目前使用的是預設密碼或管理員已要求您變更密碼。為了帳戶安全，請設定一組專屬密碼。
                </p>

                <div className="mb-3">
                  <label className="block text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider font-medium mb-1.5">
                    新密碼
                  </label>
                  <input
                    type="password"
                    value={newPwInput}
                    onChange={(e) => setNewPwInput(e.target.value)}
                    onFocus={() => setIsShy(true)}
                    onBlur={() => setIsShy(false)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-black dark:focus:border-white transition text-xs text-gray-900 dark:text-gray-100"
                    placeholder=""
                  />

                  <div className="mt-2 space-y-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${forcePwStrength.color}`}
                        style={{ width: `${forcePwStrength.score}%` }}
                      ></div>
                    </div>
                    <p className={`text-[10px] ${forcePwStrength.valid ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                      強度： {forcePwStrength.text} (至少 8 碼，須含大小寫英文及數字)
                    </p>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider font-medium mb-1.5">
                    確認新密碼
                  </label>
                  <input
                    type="password"
                    value={confirmPwInput}
                    onChange={(e) => setConfirmPwInput(e.target.value)}
                    onFocus={() => setIsShy(true)}
                    onBlur={() => setIsShy(false)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-black dark:focus:border-white transition text-xs text-gray-900 dark:text-gray-100"
                    placeholder=""
                  />
                </div>

                <button
                  type="button"
                  onClick={handleForceChangePassword}
                  className="w-full bg-black dark:bg-white text-white dark:text-black font-medium py-2.5 px-4 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition mb-4 text-xs cursor-pointer"
                >
                  確認修改並進入系統
                </button>
                {forcePwMsg && <p className="mt-2 text-center text-xs text-red-500">{forcePwMsg}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 2. ADMIN DASHBOARD ==================== */}
      {currentView === 'admin-dash' && (
        <div
          id="admin-dashboard"
          className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-5 sm:p-8 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl w-full max-w-lg transition-colors duration-200 relative z-10"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-light tracking-wide text-gray-900 dark:text-white">管理員後台</h1>
            <button
              type="button"
              onClick={handleToggleMaintenance}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                siteConfig.maintenance_mode
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              }`}
              title="設置伺服器修復狀態"
            >
              <span>🔧</span>
              <span>{siteConfig.maintenance_mode ? '修復中(關閉功能)' : '修復模式:關'}</span>
            </button>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-4 text-center">
            登入者：{currentUser?.username} (最高權限管理員)
          </p>

          {/* ⚡ 快速會員管理清單 (含在線綠點) */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                ⚡ 快速會員管理 (即時在線)
              </p>
              <button
                type="button"
                onClick={loadAdminUsers}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
                title="重新整理清單"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  ></path>
                </svg>
              </button>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto p-2 custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="p-2">帳號 / 狀態</th>
                    <th className="p-2 text-right">管理操作</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers
                    .filter((u) => u.username !== 'hsliang-admin')
                    .map((u) => (
                      <tr key={u.username} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="p-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                u.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                              }`}
                              title={u.isOnline ? '🟢 在線' : '⚪ 離線'}
                            ></span>
                            <span className="font-medium">{u.username}</span>
                            {u.nickname && <span className="text-[10px] text-gray-400">({u.nickname})</span>}
                            {u.isTutor && (
                              <span className="text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 px-1 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                🎓 {u.tutorSubjects?.join('/') || '小老師'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px]">
                            <span className={u.isOnline ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400'}>
                              {u.isOnline ? '🟢 在線' : '⚪ 離線'}
                            </span>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                            <span className="font-mono bg-gray-100 dark:bg-gray-700/80 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-200">
                              密碼: {visiblePasswords[u.username] ? u.password || '******' : '••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(u.username)}
                              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-[10px]"
                            >
                              {visiblePasswords[u.username] ? '隱藏' : '查看'}
                            </button>
                            {u.isBanned && <span className="bg-red-500 text-white px-1 rounded text-[9px]">已Ban</span>}
                          </div>
                        </td>
                        <td className="p-2 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => openTutorAssignModal(u)}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] px-2 py-1 rounded transition cursor-pointer"
                            title="設定小老師"
                          >
                            🎓 小老師
                          </button>
                          <button
                            type="button"
                            onClick={() => impersonate(u.username)}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-2 py-1 rounded transition cursor-pointer"
                          >
                            👁️ 模擬
                          </button>
                        </td>
                      </tr>
                    ))}
                  {adminUsers.filter((u) => u.username !== 'hsliang-admin').length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-2 text-center text-gray-400">
                        目前尚無註冊學員
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="button"
            onClick={goToUserPanel}
            className="w-full bg-[#0067c0] hover:bg-[#005fb8] active:bg-[#00529f] text-white font-medium py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 text-xs cursor-pointer mb-3"
          >
            <span>進入使用者面板</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-xs cursor-pointer"
          >
            登出
          </button>
        </div>
      )}

      {/* ==================== 3. USER DASHBOARD ==================== */}
      {currentView === 'user-dash' && (
        <div
          id="user-dashboard"
          className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-6 sm:p-8 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl w-full max-w-lg transition-colors duration-200 relative z-10"
        >
          <h1 className="text-2xl font-light mb-4 text-center tracking-wide text-gray-900 dark:text-white">
            會員中心
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-center">
            登入者：{currentUser?.username}{' '}
            {currentUser?.isTutor
              ? `(🎓 ${currentUser.tutorSubjects?.join('/') || ''}小老師)`
              : '(學員會員)'}
          </p>

          {isMaintenanceBlocked ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-lg text-center mb-4">
              <span className="text-2xl block mb-2">🔧</span>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                伺服器修復中
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {siteConfig.maintenance_message || '系統目前正在進行修復，暫時關閉功能，請稍候再試。'}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={goToUserPanel}
              className="w-full bg-[#0067c0] hover:bg-[#005fb8] active:bg-[#00529f] text-white font-medium py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2 text-xs cursor-pointer mb-3"
            >
              <span>進入使用者面板</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-xs cursor-pointer"
          >
            登出
          </button>
        </div>
      )}

      {/* ==================== 4. FULLSCREEN USER PANEL ==================== */}
      {currentView === 'user-panel' && (
        <div
          id="user-panel-view"
          className="fixed inset-0 bg-white dark:bg-gray-900 z-40 flex flex-col justify-between p-3 sm:p-8 md:p-12 overflow-y-auto transition-colors duration-200"
        >
          {isMaintenanceBlocked ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto my-auto">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm">
                🔧
              </div>
              <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-2">伺服器維護修復中</h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                {siteConfig.maintenance_message ||
                  '親愛的學員您好，系統目前正在進行伺服器修復與系統維護，為確保資料完整，已暫時關閉所有功能。請稍候再試或洽詢管理員。'}
              </p>
              <button
                type="button"
                onClick={logout}
                className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg text-xs font-medium cursor-pointer"
              >
                安全登出
              </button>
            </div>
          ) : (
            <>
              {/* 頂部跑馬燈公告列 */}
              <div
                id="marquee-container"
                className="w-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs py-2 px-3 rounded-lg overflow-hidden relative shrink-0 shadow-sm flex items-center mb-3"
              >
                <span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded mr-2 shrink-0 z-10">
                  📢 公告
                </span>
                <div className="overflow-hidden w-full whitespace-nowrap">
                  <div id="marquee-text" className="animate-marquee font-medium">
                    {siteConfig.marquee_text || '歡迎來到網站！目前系統功能全面運作中，講義與成績系統已連線。'}
                  </div>
                </div>
              </div>

              {/* 頂部導覽列 */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 dark:border-gray-800 pb-3 sm:pb-4 shrink-0 gap-3">
                {/* 左側：返回按鈕 + 標題與版本狀態標籤 */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentUser?.isAdmin || currentUser?.username === 'hsliang-admin') {
                        setCurrentView('admin-dash');
                      } else {
                        setCurrentView('user-dash');
                      }
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-200/80 dark:hover:bg-gray-800 transition cursor-pointer shrink-0 active:scale-95 border border-transparent hover:border-gray-300 dark:hover:border-gray-700"
                    title="返回主控台"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <h1 className="text-base sm:text-xl font-light tracking-wide text-gray-900 dark:text-white">
                    使用者面板
                  </h1>
                  <div className="flex items-center space-x-1 sm:space-x-2 text-[10px] sm:text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                    <span className="font-medium">{siteConfig.version_tag || 'v.0.0.1 Beta 3'}</span>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <span className="text-amber-600 dark:text-amber-400 font-light">
                      {siteConfig.status_tag || '目前網站開站中'}
                    </span>
                  </div>
                </div>

                {/* 右側：各功能頁面切換選單 + 登入者狀態 + 登出 */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <nav className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto py-1 max-w-full">
                    {(['home', 'live', 'grades', 'settings', 'faq', 'help', 'version'] as const).map((t) => {
                      const titles = {
                        home: '首頁',
                        live: '直播教室',
                        grades: '成績登記',
                        settings: '設定',
                        faq: '問題發問',
                        help: '幫助',
                        version: '版本介紹',
                      };
                      const active = activeTab === t;
                      const hasActiveStream = streams.some((s) => s.isLive);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => switchTab(t)}
                          className={`text-xs transition whitespace-nowrap cursor-pointer px-1 py-0.5 inline-flex items-center gap-1 ${
                            active
                              ? 'text-gray-900 dark:text-white font-medium border-b-2 border-black dark:border-white'
                              : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-gray-300'
                          }`}
                        >
                          {t === 'live' && hasActiveStream && (
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping shrink-0"></span>
                          )}
                          <span>{titles[t]}</span>
                        </button>
                      );
                    })}
                  </nav>

                  <div className="hidden sm:block h-4 w-[1px] bg-gray-200 dark:bg-gray-700"></div>

                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                      {activeUserName}
                      {isTutor && (
                        <span className="ml-1 text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                          [🎓 {userTutorSubjects.join('/')}小老師]
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 font-mono">
                      {Math.floor(sessionSeconds / 60)}分{sessionSeconds % 60}秒
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={logout}
                    className="text-xs text-red-500 hover:text-red-700 border border-red-200 dark:border-red-900/60 px-2.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                  >
                    登出
                  </button>
                </div>
              </div>

              {/* 頁面主要內容 */}
              <div className="max-w-6xl mx-auto w-full my-4 sm:my-8 flex-1">
                {/* 1. 首頁 (Home) */}
                {activeTab === 'home' && (
                  <div id="tab-home" className="space-y-4 sm:space-y-6">
                    <div className="text-center mb-2">
                      <h2 className="text-2xl sm:text-3xl font-light tracking-wide text-gray-900 dark:text-white">
                        {siteConfig.welcome_hero_title || '歡迎來到您的專屬空間'}
                      </h2>
                    </div>

                    {/* 國中教育會考倒數計時看板 (Windows 11 Fluent 壓克力風格) */}
                    {siteConfig.countdown_enabled !== false && (
                      <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-purple-50/70 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 border border-blue-200/80 dark:border-blue-800/60 rounded-2xl p-4 sm:p-5 shadow-xs backdrop-blur-md transition-all">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                          {/* 標題與標語 */}
                          <div className="text-center md:text-left">
                            <div className="inline-flex items-center gap-2 bg-blue-600/10 dark:bg-blue-400/10 border border-blue-600/20 dark:border-blue-400/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-semibold mb-1.5">
                              <span>🎓</span>
                              <span>{siteConfig.countdown_title || '116年 國中教育會考倒數'}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping"></span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                              {siteConfig.countdown_slogan || '全力以赴，金榜題名！每一步努力都在成就更好的自己'}
                            </p>
                          </div>

                          {/* 倒數四方格 */}
                          <div className="grid grid-cols-4 gap-2 sm:gap-2.5 w-full md:w-auto shrink-0">
                            {[
                              { val: countdown.days, unit: '天', label: 'DAYS' },
                              { val: countdown.hours, unit: '時', label: 'HOURS' },
                              { val: countdown.minutes, unit: '分', label: 'MINUTES' },
                              { val: countdown.seconds, unit: '秒', label: 'SECONDS' },
                            ].map((box, i) => (
                              <div
                                key={i}
                                className="bg-white/85 dark:bg-gray-800/85 backdrop-blur border border-white/60 dark:border-gray-700/60 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-center shadow-2xs min-w-[62px] sm:min-w-[72px]"
                              >
                                <span className="block text-xl sm:text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-b from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300">
                                  {String(box.val).padStart(2, '0')}
                                </span>
                                <span className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                                  {box.unit}
                                </span>
                                <span className="block text-[8px] tracking-wider text-gray-400 uppercase font-mono">
                                  {box.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 即時直播進行中橫幅 (LIVE Banner) */}
                    {streams.some((s) => s.isLive) && (
                      <div className="bg-gradient-to-r from-red-500/10 via-rose-500/15 to-purple-500/10 border border-red-300 dark:border-red-900/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm backdrop-blur-md">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                            LIVE
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white">
                                🔴 直播進行中
                              </span>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                {streams.find((s) => s.isLive)?.subject}
                              </span>
                              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                主講：{streams.find((s) => s.isLive)?.broadcasterNickname}
                              </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mt-1 truncate">
                              {streams.find((s) => s.isLive)?.title}
                            </h3>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const live = streams.find((s) => s.isLive);
                            if (live) {
                              setActiveStream(live);
                              switchTab('live');
                              window.location.hash = `#live-room-${live.id}`;
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer shrink-0 active:scale-95"
                        >
                          <span>進入直播間觀看</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* 全站科目篩選切換標籤 */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1 shrink-0">
                          科目分類:
                        </span>
                        {['全部', ...SUBJECT_LIST].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setSelectedSubject(s);
                              loadHandouts(currentFolderId, s);
                              loadForum(s);
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                              selectedSubject === s
                                ? 'bg-blue-600 text-white font-medium shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      {isTutor && (
                        <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                          🎓 您為 {userTutorSubjects.join('、')} 小老師，可發布當科講義並為學員解答！
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                      {/* 1. 即時發布訊息 */}
                      <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 flex flex-col h-[380px] sm:h-[420px] overflow-hidden">
                        <h3 className="text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between shrink-0">
                          <span>1. 即時發布訊息</span>
                          {isAdmin && (
                            <span className="text-[10px] bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded">
                              管理員
                            </span>
                          )}
                        </h3>

                        {isAdmin && (
                          <div className="mb-3 shrink-0">
                            <textarea
                              rows={2}
                              value={announceInput}
                              onChange={(e) => setAnnounceInput(e.target.value)}
                              className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-black dark:focus:border-white resize-none text-gray-900 dark:text-gray-100"
                              placeholder=""
                            ></textarea>
                            <button
                              type="button"
                              onClick={handlePostAnnouncement}
                              className="w-full mt-1 bg-black dark:bg-white text-white dark:text-black text-xs py-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition cursor-pointer"
                            >
                              發布公告
                            </button>
                          </div>
                        )}

                        <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                          {announcements.map((item) => {
                            const dateStr = new Date(item.created_at).toLocaleString('zh-TW', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                            return (
                              <div
                                key={item.id}
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 rounded-lg text-xs space-y-1"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {item.created_by}
                                  </span>
                                  <span className="text-[10px] text-gray-400">{dateStr}</span>
                                </div>
                                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                                  {item.content}
                                </p>
                                {isAdmin && (
                                  <div className="flex justify-end pt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAnnouncement(item.id)}
                                      className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/15 border border-red-200/70 dark:border-red-900/50 px-2.5 py-0.5 rounded-md transition shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                                    >
                                      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      <span>刪除公告</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {announcements.length === 0 && (
                            <p className="text-xs text-gray-400 text-center mt-12">目前尚無即時訊息</p>
                          )}
                        </div>
                      </div>

                      {/* 2. 講義檔案 (依科目排列 + 小老師/管理員可發布) */}
                      <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 flex flex-col h-[380px] sm:h-[420px] overflow-hidden">
                        <div className="shrink-0">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-medium uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                              <span>2. 學科講義檔案</span>
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                                [{selectedSubject}]
                              </span>
                            </h3>
                            {folderBreadcrumbs.length > 1 && (
                              <button
                                type="button"
                                onClick={navigateParentFolder}
                                className="text-[11px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md shadow-sm transition cursor-pointer"
                              >
                                ⬅ 返回
                              </button>
                            )}
                          </div>

                          {/* Win 11 地址欄風格 */}
                          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-[11px] text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1 overflow-x-auto shadow-inner">
                            <span className="text-blue-600 dark:text-blue-400 font-medium">💻 此電腦</span>
                            <span className="text-gray-400">&gt;</span>
                            <span className="text-gray-800 dark:text-gray-200 font-semibold truncate">
                              {folderBreadcrumbs[folderBreadcrumbs.length - 1].name}
                            </span>
                          </div>

                          {/* 講義發布區塊 (管理員 或 當科小老師有權限) */}
                          {canPublishHandout && (
                            <div className="mb-2 space-y-1.5 border-b border-gray-200 dark:border-gray-700 pb-2">
                              <div className="flex gap-1 items-center">
                                <select
                                  value={handoutSubjectInput}
                                  onChange={(e) => setHandoutSubjectInput(e.target.value)}
                                  className="p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs shrink-0"
                                >
                                  {SUBJECT_LIST.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={newFolderName}
                                  onChange={(e) => setNewFolderName(e.target.value)}
                                  className="flex-1 p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs focus:outline-none text-gray-900 dark:text-gray-100"
                                  placeholder=""
                                />
                                <button
                                  type="button"
                                  onClick={handleCreateNewFolder}
                                  className="bg-gray-800 dark:bg-gray-700 text-white text-[11px] px-2 py-1 rounded shrink-0 hover:bg-black cursor-pointer"
                                >
                                  + 資料夾
                                </button>
                              </div>

                              <div className="flex gap-1 items-center">
                                <input
                                  type="text"
                                  value={handoutTitleInput}
                                  onChange={(e) => setHandoutTitleInput(e.target.value)}
                                  className="w-20 p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs focus:outline-none text-gray-900 dark:text-gray-100"
                                  placeholder=""
                                />
                                <input
                                  type="file"
                                  ref={handoutFileInputRef}
                                  className="w-full text-[9px] text-gray-500 dark:text-gray-400 file:mr-1 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:bg-gray-200 dark:file:bg-gray-700"
                                />
                                <button
                                  type="button"
                                  onClick={handleUploadHandoutRealFile}
                                  className="bg-black dark:bg-white text-white dark:text-black text-[11px] px-2 py-1 rounded shrink-0 cursor-pointer"
                                >
                                  上傳
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5 overflow-y-auto flex-1 pr-1.5 custom-scrollbar">
                          {handouts.map((item) => (
                            <div
                              key={item.id}
                              className={`${
                                item.is_folder ? 'win11-folder-card' : 'win11-file-card'
                              } flex items-center justify-between p-2 rounded-lg cursor-pointer group transition`}
                              onClick={() => {
                                if (item.is_folder) {
                                  enterSubFolder(item.id, item.title);
                                } else {
                                  openFilePreview(item.url, item.title);
                                }
                              }}
                            >
                              <div className="flex items-center space-x-2 truncate">
                                {item.is_folder ? (
                                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 36 32" fill="none">
                                    <path
                                      d="M2 6C2 4.34315 3.34315 3 5 3H12.4142C13.2098 3 13.9728 3.31607 14.5355 3.87868L17.1213 6.46447C17.684 7.02708 18.447 7.34315 19.2426 7.34315H31C32.6569 7.34315 34 8.68629 34 10.3431V25C34 26.6569 32.6569 28 31 28H5C3.34315 28 2 26.6569 2 25V6Z"
                                      fill="#FFAE00"
                                    />
                                    <path
                                      d="M2 11.5C2 9.84315 3.34315 8.5 5 8.5H31C32.6569 8.5 34 9.84315 34 11.5V25C34 26.6569 32.6569 28 31 28H5C3.34315 28 2 26.6569 2 25V11.5Z"
                                      fill="#FFC83B"
                                    />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 32 32" fill="none">
                                    <path
                                      d="M6 4C6 2.89543 6.89543 2 8 2H20L26 8V28C26 29.1046 25.1046 30 24 30H8C6.89543 30 6 29.1046 6 28V4Z"
                                      className="fill-gray-200 dark:fill-gray-700"
                                    />
                                    <path d="M20 2V8H26" className="fill-gray-300 dark:fill-gray-600" />
                                    <path
                                      d="M10 14H22M10 18H22M10 22H18"
                                      stroke="#0067C0"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                )}
                                <span className="text-xs font-medium text-gray-800 dark:text-gray-100 group-hover:text-blue-600 truncate">
                                  {item.title}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <span className="text-[9px] bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded">
                                  {item.subject || '數學'}
                                </span>
                                {(isAdmin || item.created_by === activeUserName) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteHandout(item.id);
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/15 border border-red-200/70 dark:border-red-900/50 px-2 py-0.5 rounded-md transition shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer ml-1"
                                    title="刪除此項目"
                                  >
                                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>刪除</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          {handouts.length === 0 && (
                            <p className="text-xs text-gray-400 text-center mt-12">此分類下尚無檔案</p>
                          )}
                        </div>
                      </div>

                      {/* 3. 發問論壇聊天 (含科目選擇與刪除按鈕) */}
                      <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 flex flex-col h-[380px] sm:h-[420px] overflow-hidden">
                        <h3 className="text-sm font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 shrink-0 flex items-center justify-between">
                          <span>3. 發問論壇聊天</span>
                          <span className="text-[10px] text-gray-400">{forumMessages.length} 則留言</span>
                        </h3>
                        <div
                          ref={forumListRef}
                          className="space-y-2 overflow-y-auto flex-1 pr-1.5 custom-scrollbar bg-white dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-700 rounded-lg mb-2"
                        >
                          {forumMessages.map((msg) => {
                            const dateStr = new Date(msg.created_at).toLocaleTimeString('zh-TW', {
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                            const canDelete = isAdmin || msg.username === activeUserName;
                            return (
                              <div key={msg.id} className="text-xs space-y-0.5 group">
                                <div className="flex justify-between items-center text-[10px] text-gray-400">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                                      {msg.username}
                                    </span>
                                    <span className="bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 px-1 rounded text-[9px]">
                                      {msg.subject || '全科'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span>{dateStr}</span>
                                    {canDelete && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteForumMessage(msg.id)}
                                        className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/15 border border-red-200/60 dark:border-red-900/40 px-1.5 py-0.5 rounded transition shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                                        title="刪除這則訊息"
                                      >
                                        <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>刪除</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg text-gray-800 dark:text-gray-200 break-words">
                                  {msg.content}
                                </div>
                              </div>
                            );
                          })}
                          {forumMessages.length === 0 && (
                            <p className="text-xs text-gray-400 text-center mt-12">大家一起來聊聊吧！</p>
                          )}
                        </div>

                        {/* 發言區域 */}
                        <div className="space-y-1.5 shrink-0">
                          <div className="flex gap-1.5 items-center">
                            <span className="text-[10px] text-gray-500 shrink-0">科目:</span>
                            <select
                              value={forumSubjectInput}
                              onChange={(e) => setForumSubjectInput(e.target.value)}
                              className="p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs"
                            >
                              {SUBJECT_LIST.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={forumInput}
                              onChange={(e) => setForumInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handlePostForumMessage()}
                              className="flex-1 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-black dark:focus:border-white text-gray-900 dark:text-gray-100"
                              placeholder=""
                            />
                            <button
                              type="button"
                              onClick={handlePostForumMessage}
                              className="bg-black dark:bg-white text-white dark:text-black text-xs px-3 py-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition cursor-pointer shrink-0"
                            >
                              發送
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1.5. 直播教室 (Live Classroom) */}
                {activeTab === 'live' && (
                  <div id="tab-live" className="space-y-4 sm:space-y-6 max-w-6xl mx-auto w-full min-w-0">
                    {/* Floating Reaction Hearts Layer */}
                    {floatingHearts.map((h) => (
                      <div
                        key={h.id}
                        style={{ left: `${h.x}%` }}
                        className="fixed bottom-24 z-60 text-3xl pointer-events-none animate-bounce"
                      >
                        {h.emoji}
                      </div>
                    ))}

                    {!activeStream ? (
                      /* ==================== A. 直播課堂大廳 (Lobby) ==================== */
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
                              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                                即時線上直播教室
                              </h2>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              管理員與各科小老師可隨時開播，支援獨立觀看網址、相機/螢幕分享、講課白板與即時問答。
                            </p>
                          </div>

                          {(isAdmin || isTutor) && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewStreamSubject(isTutor && userTutorSubjects[0] ? userTutorSubjects[0] : '不分科');
                                setCreateStreamModalOpen(true);
                              }}
                              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer active:scale-95 shrink-0"
                            >
                              <span className="text-sm">📹</span>
                              <span>開啟新直播課堂</span>
                            </button>
                          )}
                        </div>

                        {/* 科目篩選器 */}
                        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                          <span className="text-xs text-gray-400 shrink-0 mr-1">篩選科目:</span>
                          {['全部', ...SUBJECT_LIST].map((subj) => (
                            <button
                              key={subj}
                              type="button"
                              onClick={() => setStreamFilterSubject(subj)}
                              className={`px-3 py-1 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                                streamFilterSubject === subj
                                  ? 'bg-red-600 text-white font-medium shadow-xs'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                              }`}
                            >
                              {subj}
                            </button>
                          ))}
                        </div>

                        {/* 直播列表網格 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {streams
                            .filter((s) => streamFilterSubject === '全部' || s.subject === streamFilterSubject)
                            .map((s) => {
                              const timeStr = new Date(s.startedAt).toLocaleString('zh-TW', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              });
                              return (
                                <div
                                  key={s.id}
                                  className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                                >
                                  <div>
                                    {/* 頂部縮圖與狀態 */}
                                    <div className="aspect-video bg-gradient-to-br from-gray-900 to-black relative flex items-center justify-center p-4 overflow-hidden">
                                      {s.isLive ? (
                                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md">
                                          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                                          <span>LIVE 直播中</span>
                                        </div>
                                      ) : (
                                        <div className="absolute top-3 left-3 z-10 bg-gray-700/80 text-gray-300 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                                          課堂已結束
                                        </div>
                                      )}

                                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-0.5 rounded-full">
                                        <span>{s.streamType === 'youtube' ? '📺 YouTube' : '🎥 內建課堂'}</span>
                                      </div>

                                      {/* 中央視覺象徵 */}
                                      <div className="text-center text-white/90">
                                        <span className="text-4xl block mb-1">
                                          {s.streamType === 'youtube' ? '▶️' : '🎓'}
                                        </span>
                                        <span className="text-xs font-mono tracking-wider opacity-80">
                                          {s.subject}專題
                                        </span>
                                      </div>

                                      {/* 底部觀看數與讚數 */}
                                      <div className="absolute bottom-2 left-3 right-3 flex justify-between items-center text-[11px] text-white/80">
                                        <span>👥 {s.viewers || 1} 人在線</span>
                                        <span>❤️ {s.likes || 0} 個讚</span>
                                      </div>
                                    </div>

                                    {/* 資訊本體 */}
                                    <div className="p-4 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                          {s.subject}
                                        </span>
                                        <span className="text-[10px] text-gray-400">{timeStr} 開播</span>
                                      </div>

                                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                                        {s.title}
                                      </h3>

                                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
                                        <span className="flex items-center gap-1">
                                          <span>主講:</span>
                                          <span className="font-medium text-gray-700 dark:text-gray-200">
                                            {s.broadcasterNickname}
                                          </span>
                                        </span>
                                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                                          {s.broadcasterRole === 'admin' ? '👑 管理員' : '🎓 小老師'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 卡片底端按鈕群 */}
                                  <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-700/60 mt-3 flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveStream(s);
                                        window.location.hash = `#live-room-${s.id}`;
                                        if (s.streamType === 'builtin' && (activeUserName === s.broadcaster || isAdmin)) {
                                          startBroadcastingCamera();
                                        }
                                      }}
                                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 px-3 rounded-xl transition text-center shadow-xs cursor-pointer active:scale-95"
                                    >
                                      進入直播間
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleCopyStreamUrl(s.id)}
                                      className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 transition cursor-pointer text-xs shrink-0"
                                      title="複製獨立觀看網址"
                                    >
                                      🔗 複製網址
                                    </button>

                                    {(isAdmin || activeUserName === s.broadcaster) && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteStream(s.id)}
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/15 border border-red-200/70 dark:border-red-900/50 p-2 rounded-xl transition shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer shrink-0"
                                        title="刪除此直播"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>

                        {streams.filter((s) => streamFilterSubject === '全部' || s.subject === streamFilterSubject).length === 0 && (
                          <div className="bg-gray-50 dark:bg-gray-800/40 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-12 text-center">
                            <span className="text-4xl block mb-2">📡</span>
                            <h3 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
                              目前尚無【{streamFilterSubject}】的直播課堂
                            </h3>
                            <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                              管理員或各科小老師可點擊上方「開啟新直播課堂」開始教學廣播！
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* ==================== B. 直播房間視圖 (Inside Live Room) ==================== */
                      <div className="space-y-4">
                        {/* 頂部導航與房間資訊列 */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 sm:p-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                stopBroadcastingMedia();
                                setActiveStream(null);
                                window.location.hash = '';
                              }}
                              className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer shrink-0"
                            >
                              <span>←</span>
                              <span>返回列表</span>
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                                  {activeStream.isLive ? '🔴 LIVE' : '⚪ 已結束'}
                                </span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                  {activeStream.subject}
                                </span>
                                <span className="text-xs text-gray-400">
                                  主講：{activeStream.broadcasterNickname} ({activeStream.broadcasterRole === 'admin' ? '管理員' : '小老師'})
                                </span>
                              </div>
                              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate mt-1">
                                {activeStream.title}
                              </h2>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopyStreamUrl(activeStream.id)}
                              className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs px-3 py-1.5 rounded-xl transition cursor-pointer"
                              title="複製本課堂的獨立觀看網址"
                            >
                              <span>📋</span>
                              <span>複製獨立網址</span>
                            </button>

                            {(activeUserName === activeStream.broadcaster || isAdmin) && activeStream.isLive && (
                              <button
                                type="button"
                                onClick={() => handleEndStream(activeStream.id)}
                                className="bg-red-50 dark:bg-red-950/70 hover:bg-red-100 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900 text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer active:scale-95"
                              >
                                ⏹️ 結束直播
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 直播影音區與互動區 (雙欄響應式設計，防跑版) */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                          {/* 左側：影音播放器與白板 / 串流畫面 (2欄) */}
                          <div className="lg:col-span-2 space-y-4">
                            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 flex items-center justify-center">
                              {/* 1. YouTube 直播播放器 */}
                              {activeStream.streamType === 'youtube' && (
                                <iframe
                                  title={activeStream.title}
                                  src={`https://www.youtube.com/embed/${extractYouTubeId(activeStream.youtubeUrl || '')}?autoplay=1&rel=0`}
                                  className="w-full h-full border-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              )}

                              {/* 2. 內建直播播放器 (相機 / 螢幕分享 / 白板) */}
                              {activeStream.streamType === 'builtin' && (
                                <>
                                  {/* 主播本體畫面 */}
                                  {(activeUserName === activeStream.broadcaster || isAdmin) ? (
                                    <div className="relative w-full h-full flex items-center justify-center bg-gray-950">
                                      <video
                                        ref={broadcasterVideoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                      />

                                      {!broadcasterMediaStream && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-gray-900 to-black text-white z-10">
                                          <div className="w-16 h-16 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center text-3xl mb-3 border border-red-500/30">
                                            🎥
                                          </div>
                                          <h4 className="text-base font-semibold mb-1">
                                            您是本場直播主講人
                                          </h4>
                                          <p className="text-xs text-gray-400 max-w-sm mb-4">
                                            請在下方工具列點選「開啟攝影機」或「螢幕分享」，亦可開啟講課白板進行板書教學！
                                          </p>
                                          <div className="flex gap-2.5">
                                            <button
                                              type="button"
                                              onClick={startBroadcastingCamera}
                                              className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                                            >
                                              📹 啟動鏡頭
                                            </button>
                                            <button
                                              type="button"
                                              onClick={startBroadcastingScreenShare}
                                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                                            >
                                              🖥️ 螢幕分享
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {/* 電子講課白板畫布 (可手寫或標註) */}
                                      {whiteboardActive && (
                                        <canvas
                                          ref={whiteboardCanvasRef}
                                          onMouseDown={handleCanvasMouseDown}
                                          onMouseMove={handleCanvasMouseMove}
                                          onMouseUp={handleCanvasMouseUp}
                                          onMouseLeave={handleCanvasMouseUp}
                                          className="absolute inset-0 w-full h-full cursor-crosshair z-20 pointer-events-auto bg-black/30 backdrop-blur-2xs"
                                        />
                                      )}

                                      {/* 主播控制列 (覆蓋於視訊底部) */}
                                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-2.5 bg-black/85 backdrop-blur-md px-3 sm:px-4 py-2 rounded-2xl border border-white/20 shadow-xl max-w-[95%] overflow-x-auto">
                                        <button
                                          type="button"
                                          onClick={toggleMic}
                                          className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 ${
                                            isMicMuted ? 'bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                                          }`}
                                          title={isMicMuted ? '取消靜音' : '靜音'}
                                        >
                                          {isMicMuted ? '🔇 靜音中' : '🎙️ 麥克風'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={toggleVideo}
                                          className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 ${
                                            isVideoOff ? 'bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                                          }`}
                                          title={isVideoOff ? '開啟視訊' : '關閉視訊'}
                                        >
                                          {isVideoOff ? '🚫 鏡頭關閉' : '📹 鏡頭'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={isScreenSharing ? stopBroadcastingMedia : startBroadcastingScreenShare}
                                          className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 ${
                                            isScreenSharing ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                                          }`}
                                        >
                                          🖥️ {isScreenSharing ? '停止螢幕' : '分享螢幕'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setWhiteboardActive(!whiteboardActive);
                                            setTimeout(initWhiteboardCanvas, 100);
                                          }}
                                          className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 ${
                                            whiteboardActive ? 'bg-amber-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                                          }`}
                                        >
                                          🎨 {whiteboardActive ? '關閉白板' : '電子白板'}
                                        </button>

                                        {whiteboardActive && (
                                          <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
                                            {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff'].map((c) => (
                                              <button
                                                key={c}
                                                type="button"
                                                onClick={() => setWhiteboardColor(c)}
                                                style={{ backgroundColor: c }}
                                                className={`w-5 h-5 rounded-full transition cursor-pointer ${
                                                  whiteboardColor === c ? 'ring-2 ring-white scale-110' : ''
                                                }`}
                                              />
                                            ))}
                                            <button
                                              type="button"
                                              onClick={clearWhiteboard}
                                              className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-lg transition cursor-pointer shrink-0"
                                            >
                                              🧹 清除
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    /* 學員觀眾觀看畫面 */
                                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-gray-900 via-indigo-950 to-black text-white relative">
                                      {activeStream.streamUrl ? (
                                        <video
                                          src={activeStream.streamUrl}
                                          controls
                                          autoPlay
                                          playsInline
                                          className="w-full h-full object-contain"
                                        />
                                      ) : (
                                        <div className="space-y-4 max-w-md">
                                          <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-4xl shadow-inner">
                                            🎓
                                          </div>
                                          <div>
                                            <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 text-red-400 text-xs px-3 py-1 rounded-full mb-2">
                                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                                              <span>{activeStream.isLive ? '🔴 ON AIR 即時連線中' : '課堂已順利結束'}</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-1">
                                              {activeStream.title}
                                            </h3>
                                            <p className="text-xs text-indigo-200/80">
                                              主講老師：{activeStream.broadcasterNickname} ({activeStream.subject})
                                            </p>
                                          </div>
                                          <div className="flex justify-center items-center gap-1.5 h-6">
                                            <span className="w-1.5 h-4 bg-indigo-500 rounded-full animate-pulse"></span>
                                            <span className="w-1.5 h-6 bg-blue-400 rounded-full animate-bounce"></span>
                                            <span className="w-1.5 h-3 bg-indigo-300 rounded-full animate-pulse"></span>
                                            <span className="w-1.5 h-5 bg-purple-400 rounded-full animate-bounce"></span>
                                            <span className="w-1.5 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                                          </div>
                                          <p className="text-[11px] text-gray-400">
                                            音訊與白板講解同步中，您可在右側提問發問，主講老師將即時解答！
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* 獨立網址專屬分享列 */}
                            <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                              <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base shrink-0">
                                  🔗
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                    本直播課堂專屬獨立網址
                                  </div>
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate select-all">
                                    {getStreamStandaloneUrl(activeStream.id)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleCopyStreamUrl(activeStream.id)}
                                  className="flex-1 sm:flex-initial bg-black dark:bg-white text-white dark:text-black text-xs font-medium px-4 py-2 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition cursor-pointer shadow-xs active:scale-95"
                                >
                                  📋 複製獨立網址
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleLikeStream(activeStream.id)}
                                  className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer active:scale-95 shadow-xs"
                                >
                                  <span>❤️</span>
                                  <span>{activeStream.likes || 0} 個讚</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 右側：即時聊天室與課堂問答 (1欄) */}
                          <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 sm:p-4 flex flex-col h-[460px] sm:h-[540px] shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2.5 mb-2.5 shrink-0">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                                <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                  即時課堂討論與發問 ({streamMessages.length})
                                </h3>
                              </div>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {activeStream.viewers || 1} 人在線
                              </span>
                            </div>

                            {/* 訊息滾動區 */}
                            <div
                              ref={streamChatBoxRef}
                              className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-2.5 pr-1.5 mb-2.5 flex flex-col min-w-0"
                            >
                              {streamMessages.map((m) => {
                                const isSelf = m.username === activeUserName;
                                const isQuestion = !!m.isQuestion;
                                const timeStr = new Date(m.createdAt).toLocaleTimeString('zh-TW', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                });
                                return (
                                  <div
                                    key={m.id}
                                    className={`p-2.5 rounded-xl text-xs transition border ${
                                      isQuestion
                                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                                        : isSelf
                                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1 mb-1 text-[10px]">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-gray-800 dark:text-gray-200">
                                          {m.nickname || m.username}
                                        </span>
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                                            m.role === 'admin'
                                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                              : m.role === 'tutor'
                                              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                          }`}
                                        >
                                          {m.role === 'admin' ? '👑 管理員' : m.role === 'tutor' ? '🎓 小老師' : '🎒 學員'}
                                        </span>
                                        {isQuestion && (
                                          <span className="bg-amber-500 text-white font-bold text-[9px] px-1.5 rounded-full animate-pulse">
                                            ❓ 提問
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 text-gray-400">
                                        <span>{timeStr}</span>
                                        {(isAdmin || activeUserName === activeStream.broadcaster) && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteStreamMessage(activeStream.id, m.id)}
                                            className="inline-flex items-center p-1 text-red-500 hover:text-red-700 rounded transition cursor-pointer"
                                            title="刪除此留言"
                                          >
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                                      {m.content}
                                    </p>
                                  </div>
                                );
                              })}
                              {streamMessages.length === 0 && (
                                <p className="text-xs text-gray-400 text-center my-auto">
                                  歡迎加入直播課堂！有任何問題或想法，隨時在此留言或點擊提問。
                                </p>
                              )}
                            </div>

                            {/* 輸入留言與發問列 */}
                            <div className="space-y-2 shrink-0">
                              <div className="flex items-center justify-between">
                                <label className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={streamIsQuestion}
                                    onChange={(e) => setStreamIsQuestion(e.target.checked)}
                                    className="rounded text-amber-600"
                                  />
                                  <span>❓ 標註為課堂提問 (醒目標籤)</span>
                                </label>
                              </div>

                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={streamChatInput}
                                  onChange={(e) => setStreamChatInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSendStreamMessage()}
                                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:border-red-500 dark:focus:border-red-400 text-gray-900 dark:text-gray-100"
                                  placeholder={streamIsQuestion ? "請輸入您想向老師提問的問題..." : "輸入留言參與即時互動討論..."}
                                />
                                <button
                                  type="button"
                                  onClick={handleSendStreamMessage}
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shrink-0 shadow-xs active:scale-95"
                                >
                                  發送
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. 成績登記 (Grades) */}
                {activeTab === 'grades' && (
                  <div id="tab-grades" className="space-y-6 max-w-2xl mx-auto">
                    <h2 className="text-2xl font-light tracking-wide text-gray-900 dark:text-white mb-6 text-center">
                      學員成績登記與管理
                    </h2>
                    <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-5 rounded-lg space-y-3">
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">填入您的成績</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select
                          value={gradeSubject}
                          onChange={(e) => setGradeSubject(e.target.value)}
                          className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                        >
                          {SUBJECT_LIST.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={gradeRange}
                          onChange={(e) => setGradeRange(e.target.value)}
                          className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-black dark:focus:border-white text-gray-900 dark:text-gray-100"
                          placeholder=""
                        />
                        <input
                          type="number"
                          value={gradeScore}
                          onChange={(e) => setGradeScore(e.target.value)}
                          className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-black dark:focus:border-white text-gray-900 dark:text-gray-100"
                          placeholder=""
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSubmitGrade}
                        className="w-full bg-black dark:bg-white text-white dark:text-black text-xs font-medium py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition cursor-pointer"
                      >
                        送出成績
                      </button>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-4 sm:p-5 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                          成績記錄與統計
                        </p>
                        <button
                          type="button"
                          onClick={loadGrades}
                          className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white underline cursor-pointer"
                        >
                          重新整理
                        </button>
                      </div>
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="p-2">學員</th>
                              <th className="p-2">科目</th>
                              <th className="p-2">範圍</th>
                              <th className="p-2">成績</th>
                              <th className="p-2">時間</th>
                              {isAdmin && <th className="p-2">操作</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {grades.map((g) => {
                              const dateStr = new Date(g.created_at).toLocaleDateString('zh-TW');
                              return (
                                <tr
                                  key={g.id}
                                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                                >
                                  <td className="p-2 font-medium">{g.username}</td>
                                  <td className="p-2">{g.subject}</td>
                                  <td className="p-2">{g.range_text}</td>
                                  <td
                                    className={`p-2 font-bold ${
                                      g.score >= 60 ? 'text-green-600' : 'text-red-500'
                                    }`}
                                  >
                                    {g.score}
                                  </td>
                                  <td className="p-2 text-gray-400 text-[10px]">{dateStr}</td>
                                  {isAdmin && (
                                    <td className="p-2">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteGrade(g.id)}
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/15 border border-red-200/70 dark:border-red-900/50 px-2.5 py-0.5 rounded-md transition shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                                        title="刪除成績紀錄"
                                      >
                                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>刪除</span>
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                            {grades.length === 0 && (
                              <tr>
                                <td colSpan={isAdmin ? 6 : 5} className="p-3 text-center text-gray-400">
                                  尚無成績記錄
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. 設定 (Settings) - 包含：使用者管理面板(加入/看密碼/改密碼/登入紀錄/小老師) + 全站文字編輯 */}
                {activeTab === 'settings' && (
                  <div id="tab-settings" className="space-y-6 max-w-4xl mx-auto">
                    <h2 className="text-2xl font-light tracking-wide text-gray-900 dark:text-white mb-4 text-center">
                      帳戶與系統管理中心
                    </h2>

                    {/* 當前個人使用者資訊 */}
                    <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-5 rounded-lg space-y-2">
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">當前使用者資訊</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        登入帳號：<span className="font-mono text-gray-600 dark:text-gray-400">{activeUserName}</span>
                      </p>
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        目前暱稱：
                        <span className="text-black dark:text-white font-medium ml-1">
                          {currentUser?.nickname || '尚未設定'}
                        </span>
                      </p>
                      {currentUser?.isTutor && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                          🎓 小老師身分：{currentUser.tutorSubjects?.join('、')} 小老師
                        </p>
                      )}
                    </div>

                    {/* 佈景主題外觀切換 (亮色模式 / 深色模式) */}
                    <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-5 rounded-lg space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">佈景主題外觀切換</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            當前模式：<span className="font-semibold text-black dark:text-white">{isDark ? '🌙 深色模式 (Dark Mode)' : '☀️ 亮色模式 (Light Mode)'}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsDark(false)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                              !isDark
                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <span>☀️</span>
                            <span>亮色模式</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsDark(true)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                              isDark
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <span>🌙</span>
                            <span>深色模式</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 生物辨識設定 */}
                    <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-5 rounded-lg space-y-3">
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                        生物辨識設定 (Touch ID / Face ID / Windows Hello)
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        綁定後，您下次即可直接使用本機的生物辨識快速登入此帳號。
                      </p>
                      <button
                        type="button"
                        onClick={registerBiometric}
                        className="w-full bg-gray-800 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white text-xs font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>🛡️</span> 綁定此裝置的生物辨識
                      </button>
                      {bioSetupMsg && (
                        <p className="text-center text-xs text-green-600 dark:text-green-400 font-medium">
                          {bioSetupMsg}
                        </p>
                      )}
                    </div>

                    {/* ==================== 管理員專屬：加入使用者面板與使用者管理中心 ==================== */}
                    {isAdmin && (
                      <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-5 rounded-xl space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                              <span>👥 使用者管理中心</span>
                              <span className="text-[11px] bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full font-normal">
                                加入使用者 / 查看密碼 / 修改密碼 / 登入紀錄 / 小老師
                              </span>
                            </h3>
                          </div>
                          {/* 伺服器修復模式切換 */}
                          <button
                            type="button"
                            onClick={handleToggleMaintenance}
                            className={`text-xs px-3 py-1 rounded font-medium transition cursor-pointer ${
                              siteConfig.maintenance_mode
                                ? 'bg-red-600 text-white animate-pulse'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {siteConfig.maintenance_mode ? '🔧 修復模式: 開啟中' : '🔧 伺服器修復模式: 關閉'}
                          </button>
                        </div>

                        {/* A. 加入使用者面板 (Add User Panel) */}
                        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span>➕ 加入新使用者 / 學生 / 小老師</span>
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">帳號名稱</label>
                              <input
                                type="text"
                                value={newAdminUsername}
                                onChange={(e) => setNewAdminUsername(e.target.value)}
                                className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">初始密碼</label>
                              <input
                                type="text"
                                value={newAdminPassword}
                                onChange={(e) => setNewAdminPassword(e.target.value)}
                                className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">姓名 / 暱稱 (選填)</label>
                              <input
                                type="text"
                                value={newAdminNickname}
                                onChange={(e) => setNewAdminNickname(e.target.value)}
                                className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-4">
                              <label className="flex items-center text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newAdminMustChangePw}
                                  onChange={(e) => setNewAdminMustChangePw(e.target.checked)}
                                  className="mr-1.5"
                                />
                                首次登入強制改密碼
                              </label>

                              <label className="flex items-center text-xs text-purple-600 dark:text-purple-400 font-medium cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newAdminIsTutor}
                                  onChange={(e) => setNewAdminIsTutor(e.target.checked)}
                                  className="mr-1.5"
                                />
                                指派為小老師
                              </label>

                              {newAdminIsTutor && (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="text-[10px] text-gray-500">科別:</span>
                                  <select
                                    value={newAdminTutorSubject}
                                    onChange={(e) => setNewAdminTutorSubject(e.target.value)}
                                    className="p-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs"
                                  >
                                    {SUBJECT_LIST.map((s) => (
                                      <option key={s} value={s}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={handleAdminCreateUser}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2 rounded-lg transition shadow-sm cursor-pointer ml-auto"
                            >
                              建立並加入使用者
                            </button>
                          </div>

                          {adminAddUserMsg && (
                            <p
                              className={`text-center text-xs pt-1 ${
                                adminAddUserMsg.isError ? 'text-red-500' : 'text-green-600 dark:text-green-400 font-medium'
                              }`}
                            >
                              {adminAddUserMsg.text}
                            </p>
                          )}
                        </div>

                        {/* B. 使用者清單與管理：查看密碼、修改密碼、登入紀錄、指定小老師 */}
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                              <span>全體使用者清單</span>
                              <span className="text-[10px] text-gray-400 font-normal">
                                （共 {adminUsers.length} 位用戶，含即時在線與登入紀錄）
                              </span>
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={toggleAllPasswordsVisibility}
                                className="bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer font-medium"
                              >
                                <span>{allPasswordsVisible ? '🙈 一鍵隱藏全體密碼' : '👁️ 一鍵查看全體密碼'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={loadAdminUsers}
                                className="text-gray-500 hover:text-black dark:hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                              >
                                🔄 重新整理
                              </button>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
                            <table className="w-full text-left text-xs min-w-[700px]">
                              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                  <th className="p-3">帳號 / 身分</th>
                                  <th className="p-3">密碼管理 (查看/修改)</th>
                                  <th className="p-3">登入與上線紀錄</th>
                                  <th className="p-3 text-right">管理操作</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {adminUsers.map((u) => {
                                  const isPwVisible = !!visiblePasswords[u.username];
                                  const loginTimeStr = u.last_login
                                    ? new Date(u.last_login).toLocaleString('zh-TW', {
                                        month: 'numeric',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : '尚未登入';
                                  const createdTimeStr = u.created_at
                                    ? new Date(u.created_at).toLocaleDateString('zh-TW')
                                    : '未知';

                                  return (
                                    <tr key={u.username} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                                      <td className="p-3">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                              u.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                                            }`}
                                            title={u.isOnline ? '🟢 即時在線中' : '⚪ 離線'}
                                          ></span>
                                          <span className="font-bold text-gray-800 dark:text-gray-100">
                                            {u.username}
                                          </span>
                                          {u.nickname && (
                                            <span className="text-[11px] text-gray-500">({u.nickname})</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          {u.isAdmin ? (
                                            <span className="text-[9px] bg-black text-white px-1.5 py-0.5 rounded">
                                              最高管理員
                                            </span>
                                          ) : u.isTutor ? (
                                            <span className="text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded font-medium">
                                              🎓 {u.tutorSubjects?.join('/')} 小老師
                                            </span>
                                          ) : (
                                            <span className="text-[9px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                                              一般學員
                                            </span>
                                          )}
                                          {u.isBanned && (
                                            <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded">
                                              已封鎖
                                            </span>
                                          )}
                                          {u.must_change_password && (
                                            <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded">
                                              需改密碼
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* 密碼管理欄位：可直接查看密碼與修改密碼 */}
                                      <td className="p-3">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span
                                            onClick={() => {
                                              if (u.password) {
                                                navigator.clipboard?.writeText(u.password);
                                                showToast(`已複製【${u.username}】的密碼`, 'info');
                                              }
                                            }}
                                            className={`font-mono text-xs px-2.5 py-1 rounded-md border cursor-pointer select-all transition ${
                                              isPwVisible
                                                ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-bold'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                                            }`}
                                            title={isPwVisible ? '點擊可直接複製此密碼' : '點擊查看以顯示密碼'}
                                          >
                                            {isPwVisible ? u.password || '******' : '••••••••'}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => togglePasswordVisibility(u.username)}
                                            className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer text-xs"
                                            title={isPwVisible ? '隱藏密碼' : '查看密碼'}
                                          >
                                            {isPwVisible ? '🙈 隱藏' : '👁️ 查看'}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => openEditPasswordModal(u)}
                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 px-2 py-1 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer text-xs flex items-center gap-0.5"
                                            title="管理員直接為此用戶改密碼"
                                          >
                                            <span>🔑</span>
                                            <span>改密碼</span>
                                          </button>
                                        </div>
                                      </td>

                                      {/* 登入與活動紀錄欄位 */}
                                      <td className="p-3">
                                        <div className="text-[11px] text-gray-700 dark:text-gray-300">
                                          最後登入: <span className="font-mono">{loginTimeStr}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                          建立日期: {createdTimeStr} | 狀態: {u.isOnline ? '🟢 在線' : '⚪ 離線'}
                                        </div>
                                      </td>

                                      {/* 管理操作按鈕群 */}
                                      <td className="p-3 text-right space-x-1.5">
                                        <button
                                          type="button"
                                          onClick={() => openTutorAssignModal(u)}
                                          className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] px-2.5 py-1 rounded transition cursor-pointer"
                                        >
                                          🎓 指派小老師
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => impersonate(u.username)}
                                          className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] px-2.5 py-1 rounded transition cursor-pointer"
                                        >
                                          👁️ 模擬登入
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => toggleBan(u.username, u.isBanned)}
                                          className={`${
                                            u.isBanned ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                                          } text-white text-[11px] px-2.5 py-1 rounded transition cursor-pointer`}
                                        >
                                          {u.isBanned ? '解封' : '🚫 Ban'}
                                        </button>
                                        {!u.isAdmin && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteUser(u.username)}
                                            className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/15 border border-red-200/70 dark:border-red-900/50 px-2 py-1 rounded-md transition shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                                            title="刪除學員帳號"
                                          >
                                            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            <span>刪除</span>
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* ==================== C. 全站所有功能文字與標題自訂中心 ==================== */}
                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                              <span>📝 全站所有功能顯示文字自訂中心</span>
                              <span className="text-[10px] text-gray-400 font-normal">
                                （各功能畫面文字皆可於此直接編輯並即時生效）
                              </span>
                            </p>
                            <button
                              type="button"
                              onClick={handleSaveAllEditableTexts}
                              className="bg-black dark:bg-white text-white dark:text-black text-xs font-semibold px-4 py-1.5 rounded-lg shadow-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition cursor-pointer"
                            >
                              💾 儲存所有文字設定
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                1. 網站首頁與瀏覽器標題 (Site Title)
                              </label>
                              <input
                                type="text"
                                value={editableTexts.site_title || ''}
                                onChange={(e) =>
                                  setEditableTexts((prev) => ({ ...prev, site_title: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                2. 首頁專屬空間主標語 (Welcome Hero Title)
                              </label>
                              <input
                                type="text"
                                value={editableTexts.welcome_hero_title || ''}
                                onChange={(e) =>
                                  setEditableTexts((prev) => ({ ...prev, welcome_hero_title: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                3. 網站版本號標籤 (Version Tag)
                              </label>
                              <input
                                type="text"
                                value={editableTexts.version_tag || ''}
                                onChange={(e) =>
                                  setEditableTexts((prev) => ({ ...prev, version_tag: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                4. 網站營運狀態標籤 (Status Tag)
                              </label>
                              <input
                                type="text"
                                value={editableTexts.status_tag || ''}
                                onChange={(e) =>
                                  setEditableTexts((prev) => ({ ...prev, status_tag: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                5. 頂部跑馬燈公告文字 (Marquee Announcement Text)
                              </label>
                              <input
                                type="text"
                                value={editableTexts.marquee_text || ''}
                                onChange={(e) =>
                                  setEditableTexts((prev) => ({ ...prev, marquee_text: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                6. 登入主標題 (支援 HTML)
                              </label>
                              <input
                                type="text"
                                value={editableTexts.login_title || ''}
                                onChange={(e) =>
                                  setEditableTexts((prev) => ({ ...prev, login_title: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                7. 登入副標題與說明文字
                              </label>
                              <textarea
                                rows={2}
                                value={editableTexts.login_desc || ''}
                                onChange={(e) =>
                                  setEditableTexts((prev) => ({ ...prev, login_desc: e.target.value }))
                                }
                                className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                8. 官方 LINE ID 代碼
                              </label>
                              <input
                                type="text"
                                value={editableTexts.line_id || ''}
                                onChange={(e) =>
                                  setEditableTexts((prev) => ({ ...prev, line_id: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                9. 官方 LINE 連結網址
                              </label>
                              <input
                                type="text"
                                value={editableTexts.line_url || ''}
                                onChange={(e) =>
                                  setEditableTexts((prev) => ({ ...prev, line_url: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                10. 官方 LINE 說明文案
                              </label>
                              <input
                                type="text"
                                value={editableTexts.line_desc || ''}
                                onChange={(e) =>
                                  setEditableTexts((prev) => ({ ...prev, line_desc: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                11. 伺服器修復模式公告說明文字
                              </label>
                              <input
                                type="text"
                                value={editableTexts.maintenance_message || ''}
                                onChange={(e) =>
                                  setEditableTexts((prev) => ({ ...prev, maintenance_message: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                12. 系統幫助頁面內容 (Help Text)
                              </label>
                              <textarea
                                rows={3}
                                value={editableTexts.help_text || ''}
                                onChange={(e) =>
                                  setEditableTexts((prev) => ({ ...prev, help_text: e.target.value }))
                                }
                                className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                13. 版本與全功能介紹內容 (Version Intro Text)
                              </label>
                              <textarea
                                rows={4}
                                value={editableTexts.version_intro_text || ''}
                                onChange={(e) =>
                                  setEditableTexts((prev) => ({ ...prev, version_intro_text: e.target.value }))
                                }
                                className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                                14. 頁尾版權與標示 (Footer Text)
                              </label>
                              <input
                                type="text"
                                value={editableTexts.footer_text || ''}
                                onChange={(e) =>
                                  setEditableTexts((prev) => ({ ...prev, footer_text: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleSaveAllEditableTexts}
                            className="w-full bg-black dark:bg-white text-white dark:text-black text-xs font-semibold py-2.5 rounded-lg shadow-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition cursor-pointer"
                          >
                            💾 確認儲存全站文字變更
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 建立與修改暱稱 */}
                    <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-5 rounded-lg space-y-3">
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">建立與修改暱稱</p>
                      <div>
                        <input
                          type="text"
                          value={settingNickname}
                          onChange={(e) => setSettingNickname(e.target.value)}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-black dark:focus:border-white transition mb-2 text-gray-900 dark:text-gray-100"
                          placeholder=""
                        />
                        <button
                          type="button"
                          onClick={handleUpdateNickname}
                          className="w-full bg-black dark:bg-white text-white dark:text-black text-xs font-medium py-2 px-4 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition cursor-pointer"
                        >
                          儲存暱稱
                        </button>
                      </div>
                    </div>

                    {/* 更改密碼 - NO PLACEHOLDER */}
                    <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-5 rounded-lg space-y-3">
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">更改密碼</p>
                      <div>
                        <input
                          type="password"
                          value={settingNewPw}
                          onChange={(e) => setSettingNewPw(e.target.value)}
                          onFocus={() => setIsShy(true)}
                          onBlur={() => setIsShy(false)}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-black dark:focus:border-white transition mb-2 text-gray-900 dark:text-gray-100"
                          placeholder=""
                        />

                        <div className="mb-3 space-y-1">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${settingPwStrength.color}`}
                              style={{ width: `${settingPwStrength.score}%` }}
                            ></div>
                          </div>
                          <p
                            className={`text-[10px] ${
                              settingPwStrength.valid ? 'text-green-600 font-medium' : 'text-gray-400'
                            }`}
                          >
                            強度： {settingPwStrength.text} (至少 8 碼，須含大小寫英文及數字)
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleUpdatePassword}
                          className="w-full bg-black dark:bg-white text-white dark:text-black text-xs font-medium py-2 px-4 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition cursor-pointer"
                        >
                          確認變更密碼
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. 問題發問 (FAQ) - LINE 模式 + 即時排序第一名 */}
                {activeTab === 'faq' && (
                  <div id="tab-faq" className="space-y-4 sm:space-y-6 max-w-5xl mx-auto w-full min-w-0">
                    <div className="text-center mb-2">
                      <h2 className="text-xl sm:text-3xl font-light tracking-wide text-gray-900 dark:text-white">
                        問題與即時客服發問
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full min-w-0">
                      {/* 官方 LINE 諮詢卡片 (防跑版響應式設計) */}
                      <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center text-center h-[340px] sm:h-[440px] w-full min-w-0 overflow-hidden">
                        {/* LINE 官方正版圖標 (使用用戶上傳之高畫質官方圖片，防跑版設計) */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 mb-3 flex items-center justify-center">
                          <img
                            src="/assets/aistudio/IMG_0838_7073c21c.png"
                            alt="LINE Official"
                            className="w-full h-full object-contain rounded-2xl shadow-md transition hover:scale-105 duration-200"
                          />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5 shrink-0">
                          加入 LINE 官方帳號
                        </h3>
                        <div className="my-1 shrink-0 max-w-full px-2">
                          <span className="inline-block text-xs font-mono font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/60 px-3 py-1 rounded-full border border-green-200 dark:border-green-800 break-all">
                            LINE ID：{siteConfig.line_id || '@682knyxn'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 max-w-xs px-2 break-words">
                          {siteConfig.line_desc || '獲得即時一對一解答與講義更新通知！'}
                        </p>
                        <a
                          href={siteConfig.line_url || 'https://line.me'}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-[#06c755] hover:bg-[#05b34c] text-white text-xs font-semibold py-2.5 px-6 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-2 shrink-0"
                        >
                          <img
                            src="/assets/aistudio/IMG_0838_7073c21c.png"
                            alt="LINE"
                            className="w-4 h-4 object-contain rounded-xs shrink-0"
                          />
                          <span>點擊加 LINE 好友</span>
                        </a>
                      </div>

                      {/* 學員端 LINE 仿造聊天框 */}
                      <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 flex flex-col justify-between h-[420px] sm:h-[440px] w-full min-w-0 overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
                            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              線上問題諮詢室 (LINE 模式)
                            </h3>
                          </div>
                          <span className="text-[10px] text-gray-400">當科小老師與管理員同步在線</span>
                        </div>

                        <div
                          ref={userFaqBoxRef}
                          className="flex-1 bg-[#86a8c7]/25 dark:bg-[#111b21] border border-gray-200/80 dark:border-gray-700/80 rounded-xl p-3 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-3 mb-2 flex flex-col min-w-0 shadow-inner"
                        >
                          {allFaqMessages
                            .filter((m) => m.username === activeUserName)
                            .map((m) => {
                              const timeStr = new Date(m.created_at).toLocaleTimeString('zh-TW', {
                                hour: '2-digit',
                                minute: '2-digit',
                              });
                              const isSelf = m.sender === activeUserName;
                              return (
                                <div
                                  key={m.id}
                                  className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} my-1 group`}
                                >
                                  <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-gray-500 dark:text-gray-400">
                                    <span className="font-medium">
                                      {isSelf
                                        ? m.sender
                                        : m.sender_role === 'tutor'
                                        ? `🎓 ${m.tutor_subject || ''}小老師 (${m.sender})`
                                        : '👑 客服管理員'}
                                    </span>
                                    <span>•</span>
                                    <span>{timeStr}</span>
                                    {isSelf && <span className="text-green-600 font-bold">已讀</span>}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFaqMessage(m.id)}
                                      className="inline-flex items-center gap-0.5 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 p-1 rounded transition cursor-pointer"
                                      title="刪除此訊息"
                                    >
                                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                  <div
                                    className={`max-w-[85%] rounded-2xl p-2.5 text-xs break-words shadow-sm ${
                                      isSelf
                                        ? 'bg-[#85e249] text-gray-900 rounded-tr-none'
                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-none'
                                    }`}
                                  >
                                    <div className="text-[9px] opacity-75 mb-0.5 font-mono">[{m.subject || '全科'}]</div>
                                    <p className="whitespace-pre-wrap">{m.content}</p>
                                  </div>
                                </div>
                              );
                            })}
                          {allFaqMessages.filter((m) => m.username === activeUserName).length === 0 && (
                            <p className="text-xs text-gray-400 text-center my-auto">
                              歡迎在此發問！請選擇科目並輸入問題，管理員與該科小老師將第一時間為您解答。
                            </p>
                          )}
                        </div>

                        {/* 輸入發送列 */}
                        <div className="space-y-1.5 shrink-0">
                          <div className="flex gap-1.5 items-center">
                            <span className="text-[10px] text-gray-500 shrink-0">選擇科目:</span>
                            <select
                              value={userFaqSubject}
                              onChange={(e) => setUserFaqSubject(e.target.value)}
                              className="p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs"
                            >
                              {SUBJECT_LIST.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-1.5">
                            <textarea
                              rows={2}
                              value={userFaqInput}
                              onChange={(e) => setUserFaqInput(e.target.value)}
                              className="flex-1 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-black dark:focus:border-white resize-none text-gray-900 dark:text-gray-100"
                              placeholder=""
                            ></textarea>
                            <button
                              type="button"
                              onClick={handleSubmitUserFaq}
                              className="bg-[#06c755] hover:bg-[#05b34c] text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm cursor-pointer shrink-0"
                            >
                              傳送
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 管理員與當科小老師客服對話中心 (最新發問排在第一名) */}
                    {(isAdmin || isTutor) && (
                      <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-3 sm:p-6 rounded-xl space-y-3 w-full min-w-0">
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">👑</span>
                            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                              【問題解答中心】管理員與小老師即時回覆
                            </h3>
                          </div>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                            最新發問用戶自動置頂排在第一名
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-[480px] relative overflow-hidden w-full min-w-0">
                          {/* 左側學員對話列表：最新發問排序第一名 */}
                          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-y-auto custom-scrollbar p-2 space-y-1 h-full w-full">
                            <p className="text-xs font-semibold text-gray-400 p-1.5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                              <span>發問學員列表：</span>
                              <span className="text-[10px] text-gray-400">最新在最前</span>
                            </p>
                            {sortedStudentFaqUsers.map((uname, index) => {
                              const info = studentFaqMap.get(uname)!;
                              const isActive = selectedAdminChatUser === uname;
                              const targetUser = adminUsers.find((u) => u.username === uname);
                              const isOnline = !!targetUser?.isOnline;
                              const timeStr = new Date(info.latestMsg.created_at).toLocaleTimeString('zh-TW', {
                                hour: '2-digit',
                                minute: '2-digit',
                              });

                              return (
                                <button
                                  key={uname}
                                  type="button"
                                  onClick={() => {
                                    setSelectedAdminChatUser(uname);
                                    setAdminMobileChatOpen(true);
                                  }}
                                  className={`w-full text-left p-2.5 rounded-lg text-xs transition flex flex-col gap-1 cursor-pointer border ${
                                    isActive
                                      ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-400 dark:border-blue-700 font-semibold text-blue-900 dark:text-blue-200'
                                      : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  <div className="flex justify-between items-center w-full">
                                    <div className="flex items-center gap-1.5">
                                      {index === 0 && (
                                        <span className="bg-red-500 text-white text-[9px] px-1 rounded font-bold">
                                          TOP 1
                                        </span>
                                      )}
                                      <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                          isOnline ? 'bg-green-500' : 'bg-gray-300'
                                        }`}
                                      ></span>
                                      <span className="font-bold">{uname}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400">{timeStr}</span>
                                  </div>
                                  <div className="flex justify-between items-center w-full text-[10px] text-gray-500 dark:text-gray-400">
                                    <span className="truncate max-w-[150px]">{info.latestMsg.content}</span>
                                    <span className="bg-blue-100 dark:bg-blue-950 text-blue-600 px-1 rounded text-[9px]">
                                      {info.latestMsg.subject || '全科'}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                            {sortedStudentFaqUsers.length === 0 && (
                              <p className="text-xs text-gray-400 p-4 text-center">尚無任何學員發問訊息</p>
                            )}
                          </div>

                          {/* 右側對話面板 (仿 LINE 聊天視窗) */}
                          <div
                            className={`${
                              adminMobileChatOpen ? 'flex' : 'hidden md:flex'
                            } md:col-span-2 bg-[#86a8c7]/20 dark:bg-[#111b21] border border-gray-200 dark:border-gray-700 rounded-lg flex-col justify-between p-3 h-full absolute inset-0 md:relative z-10 md:z-auto min-w-0 overflow-hidden shadow-inner`}
                          >
                            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2 mb-2 bg-white/70 dark:bg-gray-800/70 p-2 rounded-lg">
                              <button
                                type="button"
                                onClick={() => setAdminMobileChatOpen(false)}
                                className="md:hidden flex items-center text-xs text-gray-600 dark:text-gray-400 font-medium hover:text-black dark:hover:text-white cursor-pointer"
                              >
                                <span className="mr-1">←</span> 返回名單
                              </button>
                              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 ml-auto md:ml-0">
                                {selectedAdminChatUser ? `與學員【${selectedAdminChatUser}】對話` : '尚未選擇學員'}
                              </span>
                              {selectedAdminChatUser && (
                                <button
                                  type="button"
                                  onClick={() => handleClearUserFaq(selectedAdminChatUser)}
                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/15 border border-red-200/70 dark:border-red-900/50 px-2 py-0.5 rounded-md transition shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer ml-auto"
                                >
                                  <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <span>清空對話</span>
                                </button>
                              )}
                            </div>

                            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-3 p-3 rounded-lg mb-2 flex flex-col min-w-0">
                              {selectedAdminChatUser ? (
                                allFaqMessages
                                  .filter((m) => m.username === selectedAdminChatUser)
                                  .map((m) => {
                                    const timeStr = new Date(m.created_at).toLocaleTimeString('zh-TW', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    });
                                    const isFromStaff = m.is_admin_reply;
                                    return (
                                      <div
                                        key={m.id}
                                        className={`flex flex-col ${
                                          isFromStaff ? 'items-end' : 'items-start'
                                        } my-1 group`}
                                      >
                                        <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-gray-500">
                                          <span>
                                            {m.sender_role === 'tutor'
                                              ? `🎓 ${m.tutor_subject || ''}小老師 (${m.sender})`
                                              : isFromStaff
                                              ? '👑 客服管理員'
                                              : m.sender}
                                          </span>
                                          <span>•</span>
                                          <span>{timeStr}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteFaqMessage(m.id)}
                                            className="inline-flex items-center gap-0.5 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 p-1 rounded transition cursor-pointer"
                                            title="刪除此訊息"
                                          >
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </div>
                                        <div
                                          className={`max-w-[85%] rounded-2xl p-2.5 text-xs break-words shadow-sm ${
                                            isFromStaff
                                              ? 'bg-[#85e249] text-gray-900 rounded-tr-none'
                                              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-none'
                                          }`}
                                        >
                                          <div className="text-[9px] opacity-75 mb-0.5 font-mono">
                                            [{m.subject || '全科'}]
                                          </div>
                                          <p className="whitespace-pre-wrap">{m.content}</p>
                                        </div>
                                      </div>
                                    );
                                  })
                              ) : (
                                <p className="text-xs text-gray-400 text-center my-auto">
                                  請從左側名單選擇學員開始回覆解答
                                </p>
                              )}
                            </div>

                            {selectedAdminChatUser && (
                              <div className="flex gap-2 shrink-0 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                                <input
                                  type="text"
                                  value={adminReplyInput}
                                  onChange={(e) => setAdminReplyInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSendAdminReply()}
                                  className="flex-1 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-black dark:focus:border-white text-gray-900 dark:text-gray-100"
                                  placeholder=""
                                />
                                <button
                                  type="button"
                                  onClick={handleSendAdminReply}
                                  className="bg-[#06c755] hover:bg-[#05b34c] text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm cursor-pointer shrink-0"
                                >
                                  傳送回覆
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. 幫助 (Help) */}
                {activeTab === 'help' && (
                  <div id="tab-help" className="space-y-6 max-w-3xl mx-auto">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl sm:text-3xl font-light tracking-wide text-gray-900 dark:text-white">
                        系統幫助與說明
                      </h2>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8 space-y-4">
                      <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed min-h-[160px] whitespace-pre-wrap bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        {siteConfig.help_text || '目前尚無說明內容。'}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. 版本介紹 (Version) */}
                {activeTab === 'version' && (
                  <div id="tab-version" className="space-y-6 max-w-3xl mx-auto">
                    <div className="text-center mb-6">
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-[22%] bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 p-1 shadow-2xl flex items-center justify-center border border-white/30 backdrop-blur-md">
                        <div className="w-full h-full rounded-[20%] bg-gradient-to-b from-white/20 via-white/5 to-transparent flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                          <div className="absolute -top-12 -left-12 w-24 h-24 bg-white/20 rounded-full blur-lg"></div>
                          <svg
                            className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-lg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <rect x="2" y="2" width="20" height="20" rx="5" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />
                            <circle cx="12" cy="12" r="7" strokeWidth="1.5" opacity="0.8" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v8m-4-4h8" />
                          </svg>
                          <span className="text-[9px] text-white/80 font-mono font-bold tracking-widest mt-1 uppercase">
                            iOS ARCH
                          </span>
                        </div>
                      </div>

                      <h2 className="text-xl sm:text-3xl font-light tracking-wide text-gray-900 dark:text-white mb-2">
                        網站版本與全功能介紹
                      </h2>
                      <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-3 py-1 rounded-full">
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">當前版本：</span>
                        <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300">
                          {siteConfig.version_tag || 'v.0.0.1 Beta 3'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-8 space-y-4">
                      <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed min-h-[220px] whitespace-pre-wrap bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        {siteConfig.version_intro_text || '載入版本與功能介紹中...'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-gray-300 dark:text-gray-600 font-light shrink-0 pt-2">
                {siteConfig.footer_text || 'My Website System'} - <span>{siteConfig.version_tag || 'v.0.0.1 Beta 3'}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================== 5. TUTOR APPOINTMENT MODAL ==================== */}
      {tutorModalUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              🎓 指派【{tutorModalUser.username}】為小老師
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              勾選指派的學科小老師身分，該學員將有權限發布當科講義並在問答中心為學員解答：
            </p>

            <div className="space-y-2 mb-6">
              {SUBJECT_LIST.map((subj) => {
                const checked = tutorSelectedSubjects.includes(subj);
                return (
                  <label
                    key={subj}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 cursor-pointer"
                  >
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{subj} 小老師</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTutorSelectedSubjects((prev) => [...prev, subj]);
                        } else {
                          setTutorSelectedSubjects((prev) => prev.filter((s) => s !== subj));
                        }
                      }}
                      className="rounded text-purple-600"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTutorModalUser(null)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200 text-xs py-2 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveTutor}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2 rounded-lg transition cursor-pointer"
              >
                確認儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 6. ADMIN EDIT USER PASSWORD MODAL ==================== */}
      {editPwUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              🔑 修改學員【{editPwUser.username}】的密碼
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              管理員可直接為此學員指定一組新密碼，更新後該學員下次即可使用新密碼登入：
            </p>

            <div className="mb-4">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">新密碼</label>
              <input
                type="text"
                value={adminNewUserPw}
                onChange={(e) => setAdminNewUserPw(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                placeholder=""
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditPwUser(null)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200 text-xs py-2 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmitAdminUserPassword}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition cursor-pointer"
              >
                確認修改密碼
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 7. FILE PREVIEW MODAL ==================== */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
          <div className="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gray-900 text-white shrink-0">
              <div className="text-sm sm:text-base font-medium truncate max-w-[200px] sm:max-w-md">
                {previewTitle}
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex items-center space-x-1 bg-gray-800 px-2 py-1 rounded text-xs">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="hover:bg-gray-700 px-2 py-0.5 rounded text-white font-bold cursor-pointer"
                    title="縮小"
                  >
                    -
                  </button>
                  <span className="px-1.5 font-mono text-gray-300 text-[11px] sm:text-xs">{previewZoom}%</span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="hover:bg-gray-700 px-2 py-0.5 rounded text-white font-bold cursor-pointer"
                    title="放大"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomReset}
                    className="hover:bg-gray-700 px-2 py-0.5 rounded text-gray-400 text-[10px] cursor-pointer hidden sm:inline-block"
                    title="還原預設"
                  >
                    重設
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadFile}
                  className="px-2.5 sm:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm rounded-md transition flex items-center space-x-1 cursor-pointer"
                >
                  <span>下載</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewModalOpen(false);
                    setPreviewPdfDoc(null);
                    setPreviewUrl('');
                  }}
                  className="text-gray-300 hover:text-white text-lg sm:text-xl px-1.5 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-200 dark:bg-gray-900 flex flex-col items-center relative overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar">
              {previewIsImage ? (
                <img
                  src={previewUrl}
                  alt={previewTitle}
                  style={{ transform: `scale(${previewZoom / 100})` }}
                  className="transition-transform duration-150 rounded shadow origin-center my-auto max-w-full"
                />
              ) : (
                <div ref={pdfContainerRef} className="flex flex-col items-center space-y-4 w-full"></div>
              )}

              {previewLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/85 dark:bg-gray-900/85 z-20">
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                    正在載入講義，請稍候...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 8. CREATE LIVE STREAM MODAL ==================== */}
      {createStreamModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📹</span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  開啟新線上直播課堂
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateStreamModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              管理員與小老師可自由選擇 YouTube 直播或內建直播（具備獨立房間網址、視訊螢幕分享與電子講課白板）。
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  直播課堂標題 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newStreamTitle}
                  onChange={(e) => setNewStreamTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:border-red-500 text-gray-900 dark:text-gray-100"
                  placeholder="例如：【會考衝刺】國中會考數學核心重點複習"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    指定學科
                  </label>
                  <select
                    value={newStreamSubject}
                    onChange={(e) => setNewStreamSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                  >
                    {SUBJECT_LIST.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    直播方式
                  </label>
                  <select
                    value={newStreamType}
                    onChange={(e) => setNewStreamType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                  >
                    <option value="builtin">🎥 內建直播 (推薦)</option>
                    <option value="youtube">📺 YouTube 直播</option>
                  </select>
                </div>
              </div>

              {newStreamType === 'youtube' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    YouTube 影片連結或直播代碼 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStreamYoutubeUrl}
                    onChange={(e) => setNewStreamYoutubeUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:border-red-500 text-gray-900 dark:text-gray-100 font-mono"
                    placeholder="https://www.youtube.com/watch?v=... 或 https://youtu.be/..."
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    可輸入公開或不公開的 YouTube 直播或影片連結，系統將自動解析嵌入。
                  </p>
                </div>
              ) : (
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                    <span>🌟 內建直播課堂功能特點</span>
                  </div>
                  <ul className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
                    <li>自動生成專屬獨立房間網址（學員點擊直達）</li>
                    <li>支援瀏覽器相機廣播、麥克風語音與螢幕桌面分享</li>
                    <li>內建彩色電子講課白板與即時清除功能</li>
                  </ul>

                  <div>
                    <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                      自訂外部串流網址 (選填，如 HLS .m3u8 或專屬伺服器推流網址)
                    </label>
                    <input
                      type="text"
                      value={newStreamCustomUrl}
                      onChange={(e) => setNewStreamCustomUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono"
                      placeholder="https://example.com/live/stream.m3u8 (選填)"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newStreamAllowChat}
                        onChange={(e) => setNewStreamAllowChat(e.target.checked)}
                        className="mr-1.5 rounded text-red-600"
                      />
                      啟用課堂即時聊天室
                    </label>

                    <label className="flex items-center text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newStreamWhiteboard}
                        onChange={(e) => setNewStreamWhiteboard(e.target.checked)}
                        className="mr-1.5 rounded text-red-600"
                      />
                      啟用講課白板
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setCreateStreamModalOpen(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-xs font-medium py-2.5 rounded-xl transition cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateStream}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-semibold py-2.5 rounded-xl shadow-md transition cursor-pointer active:scale-95"
              >
                🚀 立即開啟直播
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
