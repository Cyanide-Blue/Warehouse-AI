import { useState, useEffect } from 'react';
import api from '../services/api';

function ProductsTab({ userRole, currentUser, onNavigateTab }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
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
      console.error("Lỗi khi nạp dữ liệu danh mục:", err);
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
    if (window.confirm(`Xác nhận xóa hàng hóa "${name}"? Thao tác này không thể hoàn tác.`)) {
      try {
        await api.deleteProduct(id);
        showNotification(`Đã xóa hàng hóa "${name}".`);
        loadProducts();
      } catch (err) {
        alert(`Lỗi khi xóa: ${err.message}`);
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
      alert(`Lỗi khi tạo hàng hóa: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        notes: `Yêu cầu xuất hàng: ${selectedProduct.name}`,
        items: [
          {
            product_id: selectedProduct.id,
            quantity: parseInt(orderQuantity)
          }
        ]
      };
      
      await api.createExportReceipt(submitData);
      setIsOrderModalOpen(false);
      showNotification(`Đã tạo phiếu xuất kho thành công.`);
      loadProducts();
    } catch (err) {
      alert(`Lỗi khi tạo yêu cầu: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openQuickImportModal = (product) => {
    setImportProduct(product);
    setImportQuantity(10);
    setImportUnitPrice(100000);
    setImportNotes(`Nhập bổ sung cho SKU ${product.code}`);
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
      alert("Vui lòng chọn nhà cung cấp");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const submitData = {
        supplier_id: parseInt(importSupplierId),
        receipt_date: new Date().toISOString().split('T')[0],
        notes: importNotes || `Nhập kho nhanh cho SKU ${importProduct.code}`,
        auto_confirm: true,
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
      showNotification(`Đã nhập thành công ${qty} sản phẩm cho "${importProduct.name}". Mã phiếu: ${receipt.receipt_code}`);
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

  const filteredProducts = products.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (p.code && p.code.toLowerCase().includes(term)) ||
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.category?.name && p.category.name.toLowerCase().includes(term))
    );
  });

  return (
    <>
      {/* Page Topbar Header: 1 Primary CTA */}
      <header className="topbar">
        <div className="topbar-left">
          <p className="eyebrow">Danh mục & Tồn kho</p>
          <h1>Hàng hóa</h1>
          <p className="topbar-desc">
            Quản lý mã định danh SKU, đơn vị tính và định mức tồn kho an toàn cho toàn bộ mặt hàng.
          </p>
        </div>
        <div className="topbar-actions">
          {isAdmin ? (
            <button className="primary-btn" onClick={() => setIsModalOpen(true)}>
              Thêm hàng hóa mới
            </button>
          ) : canImport && onNavigateTab ? (
            <button className="primary-btn" onClick={() => onNavigateTab('imports')}>
              Tạo phiếu nhập mới
            </button>
          ) : null}
        </div>
      </header>

      {/* Thông báo thành công */}
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

      {/* Main panel */}
      <article className="panel">
        <div className="panel-header">
          <div className="panel-title-group">
            <h2>Danh sách hàng hóa ({filteredProducts.length})</h2>
            <small className="caption">Bấm "Nhập hàng" để tạo phiếu nhập bổ sung cho từng SKU</small>
          </div>
          <button className="ghost-btn" onClick={loadProducts}>
            Làm mới danh sách
          </button>
        </div>

        {/* Search bar with clean SVG icon */}
        <div className="toolbar-row">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" x2="16.65" y1="21" y2="16.65"/>
            </svg>
            <input 
              type="text"
              placeholder="Tìm theo mã SKU, tên hàng hóa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Tìm kiếm sản phẩm"
            />
          </div>
          {searchTerm && (
            <button 
              className="text-btn" 
              onClick={() => setSearchTerm('')}
              style={{ fontSize: '12px' }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
            Đang tải danh sách hàng hóa...
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Mã SKU</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Đơn vị</th>
                  <th className="num">Tồn thực tế</th>
                  {isAdmin && <th className="num">Mức tối thiểu</th>}
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={isAdmin ? 8 : 7} 
                      style={{ textAlign: 'center', padding: '36px', color: 'var(--ink-subtle)' }}
                    >
                      {searchTerm ? 'Không tìm thấy sản phẩm nào khớp với từ khóa tìm kiếm.' : 'Chưa có sản phẩm nào trong hệ thống.'}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isOutOfStock = p.current_stock <= 0;
                    const isLowStock = !isOutOfStock && p.current_stock < p.minimum_stock;
                    const categoryDisplay = p.category?.name && p.category.name !== 'N/A' ? p.category.name : '—';
                    const unitDisplay = p.unit?.name && p.unit.name !== 'N/A' ? p.unit.name : '—';

                    return (
                      <tr key={p.id}>
                        <td>
                          <span className="sku-code">{p.code}</span>
                        </td>
                        <td>
                          <strong style={{ fontWeight: 500 }}>{p.name}</strong>
                          {p.description && (
                            <small className="caption" style={{ display: 'block', marginTop: '2px' }}>
                              {p.description}
                            </small>
                          )}
                        </td>
                        <td>
                          {categoryDisplay === '—' ? <span className="empty-cell">—</span> : categoryDisplay}
                        </td>
                        <td>
                          {unitDisplay === '—' ? <span className="empty-cell">—</span> : unitDisplay}
                        </td>
                        <td className="num">
                          <strong style={{ fontWeight: 600 }}>{p.current_stock}</strong>
                        </td>
                        {isAdmin && (
                          <td className="num">
                            <span style={{ color: 'var(--ink-muted)' }}>{p.minimum_stock}</span>
                          </td>
                        )}
                        <td>
                          <span 
                            className={`status ${
                              isOutOfStock 
                                ? 'danger' 
                                : isLowStock 
                                ? 'warning' 
                                : 'ok'
                            }`}
                          >
                            {isOutOfStock ? 'Hết hàng' : isLowStock ? 'Sắp hết' : 'Còn hàng'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                            {canImport && (
                              <button 
                                className="ghost-btn" 
                                style={{ padding: '4px 10px', fontSize: '12px', minHeight: '30px' }}
                                onClick={() => openQuickImportModal(p)}
                              >
                                Nhập hàng
                              </button>
                            )}

                            {isBuyer && (
                              <button 
                                className="ghost-btn" 
                                style={{ padding: '4px 10px', fontSize: '12px', minHeight: '30px' }}
                                onClick={() => openOrderModal(p)}
                                disabled={p.current_stock === 0}
                              >
                                Đặt hàng
                              </button>
                            )}

                            {isAdmin && (
                              <button 
                                className="text-btn danger-btn" 
                                style={{ padding: '4px 8px', fontSize: '12px', minHeight: '30px' }}
                                onClick={() => handleDelete(p.id, p.name)}
                                title="Xóa hàng hóa"
                              >
                                Xóa
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

      {/* Modal Nhập hàng nhanh (Admin & Staff) - Radius max 6px */}
      {isImportModalOpen && importProduct && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div>
                <h2>Nhập hàng vào kho</h2>
                <small className="caption">Ghi nhận lô hàng mới và cộng thẳng vào tồn kho thực tế</small>
              </div>
              <button 
                className="text-btn" 
                onClick={() => setIsImportModalOpen(false)} 
                aria-label="Đóng cửa sổ"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleQuickImport}>
              <div className="modal-body">
                {/* Thông tin sản phẩm */}
                <div style={{
                  padding: '12px 14px',
                  backgroundColor: '#FAF8EE',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '16px'
                }}>
                  <span className="caption" style={{ display: 'block', marginBottom: '2px' }}>Sản phẩm tiếp nhận:</span>
                  <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{importProduct.name}</strong>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '12px' }}>
                    <span>Mã SKU: <strong className="tabular">{importProduct.code}</strong></span>
                    <span>Đơn vị: <strong>{importProduct.unit?.name || '—'}</strong></span>
                    <span>Tồn hiện tại: <strong className="tabular">{importProduct.current_stock}</strong></span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="import-supplier">Nhà cung cấp giao hàng</label>
                  <select 
                    id="import-supplier"
                    required
                    value={importSupplierId}
                    onChange={(e) => setImportSupplierId(e.target.value)}
                  >
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                    {suppliers.length === 0 && <option value="">Đang nạp danh sách...</option>}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label htmlFor="import-qty">Số lượng nhập</label>
                    <input 
                      id="import-qty"
                      type="number" 
                      min="1"
                      required 
                      value={importQuantity}
                      onChange={(e) => setImportQuantity(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="import-price">Đơn giá nhập (VNĐ)</label>
                    <input 
                      id="import-price"
                      type="number" 
                      min="0"
                      step="1000"
                      required 
                      value={importUnitPrice}
                      onChange={(e) => setImportUnitPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="import-notes">Ghi chú phiếu nhập</label>
                  <input 
                    id="import-notes"
                    type="text" 
                    placeholder="Ghi chú đợt giao, chứng từ kiểm đếm..."
                    value={importNotes}
                    onChange={(e) => setImportNotes(e.target.value)}
                  />
                </div>

                {/* Dự kiến tồn kho sau nhập */}
                <div style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--status-ok-bg)',
                  border: '1px solid #BBF7D0',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span className="caption" style={{ color: 'var(--status-ok-ink)' }}>Dự kiến tồn kho sau nhập:</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--status-ok-ink)' }} className="tabular">
                      {importProduct.current_stock} ➔ {importProduct.current_stock + (parseInt(importQuantity) || 0)} {importProduct.unit?.name || ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="caption" style={{ color: 'var(--status-ok-ink)' }}>Tổng tiền lô hàng:</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--status-ok-ink)' }} className="tabular">
                      {formatCurrency((parseInt(importQuantity) || 0) * (parseFloat(importUnitPrice) || 0))}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="ghost-btn" onClick={() => setIsImportModalOpen(false)}>
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="primary-btn" 
                  disabled={isSubmitting || !importQuantity || parseInt(importQuantity) <= 0}
                >
                  {isSubmitting ? 'Đang ghi nhận...' : 'Xác nhận nhập kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Hàng Hóa Mới (Admin) */}
      {isModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h2>Thêm hàng hóa mới</h2>
                <small className="caption">Khai báo thông tin sản phẩm và ngưỡng an toàn</small>
              </div>
              <button 
                className="text-btn" 
                onClick={() => setIsModalOpen(false)} 
                aria-label="Đóng cửa sổ"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="create-sku">Mã SKU *</label>
                  <input 
                    id="create-sku"
                    type="text" 
                    required 
                    placeholder="Ví dụ: PROD-101"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="create-name">Tên sản phẩm *</label>
                  <input 
                    id="create-name"
                    type="text" 
                    required 
                    placeholder="Ví dụ: Cáp mạng Cat6 UTP 305m"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="create-cat">Danh mục</label>
                    <select 
                      id="create-cat"
                      required
                      value={formData.category_id}
                      onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      {categories.length === 0 && <option value="">Đang tải...</option>}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="create-unit">Đơn vị tính</label>
                    <select 
                      id="create-unit"
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
                  <label htmlFor="create-min-stock">Mức tồn kho tối thiểu (Cảnh báo khi dưới mức này)</label>
                  <input 
                    id="create-min-stock"
                    type="number" 
                    min="0"
                    required 
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData({...formData, minimum_stock: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="ghost-btn" onClick={() => setIsModalOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Lưu sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đặt hàng (Buyer) */}
      {isOrderModalOpen && selectedProduct && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h2>Xác nhận đặt hàng</h2>
                <small className="caption">Tạo lệnh yêu cầu xuất sản phẩm từ kho</small>
              </div>
              <button className="text-btn" onClick={() => setIsOrderModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleOrder}>
              <div className="modal-body">
                <p style={{ color: 'var(--ink)', marginBottom: '16px' }}>
                  Sản phẩm đặt mua: <strong>{selectedProduct.name}</strong> (<span className="tabular">{selectedProduct.code}</span>)
                </p>
                <div className="form-group">
                  <label htmlFor="order-qty">Số lượng cần đặt</label>
                  <input 
                    id="order-qty"
                    type="number" 
                    min="1"
                    max={selectedProduct.current_stock}
                    required 
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value)}
                  />
                  <small className="caption" style={{ display: 'block', marginTop: '6px' }}>
                    Khả dụng trong kho: <span className="tabular">{selectedProduct.current_stock}</span>
                  </small>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="ghost-btn" onClick={() => setIsOrderModalOpen(false)}>
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="primary-btn" 
                  disabled={isSubmitting || orderQuantity < 1 || orderQuantity > selectedProduct.current_stock}
                >
                  {isSubmitting ? 'Đang gửi...' : 'Xác nhận đặt hàng'}
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
