/**
 * Nebula Command Center
 * Professional Edition v2.2 (Skills & Live Ops)
 */

// --- Constants & Config ---
const DEFAULT_DATA = {
  user: {
    name: "Commander",
    avatarType: "emoji", 
    avatarValue: "👨‍🚀",
    level: 1,
    xp: 0,
    wallet: 150,
    activeEffects: [] 
  },
  skills: [
    { id: 'tech', name: 'Tech', level: 1, xp: 0, icon: 'cpu', color: '#3b82f6' },
    { id: 'fit', name: 'Fitness', level: 1, xp: 0, icon: 'dumbbell', color: '#ef4444' },
    { id: 'int', name: 'Intellect', level: 1, xp: 0, icon: 'brain', color: '#8b5cf6' },
    { id: 'foc', name: 'Focus', level: 1, xp: 0, icon: 'zap', color: '#f59e0b' }
  ],
  settings: {
    creativeMode: false,
    upkeepEnabled: false,
    upkeepInterval: 60,
    theme: 'theme-light', 
    primaryColor: '#3b82f6',
    safetyNet: true
  },
  missions: [
    { id: '1', title: "Morning Protocol", points: 50, credits: 25, iconName: "book-open", startTime: "06:00", endTime: "10:00", lastCompletedAt: null, recurring: true, completions: 0, level: 1 },
    { id: '2', title: "Deep Work Session", points: 150, credits: 75, iconName: "brain", startTime: "09:00", endTime: "18:00", lastCompletedAt: null, recurring: true, completions: 0, level: 1 },
    { id: '3', title: "System Maintenance", points: 100, credits: 50, iconName: "dumbbell", lastCompletedAt: null, recurring: true, completions: 0, level: 1 }
  ],
  shop: [
    { id: 's1', title: "Neural Boost (Coffee)", cost: 50, iconName: "coffee", consumable: true, purchased: false, description: "1.5x XP Gain for 5 min." },
    { id: 's2', title: "Gaming License", cost: 150, iconName: "gamepad-2", consumable: false, purchased: false, description: "Unlocks leisure protocols." },
    { id: 's3', title: "Focus Serum", cost: 75, iconName: "zap", consumable: true, purchased: false, description: "Instant energy recharge." },
  ],
  stats: { streak: 0, lastLogin: Date.now(), earnedToday: 0, history: [] },
  attendance: []
};

const LEVEL_THRESHOLDS = [0, 500, 1500, 3000, 5000, 8000, 12000, 18000, 25000];
const SKILL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 5000];
const RANKS = ["Cadet", "Ensign", "Lieutenant", "Commander", "Captain", "Major", "Colonel", "General", "Admiral"];
const AVATARS = ["👨‍🚀", "🤖", "👽", "🦁", "💀", "👾", "🦊", "⚡", "🌌", "🦾"];

// Mapping icons to skills
const ICON_SKILL_MAP = {
  'code': 'tech', 'monitor': 'tech', 'wifi': 'tech',
  'dumbbell': 'fit', 'swords': 'fit', 'heart': 'fit',
  'book-open': 'int', 'map': 'int', 'shield': 'int',
  'brain': 'foc', 'zap': 'foc', 'target': 'foc', 'coffee': 'foc'
};

// --- State Management ---
let state;

try {
  const saved = JSON.parse(localStorage.getItem('nebula_os_data'));
  if (saved) {
    state = {
      ...DEFAULT_DATA,
      ...saved,
      user: { ...DEFAULT_DATA.user, ...(saved.user || {}) },
      skills: saved.skills || DEFAULT_DATA.skills,
      settings: { ...DEFAULT_DATA.settings, ...(saved.settings || {}) },
      missions: saved.missions || DEFAULT_DATA.missions,
      shop: saved.shop || DEFAULT_DATA.shop,
      stats: { ...DEFAULT_DATA.stats, ...(saved.stats || {}) },
      attendance: saved.attendance || []
    };
    if (!state.user.activeEffects) state.user.activeEffects = [];
  } else {
    state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
} catch (e) {
  console.error("Save data corruption detected. Resetting.", e);
  state = JSON.parse(JSON.stringify(DEFAULT_DATA));
}

// Data Integrity
state.missions.forEach(m => {
  if (typeof m.credits === 'undefined') m.credits = Math.floor(m.points / 2);
  if (typeof m.completions === 'undefined') m.completions = 0;
  if (typeof m.level === 'undefined') m.level = 1;
});

let activeTab = 'dashboard';
let isMenuOpen = false;
let upkeepTimer = 0;
let focusTimerInterval = null;
let focusTimeRemaining = 1500;
let isFocusRunning = false;

// --- DOM Elements ---
const sidebarContainer = document.getElementById('sidebar-container');
const headerContainer = document.getElementById('header-container');
const mainContent = document.getElementById('main-content');
const mobileBackdrop = document.getElementById('mobile-backdrop');
const toastContainer = document.getElementById('toast-container');

// --- Helper Functions ---
function saveState() {
  localStorage.setItem('nebula_os_data', JSON.stringify(state));
}

function applyTheme() {
  if (!document.body) return;
  
  document.body.className = `${state.settings.theme} bg-nebula-950 text-nebula-text overflow-hidden selection:bg-nebula-500 selection:text-white`;
  
  if(state.settings.primaryColor && state.settings.primaryColor !== '#3b82f6') {
     document.documentElement.style.setProperty('--color-primary', state.settings.primaryColor);
  } else {
     document.documentElement.style.removeProperty('--color-primary');
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const colors = type === 'success' ? 'border-l-emerald-500 text-emerald-400 bg-nebula-900/95' : type === 'error' ? 'border-l-red-500 text-red-400 bg-nebula-900/95' : 'border-l-nebula-500 text-nebula-text bg-nebula-900/95';
  
  toast.className = `p-4 rounded-r-lg border-l-4 ${colors} shadow-xl transform translate-x-full transition-transform duration-300 pointer-events-auto flex items-center gap-3 min-w-[300px] border-y border-r border-nebula-800 z-50 backdrop-blur-md`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}" width="20"></i>
    <span class="font-bold text-sm font-sans">${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  if(window.lucide) lucide.createIcons();
  
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full');
  });
  
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function checkLevelUp(currentXp, thresholds = LEVEL_THRESHOLDS) {
  let newLevel = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (currentXp >= thresholds[i]) newLevel = i + 1;
  }
  return newLevel;
}

function getRankTitle(level) {
  const index = Math.min(level - 1, RANKS.length - 1);
  return RANKS[index];
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getMissionTiming(startTimeStr, endTimeStr) {
  if (!startTimeStr || !endTimeStr) return { status: 'available', progress: 0, label: 'ANYTIME' };

  const now = new Date();
  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  
  const [sh, sm] = startTimeStr.split(':').map(Number);
  const [eh, em] = endTimeStr.split(':').map(Number);
  const startSeconds = sh * 3600 + sm * 60;
  const endSeconds = eh * 3600 + em * 60;
  
  const totalDuration = endSeconds - startSeconds;
  
  if (currentSeconds < startSeconds) {
    return { status: 'upcoming', progress: 0, label: `STARTS ${startTimeStr}` };
  } else if (currentSeconds >= endSeconds) {
    return { status: 'expired', progress: 100, label: `ENDED ${endTimeStr}` };
  } else {
    const elapsed = currentSeconds - startSeconds;
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    const timeLeft = endSeconds - currentSeconds;
    
    return { 
      status: 'active', 
      progress, 
      label: `${formatDuration(timeLeft)} LEFT`,
      isLive: true
    };
  }
}

// --- Effects System ---
function getActiveEffectsMultiplier(type) {
  const now = Date.now();
  let multiplier = 1.0;
  state.user.activeEffects = state.user.activeEffects.filter(e => e.expiresAt > now);
  state.user.activeEffects.forEach(e => {
    if (e.type === type) multiplier *= e.value;
  });
  return multiplier;
}

function addEffect(name, type, value, durationSeconds) {
  const expiresAt = Date.now() + (durationSeconds * 1000);
  state.user.activeEffects.push({ id: Date.now(), name, type, value, expiresAt });
  saveState();
  renderHeader(); 
}

// --- Core Logic ---
function handleMissionComplete(id) {
  const missionIndex = state.missions.findIndex(m => m.id === id);
  if (missionIndex === -1) return;

  const mission = state.missions[missionIndex];
  
  const levelMult = 1 + ((mission.level - 1) * 0.1); 
  const buffMult = getActiveEffectsMultiplier('xp_boost');
  
  const earnedXp = Math.floor(mission.points * levelMult * buffMult);
  const earnedCredits = Math.floor(mission.credits * levelMult);

  state.user.xp += earnedXp;
  state.user.level = checkLevelUp(state.user.xp);
  state.user.wallet += earnedCredits;

  // Skill XP Logic
  const skillId = ICON_SKILL_MAP[mission.iconName] || 'int'; // Default to intellect
  const skillIndex = state.skills.findIndex(s => s.id === skillId);
  let skillMsg = "";
  if (skillIndex !== -1) {
    const skillXpGain = Math.floor(earnedXp * 0.5); // Skill gets 50% of base XP
    state.skills[skillIndex].xp += skillXpGain;
    const oldSkillLevel = state.skills[skillIndex].level;
    state.skills[skillIndex].level = checkLevelUp(state.skills[skillIndex].xp, SKILL_THRESHOLDS);
    if(state.skills[skillIndex].level > oldSkillLevel) {
      skillMsg = ` | ${state.skills[skillIndex].name} Level Up!`;
    } else {
      skillMsg = ` | +${skillXpGain} ${state.skills[skillIndex].name} XP`;
    }
  }

  state.missions[missionIndex].lastCompletedAt = Date.now();
  state.missions[missionIndex].completions = (state.missions[missionIndex].completions || 0) + 1;
  state.missions[missionIndex].level = Math.floor(state.missions[missionIndex].completions / 5) + 1;

  state.stats.earnedToday += earnedXp;
  const today = new Date().toISOString().split('T')[0];
  const historyIndex = state.stats.history.findIndex(h => h.date === today);
  if (historyIndex >= 0) {
    state.stats.history[historyIndex].xp += earnedXp;
  } else {
    state.stats.history.push({ date: today, xp: earnedXp });
    if (state.stats.history.length > 7) state.stats.history.shift(); 
  }

  saveState();
  renderApp(); 
  showToast(`Protocol Complete! +${earnedXp} XP | +${earnedCredits} CR${skillMsg}`, 'success');
}

function handlePurchase(itemId) {
  const itemIndex = state.shop.findIndex(i => i.id === itemId);
  if (itemIndex === -1) return;
  
  const item = state.shop[itemIndex];
  if (!state.settings.creativeMode && state.user.wallet < item.cost) {
    // Safety Net feature
    if (state.settings.safetyNet && state.user.wallet === 0) {
       state.user.wallet = 10;
       showToast("Emergency Fund Allocated: +10 CR", 'info');
       saveState();
       renderHeader();
    } else {
       showToast("Insufficient Credits", 'error');
    }
    return;
  }

  if (!state.settings.creativeMode) {
    state.user.wallet -= item.cost;
  }

  if (item.consumable) {
    if (item.id === 's1' || item.iconName === 'coffee') {
      addEffect("Neural Boost", "xp_boost", 1.5, 300);
      showToast("Effect Applied: 1.5x XP Boost (5m)", 'success');
    } else if (item.iconName === 'zap') {
       addEffect("Focus Surge", "xp_boost", 2.0, 60); 
       showToast("Effect Applied: 2.0x XP Boost (1m)", 'success');
    } else {
       showToast("Item Consumed. Vitality Restored.", 'success');
    }
  } else {
    state.shop[itemIndex].purchased = true;
    showToast("Item Acquired", 'success');
  }

  saveState();
  renderApp();
}

function handleCheckIn() {
  const today = new Date().toISOString().split('T')[0];
  if (state.attendance.some(a => a.date === today)) return;

  const lastEntry = state.attendance[state.attendance.length - 1];
  let newStreak = 1;

  if (lastEntry) {
    const lastDate = new Date(lastEntry.date);
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = checkDate.toISOString().split('T')[0];
    if (lastEntry.date === yesterdayStr) newStreak = state.stats.streak + 1;
  }

  const bonusCredits = 100 + (newStreak * 10);
  const bonusXp = 50 + (newStreak * 5);

  state.attendance.push({ date: today, bonusClaimed: true });
  state.stats.streak = newStreak;
  state.user.wallet += bonusCredits;
  state.user.xp += bonusXp;
  state.user.level = checkLevelUp(state.user.xp);

  saveState();
  renderApp();
  showToast(`Daily Check-in: +${bonusCredits} CR`, 'success');
}

function handleAddMission(e) {
  e.preventDefault();
  const form = e.target;
  const newMission = {
    id: Date.now().toString(),
    title: form.title.value,
    points: parseInt(form.points.value),
    credits: parseInt(form.credits.value || 0),
    iconName: form.icon.value,
    startTime: form.startTime.value || null,
    endTime: form.endTime.value || null,
    lastCompletedAt: null,
    recurring: true,
    completions: 0,
    level: 1
  };
  state.missions.push(newMission);
  saveState();
  closeModal('mission-modal');
  form.reset();
  renderApp();
  showToast("Protocol Initialized", 'success');
}

function handleDeleteMission(id) {
  if(confirm("Abort this protocol?")) {
    state.missions = state.missions.filter(m => m.id !== id);
    saveState();
    renderApp();
  }
}

function handleAddShopItem(e) {
  e.preventDefault();
  const form = e.target;
  const newItem = {
    id: 'c' + Date.now().toString(),
    title: form.title.value,
    cost: parseInt(form.cost.value),
    iconName: form.icon.value,
    description: form.description.value,
    consumable: form.consumable.checked,
    purchased: false
  };
  state.shop.push(newItem);
  saveState();
  closeModal('shop-modal');
  form.reset();
  renderApp();
}

function handleDeleteShopItem(id) {
  if(confirm("Remove item from depot?")) {
    state.shop = state.shop.filter(i => i.id !== id);
    saveState();
    renderApp();
  }
}

// --- Restored Profile Functions ---
function updateProfile(key, value) {
  state.user[key] = value;
  saveState();
  const headerName = document.querySelector('header h1');
  if(headerName && key === 'name') {
    // optional update header immediately if needed
  }
}

function setAvatarType(type, value) {
  state.user.avatarType = type;
  if (value) state.user.avatarValue = value;
  saveState();
  renderApp();
}

function handleProfileImageUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      state.user.avatarType = 'image';
      state.user.avatarValue = e.target.result;
      saveState();
      renderApp();
    };
    reader.readAsDataURL(file);
  }
}

function toggleSetting(key) {
  state.settings[key] = !state.settings[key];
  saveState();
  renderApp();
}

function setTheme(themeName) {
  state.settings.theme = themeName;
  saveState();
  applyTheme();
}

function setPrimaryColor(color) {
  state.settings.primaryColor = color;
  saveState();
  applyTheme();
}

function resetSystem() {
  if (confirm("WARNING: Complete system purge initiated. All data will be lost. Proceed?")) {
    localStorage.removeItem('nebula_os_data');
    location.reload();
  }
}

function exportData() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nebula_save_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("System Data Exported", "success");
}

function triggerImport() {
  document.getElementById('import-input').click();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.user && data.missions) {
        state = data;
        saveState();
        location.reload();
      } else {
        showToast("Invalid save file format.", "error");
      }
    } catch (err) {
      showToast("Error parsing save file.", "error");
    }
  };
  reader.readAsText(file);
}

// --- Focus Timer ---
function openFocusMode() {
  document.getElementById('focus-modal').classList.remove('hidden');
  resetFocusTimer();
}

function closeFocusMode() {
  document.getElementById('focus-modal').classList.add('hidden');
  clearInterval(focusTimerInterval);
  isFocusRunning = false;
}

function toggleFocusTimer() {
  const btn = document.getElementById('focus-toggle-btn');
  const status = document.getElementById('focus-status');
  
  if (isFocusRunning) {
    clearInterval(focusTimerInterval);
    isFocusRunning = false;
    btn.innerHTML = `<i data-lucide="play" width="20"></i>`;
    status.innerText = "Paused";
  } else {
    isFocusRunning = true;
    btn.innerHTML = `<i data-lucide="pause" width="20"></i>`;
    status.innerText = "Focus Session Active";
    status.className = "absolute bottom-10 text-xs text-nebula-accent animate-pulse";
    
    focusTimerInterval = setInterval(() => {
      focusTimeRemaining--;
      updateFocusDisplay();
      if (focusTimeRemaining <= 0) {
        clearInterval(focusTimerInterval);
        isFocusRunning = false;
        showToast("Focus Session Complete! +50 XP", 'success');
        state.user.xp += 50;
        state.user.level = checkLevelUp(state.user.xp);
        saveState();
        renderHeader();
        btn.innerHTML = `<i data-lucide="rotate-ccw" width="20"></i>`;
        status.innerText = "Session Complete";
      }
    }, 1000);
  }
  if(window.lucide) lucide.createIcons();
}

function resetFocusTimer() {
  clearInterval(focusTimerInterval);
  isFocusRunning = false;
  focusTimeRemaining = 1500;
  updateFocusDisplay();
  document.getElementById('focus-toggle-btn').innerHTML = `<i data-lucide="play" width="20"></i>`;
  document.getElementById('focus-status').innerText = "Ready to engage";
  if(window.lucide) lucide.createIcons();
}

function updateFocusDisplay() {
  const display = document.getElementById('focus-timer-display');
  if(display) display.innerText = formatDuration(focusTimeRemaining);
  const circle = document.getElementById('focus-progress-circle');
  if(circle) {
      const total = 1500;
      const offset = 301 - (301 * (focusTimeRemaining / total));
      circle.style.strokeDashoffset = offset;
  }
}

// --- UI Rendering ---

function renderSidebar() {
  const menuItems = [
    { id: 'dashboard', icon: 'layout-dashboard', label: 'Command Hub' },
    { id: 'missions', icon: 'list-todo', label: 'Missions' },
    { id: 'skills', icon: 'cpu', label: 'Skill Matrix' },
    { id: 'attendance', icon: 'calendar-check', label: 'Duty Log' },
    { id: 'shop', icon: 'shopping-bag', label: 'Supply Depot' },
    { id: 'settings', icon: 'settings', label: 'System Config' },
  ];

  const rank = getRankTitle(state.user.level);
  
  let avatarHTML = '';
  if (state.user.avatarType === 'image') {
    avatarHTML = `<img src="${state.user.avatarValue}" class="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500">`;
  } else {
    avatarHTML = `<div class="w-full h-full rounded-full bg-nebula-900 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-500 text-nebula-text">${state.user.avatarValue}</div>`;
  }

  const navHTML = menuItems.map(item => `
    <button onclick="switchTab('${item.id}')" 
      class="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group relative overflow-hidden ${activeTab === item.id ? 'bg-nebula-600/10 text-nebula-600 border border-nebula-600/50 shadow-lg' : 'text-nebula-dim hover:text-nebula-text hover:bg-nebula-900/50 hover:border hover:border-nebula-800'}"
    >
      <div class="absolute inset-0 bg-gradient-to-r from-nebula-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <i data-lucide="${item.icon}" width="20" class="relative z-10 transition-transform group-hover:scale-110 group-hover:text-nebula-500"></i>
      <span class="font-medium tracking-wide relative z-10">${item.label}</span>
      ${activeTab === item.id ? '<i data-lucide="chevron-right" width="16" class="ml-auto relative z-10 animate-pulse text-nebula-500"></i>' : ''}
    </button>
  `).join('');

  sidebarContainer.innerHTML = `
    <div class="p-6 border-b border-nebula-800 flex items-center gap-3 relative overflow-hidden group">
      <div class="absolute inset-0 bg-gradient-to-r from-nebula-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <i data-lucide="hexagon" class="text-nebula-600 animate-pulse-slow relative z-10 fill-nebula-600/20"></i>
      <h1 class="font-orbitron text-xl font-bold tracking-widest text-nebula-text relative z-10">NEBULA <span class="text-nebula-600">OS</span></h1>
    </div>
    <div class="p-6 text-center border-b border-nebula-800 bg-nebula-900/30 group">
      <div class="w-20 h-20 mx-auto rounded-full border-2 border-nebula-600 p-[2px] mb-3 shadow-lg shadow-nebula-600/20 overflow-hidden cursor-pointer hover:shadow-nebula-600/40 transition-shadow">
        ${avatarHTML}
      </div>
      <div class="font-bold text-nebula-text text-lg group-hover:text-nebula-600 transition-colors">${state.user.name}</div>
      <div class="text-xs text-nebula-600 font-mono uppercase tracking-wider font-bold">${rank}</div>
      <div class="text-[10px] text-nebula-dim font-mono mt-1">LEVEL ${state.user.level}</div>
    </div>
    <nav class="p-4 space-y-2">
      ${navHTML}
    </nav>
  `;
}

function renderHeader() {
  const titles = {
    dashboard: 'System Overview',
    missions: 'Mission Control',
    skills: 'Neural Matrix',
    attendance: 'Duty Log',
    shop: 'Supply Depot',
    settings: 'Settings'
  };

  const now = Date.now();
  const activeEffectsHTML = state.user.activeEffects
    .filter(e => e.expiresAt > now)
    .map(e => `
      <div class="flex items-center gap-2 px-3 py-1 bg-nebula-600/20 rounded-full border border-nebula-600/50 text-xs text-nebula-600 font-bold buff-active" title="Expires in ${Math.ceil((e.expiresAt - now)/60000)}m">
        <i data-lucide="zap" width="12"></i> ${e.name}
      </div>
    `).join('');

  headerContainer.innerHTML = `
    <header class="flex items-center justify-between p-4 md:p-6 mb-2 glass-panel rounded-b-xl md:rounded-xl">
      <div class="flex items-center gap-4">
        <button onclick="toggleMobileMenu()" class="md:hidden text-nebula-text hover:text-nebula-600 transition-colors"><i data-lucide="menu"></i></button>
        <div>
          <h1 class="text-xl md:text-2xl font-orbitron font-bold text-nebula-text tracking-wider uppercase neon-text hover:scale-[1.01] transition-transform origin-left cursor-default">${titles[activeTab]}</h1>
          <div class="text-xs text-nebula-dim font-mono flex items-center gap-2 mt-1">
            <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            SYS.ONLINE <span class="ml-2">${formatTime(new Date())}</span>
          </div>
        </div>
      </div>
      
      <div class="flex items-center gap-4">
        <div class="hidden md:flex gap-2">
            ${activeEffectsHTML}
        </div>
        
        <div class="bg-nebula-900/80 px-4 py-2 rounded-lg border border-nebula-800 flex items-center gap-3 shadow-inner hover:border-nebula-600/50 transition-all cursor-default group">
          <i data-lucide="${state.settings.creativeMode ? 'infinity' : 'coins'}" width="16" class="${state.settings.creativeMode ? 'text-amber-400' : 'text-nebula-accent'} group-hover:scale-110 transition-transform"></i>
          <span class="font-mono font-bold text-lg ${state.settings.creativeMode ? 'text-amber-400' : 'text-nebula-text'} transition-colors">
            ${state.settings.creativeMode ? 'INF' : state.user.wallet}
          </span>
        </div>
      </div>
    </header>
  `;
  if(window.lucide) lucide.createIcons();
}

function renderDashboard() {
  const nextLevelXp = LEVEL_THRESHOLDS[state.user.level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const prevLevelXp = LEVEL_THRESHOLDS[state.user.level - 1] || 0;
  const progress = Math.min(100, Math.max(0, ((state.user.xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100));
  const rank = getRankTitle(state.user.level);

  mainContent.innerHTML = `
    <div class="space-y-6 animate-fade-in">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass-panel p-6 rounded-xl relative overflow-hidden clip-corner-top group hover:-translate-y-1 transition-transform duration-300">
          <div class="absolute inset-0 bg-gradient-to-br from-nebula-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <i data-lucide="trophy" class="absolute -right-4 -top-4 text-nebula-800 w-24 h-24 opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500"></i>
          <div class="relative z-10">
             <div class="text-nebula-600 text-xs font-orbitron uppercase tracking-widest mb-1 font-bold">Current Rank</div>
             <div class="text-3xl font-bold text-nebula-text mb-1 neon-text">${rank}</div>
             <div class="text-sm text-nebula-dim font-mono mb-4">Level ${state.user.level}</div>
             <div class="flex justify-between text-xs text-nebula-dim mb-1 font-mono">
                <span>XP ${Math.floor(state.user.xp)}</span>
                <span>TARGET ${nextLevelXp}</span>
             </div>
             <div class="w-full h-2 bg-nebula-950 rounded-full overflow-hidden border border-nebula-800/50">
                <div class="h-full bg-nebula-600 transition-all duration-1000 group-hover:bg-nebula-500 shadow-[0_0_10px_var(--color-primary)]" style="width: ${progress}%"></div>
             </div>
          </div>
        </div>
        
        <div class="glass-panel p-6 rounded-xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          <div class="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <i data-lucide="flame" class="absolute -right-4 -top-4 text-nebula-800 w-24 h-24 opacity-20 group-hover:opacity-30 group-hover:rotate-12 transition-all duration-500"></i>
          <div class="relative z-10">
             <div class="text-amber-500 text-xs font-orbitron uppercase tracking-widest mb-1 font-bold">Streak Status</div>
             <div class="text-5xl font-bold text-nebula-text mb-2">${state.stats.streak} <span class="text-lg text-amber-500/80">Cycles</span></div>
             <p class="text-xs text-nebula-dim">Consistency maximizes rewards.</p>
          </div>
        </div>
        
        <div class="glass-panel p-6 rounded-xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <i data-lucide="zap" class="absolute -right-4 -top-4 text-nebula-800 w-24 h-24 opacity-20 group-hover:opacity-30 group-hover:scale-125 transition-all duration-500"></i>
          <div class="relative z-10">
             <div class="text-emerald-500 text-xs font-orbitron uppercase tracking-widest mb-1 font-bold">Daily Output</div>
             <div class="text-5xl font-bold text-nebula-text mb-2">${state.stats.earnedToday} <span class="text-lg text-emerald-500/80">XP</span></div>
             <p class="text-xs text-nebula-dim">Keep system efficiency high.</p>
          </div>
        </div>
      </div>

      <!-- Actions Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
         <button onclick="openFocusMode()" class="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-nebula-600/20 transition-colors group">
            <div class="w-10 h-10 rounded-full bg-nebula-600/20 text-nebula-600 flex items-center justify-center group-hover:scale-110 transition-transform"><i data-lucide="clock"></i></div>
            <span class="text-sm font-bold text-nebula-text">Focus Timer</span>
         </button>
         <button onclick="switchTab('missions')" class="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-nebula-600/20 transition-colors group">
            <div class="w-10 h-10 rounded-full bg-nebula-600/20 text-nebula-600 flex items-center justify-center group-hover:scale-110 transition-transform"><i data-lucide="list-todo"></i></div>
            <span class="text-sm font-bold text-nebula-text">Protocols</span>
         </button>
         <button onclick="openModal('mission-modal')" class="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-nebula-600/20 transition-colors group">
            <div class="w-10 h-10 rounded-full bg-nebula-600/20 text-nebula-600 flex items-center justify-center group-hover:scale-110 transition-transform"><i data-lucide="plus"></i></div>
            <span class="text-sm font-bold text-nebula-text">New Task</span>
         </button>
         <button onclick="switchTab('shop')" class="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-nebula-600/20 transition-colors group">
            <div class="w-10 h-10 rounded-full bg-nebula-600/20 text-nebula-600 flex items-center justify-center group-hover:scale-110 transition-transform"><i data-lucide="shopping-bag"></i></div>
            <span class="text-sm font-bold text-nebula-text">Depot</span>
         </button>
      </div>

      <!-- Chart -->
      <div class="glass-panel p-6 rounded-xl clip-corner">
        <h3 class="text-nebula-text font-orbitron text-lg mb-6 flex items-center gap-2">
          <i data-lucide="trending-up" class="text-nebula-600"></i> Performance Analytics
        </h3>
        <div class="h-[250px] w-full relative">
          <canvas id="xpChart"></canvas>
        </div>
      </div>
    </div>
  `;

  // Initialize Chart if library is present
  setTimeout(() => {
    const ctx = document.getElementById('xpChart');
    if (ctx && window.Chart) {
       const history = state.stats.history.length ? state.stats.history : [{date: 'Start', xp: 0}, {date: 'Now', xp: state.user.xp}];
       const labels = history.map(h => h.date);
       const dataPoints = history.map(h => h.xp);
       const color = getComputedStyle(document.body).getPropertyValue('--color-primary').trim() || '#3b82f6';

       // Destroy previous instance if needed (Chart.js limitation handling)
       const existingChart = Chart.getChart("xpChart");
       if (existingChart) existingChart.destroy();

       new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'XP Gained',
            data: dataPoints,
            borderColor: color,
            backgroundColor: color + '33',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: color,
            pointBorderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { 
              grid: { display: false, borderColor: 'rgba(148, 163, 184, 0.1)' }, 
              ticks: { color: 'rgba(148, 163, 184, 0.8)' } 
            },
            y: { 
              grid: { color: 'rgba(148, 163, 184, 0.1)' }, 
              ticks: { color: 'rgba(148, 163, 184, 0.8)' } 
            }
          }
        }
      });
    }
  }, 100);
}

function renderSkills() {
  const skillsHTML = state.skills.map(skill => {
     const nextXp = SKILL_THRESHOLDS[skill.level] || SKILL_THRESHOLDS[SKILL_THRESHOLDS.length - 1];
     const prevXp = SKILL_THRESHOLDS[skill.level - 1] || 0;
     const progress = Math.min(100, Math.max(0, ((skill.xp - prevXp) / (nextXp - prevXp)) * 100));

     return `
        <div class="glass-panel p-6 rounded-xl flex items-center gap-6 group hover:border-nebula-600/30 transition-all hover:-translate-y-1">
           <div class="relative">
              <div class="w-16 h-16 rounded-xl bg-nebula-900 border border-nebula-800 flex items-center justify-center text-3xl shadow-lg" style="color: ${skill.color}">
                 <i data-lucide="${skill.icon}"></i>
              </div>
              <div class="absolute -top-2 -right-2 bg-nebula-950 border border-nebula-800 text-xs px-2 py-0.5 rounded font-mono font-bold">L${skill.level}</div>
           </div>
           <div class="flex-1">
              <div class="flex justify-between items-end mb-2">
                 <h3 class="font-orbitron font-bold text-lg text-nebula-text">${skill.name}</h3>
                 <span class="text-xs font-mono text-nebula-dim">${Math.floor(skill.xp)} / ${nextXp} XP</span>
              </div>
              <div class="h-4 bg-nebula-950 rounded-full overflow-hidden border border-nebula-800/50 relative">
                 <div class="absolute inset-0 bg-repeat-x opacity-20 skill-bar-pattern"></div>
                 <div class="h-full rounded-full transition-all duration-1000 relative overflow-hidden" style="width: ${progress}%; background-color: ${skill.color}">
                    <div class="absolute inset-0 bg-white/20 animate-pulse-fast"></div>
                 </div>
              </div>
           </div>
        </div>
     `;
  }).join('');

  mainContent.innerHTML = `
    <div class="space-y-6 animate-fade-in">
       <div class="flex justify-between items-center">
          <div class="font-orbitron text-nebula-600 text-lg uppercase tracking-wider font-bold">Neural Skill Matrix</div>
       </div>
       <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${skillsHTML}
       </div>
    </div>
  `;
}

function renderMissions() {
  const missionsHTML = state.missions.map(mission => {
    const isCompleted = mission.lastCompletedAt && new Date(mission.lastCompletedAt).toDateString() === new Date().toDateString();
    const timing = getMissionTiming(mission.startTime, mission.endTime);
    const level = mission.level || 1;
    
    // Default styles
    let statusClass = "border-transparent opacity-100";
    let statusText = "text-nebula-dim";
    let badge = `<span class="text-[10px] font-bold bg-nebula-600/10 text-nebula-600 px-2 py-0.5 rounded border border-nebula-600/20">AVAILABLE</span>`;
    let canComplete = !isCompleted && (timing.status === 'active' || timing.status === 'available');

    // Time-sensitive Visual Indicators
    if (isCompleted) {
      statusClass = "border-emerald-500/30 bg-emerald-500/5 opacity-75";
      statusText = "text-emerald-500";
      badge = `<span class="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">COMPLETED</span>`;
    } else if (timing.status === 'expired') {
      statusClass = "opacity-50 grayscale border-red-500/20";
      statusText = "text-red-500";
      badge = `<span class="text-[10px] font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20">EXPIRED</span>`;
    } else if (timing.status === 'active') {
      // PULSING GLOW for active time-sensitive missions
      statusClass = "border-nebula-accent/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-pulse-slow";
      statusText = "text-nebula-accent";
      badge = `<span class="text-[10px] font-bold bg-yellow-500/10 text-nebula-accent px-2 py-0.5 rounded border border-nebula-accent/20 animate-pulse mission-live-countdown" data-end="${mission.endTime}">ACTIVE</span>`;
    } else if (timing.status === 'upcoming') {
      statusClass = "opacity-75 border-blue-400/20";
      statusText = "text-blue-400";
      badge = `<span class="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">UPCOMING</span>`;
    }

    return `
      <div id="mission-${mission.id}" class="glass-panel p-4 rounded-xl relative group transition-all duration-300 border ${statusClass} hover:shadow-lg hover:border-nebula-600/30 hover:-translate-y-1">
        <!-- Hidden Data for JS updates -->
        <input type="hidden" class="mission-timer-data" value="${mission.id}" data-start="${mission.startTime || ''}" data-end="${mission.endTime || ''}">
        
        <div class="flex items-center justify-between mb-2">
           <div class="flex items-center gap-4">
             <div class="relative">
                 <div class="p-3 rounded-lg bg-nebula-900/50 ${statusText} border border-nebula-800 group-hover:border-nebula-600 transition-colors">
                   <i data-lucide="${mission.iconName}" width="24" class="group-hover:scale-110 transition-transform"></i>
                 </div>
                 <div class="absolute -bottom-1 -right-1 bg-nebula-950 border border-nebula-800 text-[9px] px-1 rounded text-nebula-text font-mono shadow-sm">LVL ${level}</div>
             </div>
             <div>
               <h3 class="font-bold text-nebula-text ${isCompleted ? 'line-through opacity-50' : ''}">${mission.title}</h3>
               <div class="flex items-center gap-3 mt-1 text-xs">
                 <span class="text-nebula-dim font-mono">+${mission.points} XP</span>
                 <span class="text-nebula-dim font-mono">+${mission.credits} CR</span>
                 <div class="mission-badge-container">${badge}</div>
               </div>
             </div>
           </div>
           
           <div class="flex items-center gap-2">
              <button onclick="handleDeleteMission('${mission.id}')" class="p-2 text-nebula-dim hover:text-red-500 transition-all hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100">
                <i data-lucide="trash-2" width="16"></i>
              </button>
              ${canComplete 
                ? `<button onclick="handleMissionComplete('${mission.id}')" class="p-2 rounded-full bg-nebula-900/50 hover:bg-emerald-500/20 text-nebula-dim hover:text-emerald-500 transition-all hover:scale-110 border border-transparent hover:border-emerald-500/50 shadow-lg">
                     <i data-lucide="circle" width="32"></i>
                   </button>`
                : isCompleted 
                  ? `<i data-lucide="check-circle-2" class="text-emerald-500 mr-2 drop-shadow-md" width="28"></i>`
                  : `<i data-lucide="lock" class="text-slate-500 mr-2" width="24"></i>`
              }
           </div>
        </div>
        
        ${mission.startTime ? `
          <div class="mt-3 space-y-1">
             <div class="flex justify-between text-[10px] font-mono text-nebula-dim mission-time-labels">
                <span>${mission.startTime}</span>
                <span class="mission-timer-text ${timing.status === 'active' ? 'text-nebula-accent' : ''}">${timing.label}</span>
                <span>${mission.endTime}</span>
             </div>
             <div class="w-full h-1.5 bg-nebula-900/30 rounded-full overflow-hidden border border-nebula-800">
                <div class="h-full bg-nebula-600 transition-all duration-1000 mission-progress-bar" style="width: ${timing.progress}%"></div>
             </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  mainContent.innerHTML = `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div class="font-orbitron text-nebula-600 text-lg uppercase tracking-wider font-bold">Active Protocols</div>
        <button onclick="openModal('mission-modal')" class="bg-nebula-600 hover:opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95">
          <i data-lucide="plus" width="16"></i> <span class="hidden sm:inline">New Protocol</span>
        </button>
      </div>
      <div class="grid gap-4">
        ${missionsHTML.length ? missionsHTML : '<div class="text-center text-nebula-dim p-8 border border-dashed border-nebula-800 rounded-xl">No active protocols.</div>'}
      </div>
    </div>
  `;
}

// Optimization: Update timers without re-rendering entire list
function updateMissionTimers() {
  const missionInputs = document.querySelectorAll('.mission-timer-data');
  if (missionInputs.length === 0) return;

  missionInputs.forEach(input => {
    const start = input.getAttribute('data-start');
    const end = input.getAttribute('data-end');
    const id = input.value;
    
    // Only update if timing exists
    if(start && end) {
        const timing = getMissionTiming(start, end);
        const card = document.getElementById(`mission-${id}`);
        if(!card) return;

        // Update Text
        const textEl = card.querySelector('.mission-timer-text');
        if(textEl) {
            textEl.innerText = timing.label;
            if(timing.status === 'active') textEl.classList.add('text-nebula-accent');
        }

        // Update Bar
        const barEl = card.querySelector('.mission-progress-bar');
        if(barEl) barEl.style.width = `${timing.progress}%`;

        // Update Live Badge in Mission List
        const badgeEl = card.querySelector('.mission-live-countdown');
        if (badgeEl && timing.status === 'active') {
            badgeEl.innerText = timing.label; // Reuse label which has precise time
        }
    }
  });
}

function renderShop() {
  const shopHTML = state.shop.map(item => {
    const canAfford = state.settings.creativeMode || state.user.wallet >= item.cost;
    const isOwned = item.purchased && !item.consumable;
    
    return `
      <div class="glass-panel p-6 rounded-xl flex flex-col relative group hover:border-nebula-600/50 transition-all hover:-translate-y-1 hover:shadow-xl">
        <div class="flex flex-col items-center text-center flex-1">
            <div class="w-16 h-16 rounded-full bg-nebula-900 border border-nebula-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-nebula-900/50">
              <i data-lucide="${item.iconName}" width="28" class="text-nebula-400 group-hover:text-nebula-text transition-colors"></i>
            </div>
            <h3 class="text-lg font-bold text-nebula-text mb-1">${item.title}</h3>
            <p class="text-xs text-nebula-dim mb-4 flex-1">${item.description || 'No description'}</p>
        </div>
        <button 
          onclick="handlePurchase('${item.id}')"
          ${(!canAfford || isOwned) ? 'disabled' : ''}
          class="w-full py-2 rounded font-bold transition-all mt-auto transform active:scale-95 ${isOwned ? 'bg-nebula-900 text-nebula-dim cursor-not-allowed border border-nebula-800' : canAfford ? 'bg-nebula-600 hover:opacity-90 text-white shadow-lg' : 'bg-nebula-950 text-nebula-dim border border-red-500/20 cursor-not-allowed'}">
          ${isOwned ? 'ACQUIRED' : item.cost + ' CR'}
        </button>
      </div>
    `;
  }).join('');

  mainContent.innerHTML = `
    <div class="space-y-6">
       <div class="flex justify-between items-center">
        <div class="font-orbitron text-nebula-600 text-lg uppercase tracking-wider font-bold">Supply Depot</div>
        <button onclick="openModal('shop-modal')" class="bg-nebula-600 hover:opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95">
          <i data-lucide="plus" width="16"></i> <span class="hidden sm:inline">Add Supply</span>
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${shopHTML}</div>
    </div>
  `;
}

function renderAttendance() {
  const todayStr = new Date().toISOString().split('T')[0];
  const isCheckedIn = state.attendance.some(a => a.date === todayStr);
  let potentialStreak = 1;
  const lastEntry = state.attendance[state.attendance.length - 1];
  if (lastEntry) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - 1);
    if (lastEntry.date === checkDate.toISOString().split('T')[0]) potentialStreak = state.stats.streak + 1;
  }

  // Restore Attendance Matrix
  let matrixHTML = '';
  for(let i=13; i>=0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const attended = state.attendance.some(a => a.date === dStr);
    const isToday = dStr === todayStr;

    matrixHTML += `
      <div class="flex flex-col items-center gap-1 group">
        <div class="w-full aspect-square rounded-md flex items-center justify-center border transition-all ${attended ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500 shadow-md' : 'bg-nebula-900/50 border-nebula-800 text-nebula-dim group-hover:border-nebula-600'} ${isToday && !attended ? 'border-amber-500/50 animate-pulse' : ''}">
          ${attended ? '<i data-lucide="check-circle-2" width="16"></i>' : ''}
        </div>
        <span class="text-[10px] text-nebula-dim font-mono group-hover:text-nebula-600">${d.getDate()}</span>
      </div>
    `;
  }
  
  mainContent.innerHTML = `
    <div class="space-y-8 animate-fade-in">
      <div class="glass-panel p-8 rounded-xl text-center relative overflow-hidden group">
         <div class="mb-6 relative z-10">
           <div class="text-sm text-nebula-600 font-mono tracking-widest uppercase mb-2 font-bold">Current Streak</div>
           <div class="text-6xl font-bold text-nebula-text neon-text group-hover:scale-105 transition-transform duration-300">${isCheckedIn ? state.stats.streak : (state.stats.streak > 0 && potentialStreak > 1 ? state.stats.streak : 0)}</div>
         </div>
         <div class="relative z-10">
           <button 
             onclick="handleCheckIn()"
             ${isCheckedIn ? 'disabled' : ''}
             class="w-full md:w-auto px-10 py-4 rounded-lg font-orbitron font-bold text-lg tracking-widest transition-all duration-300 transform 
               ${isCheckedIn ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 cursor-default' : 'bg-emerald-600 hover:opacity-90 text-white shadow-lg hover:scale-105'}">
             ${isCheckedIn ? 'DUTY LOGGED' : 'CONFIRM PRESENCE'}
           </button>
         </div>
      </div>

      <div class="glass-panel p-6 rounded-xl">
        <h3 class="font-orbitron text-nebula-text mb-4 flex items-center gap-2"><i data-lucide="calendar-check" width="18"></i> 14-Day Matrix</h3>
        <div class="grid grid-cols-7 gap-2">
          ${matrixHTML}
        </div>
      </div>
    </div>
  `;
}

function renderSettings() {
  mainContent.innerHTML = `
    <div class="glass-panel p-6 rounded-xl max-w-2xl mx-auto space-y-8 animate-fade-in">
       <h2 class="text-xl font-orbitron text-nebula-text">System Configuration</h2>
       
       <!-- Profile Customization -->
       <div class="space-y-4 border-b border-nebula-800 pb-8">
          <h3 class="text-lg text-nebula-600 font-bold">Operator Profile</h3>
          
          <div>
            <label class="block text-xs text-nebula-dim mb-1 font-bold">Callsign</label>
            <input type="text" value="${state.user.name}" onchange="updateProfile('name', this.value)" 
              class="w-full bg-nebula-950 border border-nebula-800 rounded p-2 text-nebula-text focus:border-nebula-500 outline-none">
          </div>
          
          <div>
             <label class="block text-xs text-nebula-dim mb-2">Avatar Source</label>
             <div class="flex gap-4 mb-4">
               <button onclick="setAvatarType('emoji')" class="flex-1 py-2 rounded border transition-all ${state.user.avatarType === 'emoji' ? 'bg-nebula-600 border-nebula-500 text-white shadow-lg' : 'bg-nebula-900 border-nebula-800 text-nebula-dim hover:bg-nebula-800'}">Emoji</button>
               <button onclick="setAvatarType('image')" class="flex-1 py-2 rounded border transition-all ${state.user.avatarType === 'image' ? 'bg-nebula-600 border-nebula-500 text-white shadow-lg' : 'bg-nebula-900 border-nebula-800 text-nebula-dim hover:bg-nebula-800'}">Image Uplink</button>
             </div>

             ${state.user.avatarType === 'emoji' ? `
               <div class="flex flex-wrap gap-2 animate-fade-in">
                 ${AVATARS.map(a => `
                   <button onclick="setAvatarType('emoji', '${a}')" class="p-2 rounded border ${state.user.avatarValue === a ? 'bg-nebula-500/20 border-nebula-500 scale-110' : 'border-transparent hover:bg-nebula-900/50 hover:scale-105'} text-xl transition-all">
                     ${a}
                   </button>
                 `).join('')}
               </div>
             ` : `
               <div class="space-y-3 animate-fade-in">
                 <div>
                    <label class="block text-[10px] text-nebula-dim mb-1">IMAGE DATA LINK (URL)</label>
                    <input type="text" value="${state.user.avatarValue.startsWith('data:') ? '' : state.user.avatarValue}" placeholder="https://..." onchange="setAvatarType('image', this.value)" 
                      class="w-full bg-nebula-950 border border-nebula-800 rounded p-2 text-nebula-text text-sm focus:border-nebula-500 outline-none transition-all">
                 </div>
                 <div class="text-center text-xs text-nebula-dim">- OR -</div>
                 <div>
                    <label class="block text-[10px] text-nebula-dim mb-1">LOCAL UPLOAD</label>
                    <input type="file" accept="image/*" onchange="handleProfileImageUpload(event)" 
                      class="w-full text-nebula-dim text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-nebula-900 file:text-nebula-600 hover:file:bg-nebula-800 file:transition-colors file:cursor-pointer">
                 </div>
               </div>
             `}
          </div>
       </div>

       <!-- Themes -->
       <div class="space-y-4 border-b border-nebula-800 pb-8">
          <h3 class="text-lg text-nebula-600 font-bold">Visual Themes</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
             <button onclick="setTheme('theme-light')" class="p-4 rounded-xl border ${state.settings.theme === 'theme-light' ? 'border-blue-500 bg-white text-slate-900 ring-2 ring-blue-500/30' : 'border-slate-200 bg-slate-50 text-slate-500'} transition-all hover:-translate-y-1">SOLAR</button>
             <button onclick="setTheme('nebula')" class="p-4 rounded-xl border ${state.settings.theme === 'nebula' ? 'border-blue-500 bg-slate-900 text-white ring-2 ring-blue-500/30' : 'border-slate-800 bg-slate-950 text-slate-500'} transition-all hover:-translate-y-1">NEBULA</button>
             <button onclick="setTheme('theme-cyberpunk')" class="p-4 rounded-xl border ${state.settings.theme === 'theme-cyberpunk' ? 'border-yellow-500 bg-black text-white' : 'border-zinc-800 bg-zinc-950 text-zinc-500'} transition-all hover:-translate-y-1">CYBER</button>
             <button onclick="setTheme('theme-matrix')" class="p-4 rounded-xl border ${state.settings.theme === 'theme-matrix' ? 'border-green-500 bg-black text-green-400' : 'border-zinc-800 bg-zinc-950 text-zinc-500'} transition-all hover:-translate-y-1">MATRIX</button>
          </div>

          <!-- Accent Picker -->
          <div class="pt-4">
             <label class="block text-xs text-nebula-dim mb-2 font-bold">Accent Uplink</label>
             <div class="flex gap-3">
               ${['#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981'].map(color => `
                 <button onclick="setPrimaryColor('${color}')" class="w-8 h-8 rounded-full border-2 ${state.settings.primaryColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-110'} transition-transform" style="background-color: ${color}"></button>
               `).join('')}
             </div>
          </div>
       </div>

       <!-- Data Management -->
       <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div class="flex flex-col justify-between p-4 bg-nebula-900/50 rounded-lg border border-nebula-800">
             <div>
               <div class="font-bold text-nebula-text">Backup System</div>
               <div class="text-xs text-nebula-dim">Export state to JSON.</div>
             </div>
             <button onclick="exportData()" class="mt-4 px-4 py-2 bg-nebula-600/10 text-nebula-600 border border-nebula-600/20 rounded hover:bg-nebula-600/20 flex items-center justify-center gap-2"><i data-lucide="download" width="16"></i> Export Data</button>
           </div>
           
           <div class="flex flex-col justify-between p-4 bg-nebula-900/50 rounded-lg border border-nebula-800">
             <div>
               <div class="font-bold text-nebula-text">Restore System</div>
               <div class="text-xs text-nebula-dim">Import state from JSON.</div>
             </div>
             <input type="file" id="import-input" class="hidden" accept=".json" onchange="importData(event)">
             <button onclick="triggerImport()" class="mt-4 px-4 py-2 bg-nebula-600/10 text-nebula-600 border border-nebula-600/20 rounded hover:bg-nebula-600/20 flex items-center justify-center gap-2"><i data-lucide="upload" width="16"></i> Import Data</button>
           </div>
       </div>

       <div class="flex items-center justify-between p-4 bg-nebula-900/50 rounded-lg border border-red-900/30">
         <div>
           <div class="font-bold text-nebula-text">Factory Reset</div>
           <div class="text-xs text-nebula-dim">Purge all data permanently.</div>
         </div>
         <button onclick="resetSystem()" class="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20">PURGE</button>
       </div>
    </div>
  `;
}

function renderApp() {
  renderSidebar();
  renderHeader();
  
  switch(activeTab) {
    case 'dashboard': renderDashboard(); break;
    case 'missions': renderMissions(); break;
    case 'skills': renderSkills(); break;
    case 'shop': renderShop(); break;
    case 'attendance': renderAttendance(); break;
    case 'settings': renderSettings(); break;
  }
  
  if(window.lucide) window.lucide.createIcons();
}

function switchTab(tabId) {
  activeTab = tabId;
  closeMobileMenu();
  renderApp();
}

function toggleMobileMenu() {
  isMenuOpen = !isMenuOpen;
  const sidebar = document.getElementById('sidebar-container');
  const backdrop = document.getElementById('mobile-backdrop');
  
  if (isMenuOpen) {
    sidebar.classList.remove('-translate-x-full');
    backdrop.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    backdrop.classList.add('hidden');
  }
}

function closeMobileMenu() {
  isMenuOpen = false;
  document.getElementById('sidebar-container').classList.add('-translate-x-full');
  document.getElementById('mobile-backdrop').classList.add('hidden');
}

function openModal(id) {
  const el = document.getElementById(id);
  if(el) el.classList.remove('hidden');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if(el) el.classList.add('hidden');
}

// --- Init & Loops ---
window.addEventListener('DOMContentLoaded', () => {
  // 1. Apply Theme
  applyTheme(); 
  
  // 2. Initial Render
  renderApp();
  
  // 3. Start Loops
  
  // OPTIMIZED MISSION LOOP: Updates timer text every second without full re-render
  setInterval(() => {
    if (activeTab === 'missions') {
       updateMissionTimers();
    }
  }, 1000);
  
  // CLOCK LOOP: Updates header clock
  setInterval(() => {
    const clock = document.querySelector('header span.ml-2');
    if(clock) clock.innerText = formatTime(new Date());
  }, 30000);
});