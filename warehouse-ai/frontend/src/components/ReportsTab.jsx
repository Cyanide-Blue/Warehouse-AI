import React, { useState, useEffect } from 'react';
import api from '../services/api';

function ReportsTab() {
  const [isExporting, setIsExporting] = useState(false);
  const [period, setPeriod] = useState('month'); // 'week' | 'month' | 'quarter' | 'year'
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts(0, 100);
      setProducts(data || []);
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const allProducts = await api.getProducts(0, 1000);
      
      if (!allProducts || allProducts.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
      }

      const headers = ["Mã SKU", "Tên Sản Phẩm", "Danh mục", "Đơn vị tính", "Tồn kho", "Mức tối thiểu", "Trạng thái"];
      
      const rows = allProducts.map(p => {
        const isOutOfStock = p.current_stock <= 0;
        const isLow = p.current_stock < p.minimum_stock;
        const status = isOutOfStock ? 'Hết hàng' : isLow ? 'Sắp hết' : 'Còn hàng';
        return [
          `"${p.code}"`,
          `"${p.name}"`,
          `"${p.category?.name || ''}"`,
          `"${p.unit?.name || ''}"`,
          p.current_stock,
          p.minimum_stock,
          `"${status}"`
        ].join(',');
      });

      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const csvContent = headers.join(',') + '\n' + rows.join('\n');
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `bao_cao_ton_kho_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      alert(`Lỗi khi xuất dữ liệu: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Mocked analytics data based on loaded products
  const totalStock = products.reduce((acc, p) => acc + (p.current_stock || 0), 0);
  const outOfStock = products.filter(p => p.current_stock <= 0).length;
  const lowStock = products.filter(p => p.current_stock > 0 && p.current_stock < p.minimum_stock).length;
  const safeStock = products.filter(p => p.current_stock >= p.minimum_stock).length;

  const barData = [
    { label: 'T2', nhập: 42, xuất: 28 },
    { label: 'T3', nhập: 65, xuất: 45 },
    { label: 'T4', nhập: 30, xuất: 52 },
    { label: 'T5', nhập: 85, xuất: 60 },
    { label: 'T6', nhập: 90, xuất: 75 },
    { label: 'T7', nhập: 25, xuất: 35 },
    { label: 'CN', nhập: 10, xuất: 12 },
  ];

  return (
    <>
      {/* Header: 1 Primary CTA */}
      <header className="topbar">
        <div className="topbar-left">
          <p className="eyebrow">Phân tích dữ liệu</p>
          <h1>Báo cáo & Thống kê</h1>
          <p className="topbar-desc">
            Phân tích số liệu nhập xuất, tỷ trọng phân bổ hàng hóa và trích xuất dữ liệu kế toán.
          </p>
        </div>
        <div className="topbar-actions">
          <button 
            className="primary-btn" 
            onClick={handleExportExcel}
            disabled={isExporting}
          >
            {isExporting ? 'Đang trích xuất...' : 'Xuất báo cáo (CSV)'}
          </button>
        </div>
      </header>

      {/* Period Selector Tabs (Underlined) */}
      <div className="filter-tabs" role="tablist">
        <button 
          role="tab"
          aria-selected={period === 'week'}
          className={`filter-tab-btn ${period === 'week' ? 'active' : ''}`}
          onClick={() => setPeriod('week')}
        >
          7 ngày qua
        </button>
        <button 
          role="tab"
          aria-selected={period === 'month'}
          className={`filter-tab-btn ${period === 'month' ? 'active' : ''}`}
          onClick={() => setPeriod('month')}
        >
          Tháng này
        </button>
        <button 
          role="tab"
          aria-selected={period === 'quarter'}
          className={`filter-tab-btn ${period === 'quarter' ? 'active' : ''}`}
          onClick={() => setPeriod('quarter')}
        >
          Quý này
        </button>
        <button 
          role="tab"
          aria-selected={period === 'year'}
          className={`filter-tab-btn ${period === 'year' ? 'active' : ''}`}
          onClick={() => setPeriod('year')}
        >
          Năm nay
        </button>
      </div>

      {/* 2-Column Grid: Charts (Yellow accent + dark/gray tones) */}
      <section className="dashboard-grid" style={{ marginBottom: '24px' }}>
        {/* Biểu đồ nhập/xuất */}
        <article className="panel dashboard-main">
          <div className="panel-header">
            <div className="panel-title-group">
              <h2>Biến động giao dịch nhập / xuất</h2>
              <small className="caption">Khối lượng sản phẩm luân chuyển theo ngày</small>
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--accent)', borderRadius: '2px', display: 'inline-block' }}></span>
                Nhập kho
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--black)', borderRadius: '2px', display: 'inline-block' }}></span>
                Xuất kho
              </span>
            </div>
          </div>

          {/* Clean CSS/SVG Bar Chart */}
          <div style={{ padding: '16px 0 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '220px', borderBottom: '1px solid var(--line)' }}>
            {barData.map((d, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '170px' }}>
                  {/* Nhập kho (Yellow) */}
                  <div 
                    title={`Nhập: ${d.nhập}`}
                    style={{ 
                      width: '18px', 
                      height: `${(d.nhập / 100) * 160}px`, 
                      backgroundColor: 'var(--accent)', 
                      borderRadius: '2px 2px 0 0'
                    }} 
                  />
                  {/* Xuất kho (Black) */}
                  <div 
                    title={`Xuất: ${d.xuất}`}
                    style={{ 
                      width: '18px', 
                      height: `${(d.xuất / 100) * 160}px`, 
                      backgroundColor: 'var(--black)', 
                      borderRadius: '2px 2px 0 0'
                    }} 
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 500 }}>{d.label}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: 'var(--ink-muted)' }}>
            <span>Tổng nhập tuần: <strong>347 sản phẩm</strong></span>
            <span>Tổng xuất tuần: <strong>307 sản phẩm</strong></span>
            <span>Tỷ lệ luân chuyển: <strong>88.5%</strong></span>
          </div>
        </article>

        {/* Cơ cấu tồn kho theo trạng thái */}
        <article className="panel dashboard-side">
          <div className="panel-header">
            <div className="panel-title-group">
              <h2>Cơ cấu an toàn kho</h2>
              <small className="caption">Tỷ lệ theo định mức tối thiểu</small>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span>Định mức an toàn ({safeStock})</span>
                <strong className="tabular">{products.length ? Math.round((safeStock / products.length) * 100) : 0}%</strong>
              </div>
              <div style={{ height: '8px', backgroundColor: '#F0ECE1', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${products.length ? (safeStock / products.length) * 100 : 0}%`, height: '100%', backgroundColor: 'var(--status-ok-dot)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span>Chạm ngưỡng tối thiểu ({lowStock})</span>
                <strong className="tabular">{products.length ? Math.round((lowStock / products.length) * 100) : 0}%</strong>
              </div>
              <div style={{ height: '8px', backgroundColor: '#F0ECE1', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${products.length ? (lowStock / products.length) * 100 : 0}%`, height: '100%', backgroundColor: 'var(--status-warn-dot)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span>Hết hàng / 0 tồn ({outOfStock})</span>
                <strong className="tabular">{products.length ? Math.round((outOfStock / products.length) * 100) : 0}%</strong>
              </div>
              <div style={{ height: '8px', backgroundColor: '#F0ECE1', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${products.length ? (outOfStock / products.length) * 100 : 0}%`, height: '100%', backgroundColor: 'var(--status-danger-dot)' }} />
              </div>
            </div>

            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: '#FAF8EE', 
              border: '1px solid var(--line)', 
              borderRadius: 'var(--radius-sm)'
            }}>
              <span className="caption">Tổng số lượng hàng thực tồn:</span>
              <p style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }} className="tabular">
                {totalStock.toLocaleString('vi-VN')} <small style={{ fontSize: '12px', fontWeight: 400 }}>đơn vị</small>
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* Bảng chi tiết mặt hàng */}
      <article className="panel">
        <div className="panel-header">
          <div className="panel-title-group">
            <h2>Bảng tổng hợp chi tiết hàng hóa</h2>
            <small className="caption">Dữ liệu nguồn phục vụ xuất báo cáo kiểm kê</small>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
            Đang tải dữ liệu báo cáo...
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
                  <th>Tình trạng</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '28px', color: 'var(--ink-subtle)' }}>
                      Không có dữ liệu hàng hóa.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isOutOfStock = p.current_stock <= 0;
                    const isLow = !isOutOfStock && p.current_stock < p.minimum_stock;
                    return (
                      <tr key={p.id}>
                        <td>
                          <span className="sku-code">{p.code}</span>
                        </td>
                        <td>{p.name}</td>
                        <td>{p.category?.name || '—'}</td>
                        <td className="num">
                          <strong className="tabular">{p.current_stock}</strong>
                        </td>
                        <td className="num">
                          <span style={{ color: 'var(--ink-muted)' }}>{p.minimum_stock}</span>
                        </td>
                        <td>
                          <span className={`status ${isOutOfStock ? 'danger' : isLow ? 'warning' : 'ok'}`}>
                            {isOutOfStock ? 'Hết hàng' : isLow ? 'Sắp hết' : 'Ổn định'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </>
  );
}

export default ReportsTab;
