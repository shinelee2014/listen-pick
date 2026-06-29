/**
 * app.js — Listen & Pick 主应用逻辑
 * SPA 路由 · 视图切换 · 答题引擎 · 动画
 */

const App = (() => {
  // ============ 配置 ============
  const GRADE_CONFIG = {
    1: { name: '一年级', emoji: '🍓', label: 'Grade 1', color: '#E8657A', cssVar: 'g1' },
    2: { name: '二年级', emoji: '🍊', label: 'Grade 2', color: '#F0883E', cssVar: 'g2' },
    3: { name: '三年级', emoji: '🌻', label: 'Grade 3', color: '#E8B830', cssVar: 'g3' },
    4: { name: '四年级', emoji: '🌿', label: 'Grade 4', color: '#4CAF7D', cssVar: 'g4' },
    5: { name: '五年级', emoji: '🦋', label: 'Grade 5', color: '#4A90D9', cssVar: 'g5' },
    6: { name: '六年级', emoji: '🔮', label: 'Grade 6', color: '#8B6FC0', cssVar: 'g6' }
  };

  // 每个年级的图片选项数量
  const IMAGE_COUNT_BY_GRADE = { 1: 2, 2: 2, 3: 3, 4: 3, 5: 4, 6: 4 };

  // ============ 状态 ============
  let state = {
    currentView: 'home',
    selectedGrade: null,
    selectedLevel: null,
    selectedDay: null,
    selectedStage: null,
    gradeData: null,       // 当前年级的 JSON 数据
    quizStages: [],        // 当前 Day 的所有 stages
    quizIndex: 0,          // 当前在第几题
    quizStars: 0,          // 本轮得星
    quizCorrect: 0,        // 本轮正确数
    quizTotal: 0,          // 本轮总题数
    showEnglish: false,
    showChinese: false,
    speed: 'normal',
    answered: false        // 当前题是否已作答
  };

  // ============ 初始化 ============
  function init() {
    // 加载设置
    const settings = Storage.getSettings();
    state.showEnglish = settings.showEnglish;
    state.showChinese = settings.showChinese;
    state.speed = settings.speed;

    // 绑定事件
    bindEvents();

    // 检查是否有选中的宝贝账号
    const activeChild = Storage.getCurrentChild();
    if (activeChild) {
      updateHomeProfileUI(activeChild);
      showView('home');
    } else {
      showView('login');
      renderProfiles();
    }
  }

  // ============ 宝贝账号系统 ============
  function renderProfiles() {
    const grid = document.getElementById('profiles-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const children = Storage.getChildren();

    // 预设可爱头像 Emoji 循环使用
    const avatars = ['🐱', '🐶', '🐨', '🐼', '🦁', '🦖', '🦄', '🐰', '🦊', '🦉'];

    // 渲染已有账号
    children.forEach((name, index) => {
      const card = document.createElement('div');
      card.className = 'profile-card';
      
      const avatar = avatars[index % avatars.length];
      
      card.innerHTML = `
        <button class="profile-delete-btn" title="删除账号">×</button>
        <div class="profile-avatar">${avatar}</div>
        <div class="profile-name">${name}</div>
      `;

      card.onclick = (e) => {
        if (e.target.classList.contains('profile-delete-btn')) {
          e.stopPropagation();
          confirmDeleteChild(name);
        } else {
          selectChild(name);
        }
      };

      grid.appendChild(card);
    });

    // 渲染“添加新账号”按钮
    const addCard = document.createElement('div');
    addCard.className = 'profile-add-card';
    addCard.innerHTML = `
      <div class="profile-add-icon">➕</div>
      <div class="profile-add-text">添加宝贝</div>
    `;
    addCard.onclick = () => {
      showAddChildModal(true);
    };
    grid.appendChild(addCard);
  }

  function confirmDeleteChild(name) {
    if (confirm(`确定要删除宝贝 "${name}" 的账号吗？该宝贝的所有学习进度将被永久清空！`)) {
      Storage.removeChild(name);
      renderProfiles();
    }
  }

  function selectChild(name) {
    Storage.setCurrentChild(name);
    updateHomeProfileUI(name);
    showView('home');
  }

  function updateHomeProfileUI(name) {
    const nameSpan = document.getElementById('home-profile-name');
    if (nameSpan) nameSpan.textContent = name;
  }

  function showAddChildModal(show) {
    const modal = document.getElementById('modal-add-child');
    const input = document.getElementById('new-child-name');
    if (!modal) return;
    if (show) {
      modal.classList.remove('hidden');
      if (input) {
        input.value = '';
        input.focus();
      }
    } else {
      modal.classList.add('hidden');
    }
  }

  function handleAddChildConfirm() {
    const input = document.getElementById('new-child-name');
    if (!input) return;
    const name = input.value.trim();
    if (!name) {
      alert('请输入宝贝名字！');
      return;
    }
    if (name.length > 8) {
      alert('名字长度不能超过 8 个字！');
      return;
    }
    
    const success = Storage.addChild(name);
    if (success) {
      showAddChildModal(false);
      renderProfiles();
    } else {
      alert('名字已存在，请换一个名字！');
    }
  }

  // ============ 视图路由 ============
  function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.add('active');
      state.currentView = viewName;
    }
  }

  // ============ 主题色切换 ============
  function applyTheme(grade) {
    const config = GRADE_CONFIG[grade];
    if (!config) return;
    const root = document.documentElement;
    const cv = config.cssVar;
    root.style.setProperty('--theme-primary', getComputedStyle(root).getPropertyValue(`--${cv}-primary`).trim());
    root.style.setProperty('--theme-light', getComputedStyle(root).getPropertyValue(`--${cv}-light`).trim());
    root.style.setProperty('--theme-accent', getComputedStyle(root).getPropertyValue(`--${cv}-accent`).trim());
    root.style.setProperty('--theme-dark', getComputedStyle(root).getPropertyValue(`--${cv}-dark`).trim());
    root.style.setProperty('--theme-gradient', getComputedStyle(root).getPropertyValue(`--${cv}-gradient`).trim());
  }

  // ============ 首页 ============
  function onStartClick() {
    showView('grade');
    renderGradeSelect();
  }

  // ============ 年级选择 ============
  function renderGradeSelect() {
    const grid = document.getElementById('grade-grid');
    grid.innerHTML = '';

    for (let g = 1; g <= 6; g++) {
      const config = GRADE_CONFIG[g];
      const progress = Storage.getGradeCompletion(g, 100); // 初期 Level 1 有 25 关

      const card = document.createElement('div');
      card.className = 'grade-card';
      card.dataset.grade = g;
      card.onclick = () => selectGrade(g);

      card.innerHTML = `
        <span class="grade-emoji">${config.emoji}</span>
        <div class="grade-name">${config.name}</div>
        <div class="grade-label">${config.label}</div>
        <div class="grade-progress">
          <div class="grade-progress-bar" style="width: ${progress}%"></div>
        </div>
      `;

      grid.appendChild(card);
    }
  }

  // ============ 选择年级 ============
  async function selectGrade(grade) {
    state.selectedGrade = grade;
    applyTheme(grade);

    // 加载年级数据
    try {
      const resp = await fetch(`data/grade${grade}.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      state.gradeData = await resp.json();
    } catch (e) {
      // 如果数据文件不存在，使用占位数据
      console.warn(`Grade ${grade} data not found, using placeholder`);
      state.gradeData = createPlaceholderData(grade);
    }

    showView('level');
    renderLevelSelect();
  }

  /**
   * 创建占位数据（当 JSON 文件未就绪时）
   */
  function createPlaceholderData(grade) {
    const config = GRADE_CONFIG[grade];
    return {
      grade: grade,
      gradeName: config.name,
      gradeEmoji: config.emoji,
      imageCount: IMAGE_COUNT_BY_GRADE[grade],
      levels: [{
        levelId: 1,
        levelName: 'Level 1-25',
        days: Array.from({ length: 5 }, (_, d) => ({
          day: d + 1,
          dayTitle: `Day ${d + 1}`,
          stages: Array.from({ length: 5 }, (_, s) => ({
            stageId: s + 1,
            sentence: 'This grade is coming soon!',
            sentenceCn: '本年级内容即将开放！',
            correctImage: 'girl',
            images: ['girl', 'boy'],
            audioFile: ''
          }))
        }))
      }]
    };
  }

  // ============ Level 选择 ============
  function renderLevelSelect() {
    const data = state.gradeData;
    const config = GRADE_CONFIG[state.selectedGrade];

    // 更新 header
    document.getElementById('level-grade-badge').innerHTML = `
      ${config.emoji} ${config.name}
    `;

    // 更新当前学习宝贝名称
    const childBadge = document.getElementById('level-profile-badge');
    if (childBadge) {
      childBadge.innerHTML = `👤 ${Storage.getCurrentChild() || '游客'}`;
    }

    // 绑定重置按钮
    const resetBtn = document.getElementById('level-reset-btn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        const activeChild = Storage.getCurrentChild();
        if (confirm(`确定要重置宝贝 "${activeChild}" 的全部学习进度吗？这会清空所有关卡的得星数和进度！`)) {
          Storage.resetCurrentChild();
          renderLevelSelect();
        }
      };
    }

    // 渲染 Level tabs
    const tabsContainer = document.getElementById('level-tabs');
    tabsContainer.innerHTML = '';

    data.levels.forEach((level, idx) => {
      const tab = document.createElement('button');
      tab.className = 'level-tab' + (idx === 0 ? ' active' : '');
      tab.dataset.levelIdx = idx;
      tab.innerHTML = `
        ${level.levelName}
        <span class="level-tab-sub">5天 · 25关</span>
      `;
      tab.onclick = () => switchLevelTab(idx);
      tabsContainer.appendChild(tab);
    });

    // 渲染第一个 Level 的地图
    state.selectedLevel = 0;
    renderLevelMap(0);
  }

  function switchLevelTab(idx) {
    document.querySelectorAll('.level-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.level-tab[data-level-idx="${idx}"]`).classList.add('active');
    state.selectedLevel = idx;
    renderLevelMap(idx);
  }

  function renderLevelMap(levelIdx) {
    const level = state.gradeData.levels[levelIdx];
    const map = document.getElementById('level-map');
    map.innerHTML = '';

    level.days.forEach(day => {
      const dayRow = document.createElement('div');
      dayRow.className = 'day-row';

      const label = document.createElement('div');
      label.className = 'day-label';
      label.textContent = `Day ${day.day}  ${day.dayTitle || ''}`;
      dayRow.appendChild(label);

      const stageGrid = document.createElement('div');
      stageGrid.className = 'stage-grid';

      day.stages.forEach(stage => {
        const btn = document.createElement('button');
        const globalStageNum = (day.day - 1) * 5 + stage.stageId;
        btn.textContent = globalStageNum;

        // 判断状态
        const completed = Storage.isStageCompleted(
          state.selectedGrade, level.levelId, day.day, stage.stageId
        );

        if (completed) {
          btn.className = 'stage-btn completed';
        } else {
          btn.className = 'stage-btn available';
        }

        btn.onclick = () => startQuiz(levelIdx, day.day, stage.stageId);
        stageGrid.appendChild(btn);
      });

      dayRow.appendChild(stageGrid);
      map.appendChild(dayRow);
    });
  }

  // ============ 答题引擎 ============
  function startQuiz(levelIdx, day) {
    const level = state.gradeData.levels[levelIdx];
    const dayData = level.days.find(d => d.day === day);
    if (!dayData) return;

    state.selectedLevel = levelIdx;
    state.selectedDay = day;
    state.quizStages = dayData.stages;
    state.quizIndex = 0;
    state.quizStars = 0;
    state.quizCorrect = 0;
    state.quizTotal = dayData.stages.length;
    state.answered = false;

    showView('quiz');
    renderQuizToolbar();
    renderQuizQuestion();
  }

  function renderQuizToolbar() {
    const config = GRADE_CONFIG[state.selectedGrade];
    const level = state.gradeData.levels[state.selectedLevel];

    document.getElementById('quiz-level-badge').textContent = `${config.emoji} ${level.levelName}`;
    
    // 同步 toggle 状态
    updateToggleUI('toggle-en', state.showEnglish);
    updateToggleUI('toggle-cn', state.showChinese);
    document.getElementById('speed-select').value = state.speed;

    updateQuizProgress();
  }

  function updateToggleUI(id, isOn) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle('on', isOn);
      el.querySelector('.toggle-status').textContent = isOn ? '开' : '关';
    }
  }

  function updateQuizProgress() {
    document.getElementById('quiz-progress-text').textContent = 
      `${state.quizIndex + 1} / ${state.quizTotal}`;
    document.getElementById('quiz-stars-count').textContent = state.quizStars;
  }

  function renderQuizQuestion() {
    const stage = state.quizStages[state.quizIndex];
    if (!stage) return;

    state.answered = false;

    // 句子提示
    const enEl = document.getElementById('sentence-en');
    const cnEl = document.getElementById('sentence-cn');
    enEl.textContent = stage.sentence;
    cnEl.textContent = stage.sentenceCn;
    enEl.classList.toggle('visible', state.showEnglish);
    cnEl.classList.toggle('visible', state.showChinese);

    // 图片网格
    const grid = document.getElementById('image-grid');
    const imageCount = IMAGE_COUNT_BY_GRADE[state.selectedGrade] || 2;
    grid.className = `image-grid cols-${imageCount}`;
    grid.innerHTML = '';

    // 随机打乱图片顺序
    const shuffledImages = shuffleArray([...stage.images]);

    shuffledImages.forEach(imgKey => {
      const card = document.createElement('div');
      card.className = 'image-card';
      card.dataset.image = imgKey;

      // 渲染模式：emoji（默认） 或 image
      const useEmoji = !window.USE_IMAGE_MODE;

      if (useEmoji) {
        // Emoji 模式：大号 Emoji
        const emojiContainer = document.createElement('div');
        emojiContainer.className = 'emoji-display';
        emojiContainer.textContent = getEmojiForImage(imgKey);
        card.appendChild(emojiContainer);
      } else {
        // 图片模式：加载 PNG，失败时回退到 Emoji
        const img = document.createElement('img');
        img.src = `images/${imgKey}.png`;
        img.alt = imgKey;
        img.loading = 'lazy';
        img.onerror = () => {
          img.style.display = 'none';
          const fallback = document.createElement('div');
          fallback.className = 'emoji-display';
          fallback.textContent = getEmojiForImage(imgKey);
          card.appendChild(fallback);
        };
        card.appendChild(img);
      }

      card.onclick = () => onImageClick(card, imgKey, stage.correctImage);
      grid.appendChild(card);
    });

    // 重置音频按钮
    const audioBtn = document.getElementById('audio-btn');
    audioBtn.classList.remove('playing');

    updateQuizProgress();
  }

  /**
   * 获取图片对应的 emoji（作为图片加载失败的 fallback）
   */
  function getEmojiForImage(key) {
    const map = {
      'April': '4️⃣',
      'August': '8️⃣',
      'Chinese': '🇨🇳',
      'Christmas': '🎄',
      'December': '1️⃣2️⃣',
      'Dragon Boat Festival': '🛶',
      'English': '🇬🇧',
      'February': '2️⃣',
      'Halloween': '🎃',
      'January': '1️⃣',
      'July': '7️⃣',
      'June': '6️⃣',
      'March': '3️⃣',
      'May': '5️⃣',
      'Mid-Autumn Festival': '🥮',
      'November': '1️⃣1️⃣',
      'October': '🔟',
      'September': '9️⃣',
      'Spring Festival': '🧨',
      'afternoon': '☀️',
      'angry': '😠',
      'ant': '🐜',
      'apple': '🍎',
      'arm': '💪',
      'art': '🎨',
      'art gallery': '🖼️',
      'ate good food': '🍲',
      'autumn': '🍁',
      'baby': '👶',
      'bag': '🎒',
      'ball': '⚽',
      'banana': '🍌',
      'bathroom': '🚿',
      'bear': '🐻',
      'bed': '🛏️',
      'bedroom': '🛏️',
      'bee': '🐝',
      'bigger': '🐘',
      'bike': '🚲',
      'bird': '🐦',
      'black': '⚫',
      'blackboard': '🛹',
      'blue': '🔵',
      'blueberry': '🫐',
      'book': '📖',
      'boy': '👦',
      'bread': '🍞',
      'breeze': '🍃',
      'brother': '🧑',
      'brown': '🟫',
      'burger': '🍔',
      'bus': '🚌',
      'businessman': '👨‍💼',
      'butterfly': '🦋',
      'by bus': '🚌',
      'by plane': '✈️',
      'by ship': '🚢',
      'by train': '🚆',
      'cake': '🎂',
      'camera': '📷',
      'car': '🚗',
      'cat': '🐱',
      'chair': '🪑',
      'cherry': '🍒',
      'chicken': '🍗',
      'chips': '🍟',
      'circle': '⭕',
      'classroom': '🏫',
      'clean room': '🧹',
      'cleaning the park': '🧹',
      'climbing': '🧗',
      'clock': '⏰',
      'cloudy': '☁️',
      'coach': '🏃‍♂️',
      'coat': '🧥',
      'coconut': '🥥',
      'cold': '🥶',
      'collect stamps': '✉️',
      'computer': '💻',
      'computer room': '💻',
      'cook': '🍳',
      'cook dinner': '🧑‍🍳',
      'cool': '🍃',
      'cow': '🐮',
      'crayon': '🖍️',
      'cross the road': '🚶',
      'cup': '🥛',
      'dad': '👨',
      'dance': '💃',
      'day': '☀️',
      'delicious': '😋',
      'desk': '🪑',
      'dictionary': '📕',
      'do homework': '📝',
      'do yoga': '🧘',
      'doctor': '👨‍⚕️',
      'dog': '🐶',
      'doll': '🧸',
      'door': '🚪',
      'draw': '🎨',
      'dress': '👗',
      'driver': '👨‍✈️',
      'duck': '🦆',
      'dumplings': '🥟',
      'ear': '👂',
      'earth': '🌍',
      'eat lunch': '🍱',
      'egg': '🥚',
      'eight': '8️⃣',
      'eighteen': '🕡',
      'elephant': '🐘',
      'eleven': '🕚',
      'email': '📧',
      'eraser': '🧽',
      'evening': '🌆',
      'excited': '🤩',
      'eye': '👁️',
      'face': '😊',
      'fifteen': '🕞',
      'fifth': '5️⃣',
      'first': '🥇',
      'fish': '🐟',
      'five': '5️⃣',
      'flower': '🌸',
      'fly': '✈️',
      'fly a kite': '🪁',
      'flying': '🪶',
      'foot': '🦶',
      'forest': '🌲',
      'fork': '🍴',
      'four': '4️⃣',
      'fourteen': '🕝',
      'fourth': '4️⃣',
      'fox': '🦊',
      'fresh': '🍃',
      'friend': '🧑‍🤝‍🧑',
      'frog': '🐸',
      'garden': '🏡',
      'get up': '⏰',
      'giraffe': '🦒',
      'girl': '👧',
      'glasses': '👓',
      'go hiking': '🥾',
      'go home': '🏠',
      'go straight': '➡️',
      'go to bed': '🛌',
      'go to school': '🎒',
      'goat': '🐐',
      'grandma': '👵',
      'grandpa': '👴',
      'grape': '🍇',
      'green': '🟢',
      'gym': '🏋️',
      'hand': '✋',
      'happy': '😊',
      'hat': '🎩',
      'head': '👤',
      'healthy': '🥗',
      'heart': '❤️',
      'heavier': '🏋️',
      'helicopter': '🚁',
      'hen': '🐔',
      'hers': '👧',
      'hill': '⛰️',
      'his': '🧑',
      'holiday': '🏖️',
      'horse': '🐴',
      'hot': '🥵',
      'ice cream': '🍦',
      'internet': '🌐',
      'jacket': '🧥',
      'juice': '🍹',
      'jump': '🦘',
      'jumping': '🦘',
      'kangaroo': '🦘',
      'key': '🔑',
      'kitchen': '🍳',
      'kiwi': '🥝',
      'koala': '🐨',
      'ladybug': '🐞',
      'lake': '🏞️',
      'lamp': '💡',
      'leg': '🦵',
      'lemon': '🍋',
      'library': '📚',
      'lion': '🦁',
      'listen': '🎧',
      'living room': '🛋️',
      'longer': '📏',
      'make the bed': '🛏️',
      'mango': '🥭',
      'map': '🗺️',
      'maths': '➕',
      'melon': '🍉',
      'milk': '🥛',
      'mine': '🙋',
      'mirror': '🪞',
      'mobile phone': '📱',
      'mom': '👩',
      'monkey': '🐒',
      'moon': '🌙',
      'morning': '🌅',
      'motorcycle': '🏍️',
      'mountain': '🏔️',
      'mouth': '👄',
      'museum': '🏛️',
      'music': '🎵',
      'music room': '🎹',
      'next to': '🧑‍🤝‍🧑',
      'night': '🌃',
      'nine': '9️⃣',
      'nineteen': '🕢',
      'noodles': '🍜',
      'nose': '👃',
      'nurse': '👩‍⚕️',
      'older': '👴',
      'on foot': '🥾',
      'one': '1️⃣',
      'orange': '🍊',
      'orange color': '🟧',
      'ours': '🧑‍🤝‍🧑',
      'panda': '🐼',
      'pants': '👖',
      'papaya': '🥭',
      'paper': '📄',
      'peach': '🍑',
      'pear': '🍐',
      'pen': '✏️',
      'pencil': '✏️',
      'penguin': '🐧',
      'pig': '🐷',
      'pilot': '👨‍✈️',
      'pineapple': '🍍',
      'pink': '🌸',
      'pizza': '🍕',
      'plane': '✈️',
      'plane toy': '✈️',
      'planting trees': '🌳',
      'play badminton': '🏸',
      'play basketball': '🏀',
      'play cards': '🃏',
      'play chess': '♟️',
      'play football': '⚽',
      'play sports': '⚽',
      'play table tennis': '🏓',
      'playground': '🛝',
      'polar bear': '🐻‍❄️',
      'policeman': '👮',
      'postman': '📯',
      'protecting animals': '🐼',
      'purple': '🟣',
      'rabbit': '🐰',
      'rainstorm': '⛈️',
      'rainy': '🌧️',
      'read': '📖',
      'read stories': '📖',
      'recycling paper': '♻️',
      'red': '🔴',
      'rice': '🍚',
      'ride a bike': '🚲',
      'river': '🌊',
      'ruler': '📏',
      'run': '🏃',
      'running': '🏃',
      'sad': '😢',
      'salad': '🥗',
      'sandwich': '🥪',
      'saving water': '🚰',
      'saw a movie': '🎬',
      'scared': '😨',
      'school': '🏫',
      'science museum': '🧪',
      'scientist': '👨‍🔬',
      'second': '🥈',
      'seven': '7️⃣',
      'seventeen': '🕠',
      'sheep': '🐑',
      'ship': '🚢',
      'shirt': '👕',
      'shoes': '👟',
      'shorter': '🐒',
      'shorts': '🩳',
      'sick': '🤒',
      'sing': '🎤',
      'sister': '👧',
      'six': '6️⃣',
      'sixteen': '🕟',
      'skirt': '👗',
      'sleep': '😴',
      'smaller': '🐭',
      'snake': '🐍',
      'snowstorm': '🌨️',
      'snowy': '❄️',
      'socks': '🧦',
      'soup': '🍲',
      'sour': '🍋',
      'space': '🚀',
      'space station': '🛰️',
      'speak': '🗣️',
      'spider': '🕷️',
      'spoon': '🥄',
      'spring': '🌱',
      'square shape': '🟩',
      'star': '⭐',
      'strawberry': '🍓',
      'stronger': '💪',
      'student': '🧑‍🎓',
      'summer': '☀️',
      'sun': '☀️',
      'sunny': '☀️',
      'sunshine': '☀️',
      'sweater': '🧶',
      'sweep the floor': '🧹',
      'sweet': '🍬',
      'swim': '🏊',
      'swimming': '🏊',
      'table': '🪵',
      'taller': '🦒',
      'taxi': '🚕',
      'tea': '🍵',
      'teacher': '👩‍🏫',
      'telephone': '☎️',
      'television': '📺',
      'ten': '🔟',
      'thinner': '📏',
      'third': '🥉',
      'thirteen': '🕜',
      'three': '3️⃣',
      'tiger': '🐯',
      'tired': '🥱',
      'tractor': '🚜',
      'train': '🚆',
      'tree': '🌳',
      'triangle': '🔺',
      'trousers': '👖',
      'truck': '🗻',
      'turn left': '⬅️',
      'turn right': '➡️',
      'turtle': '🐢',
      'twelve': '🕛',
      'twenty': '🕗',
      'two': '2️⃣',
      'typhoon': '🌀',
      'umbrella': '☂️',
      'van': '🚐',
      'video call': '📹',
      'visited grandparents': '👵',
      'wallet': '👛',
      'warm': '🌤️',
      'wash clothes': '🧺',
      'wash the dishes': '🍽️',
      'watch': '⌚',
      'watch TV': '📺',
      'water': '💧',
      'water the flowers': '🌸',
      'watermelon': '🍉',
      'went swimming': '🏊',
      'wet': '💦',
      'white': '⚪',
      'window': '🪟',
      'windy': '💨',
      'winter': '❄️',
      'wolf': '🐺',
      'worried': '😟',
      'write': '✍️',
      'yellow': '🟡',
      'younger': '👶',
      'yours': '🫵',
      'zebra': '🦓',
    };
    return map[key] || '❓';
  }

  /**
   * 点击图片作答
   */
  function onImageClick(card, selectedImage, correctImage) {
    if (state.answered) return;
    state.answered = true;

    const allCards = document.querySelectorAll('.image-card');
    const isCorrect = selectedImage === correctImage;

    if (isCorrect) {
      // ✅ 答对
      card.classList.add('correct');
      allCards.forEach(c => { if (c !== card) c.classList.add('disabled'); });
      state.quizCorrect++;
      state.quizStars++;
      updateQuizProgress();

      // 星星飞起动画
      createStarBurst(card);

      // 小范围彩带反馈
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.8 }
        });
      }

      // 播放正确答案的声音（简单的音效替代）
      playFeedbackSound(true);

      // 自动下一题
      setTimeout(() => {
        advanceQuiz();
      }, 1200);

    } else {
      // ❌ 答错
      card.classList.add('wrong');
      
      // 显示正确答案
      allCards.forEach(c => {
        c.classList.add('disabled');
        if (c.dataset.image === correctImage) {
          setTimeout(() => c.classList.add('reveal-correct'), 500);
        }
      });

      playFeedbackSound(false);

      // 重播音频
      setTimeout(() => {
        const stage = state.quizStages[state.quizIndex];
        AudioPlayer.play(stage.sentence, stage.audioFile, state.speed);
      }, 1000);

      // 延迟后进入下一题
      setTimeout(() => {
        advanceQuiz();
      }, 2500);
    }
  }

  /**
   * 进入下一题或完成
   */
  function advanceQuiz() {
    state.quizIndex++;
    if (state.quizIndex >= state.quizTotal) {
      // Day 完成
      finishQuiz();
    } else {
      renderQuizQuestion();
    }
  }

  /**
   * 完成本 Day 的练习
   */
  function finishQuiz() {
    const level = state.gradeData.levels[state.selectedLevel];
    const accuracy = Math.round((state.quizCorrect / state.quizTotal) * 100);
    
    // 根据正确率给星
    let stars = 0;
    if (accuracy >= 90) stars = 3;
    else if (accuracy >= 70) stars = 2;
    else if (accuracy >= 50) stars = 1;

    // 保存每关进度
    state.quizStages.forEach(stage => {
      const stageStars = Storage.isStageCompleted(
        state.selectedGrade, level.levelId, state.selectedDay, stage.stageId
      ) ? Storage.getStageStars(state.selectedGrade, level.levelId, state.selectedDay, stage.stageId) : 0;

      if (stars > stageStars) {
        Storage.completeStage(
          state.selectedGrade, level.levelId, state.selectedDay, stage.stageId, stars
        );
      }
    });

    // 显示完成弹窗
    showCompleteOverlay(accuracy, stars);

    // 撒花动画
    if (stars >= 2) {
      createConfetti();
    }
  }

  /**
   * 显示完成弹窗
   */
  function showCompleteOverlay(accuracy, stars) {
    const existing = document.querySelector('.overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const starStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    const emoji = stars >= 3 ? '🎉' : stars >= 2 ? '👏' : stars >= 1 ? '👍' : '💪';

    overlay.innerHTML = `
      <div class="complete-card">
        <span class="complete-emoji">${emoji}</span>
        <h3 class="complete-title">${stars >= 2 ? '太棒了！' : '继续加油！'}</h3>
        <div class="complete-stars">${starStr}</div>
        <div class="complete-stats">
          <div class="stat-item">
            <div class="stat-value">${state.quizCorrect}/${state.quizTotal}</div>
            <div class="stat-label">正确数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${accuracy}%</div>
            <div class="stat-label">正确率</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${state.quizStars}</div>
            <div class="stat-label">获得星星</div>
          </div>
        </div>
        <div class="complete-btn-group">
          <button class="complete-btn secondary" onclick="App.backToLevels()">返回选关</button>
          <button class="complete-btn primary" onclick="App.nextDay()">下一天 →</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        backToLevels();
      }
    };
  }

  /**
   * 返回 Level 选择页
   */
  function backToLevels() {
    const overlay = document.querySelector('.overlay');
    if (overlay) overlay.remove();
    showView('level');
    renderLevelMap(state.selectedLevel);
  }

  /**
   * 下一天
   */
  function nextDay() {
    const overlay = document.querySelector('.overlay');
    if (overlay) overlay.remove();

    const nextDayNum = state.selectedDay + 1;
    const level = state.gradeData.levels[state.selectedLevel];
    const nextDayData = level.days.find(d => d.day === nextDayNum);

    if (nextDayData) {
      startQuiz(state.selectedLevel, nextDayNum);
    } else {
      // 本 Level 全部完成
      backToLevels();
    }
  }

  // ============ 音频播放 ============
  function playAudio() {
    const stage = state.quizStages[state.quizIndex];
    if (!stage) return;

    const btn = document.getElementById('audio-btn');
    
    AudioPlayer.play(
      stage.sentence,
      stage.audioFile,
      state.speed,
      () => { btn.classList.add('playing'); },
      () => { btn.classList.remove('playing'); }
    );
  }

  // ============ 设置切换 ============
  function toggleEnglish() {
    state.showEnglish = !state.showEnglish;
    updateToggleUI('toggle-en', state.showEnglish);
    Storage.updateSettings({ showEnglish: state.showEnglish });
    
    const el = document.getElementById('sentence-en');
    if (el) el.classList.toggle('visible', state.showEnglish);
  }

  function toggleChinese() {
    state.showChinese = !state.showChinese;
    updateToggleUI('toggle-cn', state.showChinese);
    Storage.updateSettings({ showChinese: state.showChinese });
    
    const el = document.getElementById('sentence-cn');
    if (el) el.classList.toggle('visible', state.showChinese);
  }

  function changeSpeed() {
    state.speed = document.getElementById('speed-select').value;
    Storage.updateSettings({ speed: state.speed });
  }

  // ============ 动画效果 ============
  function createStarBurst(sourceElement) {
    const rect = sourceElement.getBoundingClientRect();
    const star = document.createElement('div');
    star.className = 'star-burst-fly';
    star.textContent = '⭐';
    
    // 初始位置：卡片中心
    const startX = rect.left + rect.width / 2 - 16;
    const startY = rect.top + rect.height / 2 - 16;
    star.style.left = `${startX}px`;
    star.style.top = `${startY}px`;
    star.style.position = 'fixed';
    star.style.fontSize = '32px';
    star.style.pointerEvents = 'none';
    star.style.zIndex = '999';
    star.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
    star.style.transform = 'scale(0.5)';
    star.style.opacity = '0';
    
    document.body.appendChild(star);
    
    // 目标位置：工具栏右上角星星计分器
    const targetEl = document.querySelector('.quiz-stars');
    const targetRect = targetEl ? targetEl.getBoundingClientRect() : null;
    const endX = targetRect ? (targetRect.left + targetRect.width / 2 - 16) : window.innerWidth - 100;
    const endY = targetRect ? (targetRect.top + targetRect.height / 2 - 16) : 20;

    // 触发第一阶段：卡片中心弹出放大
    requestAnimationFrame(() => {
      star.style.transform = 'scale(1.5) rotate(180deg)';
      star.style.opacity = '1';
      
      // 触发第二阶段：向右上角平滑飞入并缩小自转
      setTimeout(() => {
        star.style.transition = 'all 0.5s cubic-bezier(0.55, 0, 1, 0.45)';
        star.style.left = `${endX}px`;
        star.style.top = `${endY}px`;
        star.style.transform = 'scale(0.6) rotate(540deg)';
        
        setTimeout(() => {
          star.remove();
          // 星星计分栏放大微震反馈
          if (targetEl) {
            targetEl.classList.add('star-pop');
            setTimeout(() => targetEl.classList.remove('star-pop'), 200);
          }
        }, 500);
      }, 250);
    });
  }

  function createConfetti() {
    if (typeof confetti !== 'function') return;
    
    // 双侧彩带喷泉连续喷洒 3.5 秒
    var duration = 3.5 * 1000;
    var end = Date.now() + duration;

    (function frame() {
      // 左侧喷泉
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 }
      });
      // 右侧喷泉
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 }
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }

  function playFeedbackSound(isCorrect) {
    // 使用 Web Audio API 生成简单的提示音
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isCorrect) {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } else {
        osc.frequency.setValueAtTime(311.13, ctx.currentTime); // Eb4
        osc.frequency.setValueAtTime(261.63, ctx.currentTime + 0.15); // C4
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      // Audio API not supported, skip
    }
  }

  // ============ 工具函数 ============
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ============ 事件绑定 ============
  function bindEvents() {
    // 首页按钮
    const startBtn = document.getElementById('home-start-btn');
    if (startBtn) startBtn.onclick = onStartClick;

    // 返回按钮
    document.querySelectorAll('[data-action="back-home"]').forEach(btn => {
      btn.onclick = () => showView('home');
    });
    document.querySelectorAll('[data-action="back-grade"]').forEach(btn => {
      btn.onclick = () => {
        showView('grade');
        renderGradeSelect();
      };
    });
    document.querySelectorAll('[data-action="back-level"]').forEach(btn => {
      btn.onclick = () => {
        AudioPlayer.stop();
        backToLevels();
      };
    });

    // 音频按钮
    const audioBtn = document.getElementById('audio-btn');
    if (audioBtn) audioBtn.onclick = playAudio;

    // Toggle 按钮
    const toggleEn = document.getElementById('toggle-en');
    if (toggleEn) toggleEn.onclick = toggleEnglish;

    const toggleCn = document.getElementById('toggle-cn');
    if (toggleCn) toggleCn.onclick = toggleChinese;

    // 语速
    const speedSel = document.getElementById('speed-select');
    if (speedSel) speedSel.onchange = changeSpeed;

    // 切换账号按钮
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
      btn.onclick = () => {
        Storage.setCurrentChild('');
        showView('login');
        renderProfiles();
      };
    });

    // Modal 按钮绑定
    const cancelBtn = document.getElementById('modal-cancel-btn');
    if (cancelBtn) {
      cancelBtn.onclick = () => showAddChildModal(false);
    }

    const confirmBtn = document.getElementById('modal-confirm-btn');
    if (confirmBtn) {
      confirmBtn.onclick = handleAddChildConfirm;
    }

    const inputEl = document.getElementById('new-child-name');
    if (inputEl) {
      inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
          handleAddChildConfirm();
        }
      };
    }

    // 键盘快捷键（可选）
    document.addEventListener('keydown', (e) => {
      if (state.currentView === 'quiz') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          playAudio();
        }
      }
      if (e.key === 'Escape') {
        const overlay = document.querySelector('.overlay');
        if (overlay) {
          overlay.remove();
          backToLevels();
        }
      }
    });
  }

  // ============ 公开 API ============
  return {
    init,
    selectGrade,
    backToLevels,
    nextDay,
    playAudio
  };
})();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
