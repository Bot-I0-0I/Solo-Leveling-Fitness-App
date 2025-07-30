// ================ DEFAULT USER ================
function getDefaultUser() {
  return {
    level: 1,
    exp: 0,
    nextLevelExp: 100,
    abilityPoints: 0,
    stats: { str: 1, agi: 1, vit: 1, ene: 1 },
    skills: [],
    tasks: [],
    streak: {
      count: 0,
      lastActive: null
    },
    profile: {
      name: "Unknown Warrior",
      title: "The Beginner",
      class: "Warrior",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-xC76XTJ8NVb1YLGQpQDgF2OG3Uv8iHZwYqMzCbYYAn0KrcR-UrVbnH4&s"
    },
    achievements: {
      sRankSeen: false  // ← Track if S-Rank popup was already shown
    }
  };
}

let user = getDefaultUser();

// ================ DOM ELEMENTS ================
const $ = id => document.getElementById(id);

const DOM = {
  level: $('level'),
  exp: $('exp'),
  nextExp: $('nextLevelExp'),
  expBar: $('expBar'),
  ap: $('ap'),
  str: $('str'),
  agi: $('agi'),
  vit: $('vit'),
  ene: $('ene'),
  levelUpMsg: $('levelUpMsg'),
  skillsList: $('skillsList'),
  profile: {
    name: $('profileName'),
    title: $('profileTitle'),
    class: $('profileClass'),
    image: $('profileImage')
  }
};

// ================ STORAGE ================
function loadUserData() {
  const saved = localStorage.getItem('soloFitnessUser');
  if (saved) {
    try {
      user = { ...getDefaultUser(), ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed to parse ', e);
      user = getDefaultUser();
    }
  }
  updateUI();
  renderCustomTasks();
  updateStreak(); // Check streak on load
  loadTheme();
}

function saveUserData() {
  try {
    localStorage.setItem('soloFitnessUser', JSON.stringify(user));
  } catch (e) {
    console.error('Save failed:', e);
  }
}

// ================ UI UPDATE ================
function updateUI() {
  DOM.level.textContent = user.level;
  DOM.exp.textContent = user.exp;
  DOM.nextExp.textContent = user.nextLevelExp;
  DOM.expBar.value = user.exp;
  DOM.expBar.max = user.nextLevelExp;

  DOM.ap.textContent = user.abilityPoints;
  Object.keys(user.stats).forEach(s => DOM[s].textContent = user.stats[s]);

  ['str', 'agi', 'vit', 'ene'].forEach(stat => {
    const btn = document.querySelector(`button[onclick*="allocateAP('${stat}')"]`);
    if (btn) btn.disabled = user.abilityPoints <= 0;
  });

  // Update skills
  if (DOM.skillsList) {
    // Inside updateUI(), change this part:
    DOM.skillsList.innerHTML = '';
    user.skills.forEach((s, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        ${s.name} ${user.level >= s.levelRequired ? '' : `<small>(Req: Lv${s.levelRequired})</small>`}
        <div>
          <button class="delete-btn" onclick="removeSkillAt(${i})">❌</button>
        </div>
      `;
      if (user.level < s.levelRequired) li.style.opacity = '0.6';
      DOM.skillsList.appendChild(li);
    });
  }

// Update profile
if (DOM.profile.name) {
  DOM.profile.name.textContent = user.profile.name;
  DOM.profile.title.textContent = user.profile.title; // ✅ This was missing!
  DOM.profile.class.textContent = user.profile.class;
  DOM.profile.image.src = user.profile.image;
}
  // Auto-title based on level
if (user.level >= 100) {
  user.profile.title = "Doom Bringer";
} else if (user.level >= 80) {
  user.profile.title = "Calmity";
} else if (user.level >= 50) {
  user.profile.title = "Destroyer";
} else if (user.level >= 30) {
  user.profile.title = "Nova"
} else {
  user.profile.title = "Rookie";
}
// Then update DOM
DOM.profile.title.textContent = user.profile.title;
  // Update rank & streak
  updateRankBadge();
  updateClassTheme();
  updateLevelCircle();
  updateStreakUI();
}

// ================ DAILY STREAK SYSTEM ================
function getTodayKey() {
  return new Date().toISOString().split('T')[0]; // "2025-04-05"
}

function prevDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function updateStreak() {
  const today = getTodayKey();
  const lastActive = user.streak?.lastActive || null;
  let streakCount = user.streak?.count || 0;

  if (today === lastActive) {
    // Already logged today
  } else if (lastActive === prevDay(today)) {
    // Continued streak
    streakCount++;
  } else {
    // Streak broken
    streakCount = 1;
  }

  // Update user
  if (!user.streak) user.streak = { count: 0, lastActive: null };
  user.streak.count = streakCount;
  user.streak.lastActive = today;

  // 7-day reward
  if (streakCount === 7) {
    user.abilityPoints++;
    showMessage("🎁 7-Day Streak! +1 Ability Point!", 4000);
  }

  saveUserData();
  updateStreakUI();
}

function updateStreakUI() {
  const el = $('streakCount');
  const progress = $('streakProgress');
  if (el) el.textContent = user.streak?.count || 0;

  // Update progress dots
  if (progress) {
    const days = progress.querySelectorAll('.day');
    const count = user.streak?.count || 0;
    days.forEach((day, i) => {
      day.setAttribute('data-active', i < count ? 'true' : 'false');
    });
  }
}

// ================ RANK SYSTEM ================
function updateRankBadge() {
  const badge = $('rankBadge');
  if (!badge) return;

  const wasRank = badge.textContent;

  let rank = 'F-Rank';
  let cls = '';

  if (user.level >= 100) {
    rank = 'S-Rank';
    cls = 'srank';
  } else if (user.level >= 80) {
    rank = 'A-Rank';
    cls = 'arank';
  } else if (user.level >= 50) {
    rank = 'B-Rank';
    cls = 'brank';
  } else if (user.level >= 30) {
    rank = 'C-Rank';
    cls = 'crank';
  } else if (user.level >= 10) {
    rank = 'D-Rank';
    cls = 'drank';
  }

  badge.textContent = rank;
  badge.className = `rank-badge ${cls}`;

  // 🔔 Only show effects if rank changed
  if (wasRank && wasRank !== rank) {
    badge.classList.add('rank-up');
    setTimeout(() => badge.classList.remove('rank-up'), 1000);

    showMessage(`🏆 NEW RANK: ${rank}!`, 3000);
    playSound('levelUpSound');

    // 🌟 Show S-Rank full-screen overlay only ONCE
    if (rank === 'S-Rank' && !user.achievements.sRankSeen) {
      user.achievements.sRankSeen = true;  // Mark as seen
      saveUserData();  // Persist it
      showRankUpOverlay('S-RANK');
      showAchievementCard('S-Rank', user.level, user.profile.name);
    }
  }
}

function showRankUpOverlay(rank) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: radial-gradient(circle, #000000, #1a1a2e);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 4rem;
    font-weight: bold;
    color: white;
    z-index: 10000;
    opacity: 0;
    pointer-events: none;
    text-align: center;
    transition: opacity 0.5s ease;
  `;
  overlay.innerHTML = `
    🏆<br>
    ${rank}!<br>
    <small style="font-size:1.5rem;color:gold">You've reached legendary status!</small>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.style.opacity = 1, 10);

  // Remove after 3 seconds
  setTimeout(() => {
    overlay.style.opacity = 0;
    setTimeout(() => overlay.remove(), 500);
  }, 3000);
}
// ================ LEVEL CIRCLE ================
function updateLevelCircle() {
  const circle = $('levelCircle');
  if (circle) {
    circle.querySelector('span:last-child').textContent = user.level;
  }
}

// ================ THEME SYSTEM ================
function updateClassTheme() {
  const root = document.documentElement;

  // Define your classes and their colors here
  const classThemes = {
    warrior: {
      color: '#6a0dad',
      dark: '#520aaf',
      light: '#8a4dbd',
      name: 'Warrior'
    },
    mage: {
      color: '#2196f3',
      dark: '#0b7dda',
      light: '#4fc3f7',
      name: 'Mage'
    },
    rogue: {
      color: '#ff9800',
      dark: '#e68a00',
      light: '#ffb74d',
      name: 'Rogue'
    },
    archer: {
      color: '#4caf50',
      dark: '#388e3c',
      light: '#81c784',
      name: 'Archer'
    },
    tank: {
      color: '#607d8b',
      dark: '#455a64',
      light: '#90a4ae',
      name: 'Tank'
    },
    ninja: {
      color: '#2c3e50',
      dark: '#1a252f',
      light: '#34495e',
      name: 'Ninja'
    },
    paladin: {
      color: '#d4af37',
      dark: '#b8860b',
      light: '#f9e076',
      name: 'Paladin'
    },
    berserker: {
      color: '#e74c3c',
      dark: '#c0392b',
      light: '#ff7675',
      name: 'Berserker'
    },
    hamza: {
     color: '#FF204E',
      dark: '#0C0C0C',
      light: '#FF204E',
      name: 'Monarch' 
    }
    // Add more classes here!
  };

  // Get user class and normalize it
  const userClass = (user.profile.class || 'Warrior').trim().toLowerCase();

  // Find matching theme by key or partial name
  let theme = null;
  for (const [key, data] of Object.entries(classThemes)) {
    if (userClass.includes(key) || userClass === data.name.toLowerCase()) {
      theme = data;
      break;
    }
  }

  // Fallback if no match
  if (!theme) {
    theme = {
      color: '#6a0dad',
      dark: '#520aaf',
      light: '#8a4dbd'
    };
  }

  // Apply CSS variables
  root.style.setProperty('--class-color', theme.color);
  root.style.setProperty('--class-color-dark', theme.dark);
  root.style.setProperty('--class-color-light', theme.light);
  root.style.setProperty('--class-color-rgb', hexToRgb(theme.color));
}

function shadeColor(color, percent) {
  const R = Math.max(0, Math.min(255, parseInt(color.slice(1,3),16) + percent));
  const G = Math.max(0, Math.min(255, parseInt(color.slice(3,5),16) + percent));
  const B = Math.max(0, Math.min(255, parseInt(color.slice(5,7),16) + percent));
  return `#${R.toString(16).padStart(2,'0')}${G.toString(16).padStart(2,'0')}${B.toString(16).padStart(2,'0')}`;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1],16)}, ${parseInt(result[2],16)}, ${parseInt(result[3],16)}` : '106, 13, 173';
}

// ================ SOUND EFFECTS ================
function playSound(soundId) {
  const sound = $(soundId);
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(e => console.warn("Audio play failed:", e));
  }
}

// ================ QUEST & LEVEL ================
function completeQuest(name, expGain) {
  showMessage(`✅ ${name}! +${expGain} EXP`, 2000);
  playSound('questSound');
  user.exp += expGain;
  let levels = 0;

  // Faster leveling: EXP = 50 + (level * 10)
  while (user.exp >= user.nextLevelExp) {
    user.exp -= user.nextLevelExp;
    user.level++;
    user.nextLevelExp = 50 + (user.level * 10); // Linear growth
    user.abilityPoints++;
    levels++;
  }

  if (levels > 0) {
    showMessage(`🎉 LEVEL UP! Level ${user.level}!`, 3000);
    playSound('levelUpSound');

    // Animations
    const circle = $('levelCircle');
    if (circle) {
      circle.classList.remove('pop');
      void circle.offsetWidth;
      circle.classList.add('pop');
    }
    document.querySelectorAll('.stat-box').forEach(box => {
      box.classList.add('bounce');
      setTimeout(() => box.classList.remove('bounce'), 600);
    });
    DOM.expBar.classList.add('exp-gain');
    setTimeout(() => DOM.expBar.classList.remove('exp-gain'), 600);

    // ✅ Check for rank-up
    updateRankBadge();
  }
  updateUI();
  saveUserData();
}

// ================ CUSTOM TASKS ================
function addCustomTask() {
  const name = $('taskName').value.trim();
  const exp = parseInt($('taskExp').value);
  if (!name) return showMessage('⚠️ Enter task name!', 2000);
  if (isNaN(exp) || exp <= 0) return showMessage('⚠️ Valid EXP only!', 2000);

  user.tasks.push({ name, exp });
  $('taskName').value = '';
  $('taskExp').value = '';
  showMessage(`✅ Added: ${name}`, 2000);
  renderCustomTasks();
  saveUserData();
}

function renderCustomTasks() {
  const list = $('customTasksList');
  if (!list) return;
  list.innerHTML = '';
  user.tasks.forEach((t, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${t.name} <small>(+${t.exp} EXP)</small></span>
      <div>
        <button onclick="playSound('questSound'); completeCustomTask(${i})" title="Complete">✅</button>
        <button onclick="playSound('clickSound'); removeCustomTask(${i})" title="Delete">🗑️</button>
      </div>
    `;
    list.appendChild(li);
  });
}

function completeCustomTask(i) {
  const t = user.tasks[i];
  if (t) completeQuest(t.name, t.exp);
}

function removeCustomTask(i) {
  const t = user.tasks[i];
  user.tasks.splice(i, 1);
  showMessage(`🗑️ Removed: ${t.name}`, 2000);
  renderCustomTasks();
  saveUserData();
}

// ================ SKILLS ================
function addCustomSkill() {
  const name = $('skillName').value.trim();
  const req = parseInt($('skillLevelReq').value) || 1;
  if (!name) return showMessage('⚠️ Enter skill name!', 2000);
  user.skills.push({ name, levelRequired: req });
  $('skillName').value = '';
  $('skillLevelReq').value = '';
  showMessage(`✨ Added: ${name}`, 2000);
  updateUI();
  saveUserData();
}

function removeSkillAt(i) {
  const name = user.skills[i].name;
  user.skills.splice(i, 1);
  showMessage(`🗑️ Removed: ${name}`, 2000);
  updateUI();
  saveUserData();
}

// ================ ABILITY POINTS ================
function allocateAP(stat) {
  if (user.abilityPoints <= 0) return showMessage('❌ No AP left!', 2000);
  user.stats[stat]++;
  user.abilityPoints--;
  showMessage(`📈 +1 ${stat.toUpperCase()}!`, 2000);
  updateUI();
  saveUserData();
}

// ================ PROFILE ================
function toggleProfileEdit() {
  const d = $('profileDisplay');
  const e = $('profileEdit');
  if (e.style.display === 'none') {
    $('editName').value = user.profile.name;
    $('editClass').value = user.profile.class;
    $('editImage').value = user.profile.image;
    $('editTitle').value = user.profile.title;
    d.style.display = 'none';
    e.style.display = 'block';
  } else {
    d.style.display = 'block';
    e.style.display = 'none';
  }
}

function saveProfile() {
  user.profile = {
    name: $('editName').value.trim() || 'Unknown Warrior',
    title: $('editTitle').value.trim() || 'The Beginner', // ✅ Added
    class: $('editClass').value.trim() || 'Warrior',
    image: $('editImage').value.trim() || 'https://via.placeholder.com/80'
  };
  toggleProfileEdit();
  showMessage(`✨ Profile saved!`, 2000);
  updateUI();
  saveUserData();
}

// ================ MISC ================
function showMessage(text, duration) {
  const msg = $('levelUpMsg');
  if (msg) {
    msg.textContent = text;
    msg.style.opacity = '1';
    setTimeout(() => msg.style.opacity = '0', duration);
  }
}

function resetApp() {
  if (confirm('⚠️ Reset all progress?')) {
    localStorage.removeItem('soloFitnessUser');
    user = getDefaultUser();
    updateUI();
    renderCustomTasks();
    showMessage('🔁 Reset!', 2000);
  }
}

function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.getAttribute('data-theme') === 'dark';
  root.setAttribute('data-theme', isDark ? '' : 'dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

function loadTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

// ================ ACHIEVEMENT CARD ================
function showAchievementCard(rank, level, name) {
  const card = $('achievementCard');
  const overlay = $('cardOverlay');
  const cardLevel = $('cardLevel');
  const cardName = $('cardName');
  const badge = card.querySelector('.rank-badge-large');

  // Populate data
  cardLevel.textContent = level;
  cardName.textContent = name;
  badge.textContent = rank;

  // Apply color based on rank
  badge.className = 'rank-badge-large';
  if (rank === 'S-Rank') badge.classList.add('srank');
  else if (rank === 'A-Rank') badge.classList.add('arank');
  // Add more if needed

  // Show card and overlay
  card.style.display = 'block';
  overlay.style.display = 'block';
}

function closeAchievementCard() {
  const card = $('achievementCard');
  const overlay = $('cardOverlay');
  card.style.display = 'none';
  overlay.style.display = 'none';
}

function downloadAchievementCard() {
  const card = $('achievementCard');
  const content = card.querySelector('.card-content');

  // Try Web Share API first (mobile)
  if (navigator.share && window.innerWidth < 1000) {
    navigator.share({
      title: `I reached S-Rank in SoloFitness!`,
      text: `🏆 S-Rank Achieved! Level ${user.level} | ${user.profile.name}`
    }).catch(() => {
      // If share fails or not supported, fall back to download
      fallbackToDownload(content);
    });
    return;
  }

  // Otherwise, fall back to download
  fallbackToDownload(content);
}

function fallbackToDownload(element) {
  if (typeof html2canvas === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = () => generateCanvas(element);
    document.head.appendChild(script);
  } else {
    generateCanvas(element);
  }
}

function generateCanvas(element) {
  html2canvas(element, {
    backgroundColor: '#1a1a2e',
    scale: 2,
    useCORS: true
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = `SoloFitness_S-Rank_Level${user.level}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(err => {
    console.error('Image generation failed:', err);
    alert('Could not save image. Try again!');
  });
}

function downloadCardAfterLoad(element) {
  html2canvas(element, {
    backgroundColor: '#1a1a2e',
    scale: 2,
    useCORS: true,
    logging: false
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = `achievement-${user.profile.name}-${user.level}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(err => {
    console.error('Failed to generate image:', err);
    alert('Could not generate image. Try again!');
  });
}

// ================ ACHIEVEMENT CARD ================
function showAchievementCard(rank, level, name) {
  const card = $('achievementCard');
  const overlay = $('cardOverlay');
  const cardLevel = $('cardLevel');
  const cardName = $('cardName');
  const badge = card.querySelector('.rank-badge-large');

  cardLevel.textContent = level;
  cardName.textContent = name;
  badge.textContent = rank;

  // Set color
  badge.className = 'rank-badge-large';
  badge.classList.add(
    rank.includes('S-') ? 'srank' :
    rank.includes('A+') ? 'arank-plus' :
    rank.includes('A-') ? 'arank' :
    rank.includes('B-') ? 'brank' :
    rank.includes('C-') ? 'crank' :
    rank.includes('D-') ? 'drank' :
    rank.includes('E-') ? 'erank' : ''
  );

  card.style.display = 'block';
  overlay.style.display = 'block';
}

function closeAchievementCard() {
  $('achievementCard').style.display = 'none';
  $('cardOverlay').style.display = 'none';
}

function downloadAchievementCard() {
  const content = $('achievementCard').querySelector('.card-content');
  if (typeof html2canvas === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = () => generateCardImage(content);
    document.head.appendChild(script);
  } else {
    generateCardImage(content);
  }
}

function generateCardImage(element) {
  html2canvas(element, {
    backgroundColor: '#1a1a2e',
    scale: 2
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = `rank-${user.profile.name}-${user.level}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(err => {
    console.error('Image gen failed:', err);
    alert('Failed to generate image.');
  });
}

//Export Data
function exportData() {
  const dataStr = JSON.stringify(user, null, 2); // Pretty-printed
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `solo-fitness-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url); // Clean up
}

// ================ IMPORT DATA (LOAD BACKUP) ================
function importData() {
  // Create a file input element
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json'; // Only allow JSON files

  // When file is selected
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const imported = JSON.parse(event.target.result);

        // Optional: Validate structure
        if (!imported.level || !imported.exp) {
          throw new Error('Invalid data format');
        }

        // Merge with default user in case some fields are missing
        user = { ...getDefaultUser(), ...imported };

        // Save to localStorage
        saveUserData();
        updateUI();
        showMessage('✅ Data imported successfully!', 3000);
      } catch (err) {
        console.error('Import failed:', err);
        showMessage('❌ Failed to load backup. Invalid or corrupted file.', 4000);
      }
    };
    reader.readAsText(file);
  };

  // Trigger file picker
  input.click();
}

// ================ INIT ================
loadUserData();