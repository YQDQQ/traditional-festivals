require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { body, param, validationResult } = require('express-validator');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
// 未设置 JWT_SECRET 时每次启动随机生成（重启后旧令牌失效，请在 .env 中设置固定值）
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
const JWT_EXPIRES = process.env.JWT_EXPIRES || '24h';

// ==================== 中间件 ====================

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'images', 'uploads');
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|svg|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 jpg/jpeg/png/gif/svg/webp 格式'));
    }
  }
});

// JWT 鉴权中间件
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未提供认证令牌' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: '令牌无效或已过期' });
  }
}

// 校验结果处理
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Festival:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         date:
 *           type: string
 *         description:
 *           type: string
 *         cover_image:
 *           type: string
 *         customs:
 *           type: array
 *           items:
 *             type: string
 *         activities:
 *           type: array
 *           items:
 *             type: string
 *         images:
 *           type: array
 *           items:
 *             type: string
 */

// ==================== 公开 API ====================

/**
 * @swagger
 * /api/festivals:
 *   get:
 *     tags: [公开]
 *     summary: 获取节日列表（分页）
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 12
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 分页结果
 */
app.get('/api/festivals', async (req, res) => {
  try {
    const { page = 1, pageSize = 12, keyword = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const size = Math.min(50, Math.max(1, parseInt(pageSize)));

    let result;
    if (keyword.trim()) {
      result = db.searchFestivals(keyword.trim(), pageNum, size);
    } else {
      result = db.getFestivalsPaginated(pageNum, size);
    }
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[API] Error fetching festivals:', err.message);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

/**
 * @swagger
 * /api/festivals/all:
 *   get:
 *     tags: [公开]
 *     summary: 获取全部节日（不分页）
 *     responses:
 *       200:
 *         description: 全部节日列表
 */
app.get('/api/festivals/all', async (req, res) => {
  try {
    const festivals = db.getAllFestivals();
    res.json({ success: true, data: festivals });
  } catch (err) {
    console.error('[API] Error:', err.message);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

/**
 * @swagger
 * /api/festivals/{id}:
 *   get:
 *     tags: [公开]
 *     summary: 获取节日详情
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 节日详情
 *       404:
 *         description: 未找到
 */
app.get('/api/festivals/:id',
  param('id').isInt({ min: 1 }).withMessage('ID 必须为正整数'),
  validate,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const festival = db.getFestivalById(id);
      if (!festival) {
        return res.status(404).json({ success: false, error: '节日不存在' });
      }
      res.json({ success: true, data: festival });
    } catch (err) {
      console.error('[API] Error:', err.message);
      res.status(500).json({ success: false, error: '服务器内部错误' });
    }
  }
);

// ==================== 认证 API ====================

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     tags: [管理后台]
 *     summary: 管理员登录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 登录成功，返回 token
 *       401:
 *         description: 用户名或密码错误
 */
app.post('/api/admin/login',
  body('username').trim().notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空'),
  validate,
  async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await db.verifyUser(username, password);
      if (!user) {
        return res.status(401).json({ success: false, error: '用户名或密码错误' });
      }
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
      console.error('[API] Login error:', err.message);
      res.status(500).json({ success: false, error: '服务器内部错误' });
    }
  }
);

/**
 * @swagger
 * /api/admin/verify:
 *   get:
 *     tags: [管理后台]
 *     summary: 验证 token 有效性
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: token 有效
 *       401:
 *         description: token 无效
 */
app.get('/api/admin/verify', authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ==================== 管理后台 API ====================

/**
 * @swagger
 * /api/admin/festivals:
 *   get:
 *     tags: [管理后台]
 *     summary: 管理后台获取节日列表
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 节日列表
 */
app.get('/api/admin/festivals', authMiddleware, async (req, res) => {
  try {
    const festivals = db.getAllFestivals();
    res.json({ success: true, data: festivals });
  } catch (err) {
    console.error('[API] Error:', err.message);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

/**
 * @swagger
 * /api/admin/festivals:
 *   post:
 *     tags: [管理后台]
 *     summary: 添加节日
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, date, description]
 *             properties:
 *               name:
 *                 type: string
 *               date:
 *                 type: string
 *               description:
 *                 type: string
 *               cover_image:
 *                 type: string
 *               customs:
 *                 type: array
 *                 items:
 *                   type: string
 *               activities:
 *                 type: array
 *                 items:
 *                   type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 创建成功
 */
app.post('/api/admin/festivals',
  authMiddleware,
  body('name').trim().notEmpty().withMessage('节日名称不能为空'),
  body('date').trim().notEmpty().withMessage('节日日期不能为空'),
  body('description').trim().notEmpty().withMessage('节日描述不能为空'),
  validate,
  async (req, res) => {
    try {
      const festival = db.addFestival(req.body);
      db.addLog(req.user.username, '添加节日', req.body.name);
      res.status(201).json({ success: true, data: festival });
    } catch (err) {
      console.error('[API] Error adding festival:', err.message);
      res.status(500).json({ success: false, error: '服务器内部错误' });
    }
  }
);

/**
 * @swagger
 * /api/admin/festivals/{id}:
 *   put:
 *     tags: [管理后台]
 *     summary: 更新节日
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 未找到
 */
app.put('/api/admin/festivals/:id',
  authMiddleware,
  param('id').isInt({ min: 1 }).withMessage('ID 必须为正整数'),
  validate,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const festival = db.updateFestival(id, req.body);
      if (!festival) {
        return res.status(404).json({ success: false, error: '节日不存在' });
      }
      db.addLog(req.user.username, '更新节日', req.body.name || `ID:${id}`);
      res.json({ success: true, data: festival });
    } catch (err) {
      console.error('[API] Error updating festival:', err.message);
      res.status(500).json({ success: false, error: '服务器内部错误' });
    }
  }
);

/**
 * @swagger
 * /api/admin/festivals/{id}:
 *   delete:
 *     tags: [管理后台]
 *     summary: 删除节日
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 未找到
 */
app.delete('/api/admin/festivals/:id',
  authMiddleware,
  param('id').isInt({ min: 1 }).withMessage('ID 必须为正整数'),
  validate,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = db.deleteFestival(id);
      if (!success) {
        return res.status(404).json({ success: false, error: '节日不存在' });
      }
      db.addLog(req.user.username, '删除节日', `ID:${id}`);
      res.json({ success: true, message: '删除成功' });
    } catch (err) {
      console.error('[API] Error deleting festival:', err.message);
      res.status(500).json({ success: false, error: '服务器内部错误' });
    }
  }
);

// 修改密码
app.put('/api/admin/password', authMiddleware,
  body('oldPassword').notEmpty().withMessage('原密码不能为空'),
  body('newPassword').isLength({ min: 4 }).withMessage('新密码至少4位'),
  validate,
  async (req, res) => {
    try {
      const ok = await db.updatePassword(req.user.username, req.body.oldPassword, req.body.newPassword);
      if (!ok) return res.status(400).json({ success: false, error: '原密码错误' });
      db.addLog(req.user.username, '修改密码');
      res.json({ success: true, message: '密码修改成功' });
    } catch (err) {
      console.error('[API] Password error:', err.message);
      res.status(500).json({ success: false, error: '服务器内部错误' });
    }
  }
);

// 操作日志
app.get('/api/admin/logs', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    res.json({ success: true, data: db.getLogs(limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// 批量删除
app.post('/api/admin/festivals/batch-delete', authMiddleware,
  body('ids').isArray({ min: 1 }).withMessage('请选择节日'),
  validate,
  async (req, res) => {
    try {
      db.batchDelete(req.body.ids);
      db.addLog(req.user.username, '批量删除', `${req.body.ids.length}个节日`);
      res.json({ success: true, message: `已删除${req.body.ids.length}个节日` });
    } catch (err) {
      res.status(500).json({ success: false, error: '服务器内部错误' });
    }
  }
);

// 排序
app.put('/api/admin/festivals/:id/sort', authMiddleware,
  param('id').isInt(),
  validate,
  async (req, res) => {
    try {
      const dir = req.body.direction;
      if (dir !== 'up' && dir !== 'down') {
        return res.status(400).json({ success: false, error: 'direction 必须为 up 或 down' });
      }
      const ok = db.updateSortOrder(parseInt(req.params.id), dir);
      if (!ok) return res.json({ success: true, message: '已在边界' });
      res.json({ success: true, message: '排序已更新' });
    } catch (err) {
      res.status(500).json({ success: false, error: '服务器内部错误' });
    }
  }
);

// 图片上传
/**
 * @swagger
 * /api/admin/upload:
 *   post:
 *     tags: [管理后台]
 *     summary: 上传图片
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 上传成功，返回图片路径
 */
app.post('/api/admin/upload', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请选择图片文件' });
    }
    const url = 'images/uploads/' + req.file.filename;
    res.json({ success: true, url });
  } catch (err) {
    console.error('[API] Upload error:', err.message);
    res.status(500).json({ success: false, error: '上传失败' });
  }
});

// 批量上传图片
app.post('/api/admin/upload-multi', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: '请选择图片文件' });
    }
    const urls = req.files.map(f => 'images/uploads/' + f.filename);
    res.json({ success: true, urls });
  } catch (err) {
    console.error('[API] Upload error:', err.message);
    res.status(500).json({ success: false, error: '上传失败' });
  }
});

// 统计数据
/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     tags: [管理后台]
 *     summary: 获取统计数据
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 统计数据
 */
app.get('/api/admin/stats', authMiddleware, async (req, res) => {
  try {
    const stats = db.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[API] Stats error:', err.message);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// ==================== 全局错误处理 ====================

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: '文件大小不能超过 5MB' });
    }
    return res.status(400).json({ success: false, error: '文件上传失败' });
  }
  console.error('[Error]', err.message);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ success: false, error: '接口不存在' });
});

// ==================== 启动 ====================

async function start() {
  await db.init();

  // 删除旧的 JSON 数据文件（已迁移到 SQLite）
  const fs = require('fs');
  const oldJsonPath = path.join(__dirname, 'data', 'festivals.json');
  if (fs.existsSync(oldJsonPath)) {
    fs.unlinkSync(oldJsonPath);
    console.log('[Startup] Removed old JSON data file');
  }

  app.listen(PORT, () => {
    console.log('═'.repeat(50));
    console.log('  中华传统节日文化展示平台  v2.0');
    console.log('═'.repeat(50));
    console.log(`  服务器: http://localhost:${PORT}`);
    console.log(`  首页: http://localhost:${PORT}/index.html`);
    console.log(`  管理后台: http://localhost:${PORT}/login.html`);
    console.log('  管理员账号: 见 .env 的 ADMIN_USERNAME / ADMIN_PASSWORD');
    console.log('═'.repeat(50));
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
