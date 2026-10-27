/**
 * API service for warehouse management system
 * Handles all communication with the FastAPI backend
 */

const API_BASE_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('access_token');
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  /**
   * Handle API response
   */
  async handleResponse(response) {
    let data;
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    
    if (response.status === 401) {
      this.token = null;
      localStorage.removeItem('access_token');
      const msg = data.message || data.detail?.message || (typeof data.detail === 'string' ? data.detail : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      throw new Error(msg);
    }
    
    if (!response.ok) {
      const msg = data.message || data.detail?.message || (typeof data.detail === 'string' ? data.detail : 'API Error');
      throw new Error(msg);
    }
    
    return data;
  }

  /**
   * Make API request
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      ...options,
      headers: this.getHeaders(),
    };

    const response = await fetch(url, config);
    return this.handleResponse(response);
  }

  // ==================== AUTHENTICATION ====================

  /**
   * Login user
   */
  async login(username, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (response.data?.access_token) {
      this.setToken(response.data.access_token);
    }
    
    return response.data;
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    const response = await this.request('/auth/me', {
      method: 'GET',
    });
    return response.data;
  }

  /**
   * Logout user
   */
  logout() {
    this.token = null;
    localStorage.removeItem('access_token');
  }

  // ==================== PRODUCTS ====================

  /**
   * Get products list
   */
  async getProducts(skip = 0, limit = 100) {
    const response = await this.request(
      `/products?skip=${skip}&limit=${limit}`,
      { method: 'GET' }
    );
    return response.data;
  }

  /**
   * Get product by ID
   */
  async getProduct(productId) {
    const response = await this.request(`/products/${productId}`, {
      method: 'GET',
    });
    return response.data;
  }

  /**
   * Create product
   */
  async createProduct(productData) {
    const response = await this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    return response.data;
  }

  /**
   * Update product
   */
  async updateProduct(productId, productData) {
    const response = await this.request(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
    return response.data;
  }

  /**
   * Delete product
   */
  async deleteProduct(productId) {
    const response = await this.request(`/products/${productId}`, {
      method: 'DELETE',
    });
    return response;
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(limit = 20) {
    const response = await this.request(`/products/stock/low-stock?limit=${limit}`, {
      method: 'GET',
    });
    return response.data;
  }

  // ==================== CATEGORIES ====================

  /**
   * Get categories list
   */
  async getCategories(skip = 0, limit = 100) {
    const response = await this.request(
      `/categories?skip=${skip}&limit=${limit}`,
      { method: 'GET' }
    );
    return response.data;
  }

  /**
   * Create category
   */
  async createCategory(categoryData) {
    const response = await this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
    return response.data;
  }

  // ==================== UNITS ====================

  /**
   * Get units list
   */
  async getUnits(skip = 0, limit = 100) {
    const response = await this.request(
      `/units?skip=${skip}&limit=${limit}`,
      { method: 'GET' }
    );
    return response.data;
  }

  /**
   * Create unit
   */
  async createUnit(unitData) {
    const response = await this.request('/units', {
      method: 'POST',
      body: JSON.stringify(unitData),
    });
    return response.data;
  }

  // ==================== SUPPLIERS ====================

  /**
   * Get suppliers list
   */
  async getSuppliers(skip = 0, limit = 100) {
    const response = await this.request(
      `/suppliers?skip=${skip}&limit=${limit}`,
      { method: 'GET' }
    );
    return response.data;
  }

  /**
   * Create supplier
   */
  async createSupplier(supplierData) {
    const response = await this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData),
    });
    return response.data;
  }

  // ==================== IMPORTS ====================

  /**
   * Get import receipts list
   */
  async getImportReceipts(skip = 0, limit = 100, status = null) {
    const query = new URLSearchParams({ skip, limit });
    if (status) query.append('status', status);
    
    const response = await this.request(`/imports?${query.toString()}`, {
      method: 'GET',
    });
    return response.data;
  }

  /**
   * Get single import receipt by ID
   */
  async getImportReceipt(receiptId) {
    const response = await this.request(`/imports/${receiptId}`, {
      method: 'GET',
    });
    return response.data;
  }

  /**
   * Create import receipt
   */
  async createImportReceipt(receiptData) {
    const response = await this.request('/imports', {
      method: 'POST',
      body: JSON.stringify(receiptData),
    });
    return response.data;
  }

  /**
   * Confirm import receipt
   */
  async confirmImportReceipt(receiptId) {
    const response = await this.request(`/imports/${receiptId}/confirm`, {
      method: 'POST',
    });
    return response.data;
  }

  /**
   * Cancel import receipt
   */
  async cancelImportReceipt(receiptId) {
    const response = await this.request(`/imports/${receiptId}/cancel`, {
      method: 'POST',
    });
    return response.data;
  }

  // ==================== EXPORTS ====================

  /**
   * Get export receipts list
   */
  async getExportReceipts(skip = 0, limit = 100, status = null) {
    const query = new URLSearchParams({ skip, limit });
    if (status) query.append('status', status);
    
    const response = await this.request(`/exports?${query.toString()}`, {
      method: 'GET',
    });
    return response.data;
  }

  /**
   * Create export receipt
   */
  async createExportReceipt(receiptData) {
    const response = await this.request('/exports', {
      method: 'POST',
      body: JSON.stringify(receiptData),
    });
    return response.data;
  }

  /**
   * Confirm export receipt
   */
  async confirmExportReceipt(receiptId) {
    const response = await this.request(`/exports/${receiptId}/confirm`, {
      method: 'POST',
    });
    return response.data;
  }

  /**
   * Cancel export receipt
   */
  async cancelExportReceipt(receiptId) {
    const response = await this.request(`/exports/${receiptId}/cancel`, {
      method: 'POST',
    });
    return response.data;
  }

  // ==================== AI COPILOT & WEB READING ====================

  /**
   * Chat with Gemini Buyer AI Copilot (supports web reading & URL analysis)
   */
  async chatBuyerAI(message, url = null, history = [], includeWarehouseData = true) {
    const response = await this.request('/ai/buyer-chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        url: url || null,
        history,
        include_warehouse_data: includeWarehouseData
      }),
    });
    return response.data;
  }

  /**
   * Directly read and parse a web URL
   */
  async readWebUrl(url) {
    const response = await this.request('/ai/read-web', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    return response.data;
  }

  /**
   * Get warehouse AI analytics
   */
  async getAIAnalytics() {
    const response = await this.request('/ai/analytics', {
      method: 'GET',
    });
    return response.data;
  }

  /**
   * Apply AI purchase recommendation
   */
  async applyAIRecommendation(productId, quantity, supplierId = 1) {
    const response = await this.request('/ai/apply-recommendation', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        quantity,
        supplier_id: supplierId,
      }),
    });
    return response;
  }

  /**
   * Get AI system status
   */
  async getAIStatus() {
    const response = await this.request('/ai/status', {
      method: 'GET',
    });
    return response;
  }
}

export default new ApiService();
