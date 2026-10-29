import { useState, useEffect } from 'react';
import api from '../services/api';

function ExportsTab() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Form data
  const [products, setProducts] = useState([]);
  
  const [formData, setFormData] = useState({
    receipt_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);

  useEffect(() => {
    loadReceipts();
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const prods = await api.getProducts(0, 100);
      setProducts(prods || []);
      
      if (prods?.length > 0) {
        setItems([{ product_id: prods[0].id, quantity: 1 }]);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu sản phẩm:", err);
    }
  };

  const loadReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getExportReceipts(0, 50);
      setReceipts(data || []);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách phiếu xuất');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      const submitData = {
        receipt_date: formData.receipt_date,
        notes: formData.notes,
        items: items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity)
        }))
      };
      
      await api.createExportReceipt(submitData);
      
      setIsModalOpen(false);
      loadReceipts();
      
      // Reset form
      setFormData({
        receipt_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setItems([{ product_id: products.length > 0 ? products[0].id : '', quantity: 1 }]);
      
    } catch (err) {
      alert(`Lỗi khi tạo phiếu xuất: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    setItems([...items, { product_id: products.length > 0 ? products[0].id : '', quantity: 1 }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const filteredReceipts = receipts.filter(r => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (r.receipt_code && r.receipt_code.toLowerCase().includes(term)) ||
      (r.notes && r.notes.toLowerCase().includes(term))
    );
  });

  return (
    <>
      {/* Topbar: 1 Primary CTA */}
      <header className="topbar">
        <div className="topbar-left">
          <p className="eyebrow">Quản lý giao dịch</p>
          <h1>Xuất kho</h1>
          <p className="topbar-desc">
            Lập chứng từ xuất hàng, theo dõi đơn giao và khấu trừ số lượng vào dữ liệu tồn kho.
          </p>
        </div>
        <div className="topbar-actions">
          <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
            Tạo phiếu xuất mới
          </button>
        </div>
      </header>

      {error && (
        <div className="alert-banner error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {/* KPI Flat Row */}
      <section className="kpi-row" aria-label="Thống kê xuất kho">
        <article className="kpi-item">
          <span className="kpi-label">Tổng số phiếu xuất</span>
          <span className="kpi-value">{receipts.length}</span>
          <span className="kpi-sub">Giao dịch ghi nhận</span>
        </article>
        <article className="kpi-item">
          <span className="kpi-label">Đã xuất kho</span>
          <span className="kpi-value" style={{ color: 'var(--status-ok-ink)' }}>
            {receipts.filter(r => r.status === 'CONFIRMED' || r.status === 'COMPLETED').length}
          </span>
          <span className="kpi-sub">Đã xuất khỏi kho</span>
        </article>
        <article className="kpi-item">
          <span className="kpi-label">Chờ xác nhận</span>
          <span className="kpi-value" style={{ color: 'var(--status-warn-ink)' }}>
            {receipts.filter(r => r.status === 'DRAFT' || r.status === 'PENDING').length}
          </span>
          <span className="kpi-sub">Đơn chờ hoàn tất</span>
        </article>
        <article className="kpi-item">
          <span className="kpi-label">Mặt hàng khả dụng</span>
          <span className="kpi-value">{products.length}</span>
          <span className="kpi-sub">SKU sẵn sàng xuất</span>
        </article>
      </section>

      {/* Main Panel */}
      <article className="panel">
        <div className="panel-header">
          <div className="panel-title-group">
            <h2>Lịch sử xuất kho ({filteredReceipts.length})</h2>
            <small className="caption">Danh sách chứng từ xuất kho đã phát sinh trong hệ thống</small>
          </div>
          <button className="ghost-btn" onClick={loadReceipts}>
            Làm mới danh sách
          </button>
        </div>

        {/* Toolbar */}
        <div className="toolbar-row">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" x2="16.65" y1="21" y2="16.65"/>
            </svg>
            <input 
              type="text"
              placeholder="Tìm theo mã phiếu, ghi chú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Tìm kiếm phiếu xuất"
            />
          </div>
          {searchTerm && (
            <button className="text-btn" onClick={() => setSearchTerm('')} style={{ fontSize: '12px' }}>
              Xóa bộ lọc
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
            Đang tải danh sách phiếu xuất kho...
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Ngày xuất</th>
                  <th>Người phụ trách</th>
                  <th>Ghi chú</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--ink-subtle)' }}>
                      Chưa có phiếu xuất kho nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((r) => {
                    const isConfirmed = r.status === 'CONFIRMED' || r.status === 'COMPLETED';
                    const isDraft = r.status === 'DRAFT' || r.status === 'PENDING';
                    return (
                      <tr key={r.id}>
                        <td>
                          <span className="sku-code">{r.receipt_code}</span>
                        </td>
                        <td>{formatDate(r.receipt_date)}</td>
                        <td>
                          <strong>{r.created_by_user?.username || 'Admin'}</strong>
                        </td>
                        <td>
                          <span style={{ color: 'var(--ink-muted)' }}>{r.notes || '—'}</span>
                        </td>
                        <td>
                          <span className={`status ${isConfirmed ? 'confirmed' : isDraft ? 'draft' : 'cancelled'}`}>
                            {isConfirmed ? 'Đã xuất' : isDraft ? 'Chờ xuất' : 'Đã hủy'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="ghost-btn" 
                            style={{ padding: '4px 10px', fontSize: '12px', minHeight: '30px' }}
                            onClick={() => setSelectedReceipt(r)}
                          >
                            Chi tiết
                          </button>
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

      {/* Modal Tạo Phiếu Xuất Mới */}
      {isModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <h2>Tạo phiếu xuất kho</h2>
                <small className="caption">Chọn danh mục mặt hàng và số lượng xuất trừ tồn</small>
              </div>
              <button className="text-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="export-date">Ngày xuất kho *</label>
                  <input 
                    id="export-date"
                    type="date" 
                    required 
                    value={formData.receipt_date}
                    onChange={(e) => setFormData({...formData, receipt_date: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="export-notes">Ghi chú xuất kho</label>
                  <input 
                    id="export-notes"
                    type="text" 
                    placeholder="Mục đích xuất kho, bộ phận tiếp nhận..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>

                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ margin: 0, fontWeight: 600 }}>Chi tiết hàng hóa xuất ({items.length})</label>
                    <button type="button" className="ghost-btn" onClick={addItem} style={{ padding: '3px 8px', fontSize: '11px', minHeight: 'auto' }}>
                      + Thêm dòng
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map((item, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '2fr 1fr auto', 
                          gap: '10px', 
                          alignItems: 'center',
                          backgroundColor: '#FAF8EE',
                          padding: '10px',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <select 
                          required
                          value={item.product_id}
                          onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                          aria-label="Chọn sản phẩm"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id} disabled={p.current_stock <= 0}>
                              {p.name} (Tồn: {p.current_stock})
                            </option>
                          ))}
                        </select>
                        
                        <input 
                          type="number" 
                          min="1" 
                          required 
                          placeholder="Số lượng"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          aria-label="Số lượng xuất"
                        />
                        
                        {items.length > 1 ? (
                          <button 
                            type="button" 
                            className="text-btn danger-btn"
                            onClick={() => removeItem(index)}
                            aria-label="Xóa dòng"
                            style={{ padding: '4px' }}
                          >
                            ✕
                          </button>
                        ) : <div style={{ width: '20px' }}></div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="ghost-btn" onClick={() => setIsModalOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang tạo...' : 'Xác nhận tạo phiếu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem Chi Tiết Phiếu Xuất */}
      {selectedReceipt && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <h2>Chi tiết phiếu xuất {selectedReceipt.receipt_code}</h2>
                <small className="caption">Ngày xuất: {formatDate(selectedReceipt.receipt_date)}</small>
              </div>
              <button className="text-btn" onClick={() => setSelectedReceipt(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '12px 14px',
                backgroundColor: '#FAF8EE',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px'
              }}>
                <div>
                  <span className="caption">Trạng thái:</span>
                  <div style={{ marginTop: '2px' }}>
                    <span className="status confirmed">
                      {selectedReceipt.status || 'Đã xuất'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="caption">Người lập phiếu:</span>
                  <strong style={{ display: 'block', marginTop: '2px' }}>
                    {selectedReceipt.created_by_user?.username || 'Admin'}
                  </strong>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div style={{ marginBottom: '16px', fontSize: '13px' }}>
                  <span className="caption">Ghi chú:</span>
                  <p style={{ marginTop: '2px', color: 'var(--ink)' }}>{selectedReceipt.notes}</p>
                </div>
              )}

              {selectedReceipt.items && selectedReceipt.items.length > 0 && (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th className="num">Số lượng xuất</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.items.map((it, idx) => (
                        <tr key={idx}>
                          <td>{it.product?.name || `Sản phẩm #${it.product_id}`}</td>
                          <td className="num">{it.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="ghost-btn" onClick={() => setSelectedReceipt(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ExportsTab;
