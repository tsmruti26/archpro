let currentFilter = 'active';
let currentQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  const modalSource = document.getElementById('modal-source');
  SOURCES.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    modalSource.appendChild(opt);
  });

  await render();

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      render();
    });
  });

  document.getElementById('search').addEventListener('input', (e) => {
    currentQuery = e.target.value.trim().toLowerCase();
    render();
  });

  const modal = document.getElementById('new-modal');
  document.getElementById('new-project-btn').addEventListener('click', () => {
    document.getElementById('modal-name').value = '';
    modal.hidden = false;
    document.getElementById('modal-name').focus();
  });
  document.getElementById('modal-cancel').addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });

  document.getElementById('modal-create').addEventListener('click', async () => {
    const name = document.getElementById('modal-name').value.trim();
    if (!name || name.length < 1) {
      alert('Project name cannot be empty');
      return;
    }
    if (name.length > 100) {
      alert('Project name too long (max 100 chars)');
      return;
    }
    const source = modalSource.value;
    const project = await addProject({ name, source });
    modal.hidden = true;
    window.location.href = `project.html?id=${project.id}`;
  });
});

async function render() {
  const projects = await getProjects();
  const filtered = projects
    .filter((p) => {
      if (currentFilter === 'active') return p.status !== 'archived';
      if (currentFilter === 'archived') return p.status === 'archived';
      return true;
    })
    .filter((p) => !currentQuery || p.name.toLowerCase().includes(currentQuery));

  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty-state');
  grid.innerHTML = '';

  if (filtered.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  filtered
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((p) => grid.appendChild(renderCard(p)));
}

function renderCard(project) {
  const card = document.createElement('div');
  card.className = 'card';

  const tab = document.createElement('span');
  tab.className = 'card-tab';
  tab.textContent = sourceLabel(project.source);
  card.appendChild(tab);

  const link = document.createElement('a');
  link.className = 'card-name';
  link.href = `project.html?id=${project.id}`;
  link.textContent = project.name;
  card.appendChild(link);

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  meta.textContent = `Updated ${timeAgo(project.updatedAt)}`;
  card.appendChild(meta);

  const lastNote = document.createElement('div');
  const latest = project.checkpoints[0];
  if (latest && latest.note && latest.note.trim().length > 0) {
    lastNote.className = 'card-last-note';
    lastNote.textContent = latest.note;
  } else {
    lastNote.className = 'card-last-note none';
    lastNote.textContent = 'No checkpoints logged yet.';
  }
  card.appendChild(lastNote);

  const footer = document.createElement('div');
  footer.className = 'card-footer';
  footer.innerHTML = `<span class="checkpoint-count">${project.checkpoints.length} checkpoint${project.checkpoints.length === 1 ? '' : 's'}</span><span>${project.status === 'archived' ? 'Archived' : 'Active'}</span>`;
  card.appendChild(footer);

  return card;
}