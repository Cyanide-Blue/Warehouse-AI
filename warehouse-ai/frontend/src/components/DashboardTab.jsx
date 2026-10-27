import { useState, useEffect } from 'react';
import api from '../services/api';

function DashboardTab() {
  const [stats, setStats] = useState([
    { label: 'Tổng hàng tồn', value: '0', change: '+0%' },
    { label: 'Phiếu nhập', value: '0', change: '+0%' },
    { label: 'Phiếu xuất', value: '0', change: '+0%' },
    { label: 'Sản phẩm dưới mức tối thiểu', value: '0', change: '+0' },
  ]);

  const [inventoryData, setInventoryData] = useState([]);
  const [alerts, setAlerts] = useState([
    'Hệ thống đang kết nối với server...'
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch products, low-stock, and receipts in parallel
      const [productsRes, lowStockRes, importsRes, exportsRes] = await Promise.allSettled([
        api.getProducts(0, 100),
        api.getLowStockProducts(20),
        api.getImportReceipts(0, 100),
        api.getExportReceipts(0, 100),
      ]);

      const products = (productsRes.status === 'fulfilled' && Array.isArray(productsRes.value)) 
        ? productsRes.value 
        : [];
        
      const lowStock = (lowStockRes.status === 'fulfilled' && Array.isArray(lowStockRes.value)) 
        ? lowStockRes.value 
        : [];

      const importsCount = (importsRes.status === 'fulfilled' && Array.isArray(importsRes.value))
        ? importsRes.value.length
        : 0;

      const exportsCount = (exportsRes.status === 'fulfilled' && Array.isArray(exportsRes.value))
        ? exportsRes.value.length
        : 0;

      // Calculate statistics
      const totalStock = products.reduce((sum, p) => sum + (Number(p.current_stock) || 0), 0);
      const lowStockCount = lowStock.length;

      setStats([
        { label: 'Tổng hàng tồn', value: totalStock.toLocaleString('vi-VN'), change: `${products.length} SKU` },
        { label: 'Phiếu nhập', value: importsCount.toString(), change: 'Đã tạo' },
        { label: 'Phiếu xuất', value: exportsCount.toString(), change: 'Đã tạo' },
        { label: 'Sản phẩm dưới mức tối thiểu', value: lowStockCount.toString(), change: lowStockCount > 0 ? `⚠️ Cần nhập ngay` : 'Đầy đủ' },
      ]);

      // Format inventory data
      const inventoryItems = products.slice(0, 10).map((p) => ({
        sku: p.code || 'N/A',
        name: p.name || 'N/A',
        stock: p.current_stock || 0,
        min: p.minimum_stock || 0,
        status:
          p.current_stock <= 0
            ? 'Hết hàng'
            : p.current_stock < p.minimum_stock
            ? 'Thiếu hàng'
            : 'Ổn định',
      }));

      setInventoryData(inventoryItems);

      // Set alerts based on low stock
      const alertMessages = lowStock.slice(0, 4).map((p) => 
        `Cảnh báo: Sản phẩm "${p.name}" (Mã: ${p.code}) hiện còn ${p.current_stock}, dưới mức tối thiểu ${p.minimum_stock}.`
      );
      
      if (alertMessages.length === 0) {
        alertMessages.push('Tất cả sản phẩm đều đảm bảo mức tồn an toàn.');
        alertMessages.push('Hệ thống hoạt động ổn định và sẵn sàng.');
      }

      setAlerts(alertMessages);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Lỗi kết nối đến server.');
      setAlerts(['Không thể tải thông tin từ máy chủ.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Tổng quan hệ thống</p>
          <h1>Dashboard kho hàng</h1>
        </div>
        <button className="primary-btn">+ Tạo báo cáo</button>
      </header>

      {error && (
        <div style={{ 
          padding: '16px', 
          background: 'rgba(239, 68, 68, 0.1)', 
          color: '#fca5a5',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          ⚠️ {error}
        </div>
      )}

      <section className="stats-grid">
        {stats.map((item) => (
          <article key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <em>{item.change}</em>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel inventory-panel">
          <div className="panel-header">
            <h2>Tồn kho theo sản phẩm</h2>
            <button className="ghost-btn">Xem tất cả</button>
          </div>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Đang tải...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Sản phẩm</th>
                    <th>Tồn</th>
                    <th>Tối thiểu</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryData.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    inventoryData.map((item) => (
                      <tr key={item.sku}>
                        <td>{item.sku}</td>
                        <td>{item.name}</td>
                        <td>{item.stock}</td>
                        <td>{item.min}</td>
                        <td>
                          <span
                            className={`status ${
                              item.status === 'Thiếu hàng'
                                ? 'warning'
                                : item.status === 'Hết hàng'
                                ? 'danger'
                                : 'ok'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel alerts-panel">
          <div className="panel-header">
            <h2>Cảnh báo AI</h2>
            <button className="ghost-btn">Phân tích</button>
          </div>

          <ul className="alert-list">
            {alerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </article>
      </section>
    </>
  );
}

export default DashboardTab;
