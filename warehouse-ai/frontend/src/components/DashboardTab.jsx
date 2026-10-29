import { useState, useEffect } from 'react';
import api from '../services/api';

function DashboardTab({ onNavigateTab }) {
  const [stats, setStats] = useState([
    { label: 'Tổng hàng tồn', value: '0', change: '0 SKU' },
    { label: 'Phiếu nhập', value: '0', change: '0 hoàn thành' },
    { label: 'Phiếu xuất', value: '0', change: '0 hoàn thành' },
    { label: 'Sản phẩm dưới mức tối thiểu', value: '0', change: 'Mức an toàn' },
  ]);

  const [inventoryData, setInventoryData] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
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
        { 
          label: 'Tổng hàng tồn', 
          value: totalStock.toLocaleString('vi-VN'), 
          change: `${products.length} danh mục SKU` 
        },
        { 
          label: 'Phiếu nhập', 
          value: importsCount.toString(), 
          change: 'Giao dịch ghi nhận' 
        },
        { 
          label: 'Phiếu xuất', 
          value: exportsCount.toString(), 
          change: 'Giao dịch ghi nhận' 
        },
        { 
          label: 'Sản phẩm dưới mức tối thiểu', 
          value: lowStockCount.toString(), 
          change: lowStockCount > 0 ? 'Cần lập phiếu bổ sung' : 'Đảm bảo định mức an toàn' 
        },
      ]);

      // Format inventory data
      const inventoryItems = products.slice(0, 8).map((p) => ({
        id: p.id,
        sku: p.code || '—',
        name: p.name || '—',
        category: p.category?.name || '—',
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
      setLowStockProducts(lowStock.slice(0, 5));

    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToImport = () => {
    if (onNavigateTab) {
      onNavigateTab('imports');
    }
  };

  const handleGoToProducts = () => {
    if (onNavigateTab) {
      onNavigateTab('products');
    }
  };

  return (
    <>
      {/* Page Header: Eyebrow + Title (Left) -> 1 Primary CTA (Right) */}
      <header className="topbar">
        <div className="topbar-left">
          <p className="eyebrow">Tổng quan hệ thống</p>
          <h1>Dashboard kho hàng</h1>
          <p className="topbar-desc">
            Theo dõi tồn kho, cảnh báo thiếu hụt và tổng hợp biến động xuất nhập theo thời gian thực.
          </p>
        </div>
        <div className="topbar-actions">
          <button className="primary-btn" onClick={handleGoToImport}>
            Tạo phiếu nhập mới
          </button>
        </div>
      </header>

      {/* Error state */}
      {error && (
        <div className="alert-banner error" role="alert">
          <span>Không thể tải dữ liệu: {error}</span>
          <button className="ghost-btn" style={{ marginLeft: 'auto', padding: '4px 10px', minHeight: 'auto' }} onClick={loadDashboard}>
            Thử lại
          </button>
        </div>
      )}

      {/* 4 KPI metrics: Dạng khối phẳng ngăn cách bằng đường kẻ dọc */}
      <section className="kpi-row" aria-label="Chỉ số chính">
        {stats.map((item) => (
          <article key={item.label} className="kpi-item">
            <span className="kpi-label">{item.label}</span>
            <span className="kpi-value">{item.value}</span>
            <span className="kpi-sub">{item.change}</span>
          </article>
        ))}
      </section>

      {/* 12-Column Grid: 8 Columns Inventory Table + 4 Columns AI Alerts */}
      <section className="dashboard-grid">
        {/* Main 8-column Table */}
        <article className="panel dashboard-main">
          <div className="panel-header">
            <div className="panel-title-group">
              <h2>Tình trạng hàng tồn kho</h2>
              <small className="caption">Danh sách sản phẩm có phát sinh biến động gần nhất</small>
            </div>
            <button className="ghost-btn" onClick={handleGoToProducts}>
              Xem tất cả hàng hóa
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
              Đang đồng bộ dữ liệu kho hàng...
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Mã SKU</th>
                    <th>Tên sản phẩm</th>
                    <th>Danh mục</th>
                    <th className="num">Tồn thực tế</th>
                    <th className="num">Mức tối thiểu</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryData.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--ink-subtle)' }}>
                        Chưa có dữ liệu tồn kho.
                      </td>
                    </tr>
                  ) : (
                    inventoryData.map((item) => (
                      <tr key={item.sku}>
                        <td>
                          <span className="sku-code">{item.sku}</span>
                        </td>
                        <td>
                          <strong style={{ fontWeight: 500 }}>{item.name}</strong>
                        </td>
                        <td>
                          {item.category === '—' ? <span className="empty-cell">—</span> : item.category}
                        </td>
                        <td className="num">
                          <strong style={{ fontWeight: 600 }}>{item.stock}</strong>
                        </td>
                        <td className="num">
                          <span style={{ color: 'var(--ink-muted)' }}>{item.min}</span>
                        </td>
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

        {/* Side 4-column AI Alerts */}
        <article className="panel dashboard-side">
          <div className="panel-header">
            <div className="panel-title-group">
              <h2>Cảnh báo thiếu hụt</h2>
              <small className="caption">Sản phẩm chạm ngưỡng an toàn</small>
            </div>
            <button className="text-btn" onClick={loadDashboard}>
              Làm mới
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
              Đang kiểm tra ngưỡng an toàn...
            </div>
          ) : lowStockProducts.length === 0 ? (
            <div style={{ 
              padding: '24px 16px', 
              textAlign: 'center', 
              backgroundColor: '#FAF8EE', 
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <p style={{ fontWeight: 500, fontSize: '13px', marginBottom: '4px' }}>Tất cả định mức đều an toàn</p>
              <small className="caption">Chưa ghi nhận sản phẩm nào dưới mức tồn kho tối thiểu.</small>
            </div>
          ) : (
            <div className="alert-items-list">
              {lowStockProducts.map((p) => {
                const isOutOfStock = p.current_stock <= 0;
                return (
                  <div 
                    key={p.id} 
                    className={`alert-item-card ${isOutOfStock ? 'danger' : ''}`}
                  >
                    <div className="alert-item-header">
                      <span className="alert-product-name">{p.name}</span>
                      <span className={`status ${isOutOfStock ? 'danger' : 'warning'}`}>
                        {isOutOfStock ? 'Hết hàng' : 'Thiếu hàng'}
                      </span>
                    </div>

                    <div className="alert-stock-info">
                      Tồn hiện tại: <strong>{p.current_stock}</strong> / Mức tối thiểu: <strong>{p.minimum_stock}</strong>
                    </div>

                    <div className="alert-item-actions">
                      <button 
                        className="ghost-btn" 
                        style={{ padding: '4px 10px', fontSize: '12px', minHeight: '30px' }}
                        onClick={handleGoToImport}
                      >
                        Nhập hàng
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </>
  );
}

export default DashboardTab;
