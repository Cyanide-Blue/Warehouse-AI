import React, { useState, useEffect, useRef } from 'react';
import './AITab.css';
import api from '../services/api';

// Format Markdown đơn giản sang React elements
function renderFormattedText(text) {
  if (!text) return null;

  // Tách dòng
  const lines = text.split('\n');
  const elements = [];
  let inList = false;
  let listItems = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="ai-markdown-list">
          {listItems.map((li, idx) => (
            <li key={idx}>{parseInlineFormatting(li)}</li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Dòng trống
    if (!trimmed) {
      flushList();
      elements.push(<div key={`spacer-${lineIdx}`} className="ai-spacer" />);
      return;
    }

    // Tiêu đề Markdown ###, ##, #
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(<h4 key={`h4-${lineIdx}`} className="ai-md-h4">{parseInlineFormatting(trimmed.substring(4))}</h4>);
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<h3 key={`h3-${lineIdx}`} className="ai-md-h3">{parseInlineFormatting(trimmed.substring(3))}</h3>);
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(<h2 key={`h2-${lineIdx}`} className="ai-md-h2">{parseInlineFormatting(trimmed.substring(2))}</h2>);
      return;
    }

    // Gạch đầu dòng (- hoặc *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(trimmed.substring(2));
      return;
    }

    // Đánh số thứ tự (1. 2. 3.)
    if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      elements.push(
        <div key={`num-${lineIdx}`} className="ai-numbered-item">
          {parseInlineFormatting(trimmed)}
        </div>
      );
      return;
    }

    // Dòng bình thường
    flushList();
    elements.push(
      <p key={`p-${lineIdx}`} className="ai-paragraph">
        {parseInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList();
  return elements;
}

// Xử lý in đậm **bold** và code `code`
function parseInlineFormatting(str) {
  if (!str) return '';
  // Tách theo **...** hoặc `...`
  const parts = [];
  let remaining = str;

  // Regex bắt **bold** và `code`
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let match;
  let lastIndex = 0;

  while ((match = pattern.exec(str)) !== null) {
    // Phần trước match
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={match.index}>{token.substring(2, token.length - 2)}</strong>);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(<code key={match.index} className="ai-inline-code">{token.substring(1, token.length - 1)}</code>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }

  return parts.length > 0 ? parts : str;
}

function AITab() {
  const [activeMode, setActiveMode] = useState('buyer'); // 'buyer' | 'analytics'
  
  // State Buyer Copilot
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: `👋 **Xin chào! Tôi là Gemini Buyer Copilot** – Trợ lý AI Chuyên Gia Tư Vấn & Mua Sắm Thông Minh.\n\nTôi được trang bị **khả năng đọc trực tiếp bất kỳ trang web nào** để giúp bạn:\n- 🌐 **Đọc & bóc tách cấu hình, giá bán** từ link sản phẩm (Shopee, Tiki, FPT, CellphoneS, TGDĐ, Amazon...)\n- ⚖️ **Đánh giá ưu & nhược điểm khách quan**, cảnh báo rủi ro hoặc giá ảo\n- 💡 **Tư vấn cấu hình tối ưu** theo đúng nhu cầu & túi tiền của bạn\n- 📦 **Đối chiếu với hàng hóa trong kho** nếu bạn muốn mua/nhập ngay\n\n*Hãy dán đường link sản phẩm bên dưới hoặc đặt câu hỏi để tôi bắt đầu hỗ trợ bạn!*`,
      webInfo: null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [attachedUrl, setAttachedUrl] = useState(null);
  const [webPreview, setWebPreview] = useState(null);
  const [isScanningUrl, setIsScanningUrl] = useState(false);

  // State Warehouse Analytics
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [applyingRecId, setApplyingRecId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  useEffect(() => {
    if (activeMode === 'buyer') {
      scrollToBottom();
    } else if (activeMode === 'analytics' && !analyticsData) {
      loadAnalytics();
    }
  }, [activeMode, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAnalytics = async () => {
    try {
      setIsLoadingAnalytics(true);
      setAnalyticsError(null);
      const res = await api.getAIAnalytics();
      setAnalyticsData(res);
    } catch (err) {
      setAnalyticsError(err.message || 'Không thể tải dữ liệu phân tích kho hàng.');
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleApplyRecommendation = async (rec) => {
    try {
      setApplyingRecId(rec.product_id);
      const res = await api.applyAIRecommendation(rec.product_id, rec.suggested_quantity, rec.supplier_id || 1);
      setActionSuccessMsg(res.message || `Đã tạo lệnh nhập kho thành công cho ${rec.product_name}!`);
      // Tải lại phân tích
      await loadAnalytics();
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err) {
      alert(`Lỗi khi tạo lệnh nhập: ${err.message}`);
    } finally {
      setApplyingRecId(null);
    }
  };

  // Quét thử URL trực tiếp
  const handleScanWebUrl = async () => {
    const url = inputUrl.trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('Vui lòng nhập đường link đầy đủ có https:// hoặc http://');
      return;
    }

    try {
      setIsScanningUrl(true);
      const data = await api.readWebUrl(url);
      setWebPreview(data);
      setAttachedUrl(url);
      setInputUrl('');
    } catch (err) {
      alert(`Không thể đọc link: ${err.message}`);
    } finally {
      setIsScanningUrl(false);
    }
  };

  // Gửi tin nhắn chat
  const handleSendMessage = async (textToSend = null) => {
    const message = (textToSend || inputText).trim();
    const urlToUse = attachedUrl || null;

    if (!message && !urlToUse) return;

    const userMsgId = 'user-' + Date.now();
    const newMsg = {
      id: userMsgId,
      role: 'user',
      text: message || (urlToUse ? `Hãy phân tích trang web này: ${urlToUse}` : ''),
      attachedUrl: urlToUse,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setAttachedUrl(null);
    setWebPreview(null);
    setIsLoading(true);

    if (urlToUse) {
      setLoadingStep('Đang truy cập và bóc tách nội dung website...');
    } else {
      setLoadingStep('Gemini đang suy nghĩ câu trả lời tối ưu...');
    }

    try {
      // Chuẩn bị history
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.text
        }));

      const res = await api.chatBuyerAI(message, urlToUse, history, true);

      const aiMsgId = 'ai-' + Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          role: 'model',
          text: res.reply || 'Không có phản hồi từ AI.',
          webInfo: res.web_info,
          modelUsed: res.model_used,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'model',
          text: `⚠️ **Lỗi kết nối:** ${err.message || 'Không thể liên lạc với máy chủ AI.'}\n\n*Vui lòng kiểm tra kết nối mạng và thử lại!*`,
          webInfo: null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (window.confirm('Bạn có chắc muốn xóa lịch sử trò chuyện này?')) {
      setMessages([
        {
          id: 'welcome-reset',
          role: 'model',
          text: `🔄 **Đã làm mới cuộc hội thoại.** Bạn muốn tôi đọc link sản phẩm nào hay tư vấn điều gì cho bạn tiếp theo?`,
          webInfo: null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setAttachedUrl(null);
      setWebPreview(null);
    }
  };

  const quickPrompts = [
    { label: '💻 Laptop sinh viên < 18 triệu', text: 'Tư vấn giúp tôi chiếc laptop tốt nhất cho sinh viên với ngân sách dưới 18 triệu, ưu tiên pin trâu và bền bỉ.' },
    { label: '📱 So sánh iPhone 15 vs S24', text: 'So sánh chi tiết iPhone 15 và Galaxy S24: cấu hình, camera, pin và màn hình. Nhu cầu dùng 3-4 năm thì nên chọn máy nào?' },
    { label: '🔍 Đọc & đánh giá link web', action: () => chatInputRef.current?.focus() },
    { label: '📦 Kiểm tra hàng tồn trong kho', text: 'Hiện tại trong kho đang có những sản phẩm công nghệ nào sẵn hàng và số lượng tồn bao nhiêu?' },
  ];

  return (
    <div className="ai-page-wrapper">
      {/* Top Header */}
      <header className="ai-header-bar">
        <div className="ai-header-title">
          <div className="ai-badge-row">
            <span className="ai-pill live-pill">
              <span className="live-dot"></span> Gemini AI Active
            </span>
            <span className="ai-pill web-pill">🌐 Web Reader Ready</span>
            <span className="ai-pill model-pill">⚡ Multi-Model Flash</span>
          </div>
          <h1>Trí Tuệ Nhân Tạo & Trợ Lý Mua Hàng</h1>
          <p className="ai-subtitle">
            Hệ thống AI đa năng: Đọc trực tiếp website, bóc tách cấu hình & giá bán, bảo vệ quyền lợi người mua và quản trị kho thông minh.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="ai-mode-tabs">
          <button
            className={`ai-mode-btn ${activeMode === 'buyer' ? 'active' : ''}`}
            onClick={() => setActiveMode('buyer')}
          >
            <span className="icon">🛒</span>
            <div>
              <strong>Trợ Lý Mua Hàng & Đọc Web</strong>
              <small>Buyer Copilot & Web Reader</small>
            </div>
          </button>
          <button
            className={`ai-mode-btn ${activeMode === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveMode('analytics')}
          >
            <span className="icon">📊</span>
            <div>
              <strong>Phân Tích & Sức Khỏe Kho</strong>
              <small>Health Score & Recommendations</small>
            </div>
          </button>
        </div>
      </header>

      {/* ===================== MODE 1: BUYER COPILOT & WEB READER ===================== */}
      {activeMode === 'buyer' && (
        <section className="buyer-copilot-container">
          {/* Web Inspector Bar */}
          <div className="web-inspector-bar">
            <div className="web-inspector-label">
              <span className="radar-icon">🌐</span>
              <div>
                <strong>Bộ Đọc & Bóc Tách Website (Web Inspector)</strong>
                <small>Dán bất kỳ URL sản phẩm (Shopee, Tiki, FPT, TGDĐ, CellphoneS, Amazon...) để AI quét nội dung</small>
              </div>
            </div>

            <div className="web-inspector-input-row">
              <input
                type="url"
                placeholder="https://tiki.vn/... hoặc https://fptshop.com.vn/... hoặc bất kỳ link web nào"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleScanWebUrl();
                  }
                }}
                className="web-inspector-input"
              />
              <button
                className="web-inspector-btn"
                onClick={handleScanWebUrl}
                disabled={isScanningUrl || !inputUrl.trim()}
              >
                {isScanningUrl ? (
                  <>
                    <span className="btn-spinner"></span> Đang quét...
                  </>
                ) : (
                  <>
                    <span>🔍</span> Quét & Nạp Link
                  </>
                )}
              </button>
            </div>

            {/* Attached URL Badge */}
            {attachedUrl && (
              <div className="attached-url-chip">
                <span className="chip-icon">🔗</span>
                <span className="chip-text">
                  <strong>Đã đính kèm:</strong> {webPreview?.title || attachedUrl}
                </span>
                <button
                  className="chip-remove"
                  onClick={() => {
                    setAttachedUrl(null);
                    setWebPreview(null);
                  }}
                  title="Gỡ link này"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Chat Window */}
          <div className="ai-chat-window">
            <div className="ai-chat-top-actions">
              <div className="ai-chat-meta">
                <span className="chat-bot-avatar">🤖</span>
                <div>
                  <strong>Gemini Buyer Copilot</strong>
                  <span className="chat-status">
                    <span className="online-point"></span> Sẵn sàng phản hồi
                  </span>
                </div>
              </div>
              <button className="clear-chat-btn" onClick={handleClearChat} title="Làm mới đoạn hội thoại">
                🗑️ Làm mới chat
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="ai-messages-list">
              {messages.map((msg) => (
                <div key={msg.id} className={`ai-message-row ${msg.role === 'user' ? 'user-row' : 'model-row'}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>

                  <div className="message-bubble">
                    <div className="message-header">
                      <span className="sender-name">
                        {msg.role === 'user' ? 'Bạn (Người mua)' : 'Gemini Buyer Copilot'}
                      </span>
                      <span className="message-time">{msg.timestamp}</span>
                    </div>

                    {/* Web Link Preview nếu AI đọc được web */}
                    {msg.webInfo && msg.webInfo.success && (
                      <div className="web-source-card">
                        <div className="web-source-badge">
                          <span>🌐 Dữ liệu trích xuất từ website:</span>
                          <strong>{msg.webInfo.domain}</strong>
                        </div>
                        <h4 className="web-source-title">{msg.webInfo.title}</h4>
                        {msg.webInfo.description && (
                          <p className="web-source-desc">{msg.webInfo.description}</p>
                        )}
                        <a
                          href={msg.webInfo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="web-source-link"
                        >
                          Mở trang gốc ↗
                        </a>
                      </div>
                    )}

                    {/* URL đính kèm của User */}
                    {msg.attachedUrl && (
                      <div className="user-attached-card">
                        <span>🔗 Link kiểm tra:</span>
                        <a href={msg.attachedUrl} target="_blank" rel="noreferrer">
                          {msg.attachedUrl}
                        </a>
                      </div>
                    )}

                    {/* Nội dung tin nhắn */}
                    <div className="message-body">
                      {renderFormattedText(msg.text)}
                    </div>

                    {/* Message Footer */}
                    {msg.role === 'model' && (
                      <div className="message-footer">
                        {msg.modelUsed && (
                          <span className="model-tag">⚡ Engine: {msg.modelUsed}</span>
                        )}
                        <button
                          className="copy-btn"
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          title="Sao chép nội dung"
                        >
                          {copiedId === msg.id ? '✓ Đã chép' : '📋 Sao chép'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading State */}
              {isLoading && (
                <div className="ai-message-row model-row loading-row">
                  <div className="message-avatar pulse-avatar">🤖</div>
                  <div className="message-bubble loading-bubble">
                    <div className="ai-thinking-wave">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className="thinking-text">{loadingStep || 'Gemini đang phân tích và soạn câu trả lời...'}</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions Chips */}
            <div className="ai-quick-chips">
              <span className="chips-title">💡 Gợi ý nhanh:</span>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  className="quick-chip-btn"
                  onClick={() => {
                    if (p.action) {
                      p.action();
                    } else {
                      handleSendMessage(p.text);
                    }
                  }}
                  disabled={isLoading}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <div className="ai-chat-input-bar">
              <textarea
                ref={chatInputRef}
                className="ai-chat-textarea"
                placeholder="Nhập câu hỏi cần tư vấn, hoặc dán link sản phẩm trực tiếp vào đây..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                disabled={isLoading}
              />
              <button
                className="ai-send-btn"
                onClick={() => handleSendMessage()}
                disabled={isLoading || (!inputText.trim() && !attachedUrl)}
              >
                {isLoading ? (
                  <span className="send-spinner"></span>
                ) : (
                  <>
                    <span>Gửi</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===================== MODE 2: WAREHOUSE ANALYTICS & HEALTH ===================== */}
      {activeMode === 'analytics' && (
        <section className="warehouse-analytics-container">
          {actionSuccessMsg && (
            <div className="alert-banner success-alert">
              <span>✓</span> {actionSuccessMsg}
            </div>
          )}

          {isLoadingAnalytics && (
            <div className="analytics-loading-box">
              <div className="ai-brain-animation">
                <div className="core"></div>
                <div className="ring ring-1"></div>
                <div className="ring ring-2"></div>
              </div>
              <p>Hệ thống AI đang phân tích dữ liệu tồn kho, luân chuyển và dự toán nhu cầu...</p>
            </div>
          )}

          {analyticsError && (
            <div className="alert-banner error-alert">
              <span>⚠️</span> {analyticsError}
              <button onClick={loadAnalytics} className="retry-btn">Thử lại</button>
            </div>
          )}

          {analyticsData && !isLoadingAnalytics && (
            <>
              {/* Health Score Overview Grid */}
              <div className="health-score-grid">
                <div className="health-card panel">
                  <div className="score-circle-wrapper">
                    <div
                      className="score-circle"
                      style={{
                        background: `conic-gradient(${analyticsData.health_color || '#10b981'} ${analyticsData.health_score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`
                      }}
                    >
                      <div className="score-circle-inner">
                        <strong className="score-number">{analyticsData.health_score}</strong>
                        <small>/ 100</small>
                      </div>
                    </div>
                  </div>
                  <div className="health-info">
                    <span className="health-status-badge" style={{ color: analyticsData.health_color }}>
                      ● {analyticsData.health_status}
                    </span>
                    <h3>Chỉ Số Sức Khỏe Kho Hàng</h3>
                    <p>Được AI đánh giá dựa trên tỷ lệ thiếu hụt tồn kho, tốc độ luân chuyển và rủi ro đứt gãy cung ứng.</p>
                  </div>
                </div>

                <div className="metrics-summary-card panel">
                  <h3>Thống Kê Kho Nhanh</h3>
                  <div className="quick-stats-grid">
                    <div className="stat-box">
                      <span className="stat-label">Tổng mặt hàng</span>
                      <strong className="stat-val">{analyticsData.metrics?.total_products || 0}</strong>
                    </div>
                    <div className="stat-box danger">
                      <span className="stat-label">Hết hàng (0 tồn)</span>
                      <strong className="stat-val">{analyticsData.metrics?.out_of_stock_count || 0}</strong>
                    </div>
                    <div className="stat-box warning">
                      <span className="stat-label">Dưới mức tối thiểu</span>
                      <strong className="stat-val">{analyticsData.metrics?.low_stock_count || 0}</strong>
                    </div>
                    <div className="stat-box success">
                      <span className="stat-label">Tồn an toàn</span>
                      <strong className="stat-val">{analyticsData.metrics?.healthy_stock_count || 0}</strong>
                    </div>
                  </div>

                  <div className="cost-estimate-banner">
                    <div>
                      <small>Dự toán ngân sách nhập hàng đề xuất:</small>
                      <strong>
                        {analyticsData.metrics?.total_estimated_reorder_cost
                          ? `${Number(analyticsData.metrics.total_estimated_reorder_cost).toLocaleString('vi-VN')} VNĐ`
                          : '0 VNĐ'}
                      </strong>
                    </div>
                    <button className="refresh-btn" onClick={loadAnalytics}>
                      🔄 Cập nhật AI
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Anomalies & Warnings */}
              {analyticsData.anomalies && analyticsData.anomalies.length > 0 && (
                <div className="anomalies-section panel">
                  <div className="section-title-row">
                    <h3>⚠️ Cảnh Báo Bất Thường & Rủi Ro Phát Hiện Bằng AI</h3>
                    <span className="badge-count">{analyticsData.anomalies.length} vấn đề</span>
                  </div>
                  <div className="anomalies-cards-grid">
                    {analyticsData.anomalies.map((ano, idx) => (
                      <div key={idx} className={`anomaly-card severity-${ano.severity?.toLowerCase()}`}>
                        <div className="anomaly-header">
                          <span className="anomaly-tag">{ano.type}</span>
                          <strong>{ano.title}</strong>
                        </div>
                        <p>{ano.description}</p>
                        <div className="anomaly-action-box">
                          <span>👉 Đề xuất hành động:</span> {ano.action}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Recommendations Table */}
              <div className="recommendations-section panel">
                <div className="section-title-row">
                  <h3>📋 Khuyến Nghị Bổ Sung Hàng Tối Ưu (Smart Reorder)</h3>
                  <p>AI tự động tính toán số lượng đặt hàng tiêu chuẩn và gợi ý nhà phân phối chính xác.</p>
                </div>

                {analyticsData.recommendations && analyticsData.recommendations.length > 0 ? (
                  <div className="reorder-table-responsive">
                    <table className="ai-data-table">
                      <thead>
                        <tr>
                          <th>Mức độ</th>
                          <th>Sản phẩm</th>
                          <th>Tồn kho / Tối thiểu</th>
                          <th>AI Đề xuất nhập</th>
                          <th>Nhà cung cấp</th>
                          <th>Lý do từ AI</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.recommendations.map((rec) => (
                          <tr key={rec.product_id}>
                            <td>
                              <span
                                className="urgency-badge"
                                style={{ backgroundColor: `${rec.urgency_color}22`, color: rec.urgency_color, borderColor: rec.urgency_color }}
                              >
                                {rec.urgency_label}
                              </span>
                            </td>
                            <td>
                              <strong>{rec.product_name}</strong>
                              <small className="sub-code">{rec.product_code}</small>
                            </td>
                            <td>
                              <span className="stock-ratio">
                                <span className={rec.current_stock === 0 ? 'text-danger' : 'text-warning'}>
                                  {rec.current_stock}
                                </span>{' '}
                                / {rec.minimum_stock}
                              </span>
                            </td>
                            <td>
                              <strong className="suggested-qty">+{rec.suggested_quantity}</strong> cái
                            </td>
                            <td>
                              <span className="supplier-tag">{rec.supplier_name}</span>
                            </td>
                            <td className="reason-cell">
                              <small>{rec.ai_reason}</small>
                            </td>
                            <td>
                              <button
                                className="apply-btn"
                                onClick={() => handleApplyRecommendation(rec)}
                                disabled={applyingRecId === rec.product_id}
                              >
                                {applyingRecId === rec.product_id ? 'Đang tạo...' : 'Tạo phiếu nhập'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-reorder-box">
                    <span>🎉</span>
                    <h4>Kho hàng đang ở trạng thái tối ưu!</h4>
                    <p>Không có sản phẩm nào chạm ngưỡng thiếu hàng. AI sẽ tiếp tục theo dõi biến động xuất nhập kho.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default AITab;
