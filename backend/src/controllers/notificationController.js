const { query } = require('../database/db');

const getNotifications = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, type, title, message, is_read, related_id, related_type, created_at
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unreadCount = result.rows.filter(n => !n.is_read).length;
    res.json({ notifications: result.rows, unread_count: unreadCount });
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
};

const markAllRead = async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
};

module.exports = { getNotifications, markAllRead };
