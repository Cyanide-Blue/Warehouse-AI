import React, { useState, useEffect, useRef } from 'react';
import './AITab.css';
import api from '../services/api';

// Format Markdown đơn giản sang React elements
function renderFormattedText(text) {
  if (!text) return null;

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

    if (!trimmed) {
      flushList();
      elements.push(<div key={`spacer-${lineIdx}`} style={{ height: '6px' }} />);
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(<h4 key={`h4-${lineIdx}`} style={{ fontSize: '13px', fontWeight: 600, margin: '8px 0 4px' }}>{parseInlineFormatting(trimmed.substring(4))}</h4>);
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<h3 key={`h3-${lineIdx}`} style={{ fontSize: '14px', fontWeight: 600, margin: '10px 0 4px' }}>{parseInlineFormatting(trimmed.substring(3))}</h3>);
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(<h2 key={`h2-${lineIdx}`} style={{ fontSize: '15px', fontWeight: 600, margin: '12px 0 6px' }}>{parseInlineFormatting(trimmed.substring(2))}</h2>);
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(trimmed.substring(2));
      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      elements.push(
        <div key={`num-${lineIdx}`} style={{ margin: '4px 0' }}>
          {parseInlineFormatting(trimmed)}
        </div>
      );
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${lineIdx}`} style={{ margin: '4px 0' }}>
        {parseInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList();
  return elements;
}

function parseInlineFormatting(str) {
  if (!str) return '';
  const parts = [];
  let remaining = str;
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let match;
  let lastIndex = 0;

  while ((match = pattern.exec(str)) !== null) {
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
  
  // State Buyer Copilot (Lời chào rút gọn tối đa 3 gạch đầu dòng, không emoji)
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: `Xin chào, tôi là Gemini Buyer Copilot. Tôi hỗ trợ bạn các tác vụ sau:\n- Đọc và bóc tách thông tin cấu hình, giá bán từ liên kết sản phẩm\n- Phân tích ưu nhược điểm kỹ thuật và đề xuất lựa chọn phù hợp\n- Đối chiếu tình trạng hàng hóa với dữ liệu tồn kho thực tế\n\nBạn có thể dán đường link sản phẩm vào ô bên trên hoặc nhập câu hỏi bên dưới để bắt đầu.`,
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
      setActionSuccessMsg(res.message || `Đã tạo lệnh nhập kho thành công cho ${rec.product_name}.`);
      await loadAnalytics();
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err) {
      alert(`Lỗi khi tạo lệnh nhập: ${err.message}`);
    } finally {
      setApplyingRecId(null);
    }
  };

  const handleScanWebUrl = async () => {
    const url = inputUrl.trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('Vui lòng nhập đường link đầy đủ có http:// hoặc https://');
      return;
    }

    try {
      setIsScanningUrl(true);
      const data = await api.readWebUrl(url);
      setWebPreview(data);
      setAttachedUrl(url);
      setInputUrl('');
    } catch (err) {
      alert(`Không thể đọc liên kết: ${err.message}`);
    } finally {
      setIsScanningUrl(false);
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const message = (textToSend || inputText).trim();
    const urlToUse = attachedUrl || null;

    if (!message && !urlToUse) return;

    const userMsgId = 'user-' + Date.now();
    const newMsg = {
      id: userMsgId,
      role: 'user',
      text: message || (urlToUse ? `Phân tích trang web này: ${urlToUse}` : ''),
      attachedUrl: urlToUse,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setAttachedUrl(null);
    setWebPreview(null);
    setIsLoading(true);

    if (urlToUse) {
      setLoadingStep('Đang truy cập và trích xuất dữ liệu website...');
    } else {
      setLoadingStep('Đang xử lý câu hỏi...');
    }

    try {
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
          text: res.reply || 'Không có phản hồi từ máy chủ.',
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
          text: `Lỗi kết nối: ${err.message || 'Không thể liên lạc với máy chủ AI.'}\n\nVui lòng thử lại sau.`,
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
    if (window.confirm('Xác nhận làm mới đoạn hội thoại?')) {
      setMessages([
        {
          id: 'welcome-reset',
          role: 'model',
          text: `Đã làm mới cuộc hội thoại. Bạn có thể dán đường link hoặc đặt câu hỏi để tiếp tục.`,
          webInfo: null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setAttachedUrl(null);
      setWebPreview(null);
    }
  };

  const quickPrompts = [
    { label: 'Laptop sinh viên dưới 18 triệu', text: 'Tư vấn chiếc laptop phù hợp cho sinh viên với ngân sách dưới 18 triệu, ưu tiên độ bền và thời lượng pin.' },
    { label: 'So sánh iPhone 15 và Galaxy S24', text: 'So sánh chi tiết iPhone 15 và Galaxy S24 về cấu hình, pin, màn hình và độ ổn định lâu dài.' },
    { label: 'Kiểm tra hàng tồn kho', text: 'Hiện tại trong kho đang có những sản phẩm công nghệ nào sẵn hàng và số lượng tồn bao nhiêu?' },
  ];

  return (
    <div className="ai-page-wrapper">
      {/* Header bar */}
      <header className="ai-header-bar">
        <div className="ai-header-title">
          <p className="eyebrow">Trí tuệ nhân tạo</p>
          <h1>AI Insights & Trợ lý mua hàng</h1>
          <p className="topbar-desc">
            Phân tích tự động cấu hình từ website, đánh giá giá bán và dự báo định mức tồn kho thông minh.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="ai-mode-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeMode === 'buyer'}
            className={`ai-mode-btn ${activeMode === 'buyer' ? 'active' : ''}`}
            onClick={() => setActiveMode('buyer')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Trợ lý mua hàng & Đọc web</span>
          </button>
          <button
            role="tab"
            aria-selected={activeMode === 'analytics'}
            className={`ai-mode-btn ${activeMode === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveMode('analytics')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3v18h18"/>
              <path d="M18 17V9"/>
              <path d="M13 17V5"/>
              <path d="M8 17v-3"/>
            </svg>
            <span>Sức khỏe kho hàng</span>
          </button>
        </div>
      </header>

      {/* MODE 1: BUYER COPILOT & WEB READER */}
      {activeMode === 'buyer' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Bộ đọc website: URL input + Nút Quét link trên cùng 1 hàng */}
          <div className="web-inspector-bar">
            <div className="web-inspector-header">
              <div className="web-inspector-label">
                <strong>Bộ đọc liên kết website</strong>
                <small>Nhập link sản phẩm (Tiki, Shopee, FPT Shop, CellphoneS...) để AI bóc tách thông số kỹ thuật</small>
              </div>
            </div>

            <div className="web-inspector-input-row">
              <input
                type="url"
                placeholder="https://tiki.vn/... hoặc đường dẫn sản phẩm cần đọc"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleScanWebUrl();
                  }
                }}
                className="web-inspector-input"
                aria-label="Đường dẫn trang web"
              />
              <button
                className="web-inspector-btn"
                onClick={handleScanWebUrl}
                disabled={isScanningUrl || !inputUrl.trim()}
              >
                {isScanningUrl ? 'Đang quét...' : 'Quét link'}
              </button>
            </div>

            {attachedUrl && (
              <div className="attached-url-chip">
                <span className="chip-text">
                  <strong>Đã đính kèm:</strong> {webPreview?.title || attachedUrl}
                </span>
                <button
                  className="chip-remove"
                  onClick={() => {
                    setAttachedUrl(null);
                    setWebPreview(null);
                  }}
                  aria-label="Gỡ link này"
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
                <span className="chat-status-dot"></span>
                <strong>Gemini Buyer Copilot</strong>
                <small>• Trực tuyến</small>
              </div>
              <button className="text-btn" onClick={handleClearChat}>
                Làm mới đoạn chat
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="ai-messages-list">
              {messages.map((msg) => (
                <div key={msg.id} className={`ai-message-row ${msg.role === 'user' ? 'user-row' : 'model-row'}`}>
                  <div className="message-bubble">
                    <div className="message-header">
                      <span className="sender-name">
                        {msg.role === 'user' ? 'Bạn' : 'Gemini Copilot'}
                      </span>
                      <span className="message-time">{msg.timestamp}</span>
                    </div>

                    {msg.webInfo && msg.webInfo.success && (
                      <div className="web-source-card">
                        <div className="web-source-badge">
                          Nguồn: <strong>{msg.webInfo.domain}</strong>
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
                          Mở trang gốc
                        </a>
                      </div>
                    )}

                    {msg.attachedUrl && (
                      <div className="user-attached-card">
                        <span>Liên kết: </span>
                        <a href={msg.attachedUrl} target="_blank" rel="noreferrer">
                          {msg.attachedUrl}
                        </a>
                      </div>
                    )}

                    <div className="message-body">
                      {renderFormattedText(msg.text)}
                    </div>

                    {msg.role === 'model' && (
                      <div className="message-footer">
                        <span className="model-tag">
                          {msg.modelUsed ? `Mô hình: ${msg.modelUsed}` : ''}
                        </span>
                        <button
                          className="copy-btn"
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                        >
                          {copiedId === msg.id ? 'Đã sao chép' : 'Sao chép'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="ai-message-row model-row">
                  <div className="message-bubble loading-bubble">
                    <div className="thinking-spinner"></div>
                    <span>{loadingStep || 'Đang chuẩn bị phản hồi...'}</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions (Dạng liên kết chữ) */}
            <div className="ai-quick-chips">
              <span className="chips-title">Gợi ý nhanh:</span>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  className="quick-chip-link"
                  onClick={() => handleSendMessage(p.text)}
                  disabled={isLoading}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="ai-chat-input-bar">
              <textarea
                ref={chatInputRef}
                className="ai-chat-textarea"
                placeholder="Nhập câu hỏi hoặc yêu cầu tư vấn..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={isLoading}
              />
              <button
                className="ai-send-btn"
                onClick={() => handleSendMessage()}
                disabled={isLoading || (!inputText.trim() && !attachedUrl)}
              >
                {isLoading ? 'Đang gửi...' : 'Gửi'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* MODE 2: WAREHOUSE ANALYTICS */}
      {activeMode === 'analytics' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {actionSuccessMsg && (
            <div className="alert-banner success" role="status">
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {isLoadingAnalytics && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-muted)' }}>
              Đang phân tích sức khỏe kho hàng và tính toán định mức bổ sung...
            </div>
          )}

          {analyticsError && (
            <div className="alert-banner error" role="alert">
              <span>{analyticsError}</span>
              <button onClick={loadAnalytics} className="ghost-btn" style={{ marginLeft: 'auto', padding: '4px 8px', minHeight: 'auto' }}>
                Thử lại
              </button>
            </div>
          )}

          {analyticsData && !isLoadingAnalytics && (
            <>
              {/* Health Score Overview */}
              <div className="health-score-grid">
                <div className="health-card">
                  <div className="health-number-box">
                    <span className="health-score-num">{analyticsData.health_score}</span>
                    <span className="health-score-max"> / 100</span>
                  </div>
                  <div className="health-info">
                    <span className="status ok" style={{ marginBottom: '6px' }}>
                      {analyticsData.health_status}
                    </span>
                    <h3>Chỉ số sức khỏe kho</h3>
                    <p>Đánh giá dựa trên tỷ lệ thiếu hụt tồn kho, tốc độ luân chuyển và rủi ro gián đoạn cung ứng.</p>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title-group">
                      <h2>Thống kê định mức</h2>
                      <small className="caption">Tổng hợp số lượng sản phẩm theo các phân nhóm tồn</small>
                    </div>
                    <button className="ghost-btn" onClick={loadAnalytics}>
                      Cập nhật
                    </button>
                  </div>

                  <div className="quick-stats-grid">
                    <div className="stat-box">
                      <span className="stat-label">Tổng mặt hàng</span>
                      <strong className="stat-val">{analyticsData.metrics?.total_products || 0}</strong>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">Hết hàng (0 tồn)</span>
                      <strong className="stat-val" style={{ color: 'var(--status-danger-ink)' }}>
                        {analyticsData.metrics?.out_of_stock_count || 0}
                      </strong>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">Dưới mức tối thiểu</span>
                      <strong className="stat-val" style={{ color: 'var(--status-warn-ink)' }}>
                        {analyticsData.metrics?.low_stock_count || 0}
                      </strong>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">Tồn an toàn</span>
                      <strong className="stat-val" style={{ color: 'var(--status-ok-ink)' }}>
                        {analyticsData.metrics?.healthy_stock_count || 0}
                      </strong>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', padding: '12px 14px', backgroundColor: '#FAF8EE', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)' }}>
                    <span className="caption">Dự toán ngân sách nhập hàng khuyến nghị:</span>
                    <strong className="tabular" style={{ display: 'block', fontSize: '15px', marginTop: '2px', color: 'var(--ink)' }}>
                      {analyticsData.metrics?.total_estimated_reorder_cost
                        ? `${Number(analyticsData.metrics.total_estimated_reorder_cost).toLocaleString('vi-VN')} VNĐ`
                        : '0 VNĐ'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Recommendations Table */}
              <div className="recommendations-section">
                <div className="panel-header">
                  <div className="panel-title-group">
                    <h2>Khuyến nghị bổ sung hàng tồn (Smart Reorder)</h2>
                    <small className="caption">Số lượng đề xuất và nhà cung cấp tương ứng dựa trên dữ liệu tiêu hao</small>
                  </div>
                </div>

                {analyticsData.recommendations && analyticsData.recommendations.length > 0 ? (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Mức độ</th>
                          <th>Sản phẩm</th>
                          <th className="num">Tồn / Tối thiểu</th>
                          <th className="num">Đề xuất nhập</th>
                          <th>Nhà cung cấp</th>
                          <th>Lý do phân tích</th>
                          <th style={{ textAlign: 'right' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.recommendations.map((rec) => (
                          <tr key={rec.product_id}>
                            <td>
                              <span className="status warning">
                                {rec.urgency_label || 'Cần bổ sung'}
                              </span>
                            </td>
                            <td>
                              <strong>{rec.product_name}</strong>
                              <small className="caption" style={{ display: 'block' }}>{rec.product_code}</small>
                            </td>
                            <td className="num">
                              <span className="tabular">{rec.current_stock} / {rec.minimum_stock}</span>
                            </td>
                            <td className="num">
                              <strong className="tabular">+{rec.suggested_quantity}</strong>
                            </td>
                            <td>
                              <span>{rec.supplier_name}</span>
                            </td>
                            <td>
                              <small style={{ color: 'var(--ink-muted)' }}>{rec.ai_reason}</small>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="ghost-btn"
                                style={{ padding: '4px 10px', fontSize: '12px', minHeight: '30px' }}
                                onClick={() => handleApplyRecommendation(rec)}
                                disabled={applyingRecId === rec.product_id}
                              >
                                {applyingRecId === rec.product_id ? 'Đang xử lý...' : 'Tạo phiếu nhập'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                    Tất cả mặt hàng đều đảm bảo số lượng tồn kho an toàn.
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
