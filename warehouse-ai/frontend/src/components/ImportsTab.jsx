import { useState, useEffect } from 'react';
import api from '../services/api';

function ImportsTab({ userRole, currentUser }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Form data
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    receipt_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [items, setItems] = useState([{ product_id: '', quantity: 1, unit_price: 0 }]);

  useEffect(() => {
    loadReceipts();
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const [supps, prods] = await Promise.all([
        api.getSuppliers(0, 100),
        api.getProducts(0, 100)
      ]);
      setSuppliers(supps || []);
      setProducts(prods || []);
      
      if (supps?.length > 0) {
        setFormData(prev => ({ ...prev, supplier_id: supps[0].id }));
      }
      if (prods?.length > 0) {
        setItems([{ product_id: prods[0].id, quantity: 1, unit_price: 0 }]);
      }
    } catch (err) {
      console.error("Lỗi khi nạp dữ liệu danh mục:", err);
    }
  };

  const loadReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getImportReceipts(0, 100);
      setReceipts(data || []);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách phiếu nhập');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  const handleCreate = async (autoConfirm = false) => {
    if (!formData.supplier_id) {
      alert("Vui lòng chọn nhà cung cấp");
      return;
    }

    if (items.some(item => !item.product_id || parseInt(item.quantity) <= 0)) {
      alert("Vui lòng chọn sản phẩm và nhập số lượng lớn hơn 0 cho tất cả các dòng");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const submitData = {
        supplier_id: parseInt(formData.supplier_id),
        receipt_date: formData.receipt_date,
        notes: formData.notes,
        auto_confirm: autoConfirm,
        items: items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price) || 0,
          notes: ''
        }))
      };
      
      const res = await api.createImportReceipt(submitData);
      setIsModalOpen(false);
      await loadReceipts();
      
      if (autoConfirm) {
        showNotification(`Đã lập và xác nhận nhập kho thành công phiếu ${res.receipt_code}. Tồn kho đã được cập nhật.`);
      } else {
        showNotification(`Đã tạo phiếu nhập ${res.receipt_code} ở trạng thái chờ xác nhận.`);
      }
      
      // Reset form
      setFormData({
        supplier_id: suppliers.length > 0 ? suppliers[0].id : '',
        receipt_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setItems([{ product_id: products.length > 0 ? products[0].id : '', quantity: 1, unit_price: 0 }]);
      
    } catch (err) {
      alert(`Lỗi khi tạo phiếu nhập: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReceipt = async (receiptId, receiptCode) => {
    if (!window.confirm(`Xác nhận nhập kho cho phiếu "${receiptCode}"? Thao tác này sẽ ghi nhận hàng vào tồn kho thực tế.`)) {
      return;
    }

    try {
      setActionLoadingId(receiptId);
      await api.confirmImportReceipt(receiptId);
      showNotification(`Phiếu "${receiptCode}" đã được xác nhận nhập kho thành công.`);
      await loadReceipts();
      if (selectedReceipt && selectedReceipt.id === receiptId) {
        openDetailModal(receiptId);
      }
    } catch (err) {
      alert(`Lỗi khi xác nhận nhập kho: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelReceipt = async (receiptId, receiptCode) => {
    if (!window.confirm(`Xác nhận hủy phiếu nhập "${receiptCode}"?`)) {
      return;
    }

    try {
      setActionLoadingId(receiptId);
      await api.cancelImportReceipt(receiptId);
      showNotification(`Phiếu "${receiptCode}" đã được hủy.`);
      await loadReceipts();
      if (selectedReceipt && selectedReceipt.id === receiptId) {
        setSelectedReceipt(null);
      }
    } catch (err) {
      alert(`Lỗi khi hủy phiếu: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const openDetailModal = async (receiptId) => {
    try {
      setIsDetailLoading(true);
      const data = await api.getImportReceipt(receiptId);
      setSelectedReceipt(data);
    } catch (err) {
      const local = receipts.find(r => r.id === receiptId);
      setSelectedReceipt(local);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { product_id: products.length > 0 ? products[0].id : '', quantity: 1, unit_price: 0 }]);
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

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const filteredReceipts = receipts.filter(r => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || 
      (r.receipt_code && r.receipt_code.toLowerCase().includes(term)) ||
      (r.supplier?.name && r.supplier.name.toLowerCase().includes(term)) ||
      (r.notes && r.notes.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });

  const totalCount = receipts.length;
  const confirmedCount = receipts.filter(r => r.status === 'CONFIRMED').length;
  const draftCount = receipts.filter(r => r.status === 'DRAFT').length;
  const totalConfirmedAmount = receipts
    .filter(r => r.status === 'CONFIRMED')
    .reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);

  const calculateFormTotal = () => {
    return items.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.unit_price) || 0;
      return sum + (q * p);
    }, 0);
  };

  return (
    <>
      {/* Topbar: 1 Primary CTA */}
      <header className="topbar">
        <div className="topbar-left">
          <p className="eyebrow">
            Quản lý giao dịch • {userRole === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên kho'}
          </p>
          <h1>Nhập kho</h1>
          <p className="topbar-desc">
            Tiếp nhận lô hàng từ nhà cung cấp, kiểm đếm số lượng và cập nhật vào số dư tồn kho.
          </p>
        </div>
        <div className="topbar-actions">
          <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
            Tạo phiếu nhập mới
          </button>
        </div>
      </header>

      {/* Notifications */}
      {successMsg && (
        <div className="alert-banner success" role="status">
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert-banner error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {/* 4 KPI metrics phẳng */}
      <section className="kpi-row" aria-label="Thống kê nhập kho">
        <article className="kpi-item">
          <span className="kpi-label">Tổng số phiếu</span>
          <span className="kpi-value">{totalCount}</span>
          <span className="kpi-sub">Toàn bộ chứng từ</span>
        </article>
        <article className="kpi-item">
          <span className="kpi-label">Đã nhập kho</span>
          <span className="kpi-value" style={{ color: 'var(--status-ok-ink)' }}>{confirmedCount}</span>
          <span className="kpi-sub">Đã cộng tồn thực tế</span>
        </article>
        <article className="kpi-item">
          <span className="kpi-label">Chờ xác nhận</span>
          <span className="kpi-value" style={{ color: 'var(--status-warn-ink)' }}>{draftCount}</span>
          <span className="kpi-sub">Phiếu nháp chờ duyệt</span>
        </article>
        <article className="kpi-item">
          <span className="kpi-label">Tổng giá trị đã nhập</span>
          <span className="kpi-value" style={{ fontSize: '20px' }}>{formatCurrency(totalConfirmedAmount)}</span>
          <span className="kpi-sub">Theo phiếu hoàn thành</span>
        </article>
      </section>

      {/* Main panel */}
      <article className="panel">
        <div className="panel-header">
          <div className="panel-title-group">
            <h2>Lịch sử phiếu nhập kho</h2>
            <small className="caption">Xem chi tiết danh sách mặt hàng và thực hiện xác nhận nhập kho</small>
          </div>
          <button className="ghost-btn" onClick={loadReceipts}>
            Làm mới danh sách
          </button>
        </div>

        {/* Bộ lọc trạng thái dạng Tab gạch chân (KHÔNG dùng pill) */}
        <div className="filter-tabs" role="tablist">
          <button 
            role="tab"
            aria-selected={statusFilter === 'ALL'}
            className={`filter-tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            Tất cả ({receipts.length})
          </button>
          <button 
            role="tab"
            aria-selected={statusFilter === 'DRAFT'}
            className={`filter-tab-btn ${statusFilter === 'DRAFT' ? 'active' : ''}`}
            onClick={() => setStatusFilter('DRAFT')}
          >
            Chờ xác nhận ({draftCount})
          </button>
          <button 
            role="tab"
            aria-selected={statusFilter === 'CONFIRMED'}
            className={`filter-tab-btn ${statusFilter === 'CONFIRMED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('CONFIRMED')}
          >
            Đã nhập ({confirmedCount})
          </button>
        </div>

        {/* Toolbar row with search */}
        <div className="toolbar-row">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" x2="16.65" y1="21" y2="16.65"/>
            </svg>
            <input 
              type="text"
              placeholder="Tìm theo mã phiếu, nhà cung cấp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Tìm kiếm phiếu nhập"
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
            Đang tải danh sách phiếu nhập kho...
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Ngày nhập</th>
                  <th>Nhà cung cấp</th>
                  <th className="num">Tổng tiền</th>
                  <th>Ghi chú</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--ink-subtle)' }}>
                      Không tìm thấy phiếu nhập nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((r) => {
                    const isDraft = r.status === 'DRAFT';
                    const isConfirmed = r.status === 'CONFIRMED';
                    return (
                      <tr key={r.id}>
                        <td>
                          <span className="sku-code">{r.receipt_code}</span>
                        </td>
                        <td>{formatDate(r.receipt_date)}</td>
                        <td>
                          <strong>{r.supplier?.name || '—'}</strong>
                        </td>
                        <td className="num">
                          <strong className="tabular">{formatCurrency(r.total_amount)}</strong>
                        </td>
                        <td>
                          <span style={{ color: 'var(--ink-muted)' }}>{r.notes || '—'}</span>
                        </td>
                        <td>
                          <span className={`status ${isConfirmed ? 'confirmed' : isDraft ? 'draft' : 'cancelled'}`}>
                            {isConfirmed ? 'Đã nhập' : isDraft ? 'Chờ xác nhận' : 'Đã hủy'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                            <button 
                              className="ghost-btn" 
                              style={{ padding: '4px 10px', fontSize: '12px', minHeight: '30px' }}
                              onClick={() => openDetailModal(r.id)}
                            >
                              Chi tiết
                            </button>

                            {isDraft && (
                              <button 
                                className="primary-btn" 
                                style={{ padding: '4px 10px', fontSize: '12px', minHeight: '30px' }}
                                onClick={() => handleConfirmReceipt(r.id, r.receipt_code)}
                                disabled={actionLoadingId === r.id}
                              >
                                {actionLoadingId === r.id ? 'Đang duyệt...' : 'Xác nhận nhập'}
                              </button>
                            )}

                            {isDraft && (
                              <button 
                                className="text-btn danger-btn" 
                                style={{ padding: '4px 8px', fontSize: '12px', minHeight: '30px' }}
                                onClick={() => handleCancelReceipt(r.id, r.receipt_code)}
                                disabled={actionLoadingId === r.id}
                              >
                                Hủy
                              </button>
                            )}
                          </div>
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

      {/* Modal Tạo Phiếu Nhập Mới */}
      {isModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h2>Tạo phiếu nhập kho</h2>
                <small className="caption">Khai báo danh sách mặt hàng tiếp nhận từ nhà cung cấp</small>
              </div>
              <button className="text-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreate(false); }}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="select-supplier">Nhà cung cấp *</label>
                    <select
                      id="select-supplier"
                      required
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    >
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                      {suppliers.length === 0 && <option value="">Đang tải NCC...</option>}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="receipt-date">Ngày nhập kho *</label>
                    <input
                      id="receipt-date"
                      type="date"
                      required
                      value={formData.receipt_date}
                      onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="receipt-notes">Ghi chú phiếu nhập</label>
                  <input
                    id="receipt-notes"
                    type="text"
                    placeholder="Thông tin đơn hàng, số hóa đơn đỏ, người bàn giao..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                {/* Danh sách mặt hàng */}
                <div style={{ marginTop: '16px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ margin: 0, fontWeight: 600 }}>Chi tiết hàng hóa tiếp nhận ({items.length})</label>
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
                          gridTemplateColumns: '2fr 1fr 1.2fr auto',
                          gap: '10px',
                          alignItems: 'center',
                          backgroundColor: '#FAF8EE',
                          padding: '10px',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <select
                          value={item.product_id}
                          onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                          required
                          aria-label="Chọn sản phẩm"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="1"
                          placeholder="SL"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          required
                          aria-label="Số lượng"
                        />

                        <input
                          type="number"
                          min="0"
                          step="1000"
                          placeholder="Đơn giá"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                          required
                          aria-label="Đơn giá"
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

                {/* Tổng cộng */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: '#FAF8EE',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: '16px'
                }}>
                  <span style={{ fontWeight: 500, fontSize: '13px' }}>Tổng giá trị lô hàng:</span>
                  <strong className="tabular" style={{ fontSize: '16px', color: 'var(--ink)' }}>
                    {formatCurrency(calculateFormTotal())}
                  </strong>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="ghost-btn" onClick={() => setIsModalOpen(false)}>
                  Hủy bỏ
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit"
                    className="ghost-btn"
                    disabled={isSubmitting}
                  >
                    Lưu bản nháp
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={isSubmitting}
                    onClick={() => handleCreate(true)}
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Xác nhận nhập kho ngay'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết Phiếu Nhập */}
      {selectedReceipt && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h2>Chi tiết phiếu nhập {selectedReceipt.receipt_code}</h2>
                <small className="caption">
                  Ngày tạo: {formatDate(selectedReceipt.receipt_date)} • NCC: {selectedReceipt.supplier?.name || '—'}
                </small>
              </div>
              <button className="text-btn" onClick={() => setSelectedReceipt(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
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
                    <span className={`status ${selectedReceipt.status === 'CONFIRMED' ? 'confirmed' : 'draft'}`}>
                      {selectedReceipt.status === 'CONFIRMED' ? 'Đã nhập kho' : 'Chờ xác nhận'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="caption">Tổng tiền:</span>
                  <strong className="tabular" style={{ display: 'block', marginTop: '2px' }}>
                    {formatCurrency(selectedReceipt.total_amount)}
                  </strong>
                </div>
                <div>
                  <span className="caption">Người phụ trách:</span>
                  <span style={{ display: 'block', marginTop: '2px', fontWeight: 500 }}>
                    {selectedReceipt.created_by_user?.username || 'Admin'}
                  </span>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div style={{ marginBottom: '16px', fontSize: '13px' }}>
                  <span className="caption">Ghi chú:</span>
                  <p style={{ marginTop: '2px', color: 'var(--ink)' }}>{selectedReceipt.notes}</p>
                </div>
              )}

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th className="num">Số lượng</th>
                      <th className="num">Đơn giá</th>
                      <th className="num">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!selectedReceipt.items || selectedReceipt.items.length === 0) ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-subtle)' }}>
                          Không có thông tin chi tiết mặt hàng.
                        </td>
                      </tr>
                    ) : (
                      selectedReceipt.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{item.product?.name || `Mã #${item.product_id}`}</strong>
                            {item.product?.code && (
                              <small className="caption" style={{ display: 'block' }}>{item.product.code}</small>
                            )}
                          </td>
                          <td className="num">{item.quantity}</td>
                          <td className="num tabular">{formatCurrency(item.unit_price)}</td>
                          <td className="num tabular">{formatCurrency(item.quantity * item.unit_price)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="ghost-btn" onClick={() => setSelectedReceipt(null)}>
                Đóng
              </button>
              {selectedReceipt.status === 'DRAFT' && (
                <button
                  className="primary-btn"
                  onClick={() => handleConfirmReceipt(selectedReceipt.id, selectedReceipt.receipt_code)}
                  disabled={actionLoadingId === selectedReceipt.id}
                >
                  Xác nhận nhập kho
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ImportsTab;
