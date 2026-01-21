document.addEventListener('DOMContentLoaded', () => {
  const subjectInput = document.getElementById('subject-input');
  const addBtn = document.getElementById('add-btn');
  const subjectList = document.getElementById('subject-list');
  const toggleBtn = document.getElementById('toggle-btn');
  const clearBtn = document.getElementById('clear-btn');
  const statusSpan = document.getElementById('status');
  const refreshCountSpan = document.getElementById('refresh-count');

  let subjects = [];
  let isActive = false;

  // Load state
  chrome.storage.local.get(['subjects', 'isActive', 'refreshCount'], (result) => {
    subjects = result.subjects || [];
    isActive = result.isActive || false;
    refreshCountSpan.textContent = result.refreshCount || 0;
    updateUI();
  });

  // Listen for updates from content script
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.refreshCount) {
      refreshCountSpan.textContent = changes.refreshCount.newValue;
    }
    if (changes.isActive) {
      isActive = changes.isActive.newValue;
      updateUI();
    }
  });

  addBtn.addEventListener('click', () => {
    const name = subjectInput.value.trim();
    if (name && !subjects.includes(name)) {
      subjects.push(name);
      chrome.storage.local.set({ subjects }, () => {
        subjectInput.value = '';
        updateUI();
      });
    }
  });

  toggleBtn.addEventListener('click', () => {
    isActive = !isActive;
    chrome.storage.local.set({ isActive, refreshCount: 0 }, () => {
      updateUI();
    });
  });

  clearBtn.addEventListener('click', () => {
    subjects = [];
    chrome.storage.local.set({ subjects }, () => {
      updateUI();
    });
  });

  function updateUI() {
    subjectList.innerHTML = '';
    subjects.forEach((name, index) => {
      const li = document.createElement('li');
      li.textContent = name;
      const remove = document.createElement('span');
      remove.textContent = '✕';
      remove.className = 'remove-btn';
      remove.onclick = () => {
        subjects.splice(index, 1);
        chrome.storage.local.set({ subjects }, updateUI);
      };
      li.appendChild(remove);
      subjectList.appendChild(li);
    });

    if (isActive) {
      statusSpan.textContent = 'Rodando';
      statusSpan.style.color = '#2ecc71';
      toggleBtn.textContent = 'Parar Bot';
      toggleBtn.className = 'btn-stop';
    } else {
      statusSpan.textContent = 'Parado';
      statusSpan.style.color = '#e74c3c';
      toggleBtn.textContent = 'Iniciar Bot';
      toggleBtn.className = 'btn-start';
    }
  }
});
