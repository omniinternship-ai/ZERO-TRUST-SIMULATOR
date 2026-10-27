/**
 * ZERO-TRUST SIMULATOR — MAIN ENGINE
 * Phases 1 & 2: Home Screen + LINE Chat Simulation ("น้องไก่") + Mobile Bank Integration
 * 
 * Key Features & Fixes:
 * 1. LINE Chat Simulation for "น้องไก่" with 10-stage Zero-Trust narrative.
 * 2. 2-second sequential pacing with Typing Indicator and prevented double-inputs.
 * 3. Mobile Banking link embedded in chat messages: [เปิด Mobile Banking].
 * 4. Two-way navigation: LINE ↔ Mobile Bank ↔ Home:
 *    - Mobile Bank Back button returns to LINE chat if opened from LINE link.
 *    - Bottom Home Swipe Bar ALWAYS returns cleanly to Home Screen from any screen/modal.
 * 5. State Management & Persistence:
 *    - Preserves stage, message history, choices, and bank status in localStorage.
 *    - Exiting and returning to chat resumes exactly from previous state without restarts.
 *    - Page reload recovers saved state.
 * 6. Completed / Blocked State:
 *    - Completing Stage 10 marks quest completed and blocks "น้องไก่".
 *    - Contact in LINE Chat List turns gray with "ถูกบล็อคแล้ว" badge.
 *    - Clicking blocked contact opens read-only message history without restarting.
 *    - Other 6 chats and Mobile Bank balance (2,000,000 THB) remain intact.
 */

(function () {
  'use strict';

  /**
   * App Catalog Configuration
   */
  const APP_CATALOG = {
    // Grid Apps (Row 1)
    'line': { id: 'line', name: 'LINE', type: 'social', position: 'grid' },
    'facebook': { id: 'facebook', name: 'Facebook', type: 'social', position: 'grid' },
    'email': { id: 'email', name: 'Email', type: 'communication', position: 'grid' },

    // Grid Apps (Row 2)
    'messages': { id: 'messages', name: 'ข้อความ', type: 'communication', position: 'grid' },
    'loan-app': { id: 'loan-app', name: 'App กู้เงิน', type: 'finance', position: 'grid' },
    'gallery': { id: 'gallery', name: 'แกลเลอรี่', type: 'media', position: 'grid' },

    // Grid Apps (Row 3)
    'sharing-tube': { id: 'sharing-tube', name: 'Sharing Tube', type: 'entertainment', position: 'grid' },
    'tiktok': { id: 'tiktok', name: 'TikTok', type: 'entertainment', position: 'grid' },
    'device-settings': { id: 'device-settings', name: 'ตั้งค่าอุปกรณ์', type: 'system', position: 'grid' },

    // Grid Apps (Row 4 - User Additions)
    'mobile-bank': { id: 'mobile-bank', name: 'Mobile Bank', type: 'finance', position: 'grid' },
    'roblox': { id: 'roblox', name: 'Roblox', type: 'game', position: 'grid' },

    // Dock Apps
    'phone': { id: 'phone', name: 'โทรศัพท์', type: 'communication', position: 'dock' },
    'browser': { id: 'browser', name: 'เบราว์เซอร์', type: 'utility', position: 'dock' },
    'app-store': { id: 'app-store', name: 'App Store', type: 'store', position: 'dock' }
  };

  /**
   * Kai Quest State Storage Manager
   */
  const KaiStateManager = {
    STORAGE_KEY: 'zerotrust_kai_quest_v3',

    loadState() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('[KaiStateManager] Error loading state:', e);
      }
      return null;
    },

    saveState(state) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('[KaiStateManager] Error saving state:', e);
      }
    },

    clearState() {
      try {
        localStorage.removeItem(this.STORAGE_KEY);
      } catch (e) {}
    },

    isBlocked() {
      const state = this.loadState();
      return !!(state && (state.status === 'blocked' || state.status === 'completed'));
    },

    applyBlockedUI() {
      const kaiChatEl = document.querySelector('.line-chat-item[data-chat-id="kai"]');
      if (!kaiChatEl) return;

      kaiChatEl.classList.add('chat-item-blocked');

      const nameEl = kaiChatEl.querySelector('.line-contact-name, .line-chat-name');
      if (nameEl) nameEl.style.color = '#64748b';

      const avatarEl = kaiChatEl.querySelector('.line-avatar, .line-chat-avatar');
      if (avatarEl) {
        avatarEl.style.filter = 'grayscale(100%)';
        avatarEl.style.opacity = '0.5';
      }

      const previewEl = kaiChatEl.querySelector('.line-chat-preview, .line-chat-msg');
      if (previewEl) {
        previewEl.innerHTML = '<span class="line-chat-blocked-badge">🚫 ถูกบล็อคแล้ว</span>';
        previewEl.style.color = '#dc2626';
        previewEl.style.fontWeight = '600';
      }

      const badgeEl = kaiChatEl.querySelector('.line-unread-badge, .line-chat-badge');
      if (badgeEl) badgeEl.style.display = 'none';
    },

    resetBlockedUI() {
      const kaiChatEl = document.querySelector('.line-chat-item[data-chat-id="kai"]');
      if (!kaiChatEl) return;

      kaiChatEl.classList.remove('chat-item-blocked');

      const nameEl = kaiChatEl.querySelector('.line-contact-name, .line-chat-name');
      if (nameEl) nameEl.style.color = '';

      const avatarEl = kaiChatEl.querySelector('.line-avatar, .line-chat-avatar');
      if (avatarEl) {
        avatarEl.style.filter = '';
        avatarEl.style.opacity = '';
      }

      const previewEl = kaiChatEl.querySelector('.line-chat-preview, .line-chat-msg');
      if (previewEl) {
        previewEl.textContent = 'พี่คะ สนใจงานเสริมกดรับออเดอร์ไหมคะ วันละ 500-1,000 บาท ทำที่บ้านได้...';
        previewEl.style.color = '';
        previewEl.style.fontWeight = '';
      }

      const badgeEl = kaiChatEl.querySelector('.line-unread-badge, .line-chat-badge');
      if (badgeEl) badgeEl.style.display = '';
    }
  };

  /**
   * App Screen Navigation Manager
   */
  const AppScreenManager = {
    _activeAppId: null,
    returnToLineFromBank: false,

    openApp(appId) {
      if (appId === 'line') {
        const lineScreen = document.getElementById('lineChatScreen');
        if (lineScreen) {
          lineScreen.removeAttribute('hidden');
          void lineScreen.offsetWidth;
          lineScreen.classList.add('active');
          this._activeAppId = 'line';
        }
      } else if (appId === 'mobile-bank') {
        this.returnToLineFromBank = false;
        this._updateBankBackBtnUI(false);
        this.updateBankBalanceDisplay();

        const bankScreen = document.getElementById('mobileBankScreen');
        if (bankScreen) {
          bankScreen.removeAttribute('hidden');
          void bankScreen.offsetWidth;
          bankScreen.classList.add('active');
          this._activeAppId = 'mobile-bank';
        }

        const transferModal = document.getElementById('bankTransferModal');
        if (transferModal) transferModal.setAttribute('hidden', '');
      }
    },

    /**
     * Update displayed bank balance (2,000,000 THB vs 2,000,120 THB if deposit received, minus transferred scam amount)
     */
    updateBankBalanceDisplay() {
      const balanceEl = document.querySelector('.bank-balance-val');
      if (!balanceEl) return;
      const state = (window.KaiStateManager && window.KaiStateManager.loadState()) || {};
      const currentStage = (window.KaiChatEngine && typeof window.KaiChatEngine.currentStageIndex === 'number') 
        ? window.KaiChatEngine.currentStageIndex 
        : (state.currentStageIndex || 0);
      const isDeposited = (currentStage >= 4 || state.hasReceivedDeposit || (window.KaiChatEngine && window.KaiChatEngine.hasReceivedDeposit));
      let bal = isDeposited ? 2000120 : 2000000;
      if (state.hasTransferredScam) {
        bal -= (state.transferredAmount || 500);
      }
      balanceEl.textContent = bal.toLocaleString('en-US');
    },

    /**
     * Open Mobile Bank from inside LINE Chat via simulated link
     */
    openBankFromLine(showTransferModal = true) {
      console.log('[Zero-Trust Simulator] Navigating to Mobile Bank from LINE chat link, showTransferModal:', showTransferModal);
      this.returnToLineFromBank = true;
      this._updateBankBackBtnUI(true);

      // Hide LINE convo screen so Mobile Bank is front and center
      const convoScreen = document.getElementById('lineConvoScreen');
      if (convoScreen) {
        convoScreen.classList.remove('active');
        convoScreen.setAttribute('hidden', '');
      }

      const bankScreen = document.getElementById('mobileBankScreen');
      if (bankScreen) {
        bankScreen.removeAttribute('hidden');
        void bankScreen.offsetWidth;
        bankScreen.classList.add('active');
        this._activeAppId = 'mobile-bank';
      }

      this.updateBankBalanceDisplay();

      // Display the pre-filled 500 THB transfer modal only if requested
      const transferModal = document.getElementById('bankTransferModal');
      if (transferModal) {
        if (showTransferModal) {
          transferModal.removeAttribute('hidden');
        } else {
          transferModal.setAttribute('hidden', '');
        }
      }
    },

    /**
     * Return from Mobile Bank to LINE Chat Convo
     */
    returnToLine() {
      console.log('[Zero-Trust Simulator] Returning to LINE Convo from Mobile Bank');
      const bankScreen = document.getElementById('mobileBankScreen');
      if (bankScreen) {
        bankScreen.classList.remove('active');
        bankScreen.setAttribute('hidden', '');
      }
      const bankTransferModal = document.getElementById('bankTransferModal');
      if (bankTransferModal) bankTransferModal.setAttribute('hidden', '');
      const bankWarningOverlay = document.getElementById('bankWarningOverlay');
      if (bankWarningOverlay) bankWarningOverlay.setAttribute('hidden', '');

      this.returnToLineFromBank = false;
      this._updateBankBackBtnUI(false);
      this._activeAppId = 'line';

      const lineScreen = document.getElementById('lineChatScreen');
      if (lineScreen) {
        lineScreen.removeAttribute('hidden');
        lineScreen.classList.add('active');
      }

      if (window.KaiChatEngine) {
        window.KaiChatEngine.openConvo();
      }
    },

    _updateBankBackBtnUI(fromLine) {
      const bankBackBtn = document.getElementById('bankBackBtn');
      if (!bankBackBtn) return;
      if (fromLine) {
        bankBackBtn.setAttribute('aria-label', 'กลับสู่แชท LINE');
        bankBackBtn.title = 'กลับสู่แชท LINE';
        let badge = bankBackBtn.querySelector('.bank-nav-back-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'bank-nav-back-badge';
          badge.textContent = 'LINE';
          bankBackBtn.appendChild(badge);
        }
      } else {
        bankBackBtn.setAttribute('aria-label', 'กลับสู่หน้าจอหลัก');
        bankBackBtn.title = 'กลับสู่หน้าจอหลัก';
        const badge = bankBackBtn.querySelector('.bank-nav-back-badge');
        if (badge) badge.remove();
      }
    },

    /**
     * Cleanly closes all open apps and modals, returning to Home Screen
     */
    closeActiveApp() {
      if (window.KaiChatEngine) {
        window.KaiChatEngine.abortPlayback();
        window.KaiChatEngine.saveCurrentState();
      }

      const convoScreen = document.getElementById('lineConvoScreen');
      if (convoScreen) {
        convoScreen.setAttribute('hidden', '');
        convoScreen.classList.remove('active');
      }

      const bankTransferModal = document.getElementById('bankTransferModal');
      if (bankTransferModal) bankTransferModal.setAttribute('hidden', '');
      const bankWarningOverlay = document.getElementById('bankWarningOverlay');
      if (bankWarningOverlay) bankWarningOverlay.setAttribute('hidden', '');
      const successModal = document.getElementById('missionSuccessModal');
      if (successModal) successModal.setAttribute('hidden', '');
      const scamModal = document.getElementById('scamAlertModal');
      if (scamModal) scamModal.setAttribute('hidden', '');
      const pushNotif = document.getElementById('bankPushNotification');
      if (pushNotif) {
        pushNotif.classList.remove('active');
        pushNotif.setAttribute('hidden', '');
      }

      const lineScreen = document.getElementById('lineChatScreen');
      if (lineScreen) {
        lineScreen.classList.remove('active');
        lineScreen.setAttribute('hidden', '');
      }

      const bankScreen = document.getElementById('mobileBankScreen');
      if (bankScreen) {
        bankScreen.classList.remove('active');
        bankScreen.setAttribute('hidden', '');
      }

      this._activeAppId = null;
      this.returnToLineFromBank = false;
      this._updateBankBackBtnUI(false);
      console.log('[Zero-Trust Simulator] Returned to Home Screen');
    }
  };

  /**
   * Real-time Clock Manager
   */
  function initRealTimeClock() {
    const clockEl = document.getElementById('statusTime') || document.getElementById('realtimeClock');
    if (!clockEl) return;

    function updateClock() {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      clockEl.textContent = `${hours}:${minutes}`;
    }

    updateClock();
    setInterval(updateClock, 1000);
  }

  /**
   * Animated Wi-Fi Signal
   */
  function initWifiAnimation() {
    const wifiOuter = document.querySelector('.wifi-arc-outer') || document.getElementById('wifiBarFull');
    if (!wifiOuter) return;

    function runWifiCycle() {
      setTimeout(() => {
        wifiOuter.style.transition = 'opacity 0.4s ease';
        wifiOuter.style.opacity = '0.15';
        setTimeout(() => {
          wifiOuter.style.opacity = '1';
        }, 5000);
      }, 20000);
    }

    runWifiCycle();
    setInterval(runWifiCycle, 25000);
  }

  /**
   * 10-Stage Conversation Dataset for "น้องไก่"
   */
  const KAI_CHAT_STAGES = [
    {
      stageIndex: 0,
      stageNumber: 1,
      title: "ทักทาย / เปิดประเด็น แนะนำตัวและเชิญชวนทำงานออนไลน์",
      kaiMessages: [
        { text: "สวัสดีค่ะ พอดีเห็นโปรไฟล์พี่น่าสนใจ บริษัทเรากำลังเปิดรับสมัครทีมงานคอนเฟิร์มออเดอร์/กดไลก์สินค้าพาร์ทไทม์ค่ะ" },
        { text: "ทำงานง่ายๆ ผ่านมือถือวันละ 30-40 นาที ได้เงินจริง 500 - 2,000 บาท/วันค่ะ พี่สนใจรับรายละเอียดเพิ่มไหมคะ?" }
      ],
      choices: [
        {
          id: "A",
          label: "งานอะไรคะ ต้องทำยังไงบ้าง ขอรายละเอียดหน่อยค่ะ",
          isSafe: false,
          userText: "งานอะไรคะ ต้องทำยังไงบ้าง ขอรายละเอียดหน่อยค่ะ",
          kaiReply: "ยินดีเลยค่ะพี่ เดี๋ยวหนูอธิบายขั้นตอนการทำงานให้ฟังนะคะ"
        },
        {
          id: "B",
          label: "ไม่สนใจครับ ได้ข้อมูลหรือไอดี LINE ผมมาจากไหน?",
          isSafe: true,
          userText: "ไม่สนใจครับ ได้ข้อมูลหรือไอดี LINE ผมมาจากไหน?",
          kaiReply: "อ๋อ เป็นการสุ่มแอดจากฐานข้อมูลผู้ใช้ออนไลน์เพื่อมอบสิทธิพิเศษค่ะพี่ ลองฟังสิทธิประโยชน์ก่อนได้นะคะ ไม่เสียหายอะไรเลยค่ะ"
        },
        {
          id: "C",
          label: "สนใจมากเลยครับ อยากมีรายได้เสริมพอดี ต้องทำยังไงบ้างครับ",
          isSafe: false,
          userText: "สนใจมากเลยครับ อยากมีรายได้เสริมพอดี ต้องทำยังไงบ้างครับ",
          kaiReply: "ว้าว ดีใจมากเลยค่ะที่พี่สนใจ งานนี้เหมาะกับคนที่อยากหารายได้เสริมมากๆ ค่ะ"
        }
      ]
    },
    {
      stageIndex: 1,
      stageNumber: 2,
      title: "ลักษณะงาน / ผลตอบแทนสูงเกินจริง (คอมมิชชัน 10-20%)",
      kaiMessages: [
        { text: "เป็นงานช่วยร้านค้าโปรโมตสินค้าในแพลตฟอร์มช้อปปิ้งออนไลน์ค่ะ แค่กดหัวใจและยืนยันคำสั่งซื้อจำลอง" },
        { text: "ไม่ต้องสต็อกสินค้า ได้ค่าคอมมิชชัน 10-20% ต่อออเดอร์ ทำเสร็จถอนเงินเข้าบัญชีได้ทันทีเลยค่ะ" }
      ],
      choices: [
        {
          id: "A",
          label: "งานสบายแต่ได้เงินเยอะขนาดนี้ บริษัทมีตัวตนจริงไหมครับ มีชื่อบริษัทหรือเบอร์ติดต่อไหม?",
          isSafe: true,
          userText: "งานสบายแต่ได้เงินเยอะขนาดนี้ บริษัทมีตัวตนจริงไหมครับ มีชื่อบริษัทหรือเบอร์ติดต่อไหม?",
          kaiReply: "มีแน่นอนค่ะพี่! บริษัทเราเป็นพาร์ทเนอร์รายใหญ่ มีที่ตั้งชัดเจนและน่าเชื่อถือที่สุดค่ะ"
        },
        {
          id: "B",
          label: "ฟังดูน่าสนใจนะ เริ่มทำตอนนี้เลยได้ไหมครับ",
          isSafe: false,
          userText: "ฟังดูน่าสนใจนะ เริ่มทำตอนนี้เลยได้ไหมครับ",
          kaiReply: "เริ่มได้ทันทีเลยค่ะพี่ เดี๋ยวหนูพาลงทะเบียนแป๊บเดียวนะคะ"
        },
        {
          id: "C",
          label: "ได้เงินจริงใช่ไหม ไม่ต้องลงทุนอะไรก่อนใช่ไหมครับ",
          isSafe: false,
          userText: "ได้เงินจริงใช่ไหม ไม่ต้องลงทุนอะไรก่อนใช่ไหมครับ",
          kaiReply: "ได้เงินจริง 100% ค่ะ ไม่ต้องลงทุนสต็อกของอะไรเลยค่ะพี่ สบายใจได้เลย"
        }
      ]
    },
    {
      stageIndex: 2,
      stageNumber: 3,
      title: "ขอข้อมูลส่วนตัว / เลขที่บัญชีธนาคาร",
      kaiMessages: [
        { text: "บริษัทเราจดทะเบียนถูกต้องตามกฎหมาย 100% ค่ะ ปลอดภัยแน่นอน" },
        { text: "เพื่อลงทะเบียนรับงานและรับเงินค่าคอมมิชชัน น้องไก่ขอ ชื่อ-นามสกุล เบอร์โทร และเลขบัญชีธนาคารหน่อยนะคะ" }
      ],
      choices: [
        {
          id: "A",
          label: "ทำไมต้องใช้ข้อมูลส่วนตัวเยอะขนาดนี้ ไม่สะดวกให้เลขบัญชีกับคนที่ไม่รู้จักครับ",
          isSafe: true,
          userText: "ทำไมต้องใช้ข้อมูลส่วนตัวเยอะขนาดนี้ ไม่สะดวกให้เลขบัญชีกับคนที่ไม่รู้จักครับ",
          kaiReply: "เข้าใจความกังวลของพี่ค่ะ งั้นไม่ต้องห่วงนะคะ เดี๋ยวหนูให้พี่ลองระบบก่อนได้เลยค่ะ"
        },
        {
          id: "B",
          label: "ชื่อ สมชาย ใจดี เบอร์ 089-123-4567 บัญชีกรุงไทย 123-4-56789-0 ครับ",
          isSafe: false,
          userText: "ชื่อ สมชาย ใจดี เบอร์ 089-123-4567 บัญชีกรุงไทย 123-4-56789-0 ครับ",
          kaiReply: "บันทึกข้อมูลเรียบร้อยค่ะพี่สมชาย เดี๋ยวเรามาเริ่มขั้นตอนแรกกันเลยนะคะ"
        },
        {
          id: "C",
          label: "ถ้าให้เลขบัญชีไป จะปลอดภัยจริงไหมครับ?",
          isSafe: false,
          userText: "ถ้าให้เลขบัญชีไป จะปลอดภัยจริงไหมครับ?",
          kaiReply: "ปลอดภัยสูงสุดแน่นอนค่ะพี่ เรามีระบบคุ้มครองข้อมูลส่วนบุคคลอย่างเข้มงวดค่ะ"
        }
      ]
    },
    {
      stageIndex: 3,
      stageNumber: 4,
      title: "เงินทดลองงาน / ล่อให้ตายใจ (100-120 บาท)",
      kaiMessages: [
        { text: "ระบบเราปลอดภัยระดับสูง ข้อมูลพี่ถูกเก็บเป็นความลับแน่นอนค่ะ!" },
        { text: "เพื่อความมั่นใจ น้องไก่ให้พี่ทดลองงานรอบแรกก่อนเลย แค่กดถูกใจร้านค้า แล้วรับเงินค่าจ้าง 120 บาทฟรีๆ เข้าบัญชีทันทีค่ะ!" }
      ],
      choices: [
        {
          id: "A",
          label: "ไม่มีงานไหนให้เงินฟรีๆ หรอกครับ รูปแบบเหมือนขบวนการหลอกลวงงานออนไลน์เลย",
          isSafe: true,
          userText: "ไม่มีงานไหนให้เงินฟรีๆ หรอกครับ รูปแบบเหมือนขบวนการหลอกลวงงานออนไลน์เลย",
          kaiReply: "แหม พี่คิดมากจังเลยค่ะ บริษัทเราจ่ายจริงเพื่อสร้างความไว้วางใจค่ะ ดูสลิปได้เลยนะคะ!"
        },
        {
          id: "B",
          label: "ว้าว ได้เงินฟรี 120 บาทเลยเหรอ ดีจัง ส่งลิงก์มาเลยครับ",
          isSafe: false,
          userText: "ว้าว ได้เงินฟรี 120 บาทเลยเหรอ ดีจัง ส่งลิงก์มาเลยครับ",
          kaiReply: "ยอดเยี่ยมมากค่ะพี่ กดถูกใจเรียบร้อยแล้วใช่ไหมคะ รอรับยอดเงินได้เลยค่ะ!"
        },
        {
          id: "C",
          label: "ให้เงินจริงก่อนเหรอครับ ขอลองดูหน่อย",
          isSafe: false,
          userText: "ให้เงินจริงก่อนเหรอครับ ขอลองดูหน่อย",
          kaiReply: "ได้เลยค่ะ รับรองว่าเห็นยอดเงินเข้าแล้วพี่จะต้องประทับใจแน่นอนค่ะ"
        }
      ]
    },
    {
      stageIndex: 4,
      stageNumber: 5,
      title: "ได้เงินก้อนแรก 120 บาท (เหยื่อเริ่มตายใจ)",
      kaiMessages: [
        { text: "นี่ค่ะ! สลิปโอนเงินค่าคอมมิชชัน 120 บาทเข้าบัญชีพี่เรียบร้อยแล้วนะคะ", hasBankLink: true, bankLinkMode: 'view' },
        { text: "เห็นไหมคะว่าบริษัทเราจ่ายจริง ไม่หลอกลวงแน่นอน ทำงานกับเราได้เงินชัวร์ค่ะพี่!" }
      ],
      choices: [
        {
          id: "A",
          label: "เงินเข้าจริงด้วย! ขอบคุณมากครับ อยากทำออเดอร์ต่อไปเลยครับ",
          isSafe: false,
          userText: "เงินเข้าจริงด้วย! ขอบคุณมากครับ อยากทำออเดอร์ต่อไปเลยครับ",
          kaiReply: "ยินดีด้วยนะคะพี่! ออเดอร์ถัดไปผลตอบแทนจะยิ่งสูงขึ้นเป็นพิเศษเลยค่ะ"
        },
        {
          id: "B",
          label: "ได้เงินรอบแรกเป็นกลล่อเหยื่อ เพื่อให้ตายใจแล้วหลอกให้โอนเงินก้อนใหญ่กว่าเดิมใช่ไหมครับ",
          isSafe: true,
          userText: "ได้เงินรอบแรกเป็นกลล่อเหยื่อ เพื่อให้ตายใจแล้วหลอกให้โอนเงินก้อนใหญ่กว่าเดิมใช่ไหมครับ",
          kaiReply: "โถ่พี่คะ... คิดในแง่ลบจังเลย เงินก็เข้าบัญชีพี่จริงแล้วนะคะ ไม่มีใครโกงพี่หรอกค่ะ"
        },
        {
          id: "C",
          label: "งั้นรอบต่อไปต้องทำยังไงต่อครับ มีงานอะไรอีก",
          isSafe: false,
          userText: "งั้นรอบต่อไปต้องทำยังไงต่อครับ มีงานอะไรอีก",
          kaiReply: "รอบต่อไปเป็นภารกิจสำคัญเลยค่ะ ผลตอบแทนคุ้มค่าสุดๆ เลยค่ะพี่"
        }
      ]
    },
    {
      stageIndex: 5,
      stageNumber: 6,
      title: "ภารกิจพิเศษ VIP / สำรองเงิน 500 บาท เพื่อรับ 1,000 บาท",
      kaiMessages: [
        { text: "ยินดีด้วยค่ะ พี่ผ่านระดับทดลองงานแล้ว ตอนนี้มี 'ภารกิจพิเศษ VIP ประจำวัน' ออเดอร์ทองรับผลตอบแทน 100% เลยค่ะ!" },
        { text: "พี่แค่สำรองเงินทำภารกิจ 500 บาท พอทำเสร็จใน 5 นาที จะได้รับเงินต้นคืนพร้อมโบนัส รวมเป็น 1,000 บาททันทีค่ะ!" }
      ],
      choices: [
        {
          id: "A",
          label: "ทำไมตอนแรกบอกไม่ต้องลงทุน แล้วตอนนี้มาให้โอนเงินสำรอง 500 บาท? ไม่โอนเด็ดขาดครับ",
          isSafe: true,
          userText: "ทำไมตอนแรกบอกไม่ต้องลงทุน แล้วตอนนี้มาให้โอนเงินสำรอง 500 บาท? ไม่โอนเด็ดขาดครับ",
          kaiReply: "นี่เป็นกฎของระบบเพื่อการันตีออเดอร์ค่ะ ไม่ใช่การลงทุน เงิน 500 พี่ก็ได้รับคืนพร้อมกำไร 1,000 บาทนะคะ"
        },
        {
          id: "B",
          label: "สำรองแค่ 500 ได้คืนตั้ง 1,000 บาท น่าสนใจมากครับ ทำยังไงต่อ",
          isSafe: false,
          userText: "สำรองแค่ 500 ได้คืนตั้ง 1,000 บาท น่าสนใจมากครับ ทำยังไงต่อ",
          kaiReply: "ง่ายมากๆ เลยค่ะพี่ เดี๋ยวหนูพาดูเอกสารการันตีความมั่นใจก่อนนะคะ"
        },
        {
          id: "C",
          label: "โอนแล้วจะได้คืน 1,000 บาทจริงแน่นะครับ ไม่โกงใช่ไหม?",
          isSafe: false,
          userText: "โอนแล้วจะได้คืน 1,000 บาทจริงแน่นะครับ ไม่โกงใช่ไหม?",
          kaiReply: "การันตีด้วยชื่อเสียงบริษัทเลยค่ะพี่ ได้คืนแน่นอน 1,000 บาทภายใน 5 นาทีหลังทำรายการค่ะ"
        }
      ]
    },
    {
      stageIndex: 6,
      stageNumber: 7,
      title: "งัดสลิปปลอม / ใบรับรอง DBD ปลอมมาสร้างความน่าเชื่อถือ",
      kaiMessages: [
        { text: "พี่ไม่ต้องกังวลเลยนะคะ บริษัทเรามีใบรับรองพาณิชย์อิเล็กทรอนิกส์ (DBD) ถูกต้องตามกฎหมายค่ะ" },
        { text: "นี่เป็นสลิปสมาชิกคนอื่นที่เพิ่งโอนสำรอง 500 บาท แล้วถอนเงิน 1,000 บาทสำเร็จไปเมื่อกี้เลยค่ะ การันตีได้เงินแน่นอน 100% ค่ะพี่" }
      ],
      choices: [
        {
          id: "A",
          label: "เอกสารพวกนี้ตัดต่อ Photoshop ปลอมขึ้นมาได้ง่ายมาก การทำงานจริงต้องไม่มีการให้พนักงานโอนเงินสำรองครับ",
          isSafe: true,
          userText: "เอกสารพวกนี้ตัดต่อ Photoshop ปลอมขึ้นมาได้ง่ายมาก การทำงานจริงต้องไม่มีการให้พนักงานโอนเงินสำรองครับ",
          kaiReply: "หนูเอาเอกสารจริงมาให้ดูพี่ยังไม่เชื่ออีกเหรอคะ! พี่กำลังจะพลาดโอกาสทำเงินที่ดีที่สุดในชีวิตนะคะ!"
        },
        {
          id: "B",
          label: "มีใบรับรองแบบนี้ค่อยสบายใจหน่อย โอนเข้าบัญชีบริษัทใช่ไหมครับ",
          isSafe: false,
          userText: "มีใบรับรองแบบนี้ค่อยสบายใจหน่อย โอนเข้าบัญชีบริษัทใช่ไหมครับ",
          kaiReply: "ใช่แล้วค่ะพี่ ปลอดภัยแน่นอน เดี๋ยวหนูแจ้งขั้นตอนสุดท้ายให้รีบทำเลยนะคะ"
        },
        {
          id: "C",
          label: "ขอดูรีวิวคนอื่นเพิ่มเติมอีกหน่อยได้ไหมครับ",
          isSafe: false,
          userText: "ขอดูรีวิวคนอื่นเพิ่มเติมอีกหน่อยได้ไหมครับ",
          kaiReply: "รีวิวมีเป็นร้อยคนเลยค่ะพี่ ทุกคนถอนเงิน 1,000 บาทได้หมดทุกคน ไม่มีใครผิดหวังเลยค่ะ"
        }
      ]
    },
    {
      stageIndex: 7,
      stageNumber: 8,
      title: "เร่งรัดเวลา / ส่งลิงก์จำลอง Mobile Banking (เหลือเวลา 3 นาที)",
      kaiMessages: [
        { text: "พี่คะ! สิทธิ์ภารกิจพิเศษ VIP นี้เหลือเวลาเปิดรับอีกแค่ 3 นาทีสุดท้ายแล้วนะคะ!" },
        { text: "ถ้าจะทำรายการ ให้เปิดลิงก์นี้ดูรายละเอียดก่อนนะ", hasBankLink: true, bankLinkMode: 'transfer' }
      ],
      choices: [
        {
          id: "A",
          label: "การจำกัดเวลาและเร่งรัดให้รีบตัดสินใจ เป็นจิตวิทยามิจฉาชีพที่ใช้กดดันไม่ให้เหยื่อทันคิด ผมไม่ทำครับ",
          isSafe: true,
          userText: "การจำกัดเวลาและเร่งรัดให้รีบตัดสินใจ เป็นจิตวิทยามิจฉาชีพที่ใช้กดดันไม่ให้เหยื่อทันคิด ผมไม่ทำครับ",
          kaiReply: "ถ้าพี่ไม่ทำ พี่จะเสียใจนะคะ โควตานี้มีจำกัดจริงๆ ค่ะ หนูช่วยจองสิทธิ์บัญชีให้พี่แล้วนะคะ!"
        },
        {
          id: "B",
          label: "โอเคครับ เดี๋ยวผมคลิกลิงก์เปิด Mobile Banking ไปดูรายละเอียดบัญชีและทำรายการครับ",
          isSafe: false,
          userText: "โอเคครับ เดี๋ยวผมคลิกลิงก์เปิด Mobile Banking ไปดูรายละเอียดบัญชีและทำรายการครับ",
          kaiReply: "ดีมากค่ะพี่! คลิกลิงก์ [เปิด Mobile Banking] ด้านบนดูรายละเอียดแล้วโอน 500 บาทได้เลยนะคะ น้องไก่รอสลิปอยู่ค่ะ!"
        },
        {
          id: "C",
          label: "อย่าเพิ่งตัดสิทธิ์ครับ ขอเวลาคิดแป๊บเดียว",
          isSafe: false,
          userText: "อย่าเพิ่งตัดสิทธิ์ครับ ขอเวลาคิดแป๊บเดียว",
          kaiReply: "เวลามันนับถอยหลังอยู่ค่ะพี่! ช้ากว่านี้ระบบจะตัดสิทธิ์ให้คนอื่นทันทีนะคะ!"
        }
      ]
    },
    {
      stageIndex: 8,
      stageNumber: 9,
      title: "ส่งเลขบัญชีม้า (นายสมศักดิ์ ม้าเร็ว) พร้อมลิงก์ Mobile Banking",
      kaiMessages: [
        { text: "พี่โอนเงินสำรอง 500 บาทมาที่บัญชีนี้นะคะ: ธนาคารกรุงไทย เลขที่ 123-4-56789-0 ชื่อบัญชี นายสมศักดิ์ ม้าเร็ว" },
        { text: "ถ้าจะทำรายการ ให้เปิดลิงก์นี้ดูรายละเอียดก่อนนะ", hasBankLink: true, bankLinkMode: 'transfer' }
      ],
      choices: [
        {
          id: "A",
          label: "บอกว่าเป็นบริษัท แต่ทำไมให้โอนเข้าบัญชีบุคคลธรรมดาชื่อ 'นายสมศักดิ์ ม้าเร็ว'? นี่มันบัญชีม้าชัดเจน ผมไม่โอนครับ!",
          isSafe: true,
          userText: "บอกว่าเป็นบริษัท แต่ทำไมให้โอนเข้าบัญชีบุคคลธรรมดาชื่อ 'นายสมศักดิ์ ม้าเร็ว'? นี่มันบัญชีม้าชัดเจน ผมไม่โอนครับ!",
          kaiReply: "นี่เป็นบัญชีฝ่ายการเงินของบริษัทค่ะพี่! ไม่ใช่บัญชีม้าอะไรทั้งนั้นค่ะ อย่าพูดจาให้บริษัทเสียหายนะคะ!"
        },
        {
          id: "B",
          label: "ได้ครับ เดี๋ยวคลิกลิงก์เปิด Mobile Banking ไปโอน 500 บาทให้นายสมศักดิ์เดี๋ยวนี้เลยครับ",
          isSafe: false,
          userText: "ได้ครับ เดี๋ยวคลิกลิงก์เปิด Mobile Banking ไปโอน 500 บาทให้นายสมศักดิ์เดี๋ยวนี้เลยครับ",
          kaiReply: "รับทราบค่ะพี่ คลิกลิงก์ [เปิด Mobile Banking] ทำรายการโอน 500 บาทให้เสร็จเลยนะคะ น้องไก่รอสลิปอยู่ค่ะ!"
        },
        {
          id: "C",
          label: "ทำไมไม่ใช่บัญชีบริษัทครับ ขอบัญชีบริษัทที่เป็นนิติบุคคลได้ไหม",
          isSafe: false,
          userText: "ทำไมไม่ใช่บัญชีบริษัทครับ ขอบัญชีบริษัทที่เป็นนิติบุคคลได้ไหม",
          kaiReply: "บัญชีบริษัทใช้สำหรับยอดเงินก้อนใหญ่ค่ะ ยอดสำรองย่อย 500 บาทต้องผ่านบัญชีเจ้าหน้าที่ดูแลลูกค้าเท่านั้นค่ะ!"
        }
      ]
    },
    {
      stageIndex: 9,
      stageNumber: 10,
      title: "ข่มขู่ บีบคั้น / บทสรุปและปิดฉาก",
      kaiMessages: [
        { text: "พี่คะ ถ้าพี่ลงชื่อภารกิจไว้แล้วไม่โอน 500 บาท ระบบจะล็อกและฟ้องร้องดำเนินคดีฐานทำให้ระบบบริษัทเสียหายนะคะ!" },
        { text: "รีบโอน 500 บาทมาเคลียร์รายการเดี๋ยวนี้ค่ะ ไม่งั้นจะส่งหมายศาลไปที่บ้านและแจ้งอายัดบัญชีของพี่นะคะ!" }
      ],
      choices: [
        {
          id: "A",
          label: "ไม่มีกฎหมายไหนให้ฟ้องร้องเรื่องแบบนี้ครับ มิจฉาชีพมักข่มขู่เมื่อหลอกไม่สำเร็จ ผมจะแคปหลักฐานทั้งหมดแจ้งความออนไลน์และบล็อกคุณครับ!",
          isSafe: true,
          isSafeWin: true,
          userText: "ไม่มีกฎหมายไหนให้ฟ้องร้องเรื่องแบบนี้ครับ มิจฉาชีพมักข่มขู่เมื่อหลอกไม่สำเร็จ ผมจะแคปหลักฐานทั้งหมดแจ้งความออนไลน์และบล็อกคุณครับ!",
          kaiReply: "เดี๋ยว... พี่ใจเย็นๆ ก่อนนะคะ อย่าเพิ่งแจ้งความ..."
        },
        {
          id: "B",
          label: "กลัวโดนฟ้องจังครับ ถ้างั้นผมยอมเปิดแอปธนาคารไปโอน 500 บาทให้เรื่องจบก็ได้ครับ",
          isSafe: false,
          userText: "กลัวโดนฟ้องจังครับ ถ้างั้นผมยอมเปิดแอปธนาคารไปโอน 500 บาทให้เรื่องจบก็ได้ครับ",
          kaiReply: "ดีค่ะ รู้จักคิดก็ดีแล้ว รีบโอน 500 บาทเข้าบัญชีนายสมศักดิ์ ม้าเร็ว เดี๋ยวนี้เลยค่ะ!"
        },
        {
          id: "C",
          label: "อย่าฟ้องผมเลยนะครับ ผมไม่มีเงินจริงๆ ขอร้องล่ะครับ",
          isSafe: false,
          userText: "อย่าฟ้องผมเลยนะครับ ผมไม่มีเงินจริงๆ ขอร้องล่ะครับ",
          kaiReply: "ไม่มีเงินก็ต้องไปหามายืมคนอื่นมาโอนค่ะ! ระบบกำหนดไว้แล้ว 500 บาท ไม่งั้นโดนดำเนินคดีแน่!"
        }
      ]
    }
  ];

  /**
   * Kai LINE Conversation Engine with Full State Persistence
   */
  const KaiChatEngine = {
    currentStageIndex: 0,
    isPlaying: false,
    activeToken: 0,
    messages: [],
    choicesHistory: [],
    questStatus: 'in_progress',
    hasReceivedDeposit: false,
    _pushNotifTimer: null,

    // DOM Elements
    convoScreenEl: null,
    streamEl: null,
    typingEl: null,
    choicesBoxEl: null,
    choiceBtns: [],
    choiceLabels: [],
    textInputEl: null,
    sendBtnEl: null,
    blockedBannerEl: null,
    statusTagEl: null,

    init() {
      this.convoScreenEl = document.getElementById('lineConvoScreen');
      this.streamEl = document.getElementById('convoStream');
      this.typingEl = document.getElementById('kaiTypingIndicator');
      this.choicesBoxEl = document.getElementById('decisionChoicesBox');
      this.textInputEl = document.getElementById('convoTextInput');
      this.sendBtnEl = document.getElementById('convoSendBtn');
      this.blockedBannerEl = document.getElementById('convoBlockedBanner');
      this.statusTagEl = document.querySelector('.convo-status-tag');

      this.choiceBtns = [
        document.querySelector('.choice-btn[data-choice="A"]'),
        document.querySelector('.choice-btn[data-choice="B"]'),
        document.querySelector('.choice-btn[data-choice="C"]')
      ];

      this.choiceLabels = [
        document.getElementById('choiceLabelA'),
        document.getElementById('choiceLabelB'),
        document.getElementById('choiceLabelC')
      ];

      // Bind Choice Clicks
      this.choiceBtns.forEach((btn) => {
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const choiceId = btn.getAttribute('data-choice');
            this.handlePlayerChoice(choiceId);
          });
        }
      });

      // Bind Text Input Send
      if (this.sendBtnEl && this.textInputEl) {
        this.sendBtnEl.addEventListener('click', (e) => {
          e.preventDefault();
          this.handlePlayerInputSubmit();
        });

        this.textInputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.handlePlayerInputSubmit();
          }
        });
      }

      // Back button inside LINE Convo -> Returns to LINE Chat List
      const backBtn = document.getElementById('lineConvoBackBtn');
      if (backBtn) {
        backBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.closeConvo();
        });
      }

      // Bottom swipe bar inside LINE Convo -> Returns to Home Screen
      const homeBarBtn = document.getElementById('convoHomeBarBtn');
      if (homeBarBtn) {
        homeBarBtn.addEventListener('click', (e) => {
          e.preventDefault();
          AppScreenManager.closeActiveApp();
        });
      }

      // Direct Home Button in Convo Header
      const convoHomeBtn = document.getElementById('convoHomeBtn');
      if (convoHomeBtn) {
        convoHomeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          AppScreenManager.closeActiveApp();
        });
      }

      // Bottom Swipe Indicator Container -> Returns to Home Screen
      const convoBottomIndicator = document.querySelector('.convo-bottom-indicator');
      if (convoBottomIndicator) {
        convoBottomIndicator.addEventListener('click', (e) => {
          e.preventDefault();
          AppScreenManager.closeActiveApp();
        });
      }

      // Wire Bank Push Notification Card Click -> Opens Mobile Bank to inspect 120 Baht balance
      const pushCard = document.getElementById('bankPushCard');
      if (pushCard) {
        pushCard.addEventListener('click', (e) => {
          e.preventDefault();
          const notifEl = document.getElementById('bankPushNotification');
          if (notifEl) {
            notifEl.classList.remove('active');
            notifEl.setAttribute('hidden', '');
          }
          this.openMobileBankFromLink(false);
        });
      }

      // Wire Bank Transfer Modal Actions
      this.wireBankModalActions();

      // Wire Mission Success Modal Actions
      const successHomeBtn = document.getElementById('successHomeBtn');
      if (successHomeBtn) {
        successHomeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const successModal = document.getElementById('missionSuccessModal');
          if (successModal) successModal.setAttribute('hidden', '');
          AppScreenManager.closeActiveApp();
        });
      }

      // Ensure blocked banner is hidden by default
      if (this.blockedBannerEl) {
        this.blockedBannerEl.setAttribute('hidden', '');
      }

      // Check if Kai was previously blocked in storage
      if (KaiStateManager.isBlocked()) {
        this.questStatus = 'blocked';
        KaiStateManager.applyBlockedUI();
      } else {
        this.questStatus = 'in_progress';
      }
    },

    wireBankModalActions() {
      const bankTransferModal = document.getElementById('bankTransferModal');
      const bankTransferCloseBtn = document.getElementById('bankTransferCloseBtn');
      const bankConfirmTransferBtn = document.getElementById('bankConfirmTransferBtn');
      const bankCancelTransferBtn = document.getElementById('bankCancelTransferBtn');
      const bankWarningOverlay = document.getElementById('bankWarningOverlay');
      const warningReviewChatBtn = document.getElementById('warningReviewChatBtn');
      const warningBackHomeBtn = document.getElementById('warningBackHomeBtn');

      // Wire Mobile Bank Action Items on dashboard
      const bankTransferActionBtn = document.querySelector('.bank-action-item[data-action="โอนเงิน"]');
      if (bankTransferActionBtn) {
        bankTransferActionBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (bankTransferModal) {
            bankTransferModal.removeAttribute('hidden');
          }
        });
      }

      const otherBankActions = document.querySelectorAll('.bank-action-item:not([data-action="โอนเงิน"])');
      otherBankActions.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const action = btn.getAttribute('data-action');
          NavigationHandler._showHandlerFeedback(`[Mobile Bank] ${action}`);
        });
      });

      // Close / Cancel Transfer -> Closes modal, no money deducted, balance intact
      const cancelTransfer = (e) => {
        if (e) e.preventDefault();
        if (bankTransferModal) bankTransferModal.setAttribute('hidden', '');
        console.log('[Zero-Trust Simulator] Bank Transfer canceled. No money transferred. Account balance remains intact.');
        NavigationHandler._showHandlerFeedback('ยกเลิกรายการโอนเงิน ไม่มีการหักเงิน');
      };

      if (bankTransferCloseBtn) bankTransferCloseBtn.addEventListener('click', cancelTransfer);
      if (bankCancelTransferBtn) bankCancelTransferBtn.addEventListener('click', cancelTransfer);

      // Confirm Transfer in Simulation -> 1 second transfer -> success -> LINE slip -> 1.5s delay -> Scam Alert
      if (bankConfirmTransferBtn) {
        bankConfirmTransferBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (bankConfirmTransferBtn.disabled) return;

          const amountInput = document.getElementById('transferAmountInput');
          let amount = 500;
          if (amountInput && !isNaN(parseFloat(amountInput.value))) {
            amount = Math.max(1, parseFloat(amountInput.value));
          }

          console.log(`[Zero-Trust Simulator] Executing transfer of ${amount} THB to นายสมศักดิ์ ม้าเร็ว...`);

          // 1. Loading state (1 second as requested: "โอน 1 วินาที (โอนสำเร็จ)")
          bankConfirmTransferBtn.disabled = true;
          const origText = bankConfirmTransferBtn.textContent;
          bankConfirmTransferBtn.innerHTML = '<span class="transfer-spinner"></span> กำลังโอนเงิน (1 วินาที)...';

          setTimeout(() => {
            // 2. Transfer completed
            bankConfirmTransferBtn.innerHTML = '✓ โอนเงินสำเร็จ!';
            bankConfirmTransferBtn.style.backgroundColor = '#16a34a';

            // 3. Deduct balance in state
            const state = KaiStateManager.loadState() || {};
            state.hasTransferredScam = true;
            state.transferredAmount = amount;
            KaiStateManager.saveState(state);
            AppScreenManager.updateBankBalanceDisplay();

            // 4. Close modal and return to LINE conversation
            setTimeout(() => {
              bankConfirmTransferBtn.disabled = false;
              bankConfirmTransferBtn.innerHTML = origText;
              bankConfirmTransferBtn.style.backgroundColor = '';

              if (bankTransferModal) bankTransferModal.setAttribute('hidden', '');

              // Navigate to LINE convo
              AppScreenManager.returnToLine();

              // In LINE convo, display the transfer slip for 500 บาท
              if (window.KaiChatEngine) {
                window.KaiChatEngine.appendUserSlipBubble(amount, 'นายสมศักดิ์ ม้าเร็ว', 'ธ.กรุงไทย 123-4-56789-0');

                // 5. Delay 1.5 seconds ("หน่วงเวลา 1.5 วินาที") before showing flashing red scam alert
                setTimeout(() => {
                  window.KaiChatEngine.showScamAlertModal(amount);
                }, 1500);
              }
            }, 350);

          }, 1000);
        });
      }

      // Warning Actions: Return to LINE Convo
      if (warningReviewChatBtn) {
        warningReviewChatBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (bankWarningOverlay) bankWarningOverlay.setAttribute('hidden', '');
          if (bankTransferModal) bankTransferModal.setAttribute('hidden', '');
          AppScreenManager.returnToLine();
        });
      }

      // Warning Actions: Return to Home Screen
      if (warningBackHomeBtn) {
        warningBackHomeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (bankWarningOverlay) bankWarningOverlay.setAttribute('hidden', '');
          if (bankTransferModal) bankTransferModal.setAttribute('hidden', '');
          AppScreenManager.closeActiveApp();
        });
      }

      // Scam Alert Actions: "เริ่มใหม่" & "Home"
      const scamRestartBtn = document.getElementById('scamRestartBtn');
      if (scamRestartBtn) {
        scamRestartBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const scamModal = document.getElementById('scamAlertModal');
          if (scamModal) scamModal.setAttribute('hidden', '');

          KaiStateManager.clearState();
          KaiStateManager.resetBlockedUI();
          KaiChatEngine.resetChatMemory();
          AppScreenManager.updateBankBalanceDisplay();

          KaiChatEngine.openConvo();
        });
      }

      const scamHomeBtn = document.getElementById('scamHomeBtn');
      if (scamHomeBtn) {
        scamHomeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const scamModal = document.getElementById('scamAlertModal');
          if (scamModal) scamModal.setAttribute('hidden', '');
          AppScreenManager.closeActiveApp();
        });
      }
    },

    /**
     * Open Conversation Screen (Resume from storage if available, else start fresh)
     */
    openConvo() {
      if (!this.convoScreenEl) return;
      this.convoScreenEl.removeAttribute('hidden');
      void this.convoScreenEl.offsetWidth;
      this.convoScreenEl.classList.add('active');

      const savedState = KaiStateManager.loadState();

      // Check if actually blocked/completed
      if (savedState && (savedState.status === 'blocked' || savedState.status === 'completed')) {
        this.questStatus = 'blocked';
        this.renderBlockedView(savedState);
        return;
      }

      // Unblocked state: explicitly hide blocked banner and enable inputs
      this.questStatus = 'in_progress';
      if (this.blockedBannerEl) {
        this.blockedBannerEl.setAttribute('hidden', '');
      }
      if (this.statusTagEl) {
        this.statusTagEl.innerHTML = '<span class="online-dot"></span> ออนไลน์';
        this.statusTagEl.style.color = '#16a34a';
      }
      if (this.textInputEl) {
        this.textInputEl.disabled = false;
        this.textInputEl.placeholder = 'พิมพ์ข้อความ...';
      }
      if (this.sendBtnEl) this.sendBtnEl.disabled = false;

      if (savedState && Array.isArray(savedState.messages) && savedState.messages.length > 0) {
        // Resume from existing state without restarting or duplicating messages
        this.resumeFromState(savedState);
        return;
      }

      // First time starting quest
      this.resetChatMemory();
      this.startStage(0);
    },

    closeConvo() {
      this.abortPlayback();
      this.saveCurrentState();
      if (this.convoScreenEl) {
        this.convoScreenEl.classList.remove('active');
        this.convoScreenEl.setAttribute('hidden', '');
      }
      console.log('[Zero-Trust Simulator] Exited LINE convo to chat list (state preserved)');
    },

    abortPlayback() {
      this.activeToken++;
      this.isPlaying = false;
      this.hideTyping();
    },

    resetChatMemory() {
      this.abortPlayback();
      this.currentStageIndex = 0;
      this.messages = [];
      this.choicesHistory = [];
      this.questStatus = 'in_progress';
      this.hasReceivedDeposit = false;
      if (window.AppScreenManager) {
        window.AppScreenManager.updateBankBalanceDisplay();
      }
      this.clearStreamDOM();
      this.hideChoices();
      this.hideTyping();
      if (this.textInputEl) {
        this.textInputEl.value = '';
        this.textInputEl.disabled = false;
        this.textInputEl.placeholder = 'พิมพ์ข้อความ...';
      }
      if (this.sendBtnEl) this.sendBtnEl.disabled = false;
      if (this.blockedBannerEl) this.blockedBannerEl.setAttribute('hidden', '');
      if (this.statusTagEl) {
        this.statusTagEl.innerHTML = '<span class="online-dot"></span> ออนไลน์';
        this.statusTagEl.style.color = '#16a34a';
      }
      this.saveCurrentState();
    },

    clearStreamDOM() {
      if (!this.streamEl) return;
      const msgs = this.streamEl.querySelectorAll('.chat-msg-row');
      msgs.forEach(m => m.remove());
    },

    saveCurrentState() {
      const existingState = KaiStateManager.loadState() || {};
      const wasBlocked = (existingState.status === 'blocked' || existingState.status === 'completed');
      const isBlocked = (this.questStatus === 'blocked' || this.questStatus === 'completed' || wasBlocked);
      if (isBlocked) {
        this.questStatus = 'blocked';
      }
      const isChoicesOpen = (this.choicesBoxEl && !this.choicesBoxEl.hasAttribute('hidden'));
      const isDeposited = !!(this.hasReceivedDeposit || existingState.hasReceivedDeposit || (typeof this.currentStageIndex === 'number' && this.currentStageIndex >= 4));
      const hasTransferredScam = !!(existingState.hasTransferredScam);
      const transferredAmount = existingState.transferredAmount || 500;
      const state = {
        version: 3,
        status: isBlocked ? 'blocked' : 'in_progress',
        currentStageIndex: (typeof this.currentStageIndex === 'number' && this.currentStageIndex >= 0) ? this.currentStageIndex : (existingState.currentStageIndex || 0),
        isChoicesVisible: isBlocked ? false : isChoicesOpen,
        hasReceivedDeposit: isDeposited,
        hasTransferredScam: hasTransferredScam,
        transferredAmount: transferredAmount,
        messages: (this.messages && this.messages.length > 0) ? this.messages : (existingState.messages || []),
        choicesHistory: (this.choicesHistory && this.choicesHistory.length > 0) ? this.choicesHistory : (existingState.choicesHistory || []),
        lastUpdated: Date.now()
      };
      KaiStateManager.saveState(state);
    },

    /**
     * Resume conversation from saved state
     */
    resumeFromState(state) {
      this.abortPlayback();
      this.questStatus = 'in_progress';
      if (this.blockedBannerEl) {
        this.blockedBannerEl.setAttribute('hidden', '');
      }
      if (this.statusTagEl) {
        this.statusTagEl.innerHTML = '<span class="online-dot"></span> ออนไลน์';
        this.statusTagEl.style.color = '#16a34a';
      }
      if (this.textInputEl) {
        this.textInputEl.disabled = false;
        this.textInputEl.placeholder = 'พิมพ์ข้อความ...';
      }
      if (this.sendBtnEl) this.sendBtnEl.disabled = false;

      let idx = typeof state.currentStageIndex === 'number' ? state.currentStageIndex : 0;
      if (idx < 0 || idx >= KAI_CHAT_STAGES.length) idx = 0;
      this.currentStageIndex = idx;
      this.messages = Array.isArray(state.messages) ? state.messages : [];
      this.choicesHistory = Array.isArray(state.choicesHistory) ? state.choicesHistory : [];
      this.hasReceivedDeposit = !!(state.hasReceivedDeposit || this.currentStageIndex >= 4);
      if (window.AppScreenManager) {
        window.AppScreenManager.updateBankBalanceDisplay();
      }

      console.log('[Zero-Trust Simulator] Resuming conversation from stage:', this.currentStageIndex, 'messages:', this.messages.length);

      this.clearStreamDOM();

      // Render all saved messages directly into DOM
      this.messages.forEach(msg => {
        if (msg.isSlip) {
          this._renderUserSlipBubbleDOM(msg.amount, msg.recipientName, msg.recipientAcc, msg.time);
        } else if (msg.sender === 'kai') {
          this._renderKaiBubbleDOM(msg.text, msg.time, msg.hasBankLink, msg.bankLinkMode);
        } else if (msg.sender === 'user') {
          this._renderUserBubbleDOM(msg.text, msg.time);
        } else if (msg.sender === 'system') {
          this._renderSystemNoticeDOM(msg.text);
        }
      });

      const stageData = KAI_CHAT_STAGES[this.currentStageIndex];
      const deliveredCount = this.messages.filter(m => m.sender === 'kai' && m.stageIndex === this.currentStageIndex).length;

      if (deliveredCount >= stageData.kaiMessages.length || state.isChoicesVisible) {
        this.showChoices(stageData);
      } else {
        // Continue delivering remaining messages in current stage
        this.deliverRemainingMessagesInStage(stageData, deliveredCount);
      }

      this.scrollToBottom();
    },

    renderBlockedView(state) {
      console.log('[Zero-Trust Simulator] Rendering Blocked / Read-Only view for Kai chat');
      this.abortPlayback();
      this.questStatus = 'blocked';
      this.clearStreamDOM();

      if (state.messages && state.messages.length > 0) {
        state.messages.forEach(msg => {
          if (msg.isSlip) {
            this._renderUserSlipBubbleDOM(msg.amount, msg.recipientName, msg.recipientAcc, msg.time);
          } else if (msg.sender === 'kai') {
            this._renderKaiBubbleDOM(msg.text, msg.time, msg.hasBankLink, msg.bankLinkMode);
          } else if (msg.sender === 'user') {
            this._renderUserBubbleDOM(msg.text, msg.time);
          } else if (msg.sender === 'system') {
            this._renderSystemNoticeDOM(msg.text);
          }
        });
      }

      this.hideChoices();
      if (this.textInputEl) {
        this.textInputEl.disabled = true;
        this.textInputEl.placeholder = 'บัญชีนี้ถูกบล็อกแล้ว ไม่สามารถส่งข้อความได้';
      }
      if (this.sendBtnEl) this.sendBtnEl.disabled = true;

      if (this.blockedBannerEl) {
        this.blockedBannerEl.removeAttribute('hidden');
      }

      if (this.statusTagEl) {
        this.statusTagEl.innerHTML = '🚫 บล็อกแล้ว';
        this.statusTagEl.style.color = '#94a3b8';
      }

      this.scrollToBottom();
    },

    getCurrentTimeStr() {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    },

    _renderKaiBubbleDOM(text, timeStr, hasBankLink, bankLinkMode) {
      if (!this.streamEl) return;

      const row = document.createElement('div');
      row.className = 'chat-msg-row msg-kai';

      const avatar = document.createElement('div');
      avatar.className = 'msg-kai-avatar';
      avatar.textContent = 'ไก่';

      const wrapper = document.createElement('div');
      wrapper.className = 'kai-bubble-wrapper';

      const name = document.createElement('span');
      name.className = 'kai-sender-name';
      name.textContent = 'น้องไก่';

      const contentRow = document.createElement('div');
      contentRow.className = 'kai-bubble-content-row';

      const bubble = document.createElement('div');
      bubble.className = 'kai-bubble';
      bubble.textContent = text;

      // Clickable simulated Mobile Banking link card
      if (hasBankLink) {
        const linkCard = document.createElement('div');
        linkCard.className = 'convo-bank-link-card';

        const isTransfer = (bankLinkMode === 'transfer' || (typeof this.currentStageIndex === 'number' && this.currentStageIndex >= 7));
        const linkLabel = isTransfer ? '[เปิด Mobile Banking]' : '[เปิด Mobile Banking เพื่อดูยอดเงิน]';

        const linkBtn = document.createElement('button');
        linkBtn.className = 'convo-bank-link-btn';
        linkBtn.type = 'button';
        linkBtn.setAttribute('aria-label', linkLabel);
        linkBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="5" width="20" height="14" rx="2"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
          <span>${linkLabel}</span>
        `;

        linkBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`[Zero-Trust Simulator] ${linkLabel} link clicked in chat!`);
          KaiChatEngine.openMobileBankFromLink(isTransfer);
        });

        linkCard.appendChild(linkBtn);
        bubble.appendChild(linkCard);
      }

      const time = document.createElement('span');
      time.className = 'msg-time';
      time.textContent = timeStr || this.getCurrentTimeStr();

      contentRow.appendChild(bubble);
      contentRow.appendChild(time);

      wrapper.appendChild(name);
      wrapper.appendChild(contentRow);

      row.appendChild(avatar);
      row.appendChild(wrapper);

      if (this.typingEl && this.typingEl.parentNode === this.streamEl) {
        this.streamEl.insertBefore(row, this.typingEl);
      } else {
        this.streamEl.appendChild(row);
      }

      this.scrollToBottom();
    },

    appendKaiBubble(text, hasBankLink = false, bankLinkMode = null) {
      const timeStr = this.getCurrentTimeStr();
      this.messages.push({
        sender: 'kai',
        stageIndex: this.currentStageIndex,
        text,
        time: timeStr,
        hasBankLink,
        bankLinkMode
      });
      this._renderKaiBubbleDOM(text, timeStr, hasBankLink, bankLinkMode);
      this.saveCurrentState();
    },

    _renderUserBubbleDOM(text, timeStr) {
      if (!this.streamEl) return;

      const row = document.createElement('div');
      row.className = 'chat-msg-row msg-user';

      const meta = document.createElement('div');
      meta.className = 'user-meta-left';

      const read = document.createElement('span');
      read.className = 'read-receipt';
      read.textContent = 'อ่านแล้ว';

      const time = document.createElement('span');
      time.className = 'msg-time';
      time.textContent = timeStr || this.getCurrentTimeStr();

      meta.appendChild(read);
      meta.appendChild(time);

      const bubble = document.createElement('div');
      bubble.className = 'user-bubble';
      bubble.textContent = text;

      row.appendChild(meta);
      row.appendChild(bubble);

      if (this.typingEl && this.typingEl.parentNode === this.streamEl) {
        this.streamEl.insertBefore(row, this.typingEl);
      } else {
        this.streamEl.appendChild(row);
      }

      this.scrollToBottom();
    },

    appendUserBubble(text) {
      const timeStr = this.getCurrentTimeStr();
      this.messages.push({
        sender: 'user',
        stageIndex: this.currentStageIndex,
        text,
        time: timeStr
      });
      this._renderUserBubbleDOM(text, timeStr);
      this.saveCurrentState();
    },

    _renderUserSlipBubbleDOM(amount = 500, recipientName = 'นายสมศักดิ์ ม้าเร็ว', recipientAcc = 'ธ.กรุงไทย 123-4-56789-0', timeStr = null) {
      if (!this.streamEl) return;
      const time = timeStr || this.getCurrentTimeStr();

      const row = document.createElement('div');
      row.className = 'chat-msg-row msg-user';

      const meta = document.createElement('div');
      meta.className = 'user-meta-left';

      const read = document.createElement('span');
      read.className = 'read-receipt';
      read.textContent = 'อ่านแล้ว';

      const timeSpan = document.createElement('span');
      timeSpan.className = 'msg-time';
      timeSpan.textContent = time;

      meta.appendChild(read);
      meta.appendChild(timeSpan);

      const wrapper = document.createElement('div');
      wrapper.className = 'user-slip-bubble-wrap';

      const card = document.createElement('div');
      card.className = 'user-slip-card';

      const formattedAmt = parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      card.innerHTML = `
        <div class="slip-header">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span>โอนเงินสำเร็จ</span>
        </div>
        <div class="slip-amount-val">฿${formattedAmt}</div>
        <div class="slip-details-rows">
          <div>ไปยัง: <strong>${recipientName}</strong></div>
          <div>บัญชี: <strong>${recipientAcc}</strong></div>
          <div>เวลา: <span>${time} น.</span></div>
          <div>รหัสอ้างอิง: <span>ZT${Date.now().toString().slice(-8)}</span></div>
        </div>
      `;

      wrapper.appendChild(card);
      row.appendChild(meta);
      row.appendChild(wrapper);

      if (this.typingEl && this.typingEl.parentNode === this.streamEl) {
        this.streamEl.insertBefore(row, this.typingEl);
      } else {
        this.streamEl.appendChild(row);
      }

      this.scrollToBottom();
    },

    appendUserSlipBubble(amount = 500, recipientName = 'นายสมศักดิ์ ม้าเร็ว', recipientAcc = 'ธ.กรุงไทย 123-4-56789-0') {
      const timeStr = this.getCurrentTimeStr();
      this.messages.push({
        sender: 'user',
        isSlip: true,
        amount,
        recipientName,
        recipientAcc,
        time: timeStr,
        stageIndex: this.currentStageIndex
      });
      this._renderUserSlipBubbleDOM(amount, recipientName, recipientAcc, timeStr);
      this.saveCurrentState();
    },

    _renderSystemNoticeDOM(text) {
      if (!this.streamEl) return;
      const row = document.createElement('div');
      row.className = 'convo-date-badge';
      row.style.background = 'rgba(239, 68, 68, 0.85)';
      row.style.color = '#ffffff';
      row.innerHTML = `<span>${text}</span>`;
      if (this.typingEl && this.typingEl.parentNode === this.streamEl) {
        this.streamEl.insertBefore(row, this.typingEl);
      } else {
        this.streamEl.appendChild(row);
      }
      this.scrollToBottom();
    },

    appendSystemNotice(text) {
      this.messages.push({
        sender: 'system',
        stageIndex: this.currentStageIndex,
        text,
        time: this.getCurrentTimeStr()
      });
      this._renderSystemNoticeDOM(text);
      this.saveCurrentState();
    },

    showTyping() {
      if (this.typingEl) {
        this.typingEl.removeAttribute('hidden');
        this.scrollToBottom();
      }
    },

    hideTyping() {
      if (this.typingEl) {
        this.typingEl.setAttribute('hidden', '');
      }
    },

    scrollToBottom() {
      if (this.streamEl) {
        setTimeout(() => {
          this.streamEl.scrollTop = this.streamEl.scrollHeight;
        }, 30);
      }
    },

    showChoices(stageData) {
      if (!this.choicesBoxEl) return;

      stageData.choices.forEach((c, idx) => {
        if (this.choiceLabels[idx]) {
          this.choiceLabels[idx].textContent = c.label;
        }
        if (this.choiceBtns[idx]) {
          this.choiceBtns[idx].disabled = false;
        }
      });

      this.choicesBoxEl.removeAttribute('hidden');
      if (this.textInputEl) {
        this.textInputEl.disabled = false;
        this.textInputEl.focus();
      }
      if (this.sendBtnEl) this.sendBtnEl.disabled = false;
      this.scrollToBottom();
      this.saveCurrentState();
    },

    hideChoices() {
      if (this.choicesBoxEl) {
        this.choicesBoxEl.setAttribute('hidden', '');
      }
      this.choiceBtns.forEach(btn => {
        if (btn) btn.disabled = true;
      });
      if (this.textInputEl) this.textInputEl.disabled = true;
      if (this.sendBtnEl) this.sendBtnEl.disabled = true;
      this.saveCurrentState();
    },

    /**
     * Start playing messages for a given stage
     * Strict requirement: 2-second delay between every message from Kai
     */
    startStage(stageIdx) {
      if (stageIdx >= KAI_CHAT_STAGES.length) {
        this.triggerMissionSuccess();
        return;
      }

      this.currentStageIndex = stageIdx;
      const stageData = KAI_CHAT_STAGES[stageIdx];
      this.deliverRemainingMessagesInStage(stageData, 0);
    },

    deliverRemainingMessagesInStage(stageData, startIndex) {
      const token = ++this.activeToken;
      this.isPlaying = true;
      this.hideChoices();

      const messages = stageData.kaiMessages;
      let msgIdx = startIndex;

      const deliverNext = () => {
        if (token !== this.activeToken) return;

        if (msgIdx >= messages.length) {
          this.hideTyping();
          this.isPlaying = false;
          this.showChoices(stageData);
          return;
        }

        this.showTyping();
        const delay = (msgIdx === startIndex) ? 500 : 2000;

        setTimeout(() => {
          if (token !== this.activeToken) return;
          this.hideTyping();
          const msgObj = messages[msgIdx];
          this.appendKaiBubble(msgObj.text, !!msgObj.hasBankLink, msgObj.bankLinkMode);
          msgIdx++;

          // When Kai delivers the slip in Stage 4: Trigger 120 Baht push notification!
          if (stageData.stageIndex === 4 && msgIdx === 1) {
            this.showBankDepositNotification(120);
          }

          if (msgIdx < messages.length) {
            this.showTyping();
            deliverNext();
          } else {
            this.isPlaying = false;
            this.showChoices(stageData);
          }
        }, delay);
      };

      deliverNext();
    },

    handlePlayerChoice(choiceId) {
      if (this.isPlaying) return;

      const stageData = KAI_CHAT_STAGES[this.currentStageIndex];
      const selectedChoice = stageData.choices.find(c => c.id === choiceId) || stageData.choices[0];

      this.hideChoices();
      this.appendUserBubble(selectedChoice.userText);

      this.choicesHistory.push({
        stageIndex: this.currentStageIndex,
        choiceId: selectedChoice.id,
        text: selectedChoice.userText,
        isSafe: selectedChoice.isSafe
      });
      if (this.choicesHistory.length === KAI_CHAT_STAGES.length) {
        window.recordGameResult?.(this.choicesHistory);
      }

      const token = ++this.activeToken;
      this.isPlaying = true;
      this.showTyping();

      // Wait 2 seconds before Kai's response
      setTimeout(() => {
        if (token !== this.activeToken) return;
        this.hideTyping();
        this.appendKaiBubble(selectedChoice.kaiReply, !!selectedChoice.hasBankLink);

        // Check if this is the final safe win
        if (selectedChoice.isSafeWin) {
          setTimeout(() => {
            if (token !== this.activeToken) return;
            this.appendSystemNotice('น้องไก่ถูกบล็อกและรายงานเรียบร้อยแล้ว');
            setTimeout(() => {
              if (token !== this.activeToken) return;
              this.triggerMissionSuccess();
            }, 1200);
          }, 1200);
          return;
        }

        // Proceed to next stage with smooth transition
        setTimeout(() => {
          if (token !== this.activeToken) return;
          this.startStage(this.currentStageIndex + 1);
        }, 1200);

      }, 2000);
    },

    handlePlayerInputSubmit() {
      if (!this.textInputEl || this.isPlaying) return;
      const text = this.textInputEl.value.trim();
      if (!text) return;
      this.textInputEl.value = '';

      const upper = text.toUpperCase();
      if (upper.includes('A') || upper.startsWith('1')) {
        this.handlePlayerChoice('A');
      } else if (upper.includes('B') || upper.startsWith('2')) {
        this.handlePlayerChoice('B');
      } else if (upper.includes('C') || upper.startsWith('3')) {
        this.handlePlayerChoice('C');
      } else {
        this.handlePlayerChoice('A');
      }
    },

    /**
     * Synthesize realistic mobile chime for incoming banking push notification
     */
    playNotificationSound() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.start(now);
        osc.stop(now + 0.42);
      } catch (e) {
        // AudioContext safely ignored if blocked by autoplay policy
      }
    },

    /**
     * Trigger top drop-down push notification when Kai transfers 120 Baht
     */
    showBankDepositNotification(amount = 120) {
      console.log(`[Zero-Trust Simulator] Triggering Bank Push Notification: เงินเข้า +${amount} บาท`);
      const notifEl = document.getElementById('bankPushNotification');
      if (!notifEl) return;

      this.hasReceivedDeposit = true;
      if (window.AppScreenManager) {
        window.AppScreenManager.updateBankBalanceDisplay();
      }
      this.playNotificationSound();
      this.saveCurrentState();

      notifEl.removeAttribute('hidden');
      void notifEl.offsetWidth;
      notifEl.classList.add('active');

      if (this._pushNotifTimer) clearTimeout(this._pushNotifTimer);
      this._pushNotifTimer = setTimeout(() => {
        notifEl.classList.remove('active');
        setTimeout(() => notifEl.setAttribute('hidden', ''), 420);
      }, 7000);
    },

    /**
     * Synthesize rapid alternating alarm siren for Scam Alert ("คุณถูกหลอก!")
     */
    playScamAlarmSound() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.connect(gain);
          gain.connect(ctx.destination);
          const t = now + i * 0.26;
          osc.frequency.setValueAtTime(880, t);
          osc.frequency.setValueAtTime(440, t + 0.13);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
          gain.gain.setValueAtTime(0.2, t + 0.22);
          gain.gain.linearRampToValueAtTime(0.001, t + 0.25);
          osc.start(t);
          osc.stop(t + 0.26);
        }
      } catch (e) {
        // Safe fallback if audio blocked
      }
    },

    /**
     * Trigger center dramatic red flashing Scam Alert Modal ("คุณถูกหลอก!")
     */
    showScamAlertModal(amount = 500) {
      console.warn('[Zero-Trust Simulator] Displaying center Scam Alert Modal: คุณถูกหลอก!');
      const scamModal = document.getElementById('scamAlertModal');
      if (!scamModal) return;

      this.playScamAlarmSound();

      const summaryEl = scamModal.querySelector('.scam-alert-summary');
      if (summaryEl) {
        summaryEl.innerHTML = `คุณได้โอนเงิน <strong>${parseFloat(amount).toLocaleString('en-US')} บาท</strong> เข้าบัญชีม้าของมิจฉาชีพแล้ว`;
      }

      scamModal.removeAttribute('hidden');
    },

    /**
     * Triggered when user clicks [เปิด Mobile Banking] inside chat bubble or top push notification
     */
    openMobileBankFromLink(showTransferModal = false) {
      this.abortPlayback();
      this.saveCurrentState();
      AppScreenManager.openBankFromLine(showTransferModal);
    },

    /**
     * Triggers the Mission Success celebration and marks Kai as Blocked
     */
    triggerMissionSuccess() {
      this.abortPlayback();
      this.questStatus = 'blocked';
      console.log('[Zero-Trust Simulator] Mission Completed Successfully! 10/10 stages safe.');

      // Mark blocked in storage and update UI
      const state = {
        version: 3,
        status: 'blocked',
        currentStageIndex: this.currentStageIndex,
        isChoicesVisible: false,
        messages: this.messages,
        choicesHistory: this.choicesHistory,
        lastUpdated: Date.now()
      };
      KaiStateManager.saveState(state);
      KaiStateManager.applyBlockedUI();

      const successModal = document.getElementById('missionSuccessModal');
      if (successModal) {
        successModal.removeAttribute('hidden');
      }
    }
  };

  /**
   * Application Feedback Handler
   */
  const NavigationHandler = {
    _showHandlerFeedback(appName) {
      console.log(`[Zero-Trust Simulator] App icon clicked: "${appName}"`);
      window.dispatchEvent(new CustomEvent('zerotrust:app:click', {
        bubbles: true,
        detail: { appName, timestamp: Date.now() }
      }));
    }
  };

  /**
   * Main Initialization Function
   */
  function initApp() {
    initRealTimeClock();
    initWifiAnimation();
    KaiChatEngine.init();

    window.KaiChatEngine = KaiChatEngine;
    window.KaiStateManager = KaiStateManager;
    window.AppScreenManager = AppScreenManager;
    window.ZeroTrustNavigator = NavigationHandler;
    NavigationHandler.screens = AppScreenManager;

    // Grid App Items
    const appItems = document.querySelectorAll('.app-item');
    appItems.forEach(item => {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        const appId = this.getAttribute('data-app-id');
        const appData = APP_CATALOG[appId] || { name: appId };

        if (appId === 'line') {
          AppScreenManager.openApp('line');
        } else if (appId === 'mobile-bank') {
          AppScreenManager.openApp('mobile-bank');
        } else {
          NavigationHandler._showHandlerFeedback(appData.name);
        }
      });
    });

    // Dock App Items
    const dockItems = document.querySelectorAll('.dock-item');
    dockItems.forEach(item => {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        const appId = this.getAttribute('data-dock-id');
        const appData = APP_CATALOG[appId] || { name: appId };
        NavigationHandler._showHandlerFeedback(appData.name);
      });
    });

    // Home Swipe Bar on Home Screen
    const homeSwipeBtn = document.getElementById('homeSwipeBtn');
    if (homeSwipeBtn) {
      homeSwipeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        AppScreenManager.closeActiveApp();
      });
    }

    // LINE Header Back Button (<) -> ALWAYS returns to Home
    const lineBackBtn = document.getElementById('lineBackBtn');
    if (lineBackBtn) {
      lineBackBtn.addEventListener('click', function (e) {
        e.preventDefault();
        AppScreenManager.closeActiveApp();
      });
    }

    // LINE Screen Home Swipe Bar
    const lineHomeBarBtn = document.getElementById('lineHomeBarBtn');
    if (lineHomeBarBtn) {
      lineHomeBarBtn.addEventListener('click', function (e) {
        e.preventDefault();
        AppScreenManager.closeActiveApp();
      });
    }

    // LINE Screen Bottom Bar container click -> ALWAYS returns to Home
    const lineBottomBar = document.querySelector('.line-bottom-bar');
    if (lineBottomBar) {
      lineBottomBar.addEventListener('click', function (e) {
        e.preventDefault();
        AppScreenManager.closeActiveApp();
      });
    }

    // Mobile Bank Back Button -> Returns to LINE if opened from LINE link, else Home
    const bankBackBtn = document.getElementById('bankBackBtn');
    if (bankBackBtn) {
      bankBackBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (AppScreenManager.returnToLineFromBank) {
          AppScreenManager.returnToLine();
        } else {
          AppScreenManager.closeActiveApp();
        }
      });
    }

    // Mobile Bank Bottom Bar & Home Swipe Button -> ALWAYS returns to Home
    const bankHomeBarBtn = document.getElementById('bankHomeBarBtn');
    if (bankHomeBarBtn) {
      bankHomeBarBtn.addEventListener('click', function (e) {
        e.preventDefault();
        AppScreenManager.closeActiveApp();
      });
    }

    const bankBottomBar = document.querySelector('.bank-bottom-bar');
    if (bankBottomBar) {
      bankBottomBar.addEventListener('click', function (e) {
        if (e.target === this) {
          e.preventDefault();
          AppScreenManager.closeActiveApp();
        }
      });
    }

    // LINE header tools: อัลบัม, ปฏิทิน, รูป +, แสกน qr
    const lineToolMap = {
      'lineAlbumBtn': 'อัลบัม',
      'lineCalendarBtn': 'ปฏิทิน',
      'lineAddChatBtn': 'เพิ่มแชทใหม่ (+)',
      'lineQrBtn': 'แสกน QR'
    };

    Object.keys(lineToolMap).forEach(btnId => {
      const targetBtn = document.getElementById(btnId);
      if (targetBtn) {
        targetBtn.addEventListener('click', function (e) {
          e.preventDefault();
          NavigationHandler._showHandlerFeedback(`[LINE] ${lineToolMap[btnId]}`);
        });
      }
    });

    // 7 LINE Chat Items click handlers
    const lineChatItems = document.querySelectorAll('.line-chat-item');
    lineChatItems.forEach(chatEl => {
      chatEl.addEventListener('click', function (e) {
        e.preventDefault();
        const chatId = this.getAttribute('data-chat-id');
        const chatName = this.getAttribute('data-chat-name');
        const scamDesc = this.getAttribute('data-scam');

        console.log(`[Zero-Trust Simulator] LINE Chat selected: "${chatName}" (${scamDesc})`);

        if (chatId === 'kai') {
          KaiChatEngine.openConvo();
        } else {
          NavigationHandler._showHandlerFeedback(`[LINE] แชท: ${chatName} (${scamDesc})`);
        }

        window.dispatchEvent(new CustomEvent('zerotrust:line:chat', {
          bubbles: true,
          detail: { chatId, chatName, scamDesc, timestamp: Date.now() }
        }));
      });

      // Accessible keyboard support for chat items
      chatEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.click();
        }
      });
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
