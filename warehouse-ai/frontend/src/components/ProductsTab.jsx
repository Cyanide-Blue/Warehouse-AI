import { useState, useEffect } from 'react';
import api from '../services/api';

function ProductsTab({ userRole }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category_id: '',
    unit_id: '',
    minimum_stock: 0,
    price: 0,
  });

  // Order data
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  
  // Dropdown data
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);

  const isAdmin = userRole === 'ADMIN';
  const isBuyer = userRole === 'BUYER';

  useEffect(() => {
    loadProducts();
    if (isAdmin) {
      loadDropdownData();
    }
  }, [isAdmin]);

  const loadDropdownData = async () => {
    try {
      const [cats, uns] = await Promise.all([
        api.getCategories(0, 100),
        api.getUnits(0, 100)
      ]);
      setCategories(cats || []);
      setUnits(uns || []);
      
      // Set defaults if available
      if (cats?.length > 0 && uns?.length > 0) {
        setFormData(prev => ({
          ...prev,
          category_id: cats[0].id,
          unit_id: uns[0].id
        }));
      }
    } catch (err) {
      console.error("Lỗi khi tải danh mục:", err);
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
        loadProducts(); // Reload list after delete
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
      loadProducts();
    } catch (err) {
      alert(`Lỗi khi tạo hàng hoá: ${err.message}`);
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
      
      // Simulate order by creating an export receipt
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
      alert('Đặt hàng thành công! Đơn hàng đã được gửi cho kho.');
      loadProducts();
    } catch (err) {
      alert(`Lỗi khi đặt hàng: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">{isBuyer ? 'Cửa hàng' : 'Quản lý danh mục'}</p>
          <h1>Hàng hóa</h1>
        </div>
        {isAdmin && (
          <button className="primary-btn" onClick={() => setIsModalOpen(true)}>+ Thêm hàng hóa mới</button>
        )}
      </header>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', borderRadius: '8px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      <article className="panel">
        <div className="panel-header">
          <h2>Danh sách tất cả sản phẩm</h2>
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
                      <td><strong>{p.code}</strong></td>
                      <td>{p.name}</td>
                      <td>{p.category?.name || 'N/A'}</td>
                      <td>{p.unit?.name || 'N/A'}</td>
                      <td><strong>{p.current_stock}</strong></td>
                      {isAdmin && <td>{p.minimum_stock}</td>}
                      <td>
                        <span className={`status ${p.current_stock < p.minimum_stock ? 'warning' : 'ok'}`}>
                          {p.current_stock === 0 ? 'Hết hàng' : (p.current_stock < p.minimum_stock ? 'Sắp hết' : 'Còn hàng')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isAdmin && (
                          <button 
                            className="ghost-btn" 
                            style={{ color: '#fca5a5' }}
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

      {/* Modal Thêm Hàng Hoá */}
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
                  <label>Mã SKU</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="VD: SP001"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Tên sản phẩm</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="VD: Bàn phím cơ"
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

      {/* Modal Đặt Hàng */}
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
