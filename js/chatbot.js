/**
 * KCIB ChatGPT Chatbot
 */

const Chatbot = {
  isOpen: false,
  messages: [],
  systemPrompt: '',

  init() {
    this._createUI();
    this._buildSystemPrompt();
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
            <span>KCIB AI Assistant (ChatGPT)</span>
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

  _buildSystemPrompt() {
    this.systemPrompt = "คุณคือผู้ช่วย AI ของระบบ KCIB (KMITL ChE Inventory & Booking) ภาควิชาวิศวกรรมเคมี สจล. ให้ข้อมูลสุภาพและเป็นกันเอง";
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
      const response = await this._callChatGPT(text);
      this._removeTyping(typingId);
      this._addMessage('bot', response);
    } catch (error) {
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
    div.innerText = 'ChatGPT กำลังคิด...';
    container.appendChild(div);
    return div.id;
  },

  _removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  },

  async _callChatGPT(userText) {
    const key = (typeof OPENAI_API_KEY !== 'undefined') ? OPENAI_API_KEY.trim() : "";
    if (!key || key.includes("sk-proj-")) {
        // Simple check: make sure it's not the placeholder or empty
        if (!key) throw new Error("ไม่พบ OpenAI API Key");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // หรือ "gpt-4o-mini"
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: userText }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return data.choices[0].message.content;
  }
};

window.addEventListener('load', () => {
  setTimeout(() => Chatbot.init(), 1000);
});
