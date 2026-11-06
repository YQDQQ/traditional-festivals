const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'festivals.db');

let SQL = null;
let db = null;

// ==================== 初始化 ====================

async function init() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  createTables();
  await seedIfEmpty();
  console.log('[DB] Database ready');
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS festivals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      cover_image TEXT DEFAULT '',
      origin TEXT DEFAULT '',
      food TEXT DEFAULT '',
      poetry TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS customs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      festival_id INTEGER NOT NULL,
      custom TEXT NOT NULL,
      FOREIGN KEY (festival_id) REFERENCES festivals(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      festival_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      FOREIGN KEY (festival_id) REFERENCES festivals(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      festival_id INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (festival_id) REFERENCES festivals(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 兼容旧数据库：自动补全新列
  try { db.run('ALTER TABLE festivals ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch (e) {}
  try { db.run('ALTER TABLE festivals ADD COLUMN origin TEXT DEFAULT ""'); } catch (e) {}
  try { db.run('ALTER TABLE festivals ADD COLUMN food TEXT DEFAULT ""'); } catch (e) {}
  try { db.run('ALTER TABLE festivals ADD COLUMN poetry TEXT DEFAULT ""'); } catch (e) {}

  save();
}

async function seedIfEmpty() {
  const result = db.exec('SELECT COUNT(*) FROM festivals');
  if (result.length > 0 && result[0].values[0][0] > 0) {
    // 检查是否已有管理员
    const users = db.exec('SELECT COUNT(*) FROM users');
    if (users.length > 0 && users[0].values[0][0] > 0) return;
    // 只建管理员，数据已有
    await createDefaultAdmin();
    return;
  }

  const festivals = [
    {
      name: '春节', date: '农历正月初一',
      description: '春节是中国最重要的传统节日，象征着团圆、喜庆和新的开始。家家户户贴春联、放鞭炮、吃年夜饭，共同迎接新年的到来。春节起源于殷商时期年头岁尾的祭神祭祖活动，已有四千多年历史。春节期间，全国各地均有举行各种庆贺新春活动，热闹喜庆气氛洋溢。',
      customs: ['贴春联', '放鞭炮', '吃年夜饭', '拜年', '给压岁钱', '守岁', '穿新衣'],
      activities: ['舞龙舞狮', '逛庙会', '赏花灯', '看春晚'],
      images: ['images/festivals/春节/main.png', 'images/festivals/春节/gallery.png']
    },
    {
      name: '元宵节', date: '农历正月十五',
      description: '元宵节，又称上元节、灯节，是春节后的第一个重要节日。人们赏月、观灯、猜灯谜、吃元宵，寓意团圆美满。元宵节起源于汉代，汉武帝正月上辛夜在甘泉宫祭祀"太一"的活动，被后人视作正月十五祭祀天神的先声。',
      customs: ['吃元宵', '观灯展', '猜灯谜', '赏月', '放烟花'],
      activities: ['灯会', '舞龙舞狮', '踩高跷', '扭秧歌'],
      images: ['images/festivals/元宵节/main.png', 'images/festivals/元宵节/gallery.png']
    },
    {
      name: '清明节', date: '公历4月4日或5日',
      description: '清明节，又称踏青节，是祭祖扫墓的传统节日，也是二十四节气之一。人们追思先人，缅怀英烈，同时春日踏青、感受自然的生机。清明节融合了寒食节的习俗，大约始于周代，已有二千五百多年历史。',
      customs: ['扫墓祭祖', '踏青', '插柳', '荡秋千', '蹴鞠'],
      activities: ['春游', '植树', '放风筝', '拔河'],
      images: ['images/festivals/清明节/main.png', 'images/festivals/清明节/gallery.png']
    },
    {
      name: '端午节', date: '农历五月初五',
      description: '端午节为每年农历五月初五，又称端阳节、午日节、五月节。最初是中国人民祛病防疫的节日，后因诗人屈原在这一天投江，成为纪念屈原的传统节日。赛龙舟、吃粽子、挂艾草等习俗传承至今，2009年入选世界非物质文化遗产。',
      customs: ['吃粽子', '赛龙舟', '挂艾草', '佩香囊', '喝雄黄酒', '系五彩绳'],
      activities: ['龙舟赛', '包粽子比赛', '端午诗会', '民俗文化节'],
      images: ['images/festivals/端午节/main.png', 'images/festivals/端午节/gallery.png']
    },
    {
      name: '七夕节', date: '农历七月初七',
      description: '七夕节，又称乞巧节，是中国传统节日中最具浪漫色彩的一个节日。源于牛郎织女鹊桥相会的传说，女子们在这一天乞求智慧和巧艺，更乞求美满姻缘。2006年，七夕节被列入第一批国家级非物质文化遗产名录。',
      customs: ['乞巧', '穿针引线', '拜织女', '吃巧果', '晒书晒衣'],
      activities: ['七夕灯会', '民俗表演', '情侣活动', '汉服游园'],
      images: ['images/festivals/七夕节/main.png', 'images/festivals/七夕节/gallery.png']
    },
    {
      name: '中秋节', date: '农历八月十五',
      description: '中秋节始于唐朝初年，盛行于宋朝，至明清时已成为与春节齐名的中国传统节日之一。中秋节以月之圆兆人之团圆，寄托思念故乡、思念亲人之情，祈盼丰收、幸福。中秋节自古便有祭月、赏月、吃月饼、玩花灯等民俗。',
      customs: ['吃月饼', '赏月', '赏桂花', '吃团圆饭', '饮桂花酒'],
      activities: ['中秋晚会', '猜灯谜', '走月亮', '烧塔'],
      images: ['images/festivals/中秋节/main.png', 'images/festivals/中秋节/gallery.png']
    },
    {
      name: '重阳节', date: '农历九月初九',
      description: '重阳节，农历九月初九，二九相重称为"重九"。重阳节形成于战国时期，到了唐代被正式定为民间的节日。因"九九"与"久久"同音，含有长久长寿之意，2012年被定为"老年节"，传承尊老爱老的传统美德。',
      customs: ['登高', '赏菊', '插茱萸', '吃重阳糕', '饮菊花酒'],
      activities: ['登山活动', '敬老活动', '菊花展', '诗会'],
      images: ['images/festivals/重阳节/main.png', 'images/festivals/重阳节/gallery.png']
    },
    {
      name: '冬至', date: '公历12月21日或22日',
      description: '冬至是二十四节气中最早制订出的一个，也是中华民族的传统节日。古人认为自冬至起，天地阳气开始兴作渐强，代表下一个循环开始，是大吉之日。民间有"冬至大如年"的说法，北方吃饺子，南方吃汤圆，寓意团圆温暖。',
      customs: ['吃饺子', '吃汤圆', '祭祖', '数九', '赠鞋'],
      activities: ['包饺子', '家庭聚餐', '冬至民俗展', '九九消寒图'],
      images: ['images/festivals/冬至/main.png', 'images/festivals/冬至/gallery.png']
    }
  ];

  const insertFestival = db.prepare('INSERT INTO festivals (name, date, description) VALUES (?, ?, ?)');
  const insertCustom = db.prepare('INSERT INTO customs (festival_id, custom) VALUES (?, ?)');
  const insertActivity = db.prepare('INSERT INTO activities (festival_id, activity) VALUES (?, ?)');
  const insertImage = db.prepare('INSERT INTO images (festival_id, image_path, sort_order) VALUES (?, ?, ?)');

  for (const f of festivals) {
    insertFestival.run([f.name, f.date, f.description]);
    const fid = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

    f.customs.forEach(c => insertCustom.run([fid, c]));
    f.activities.forEach(a => insertActivity.run([fid, a]));
    f.images.forEach((img, i) => insertImage.run([fid, img, i]));

    console.log(`[DB] Seeded: ${f.name}`);
  }

  insertFestival.free();
  insertCustom.free();
  insertActivity.free();
  insertImage.free();

  await createDefaultAdmin();
  save();
}

async function createDefaultAdmin() {
  // 管理员账号从环境变量读取；未设置时用户名为 furina，密码随机生成并在控制台打印一次
  const username = process.env.ADMIN_USERNAME || 'furina';
  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD || require('crypto').randomBytes(9).toString('base64url');
  const hash = await bcrypt.hash(password, 10);
  db.run('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)', [username, hash, 'admin']);
  save();
  console.log(`[DB] Default admin created (user: ${username})`);
  if (generated) console.log(`[DB] 随机管理员密码（仅显示这一次，请妥善保存）: ${password}`);
}

function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ==================== 数据库查询封装 ====================

// 获取所有节日（含关联数据）
function getAllFestivals() {
  const rows = db.exec('SELECT * FROM festivals ORDER BY sort_order ASC, id ASC');
  if (!rows.length) return [];

  const festivals = rows[0].values.map(row => ({
    id: row[0],
    name: row[1],
    date: row[2],
    description: row[3],
    cover_image: row[4],
    created_at: row[5],
    customs: [],
    activities: [],
    images: []
  }));

  for (const f of festivals) {
    f.customs = db.exec('SELECT custom FROM customs WHERE festival_id = ? ORDER BY id ASC', [f.id]);
    f.customs = f.customs.length ? f.customs[0].values.map(v => v[0]) : [];

    f.activities = db.exec('SELECT activity FROM activities WHERE festival_id = ? ORDER BY id ASC', [f.id]);
    f.activities = f.activities.length ? f.activities[0].values.map(v => v[0]) : [];

    f.images = db.exec('SELECT image_path FROM images WHERE festival_id = ? ORDER BY sort_order ASC', [f.id]);
    f.images = f.images.length ? f.images[0].values.map(v => v[0]) : [];
  }

  return festivals;
}

// 获取单个节日详情
function getFestivalById(id) {
  const rows = db.exec('SELECT * FROM festivals WHERE id = ?', [id]);
  if (!rows.length || !rows[0].values.length) return null;

  const r = rows[0].values[0];
  const festival = {
    id: r[0],
    name: r[1],
    date: r[2],
    description: r[3],
    cover_image: r[4],
    created_at: r[5],
    origin: r[6] || '',
    food: r[7] || '',
    poetry: r[8] || '',
    customs: [],
    activities: [],
    images: []
  };

  let customs = db.exec('SELECT custom FROM customs WHERE festival_id = ? ORDER BY id ASC', [id]);
  festival.customs = customs.length ? customs[0].values.map(v => v[0]) : [];

  let activities = db.exec('SELECT activity FROM activities WHERE festival_id = ? ORDER BY id ASC', [id]);
  festival.activities = activities.length ? activities[0].values.map(v => v[0]) : [];

  let images = db.exec('SELECT image_path FROM images WHERE festival_id = ? ORDER BY sort_order ASC', [id]);
  festival.images = images.length ? images[0].values.map(v => v[0]) : [];

  return festival;
}

// 搜索节日
function searchFestivals(keyword, page = 1, pageSize = 12) {
  const offset = (page - 1) * pageSize;
  const like = `%${keyword}%`;
  
  const countRows = db.exec(
    'SELECT COUNT(*) FROM festivals WHERE name LIKE ? OR description LIKE ?',
    [like, like]
  );
  const total = countRows.length ? countRows[0].values[0][0] : 0;

  const rows = db.exec(
    'SELECT * FROM festivals WHERE name LIKE ? OR description LIKE ? ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?',
    [like, like, pageSize, offset]
  );

  const festivals = [];
  if (rows.length) {
    for (const row of rows[0].values) {
      const f = {
        id: row[0],
        name: row[1],
        date: row[2],
        description: row[3],
        cover_image: row[4],
        created_at: row[5],
        customs: [],
        activities: [],
        images: []
      };
      let customs = db.exec('SELECT custom FROM customs WHERE festival_id = ? ORDER BY id ASC', [f.id]);
      f.customs = customs.length ? customs[0].values.map(v => v[0]) : [];
      let activities = db.exec('SELECT activity FROM activities WHERE festival_id = ? ORDER BY id ASC', [f.id]);
      f.activities = activities.length ? activities[0].values.map(v => v[0]) : [];
      let images = db.exec('SELECT image_path FROM images WHERE festival_id = ? ORDER BY sort_order ASC', [f.id]);
      f.images = images.length ? images[0].values.map(v => v[0]) : [];
      festivals.push(f);
    }
  }

  return { data: festivals, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// 分页获取
function getFestivalsPaginated(page = 1, pageSize = 12) {
  const offset = (page - 1) * pageSize;

  const countRows = db.exec('SELECT COUNT(*) FROM festivals');
  const total = countRows.length ? countRows[0].values[0][0] : 0;

  const rows = db.exec('SELECT * FROM festivals ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?', [pageSize, offset]);

  const festivals = [];
  if (rows.length) {
    for (const row of rows[0].values) {
      const f = {
        id: row[0],
        name: row[1],
        date: row[2],
        description: row[3],
        cover_image: row[4],
        created_at: row[5],
        customs: [],
        activities: [],
        images: []
      };
      let customs = db.exec('SELECT custom FROM customs WHERE festival_id = ? ORDER BY id ASC', [f.id]);
      f.customs = customs.length ? customs[0].values.map(v => v[0]) : [];
      let activities = db.exec('SELECT activity FROM activities WHERE festival_id = ? ORDER BY id ASC', [f.id]);
      f.activities = activities.length ? activities[0].values.map(v => v[0]) : [];
      let images = db.exec('SELECT image_path FROM images WHERE festival_id = ? ORDER BY sort_order ASC', [f.id]);
      f.images = images.length ? images[0].values.map(v => v[0]) : [];
      festivals.push(f);
    }
  }

  return { data: festivals, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// 添加节日
function addFestival({ name, date, description, cover_image = '', customs = [], activities = [], images = [] }) {
  db.run('INSERT INTO festivals (name, date, description, cover_image) VALUES (?, ?, ?, ?)', [name, date, description, cover_image]);
  const result = db.exec('SELECT last_insert_rowid()');
  const newId = result[0].values[0][0];

  for (const c of customs) {
    db.run('INSERT INTO customs (festival_id, custom) VALUES (?, ?)', [newId, c]);
  }
  for (const a of activities) {
    db.run('INSERT INTO activities (festival_id, activity) VALUES (?, ?)', [newId, a]);
  }
  for (let i = 0; i < images.length; i++) {
    db.run('INSERT INTO images (festival_id, image_path, sort_order) VALUES (?, ?, ?)', [newId, images[i], i]);
  }

  save();
  return getFestivalById(newId);
}

// 更新节日
function updateFestival(id, { name, date, description, cover_image, customs = [], activities = [], images = [] }) {
  const existing = getFestivalById(id);
  if (!existing) return null;

  db.run('UPDATE festivals SET name = ?, date = ?, description = ?, cover_image = ? WHERE id = ?',
    [name || existing.name, date || existing.date, description || existing.description, cover_image !== undefined ? cover_image : existing.cover_image, id]);

  // 清理并重建关联数据
  db.run('DELETE FROM customs WHERE festival_id = ?', [id]);
  db.run('DELETE FROM activities WHERE festival_id = ?', [id]);
  db.run('DELETE FROM images WHERE festival_id = ?', [id]);

  for (const c of customs) {
    db.run('INSERT INTO customs (festival_id, custom) VALUES (?, ?)', [id, c]);
  }
  for (const a of activities) {
    db.run('INSERT INTO activities (festival_id, activity) VALUES (?, ?)', [id, a]);
  }
  for (let i = 0; i < images.length; i++) {
    db.run('INSERT INTO images (festival_id, image_path, sort_order) VALUES (?, ?, ?)', [id, images[i], i]);
  }

  save();
  return getFestivalById(id);
}

// 删除节日
function deleteFestival(id) {
  const existing = getFestivalById(id);
  if (!existing) return false;

  db.run('DELETE FROM customs WHERE festival_id = ?', [id]);
  db.run('DELETE FROM activities WHERE festival_id = ?', [id]);
  db.run('DELETE FROM images WHERE festival_id = ?', [id]);
  db.run('DELETE FROM festivals WHERE id = ?', [id]);
  save();
  return true;
}

// 验证用户
async function verifyUser(username, password) {
  const rows = db.exec('SELECT * FROM users WHERE username = ?', [username]);
  if (!rows.length || !rows[0].values.length) return null;

  const user = rows[0].values[0];
  const match = await bcrypt.compare(password, user[2]);
  if (!match) return null;

  return { id: user[0], username: user[1], role: user[3] };
}

// 获取统计数据
function getStats() {
  const festivalCount = db.exec('SELECT COUNT(*) FROM festivals')[0].values[0][0];
  const customCount = db.exec('SELECT COUNT(*) FROM customs')[0].values[0][0];
  const activityCount = db.exec('SELECT COUNT(*) FROM activities')[0].values[0][0];
  const imageCount = db.exec('SELECT COUNT(*) FROM images')[0].values[0][0];
  return { festivals: festivalCount, customs: customCount, activities: activityCount, images: imageCount };
}

// 修改密码
async function updatePassword(username, oldPassword, newPassword) {
  const user = await verifyUser(username, oldPassword);
  if (!user) return false;
  const hash = await bcrypt.hash(newPassword, 10);
  db.run('UPDATE users SET password = ? WHERE username = ?', [hash, username]);
  save();
  return true;
}

// 操作日志
function addLog(username, action, target = '') {
  db.run('INSERT INTO logs (username, action, target) VALUES (?, ?, ?)', [username, action, target]);
  save();
}

function getLogs(limit = 50) {
  const rows = db.exec('SELECT * FROM logs ORDER BY id DESC LIMIT ?', [limit]);
  if (!rows.length) return [];
  return rows[0].values.map(r => ({
    id: r[0], username: r[1], action: r[2], target: r[3], created_at: r[4]
  }));
}

// 排序
function updateSortOrder(festivalId, direction) {
  const festivals = db.exec('SELECT id, sort_order FROM festivals ORDER BY sort_order ASC, id ASC');
  if (!festivals.length) return false;
  const list = festivals[0].values.map(r => ({ id: r[0], order: r[1] }));
  const idx = list.findIndex(f => f.id === festivalId);
  if (idx === -1) return false;

  if (direction === 'up' && idx > 0) {
    [list[idx].order, list[idx - 1].order] = [list[idx - 1].order, list[idx].order];
    db.run('UPDATE festivals SET sort_order = ? WHERE id = ?', [list[idx].order, list[idx].id]);
    db.run('UPDATE festivals SET sort_order = ? WHERE id = ?', [list[idx - 1].order, list[idx - 1].id]);
    save();
    return true;
  }
  if (direction === 'down' && idx < list.length - 1) {
    [list[idx].order, list[idx + 1].order] = [list[idx + 1].order, list[idx].order];
    db.run('UPDATE festivals SET sort_order = ? WHERE id = ?', [list[idx].order, list[idx].id]);
    db.run('UPDATE festivals SET sort_order = ? WHERE id = ?', [list[idx + 1].order, list[idx + 1].id]);
    save();
    return true;
  }
  return false;
}

// 批量删除
function batchDelete(ids) {
  for (const id of ids) {
    db.run('DELETE FROM customs WHERE festival_id = ?', [id]);
    db.run('DELETE FROM activities WHERE festival_id = ?', [id]);
    db.run('DELETE FROM images WHERE festival_id = ?', [id]);
    db.run('DELETE FROM festivals WHERE id = ?', [id]);
  }
  save();
  return true;
}

module.exports = {
  init,
  getAllFestivals,
  getFestivalById,
  searchFestivals,
  getFestivalsPaginated,
  addFestival,
  updateFestival,
  deleteFestival,
  verifyUser,
  getStats,
  updatePassword,
  addLog,
  getLogs,
  updateSortOrder,
  batchDelete
};
