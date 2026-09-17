const params = new URLSearchParams(window.location.search);
const projectId = params.get('id');
let currentProject = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!projectId) {
    document.body.innerHTML = '<p style="padding:40px;font-family:sans-serif;color:#ede6d6">No project id in URL. <a href="dashboard.html" style="color:#4fb7b3">Back to dashboard</a></p>';
    return;
  }

  await load();

  document.getElementById('rename-btn').addEventListener('click', startRename);
  document.getElementById('archive-btn').addEventListener('click', toggleArchive);
  document.getElementById('delete-btn').addEventListener('click', openDeleteDialog);
  document.getElementById('add-checkpoint-btn').addEventListener('click', addNewCheckpoint);
  document.getElementById('generate-summary-btn').addEventListener('click', handleGenerateSummary);

  const dialog = document.getElementById('delete-dialog');
  document.getElementById('delete-cancel').addEventListener('click', () => {
    console.log('[archpro] delete cancelled');
    dialog.close();
  });
  document.getElementById('delete-confirm').addEventListener('click', confirmDelete);
});

async function load() {
  currentProject = await getProject(projectId);
  console.log('[archpro] loaded project', currentProject);
  if (!currentProject) {
    document.body.innerHTML = '<p style="padding:40px;font-family:sans-serif;color:#ede6d6">Project not found — it may have been deleted. <a href="dashboard.html" style="color:#4fb7b3">Back to dashboard</a></p>';
    return;
  }
  renderHeader();
  renderTimeline();
  renderSummary();
}

function renderSummary() {
  const body = document.getElementById('summary-body');
  const summary = currentProject.summary;
  if (!summary || !summary.text) {
    body.className = 'summary-body empty';
    body.textContent = 'No summary yet — generate one from the checkpoint log.';
    return;
  }
  body.className = 'summary-body';
  body.textContent = summary.text;
  if (summary.stale) {
    const note = document.createElement('div');
    note.className = 'summary-stale-note';
    note.textContent = `⟡ New checkpoints added since this was generated (${timeAgo(summary.generatedAt)}) — regenerate for an up-to-date summary.`;
    body.appendChild(note);
  }
}

async function handleGenerateSummary() {
  const body = document.getElementById('summary-body');
  const btn = document.getElementById('generate-summary-btn');
  btn.disabled = true;
  btn.textContent = 'Generating...';
  body.className = 'summary-body loading';
  body.textContent = 'Reading the checkpoint log...';

  try {
    console.log('[archpro] requesting summary for', currentProject.id);
    const text = await generateProjectSummary(currentProject);
    currentProject = await updateProject(currentProject.id, {
      summary: { text, generatedAt: Date.now(), stale: false }
    });
    renderSummary();
  } catch (err) {
    console.error('[archpro] summary generation error', err);
    body.className = 'summary-body empty';
    if (err.message === 'NO_API_KEY') {
      body.innerHTML = 'No API key set. Add one in <a href="settings.html" style="color:var(--teal)">Settings</a> to generate summaries.';
    } else {
      body.textContent = 'Could not generate a summary right now. Check the console for details, or try again.';
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate';
  }
}

function renderHeader() {
  document.getElementById('project-name').textContent = currentProject.name;
  document.getElementById('source-tab').textContent = sourceLabel(currentProject.source);
  document.getElementById('archive-btn').textContent = currentProject.status === 'archived' ? 'Unarchive' : 'Archive';
  document.title = `${currentProject.name} — Archpro`;
}

function renderTimeline() {
  const timeline = document.getElementById('timeline');
  const empty = document.getElementById('timeline-empty');
  timeline.innerHTML = '';

  const checkpoints = [...currentProject.checkpoints].sort((a, b) => b.ts - a.ts);
  if (checkpoints.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  checkpoints.forEach((cp) => {
    if (!cp.note || cp.note.trim().length === 0) return;

    const entry = document.createElement('div');
    entry.className = 'entry';

    const date = document.createElement('div');
    date.className = 'entry-date';
    date.textContent = `${formatDate(cp.ts)} · ${timeAgo(cp.ts)}`;
    entry.appendChild(date);

    const note = document.createElement('div');
    note.className = 'entry-note';
    note.textContent = cp.note;
    entry.appendChild(note);

    const actions = document.createElement('div');
    actions.className = 'entry-actions';
    if (cp.link && cp.link.trim().length > 0) {
      const link = document.createElement('a');
      link.className = 'entry-link';
      link.href = cp.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open chat →';
      actions.appendChild(link);
    }
    const editLink = document.createElement('button');
    editLink.className = 'entry-edit-link';
    editLink.textContent = cp.link ? 'Edit link' : 'Add link';
    editLink.addEventListener('click', () => {
      const val = prompt('Chat link for this checkpoint:', cp.link || '');
      if (val === null) return;
      if (val.trim().length > 0 && !val.startsWith('http')) {
        alert('Link must be a valid URL starting with http:// or https://');
        return;
      }
      console.log('[archpro] updating link for checkpoint', cp.id);
      updateCheckpointLink(currentProject.id, cp.id, val).then((updated) => {
        currentProject = updated;
        renderTimeline();
      });
    });
    actions.appendChild(editLink);

    const del = document.createElement('button');
    del.className = 'entry-delete';
    del.textContent = 'Remove';
    del.addEventListener('click', async () => {
      console.log('[archpro] deleting checkpoint', cp.id);
      currentProject = await deleteCheckpoint(currentProject.id, cp.id);
      renderTimeline();
    });
    actions.appendChild(del);

    entry.appendChild(actions);
    timeline.appendChild(entry);
  });
}

async function addNewCheckpoint() {
  const noteEl = document.getElementById('new-note');
  const linkEl = document.getElementById('new-link');
  const note = noteEl.value.trim();
  
  if (!note || note.length === 0) {
    alert('Checkpoint note cannot be empty');
    noteEl.focus();
    return;
  }
  
  if (note.length > 500) {
    alert('Note too long (max 500 chars)');
    return;
  }
  
  const link = linkEl.value.trim();
  if (link.length > 0 && !link.startsWith('http')) {
    alert('Link must be a valid URL starting with http:// or https://');
    linkEl.focus();
    return;
  }
  
  console.log('[archpro] adding checkpoint');
  await addCheckpoint(currentProject.id, { note, link });
  noteEl.value = '';
  linkEl.value = '';
  currentProject = await getProject(currentProject.id);
  renderTimeline();
}

function startRename() {
  const nameEl = document.getElementById('project-name');
  nameEl.contentEditable = 'true';
  nameEl.focus();
  document.execCommand('selectAll', false, null);

  const commit = async () => {
    nameEl.contentEditable = 'false';
    const newName = nameEl.textContent.trim();
    if (!newName || newName.length === 0) {
      alert('Project name cannot be empty');
      nameEl.textContent = currentProject.name;
      nameEl.removeEventListener('blur', commit);
      nameEl.removeEventListener('keydown', onKey);
      return;
    }
    if (newName.length > 100) {
      alert('Project name too long (max 100 chars)');
      nameEl.textContent = currentProject.name;
      nameEl.removeEventListener('blur', commit);
      nameEl.removeEventListener('keydown', onKey);
      return;
    }
    if (newName !== currentProject.name) {
      console.log('[archpro] renaming', currentProject.name, '->', newName);
      currentProject = await updateProject(currentProject.id, { name: newName });
    } else {
      nameEl.textContent = currentProject.name;
    }
    nameEl.removeEventListener('blur', commit);
    nameEl.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
    if (e.key === 'Escape') { nameEl.textContent = currentProject.name; nameEl.blur(); }
  };
  nameEl.addEventListener('blur', commit);
  nameEl.addEventListener('keydown', onKey);
}

async function toggleArchive() {
  const nextStatus = currentProject.status === 'archived' ? 'active' : 'archived';
  console.log('[archpro] setting status ->', nextStatus);
  currentProject = await updateProject(currentProject.id, { status: nextStatus });
  renderHeader();
}

function openDeleteDialog() {
  document.getElementById('delete-target-name').textContent = currentProject.name;
  const dialog = document.getElementById('delete-dialog');
  console.log('[archpro] opening delete dialog for', currentProject.id);
  dialog.showModal();
}

async function confirmDelete() {
  console.log('[archpro] confirming delete of', currentProject.id);
  await deleteProject(currentProject.id);
  console.log('[archpro] delete complete, redirecting');
  window.location.href = 'dashboard.html';
}
