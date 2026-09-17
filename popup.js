document.addEventListener('DOMContentLoaded', async () => {
  const sourceSelect = document.getElementById('project-source');
  SOURCES.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    sourceSelect.appendChild(opt);
  });

  const nameInput = document.getElementById('project-name');
  const newNameField = document.getElementById('new-name-field');
  const sourceField = document.getElementById('source-field');
  const picker = document.getElementById('project-picker');
  const existingProjects = await getProjects();

  existingProjects
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${sourceLabel(p.source)})`;
      picker.appendChild(opt);
    });

  function syncFieldsToPicker() {
    const isNew = picker.value === '__new__';
    newNameField.hidden = !isNew;
    sourceField.hidden = !isNew;
    nameInput.required = isNew;
    if (isNew) nameInput.focus();
  }
  picker.addEventListener('change', syncFieldsToPicker);
  syncFieldsToPicker();

  let capturedLink = '';
  const tab = await getActiveTab();
  if (tab && tab.url && /^https?:/.test(tab.url)) {
    capturedLink = tab.url;
    const el = document.getElementById('captured-link');
    document.getElementById('captured-link-text').textContent = `Will link to: ${tab.title || tab.url}`;
    el.hidden = false;

    const detected = detectSourceFromUrl(tab.url);
    if (detected) sourceSelect.value = detected;
  }

  document.getElementById('quick-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = document.getElementById('checkpoint-note').value.trim();

    let project;
    if (picker.value === '__new__') {
      const name = nameInput.value.trim();
      if (!name || name.length < 1) {
        alert('Project name cannot be empty');
        return;
      }
      if (name.length > 100) {
        alert('Project name too long (max 100 chars)');
        return;
      }
      const source = sourceSelect.value;
      const existing = existingProjects.find((p) => p.name.toLowerCase() === name.toLowerCase());
      project = existing || (await addProject({ name, source }));
    } else {
      project = existingProjects.find((p) => p.id === picker.value);
      if (!project) {
        alert('Project not found');
        return;
      }
    }

    if (note.length > 500) {
      alert('Note too long (max 500 chars)');
      return;
    }

    if (note || capturedLink) {
      await addCheckpoint(project.id, { note: note || '(no note added)', link: capturedLink });
    }

    const msg = document.getElementById('confirm-msg');
    msg.hidden = false;
    msg.textContent = project.checkpoints ? `Logged to "${project.name}".` : 'Logged.';
    document.getElementById('quick-form').reset();
    setTimeout(() => window.close(), 900);
  });

  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

  document.getElementById('open-settings').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  });
});