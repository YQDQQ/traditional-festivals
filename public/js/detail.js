/**
 * 详情页 JavaScript — v2.0
 * 沉浸式叙事布局：全屏 banner、引用块描述、卡片流习俗/活动、横向画册、节日推荐
 */

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) { window.location.href = 'index.html'; return; }
  loadDetail(parseInt(id));
});

const PAGE_MAP = {1:'春节.html',2:'元宵节.html',3:'清明节.html',4:'端午节.html',5:'七夕节.html',6:'中秋节.html',7:'重阳节.html',8:'冬至.html'};

function getPageUrl(festival) {
  return PAGE_MAP[festival.id] || `detail.html?id=${festival.id}`;
}

// 习俗/活动图标映射
const CUSTOM_ICONS = {};
const ACTIVITY_ICONS = {};

function getIcon(text, pool) {
  return '';
}

async function loadDetail(id) {
  const container = document.getElementById('detail-content');
  container.innerHTML = loadingHTML();

  try {
    const [detailRes, allRes] = await Promise.all([
      fetch(`/api/festivals/${id}`),
      fetch('/api/festivals/all')
    ]);

    if (!detailRes.ok) throw new Error(detailRes.status === 404 ? 'NOT_FOUND' : 'HTTP_ERR');

    const detailJson = await detailRes.json();
    if (!detailJson.success) throw new Error('API_ERR');

    const allJson = await allRes.json();
    const related = (allJson.data || []).filter(f => f.id !== detailJson.data.id).slice(0, 4);

    renderDetail(detailJson.data, related);
  } catch (err) {
    container.innerHTML = errorHTML(err.message);
  }
}

function loadingHTML() {
  return `
    <section class="detail">
      <div class="container">
        <div class="detail-loading">
          <div class="skeleton-img detail-skeleton-img"></div>
          <div class="skeleton-body" style="padding:2rem">
            <div class="skeleton-line w-40" style="height:1.8rem;margin-bottom:1.5rem"></div>
            <div class="skeleton-line w-25"></div>
            <div class="skeleton-line w-90"></div>
            <div class="skeleton-line w-80"></div>
            <div class="skeleton-line w-60"></div>
          </div>
        </div>
      </div>
    </section>`;
}

function errorHTML(code) {
  const msg = code === 'NOT_FOUND' ? '该节日不存在或已被删除' : '加载失败，请稍后重试';
  return `
    <section class="detail">
      <div class="container">
        <div class="empty-state" style="padding:4rem 0">
          <div class="empty-icon"><img src="images/icon-empty.svg" alt=""></div>
          <p>${msg}</p>
          <a href="index.html" class="btn-secondary" style="display:inline-block;margin-top:1rem">返回首页</a>
        </div>
      </div>
    </section>`;
}

function renderDetail(festival, related) {
  document.getElementById('page-title').textContent = `${festival.name} - 中华传统节日文化`;

  document.getElementById('detail-content').innerHTML = `
    <section class="detail">
      <div class="container">
        <!-- 全屏 Banner -->
        <div class="detail-banner fade-in">
          <img src="${festival.images[0] || ''}" alt="${festival.name}" onerror="this.parentElement.style.background='var(--paper-dark)';this.style.display='none'">
          <div class="detail-banner-overlay"></div>
          <div class="detail-banner-text">
            <h1 class="detail-title">${festival.name}</h1>
            <span class="detail-date">${festival.date}</span>
          </div>
        </div>

        <!-- 描述引用块 -->
        <div class="detail-intro fade-in" style="animation-delay:0.1s">
          <p>${festival.description}</p>
        </div>

        <!-- 节日起源 -->
        ${festival.origin ? `
        <div class="detail-intro fade-in" style="animation-delay:0.15s">
          <div class="detail-subtitle">历史起源</div>
          <p>${festival.origin}</p>
        </div>` : ''}

        <!-- 节日美食 -->
        ${festival.food ? `
        <div class="detail-intro fade-in" style="animation-delay:0.2s">
          <div class="detail-subtitle">节日美食</div>
          <p>${festival.food}</p>
        </div>` : ''}

        <!-- 相关诗词 -->
        ${festival.poetry ? `
        <div class="detail-poetry fade-in" style="animation-delay:0.25s">
          <div class="detail-subtitle">相关诗词</div>
          <p>${festival.poetry}</p>
        </div>` : ''}

        <!-- 习俗 / 活动 -->
        <div class="detail-sections fade-in" style="animation-delay:0.2s">
          <div class="detail-section-block">
            <div class="section-label">传 统 习 俗</div>
            <div class="custom-card-list">
              ${festival.customs.map(c => `
                <div class="custom-card-item">
                  <span class="custom-name">${c}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="detail-section-block">
            <div class="section-label">相 关 活 动</div>
            <div class="activity-card-list">
              ${festival.activities.map(a => `
                <div class="activity-card-item">
                  <span class="activity-name">${a}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- 横向滑动画廊 -->
        ${festival.images.length > 1 ? `
        <div class="detail-gallery-section fade-in" style="animation-delay:0.3s">
          <div class="gallery-section-label">节 日 图 集</div>
          <div class="gallery-scroll">
            ${festival.images.map(img => `
              <div class="gallery-scroll-item">
                <img src="${img}" alt="${festival.name}" loading="lazy" onerror="this.parentElement.style.display='none'">
              </div>
            `).join('')}
          </div>
        </div>` : ''}

        <!-- 相关节日推荐 -->
        ${related.length > 0 ? `
        <div class="related-section fade-in" style="animation-delay:0.4s">
          <div class="related-section-label">探 索 更 多 节 日</div>
          <div class="related-grid">
            ${related.map(r => `
              <a href="${getPageUrl(r)}" class="related-card">
                <div class="related-card-name">${r.name}</div>
                <div class="related-card-date">${r.date}</div>
              </a>
            `).join('')}
          </div>
        </div>` : ''}
      </div>
    </section>`;
}
