import React, { useState } from 'react';
import api from '../services/api';

function ReportsTab() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      // Fetch all products
      const products = await api.getProducts(0, 1000);
      
      if (!products || products.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
      }

      // Prepare CSV content
      const headers = ["Mã SKU", "Tên Sản Phẩm", "Danh mục", "Đơn vị tính", "Tồn kho", "Mức tối thiểu", "Trạng thái"];
      
      const rows = products.map(p => {
        const status = p.current_stock < p.minimum_stock ? 'Cần nhập' : (p.current_stock === 0 ? 'Hết hàng' : 'Ổn định');
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

      // Add BOM for Excel UTF-8 support
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

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Phân tích dữ liệu</p>
          <h1>Báo cáo & Thống kê</h1>
        </div>
        <button 
          className="primary-btn" 
          onClick={handleExportExcel}
          disabled={isExporting}
        >
          {isExporting ? 'Đang xử lý...' : 'Xuất báo cáo (Excel/CSV)'}
        </button>
      </header>

      <section className="content-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <article className="panel" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <h2>Biểu đồ nhập/xuất kho</h2>
            <span className="status ok">Tuần này</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', border: '2px dashed rgba(148, 163, 184, 0.1)', borderRadius: '12px', margin: '10px 0' }}>
            [Khu vực hiển thị biểu đồ Chart.js/Recharts]
          </div>
        </article>

        <article className="panel" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <h2>Cơ cấu hàng hoá theo danh mục</h2>
            <span className="status warning">Tháng này</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', border: '2px dashed rgba(148, 163, 184, 0.1)', borderRadius: '12px', margin: '10px 0' }}>
            [Khu vực hiển thị biểu đồ tròn Pie Chart]
          </div>
        </article>
      </section>

      <article className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-header">
          <h2>Top sản phẩm xuất nhiều nhất</h2>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
          Tính năng đang được phát triển...
        </div>
      </article>
    </>
  );
}

export default ReportsTab;
