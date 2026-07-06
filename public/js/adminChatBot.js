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

    let replyText = '(no reply)';
    try {
      const res = await fetch('/admin/chat/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId: activeSessionId })
      });
      const data = await res.json();
      replyText = (data && data.reply) || '(no reply)';
    } catch (err) {
      console.error('Error calling /admin/chat/api', err);
      replyText = 'Error contacting server.';
    }
    chatInstance.messageAddNew(replyText, 'bot', 'left', 'bot');
  });

  // seed history
  if (Array.isArray(initialHistory) && initialHistory.length) {
    initialHistory.forEach(function (item) {
      if (!item.text) return;
      chat.messageAddNew(item.text, item.role, item.side, item.role);
    });
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