// storage.js – single source of truth for project/checkpoint data
const BUILD_VERSION = '2.2.0';
console.log('[ai-project-log] build', BUILD_VERSION, 'loaded:', location.pathname);

const SOURCES = [
  { id: 'claude', label: 'Claude' },
  { id: 'gpt', label: 'ChatGPT' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'other', label: 'Other' }
];

const DOMAIN_MAP = [
  { match: (h) => h.includes('claude.ai'), source: 'claude' },
  { match: (h) => h.includes('chatgpt.com') || h.includes('chat.openai.com'), source: 'gpt' },
  { match: (h) => h.includes('gemini.google.com'), source: 'gemini' }
];

const API_BASE = "http://localhost:8080/api";
const HEALTH_TIMEOUT_MS = 1500;
const LOCAL_STORAGE_KEY = 'projects';

async function isServerAvailable() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    const res = await fetch(API_BASE + '/health', {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch (err) {
    return false;
  }
}

function detectSourceFromUrl(url) {
  try {
    const h = new URL(url).hostname;
    const hit = DOMAIN_MAP.find((d) => d.match(h));
    return hit ? hit.source : null;
  } catch {
    return null;
  }
}

function getActiveTab() {
  return new Promise((resolve) => {
    if (!chrome.tabs) return resolve(null);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0] ? tabs[0] : null);
    });
  });
}

function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['anthropicApiKey'], (res) => resolve(res.anthropicApiKey || ''));
  });
}

function setApiKey(key) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ anthropicApiKey: key.trim() }, resolve);
  });
}

async function generateProjectSummary(project) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }
  const notes = project.checkpoints
    .slice()
    .sort((a, b) => a.ts - b.ts)
    .map((c) => '- ' + formatDate(c.ts) + ': ' + c.note)
    .join('\n') || '(no checkpoints logged yet)';

  const prompt = 'Project name: ' + project.name + '\nWhere it\'s built: ' + sourceLabel(project.source) + '\n\nCheckpoint log (oldest to newest):\n' + notes + '\n\nBased only on the log above, write:\n1. A one-sentence description of what this project is.\n2. A comma-separated list of the technologies/tools/languages mentioned or clearly implied (omit if genuinely none are evident).\nRespond in plain text, two short lines, no headers or markdown.';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('[ai-project-log] summary generation failed', res.status, errBody);
    throw new Error('API_ERROR_' + res.status);
  }
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  return text;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function sourceLabel(id) {
  return (SOURCES.find((s) => s.id === id) || SOURCES[3]).label;
}

function timeAgo(ts) {
  if (!ts || typeof ts !== 'number') return 'unknown';
  const diff = Date.now() - ts;
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + 'd ago';
  const months = Math.floor(days / 30);
  if (months < 12) return months + 'mo ago';
  const years = Math.floor(months / 12);
  return years + 'y ago';
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function normalizeProject(p) {
  return {
    ...p,
    createdAt: typeof p.createdAt === 'string' ? new Date(p.createdAt).getTime() : p.createdAt,
    updatedAt: typeof p.updatedAt === 'string' ? new Date(p.updatedAt).getTime() : p.updatedAt,
    checkpoints: (p.checkpoints || []).map(c => ({
      ...c,
      ts: typeof c.ts === 'string' ? new Date(c.ts).getTime() : c.ts
    }))
  };
}

function localGetProjects() {
  return new Promise((resolve) => {
    chrome.storage.local.get([LOCAL_STORAGE_KEY], (result) => {
      resolve(result[LOCAL_STORAGE_KEY] || []);
    });
  });
}

function localSetProjects(projects) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [LOCAL_STORAGE_KEY]: projects }, () => resolve(projects));
  });
}

async function getProjects() {
  const serverUp = await isServerAvailable();

  if (serverUp) {
    try {
      const res = await fetch(API_BASE + '/projects');
      if (!res.ok) throw new Error('Server responded ' + res.status);
      const data = await res.json();
      console.log('[ai-project-log] fetched projects from server');
      const normalized = data.map(normalizeProject);
      await localSetProjects(normalized);
      return normalized;
    } catch (err) {
      console.warn('[ai-project-log] server fetch failed, falling back to local:', err);
      return await localGetProjects();
    }
  }

  console.log('[ai-project-log] server unavailable, using local storage');
  return await localGetProjects();
}

async function saveProjects(projects) {
  return await localSetProjects(projects);
}

async function addProject({ name, source }) {
  const serverUp = await isServerAvailable();
  const now = Date.now();
  const project = {
    id: uid(),
    name: name.trim(),
    source: source || 'other',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    checkpoints: []
  };

  const projects = await localGetProjects();
  projects.unshift(project);
  await localSetProjects(projects);

  if (serverUp) {
    try {
      const res = await fetch(API_BASE + '/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: project.name,
          source: project.source.toUpperCase()
        })
      });
      if (!res.ok) throw new Error('Server responded ' + res.status);
      const serverProject = normalizeProject(await res.json());
      console.log('[ai-project-log] created project on server:', serverProject.id);
      
      const updated = await localGetProjects();
      updated[0] = serverProject;
      await localSetProjects(updated);
      return serverProject;
    } catch (err) {
      console.warn('[ai-project-log] server create failed, using local:', err);
    }
  }

  return project;
}

async function getProject(id) {
  const projects = await getProjects();
  return projects.find((p) => p.id === id) || null;
}

async function updateProject(id, patch) {
  const projects = await getProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  const updated = Object.assign({}, projects[idx], patch, { updatedAt: Date.now() });
  projects[idx] = updated;
  await localSetProjects(projects);

  const serverUp = await isServerAvailable();
  if (serverUp) {
    try {
      const res = await fetch(API_BASE + '/projects/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (!res.ok) throw new Error('Server responded ' + res.status);
      console.log('[ai-project-log] updated project on server:', id);
    } catch (err) {
      console.warn('[ai-project-log] server update failed, but local saved:', err);
    }
  }

  return updated;
}

async function deleteProject(id) {
  const projects = await getProjects();
  const next = projects.filter((p) => p.id !== id);
  await localSetProjects(next);

  const serverUp = await isServerAvailable();
  if (serverUp) {
    try {
      const res = await fetch(API_BASE + '/projects/' + id, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Server responded ' + res.status);
      console.log('[ai-project-log] deleted project on server:', id);
    } catch (err) {
      console.warn('[ai-project-log] server delete failed, but local deleted:', err);
    }
  }

  return next;
}

async function addCheckpoint(projectId, { note, link }) {
  const projects = await getProjects();
  const idx = projects.findIndex((p) => p.id === projectId);
  if (idx === -1) return null;

  const checkpoint = { id: uid(), ts: Date.now(), note: note.trim(), link: (link || '').trim() };
  projects[idx].checkpoints.unshift(checkpoint);
  projects[idx].updatedAt = Date.now();
  
  if (projects[idx].summary) projects[idx].summary.stale = true;
  await localSetProjects(projects);

  const serverUp = await isServerAvailable();
  if (serverUp) {
    try {
      const res = await fetch(API_BASE + '/projects/' + projectId + '/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: checkpoint.note,
          link: checkpoint.link
        })
      });
      if (!res.ok) throw new Error('Server responded ' + res.status);
      console.log('[ai-project-log] added checkpoint on server for project:', projectId);
    } catch (err) {
      console.warn('[ai-project-log] server checkpoint create failed, but local saved:', err);
    }
  }

  return checkpoint;
}

async function deleteCheckpoint(projectId, checkpointId) {
  const projects = await getProjects();
  const idx = projects.findIndex((p) => p.id === projectId);
  if (idx === -1) return null;

  projects[idx].checkpoints = projects[idx].checkpoints.filter((c) => c.id !== checkpointId);
  projects[idx].updatedAt = Date.now();
  await localSetProjects(projects);

  const serverUp = await isServerAvailable();
  if (serverUp) {
    try {
      const res = await fetch(API_BASE + '/projects/' + projectId + '/checkpoints/' + checkpointId, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Server responded ' + res.status);
      console.log('[ai-project-log] deleted checkpoint on server:', checkpointId);
    } catch (err) {
      console.warn('[ai-project-log] server checkpoint delete failed, but local deleted:', err);
    }
  }

  return projects[idx];
}

async function updateCheckpointLink(projectId, checkpointId, link) {
  const projects = await getProjects();
  const idx = projects.findIndex((p) => p.id === projectId);
  if (idx === -1) return null;
  const cp = projects[idx].checkpoints.find((c) => c.id === checkpointId);
  if (!cp) return null;

  cp.link = (link || '').trim();
  await localSetProjects(projects);

  const serverUp = await isServerAvailable();
  if (serverUp) {
    try {
      const res = await fetch(API_BASE + '/projects/' + projectId + '/checkpoints/' + checkpointId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: cp.link })
      });
      if (!res.ok) throw new Error('Server responded ' + res.status);
      console.log('[ai-project-log] updated checkpoint link on server:', checkpointId);
    } catch (err) {
      console.warn('[ai-project-log] server checkpoint link update failed, but local saved:', err);
    }
  }

  return projects[idx];
}