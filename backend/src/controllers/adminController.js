const { query } = require('../database/db');

const getStats = async (req, res) => {
  try {
    const [
      usersRes, activeRes, skillsOfferedRes, skillsWantedRes,
      completedSessionsRes, pendingRequestsRes, reportsRes
    ] = await Promise.all([
      query(`SELECT COUNT(*) FROM users WHERE role = 'student'`),
      query(`SELECT COUNT(*) FROM users WHERE role = 'student' AND last_active_at > NOW() - INTERVAL '7 days'`),
      query(`SELECT COUNT(*) FROM user_skills`),
      query(`SELECT COUNT(*) FROM user_learning_goals`),
      query(`SELECT COUNT(*) FROM sessions WHERE status = 'completed'`),
      query(`SELECT COUNT(*) FROM learning_requests WHERE status = 'pending'`),
      query(`SELECT COUNT(*) FROM reports WHERE status = 'pending'`),
    ]);

    res.json({
      stats: {
        total_users: parseInt(usersRes.rows[0].count),
        active_users_7d: parseInt(activeRes.rows[0].count),
        skills_offered: parseInt(skillsOfferedRes.rows[0].count),
        skills_wanted: parseInt(skillsWantedRes.rows[0].count),
        completed_sessions: parseInt(completedSessionsRes.rows[0].count),
        pending_requests: parseInt(pendingRequestsRes.rows[0].count),
        pending_reports: parseInt(reportsRes.rows[0].count),
      }
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
};

const getAdminUsers = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, name, role, is_active, is_suspended, completed_sessions,
              average_rating, no_show_count, created_at, last_active_at
       FROM users ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('getAdminUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

const toggleUserSuspension = async (req, res) => {
  const { id } = req.params;
  const { is_suspended, reason } = req.body;

  try {
    const result = await query(
      `UPDATE users SET is_suspended = $1, updated_at = NOW()
       WHERE id = $2 AND role != 'admin'
       RETURNING id, name, is_suspended`,
      [is_suspended, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const action = is_suspended ? 'suspended' : 'unsuspended';
    res.json({ message: `User ${action} successfully.`, user: result.rows[0] });
  } catch (err) {
    console.error('toggleUserSuspension error:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
};

const getAdminSkills = async (req, res) => {
  try {
    const result = await query(
      `SELECT s.id, s.name, sc.name as category_name, s.is_custom,
              COUNT(us.id) as teach_count, COUNT(ulg.id) as learn_count
       FROM skills s
       LEFT JOIN skill_categories sc ON sc.id = s.category_id
       LEFT JOIN user_skills us ON us.skill_id = s.id
       LEFT JOIN user_learning_goals ulg ON ulg.skill_id = s.id
       GROUP BY s.id, sc.name ORDER BY s.name`
    );
    res.json({ skills: result.rows });
  } catch (err) {
    console.error('getAdminSkills error:', err);
    res.status(500).json({ error: 'Failed to fetch skills.' });
  }
};

const createCategory = async (req, res) => {
  const { name, description, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required.' });
  try {
    const result = await query(
      `INSERT INTO skill_categories (name, description, icon) VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING RETURNING id, name, icon, description`,
      [name.trim(), description || null, icon || null]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Category already exists.' });
    }
    res.status(201).json({ category: result.rows[0], message: 'Category created.' });
  } catch (err) {
    console.error('createCategory error:', err);
    res.status(500).json({ error: 'Failed to create category.' });
  }
};

module.exports = { getStats, getAdminUsers, toggleUserSuspension, getAdminSkills, createCategory };
