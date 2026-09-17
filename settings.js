document.addEventListener('DOMContentLoaded', async () => {
  const input = document.getElementById('api-key-input');
  const existing = await getApiKey();
  if (existing) input.placeholder = '•'.repeat(20) + ' (key saved — enter a new one to replace)';

  const status = document.getElementById('save-status');
  document.getElementById('save-key').addEventListener('click', async () => {
    const val = input.value.trim();
    if (!val) {
      status.textContent = 'API key cannot be empty';
      status.style.color = '#ff6b6b';
      setTimeout(() => { status.textContent = ''; }, 3000);
      return;
    }
    if (val.length < 20) {
      status.textContent = 'API key too short';
      status.style.color = '#ff6b6b';
      setTimeout(() => { status.textContent = ''; }, 3000);
      return;
    }
    if (!val.startsWith('sk-')) {
      status.textContent = 'Invalid key format (should start with sk-)';
      status.style.color = '#ff6b6b';
      setTimeout(() => { status.textContent = ''; }, 3000);
      return;
    }
    await setApiKey(val);
    input.value = '';
    input.placeholder = '•'.repeat(20) + ' (key saved — enter a new one to replace)';
    status.textContent = 'Saved successfully.';
    status.style.color = '#51cf66';
    setTimeout(() => { status.textContent = ''; status.style.color = ''; }, 2000);
  });

  document.getElementById('clear-key').addEventListener('click', async () => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    await setApiKey('');
    input.placeholder = 'sk-ant-...';
    status.textContent = 'API key cleared.';
    status.style.color = '#ffd43b';
    setTimeout(() => { status.textContent = ''; status.style.color = ''; }, 2000);
  });
});