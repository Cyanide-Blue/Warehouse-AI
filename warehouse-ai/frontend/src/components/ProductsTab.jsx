import { useState, useEffect } from 'react';
import api from '../services/api';

function ProductsTab({ userRole, currentUser, onNavigateTab }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data for creating product
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category_id: '',
    unit_id: '',
    minimum_stock: 0,
    price: 0,
  });

  // Order data for buyer
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState(1);

  // Quick import data for Admin & Staff
  const [importProduct, setImportProduct] = useState(null);
  const [importQuantity, setImportQuantity] = useState(10);
  const [importUnitPrice, setImportUnitPrice] = useState(100000);
  const [importSupplierId, setImportSupplierId] = useState('');
  const [importNotes, setImportNotes] = useState('');
  
  // Dropdown data
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const role = (userRole || 'ADMIN').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isBuyer = role === 'BUYER';
  const canImport = isAdmin || role === 'STOREKEEPER' || role === 'STAFF';

  useEffect(() => {
    loadProducts();
    loadDropdownData();
  }, [isAdmin]);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4500);
  };

  const loadDropdownData = async () => {
    try {
      const [cats, uns, supps] = await Promise.all([
        api.getCategories(0, 100),
        api.getUnits(0, 100),
        api.getSuppliers(0, 100)
      ]);
      setCategories(cats || []);
      setUnits(uns || []);
      setSuppliers(supps || []);
      
      // Set defaults if available
      if (cats?.length > 0 && uns?.length > 0) {
        setFormData(prev => ({
          ...prev,
          category_id: cats[0].id,
          unit_id: uns[0].id
        }));
      }

      if (supps?.length > 0) {
        setImportSupplierId(supps[0].id);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu cấu hình:", err);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProducts(0, 100);
      setProducts(data || []);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách hàng hóa');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xoá hàng hoá "${name}" không? Thao tác này không thể hoàn tác.`)) {
      try {
        await api.deleteProduct(id);
        showNotification(`Đã xoá hàng hoá "${name}".`);
        loadProducts();
      } catch (err) {
        alert(`Lỗi khi xoá: ${err.message}`);
      }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      const submitData = {
        ...formData,
        category_id: parseInt(formData.category_id),
        unit_id: parseInt(formData.unit_id),
        minimum_stock: parseInt(formData.minimum_stock)
      };
      
      await api.createProduct(submitData);
      
      setIsModalOpen(false);
      setFormData({
        ...formData,
        code: '',
        name: '',
        minimum_stock: 0,
        price: 0
      });
      showNotification(`Đã thêm mới sản phẩm "${submitData.name}".`);
      loadProducts();
    } catch (err) {
      alert(`Lỗi khi tạo hàng hoá: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Buyer Order
  const openOrderModal = (product) => {
    setSelectedProduct(product);
    setOrderQuantity(1);
    setIsOrderModalOpen(true);
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    try {
      setIsSubmitting(true);
      
      const submitData = {
        receipt_date: new Date().toISOString().split('T')[0],
        notes: `Đơn đặt hàng từ Buyer - Sản phẩm: ${selectedProduct.name}`,
        items: [
          {
            product_id: selectedProduct.id,
            quantity: parseInt(orderQuantity)
          }
        ]
      };
      
      await api.createExportReceipt(submitData);
      
      setIsOrderModalOpen(false);
      showNotification(`Đặt hàng thành công! Đơn hàng đã được gửi cho kho.`);
      loadProducts();
    } catch (err) {
      alert(`Lỗi khi đặt hàng: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Import for Admin & Staff
  const openQuickImportModal = (product) => {
    setImportProduct(product);
    setImportQuantity(10);
    setImportUnitPrice(100000);
    setImportNotes(`Nhập hàng nhanh cho ${product.name}`);
    if (suppliers.length > 0 && !importSupplierId) {
      setImportSupplierId(suppliers[0].id);
    }
    setIsImportModalOpen(true);
  };

  const handleQuickImport = async (e) => {
    e.preventDefault();
    if (!importProduct) return;
    
    const qty = parseInt(importQuantity);
    if (!qty || qty <= 0) {
      alert("Số lượng nhập phải lớn hơn 0");
      return;
    }

    if (!importSupplierId) {
      alert("Vui lòng chọn Nhà cung cấp");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const submitData = {
        supplier_id: parseInt(importSupplierId),
        receipt_date: new Date().toISOString().split('T')[0],
        notes: importNotes || `Nhập kho nhanh cho SKU ${importProduct.code}`,
        auto_confirm: true, // XÁC NHẬN NHẬP KHO NGAY LẬP TỨC
        items: [
          {
            product_id: importProduct.id,
            quantity: qty,
            unit_price: parseFloat(importUnitPrice) || 0,
            notes: ''
          }
        ]
      };
      
      const receipt = await api.createImportReceipt(submitData);
      
      setIsImportModalOpen(false);
      showNotification(`🎉 Đã nhập thành công ${qty} sản phẩm cho "${importProduct.name}"! Tồn kho đã tăng từ ${importProduct.current_stock} lên ${importProduct.current_stock + qty}. (Mã phiếu: ${receipt.receipt_code})`);
      
      await loadProducts();
    } catch (err) {
      alert(`Lỗi khi nhập hàng: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">{isBuyer ? 'Cửa hàng' : 'Quản lý kho & Danh mục'}</p>
          <h1>Hàng hóa</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {canImport && onNavigateTab && (
            <button 
              className="ghost-btn" 
              onClick={() => onNavigateTab('imports')}
              style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}
            >
              📋 Lịch sử nhập kho
            </button>
          )}
          {isAdmin && (
            <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
              + Thêm hàng hóa mới
            </button>
          )}
        </div>
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
          fontSize: '0.95rem'
        }}>
          {successMsg}
        </div>
      )}

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', borderRadius: '8px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      <article className="panel">
        <div className="panel-header">
          <div>
            <h2>Danh sách tất cả sản phẩm ({products.length})</h2>
            <small style={{ color: '#94a3b8' }}>
              {canImport ? 'Admin và Nhân viên có thể bấm "📥 Nhập hàng" trực tiếp cho từng mặt hàng' : 'Xem thông tin và đặt hàng'}
            </small>
          </div>
          <button className="ghost-btn" onClick={loadProducts}>🔄 Làm mới</button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải dữ liệu...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Mã SKU</th>
                  <th>Tên Sản Phẩm</th>
                  <th>Danh mục</th>
                  <th>Đơn vị</th>
                  <th>Tồn kho</th>
                  {isAdmin && <th>Mức tối thiểu</th>}
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      Chưa có sản phẩm nào trong hệ thống.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id}>
                      <td><strong style={{ color: '#38bdf8' }}>{p.code}</strong></td>
                      <td>
                        <strong>{p.name}</strong>
                        {p.description && <small style={{ display: 'block', color: '#94a3b8' }}>{p.description}</small>}
                      </td>
                      <td>{p.category?.name || 'N/A'}</td>
                      <td>{p.unit?.name || 'N/A'}</td>
                      <td>
                        <strong style={{ fontSize: '1.05rem', color: p.current_stock === 0 ? '#f87171' : '#f8fafc' }}>
                          {p.current_stock}
                        </strong>
                      </td>
                      {isAdmin && <td>{p.minimum_stock}</td>}
                      <td>
                        <span className={`status ${p.current_stock < p.minimum_stock ? 'warning' : 'ok'}`}>
                          {p.current_stock === 0 ? 'Hết hàng' : (p.current_stock < p.minimum_stock ? 'Sắp hết' : 'Còn hàng')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {/* Nút nhập hàng nhanh cho Admin và Nhân viên */}
                        {canImport && (
                          <button 
                            className="primary-btn" 
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.82rem',
                              marginRight: '6px',
                              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                              boxShadow: 'none'
                            }}
                            onClick={() => openQuickImportModal(p)}
                            title={`Nhập hàng thêm cho ${p.name}`}
                          >
                            📥 Nhập hàng
                          </button>
                        )}
                        
                        {isAdmin && (
                          <button 
                            className="ghost-btn" 
                            style={{ color: '#fca5a5', padding: '5px 8px', fontSize: '0.82rem' }}
                            onClick={() => handleDelete(p.id, p.name)}
                            title="Xoá hàng hoá"
                          >
                            Xoá
                          </button>
                        )}
                        
                        {isBuyer && (
                          <button 
                            className="primary-btn" 
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            onClick={() => openOrderModal(p)}
                            disabled={p.current_stock === 0}
                          >
                            {p.current_stock === 0 ? 'Hết hàng' : 'Đặt hàng'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* Modal Nhập Hàng Nhanh (Dành cho Admin & Nhân Viên) */}
      {isImportModalOpen && importProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div>
                <h2>📥 Nhập hàng vào kho</h2>
                <small style={{ color: '#94a3b8' }}>Ghi nhận lô hàng mới và cộng thẳng vào tồn kho</small>
              </div>
              <button className="ghost-btn" onClick={() => setIsImportModalOpen(false)} style={{ padding: '4px' }}>✕</button>
            </div>
            
            <form onSubmit={handleQuickImport}>
              <div className="modal-body">
                {/* Thông tin sản phẩm */}
                <div style={{
                  padding: '12px 14px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  borderRadius: '10px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  marginBottom: '16px'
                }}>
                  <p style={{ margin: '0 0 4px', color: '#94a3b8', fontSize: '0.8rem' }}>Sản phẩm tiếp nhận:</p>
                  <strong style={{ fontSize: '1.05rem', color: '#f8fafc' }}>{importProduct.name}</strong>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '0.85rem' }}>
                    <span>Mã SKU: <strong style={{ color: '#38bdf8' }}>{importProduct.code}</strong></span>
                    <span>Đơn vị: <strong>{importProduct.unit?.name || 'Cái'}</strong></span>
                    <span>Tồn kho hiện tại: <strong style={{ color: '#86efac' }}>{importProduct.current_stock}</strong></span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Nhà cung cấp giao hàng *</label>
                  <select 
                    required
                    value={importSupplierId}
                    onChange={(e) => setImportSupplierId(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#1e293b', color: '#fff', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px' }}
                  >
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                    {suppliers.length === 0 && <option value="">Đang tải NCC...</option>}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label>Số lượng nhập *</label>
                    <input 
                      type="number" 
                      min="1"
                      required 
                      value={importQuantity}
                      onChange={(e) => setImportQuantity(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: '#1e293b', color: '#fff', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px' }}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Đơn giá nhập (VNĐ)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="1000"
                      required 
                      value={importUnitPrice}
                      onChange={(e) => setImportUnitPrice(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: '#1e293b', color: '#fff', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Ghi chú nhập hàng</label>
                  <input 
                    type="text" 
                    placeholder="VD: Nhập thêm đợt hàng thứ 2, kiểm đếm đủ..."
                    value={importNotes}
                    onChange={(e) => setImportNotes(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#1e293b', color: '#fff', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px' }}
                  />
                </div>

                {/* Dự kiến tồn kho sau nhập */}
                <div style={{
                  padding: '12px 14px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '10px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  marginTop: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Dự kiến tồn kho sau khi nhập:</span>
                    <p style={{ margin: '2px 0 0', fontSize: '0.95rem' }}>
                      {importProduct.current_stock} ➔ <strong style={{ color: '#86efac', fontSize: '1.1rem' }}>{importProduct.current_stock + (parseInt(importQuantity) || 0)}</strong> {importProduct.unit?.name || 'đơn vị'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Tổng tiền lô nhập:</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#38bdf8', fontSize: '1.05rem' }}>
                      {formatCurrency((parseInt(importQuantity) || 0) * (parseFloat(importUnitPrice) || 0))}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="ghost-btn" onClick={() => setIsImportModalOpen(false)}>Huỷ</button>
                <button 
                  type="submit" 
                  className="primary-btn" 
                  disabled={isSubmitting || !importQuantity || parseInt(importQuantity) <= 0}
                  style={{ background: 'linear-gradient(135deg, #10b981, #2563eb)' }}
                >
                  {isSubmitting ? 'Đang nhập...' : '📥 Xác nhận nhập kho ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Hàng Hoá Mới (Admin) */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Thêm hàng hoá mới</h2>
              <button className="ghost-btn" onClick={() => setIsModalOpen(false)} style={{ padding: '4px' }}>✕</button>
            </div>
            
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Mã SKU *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="VD: PROD-999"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Tên sản phẩm *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="VD: Màn hình Dell 27 inch"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Danh mục</label>
                    <select 
                      required
                      value={formData.category_id}
                      onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      {categories.length === 0 && <option value="">Đang tải...</option>}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Đơn vị tính</label>
                    <select 
                      required
                      value={formData.unit_id}
                      onChange={(e) => setFormData({...formData, unit_id: e.target.value})}
                    >
                      {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      {units.length === 0 && <option value="">Đang tải...</option>}
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Mức tồn kho tối thiểu (Cảnh báo khi dưới mức này)</label>
                  <input 
                    type="number" 
                    min="0"
                    required 
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData({...formData, minimum_stock: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="ghost-btn" onClick={() => setIsModalOpen(false)}>Huỷ</button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Lưu sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đặt Hàng (Buyer) */}
      {isOrderModalOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Xác nhận đặt hàng</h2>
              <button className="ghost-btn" onClick={() => setIsOrderModalOpen(false)} style={{ padding: '4px' }}>✕</button>
            </div>
            
            <form onSubmit={handleOrder}>
              <div className="modal-body">
                <p style={{ color: '#cbd5e1', marginBottom: '16px' }}>
                  Bạn đang đặt mua sản phẩm: <strong>{selectedProduct.name}</strong> ({selectedProduct.code})
                </p>
                <div className="form-group">
                  <label>Số lượng cần đặt</label>
                  <input 
                    type="number" 
                    min="1"
                    max={selectedProduct.current_stock}
                    required 
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value)}
                  />
                  <small style={{ color: '#94a3b8', display: 'block', marginTop: '6px' }}>
                    Số lượng tối đa có thể đặt: {selectedProduct.current_stock}
                  </small>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="ghost-btn" onClick={() => setIsOrderModalOpen(false)}>Huỷ</button>
                <button type="submit" className="primary-btn" disabled={isSubmitting || orderQuantity < 1 || orderQuantity > selectedProduct.current_stock}>
                  {isSubmitting ? 'Đang gửi...' : 'Xác nhận đặt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ProductsTab;
