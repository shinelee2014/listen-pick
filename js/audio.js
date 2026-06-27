/**
 * audio.js — 音频播放控制模块
 * 支持预录 MP3 优先，Web Speech API 兜底
 */

const AudioPlayer = (() => {
  let currentAudio = null;
  let currentUtterance = null;
  let isPlaying = false;

  // 语速映射
  const SPEED_MAP = {
    slow: 0.7,
    normal: 1.0,
    fast: 1.3
  };

  /**
   * 播放句子
   * @param {string} sentence - 英文句子
   * @param {string} audioFile - MP3 文件路径（可选）
   * @param {string} speed - 'slow' | 'normal' | 'fast'
   * @param {Function} onStart - 播放开始回调
   * @param {Function} onEnd - 播放结束回调
   */
  function play(sentence, audioFile, speed = 'normal', onStart, onEnd) {
    // 停止当前播放
    stop();

    // 尝试 MP3 文件
    if (audioFile) {
      playMP3(audioFile, speed, onStart, onEnd, () => {
        // MP3 加载失败，回退到 TTS
        playTTS(sentence, speed, onStart, onEnd);
      });
    } else {
      // 无 MP3 文件，直接用 TTS
      playTTS(sentence, speed, onStart, onEnd);
    }
  }

  /**
   * 播放 MP3 文件
   */
  function playMP3(audioFile, speed, onStart, onEnd, onError) {
    try {
      currentAudio = new Audio(audioFile);
      currentAudio.playbackRate = SPEED_MAP[speed] || 1.0;
      
      currentAudio.addEventListener('play', () => {
        isPlaying = true;
        if (onStart) onStart();
      });

      currentAudio.addEventListener('ended', () => {
        isPlaying = false;
        if (onEnd) onEnd();
      });

      currentAudio.addEventListener('error', () => {
        isPlaying = false;
        if (onError) onError();
      });

      currentAudio.play().catch(() => {
        if (onError) onError();
      });
    } catch (e) {
      if (onError) onError();
    }
  }

  /**
   * 使用 Web Speech API 播放
   */
  function playTTS(sentence, speed, onStart, onEnd) {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      if (onEnd) onEnd();
      return;
    }

    // 取消之前的语音
    window.speechSynthesis.cancel();

    currentUtterance = new SpeechSynthesisUtterance(sentence);
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = SPEED_MAP[speed] || 1.0;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    // 尝试选择一个英文声音
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female'))
                 || voices.find(v => v.lang.startsWith('en-US'))
                 || voices.find(v => v.lang.startsWith('en'));
    if (enVoice) {
      currentUtterance.voice = enVoice;
    }

    currentUtterance.onstart = () => {
      isPlaying = true;
      if (onStart) onStart();
    };

    currentUtterance.onend = () => {
      isPlaying = false;
      if (onEnd) onEnd();
    };

    currentUtterance.onerror = (e) => {
      isPlaying = false;
      console.warn('TTS error:', e);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(currentUtterance);
  }

  /**
   * 停止播放
   */
  function stop() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    currentUtterance = null;
    isPlaying = false;
  }

  /**
   * 是否正在播放
   */
  function getIsPlaying() {
    return isPlaying;
  }

  // 预加载语音列表（某些浏览器需要异步加载）
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  return {
    play,
    stop,
    isPlaying: getIsPlaying
  };
})();
