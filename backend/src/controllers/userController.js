const { validationResult } = require('express-validator');
const { query } = require('../database/db');

const getUsers = async (req, res) => {
  try {
    const { search, category, skill, interaction } = req.query;
    let baseQuery = `
      SELECT DISTINCT u.id, u.name, u.email, u.avatar_url, u.bio, u.university,
             u.year_of_study, u.major, u.preferred_interaction, u.completed_sessions,
             u.no_show_count, u.average_rating, u.rating_count, u.last_active_at, u.created_at
      FROM users u
      LEFT JOIN user_skills us ON us.user_id = u.id
      LEFT JOIN skills s ON s.id = us.skill_id
      LEFT JOIN skill_categories sc ON sc.id = s.category_id
      WHERE u.role = 'student' AND u.is_active = true AND u.is_suspended = false
        AND u.id != $1
    `;
    const params = [req.user.id];
    let paramCount = 1;

    if (search) {
      paramCount++;
      baseQuery += ` AND (u.name ILIKE $${paramCount} OR u.bio ILIKE $${paramCount} OR s.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    if (category) {
      paramCount++;
      baseQuery += ` AND sc.name ILIKE $${paramCount}`;
      params.push(`%${category}%`);
    }
    if (skill) {
      paramCount++;
      baseQuery += ` AND s.name ILIKE $${paramCount}`;
      params.push(`%${skill}%`);
    }
    if (interaction && interaction !== 'all') {
      paramCount++;
      baseQuery += ` AND (u.preferred_interaction = $${paramCount} OR u.preferred_interaction = 'both')`;
      params.push(interaction);
    }

    baseQuery += ` ORDER BY u.completed_sessions DESC, u.average_rating DESC`;

    const result = await query(baseQuery, params);

    // Fetch skills for each user
    const userIds = result.rows.map(u => u.id);
    if (userIds.length === 0) return res.json({ users: [] });

    const skillsResult = await query(
      `SELECT us.user_id, s.id as skill_id, s.name as skill_name, sc.name as category_name,
              us.proficiency, 'teach' as type
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       LEFT JOIN skill_categories sc ON sc.id = s.category_id
       WHERE us.user_id = ANY($1)`,
      [userIds]
    );

    const learningResult = await query(
      `SELECT ulg.user_id, s.id as skill_id, s.name as skill_name, sc.name as category_name,
              'learn' as type
       FROM user_learning_goals ulg
       JOIN skills s ON s.id = ulg.skill_id
       LEFT JOIN skill_categories sc ON sc.id = s.category_id
       WHERE ulg.user_id = ANY($1)`,
      [userIds]
    );

    const skillsByUser = {};
    const learningByUser = {};
    for (const sk of skillsResult.rows) {
      if (!skillsByUser[sk.user_id]) skillsByUser[sk.user_id] = [];
      skillsByUser[sk.user_id].push(sk);
    }
    for (const lg of learningResult.rows) {
      if (!learningByUser[lg.user_id]) learningByUser[lg.user_id] = [];
      learningByUser[lg.user_id].push(lg);
    }

    const users = result.rows.map(u => ({
      ...u,
      teaching_skills: skillsByUser[u.id] || [],
      learning_goals: learningByUser[u.id] || [],
    }));

    res.json({ users });
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT id, name, email, avatar_url, bio, university, year_of_study, major,
              availability_text, preferred_interaction, completed_sessions,
              no_show_count, average_rating, rating_count, last_active_at, created_at
       FROM users WHERE id = $1 AND is_active = true`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = result.rows[0];

    const [teachSkills, learnGoals, interests, recentReviews] = await Promise.all([
      query(
        `SELECT us.id, s.id as skill_id, s.name, sc.name as category_name, us.proficiency, us.description
         FROM user_skills us JOIN skills s ON s.id = us.skill_id
         LEFT JOIN skill_categories sc ON sc.id = s.category_id
         WHERE us.user_id = $1 ORDER BY us.proficiency DESC`,
        [id]
      ),
      query(
        `SELECT ulg.id, s.id as skill_id, s.name, sc.name as category_name, ulg.priority
         FROM user_learning_goals ulg JOIN skills s ON s.id = ulg.skill_id
         LEFT JOIN skill_categories sc ON sc.id = s.category_id
         WHERE ulg.user_id = $1`,
        [id]
      ),
      query(
        `SELECT i.name FROM user_interests ui
         JOIN interests i ON i.id = ui.interest_id
         WHERE ui.user_id = $1`,
        [id]
      ),
      query(
        `SELECT r.rating, r.comment, r.created_at,
                u.name as reviewer_name, u.avatar_url as reviewer_avatar
         FROM reviews r
         JOIN users u ON u.id = r.reviewer_id
         WHERE r.reviewee_id = $1
         ORDER BY r.created_at DESC LIMIT 5`,
        [id]
      ),
    ]);

    res.json({
      user: {
        ...user,
        teaching_skills: teachSkills.rows,
        learning_goals: learnGoals.rows,
        interests: interests.rows.map(i => i.name),
        recent_reviews: recentReviews.rows,
      }
    });
  } catch (err) {
    console.error('getUserById error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
};

const updateUser = async (req, res) => {
  if (req.params.id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only update your own profile.' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, bio, university, year_of_study, major, availability_text, preferred_interaction, avatar_url } = req.body;

  try {
    const result = await query(
      `UPDATE users SET
         name = COALESCE($1, name),
         bio = COALESCE($2, bio),
         university = COALESCE($3, university),
         year_of_study = COALESCE($4, year_of_study),
         major = COALESCE($5, major),
         availability_text = COALESCE($6, availability_text),
         preferred_interaction = COALESCE($7, preferred_interaction),
         avatar_url = COALESCE($8, avatar_url),
         updated_at = NOW()
       WHERE id = $9
       RETURNING id, email, name, role, avatar_url, bio, university, year_of_study, major,
                 availability_text, preferred_interaction, completed_sessions, no_show_count, average_rating`,
      [name, bio, university, year_of_study, major, availability_text, preferred_interaction, avatar_url, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: result.rows[0], message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('updateUser error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

const getUserReviews = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.id as reviewer_id, u.name as reviewer_name, u.avatar_url as reviewer_avatar
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );
    res.json({ reviews: result.rows });
  } catch (err) {
    console.error('getUserReviews error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
};

// Update user interests
const updateInterests = async (req, res) => {
  const { interests } = req.body; // array of interest names
  const userId = req.user.id;
  try {
    // Remove existing
    await query('DELETE FROM user_interests WHERE user_id = $1', [userId]);
    // Re-add
    for (const name of interests) {
      // Upsert interest
      const intRes = await query(
        `INSERT INTO interests (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [name.trim()]
      );
      await query(
        `INSERT INTO user_interests (user_id, interest_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, intRes.rows[0].id]
      );
    }
    res.json({ message: 'Interests updated.' });
  } catch (err) {
    console.error('updateInterests error:', err);
    res.status(500).json({ error: 'Failed to update interests.' });
  }
};

module.exports = { getUsers, getUserById, updateUser, getUserReviews, updateInterests };
