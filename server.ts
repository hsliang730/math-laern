import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
const SAMPLES_DIR = path.resolve(__dirname, 'public/samples');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(SAMPLES_DIR)) fs.mkdirSync(SAMPLES_DIR, { recursive: true });

// Minimal valid single-page sample PDF so PDF.js can preview immediately
const samplePdfPath = path.resolve(SAMPLES_DIR, 'math_sample.pdf');
if (!fs.existsSync(samplePdfPath)) {
  const minimalPdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 110 >>
stream
BT
/F1 24 Tf
100 700 Td
(High School Mathematics - Unit 1 Overview) Tj
/F1 14 Tf
0 -40 Td
(Cloud Storage Enabled - Handout Preview Verified) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000407 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
485
%%EOF`;
  fs.writeFileSync(samplePdfPath, minimalPdfContent, 'utf-8');
}

const defaultIntro = `【我的網站 - 全功能簡介與版本說明】

🔹 1. 安全身分驗證與個人化
   - 支援深色與亮色模式。
   - 靈動幾何角色與互動眼球。
   - 支援生物辨識登入。

🔹 2. 小老師與科目分科制度
   - 管理員可指派各學科小老師 (數學、物理、化學、英文、國文)。
   - 小老師可上傳與發布當科講義。
   - 發問聊天支援科目標籤，當科小老師與管理員均可直接在 LINE 模式中回覆。

🔹 3. 伺服器修復模式
   - 管理員可一鍵開啟伺服器修復維護，關閉一般功能保護資料。

🔹 4. 即時在線監控
   - 管理員可即時查看成員上線狀態 (🟢 在線 / ⚪ 離線)。`;

const initialDb = {
  users: [
    {
      username: 'hsliang-admin',
      password: 'admin123',
      nickname: '系統管理員',
      isAdmin: true,
      isTutor: false,
      tutorSubjects: [],
      must_change_password: false,
      isBanned: false,
      last_login: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ],
  site_config: {
    login_title: '歡迎來到<br><span class="font-normal text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">會員整合系統</span>',
    login_desc: '請在右側輸入您的帳號密碼。當您專注輸入時，系統角色將與您互動；登入成功後更將解鎖完整面板與講義資源。',
    version_tag: 'v.0.0.1 Beta 3',
    status_tag: '目前網站開站中',
    marquee_text: '歡迎來到網站！目前系統功能全面運作中，講義與成績系統已連線。',
    help_text: '【系統幫助與操作指引】\n\n1. 登入與註冊：輸入使用者帳號與密碼即可登入。初次使用預設密碼時需依照安全規則變更密碼。\n2. 講義閱讀：點選講義資料夾可展開瀏覽並預覽 PDF，支援科目篩選、連續滾動與放大下載。\n3. 成績登記：填寫考試科目、範圍與分數，即可自動計入個人學習歷程。\n4. 問題發問：發問時可選擇指定科目，當科小老師與管理員皆可即時為您解答。',
    version_intro_text: defaultIntro,
    maintenance_mode: false,
    maintenance_message: '⚠️ 系統目前正在進行伺服器維護與升級修復，暫時關閉所有功能，請稍候再試。',
    countdown_enabled: true,
    countdown_title: '116年 國中教育會考倒數',
    countdown_target_date: '2027-05-15T08:00',
    countdown_slogan: '全力以赴，金榜題名！每一步努力都在成就更好的自己',
  },
  announcements: [
    {
      id: 'ann-1',
      content: '歡迎各位學員！各學科講義與發問系統已全數上架，請至對應科目瀏覽研讀。',
      created_by: 'hsliang-admin',
      created_at: new Date().toISOString(),
    },
  ],
  handouts: [
    {
      id: 'folder-math-1',
      title: '高一數學講義與試題',
      subject: '數學',
      url: '',
      is_folder: true,
      parent_id: null,
      created_by: 'hsliang-admin',
      created_at: new Date().toISOString(),
    },
    {
      id: 'file-math-1',
      title: '第一單元：數與式重點精華講義.pdf',
      subject: '數學',
      url: '/samples/math_sample.pdf',
      is_folder: false,
      parent_id: 'folder-math-1',
      created_by: 'hsliang-admin',
      created_at: new Date().toISOString(),
    },
  ],
  forum_messages: [],
  grades: [],
  faq_messages: [],
  streams: [],
  stream_messages: [],
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return JSON.parse(JSON.stringify(initialDb));
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db:', err);
    return JSON.parse(JSON.stringify(initialDb));
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Static uploads & samples
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use('/samples', express.static(SAMPLES_DIR));

  // --- API Routes ---

  // 0. Heartbeat (即時在線更新)
  app.post('/api/heartbeat', (req, res) => {
    const { username } = req.body;
    if (!username) return res.json({ ok: false });

    const db = readDb();
    const user = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (user) {
      user.last_seen = new Date().toISOString();
      writeDb(db);
    }
    return res.json({ ok: true, maintenance_mode: !!db.site_config?.maintenance_mode });
  });

  // 1. Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '請輸入帳號與密碼' });
    }

    const db = readDb();
    let user = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());

    // Allow default admin initialization if not present
    if (!user && username === 'hsliang-admin') {
      user = {
        username: 'hsliang-admin',
        password: password,
        nickname: '系統管理員',
        isAdmin: true,
        isTutor: false,
        tutorSubjects: [],
        must_change_password: false,
        isBanned: false,
        last_login: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      db.users.push(user);
    }

    if (!user) {
      return res.status(401).json({ error: '帳號或密碼錯誤' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: '❌ 您的帳號已被管理員封鎖或禁言，無法登入。' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: '帳號或密碼錯誤' });
    }

    // Check force change password
    const mustChange = user.must_change_password || password === '00000000';

    user.last_login = new Date().toISOString();
    user.last_seen = new Date().toISOString();
    writeDb(db);

    return res.json({
      success: true,
      user: {
        username: user.username,
        nickname: user.nickname || '',
        isAdmin: !!user.isAdmin,
        isTutor: !!user.isTutor,
        tutorSubjects: user.tutorSubjects || [],
        must_change_password: mustChange,
      },
    });
  });

  // 2. Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '請完整填寫帳號與密碼' });
    }

    const db = readDb();
    const exists = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: '此帳號已被註冊，請換一個帳號名稱' });
    }

    const newUser = {
      username: username.trim(),
      password,
      nickname: '',
      isAdmin: username === 'hsliang-admin',
      isTutor: false,
      tutorSubjects: [],
      must_change_password: true,
      isBanned: false,
      last_login: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    db.users.push(newUser);
    writeDb(db);

    return res.json({ success: true, message: '註冊成功' });
  });

  // 3. Auth: Force change password
  app.post('/api/auth/force-change-password', (req, res) => {
    const { username, newPassword } = req.body;
    if (!username || !newPassword) {
      return res.status(400).json({ error: '資料不完整' });
    }

    const db = readDb();
    const user = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: '找不到用戶' });
    }

    user.password = newPassword;
    user.must_change_password = false;
    user.last_login = new Date().toISOString();
    user.last_seen = new Date().toISOString();
    writeDb(db);

    return res.json({
      success: true,
      user: {
        username: user.username,
        nickname: user.nickname || '',
        isAdmin: !!user.isAdmin,
        isTutor: !!user.isTutor,
        tutorSubjects: user.tutorSubjects || [],
        must_change_password: false,
      },
    });
  });

  // 4. Auth: Update user
  app.post('/api/auth/update-user', (req, res) => {
    const { username, nickname, password } = req.body;
    if (!username) return res.status(400).json({ error: '缺少用戶帳號' });

    const db = readDb();
    const user = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.status(404).json({ error: '找不到用戶' });

    if (nickname !== undefined) user.nickname = nickname;
    if (password !== undefined && password) user.password = password;

    writeDb(db);
    return res.json({
      success: true,
      user: {
        username: user.username,
        nickname: user.nickname || '',
        isAdmin: !!user.isAdmin,
        isTutor: !!user.isTutor,
        tutorSubjects: user.tutorSubjects || [],
      },
    });
  });

  // 5. Admin: Create User (加入使用者)
  app.post('/api/admin/create-user', (req, res) => {
    const { username, password, nickname, mustChangePassword, isTutor, tutorSubjects } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '請輸入帳號名稱與初始密碼' });
    }

    const db = readDb();
    const exists = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: '此帳號已存在，請使用不同名稱' });
    }

    const newUser = {
      username: username.trim(),
      password: password.trim(),
      nickname: (nickname || '').trim(),
      isAdmin: false,
      isTutor: !!isTutor,
      tutorSubjects: Array.isArray(tutorSubjects) ? tutorSubjects : [],
      must_change_password: mustChangePassword !== false,
      isBanned: false,
      last_login: null,
      last_seen: null,
      created_at: new Date().toISOString(),
    };

    db.users.push(newUser);
    writeDb(db);

    return res.json({ success: true, message: `學員【${newUser.username}】已成功建立！`, user: newUser });
  });

  // 6. Admin: Get all users & status with real-time online status and passwords
  app.get('/api/admin/users', (req, res) => {
    const db = readDb();
    const now = Date.now();
    const userList = db.users.map((u: any) => {
      const lastSeenTime = u.last_seen ? new Date(u.last_seen).getTime() : 0;
      const isOnline = now - lastSeenTime < 45000; // Active within 45 seconds
      return {
        username: u.username,
        password: u.password,
        nickname: u.nickname || '',
        isAdmin: !!u.isAdmin,
        isTutor: !!u.isTutor,
        tutorSubjects: u.tutorSubjects || [],
        isBanned: !!u.isBanned,
        must_change_password: !!u.must_change_password,
        isOnline,
        last_seen: u.last_seen,
        last_login: u.last_login,
        created_at: u.created_at,
      };
    });
    return res.json(userList);
  });

  // 6.5 Admin: Update user password
  app.post('/api/admin/update-user-password', (req, res) => {
    const { username, newPassword } = req.body;
    if (!username || !newPassword) return res.status(400).json({ error: '資料不完整' });
    const db = readDb();
    const user = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.status(404).json({ error: '找不到用戶' });
    user.password = newPassword.trim();
    writeDb(db);
    return res.json({ success: true, message: `學員【${user.username}】密碼已更新！` });
  });

  // 6.6 Admin: Delete user
  app.delete('/api/admin/users/:username', (req, res) => {
    const { username } = req.params;
    if (username === 'hsliang-admin') return res.status(400).json({ error: '無法刪除最高管理員' });
    const db = readDb();
    db.users = (db.users || []).filter((u: any) => u.username.toLowerCase() !== username.toLowerCase());
    writeDb(db);
    return res.json({ success: true, message: `已刪除使用者【${username}】` });
  });

  // 7. Admin: Toggle ban
  app.post('/api/admin/toggle-ban', (req, res) => {
    const { username, ban } = req.body;
    const db = readDb();
    const user = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.status(404).json({ error: '找不到用戶' });

    user.isBanned = ban !== undefined ? ban : !user.isBanned;
    writeDb(db);
    return res.json({ success: true, isBanned: user.isBanned });
  });

  // 8. Admin: Force password change
  app.post('/api/admin/force-pw', (req, res) => {
    const { username, force } = req.body;
    const db = readDb();
    const user = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.status(404).json({ error: '找不到用戶' });

    user.must_change_password = force !== undefined ? force : true;
    writeDb(db);
    return res.json({ success: true, must_change_password: user.must_change_password });
  });

  // 8.5 Admin: Set Tutor (指派小老師與科目)
  app.post('/api/admin/set-tutor', (req, res) => {
    const { username, isTutor, tutorSubjects } = req.body;
    const db = readDb();
    const user = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.status(404).json({ error: '找不到用戶' });

    user.isTutor = !!isTutor;
    user.tutorSubjects = Array.isArray(tutorSubjects) ? tutorSubjects : [];
    writeDb(db);
    return res.json({ success: true, user });
  });

  // 9. Site Config: GET & POST
  app.get('/api/site-config', (req, res) => {
    const db = readDb();
    return res.json(db.site_config || {});
  });

  app.post('/api/site-config', (req, res) => {
    const updates = req.body;
    const db = readDb();
    db.site_config = { ...db.site_config, ...updates };
    writeDb(db);
    return res.json({ success: true, config: db.site_config });
  });

  // 9.5 Admin: Toggle Maintenance Mode (伺服器修復模式)
  app.post('/api/admin/maintenance', (req, res) => {
    const { enabled, message } = req.body;
    const db = readDb();
    db.site_config = db.site_config || {};
    db.site_config.maintenance_mode = !!enabled;
    if (message) db.site_config.maintenance_message = message;
    writeDb(db);
    return res.json({ success: true, maintenance_mode: db.site_config.maintenance_mode, config: db.site_config });
  });

  // 10. Announcements
  app.get('/api/announcements', (req, res) => {
    const db = readDb();
    return res.json(db.announcements || []);
  });

  app.post('/api/announcements', (req, res) => {
    const { content, created_by } = req.body;
    if (!content) return res.status(400).json({ error: '內容不能為空' });

    const db = readDb();
    const newAnn = {
      id: 'ann-' + Date.now(),
      content,
      created_by: created_by || 'hsliang-admin',
      created_at: new Date().toISOString(),
    };
    db.announcements.unshift(newAnn);
    writeDb(db);
    return res.json({ success: true, announcement: newAnn });
  });

  app.delete('/api/announcements/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    db.announcements = (db.announcements || []).filter((a: any) => a.id !== id);
    writeDb(db);
    return res.json({ success: true });
  });

  // 11. Handouts (Folders & Files categorized by Subject)
  app.get('/api/handouts', (req, res) => {
    const db = readDb();
    const parentId = req.query.parent_id !== undefined ? (req.query.parent_id === 'null' ? null : req.query.parent_id) : undefined;
    const subject = req.query.subject as string | undefined;

    let list = db.handouts || [];
    if (parentId !== undefined) {
      list = list.filter((h: any) => h.parent_id === parentId);
    }
    if (subject && subject !== '全部') {
      if (subject === '不分科') {
        list = list.filter((h: any) => !h.subject || h.subject === '不分科');
      } else {
        list = list.filter((h: any) => h.subject === subject);
      }
    }
    return res.json(list);
  });

  app.post('/api/handouts', (req, res) => {
    const { title, is_folder, parent_id, url, subject, created_by } = req.body;
    if (!title) return res.status(400).json({ error: '標題不能為空' });

    const db = readDb();
    const newHandout = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: title.trim(),
      subject: subject || '不分科',
      is_folder: !!is_folder,
      parent_id: parent_id || null,
      url: url || '',
      created_by: created_by || 'hsliang-admin',
      created_at: new Date().toISOString(),
    };
    db.handouts.unshift(newHandout);
    writeDb(db);
    return res.json({ success: true, handout: newHandout });
  });

  app.delete('/api/handouts/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const toDeleteIds = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const item of db.handouts || []) {
        if (item.parent_id && toDeleteIds.has(item.parent_id) && !toDeleteIds.has(item.id)) {
          toDeleteIds.add(item.id);
          changed = true;
        }
      }
    }
    db.handouts = (db.handouts || []).filter((h: any) => !toDeleteIds.has(h.id));
    writeDb(db);
    return res.json({ success: true });
  });

  // 12. File Upload API
  app.post('/api/upload', (req, res) => {
    const { fileName, fileData, title, parent_id, subject, created_by } = req.body;
    if (!fileData) return res.status(400).json({ error: '未提供檔案數據' });

    try {
      const sanitizedName = (fileName || 'handout_' + Date.now()).replace(/[^a-zA-Z0-9_.-]/g, '_');
      const uniqueFileName = `${Date.now()}_${sanitizedName}`;
      const targetFilePath = path.resolve(UPLOADS_DIR, uniqueFileName);

      const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(targetFilePath, buffer);

      const fileUrl = `/uploads/${uniqueFileName}`;

      const db = readDb();
      const newHandout = {
        id: 'file-' + Date.now(),
        title: (title || fileName || '未命名講義').trim(),
        subject: subject || '不分科',
        is_folder: false,
        parent_id: parent_id || null,
        url: fileUrl,
        created_by: created_by || 'hsliang-admin',
        created_at: new Date().toISOString(),
      };
      db.handouts.unshift(newHandout);
      writeDb(db);

      return res.json({ success: true, handout: newHandout, url: fileUrl });
    } catch (err: any) {
      console.error('File upload error:', err);
      return res.status(500).json({ error: '檔案儲存失敗：' + err.message });
    }
  });

  // 13. Forum Messages (with subject & delete support)
  app.get('/api/forum-messages', (req, res) => {
    const db = readDb();
    const { subject } = req.query;
    let list = db.forum_messages || [];
    if (subject && subject !== '全部') {
      if (subject === '不分科') {
        list = list.filter((m: any) => !m.subject || m.subject === '不分科');
      } else {
        list = list.filter((m: any) => m.subject === subject);
      }
    }
    return res.json(list);
  });

  app.post('/api/forum-messages', (req, res) => {
    const { username, content, subject } = req.body;
    if (!content) return res.status(400).json({ error: '內容不能為空' });

    const db = readDb();
    const newMsg = {
      id: 'forum-' + Date.now(),
      username: username || '訪客',
      subject: subject || '不分科',
      content,
      created_at: new Date().toISOString(),
    };
    db.forum_messages.push(newMsg);
    writeDb(db);
    return res.json({ success: true, message: newMsg });
  });

  app.delete('/api/forum-messages/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    db.forum_messages = (db.forum_messages || []).filter((m: any) => m.id !== id);
    writeDb(db);
    return res.json({ success: true });
  });

  // 14. Grades
  app.get('/api/grades', (req, res) => {
    const db = readDb();
    return res.json(db.grades || []);
  });

  app.post('/api/grades', (req, res) => {
    const { username, subject, range_text, score } = req.body;
    if (!username || !subject || !range_text || score === undefined) {
      return res.status(400).json({ error: '請完整填寫成績資訊' });
    }

    const db = readDb();
    const newGrade = {
      id: 'grade-' + Date.now(),
      username,
      subject: subject || '不分科',
      range_text,
      score: Number(score),
      created_at: new Date().toISOString(),
    };
    db.grades.unshift(newGrade);
    writeDb(db);
    return res.json({ success: true, grade: newGrade });
  });

  app.delete('/api/grades/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    db.grades = (db.grades || []).filter((g: any) => g.id !== id);
    writeDb(db);
    return res.json({ success: true });
  });

  // 15. FAQ Messages (LINE-like chat with subject, roles & delete)
  app.get('/api/faq-messages', (req, res) => {
    const { username, subject } = req.query;
    const db = readDb();
    let msgs = db.faq_messages || [];
    if (username) {
      msgs = msgs.filter((m: any) => m.username === username);
    }
    if (subject && subject !== '全部') {
      if (subject === '不分科') {
        msgs = msgs.filter((m: any) => !m.subject || m.subject === '不分科');
      } else {
        msgs = msgs.filter((m: any) => m.subject === subject);
      }
    }
    return res.json(msgs);
  });

  app.post('/api/faq-messages', (req, res) => {
    const { username, sender, content, is_admin_reply, subject, sender_role, tutor_subject } = req.body;
    if (!content) return res.status(400).json({ error: '內容不能為空' });

    const db = readDb();
    const newFaq = {
      id: 'faq-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      username: username || 'student',
      sender: sender || username || 'student',
      subject: subject || '數學',
      sender_role: sender_role || (is_admin_reply ? 'admin' : 'student'),
      tutor_subject: tutor_subject || '',
      content,
      is_admin_reply: !!is_admin_reply,
      created_at: new Date().toISOString(),
    };
    db.faq_messages.push(newFaq);
    writeDb(db);
    return res.json({ success: true, message: newFaq });
  });

  app.delete('/api/faq-messages/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    db.faq_messages = (db.faq_messages || []).filter((m: any) => m.id !== id);
    writeDb(db);
    return res.json({ success: true });
  });

  app.delete('/api/faq-messages/user/:username', (req, res) => {
    const { username } = req.params;
    const db = readDb();
    db.faq_messages = (db.faq_messages || []).filter((m: any) => m.username !== username);
    writeDb(db);
    return res.json({ success: true });
  });

  // 16. Live Streams
  app.get('/api/streams', (req, res) => {
    const db = readDb();
    return res.json(db.streams || []);
  });

  app.post('/api/streams', (req, res) => {
    const { title, subject, streamType, youtubeUrl, streamUrl, broadcaster, broadcasterNickname, broadcasterRole, tutorSubject, allowChat, whiteboardEnabled } = req.body;
    if (!title || !broadcaster) {
      return res.status(400).json({ error: '請提供直播標題與開播者資訊' });
    }

    const db = readDb();
    if (!db.streams) db.streams = [];

    const newStream = {
      id: 'stream-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: title.trim(),
      subject: subject || '不分科',
      streamType: streamType === 'youtube' ? 'youtube' : 'builtin',
      youtubeUrl: youtubeUrl || '',
      streamUrl: streamUrl || '',
      isLive: true,
      broadcaster,
      broadcasterNickname: broadcasterNickname || broadcaster,
      broadcasterRole: broadcasterRole || 'admin',
      tutorSubject: tutorSubject || '',
      viewers: 1,
      likes: 0,
      startedAt: new Date().toISOString(),
      allowChat: allowChat !== false,
      whiteboardEnabled: !!whiteboardEnabled,
    };

    db.streams.unshift(newStream);
    writeDb(db);
    return res.json({ success: true, stream: newStream });
  });

  app.patch('/api/streams/:id/end', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    if (!db.streams) db.streams = [];
    const stream = db.streams.find((s: any) => s.id === id);
    if (!stream) {
      return res.status(404).json({ error: '直播不存在' });
    }
    stream.isLive = false;
    stream.endedAt = new Date().toISOString();
    writeDb(db);
    return res.json({ success: true, stream });
  });

  app.delete('/api/streams/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    db.streams = (db.streams || []).filter((s: any) => s.id !== id);
    if (db.stream_messages) {
      db.stream_messages = db.stream_messages.filter((m: any) => m.streamId !== id);
    }
    writeDb(db);
    return res.json({ success: true });
  });

  app.post('/api/streams/:id/like', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const stream = (db.streams || []).find((s: any) => s.id === id);
    if (stream) {
      stream.likes = (stream.likes || 0) + 1;
      writeDb(db);
      return res.json({ success: true, likes: stream.likes });
    }
    return res.status(404).json({ error: '直播不存在' });
  });

  // Stream Messages
  app.get('/api/streams/:id/messages', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const msgs = (db.stream_messages || []).filter((m: any) => m.streamId === id);
    return res.json(msgs);
  });

  app.post('/api/streams/:id/messages', (req, res) => {
    const { id } = req.params;
    const { username, nickname, role, content, isQuestion } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '留言內容不能為空' });
    }

    const db = readDb();
    if (!db.stream_messages) db.stream_messages = [];

    const newMsg = {
      id: 'smsg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      streamId: id,
      username: username || 'guest',
      nickname: nickname || username || '同學',
      role: role || 'student',
      content: content.trim(),
      isQuestion: !!isQuestion,
      createdAt: new Date().toISOString(),
    };

    db.stream_messages.push(newMsg);
    writeDb(db);
    return res.json({ success: true, message: newMsg });
  });

  app.delete('/api/streams/:id/messages/:msgId', (req, res) => {
    const { id, msgId } = req.params;
    const db = readDb();
    db.stream_messages = (db.stream_messages || []).filter((m: any) => !(m.streamId === id && m.id === msgId));
    writeDb(db);
    return res.json({ success: true });
  });

  // Dev vs Prod Vite Integration
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
