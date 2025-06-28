// Основные переменные
let races, skills, armor;
let selectedRace = null;
let selectedSkills = {};
let selectedArmor = {};
let currentMemory = 0;

// Проверка и получение элемента
function getElement(id) {
  const el = document.getElementById(id);
  if (!el) console.error(`Элемент #${id} не найден`);
  return el;
}

// Загрузка данных
async function loadData() {
  try {
    initTheme();
    const [racesRes, skillsRes, armorRes] = await Promise.all([
      fetch('./data/races.json'),
      fetch('./data/skills.json'),
      fetch('./data/armor.json')
    ]);
    
    races = await racesRes.json();
    skills = await skillsRes.json();
    armor = await armorRes.json();
    
    initApp();
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
  }
}

// Инициализация приложения
function initApp() {
  const raceSelect = getElement('race');
  if (!raceSelect) return;
  
  raceSelect.innerHTML = '<option value="">-- Выберите расу --</option>';
  
  // Заполняем выбор расы
  for (const raceId in races) {
    const option = document.createElement('option');
    option.value = raceId;
    option.textContent = races[raceId].name || raceId;
    raceSelect.appendChild(option);
  }
  
  raceSelect.addEventListener('change', updateRace);
  renderAll();
}

// В функции updateRace() удаляем строку с обновлением бонуса расы
function updateRace(e) {
  selectedRace = e.target.value;
  if (!selectedRace) return;
  
  currentMemory = races[selectedRace].maxMemory;
  selectedSkills = {};
  selectedArmor = {};
  
  // Обновляем описание расы
  const raceDescElement = getElement('raceDescription');
  if (raceDescElement) {
    raceDescElement.textContent = races[selectedRace].description;
    raceDescElement.style.display = 'block'; // Показываем элемент
  }
  
  renderAll();
}

function calculateResults() {
  if (!selectedRace) return;
  
  let totalDefense = 0;
  
  // Расчет брони (только сумма защиты)
  for (const partId in armor) {
    if (selectedArmor[partId]) {
      const level = armor[partId].levels[selectedArmor[partId]];
      if (!level) continue;
      totalDefense += level.defense || 0;
    }
  }
  
  // Рассчитываем процент защиты (сумма брони * 0.12)
  const defensePercent = Math.min(totalDefense * 0.12, 100);
  
  // Обновление интерфейса
  getElement('totalArmorValue').textContent = totalDefense;
  getElement('defensePercent').textContent = `${defensePercent.toFixed(1)}%`;
  getElement('currentMemory').textContent = currentMemory;
  getElement('maxMemory').textContent = races[selectedRace].maxMemory;
  
  updateCrafts();
  updateBuffs();
}

// Обновление списка баффов
function updateBuffs() {
  const buffsList = getElement('buffsList');
  if (!buffsList) return;
  
  buffsList.innerHTML = '';
  
  for (const skillId in selectedSkills) {
    const skill = skills[skillId];
    const level = skill.levels[selectedSkills[skillId]];
    
    if (level && level.buff) {
      const li = document.createElement('li');
      li.textContent = `${skill.name}: ${level.buff}`;
      buffsList.appendChild(li);
    }
  }
}

// Рендер всех элементов
function renderAll() {
  renderSkills();
  renderArmor();
  calculateResults();
}

function updateCrafts() {
  const craftsList = getElement('craftsList');
  if (!craftsList || !selectedRace || !races[selectedRace].crafts) return;
  
  craftsList.innerHTML = '';
  
  const crafts = races[selectedRace].crafts;
  
  // Проверяем, есть ли вообще крафты у этой расы
  if (Object.keys(crafts).length === 0) {
    const li = document.createElement('li');
    li.textContent = "Нет расовых крафтов";
    craftsList.appendChild(li);
    return;
  }
  
  // Создаем заголовок для списка крафтов
  const header = document.createElement('h3');
  craftsList.appendChild(header);
  
  // Перебираем крафты как объект
  for (const craftId in crafts) {
    if (crafts.hasOwnProperty(craftId)) {
      const craft = crafts[craftId];
      const li = document.createElement('li');
      li.className = 'craft-item';
      
      li.textContent = craft.name;
      li.title = craft.description; // Добавляем описание в title для tooltip
      
      craftsList.appendChild(li);
    }
  }
}

// Рендер навыков
function renderSkills() {
  const container = getElement('skillsList');
  if (!container || !skills) return;
  
  container.innerHTML = `
    <div class="memory-display">
      Память: <span id="currentMemory">${currentMemory}</span>/<span id="maxMemory">${selectedRace ? races[selectedRace].maxMemory : 0}</span>
    </div>
  `;

  for (const skillId in skills) {
    const skill = skills[skillId];
    const skillDiv = document.createElement('div');
    skillDiv.className = 'skill';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'skill-header';
    
    const nameEl = document.createElement('h3');
    nameEl.textContent = skill.name;
    headerDiv.appendChild(nameEl);
    
    const scaleDiv = document.createElement('div');
    scaleDiv.className = 'scale-container';
    
    // Точка "нет"
    const nonePoint = document.createElement('div');
    nonePoint.className = 'scale-point none-point' + (!selectedSkills[skillId] ? ' active' : '');
    nonePoint.textContent = '×';
    nonePoint.onclick = () => {
      if (selectedSkills[skillId]) {
        currentMemory += skills[skillId].levels[selectedSkills[skillId]].totalCost;
        delete selectedSkills[skillId];
        renderAll();
      }
    };
    scaleDiv.appendChild(nonePoint);
    
    // Уровни навыка
    const levels = ["ученик", "адепт", "эксперт", "мастер"];
    levels.forEach(levelKey => {
      if (!skill.levels[levelKey]) return;
      
      const point = document.createElement('div');
      point.className = 'scale-point';
      
      if (selectedSkills[skillId] === levelKey) {
        point.classList.add('active');
      }
      
      // Проверяем доступность уровня
      const levelCost = skill.levels[levelKey].totalCost;
      const isCurrentSkill = selectedSkills[skillId] === levelKey;
      const isOtherSkillSelected = selectedSkills[skillId] && !isCurrentSkill;
      
      // Рассчитываем доступную память с учетом текущего выбранного уровня
      let availableMemory = currentMemory;
      if (isOtherSkillSelected) {
        availableMemory += skill.levels[selectedSkills[skillId]].totalCost;
      }
      
      // Уровень недоступен если:
      // 1. Не выбран текущий уровень И
      // 2. (Не хватает памяти с учетом освобождения текущего уровня ИЛИ выбран другой уровень этого навыка)
      if (!isCurrentSkill && (levelCost > availableMemory)) {
        point.classList.add('disabled');
      }
      
      const levelShort = {
        "ученик": "Ученик",
        "адепт": "Адепт",
        "эксперт": "Эксперт", 
        "мастер": "Мастер"
      };
      
      point.textContent = levelShort[levelKey] || levelKey;
      point.dataset.tooltip = `${skill.levels[levelKey].totalCost} памяти`;
      point.onclick = () => selectSkill(skillId, levelKey);
      scaleDiv.appendChild(point);
    });
    
    headerDiv.appendChild(scaleDiv);
    skillDiv.appendChild(headerDiv);
    container.appendChild(skillDiv);
  }
}

function renderArmor() {
  const container = getElement('armorList');
  if (!container || !armor) return;
  
  container.innerHTML = '';
  
  for (const partId in armor) {
    const part = armor[partId];
    const partDiv = document.createElement('div');
    partDiv.className = 'armor-part';
    
    const partName = document.createElement('h3');
    partName.textContent = part.name;
    partDiv.appendChild(partName);
    
    const scaleDiv = document.createElement('div');
    scaleDiv.className = 'scale-container';
    
    // Вариант "Без"
    const nonePoint = document.createElement('div');
    nonePoint.className = 'scale-point armor-point none-point' + 
                         (!selectedArmor[partId] ? ' active' : '');
    nonePoint.textContent = 'Без';
    nonePoint.dataset.tooltip = '0 защиты';
    nonePoint.onclick = () => {
      if (selectedArmor[partId]) {
        delete selectedArmor[partId];
        renderAll();
      }
    };
    scaleDiv.appendChild(nonePoint);
    
    // Уровни брони - точно соответствуют ключам из вашего JSON
    const levels = ["Сверхлёгкий", "Лёгкий", "Тяжёлый"];
    
    levels.forEach(levelKey => {
      if (!part.levels[levelKey]) {
        console.warn(`Уровень брони ${levelKey} не найден для ${partId}`);
        return;
      }
      
      const point = document.createElement('div');
      point.className = 'scale-point armor-point';
      
      if (selectedArmor[partId] === levelKey) {
        point.classList.add('active');
      }
      
      point.textContent = levelKey;
      const defense = part.levels[levelKey].defense || 0;
      point.dataset.tooltip = `${defense} защиты`;
      point.onclick = () => selectArmor(partId, levelKey);
      scaleDiv.appendChild(point);
    });
    
    partDiv.appendChild(scaleDiv);
    container.appendChild(partDiv);
  }
}

// Выбор навыка
function selectSkill(skillId, levelKey) {
  if (!selectedRace) return alert('Сначала выберите расу!');
  
  const skill = skills[skillId];
  const level = skill.levels[levelKey];
  
  // Если кликаем на уже выбранный уровень - снимаем выбор
  if (selectedSkills[skillId] === levelKey) {
    // Возвращаем память за этот уровень
    currentMemory += skill.levels[levelKey].totalCost;
    // Удаляем навык из выбранных
    delete selectedSkills[skillId];
    renderAll();
    return;
  }
  
  // Если выбираем новый уровень (не клик по текущему)
  if (!level) return;
  
  // Возвращаем память за предыдущий уровень (если был выбран)
  if (selectedSkills[skillId]) {
    currentMemory += skill.levels[selectedSkills[skillId]].totalCost;
  }
  
  // Проверяем достаточно ли памяти
  if (level.totalCost > currentMemory) {
    return alert(`Недостаточно памяти! Нужно ${level.totalCost}, доступно ${currentMemory}`);
  }
  
  // Вычитаем стоимость
  selectedSkills[skillId] = levelKey;
  currentMemory -= level.totalCost;
  
  renderAll();
}

function selectArmor(partId, levelKey) {
  if (!selectedRace) return alert('Сначала выберите расу!');
  
  const part = armor[partId];
  if (!part.levels[levelKey]) return;
  
  // Если кликаем на уже выбранный уровень - снимаем выбор
  if (selectedArmor[partId] === levelKey) {
    delete selectedArmor[partId];
  } else {
    selectedArmor[partId] = levelKey;
  }
  
  renderAll();
}

// Сброс выбора брони
function resetArmorSelection(partId) {
  if (selectedArmor[partId]) {
    delete selectedArmor[partId];
    renderAll();
  }
}

// Функция переключения темы
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeButton(newTheme);
}

// Обновление текста кнопки
function updateThemeButton(theme) {
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
  }
}

// Инициализация темы при загрузке
function initTheme() {
  // Проверяем предпочтения системы
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('theme') || (systemPrefersDark ? 'dark' : 'light');
  
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButton(savedTheme);
  
  // Слушаем изменения системных предпочтений
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
      const newTheme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      updateThemeButton(newTheme);
    }
  });
  
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }
}

// В конце файла, после всех функций, добавим:
document.addEventListener('DOMContentLoaded', () => {
  const resetButton = document.getElementById('resetSkills');
  if (resetButton) {
    resetButton.addEventListener('click', resetAllSkills);
  }
});

function resetAllSkills() {
  if (!selectedRace) return;
  
  // Возвращаем всю занятую память
  for (const skillId in selectedSkills) {
    currentMemory += skills[skillId].levels[selectedSkills[skillId]].totalCost;
  }
  
  // Очищаем выбранные навыки
  selectedSkills = {};
  
  // Перерисовываем интерфейс
  renderAll();
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', loadData);