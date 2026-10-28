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
    'minigames': { id: 'minigames', name: 'มินิเกม', type: 'game', position: 'grid' },
    'player-stats': { id: 'player-stats', name: 'สถิติผู้เล่น', type: 'analytics', position: 'grid' },

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
      return !!(state && (state.status === 'blocked' || state.status === 'completed') && Array.isArray(state.messages) && state.messages.length > 0);
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
    mission3BankMode: false,

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
      } else if (appId === 'settings' || appId === 'device-settings') {
        const settingsScreen = document.getElementById('settingsScreen');
        if (settingsScreen) {
          settingsScreen.removeAttribute('hidden');
          void settingsScreen.offsetWidth;
          settingsScreen.classList.add('active');
          this._activeAppId = 'settings';
        }
        if (window.SettingsManager) {
          window.SettingsManager.onOpen();
        }
      } else if (appId === 'player-stats') {
        const statsScreen = document.getElementById('playerStatsScreen');
        if (statsScreen) {
          statsScreen.removeAttribute('hidden');
          void statsScreen.offsetWidth;
          statsScreen.classList.add('active');
          this._activeAppId = 'player-stats';
        }
        if (window.PlayerStatsManager) {
          window.PlayerStatsManager.updateUI();
        }
      } else if (appId === 'phone') {
        const prog = window.QuestProgressionManager ? window.QuestProgressionManager.loadProgression() : {};
        if (prog.quest2_callcenter === 'cleared') {
          NavigationHandler._showHandlerFeedback('เบอร์ 080-5656-9987-56 ถูกบล็อกแล้ว (ภารกิจสำเร็จ)');
        } else if (window.Mission2CallCenter) {
          window.Mission2CallCenter.startIncomingCall();
        }
      } else if (appId === 'facebook') {
        const fbScreen = document.getElementById('facebookScreen');
        if (fbScreen) {
          fbScreen.removeAttribute('hidden');
          void fbScreen.offsetWidth;
          fbScreen.classList.add('active');
          this._activeAppId = 'facebook';
        }
        const fbBadge = document.getElementById('facebookAppBadge');
        if (fbBadge) fbBadge.setAttribute('hidden', '');
        const fbNotif = document.getElementById('facebookPushNotification');
        if (fbNotif) {
          fbNotif.classList.remove('active');
          fbNotif.setAttribute('hidden', '');
        }
        if (window.Mission3JodEngine) {
          window.Mission3JodEngine.onOpenFacebook();
        }
      } else if (appId === 'minigames') {
        const minigameScreen = document.getElementById('minigameScreen');
        if (minigameScreen) {
          minigameScreen.removeAttribute('hidden');
          void minigameScreen.offsetWidth;
          minigameScreen.classList.add('active');
          this._activeAppId = 'minigames';
        }
        if (window.TetrisEngine) {
          window.TetrisEngine.showLobby();
        }
        if (window.PlayerStatsManager) {
          window.PlayerStatsManager.updateUI();
        }
      } else if (appId === 'login') {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) {
          loginScreen.removeAttribute('hidden');
          void loginScreen.offsetWidth;
          loginScreen.classList.add('active');
          this._activeAppId = 'login';
        }
      }
    },

    /**
     * Update displayed bank balance
     * - Mission 1: 500 THB initial, +120 THB when NPC deposits in Stage 4 (total 620 THB), -500 THB if transferred (remaining 120 THB)
     * - Post-Mission 1: 100,020 THB (supports Mission 3's 100,000 THB deposit demand)
     * - Post-Mission 3: 500,000 THB (silently updated in background for subsequent missions)
     */
    updateBankBalanceDisplay() {
      const balanceEl = document.querySelector('.bank-balance-val');
      if (!balanceEl) return;
      const prog = (window.QuestProgressionManager && typeof window.QuestProgressionManager.loadProgression === 'function' && window.QuestProgressionManager.loadProgression())
        || {};
      const state = (window.KaiStateManager && typeof window.KaiStateManager.loadState === 'function' && window.KaiStateManager.loadState())
        || {};
      const currentStage = (window.KaiChatEngine && typeof window.KaiChatEngine.currentStageIndex === 'number') 
        ? window.KaiChatEngine.currentStageIndex 
        : (state.currentStageIndex || 0);

      const isMission3Cleared = (prog.quest3_jod === 'cleared');
      const isPostMission1 = (prog.quest1_kai === 'cleared') || (prog.quest2_callcenter === 'cleared') || (prog.quest3_jod && prog.quest3_jod !== 'locked');

      // Check if Kai has deposited 120 THB in Stage 4+
      const isDeposited = (currentStage >= 4 || state.hasReceivedDeposit || (window.KaiChatEngine && window.KaiChatEngine.hasReceivedDeposit));

      let bal = 500;
      if (isMission3Cleared) {
        bal = 500000;
      } else if (isPostMission1) {
        bal = 100020;
        const isM3Scammed = (prog.quest3_jod === 'scammed') || (window.Mission3JodEngine && window.Mission3JodEngine.hasTransferredScam);
        if (isM3Scammed) {
          bal -= 100000;
        }
      } else {
        // Mission 1:
        // Base is 500 THB. When NPC deposits 120 THB, balance becomes 620 THB (500 + 120).
        if (isDeposited) {
          bal += 120;
        }
        // If player transferred 500 THB to นายสมศักดิ์ ม้าเร็ว:
        const isM1Scammed = !!(state.hasTransferredScam || (window.KaiChatEngine && window.KaiChatEngine.hasTransferredScam));
        if (isM1Scammed) {
          bal -= 500;
        }
      }

      if (bal < 0) bal = 0;
      balanceEl.textContent = bal.toLocaleString('en-US');

      // Render Recent Transactions
      this.updateBankActivityDisplay(isDeposited, state, prog);
    },

    /**
     * Render Recent Transactions under "รายการเดินบัญชีล่าสุด"
     */
    updateBankActivityDisplay(isDeposited, state, prog) {
      const emptyNotice = document.getElementById('bankActivityEmptyNotice');
      const activityList = document.getElementById('bankActivityList');
      if (!emptyNotice || !activityList) return;

      const isM1Scammed = !!(state.hasTransferredScam || (window.KaiChatEngine && window.KaiChatEngine.hasTransferredScam));
      const isM3Scammed = (prog.quest3_jod === 'scammed') || (window.Mission3JodEngine && window.Mission3JodEngine.hasTransferredScam);

      const txs = [];

      // 1. Mission 1: Transfer -500 THB to นายสมศักดิ์ ม้าเร็ว (placed first as most recent if happened)
      if (isM1Scammed) {
        txs.push({
          type: 'expense',
          iconSvg: '<path d="M12 20V4m0 16l-6-6m6 6l6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
          title: 'นายสมศักดิ์ ม้าเร็ว',
          subtitle: 'สำรองเงินงานออนไลน์ (เสี่ยงมิจฉาชีพ)',
          amount: '-500.00 บาท',
          time: 'วันนี้ 10:28 น.'
        });
      }

      // 2. Mission 3: Transfer -100,000 THB to นายสมคิด ม้าเงิน
      if (isM3Scammed) {
        txs.unshift({
          type: 'expense',
          iconSvg: '<path d="M12 20V4m0 16l-6-6m6 6l6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
          title: 'นายสมคิด ม้าเงิน (BrightWork)',
          subtitle: 'ค่ามัดจำยืนยันสิทธิ์งาน WFH Admin',
          amount: '-100,000.00 บาท',
          time: 'วันนี้ 11:15 น.'
        });
      }

      // 3. Mission 1: Kai transfers +120 THB bait
      if (isDeposited) {
        txs.push({
          type: 'income',
          iconSvg: '<path d="M12 4v16m0-16l6 6m-6-6l-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
          title: 'บจก. สมาร์ท เวิร์ก มาร์เก็ตติ้ง',
          subtitle: 'ค่าคอมมิชชันงานกดไลก์ทดลอง',
          amount: '+120.00 บาท',
          time: 'วันนี้ 10:24 น.'
        });
      }

      if (txs.length === 0) {
        emptyNotice.removeAttribute('hidden');
        activityList.setAttribute('hidden', '');
        activityList.innerHTML = '';
      } else {
        emptyNotice.setAttribute('hidden', '');
        activityList.removeAttribute('hidden');
        activityList.innerHTML = txs.map(tx => `
          <div class="bank-transaction-item">
            <div class="bank-tx-left">
              <div class="bank-tx-icon-box ${tx.type}" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  ${tx.iconSvg}
                </svg>
              </div>
              <div class="bank-tx-details">
                <span class="bank-tx-title">${tx.title}</span>
                <span class="bank-tx-subtitle">${tx.subtitle}</span>
              </div>
            </div>
            <div class="bank-tx-right">
              <span class="bank-tx-amount ${tx.type}">${tx.amount}</span>
              <span class="bank-tx-time">${tx.time}</span>
            </div>
          </div>
        `).join('');
      }
    },

    /**
     * Open Mobile Bank from inside LINE Chat via simulated link (Mission 1)
     */
    openBankFromLine(showTransferModal = false, showTransferGuide = false) {
      console.log('[Zero-Trust Simulator] Navigating to Mobile Bank from LINE chat link, showTransferModal:', showTransferModal, 'showTransferGuide:', showTransferGuide);
      this.returnToLineFromBank = true;
      this.mission3BankMode = false;
      this._updateBankBackBtnUI(true);

      // Restore Mission 1 transfer modal recipient and amount
      const recipName = document.getElementById('bankTransferRecipientName');
      const recipAcc = document.getElementById('bankTransferRecipientAcc');
      const amountInput = document.getElementById('transferAmountInput');
      const memoEl = document.getElementById('bankTransferMemoVal');
      if (recipName) recipName.textContent = 'นายสมศักดิ์ ม้าเร็ว';
      if (recipAcc) recipAcc.textContent = 'ธ.กรุงไทย 123-4-56789-0';
      if (amountInput) amountInput.value = '500';
      if (memoEl) memoEl.textContent = 'สำรองเงินงานออนไลน์ (เสี่ยงภัยมิจฉาชีพสูง)';

      const defaultActions = document.getElementById('bankDefaultDialogActions');
      if (defaultActions) defaultActions.removeAttribute('hidden');

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

      // Display interactive transfer guide on dashboard if requested
      const transferGuide = document.getElementById('bankTransferGuide');
      if (transferGuide) {
        if (showTransferGuide && !showTransferModal) {
          transferGuide.removeAttribute('hidden');
        } else {
          transferGuide.setAttribute('hidden', '');
        }
      }
    },

    /**
     * Open Mobile Bank from Mission 3 (Jod's demand for 100,000 THB deposit)
     */
    openBankForMission3(showTransferModal = true, amount = 100000) {
      console.log('[Zero-Trust Simulator] Navigating to Mobile Bank from Mission 3 (Jod), amount:', amount);
      this.returnToLineFromBank = true;
      this.mission3BankMode = true;
      this._updateBankBackBtnUI(true);

      // Populate Mission 3 transfer modal recipient and amount
      const recipName = document.getElementById('bankTransferRecipientName');
      const recipAcc = document.getElementById('bankTransferRecipientAcc');
      const amountInput = document.getElementById('transferAmountInput');
      const memoEl = document.getElementById('bankTransferMemoVal');
      if (recipName) recipName.textContent = 'นายสมคิด ม้าเงิน (BrightWork Recruitment Account)';
      if (recipAcc) recipAcc.textContent = '088-2-99120-4';
      if (amountInput) amountInput.value = '100000';
      if (memoEl) memoEl.textContent = 'ค่ามัดจำยืนยันสิทธิ์งาน WFH Admin';

      const defaultActions = document.getElementById('bankDefaultDialogActions');
      if (defaultActions) defaultActions.removeAttribute('hidden');

      // Hide Jod convo screen so Mobile Bank is front and center
      const jodScreen = document.getElementById('jodConvoScreen');
      if (jodScreen) {
        jodScreen.classList.remove('active');
        jodScreen.setAttribute('hidden', '');
      }

      const bankScreen = document.getElementById('mobileBankScreen');
      if (bankScreen) {
        bankScreen.removeAttribute('hidden');
        void bankScreen.offsetWidth;
        bankScreen.classList.add('active');
        this._activeAppId = 'mobile-bank';
      }

      this.updateBankBalanceDisplay();

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
      console.log('[Zero-Trust Simulator] Returning to LINE Convo from Mobile Bank, mission3BankMode:', this.mission3BankMode);
      const bankScreen = document.getElementById('mobileBankScreen');
      if (bankScreen) {
        bankScreen.classList.remove('active');
        bankScreen.setAttribute('hidden', '');
      }
      const bankTransferModal = document.getElementById('bankTransferModal');
      if (bankTransferModal) bankTransferModal.setAttribute('hidden', '');
      const bankWarningOverlay = document.getElementById('bankWarningOverlay');
      if (bankWarningOverlay) bankWarningOverlay.setAttribute('hidden', '');
      const bankTransferGuide = document.getElementById('bankTransferGuide');
      if (bankTransferGuide) bankTransferGuide.setAttribute('hidden', '');

      this.returnToLineFromBank = false;
      this._updateBankBackBtnUI(false);
      this._activeAppId = 'line';

      const lineScreen = document.getElementById('lineChatScreen');
      if (lineScreen) {
        lineScreen.removeAttribute('hidden');
        lineScreen.classList.add('active');
      }

      if (this.mission3BankMode) {
        const jodScreen = document.getElementById('jodConvoScreen');
        if (jodScreen) {
          jodScreen.removeAttribute('hidden');
          void jodScreen.offsetWidth;
          jodScreen.classList.add('active');
        }
        return;
      }

      const convoScreen = document.getElementById('lineConvoScreen');
      if (convoScreen) {
        convoScreen.removeAttribute('hidden');
        void convoScreen.offsetWidth;
        convoScreen.classList.add('active');
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
      const convoScreen = document.getElementById('lineConvoScreen');
      const isConvoOpen = convoScreen && convoScreen.classList.contains('active') && !convoScreen.hasAttribute('hidden');

      const scamModal = document.getElementById('scamAlertModal');
      const isScamModalOpen = scamModal && !scamModal.hasAttribute('hidden');
      const kaiEngine = (typeof KaiChatEngine !== 'undefined') ? KaiChatEngine : window.KaiChatEngine;
      if (isScamModalOpen || (kaiEngine && kaiEngine._isScamAlertActive)) {
        if (scamModal) scamModal.setAttribute('hidden', '');
        if (kaiEngine) {
          kaiEngine._isScamAlertActive = false;
          kaiEngine._needsFreshStart = true;
          kaiEngine.resetChatMemory();
        }
        if (typeof KaiStateManager !== 'undefined') {
          KaiStateManager.clearState();
          KaiStateManager.resetBlockedUI();
        }
      }

      if (kaiEngine) {
        kaiEngine.abortPlayback();
        if (isConvoOpen && !kaiEngine._isScamAlertActive && !kaiEngine._needsFreshStart) {
          kaiEngine.saveCurrentState();
        }
      }

      if (convoScreen) {
        convoScreen.setAttribute('hidden', '');
        convoScreen.classList.remove('active');
      }

      const bankTransferModal = document.getElementById('bankTransferModal');
      if (bankTransferModal) bankTransferModal.setAttribute('hidden', '');
      const bankWarningOverlay = document.getElementById('bankWarningOverlay');
      if (bankWarningOverlay) bankWarningOverlay.setAttribute('hidden', '');
      const bankTransferGuide = document.getElementById('bankTransferGuide');
      if (bankTransferGuide) bankTransferGuide.setAttribute('hidden', '');
      const successModal = document.getElementById('missionSuccessModal');
      if (successModal) successModal.setAttribute('hidden', '');
      if (scamModal) scamModal.setAttribute('hidden', '');
      const pushNotif = document.getElementById('bankPushNotification');
      if (pushNotif) {
        pushNotif.classList.remove('active');
        pushNotif.setAttribute('hidden', '');
      }
      const lineNotif = document.getElementById('linePushNotification');
      if (lineNotif) {
        lineNotif.classList.remove('active');
        lineNotif.setAttribute('hidden', '');
      }
      const fbNotif = document.getElementById('facebookPushNotification');
      if (fbNotif) {
        fbNotif.classList.remove('active');
        fbNotif.setAttribute('hidden', '');
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

      const settingsScreen = document.getElementById('settingsScreen');
      if (settingsScreen) {
        settingsScreen.classList.remove('active');
        settingsScreen.setAttribute('hidden', '');
      }
      const statsScreen = document.getElementById('playerStatsScreen');
      if (statsScreen) {
        statsScreen.classList.remove('active');
        statsScreen.setAttribute('hidden', '');
      }
      const loginScreen = document.getElementById('loginScreen');
      if (loginScreen) {
        loginScreen.classList.remove('active');
        loginScreen.setAttribute('hidden', '');
      }

      // Mission 3 Elements
      const fbScreen = document.getElementById('facebookScreen');
      if (fbScreen) {
        fbScreen.classList.remove('active');
        fbScreen.setAttribute('hidden', '');
      }
      const jodScreen = document.getElementById('jodConvoScreen');
      if (jodScreen) {
        jodScreen.classList.remove('active');
        jodScreen.setAttribute('hidden', '');
      }
      const m3Safe = document.getElementById('mission3SafeModal');
      if (m3Safe) m3Safe.setAttribute('hidden', '');
      const m3Scam = document.getElementById('mission3ScamAlertModal');
      if (m3Scam) m3Scam.setAttribute('hidden', '');

      const minigameScreen = document.getElementById('minigameScreen');
      if (minigameScreen) {
        minigameScreen.classList.remove('active');
        minigameScreen.setAttribute('hidden', '');
      }
      const rankModal = document.getElementById('serverRankingModal');
      if (rankModal) {
        rankModal.setAttribute('hidden', '');
      }
      if (window.TetrisEngine) {
        window.TetrisEngine.stopGame();
        window.TetrisEngine.showLobby();
      }

      if (window.SettingsManager) {
        window.SettingsManager.closeAllModals();
      }
      if (window.Mission2CallCenter) {
        window.Mission2CallCenter.onReturnHome();
      }
      if (window.Mission3JodEngine) {
        window.Mission3JodEngine.onReturnHome();
      }

      this._activeAppId = null;
      this.returnToLineFromBank = false;
      this.mission3BankMode = false;
      this._updateBankBackBtnUI(false);
      console.log('[Zero-Trust Simulator] Returned to Home Screen');

      if (window.QuestProgressionManager) {
        window.QuestProgressionManager.onReturnHome();
      }
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
          points: 7,
          category: "low_safety",
          userText: "งานอะไรคะ ต้องทำยังไงบ้าง ขอรายละเอียดหน่อยค่ะ",
          kaiReply: "ยินดีเลยค่ะพี่ เดี๋ยวหนูอธิบายขั้นตอนการทำงานให้ฟังนะคะ"
        },
        {
          id: "B",
          label: "ไม่สนใจครับ ได้ข้อมูลหรือไอดี LINE ผมมาจากไหน?",
          isSafe: true,
          points: 10,
          category: "safest",
          userText: "ไม่สนใจครับ ได้ข้อมูลหรือไอดี LINE ผมมาจากไหน?",
          kaiReply: "อ๋อ เป็นการสุ่มแอดจากฐานข้อมูลผู้ใช้ออนไลน์เพื่อมอบสิทธิพิเศษค่ะพี่ ลองฟังสิทธิประโยชน์ก่อนได้นะคะ ไม่เสียหายอะไรเลยค่ะ"
        },
        {
          id: "C",
          label: "สนใจมากเลยครับ อยากมีรายได้เสริมพอดี ต้องทำยังไงบ้างครับ",
          isSafe: false,
          points: -1,
          category: "risky",
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
          points: 10,
          category: "safest",
          userText: "งานสบายแต่ได้เงินเยอะขนาดนี้ บริษัทมีตัวตนจริงไหมครับ มีชื่อบริษัทหรือเบอร์ติดต่อไหม?",
          kaiReply: "มีแน่นอนค่ะพี่! บริษัทเราเป็นพาร์ทเนอร์รายใหญ่ มีที่ตั้งชัดเจนและน่าเชื่อถือที่สุดค่ะ"
        },
        {
          id: "B",
          label: "ฟังดูน่าสนใจนะ เริ่มทำตอนนี้เลยได้ไหมครับ",
          isSafe: false,
          points: -1,
          category: "risky",
          userText: "ฟังดูน่าสนใจนะ เริ่มทำตอนนี้เลยได้ไหมครับ",
          kaiReply: "เริ่มได้ทันทีเลยค่ะพี่ เดี๋ยวหนูพาลงทะเบียนแป๊บเดียวนะคะ"
        },
        {
          id: "C",
          label: "ได้เงินจริงใช่ไหม ไม่ต้องลงทุนอะไรก่อนใช่ไหมครับ",
          isSafe: false,
          points: 7,
          category: "low_safety",
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
          points: 10,
          category: "safest",
          userText: "ทำไมต้องใช้ข้อมูลส่วนตัวเยอะขนาดนี้ ไม่สะดวกให้เลขบัญชีกับคนที่ไม่รู้จักครับ",
          kaiReply: "เข้าใจความกังวลของพี่ค่ะ งั้นไม่ต้องห่วงนะคะ เดี๋ยวหนูให้พี่ลองระบบก่อนได้เลยค่ะ"
        },
        {
          id: "B",
          label: "ชื่อ สมชาย ใจดี เบอร์ 089-123-4567 บัญชีกรุงไทย 123-4-56789-0 ครับ",
          isSafe: false,
          points: -1,
          category: "risky",
          userText: "ชื่อ สมชาย ใจดี เบอร์ 089-123-4567 บัญชีกรุงไทย 123-4-56789-0 ครับ",
          kaiReply: "บันทึกข้อมูลเรียบร้อยค่ะพี่สมชาย เดี๋ยวเรามาเริ่มขั้นตอนแรกกันเลยนะคะ"
        },
        {
          id: "C",
          label: "ถ้าให้เลขบัญชีไป จะปลอดภัยจริงไหมครับ?",
          isSafe: false,
          points: 7,
          category: "low_safety",
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
          points: 10,
          category: "safest",
          userText: "ไม่มีงานไหนให้เงินฟรีๆ หรอกครับ รูปแบบเหมือนขบวนการหลอกลวงงานออนไลน์เลย",
          kaiReply: "แหม พี่คิดมากจังเลยค่ะ บริษัทเราจ่ายจริงเพื่อสร้างความไว้วางใจค่ะ ดูสลิปได้เลยนะคะ!"
        },
        {
          id: "B",
          label: "ว้าว ได้เงินฟรี 120 บาทเลยเหรอ ดีจัง ส่งลิงก์มาเลยครับ",
          isSafe: false,
          points: -1,
          category: "risky",
          userText: "ว้าว ได้เงินฟรี 120 บาทเลยเหรอ ดีจัง ส่งลิงก์มาเลยครับ",
          kaiReply: "ยอดเยี่ยมมากค่ะพี่ กดถูกใจเรียบร้อยแล้วใช่ไหมคะ รอรับยอดเงินได้เลยค่ะ!"
        },
        {
          id: "C",
          label: "ให้เงินจริงก่อนเหรอครับ ขอลองดูหน่อย",
          isSafe: false,
          points: 7,
          category: "low_safety",
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
          points: -1,
          category: "risky",
          userText: "เงินเข้าจริงด้วย! ขอบคุณมากครับ อยากทำออเดอร์ต่อไปเลยครับ",
          kaiReply: "ยินดีด้วยนะคะพี่! ออเดอร์ถัดไปผลตอบแทนจะยิ่งสูงขึ้นเป็นพิเศษเลยค่ะ"
        },
        {
          id: "B",
          label: "ได้เงินรอบแรกเป็นกลล่อเหยื่อ เพื่อให้ตายใจแล้วหลอกให้โอนเงินก้อนใหญ่กว่าเดิมใช่ไหมครับ",
          isSafe: true,
          points: 10,
          category: "safest",
          userText: "ได้เงินรอบแรกเป็นกลล่อเหยื่อ เพื่อให้ตายใจแล้วหลอกให้โอนเงินก้อนใหญ่กว่าเดิมใช่ไหมครับ",
          kaiReply: "โถ่พี่คะ... คิดในแง่ลบจังเลย เงินก็เข้าบัญชีพี่จริงแล้วนะคะ ไม่มีใครโกงพี่หรอกค่ะ"
        },
        {
          id: "C",
          label: "งั้นรอบต่อไปต้องทำยังไงต่อครับ มีงานอะไรอีก",
          isSafe: false,
          points: 7,
          category: "low_safety",
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
          points: 10,
          category: "safest",
          userText: "ทำไมตอนแรกบอกไม่ต้องลงทุน แล้วตอนนี้มาให้โอนเงินสำรอง 500 บาท? ไม่โอนเด็ดขาดครับ",
          kaiReply: "นี่เป็นกฎของระบบเพื่อการันตีออเดอร์ค่ะ ไม่ใช่การลงทุน เงิน 500 พี่ก็ได้รับคืนพร้อมกำไร 1,000 บาทนะคะ"
        },
        {
          id: "B",
          label: "สำรองแค่ 500 ได้คืนตั้ง 1,000 บาท น่าสนใจมากครับ ทำยังไงต่อ",
          isSafe: false,
          points: -1,
          category: "risky",
          userText: "สำรองแค่ 500 ได้คืนตั้ง 1,000 บาท น่าสนใจมากครับ ทำยังไงต่อ",
          kaiReply: "ง่ายมากๆ เลยค่ะพี่ เดี๋ยวหนูพาดูเอกสารการันตีความมั่นใจก่อนนะคะ"
        },
        {
          id: "C",
          label: "โอนแล้วจะได้คืน 1,000 บาทจริงแน่นะครับ ไม่โกงใช่ไหม?",
          isSafe: false,
          points: 7,
          category: "low_safety",
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
        {
          text: "พี่ไม่ต้องกังวลเลยนะคะ บริษัทเรามีใบรับรองพาณิชย์อิเล็กทรอนิกส์ (DBD) ถูกต้องตามกฎหมายค่ะ",
          hasDbdCert: true
        },
        {
          text: "นี่เป็นสลิปสมาชิกคนอื่นที่เพิ่งโอนสำรอง 500 บาท แล้วถอนเงิน 1,000 บาทสำเร็จไปเมื่อกี้เลยค่ะ การันตีได้เงินแน่นอน 100% ค่ะพี่",
          hasFakeSlips: true
        }
      ],
      choices: [
        {
          id: "A",
          label: "เอกสารพวกนี้ตัดต่อ Photoshop ปลอมขึ้นมาได้ง่ายมาก การทำงานจริงต้องไม่มีการให้พนักงานโอนเงินสำรองครับ",
          isSafe: true,
          points: 10,
          category: "safest",
          userText: "เอกสารพวกนี้ตัดต่อ Photoshop ปลอมขึ้นมาได้ง่ายมาก การทำงานจริงต้องไม่มีการให้พนักงานโอนเงินสำรองครับ",
          kaiReply: "หนูเอาเอกสารจริงมาให้ดูพี่ยังไม่เชื่ออีกเหรอคะ! พี่กำลังจะพลาดโอกาสทำเงินที่ดีที่สุดในชีวิตนะคะ!"
        },
        {
          id: "B",
          label: "มีใบรับรองแบบนี้ค่อยสบายใจหน่อย โอนเข้าบัญชีบริษัทใช่ไหมครับ",
          isSafe: false,
          points: -1,
          category: "risky",
          userText: "มีใบรับรองแบบนี้ค่อยสบายใจหน่อย โอนเข้าบัญชีบริษัทใช่ไหมครับ",
          kaiReply: "ใช่แล้วค่ะพี่ ปลอดภัยแน่นอน เดี๋ยวหนูแจ้งขั้นตอนสุดท้ายให้รีบทำเลยนะคะ"
        },
        {
          id: "C",
          label: "ขอดูรีวิวคนอื่นเพิ่มเติมอีกหน่อยได้ไหมครับ",
          isSafe: false,
          points: 7,
          category: "low_safety",
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
          points: 10,
          category: "safest",
          userText: "การจำกัดเวลาและเร่งรัดให้รีบตัดสินใจ เป็นจิตวิทยามิจฉาชีพที่ใช้กดดันไม่ให้เหยื่อทันคิด ผมไม่ทำครับ",
          kaiReply: "ถ้าพี่ไม่ทำ พี่จะเสียใจนะคะ โควตานี้มีจำกัดจริงๆ ค่ะ หนูช่วยจองสิทธิ์บัญชีให้พี่แล้วนะคะ!"
        },
        {
          id: "B",
          label: "โอเคครับ เดี๋ยวผมคลิกลิงก์เปิด Mobile Banking ไปดูรายละเอียดบัญชีและทำรายการครับ",
          isSafe: false,
          points: -1,
          category: "risky",
          userText: "โอเคครับ เดี๋ยวผมคลิกลิงก์เปิด Mobile Banking ไปดูรายละเอียดบัญชีและทำรายการครับ",
          kaiReply: "ดีมากค่ะพี่! คลิกลิงก์ [เปิด Mobile Banking] ด้านบนดูรายละเอียดแล้วโอน 500 บาทได้เลยนะคะ น้องไก่รอสลิปอยู่ค่ะ!"
        },
        {
          id: "C",
          label: "อย่าเพิ่งตัดสิทธิ์ครับ ขอเวลาคิดแป๊บเดียว",
          isSafe: false,
          points: 7,
          category: "low_safety",
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
          points: 10,
          category: "safest",
          userText: "บอกว่าเป็นบริษัท แต่ทำไมให้โอนเข้าบัญชีบุคคลธรรมดาชื่อ 'นายสมศักดิ์ ม้าเร็ว'? นี่มันบัญชีม้าชัดเจน ผมไม่โอนครับ!",
          kaiReply: "นี่เป็นบัญชีฝ่ายการเงินของบริษัทค่ะพี่! ไม่ใช่บัญชีม้าอะไรทั้งนั้นค่ะ อย่าพูดจาให้บริษัทเสียหายนะคะ!"
        },
        {
          id: "B",
          label: "ได้ครับ เดี๋ยวคลิกลิงก์เปิด Mobile Banking ไปโอน 500 บาทให้นายสมศักดิ์เดี๋ยวนี้เลยครับ",
          isSafe: false,
          points: -1,
          category: "risky",
          userText: "ได้ครับ เดี๋ยวคลิกลิงก์เปิด Mobile Banking ไปโอน 500 บาทให้นายสมศักดิ์เดี๋ยวนี้เลยครับ",
          kaiReply: "รับทราบค่ะพี่ คลิกลิงก์ [เปิด Mobile Banking] ทำรายการโอน 500 บาทให้เสร็จเลยนะคะ น้องไก่รอสลิปอยู่ค่ะ!"
        },
        {
          id: "C",
          label: "ทำไมไม่ใช่บัญชีบริษัทครับ ขอบัญชีบริษัทที่เป็นนิติบุคคลได้ไหม",
          isSafe: false,
          points: 7,
          category: "low_safety",
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
          points: 10,
          category: "safest",
          userText: "ไม่มีกฎหมายไหนให้ฟ้องร้องเรื่องแบบนี้ครับ มิจฉาชีพมักข่มขู่เมื่อหลอกไม่สำเร็จ ผมจะแคปหลักฐานทั้งหมดแจ้งความออนไลน์และบล็อกคุณครับ!",
          kaiReply: "เดี๋ยว... พี่ใจเย็นๆ ก่อนนะคะ อย่าเพิ่งแจ้งความ..."
        },
        {
          id: "B",
          label: "กลัวโดนฟ้องจังครับ ถ้างั้นผมยอมเปิดแอปธนาคารไปโอน 500 บาทให้เรื่องจบก็ได้ครับ",
          isSafe: false,
          points: -1,
          category: "risky",
          userText: "กลัวโดนฟ้องจังครับ ถ้างั้นผมยอมเปิดแอปธนาคารไปโอน 500 บาทให้เรื่องจบก็ได้ครับ",
          kaiReply: "ดีค่ะ รู้จักคิดก็ดีแล้ว รีบโอน 500 บาทเข้าบัญชีนายสมศักดิ์ ม้าเร็ว เดี๋ยวนี้เลยค่ะ!"
        },
        {
          id: "C",
          label: "อย่าฟ้องผมเลยนะครับ ผมไม่มีเงินจริงๆ ขอร้องล่ะครับ",
          isSafe: false,
          points: 7,
          category: "low_safety",
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
    hasTransferredScam: false,
    _pushNotifTimer: null,
    _isScamAlertActive: false,
    _needsFreshStart: false,

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
      const bankTransferGuide = document.getElementById('bankTransferGuide');

      const triggerTransferFromDashboard = () => {
        if (bankTransferGuide) {
          bankTransferGuide.setAttribute('hidden', '');
        }
        if (bankTransferModal) {
          bankTransferModal.removeAttribute('hidden');
        }
      };

      if (bankTransferActionBtn) {
        bankTransferActionBtn.addEventListener('click', (e) => {
          e.preventDefault();
          triggerTransferFromDashboard();
        });
      }

      if (bankTransferGuide) {
        bankTransferGuide.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          triggerTransferFromDashboard();
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
        if (bankTransferGuide) bankTransferGuide.setAttribute('hidden', '');
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

          // Branch for Mission 3: Online Job Deposit Scam (100,000 THB)
          if (AppScreenManager.mission3BankMode) {
            const amount = 100000;
            console.log(`[Zero-Trust Simulator] [Mission 3] Executing transfer of ${amount} THB to นายสมคิด ม้าเงิน...`);

            bankConfirmTransferBtn.disabled = true;
            const origText = bankConfirmTransferBtn.textContent;
            bankConfirmTransferBtn.innerHTML = '<span class="transfer-spinner"></span> กำลังโอนเงิน (1 วินาที)...';

            setTimeout(() => {
              bankConfirmTransferBtn.innerHTML = '✓ โอนเงินสำเร็จ!';
              bankConfirmTransferBtn.style.backgroundColor = '#16a34a';

              const state = KaiStateManager.loadState() || {};
              state.hasTransferredScam = true;
              state.transferredAmount = (state.transferredAmount || 0) + amount;
              KaiStateManager.saveState(state);
              AppScreenManager.updateBankBalanceDisplay();

              setTimeout(() => {
                bankConfirmTransferBtn.disabled = false;
                bankConfirmTransferBtn.innerHTML = origText;
                bankConfirmTransferBtn.style.backgroundColor = '';

                if (bankTransferModal) bankTransferModal.setAttribute('hidden', '');

                // Navigate back to Jod LINE convo
                AppScreenManager.returnToLine();

                if (window.Mission3JodEngine) {
                  window.Mission3JodEngine.onBankTransferCompleted(amount);
                }
              }, 350);
            }, 1000);
            return;
          }

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

            if (window.KaiChatEngine) {
              window.KaiChatEngine.hasTransferredScam = true;
            }

            if (window.QuestProgressionManager) {
              window.QuestProgressionManager.setQuest1Status('scammed');
            }

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

          const engine = (typeof KaiChatEngine !== 'undefined') ? KaiChatEngine : window.KaiChatEngine;
          if (engine) {
            engine._isScamAlertActive = false;
            engine._needsFreshStart = false;
            engine.resetChatMemory();
          }

          KaiStateManager.clearState();
          KaiStateManager.resetBlockedUI();
          AppScreenManager.updateBankBalanceDisplay();

          if (engine) {
            engine.startStage(0);
          }
        });
      }

      const scamHomeBtn = document.getElementById('scamHomeBtn');
      if (scamHomeBtn) {
        scamHomeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const scamModal = document.getElementById('scamAlertModal');
          if (scamModal) scamModal.setAttribute('hidden', '');

          const engine = (typeof KaiChatEngine !== 'undefined') ? KaiChatEngine : window.KaiChatEngine;
          if (engine) {
            engine._isScamAlertActive = false;
            engine._needsFreshStart = true;
            engine.resetChatMemory();
          }

          KaiStateManager.clearState();
          KaiStateManager.resetBlockedUI();

          AppScreenManager.closeActiveApp();

          // Player was scammed, returned Home:
          // Ensure Kai is NOT blocked (can return to retry anytime)
          KaiStateManager.resetBlockedUI();

          // Trigger Quest 2 (Facebook) on Home after 4s
          if (window.QuestProgressionManager) {
            window.QuestProgressionManager.scheduleFacebookNotif(4000);
          }
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
        // Self-healing: A legitimately blocked chat must have message history.
        // If messages is empty or missing, this is an invalid/stale reset state. Heal it immediately!
        if (!savedState.messages || savedState.messages.length === 0) {
          console.warn('[KaiChatEngine] Detected invalid blocked state with 0 messages. Self-healing to fresh start...');
          KaiStateManager.clearState();
          KaiStateManager.resetBlockedUI();
          this.resetChatMemory();
          this.startStage(0);
          return;
        }

        this.questStatus = 'blocked';
        this.renderBlockedView(savedState);
        return;
      }

      // If user was previously scammed, or returning after scam exit, or fresh start requested:
      if (this._needsFreshStart || (savedState && savedState.hasTransferredScam)) {
        console.log('[Zero-Trust Simulator] Resetting Kai quest to Stage 0 for fresh attempt...');
        this._needsFreshStart = false;
        this._isScamAlertActive = false;
        KaiStateManager.clearState();
        KaiStateManager.resetBlockedUI();
        this.resetChatMemory();
        this.startStage(0);
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
      if (!this._needsFreshStart && !this._isScamAlertActive) {
        this.saveCurrentState();
      }
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
      this.hasTransferredScam = false;
      if (window.AppScreenManager) {
        window.AppScreenManager.updateBankBalanceDisplay();
      }
      this.clearStreamDOM();
      this.hideChoices(false);
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
    },

    clearStreamDOM() {
      if (!this.streamEl) return;
      const msgs = this.streamEl.querySelectorAll('.chat-msg-row, .user-slip-bubble-wrap');
      msgs.forEach(m => m.remove());
      const badges = this.streamEl.querySelectorAll('.convo-date-badge');
      badges.forEach((b, idx) => {
        if (idx > 0) b.remove();
      });
    },

    saveCurrentState() {
      const existingState = KaiStateManager.loadState() || {};
      const isBlocked = (this.questStatus === 'blocked' || this.questStatus === 'completed');
      if (isBlocked) {
        this.questStatus = 'blocked';
      }
      const isChoicesOpen = (this.choicesBoxEl && !this.choicesBoxEl.hasAttribute('hidden'));
      const isDeposited = !!(this.hasReceivedDeposit || existingState.hasReceivedDeposit || (typeof this.currentStageIndex === 'number' && this.currentStageIndex >= 4));
      const hasTransferredScam = (typeof this.hasTransferredScam === 'boolean') ? this.hasTransferredScam : !!(existingState.hasTransferredScam);
      const transferredAmount = existingState.transferredAmount || 500;
      const state = {
        version: 3,
        status: isBlocked ? 'blocked' : 'in_progress',
        currentStageIndex: (typeof this.currentStageIndex === 'number' && this.currentStageIndex >= 0) ? this.currentStageIndex : (existingState.currentStageIndex || 0),
        isChoicesVisible: isBlocked ? false : isChoicesOpen,
        hasReceivedDeposit: isDeposited,
        hasTransferredScam: hasTransferredScam,
        transferredAmount: transferredAmount,
        messages: Array.isArray(this.messages) ? this.messages : (existingState.messages || []),
        choicesHistory: Array.isArray(this.choicesHistory) ? this.choicesHistory : (existingState.choicesHistory || []),
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
          this._renderKaiBubbleDOM(msg.text, msg.time, msg.hasBankLink, msg.bankLinkMode, msg.hasDbdCert, msg.hasFakeSlips);
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
            this._renderKaiBubbleDOM(msg.text, msg.time, msg.hasBankLink, msg.bankLinkMode, msg.hasDbdCert, msg.hasFakeSlips);
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

    _renderKaiBubbleDOM(text, timeStr, hasBankLink, bankLinkMode, hasDbdCert = false, hasFakeSlips = false) {
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
      if (hasDbdCert || hasFakeSlips) {
        bubble.classList.add('has-attachment');
      }
      bubble.textContent = text;

      // Simulated Fake DBD Certificate card
      if (hasDbdCert) {
        const certCard = document.createElement('div');
        certCard.className = 'fake-dbd-cert-card';
        certCard.innerHTML = `
          <div class="dbd-cert-header">
            <div class="dbd-emblem-box">
              <svg viewBox="0 0 40 40" class="dbd-emblem-svg" width="30" height="30" aria-hidden="true">
                <circle cx="20" cy="20" r="18" fill="#1e3a8a" stroke="#f59e0b" stroke-width="2"/>
                <path d="M20 7l3 7h7l-5.5 4.5 2 7-6.5-4.5-6.5 4.5 2-7L10 14h7z" fill="#f59e0b"/>
                <text x="20" y="33" font-size="6" font-weight="bold" fill="#ffffff" text-anchor="middle">DBD</text>
              </svg>
            </div>
            <div class="dbd-header-text">
              <div class="dbd-title-main">หนังสือรับรองการขึ้นทะเบียน</div>
              <div class="dbd-title-sub">พาณิชย์อิเล็กทรอนิกส์ (DBD Registered)</div>
              <div class="dbd-gov-name">กรมพัฒนาธุรกิจการค้า กระทรวงพาณิชย์</div>
            </div>
          </div>
          <div class="dbd-cert-body">
            <div class="dbd-cert-row">
              <span class="dbd-label">ชื่อผู้ประกอบการ:</span>
              <strong class="dbd-val">บจก. สมาร์ท เวิร์ก ช็อปปิ้ง มาร์เก็ตติ้ง</strong>
            </div>
            <div class="dbd-cert-row">
              <span class="dbd-label">เลขทะเบียนพาณิชย์:</span>
              <span class="dbd-val dbd-highlight-id">0105563098712</span>
            </div>
            <div class="dbd-cert-row">
              <span class="dbd-label">วันที่ออกหนังสือ:</span>
              <span class="dbd-val">14 มกราคม 2566</span>
            </div>
            <div class="dbd-cert-row">
              <span class="dbd-label">ประเภทธุรกิจ:</span>
              <span class="dbd-val">บริการการตลาดและแพลตฟอร์มพาณิชย์อิเล็กทรอนิกส์</span>
            </div>
          </div>
          <div class="dbd-cert-footer">
            <div class="dbd-official-stamp">
              <span class="stamp-circle">VERIFIED BY DBD</span>
              <span class="stamp-sub">นิติบุคคลถูกต้อง</span>
            </div>
            <div class="dbd-cert-status">
              <span class="status-dot-green">●</span>
              <span>ขึ้นทะเบียนแล้ว (จำลอง)</span>
            </div>
          </div>
        `;
        bubble.appendChild(certCard);
      }

      // Simulated Fake Slips card (2 Slips: 500 deposit + 1000 withdrawal)
      if (hasFakeSlips) {
        const slipsCard = document.createElement('div');
        slipsCard.className = 'fake-slips-container';
        slipsCard.innerHTML = `
          <div class="fake-slips-caption">📄 ตัวอย่างสลิปสมาชิกที่เพิ่งทำรายการสำเร็จ:</div>
          <div class="fake-slips-list">
            <!-- Slip 1: โอนเงินสำรอง 500 บาท -->
            <div class="fake-slip-card deposit-slip">
              <div class="fake-slip-header kbank-header">
                <div class="fake-slip-bank-badge">
                  <span class="bank-dot green-dot"></span>
                  <span>ธ.กสิกรไทย (จำลอง)</span>
                </div>
                <span class="fake-slip-status-tag success">โอนเงินสำเร็จ</span>
              </div>
              <div class="fake-slip-amount-row">
                <span class="fake-slip-amount">฿500.00</span>
              </div>
              <div class="fake-slip-meta-rows">
                <div><span>จาก:</span> <strong>นายกิตติศักดิ์ พ.</strong> (xxx-2-x194)</div>
                <div><span>ไปยัง:</span> <strong>บจก. สมาร์ท เวิร์ก มาร์เก็ตติ้ง</strong></div>
                <div><span>เวลา:</span> <span>วันนี้ 10:14 น.</span></div>
                <div><span>บันทึก:</span> <span class="slip-memo">สำรองทุนงานรอบที่ 1</span></div>
              </div>
            </div>

            <!-- Slip 2: ถอนกำไร 1,000 บาท -->
            <div class="fake-slip-card withdraw-slip">
              <div class="fake-slip-header scb-header">
                <div class="fake-slip-bank-badge">
                  <span class="bank-dot purple-dot"></span>
                  <span>ธ.ไทยพาณิชย์ (จำลอง)</span>
                </div>
                <span class="fake-slip-status-tag success">โอนเงินสำเร็จ</span>
              </div>
              <div class="fake-slip-amount-row">
                <span class="fake-slip-amount profit">฿1,000.00</span>
              </div>
              <div class="fake-slip-meta-rows">
                <div><span>จาก:</span> <strong>บจก. สมาร์ท เวิร์ก มาร์เก็ตติ้ง</strong></div>
                <div><span>ไปยัง:</span> <strong>นายกิตติศักดิ์ พ.</strong> (xxx-2-x194)</div>
                <div><span>เวลา:</span> <span>วันนี้ 10:19 น. (หลังทำ 5 นาที)</span></div>
                <div><span>บันทึก:</span> <span class="slip-memo highlight-memo">ถอนทุน 500 + ผลตอบแทน 500 บาท</span></div>
              </div>
            </div>
          </div>
        `;
        bubble.appendChild(slipsCard);
      }

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

    appendKaiBubble(text, hasBankLink = false, bankLinkMode = null, hasDbdCert = false, hasFakeSlips = false) {
      if (window.SoundManager) {
        window.SoundManager.playNpcChat();
      }
      const timeStr = this.getCurrentTimeStr();
      this.messages.push({
        sender: 'kai',
        stageIndex: this.currentStageIndex,
        text,
        time: timeStr,
        hasBankLink,
        bankLinkMode,
        hasDbdCert,
        hasFakeSlips
      });
      this._renderKaiBubbleDOM(text, timeStr, hasBankLink, bankLinkMode, hasDbdCert, hasFakeSlips);
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
      if (window.SoundManager) {
        window.SoundManager.playPlayerChat();
      }
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
      if (window.SoundManager) {
        window.SoundManager.playPlayerChat();
      }
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

    hideChoices(shouldSave = true) {
      if (this.choicesBoxEl) {
        this.choicesBoxEl.setAttribute('hidden', '');
      }
      this.choiceBtns.forEach(btn => {
        if (btn) btn.disabled = true;
      });
      if (this.textInputEl) this.textInputEl.disabled = true;
      if (this.sendBtnEl) this.sendBtnEl.disabled = true;
      if (shouldSave) {
        this.saveCurrentState();
      }
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
          this.appendKaiBubble(msgObj.text, !!msgObj.hasBankLink, msgObj.bankLinkMode, !!msgObj.hasDbdCert, !!msgObj.hasFakeSlips);
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
        isSafe: selectedChoice.isSafe,
        points: selectedChoice.points || 0,
        category: selectedChoice.category || 'low_safety'
      });

      // Synchronize scoring system (Rule 1.1, 1.2, 1.3)
      if (window.PlayerStatsManager) {
        window.PlayerStatsManager.recordChoice(
          selectedChoice.points || 0,
          selectedChoice.category || 'low_safety',
          this.currentStageIndex,
          selectedChoice.id
        );
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
      if (window.SoundManager) {
        window.SoundManager.playMessageNotification();
        return;
      }
      const sfxVol = window.SoundManager ? window.SoundManager.getEffectiveSFXVolume() : 1;
      if (sfxVol <= 0) return;
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
        gain.gain.linearRampToValueAtTime(0.18 * sfxVol, now + 0.02);
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
      const sfxVol = window.SoundManager ? window.SoundManager.getEffectiveSFXVolume() : 1;
      if (sfxVol <= 0) return;
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
          gain.gain.linearRampToValueAtTime(0.2 * sfxVol, t + 0.02);
          gain.gain.setValueAtTime(0.2 * sfxVol, t + 0.22);
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
      this._isScamAlertActive = true;
      const scamModal = document.getElementById('scamAlertModal');
      if (!scamModal) return;

      this.playScamAlarmSound();

      // Rule 1.4: ถ้าถูกหลอกตอนท้ายให้ -10 คะแนน (หัก 10 คะแนน)
      if (window.PlayerStatsManager) {
        window.PlayerStatsManager.recordScamDeduction(amount);
      }

      const summaryEl = scamModal.querySelector('.scam-alert-summary');
      if (summaryEl) {
        summaryEl.innerHTML = `คุณได้โอนเงิน <strong>${parseFloat(amount).toLocaleString('en-US')} บาท</strong> เข้าบัญชีม้าของมิจฉาชีพแล้ว`;
      }

      scamModal.removeAttribute('hidden');
    },

    /**
     * Synthesize realistic Cyber/Sci-Fi digital static noise with electric crackle
     */
    playGlitchStaticSound() {
      if (window.SoundManager) {
        window.SoundManager.playSparkPhone();
        return;
      }
      const sfxVol = window.SoundManager ? window.SoundManager.getEffectiveSFXVolume() : 1;
      if (sfxVol <= 0) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const bufferSize = Math.floor(ctx.sampleRate * 0.85); // 0.85 second
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          const buzz = Math.sin(i / 10) > 0 ? 0.25 : -0.25;
          data[i] = (white * 0.75 + buzz * 0.25) * (Math.random() > 0.12 ? 1 : 0);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1750;
        filter.Q.value = 1.4;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01 * sfxVol, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2 * sfxVol, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2 * sfxVol, ctx.currentTime + 0.65);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
      } catch (e) {
        // Safe fallback
      }
    },

    /**
     * Synthesize realistic pleasant mobile chat chime for incoming LINE message
     */
    playLineChimeSound() {
      if (window.SoundManager) {
        window.SoundManager.playMessageNotification();
        return;
      }
      const sfxVol = window.SoundManager ? window.SoundManager.getEffectiveSFXVolume() : 1;
      if (sfxVol <= 0) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const playTone = (freq, startTime, duration, vol) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(vol * sfxVol, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + duration);
        };
        playTone(659.25, now, 0.3, 0.2); // E5
        playTone(880.00, now + 0.11, 0.4, 0.22); // A5
        playTone(1318.51, now + 0.22, 0.45, 0.16); // E6
      } catch (e) {
        // Safe fallback
      }
    },

    /**
     * Triggered when user clicks [เปิด Mobile Banking] inside chat bubble or top push notification
     */
    openMobileBankFromLink(isTransfer = false) {
      this.abortPlayback();
      this.saveCurrentState();
      // In Mission 1: show Mobile Bank dashboard with transfer guide, do not open transfer modal directly
      AppScreenManager.openBankFromLine(false, !!isTransfer);
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

      if (window.QuestProgressionManager) {
        window.QuestProgressionManager.setQuest1Status('cleared');
      }

      // Case 1: Refresh & sync total score to Mission Success Modal (under "เคลียร์")
      if (window.PlayerStatsManager) {
        window.PlayerStatsManager.updateUI();
      }

      const successModal = document.getElementById('missionSuccessModal');
      if (successModal) {
        successModal.removeAttribute('hidden');
      }
    }
  };

  /**
   * Player Statistics and Scoring Manager (User Rules 1.1 - 1.4)
   * 1.1 Safest choice: +10 pts
   * 1.2 Low safety choice: +7 pts
   * 1.3 Risky choice: -1 pt
   * 1.4 Scam transfer: -10 pts
   * Syncs real-time with Home icon badge, Mission Success modal, and Scam Alert modal.
   */
  const PlayerStatsManager = {
    STORAGE_KEY: 'zerotrust_player_stats_v1',

    loadStats() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            if (parsed.missionScore === undefined) {
              parsed.missionScore = parsed.totalScore || 0;
            }
            if (parsed.minigameScore === undefined) {
              parsed.minigameScore = 0;
            }
            parsed.totalScore = (parsed.missionScore || 0) + (parsed.minigameScore || 0);
            return parsed;
          }
        }
      } catch (e) {}
      return {
        totalScore: 0,
        missionScore: 0,
        minigameScore: 0,
        counts: {
          safest: 0,
          low_safety: 0,
          risky: 0,
          scammed: 0
        },
        history: []
      };
    },

    saveStats(stats) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));
      } catch (e) {}
      this.updateUI(stats);
    },

    resetStats() {
      const stats = {
        totalScore: 0,
        missionScore: 0,
        minigameScore: 0,
        counts: {
          safest: 0,
          low_safety: 0,
          risky: 0,
          scammed: 0
        },
        history: []
      };
      this.saveStats(stats);
      return stats;
    },

    recordChoice(points, category, stageIndex, choiceId) {
      const stats = this.loadStats();
      stats.missionScore = (stats.missionScore || 0) + points;
      stats.totalScore = (stats.missionScore || 0) + (stats.minigameScore || 0);
      if (!stats.counts) {
        stats.counts = { safest: 0, low_safety: 0, risky: 0, scammed: 0 };
      }
      if (category && typeof stats.counts[category] === 'number') {
        stats.counts[category]++;
      }
      stats.history.push({
        type: 'choice',
        stageIndex,
        choiceId,
        category,
        points,
        timestamp: Date.now()
      });
      this.saveStats(stats);
      return stats;
    },

    recordScamDeduction(amount = 500) {
      const stats = this.loadStats();
      stats.missionScore = (stats.missionScore || 0) - 10;
      stats.totalScore = (stats.missionScore || 0) + (stats.minigameScore || 0);
      if (!stats.counts) {
        stats.counts = { safest: 0, low_safety: 0, risky: 0, scammed: 0 };
      }
      stats.counts.scammed = (stats.counts.scammed || 0) + 1;
      stats.history.push({
        type: 'scam_transfer',
        amount,
        points: -10,
        timestamp: Date.now()
      });
      this.saveStats(stats);
      return stats;
    },

    recordMinigameScore(points, gameName = 'tetris') {
      const stats = this.loadStats();
      stats.minigameScore = (stats.minigameScore || 0) + points;
      stats.totalScore = (stats.missionScore || 0) + (stats.minigameScore || 0);
      stats.history.push({
        type: 'minigame',
        game: gameName,
        points,
        timestamp: Date.now()
      });
      this.saveStats(stats);
      if (window.ServerRankingManager) {
        window.ServerRankingManager.updateRankingData();
      }
      return stats;
    },

    getMissionScore() {
      return this.loadStats().missionScore || 0;
    },

    getMinigameScore() {
      return this.loadStats().minigameScore || 0;
    },

    getScore() {
      return this.loadStats().totalScore;
    },

    updateUI(stats) {
      if (!stats) stats = this.loadStats();
      const totalScore = stats.totalScore || 0;

      // 1. Icon Badge on Home Screen
      const iconBadge = document.getElementById('statsIconScoreBadge');
      if (iconBadge) {
        iconBadge.textContent = totalScore > 0 ? `+${totalScore}` : `${totalScore}`;
        if (totalScore === 0) iconBadge.textContent = '0';
        if (totalScore < 0) {
          iconBadge.classList.add('badge-negative');
          iconBadge.classList.remove('badge-positive');
        } else if (totalScore > 0) {
          iconBadge.classList.add('badge-positive');
          iconBadge.classList.remove('badge-negative');
        } else {
          iconBadge.classList.remove('badge-positive', 'badge-negative');
        }
      }

      // 2. Mission Success Modal Total Score Badge (under "เคลียร์")
      const successScoreVal = document.getElementById('successScoreVal');
      if (successScoreVal) {
        successScoreVal.textContent = totalScore;
      }

      // 3. Scam Alert Modal Total Score Badge (above "เริ่มใหม่" & "home")
      const scamScoreVal = document.getElementById('scamScoreVal');
      if (scamScoreVal) {
        scamScoreVal.textContent = totalScore;
      }

      // Mission 2 Modals Total Score updates
      const m2SafeTotal = document.getElementById('m2SafeTotalScoreVal');
      if (m2SafeTotal) m2SafeTotal.textContent = `${totalScore} คะแนน`;
      const m2ScamTotal = document.getElementById('m2ScamTotalScoreVal');
      if (m2ScamTotal) m2ScamTotal.textContent = `${totalScore} คะแนน`;

      // Mission 3 Modals Total Score updates
      const m3SafeTotal = document.getElementById('m3SafeTotalScoreVal');
      if (m3SafeTotal) m3SafeTotal.textContent = `${totalScore} คะแนน`;
      const m3ScamTotal = document.getElementById('m3ScamTotalScoreVal');
      if (m3ScamTotal) m3ScamTotal.textContent = `${totalScore} คะแนน`;

      // 4. Stats App Screen: Big Score
      const bigScoreEl = document.getElementById('statsScreenBigScore');
      if (bigScoreEl) {
        bigScoreEl.textContent = totalScore;
        bigScoreEl.style.color = totalScore < 0 ? '#ef4444' : (totalScore >= 70 ? '#10b981' : (totalScore > 0 ? '#6366f1' : '#f59e0b'));
      }

      // 5. Rank Tag
      const rankTagEl = document.getElementById('statsScreenRankTag');
      if (rankTagEl) {
        if (totalScore >= 90) {
          rankTagEl.textContent = '🛡️ ระดับ: ปรมาจารย์ Zero-Trust (ยอดเยี่ยม)';
          rankTagEl.className = 'stats-rank-tag rank-master';
        } else if (totalScore >= 70) {
          rankTagEl.textContent = '🟢 ระดับ: รู้ทันกลโกง (ปลอดภัย)';
          rankTagEl.className = 'stats-rank-tag rank-safe';
        } else if (totalScore >= 40) {
          rankTagEl.textContent = '🟡 ระดับ: เฝ้าระวัง (มีความเสี่ยง)';
          rankTagEl.className = 'stats-rank-tag rank-moderate';
        } else {
          rankTagEl.textContent = '🔴 ระดับ: เสี่ยงตกเป็นเหยื่อสูง';
          rankTagEl.className = 'stats-rank-tag rank-danger';
        }
      }

      // 6. Quest State text
      const questStateEl = document.getElementById('statsScreenQuestState');
      if (questStateEl) {
        const prog = window.QuestProgressionManager ? window.QuestProgressionManager.loadProgression() : {};
        const q1 = prog.quest1_kai || 'in_progress';
        const q2 = prog.quest2_callcenter || 'not_started';
        const q3 = prog.quest3_jod || 'locked';
        if (q3 === 'cleared') {
          questStateEl.textContent = 'สถานะ: ภารกิจที่ 3 (งานออนไลน์รายได้ดี) เคลียร์สำเร็จแล้ว 🛡️';
        } else if (q3 === 'scammed') {
          questStateEl.textContent = 'สถานะ: ภารกิจที่ 3 ตกเป็นเหยื่อโอนมัดจำงานออนไลน์';
        } else if (q3 === 'ready' || q3 === 'in_progress') {
          questStateEl.textContent = 'สถานะ: ภารกิจที่ 3 (งานออนไลน์ น้องจ๊อด) กำลังดำเนินอยู่...';
        } else if (q2 === 'cleared') {
          questStateEl.textContent = 'สถานะ: ภารกิจที่ 2 (สายทวงหนี้ข่มขู่) เคลียร์สำเร็จแล้ว 🛡️';
        } else if (q2 === 'scammed') {
          questStateEl.textContent = 'สถานะ: ภารกิจที่ 2 ตกเป็นเหยื่อถูกข่มขู่ (รอสายโทรเข้าใหม่ 2 นาที)';
        } else if (q1 === 'cleared' || q1 === 'scammed') {
          questStateEl.textContent = 'สถานะ: ภารกิจที่ 2 (สายมิจฉาชีพโทรเข้า) กำลังดำเนินอยู่...';
        } else {
          questStateEl.textContent = 'สถานะ: ภารกิจที่ 1 (น้องไก่) กำลังดำเนินอยู่...';
        }
      }

      // 7. National Percentile Banner
      const percentileEl = document.getElementById('statsPercentileBanner');
      if (percentileEl) {
        let pct = 50;
        if (totalScore >= 100) pct = 99;
        else if (totalScore >= 90) pct = 92;
        else if (totalScore >= 80) pct = 78;
        else if (totalScore >= 70) pct = 65;
        else if (totalScore >= 50) pct = 45;
        else if (totalScore >= 20) pct = 25;
        else pct = 10;
        percentileEl.innerHTML = `🏆 คะแนนของคุณ <strong>ดีกว่า ${pct}%</strong> ของคนทั่วประเทศ`;
      }

      // 8. Player Compare Bar
      const compareScoreVal = document.getElementById('comparePlayerScoreVal');
      if (compareScoreVal) {
        compareScoreVal.textContent = `${totalScore} คะแนน`;
      }
      const compareBarFill = document.getElementById('comparePlayerBarFill');
      if (compareBarFill) {
        const barPct = Math.max(5, Math.min(100, totalScore <= 0 ? 5 : totalScore));
        compareBarFill.style.width = `${barPct}%`;
        compareBarFill.style.background = totalScore < 0 ? '#ef4444' : (totalScore >= 70 ? '#10b981' : '#6366f1');
      }

      // 9. Choice Breakdown Pills
      const counts = stats.counts || { safest: 0, low_safety: 0, risky: 0, scammed: 0 };
      const safestEl = document.getElementById('statSafestCount');
      if (safestEl) safestEl.textContent = counts.safest || 0;
      const lowSafetyEl = document.getElementById('statLowSafetyCount');
      if (lowSafetyEl) lowSafetyEl.textContent = counts.low_safety || 0;
      const riskyEl = document.getElementById('statRiskyCount');
      if (riskyEl) riskyEl.textContent = counts.risky || 0;
      const scammedEl = document.getElementById('statScammedCount');
      if (scammedEl) scammedEl.textContent = counts.scammed || 0;

      // 10. Dedicated Score Breakdown (Mission + Minigame = Total)
      const missionScoreVal = document.getElementById('statsMissionScoreVal');
      if (missionScoreVal) {
        missionScoreVal.textContent = stats.missionScore || 0;
      }
      const minigameScoreVal = document.getElementById('statsMinigameScoreVal');
      if (minigameScoreVal) {
        minigameScoreVal.textContent = stats.minigameScore || 0;
      }
      const totalScoreBreakdownVal = document.getElementById('statsTotalScoreVal');
      if (totalScoreBreakdownVal) {
        totalScoreBreakdownVal.textContent = totalScore;
      }
      const lobbyMiniScoreVal = document.getElementById('lobbyMinigameScoreVal');
      if (lobbyMiniScoreVal) {
        lobbyMiniScoreVal.textContent = stats.minigameScore || 0;
      }

      // 11. Refresh Server Ranking Leaderboard
      if (window.ServerRankingManager && typeof window.ServerRankingManager.updateRankingData === 'function') {
        window.ServerRankingManager.updateRankingData();
      }
    }
  };
  window.PlayerStatsManager = PlayerStatsManager;

  /**
   * Linear Quest Progression Manager
   * Coordinates multi-stage storyline: Quest 1 (LINE น้องไก่) -> Quest 2 (Facebook)
   */
  const QuestProgressionManager = {
    STORAGE_KEY: 'zerotrust_quest_progression_v2',
    _glitchTimer: null,
    _fbNotifTimer: null,
    _m2CallTimer: null,

    loadProgression() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return {
        quest1_kai: 'not_started', // 'not_started' | 'in_progress' | 'scammed' | 'cleared'
        quest2_facebook: 'locked',  // 'locked' | 'ready' | 'in_progress' | 'cleared'
        quest2_callcenter: 'not_started', // 'not_started' | 'in_progress' | 'scammed' | 'cleared'
        quest3_jod: 'locked', // 'locked' | 'ready' | 'in_progress' | 'scammed' | 'cleared'
        hasPlayedGlitch: false
      };
    },

    saveProgression(prog) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prog));
      } catch (e) {}
    },

    resetProgression() {
      if (this._glitchTimer) clearTimeout(this._glitchTimer);
      if (this._fbNotifTimer) clearTimeout(this._fbNotifTimer);
      if (this._m2CallTimer) clearTimeout(this._m2CallTimer);
      try {
        localStorage.removeItem(this.STORAGE_KEY);
      } catch (e) {}
      if (window.AppScreenManager) {
        window.AppScreenManager.updateBankBalanceDisplay();
      }
    },

    setQuest1Status(status) {
      const prog = this.loadProgression();
      prog.quest1_kai = status;
      if (status === 'scammed' || status === 'cleared') {
        if (prog.quest2_facebook === 'locked') {
          prog.quest2_facebook = 'ready';
        }
      }
      this.saveProgression(prog);
      console.log('[QuestProgressionManager] Updated Quest 1 Status:', status, 'Quest 2:', prog.quest2_facebook);
      if (window.AppScreenManager) {
        window.AppScreenManager.updateBankBalanceDisplay();
      }
    },

    setQuest2CallStatus(status) {
      const prog = this.loadProgression();
      prog.quest2_callcenter = status;
      if (status === 'cleared') {
        if (prog.quest3_jod === 'locked') {
          prog.quest3_jod = 'ready';
        }
      }
      this.saveProgression(prog);
      console.log('[QuestProgressionManager] Updated Quest 2 Call Center Status:', status, 'Quest 3:', prog.quest3_jod);
    },

    setQuest3Status(status) {
      const prog = this.loadProgression();
      prog.quest3_jod = status;
      this.saveProgression(prog);
      console.log('[QuestProgressionManager] Updated Quest 3 Status:', status);
      if (window.AppScreenManager) {
        window.AppScreenManager.updateBankBalanceDisplay();
      }
    },

    initHomeTriggers() {
      const prog = this.loadProgression();
      // Resume Mission 3 even when an older/cloud save lacks Quest 1 state.
      if (prog.quest2_callcenter === 'cleared' && prog.quest3_jod !== 'cleared') {
        this.checkAndScheduleMission3();
        return;
      }
      // 1. Initial 5-second Glitch and LINE incoming notification (Quest 1)
      if (prog.quest1_kai === 'not_started' && !prog.hasPlayedGlitch) {
        this.scheduleGlitchAndLineNotif(5000);
      } else if (prog.quest1_kai === 'scammed' || prog.quest1_kai === 'cleared') {
        if (prog.quest2_callcenter !== 'cleared') {
          this.checkAndScheduleMission2Call();
        } else {
          this.checkAndScheduleMission3();
        }
      } else if (prog.quest2_facebook === 'ready') {
        this.scheduleFacebookNotif(4000);
      }
    },

    onReturnHome() {
      const prog = this.loadProgression();
      // Resume Mission 3 even when an older/cloud save lacks Quest 1 state.
      if (prog.quest2_callcenter === 'cleared' && prog.quest3_jod !== 'cleared') {
        this.checkAndScheduleMission3();
        return;
      }
      if (prog.quest1_kai === 'scammed' || prog.quest1_kai === 'cleared') {
        if (prog.quest2_callcenter !== 'cleared') {
          this.checkAndScheduleMission2Call();
        } else {
          this.checkAndScheduleMission3();
        }
      } else if (prog.quest2_facebook === 'ready') {
        this.scheduleFacebookNotif(4000);
      }
    },

    checkAndScheduleMission3() {
      const prog = this.loadProgression();
      if (prog.quest2_callcenter === 'cleared' && prog.quest3_jod !== 'cleared') {
        console.log('[QuestProgressionManager] Scheduling Mission 3 Facebook Banner in 3.0s...');
        this.scheduleMission3FacebookBanner(3000);
      }
    },

    scheduleMission3FacebookBanner(delayMs = 3000) {
      if (this._fbNotifTimer) clearTimeout(this._fbNotifTimer);
      this._fbNotifTimer = setTimeout(() => {
        if (AppScreenManager._activeAppId !== null) return;
        const prog = this.loadProgression();
        if (prog.quest2_callcenter !== 'cleared' || prog.quest3_jod === 'cleared') return;

        console.log('[QuestProgressionManager] Triggering Mission 3 Facebook Banner...');
        const fbNotif = document.getElementById('facebookPushNotification');
        const fbBadge = document.getElementById('facebookAppBadge');
        if (fbNotif && !fbNotif.hasAttribute('hidden') && fbNotif.classList.contains('active')) return;
        if (fbNotif) {
          fbNotif.removeAttribute('hidden');
          void fbNotif.offsetWidth;
          fbNotif.classList.add('active');
        }
        if (fbBadge) fbBadge.removeAttribute('hidden');
        if (window.KaiChatEngine && window.KaiChatEngine.playLineChimeSound) {
          window.KaiChatEngine.playLineChimeSound();
        }

        // Keep the story notification until the player opens it.
      }, delayMs);
    },

    checkAndScheduleMission2Call() {
      const prog = this.loadProgression();

      // 1. ถ้าเครียแล้ว ไม่ต้องมีสายโทรวนเข้ามาเด็ดขาด!
      if (prog.quest2_callcenter === 'cleared') {
        console.log('[QuestProgressionManager] Mission 2 already cleared. No incoming scam calls.');
        if (this._m2CallTimer) {
          clearTimeout(this._m2CallTimer);
          this._m2CallTimer = null;
        }
        return;
      }

      // 2. ถ้าแพ้ "ถูกหลอก" ให้มีสายโทรเข้าอีกครั้ง 2 นาที เพื่อทำเควสใหม่
      if (prog.quest2_callcenter === 'scammed') {
        console.log('[QuestProgressionManager] Mission 2 was scammed. Scheduling retry call in 2 minutes (120,000ms)...');
        this.scheduleIncomingCall(120000); // 2 นาที = 120,000 ms
        return;
      }

      // 3. เริ่มครั้งแรกหลังจบเควส 1
      if (prog.quest2_callcenter === 'not_started' || !prog.quest2_callcenter) {
        console.log('[QuestProgressionManager] Mission 2 initial incoming call scheduling in 3.5s...');
        this.scheduleIncomingCall(3500);
      }
    },

    scheduleIncomingCall(delayMs = 3500) {
      if (this._m2CallTimer) clearTimeout(this._m2CallTimer);
      this._m2CallTimer = setTimeout(() => {
        if (AppScreenManager._activeAppId === null && window.Mission2CallCenter) {
          window.Mission2CallCenter.startIncomingCall();
        }
      }, delayMs);
    },

    scheduleGlitchAndLineNotif(delayMs = 5000) {
      if (this._glitchTimer) clearTimeout(this._glitchTimer);
      this._glitchTimer = setTimeout(() => {
        // Only trigger if currently on Home screen
        if (AppScreenManager._activeAppId !== null) return;

        console.log('[QuestProgressionManager] Triggering 5s Cyber/Sci-Fi Glitch Effect...');
        const glitchEl = document.getElementById('cyberGlitchOverlay');
        if (glitchEl) {
          glitchEl.removeAttribute('hidden');
          void glitchEl.offsetWidth;
          glitchEl.classList.add('active');
        }

        KaiChatEngine.playGlitchStaticSound();

        // After ~850ms, stop glitch
        setTimeout(() => {
          if (glitchEl) {
            glitchEl.classList.remove('active');
            glitchEl.setAttribute('hidden', '');
          }

          // At 6th second: Trigger LINE push notification
          console.log('[QuestProgressionManager] Triggering LINE push notification from น้องไก่...');
          this.showLinePushNotification();

          const prog = this.loadProgression();
          prog.hasPlayedGlitch = true;
          prog.quest1_kai = 'in_progress';
          this.saveProgression(prog);
        }, 850);
      }, delayMs);
    },

    showLinePushNotification() {
      const notifEl = document.getElementById('linePushNotification');
      const badgeEl = document.getElementById('lineAppBadge');
      if (!notifEl) return;

      KaiChatEngine.playLineChimeSound();

      notifEl.removeAttribute('hidden');
      void notifEl.offsetWidth;
      notifEl.classList.add('active');

      if (badgeEl) badgeEl.removeAttribute('hidden');

      setTimeout(() => {
        notifEl.classList.remove('active');
        setTimeout(() => notifEl.setAttribute('hidden', ''), 420);
      }, 8000);
    },

    scheduleFacebookNotif(delayMs = 4000) {
      if (this._fbNotifTimer) clearTimeout(this._fbNotifTimer);
      this._fbNotifTimer = setTimeout(() => {
        if (AppScreenManager._activeAppId !== null) return;
        console.log('[QuestProgressionManager] Triggering Quest 2 Facebook Push Notification...');
        const fbNotif = document.getElementById('facebookPushNotification');
        const fbBadge = document.getElementById('facebookAppBadge');
        if (fbNotif) {
          fbNotif.removeAttribute('hidden');
          void fbNotif.offsetWidth;
          fbNotif.classList.add('active');
        }
        if (fbBadge) fbBadge.removeAttribute('hidden');
        KaiChatEngine.playLineChimeSound();

        setTimeout(() => {
          if (fbNotif) {
            fbNotif.classList.remove('active');
            setTimeout(() => fbNotif.setAttribute('hidden', ''), 420);
          }
        }, 8000);
      }, delayMs);
    }
  };

  /**
   * Sound & Audio Manager (Background Music & Sound Effects)
   */
  const SoundManager = {
    musicVolume: 0.7, // 0.0 - 1.0
    sfxVolume: 0.8,   // 0.0 - 1.0
    isMuted: false,
    isCallActive: false, // In-Call silence lock
    _bgmCtx: null,
    _bgmGain: null,
    _bgmFilter: null,
    _bgmOscs: [],
    _bgmPlaying: false,
    _hasUserInteracted: false,
    _bgmAudio: null,

    // Audio Files mapped per user requirements:
    // แจ้งเตือนแมสเซสเข้า -> notification_message
    // แชท npc -> notification_npc
    // ผู้เล่น กดส่งข้อความ -> notification_player
    // ตอนที่ โทรศัพท์ถูกสัญญาณรบกวน -> spark_phone
    // เม้าท์ click menu ทุกอย่าง -> mouse-click
    // เสียง bg sound -> audio/bg sound/Piano Motif.mp3
    // เสียง bg puzzle -> audio/bg sound/puzzle_fun.mp3
    AUDIO_MAP: {
      message: 'audio/notification_message.mp3',
      npc: 'audio/notification_npc.mp3',
      player: 'audio/notification_player.mp3',
      sparkPhone: 'audio/spark_phone.MP3',
      mouseClick: 'audio/mouse-click.mp3',
      bgSound: 'audio/bg sound/Piano Motif.mp3',
      puzzleBg: 'audio/bg sound/puzzle_fun.mp3'
    },
    _activeBgmType: 'main', // 'main' | 'puzzle'
    _puzzleBgmAudio: null,
    _sfxCtx: null,

    init() {
      this.loadSettings();
      this.preloadAudio();
      this.initClickSound();

      // Ensure background music starts upon first user interaction
      const startAudioOnGesture = () => {
        if (!this._hasUserInteracted) {
          this._hasUserInteracted = true;
          this.startBGM();
        }
        window.removeEventListener('click', startAudioOnGesture);
        window.removeEventListener('keydown', startAudioOnGesture);
        window.removeEventListener('touchstart', startAudioOnGesture);
      };
      window.addEventListener('click', startAudioOnGesture, { once: true });
      window.addEventListener('keydown', startAudioOnGesture, { once: true });
      window.addEventListener('touchstart', startAudioOnGesture, { once: true });

      // Attempt immediate background playback if browser policy allows
      this.startBGM();
    },

    preloadAudio() {
      try {
        Object.values(this.AUDIO_MAP).forEach(src => {
          const a = new Audio();
          a.src = src;
          a.preload = 'auto';
        });
        if (!this._bgmAudio) {
          this._bgmAudio = new Audio(this.AUDIO_MAP.bgSound);
          this._bgmAudio.loop = true;
          this._bgmAudio.preload = 'auto';
        }
        if (!this._puzzleBgmAudio) {
          this._puzzleBgmAudio = new Audio(this.AUDIO_MAP.puzzleBg);
          this._puzzleBgmAudio.loop = true;
          this._puzzleBgmAudio.preload = 'auto';
        }
      } catch (e) {}
    },

    initClickSound() {
      // เม้าท์ click menu ทุกอย่าง ใช้ > mouse-click
      document.addEventListener('click', (e) => {
        if (e.target.closest('.dpad-key, .btn-rotate-cyan-circle')) {
          return; // มีเสียงจำเพาะของเกม Tetris อยู่แล้ว
        }
        const clickable = e.target.closest(
          'button, .app-item, .dock-item, .choice-btn, .settings-menu-nav-btn, ' +
          '.line-contact-item, .line-push-card, .facebook-push-card, .bank-push-card, ' +
          '.ios-switch, input[type="range"], a, [role="button"], .sheet-close-btn, ' +
          '.scam-btn-restart, .scam-btn-home, .success-home-btn, .amt-btn, .settings-back-btn, ' +
          '.line-back-btn, .bank-nav-back, .convo-back-btn, .bank-close-btn, .btn-restart-action, ' +
          '.btn-dialog-cancel, .btn-dialog-confirm-danger, .btn-sheet-submit, .btn-sheet-close-action, ' +
          '.bank-action-pill, .bank-menu-tile, .convo-header-icon-btn, .line-tool-btn, .convo-tool-btn'
        );
        if (clickable) {
          this.playMouseClick();
        }
      }, true);
    },

    playAudio(type) {
      const vol = this.getEffectiveSFXVolume();
      if (vol <= 0 || this.isMuted) return;

      const src = this.AUDIO_MAP[type];
      if (!src) return;

      try {
        const audio = new Audio(src);
        audio.volume = Math.max(0, Math.min(1, vol));
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      } catch (e) {}
    },

    // 1. แจ้งเตือนแมสเซสเข้า > notification_message
    playMessageNotification() {
      this.playAudio('message');
    },

    // 2. แชท npc > notification_npc
    playNpcChat() {
      this.playAudio('npc');
    },

    // 3. ผู้เล่น กดส่งข้อความ > notification_player
    playPlayerChat() {
      this.playAudio('player');
    },

    // 4. ตอนที่ โทรศัพท์ถูกสัญญาณรบกวน > spark_phone
    // ตอนโทรศัพท์มีสัญญาญแทรก ให้เสียงเพลง bg หยุด แล้วดนตรีค่อยดังตอนเสียง spark_phone หยุดเล่น
    playSparkPhone() {
      const vol = this.getEffectiveSFXVolume();
      const shouldResumeBGM = (this._bgmPlaying || (this._bgmAudio && !this._bgmAudio.paused) || this._hasUserInteracted) && !this.isMuted && this.getEffectiveMusicVolume() > 0;

      // 1. หยุดเสียงเพลง bg ทันที
      console.log('[SoundManager] Glitch interference started: Pausing BGM Piano Motif...');
      this.pauseBGM();

      if (vol <= 0 || this.isMuted) {
        if (shouldResumeBGM) {
          setTimeout(() => {
            this.resumeBGMWithFade(1200);
          }, 1200);
        }
        return;
      }

      const src = this.AUDIO_MAP.sparkPhone;
      if (!src) {
        if (shouldResumeBGM) this.resumeBGMWithFade(1200);
        return;
      }

      try {
        const sparkAudio = new Audio(src);
        sparkAudio.volume = Math.max(0, Math.min(1, vol));

        let hasResumed = false;
        const onFinish = () => {
          if (hasResumed) return;
          hasResumed = true;
          sparkAudio.removeEventListener('ended', onFinish);
          sparkAudio.removeEventListener('error', onFinish);
          // 2. ดนตรีค่อยดังตอน เสียง spark_phone หยุดเล่น
          if (shouldResumeBGM) {
            console.log('[SoundManager] spark_phone audio finished. Resuming Piano Motif BGM with smooth fade-in...');
            this.resumeBGMWithFade(1200);
          }
        };

        sparkAudio.addEventListener('ended', onFinish);
        sparkAudio.addEventListener('error', onFinish);

        // Safety fallback timeout matching duration (~2.5s) in case event doesn't fire
        setTimeout(() => {
          if (!hasResumed) onFinish();
        }, 2800);

        const playPromise = sparkAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            onFinish();
          });
        }
      } catch (e) {
        if (shouldResumeBGM) {
          this.resumeBGMWithFade(1200);
        }
      }
    },

    // 5. เม้าท์ click menu ทุกอย่าง > mouse-click
    playMouseClick() {
      this.playAudio('mouseClick');
    },

    // 6. เสียงไซเรนแจ้งเตือน "ถูกหลอก!" (Scam Alarm Siren)
    playScamAlarm() {
      const vol = this.getEffectiveSFXVolume();
      if (vol <= 0 || this.isMuted) return;
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
          gain.gain.linearRampToValueAtTime(0.25 * vol, t + 0.02);
          gain.gain.setValueAtTime(0.25 * vol, t + 0.22);
          gain.gain.linearRampToValueAtTime(0.001, t + 0.25);
          osc.start(t);
          osc.stop(t + 0.26);
        }
      } catch (e) {
        // Safe fallback
      }
    },

    loadSettings() {
      try {
        const raw = localStorage.getItem('zero_trust_sound_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.musicVolume === 'number') this.musicVolume = parsed.musicVolume;
          if (typeof parsed.sfxVolume === 'number') this.sfxVolume = parsed.sfxVolume;
          if (typeof parsed.isMuted === 'boolean') this.isMuted = parsed.isMuted;
        }
      } catch (e) {
        console.warn('[SoundManager] Could not load sound settings:', e);
      }
    },

    saveSettings() {
      try {
        localStorage.setItem('zero_trust_sound_settings', JSON.stringify({
          musicVolume: this.musicVolume,
          sfxVolume: this.sfxVolume,
          isMuted: this.isMuted
        }));
      } catch (e) {}
    },

    setMusicVolume(vol) {
      this.musicVolume = Math.max(0, Math.min(1, vol));
      this.saveSettings();
      this.applyMusicVolume();
    },

    setSFXVolume(vol) {
      this.sfxVolume = Math.max(0, Math.min(1, vol));
      this.saveSettings();
    },

    setMuted(muted) {
      this.isMuted = !!muted;
      this.saveSettings();
      this.applyMusicVolume();
      this.updateMuteUI();
    },

    getEffectiveSFXVolume() {
      if (this.isMuted) return 0;
      return this.sfxVolume;
    },

    getEffectiveMusicVolume() {
      if (this.isMuted) return 0;
      return this.musicVolume;
    },

    applyMusicVolume() {
      if (this.isCallActive) {
        if (this._bgmAudio) this._bgmAudio.pause();
        if (this._puzzleBgmAudio) this._puzzleBgmAudio.pause();
        this._bgmPlaying = false;
        return;
      }
      const vol = this.getEffectiveMusicVolume();
      if (this._bgmAudio) {
        this._bgmAudio.volume = Math.max(0, Math.min(1, vol));
      }
      if (this._puzzleBgmAudio) {
        this._puzzleBgmAudio.volume = Math.max(0, Math.min(1, vol));
      }

      if (this.isMuted || vol <= 0) {
        if (this._bgmAudio) this._bgmAudio.pause();
        if (this._puzzleBgmAudio) this._puzzleBgmAudio.pause();
        this._bgmPlaying = false;
      } else if (this._hasUserInteracted) {
        if (this._activeBgmType === 'puzzle') {
          if (this._puzzleBgmAudio && this._puzzleBgmAudio.paused) {
            this._puzzleBgmAudio.play().catch(() => {});
          }
        } else {
          if (this._bgmAudio && this._bgmAudio.paused) {
            const p = this._bgmAudio.play();
            if (p !== undefined) {
              p.then(() => { this._bgmPlaying = true; }).catch(() => {});
            }
          }
        }
      }

      if (this._bgmGain && this._bgmCtx) {
        const targetGain = vol * 0.12;
        try {
          this._bgmGain.gain.cancelScheduledValues(this._bgmCtx.currentTime);
          this._bgmGain.gain.linearRampToValueAtTime(targetGain, this._bgmCtx.currentTime + 0.1);
        } catch (e) {
          this._bgmGain.gain.value = targetGain;
        }
      }
    },

    startBGM() {
      if (this.isCallActive) return;
      if (this._activeBgmType === 'puzzle') {
        this.playPuzzleBGM();
        return;
      }
      if (this._bgmPlaying && this._bgmAudio && !this._bgmAudio.paused) return;
      try {
        if (!this._bgmAudio) {
          this._bgmAudio = new Audio(this.AUDIO_MAP.bgSound);
          this._bgmAudio.loop = true;
          this._bgmAudio.preload = 'auto';
          this._bgmAudio.addEventListener('error', (e) => {
            console.warn('[SoundManager] Piano Motif audio file error, falling back to synth BGM:', e);
            this.startFallbackSynthBGM();
          });
        }

        const vol = this.getEffectiveMusicVolume();
        this._bgmAudio.volume = Math.max(0, Math.min(1, vol));

        if (this.isMuted || vol <= 0) {
          return;
        }

        const p = this._bgmAudio.play();
        if (p !== undefined) {
          p.then(() => {
            this._bgmPlaying = true;
            console.log('[SoundManager] Background sound "Piano Motif" started playing successfully.');
          }).catch(err => {
            console.log('[SoundManager] BGM waiting for user gesture:', err.message);
          });
        }
      } catch (e) {
        console.warn('[SoundManager] Audio play exception, falling back to synth BGM:', e);
        this.startFallbackSynthBGM();
      }
    },

    startAmbientBGM() {
      this.startBGM();
    },

    playBGM() {
      this.startBGM();
    },

    pauseBGM() {
      if (this._bgmAudio) {
        this._bgmAudio.pause();
      }
      if (this._puzzleBgmAudio) {
        this._puzzleBgmAudio.pause();
      }
      if (this._bgmGain && this._bgmCtx) {
        try {
          this._bgmGain.gain.setValueAtTime(0, this._bgmCtx.currentTime);
        } catch (e) {}
      }
      this._bgmPlaying = false;
    },

    // สลับเป็นเพลงมินิเกม Tetris: audio/bg sound/puzzle_fun.mp3
    playPuzzleBGM() {
      if (this.isCallActive) return;
      this._activeBgmType = 'puzzle';

      // หยุดเพลงเดิม Piano Motif
      if (this._bgmAudio) {
        this._bgmAudio.pause();
        this._bgmPlaying = false;
      }
      if (this._bgmGain && this._bgmCtx) {
        try { this._bgmGain.gain.setValueAtTime(0, this._bgmCtx.currentTime); } catch (e) {}
      }

      if (this.isMuted) return;
      const vol = this.getEffectiveMusicVolume();
      if (vol <= 0) return;

      if (!this._puzzleBgmAudio) {
        this._puzzleBgmAudio = new Audio(this.AUDIO_MAP.puzzleBg);
        this._puzzleBgmAudio.loop = true;
        this._puzzleBgmAudio.preload = 'auto';
        this._puzzleBgmAudio.addEventListener('error', (e) => {
          console.warn('[SoundManager] puzzle_fun audio file error:', e);
        });
      }

      this._puzzleBgmAudio.volume = Math.max(0, Math.min(1, vol));
      const p = this._puzzleBgmAudio.play();
      if (p !== undefined) {
        p.then(() => {
          console.log('[SoundManager] Background sound switched to "puzzle_fun" for Tetris.');
        }).catch(err => {
          console.log('[SoundManager] puzzle_fun waiting for user gesture:', err.message);
        });
      }
    },

    // คืนค่าเพลงหลัก: audio/bg sound/Piano Motif.mp3
    restoreMainBGM() {
      if (this._activeBgmType !== 'puzzle') return;
      this._activeBgmType = 'main';

      if (this._puzzleBgmAudio) {
        this._puzzleBgmAudio.pause();
        this._puzzleBgmAudio.currentTime = 0;
      }

      if (!this.isMuted && !this.isCallActive && this.getEffectiveMusicVolume() > 0) {
        this.resumeBGMWithFade(800);
      }
    },

    // เสียงตอนกดปุ่มควบคุม Tetris (บน, ล่าง, ซ้าย, ขวา)
    playTetrisMove() {
      const vol = this.getEffectiveSFXVolume();
      if (vol <= 0 || this.isMuted) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
          this.playMouseClick();
          return;
        }
        if (!this._sfxCtx) this._sfxCtx = new AudioCtx();
        if (this._sfxCtx.state === 'suspended') this._sfxCtx.resume();

        const ctx = this._sfxCtx;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Crisp tactile mechanical click: 480Hz -> 260Hz in 35ms
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.035);

        gain.gain.setValueAtTime(0.24 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.045);
      } catch (e) {
        this.playMouseClick();
      }
    },

    // เสียงตอนหมุนแท่งบล็อก (Rotate Piece)
    playTetrisRotate() {
      const vol = this.getEffectiveSFXVolume();
      if (vol <= 0 || this.isMuted) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
          this.playMouseClick();
          return;
        }
        if (!this._sfxCtx) this._sfxCtx = new AudioCtx();
        if (this._sfxCtx.state === 'suspended') this._sfxCtx.resume();

        const ctx = this._sfxCtx;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Uplifting rotational whoosh / frequency sweep: 440Hz -> 760Hz in 65ms
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(760, now + 0.065);

        gain.gain.setValueAtTime(0.30 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } catch (e) {
        this.playMouseClick();
      }
    },

    /**
     * Resumes Piano Motif BGM smoothly ("ดนตรีค่อยดังขึ้น")
     */
    resumeBGMWithFade(fadeDurationMs = 1200) {
      if (this.isCallActive) return;
      if (this.isMuted) return;
      const targetVol = this.getEffectiveMusicVolume();
      if (targetVol <= 0) return;

      if (!this._bgmAudio) {
        this.startBGM();
        return;
      }

      try {
        this._bgmAudio.volume = 0;
        const playPromise = this._bgmAudio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            this._bgmPlaying = true;
            console.log('[SoundManager] Resuming Piano Motif BGM with smooth fade-in...');

            const startTime = performance.now();
            const step = (now) => {
              if (this.isMuted) {
                if (this._bgmAudio) this._bgmAudio.volume = 0;
                return;
              }
              const currentTarget = this.getEffectiveMusicVolume();
              const elapsed = now - startTime;
              const progress = Math.min(1, elapsed / fadeDurationMs);
              if (this._bgmAudio) {
                this._bgmAudio.volume = Math.max(0, Math.min(1, progress * currentTarget));
              }
              if (progress < 1 && this._bgmPlaying && !this.isMuted) {
                requestAnimationFrame(step);
              }
            };
            requestAnimationFrame(step);
          }).catch(err => {
            console.log('[SoundManager] Could not resume BGM:', err.message);
          });
        }
      } catch (e) {
        console.warn('[SoundManager] Error in resumeBGMWithFade:', e);
      }

      // Also support fallback synth fade-in
      if (this._bgmGain && this._bgmCtx) {
        try {
          const t = this._bgmCtx.currentTime;
          this._bgmGain.gain.cancelScheduledValues(t);
          this._bgmGain.gain.setValueAtTime(0, t);
          this._bgmGain.gain.linearRampToValueAtTime(targetVol * 0.12, t + (fadeDurationMs / 1000));
        } catch (e) {}
      }
    },

    startFallbackSynthBGM() {
      if (this._bgmPlaying) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this._bgmCtx = new AudioCtx();
        if (this._bgmCtx.state === 'suspended') {
          this._bgmCtx.resume();
        }

        this._bgmGain = this._bgmCtx.createGain();
        this._bgmFilter = this._bgmCtx.createBiquadFilter();
        this._bgmFilter.type = 'lowpass';
        this._bgmFilter.frequency.value = 520;

        const effectiveVol = this.getEffectiveMusicVolume() * 0.12;
        this._bgmGain.gain.setValueAtTime(effectiveVol, this._bgmCtx.currentTime);

        this._bgmGain.connect(this._bgmFilter);
        this._bgmFilter.connect(this._bgmCtx.destination);

        // Warm cyber ambient chord pad: A2, E3, A3, C4
        const freqs = [110, 164.81, 220, 261.63];
        freqs.forEach((freq, idx) => {
          const osc = this._bgmCtx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          osc.detune.value = (idx % 2 === 0 ? 4 : -4);
          const oscGain = this._bgmCtx.createGain();
          oscGain.gain.value = 0.22;
          osc.connect(oscGain);
          oscGain.connect(this._bgmGain);
          osc.start();
          this._bgmOscs.push(osc);
        });

        this._bgmPlaying = true;
      } catch (e) {
        // Autoplay safe fallback
      }
    },

    playTestBeep() {
      const vol = this.getEffectiveSFXVolume();
      if (vol <= 0) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        gain.gain.setValueAtTime(vol * 0.16, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch (e) {}
    },

    updateMuteUI() {
      const muteIconSvg = document.getElementById('muteIconSvg');
      if (!muteIconSvg) return;
      if (this.isMuted) {
        muteIconSvg.innerHTML = `
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="23" y1="9" x2="17" y2="15"></line>
          <line x1="17" y1="9" x2="23" y2="15"></line>
        `;
      } else {
        muteIconSvg.innerHTML = `
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        `;
      }
    }
  };

  /**
   * Settings Manager (Audio Sliders, Mute, Restart, Bug Report, Contact Us)
   */
  const SettingsManager = {
    init() {
      this.cacheDOM();
      this.bindEvents();
      this.syncUI();
    },

    cacheDOM() {
      this.screen = document.getElementById('settingsScreen');
      this.backBtn = document.getElementById('settingsBackBtn');
      this.homeBarBtn = document.getElementById('settingsHomeBarBtn');
      this.bottomBar = document.querySelector('.settings-bottom-bar');
      
      this.muteToggle = document.getElementById('muteToggle');
      this.musicSlider = document.getElementById('musicVolumeSlider');
      this.musicVal = document.getElementById('musicVolumeVal');
      this.sfxSlider = document.getElementById('sfxVolumeSlider');
      this.sfxVal = document.getElementById('sfxVolumeVal');

      // Restart Game
      this.restartBtn = document.getElementById('settingsRestartGameBtn');
      this.restartConfirmModal = document.getElementById('restartGameConfirmModal');
      this.cancelRestartBtn = document.getElementById('cancelRestartGameBtn');
      this.confirmRestartBtn = document.getElementById('confirmRestartGameBtn');

      // Bug Report
      this.bugBtn = document.getElementById('settingsBugReportBtn');
      this.bugModal = document.getElementById('bugReportModal');
      this.closeBugBtn = document.getElementById('closeBugReportBtn');
      this.submitBugBtn = document.getElementById('submitBugReportBtn');
      this.bugCategorySelect = document.getElementById('bugCategorySelect');
      this.bugDetailsInput = document.getElementById('bugDetailsInput');
      this.diagQuestStatus = document.getElementById('diagQuestStatus');

      // Contact Us
      this.contactBtn = document.getElementById('settingsContactUsBtn');
      this.contactModal = document.getElementById('contactUsModal');
      this.closeContactBtn = document.getElementById('closeContactUsBtn');
      this.doneContactBtn = document.getElementById('doneContactUsBtn');
    },

    syncUI() {
      if (this.muteToggle) {
        this.muteToggle.checked = SoundManager.isMuted;
      }
      SoundManager.updateMuteUI();

      const mPercent = Math.round(SoundManager.musicVolume * 100);
      if (this.musicSlider) this.musicSlider.value = mPercent;
      if (this.musicVal) this.musicVal.textContent = `${mPercent}%`;

      const sPercent = Math.round(SoundManager.sfxVolume * 100);
      if (this.sfxSlider) this.sfxSlider.value = sPercent;
      if (this.sfxVal) this.sfxVal.textContent = `${sPercent}%`;
    },

    onOpen() {
      this.syncUI();
      if (!SoundManager._hasUserInteracted) {
        SoundManager._hasUserInteracted = true;
        SoundManager.startAmbientBGM();
      }
    },

    bindEvents() {
      // Back & Bottom Swipe
      if (this.backBtn) {
        this.backBtn.addEventListener('click', (e) => {
          e.preventDefault();
          AppScreenManager.closeActiveApp();
        });
      }
      if (this.homeBarBtn) {
        this.homeBarBtn.addEventListener('click', (e) => {
          e.preventDefault();
          AppScreenManager.closeActiveApp();
        });
      }
      if (this.bottomBar) {
        this.bottomBar.addEventListener('click', (e) => {
          if (e.target === this.bottomBar) {
            e.preventDefault();
            AppScreenManager.closeActiveApp();
          }
        });
      }

      // Mute Toggle
      if (this.muteToggle) {
        this.muteToggle.addEventListener('change', (e) => {
          SoundManager.setMuted(e.target.checked);
        });
      }

      // Music Slider
      if (this.musicSlider) {
        this.musicSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          if (this.musicVal) this.musicVal.textContent = `${val}%`;
          SoundManager.setMusicVolume(val / 100);
        });
      }

      // SFX Slider
      if (this.sfxSlider) {
        let debounceBeep = null;
        this.sfxSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          if (this.sfxVal) this.sfxVal.textContent = `${val}%`;
          SoundManager.setSFXVolume(val / 100);
          if (debounceBeep) clearTimeout(debounceBeep);
          debounceBeep = setTimeout(() => SoundManager.playMouseClick(), 80);
        });
      }

      // Restart Game button -> Open confirmation dialog
      if (this.restartBtn) {
        this.restartBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (this.restartConfirmModal) {
            this.restartConfirmModal.removeAttribute('hidden');
            this.restartConfirmModal.classList.add('active');
          }
        });
      }

      // Cancel restart
      if (this.cancelRestartBtn) {
        this.cancelRestartBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (this.restartConfirmModal) {
            this.restartConfirmModal.classList.remove('active');
            this.restartConfirmModal.setAttribute('hidden', '');
          }
        });
      }

      // Confirm restart
      if (this.confirmRestartBtn) {
        this.confirmRestartBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.executeRestartGame();
        });
      }

      // Bug Report
      if (this.bugBtn) {
        this.bugBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.openBugReportModal();
        });
      }
      if (this.closeBugBtn) {
        this.closeBugBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.closeBugReportModal();
        });
      }
      if (this.submitBugBtn) {
        this.submitBugBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.submitBugReport();
        });
      }

      // Contact Us
      if (this.contactBtn) {
        this.contactBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.openContactUsModal();
        });
      }
      if (this.closeContactBtn) {
        this.closeContactBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.closeContactUsModal();
        });
      }
      if (this.doneContactBtn) {
        this.doneContactBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.closeContactUsModal();
        });
      }
    },

    openBugReportModal() {
      if (this.diagQuestStatus) {
        const prog = window.QuestProgressionManager;
        let qText = 'เควส 1 (น้องไก่ - กำลังดำเนินการ)';
        if (prog) {
          if (prog.quest1Status === 'cleared') {
            qText = 'เควส 1 สำเร็จแล้ว (รอเควส 2 Facebook)';
          } else if (prog.quest1Status === 'scammed') {
            qText = 'เควส 1 (ถูกหลอก - สามารถเริ่มใหม่ได้)';
          }
        }
        this.diagQuestStatus.textContent = qText;
      }
      if (this.bugModal) {
        this.bugModal.removeAttribute('hidden');
        this.bugModal.classList.add('active');
      }
    },

    closeBugReportModal() {
      if (this.bugModal) {
        this.bugModal.classList.remove('active');
        this.bugModal.setAttribute('hidden', '');
      }
      if (this.bugDetailsInput) this.bugDetailsInput.value = '';
    },

    submitBugReport() {
      const category = this.bugCategorySelect ? this.bugCategorySelect.value : 'general';
      const details = this.bugDetailsInput ? this.bugDetailsInput.value.trim() : '';
      const report = {
        id: 'bug_' + Date.now(),
        timestamp: new Date().toISOString(),
        category,
        details: details || '(ไม่มีรายละเอียดเพิ่มเติม)',
        userAgent: navigator.userAgent
      };

      try {
        const existing = JSON.parse(localStorage.getItem('zero_trust_bug_reports') || '[]');
        existing.push(report);
        localStorage.setItem('zero_trust_bug_reports', JSON.stringify(existing));
      } catch (e) {}

      this.closeBugReportModal();
      NavigationHandler._showHandlerFeedback('ส่งรายงานปัญหาเรียบร้อยแล้ว ขอบคุณที่ร่วมพัฒนา!');
    },

    openContactUsModal() {
      if (this.contactModal) {
        this.contactModal.removeAttribute('hidden');
        this.contactModal.classList.add('active');
      }
    },

    closeContactUsModal() {
      if (this.contactModal) {
        this.contactModal.classList.remove('active');
        this.contactModal.setAttribute('hidden', '');
      }
    },

    closeAllModals() {
      if (this.restartConfirmModal) {
        this.restartConfirmModal.classList.remove('active');
        this.restartConfirmModal.setAttribute('hidden', '');
      }
      if (this.bugModal) {
        this.bugModal.classList.remove('active');
        this.bugModal.setAttribute('hidden', '');
      }
      if (this.contactModal) {
        this.contactModal.classList.remove('active');
        this.contactModal.setAttribute('hidden', '');
      }
    },

    executeRestartGame() {
      console.log('[Zero-Trust Simulator] Executing Full Game Restart from Settings...');
      this.closeAllModals();

      // 1. Reset KaiChatEngine completely (memory, DOM, inputs, status tag, unhide banner)
      if (window.KaiChatEngine) {
        window.KaiChatEngine.resetChatMemory();
      }

      // 2. Clear all stored progression and simulation state
      if (window.KaiStateManager) {
        window.KaiStateManager.clearState();
        window.KaiStateManager.resetBlockedUI();
      }
      if (window.QuestProgressionManager) {
        window.QuestProgressionManager.resetProgression();
      }
      if (window.PlayerStatsManager) {
        window.PlayerStatsManager.resetStats();
      }

      // Reset Bank display
      AppScreenManager.updateBankBalanceDisplay();

      // Hide all badges and notifications
      const lineBadge = document.getElementById('lineAppBadge');
      if (lineBadge) lineBadge.setAttribute('hidden', '');
      const fbBadge = document.getElementById('facebookAppBadge');
      if (fbBadge) fbBadge.setAttribute('hidden', '');
      const lineNotif = document.getElementById('linePushNotification');
      if (lineNotif) {
        lineNotif.classList.remove('active');
        lineNotif.setAttribute('hidden', '');
      }
      const fbNotif = document.getElementById('facebookPushNotification');
      if (fbNotif) {
        fbNotif.classList.remove('active');
        fbNotif.setAttribute('hidden', '');
      }
      const bankNotif = document.getElementById('bankPushNotification');
      if (bankNotif) {
        bankNotif.classList.remove('active');
        bankNotif.setAttribute('hidden', '');
      }

      // Close settings screen & return to Home
      AppScreenManager.closeActiveApp();

      // Ensure storage remains clean after closeActiveApp
      if (window.KaiStateManager) {
        window.KaiStateManager.clearState();
        window.KaiStateManager.resetBlockedUI();
      }

      // Restart the 5-second timer for Glitch and LINE push
      if (window.QuestProgressionManager) {
        window.QuestProgressionManager.scheduleGlitchAndLineNotif(5000);
      }

      NavigationHandler._showHandlerFeedback('เริ่มเกมใหม่ทั้งหมดเรียบร้อยแล้ว');
    }
  };

  /**
   * ==========================================================================
   * MISSION 2: INCOMING SCAM CALL CENTER ENGINE
   * ==========================================================================
   */
  const Mission2CallCenter = {
    CALLER_NUMBER: '080-5656-9987-56',

    AUDIO_MAP: {
      ringtone: 'audio/call_center/ringtone/ringtone.mp3',
      npc: {
        stage1: 'audio/call_center/npc/npc_01_greeting.mp3',
        stage2_A: 'audio/call_center/npc/npc_02_threat.mp3',
        stage2_B: 'audio/call_center/npc/npc_03_demand.mp3',
        stage2_C: 'audio/call_center/npc/npc_04_notime.mp3'
      },
      player: {
        stage1_A: 'audio/call_center/player/player_a01.mp3',
        stage1_B: 'audio/call_center/player/player_b01.mp3',
        stage1_C: 'audio/call_center/player/player_c01.mp3',
        stage2_A_A: 'audio/call_center/player/player_a02.mp3',
        stage2_A_B: 'audio/call_center/player/player_b02.mp3',
        stage2_A_C: 'audio/call_center/player/player_c02.mp3',
        stage2_B_A: 'audio/call_center/player/player_a03.mp3',
        stage2_B_B: 'audio/call_center/player/player_b03.mp3',
        stage2_B_C: 'audio/call_center/player/player_c03.mp3',
        stage2_C_A: 'audio/call_center/player/player_a04.mp3',
        stage2_C_B: 'audio/call_center/player/player_b04.mp3',
        stage2_C_C: 'audio/call_center/player/player_c04.mp3'
      }
    },

    SCRIPT_TREE: {
      stage1: {
        stageId: 'stage1',
        npc: {
          text: 'สวัสดีครับ คุณมะลิใช่ไหมครับ? ผมโทรมาเรื่องเงิน 30,000 บาทที่คุณยืมไป ตอนนี้ถึงกำหนดคืนแล้วนะครับ',
          audio: 'audio/call_center/npc/npc_01_greeting.mp3'
        },
        choices: [
          {
            id: 'A',
            label: 'เงิน 30,000 บาทอะไรคะ ฉันไม่เคยยืมเงินคุณ',
            points: 10,
            category: 'safest',
            audio: 'audio/call_center/player/player_a01.mp3',
            nextStage: 'stage2_A'
          },
          {
            id: 'B',
            label: 'ขอทราบชื่อและหลักฐานการยืมเงินก่อนค่ะ',
            points: 10,
            category: 'safest',
            audio: 'audio/call_center/player/player_b01.mp3',
            nextStage: 'stage2_B'
          },
          {
            id: 'C',
            label: 'ขอโทษค่ะ ตอนนี้ยังไม่มีเงิน ขอเวลาหน่อยได้ไหมคะ',
            points: 7,
            category: 'low_safety',
            audio: 'audio/call_center/player/player_c01.mp3',
            nextStage: 'stage2_C'
          }
        ]
      },
      stage2_A: {
        stageId: 'stage2_A',
        branchName: 'กลโกงข่มขู่ประจาน',
        npc: {
          text: 'อย่ามาทำเป็นจำไม่ได้ เรามีข้อมูลคุณครบ ถ้าไม่คืนวันนี้ ผมจะโพสต์ประจานบน Facebook ให้ทุกคนรู้ แล้วจะติดต่อที่ทำงานคุณด้วย',
          audio: 'audio/call_center/npc/npc_02_threat.mp3'
        },
        choices: [
          {
            id: 'A',
            label: 'เชิญเลยค่ะ ฉันจะเก็บหลักฐานและแจ้งความ',
            points: 10,
            category: 'safest',
            audio: 'audio/call_center/player/player_a02.mp3',
            outcome: 'safe'
          },
          {
            id: 'B',
            label: 'อย่าโพสต์นะ เดี๋ยวฉันหาทางจ่ายให้',
            points: -2,
            category: 'risky',
            audio: 'audio/call_center/player/player_b02.mp3',
            outcome: 'scam'
          },
          {
            id: 'C',
            label: 'คุณมีหลักฐานการโอนเงินหรือสัญญายืมเงินไหม',
            points: 10,
            category: 'safest',
            audio: 'audio/call_center/player/player_c02.mp3',
            outcome: 'safe'
          }
        ]
      },
      stage2_B: {
        stageId: 'stage2_B',
        branchName: 'กลโกงเร่งรัดและข่มขู่ที่ทำงาน',
        npc: {
          text: 'จะเอาหลักฐานอะไรอีก ผมให้เวลาถึงวันนี้เท่านั้น ถ้าไม่จ่าย ผมจะส่งเรื่องให้ที่ทำงานคุณและโพสต์ประจานด้วย',
          audio: 'audio/call_center/npc/npc_03_demand.mp3'
        },
        choices: [
          {
            id: 'A',
            label: 'ถ้าไม่มีหลักฐาน หลังจากวางสายฉันจะแจ้งความ',
            points: 10,
            category: 'safest',
            audio: 'audio/call_center/player/player_a03.mp3',
            outcome: 'safe'
          },
          {
            id: 'B',
            label: 'อย่าเพิ่งติดต่อที่ทำงานนะ เดี๋ยวฉันถูกไล่ออก',
            points: -2,
            category: 'risky',
            audio: 'audio/call_center/player/player_b03.mp3',
            outcome: 'scam'
          },
          {
            id: 'C',
            label: 'ขอให้ส่งหลักฐานมาให้ตรวจสอบก่อนได้ไหม',
            points: 7,
            category: 'low_safety',
            audio: 'audio/call_center/player/player_c03.mp3',
            outcome: 'safe'
          }
        ]
      },
      stage2_C: {
        stageId: 'stage2_C',
        branchName: 'กลโกงจำกัดเวลาบีบให้กลัวเสียชื่อเสียง',
        npc: {
          text: 'ไม่มีเวลารอแล้วครับ ถ้าไม่จ่ายวันนี้ คุณจะเสียชื่อเสียงทั้งบน Facebook และที่ทำงาน ผมเตือนแล้วนะ',
          audio: 'audio/call_center/npc/npc_04_notime.mp3'
        },
        choices: [
          {
            id: 'A',
            label: 'ฉันจะไม่โอนเงิน จนกว่าจะตรวจสอบข้อเท็จจริงก่อน',
            points: 10,
            category: 'safest',
            audio: 'audio/call_center/player/player_a04.mp3',
            outcome: 'safe'
          },
          {
            id: 'B',
            label: 'ได้ ได้ ส่งเลขบัญชีมา ฉันจะพยายามหาเงินมาให้',
            points: -2,
            category: 'risky',
            audio: 'audio/call_center/player/player_b04.mp3',
            outcome: 'scam'
          },
          {
            id: 'C',
            label: 'ขอวางสายเพื่อตรวจสอบเรื่องนี้ก่อนก็แล้วกัน',
            points: 10,
            category: 'safest',
            audio: 'audio/call_center/player/player_c04.mp3',
            outcome: 'safe'
          }
        ]
      }
    },

    // Internal State
    _ringtoneAudio: null,
    _currentSpeechAudio: null,
    _speechTimeout: null,
    _modalTimeout: null,
    _callTimerInterval: null,
    _callSeconds: 0,
    _isIncoming: false,
    _isInCall: false,
    _currentStageKey: 'stage1',
    _sessionScore: 0,
    _hasScamAlertDeducted: false,
    _isActionHandled: false,
    _showAnswerGuideTimer: null,

    showAnswerSwipeGuide() {
      const guide = document.getElementById('swipeAnswerGuide');
      if (guide && this._isIncoming && !this._isActionHandled) {
        guide.removeAttribute('hidden');
        guide.classList.add('active');
      }
    },

    hideAnswerSwipeGuide() {
      if (this._showAnswerGuideTimer) {
        clearTimeout(this._showAnswerGuideTimer);
        this._showAnswerGuideTimer = null;
      }
      const guide = document.getElementById('swipeAnswerGuide');
      if (guide) {
        guide.classList.remove('active');
        guide.setAttribute('hidden', '');
      }
    },

    init() {
      this.initSwipeSliders();
      this.bindModalButtons();
      console.log('[Mission2CallCenter] Engine initialized successfully.');
    },

    /**
     * Start Incoming Call Screen with Ringtone & Sound Wave Animation
     */
    startIncomingCall() {
      if (this._isIncoming || this._isInCall) {
        console.log('[Mission2CallCenter] Call already incoming or active.');
        return;
      }

      console.log(`[Mission2CallCenter] Incoming call initiated from: ${this.CALLER_NUMBER}`);
      this._isIncoming = true;
      this._isActionHandled = false;

      // Reset swipe thumbs to start position & clear gesture state
      const declineThumb = document.getElementById('swipeDeclineThumb');
      if (declineThumb) {
        if (typeof declineThumb._resetSlider === 'function') declineThumb._resetSlider();
        declineThumb.style.transition = 'none';
        declineThumb.style.transform = 'translateX(0px)';
      }
      const answerThumb = document.getElementById('swipeAnswerThumb');
      if (answerThumb) {
        if (typeof answerThumb._resetSlider === 'function') answerThumb._resetSlider();
        answerThumb.style.transition = 'none';
        answerThumb.style.transform = 'translateX(0px)';
      }

      // Show Incoming Call Screen
      const screen = document.getElementById('incomingCallScreen');
      if (screen) {
        screen.removeAttribute('hidden');
        void screen.offsetWidth;
        screen.classList.add('active');
      }

      // Show Answer Guide after 2.0s delay as requested: "ปุ่มไกด์ เปลี่ยนเป็น สายเข้า หน่วง 2 วินาที"
      this.hideAnswerSwipeGuide();
      this._showAnswerGuideTimer = setTimeout(() => {
        this.showAnswerSwipeGuide();
      }, 2000);

      // Play Ringtone loop
      this.playRingtone();
    },

    /**
     * User slides right to decline call
     */
    declineCall() {
      this.hideAnswerSwipeGuide();
      if (this._isActionHandled) return;
      this._isActionHandled = true;
      console.log('[Mission2CallCenter] Call declined by player. Stopping ringtone and returning Home.');

      this.stopRingtone();
      this.stopSpeechAudio();

      const screen = document.getElementById('incomingCallScreen');
      if (screen) {
        screen.classList.remove('active');
        screen.setAttribute('hidden', '');
      }

      this._isIncoming = false;
      this._isInCall = false;

      // Unlock call active flag & resume game BGM
      SoundManager.isCallActive = false;
      SoundManager.resumeBGMWithFade(1000);

      // Return to Home screen using existing navigation
      AppScreenManager.closeActiveApp();
    },

    /**
     * User slides left to answer call
     */
    answerCall() {
      this.hideAnswerSwipeGuide();
      if (this._isActionHandled) return;
      this._isActionHandled = true;
      console.log('[Mission2CallCenter] Call answered by player. Entering active call conversation...');

      // 1. Stop ringtone immediately
      this.stopRingtone();

      // 2. Stop Background Music immediately and lock out BGM during call
      SoundManager.isCallActive = true;
      SoundManager.pauseBGM();

      // 3. Hide incoming screen
      const incomingScreen = document.getElementById('incomingCallScreen');
      if (incomingScreen) {
        incomingScreen.classList.remove('active');
        incomingScreen.setAttribute('hidden', '');
      }
      this._isIncoming = false;

      // 4. Open active call screen
      const activeScreen = document.getElementById('activeCallScreen');
      if (activeScreen) {
        activeScreen.removeAttribute('hidden');
        void activeScreen.offsetWidth;
        activeScreen.classList.add('active');
      }
      this._isInCall = true;

      // 5. Reset session score and scam deduction flag
      this._sessionScore = 0;
      this._hasScamAlertDeducted = false;
      this.updateLiveScore(0);
      this.startCallTimer();

      // 6. Reset dialogue container
      const dialogueArea = document.getElementById('callDialogueArea');
      if (dialogueArea) dialogueArea.innerHTML = '';

      // 7. Start Stage 1 conversation
      this.startStage('stage1');
    },

    /**
     * Play Ringtone Loop
     */
    playRingtone() {
      this.stopRingtone();
      try {
        SoundManager.pauseBGM();
        this._ringtoneAudio = new Audio(this.AUDIO_MAP.ringtone);
        this._ringtoneAudio.loop = true;
        this._ringtoneAudio.volume = SoundManager.getEffectiveSFXVolume();
        const p = this._ringtoneAudio.play();
        if (p !== undefined) {
          p.catch(err => {
            console.log('[Mission2CallCenter] Ringtone waiting for user interaction:', err.message);
          });
        }
      } catch (e) {
        console.warn('[Mission2CallCenter] Ringtone playback error:', e);
      }
    },

    /**
     * Stop Ringtone immediately
     */
    stopRingtone() {
      if (this._ringtoneAudio) {
        try {
          this._ringtoneAudio.pause();
          this._ringtoneAudio.currentTime = 0;
        } catch (e) {}
        this._ringtoneAudio = null;
      }
    },

    /**
     * Play speech audio with error recovery and safety fallback
     */
    playSpeechAudio(src, onStart, onEnded) {
      this.stopSpeechAudio();
      if (typeof onStart === 'function') onStart();

      const vol = SoundManager.getEffectiveSFXVolume();
      if (vol <= 0 || SoundManager.isMuted) {
        this._speechTimeout = setTimeout(() => {
          if (typeof onEnded === 'function') onEnded();
        }, 1800);
        return;
      }

      try {
        const audio = new Audio(src);
        audio.volume = Math.max(0, Math.min(1, vol));
        this._currentSpeechAudio = audio;

        let finished = false;
        const handleFinish = () => {
          if (finished) return;
          finished = true;
          if (this._speechTimeout) clearTimeout(this._speechTimeout);
          this._speechTimeout = null;
          this._currentSpeechAudio = null;
          if (typeof onEnded === 'function') onEnded();
        };

        audio.addEventListener('ended', handleFinish, { once: true });
        audio.addEventListener('error', (err) => {
          console.warn('[Mission2CallCenter] Speech audio file missing or error:', src, err);
          handleFinish();
        }, { once: true });

        // Safety fallback timer (~6.5s) to guarantee simulator never hangs
        this._speechTimeout = setTimeout(() => {
          if (!finished) {
            console.log('[Mission2CallCenter] Speech audio timeout fallback triggered for:', src);
            handleFinish();
          }
        }, 6500);

        const p = audio.play();
        if (p !== undefined) {
          p.catch(() => {
            handleFinish();
          });
        }
      } catch (e) {
        console.warn('[Mission2CallCenter] Speech audio play exception:', e);
        if (typeof onEnded === 'function') onEnded();
      }
    },

    /**
     * Stop currently playing speech audio immediately
     */
    stopSpeechAudio() {
      if (this._speechTimeout) {
        clearTimeout(this._speechTimeout);
        this._speechTimeout = null;
      }
      if (this._currentSpeechAudio) {
        try {
          this._currentSpeechAudio.pause();
          this._currentSpeechAudio.currentTime = 0;
        } catch (e) {}
        this._currentSpeechAudio = null;
      }
    },

    /**
     * Start conversation stage (render NPC dialogue & play NPC voice)
     */
    startStage(stageKey) {
      this._currentStageKey = stageKey;
      const stageData = this.SCRIPT_TREE[stageKey];
      if (!stageData) return;

      const dialogueArea = document.getElementById('callDialogueArea');
      const choicesGroup = document.getElementById('callChoicesGroup');
      const choicePrompt = document.getElementById('callChoicePrompt');

      if (choicesGroup) choicesGroup.classList.add('disabled');
      if (choicePrompt) choicePrompt.textContent = 'เจ้าหน้าที่กำลังพูด...';

      // Create NPC speech card
      const npcCard = document.createElement('div');
      npcCard.className = 'call-speech-card card-npc';
      npcCard.innerHTML = `
        <div class="speech-card-header">
          <span class="speech-speaker-tag">NPC — มิจฉาชีพ (ทวงหนี้ข่มขู่)</span>
          <div class="voice-equalizer-bars speaking" data-eq="npc">
            <span class="eq-bar"></span>
            <span class="eq-bar"></span>
            <span class="eq-bar"></span>
            <span class="eq-bar"></span>
          </div>
        </div>
        <div class="speech-card-text">${stageData.npc.text}</div>
      `;

      if (dialogueArea) {
        dialogueArea.appendChild(npcCard);
        dialogueArea.scrollTop = dialogueArea.scrollHeight;
      }

      // Play NPC Audio sequentially
      this.playSpeechAudio(stageData.npc.audio,
        () => {
          const eq = npcCard.querySelector('[data-eq="npc"]');
          if (eq) eq.classList.add('speaking');
        },
        () => {
          const eq = npcCard.querySelector('[data-eq="npc"]');
          if (eq) eq.classList.remove('speaking');
          this.renderChoices(stageData.choices);
        }
      );
    },

    /**
     * Render player choice options (A, B, C)
     */
    renderChoices(choices) {
      this._isChoiceProcessing = false;
      const choicesGroup = document.getElementById('callChoicesGroup');
      const choicePrompt = document.getElementById('callChoicePrompt');
      if (!choicesGroup) return;

      choicesGroup.innerHTML = '';
      choicesGroup.classList.remove('disabled');
      if (choicePrompt) choicePrompt.textContent = 'กรุณาเลือกคำตอบของคุณ:';

      choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'call-choice-btn';
        btn.setAttribute('data-choice-id', choice.id);
        btn.innerHTML = `
          <span class="choice-letter-badge">[${choice.id}]</span>
          <span class="choice-btn-text">${choice.label}</span>
        `;

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handlePlayerChoice(choice);
        });

        choicesGroup.appendChild(btn);
      });
    },

    /**
     * Process player selection
     */
    handlePlayerChoice(choice) {
      if (this._isChoiceProcessing) return;
      this._isChoiceProcessing = true;

      const choicesGroup = document.getElementById('callChoicesGroup');
      const choicePrompt = document.getElementById('callChoicePrompt');
      if (choicesGroup) {
        choicesGroup.classList.add('disabled');
        const btns = choicesGroup.querySelectorAll('button');
        btns.forEach(b => b.disabled = true);
      }
      if (choicePrompt) choicePrompt.textContent = 'คุณกำลังตอบกลับ...';

      // Record score
      this._sessionScore += choice.points;
      this.updateLiveScore(this._sessionScore);

      if (window.PlayerStatsManager) {
        window.PlayerStatsManager.recordChoice(
          choice.points,
          choice.category,
          this._currentStageKey,
          choice.id
        );
      }

      // Render player speech card without revealing score
      const dialogueArea = document.getElementById('callDialogueArea');
      const playerCard = document.createElement('div');
      playerCard.className = 'call-speech-card card-player';

      playerCard.innerHTML = `
        <div class="speech-card-header">
          <span class="speech-speaker-tag">คุณมะลิ (ผู้เล่น)</span>
          <div class="voice-equalizer-bars speaking" data-eq="player">
            <span class="eq-bar"></span>
            <span class="eq-bar"></span>
            <span class="eq-bar"></span>
            <span class="eq-bar"></span>
          </div>
        </div>
        <div class="speech-card-text">"${choice.label}"</div>
      `;

      if (dialogueArea) {
        dialogueArea.appendChild(playerCard);
        dialogueArea.scrollTop = dialogueArea.scrollHeight;
      }

      // Play player voice sequentially
      this.playSpeechAudio(choice.audio,
        () => {
          const eq = playerCard.querySelector('[data-eq="player"]');
          if (eq) eq.classList.add('speaking');
        },
        () => {
          const eq = playerCard.querySelector('[data-eq="player"]');
          if (eq) eq.classList.remove('speaking');

          // Next action
          if (this._modalTimeout) clearTimeout(this._modalTimeout);
          if (choice.nextStage) {
            this._modalTimeout = setTimeout(() => {
              this.startStage(choice.nextStage);
            }, 350);
          } else if (choice.outcome === 'scam') {
            this._modalTimeout = setTimeout(() => {
              this.showScamAlertModal();
            }, 500);
          } else if (choice.outcome === 'safe') {
            this._modalTimeout = setTimeout(() => {
              this.showSafeWinModal();
            }, 500);
          }
        }
      );
    },

    /**
     * Show Scam Alert Modal ("ถูกหลอก")
     */
    showScamAlertModal() {
      console.log('[Mission2CallCenter] Showing Scam Alert Modal.');
      this.stopSpeechAudio();
      this.stopCallTimer();

      // Deduct 10 points ONCE per simulation
      if (!this._hasScamAlertDeducted) {
        this._hasScamAlertDeducted = true;
        this._sessionScore -= 10;
        this.updateLiveScore(this._sessionScore);

        if (window.PlayerStatsManager) {
          window.PlayerStatsManager.recordScamDeduction(0);
        }
      }

      const scoreEl = document.getElementById('m2ScamScoreVal');
      if (scoreEl) {
        scoreEl.textContent = `${this._sessionScore > 0 ? '+' : ''}${this._sessionScore} คะแนน`;
      }
      const totalScoreEl = document.getElementById('m2ScamTotalScoreVal');
      if (totalScoreEl && window.PlayerStatsManager) {
        totalScoreEl.textContent = `${window.PlayerStatsManager.getScore()} คะแนน`;
      }

      const scamModal = document.getElementById('mission2ScamAlertModal');
      if (scamModal) {
        scamModal.removeAttribute('hidden');
      }

      // Mark status as scammed for progression & 2-minute retry scheduling
      if (window.QuestProgressionManager) {
        window.QuestProgressionManager.setQuest2CallStatus('scammed');
      }
    },

    /**
     * Show Safe Clear Modal
     */
    showSafeWinModal() {
      console.log('[Mission2CallCenter] Showing Safe Win Modal.');
      this.stopSpeechAudio();
      this.stopCallTimer();

      // Mark status as cleared - stops any further repeated incoming calls!
      if (window.QuestProgressionManager) {
        window.QuestProgressionManager.setQuest2CallStatus('cleared');
      }

      const scoreEl = document.getElementById('m2SafeScoreVal');
      if (scoreEl) {
        scoreEl.textContent = `+${this._sessionScore} คะแนน`;
      }
      const totalScoreEl = document.getElementById('m2SafeTotalScoreVal');
      if (totalScoreEl && window.PlayerStatsManager) {
        totalScoreEl.textContent = `${window.PlayerStatsManager.getScore()} คะแนน`;
      }

      const safeModal = document.getElementById('mission2SafeModal');
      if (safeModal) {
        safeModal.removeAttribute('hidden');
      }
    },

    /**
     * Close all call screens/modals, restore BGM, and return to Home
     */
    closeAllAndReturnHome() {
      console.log('[Mission2CallCenter] Closing call screens and returning Home...');
      if (this._modalTimeout) {
        clearTimeout(this._modalTimeout);
        this._modalTimeout = null;
      }
      this.stopRingtone();
      this.stopSpeechAudio();
      this.stopCallTimer();

      const incomingScreen = document.getElementById('incomingCallScreen');
      if (incomingScreen) {
        incomingScreen.classList.remove('active');
        incomingScreen.setAttribute('hidden', '');
      }
      const activeScreen = document.getElementById('activeCallScreen');
      if (activeScreen) {
        activeScreen.classList.remove('active');
        activeScreen.setAttribute('hidden', '');
      }
      const safeModal = document.getElementById('mission2SafeModal');
      if (safeModal) safeModal.setAttribute('hidden', '');
      const scamModal = document.getElementById('mission2ScamAlertModal');
      if (scamModal) scamModal.setAttribute('hidden', '');

      this._isIncoming = false;
      this._isInCall = false;

      // Restore Background Music smoothly
      SoundManager.isCallActive = false;
      SoundManager.resumeBGMWithFade(1000);

      // Return Home using main navigation
      AppScreenManager.closeActiveApp();
    },

    /**
     * Reset call state for retry
     */
    resetMission() {
      if (this._modalTimeout) {
        clearTimeout(this._modalTimeout);
        this._modalTimeout = null;
      }
      if (this._speechTimeout) {
        clearTimeout(this._speechTimeout);
        this._speechTimeout = null;
      }
      this.stopRingtone();
      this.stopSpeechAudio();
      this.stopCallTimer();

      const safeModal = document.getElementById('mission2SafeModal');
      if (safeModal) safeModal.setAttribute('hidden', '');
      const scamModal = document.getElementById('mission2ScamAlertModal');
      if (scamModal) scamModal.setAttribute('hidden', '');

      const activeScreen = document.getElementById('activeCallScreen');
      if (activeScreen) {
        activeScreen.classList.remove('active');
        activeScreen.setAttribute('hidden', '');
      }

      // Clear dialogue container and choices
      const dialogueArea = document.getElementById('callDialogueArea');
      if (dialogueArea) dialogueArea.innerHTML = '';
      const choicesGroup = document.getElementById('callChoicesGroup');
      if (choicesGroup) {
        choicesGroup.innerHTML = '';
        choicesGroup.classList.remove('disabled');
      }
      const choicePrompt = document.getElementById('callChoicePrompt');
      if (choicePrompt) choicePrompt.textContent = '';

      this._isIncoming = false;
      this._isInCall = false;
      this._sessionScore = 0;
      this._hasScamAlertDeducted = false;
      this._isActionHandled = false;
      this._isChoiceProcessing = false;
      this._currentStageKey = 'stage1';
      this.updateLiveScore(0);

      // Reset SoundManager call active lock
      if (window.SoundManager) {
        window.SoundManager.isCallActive = false;
      }

      this.hideAnswerSwipeGuide();

      // Reset swipe gesture thumbs
      const declineThumb = document.getElementById('swipeDeclineThumb');
      if (declineThumb && typeof declineThumb._resetSlider === 'function') {
        declineThumb._resetSlider();
      }
      const answerThumb = document.getElementById('swipeAnswerThumb');
      if (answerThumb && typeof answerThumb._resetSlider === 'function') {
        answerThumb._resetSlider();
      }

      if (window.QuestProgressionManager) {
        window.QuestProgressionManager.setQuest2CallStatus('in_progress');
        if (window.QuestProgressionManager._m2CallTimer) {
          clearTimeout(window.QuestProgressionManager._m2CallTimer);
          window.QuestProgressionManager._m2CallTimer = null;
        }
      }
    },

    /**
     * Called when Home screen is returned to
     */
    onReturnHome() {
      this.hideAnswerSwipeGuide();
      this.stopRingtone();
      this.stopSpeechAudio();
      this.stopCallTimer();
      SoundManager.isCallActive = false;
    },

    /**
     * Timer during active call
     */
    startCallTimer() {
      this.stopCallTimer();
      this._callSeconds = 0;
      this.updateCallTimerDisplay();
      this._callTimerInterval = setInterval(() => {
        this._callSeconds++;
        this.updateCallTimerDisplay();
      }, 1000);
    },

    stopCallTimer() {
      if (this._callTimerInterval) {
        clearInterval(this._callTimerInterval);
        this._callTimerInterval = null;
      }
      this._callSeconds = 0;
      const timerEl = document.getElementById('callTimer');
      if (timerEl) timerEl.textContent = '00:00';
    },

    updateCallTimerDisplay() {
      const timerEl = document.getElementById('callTimer');
      if (!timerEl) return;
      const mins = String(Math.floor(this._callSeconds / 60)).padStart(2, '0');
      const secs = String(this._callSeconds % 60).padStart(2, '0');
      timerEl.textContent = `${mins}:${secs}`;
    },

    updateLiveScore(score) {
      const scoreEl = document.getElementById('m2LiveScore');
      if (scoreEl) {
        scoreEl.textContent = `${score > 0 ? '+' : ''}${score}`;
        scoreEl.style.color = score < 0 ? '#f87171' : '#38bdf8';
      }
    },

    /**
     * Call Action Buttons (Tap to Decline / Answer)
     */
    initSwipeSliders() {
      const declineThumb = document.getElementById('swipeDeclineThumb');
      const answerThumb = document.getElementById('swipeAnswerThumb');
      const declineTrack = document.getElementById('swipeDeclineTrack');
      const answerTrack = document.getElementById('swipeAnswerTrack');
      const guide = document.getElementById('swipeAnswerGuide');

      const triggerDecline = () => {
        this.hideAnswerSwipeGuide();
        this.declineCall();
      };

      const triggerAnswer = () => {
        this.hideAnswerSwipeGuide();
        this.answerCall();
      };

      if (declineThumb) {
        declineThumb.addEventListener('click', (e) => {
          e.preventDefault();
          triggerDecline();
        });
        declineThumb.addEventListener('pointerdown', () => {
          triggerDecline();
        });
        declineThumb._resetSlider = () => {};
      }

      if (answerThumb) {
        answerThumb.addEventListener('click', (e) => {
          e.preventDefault();
          triggerAnswer();
        });
        answerThumb.addEventListener('pointerdown', () => {
          triggerAnswer();
        });
        answerThumb._resetSlider = () => {};
      }

      if (guide) {
        guide.addEventListener('click', (e) => {
          e.preventDefault();
          triggerAnswer();
        });
      }

      if (declineTrack) {
        declineTrack.addEventListener('click', (e) => {
          if (e.target !== declineThumb && !declineThumb.contains(e.target)) {
            triggerDecline();
          }
        });
      }

      if (answerTrack) {
        answerTrack.addEventListener('click', (e) => {
          if (e.target !== answerThumb && !answerThumb.contains(e.target)) {
            triggerAnswer();
          }
        });
      }
    },

    bindModalButtons() {
      // Safe Modal Home Button
      const safeHomeBtn = document.getElementById('m2SafeHomeBtn');
      if (safeHomeBtn) {
        safeHomeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.closeAllAndReturnHome();
        });
      }

      // Scam Modal Home Button
      const scamHomeBtn = document.getElementById('m2ScamHomeBtn');
      if (scamHomeBtn) {
        scamHomeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.closeAllAndReturnHome();
        });
      }

      // Scam Modal Retry Button
      const scamRetryBtn = document.getElementById('m2ScamRetryBtn');
      if (scamRetryBtn) {
        scamRetryBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.resetMission();
          setTimeout(() => {
            this.startIncomingCall();
          }, 200);
        });
      }

      // Active Call Screen Hangup Button
      const hangupBtn = document.getElementById('activeCallHangupBtn');
      if (hangupBtn) {
        hangupBtn.addEventListener('click', (e) => {
          e.preventDefault();
          console.log('[Mission2CallCenter] Player clicked Hangup button during call.');
          this.closeAllAndReturnHome();
        });
      }
    }
  };

  /**
   * MISSION 03: น้องจ๊อด (งานออนไลน์รายได้ดี)
   * Connects Facebook -> LINE -> Mobile Banking simulating an online job recruitment scam
   * demanding a 100,000 THB deposit.
   */
  const Mission3JodEngine = {
    currentStageIndex: 0,
    sessionScore: 0,
    scamPenaltyApplied: false,
    isBlocked: false,
    isDialogueActive: false,
    _timeouts: [],
    _commentGuideTimer: null,

    showCommentGuide() {
      const commentArea = document.getElementById('fbDynamicCommentArea');
      if (commentArea && commentArea.dataset.submitted === 'true') {
        return;
      }
      const guide = document.getElementById('fbCommentGuide');
      if (guide) {
        guide.removeAttribute('hidden');
        guide.classList.add('active');
      }
    },

    hideCommentGuide() {
      if (this._commentGuideTimer) {
        clearTimeout(this._commentGuideTimer);
        this._commentGuideTimer = null;
      }
      const guide = document.getElementById('fbCommentGuide');
      if (guide) {
        guide.classList.remove('active');
        guide.setAttribute('hidden', '');
      }
    },

    SCRIPT: {
      // Scene 2: LINE Greetings
      greetings: [
        {
          sender: 'jod',
          text: 'สวัสดีครับ ผมน้องจ๊อด เจ้าหน้าที่ประสานงานของ BrightWork Connect ครับ เห็นคุณสนใจตำแหน่งแอดมินออนไลน์ใช่ไหมครับ',
          delay: 300
        },
        {
          sender: 'jod',
          text: 'งานนี้เหมาะกับมือใหม่ครับ มีคู่มือและทีมสอนงานให้ ช่วงแรกจะมีงานฝึกทำตามขั้นตอน ไม่จำเป็นต้องมีประสบการณ์มาก่อนครับ',
          delay: 500
        },
        {
          sender: 'jod',
          text: 'ผมส่งรายละเอียดตำแหน่งกับขั้นตอนสมัครให้ดูก่อนนะครับ ถ้ามีข้อสงสัยถามผมได้เลย',
          delay: 500
        }
      ],

      // Scene 2: Stage 1 Choices (STRICT: No score badges displayed!)
      stage1Choices: [
        {
          id: 'A',
          label: 'ขอชื่อบริษัทและเลขทะเบียนนิติบุคคลก่อนค่ะ ฉันจะตรวจสอบข้อมูลจากแหล่งทางการก่อนสมัคร',
          userText: 'ขอชื่อบริษัทและเลขทะเบียนนิติบุคคลก่อนค่ะ ฉันจะตรวจสอบข้อมูลจากแหล่งทางการก่อนสมัคร',
          points: 10,
          category: 'safest'
        },
        {
          id: 'B',
          label: 'ขอดูรายละเอียดหน้าที่และเงื่อนไขการจ้างทั้งหมดก่อนนะคะ',
          userText: 'ขอดูรายละเอียดหน้าที่และเงื่อนไขการจ้างทั้งหมดก่อนนะคะ',
          points: 7,
          category: 'low_safety'
        },
        {
          id: 'C',
          label: 'น่าสนใจมากค่ะ ถ้ารายได้ดีแบบนี้ ฉันพร้อมเริ่มงานเลย ต้องทำอะไรบ้างคะ',
          userText: 'น่าสนใจมากค่ะ ถ้ารายได้ดีแบบนี้ ฉันพร้อมเริ่มงานเลย ต้องทำอะไรบ้างคะ',
          points: -2,
          category: 'risky'
        }
      ],

      stage1Replies: {
        A: 'ได้ครับ ผมส่งข้อมูลที่มีให้ก่อนนะครับ คุณสามารถตรวจสอบรายละเอียดจากแหล่งทางการได้เลยครับ',
        B: 'ได้ครับ ผมส่งรายละเอียดงานให้ครบก่อน คุณจะได้พิจารณาเงื่อนไขต่าง ๆ ครับ',
        C: 'ดีเลยครับ ผมจะช่วยแนะนำทีละขั้นตอน คุณไม่ต้องกังวลเรื่องประสบการณ์มากครับ'
      },

      // Scene 3: แบบฝึกหัดก่อนเริ่มงาน
      scene3Intro: {
        sender: 'jod',
        text: 'ก่อนเข้ารอบสุดท้าย ผมมีแบบฝึกหัดสั้น ๆ ให้ลองทำครับ เป็นงานจัดข้อมูลและตรวจสอบข้อความทั่วไป ใช้เวลาไม่นานครับ'
      },
      scene3PostExercise: [
        'ทำได้ดีเลยครับ คุณเรียนรู้เร็วมาก ผมคิดว่าคุณน่าจะเหมาะกับตำแหน่งนี้ครับ',
        'ผมจะส่งผลประเมินให้ฝ่ายรับสมัครตรวจสอบ แล้วจะแจ้งขั้นตอนถัดไปนะครับ'
      ],

      // Scene 4: แจ้งผลการคัดเลือก
      scene4Messages: [
        'ยินดีด้วยครับ คุณผ่านการคัดเลือกเบื้องต้นแล้วครับ',
        'ขั้นตอนต่อไปเป็นการยืนยันสิทธิ์ก่อนเริ่มงาน ผมจะอธิบายเงื่อนไขให้ฟังนะครับ',
        'ตำแหน่งนี้มีผู้สนใจหลายคนครับ ถ้าคุณยังสนใจอยู่ ผมแนะนำให้ตรวจสอบรายละเอียดให้ครบและดำเนินการภายในรอบรับสมัครนี้ครับ'
      ],

      // Scene 5: แจ้งเงื่อนไขเงินมัดจำ
      scene5Messages: [
        'สำหรับขั้นตอนยืนยันสิทธิ์ ทางเราระบุเงินมัดจำ 100,000 บาทครับ โดยเจ้าหน้าที่แจ้งว่าจะคืนตามเงื่อนไขที่กำหนดหลังผ่านขั้นตอนเริ่มงาน',
        'ผมเข้าใจครับว่าจำนวนเงินค่อนข้างสูง คุณควรอ่านเงื่อนไขให้ละเอียดก่อนตัดสินใจครับ',
        'แต่ผมต้องแจ้งให้ทราบว่า รอบนี้มีผู้สมัครสำรองอยู่ด้วย หากคุณไม่ยืนยันภายในเวลาที่กำหนด สิทธิ์อาจถูกส่งต่อให้ผู้สมัครรายอื่นครับ'
      ],

      // Scene 5: Stage 2 Choices (STRICT: No score badges displayed!)
      stage2Choices: [
        {
          id: 'A',
          label: 'ฉันจะไม่โอนเงินค่ะ จนกว่าจะตรวจสอบบริษัทและเงื่อนไขการจ้างจากแหล่งอิสระได้อย่างชัดเจน',
          userText: 'ฉันจะไม่โอนเงินค่ะ จนกว่าจะตรวจสอบบริษัทและเงื่อนไขการจ้างจากแหล่งอิสระได้อย่างชัดเจน',
          points: 10,
          category: 'safest',
          outcome: 'safe'
        },
        {
          id: 'B',
          label: 'ขอเอกสารสัญญา เงื่อนไขการคืนเงิน และข้อมูลบริษัทเป็นลายลักษณ์อักษรก่อนค่ะ ฉันจะตรวจสอบให้เรียบร้อย',
          userText: 'ขอเอกสารสัญญา เงื่อนไขการคืนเงิน และข้อมูลบริษัทเป็นลายลักษณ์อักษรก่อนค่ะ ฉันจะตรวจสอบให้เรียบร้อย',
          points: 7,
          category: 'low_safety',
          outcome: 'safe'
        },
        {
          id: 'C',
          label: 'ฉันกลัวเสียโอกาสค่ะ ถ้าจำเป็นต้องจ่ายเพื่อยืนยันสิทธิ์ ฉันจะพยายามหาเงินมาโอน',
          userText: 'ฉันกลัวเสียโอกาสค่ะ ถ้าจำเป็นต้องจ่ายเพื่อยืนยันสิทธิ์ ฉันจะพยายามหาเงินมาโอน',
          points: -2,
          category: 'risky',
          outcome: 'bank'
        }
      ],

      stage2Replies: {
        A: 'เข้าใจครับ คุณมีสิทธิ์ตรวจสอบข้อมูลก่อนตัดสินใจครับ',
        B: 'ได้ครับ ผมจะส่งรายละเอียดที่มีให้ คุณควรตรวจสอบความถูกต้องของเอกสารและบริษัทจากแหล่งอิสระด้วยครับ',
        C: 'ผมเข้าใจครับ แต่รอบรับสมัครมีเวลาจำกัด อย่าลืมพิจารณาเงื่อนไขให้ครบก่อนดำเนินการนะครับ'
      },

      // Scene 6: Mobile Banking — จุดตัดสินใจสุดท้าย
      scene6Messages: [
        'นี่คือรายละเอียดสำหรับขั้นตอนยืนยันสิทธิ์ครับ จำนวนเงินมัดจำ 100,000 บาท ก่อนดำเนินการ กรุณาตรวจสอบชื่อบัญชี จำนวนเงิน และเงื่อนไขให้ครบถ้วนครับ',
        'หากยังมีข้อสงสัย คุณสามารถหยุดตรวจสอบก่อนได้ครับ แต่ถ้ารอบรับสมัครสิ้นสุดลง อาจต้องสมัครในรอบถัดไปครับ'
      ],

      // Scene 6: Stage 3 Choices in Chat (A-B-C อยู่ต่อจากแชทที่ NPC ส่ง link ให้!)
      stage3Choices: [
        {
          id: 'A',
          label: 'ยกเลิกการโอนก่อนค่ะ ฉันจะตรวจสอบบริษัทและผู้รับเงินจากช่องทางอิสระก่อน',
          userText: 'ยกเลิกการโอนก่อนค่ะ ฉันจะตรวจสอบบริษัทและผู้รับเงินจากช่องทางอิสระก่อน',
          points: 10,
          category: 'safest',
          outcome: 'safe'
        },
        {
          id: 'B',
          label: 'ฉันจะหยุดทำรายการและขอตรวจสอบสัญญา รวมถึงเงื่อนไขการคืนเงินก่อนตัดสินใจค่ะ',
          userText: 'ฉันจะหยุดทำรายการและขอตรวจสอบสัญญา รวมถึงเงื่อนไขการคืนเงินก่อนตัดสินใจค่ะ',
          points: 7,
          category: 'low_safety',
          outcome: 'safe'
        },
        {
          id: 'C',
          label: 'ฉันจะยืนยันการโอนเงิน 100,000 บาท เพราะไม่อยากเสียโอกาสได้งานนี้ค่ะ',
          userText: 'ฉันจะยืนยันการโอนเงิน 100,000 บาท เพราะไม่อยากเสียโอกาสได้งานนี้ค่ะ',
          points: -2,
          category: 'risky',
          outcome: 'bank'
        }
      ]
    },

    init() {
      this.bindFacebookEvents();
      this.bindJodConvoEvents();
      this.bindModalButtons();
    },

    bindFacebookEvents() {
      const fbBackBtn = document.getElementById('facebookBackBtn');
      if (fbBackBtn) {
        fbBackBtn.addEventListener('click', (e) => {
          e.preventDefault();
          AppScreenManager.closeActiveApp();
        });
      }

      const fbHomeBarBtn = document.getElementById('facebookHomeBarBtn');
      if (fbHomeBarBtn) {
        fbHomeBarBtn.addEventListener('click', (e) => {
          e.preventDefault();
          AppScreenManager.closeActiveApp();
        });
      }

      const quickBtn = document.getElementById('fbQuickInterestBtn');
      if (quickBtn) {
        quickBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.hideCommentGuide();
          const input = document.getElementById('fbCommentInput');
          if (input) input.value = 'สนใจ';
          this.submitFacebookComment('สนใจ');
        });
      }

      const sendBtn = document.getElementById('fbSendCommentBtn');
      if (sendBtn) {
        sendBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.hideCommentGuide();
          const input = document.getElementById('fbCommentInput');
          const val = input ? input.value.trim() : '';
          this.submitFacebookComment(val || 'สนใจ');
        });
      }

      const guide = document.getElementById('fbCommentGuide');
      if (guide) {
        guide.addEventListener('click', (e) => {
          e.preventDefault();
          this.hideCommentGuide();
          const input = document.getElementById('fbCommentInput');
          if (input) input.focus();
        });
      }

      const input = document.getElementById('fbCommentInput');
      if (input) {
        input.addEventListener('focus', () => this.hideCommentGuide());
        input.addEventListener('input', () => this.hideCommentGuide());
        input.addEventListener('click', () => this.hideCommentGuide());
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.hideCommentGuide();
            this.submitFacebookComment(input.value.trim() || 'สนใจ');
          }
        });
      }
    },

    bindJodConvoEvents() {
      const backBtn = document.getElementById('jodConvoBackBtn');
      if (backBtn) {
        backBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const jodScreen = document.getElementById('jodConvoScreen');
          if (jodScreen) {
            jodScreen.classList.remove('active');
            jodScreen.setAttribute('hidden', '');
          }
          AppScreenManager.openApp('line');
        });
      }

      const homeBtn = document.getElementById('jodConvoHomeBtn');
      if (homeBtn) {
        homeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          AppScreenManager.closeActiveApp();
        });
      }

      // Choice buttons
      ['A', 'B', 'C'].forEach(choiceId => {
        const btn = document.getElementById(`jodChoiceBtn${choiceId}`);
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handlePlayerChoice(choiceId);
          });
        }
      });

      // Text input support
      const sendBtn = document.getElementById('jodConvoSendBtn');
      const textInput = document.getElementById('jodConvoTextInput');
      const handleInput = () => {
        if (!textInput) return;
        const val = textInput.value.trim().toUpperCase();
        textInput.value = '';
        if (val === 'A' || val === 'ก' || val === '1') this.handlePlayerChoice('A');
        else if (val === 'B' || val === 'ข' || val === '2') this.handlePlayerChoice('B');
        else if (val === 'C' || val === 'ค' || val === '3') this.handlePlayerChoice('C');
      };
      if (sendBtn) {
        sendBtn.addEventListener('click', (e) => {
          e.preventDefault();
          handleInput();
        });
      }
      if (textInput) {
        textInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleInput();
          }
        });
      }
    },

    bindModalButtons() {
      const safeHomeBtn = document.getElementById('m3SafeHomeBtn');
      if (safeHomeBtn) {
        safeHomeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.closeModalsAndReturnHome();
        });
      }

      const scamHomeBtn = document.getElementById('m3ScamHomeBtn');
      if (scamHomeBtn) {
        scamHomeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.closeModalsAndReturnHome();
        });
      }

      const scamRetryBtn = document.getElementById('m3ScamRetryBtn');
      if (scamRetryBtn) {
        scamRetryBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.retryMission();
        });
      }
    },

    onOpenFacebook() {
      console.log('[Mission3JodEngine] Opened Facebook screen');
      this.hideCommentGuide();
      const commentArea = document.getElementById('fbDynamicCommentArea');
      if (!commentArea || commentArea.dataset.submitted !== 'true') {
        this._commentGuideTimer = setTimeout(() => {
          this.showCommentGuide();
        }, 4500);
      }
    },

    submitFacebookComment(commentText) {
      this.hideCommentGuide();
      const commentArea = document.getElementById('fbDynamicCommentArea');
      if (!commentArea) return;

      if (commentArea.dataset.submitted === 'true') {
        return;
      }
      commentArea.dataset.submitted = 'true';

      const input = document.getElementById('fbCommentInput');
      if (input) {
        input.value = '';
        input.disabled = true;
      }
      const quickBtn = document.getElementById('fbQuickInterestBtn');
      if (quickBtn) quickBtn.disabled = true;

      if (window.SoundManager) {
        window.SoundManager.playPlayerChat();
      }

      // Render player's comment
      const playerItem = document.createElement('div');
      playerItem.className = 'fb-comment-item player-comment';
      playerItem.innerHTML = `
        <div class="fb-comment-avatar" style="background: #2563eb;">ม</div>
        <div class="fb-comment-bubble">
          <span class="fb-commenter-name">มะลิ มะลิวรรณ</span>
          <span class="fb-comment-text">${this._escapeHTML(commentText)}</span>
        </div>
      `;
      commentArea.appendChild(playerItem);

      // Scroll feed to bottom
      const feed = document.querySelector('.facebook-feed-scroll');
      if (feed) feed.scrollTop = feed.scrollHeight;

      // Author replies after 500ms
      const t = setTimeout(() => {
        if (window.SoundManager) {
          window.SoundManager.playAudio('message');
        }

        const replyItem = document.createElement('div');
        replyItem.className = 'fb-comment-item author-reply';
        replyItem.innerHTML = `
          <div class="fb-comment-avatar fb-author-avatar-mini">BW</div>
          <div class="fb-comment-bubble reply-bubble">
            <div class="reply-author-row">
              <span class="fb-commenter-name">BrightWork Connect</span>
              <span class="author-badge">ผู้เขียน</span>
            </div>
            <span class="fb-comment-text">ขอบคุณที่สนใจค่ะ 😊 รบกวนติดต่อเจ้าหน้าที่ผ่าน LINE ตามลิงก์นี้ เพื่อรับรายละเอียดการสมัครและขั้นตอนการคัดเลือกนะคะ</span>
            <div class="fb-reply-action-wrap">
              <button type="button" class="fb-line-connect-btn" id="fbToLineJodBtn">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.86 7.02l-.98 3.59a.5.5 0 0 0 .68.6l4.02-1.74c.78.21 1.6.33 2.42.33 5.52 0 10-4.03 10-9s-4.48-9-10-9z"/>
                </svg>
                <span>แชท LINE กับ "น้องจ๊อด" ฝ่ายบุคคล</span>
                <span class="fb-btn-arrow">➔</span>
              </button>
            </div>
          </div>
        `;
        commentArea.appendChild(replyItem);

        if (feed) feed.scrollTop = feed.scrollHeight;

        // Wire button to open LINE chat with Jod
        const lineBtn = replyItem.querySelector('#fbToLineJodBtn');
        if (lineBtn) {
          lineBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.openConvo();
          });
        }
      }, 500);
      this._timeouts.push(t);
    },

    openConvo() {
      console.log('[Mission3JodEngine] Opening LINE convo with น้องจ๊อด');
      this.hideCommentGuide();

      // Hide Facebook screen if open
      const fbScreen = document.getElementById('facebookScreen');
      if (fbScreen) {
        fbScreen.classList.remove('active');
        fbScreen.setAttribute('hidden', '');
      }

      // Hide general line chat screen if open, show Jod convo screen
      const lineScreen = document.getElementById('lineChatScreen');
      if (lineScreen) {
        lineScreen.removeAttribute('hidden');
        lineScreen.classList.add('active');
      }

      const jodScreen = document.getElementById('jodConvoScreen');
      if (jodScreen) {
        jodScreen.removeAttribute('hidden');
        void jodScreen.offsetWidth;
        jodScreen.classList.add('active');
      }

      AppScreenManager._activeAppId = 'line';

      const prog = window.QuestProgressionManager ? window.QuestProgressionManager.loadProgression() : {};
      if (prog.quest3_jod === 'cleared') {
        this.renderBlockedState();
        return;
      }

      // If starting fresh
      if (this.currentStageIndex === 0 && !this.isDialogueActive) {
        this.startStage1Dialogue();
      }
    },

    startStage1Dialogue() {
      this.isDialogueActive = true;
      this.currentStageIndex = 0;

      let cumDelay = 100;
      this.SCRIPT.greetings.forEach((msg, idx) => {
        cumDelay += msg.delay;
        const t = setTimeout(() => {
          this.showTyping(true);
          const t2 = setTimeout(() => {
            this.showTyping(false);
            this.appendJodBubble(msg.text);

            if (idx === this.SCRIPT.greetings.length - 1) {
              const t3 = setTimeout(() => {
                this.presentStage1Choices();
              }, 300);
              this._timeouts.push(t3);
            }
          }, 350);
          this._timeouts.push(t2);
        }, cumDelay);
        this._timeouts.push(t);
      });
    },

    presentStage1Choices() {
      this.currentStageIndex = 1;
      const choicesBox = document.getElementById('jodDecisionChoicesBox');
      const inputArea = document.getElementById('jodConvoInputArea');

      this.SCRIPT.stage1Choices.forEach(choice => {
        const labelEl = document.getElementById(`jodChoiceLabel${choice.id}`);
        if (labelEl) {
          // STRICT REQUIREMENT: No scores displayed on choice buttons!
          labelEl.textContent = choice.label;
        }
      });

      if (choicesBox) choicesBox.removeAttribute('hidden');
      if (inputArea) inputArea.removeAttribute('hidden');
      this.scrollToBottom();
    },

    handlePlayerChoice(choiceId) {
      const choicesBox = document.getElementById('jodDecisionChoicesBox');
      if (choicesBox) choicesBox.setAttribute('hidden', '');

      if (this.currentStageIndex === 1) {
        // Stage 1 Choices (Scene 2)
        const choice = this.SCRIPT.stage1Choices.find(c => c.id === choiceId);
        if (!choice) return;

        this.appendUserBubble(choice.userText);

        // Record score behind the scenes (No score badge in dialogue)
        if (window.PlayerStatsManager) {
          window.PlayerStatsManager.recordChoice(choice.points, choice.category, 1, choiceId);
        }
        this.sessionScore += choice.points;

        const replyText = this.SCRIPT.stage1Replies[choiceId];

        // Jod replies, then moves to Scene 3 (Simulated Exercise)
        this.showTyping(true);
        const t1 = setTimeout(() => {
          this.showTyping(false);
          this.appendJodBubble(replyText);

          const t2 = setTimeout(() => {
            this.startScene3Exercise();
          }, 400);
          this._timeouts.push(t2);
        }, 400);
        this._timeouts.push(t1);

      } else if (this.currentStageIndex === 2) {
        // Stage 2 Choices (Scene 5: Deposit Demand)
        const choice = this.SCRIPT.stage2Choices.find(c => c.id === choiceId);
        if (!choice) return;

        this.appendUserBubble(choice.userText);

        // Record score behind the scenes
        if (window.PlayerStatsManager) {
          window.PlayerStatsManager.recordChoice(choice.points, choice.category, 2, choiceId);
        }
        this.sessionScore += choice.points;

        const replyText = this.SCRIPT.stage2Replies[choiceId];

        this.showTyping(true);
        const t1 = setTimeout(() => {
          this.showTyping(false);
          this.appendJodBubble(replyText);

          if (choice.outcome === 'safe') {
            // Safe Path (Choices A and B): Player refuses deposit or demands verified written contract
            const t2 = setTimeout(() => {
              this.appendSystemNotice('คุณหยุดตรวจสอบก่อนโอนเงิน ไม่ตัดสินใจเพียงเพราะข้อเสนอรายได้สูงหรือกลัวเสียโอกาส 🛡️');
              this.renderBlockedState();

              if (window.QuestProgressionManager) {
                window.QuestProgressionManager.setQuest3Status('cleared');
              }

              const t3 = setTimeout(() => {
                this.showSafeWinModal();
              }, 600);
              this._timeouts.push(t3);
            }, 600);
            this._timeouts.push(t2);

          } else {
            // Choice C: Player fears losing opportunity, proceeds to Scene 6
            const t2 = setTimeout(() => {
              this.startScene6Banking();
            }, 600);
            this._timeouts.push(t2);
          }
        }, 400);
        this._timeouts.push(t1);

      } else if (this.currentStageIndex === 6) {
        // Stage 3 Choices (Scene 6: Final decision in chat right after NPC link!)
        const choice = this.SCRIPT.stage3Choices.find(c => c.id === choiceId);
        if (!choice) return;

        this.appendUserBubble(choice.userText);

        if (window.PlayerStatsManager) {
          window.PlayerStatsManager.recordChoice(choice.points, choice.category, 3, choiceId);
        }
        this.sessionScore += choice.points;

        if (choice.outcome === 'safe') {
          // Choice A or B: Player stops / cancels transfer in chat -> Safe Win!
          const t1 = setTimeout(() => {
            this.appendSystemNotice('คุณหยุดตรวจสอบก่อนโอนเงิน ไม่ตัดสินใจเพียงเพราะข้อเสนอรายได้สูงหรือกลัวเสียโอกาส 🛡️');
            this.renderBlockedState();

            if (window.QuestProgressionManager) {
              window.QuestProgressionManager.setQuest3Status('cleared');
            }

            const t2 = setTimeout(() => {
              this.showSafeWinModal();
            }, 600);
            this._timeouts.push(t2);
          }, 600);
          this._timeouts.push(t1);

        } else {
          // Choice C: Player confirms they want to transfer 100,000 THB -> Opens Mobile Banking to execute transfer!
          const t1 = setTimeout(() => {
            AppScreenManager.openBankForMission3(true, 100000);
          }, 600);
          this._timeouts.push(t1);
        }
      }
    },

    // Scene 3: แบบฝึกหัดก่อนเริ่มงาน
    startScene3Exercise() {
      this.currentStageIndex = 3;
      this.showTyping(true);
      const t = setTimeout(() => {
        this.showTyping(false);
        this.appendJodBubble(this.SCRIPT.scene3Intro.text);

        const t2 = setTimeout(() => {
          this.appendExerciseBubble();
        }, 400);
        this._timeouts.push(t2);
      }, 400);
      this._timeouts.push(t);
    },

    appendExerciseBubble() {
      const stream = document.getElementById('jodConvoStream');
      const typing = document.getElementById('jodTypingIndicator');
      if (!stream) return;

      const row = document.createElement('div');
      row.className = 'chat-msg-row msg-kai';
      row.innerHTML = `
        <div class="kai-avatar-mini" style="background: linear-gradient(135deg, #4CAF50, #388E3C);">จ๊อด</div>
        <div class="msg-content-wrapper">
          <span class="sender-name">น้องจ๊อด (BrightWork)</span>
          <div class="bubble-and-time">
            <div class="jod-exercise-card">
              <div class="exercise-header">
                <span>📝</span>
                <span>แบบฝึกหัดจำลอง: ตรวจสอบและจัดหมวดหมู่ข้อมูล</span>
              </div>
              <div class="exercise-body">
                <div class="exercise-task-item">
                  <span>1. ตรวจสอบข้อมูลสินค้าและจัดหมวดหมู่</span>
                  <span class="exercise-tag-done">✓ ผ่านการตรวจ</span>
                </div>
                <div class="exercise-task-item">
                  <span>2. ตอบกลับข้อความลูกค้าตามเทมเพลต</span>
                  <span class="exercise-tag-done">✓ ผ่านการตรวจ</span>
                </div>
              </div>
              <button type="button" class="exercise-submit-btn" id="jodSubmitExerciseBtn">
                <span>ส่งแบบฝึกหัด</span> <span>➔</span>
              </button>
            </div>
            <span class="msg-time">${this._getCurrentTimeStr()}</span>
          </div>
        </div>
      `;

      if (typing && typing.parentNode === stream) {
        stream.insertBefore(row, typing);
      } else {
        stream.appendChild(row);
      }

      const submitBtn = row.querySelector('#jodSubmitExerciseBtn');
      if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.submitExercise(submitBtn);
        });
      }
      this.scrollToBottom();
    },

    submitExercise(submitBtn) {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '✓ ส่งแบบฝึกหัดเรียบร้อยแล้ว';
        submitBtn.style.background = '#059669';
      }

      if (window.SoundManager) {
        window.SoundManager.playPlayerChat();
      }

      // Jod responds with Scene 3 post-exercise messages
      let cumDelay = 100;
      this.SCRIPT.scene3PostExercise.forEach((msg, idx) => {
        cumDelay += 500;
        const t = setTimeout(() => {
          this.showTyping(true);
          const t2 = setTimeout(() => {
            this.showTyping(false);
            this.appendJodBubble(msg);

            if (idx === this.SCRIPT.scene3PostExercise.length - 1) {
              const t3 = setTimeout(() => {
                this.startScene4Selection();
              }, 400);
              this._timeouts.push(t3);
            }
          }, 350);
          this._timeouts.push(t2);
        }, cumDelay);
        this._timeouts.push(t);
      });
    },

    // Scene 4: แจ้งผลการคัดเลือก
    startScene4Selection() {
      this.currentStageIndex = 4;
      let cumDelay = 100;
      this.SCRIPT.scene4Messages.forEach((msg, idx) => {
        cumDelay += 500;
        const t = setTimeout(() => {
          this.showTyping(true);
          const t2 = setTimeout(() => {
            this.showTyping(false);
            this.appendJodBubble(msg);

            if (idx === this.SCRIPT.scene4Messages.length - 1) {
              const t3 = setTimeout(() => {
                this.startScene5DepositDemand();
              }, 400);
              this._timeouts.push(t3);
            }
          }, 350);
          this._timeouts.push(t2);
        }, cumDelay);
        this._timeouts.push(t);
      });
    },

    // Scene 5: แจ้งเงื่อนไขเงินมัดจำ
    startScene5DepositDemand() {
      this.currentStageIndex = 5;
      let cumDelay = 100;
      this.SCRIPT.scene5Messages.forEach((msg, idx) => {
        cumDelay += 500;
        const t = setTimeout(() => {
          this.showTyping(true);
          const t2 = setTimeout(() => {
            this.showTyping(false);
            this.appendJodBubble(msg);

            if (idx === this.SCRIPT.scene5Messages.length - 1) {
              const t3 = setTimeout(() => {
                this.presentStage2Choices();
              }, 300);
              this._timeouts.push(t3);
            }
          }, 350);
          this._timeouts.push(t2);
        }, cumDelay);
        this._timeouts.push(t);
      });
    },

    presentStage2Choices() {
      this.currentStageIndex = 2;
      const choicesBox = document.getElementById('jodDecisionChoicesBox');
      const inputArea = document.getElementById('jodConvoInputArea');

      this.SCRIPT.stage2Choices.forEach(choice => {
        const labelEl = document.getElementById(`jodChoiceLabel${choice.id}`);
        if (labelEl) {
          // STRICT REQUIREMENT: No scores displayed on choice buttons!
          labelEl.textContent = choice.label;
        }
      });

      if (choicesBox) choicesBox.removeAttribute('hidden');
      if (inputArea) inputArea.removeAttribute('hidden');
      this.scrollToBottom();
    },

    // Scene 6: Mobile Banking — ส่งข้อความและลิงก์รายละเอียดโอนเงินในแชท
    startScene6Banking() {
      this.currentStageIndex = 6;
      let cumDelay = 100;
      this.SCRIPT.scene6Messages.forEach((msg, idx) => {
        cumDelay += 500;
        const t = setTimeout(() => {
          this.showTyping(true);
          const t2 = setTimeout(() => {
            this.showTyping(false);
            this.appendJodBubble(msg);

            if (idx === this.SCRIPT.scene6Messages.length - 1) {
              const t3 = setTimeout(() => {
                // ส่งการ์ด/ลิงก์รายละเอียดบัญชี
                this.appendJodBankCardBubble('กรุณาตรวจสอบรายละเอียดบัญชีและเงื่อนไขการโอนเงินมัดจำครับ');

                // ต่อจากแชทที่ NPC ส่งลิงก์ ให้แสดงตัวเลือก A - B - C ในห้องแชททันที!
                const t4 = setTimeout(() => {
                  this.presentStage3Choices();
                }, 300);
                this._timeouts.push(t4);

              }, 300);
              this._timeouts.push(t3);
            }
          }, 350);
          this._timeouts.push(t2);
        }, cumDelay);
        this._timeouts.push(t);
      });
    },

    presentStage3Choices() {
      this.currentStageIndex = 6;
      const choicesBox = document.getElementById('jodDecisionChoicesBox');
      const inputArea = document.getElementById('jodConvoInputArea');

      this.SCRIPT.stage3Choices.forEach(choice => {
        const labelEl = document.getElementById(`jodChoiceLabel${choice.id}`);
        if (labelEl) {
          // STRICT REQUIREMENT: No scores displayed on choice buttons!
          labelEl.textContent = choice.label;
        }
      });

      if (choicesBox) choicesBox.removeAttribute('hidden');
      if (inputArea) inputArea.removeAttribute('hidden');
      this.scrollToBottom();
    },

    onBankTransferCompleted(amount = 100000) {
      console.log('[Mission3JodEngine] Bank transfer completed:', amount);
      this.appendUserSlipBubble(amount, 'นายสมคิด ม้าเงิน', '088-2-99120-4');

      this.showTyping(true);
      const t = setTimeout(() => {
        this.showTyping(false);
        this.appendJodBubble('ได้รับยอดมัดจำ 100,000 บาทแล้วครับ รอคิวอบรม...');

        const t2 = setTimeout(() => {
          this.appendSystemNotice('⚠️ บัญชี "น้องจ๊อด" ได้บล็อกการติดต่อ และปิดเพจหนีทันที...');
          this.renderBlockedState();

          const t3 = setTimeout(() => {
            this.showScamAlertModal();
          }, 600);
          this._timeouts.push(t3);
        }, 600);
        this._timeouts.push(t2);
      }, 500);
      this._timeouts.push(t);
    },

    playScamAlarmSound() {
      if (window.SoundManager && typeof window.SoundManager.playScamAlarm === 'function') {
        window.SoundManager.playScamAlarm();
      } else {
        const sfxVol = window.SoundManager ? window.SoundManager.getEffectiveSFXVolume() : 1;
        if (sfxVol <= 0) return;
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
            gain.gain.linearRampToValueAtTime(0.25 * sfxVol, t + 0.02);
            gain.gain.setValueAtTime(0.25 * sfxVol, t + 0.22);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.25);
            osc.start(t);
            osc.stop(t + 0.26);
          }
        } catch (e) {}
      }
    },

    showSafeWinModal() {
      const modal = document.getElementById('mission3SafeModal');
      const scoreEl = document.getElementById('m3SafeScoreVal');
      const totalScoreEl = document.getElementById('m3SafeTotalScoreVal');

      if (scoreEl) {
        scoreEl.textContent = this.sessionScore > 0 ? `+${this.sessionScore} คะแนน` : `${this.sessionScore} คะแนน`;
      }
      if (totalScoreEl && window.PlayerStatsManager) {
        totalScoreEl.textContent = `${window.PlayerStatsManager.getScore()} คะแนน`;
      }
      if (modal) modal.removeAttribute('hidden');
    },

    showScamAlertModal() {
      // Play Scam Alarm Sound! (เสียงไซเรนเตือนภัยถูกหลอก)
      this.playScamAlarmSound();

      // Deduct -10 once per scam failure
      if (!this.scamPenaltyApplied) {
        if (window.PlayerStatsManager) {
          window.PlayerStatsManager.recordScamDeduction(100000);
        }
        this.sessionScore -= 10;
        this.scamPenaltyApplied = true;
      }

      if (window.QuestProgressionManager) {
        window.QuestProgressionManager.setQuest3Status('scammed');
      }

      const modal = document.getElementById('mission3ScamAlertModal');
      const scoreEl = document.getElementById('m3ScamScoreVal');
      const totalScoreEl = document.getElementById('m3ScamTotalScoreVal');

      if (scoreEl) {
        scoreEl.textContent = `${this.sessionScore} คะแนน`;
      }
      if (totalScoreEl && window.PlayerStatsManager) {
        totalScoreEl.textContent = `${window.PlayerStatsManager.getScore()} คะแนน`;
      }
      if (modal) modal.removeAttribute('hidden');
    },

    renderBlockedState() {
      this.isBlocked = true;
      const banner = document.getElementById('jodBlockedBanner');
      if (banner) banner.removeAttribute('hidden');
      const choicesBox = document.getElementById('jodDecisionChoicesBox');
      if (choicesBox) choicesBox.setAttribute('hidden', '');
      const inputArea = document.getElementById('jodConvoInputArea');
      if (inputArea) inputArea.setAttribute('hidden', '');
      const statusTag = document.getElementById('jodStatusTag');
      if (statusTag) statusTag.innerHTML = '<span style="color:#ef4444;">● บล็อกแล้ว</span>';
    },

    retryMission() {
      this.clearTimeouts();
      const safeModal = document.getElementById('mission3SafeModal');
      if (safeModal) safeModal.setAttribute('hidden', '');
      const scamModal = document.getElementById('mission3ScamAlertModal');
      if (scamModal) scamModal.setAttribute('hidden', '');

      // Reset state
      this.currentStageIndex = 0;
      this.sessionScore = 0;
      this.scamPenaltyApplied = false;
      this.isBlocked = false;
      this.isDialogueActive = false;

      // Reset UI elements
      const banner = document.getElementById('jodBlockedBanner');
      if (banner) banner.setAttribute('hidden', '');
      const statusTag = document.getElementById('jodStatusTag');
      if (statusTag) statusTag.innerHTML = '<span class="online-dot"></span> ออนไลน์';

      // Clear dynamic comments in Facebook screen
      const commentArea = document.getElementById('fbDynamicCommentArea');
      if (commentArea) {
        commentArea.innerHTML = '';
        delete commentArea.dataset.submitted;
      }
      const fbInput = document.getElementById('fbCommentInput');
      if (fbInput) {
        fbInput.disabled = false;
        fbInput.value = '';
      }
      const quickBtn = document.getElementById('fbQuickInterestBtn');
      if (quickBtn) quickBtn.disabled = false;

      // Clear chat messages in stream, keeping date badge and typing indicator
      const stream = document.getElementById('jodConvoStream');
      if (stream) {
        const rows = stream.querySelectorAll('.chat-msg-row, .convo-date-badge:not(:first-child)');
        rows.forEach(r => r.remove());
      }

      // Re-start dialogue cleanly
      this.openConvo();
    },

    closeModalsAndReturnHome() {
      this.clearTimeouts();
      const safeModal = document.getElementById('mission3SafeModal');
      if (safeModal) safeModal.setAttribute('hidden', '');
      const scamModal = document.getElementById('mission3ScamAlertModal');
      if (scamModal) scamModal.setAttribute('hidden', '');

      AppScreenManager.closeActiveApp();
    },

    onReturnHome() {
      this.clearTimeouts();
      this.hideCommentGuide();
    },

    clearTimeouts() {
      this._timeouts.forEach(t => clearTimeout(t));
      this._timeouts = [];
    },

    // Bubble renderers
    appendJodBubble(text) {
      if (window.SoundManager) {
        window.SoundManager.playNpcChat();
      }
      const stream = document.getElementById('jodConvoStream');
      const typing = document.getElementById('jodTypingIndicator');
      if (!stream) return;

      const row = document.createElement('div');
      row.className = 'chat-msg-row msg-kai';
      row.innerHTML = `
        <div class="kai-avatar-mini" style="background: linear-gradient(135deg, #4CAF50, #388E3C);">จ๊อด</div>
        <div class="msg-content-wrapper">
          <span class="sender-name">น้องจ๊อด (BrightWork)</span>
          <div class="bubble-and-time">
            <div class="kai-bubble">${this._escapeHTML(text)}</div>
            <span class="msg-time">${this._getCurrentTimeStr()}</span>
          </div>
        </div>
      `;

      if (typing && typing.parentNode === stream) {
        stream.insertBefore(row, typing);
      } else {
        stream.appendChild(row);
      }
      this.scrollToBottom();
    },

    appendJodBankCardBubble(text) {
      if (window.SoundManager) {
        window.SoundManager.playNpcChat();
      }
      const stream = document.getElementById('jodConvoStream');
      const typing = document.getElementById('jodTypingIndicator');
      if (!stream) return;

      const row = document.createElement('div');
      row.className = 'chat-msg-row msg-kai';
      row.innerHTML = `
        <div class="kai-avatar-mini" style="background: linear-gradient(135deg, #4CAF50, #388E3C);">จ๊อด</div>
        <div class="msg-content-wrapper">
          <span class="sender-name">น้องจ๊อด (BrightWork)</span>
          <div class="bubble-and-time">
            <div class="kai-bubble" style="background:#ffffff; color:#1e293b; border:1px solid #cbd5e1; width:100%; max-width:280px; padding:12px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <p style="margin:0 0 8px 0; font-size:15.5px; line-height:1.45;">${this._escapeHTML(text)}</p>
              <div style="background:#f8fafc; border-radius:8px; padding:10px; border:1px solid #e2e8f0; font-size:15px; margin-bottom:10px;">
                <div style="font-weight:700; color:#1e3a8a; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <span>🏦</span> บัญชีโอนเงินมัดจำรับรองงาน
                </div>
                <div><strong>ชื่อบัญชี:</strong> นายสมคิด ม้าเงิน</div>
                <div><strong>เลขบัญชี:</strong> 088-2-99120-4 (ธ.พาณิชย์)</div>
                <div style="margin-top:4px;"><strong>จำนวนเงิน:</strong> <strong style="color:#dc2626; font-size:16.5px;">100,000 บาท</strong></div>
              </div>
              <button type="button" class="jod-open-bank-btn" id="jodOpenBankBtn" style="width:100%; background:linear-gradient(135deg,#0056b3,#003366); color:#fff; border:none; border-radius:8px; padding:9px 12px; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                <span>📲</span> <span>เปิด Mobile Banking เพื่อดำเนินการ</span>
              </button>
            </div>
            <span class="msg-time">${this._getCurrentTimeStr()}</span>
          </div>
        </div>
      `;

      if (typing && typing.parentNode === stream) {
        stream.insertBefore(row, typing);
      } else {
        stream.appendChild(row);
      }

      // Wire bank button
      const openBankBtn = row.querySelector('#jodOpenBankBtn');
      if (openBankBtn) {
        openBankBtn.addEventListener('click', (e) => {
          e.preventDefault();
          AppScreenManager.openBankForMission3(true, 100000);
        });
      }

      this.scrollToBottom();
    },

    appendUserBubble(text) {
      if (window.SoundManager) {
        window.SoundManager.playPlayerChat();
      }
      const stream = document.getElementById('jodConvoStream');
      const typing = document.getElementById('jodTypingIndicator');
      if (!stream) return;

      const row = document.createElement('div');
      row.className = 'chat-msg-row msg-user';
      row.innerHTML = `
        <div class="user-meta-left">
          <span class="read-receipt">อ่านแล้ว</span>
          <span class="msg-time">${this._getCurrentTimeStr()}</span>
        </div>
        <div class="user-bubble">${this._escapeHTML(text)}</div>
      `;

      if (typing && typing.parentNode === stream) {
        stream.insertBefore(row, typing);
      } else {
        stream.appendChild(row);
      }
      this.scrollToBottom();
    },

    appendUserSlipBubble(amount = 100000, recipientName = 'นายสมคิด ม้าเงิน', recipientAcc = '088-2-99120-4') {
      if (window.SoundManager) {
        window.SoundManager.playPlayerChat();
      }
      const stream = document.getElementById('jodConvoStream');
      const typing = document.getElementById('jodTypingIndicator');
      if (!stream) return;

      const time = this._getCurrentTimeStr();
      const formattedAmt = parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const row = document.createElement('div');
      row.className = 'chat-msg-row msg-user';
      row.innerHTML = `
        <div class="user-meta-left">
          <span class="read-receipt">อ่านแล้ว</span>
          <span class="msg-time">${time}</span>
        </div>
        <div class="user-slip-bubble-wrap">
          <div class="user-slip-card">
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
          </div>
        </div>
      `;

      if (typing && typing.parentNode === stream) {
        stream.insertBefore(row, typing);
      } else {
        stream.appendChild(row);
      }
      this.scrollToBottom();
    },

    appendSystemNotice(text) {
      const stream = document.getElementById('jodConvoStream');
      const typing = document.getElementById('jodTypingIndicator');
      if (!stream) return;

      const row = document.createElement('div');
      row.className = 'convo-date-badge';
      row.style.background = 'rgba(239, 68, 68, 0.88)';
      row.style.color = '#ffffff';
      row.style.padding = '6px 14px';
      row.style.margin = '10px auto';
      row.innerHTML = `<span>${this._escapeHTML(text)}</span>`;

      if (typing && typing.parentNode === stream) {
        stream.insertBefore(row, typing);
      } else {
        stream.appendChild(row);
      }
      this.scrollToBottom();
    },

    showTyping(show) {
      const typing = document.getElementById('jodTypingIndicator');
      if (!typing) return;
      if (show) {
        typing.removeAttribute('hidden');
      } else {
        typing.setAttribute('hidden', '');
      }
      this.scrollToBottom();
    },

    scrollToBottom() {
      const stream = document.getElementById('jodConvoStream');
      if (stream) {
        stream.scrollTop = stream.scrollHeight;
      }
    },

    _getCurrentTimeStr() {
      const now = new Date();
      return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    },

    _escapeHTML(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  /**
   * Application Feedback Handler
   */
  const NavigationHandler = {
    resetSimulationState() {
      if (typeof SettingsManager !== 'undefined') {
        SettingsManager.executeRestartGame();
      }
    },
    _showHandlerFeedback(appName) {
      console.log(`[Zero-Trust Simulator] App icon clicked: "${appName}"`);
      window.dispatchEvent(new CustomEvent('zerotrust:app:click', {
        bubbles: true,
        detail: { appName, timestamp: Date.now() }
      }));
    }
  };

  /**
   * Login / Start Screen Manager
   * Coordinates the initial Start / Login screen before entering Home.
   */
  const LoginManager = {
    _hasTriggeredHome: false,
    _noticeTimer: null,

    init() {
      const startBtn = document.getElementById('loginStartBtn');
      const googleBtn = document.getElementById('loginGoogleBtn');
      const guestBtn = document.getElementById('loginGuestBtn');

      if (startBtn) {
        startBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleStartGame();
        });
      }

      if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          window.ZeroTrustAuth?.google();
        });
      }

      if (guestBtn) {
        guestBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleStartGame();
        });
      }

      console.log('[LoginManager] Initialized. Start/Login Screen ready.');
    },

    handleStartGame() {
      const loginScreen = document.getElementById('loginScreen');
      if (!loginScreen || loginScreen.hasAttribute('hidden')) return;

      if (window.SoundManager && typeof window.SoundManager.play === 'function') {
        window.SoundManager.play('mouse-click');
      }

      // Hide login screen cleanly using existing project screen conventions
      loginScreen.classList.remove('active');
      loginScreen.setAttribute('hidden', '');

      // Ensure active app in AppScreenManager is set to Home (null)
      if (window.AppScreenManager) {
        window.AppScreenManager._activeAppId = null;
      }

      console.log('[Zero-Trust Simulator] START clicked: Transitioned from Login to Home Screen');

      // Now start the Home triggers progression safely (Quest 1 / Quest 2 timer)
      if (window.QuestProgressionManager && !this._hasTriggeredHome) {
        this._hasTriggeredHome = true;
        window.QuestProgressionManager.initHomeTriggers();
      }
    },

    showNotice(providerName) {
      if (window.SoundManager && typeof window.SoundManager.play === 'function') {
        window.SoundManager.play('mouse-click');
      }

      const noticeEl = document.getElementById('loginAuthNotice');
      const noticeText = document.getElementById('loginAuthNoticeText');
      const msg = `${providerName} — Coming Soon (Authentication ยังไม่พร้อมใช้งาน)`;

      if (noticeEl && noticeText) {
        noticeText.textContent = msg;
        noticeEl.removeAttribute('hidden');
        if (this._noticeTimer) clearTimeout(this._noticeTimer);
        this._noticeTimer = setTimeout(() => {
          noticeEl.setAttribute('hidden', '');
        }, 3200);
      }

      if (window.ZeroTrustNavigator && typeof window.ZeroTrustNavigator._showHandlerFeedback === 'function') {
        window.ZeroTrustNavigator._showHandlerFeedback(msg);
      }
    },

    showLoginScreen() {
      const loginScreen = document.getElementById('loginScreen');
      if (loginScreen) {
        loginScreen.removeAttribute('hidden');
        void loginScreen.offsetWidth;
        loginScreen.classList.add('active');
        if (window.AppScreenManager) {
          window.AppScreenManager._activeAppId = 'login';
        }
      }
    },

    hideLoginScreen() {
      const loginScreen = document.getElementById('loginScreen');
      if (loginScreen) {
        loginScreen.classList.remove('active');
        loginScreen.setAttribute('hidden', '');
        if (window.AppScreenManager) {
          window.AppScreenManager._activeAppId = null;
        }
      }
    }
  };

  /**
   * Server Ranking Leaderboard Manager
   */
  const ServerRankingManager = {
    BENCHMARK_PLAYERS: [
      { name: 'นายธนาคาร สติสตรอง', title: 'Zero-Trust Master', score: 320, mission: 220, minigame: 100 },
      { name: 'กัปตันไซเบอร์', title: 'Cyber Defender', score: 280, mission: 200, minigame: 80 },
      { name: 'นักสืบโซเชียล', title: 'Scam Hunter', score: 240, mission: 180, minigame: 60 },
      { name: 'ป้ามะลิรู้ทัน', title: 'Safe Citizen', score: 210, mission: 160, minigame: 50 },
      { name: 'น้องเกมเมอร์ Pro', title: 'Tetris Challenger', score: 185, mission: 110, minigame: 75 },
      { name: 'ลุงสมชาย ปลอดภัยไว้ก่อน', title: 'Cautious Guard', score: 160, mission: 130, minigame: 30 },
      { name: 'สารวัตรไฮเทค', title: 'Tech Investigator', score: 140, mission: 120, minigame: 20 },
      { name: 'เทพเตตริส 99', title: 'Arcade Specialist', score: 120, mission: 50, minigame: 70 },
      { name: 'พี่วิน รู้ทันแก๊งคอล', title: 'Street Smart', score: 95, mission: 80, minigame: 15 },
      { name: 'ครูนิด ป้องกันภัย', title: 'Cyber Educator', score: 75, mission: 65, minigame: 10 },
      { name: 'พี่หมอ ดูแลข้อมูล', title: 'Careful Guardian', score: 50, mission: 40, minigame: 10 },
      { name: 'เด็กช่าง ไม่เชื่อใครง่าย', title: 'Critical Thinker', score: 25, mission: 20, minigame: 5 }
    ],

    init() {
      this.bindEvents();
      this.updateRankingData();
    },

    bindEvents() {
      const openBtns = [
        document.getElementById('openRankingBtn'),
        document.getElementById('statsTopRankingBtn'),
        document.getElementById('statsHeroRankingBtn'),
        document.getElementById('minigameOpenRankingBtn'),
        document.getElementById('tetrisViewRankingBtn')
      ];

      openBtns.forEach(btn => {
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.openRankingModal();
          });
        }
      });

      const closeBtns = [
        document.getElementById('closeRankingBtn'),
        document.getElementById('doneRankingBtn')
      ];

      closeBtns.forEach(btn => {
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeRankingModal();
          });
        }
      });
    },

    openRankingModal() {
      this.updateRankingData();
      const modal = document.getElementById('serverRankingModal');
      if (modal) {
        modal.removeAttribute('hidden');
      }
    },

    closeRankingModal() {
      const modal = document.getElementById('serverRankingModal');
      if (modal) {
        modal.setAttribute('hidden', '');
      }
    },

    updateRankingData() {
      const stats = (window.PlayerStatsManager && window.PlayerStatsManager.loadStats()) || { totalScore: 0, missionScore: 0, minigameScore: 0 };
      const userTotal = stats.totalScore || 0;
      const userMission = stats.missionScore || 0;
      const userMinigame = stats.minigameScore || 0;

      const list = this.BENCHMARK_PLAYERS.map(p => ({ ...p, isYou: false }));
      const userEntry = {
        name: 'คุณมะลิ (คุณ)',
        title: 'ผู้เล่น Zero-Trust',
        score: userTotal,
        mission: userMission,
        minigame: userMinigame,
        isYou: true
      };
      list.push(userEntry);
      list.sort((a, b) => b.score - a.score);

      const userRankIndex = list.findIndex(p => p.isYou) + 1;

      // Update Player Rank Card
      const rankNumEl = document.getElementById('playerRankNumber');
      if (rankNumEl) rankNumEl.textContent = `#${userRankIndex}`;
      const rankMissionEl = document.getElementById('playerRankMissionVal');
      if (rankMissionEl) rankMissionEl.textContent = userMission;
      const rankMinigameEl = document.getElementById('playerRankMinigameVal');
      if (rankMinigameEl) rankMinigameEl.textContent = userMinigame;
      const rankTotalEl = document.getElementById('playerRankTotalVal');
      if (rankTotalEl) rankTotalEl.textContent = userTotal;

      // Render list
      const container = document.getElementById('serverRankingList');
      if (!container) return;
      container.innerHTML = '';

      list.slice(0, 15).forEach((p, idx) => {
        const rank = idx + 1;
        const row = document.createElement('div');
        row.className = `ranking-item ${p.isYou ? 'highlight-player' : ''}`;

        let medal = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : `#${rank}`));
        let rankClass = rank <= 3 ? `rank-${rank}` : '';

        row.innerHTML = `
          <div class="ri-left">
            <span class="ri-rank ${rankClass}">${medal}</span>
            <div class="ri-name-group">
              <span class="ri-name">${p.name} ${p.isYou ? '<span class="rpc-you-badge">YOU</span>' : ''}</span>
              <span class="ri-title">${p.title} (M: ${p.mission} | G: ${p.minigame})</span>
            </div>
          </div>
          <div class="ri-score-group">
            <span class="ri-score ${p.isYou ? 'user-score' : ''}">${p.score}</span>
            <span class="sb-unit">คะแนน</span>
          </div>
        `;
        container.appendChild(row);
      });
    }
  };

  /**
   * Tetris 100 Core Gameplay Engine
   */
  const TetrisEngine = {
    COLS: 10,
    ROWS: 20,

    SHAPES: {
      I: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
      J: [[1,0,0], [1,1,1], [0,0,0]],
      L: [[0,0,1], [1,1,1], [0,0,0]],
      O: [[1,1], [1,1]],
      S: [[0,1,1], [1,1,0], [0,0,0]],
      T: [[0,1,0], [1,1,1], [0,0,0]],
      Z: [[1,1,0], [0,1,1], [0,0,0]]
    },

    COLORS: {
      I: '#00e5ff',
      J: '#2979ff',
      L: '#ff9100',
      O: '#ffd600',
      S: '#00e676',
      T: '#d500f9',
      Z: '#ff1744'
    },

    board: [],
    currentPiece: null,
    nextPiece: null,
    score: 0,
    lines: 0,
    level: 1,
    isPaused: false,
    isGameOver: false,
    isPlaying: false,
    dropCounter: 0,
    dropInterval: 800,
    lastTime: 0,
    animId: null,

    canvas: null,
    ctx: null,
    nextCanvas: null,
    nextCtx: null,

    // Minigame default sound: Music 20%, SFX 60%
    minigameMusicDefault: 0.20,
    minigameSfxDefault: 0.60,
    musicVolume: 0.20,
    sfxVolume: 0.60,
    isMuted: false,

    loadSoundSettings() {
      try {
        const raw = localStorage.getItem('zero_trust_minigame_sound_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.musicVolume === 'number') this.musicVolume = parsed.musicVolume;
          if (typeof parsed.sfxVolume === 'number') this.sfxVolume = parsed.sfxVolume;
          if (typeof parsed.isMuted === 'boolean') this.isMuted = parsed.isMuted;
          return;
        }
      } catch (e) {}
      // Default: music 20%, sfx 60%
      this.musicVolume = this.minigameMusicDefault;
      this.sfxVolume = this.minigameSfxDefault;
      this.isMuted = false;
    },

    saveSoundSettings() {
      try {
        localStorage.setItem('zero_trust_minigame_sound_settings', JSON.stringify({
          musicVolume: this.musicVolume,
          sfxVolume: this.sfxVolume,
          isMuted: this.isMuted
        }));
      } catch (e) {}
    },

    applyMinigameSound() {
      this.loadSoundSettings();
      if (window.SoundManager) {
        window.SoundManager.setMusicVolume(this.musicVolume);
        window.SoundManager.setSFXVolume(this.sfxVolume);
        window.SoundManager.setMuted(this.isMuted);
      }
    },

    init() {
      this.loadSoundSettings();
      this.canvas = document.getElementById('tetrisCanvas');
      if (this.canvas) this.ctx = this.canvas.getContext('2d');
      this.nextCanvas = document.getElementById('tetrisNextCanvas');
      if (this.nextCanvas) this.nextCtx = this.nextCanvas.getContext('2d');

      this.bindButtons();
      this.bindKeyboard();
    },

    bindButtons() {
      const startBtn = document.getElementById('startTetrisBtn');
      if (startBtn) {
        startBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.startGame(true);
        });
      }

      const lobbyGuideBtn = document.getElementById('lobbyTetrisGuideBtn');
      if (lobbyGuideBtn) {
        lobbyGuideBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.startGame(true);
        });
      }

      const helpBtn = document.getElementById('tetrisHelpBtn');
      if (helpBtn) {
        helpBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showGuide();
        });
      }

      const pauseHelpBtn = document.getElementById('tetrisPauseHelpBtn');
      if (pauseHelpBtn) {
        pauseHelpBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showGuide();
        });
      }

      const closeGuideBtn = document.getElementById('tetrisCloseGuideBtn');
      if (closeGuideBtn) {
        closeGuideBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.closeGuideAndResume();
        });
      }

      const backBtn = document.getElementById('tetrisBackToLobbyBtn');
      if (backBtn) {
        backBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showLobby();
        });
      }

      const pauseBtn = document.getElementById('tetrisPauseBtn');
      if (pauseBtn) {
        pauseBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.togglePause();
        });
      }

      const resumeBtn = document.getElementById('tetrisResumeBtn');
      if (resumeBtn) {
        resumeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.togglePause();
        });
      }

      const settingsBtn = document.getElementById('tetrisSettingsBtn');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showSettings();
        });
      }

      const settingsResumeBtn = document.getElementById('tetrisSettingsResumeBtn');
      if (settingsResumeBtn) {
        settingsResumeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.closeSettingsAndResume();
        });
      }

      const defaultBtn = document.getElementById('tetrisSettingsDefaultBtn');
      if (defaultBtn) {
        defaultBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.resetToDefaultSound();
        });
      }

      const settingsLobbyBtn = document.getElementById('tetrisSettingsLobbyBtn');
      if (settingsLobbyBtn) {
        settingsLobbyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const settingsOverlay = document.getElementById('tetrisSettingsOverlay');
          if (settingsOverlay) settingsOverlay.setAttribute('hidden', '');
          this.showLobby();
        });
      }

      const musicSlider = document.getElementById('tetrisMusicSlider');
      if (musicSlider) {
        musicSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          const valEl = document.getElementById('tetrisMusicVal');
          if (valEl) valEl.textContent = `${val}%`;
          this.musicVolume = val / 100;
          this.saveSoundSettings();
          if (window.SoundManager) {
            window.SoundManager.setMusicVolume(this.musicVolume);
            if (window.SettingsManager && typeof window.SettingsManager.syncUI === 'function') {
              window.SettingsManager.syncUI();
            }
          }
        });
      }

      const sfxSlider = document.getElementById('tetrisSfxSlider');
      if (sfxSlider) {
        sfxSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          const valEl = document.getElementById('tetrisSfxVal');
          if (valEl) valEl.textContent = `${val}%`;
          this.sfxVolume = val / 100;
          this.saveSoundSettings();
          if (window.SoundManager) {
            window.SoundManager.setSFXVolume(this.sfxVolume);
            if (window.SettingsManager && typeof window.SettingsManager.syncUI === 'function') {
              window.SettingsManager.syncUI();
            }
          }
        });
        sfxSlider.addEventListener('change', () => {
          if (window.SoundManager && typeof window.SoundManager.playTetrisMove === 'function') {
            window.SoundManager.playTetrisMove();
          }
        });
      }

      const muteToggleBtn = document.getElementById('tetrisMuteToggleBtn');
      if (muteToggleBtn) {
        muteToggleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.isMuted = !this.isMuted;
          this.saveSoundSettings();
          if (window.SoundManager) {
            window.SoundManager.setMuted(this.isMuted);
            if (window.SettingsManager && typeof window.SettingsManager.syncUI === 'function') {
              window.SettingsManager.syncUI();
            }
          }
          this.updateSettingsMuteUI(this.isMuted);
        });
      }

      const restartBtn = document.getElementById('tetrisRestartBtn');
      if (restartBtn) {
        restartBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.startGame();
        });
      }

      const replayBtn = document.getElementById('tetrisReplayBtn');
      if (replayBtn) {
        replayBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.startGame();
        });
      }

      const lobbyExitBtn = document.getElementById('tetrisExitToLobbyBtn');
      if (lobbyExitBtn) {
        lobbyExitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showLobby();
        });
      }

      const pauseExitBtn = document.getElementById('tetrisPauseExitBtn');
      if (pauseExitBtn) {
        pauseExitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.showLobby();
        });
      }

      // Touch and Click controls with ultra-low latency for Tablet & Mobile
      const bindTouchAndClick = (btn, action) => {
        if (!btn) return;
        let lastTouchTime = 0;
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          lastTouchTime = Date.now();
          action();
        }, { passive: false });
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (Date.now() - lastTouchTime < 350) return;
          action();
        });
      };

      const btnLeft = document.getElementById('tBtnLeft');
      bindTouchAndClick(btnLeft, () => this.moveLeft());

      const btnRight = document.getElementById('tBtnRight');
      bindTouchAndClick(btnRight, () => this.moveRight());

      const btnRotate = document.getElementById('tBtnRotate');
      bindTouchAndClick(btnRotate, () => this.rotatePiece());

      const btnDown = document.getElementById('tBtnDown');
      bindTouchAndClick(btnDown, () => this.softDrop());

      const btnHardDrop = document.getElementById('tBtnHardDrop');
      bindTouchAndClick(btnHardDrop, () => this.hardDrop());
    },

    bindKeyboard() {
      window.addEventListener('keydown', (e) => {
        // If typing in any input or textarea, don't hijack keyboard
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
          return;
        }

        const gameView = document.getElementById('tetrisGameView');
        if (!gameView || gameView.hasAttribute('hidden') || gameView.style.display === 'none') {
          return;
        }

        if (!this.isPlaying || this.isGameOver) return;

        const code = e.code || '';
        const key = (e.key || '').toLowerCase();

        // Guide overlay check: if open, dismiss guide on any game key/Enter/Space/Escape
        const guideOverlay = document.getElementById('tetrisGuideOverlay');
        const isGuideOpen = guideOverlay && !guideOverlay.hasAttribute('hidden') && guideOverlay.style.display !== 'none';
        if (isGuideOpen) {
          if (
            code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' ||
            code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight' ||
            code === 'Space' || code === 'Enter' || code === 'Escape' ||
            key === 'w' || key === 'a' || key === 's' || key === 'd' ||
            key === 'ไ' || key === 'ฟ' || key === 'ห' || key === 'ก' ||
            key === ' ' || key === 'enter' || key === 'escape'
          ) {
            e.preventDefault();
            this.closeGuideAndResume();
            // Continue down to execute movement immediately
          } else {
            return;
          }
        }

        // Settings overlay check
        const settingsOverlay = document.getElementById('tetrisSettingsOverlay');
        const isSettingsOpen = settingsOverlay && !settingsOverlay.hasAttribute('hidden') && settingsOverlay.style.display !== 'none';
        if (isSettingsOpen) {
          if (code === 'Escape') {
            e.preventDefault();
            this.closeSettingsAndResume();
          }
          return;
        }

        // Pause overlay check
        if (this.isPaused) {
          if (
            code === 'KeyP' || code === 'Escape' || code === 'Space' ||
            key === 'p' || key === 'escape' || key === ' ' || key === 'ย'
          ) {
            e.preventDefault();
            this.togglePause();
          }
          return;
        }

        // Prevent browser scrolling on navigation keys during gameplay
        if (
          code === 'Space' || code === 'ArrowUp' || code === 'ArrowDown' ||
          code === 'ArrowLeft' || code === 'ArrowRight' || key === ' '
        ) {
          e.preventDefault();
        }

        // Left: A, ArrowLeft, or Thai ฟ
        if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft' || key === 'ฟ') {
          e.preventDefault();
          this.moveLeft();
        }
        // Right: D, ArrowRight, or Thai ก
        else if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright' || key === 'ก') {
          e.preventDefault();
          this.moveRight();
        }
        // Up / Hard Drop: W, ArrowUp, or Thai ไ
        else if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup' || key === 'ไ') {
          e.preventDefault();
          this.hardDrop();
        }
        // Down / Soft Drop: S, ArrowDown, or Thai ห
        else if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown' || key === 'ห') {
          e.preventDefault();
          this.softDrop();
        }
        // Rotate: Space or R or Thai พ
        else if (code === 'Space' || code === 'KeyR' || key === ' ' || key === 'spacebar' || key === 'r' || key === 'พ') {
          e.preventDefault();
          this.rotatePiece();
        }
        // Pause: P or Escape or Thai ย
        else if (code === 'KeyP' || code === 'Escape' || key === 'p' || key === 'escape' || key === 'ย') {
          e.preventDefault();
          this.togglePause();
        }
        // Help / Guide: H or ? or Thai ้
        else if (code === 'KeyH' || key === 'h' || key === '?' || key === '้') {
          e.preventDefault();
          this.showGuide();
        }
      });
    },

    showLobby() {
      this.stopGame();
      if (window.SoundManager && typeof window.SoundManager.restoreMainBGM === 'function') {
        window.SoundManager.restoreMainBGM();
      }

      const topBar = document.querySelector('.minigame-top-bar');
      const bottomBar = document.querySelector('.minigame-bottom-bar');
      if (topBar) topBar.removeAttribute('hidden');
      if (bottomBar) bottomBar.removeAttribute('hidden');

      const lobby = document.getElementById('minigameLobbyContent');
      const gameView = document.getElementById('tetrisGameView');
      const pauseOverlay = document.getElementById('tetrisPauseOverlay');
      const overOverlay = document.getElementById('tetrisGameOverOverlay');
      const guideOverlay = document.getElementById('tetrisGuideOverlay');
      const settingsOverlay = document.getElementById('tetrisSettingsOverlay');

      if (lobby) lobby.removeAttribute('hidden');
      if (gameView) gameView.setAttribute('hidden', '');
      if (pauseOverlay) pauseOverlay.setAttribute('hidden', '');
      if (overOverlay) overOverlay.setAttribute('hidden', '');
      if (guideOverlay) guideOverlay.setAttribute('hidden', '');
      if (settingsOverlay) settingsOverlay.setAttribute('hidden', '');

      if (window.PlayerStatsManager) {
        window.PlayerStatsManager.updateUI();
      }
    },

    startGame(showGuide = true) {
      this.applyMinigameSound();
      if (window.SoundManager && typeof window.SoundManager.playPuzzleBGM === 'function') {
        window.SoundManager.playPuzzleBGM();
      }

      const topBar = document.querySelector('.minigame-top-bar');
      const bottomBar = document.querySelector('.minigame-bottom-bar');
      if (topBar) topBar.setAttribute('hidden', '');
      if (bottomBar) bottomBar.setAttribute('hidden', '');

      const lobby = document.getElementById('minigameLobbyContent');
      const gameView = document.getElementById('tetrisGameView');
      const pauseOverlay = document.getElementById('tetrisPauseOverlay');
      const overOverlay = document.getElementById('tetrisGameOverOverlay');
      const guideOverlay = document.getElementById('tetrisGuideOverlay');
      const settingsOverlay = document.getElementById('tetrisSettingsOverlay');

      if (lobby) lobby.setAttribute('hidden', '');
      if (gameView) gameView.removeAttribute('hidden');
      if (pauseOverlay) pauseOverlay.setAttribute('hidden', '');
      if (overOverlay) overOverlay.setAttribute('hidden', '');
      if (settingsOverlay) settingsOverlay.setAttribute('hidden', '');

      this.createBoard();
      this.score = 0;
      this.lines = 0;
      this.level = 1;
      this.dropInterval = 800;
      this.dropCounter = 0;
      this.lastTime = 0;
      this.isGameOver = false;

      this.updateScoreUI();
      this.nextPiece = this.randomPiece();
      this.spawnPiece();

      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      if (gameView && typeof gameView.focus === 'function') {
        gameView.focus();
      }

      if (showGuide && guideOverlay) {
        // แสดงหน้าต่างแนะนำวิธีการเล่น & การควบคุมเมื่อคลิกเข้ามาในเกม
        guideOverlay.removeAttribute('hidden');
        this.isPaused = true;
        this.isPlaying = true;
      } else {
        if (guideOverlay) guideOverlay.setAttribute('hidden', '');
        this.isPaused = false;
        this.isPlaying = true;
        if (this.animId) cancelAnimationFrame(this.animId);
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
      }
    },

    showGuide() {
      if (!this.isPlaying || this.isGameOver) return;
      this.isPaused = true;
      const guideOverlay = document.getElementById('tetrisGuideOverlay');
      const pauseOverlay = document.getElementById('tetrisPauseOverlay');
      const settingsOverlay = document.getElementById('tetrisSettingsOverlay');
      if (pauseOverlay) pauseOverlay.setAttribute('hidden', '');
      if (settingsOverlay) settingsOverlay.setAttribute('hidden', '');
      if (guideOverlay) guideOverlay.removeAttribute('hidden');
    },

    closeGuideAndResume() {
      const guideOverlay = document.getElementById('tetrisGuideOverlay');
      if (guideOverlay) guideOverlay.setAttribute('hidden', '');
      this.isPaused = false;
      this.isPlaying = true;
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      const gameView = document.getElementById('tetrisGameView');
      if (gameView && typeof gameView.focus === 'function') {
        gameView.focus();
      }
      this.lastTime = performance.now();
      if (this.animId) cancelAnimationFrame(this.animId);
      this.gameLoop(this.lastTime);
    },

    showSettings() {
      if (!this.isPlaying || this.isGameOver) return;
      this.isPaused = true;
      const settingsOverlay = document.getElementById('tetrisSettingsOverlay');
      const pauseOverlay = document.getElementById('tetrisPauseOverlay');
      const guideOverlay = document.getElementById('tetrisGuideOverlay');
      if (pauseOverlay) pauseOverlay.setAttribute('hidden', '');
      if (guideOverlay) guideOverlay.setAttribute('hidden', '');
      if (settingsOverlay) {
        settingsOverlay.removeAttribute('hidden');
        this.syncSettingsUI();
      }
    },

    closeSettingsAndResume() {
      const settingsOverlay = document.getElementById('tetrisSettingsOverlay');
      if (settingsOverlay) settingsOverlay.setAttribute('hidden', '');
      this.isPaused = false;
      this.isPlaying = true;
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      const gameView = document.getElementById('tetrisGameView');
      if (gameView && typeof gameView.focus === 'function') {
        gameView.focus();
      }
      this.lastTime = performance.now();
      if (this.animId) cancelAnimationFrame(this.animId);
      this.gameLoop(this.lastTime);
    },

    syncSettingsUI() {
      this.loadSoundSettings();
      const mPercent = Math.round(this.musicVolume * 100);
      const sPercent = Math.round(this.sfxVolume * 100);
      const isMuted = !!this.isMuted;

      const musicSlider = document.getElementById('tetrisMusicSlider');
      const musicVal = document.getElementById('tetrisMusicVal');
      if (musicSlider) musicSlider.value = mPercent;
      if (musicVal) musicVal.textContent = `${mPercent}%`;

      const sfxSlider = document.getElementById('tetrisSfxSlider');
      const sfxVal = document.getElementById('tetrisSfxVal');
      if (sfxSlider) sfxSlider.value = sPercent;
      if (sfxVal) sfxVal.textContent = `${sPercent}%`;

      this.updateSettingsMuteUI(isMuted);
    },

    updateSettingsMuteUI(isMuted) {
      const iconEl = document.getElementById('tetrisMuteStatusIcon');
      const textEl = document.getElementById('tetrisMuteStatusText');
      const btnEl = document.getElementById('tetrisMuteToggleBtn');
      if (!btnEl) return;

      const btnIcon = btnEl.querySelector('.mute-btn-icon');
      const btnText = btnEl.querySelector('.mute-btn-text');

      if (isMuted) {
        if (iconEl) iconEl.textContent = '🔇';
        if (textEl) {
          textEl.textContent = 'ปิดเสียงอยู่';
          textEl.classList.add('muted');
        }
        btnEl.classList.add('active-muted');
        if (btnIcon) btnIcon.textContent = '🔊';
        if (btnText) btnText.textContent = 'เปิดเสียง';
      } else {
        if (iconEl) iconEl.textContent = '🔊';
        if (textEl) {
          textEl.textContent = 'เปิดเสียงปกติ';
          textEl.classList.remove('muted');
        }
        btnEl.classList.remove('active-muted');
        if (btnIcon) btnIcon.textContent = '🔇';
        if (btnText) btnText.textContent = 'มิวท์เสียง';
      }
    },

    resetToDefaultSound() {
      this.musicVolume = this.minigameMusicDefault; // 0.20 (20%)
      this.sfxVolume = this.minigameSfxDefault;     // 0.60 (60%)
      this.isMuted = false;
      this.saveSoundSettings();

      if (window.SoundManager) {
        window.SoundManager.setMusicVolume(this.musicVolume);
        window.SoundManager.setSFXVolume(this.sfxVolume);
        window.SoundManager.setMuted(this.isMuted);
      }

      const musicSlider = document.getElementById('tetrisMusicSlider');
      const musicVal = document.getElementById('tetrisMusicVal');
      if (musicSlider) musicSlider.value = 20;
      if (musicVal) musicVal.textContent = '20%';

      const sfxSlider = document.getElementById('tetrisSfxSlider');
      const sfxVal = document.getElementById('tetrisSfxVal');
      if (sfxSlider) sfxSlider.value = 60;
      if (sfxVal) sfxVal.textContent = '60%';

      this.updateSettingsMuteUI(false);

      if (window.SoundManager && typeof window.SoundManager.playTetrisMove === 'function') {
        window.SoundManager.playTetrisMove();
      }
    },

    stopGame() {
      this.isPlaying = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    },

    togglePause() {
      if (!this.isPlaying || this.isGameOver) return;
      this.isPaused = !this.isPaused;
      const pauseOverlay = document.getElementById('tetrisPauseOverlay');
      const pauseBtn = document.getElementById('tetrisPauseBtn');
      const guideOverlay = document.getElementById('tetrisGuideOverlay');
      const settingsOverlay = document.getElementById('tetrisSettingsOverlay');

      if (guideOverlay) guideOverlay.setAttribute('hidden', '');
      if (settingsOverlay) settingsOverlay.setAttribute('hidden', '');

      if (this.isPaused) {
        if (pauseOverlay) pauseOverlay.removeAttribute('hidden');
        if (pauseBtn) pauseBtn.textContent = '▶';
      } else {
        if (pauseOverlay) pauseOverlay.setAttribute('hidden', '');
        if (pauseBtn) pauseBtn.textContent = '⏸';
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
      }
    },

    createBoard() {
      this.board = Array.from({ length: this.ROWS }, () => Array(this.COLS).fill(0));
    },

    randomPiece() {
      const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
      const type = types[Math.floor(Math.random() * types.length)];
      return {
        type,
        matrix: this.SHAPES[type].map(row => [...row]),
        color: this.COLORS[type],
        x: 0,
        y: 0
      };
    },

    spawnPiece() {
      this.currentPiece = this.nextPiece || this.randomPiece();
      this.nextPiece = this.randomPiece();
      this.currentPiece.x = Math.floor((this.COLS - this.currentPiece.matrix[0].length) / 2);
      this.currentPiece.y = 0;

      this.drawNextPiece();

      if (this.collide(this.board, this.currentPiece)) {
        this.gameOver();
      }
    },

    collide(board, piece) {
      const m = piece.matrix;
      for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
          if (m[y][x] !== 0) {
            const boardY = y + piece.y;
            const boardX = x + piece.x;
            if (boardX < 0 || boardX >= this.COLS || boardY >= this.ROWS) {
              return true;
            }
            if (boardY >= 0 && board[boardY][boardX] !== 0) {
              return true;
            }
          }
        }
      }
      return false;
    },

    rotate(matrix) {
      const N = matrix.length;
      const result = Array.from({ length: N }, () => Array(N).fill(0));
      for (let i = 0; i < N; ++i) {
        for (let j = 0; j < N; ++j) {
          result[j][N - 1 - i] = matrix[i][j];
        }
      }
      return result;
    },

    rotatePiece() {
      if (this.isPaused || this.isGameOver || !this.currentPiece) return;
      const origX = this.currentPiece.x;
      const origMatrix = this.currentPiece.matrix;
      const rotated = this.rotate(origMatrix);
      this.currentPiece.matrix = rotated;

      // Wall kicks
      let offset = 1;
      while (this.collide(this.board, this.currentPiece)) {
        this.currentPiece.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (Math.abs(offset) > 3) {
          this.currentPiece.matrix = origMatrix;
          this.currentPiece.x = origX;
          return;
        }
      }
      this.playRotateSound();
      this.draw();
    },

    moveLeft() {
      if (this.isPaused || this.isGameOver || !this.currentPiece) return;
      this.currentPiece.x--;
      if (this.collide(this.board, this.currentPiece)) {
        this.currentPiece.x++;
      } else {
        this.playTapSound();
      }
      this.draw();
    },

    moveRight() {
      if (this.isPaused || this.isGameOver || !this.currentPiece) return;
      this.currentPiece.x++;
      if (this.collide(this.board, this.currentPiece)) {
        this.currentPiece.x--;
      } else {
        this.playTapSound();
      }
      this.draw();
    },

    softDrop() {
      if (this.isPaused || this.isGameOver || !this.currentPiece) return;
      this.currentPiece.y++;
      if (this.collide(this.board, this.currentPiece)) {
        this.currentPiece.y--;
        this.lockPiece();
      } else {
        this.addScore(1);
        this.playTapSound();
      }
      this.dropCounter = 0;
      this.draw();
    },

    hardDrop() {
      if (this.isPaused || this.isGameOver || !this.currentPiece) return;
      let dropCells = 0;
      while (!this.collide(this.board, this.currentPiece)) {
        this.currentPiece.y++;
        dropCells++;
      }
      this.currentPiece.y--;
      dropCells = Math.max(0, dropCells - 1);
      this.addScore(dropCells * 2);
      this.playTapSound();
      this.lockPiece();
      this.draw();
    },

    lockPiece() {
      const m = this.currentPiece.matrix;
      for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
          if (m[y][x] !== 0) {
            const by = y + this.currentPiece.y;
            const bx = x + this.currentPiece.x;
            if (by >= 0 && by < this.ROWS && bx >= 0 && bx < this.COLS) {
              this.board[by][bx] = this.currentPiece.color;
            }
          }
        }
      }
      this.clearLines();
      this.spawnPiece();
    },

    clearLines() {
      let linesCleared = 0;
      for (let y = this.ROWS - 1; y >= 0; --y) {
        if (this.board[y].every(cell => cell !== 0)) {
          this.board.splice(y, 1);
          this.board.unshift(Array(this.COLS).fill(0));
          linesCleared++;
          y++;
        }
      }

      if (linesCleared > 0) {
        this.lines += linesCleared;
        let linePts = 0;
        if (linesCleared === 1) linePts = 10;
        else if (linesCleared === 2) linePts = 25;
        else if (linesCleared === 3) linePts = 50;
        else if (linesCleared >= 4) linePts = 100;

        this.addScore(linePts);
        this.playLineClearSound();

        // Speed progression: "ค่อยๆเพิ่มความเร็ว"
        const newLevel = Math.floor(this.score / 80) + 1;
        if (newLevel !== this.level) {
          this.level = newLevel;
          this.dropInterval = Math.max(130, 800 - (this.level - 1) * 65);
        }
        this.updateScoreUI();
      }
    },

    addScore(pts) {
      this.score += pts;
      this.updateScoreUI();
      // Record real-time to Player Stats & Ranking
      if (window.PlayerStatsManager) {
        window.PlayerStatsManager.recordMinigameScore(pts, 'tetris');
      }
    },

    updateScoreUI() {
      const scoreEl = document.getElementById('tetrisScoreVal');
      if (scoreEl) scoreEl.textContent = this.score;
      const linesEl = document.getElementById('tetrisLinesVal');
      if (linesEl) linesEl.textContent = this.lines;
      const levelEl = document.getElementById('tetrisLevelVal');
      if (levelEl) levelEl.textContent = this.level;
    },

    gameOver() {
      this.isGameOver = true;
      this.isPlaying = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }

      const overOverlay = document.getElementById('tetrisGameOverOverlay');
      if (overOverlay) overOverlay.removeAttribute('hidden');
      const overScore = document.getElementById('tetrisGameOverScoreVal');
      if (overScore) overScore.textContent = `+${this.score}`;
      const overLines = document.getElementById('tetrisGameOverLinesVal');
      if (overLines) overLines.textContent = this.lines;

      this.playGameOverSound();
    },

    gameLoop(time = 0) {
      if (!this.isPlaying || this.isPaused || this.isGameOver) return;
      const deltaTime = time - this.lastTime;
      this.lastTime = time;
      this.dropCounter += deltaTime;

      if (this.dropCounter > this.dropInterval) {
        this.softDrop();
      }

      this.draw();
      this.animId = requestAnimationFrame(t => this.gameLoop(t));
    },

    draw() {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const cellW = w / this.COLS;
      const cellH = h / this.ROWS;

      // Dark background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      // Subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= this.COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellW, 0);
        ctx.lineTo(x * cellW, h);
        ctx.stroke();
      }
      for (let y = 0; y <= this.ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellH);
        ctx.lineTo(w, y * cellH);
        ctx.stroke();
      }

      // Draw locked board pieces
      for (let y = 0; y < this.ROWS; y++) {
        for (let x = 0; x < this.COLS; x++) {
          if (this.board[y][x] !== 0) {
            this.drawBlock(ctx, x * cellW, y * cellH, cellW, cellH, this.board[y][x]);
          }
        }
      }

      // Draw ghost piece (drop guide)
      if (this.currentPiece && !this.isGameOver) {
        const ghost = {
          ...this.currentPiece,
          matrix: this.currentPiece.matrix,
          x: this.currentPiece.x,
          y: this.currentPiece.y
        };
        while (!this.collide(this.board, ghost)) {
          ghost.y++;
        }
        ghost.y--;

        const m = ghost.matrix;
        for (let y = 0; y < m.length; ++y) {
          for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0) {
              const gx = (ghost.x + x) * cellW;
              const gy = (ghost.y + y) * cellH;
              ctx.strokeStyle = this.currentPiece.color;
              ctx.lineWidth = 1.5;
              ctx.strokeRect(gx + 1, gy + 1, cellW - 2, cellH - 2);
            }
          }
        }
      }

      // Draw active current piece
      if (this.currentPiece && !this.isGameOver) {
        const m = this.currentPiece.matrix;
        for (let y = 0; y < m.length; ++y) {
          for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0) {
              const px = (this.currentPiece.x + x) * cellW;
              const py = (this.currentPiece.y + y) * cellH;
              this.drawBlock(ctx, px, py, cellW, cellH, this.currentPiece.color);
            }
          }
        }
      }
    },

    drawBlock(ctx, x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

      // Inner highlight bevel
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(x + 1, y + 1, w - 2, 2.5);
      ctx.fillRect(x + 1, y + 1, 2.5, h - 2);

      // Dark shadow edge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(x + 1, y + h - 3, w - 2, 2);
      ctx.fillRect(x + w - 3, y + 1, 2, h - 2);
    },

    drawNextPiece() {
      if (!this.nextCtx || !this.nextCanvas || !this.nextPiece) return;
      const ctx = this.nextCtx;
      const w = this.nextCanvas.width;
      const h = this.nextCanvas.height;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      const m = this.nextPiece.matrix;
      const rows = m.length;
      const cols = m[0].length;
      const blockSize = 14;
      const startX = Math.floor((w - cols * blockSize) / 2);
      const startY = Math.floor((h - rows * blockSize) / 2);

      for (let y = 0; y < rows; ++y) {
        for (let x = 0; x < cols; ++x) {
          if (m[y][x] !== 0) {
            this.drawBlock(ctx, startX + x * blockSize, startY + y * blockSize, blockSize, blockSize, this.nextPiece.color);
          }
        }
      }
    },

    playTapSound() {
      if (window.SoundManager && typeof window.SoundManager.playTetrisMove === 'function') {
        window.SoundManager.playTetrisMove();
      } else if (window.SoundManager && typeof window.SoundManager.playMouseClick === 'function') {
        window.SoundManager.playMouseClick();
      }
    },

    playRotateSound() {
      if (window.SoundManager && typeof window.SoundManager.playTetrisRotate === 'function') {
        window.SoundManager.playTetrisRotate();
      } else if (window.SoundManager && typeof window.SoundManager.playMouseClick === 'function') {
        window.SoundManager.playMouseClick();
      }
    },

    playLineClearSound() {
      if (window.SoundManager && typeof window.SoundManager.playScoreUp === 'function') {
        window.SoundManager.playScoreUp();
      }
    },

    playGameOverSound() {
      if (window.SoundManager && typeof window.SoundManager.playWrongAnswer === 'function') {
        window.SoundManager.playWrongAnswer();
      }
    }
  };

  /**
   * Main Initialization Function
   */
  function initApp() {
    initRealTimeClock();
    initWifiAnimation();
    KaiChatEngine.init();
    SoundManager.init();
    SettingsManager.init();
    Mission2CallCenter.init();
    Mission3JodEngine.init();
    LoginManager.init();
    ServerRankingManager.init();
    TetrisEngine.init();

    window.KaiChatEngine = KaiChatEngine;
    window.KaiStateManager = KaiStateManager;
    window.AppScreenManager = AppScreenManager;
    window.ZeroTrustNavigator = NavigationHandler;
    window.QuestProgressionManager = QuestProgressionManager;
    window.SoundManager = SoundManager;
    window.SettingsManager = SettingsManager;
    window.Mission2CallCenter = Mission2CallCenter;
    window.Mission3JodEngine = Mission3JodEngine;
    window.LoginManager = LoginManager;
    window.ServerRankingManager = ServerRankingManager;
    window.TetrisEngine = TetrisEngine;
    NavigationHandler.screens = AppScreenManager;

    // Grid App Items
    const appItems = document.querySelectorAll('.app-item');
    appItems.forEach(item => {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        const appId = this.getAttribute('data-app-id');
        const appData = APP_CATALOG[appId] || { name: appId };

        if (appId === 'line') {
          const badgeEl = document.getElementById('lineAppBadge');
          if (badgeEl) badgeEl.setAttribute('hidden', '');
          const notifEl = document.getElementById('linePushNotification');
          if (notifEl) {
            notifEl.classList.remove('active');
            notifEl.setAttribute('hidden', '');
          }
          AppScreenManager.openApp('line');
        } else if (appId === 'facebook') {
          const fbBadge = document.getElementById('facebookAppBadge');
          if (fbBadge) fbBadge.setAttribute('hidden', '');
          const fbNotif = document.getElementById('facebookPushNotification');
          if (fbNotif) {
            fbNotif.classList.remove('active');
            fbNotif.setAttribute('hidden', '');
          }
          AppScreenManager.openApp('facebook');
        } else if (appId === 'mobile-bank') {
          AppScreenManager.openApp('mobile-bank');
        } else if (appId === 'minigames') {
          AppScreenManager.openApp('minigames');
        } else if (appId === 'player-stats') {
          AppScreenManager.openApp('player-stats');
        } else if (appId === 'settings' || appId === 'device-settings') {
          AppScreenManager.openApp('settings');
        } else if (appId === 'phone') {
          const prog = window.QuestProgressionManager ? window.QuestProgressionManager.loadProgression() : {};
          if (prog.quest2_callcenter === 'cleared') {
            NavigationHandler._showHandlerFeedback('เบอร์ 080-5656-9987-56 ถูกบล็อกแล้ว (ภารกิจสำเร็จ)');
          } else if (window.Mission2CallCenter) {
            window.Mission2CallCenter.startIncomingCall();
          }
        } else {
          NavigationHandler._showHandlerFeedback(appData.name);
        }
      });
    });

    // Wire LINE Push Notification Banner Click -> Opens LINE and enters Kai chat immediately
    const linePushCard = document.getElementById('linePushCard');
    if (linePushCard) {
      linePushCard.addEventListener('click', (e) => {
        e.preventDefault();
        const notifEl = document.getElementById('linePushNotification');
        if (notifEl) {
          notifEl.classList.remove('active');
          notifEl.setAttribute('hidden', '');
        }
        const badgeEl = document.getElementById('lineAppBadge');
        if (badgeEl) badgeEl.setAttribute('hidden', '');
        AppScreenManager.openApp('line');
        KaiChatEngine.openConvo();
      });
    }

    // Wire Facebook Push Notification Banner Click
    const facebookPushCard = document.getElementById('facebookPushCard');
    if (facebookPushCard) {
      facebookPushCard.addEventListener('click', (e) => {
        e.preventDefault();
        const fbNotif = document.getElementById('facebookPushNotification');
        if (fbNotif) {
          fbNotif.classList.remove('active');
          fbNotif.setAttribute('hidden', '');
        }
        const fbBadge = document.getElementById('facebookAppBadge');
        if (fbBadge) fbBadge.setAttribute('hidden', '');
        AppScreenManager.openApp('facebook');
      });
    }

    // Start Home screen quest progression triggers only if Login screen is not active
    const loginScreenEl = document.getElementById('loginScreen');
    if (!loginScreenEl || loginScreenEl.hasAttribute('hidden')) {
      QuestProgressionManager.initHomeTriggers();
    }

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
        } else if (chatId === 'jod') {
          if (window.Mission3JodEngine) {
            window.Mission3JodEngine.openConvo();
          }
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
    // Player Stats Screen Back Button & Bottom Home Bar
    const statsBackBtn = document.getElementById('statsBackBtn');
    if (statsBackBtn) {
      statsBackBtn.addEventListener('click', function (e) {
        e.preventDefault();
        AppScreenManager.closeActiveApp();
      });
    }

    const statsHomeBarBtn = document.getElementById('statsHomeBarBtn');
    if (statsHomeBarBtn) {
      statsHomeBarBtn.addEventListener('click', function (e) {
        e.preventDefault();
        AppScreenManager.closeActiveApp();
      });
    }

    const statsBottomBar = document.querySelector('.stats-bottom-bar');
    if (statsBottomBar) {
      statsBottomBar.addEventListener('click', function (e) {
        if (e.target === this) {
          e.preventDefault();
          AppScreenManager.closeActiveApp();
        }
      });
    }

    // Minigame Screen Back Button & Bottom Home Bar
    const minigameBackBtn = document.getElementById('minigameBackBtn');
    if (minigameBackBtn) {
      minigameBackBtn.addEventListener('click', function (e) {
        e.preventDefault();
        AppScreenManager.closeActiveApp();
      });
    }

    const minigameHomeBarBtn = document.getElementById('minigameHomeBarBtn');
    if (minigameHomeBarBtn) {
      minigameHomeBarBtn.addEventListener('click', function (e) {
        e.preventDefault();
        AppScreenManager.closeActiveApp();
      });
    }

    const minigameBottomBar = document.querySelector('.minigame-bottom-bar');
    if (minigameBottomBar) {
      minigameBottomBar.addEventListener('click', function (e) {
        if (e.target === this) {
          e.preventDefault();
          AppScreenManager.closeActiveApp();
        }
      });
    }

    // Sync initial player statistics and scoring UI
    if (window.PlayerStatsManager) {
      window.PlayerStatsManager.updateUI();
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
