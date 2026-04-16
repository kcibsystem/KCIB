/**
 * KCIB Gemini Chatbot via Apps Script (Clean Version)
 */

const Chatbot = {
  isOpen: false,
  messages: [],

  init() {
    this._createUI();
    this._attachEvents();
  },

  _createUI() {
    const chatbotHTML = `
      <button id="chatbot-toggle" aria-label="เปิดแชท">
        <div class="pulse-ring"></div>
        <svg viewBox="0 0 24 24">
          <path d="M12,2A10,10,0,0,0,2,12c0,3.42,1.71,6.44,4.34,8.27L5.17,22.41A1,1,0,0,0,6.1,23.86l4.24-1.35A10,10,0,1,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"/>
        </svg>
      </button>

      <div id="chatbot-window">
        <div class="chat-header">
          <div class="chat-header-title">
            <span>KCIB AI Assistant</span>
          </div>
          <button class="chat-close-btn">&times;</button>
        </div>
        <div class="chat-messages" id="chat-messages-container">
          <div class="message bot">สวัสดีครับ ผมคือ AI ของระบบ KCIB มีอะไรให้ช่วยไหมครับ?</div>
        </div>
        <div class="chat-input-area">
          <input type="text" id="chat-input" placeholder="พิมพ์ข้อความที่นี่..." autocomplete="off">
          <button class="chat-send-btn" id="chat-send">ส่ง</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
  },

  _attachEvents() {
    const toggle = document.getElementById('chatbot-toggle');
    const windowEl = document.getElementById('chatbot-window');
    const closeBtn = document.querySelector('.chat-close-btn');
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');

    toggle.onclick = () => {
      this.isOpen = !this.isOpen;
      windowEl.classList.toggle('active', this.isOpen);
    };

    closeBtn.onclick = () => {
      this.isOpen = false;
      windowEl.classList.remove('active');
    };

    sendBtn.onclick = () => this._sendMessage();
    input.onkeypress = (e) => {
      if (e.key === 'Enter') this._sendMessage();
    };
  },

  async _sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    this._addMessage('user', text);
    input.value = '';
    const typingId = this._addTyping();

    try {
      if (typeof SCRIPT_URL === 'undefined') throw new Error("ไม่พบ SCRIPT_URL");

      // ใช้ GET เพื่อเลี่ยงปัญหา CORS กับ Apps Script
      const getUrl = `${SCRIPT_URL}?action=chat&message=${encodeURIComponent(text)}`;
      const res = await fetch(getUrl);
      
      if (!res.ok) throw new Error("Network response was not ok");
      
      const data = await res.json();

      this._removeTyping(typingId);
      if (data.status === 'success') {
        this._addMessage('bot', data.reply);
      } else {
        throw new Error(data.message || "เซิร์ฟเวอร์แจ้งข้อผิดพลาด");
      }

    } catch (error) {
      console.error("Chatbot Error:", error);
      this._removeTyping(typingId);
      this._addMessage('bot', "❌ Error: " + error.message);
    }
  },

  _addMessage(role, text) {
    const container = document.getElementById('chat-messages-container');
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerText = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  _addTyping() {
    const container = document.getElementById('chat-messages-container');
    const div = document.createElement('div');
    div.className = 'typing';
    div.id = 'typing-' + Date.now();
    div.innerText = 'AI กำลังคิด...';
    container.appendChild(div);
    return div.id;
  },

  _removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
};

window.addEventListener('load', () => {
  setTimeout(() => Chatbot.init(), 1000);
});
