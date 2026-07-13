(function () {
  const container = document.getElementById('admin-chat');
  if (!container) return;
  if (typeof quikchat !== 'function') return;

  let initialHistory = [];
  try {
    initialHistory = JSON.parse(document.getElementById('initialHistory').textContent) || [];
  } catch (e) {}

  let activeSessionId = null;
  try {
    activeSessionId = JSON.parse(document.getElementById('activeSessionId').textContent);
  } catch (e) {}

  const chat = new quikchat('#admin-chat', async function (chatInstance, msg) {
    // if no session, create one first
    if (!activeSessionId) {
      const r = await fetch('/admin/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await r.json();
      activeSessionId = data.sessionId;
      // update URL without reload
      window.history.pushState({}, '', `/admin/chat?session=${activeSessionId}`);
    }

    chatInstance.messageAddNew(msg, 'me', 'right', 'user');

    chatInstance.inputAreaSetEnabled(false);
    chatInstance.inputAreaSetButtonText('Thinking...');

    let steps = [];

    try {
      const res = await fetch('/admin/chat/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId: activeSessionId })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const thinkingId = chatInstance.messageAddNew('⏳ Thinking...', 'bot', 'left', 'bot');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === 'plan') {
            steps.push(data.plan);
            chatInstance.messageReplaceContent(thinkingId, steps.join('\n\n') + '\n\n⏳ Working...');
          }

          if (data.type === 'tool_call') {
            if (data.tool !== 'write_todos') {
              steps.push(`🔧 Calling tool: **${data.tool}**`);
              chatInstance.messageReplaceContent(thinkingId, steps.join('\n\n') + '\n\n⏳ Working...');
            }
          }

          if (data.type === 'tool_result') {
            steps.push(`✅ Got result from: **${data.tool}**`);
            chatInstance.messageReplaceContent(thinkingId, steps.join('\n\n') + '\n\n⏳ Generating response...');
          }

          if (data.type === 'done') {
            const replyText = data.reply || '(no reply)';
            chatInstance.messageReplaceContent(thinkingId, replyText);

            if (data.chart) {
              const messages = document.querySelectorAll('.quikchat-message');
              const lastMessage = messages[messages.length - 1];
              if (lastMessage) renderApexChart(lastMessage, data.chart);
            }
          }
        }
      }
      // at the end of the try block, after the while loop
      chatInstance.inputAreaSetEnabled(true);
      chatInstance.inputAreaSetButtonText('Send');
    } catch (err) {
      console.error('Error calling /admin/chat/api', err);
      chatInstance.messageAddNew('Error contacting server.', 'bot', 'left', 'bot');
      chatInstance.inputAreaSetEnabled(true);
      chatInstance.inputAreaSetButtonText('Send');
    }
  }); 

  // seed history
  if (Array.isArray(initialHistory) && initialHistory.length) {
    initialHistory.forEach(function (item) {
      if (!item.text) return;
      chat.messageAddNew(item.text, item.role, item.side, item.role);
      if (item.chart) {
        const messages = document.querySelectorAll('.quikchat-message');
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
          renderApexChart(lastMessage, item.chart);
        }
      }
    });
  }

  function renderApexChart(targetElement, chartOptions) {
    if (!window.ApexCharts) {
      console.warn('ApexCharts not loaded');
      return;
    }
    const chartDiv = document.createElement('div');
    chartDiv.style.width = '100%';
    chartDiv.style.height = ((chartOptions.chart && chartOptions.chart.height) || 260) + 'px';
    targetElement.appendChild(chartDiv);
    try {
      new window.ApexCharts(chartDiv, chartOptions).render();
    } catch (e) {
      console.error('Error rendering chart', e);
    }
  }

  document.getElementById('newChatBtn').addEventListener('click', async () => {
    const r = await fetch('/admin/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await r.json();
    window.location.href = `/admin/chat?session=${data.sessionId}`;
  });

  // delete session buttons
  document.querySelectorAll('.delete-session-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const sessionId = btn.dataset.sessionId;
      await fetch(`/admin/chat/sessions/${sessionId}/delete`, { method: 'POST' });
      // if deleting active session, go to base chat page
      if (parseInt(sessionId) === activeSessionId) {
        window.location.href = '/admin/chat';
      } else {
        window.location.reload();
      }
    });
  });
})();