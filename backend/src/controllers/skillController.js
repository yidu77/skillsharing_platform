const { validationResult } = require('express-validator');
const { query } = require('../database/db');

// Get all categories
const getCategories = async (req, res) => {
  try {
    const result = await query(
      `SELECT sc.id, sc.name, sc.icon, sc.description,
              COUNT(s.id) as skill_count
       FROM skill_categories sc
       LEFT JOIN skills s ON s.category_id = sc.id
       GROUP BY sc.id ORDER BY sc.name`
    );
    res.json({ categories: result.rows });
  } catch (err) {
    console.error('getCategories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
};

// Get all skills (with optional search)
const getSkills = async (req, res) => {
  try {
    const { search, category_id } = req.query;
    let q = `SELECT s.id, s.name, sc.id as category_id, sc.name as category_name, sc.icon
             FROM skills s LEFT JOIN skill_categories sc ON sc.id = s.category_id WHERE 1=1`;
    const params = [];
    let count = 0;

    if (search) {
      count++;
      q += ` AND s.name ILIKE $${count}`;
      params.push(`%${search}%`);
    }
    if (category_id) {
      count++;
      q += ` AND s.category_id = $${count}`;
      params.push(parseInt(category_id));
    }

    q += ' ORDER BY s.name';
    const result = await query(q, params);
    res.json({ skills: result.rows });
  } catch (err) {
    console.error('getSkills error:', err);
    res.status(500).json({ error: 'Failed to fetch skills.' });
  }
};

// Get my teaching skills
const getMyTeachingSkills = async (req, res) => {
  try {
    const result = await query(
      `SELECT us.id, us.skill_id, s.name as skill_name, sc.name as category_name, sc.icon,
              us.proficiency, us.description, us.created_at
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       LEFT JOIN skill_categories sc ON sc.id = s.category_id
       WHERE us.user_id = $1 ORDER BY us.proficiency DESC, s.name`,
      [req.user.id]
    );
    res.json({ skills: result.rows });
  } catch (err) {
    console.error('getMyTeachingSkills error:', err);
    res.status(500).json({ error: 'Failed to fetch teaching skills.' });
  }
};

// Get my learning goals
const getMyLearningGoals = async (req, res) => {
  try {
    const result = await query(
      `SELECT ulg.id, ulg.skill_id, s.name as skill_name, sc.name as category_name, sc.icon,
              ulg.priority, ulg.notes, ulg.created_at
       FROM user_learning_goals ulg
       JOIN skills s ON s.id = ulg.skill_id
       LEFT JOIN skill_categories sc ON sc.id = s.category_id
       WHERE ulg.user_id = $1 ORDER BY ulg.priority DESC, s.name`,
      [req.user.id]
    );
    res.json({ skills: result.rows });
  } catch (err) {
    console.error('getMyLearningGoals error:', err);
    res.status(500).json({ error: 'Failed to fetch learning goals.' });
  }
};

// Add a teaching skill
const addTeachingSkill = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { skill_id, skill_name, category_id, proficiency, description } = req.body;

  try {
    let finalSkillId = skill_id;

    if (!finalSkillId && skill_name) {
      // Custom skill or find by name
      const existing = await query(
        `SELECT id FROM skills WHERE LOWER(name) = LOWER($1)`,
        [skill_name.trim()]
      );
      if (existing.rows.length > 0) {
        finalSkillId = existing.rows[0].id;
      } else {
        const newSkill = await query(
          `INSERT INTO skills (name, category_id, is_custom, created_by) VALUES ($1, $2, true, $3) RETURNING id`,
          [skill_name.trim(), category_id || null, req.user.id]
        );
        finalSkillId = newSkill.rows[0].id;
      }
    }

    if (!finalSkillId) {
      return res.status(400).json({ error: 'Skill ID or skill name is required.' });
    }

    const result = await query(
      `INSERT INTO user_skills (user_id, skill_id, proficiency, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, skill_id) DO UPDATE SET proficiency = $3, description = $4, updated_at = NOW()
       RETURNING id, skill_id, proficiency, description`,
      [req.user.id, finalSkillId, proficiency || 'intermediate', description || null]
    );

    const skill = await query(
      `SELECT us.id, us.skill_id, s.name as skill_name, sc.name as category_name, sc.icon,
              us.proficiency, us.description
       FROM user_skills us JOIN skills s ON s.id = us.skill_id
       LEFT JOIN skill_categories sc ON sc.id = s.category_id
       WHERE us.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ skill: skill.rows[0], message: 'Skill added successfully.' });
  } catch (err) {
    console.error('addTeachingSkill error:', err);
    res.status(500).json({ error: 'Failed to add skill.' });
  }
};

// Update a teaching skill
const updateTeachingSkill = async (req, res) => {
  const { id } = req.params;
  const { proficiency, description } = req.body;
  try {
    const result = await query(
      `UPDATE user_skills SET proficiency = COALESCE($1, proficiency), description = COALESCE($2, description), updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id`,
      [proficiency, description, id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found or access denied.' });
    }
    res.json({ message: 'Skill updated.' });
  } catch (err) {
    console.error('updateTeachingSkill error:', err);
    res.status(500).json({ error: 'Failed to update skill.' });
  }
};

// Remove a teaching skill
const removeTeachingSkill = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `DELETE FROM user_skills WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found or access denied.' });
    }
    res.json({ message: 'Skill removed.' });
  } catch (err) {
    console.error('removeTeachingSkill error:', err);
    res.status(500).json({ error: 'Failed to remove skill.' });
  }
};

// Add a learning goal
const addLearningGoal = async (req, res) => {
  const { skill_id, skill_name, category_id, priority, notes } = req.body;
  try {
    let finalSkillId = skill_id;

    if (!finalSkillId && skill_name) {
      const existing = await query(`SELECT id FROM skills WHERE LOWER(name) = LOWER($1)`, [skill_name.trim()]);
      if (existing.rows.length > 0) {
        finalSkillId = existing.rows[0].id;
      } else {
        const newSkill = await query(
          `INSERT INTO skills (name, category_id, is_custom, created_by) VALUES ($1, $2, true, $3) RETURNING id`,
          [skill_name.trim(), category_id || null, req.user.id]
        );
        finalSkillId = newSkill.rows[0].id;
      }
    }

    if (!finalSkillId) {
      return res.status(400).json({ error: 'Skill ID or skill name is required.' });
    }

    const result = await query(
      `INSERT INTO user_learning_goals (user_id, skill_id, priority, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, skill_id) DO UPDATE SET priority = $3, notes = $4
       RETURNING id, skill_id, priority, notes`,
      [req.user.id, finalSkillId, priority || 'medium', notes || null]
    );

    const skill = await query(
      `SELECT ulg.id, ulg.skill_id, s.name as skill_name, sc.name as category_name, sc.icon,
              ulg.priority, ulg.notes
       FROM user_learning_goals ulg JOIN skills s ON s.id = ulg.skill_id
       LEFT JOIN skill_categories sc ON sc.id = s.category_id
       WHERE ulg.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ skill: skill.rows[0], message: 'Learning goal added.' });
  } catch (err) {
    console.error('addLearningGoal error:', err);
    res.status(500).json({ error: 'Failed to add learning goal.' });
  }
};

// Remove a learning goal
const removeLearningGoal = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `DELETE FROM user_learning_goals WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Learning goal not found or access denied.' });
    }
    res.json({ message: 'Learning goal removed.' });
  } catch (err) {
    console.error('removeLearningGoal error:', err);
    res.status(500).json({ error: 'Failed to remove learning goal.' });
  }
};

module.exports = {
  getCategories, getSkills,
  getMyTeachingSkills, getMyLearningGoals,
  addTeachingSkill, updateTeachingSkill, removeTeachingSkill,
  addLearningGoal, removeLearningGoal,
};
