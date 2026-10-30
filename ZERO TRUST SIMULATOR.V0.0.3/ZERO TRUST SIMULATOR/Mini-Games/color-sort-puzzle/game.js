/**
 * Color Sort: Liquid Protocol (เกมเรียงสีในหลอดแก้ว)
 * Standard ZERO TRUST SIMULATOR Minigame Client
 */
(() => {
  'use strict';

  // --- Color Palette & Definitions ---
  const COLORS = {
    cyan: { id: 'cyan', hex: '#00d4ff', label: 'ฟ้า' },
    pink: { id: 'pink', hex: '#ff007f', label: 'ชมพู' },
    green: { id: 'green', hex: '#00e676', label: 'เขียว' },
    amber: { id: 'amber', hex: '#ffab00', label: 'ส้ม' },
    purple: { id: 'purple', hex: '#bd00ff', label: 'ม่วง' },
    red: { id: 'red', hex: '#ff3b30', label: 'แดง' },
    blue: { id: 'blue', hex: '#3b82f6', label: 'น้ำเงิน' }
  };

  // 13 Solvable handcrafted progressive levels
  // 4 capacity per tube. Empty tubes denoted by empty array [].
  const LEVELS = [
    {
      level: 1,
      name: 'Alpha 01',
      points: 7,
      tubes: [
        ['cyan', 'pink', 'cyan', 'pink'],
        ['pink', 'cyan', 'pink', 'cyan'],
        [],
        []
      ]
    },
    {
      level: 2,
      name: 'Alpha 02',
      points: 7,
      tubes: [
        ['cyan', 'pink', 'cyan', 'pink'],
        ['green', 'cyan', 'green', 'pink'],
        ['pink', 'green', 'green', 'cyan'],
        [],
        []
      ]
    },
    {
      level: 3,
      name: 'Alpha 03',
      points: 7,
      tubes: [
        ['pink', 'cyan', 'green', 'pink'],
        ['green', 'pink', 'cyan', 'green'],
        ['cyan', 'green', 'pink', 'cyan'],
        [],
        []
      ]
    },
    {
      level: 4,
      name: 'Beta 04',
      points: 7,
      tubes: [
        ['cyan', 'amber', 'pink', 'green'],
        ['green', 'cyan', 'amber', 'pink'],
        ['pink', 'green', 'amber', 'cyan'],
        ['amber', 'pink', 'green', 'cyan'],
        [],
        []
      ]
    },
    {
      level: 5,
      name: 'Beta 05',
      points: 7,
      tubes: [
        ['amber', 'pink', 'cyan', 'green'],
        ['cyan', 'green', 'pink', 'amber'],
        ['green', 'amber', 'cyan', 'pink'],
        ['pink', 'cyan', 'amber', 'green'],
        [],
        []
      ]
    },
    {
      level: 6,
      name: 'Beta 06',
      points: 8,
      tubes: [
        ['purple', 'cyan', 'green', 'amber'],
        ['green', 'purple', 'cyan', 'amber'],
        ['amber', 'green', 'purple', 'cyan'],
        ['cyan', 'amber', 'green', 'purple'],
        [],
        []
      ]
    },
    {
      level: 7,
      name: 'Gamma 07',
      points: 8,
      tubes: [
        ['cyan', 'pink', 'green', 'amber'],
        ['purple', 'cyan', 'pink', 'green'],
        ['amber', 'purple', 'cyan', 'pink'],
        ['green', 'amber', 'purple', 'cyan'],
        ['pink', 'green', 'amber', 'purple'],
        [],
        []
      ]
    },
    {
      level: 8,
      name: 'Gamma 08',
      points: 8,
      tubes: [
        ['purple', 'amber', 'green', 'cyan'],
        ['pink', 'purple', 'amber', 'green'],
        ['cyan', 'pink', 'purple', 'amber'],
        ['green', 'cyan', 'pink', 'purple'],
        ['amber', 'green', 'cyan', 'pink'],
        [],
        []
      ]
    },
    {
      level: 9,
      name: 'Delta 09',
      points: 8,
      tubes: [
        ['red', 'cyan', 'pink', 'green'],
        ['amber', 'red', 'cyan', 'pink'],
        ['green', 'amber', 'red', 'cyan'],
        ['pink', 'green', 'amber', 'red'],
        ['cyan', 'pink', 'green', 'amber'],
        [],
        []
      ]
    },
    {
      level: 10,
      name: 'Delta 10',
      points: 8,
      tubes: [
        ['red', 'blue', 'green', 'amber'],
        ['purple', 'cyan', 'red', 'blue'],
        ['green', 'amber', 'purple', 'cyan'],
        ['blue', 'green', 'amber', 'red'],
        ['cyan', 'red', 'blue', 'purple'],
        ['amber', 'purple', 'cyan', 'green'],
        [],
        []
      ]
    },
    {
      level: 11,
      name: 'Epsilon 11',
      points: 8,
      tubes: [
        ['blue', 'purple', 'red', 'green'],
        ['cyan', 'amber', 'blue', 'purple'],
        ['green', 'red', 'cyan', 'amber'],
        ['purple', 'green', 'amber', 'blue'],
        ['amber', 'blue', 'green', 'cyan'],
        ['red', 'cyan', 'purple', 'red'],
        [],
        []
      ]
    },
    {
      level: 12,
      name: 'Omega 12',
      points: 8,
      tubes: [
        ['blue', 'red', 'purple', 'amber'],
        ['green', 'pink', 'cyan', 'blue'],
        ['red', 'purple', 'amber', 'green'],
        ['pink', 'cyan', 'blue', 'red'],
        ['purple', 'amber', 'green', 'pink'],
        ['cyan', 'blue', 'red', 'purple'],
        ['amber', 'green', 'pink', 'cyan'],
        [],
        []
      ]
    },
    {
      level: 13,
      name: 'Zero Trust Final',
      points: 9,
      tubes: [
        ['cyan', 'blue', 'pink', 'red'],
        ['green', 'amber', 'purple', 'cyan'],
        ['blue', 'pink', 'red', 'green'],
        ['amber', 'purple', 'cyan', 'blue'],
        ['pink', 'red', 'green', 'amber'],
        ['purple', 'cyan', 'blue', 'pink'],
        ['red', 'green', 'amber', 'purple'],
        [],
        []
      ]
    }
  ];

  const TUBE_CAPACITY = 4;
  const ROUND_TIME_LIMIT = 600; // 10 minutes for 13 levels

  // --- DOM Elements ---
  const $ = id => document.getElementById(id);
  const elements = {
    playfield: $('playfield'),
    btnSettings: $('btnSettings'),
    settingsOverlay: $('settingsOverlay'),
    sliderMusicVol: $('sliderMusicVol'),
    musicVolLabel: $('musicVolLabel'),
    sliderSfxVol: $('sliderSfxVol'),
    sfxVolLabel: $('sfxVolLabel'),
    btnSettingsResume: $('btnSettingsResume'),
    btnSettingsRestart: $('btnSettingsRestart'),
    modeBadge: $('modeBadge'),
    levelDisplay: $('levelDisplay'),
    timerDisplay: $('timerDisplay'),
    movesDisplay: $('movesDisplay'),
    scoreDisplay: $('scoreDisplay'),
    tubesGrid: $('tubesGrid'),
    btnUndo: $('btnUndo'),
    btnReset: $('btnReset'),
    btnMute: $('btnMute'),
    muteIcon: $('muteIcon'),
    btnSurrender: $('btnSurrender'),
    modalOverlay: $('modalOverlay'),
    modalTitle: $('modalTitle'),
    modalScore: $('modalScore'),
    modalMessage: $('modalMessage'),
    metricLevels: $('metricLevels'),
    metricMoves: $('metricMoves'),
    metricUndo: $('metricUndo'),
    metricDuration: $('metricDuration'),
    btnRetrySubmit: $('btnRetrySubmit'),
    btnReplay: $('btnReplay')
  };

  // --- Audio Synthesizer (Web Audio API with Ambient BGM & SFX) ---
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.sfxVolume = 0.8;
      this.musicVolume = 0.7;
      this.sfxGainNode = null;
      this.musicGainNode = null;
      this.bgmPlaying = false;
      this.bgmTimer = null;
      this.bgmStep = 0;
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
          this.sfxGainNode = this.ctx.createGain();
          this.sfxGainNode.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
          this.sfxGainNode.connect(this.ctx.destination);

          this.musicGainNode = this.ctx.createGain();
          this.musicGainNode.gain.setValueAtTime(this.musicVolume * 0.12, this.ctx.currentTime);
          this.musicGainNode.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (!this.bgmPlaying && !this.muted) {
        this.startBGM();
      }
    }

    setSfxVolume(val) {
      this.sfxVolume = Math.max(0, Math.min(1, val));
      if (this.sfxGainNode && this.ctx) {
        this.sfxGainNode.gain.setValueAtTime(this.muted ? 0 : this.sfxVolume, this.ctx.currentTime);
      }
    }

    setMusicVolume(val) {
      this.musicVolume = Math.max(0, Math.min(1, val));
      if (this.musicGainNode && this.ctx) {
        this.musicGainNode.gain.setValueAtTime(this.muted ? 0 : this.musicVolume * 0.12, this.ctx.currentTime);
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      if (this.sfxGainNode && this.ctx) {
        this.sfxGainNode.gain.setValueAtTime(this.muted ? 0 : this.sfxVolume, this.ctx.currentTime);
      }
      if (this.musicGainNode && this.ctx) {
        this.musicGainNode.gain.setValueAtTime(this.muted ? 0 : this.musicVolume * 0.12, this.ctx.currentTime);
      }
      return this.muted;
    }

    startBGM() {
      if (this.bgmTimer) return;
      this.bgmPlaying = true;
      // Ambient cyber chords sequence
      const chords = [
        [293.66, 349.23, 440.00], // D4, F4, A4
        [261.63, 329.63, 392.00], // C4, E4, G4
        [233.08, 293.66, 349.23], // Bb3, D4, F4
        [261.63, 329.63, 392.00]  // C4, E4, G4
      ];
      this.bgmStep = 0;

      const playChord = () => {
        if (!this.ctx || this.muted || this.musicVolume <= 0.01) return;
        const now = this.ctx.currentTime;
        const currentChord = chords[this.bgmStep % chords.length];
        this.bgmStep++;

        currentChord.forEach((freq, idx) => {
          try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.15);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.6);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);
            osc.connect(gain);
            gain.connect(this.musicGainNode || this.ctx.destination);
            osc.start(now);
            osc.stop(now + 3.8);
          } catch (_) {}
        });
      };

      playChord();
      this.bgmTimer = setInterval(playChord, 3600);
    }

    stopBGM() {
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
      this.bgmPlaying = false;
    }

    pauseAudio() {
      if (this.musicGainNode && this.ctx) {
        this.musicGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    }

    resumeAudio() {
      if (this.musicGainNode && this.ctx && !this.muted) {
        this.musicGainNode.gain.setValueAtTime(this.musicVolume * 0.12, this.ctx.currentTime);
      }
    }

    playTone(freq, type, duration, gainValue = 0.15) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.sfxGainNode || this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (_) {}
    }

    playSelect() {
      this.playTone(520, 'sine', 0.12, 0.14);
    }

    playDeselect() {
      this.playTone(380, 'sine', 0.1, 0.10);
    }

    playPour(duration = 0.38) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const step = 0.05;
        const count = Math.max(3, Math.floor(duration / step));
        for (let i = 0; i < count; i++) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          const freq = 420 + Math.random() * 260 + i * 18;
          osc.frequency.setValueAtTime(freq, now + i * step);
          gain.gain.setValueAtTime(0.10, now + i * step);
          gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * step);
          osc.connect(gain);
          gain.connect(this.sfxGainNode || this.ctx.destination);
          osc.start(now + i * step);
          osc.stop(now + (i + 1) * step);
        }
      } catch (_) {}
    }

    playInvalid() {
      this.playTone(180, 'sawtooth', 0.22, 0.16);
    }

    playLevelComplete() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      try {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          setTimeout(() => this.playTone(freq, 'sine', 0.35, 0.20), idx * 110);
        });
      } catch (_) {}
    }
  }

  const sound = new SoundManager();

  // --- Game State ---
  let currentLevelIdx = 0;
  let tubes = [];
  let moveHistory = [];
  let selectedTubeIdx = null;

  let totalMoves = 0;
  let undoCount = 0;
  let resetCount = 0;
  let levelsCompleted = 0;
  let rawScore = 0;

  let isPaused = false;
  let isStopped = false;
  let isFinished = false;
  let isHosted = false;
  let isAnimating = false;
  let isSettingsOpen = false;

  let startTime = 0;
  let roundElapsedMs = 0;
  let timerInterval = null;
  let timeRemainingSec = ROUND_TIME_LIMIT;
  let lastResultPayload = null;

  // --- Tube & Level Helpers ---
  function cloneTubes(src) {
    return src.map(tube => [...tube]);
  }

  function setupLevel(levelIdx) {
    currentLevelIdx = levelIdx;
    const config = LEVELS[currentLevelIdx];
    tubes = cloneTubes(config.tubes);
    selectedTubeIdx = null;
    moveHistory = [];
    renderTubes();
    updateUI();
  }

  function isTubeComplete(tube) {
    if (tube.length === 0) return true;
    if (tube.length !== TUBE_CAPACITY) return false;
    const firstColor = tube[0];
    return tube.every(c => c === firstColor);
  }

  function checkLevelWon() {
    return tubes.every(isTubeComplete);
  }

  // --- Rendering Playfield ---
  function renderTubes() {
    elements.tubesGrid.innerHTML = '';
    if (tubes.length >= 7) {
      elements.tubesGrid.classList.add('dense');
    } else {
      elements.tubesGrid.classList.remove('dense');
    }
    tubes.forEach((tube, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tube-wrapper';

      const btn = document.createElement('button');
      btn.className = 'tube-btn';
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-label', `หลอดที่ ${idx + 1}, มีของเหลว ${tube.length} จาก ${TUBE_CAPACITY} ส่วน`);
      btn.disabled = isPaused || isStopped || isFinished;

      if (selectedTubeIdx === idx) {
        btn.classList.add('selected');
      }
      if (tube.length === TUBE_CAPACITY && isTubeComplete(tube)) {
        btn.classList.add('completed');
      }

      // Liquid segments
      const liquidContainer = document.createElement('div');
      liquidContainer.className = 'tube-liquid';

      tube.forEach(colorId => {
        const seg = document.createElement('div');
        seg.className = 'liquid-segment';
        seg.style.background = COLORS[colorId]?.hex || '#00d4ff';
        seg.title = COLORS[colorId]?.label || colorId;
        liquidContainer.appendChild(seg);
      });

      // Glass overlay
      const glass = document.createElement('div');
      glass.className = 'tube-glass';

      btn.appendChild(liquidContainer);
      btn.appendChild(glass);

      btn.onclick = () => onTubeClick(idx, btn);

      const label = document.createElement('span');
      label.className = 'tube-label';
      label.textContent = `#${idx + 1}`;

      wrapper.appendChild(btn);
      wrapper.appendChild(label);
      elements.tubesGrid.appendChild(wrapper);
    });
  }

  // --- Interaction Logic ---
  function onTubeClick(idx, btnEl) {
    if (isPaused || isStopped || isFinished || isAnimating || isSettingsOpen) return;
    sound.init();

    // No tube selected yet
    if (selectedTubeIdx === null) {
      if (tubes[idx].length === 0) {
        // Cannot select empty tube
        shakeTube(btnEl);
        sound.playInvalid();
        return;
      }
      // If tube already full and complete, skip selection
      if (tubes[idx].length === TUBE_CAPACITY && isTubeComplete(tubes[idx])) {
        shakeTube(btnEl);
        sound.playInvalid();
        return;
      }
      selectedTubeIdx = idx;
      sound.playSelect();
      renderTubes();
      return;
    }

    // Clicked same tube: Deselect
    if (selectedTubeIdx === idx) {
      selectedTubeIdx = null;
      sound.playDeselect();
      renderTubes();
      return;
    }

    // Attempt to pour from selectedTubeIdx -> idx
    const fromTube = tubes[selectedTubeIdx];
    const toTube = tubes[idx];

    if (toTube.length >= TUBE_CAPACITY) {
      // Destination is full
      shakeTube(btnEl);
      sound.playInvalid();
      selectedTubeIdx = null;
      renderTubes();
      return;
    }

    const movingColor = fromTube[fromTube.length - 1];
    if (toTube.length > 0 && toTube[toTube.length - 1] !== movingColor) {
      // Color mismatch
      shakeTube(btnEl);
      sound.playInvalid();
      selectedTubeIdx = null;
      renderTubes();
      return;
    }

    // Valid move: calculate contiguous matching segments in source
    let countInSource = 0;
    for (let i = fromTube.length - 1; i >= 0; i--) {
      if (fromTube[i] === movingColor) countInSource++;
      else break;
    }
    const spaceInDest = TUBE_CAPACITY - toTube.length;
    const amountToMove = Math.min(countInSource, spaceInDest);

    // Execute pour with lift, tilt and pour stream animation
    const fromIdx = selectedTubeIdx;
    selectedTubeIdx = null;
    executePourWithAnimation(fromIdx, idx, movingColor, amountToMove);
  }

  function executePourWithAnimation(fromIdx, toIdx, movingColor, amountToMove) {
    isAnimating = true;
    updateUI();

    const fromWrapper = elements.tubesGrid.children[fromIdx];
    const toWrapper = elements.tubesGrid.children[toIdx];
    const fromBtn = fromWrapper?.querySelector('.tube-btn');
    const toBtn = toWrapper?.querySelector('.tube-btn');

    if (!fromBtn || !toBtn || !elements.playfield) {
      // Fallback
      const fromTube = tubes[fromIdx];
      const toTube = tubes[toIdx];
      moveHistory.push({ from: fromIdx, to: toIdx, count: amountToMove, color: movingColor });
      for (let i = 0; i < amountToMove; i++) toTube.push(fromTube.pop());
      totalMoves++;
      selectedTubeIdx = null;
      isAnimating = false;
      renderTubes();
      updateUI();
      if (checkLevelWon()) onLevelComplete();
      return;
    }

    const fromRect = fromBtn.getBoundingClientRect();
    const toRect = toBtn.getBoundingClientRect();
    const playfieldRect = elements.playfield.getBoundingClientRect();

    const deltaX = toRect.left - fromRect.left;
    const deltaY = toRect.top - fromRect.top;
    const isMovingRight = deltaX >= 0;

    // Phase 1: Lift, tilt and fly over destination lip
    const targetX = deltaX + (isMovingRight ? -(fromRect.width * 0.42) : (fromRect.width * 0.42));
    const targetY = deltaY - (fromRect.height * 0.52);
    const tiltAngle = isMovingRight ? 68 : -68;

    fromBtn.classList.remove('selected');
    fromBtn.classList.add('pouring');
    fromBtn.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) rotate(${tiltAngle}deg)`;

    // Phase 2: Start liquid stream and level transfer after tube arrives in position
    setTimeout(() => {
      if (isStopped) return;

      const colorHex = COLORS[movingColor]?.hex || '#00d4ff';

      // Pour stream element
      const stream = document.createElement('div');
      stream.className = 'pour-stream';
      stream.style.background = `linear-gradient(to bottom, ${colorHex}, ${colorHex}cc)`;
      stream.style.color = colorHex;
      stream.style.boxShadow = `0 0 10px ${colorHex}`;

      const streamLeft = (toRect.left - playfieldRect.left) + (toRect.width / 2) - 3;
      const streamTop = (toRect.top - playfieldRect.top) + 4;
      const streamHeight = Math.max(30, (toRect.height * 0.22) * (TUBE_CAPACITY - tubes[toIdx].length));

      stream.style.left = `${streamLeft}px`;
      stream.style.top = `${streamTop}px`;
      stream.style.height = `${streamHeight}px`;
      elements.playfield.appendChild(stream);

      // Splash ripple
      const splash = document.createElement('div');
      splash.className = 'pour-splash';
      splash.style.color = colorHex;
      splash.style.left = `${streamLeft - 8}px`;
      splash.style.top = `${streamTop + streamHeight - 4}px`;
      elements.playfield.appendChild(splash);

      // Pour audio
      sound.playPour(0.35);

      // Animate transferring liquid segments
      const fromSegments = fromBtn.querySelectorAll('.liquid-segment');
      for (let i = 0; i < amountToMove; i++) {
        const seg = fromSegments[fromSegments.length - 1 - i];
        if (seg) {
          seg.style.transition = 'transform 0.3s ease, opacity 0.25s ease';
          seg.style.opacity = '0.15';
          seg.style.transform = 'scaleY(0)';
          seg.style.transformOrigin = 'bottom';
        }
      }

      const toLiquid = toBtn.querySelector('.tube-liquid');
      const tempSegments = [];
      for (let i = 0; i < amountToMove; i++) {
        const seg = document.createElement('div');
        seg.className = 'liquid-segment';
        seg.style.background = colorHex;
        seg.style.height = '0%';
        seg.style.transition = 'height 0.3s ease';
        toLiquid.appendChild(seg);
        tempSegments.push(seg);
      }
      requestAnimationFrame(() => {
        tempSegments.forEach(seg => {
          seg.style.height = '25%';
        });
      });

      // Phase 3: Stop stream & Return tube to slot
      setTimeout(() => {
        stream.remove();
        splash.remove();

        fromBtn.classList.remove('pouring');
        fromBtn.classList.add('returning');
        fromBtn.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';

        // Phase 4: Settle & Sync State
        setTimeout(() => {
          fromBtn.classList.remove('returning');
          fromBtn.style.transform = '';

          const fromTube = tubes[fromIdx];
          const toTube = tubes[toIdx];

          moveHistory.push({
            from: fromIdx,
            to: toIdx,
            count: amountToMove,
            color: movingColor
          });

          for (let i = 0; i < amountToMove; i++) {
            toTube.push(fromTube.pop());
          }

          totalMoves++;
          selectedTubeIdx = null;
          isAnimating = false;

          renderTubes();
          updateUI();

          if (checkLevelWon()) {
            onLevelComplete();
          }
        }, 260);
      }, 360);
    }, 320);
  }

  function shakeTube(el) {
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth; // trigger reflow
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 250);
  }

  function onLevelComplete() {
    sound.playLevelComplete();
    const config = LEVELS[currentLevelIdx];
    rawScore += config.points;
    levelsCompleted++;
    updateUI();

    if (currentLevelIdx + 1 < LEVELS.length) {
      // Next level
      setTimeout(() => {
        setupLevel(currentLevelIdx + 1);
      }, 700);
    } else {
      // All levels cleared!
      finishGame('completed');
    }
  }

  function handleUndo() {
    if (isPaused || isStopped || isFinished || isAnimating || isSettingsOpen || moveHistory.length === 0) return;
    const last = moveHistory.pop();
    for (let i = 0; i < last.count; i++) {
      tubes[last.from].push(tubes[last.to].pop());
    }
    undoCount++;
    selectedTubeIdx = null;
    sound.playSelect();
    renderTubes();
    updateUI();
  }

  function handleReset() {
    if (isPaused || isStopped || isFinished || isAnimating || isSettingsOpen) return;
    resetCount++;
    setupLevel(currentLevelIdx);
    sound.playDeselect();
  }

  function handleSurrender() {
    if (isPaused || isStopped || isFinished || isAnimating || isSettingsOpen) return;
    if (confirm('คุณต้องการจบรอบนี้และส่งคะแนนปัจจุบันใช่หรือไม่?')) {
      finishGame('abandoned');
    }
  }

  // --- Timer & Lifecycle ---
  function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
      if (isPaused || isStopped || isFinished || isSettingsOpen) return;
      timeRemainingSec--;
      if (timeRemainingSec <= 0) {
        timeRemainingSec = 0;
        updateUI();
        stopTimer();
        finishGame(levelsCompleted > 0 ? 'completed' : 'failed');
        return;
      }
      updateUI();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateUI() {
    elements.levelDisplay.textContent = `${currentLevelIdx + 1}/${LEVELS.length}`;
    elements.movesDisplay.textContent = totalMoves;
    elements.scoreDisplay.textContent = rawScore;

    const m = Math.floor(timeRemainingSec / 60);
    const s = timeRemainingSec % 60;
    elements.timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    elements.btnUndo.disabled = isPaused || isStopped || isFinished || isAnimating || isSettingsOpen || moveHistory.length === 0;
    elements.btnReset.disabled = isPaused || isStopped || isFinished || isAnimating || isSettingsOpen;
    elements.btnSurrender.disabled = isPaused || isStopped || isFinished || isAnimating || isSettingsOpen;
    if (elements.btnSettings) {
      elements.btnSettings.disabled = isFinished || isStopped;
    }
  }

  // --- Finish and Submit Result ---
  async function finishGame(outcome) {
    if (isFinished) return;
    isFinished = true;
    stopTimer();
    renderTubes();
    updateUI();

    const durationMs = Math.max(0, Math.round(performance.now() - startTime));
    lastResultPayload = {
      outcome,
      rawScore: Math.min(100, Math.max(0, rawScore)),
      durationMs,
      metrics: {
        levelsCompleted,
        totalMoves,
        undoCount,
        resetCount,
        timeRemainingSec
      }
    };

    // Update modal content
    elements.modalTitle.textContent = outcome === 'completed'
      ? (levelsCompleted === 3 ? '🎉 ภารกิจสำเร็จสมบูรณ์!' : '✨ สรุปรอบการเล่น')
      : (outcome === 'failed' ? '⏱️ หมดเวลา!' : '🏳️ จบรอบการเล่น');

    elements.modalScore.textContent = `${rawScore} / 100`;
    elements.metricLevels.textContent = `${levelsCompleted}/${LEVELS.length}`;
    elements.metricMoves.textContent = totalMoves;
    elements.metricUndo.textContent = undoCount;
    elements.metricDuration.textContent = `${Math.round(durationMs / 1000)}s`;

    elements.modalOverlay.hidden = false;
    elements.btnRetrySubmit.hidden = true;

    await submitResult();
  }

  async function submitResult() {
    elements.btnRetrySubmit.hidden = true;
    elements.modalMessage.textContent = isHosted
      ? 'กำลังส่งผลการเล่นไปยังโฮสต์ Simulation...'
      : 'โหมดเล่นแยก (Standalone) ไม่มีการส่งหรือบันทึกคะแนนเข้า Simulation';

    try {
      const ack = await ZTMiniGame.finish(lastResultPayload);
      if (ack.status === 'practice') {
        elements.modalMessage.textContent = `จบรอบฝึก standalone เรียบร้อย! คะแนนเกมดิบ: ${rawScore} แต้ม (ไม่ได้เชื่อมต่อคะแนนจริง)`;
      } else if (ack.status === 'accepted') {
        elements.modalMessage.textContent = `✅ โฮสต์รับรองผลสำเร็จ! ได้รับคะแนนจำลอง ${ack.awardedPoints} แต้ม (สถานะ: ${ack.persisted || 'mock-only'})`;
      } else {
        elements.modalMessage.textContent = `⚠️ โฮสต์ตอบรับ: ${ack.reason || 'ไม่ระบุเหตุผล'}`;
      }
    } catch (err) {
      elements.modalMessage.textContent = `❌ ${err.message || 'ส่งผลไม่สำเร็จ'}`;
      elements.btnRetrySubmit.hidden = false;
    }
  }

  // --- Event Listeners & Keyboard Accessibility ---
  elements.btnUndo.onclick = handleUndo;
  elements.btnReset.onclick = handleReset;
  elements.btnSurrender.onclick = handleSurrender;

  // Settings Modal Handlers
  if (elements.btnSettings) {
    elements.btnSettings.onclick = () => {
      if (isFinished || isStopped) return;
      sound.init();
      sound.playSelect();
      isSettingsOpen = true;
      elements.settingsOverlay.hidden = false;
      updateUI();
    };
  }

  if (elements.sliderMusicVol) {
    elements.sliderMusicVol.oninput = e => {
      const val = parseInt(e.target.value, 10);
      elements.musicVolLabel.textContent = `${val}%`;
      sound.setMusicVolume(val / 100);
    };
  }

  if (elements.sliderSfxVol) {
    elements.sliderSfxVol.oninput = e => {
      const val = parseInt(e.target.value, 10);
      elements.sfxVolLabel.textContent = `${val}%`;
      sound.setSfxVolume(val / 100);
    };
    elements.sliderSfxVol.onchange = () => {
      sound.playSelect();
    };
  }

  if (elements.btnSettingsResume) {
    elements.btnSettingsResume.onclick = () => {
      sound.playDeselect();
      elements.settingsOverlay.hidden = true;
      isSettingsOpen = false;
      updateUI();
    };
  }

  if (elements.btnSettingsRestart) {
    elements.btnSettingsRestart.onclick = () => {
      sound.playSelect();
      elements.settingsOverlay.hidden = true;
      isSettingsOpen = false;
      handleReset();
    };
  }

  elements.btnMute.onclick = () => {
    const isMuted = sound.toggleMute();
    elements.muteIcon.textContent = isMuted ? '🔇' : '🔊';
    elements.btnMute.setAttribute('aria-pressed', String(isMuted));
  };

  elements.btnRetrySubmit.onclick = submitResult;
  elements.btnReplay.onclick = () => {
    elements.modalOverlay.hidden = true;
    ZTMiniGame.requestReplay();
  };

  window.addEventListener('keydown', e => {
    if (isFinished || isPaused || isStopped || isAnimating || isSettingsOpen) return;
    if (e.key === 'u' || e.key === 'U') handleUndo();
    if (e.key === 'r' || e.key === 'R') handleReset();
    if (e.key === 'm' || e.key === 'M') elements.btnMute.click();
    // Numeric keys 1-9 to select tubes
    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= tubes.length) {
      const btn = elements.tubesGrid.children[num - 1]?.querySelector('.tube-btn');
      if (btn) onTubeClick(num - 1, btn);
    }
  });

  // --- ZTMiniGame Handshake ---
  ZTMiniGame.connect({
    start(info) {
      isHosted = info.embedded;
      isPaused = false;
      isStopped = false;
      isFinished = false;
      isAnimating = false;
      isSettingsOpen = false;
      selectedTubeIdx = null;

      totalMoves = 0;
      undoCount = 0;
      resetCount = 0;
      levelsCompleted = 0;
      rawScore = 0;
      timeRemainingSec = ROUND_TIME_LIMIT;
      lastResultPayload = null;
      startTime = performance.now();

      elements.modalOverlay.hidden = true;
      if (elements.settingsOverlay) elements.settingsOverlay.hidden = true;
      elements.modeBadge.className = 'mode-badge' + (isHosted ? '' : ' practice');
      elements.modeBadge.textContent = isHosted ? 'เชื่อมกับโฮสต์ทดสอบแล้ว' : 'โหมดเล่นแยก (ไม่บันทึกคะแนนจริง)';

      setupLevel(0);
      startTimer();
    },

    pause() {
      isPaused = true;
      sound.pauseAudio();
      elements.modeBadge.className = 'mode-badge paused';
      elements.modeBadge.textContent = '⏸️ พักเกมอยู่';
      renderTubes();
      updateUI();
    },

    resume() {
      isPaused = false;
      sound.resumeAudio();
      elements.modeBadge.className = 'mode-badge' + (isHosted ? '' : ' practice');
      elements.modeBadge.textContent = isHosted ? 'เชื่อมกับโฮสต์ทดสอบแล้ว' : 'โหมดเล่นแยก';
      renderTubes();
      updateUI();
    },

    stop() {
      isStopped = true;
      sound.stopBGM();
      stopTimer();
      renderTubes();
      updateUI();
    },

    error(errText) {
      elements.modeBadge.className = 'mode-badge paused';
      elements.modeBadge.textContent = errText;
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !isHosted && !isStopped && isPaused) {
      // Resume practice mode if window brought back
      isPaused = false;
      elements.modeBadge.className = 'mode-badge practice';
      elements.modeBadge.textContent = 'โหมดเล่นแยก (ไม่บันทึกคะแนนจริง)';
      renderTubes();
      updateUI();
    }
  });
})();
