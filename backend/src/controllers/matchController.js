const { query } = require('../database/db');

/**
 * Rule-based matching engine (MVP)
 * Match types:
 *   exchange — mutual: A teaches what B wants, B teaches what A wants
 *   learning — other student teaches something current user wants to learn
 *   teaching — current user can teach something the other student wants
 *   practice — both users want to learn the same skill
 */
const getMatches = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get current user's skills and goals
    const [mySkills, myGoals] = await Promise.all([
      query(
        `SELECT us.skill_id, s.name as skill_name FROM user_skills us
         JOIN skills s ON s.id = us.skill_id WHERE us.user_id = $1`,
        [userId]
      ),
      query(
        `SELECT ulg.skill_id, s.name as skill_name FROM user_learning_goals ulg
         JOIN skills s ON s.id = ulg.skill_id WHERE ulg.user_id = $1`,
        [userId]
      ),
    ]);

    const mySkillIds = new Set(mySkills.rows.map(s => s.skill_id));
    const myGoalIds = new Set(myGoals.rows.map(g => g.skill_id));
    const mySkillMap = Object.fromEntries(mySkills.rows.map(s => [s.skill_id, s.skill_name]));
    const myGoalMap = Object.fromEntries(myGoals.rows.map(g => [g.skill_id, g.skill_name]));

    if (mySkillIds.size === 0 && myGoalIds.size === 0) {
      return res.json({ matches: [], message: 'Add skills and learning goals to see matches.' });
    }

    // Get all other active students with their skills/goals
    const othersResult = await query(
      `SELECT DISTINCT u.id, u.name, u.avatar_url, u.bio, u.university,
              u.year_of_study, u.preferred_interaction, u.completed_sessions,
              u.no_show_count, u.average_rating, u.rating_count
       FROM users u
       WHERE u.id != $1 AND u.role = 'student' AND u.is_active = true AND u.is_suspended = false`,
      [userId]
    );

    if (othersResult.rows.length === 0) return res.json({ matches: [] });

    const otherIds = othersResult.rows.map(u => u.id);

    const [otherSkills, otherGoals] = await Promise.all([
      query(
        `SELECT us.user_id, us.skill_id, s.name as skill_name, us.proficiency
         FROM user_skills us JOIN skills s ON s.id = us.skill_id
         WHERE us.user_id = ANY($1)`,
        [otherIds]
      ),
      query(
        `SELECT ulg.user_id, ulg.skill_id, s.name as skill_name
         FROM user_learning_goals ulg JOIN skills s ON s.id = ulg.skill_id
         WHERE ulg.user_id = ANY($1)`,
        [otherIds]
      ),
    ]);

    // Build maps
    const otherSkillMap = {}; // userId -> [{skill_id, skill_name, proficiency}]
    const otherGoalMap = {};  // userId -> [{skill_id, skill_name}]

    for (const sk of otherSkills.rows) {
      if (!otherSkillMap[sk.user_id]) otherSkillMap[sk.user_id] = [];
      otherSkillMap[sk.user_id].push(sk);
    }
    for (const gl of otherGoals.rows) {
      if (!otherGoalMap[gl.user_id]) otherGoalMap[gl.user_id] = [];
      otherGoalMap[gl.user_id].push(gl);
    }

    const matches = [];

    for (const other of othersResult.rows) {
      const theirSkills = otherSkillMap[other.id] || [];
      const theirGoals = otherGoalMap[other.id] || [];

      const theirSkillIds = new Set(theirSkills.map(s => s.skill_id));
      const theirGoalIds = new Set(theirGoals.map(g => g.skill_id));

      const reasons = [];
      let matchType = null;
      let score = 0;

      // Exchange: I teach what they want AND they teach what I want
      const iTeachTheyWant = [...mySkillIds].filter(id => theirGoalIds.has(id));
      const theyTeachIWant = [...theirSkillIds].filter(id => myGoalIds.has(id));

      if (iTeachTheyWant.length > 0 && theyTeachIWant.length > 0) {
        matchType = 'exchange';
        score = 100 + (iTeachTheyWant.length + theyTeachIWant.length) * 10;
        for (const skillId of iTeachTheyWant) {
          reasons.push({ type: 'exchange_teach', text: `You teach ${mySkillMap[skillId]} and they want to learn it.` });
        }
        for (const skillId of theyTeachIWant) {
          reasons.push({ type: 'exchange_learn', text: `They teach ${myGoalMap[skillId]}, which you want to learn.` });
        }
      } else if (theyTeachIWant.length > 0) {
        // Learning match: they teach what I want
        matchType = 'learning';
        score = 70 + theyTeachIWant.length * 10;
        for (const skillId of theyTeachIWant) {
          const theirSkill = theirSkills.find(s => s.skill_id === skillId);
          reasons.push({
            type: 'learning',
            text: `They teach ${myGoalMap[skillId]}${theirSkill ? ` (${theirSkill.proficiency})` : ''}, which you want to learn.`
          });
        }
      } else if (iTeachTheyWant.length > 0) {
        // Teaching match: I teach what they want
        matchType = 'teaching';
        score = 50 + iTeachTheyWant.length * 10;
        for (const skillId of iTeachTheyWant) {
          reasons.push({ type: 'teaching', text: `You teach ${mySkillMap[skillId]} and they want to learn it.` });
        }
      } else {
        // Practice: both want to learn the same skill
        const sharedGoals = [...myGoalIds].filter(id => theirGoalIds.has(id));
        if (sharedGoals.length > 0) {
          matchType = 'practice';
          score = 30 + sharedGoals.length * 10;
          for (const skillId of sharedGoals) {
            reasons.push({ type: 'practice', text: `You both want to learn ${myGoalMap[skillId]}. Great practice partners!` });
          }
        }
      }

      if (matchType && reasons.length > 0) {
        matches.push({
          user: {
            ...other,
            teaching_skills: theirSkills,
            learning_goals: theirGoals,
          },
          match_type: matchType,
          score,
          reasons,
        });
      }
    }

    // Sort by score desc
    matches.sort((a, b) => b.score - a.score);

    res.json({ matches });
  } catch (err) {
    console.error('getMatches error:', err);
    res.status(500).json({ error: 'Failed to compute matches.' });
  }
};

module.exports = { getMatches };
