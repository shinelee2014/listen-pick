/**
 * storage.js — localStorage 进度存取模块
 * Listen & Pick 英语听力练习
 */

const Storage = (() => {
  const STORAGE_KEY_PREFIX = 'listen_pick_progress_';
  const CHILDREN_KEY = 'listen_pick_children';
  const CURRENT_CHILD_KEY = 'listen_pick_current_child';

  // 获取当前正在学习的孩子
  let currentChild = localStorage.getItem(CURRENT_CHILD_KEY) || '';

  function getStorageKey() {
    return currentChild ? `${STORAGE_KEY_PREFIX}${currentChild}` : 'listen_pick_progress_guest';
  }

  function getChildren() {
    try {
      const data = localStorage.getItem(CHILDREN_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function addChild(name) {
    if (!name) return false;
    name = name.trim();
    if (!name) return false;
    const children = getChildren();
    if (children.includes(name)) return false;
    children.push(name);
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
    return true;
  }

  function removeChild(name) {
    let children = getChildren();
    children = children.filter(c => c !== name);
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
    
    // 清除该孩子的进度
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${name}`);
    
    if (currentChild === name) {
      currentChild = children[0] || '';
      if (currentChild) {
        localStorage.setItem(CURRENT_CHILD_KEY, currentChild);
      } else {
        localStorage.removeItem(CURRENT_CHILD_KEY);
      }
    }
    return true;
  }

  function getCurrentChild() {
    return currentChild;
  }

  function setCurrentChild(name) {
    currentChild = name;
    if (name) {
      localStorage.setItem(CURRENT_CHILD_KEY, name);
    } else {
      localStorage.removeItem(CURRENT_CHILD_KEY);
    }
  }

  function resetCurrentChild() {
    if (currentChild) {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${currentChild}`);
    }
  }

  /**
   * 获取全部进度数据
   * @returns {Object} 进度数据
   */
  function getAll() {
    try {
      const key = getStorageKey();
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : createDefault();
    } catch (e) {
      console.warn('Storage read error, resetting:', e);
      return createDefault();
    }
  }

  /**
   * 创建默认进度结构
   */
  function createDefault() {
    const data = {
      version: 1,
      settings: {
        showEnglish: false,
        showChinese: false,
        speed: 'normal'    // 'slow' | 'normal' | 'fast'
      },
      grades: {}
    };
    save(data);
    return data;
  }

  /**
   * 保存全部进度数据
   */
  function save(data) {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }

  /**
   * 获取某年级的进度
   * @param {number} grade - 年级号 (1-6)
   * @returns {Object} 年级进度
   */
  function getGradeProgress(grade) {
    const data = getAll();
    if (!data.grades[grade]) {
      data.grades[grade] = {
        totalStars: 0,
        completedStages: {},   // key: "levelId-day-stageId", value: stars earned
        currentLevel: 1,
        currentDay: 1,
        currentStage: 1
      };
      save(data);
    }
    return data.grades[grade];
  }

  /**
   * 标记某一关完成
   * @param {number} grade
   * @param {number} levelId
   * @param {number} day
   * @param {number} stageId
   * @param {number} stars - 获得的星星数 (0-3)
   */
  function completeStage(grade, levelId, day, stageId, stars) {
    const data = getAll();
    const gradeData = data.grades[grade] || {
      totalStars: 0,
      completedStages: {},
      currentLevel: 1,
      currentDay: 1,
      currentStage: 1
    };

    const key = `${levelId}-${day}-${stageId}`;
    const prevStars = gradeData.completedStages[key] || 0;
    
    // 只更新如果新得分更高
    if (stars > prevStars) {
      gradeData.totalStars += (stars - prevStars);
      gradeData.completedStages[key] = stars;
    }

    // 更新当前进度
    gradeData.currentLevel = levelId;
    gradeData.currentDay = day;
    gradeData.currentStage = stageId + 1;

    data.grades[grade] = gradeData;
    save(data);
    return gradeData;
  }

  /**
   * 检查某关是否已完成
   */
  function isStageCompleted(grade, levelId, day, stageId) {
    const gradeData = getGradeProgress(grade);
    const key = `${levelId}-${day}-${stageId}`;
    return gradeData.completedStages[key] !== undefined;
  }

  /**
   * 获取某关的星星数
   */
  function getStageStars(grade, levelId, day, stageId) {
    const gradeData = getGradeProgress(grade);
    const key = `${levelId}-${day}-${stageId}`;
    return gradeData.completedStages[key] || 0;
  }

  /**
   * 获取某年级总星星数
   */
  function getTotalStars(grade) {
    return getGradeProgress(grade).totalStars;
  }

  /**
   * 获取/设置全局设置
   */
  function getSettings() {
    return getAll().settings;
  }

  function updateSettings(newSettings) {
    const data = getAll();
    data.settings = { ...data.settings, ...newSettings };
    save(data);
  }

  /**
   * 计算某年级的完成百分比
   */
  function getGradeCompletion(grade, totalStages) {
    const gradeData = getGradeProgress(grade);
    const completed = Object.keys(gradeData.completedStages).length;
    return totalStages > 0 ? Math.round((completed / totalStages) * 100) : 0;
  }

  /**
   * 重置某年级进度
   */
  function resetGrade(grade) {
    const data = getAll();
    delete data.grades[grade];
    save(data);
  }

  /**
   * 重置所有进度
   */
  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    getAll,
    save,
    getGradeProgress,
    completeStage,
    isStageCompleted,
    getStageStars,
    getTotalStars,
    getSettings,
    updateSettings,
    getGradeCompletion,
    resetGrade,
    resetAll,
    getChildren,
    addChild,
    removeChild,
    getCurrentChild,
    setCurrentChild,
    resetCurrentChild
  };
})();
