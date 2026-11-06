/**
 * 首页 JavaScript — v2.0
 * 分页加载、搜索、骨架屏、图片懒加载
 */

const API_BASE = '/api/festivals';

const PAGE_MAP = {1:'春节.html',2:'元宵节.html',3:'清明节.html',4:'端午节.html',5:'七夕节.html',6:'中秋节.html',7:'重阳节.html',8:'冬至.html'};

// 静态兜底数据：后端接口不可用时（如 GitHub Pages 纯静态部署）用内置数据渲染首页，后端可用时不走这里
const STATIC_FESTIVALS = [
  { id: 1, name: '春节', date: '农历正月初一', description: '春节是中国最重要的传统节日，象征着团圆、喜庆和新的开始。家家户户贴春联、放鞭炮、吃年夜饭，共同迎接新年的到来。', customs: ['贴春联', '放鞭炮', '吃年夜饭', '拜年', '给压岁钱'], activities: ['舞龙舞狮', '逛庙会', '赏花灯'], images: ['images/festivals/春节/main.png'] },
  { id: 2, name: '元宵节', date: '农历正月十五', description: '元宵节是春节后的第一个重要节日，人们赏月、观灯、猜灯谜、吃元宵，寓意团圆美满，欢庆新春佳节。', customs: ['吃元宵', '观灯展', '猜灯谜', '赏月'], activities: ['灯会', '舞龙舞狮', '踩高跷'], images: ['images/festivals/元宵节/main.png'] },
  { id: 3, name: '清明节', date: '公历4月4日或5日', description: '清明节是祭祖扫墓的传统节日，人们追思先人，缅怀英烈，同时也是春日踏青、感受自然的好时节。', customs: ['扫墓祭祖', '踏青', '插柳', '荡秋千'], activities: ['春游', '植树', '放风筝'], images: ['images/festivals/清明节/main.png'] },
  { id: 4, name: '端午节', date: '农历五月初五', description: '端午节纪念爱国诗人屈原，人们赛龙舟、吃粽子、挂艾草，传承着中华民族的家国情怀和文化精神。', customs: ['吃粽子', '赛龙舟', '挂艾草', '佩香囊'], activities: ['龙舟赛', '包粽子比赛', '端午诗会'], images: ['images/festivals/端午节/main.png'] },
  { id: 5, name: '七夕节', date: '农历七月初七', description: '七夕节是中国的情人节，源于牛郎织女的传说，象征着美好爱情和坚贞不渝。', customs: ['乞巧', '穿针引线', '拜织女', '吃巧果'], activities: ['七夕灯会', '民俗表演', '情侣活动'], images: ['images/festivals/七夕节/main.png'] },
  { id: 6, name: '中秋节', date: '农历八月十五', description: '中秋节是团圆的节日，人们赏月、吃月饼，思念亲人，期盼团圆，共享天伦之乐。', customs: ['吃月饼', '赏月', '赏桂花', '吃团圆饭'], activities: ['中秋晚会', '猜灯谜', '走月亮'], images: ['images/festivals/中秋节/main.png'] },
  { id: 7, name: '重阳节', date: '农历九月初九', description: '重阳节是敬老的节日，人们登高望远、赏菊、插茱萸，传承着尊老爱老的传统美德。', customs: ['登高', '赏菊', '插茱萸', '吃重阳糕'], activities: ['登山活动', '敬老活动', '菊花展'], images: ['images/festivals/重阳节/main.png'] },
  { id: 8, name: '冬至', date: '公历12月21日或22日', description: '冬至是二十四节气之一，也是重要的传统节日，北方吃饺子，南方吃汤圆，寓意着团圆和温暖。', customs: ['吃饺子', '吃汤圆', '祭祖', '数九'], activities: ['包饺子', '家庭聚餐', '冬至民俗展'], images: ['images/festivals/冬至/main.png'] }
];

// 加载动画
function runLoader() {
  document.body.style.overflow = 'hidden';
  return new Promise((resolve) => {
    const numEl = document.getElementById('loader-num');
    const fillEl = document.getElementById('loader-fill');
    let progress = 0;

    const interval = setInterval(() => {
      progress += Math.random() * 4 + 2;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          document.getElementById('loader').classList.add('hidden');
          document.body.style.overflow = '';
          setTimeout(resolve, 1500);
        }, 400);
      }
      fillEl.style.width = progress + '%';
      numEl.textContent = Math.floor(progress);
      if (progress > 20) numEl.classList.add('show');
    }, 45);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await runLoader();
  window.scrollTo(0, 0);
  loadFestivals();
  setupSearch();
});

// 搜索
function setupSearch() {
  const searchInput = document.getElementById('search-input');
  let debounceTimer;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadFestivals(1, searchInput.value.trim());
    }, 400);
  });
}

// 加载节日数据
async function loadFestivals(page = 1, keyword = '') {
  const grid = document.getElementById('festivals-list');
  grid.innerHTML = skeletonHTML(6);

  try {
    const params = new URLSearchParams({ page, pageSize: 12 });
    if (keyword) params.set('keyword', keyword);

    const res = await fetch(`${API_BASE}?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json.success) throw new Error('API error');

    renderFestivals(json.data, json.total, json.page, json.totalPages);
    updateStats(json.data);
    renderTags(json.data);
  } catch (err) {
    // 接口不可用时改用内置静态数据（纯静态部署场景），搜索同样可用
    console.warn('接口不可用，使用静态兜底数据:', err);
    const kw = (keyword || '').trim();
    const data = kw
      ? STATIC_FESTIVALS.filter(f => f.name.includes(kw) || f.description.includes(kw) || f.customs.some(c => c.includes(kw)))
      : STATIC_FESTIVALS;
    renderFestivals(data, data.length, 1, 1);
    updateStats(data);
    renderTags(data);
  }
}

// 骨架屏
function skeletonHTML(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="festival-card skeleton">
        <div class="skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton-line w-60"></div>
          <div class="skeleton-line w-90"></div>
          <div class="skeleton-line w-80"></div>
          <div class="skeleton-line w-40"></div>
        </div>
      </div>`;
  }
  return html;
}

// 错误提示
function errorHTML(msg) {
  return `<div class="empty-state"><div class="empty-icon"><img src="images/icon-empty.svg" alt=""></div><p>${msg}</p></div>`;
}

// 渲染节日卡片
function renderFestivals(data, total, page, totalPages) {
  const grid = document.getElementById('festivals-list');

  if (!data || data.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon"><img src="images/icon-empty.svg" alt=""></div><p>没有找到匹配的节日</p></div>`;
    return;
  }

  grid.innerHTML = data.map((f, i) => `
    <a href="${PAGE_MAP[f.id] || 'detail.html?id='+f.id}" class="festival-card fade-in" style="animation-delay:${i * 0.08}s">
      <div class="festival-image">
        <img data-src="${f.images[0] || ''}" src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#fef3f2" width="200" height="200"/><rect x="60" y="70" width="80" height="60" fill="none" stroke="#c41e3a" stroke-width="4" rx="4"/><circle cx="100" cy="100" r="20" fill="none" stroke="#c41e3a" stroke-width="3"/></svg>')}" alt="${f.name}" class="lazy-img">
        <div class="festival-date-badge">${f.date}</div>
      </div>
      <div class="festival-info">
        <h3 class="festival-name">${f.name}</h3>
        <p class="festival-desc">${f.description}</p>
        <div class="festival-customs">
          ${f.customs.slice(0, 3).map(c => `<span class="custom-tag">${c}</span>`).join('')}
        </div>
        <div class="festival-link">
          <span>查看详情</span>
          <span>→</span>
        </div>
      </div>
    </a>
  `).join('');

  // 图片懒加载
  lazyLoadImages();
}

// 统计
function updateStats(data) {
  const totalFestivals = data.length;
  const totalCustoms = data.reduce((sum, f) => sum + f.customs.length, 0);
  const totalActivities = data.reduce((sum, f) => sum + f.activities.length, 0);

  animateNumber('festivals-count', totalFestivals);
  animateNumber('customs-count', totalCustoms);
  animateNumber('activities-count', totalActivities);
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  let cur = 0;
  const step = Math.ceil(target / 30);
  const t = setInterval(() => {
    cur += step;
    if (cur >= target) { cur = target; clearInterval(t); }
    el.textContent = cur;
  }, 40);
}

// 底部标签
function renderTags(data) {
  document.getElementById('festival-tags').innerHTML =
    data.map(f => `<a href="${PAGE_MAP[f.id] || 'detail.html?id='+f.id}" class="tag">${f.name}</a>`).join('');
}

// 懒加载
function lazyLoadImages() {
  const imgs = document.querySelectorAll('img.lazy-img');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy-img');
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '100px' });
    imgs.forEach(img => observer.observe(img));
  } else {
    imgs.forEach(img => {
      img.src = img.dataset.src;
      img.classList.remove('lazy-img');
    });
  }
}
