(() => {
  'use strict';

  /* ==========================================================================
     1. Web Audio API Synthesizer (Zero External Dependencies)
     ========================================================================== */
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.isMusicMuted = false;
      this.isSfxMuted = false;
      this.musicVolume = 0.4;
      this.sfxVolume = 0.7;
      this.bgmTimer = null;
      this.bgmStep = 0;
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.startBGM();
    }

    pause() {
      if(this.bgmTimer){clearInterval(this.bgmTimer);this.bgmTimer=null;}
      this.ctx?.suspend?.()?.catch?.(()=>{});
    }

    resume() {
      if(this.ctx){this.ctx.resume?.()?.catch?.(()=>{});this.startBGM();}
    }

    setMusicVolume(vol) {
      this.musicVolume = Math.max(0, Math.min(1, vol));
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.setValueAtTime(this.isMusicMuted ? 0 : this.musicVolume, this.ctx.currentTime);
      }
    }

    setSfxVolume(vol) {
      this.sfxVolume = Math.max(0, Math.min(1, vol));
      if (this.sfxGain && this.ctx) {
        this.sfxGain.gain.setValueAtTime(this.isSfxMuted ? 0 : this.sfxVolume, this.ctx.currentTime);
      }
    }

    // มีเสียงคลิก เมื่อคลิกที่เบี้ย
    playClick() {
      if (!this.ctx || this.isSfxMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(700, t + 0.04);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.04);
    }

    // วางหมากมีเสียง pop
    playPop() {
      if (!this.ctx || this.isSfxMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.09);
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.09);
    }

    // หมวกกินฝั่งตรงข้ามมีเสียง (เสียงกินหมากหนักแน่น)
    playCapture() {
      if (!this.ctx || this.isSfxMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      // Thump
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.14);
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.14);

      // Snap click
      const snap = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snap.type = 'sawtooth';
      snap.frequency.setValueAtTime(800, t);
      snap.frequency.exponentialRampToValueAtTime(100, t + 0.05);
      snapGain.gain.setValueAtTime(0.4, t);
      snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      snap.connect(snapGain);
      snapGain.connect(this.sfxGain);
      snap.start(t);
      snap.stop(t + 0.05);
    }

    // เข้าฮอส หมาก จะมีแสงสีรุ้ง วิบวับ เอนิเมชั่น (เสียงระฆังแก้วประกายรุ้ง)
    playCrown() {
      if (!this.ctx || this.isSfxMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
      notes.forEach((freq, idx) => {
        const noteTime = t + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);
        gain.gain.setValueAtTime(0.35, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(noteTime);
        osc.stop(noteTime + 0.35);
      });
    }

    // เสียงชนะ
    playWin() {
      if (!this.ctx || this.isSfxMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const chords = [
        [523.25, 659.25, 783.99],       // C Major
        [587.33, 739.99, 880.00],       // D Major
        [659.25, 830.61, 987.77],       // E Major
        [1046.50, 1318.51, 1567.98]     // High C Major
      ];
      chords.forEach((chord, i) => {
        const noteTime = t + i * 0.16;
        chord.forEach(freq => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, noteTime);
          gain.gain.setValueAtTime(0.28, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + (i === 3 ? 0.8 : 0.22));
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(noteTime);
          osc.stop(noteTime + (i === 3 ? 0.8 : 0.22));
        });
      });
    }

    // เสียงแพ้
    playLose() {
      if (!this.ctx || this.isSfxMuted) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const notes = [440.00, 415.30, 392.00, 349.23];
      notes.forEach((freq, i) => {
        const noteTime = t + i * 0.22;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);
        gain.gain.setValueAtTime(0.3, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(noteTime);
        osc.stop(noteTime + 0.35);
      });
    }

    // ดนตรีประกอบ BGM แบบ Ambient ผ่อนคลาย
    startBGM() {
      if (this.bgmTimer) return;
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // Pentatonic
      this.bgmTimer = setInterval(() => {
        if (!this.ctx || this.isMusicMuted || this.musicVolume <= 0.01) return;
        if (this.ctx.state === 'suspended') return;
        const note = scale[Math.floor(Math.random() * scale.length)];
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + 1.2);
      }, 1400);
    }
  }

  /* ==========================================================================
     2. Thai Checkers Rules & Move Generator
     ========================================================================== */
  // Player = Black (สีดำ, ด้านล่าง, row 6-7, เดินขึ้นไปหา row 0)
  // AI = White (สีขาว, ด้านบน, row 0-1, เดินลงมาหา row 7)
  const SIDE_BLACK = 'black';
  const SIDE_WHITE = 'white';

  class ThaiCheckersEngine {
    constructor() {
      this.board = Array(8).fill(null).map(() => Array(8).fill(null));
      this.turn = SIDE_BLACK; // Black moves first
      this.reset();
    }

    reset() {
      this.board = Array(8).fill(null).map(() => Array(8).fill(null));
      this.turn = SIDE_BLACK;
      // White pieces (Row 0: 1,3,5,7 ; Row 1: 0,2,4,6)
      for (let c = 1; c < 8; c += 2) this.board[0][c] = { side: SIDE_WHITE, isKing: false };
      for (let c = 0; c < 8; c += 2) this.board[1][c] = { side: SIDE_WHITE, isKing: false };

      // Black pieces (Row 6: 1,3,5,7 ; Row 7: 0,2,4,6)
      for (let c = 1; c < 8; c += 2) this.board[6][c] = { side: SIDE_BLACK, isKing: false };
      for (let c = 0; c < 8; c += 2) this.board[7][c] = { side: SIDE_BLACK, isKing: false };
    }

    cloneBoard(b = this.board) {
      return b.map(row => row.map(cell => cell ? { ...cell } : null));
    }

    isValidSquare(r, c) {
      return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    countPieces(b = this.board) {
      let white = 0, black = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = b[r][c];
          if (!p) continue;
          if (p.side === SIDE_WHITE) white++;
          else if (p.side === SIDE_BLACK) black++;
        }
      }
      return { white, black };
    }

    // ตรวจสอบการเดินทั้งหมดของตัวหมากหนึ่งตัว
    getMovesForPiece(r, c, b = this.board) {
      const piece = b[r][c];
      if (!piece) return [];
      const side = piece.side;
      const isKing = piece.isKing;
      const captures = [];
      const quiets = [];

      // ทิศทางเดิน
      // เบี้ยดำเดินขึ้น (dr = -1) | เบี้ยขาวเดินลง (dr = +1)
      const forwardDir = side === SIDE_BLACK ? -1 : 1;
      const kingDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

      if (!isKing) {
        // --- 1. เบี้ยธรรมดา (Ordinary Man) ---
        // 1.1 เดินธรรมดา (ทแยงไปข้างหน้า 1 ช่อง)
        for (const dc of [-1, 1]) {
          const nr = r + forwardDir;
          const nc = c + dc;
          if (this.isValidSquare(nr, nc) && b[nr][nc] === null) {
            quiets.push({
              from: { r, c },
              to: { r: nr, c: nc },
              captures: [],
              path: [{ r, c }, { r: nr, c: nc }],
              promoted: (side === SIDE_BLACK && nr === 0) || (side === SIDE_WHITE && nr === 7)
            });
          }
        }

        // 1.2 กิน (กระโดดข้ามตัวฝั่งตรงข้ามไปข้างหน้า 2 ช่อง)
        // ตามกฎหมากฮอสไทย: เบี้ยกินทแยงไปข้างหน้าเท่านั้น และหากกินต่อได้ต้องกินต่อ
        const findManCaptures = (currR, currC, currBoard, jumpedPieces, path) => {
          let hasFollowUp = false;
          for (const dc of [-1, 1]) {
            const midR = currR + forwardDir;
            const midC = currC + dc;
            const landR = currR + forwardDir * 2;
            const landC = currC + dc * 2;

            if (this.isValidSquare(landR, landC)) {
              const midPiece = currBoard[midR][midC];
              const landPiece = currBoard[landR][landC];
              // ถ้าช่องกลางเป็นศัตรู และยังไม่ถูกกินในเทิร์นนี้ และช่องปลายทางว่าง
              if (midPiece && midPiece.side !== side && landPiece === null && !jumpedPieces.some(p => p.r === midR && p.c === midC)) {
                hasFollowUp = true;
                const nextJumped = [...jumpedPieces, { r: midR, c: midC }];
                const nextPath = [...path, { r: landR, c: landC }];
                const willPromote = (side === SIDE_BLACK && landR === 0) || (side === SIDE_WHITE && landR === 7);

                // หากเข้าฮอส จะหยุดตานั้นทันทีตามกติกาหมากฮอสไทย
                if (willPromote) {
                  captures.push({
                    from: { r, c },
                    to: { r: landR, c: landC },
                    captures: nextJumped,
                    path: nextPath,
                    promoted: true
                  });
                } else {
                  // จำลองบอร์ดเพื่อหาการกินต่อ (Multi-jump)
                  const nextBoard = this.cloneBoard(currBoard);
                  nextBoard[landR][landC] = nextBoard[currR][currC];
                  nextBoard[currR][currC] = null;
                  nextBoard[midR][midC] = null; // ถอดตัวที่โดนกินออกชั่วคราว
                  
                  const beforeLen = captures.length;
                  findManCaptures(landR, landC, nextBoard, nextJumped, nextPath);
                  // ถ้าไม่มีกินต่อ ให้บันทึกการกินขั้นตอนนี้
                  if (captures.length === beforeLen) {
                    captures.push({
                      from: { r, c },
                      to: { r: landR, c: landC },
                      captures: nextJumped,
                      path: nextPath,
                      promoted: false
                    });
                  }
                }
              }
            }
          }
        };

        findManCaptures(r, c, b, [], [{ r, c }]);

      } else {
        // --- 2. ฮอส (Flying King) ---
        // 2.1 เดินธรรมดา: เลื่อนกี่ช่องก็ได้ในแนวทแยง 4 ทิศทาง จนกว่าจะติดหมากหรือขอบกระดาน
        for (const [dr, dc] of kingDirs) {
          let step = 1;
          while (true) {
            const nr = r + dr * step;
            const nc = c + dc * step;
            if (!this.isValidSquare(nr, nc)) break;
            if (b[nr][nc] !== null) break; // โดนหมากขวาง
            quiets.push({
              from: { r, c },
              to: { r: nr, c: nc },
              captures: [],
              path: [{ r, c }, { r: nr, c: nc }],
              promoted: false
            });
            step++;
          }
        }

        // 2.2 กินของฮอส (Flying King Capture):
        // บินตามแนวทแยง ข้ามศัตรู 1 ตัว และลงในช่องว่างช่องใดก็ได้ด้านหลังศัตรู
        const findKingCaptures = (currR, currC, currBoard, jumpedPieces, path) => {
          let anyCaptureFound = false;
          for (const [dr, dc] of kingDirs) {
            let enemyPos = null;
            let step = 1;
            while (true) {
              const checkR = currR + dr * step;
              const checkC = currC + dc * step;
              if (!this.isValidSquare(checkR, checkC)) break;
              const p = currBoard[checkR][checkC];
              if (p !== null) {
                if (p.side !== side && !jumpedPieces.some(j => j.r === checkR && j.c === checkC)) {
                  enemyPos = { r: checkR, c: checkC };
                }
                break; // เจอหมากตัวแรกหยุดมองหาต่อในแนวนี้
              }
              step++;
            }

            if (enemyPos) {
              // กติกา: ฮอสตอนกิน ข้ามได้แค่ 1 ช่องทันทีหลังศัตรูเท่านั้น (ไม่สามารถกินแล้วข้ามไปหลายบล็อกได้)
              const landR = enemyPos.r + dr;
              const landC = enemyPos.c + dc;
              if (this.isValidSquare(landR, landC) && currBoard[landR][landC] === null) {
                anyCaptureFound = true;
                const nextJumped = [...jumpedPieces, enemyPos];
                const nextPath = [...path, { r: landR, c: landC }];
                const nextBoard = this.cloneBoard(currBoard);
                nextBoard[landR][landC] = nextBoard[currR][currC];
                nextBoard[currR][currC] = null;
                nextBoard[enemyPos.r][enemyPos.c] = null;

                const beforeLen = captures.length;
                findKingCaptures(landR, landC, nextBoard, nextJumped, nextPath);
                if (captures.length === beforeLen) {
                  captures.push({
                    from: { r, c },
                    to: { r: landR, c: landC },
                    captures: nextJumped,
                    path: nextPath,
                    promoted: false
                  });
                }
              }
            }
          }
        };

        findKingCaptures(r, c, b, [], [{ r, c }]);
      }

      return { captures, quiets };
    }

    // ดึงตาเดินทั้งหมดของฝ่ายที่กำลังเล่น (ใช้กฎบังคับกิน: ถ้ามีตัวกิน ต้องกินเท่านั้น)
    getAllMoves(side = this.turn, b = this.board) {
      let allCaptures = [];
      let allQuiets = [];

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = b[r][c];
          if (piece && piece.side === side) {
            const { captures, quiets } = this.getMovesForPiece(r, c, b);
            if (captures.length > 0) allCaptures.push(...captures);
            if (quiets.length > 0) allQuiets.push(...quiets);
          }
        }
      }

      // กฎบังคับกิน (Mandatory Capture): ถ้ามีกิน ต้องเลือกเดินเฉพาะตากินเท่านั้น
      if (allCaptures.length > 0) {
        return allCaptures;
      }
      return allQuiets;
    }

    // ประมวลผลการเดินหมาก
    applyMove(move, b = this.board) {
      const { from, to, captures, promoted } = move;
      const piece = { ...b[from.r][from.c] };
      b[from.r][from.c] = null;

      // กินหมากคู่ต่อสู้
      if (captures && captures.length > 0) {
        for (const cap of captures) {
          b[cap.r][cap.c] = null;
        }
      }

      // เข้าฮอส
      if (promoted) {
        piece.isKing = true;
      }

      b[to.r][to.c] = piece;
      return { piece, capturedCount: captures ? captures.length : 0, newlyCrowned: promoted };
    }
  }

  /* ==========================================================================
     3. Medium-Pro AI Engine (Minimax with Alpha-Beta Pruning)
     ========================================================================== */
  class ThaiCheckersAI {
    constructor(engine) {
      this.engine = engine;
      this.maxDepth = 4; // Medium-Pro search depth
    }

    // ประเมินมูลค่ากระดาน (AI = White = Maximizer, Player = Black = Minimizer)
    evaluate(board) {
      let score = 0;
      let whiteCount = 0, blackCount = 0;
      let whiteKings = 0, blackKings = 0;

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (!p) continue;
          if (p.side === SIDE_WHITE) {
            whiteCount++;
            if (p.isKing) {
              whiteKings++;
              score += 390;
              // คุมพื้นที่กลางกระดาน
              if (r >= 2 && r <= 5 && c >= 2 && c <= 5) score += 20;
            } else {
              score += 100;
              // เดินเข้าใกล้การเข้าฮอส (ยิ่งลึกยิ่งได้คะแนน)
              score += r * 10;
              if (r === 6) score += 35; // จ่อเข้าฮอส
              if (r === 0) score += 15; // ป้องกันแถวหลัง
              if (c === 0 || c === 7) score += 5; // เกาะริมกันโดนกินง่าย
            }
          } else {
            blackCount++;
            if (p.isKing) {
              blackKings++;
              score -= 390;
              if (r >= 2 && r <= 5 && c >= 2 && c <= 5) score -= 20;
            } else {
              score -= 100;
              score -= (7 - r) * 10;
              if (r === 1) score -= 35;
              if (r === 7) score -= 15;
              if (c === 0 || c === 7) score -= 5;
            }
          }
        }
      }

      // โบนัสถ้ากินจนอีกฝั่งใกล้หมด
      if (blackCount === 0) return 100000;
      if (whiteCount === 0) return -100000;

      return score;
    }

    // Alpha-Beta Minimax
    minimax(board, depth, alpha, beta, isMaximizing) {
      const currentSide = isMaximizing ? SIDE_WHITE : SIDE_BLACK;
      const moves = this.engine.getAllMoves(currentSide, board);

      // จบเกม หรือถึงขอบเขตความลึก
      if (moves.length === 0) {
        return isMaximizing ? -50000 + depth : 50000 - depth;
      }
      if (depth === 0) {
        return this.evaluate(board);
      }

      if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
          const nextBoard = this.engine.cloneBoard(board);
          this.engine.applyMove(move, nextBoard);
          const evalVal = this.minimax(nextBoard, depth - 1, alpha, beta, false);
          maxEval = Math.max(maxEval, evalVal);
          alpha = Math.max(alpha, evalVal);
          if (beta <= alpha) break; // Pruning
        }
        return maxEval;
      } else {
        let minEval = Infinity;
        for (const move of moves) {
          const nextBoard = this.engine.cloneBoard(board);
          this.engine.applyMove(move, nextBoard);
          const evalVal = this.minimax(nextBoard, depth - 1, alpha, beta, true);
          minEval = Math.min(minEval, evalVal);
          beta = Math.min(beta, evalVal);
          if (beta <= alpha) break; // Pruning
        }
        return minEval;
      }
    }

    // ตัดสินใจเลือกตาเดินที่ดีที่สุด
    findBestMove() {
      const moves = this.engine.getAllMoves(SIDE_WHITE, this.engine.board);
      if (moves.length === 0) return null;
      if (moves.length === 1) return moves[0];

      let bestScore = -Infinity;
      let bestMoves = [];

      for (const move of moves) {
        const nextBoard = this.engine.cloneBoard(this.engine.board);
        this.engine.applyMove(move, nextBoard);
        const score = this.minimax(nextBoard, this.maxDepth - 1, -Infinity, Infinity, false);

        if (score > bestScore) {
          bestScore = score;
          bestMoves = [move];
        } else if (score === bestScore) {
          bestMoves.push(move);
        }
      }

      // หากมีตาเดินที่ได้คะแนนสูงสุดเท่ากัน สุ่ม 1 ตาเพื่อความเป็นธรรมชาติ
      return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }
  }

  /* ==========================================================================
     4. Main Game Application & UI Controller
     ========================================================================== */
  class ThaiCheckersApp {
    constructor() {
      this.sound = new SoundEngine();
      this.engine = new ThaiCheckersEngine();
      this.ai = new ThaiCheckersAI(this.engine);

      // State
      this.selectedPiece = null;
      this.validMoves = [];
      this.isGameActive = false;
      this.isPaused = false;
      this.isAiThinking = false;
      this.isAnimating = false;
      this.roundStartTime = 0;
      this.lastResult = null;
      this.embedded = !!window.parent && window.parent !== window;
      this.hostReady = !this.embedded;
      this.externalPaused = false;
      this.roundFinished = false;
      this.roundGeneration = 0;
      this.playerScore = 0;

      // Clocks (5 minutes = 300s)
      this.playerTime = 300;
      this.aiTime = 300;
      this.timerInterval = null;

      // Stats
      this.stats = {
        movesCount: 0,
        playerCaptures: 0,
        aiCaptures: 0,
        playerKings: 0,
        aiKings: 0
      };

      this.initDom();
      if(this.embedded){const start=document.getElementById('btnStartGame');if(start)start.disabled=true;}
      this.loadStoredScore();
      this.initSdk();
      this.renderBoard();
    }

    loadStoredScore() {
      try {
        const stored = localStorage.getItem('zt_thai_checkers_score');
        if (stored !== null) this.playerScore = parseInt(stored, 10) || 0;
      } catch (e) {}
      this.updateScoreDisplay();
    }

    saveStoredScore(delta) {
      this.playerScore += delta;
      try {
        localStorage.setItem('zt_thai_checkers_score', String(this.playerScore));
      } catch (e) {}
      this.updateScoreDisplay();
    }

    updateScoreDisplay() {
      const homeScore = document.getElementById('scoreHome');
      const settingsScore = document.getElementById('scoreSettings');
      const text = this.playerScore >= 0 ? `+${this.playerScore}` : `${this.playerScore}`;
      if (homeScore) homeScore.textContent = text;
      if (settingsScore) settingsScore.textContent = text;
    }

    initDom() {
      // Screens & Modals
      this.homeScreen = document.getElementById('homeScreen');
      this.gameScreen = document.getElementById('gameScreen');
      this.settingsModal = document.getElementById('settingsModal');
      this.gameOverModal = document.getElementById('gameOverModal');
      this.boardEl = document.getElementById('board');

      // Buttons
      document.getElementById('btnStartGame')?.addEventListener('click', () => {
        this.sound.init();
        this.sound.playClick();
        this.startGame();
      });

      document.getElementById('btnHowToPlay')?.addEventListener('click', () => {
        this.sound.init();
        this.sound.playClick();
        const modal = document.getElementById('howToPlayModal');
        if (modal) modal.hidden = false;
      });

      document.getElementById('btnCloseHowToPlay')?.addEventListener('click', () => {
        this.sound.playClick();
        const modal = document.getElementById('howToPlayModal');
        if (modal) modal.hidden = true;
      });

      document.getElementById('btnOpenSettings')?.addEventListener('click', () => {
        this.sound.init();
        this.sound.playClick();
        this.openSettings();
      });

      document.getElementById('btnHomeSettings')?.addEventListener('click', () => {
        this.sound.init();
        this.sound.playClick();
        this.openSettings();
      });

      // Settings modal buttons
      // 1. ปุ่มกลับเข้าเกม
      document.getElementById('btnResumeGame')?.addEventListener('click', () => {
        this.sound.playClick();
        this.closeSettings();
      });

      // 2. ปุ่มยอมแพ้ (จะกลับไปหน้า home พร้อมหัก 20 แต้ม)
      document.getElementById('btnResignGame')?.addEventListener('click', () => {
        this.sound.playClick();
        this.closeSettings();
        if (this.isGameActive) {
          this.endGame(false, 'ผู้เล่นกดยอมแพ้ผ่านเมนูตั้งค่า');
        } else {
          this.goHome();
        }
      });

      // Game Over modal buttons (ปุ่มล่าง: เริ่มใหม่ - home)
      document.getElementById('btnRestartGameOver')?.addEventListener('click', () => {
        this.sound.playClick();
        this.gameOverModal.hidden = true;
        this.startGame();
      });

      document.getElementById('btnHomeGameOver')?.addEventListener('click', () => {
        this.sound.playClick();
        this.gameOverModal.hidden = true;
        this.goHome();
      });

      // Resign & Hint buttons (ทั้งแถวบนข้าง setting และด้านล่าง)
      const onResignClick = () => {
        if (!this.isGameActive) return;
        this.sound.playClick();
        if (confirm('ต้องการยอมแพ้การแข่งขันหรือไม่? (จะเสีย 20 แต้ม)')) {
          this.endGame(false, 'ผู้เล่นกดยอมแพ้');
        }
      };
      document.getElementById('btnResignTop')?.addEventListener('click', onResignClick);
      document.getElementById('btnResignBottom')?.addEventListener('click', onResignClick);

      const onHintClick = () => {
        if (!this.isGameActive || this.isPaused || !this.settingsModal.hidden || this.engine.turn !== SIDE_BLACK || this.isAiThinking) return;
        this.sound.playClick();
        this.showHint();
      };
      document.getElementById('btnHintTop')?.addEventListener('click', onHintClick);
      document.getElementById('btnHintBottom')?.addEventListener('click', onHintClick);

      document.getElementById('retryResult')?.addEventListener('click',()=>this.submitResult());

      // Sliders: Music & SFX
      const sliderMusic = document.getElementById('sliderMusic');
      const sliderSfx = document.getElementById('sliderSfx');
      const valMusic = document.getElementById('valMusic');
      const valSfx = document.getElementById('valSfx');

      sliderMusic?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (valMusic) valMusic.textContent = `${val}%`;
        this.sound.setMusicVolume(val / 100);
      });

      sliderSfx?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (valSfx) valSfx.textContent = `${val}%`;
        this.sound.setSfxVolume(val / 100);
      });
    }

    initSdk() {
      if (typeof window.ZTMiniGame !== 'undefined') {
        window.ZTMiniGame.connect({
          start: (info) => {
            this.embedded = info.embedded;
            this.hostReady = true;
            const start=document.getElementById('btnStartGame');if(start)start.disabled=false;
            this.externalPaused = false;
            this.startGame(true);
          },
          pause: (info) => {
            if(info?.reason!=='visibility')this.externalPaused = true;
            this.pauseGame();
          },
          resume: () => {
            this.externalPaused = false;
            this.resumeGame();
          },
          stop: () => {
            this.roundGeneration++;
            this.hostReady = false;
            this.isGameActive = false;
            this.pauseGame();
          },
          error: (err) => console.error('[SDK Error]', err)
        });
      }

      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.isGameActive) {
          this.pauseGame();
        } else if (!document.hidden && this.isGameActive && !this.embedded) {
          this.resumeGame();
        }
      });
    }

    startGame(fromHost = false) {
      if(this.embedded && !fromHost){
        if(!this.hostReady)return;
        if(this.roundFinished){window.ZTMiniGame.requestReplay();return;}
        if(this.isGameActive)return;
      }
      this.roundGeneration++;
      this.roundFinished = false;
      this.lastResult = null;
      this.sound.init();
      this.sound.resume();
      const submission = document.getElementById("submissionStatus");
      if(submission)submission.textContent=this.embedded?"เชื่อมโฮสต์แล้ว ยังไม่ส่งผลรอบนี้":"โหมดฝึก คะแนนเก็บเฉพาะเกมนี้ในเครื่อง";
      const retry=document.getElementById("retryResult");if(retry)retry.hidden=true;
      this.homeScreen.hidden = true;
      this.gameScreen.hidden = false;
      this.settingsModal.hidden = true;
      this.gameOverModal.hidden = true;

      this.engine.reset();
      this.isGameActive = true;
      this.isPaused = false;
      this.isAiThinking = false;
      this.isAnimating = false;
      this.selectedPiece = null;
      this.validMoves = [];
      this.roundStartTime = performance.now();
      this.playerTime = 300;
      this.aiTime = 300;

      this.stats = {
        movesCount: 0,
        playerCaptures: 0,
        aiCaptures: 0,
        playerKings: 0,
        aiKings: 0
      };

      this.startClocks();
      this.updateStatusUi();
      this.renderBoard();
    }

    goHome() {
      this.roundGeneration++;
      this.sound.pause();
      this.isGameActive = false;
      this.pauseClocks();
      this.homeScreen.hidden = false;
      this.gameScreen.hidden = true;
      this.settingsModal.hidden = true;
      this.gameOverModal.hidden = true;
      this.updateScoreDisplay();
    }

    openSettings() {
      this.updateScoreDisplay();
      this.settingsModal.hidden = false;
      if (this.isGameActive) this.pauseGame();
    }

    closeSettings() {
      this.settingsModal.hidden = true;
      if (this.isGameActive) this.resumeGame();
    }

    pauseGame() {
      this.isPaused=true;this.pauseClocks();this.sound.pause();
    }

    resumeGame() {
      if(!this.isGameActive||this.externalPaused||document.hidden||!this.settingsModal.hidden)return;
      this.isPaused=false;this.sound.resume();this.startClocks();
      if(this.engine.turn===SIDE_WHITE&&!this.isAiThinking&&!this.isAnimating)this.handleAiTurn();
    }

    startClocks() {
      this.pauseClocks();
      this.timerInterval = setInterval(() => {
        if (!this.isGameActive || this.isPaused || !this.settingsModal.hidden) return;

        if (this.engine.turn === SIDE_BLACK) {
          this.playerTime--;
          if (this.playerTime <= 0) {
            this.playerTime = 0;
            this.updateClockDisplay();
            this.endGame(false, 'หมดเวลาการแข่งขัน (Time Out)');
            return;
          }
        } else {
          this.aiTime--;
          if (this.aiTime <= 0) {
            this.aiTime = 0;
            this.updateClockDisplay();
            this.endGame(true, 'AI หมดเวลาการแข่งขัน');
            return;
          }
        }
        this.updateClockDisplay();
      }, 1000);
      this.updateClockDisplay();
    }

    pauseClocks() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }

    formatTime(sec) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    updateClockDisplay() {
      const blackTimer = document.getElementById('blackTimer');
      const whiteTimer = document.getElementById('whiteTimer');
      if (blackTimer) blackTimer.textContent = this.formatTime(this.playerTime);
      if (whiteTimer) whiteTimer.textContent = this.formatTime(this.aiTime);
    }

    updateStatusUi() {
      const { white, black } = this.engine.countPieces();
      const blackPieces = document.getElementById('blackPieces');
      const whitePieces = document.getElementById('whitePieces');
      if (blackPieces) blackPieces.textContent = black;
      if (whitePieces) whitePieces.textContent = white;

      const whiteCard = document.getElementById('whiteCard');
      const blackCard = document.getElementById('blackCard');
      const whiteTurnStatus = document.getElementById('whiteTurnStatus');
      const blackTurnStatus = document.getElementById('blackTurnStatus');

      if (this.engine.turn === SIDE_BLACK) {
        blackCard?.classList.add('active-turn');
        whiteCard?.classList.remove('active-turn');
        if (blackTurnStatus) {
          blackTurnStatus.textContent = 'You Turn';
          blackTurnStatus.className = 'turn-status-badge you-turn';
        }
        if (whiteTurnStatus) {
          whiteTurnStatus.textContent = 'Wait';
          whiteTurnStatus.className = 'turn-status-badge wait';
        }
      } else {
        whiteCard?.classList.add('active-turn');
        blackCard?.classList.remove('active-turn');
        if (whiteTurnStatus) {
          whiteTurnStatus.textContent = 'You Turn';
          whiteTurnStatus.className = 'turn-status-badge you-turn';
        }
        if (blackTurnStatus) {
          blackTurnStatus.textContent = 'Wait';
          blackTurnStatus.className = 'turn-status-badge wait';
        }
      }

      const turnBanner = document.getElementById('turnBanner');
      const aiBadge = document.getElementById('aiThinkingBadge');
      if (this.engine.turn === SIDE_BLACK) {
        if (turnBanner) turnBanner.textContent = 'ตาของคุณ (สีดำ) เดินหมาก';
        if (aiBadge) aiBadge.hidden = true;
      } else {
        if (turnBanner) turnBanner.textContent = 'ตาของ AI (สีขาว) กำลังคิด...';
        if (aiBadge) aiBadge.hidden = false;
      }
    }

    showHint() {
      const moves = this.engine.getAllMoves(SIDE_BLACK);
      if (moves.length === 0) return;
      // ไฮไลต์ตัวหมากที่มีตาเดิน
      const hintMove = moves[Math.floor(Math.random() * moves.length)];
      this.onPieceClick(hintMove.from.r, hintMove.from.c);
    }

    // วาดตารางหมากฮอส
    renderBoard() {
      if (!this.boardEl) return;
      this.boardEl.innerHTML = '';

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const square = document.createElement('div');
          square.className = `square ${(r + c) % 2 === 1 ? 'dark' : 'light'}`;
          square.dataset.row = r;
          square.dataset.col = c;

          // ตรวจสอบว่าช่องนี้เป็นช่องที่เดินไปได้หรือไม่ (แสดงกริท ขอบเขตการเดิน)
          const targetMove = this.validMoves.find(m => m.to.r === r && m.to.c === c);
          if (targetMove) {
            square.classList.add('valid-target');
            if (targetMove.captures && targetMove.captures.length > 0) {
              square.classList.add('is-capture');
            }
            square.addEventListener('click', (e) => {
              e.stopPropagation();
              this.onSquareClick(r, c);
            });
          }

          const piece = this.engine.board[r][c];
          if (piece) {
            const pieceEl = document.createElement('div');
            pieceEl.className = `piece ${piece.side} ${piece.isKing ? 'king' : 'man'}`;
            
            // เข้าฮอส หมาก จะมีแสงสีรุ้ง วิบวับ เอนิเมชั่น
            if (piece.isKing) {
              const crownIcon = document.createElement('span');
              crownIcon.className = 'crown-icon';
              crownIcon.textContent = '👑';
              pieceEl.appendChild(crownIcon);

              const rainbowAura = document.createElement('div');
              rainbowAura.className = 'rainbow-aura';
              pieceEl.appendChild(rainbowAura);
            }

            // ถ้าเป็นตัวที่เลือกอยู่
            if (this.selectedPiece && this.selectedPiece.r === r && this.selectedPiece.c === c) {
              pieceEl.classList.add('selected');
            }

            // คลิกที่เบี้ย (เฉพาะตาของผู้เล่น)
            if (piece.side === SIDE_BLACK && this.engine.turn === SIDE_BLACK && this.isGameActive && !this.isAiThinking) {
              pieceEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onPieceClick(r, c);
              });
            }

            square.appendChild(pieceEl);
          }

          this.boardEl.appendChild(square);
        }
      }
    }

    clearHighlights() {
      this.selectedPiece = null;
      this.validMoves = [];
      if (!this.boardEl) return;
      if (this.boardEl.querySelectorAll) {
        this.boardEl.querySelectorAll('.valid-target').forEach(el => {
          el.classList.remove('valid-target', 'is-capture');
        });
        this.boardEl.querySelectorAll('.piece.selected').forEach(el => {
          el.classList.remove('selected');
        });
      }
    }

    wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    getSquareElement(r, c) {
      if (!this.boardEl || !this.boardEl.querySelector) return null;
      return this.boardEl.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    }

    // 1. เอนิเมชั่นยกขึ้น ลอย และเดินทางไปยังจุดหมาย
    async animatePieceTravel(fromPos, toPos) {
      const fromSq = this.getSquareElement(fromPos.r, fromPos.c);
      const toSq = this.getSquareElement(toPos.r, toPos.c);
      if (!fromSq || !toSq) return;

      const pieceEl = fromSq.querySelector ? fromSq.querySelector('.piece') : null;
      if (!pieceEl) return;

      if (pieceEl.animate && fromSq.getBoundingClientRect && toSq.getBoundingClientRect) {
        const fromRect = fromSq.getBoundingClientRect();
        const toRect = toSq.getBoundingClientRect();
        const dx = toRect.left - fromRect.left;
        const dy = toRect.top - fromRect.top;

        // เอนิเมชั่นลอยขึ้นสูงในจังหวะกลาง (3D lift & float) แล้วร่อนลงจุดหมาย
        const anim = pieceEl.animate([
          { transform: 'translate3d(0, 0, 0) scale(1)', zIndex: 120, filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))' },
          { transform: `translate3d(${dx * 0.5}px, ${dy * 0.5}px, 0) scale(1.26)`, zIndex: 120, filter: 'drop-shadow(0 22px 30px rgba(0,0,0,0.75))', offset: 0.45 },
          { transform: `translate3d(${dx}px, ${dy}px, 0) scale(1)`, zIndex: 120, filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))' }
        ], {
          duration: 460,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
        });

        await (anim.finished || new Promise(res => { anim.onfinish = res; }));
        try { if (anim.cancel) anim.cancel(); } catch (e) {}
      }

      // ย้าย Element มายังช่องปลายทาง และเคลียร์ transform ให้แน่นอน ป้องกันการเด้งตำแหน่ง
      if (toSq.appendChild) {
        toSq.appendChild(pieceEl);
        if (pieceEl.style) {
          pieceEl.style.transform = '';
          pieceEl.style.filter = '';
          pieceEl.style.zIndex = '';
        }
      }
    }

    // 2. เบี้ยที่ถูกกิน ค่อยๆ แตกสลายไป แล้วเฟดหาย ช้าๆ
    async animatePieceShatter(capPos) {
      const capSq = this.getSquareElement(capPos.r, capPos.c);
      if (!capSq) return;
      const capPiece = capSq.querySelector ? capSq.querySelector('.piece') : null;
      if (!capPiece) return;

      const isWhite = capPiece.classList && capPiece.classList.contains ? capPiece.classList.contains('white') : true;

      // ใส่คลาสแตกสลาย และพ่นสะเก็ดไม้กระจาย
      if (capPiece.classList && capPiece.classList.add) {
        capPiece.classList.add('piece-shatter');
      }
      this.spawnShatterParticles(capSq, isWhite ? 'white' : 'black');

      // รอ 650ms เพื่อให้เห็นการแตกสลายและเฟดหายอย่างนุ่มนวล
      await this.wait(650);
      if (capPiece.remove) capPiece.remove();
    }

    // สร้างสะเก็ดไม้กระจายรอบตัวหมากที่แตกสลาย
    spawnShatterParticles(squareEl, side) {
      if (!document.createElement || !squareEl || !squareEl.appendChild) return;
      const whiteColors = ['#f8f6f0', '#eae2d3', '#cfc4b2', '#baad9a', '#9e917e'];
      const blackColors = ['#3d3936', '#2a2725', '#191817', '#48423e', '#121110'];
      const colors = side === 'white' ? whiteColors : blackColors;

      for (let i = 0; i < 10; i++) {
        const p = document.createElement('div');
        p.className = 'shatter-particle';
        const size = Math.floor(Math.random() * 6) + 4; // 4px to 10px
        const color = colors[Math.floor(Math.random() * colors.length)];
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 32;
        const dx = Math.round(Math.cos(angle) * dist);
        const dy = Math.round(Math.sin(angle) * dist);
        const rot = Math.round((Math.random() - 0.5) * 400);

        if (p.style) {
          p.style.width = `${size}px`;
          p.style.height = `${size}px`;
          p.style.background = color;
          p.style.left = '50%';
          p.style.top = '50%';
          p.style.setProperty('--dx', `${dx}px`);
          p.style.setProperty('--dy', `${dy}px`);
          p.style.setProperty('--rot', `${rot}deg`);
        }
        squareEl.appendChild(p);
        setTimeout(() => { if (p.remove) p.remove(); }, 750);
      }
    }

    // เมื่อคลิกที่เบี้ย
    onPieceClick(r, c) {
      if (!this.isGameActive || this.isPaused || !this.settingsModal.hidden || this.engine.turn !== SIDE_BLACK || this.isAiThinking || this.isAnimating) return;

      const piece = this.engine.board[r][c];
      if (!piece || piece.side !== SIDE_BLACK) return;

      // มีเสียง คลิก
      this.sound.playClick();

      // ดึงตาเดินทั้งหมดที่มีสิทธิ์เดินได้ (มีกฎบังคับกิน)
      const allLegalMoves = this.engine.getAllMoves(SIDE_BLACK);
      const pieceMoves = allLegalMoves.filter(m => m.from.r === r && m.from.c === c);

      if (pieceMoves.length === 0) {
        // หากมีตัวอื่นที่บังคับกินอยู่
        if (allLegalMoves.length > 0 && allLegalMoves[0].captures.length > 0) {
          this.flashMandatoryCaptureWarning();
        }
        this.selectedPiece = null;
        this.validMoves = [];
        this.renderBoard();
        return;
      }

      this.selectedPiece = { r, c };
      this.validMoves = pieceMoves; // แสดงกริท ขอบเขตการเดิน
      this.renderBoard();
    }

    flashMandatoryCaptureWarning() {
      const banner = document.getElementById('turnBanner');
      if (banner) {
        const orig = banner.textContent;
        banner.textContent = '⚠️ ต้องกินตามกติกา! กรุณาเลือกตัวหมากที่มีตากิน';
        banner.style.color = '#ef4444';
        setTimeout(() => {
          banner.textContent = orig;
          banner.style.color = '';
        }, 1600);
      }
    }

    // เมื่อคลิกวางหมากบนช่องเป้าหมาย
    onSquareClick(toR, toC) {
      if (!this.isGameActive || this.isPaused || !this.settingsModal.hidden || !this.selectedPiece || this.engine.turn !== SIDE_BLACK || this.isAnimating) return;

      const move = this.validMoves.find(m => m.to.r === toR && m.to.c === toC);
      if (!move) return;

      this.executeMove(move);
    }

    // ดำเนินการเดินหมาก พร้อมเอนิเมชั่นลอยเดินทาง และแตกสลายเมื่อกิน
    async executeMove(move) {
      if (!this.isGameActive || this.isPaused || this.isAnimating) return;
      const generation=this.roundGeneration;
      this.isAnimating = true;

      // ปิดไฮไลต์การเลือกโดยไม่ลบ DOM ให้เกิดการกระตุก
      this.clearHighlights();

      const isPlayer = (this.engine.turn === SIDE_BLACK);
      const path = move.path && move.path.length > 1 ? move.path : [move.from, move.to];
      const captures = move.captures || [];

      // 3. ถ้ากิน 2 ต่อ ให้แสดง เบี้ย ลอยไปยังจุดหมาย 1 และ 2 ตามลำดับ ไม่ต้องเร็ว
      for (let i = 0; i < path.length - 1; i++) {
        if(generation!==this.roundGeneration||!this.isGameActive)return;
        const fromPos = path[i];
        const toPos = path[i + 1];
        const capPos = captures[i] || null;

        // 2. เบี้ยที่เดิน ให้ มี เอนิเมชั่น ยก ขึ้น ลอย แล้ว เดินทางไปยังจุดหมาย
        await this.animatePieceTravel(fromPos, toPos);
        while(generation===this.roundGeneration&&this.isGameActive&&(this.isPaused||!this.settingsModal.hidden))await this.wait(50);
        if(generation!==this.roundGeneration||!this.isGameActive)return;

        // 1. เวลาเบี้ยถูกกิน เบี้ยที่ถูกกินจะค่อยๆ แตกสลายไป แล้วเฟดหาย ช้าๆ
        if (capPos) {
          this.sound.playCapture();
          if (isPlayer) this.stats.playerCaptures++;
          else this.stats.aiCaptures++;
          await this.animatePieceShatter(capPos);
        } else {
          // วางหมากมีเสียง pop
          this.sound.playPop();
        }

        // หากเป็นการกินหลายต่อ พักจังหวะอย่างนุ่มนวล ไม่ต้องเร็ว (280ms)
        if (i < path.length - 2) {
          await this.wait(280);
        }
      }

      while(generation===this.roundGeneration&&this.isGameActive&&(this.isPaused||!this.settingsModal.hidden))await this.wait(50);
      if(generation!==this.roundGeneration||!this.isGameActive)return;
      this.stats.movesCount++;

      // ทำการเปลี่ยนแปลงสถานะบอร์ดใน Engine จริง
      const result = this.engine.applyMove(move);

      // เข้าฮอส หมาก จะมีแสงสีรุ้ง วิบวับ เอนิเมชั่น
      if (result.newlyCrowned) {
        this.sound.playCrown();
        if (isPlayer) this.stats.playerKings++;
        else this.stats.aiKings++;
        this.showCrownedBanner(move.to.r, move.to.c, isPlayer);
      }

      this.updateStatusUi();
      this.renderBoard();
      this.isAnimating = false;

      // Evaluate the side that must move next, not the side that just moved.
      this.engine.turn = this.engine.turn === SIDE_BLACK ? SIDE_WHITE : SIDE_BLACK;
      this.updateStatusUi();
      this.renderBoard();
      if(this.checkGameEnd())return;
      if(this.engine.turn===SIDE_WHITE)this.handleAiTurn();
    }

    showCrownedBanner(r, c, isPlayer) {
      const banner = document.createElement('div');
      banner.className = `crowned-float-banner ${isPlayer ? 'player-crowned' : 'ai-crowned'}`;
      banner.innerHTML = `👑 ${isPlayer ? 'คุณได้ (หมากดำ - รุ้งแดง)' : 'AI (หมากขาว - รุ้งฟ้า)'} เข้าฮอสแล้ว! ✨`;
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 1800);
    }

    // AI เดินหมาก (Medium-Pro)
    handleAiTurn() {
      if(!this.isGameActive||this.isPaused||this.isAiThinking||this.engine.turn!==SIDE_WHITE)return;
      const generation=this.roundGeneration;
      this.isAiThinking = true;
      this.updateStatusUi();

      // จำลองเวลาคิดของ AI ให้สมจริง (~450ms)
      setTimeout(() => {
        if(generation!==this.roundGeneration)return;
        if (!this.isGameActive || this.isPaused) {
          this.isAiThinking = false;
          return;
        }

        const aiMove = this.ai.findBestMove();
        this.isAiThinking = false;

        if (!aiMove) {
          // AI ไม่มีตาเดิน -> ผู้เล่นชนะ!
          this.endGame(true, 'AI โดนขังหมาก หมดตาเดิน');
          return;
        }

        this.executeMove(aiMove);
      }, 500);
    }

    // ตรวจสอบการชนะ/แพ้
    checkGameEnd() {
      const { white, black } = this.engine.countPieces();

      // 1. ตัวหมากหมด
      if (white === 0) {
        this.endGame(true, 'คุณกินหมากสีขาวหมดทั้งกระดาน!');
        return true;
      }
      if (black === 0) {
        this.endGame(false, 'หมากสีดำของคุณถูกกินหมดทั้งกระดาน');
        return true;
      }

      // 2. ไม่มีตาเดิน (จนมุม / โดนขัง)
      const currentMoves = this.engine.getAllMoves(this.engine.turn);
      if (currentMoves.length === 0) {
        if (this.engine.turn === SIDE_BLACK) {
          this.endGame(false, 'คุณถูกขังหมาก ไม่มีตาเดินต่อ');
        } else {
          this.endGame(true, 'AI ถูกขังหมาก ไม่มีตาเดินต่อ');
        }
        return true;
      }

      return false;
    }

    // แพ้ หรือ ชนะ จะมี ป๊อบอัปขึ้นมา ปุ่มล่าง เริ่มใหม่ - home. แพ้ - 20 คะแนน แสดงด้านล่าง, ชนะ +50 คะแนน
    async endGame(isWin, reason) {
      if(!this.isGameActive||this.roundFinished)return;
      this.roundFinished=true;
      this.roundGeneration++;
      this.isGameActive = false;
      this.sound.pause();
      this.pauseClocks();

      const deltaScore = isWin ? 50 : -20;
      if(!this.embedded)this.saveStoredScore(deltaScore);

      if (isWin) this.sound.playWin();
      else this.sound.playLose();

      // UI Popup
      const modal = this.gameOverModal;
      const title = document.getElementById('gameOverTitle');
      const reasonEl = document.getElementById('gameOverReason');
      const badge = document.getElementById('gameOverScoreBadge');
      const statsMoves = document.getElementById('statMoves');
      const statsCaps = document.getElementById('statCaps');
      const statsDuration = document.getElementById('statDuration');

      if (title) {
        title.textContent = isWin ? 'ยินดีด้วย คุณชนะการแข่งขัน! 🎉' : 'คุณแพ้การแข่งขัน! 💀';
        title.className = isWin ? 'win-text' : 'lose-text';
      }
      if (reasonEl) reasonEl.textContent = reason;
      if (badge) {
        badge.textContent = isWin ? '+50 คะแนน' : '-20 คะแนน';
        badge.className = `score-award-badge ${isWin ? 'win-badge' : 'lose-badge'}`;
      }
      if (statsMoves) statsMoves.textContent = this.stats.movesCount;
      if (statsCaps) statsCaps.textContent = this.stats.playerCaptures;
      if (statsDuration) {
        const durSec = Math.round((performance.now() - this.roundStartTime) / 1000);
        statsDuration.textContent = `${durSec} วินาที`;
      }

      if (modal) modal.hidden = false;

      // ส่งผลลัพธ์ผ่านโปรโตคอล zt-minigame/1
      const durationMs = Math.max(0, Math.round(performance.now() - this.roundStartTime));
      this.lastResult = {
        outcome: isWin ? 'completed' : 'failed',
        rawScore: isWin ? 50 : 0,
        durationMs,
        metrics: {
          won: isWin,
          moves: this.stats.movesCount,
          playerCaptures: this.stats.playerCaptures,
          aiCaptures: this.stats.aiCaptures,
          playerKings: this.stats.playerKings,
          aiKings: this.stats.aiKings,
          reason
        }
      };

      await this.submitResult();
    }

    async submitResult() {
      if(!this.lastResult)return;
      const generation=this.roundGeneration;
      const label=document.getElementById('submissionStatus'),retry=document.getElementById('retryResult'),replay=document.getElementById('btnRestartGameOver');
      if(retry)retry.hidden=true;if(replay)replay.disabled=this.embedded;
      try {
        const ack=await window.ZTMiniGame.finish(this.lastResult);
        if(generation!==this.roundGeneration)return;
        if(label)label.textContent=ack.status==='practice'?'จบรอบฝึก เก็บคะแนนเฉพาะเกมนี้ ไม่ใช่คะแนน Simulation':ack.persisted==='mock-only'?'โฮสต์จำลองรับผลแล้ว คะแนนจำลอง '+ack.awardedPoints:'โฮสต์รับผลแล้ว คะแนนรางวัล '+ack.awardedPoints+' · ตรวจสถานะออนไลน์ที่ Simulation';
        if(replay)replay.disabled=false;
      } catch(error) {
        if(generation!==this.roundGeneration)return;
        if(label)label.textContent='ส่งผลยังไม่สำเร็จ: '+error.message;
        if(retry)retry.hidden=false;
      }
    }
  }

  // เริ่มต้นทำงานเมื่อ DOM โหลดเสร็จ
  window.addEventListener('DOMContentLoaded', () => {
    window.app = new ThaiCheckersApp();
  });
})();
