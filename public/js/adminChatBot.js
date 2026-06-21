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
    // Add user message to UI
    chatInstance.messageAddNew(msg, 'me', 'right', 'user');

    try {
      const res = await fetch('/admin/chat/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();

      const replyText = (data && data.reply) || '(no reply)';

      // Add bot text reply and capture its message ID
      const replyId = chatInstance.messageAddNew(
        replyText,
        'bot',
        'left',
        'bot'
      );

      // If the server returns a chart config, render it inside the same message bubble
      if (data && data.chart && replyId != null) {
        const msgNode = chatInstance.messageGetDOMObject(replyId);
        if (msgNode) {
          renderApexChart(msgNode, data.chart);
        }
      }
    } catch (err) {
      console.error('Error calling /admin/chat/api', err);
      chatInstance.messageAddNew('Error contacting server.', 'bot', 'left', 'bot');
    }
  });

  // Seed initial history into the widget
  if (Array.isArray(initialHistory) && initialHistory.length) {
    initialHistory.forEach(function (item) {
      const text = item.text || '';
      if (!text) return;
      const isUser = item.userAbbr === 'Y';
      chat.messageAddNew(
        text,
        isUser ? 'me' : 'bot',
        isUser ? 'right' : 'left',
        isUser ? 'user' : 'bot'
      );
    });
  }
})();
