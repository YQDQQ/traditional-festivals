/**
 * 登录页 JavaScript — v2.0
 * JWT 鉴权
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const toggleBtn = document.getElementById('password-toggle');
  const pwd = document.getElementById('password');
  const usernameInput = document.getElementById('username');
  const submitBtn = document.getElementById('submit-btn');

  // 密码显隐
  toggleBtn.addEventListener('click', () => {
    const show = pwd.type === 'password';
    pwd.type = show ? 'text' : 'password';
    toggleBtn.textContent = show ? '隐藏' : '显示';
  });

  // 登录
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = pwd.value;
    const errorEl = document.getElementById('login-error');

    if (!username || !password) {
      errorEl.textContent = '请填写用户名和密码';
      errorEl.classList.add('show');
      return;
    }

    errorEl.classList.remove('show');
    submitBtn.disabled = true;
    submitBtn.textContent = '登录中...';

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        window.location.href = 'admin.html';
      } else {
        errorEl.textContent = data.error || '用户名或密码错误';
        errorEl.classList.add('show');
        submitBtn.disabled = false;
        submitBtn.textContent = '登录';
      }
    } catch (err) {
      errorEl.textContent = '网络错误，请稍后重试';
      errorEl.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.textContent = '登录';
    }
  });

  // 回车提交
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement !== submitBtn) {
      form.dispatchEvent(new Event('submit'));
    }
  });
});
