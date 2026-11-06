const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

(async () => {
  const SQL = await initSqlJs();
  const dbPath = path.join(dataDir, 'festivals.db');
  
  let db;
  
  // 如果数据库已存在就打开，否则创建
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  console.log('Connected to SQLite database');

  // 创建节日表
  db.exec(`CREATE TABLE IF NOT EXISTS festivals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 创建习俗表
  db.exec(`CREATE TABLE IF NOT EXISTS customs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    festival_id INTEGER,
    custom TEXT NOT NULL,
    FOREIGN KEY (festival_id) REFERENCES festivals (id)
  )`);

  // 创建活动表
  db.exec(`CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    festival_id INTEGER,
    activity TEXT NOT NULL,
    FOREIGN KEY (festival_id) REFERENCES festivals (id)
  )`);

  // 创建图片表
  db.exec(`CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    festival_id INTEGER,
    image_path TEXT NOT NULL,
    FOREIGN KEY (festival_id) REFERENCES festivals (id)
  )`);

  // 检查是否已有数据
  const existingFestivals = db.exec('SELECT COUNT(*) as count FROM festivals');
  if (existingFestivals && existingFestivals[0].values[0][0] > 0) {
    console.log('Database already has data, skipping initialization');
    saveDatabase();
    return;
  }

  // 插入初始数据
  const festivals = [
    {
      name: '春节',
      date: '农历正月初一',
      description: '春节是中国最重要的传统节日，象征着团圆、喜庆和新的开始。家家户户贴春联、放鞭炮、吃年夜饭，共同迎接新年的到来。',
      customs: ['贴春联', '放鞭炮', '吃年夜饭', '拜年', '给压岁钱'],
      activities: ['舞龙舞狮', '逛庙会', '赏花灯'],
      images: ['images/festivals/春节/1.svg', 'images/festivals/春节/2.svg', 'images/festivals/春节/3.svg']
    },
    {
      name: '元宵节',
      date: '农历正月十五',
      description: '元宵节是春节后的第一个重要节日，人们赏月、观灯、猜灯谜、吃元宵，寓意团圆美满，欢庆新春佳节。',
      customs: ['吃元宵', '观灯展', '猜灯谜', '赏月'],
      activities: ['灯会', '舞龙舞狮', '踩高跷'],
      images: ['images/festivals/元宵节/1.svg', 'images/festivals/元宵节/2.svg', 'images/festivals/元宵节/3.svg']
    },
    {
      name: '清明节',
      date: '公历4月4日或5日',
      description: '清明节是祭祖扫墓的传统节日，人们追思先人，缅怀英烈，同时也是春日踏青、感受自然的好时节。',
      customs: ['扫墓祭祖', '踏青', '插柳', '荡秋千'],
      activities: ['春游', '植树', '放风筝'],
      images: ['images/festivals/清明节/1.svg', 'images/festivals/清明节/2.svg', 'images/festivals/清明节/3.svg']
    },
    {
      name: '端午节',
      date: '农历五月初五',
      description: '端午节纪念爱国诗人屈原，人们赛龙舟、吃粽子、挂艾草，传承着中华民族的家国情怀和文化精神。',
      customs: ['吃粽子', '赛龙舟', '挂艾草', '佩香囊'],
      activities: ['龙舟赛', '包粽子比赛', '端午诗会'],
      images: ['images/festivals/端午节/1.svg', 'images/festivals/端午节/2.svg', 'images/festivals/端午节/3.svg']
    },
    {
      name: '七夕节',
      date: '农历七月初七',
      description: '七夕节是中国的情人节，源于牛郎织女的传说，象征着美好爱情和坚贞不渝。',
      customs: ['乞巧', '穿针引线', '拜织女', '吃巧果'],
      activities: ['七夕灯会', '民俗表演', '情侣活动'],
      images: ['images/festivals/七夕节/1.svg', 'images/festivals/七夕节/2.svg', 'images/festivals/七夕节/3.svg']
    },
    {
      name: '中秋节',
      date: '农历八月十五',
      description: '中秋节是团圆的节日，人们赏月、吃月饼，思念亲人，期盼团圆，共享天伦之乐。',
      customs: ['吃月饼', '赏月', '赏桂花', '吃团圆饭'],
      activities: ['中秋晚会', '猜灯谜', '走月亮'],
      images: ['images/festivals/中秋节/1.svg', 'images/festivals/中秋节/2.svg', 'images/festivals/中秋节/3.svg']
    },
    {
      name: '重阳节',
      date: '农历九月初九',
      description: '重阳节是敬老的节日，人们登高望远、赏菊、插茱萸，传承着尊老爱老的传统美德。',
      customs: ['登高', '赏菊', '插茱萸', '吃重阳糕'],
      activities: ['登山活动', '敬老活动', '菊花展'],
      images: ['images/festivals/重阳节/1.svg', 'images/festivals/重阳节/2.svg', 'images/festivals/重阳节/3.svg']
    },
    {
      name: '冬至',
      date: '公历12月21日或22日',
      description: '冬至是二十四节气之一，也是重要的传统节日，北方吃饺子，南方吃汤圆，寓意着团圆和温暖。',
      customs: ['吃饺子', '吃汤圆', '祭祖', '数九'],
      activities: ['包饺子', '家庭聚餐', '冬至民俗展'],
      images: ['images/festivals/冬至/1.svg', 'images/festivals/冬至/2.svg', 'images/festivals/冬至/3.svg']
    }
  ];

  const insertFestival = db.prepare('INSERT INTO festivals (name, date, description) VALUES (?, ?, ?)');
  const insertCustom = db.prepare('INSERT INTO customs (festival_id, custom) VALUES (?, ?)');
  const insertActivity = db.prepare('INSERT INTO activities (festival_id, activity) VALUES (?, ?)');
  const insertImage = db.prepare('INSERT INTO images (festival_id, image_path) VALUES (?, ?)');

  // 插入节日数据
  festivals.forEach((festival) => {
    insertFestival.run(festival.name, festival.date, festival.description);
    const festivalId = insertFestival.getLastInsertRowid();
    
    festival.customs.forEach(custom => insertCustom.run(festivalId, custom));
    festival.activities.forEach(activity => insertActivity.run(festivalId, activity));
    festival.images.forEach(imagePath => insertImage.run(festivalId, imagePath));

    console.log(`Inserted festival: ${festival.name}`);
  });

  saveDatabase();

  function saveDatabase() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    console.log('Database saved successfully');
    console.log('Database initialization complete!');
  }
})();
