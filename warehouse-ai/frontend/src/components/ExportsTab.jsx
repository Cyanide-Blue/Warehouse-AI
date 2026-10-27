import { useState, useEffect } from 'react';
import api from '../services/api';

function ExportsTab() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Quản lý giao dịch</p>
          <h1>Xuất kho</h1>
        </div>
        <button className="primary-btn" onClick={() => setIsModalOpen(true)}>+ Tạo phiếu xuất mới</button>
      </header>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', borderRadius: '8px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      <article className="panel">
        <div className="panel-header">
          <h2>Lịch sử xuất kho</h2>
          <button className="ghost-btn" onClick={loadReceipts}>🔄 Làm mới</button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải dữ liệu...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Mã Phiếu</th>
                  <th>Ngày Xuất</th>
                  <th>Người phụ trách</th>
                  <th>Ghi chú</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      Chưa có phiếu xuất kho nào.
                    </td>
                  </tr>
                ) : (
                  receipts.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.receipt_code}</strong></td>
                      <td>{formatDate(r.receipt_date)}</td>
                      <td>{r.created_by?.full_name || 'N/A'}</td>
                      <td>{r.notes || 'N/A'}</td>
                      <td>
                        <span className={`status ${r.status === 'COMPLETED' ? 'ok' : r.status === 'CANCELLED' ? 'danger' : 'warning'}`}>
                          {r.status === 'COMPLETED' ? 'Đã hoàn thành' : r.status === 'CANCELLED' ? 'Đã huỷ' : 'Chờ xử lý'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="ghost-btn" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>Chi tiết</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* Modal Tạo Phiếu Xuất */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h2>Tạo phiếu xuất kho</h2>
              <button className="ghost-btn" onClick={() => setIsModalOpen(false)} style={{ padding: '4px' }}>✕</button>
            </div>
            
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Ngày xuất</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.receipt_date}
                      onChange={(e) => setFormData({...formData, receipt_date: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Lý do / Ghi chú</label>
                    <input 
                      type="text" 
                      placeholder="Xuất bán hàng, trả hàng..."
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Danh sách sản phẩm xuất</h3>
                    <button type="button" className="ghost-btn" onClick={addItem} style={{ fontSize: '0.85rem' }}>+ Thêm sản phẩm</button>
                  </div>
                  
                  {items.map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px', background: 'rgba(30,41,59,0.3)', padding: '12px', borderRadius: '8px' }}>
                      <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                        <label>Sản phẩm</label>
                        <select 
                          required
                          value={item.product_id}
                          onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                        >
                          {products.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                          {products.length === 0 && <option value="">Chưa có SP</option>}
                        </select>
                      </div>
                      
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>Số lượng</label>
                        <input 
                          type="number" 
                          min="1"
                          required 
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        />
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={() => removeItem(index)}
                        style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', marginTop: '30px', padding: '4px' }}
                        disabled={items.length === 1}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="ghost-btn" onClick={() => setIsModalOpen(false)}>Huỷ</button>
                <button type="submit" className="primary-btn" disabled={isSubmitting || products.length === 0}>
                  {isSubmitting ? 'Đang tạo...' : 'Tạo phiếu xuất'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ExportsTab;
