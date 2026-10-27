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
      console.error("Lỗi khi tải dữ liệu dropdown:", err);
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

  // Create receipt (supports auto_confirm: true/false)
  const handleCreate = async (autoConfirm = false) => {
    if (!formData.supplier_id) {
      alert("Vui lòng chọn Nhà cung cấp");
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
        showNotification(`✅ Đã lập và XÁC NHẬN nhập kho thành công phiếu ${res.receipt_code}! Tồn kho đã được cập nhật.`);
      } else {
        showNotification(`💾 Đã tạo phiếu nhập ${res.receipt_code} ở trạng thái bản nháp.`);
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

  // Confirm an existing draft receipt
  const handleConfirmReceipt = async (receiptId, receiptCode) => {
    if (!window.confirm(`Bạn có chắc chắn muốn XÁC NHẬN nhập kho cho phiếu "${receiptCode}"? Thao tác này sẽ cộng hàng vào tồn kho thực tế.`)) {
      return;
    }

    try {
      setActionLoadingId(receiptId);
      await api.confirmImportReceipt(receiptId);
      showNotification(`🎉 Phiếu "${receiptCode}" đã được xác nhận nhập kho thành công! Tồn kho đã tăng.`);
      
      // Refresh list & detail if currently open
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

  // Cancel draft receipt
  const handleCancelReceipt = async (receiptId, receiptCode) => {
    if (!window.confirm(`Bạn có chắc chắn muốn HUỶ phiếu nhập "${receiptCode}" không?`)) {
      return;
    }

    try {
      setActionLoadingId(receiptId);
      await api.cancelImportReceipt(receiptId);
      showNotification(`⚠️ Phiếu "${receiptCode}" đã được huỷ.`);
      await loadReceipts();
      if (selectedReceipt && selectedReceipt.id === receiptId) {
        setSelectedReceipt(null);
      }
    } catch (err) {
      alert(`Lỗi khi huỷ phiếu: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open receipt detail modal
  const openDetailModal = async (receiptId) => {
    try {
      setIsDetailLoading(true);
      const data = await api.getImportReceipt(receiptId);
      setSelectedReceipt(data);
    } catch (err) {
      // If endpoint doesn't return full data, find from local list
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
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  // Filtered receipts
  const filteredReceipts = receipts.filter(r => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || 
      (r.receipt_code && r.receipt_code.toLowerCase().includes(term)) ||
      (r.supplier?.name && r.supplier.name.toLowerCase().includes(term)) ||
      (r.notes && r.notes.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });

  // Stats calculation
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
      <header className="topbar">
        <div>
          <p className="eyebrow">
            Quản lý giao dịch • {userRole === 'ADMIN' ? '👑 Quản Trị Viên' : '👷 Nhân Viên Kho'}
          </p>
          <h1>Nhập kho</h1>
        </div>
        <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
          + Tạo phiếu nhập mới
        </button>
      </header>

      {/* Thông báo thành công */}
      {successMsg && (
        <div style={{
          padding: '14px 18px',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          color: '#86efac',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.95rem'
        }}>
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div style={{
          padding: '14px 18px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#fca5a5',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Thẻ thống kê */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <span>Tổng số phiếu</span>
          <strong>{totalCount}</strong>
          <em>Toàn bộ lịch sử</em>
        </div>
        <div className="stat-card">
          <span>Đã nhập kho</span>
          <strong style={{ color: '#86efac' }}>{confirmedCount}</strong>
          <em style={{ color: '#86efac' }}>Đã cộng vào tồn kho</em>
        </div>
        <div className="stat-card">
          <span>Chờ xác nhận</span>
          <strong style={{ color: '#fbbf24' }}>{draftCount}</strong>
          <em style={{ color: '#fbbf24' }}>Cần xác nhận để tăng kho</em>
        </div>
        <div className="stat-card">
          <span>Tổng giá trị đã nhập</span>
          <strong style={{ fontSize: '1.4rem' }}>{formatCurrency(totalConfirmedAmount)}</strong>
          <em>Theo chứng từ hoàn thành</em>
        </div>
      </div>

      <article className="panel">
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2>Lịch sử phiếu nhập kho</h2>
            <small style={{ color: '#94a3b8' }}>
              Admin và Nhân viên có thể tạo phiếu và xác nhận nhập hàng trực tiếp vào kho
            </small>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Bộ lọc trạng thái */}
            <div style={{ display: 'flex', background: 'rgba(30, 41, 59, 0.6)', padding: '3px', borderRadius: '8px' }}>
              <button 
                className={`ghost-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: '6px', background: statusFilter === 'ALL' ? '#2563eb' : 'transparent' }}
                onClick={() => setStatusFilter('ALL')}
              >
                Tất cả ({receipts.length})
              </button>
              <button 
                className={`ghost-btn ${statusFilter === 'DRAFT' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: '6px', background: statusFilter === 'DRAFT' ? '#eab308' : 'transparent', color: statusFilter === 'DRAFT' ? '#000' : 'inherit' }}
                onClick={() => setStatusFilter('DRAFT')}
              >
                Chờ xác nhận ({draftCount})
              </button>
              <button 
                className={`ghost-btn ${statusFilter === 'CONFIRMED' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: '6px', background: statusFilter === 'CONFIRMED' ? '#16a34a' : 'transparent' }}
                onClick={() => setStatusFilter('CONFIRMED')}
              >
                Đã nhập ({confirmedCount})
              </button>
            </div>

            {/* Tìm kiếm */}
            <input 
              type="text"
              placeholder="🔍 Tìm theo mã phiếu, NCC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.85rem'
              }}
            />

            <button className="ghost-btn" onClick={loadReceipts} title="Tải lại">🔄 Làm mới</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải dữ liệu...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Mã Phiếu</th>
                  <th>Ngày Nhập</th>
                  <th>Nhà cung cấp</th>
                  <th>Người phụ trách</th>
                  <th>Mặt hàng</th>
                  <th>Tổng giá trị</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      {searchTerm ? 'Không tìm thấy phiếu nào phù hợp với từ khóa.' : 'Chưa có phiếu nhập kho nào.'}
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((r) => {
                    const isDraft = r.status === 'DRAFT';
                    const isConfirmed = r.status === 'CONFIRMED';
                    const isCancelled = r.status === 'CANCELLED';
                    const creatorName = r.created_by_user?.full_name || r.created_by_user?.username || (typeof r.created_by === 'object' ? r.created_by?.full_name : 'Quản trị / NV');
                    const itemsCount = r.items?.length || 0;

                    return (
                      <tr key={r.id}>
                        <td><strong style={{ color: '#38bdf8' }}>{r.receipt_code}</strong></td>
                        <td>{formatDate(r.receipt_date)}</td>
                        <td>
                          <strong>{r.supplier?.name || 'N/A'}</strong>
                          {r.supplier?.code && <small style={{ display: 'block', color: '#94a3b8' }}>{r.supplier.code}</small>}
                        </td>
                        <td>{creatorName}</td>
                        <td>{itemsCount > 0 ? `${itemsCount} mặt hàng` : '1 mặt hàng'}</td>
                        <td><strong>{formatCurrency(r.total_amount)}</strong></td>
                        <td>
                          <span className={`status ${isConfirmed ? 'ok' : isCancelled ? 'danger' : 'warning'}`}>
                            {isConfirmed ? '✅ Đã nhập kho' : isCancelled ? '❌ Đã huỷ' : '⏳ Chờ xác nhận'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {isDraft && (
                            <>
                              <button 
                                className="primary-btn" 
                                style={{
                                  fontSize: '0.8rem',
                                  padding: '5px 10px',
                                  marginRight: '6px',
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  boxShadow: 'none'
                                }}
                                disabled={actionLoadingId === r.id}
                                onClick={() => handleConfirmReceipt(r.id, r.receipt_code)}
                                title="Xác nhận hàng đã vào kho & Tăng tồn kho"
                              >
                                {actionLoadingId === r.id ? 'Đang duyệt...' : '✅ Nhập kho'}
                              </button>
                              <button 
                                className="ghost-btn" 
                                style={{
                                  fontSize: '0.8rem',
                                  padding: '5px 8px',
                                  marginRight: '6px',
                                  color: '#fca5a5'
                                }}
                                disabled={actionLoadingId === r.id}
                                onClick={() => handleCancelReceipt(r.id, r.receipt_code)}
                                title="Huỷ phiếu nhập"
                              >
                                ✕ Huỷ
                              </button>
                            </>
                          )}
                          <button 
                            className="ghost-btn" 
                            style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                            onClick={() => openDetailModal(r.id)}
                          >
                            👁️ Chi tiết
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

      {/* Modal Tạo Phiếu Nhập Mới */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content large" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <div>
                <h2>Tạo phiếu nhập kho</h2>
                <small style={{ color: '#94a3b8' }}>Dành cho Admin và Nhân viên kho ghi nhận hàng hóa về kho</small>
              </div>
              <button className="ghost-btn" onClick={() => setIsModalOpen(false)} style={{ padding: '6px 10px' }}>✕</button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleCreate(false); }}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Nhà cung cấp *</label>
                    <select 
                      required
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                      style={{ width: '100%', padding: '10px', background: '#1e293b', color: '#fff', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px' }}
                    >
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                      {suppliers.length === 0 && <option value="">Đang tải NCC...</option>}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ngày lập chứng từ *</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.receipt_date}
                      onChange={(e) => setFormData({...formData, receipt_date: e.target.value})}
                      style={{ width: '100%', padding: '10px', background: '#1e293b', color: '#fff', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Ghi chú nhập hàng (số hóa đơn, người giao, mã lô,...)</label>
                  <input 
                    type="text" 
                    placeholder="VD: Nhập theo hóa đơn GTGT số HD-0982, xe giao lúc 10h..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    style={{ width: '100%', padding: '10px', background: '#1e293b', color: '#fff', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px' }}
                  />
                </div>

                <div style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '1.05rem', margin: 0, color: '#e2e8f0' }}>Danh sách sản phẩm nhập vào kho</h3>
                    <button type="button" className="ghost-btn" onClick={addItem} style={{ fontSize: '0.85rem', color: '#38bdf8' }}>
                      + Thêm dòng sản phẩm
                    </button>
                  </div>
                  
                  {items.map((item, index) => {
                    const selProd = products.find(p => p.id === parseInt(item.product_id));
                    const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);

                    return (
                      <div key={index} style={{
                        display: 'grid',
                        gridTemplateColumns: '3fr 1.2fr 1.8fr 1.8fr auto',
                        gap: '12px',
                        alignItems: 'center',
                        marginBottom: '12px',
                        background: 'rgba(30,41,59,0.5)',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(148,163,184,0.15)'
                      }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Sản phẩm *</label>
                          <select 
                            required
                            value={item.product_id}
                            onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                            style={{ width: '100%', padding: '8px', background: '#0f172a', color: '#fff', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '6px' }}
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.code} - {p.name} (Hiện có: {p.current_stock})
                              </option>
                            ))}
                            {products.length === 0 && <option value="">Chưa có SP</option>}
                          </select>
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Số lượng *</label>
                          <input 
                            type="number" 
                            min="1"
                            required 
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            style={{ width: '100%', padding: '8px', background: '#0f172a', color: '#fff', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '6px' }}
                          />
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.78rem' }}>Đơn giá (VNĐ)</label>
                          <input 
                            type="number" 
                            min="0"
                            step="1000"
                            required 
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                            style={{ width: '100%', padding: '8px', background: '#0f172a', color: '#fff', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '6px' }}
                          />
                        </div>

                        <div style={{ textAlign: 'right', paddingTop: '16px' }}>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>Thành tiền</span>
                          <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>{formatCurrency(lineTotal)}</strong>
                        </div>
                        
                        <div style={{ paddingTop: '16px' }}>
                          <button 
                            type="button" 
                            onClick={() => removeItem(index)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: 'none',
                              color: '#fca5a5',
                              cursor: 'pointer',
                              borderRadius: '6px',
                              padding: '8px 10px'
                            }}
                            disabled={items.length === 1}
                            title="Xóa dòng này"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tổng kết phiếu */}
                <div style={{
                  marginTop: '16px',
                  padding: '14px 18px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: '10px',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Tổng số mặt hàng: </span>
                    <strong>{items.length} mặt hàng ({items.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0)} đơn vị)</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#94a3b8', marginRight: '10px' }}>Tổng tiền phiếu nhập:</span>
                    <strong style={{ color: '#86efac', fontSize: '1.25rem' }}>{formatCurrency(calculateFormTotal())}</strong>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" className="ghost-btn" onClick={() => setIsModalOpen(false)}>Huỷ bỏ</button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="submit" 
                    className="ghost-btn"
                    disabled={isSubmitting || products.length === 0}
                    style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24', border: '1px solid rgba(234, 179, 8, 0.3)' }}
                  >
                    {isSubmitting ? 'Đang lưu...' : '💾 Lưu bản nháp (Chờ kiểm)'}
                  </button>
                  <button 
                    type="button" 
                    className="primary-btn" 
                    disabled={isSubmitting || products.length === 0}
                    onClick={() => handleCreate(true)}
                    style={{ background: 'linear-gradient(135deg, #10b981, #2563eb)' }}
                  >
                    {isSubmitting ? 'Đang xử lý...' : '📥 Xác nhận nhập kho ngay (+Tồn kho)'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết Phiếu Nhập */}
      {selectedReceipt && (
        <div className="modal-overlay">
          <div className="modal-content large" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div>
                <h2>Chi tiết phiếu nhập: {selectedReceipt.receipt_code}</h2>
                <small style={{ color: '#94a3b8' }}>Ngày nhập: {formatDate(selectedReceipt.receipt_date)}</small>
              </div>
              <button className="ghost-btn" onClick={() => setSelectedReceipt(null)} style={{ padding: '6px 10px' }}>✕</button>
            </div>

            <div className="modal-body">
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                padding: '14px',
                background: 'rgba(30, 41, 59, 0.4)',
                borderRadius: '10px',
                marginBottom: '20px'
              }}>
                <div>
                  <p style={{ margin: '0 0 6px', color: '#94a3b8', fontSize: '0.85rem' }}>Nhà cung cấp:</p>
                  <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{selectedReceipt.supplier?.name || 'N/A'}</strong>
                  {selectedReceipt.supplier?.code && <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>Mã: {selectedReceipt.supplier.code}</p>}
                </div>
                <div>
                  <p style={{ margin: '0 0 6px', color: '#94a3b8', fontSize: '0.85rem' }}>Trạng thái chứng từ:</p>
                  <span className={`status ${selectedReceipt.status === 'CONFIRMED' ? 'ok' : selectedReceipt.status === 'CANCELLED' ? 'danger' : 'warning'}`}>
                    {selectedReceipt.status === 'CONFIRMED' ? '✅ Đã nhập kho (Tồn kho đã tăng)' : selectedReceipt.status === 'CANCELLED' ? '❌ Đã huỷ' : '⏳ Chờ xác nhận (Bản nháp)'}
                  </span>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px', color: '#94a3b8', fontSize: '0.85rem' }}>Người lập phiếu:</p>
                  <strong>{selectedReceipt.created_by_user?.full_name || selectedReceipt.created_by_user?.username || 'Quản trị viên / NV'}</strong>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px', color: '#94a3b8', fontSize: '0.85rem' }}>Ghi chú:</p>
                  <p style={{ margin: 0, color: '#e2e8f0' }}>{selectedReceipt.notes || 'Không có ghi chú'}</p>
                </div>
              </div>

              <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: '#e2e8f0' }}>Danh sách sản phẩm đã nhận</h3>
              <div style={{ overflowX: 'auto', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: '8px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th style={{ textAlign: 'center' }}>Số lượng</th>
                      <th style={{ textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ textAlign: 'right' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReceipt.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{it.product?.name || `Mã SP #${it.product_id}`}</strong>
                          {it.product?.code && <small style={{ display: 'block', color: '#94a3b8' }}>{it.product.code}</small>}
                        </td>
                        <td style={{ textAlign: 'center' }}><strong>{it.quantity}</strong></td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(it.unit_price)}</td>
                        <td style={{ textAlign: 'right' }}><strong>{formatCurrency(it.total_amount || (it.quantity * it.unit_price))}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'rgba(30, 41, 59, 0.6)' }}>
                      <td colSpan="3" style={{ textAlign: 'right', fontWeight: 600 }}>TỔNG CỘNG:</td>
                      <td style={{ textAlign: 'right', color: '#86efac', fontWeight: 700, fontSize: '1.1rem' }}>
                        {formatCurrency(selectedReceipt.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="ghost-btn" onClick={() => setSelectedReceipt(null)}>Đóng</button>
              {selectedReceipt.status === 'DRAFT' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="ghost-btn" 
                    style={{ color: '#fca5a5' }}
                    onClick={() => handleCancelReceipt(selectedReceipt.id, selectedReceipt.receipt_code)}
                  >
                    Huỷ phiếu
                  </button>
                  <button 
                    type="button" 
                    className="primary-btn" 
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                    onClick={() => handleConfirmReceipt(selectedReceipt.id, selectedReceipt.receipt_code)}
                  >
                    ✅ Xác nhận nhập kho ngay (+Tồn kho)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ImportsTab;
