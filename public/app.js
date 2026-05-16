(() => {
  const $ = id => document.getElementById(id);

  const systemEl      = $('system-prompt');
  const userEl        = $('user-prompt');
  const sysCount      = $('sys-count');
  const userCount     = $('user-count');
  const submitBtn     = $('submit-btn');
  const clearBtn      = $('clear-btn');
  const spinner       = $('spinner');
  const btnIcon       = $('btn-icon');
  const btnText       = $('btn-text');
  const errorPanel    = $('error-panel');
  const errorMsg      = $('error-msg');
  const responsePanel   = $('response-panel');
  const responseContent = $('response-content');
  const elapsedBadge    = $('elapsed-badge');
  const copyBtn         = $('copy-btn');
  const copyLabel       = $('copy-label');
  const toolCallsPanel  = $('tool-calls-panel');
  const toolCallsList   = $('tool-calls-list');
  const toolCallsLabel  = $('tool-calls-label');
  const statusBadge   = $('status-badge');
  const statusText    = $('status-text');

  // ── Status check ─────────────────────────────────────────────────
  async function checkStatus() {
    try {
      const res = await fetch('/api', { signal: AbortSignal.timeout(5000) });
      const online = res.ok;
      statusBadge.classList.toggle('online', online);
      statusBadge.classList.toggle('offline', !online);
      statusText.textContent = online ? 'Connected' : 'Unreachable';
    } catch {
      statusBadge.classList.add('offline');
      statusBadge.classList.remove('online');
      statusText.textContent = 'Offline';
    }
  }

  checkStatus();
  setInterval(checkStatus, 30_000);

  // ── Character counters ────────────────────────────────────────────
  function updateCount(el, countEl) {
    const n = el.value.length;
    countEl.textContent = n === 0 ? '0 chars' : `${n.toLocaleString()} chars`;
  }

  systemEl.addEventListener('input', () => updateCount(systemEl, sysCount));
  userEl.addEventListener('input',   () => updateCount(userEl, userCount));

  // ── Submit ────────────────────────────────────────────────────────
  let timer     = null;
  let startTime = 0;

  submitBtn.addEventListener('click', async () => {
    const system = systemEl.value.trim();
    const user   = userEl.value.trim();

    if (!system && !user) {
      showError('Enter at least a system prompt or a user prompt before generating.');
      return;
    }

    const maxIterations = parseInt($('max-iterations').value, 10) || 20;
    const toolModel     = $('model-tool').value.trim();
    const synthModel    = $('model-synthesis').value.trim();
    const summModel     = $('model-summary').value.trim();

    const selectedTools = [...document.querySelectorAll('input[name="tools"]:checked')].map(el => el.value);

    const body = {
      ...(system && { system }),
      ...(user   && { user }),
      maxIterations,
      ...(selectedTools.length > 0 && { tools: selectedTools }),
    };

    const modelConfig = {
      ...(toolModel  && { toolCalling:   toolModel }),
      ...(synthModel && { synthesis:     synthModel }),
      ...(summModel  && { summarization: summModel }),
    };

    if (Object.keys(modelConfig).length) body.modelConfig = modelConfig;

    setLoading(true);
    hideError();
    hideResponse();

    try {
      const res  = await fetch('/api/llm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.result?.error || data.error || data.message || `Server error ${res.status}`;
        showResponse('', data.result?.toolCalls ?? []);
        showError(msg);
      } else {
        showResponse(data.result?.answer ?? '', data.result?.toolCalls ?? []);
      }
    } catch (err) {
      showError(err.message || 'Something went wrong. Is the server running?');
    } finally {
      setLoading(false);
    }
  });

  // ── Clear ─────────────────────────────────────────────────────────
  clearBtn.addEventListener('click', () => {
    systemEl.value = '';
    userEl.value   = '';
    updateCount(systemEl, sysCount);
    updateCount(userEl, userCount);
    hideError();
    hideResponse();
  });

  // ── Copy ──────────────────────────────────────────────────────────
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(responseContent.innerText.trim()).then(() => {
      copyBtn.classList.add('success');
      copyLabel.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.classList.remove('success');
        copyLabel.textContent = 'Copy';
      }, 2200);
    });
  });

  // ── Helpers ───────────────────────────────────────────────────────
  function setLoading(on) {
    if (on) {
      submitBtn.disabled    = true;
      spinner.classList.add('active');
      btnIcon.style.display = 'none';
      btnText.textContent   = '0.0s';
      startTime = Date.now();
      timer = setInterval(() => {
        btnText.textContent = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
      }, 100);
    } else {
      clearInterval(timer);
      submitBtn.disabled    = false;
      spinner.classList.remove('active');
      btnIcon.style.display = '';
      btnText.textContent   = 'Generate Response';
    }
  }

  function showResponse(text, toolCalls = []) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    elapsedBadge.textContent  = `${elapsed}s`;
    responseContent.innerHTML = marked.parse(text || '', { breaks: true });

    toolCallsList.innerHTML = '';
    if (toolCalls.length > 0) {
      toolCallsLabel.textContent = `Tool Calls (${toolCalls.length})`;
      toolCalls.forEach(({ name, arguments: args }) => {
        const li = document.createElement('li');
        li.className = 'tool-call-item';
        li.innerHTML = `<span class="tool-call-name">${name}</span><pre class="tool-call-args">${JSON.stringify(args, null, 2)}</pre>`;
        toolCallsList.appendChild(li);
      });
      toolCallsPanel.hidden = false;
    } else {
      toolCallsPanel.hidden = true;
    }

    responsePanel.classList.add('visible');
    setTimeout(() => responsePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }

  function hideResponse() {
    responsePanel.classList.remove('visible');
    responseContent.innerHTML = '';
    toolCallsList.innerHTML   = '';
    toolCallsPanel.hidden     = true;
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorPanel.classList.add('visible');
  }

  function hideError() {
    errorPanel.classList.remove('visible');
  }
})();
