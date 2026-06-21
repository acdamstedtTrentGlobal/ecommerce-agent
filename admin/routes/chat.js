const express = require('express');
const router = express.Router();

function ensureAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.redirect('/admin/login');
}

// In-memory messages for demo; replace with DB if you want persistence
const history = [
  { text: 'Hello! How can I help?', time: new Date(), userName: 'Assistant', userAbbr: 'A' }
];

router.get('/', ensureAdmin, (req, res) => {
  res.render('chat', { admin: req.session.admin, history });
});

// Simple demo API that echoes back
router.post('/api', ensureAdmin, express.json(), async (req, res) => {
  const { message } = req.body || {};
  const text = (message || '').toString().trim();
  if (!text) return res.json({ reply: 'Please type something.' });
  const reply = `You said: ${text}`;
  history.push({ text, time: new Date(), userName: req.session.admin.name || 'You', userAbbr: 'Y' });
  history.push({ text: reply, time: new Date(), userName: 'Assistant', userAbbr: 'A' });
  // Simple demo ApexCharts bar chart configuration
  const chart = {
    chart: { type: 'bar', height: 250 },
    series: [
      {
        name: 'Demo',
        data: [10, 20, 15, 30]
      }
    ],
    xaxis: {
      categories: ['Q1', 'Q2', 'Q3', 'Q4']
    }
  };

  res.json({ reply, chart });
});

module.exports = router;
