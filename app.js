// คลาสหลักสำหรับเกมจับคู่คำศัพท์
class VocabularyGame {
  // ฟังก์ชันเริ่มต้นเมื่อสร้างวัตถุ
  constructor() {
    this.words = []; // เก็บคำศัพท์ที่เพิ่มเข้ามา
    this.gameHistory = JSON.parse(localStorage.getItem("gameHistory") || "[]"); // ดึงประวัติเกมจาก localStorage
    this.currentSelected = null; // การ์ดที่เลือกอยู่
    this.matched = []; // คู่คำที่จับคู่สำเร็จแล้ว
    this.gameStartTime = null; // เวลาเริ่มเกม
    this.timerInterval = null; // ตัวนับเวลา
    this.elements = {}; // เก็บ DOM elements
    this.currentEditId = null; // ID ของประวัติที่กำลังแก้ไข
    this.currentDeleteId = null; // ID ของประวัติที่กำลังจะลบ
    this.pendingConfirmAction = null; // เพิ่มตัวแปรนี้
    this.initializeElements(); // เริ่มต้น DOM elements
    this.bindEvents(); // ผูก event listeners
    this.setupSplashScreen(); // ตั้งค่าหน้าจอเริ่มต้น
  }

  // ฟังก์ชันเริ่มต้น DOM elements
  initializeElements() {
    this.elements = {
      // ส่วนเพิ่มคำศัพท์
      englishInput: document.getElementById("englishInput"),
      thaiInput: document.getElementById("thaiInput"),
      addButton: document.getElementById("addButton"),
      startButton: document.getElementById("startButton"),
      clearButton: document.getElementById("clearButton"),
      wordCount: document.getElementById("wordCount"),
      wordListContainer: document.getElementById("wordListContainer"),
      historyContainer: document.getElementById("historyContainer"),
      clearHistoryButton: document.getElementById("clearHistoryButton"),

      // ส่วนเกม
      gameSection: document.getElementById("game-section"),
      addSection: document.getElementById("add-section"),
      englishWords: document.getElementById("englishWords"),
      thaiWords: document.getElementById("thaiWords"),
      score: document.getElementById("score"),
      total: document.getElementById("total"),
      timer: document.getElementById("timer"),
      resetButton: document.getElementById("resetButton"),
      backButton: document.getElementById("backButton"),

      // หน้าจอเริ่มต้น
      splashScreen: document.getElementById("splash-screen"),

      // Modal
      editModal: document.getElementById("editModal"),
      confirmModal: document.getElementById("confirmModal"),
      editNameInput: document.getElementById("editNameInput"),
      saveNameButton: document.getElementById("saveNameButton"),
      cancelEditButton: document.getElementById("cancelEditButton"),
      confirmDeleteButton: document.getElementById("confirmDeleteButton"),
      cancelDeleteButton: document.getElementById("cancelDeleteButton"),
      confirmMessage: document.getElementById("confirmMessage"),

      // Toast container
      toastContainer: document.getElementById("toast-container"),
    };
  }

  // ฟังก์ชันผูก event listeners
  bindEvents() {
     // ปุ่มหลัก
  this.elements.addButton.addEventListener('click', () => this.addWord());
  this.elements.startButton.addEventListener('click', () => this.startGame());
  this.elements.clearButton.addEventListener('click', () => this.clearWords());
  this.elements.clearHistoryButton.addEventListener('click', () => this.clearAllHistory());
  this.elements.resetButton.addEventListener('click', () => this.resetGame());
  this.elements.backButton.addEventListener('click', () => this.backToAdd());
  
  // รองรับการกด Enter ในช่องใส่ข้อมูล
  [this.elements.englishInput, this.elements.thaiInput].forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addWord();
    });
  });

  // จำกัดการป้อนข้อมูลในช่องภาษาอังกฤษให้เป็นภาษาอังกฤษเท่านั้น
  this.elements.englishInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    if (value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
    e.target.value = value;
  });

  // Modal events - ใช้ callback function ที่เก็บไว้
  this.elements.saveNameButton.addEventListener('click', () => this.saveHistoryName());
  this.elements.cancelEditButton.addEventListener('click', () => this.closeEditModal());
  
  // แก้ไขการจัดการปุ่มยืนยันการลบ
  this.elements.confirmDeleteButton.addEventListener('click', () => {
    console.log('Confirm delete button clicked');
    console.log('pendingConfirmAction:', this.pendingConfirmAction);
    
    if (this.pendingConfirmAction) {
      this.pendingConfirmAction();
    }
    this.closeConfirmModal();
  });
  
  this.elements.cancelDeleteButton.addEventListener('click', () => {
    console.log('Cancel delete button clicked');
    this.closeConfirmModal();
  });

  // ปิด modal เมื่อคลิกปุ่ม X
  document.querySelectorAll('.modal-close').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      modal.classList.add('hidden');
    });
  });

  // ปิด modal เมื่อคลิกนอกพื้นที่
  [this.elements.editModal, this.elements.confirmModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  // รองรับการกด Enter ใน modal
  this.elements.editNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') this.saveHistoryName();
  });
  }

  // ฟังก์ชันตั้งค่าหน้าจอเริ่มต้น
  setupSplashScreen() {
    // แสดงหน้าจอเริ่มต้นเป็นเวลา 3 วินาที
    setTimeout(() => {
      this.elements.splashScreen.classList.add("hidden");
      this.elements.addSection.classList.remove("hidden");
      this.renderCurrentWords(); // แสดงคำศัพท์ปัจจุบัน
      this.renderHistory(); // แสดงประวัติเกม
    }, 3000);
  }

  // ฟังก์ชันเพิ่มคำศัพท์ใหม่
  addWord() {
    const english = this.elements.englishInput.value.trim(); // ดึงคำภาษาอังกฤษ
    const thai = this.elements.thaiInput.value.trim(); // ดึงคำภาษาไทย

    // ตรวจสอบว่ากรอกข้อมูลครบหรือไม่
    if (!english || !thai) {
      this.showToast("กรุณากรอกคำภาษาอังกฤษและคำแปลภาษาไทย", "warning");
      return;
    }

    // ตรวจสอบว่าคำนี้มีอยู่แล้วหรือไม่
    if (
      this.words.some(
        (word) => word.english.toLowerCase() === english.toLowerCase()
      )
    ) {
      this.showToast("คำนี้มีอยู่แล้ว", "warning");
      return;
    }

    // เพิ่มคำศัพท์ใหม่
    this.words.push({ english, thai });

    // ล้างช่องใส่ข้อมูลและโฟกัสที่ช่องแรก
    this.elements.englishInput.value = "";
    this.elements.thaiInput.value = "";
    this.elements.englishInput.focus();

    // อัพเดทการแสดงผล
    this.renderCurrentWords();
    this.showToast("เพิ่มคำสำเร็จ!", "success");
  }

  // ฟังก์ชันล้างคำศัพท์ทั้งหมด
  clearWords() {
    if (this.words.length === 0) return;

    // แสดง confirmation modal
    this.showConfirmModal("🗑️ ต้องการล้างคำศัพท์ทั้งหมดหรือไม่?", () => {
      this.words = [];
      this.renderCurrentWords();
      this.showToast("ล้างคำศัพท์เรียบร้อย", "info");
    });
  }

  // ฟังก์ชันลบคำศัพท์แต่ละคำ
  deleteWord(index) {
    this.showConfirmModal("🗑️ ต้องการลบคำนี้หรือไม่?", () => {
      this.words.splice(index, 1);
      this.renderCurrentWords();
      this.showToast("ลบคำเรียบร้อย", "info");
    });
  }

  // ฟังก์ชันแสดงคำศัพท์ปัจจุบัน
  renderCurrentWords() {
    this.elements.wordCount.textContent = this.words.length.toString();

    if (this.words.length === 0) {
      this.elements.wordListContainer.innerHTML =
        '<p style="text-align: center; color: #718096; padding: 20px;">ยังไม่มีคำศัพท์ กรุณาเพิ่มคำศัพท์ก่อน</p>';
      return;
    }

    // สร้าง HTML โดยไม่ใช้ onclick
    this.elements.wordListContainer.innerHTML = this.words
      .map(
        (word, index) => `
    <div class="word-item">
      <div class="word-pair">
        <span class="word-eng">${word.english}</span>
        <span>→</span>
        <span class="word-thai">${word.thai}</span>
      </div>
      <button class="delete-btn" data-word-index="${index}">ลบ</button>
    </div>
  `
      )
      .join("");

    // ผูก event listener ใหม่หลังจาก render
    this.bindWordListEvents();
  }
  // 2. เพิ่มฟังก์ชันผูก event สำหรับรายการคำศัพท์
  bindWordListEvents() {
    // ลบ event listener เก่าก่อน (ป้องกันการซ้อนทับ)
    const existingDeleteBtns =
      this.elements.wordListContainer.querySelectorAll(".delete-btn");
    existingDeleteBtns.forEach((btn) => {
      btn.replaceWith(btn.cloneNode(true)); // ลบ event listener เก่า
    });

    // ผูก event listener ใหม่
    const deleteBtns =
      this.elements.wordListContainer.querySelectorAll(".delete-btn");
    deleteBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.getAttribute("data-word-index"));
        this.deleteWord(index);
      });
    });
  }
  // ฟังก์ชันเริ่มเกม
  startGame() {
    if (this.words.length < 2) {
      this.showToast("ต้องมีคำศัพท์อย่างน้อย 2 คำ", "warning");
      return;
    }

    // แสดงหน้าจอเริ่มเกม
    this.showGameIntroScreen();

    setTimeout(() => {
      this.gameStartTime = new Date();
      this.matched = [];
      this.currentSelected = null;

      this.elements.addSection.classList.add("hidden");
      this.elements.gameSection.classList.remove("hidden");

      this.renderGame();
      this.startTimer();
    }, 2000);
  }

  // ฟังก์ชันแสดงหน้าจอเริ่มเกม
  showGameIntroScreen() {
    const introScreen = document.createElement("div");
    introScreen.className = "game-intro-screen";
    introScreen.innerHTML = `
      <div class="game-intro-content">
        <div class="game-intro-title">🎮 เริ่มเกม!</div>
        <div class="game-intro-subtitle">เตรียมตัวจับคู่คำศัพท์</div>
      </div>
    `;
    document.body.appendChild(introScreen);

    setTimeout(() => {
      document.body.removeChild(introScreen);
    }, 2000);
  }

  // ฟังก์ชันแสดงหน้าจอเสร็จเกม
  showGameCompleteScreen() {
    const completeScreen = document.createElement("div");
    completeScreen.className = "game-complete-screen";
    completeScreen.innerHTML = `
      <div class="game-complete-content">
        <div class="celebration-emoji">🎉</div>
        <div class="game-complete-title">ยินดีด้วย!</div>
        <div class="game-complete-subtitle">คุณจับคู่สำเร็จทั้งหมด!</div>
      </div>
    `;
    document.body.appendChild(completeScreen);

    setTimeout(() => {
      document.body.removeChild(completeScreen);
    }, 3000);
  }

  // ฟังก์ชันเริ่มตัวนับเวลา
  startTimer() {
    let seconds = 0;
    this.timerInterval = setInterval(() => {
      seconds++;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      this.elements.timer.textContent = `${minutes
        .toString()
        .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }, 1000);
  }

  // ฟังก์ชันหยุดตัวนับเวลา
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ฟังก์ชันสร้างเกม
  renderGame() {
    // สุ่มลำดับคำศัพท์
    const shuffledEnglish = this.shuffleArray([...this.words]);
    const shuffledThai = this.shuffleArray([...this.words]);

    // สร้างการ์ดภาษาอังกฤษ
    this.elements.englishWords.innerHTML = shuffledEnglish
      .map(
        (word) =>
          `<div class="card" data-type="english" data-word="${word.english}">${word.english}</div>`
      )
      .join("");

    // สร้างการ์ดภาษาไทย
    this.elements.thaiWords.innerHTML = shuffledThai
      .map(
        (word) =>
          `<div class="card" data-type="thai" data-word="${word.thai}">${word.thai}</div>`
      )
      .join("");

    // อัพเดทคะแนน
    this.elements.score.textContent = "0";
    this.elements.total.textContent = this.words.length.toString();

    this.bindCardEvents(); // ผูก event สำหรับการ์ด
  }

  // ฟังก์ชันผูก event สำหรับการ์ด
  bindCardEvents() {
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", () => this.handleCardClick(card));
    });
  }

  // ฟังก์ชันจัดการการคลิกการ์ด
  handleCardClick(card) {
    if (card.classList.contains("matched")) return; // ถ้าจับคู่แล้วไม่ให้คลิกได้

    if (this.currentSelected) {
      if (this.currentSelected === card) {
        // ยกเลิกการเลือก
        card.classList.remove("selected");
        this.currentSelected = null;
        return;
      }

      if (this.currentSelected.dataset.type === card.dataset.type) {
        // เลือกการ์ดประเภทเดียวกัน
        this.currentSelected.classList.remove("selected");
        card.classList.add("selected");
        this.currentSelected = card;
        return;
      }

      // ตรวจสอบการจับคู่
      this.checkMatch(this.currentSelected, card);
    } else {
      // เลือกการ์ดแรก
      card.classList.add("selected");
      this.currentSelected = card;
    }
  }

  // ฟังก์ชันตรวจสอบการจับคู่
  checkMatch(card1, card2) {
    const englishCard = card1.dataset.type === "english" ? card1 : card2;
    const thaiCard = card1.dataset.type === "thai" ? card1 : card2;

    // หาคำที่ตรงกัน
    const word = this.words.find(
      (w) =>
        w.english === englishCard.dataset.word &&
        w.thai === thaiCard.dataset.word
    );

    if (word) {
      // จับคู่ถูกต้อง
      [card1, card2].forEach((card) => {
        card.classList.remove("selected");
        card.classList.add("matched");
      });

      this.matched.push(word);
      this.elements.score.textContent = this.matched.length.toString();

      this.showToast("จับคู่ถูกต้อง!", "success");

      // ตรวจสอบว่าเสร็จเกมหรือยัง
      if (this.matched.length === this.words.length) {
        setTimeout(() => this.gameComplete(), 500);
      }
    } else {
      // จับคู่ผิด - แสดงสีแดงชั่วครู่
      [card1, card2].forEach((card) => {
        card.style.background = "#fed7d7";
        setTimeout(() => {
          card.style.background = "";
          card.classList.remove("selected");
        }, 500);
      });

      this.showToast("จับคู่ไม่ถูกต้อง", "error");
    }

    this.currentSelected = null;
  }

  // ฟังก์ชันจบเกม
  gameComplete() {
    if (!this.gameStartTime) return;
  
  this.stopTimer();
  const endTime = new Date();
  const timeSpent = Math.round((endTime.getTime() - this.gameStartTime.getTime()) / 1000);
  
  const gameRecord = {
    id: Date.now(),
    name: `เกมเมื่อ ${endTime.toLocaleDateString('th-TH')}`,
    words: [...this.words],
    completedAt: endTime.toISOString(),
    timeSpent: timeSpent,
    wordsCount: this.words.length
  };

  this.gameHistory.unshift(gameRecord);
  if (this.gameHistory.length > 10) {
    this.gameHistory = this.gameHistory.slice(0, 10);
  }
  
  localStorage.setItem('gameHistory', JSON.stringify(this.gameHistory));
  
  this.showGameCompleteScreen();
  this.showToast(`ยินดีด้วย! ใช้เวลา ${timeSpent} วินาที`, 'success');
  
  // ล้างคำศัพท์ปัจจุบัน
  this.words = [];
  
  setTimeout(() => {
    this.backToAdd();
    this.renderCurrentWords(); // render คำศัพท์ปัจจุบัน
    this.renderHistory(); // render ประวัติใหม่
  }, 3000);
  }

  // ฟังก์ชันเริ่มเกมใหม่
  resetGame() {
    this.matched = [];
    this.currentSelected = null;
    this.gameStartTime = new Date();
    this.stopTimer();
    this.renderGame();
    this.startTimer();
  }

  // ฟังก์ชันกลับไปหน้าเพิ่มคำศัพท์
  backToAdd() {
    this.stopTimer();
    this.elements.gameSection.classList.add("hidden");
    this.elements.addSection.classList.remove("hidden");
    this.currentSelected = null;
  }

  // ฟังก์ชันแสดงประวัติเกม
  renderHistory() {
    if (this.gameHistory.length === 0) {
      this.elements.historyContainer.innerHTML = '<p style="text-align: center; color: #718096; padding: 20px;">ยังไม่มีประวัติการเล่น</p>';
      return;
    }
  
    this.elements.historyContainer.innerHTML = this.gameHistory.map(record => {
      const date = new Date(record.completedAt);
      const formattedDate = date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
  
      return `
        <div class="history-item">
          <div class="history-header">
            <span class="history-title">${record.name || `เกม ${formattedDate}`}</span>
            <div class="history-stats">
              <span>📝 ${record.wordsCount} คำ</span>
              <span>⏰ ${record.timeSpent} วินาที</span>
              <button type="button" class="edit-btn" data-record-id="${record.id}">✏️ แก้ไข</button>
              <button type="button" class="play-again-btn" data-record-id="${record.id}">เล่นอีกครั้ง</button>
              <button type="button" class="delete-history-btn" data-record-id="${record.id}">🗑️ ลบ</button>
            </div>
          </div>
          <div class="history-words">
            ${record.words.map(word => `
              <div class="history-word">
                <span>${word.english}</span>
                <span>${word.thai}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  
    // ผูก event listener ใหม่หลังจาก render
    this.bindHistoryEvents();
  }
  bindHistoryEvents() {
 // ใช้ event delegation แทนการผูก event แต่ละปุ่ม
  // ลบ event listener เก่าก่อน
  const newHistoryContainer = this.elements.historyContainer.cloneNode(true);
  this.elements.historyContainer.parentNode.replaceChild(newHistoryContainer, this.elements.historyContainer);
  this.elements.historyContainer = newHistoryContainer;

  // ใช้ event delegation - ผูก event เพียงครั้งเดียวที่ container
  this.elements.historyContainer.addEventListener('click', (e) => {
    const recordId = parseInt(e.target.getAttribute('data-record-id'));
    
    if (!recordId) return; // ถ้าไม่มี record id ให้หยุด
    
    if (e.target.classList.contains('edit-btn')) {
      console.log('Edit button clicked for record:', recordId);
      this.editHistoryName(recordId);
    } 
    else if (e.target.classList.contains('play-again-btn')) {
      console.log('Play again button clicked for record:', recordId);
      this.playAgain(recordId);
    } 
    else if (e.target.classList.contains('delete-history-btn')) {
      console.log('Delete button clicked for record:', recordId);
      this.deleteHistory(recordId);
    }
  });
  }
  // ฟังก์ชันแก้ไขชื่อประวัติ
  editHistoryName(recordId) {
    const record = this.gameHistory.find((r) => r.id === recordId);
    if (!record) return;

    this.currentEditId = recordId;
    this.elements.editNameInput.value = record.name || "";
    this.elements.editModal.classList.remove("hidden");
    this.elements.editNameInput.focus();
  }

  // ฟังก์ชันบันทึกชื่อใหม่
  saveHistoryName() {
    const newName = this.elements.editNameInput.value.trim();
    if (!newName) {
      this.showToast("กรุณาใส่ชื่อ", "warning");
      return;
    }

    const record = this.gameHistory.find((r) => r.id === this.currentEditId);
    if (record) {
      record.name = newName;
      localStorage.setItem("gameHistory", JSON.stringify(this.gameHistory));
      this.renderHistory();
      this.closeEditModal();
      this.showToast("แก้ไขชื่อเรียบร้อย", "success");
    }
  }

  // ฟังก์ชันปิด modal แก้ไข
  closeEditModal() {
    this.elements.editModal.classList.add("hidden");
    this.currentEditId = null;
  }

  // ฟังก์ชันลบประวัติ
  deleteHistory(recordId) {
    console.log('deleteHistory called with recordId:', recordId);
    console.log('Current gameHistory:', this.gameHistory);
    
    const record = this.gameHistory.find(r => r.id === recordId);
    if (!record) {
      console.log('Record not found!');
      this.showToast('ไม่พบประวัติที่ต้องการลบ', 'error');
      return;
    }
    
    console.log('Found record to delete:', record);
    this.currentDeleteId = recordId;
    this.elements.confirmMessage.textContent = `ต้องการลบประวัติ "${record.name}" หรือไม่?`;
    this.elements.confirmModal.classList.remove('hidden');
    
    // ตั้งค่า callback function สำหรับการยืนยัน
    this.pendingConfirmAction = () => {
      console.log('Confirming delete for recordId:', recordId);
      this.gameHistory = this.gameHistory.filter(r => r.id !== recordId);
      console.log('Updated gameHistory:', this.gameHistory);
      localStorage.setItem('gameHistory', JSON.stringify(this.gameHistory));
      this.renderHistory();
      this.showToast('ลบประวัติเรียบร้อย', 'info');
    };
  }

  // ฟังก์ชันยืนยันการลบประวัติ
  confirmDeleteHistory() {
    this.gameHistory = this.gameHistory.filter(
      (r) => r.id !== this.currentDeleteId
    );
    localStorage.setItem("gameHistory", JSON.stringify(this.gameHistory));
    this.renderHistory();
    this.closeConfirmModal();
    this.showToast("ลบประวัติเรียบร้อย", "info");
  }

  // ฟังก์ชันปิด modal ยืนยัน
  closeConfirmModal() {
    this.elements.confirmModal.classList.add('hidden');
    this.currentDeleteId = null;
    this.pendingConfirmAction = null; // reset callback
  }

  // ฟังก์ชันล้างประวัติทั้งหมด
  clearAllHistory() {
    if (this.gameHistory.length === 0) {
      this.showToast("ไม่มีประวัติให้ล้าง", "warning");
      return;
    }

    this.showConfirmModal("🗑️ ต้องการล้างประวัติทั้งหมดหรือไม่?", () => {
      this.gameHistory = [];
      localStorage.setItem("gameHistory", JSON.stringify(this.gameHistory));
      this.renderHistory();
      this.showToast("ล้างประวัติทั้งหมดเรียบร้อย", "info");
    });
  }

  // ฟังก์ชันเล่นเกมซ้ำจากประวัติ
  playAgain(recordId) {
    const record = this.gameHistory.find((r) => r.id === recordId);
    if (!record) return;

    this.showConfirmModal(
      "🎮 ต้องการเล่นเกมนี้อีกครั้งหรือไม่?\n(คำศัพท์ปัจจุบันจะถูกแทนที่)",
      () => {
        this.words = [...record.words];
        this.renderCurrentWords();
        this.startGame();
      }
    );
  }

  // ฟังก์ชันสุ่มลำดับอาร์เรย์
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  // ฟังก์ชันแสดง Toast แทน alert
  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    // เลือกไอคอนตามประเภท
    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-content">${message}</span>
      <button class="toast-close">&times;</button>
      <div class="toast-progress"></div>
    `;

    // เพิ่ม event listener สำหรับปุ่มปิด
    toast.querySelector(".toast-close").addEventListener("click", () => {
      this.removeToast(toast);
    });

    // เพิ่มเข้า container
    this.elements.toastContainer.appendChild(toast);

    // ลบอัตโนมัติหลัง 4 วินาที
    setTimeout(() => {
      this.removeToast(toast);
    }, 4000);
  }

  // ฟังก์ชันลบ toast
  removeToast(toast) {
    if (toast && toast.parentNode) {
      toast.style.animation = "slideOutRight 0.3s ease-in-out forwards";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }

  // ฟังก์ชันแสดง confirmation modal แทน confirm
  showConfirmModal(message, onConfirm) {
    this.elements.confirmMessage.textContent = message;
  this.elements.confirmModal.classList.remove('hidden');
  
  // เก็บ callback function ไว้ใน instance แทนการสร้าง event listener ใหม่
  this.pendingConfirmAction = onConfirm;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.game = new VocabularyGame();
});
