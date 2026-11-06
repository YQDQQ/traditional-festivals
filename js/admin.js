/**
 * 管理后台 JavaScript — v2.0
 * JWT 鉴权、图片上传、确认弹窗、表单校验
 */

let festivalsAll = [];
let editingId = null;
const TOKEN = localStorage.getItem('adminToken');
const API_HEADERS = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
});

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadData();
  setupModal();
  setupUpload();
  setupLogout();
  setupPassword();
});

// ==================== 鉴权 ====================

async function checkAuth() {
  if (!TOKEN) {
    redirectLogin();
    return;
  }

  try {
    const res = await fetch('/api/admin/verify', {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    if (!res.ok) throw new Error('Invalid token');
    const data = await res.json();
    if (!data.success) throw new Error('Invalid token');
  } catch {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    redirectLogin();
  }
}

function redirectLogin() {
  window.location.href = 'login.html';
}

function setupLogout() {
  document.getElementById('logout-btn').addEventListener('click', () => {
    showConfirm('确定要退出登录吗？', () => {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      redirectLogin();
    });
  });
}

// ==================== 数据加载 ====================

async function loadData() {
  showToast('加载中...', 'info');
  try {
    const res = await fetch('/api/admin/festivals', { headers: API_HEADERS() });
    if (res.status === 401) { redirectLogin(); return; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json.success) throw new Error('API error');

    festivalsAll = json.data;
    renderStats();
    renderTable(festivalsAll);
    hideToast();
  } catch (err) {
    console.error('加载失败:', err);
    showToast('加载失败，请刷新页面', 'error');
  }
}

// ==================== 统计 ====================

function renderStats() {
  document.getElementById('admin-festivals-count').textContent = festivalsAll.length;
  document.getElementById('admin-customs-count').textContent = festivalsAll.reduce((s, f) => s + f.customs.length, 0);
  document.getElementById('admin-activities-count').textContent = festivalsAll.reduce((s, f) => s + f.activities.length, 0);
}

// ==================== 表格 ====================

function renderTable(data) {
  const tbody = document.querySelector('#festivals-table tbody');
  const searchKw = document.getElementById('search-festival').value.trim().toLowerCase();

  const filtered = searchKw
    ? data.filter(f => f.name.includes(searchKw) || f.description.includes(searchKw))
    : data;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#999">暂无数据</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(f => `
    <tr>
      <td class="name-col">${f.name}</td>
      <td class="date-col">${f.date}</td>
      <td>${f.customs.length}</td>
      <td>${f.activities.length}</td>
      <td>${f.images.length}</td>
      <td class="table-actions">
        <button class="action-btn edit" data-id="${f.id}">编辑</button>
        <button class="action-btn delete" data-id="${f.id}">删除</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.action-btn.edit').forEach(btn =>
    btn.addEventListener('click', () => openEdit(parseInt(btn.dataset.id)))
  );
  tbody.querySelectorAll('.action-btn.delete').forEach(btn =>
    btn.addEventListener('click', () => handleDelete(parseInt(btn.dataset.id)))
  );

  document.getElementById('search-festival').addEventListener('input', () => {
    renderTable(festivalsAll);
  });
}

// ==================== 修改密码 ====================

function setupPassword() {
  const modal = document.getElementById('password-modal');

  document.getElementById('password-btn').addEventListener('click', () => {
    document.getElementById('password-form').reset();
    document.getElementById('password-error').textContent = '';
    modal.classList.add('show');
  });

  document.getElementById('password-close').addEventListener('click', () => modal.classList.remove('show'));
  document.getElementById('password-cancel').addEventListener('click', () => modal.classList.remove('show'));

  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPwd = document.getElementById('old-password').value;
    const newPwd = document.getElementById('new-password').value;
    const confirmPwd = document.getElementById('confirm-password').value;
    const errorEl = document.getElementById('password-error');

    if (newPwd.length < 4) { errorEl.textContent = '新密码至少4位'; errorEl.classList.add('show'); return; }
    if (newPwd !== confirmPwd) { errorEl.textContent = '两次输入不一致'; errorEl.classList.add('show'); return; }

    try {
      const res = await fetch('/api/admin/password', {
        method: 'PUT', headers: API_HEADERS(),
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
      });
      const json = await res.json();
      if (json.success) {
        modal.classList.remove('show');
        showToast('密码修改成功', 'success');
      } else {
        errorEl.textContent = json.error || '修改失败';
        errorEl.classList.add('show');
      }
    } catch {
      errorEl.textContent = '网络错误';
      errorEl.classList.add('show');
    }
  });
}

// ==================== 日志 ====================

// ==================== 模态框 ====================

function setupModal() {
  const modal = document.getElementById('festival-modal');
  const closeBtn = document.getElementById('modal-close');
  const cancelBtn = document.getElementById('cancel-btn');
  const form = document.getElementById('festival-form');

  document.getElementById('add-festival-btn').addEventListener('click', openAdd);

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  form.addEventListener('submit', handleSubmit);
}

function openAdd() {
  editingId = null;
  document.getElementById('modal-title').textContent = '添加节日';
  document.getElementById('festival-form').reset();
  document.getElementById('festival-id').value = '';
  document.getElementById('preview-images').innerHTML = '';
  document.getElementById('modal-error').textContent = '';
  document.getElementById('festival-modal').classList.add('show');
}

function openEdit(id) {
  const f = festivalsAll.find(x => x.id === id);
  if (!f) return;

  editingId = id;
  document.getElementById('modal-title').textContent = '编辑节日';
  document.getElementById('festival-id').value = f.id;
  document.getElementById('festival-name').value = f.name;
  document.getElementById('festival-date').value = f.date;
  document.getElementById('festival-desc').value = f.description;
  document.getElementById('festival-customs').value = f.customs.join(', ');
  document.getElementById('festival-activities').value = f.activities.join(', ');
  document.getElementById('festival-images').value = f.images.join(', ');
  document.getElementById('modal-error').textContent = '';
  // 预览已有图片
  const preview = document.getElementById('preview-images');
  preview.innerHTML = f.images.map(img =>
    `<div class="preview-item"><img src="${img}" onerror="this.style.display='none'"></div>`
  ).join('');
  document.getElementById('festival-modal').classList.add('show');
}

function closeModal() {
  document.getElementById('festival-modal').classList.remove('show');
  editingId = null;
}

// ==================== 图片上传 ====================

function setupUpload() {
  const input = document.getElementById('image-upload-input');
  const btn = document.getElementById('upload-trigger');
  const preview = document.getElementById('preview-images');

  btn.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const files = input.files;
    if (!files.length) return;

    btn.disabled = true;
    btn.textContent = '上传中...';

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${TOKEN}` },
          body: formData
        });

        const json = await res.json();
        if (json.success) {
          // 添加到图片列表
          const imgInput = document.getElementById('festival-images');
          const current = imgInput.value.trim();
          imgInput.value = current ? current + ', ' + json.url : json.url;

          // 预览
          preview.innerHTML += `<div class="preview-item"><img src="${json.url}"><button class="preview-remove" data-url="${json.url}">×</button></div>`;
          bindPreviewRemove();
        } else {
          showToast('上传失败: ' + (json.error || '未知错误'), 'error');
        }
      } catch (err) {
        showToast('上传失败，请重试', 'error');
      }
    }

    btn.disabled = false;
    btn.textContent = '选择图片';
    input.value = '';
  });
}

function bindPreviewRemove() {
  document.querySelectorAll('.preview-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      const imgInput = document.getElementById('festival-images');
      const images = imgInput.value.split(',').map(s => s.trim()).filter(s => s && s !== url);
      imgInput.value = images.join(', ');
      btn.parentElement.remove();
    });
  });
}

// ==================== 表单提交 ====================

async function handleSubmit(e) {
  e.preventDefault();

  const errorEl = document.getElementById('modal-error');
  errorEl.textContent = '';

  const name = document.getElementById('festival-name').value.trim();
  const date = document.getElementById('festival-date').value.trim();
  const desc = document.getElementById('festival-desc').value.trim();

  if (!name) { errorEl.textContent = '请输入节日名称'; return; }
  if (!date) { errorEl.textContent = '请输入节日日期'; return; }
  if (!desc) { errorEl.textContent = '请输入节日描述'; return; }

  const customs = document.getElementById('festival-customs').value.split(',').map(s => s.trim()).filter(Boolean);
  const activities = document.getElementById('festival-activities').value.split(',').map(s => s.trim()).filter(Boolean);
  const images = document.getElementById('festival-images').value.split(',').map(s => s.trim()).filter(Boolean);

  const body = { name, date, description: desc, customs, activities, images };

  const url = editingId ? `/api/admin/festivals/${editingId}` : '/api/admin/festivals';
  const method = editingId ? 'PUT' : 'POST';

  const submitBtn = document.querySelector('#festival-form button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = '保存中...';

  try {
    const res = await fetch(url, {
      method,
      headers: API_HEADERS(),
      body: JSON.stringify(body)
    });

    if (res.status === 401) { redirectLogin(); return; }

    const json = await res.json();

    if (json.success) {
      closeModal();
      showToast(editingId ? '更新成功' : '添加成功', 'success');
      loadData();
    } else {
      errorEl.textContent = json.error || '操作失败';
    }
  } catch (err) {
    errorEl.textContent = '网络错误，请重试';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '保存';
  }
}

// ==================== 删除 ====================

function handleDelete(id) {
  const festival = festivalsAll.find(f => f.id === id);
  showConfirm(`确定要删除「${festival?.name || '该节日'}」吗？此操作不可撤销。`, async () => {
    try {
      const res = await fetch(`/api/admin/festivals/${id}`, {
        method: 'DELETE',
        headers: API_HEADERS()
      });

      if (res.status === 401) { redirectLogin(); return; }

      const json = await res.json();
      if (json.success) {
        showToast('删除成功', 'success');
        loadData();
      } else {
        showToast(json.error || '删除失败', 'error');
      }
    } catch (err) {
      showToast('网络错误，请重试', 'error');
    }
  });
}

// ==================== 确认弹窗 ====================

function showConfirm(message, onConfirm) {
  const overlay = document.getElementById('confirm-overlay');
  document.getElementById('confirm-message').textContent = message;
  overlay.classList.add('show');

  const okBtn = document.getElementById('confirm-ok');
  const cancelBtn = document.getElementById('confirm-cancel');

  const cleanup = () => {
    overlay.classList.remove('show');
    okBtn.removeEventListener('click', handler);
    cancelBtn.removeEventListener('click', cleanup);
  };

  function handler() {
    cleanup();
    onConfirm();
  }

  okBtn.addEventListener('click', handler);
  cancelBtn.addEventListener('click', cleanup);
}

// ==================== Toast ====================

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  if (type !== 'info') {
    toast._timer = setTimeout(hideToast, 3000);
  }
}

function hideToast() {
  document.getElementById('toast').classList.remove('show');
}
