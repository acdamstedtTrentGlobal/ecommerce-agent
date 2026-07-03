(function () {
  const container = document.getElementById('admin-chat');
  if (!container) {
    console.error('admin-chat container not found');
    return;
  }
  if (typeof quikchat !== 'function') {
    console.error('quikchat library not loaded');
    return;
  }

  let initialHistory = [];
  const historyScript = document.getElementById('initialHistory');
  if (historyScript && historyScript.textContent) {
    try {
      initialHistory = JSON.parse(historyScript.textContent) || [];
    } catch (e) {
      console.error('Failed to parse initial history JSON', e);
    }
  }

  function renderApexChart(targetElement, chartOptions) {
    if (!window.ApexCharts) {
      console.warn('ApexCharts not loaded; cannot render chart.');
      return;
    }

    const chartDiv = document.createElement('div');
    chartDiv.className = 'chat-apexchart';
    chartDiv.style.width = '100%';
    const height = (chartOptions && chartOptions.chart && chartOptions.chart.height) || 260;
    chartDiv.style.height = height + 'px';
    targetElement.appendChild(chartDiv);

    try {
      const chart = new window.ApexCharts(chartDiv, chartOptions);
      chart.render();
    } catch (e) {
      console.error('Error rendering ApexChart', e);
      chartDiv.textContent = 'Failed to render chart.';
    }
  }

  // Create the chat widget using quikchat
  const chat = new quikchat('#admin-chat', async function (chatInstance, msg) {
    chatInstance.messageAddNew(msg, 'me', 'right', 'user');

    let replyText = '(no reply)';
    try {
      const res = await fetch('/admin/chat/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      replyText = (data && data.reply) || '(no reply)';
    } catch (err) {
      console.error('Error calling /admin/chat/api', err);
      replyText = 'Error contacting server.';
    }
    chatInstance.messageAddNew(replyText, 'bot', 'left', 'bot');
  });

  // Seed initial history into the widget
  if (Array.isArray(initialHistory) && initialHistory.length) {
    initialHistory.forEach(function (item) {
      const text = item.text || '';
      if (!text) return;
      chat.messageAddNew(item.text, item.role, item.side, item.role);
    });
  }

  document.getElementById('clearHistoryBtn').addEventListener('click', async () => {
    await fetch('/admin/chat/clear', { method: 'POST' });
    window.location.reload();
  });
})();
