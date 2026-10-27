import { useState } from 'react';
import api from './services/api';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await api.login(username, password);
      
      // If we reach here, login was successful
      onLoginSuccess();
      
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoUser = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">W</div>
          <h1>Warehouse AI</h1>
          <p>Đăng nhập để xem dữ liệu quản lý kho</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="input-group">
            <label htmlFor="username">Tài khoản</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              disabled={loading}
              autoComplete="username"
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập ngay'}
          </button>

          <div className="demo-accounts-section">
            <p className="demo-title">💡 Chọn nhanh tài khoản mẫu:</p>
            <div className="demo-buttons">
              <button
                type="button"
                className={`demo-btn ${username === 'admin' ? 'active' : ''}`}
                onClick={() => handleSelectDemoUser('admin', 'password123')}
              >
                👑 Admin
              </button>
              <button
                type="button"
                className={`demo-btn ${username === 'staff' ? 'active' : ''}`}
                onClick={() => handleSelectDemoUser('staff', 'password123')}
              >
                👷 Nhân viên
              </button>
              <button
                type="button"
                className={`demo-btn ${username === 'storekeeper' ? 'active' : ''}`}
                onClick={() => handleSelectDemoUser('storekeeper', 'password123')}
              >
                📦 Thủ kho
              </button>
              <button
                type="button"
                className={`demo-btn ${username === 'accountant' ? 'active' : ''}`}
                onClick={() => handleSelectDemoUser('accountant', 'password123')}
              >
                📊 Kế toán
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
