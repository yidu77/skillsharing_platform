const { query } = require('../database/db');

/**
 * Rule-based matching engine.
 *
 * Match priorities (score):
 *   exchange  — mutual skill swap                          100 + 10/pair
 *   learning  — they teach something the user wants        70  + 10/skill
 *   teaching  — user teaches something the other wants     50  + 10/skill
 *   practice  — both want to learn the same skill          30  + 10/shared
 *
 * Returns an array of match objects sorted by score descending.
 * Architecture note: this is kept deterministic/rule-based for MVP.
 * A weighted or ML-based scorer can replace `scoreUser()` later without
 * changing the rest of the pipeline.
 */

/** Build skill/goal maps for a list of user IDs in one round-trip each. */
const fetchUserSkillMaps = async (userIds) => {
  const [skillsRes, goalsRes] = await Promise.all([
    query(
      `SELECT us.user_id, us.skill_id, s.name AS skill_name, us.proficiency
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       WHERE us.user_id = ANY($1)`,
      [userIds]
    ),
    query(
      `SELECT ulg.user_id, ulg.skill_id, s.name AS skill_name
       FROM user_learning_goals ulg
       JOIN skills s ON s.id = ulg.skill_id
       WHERE ulg.user_id = ANY($1)`,
      [userIds]
    ),
  ]);

  const skillMap = {};
  const goalMap = {};

  for (const row of skillsRes.rows) {
    if (!skillMap[row.user_id]) skillMap[row.user_id] = [];
    skillMap[row.user_id].push(row);
  }
  for (const row of goalsRes.rows) {
    if (!goalMap[row.user_id]) goalMap[row.user_id] = [];
    goalMap[row.user_id].push(row);
  }

  return { skillMap, goalMap };
};

/**
 * Score a single (currentUser, otherUser) pair.
 * Returns null if there is no meaningful match.
 */
const scoreUser = (mySkillIds, myGoalIds, mySkillMap, myGoalMap, other, theirSkills, theirGoals) => {
  const theirSkillIds = new Set(theirSkills.map(s => s.skill_id));
  const theirGoalIds  = new Set(theirGoals.map(g => g.skill_id));

  const reasons   = [];
  let matchType   = null;
  let score       = 0;

  const iTeachTheyWant  = [...mySkillIds].filter(id => theirGoalIds.has(id));
  const theyTeachIWant  = [...theirSkillIds].filter(id => myGoalIds.has(id));

  if (iTeachTheyWant.length > 0 && theyTeachIWant.length > 0) {
    matchType = 'exchange';
    score     = 100 + (iTeachTheyWant.length + theyTeachIWant.length) * 10;

    for (const skillId of iTeachTheyWant) {
      reasons.push({ type: 'exchange_teach', text: `You teach ${mySkillMap[skillId]} and they want to learn it.` });
    }
    for (const skillId of theyTeachIWant) {
      const theirSkill = theirSkills.find(s => s.skill_id === skillId);
      const profNote   = theirSkill ? ` (${theirSkill.proficiency})` : '';
      reasons.push({ type: 'exchange_learn', text: `They teach ${myGoalMap[skillId]}${profNote}, which you want to learn.` });
    }

  } else if (theyTeachIWant.length > 0) {
    matchType = 'learning';
    score     = 70 + theyTeachIWant.length * 10;

    for (const skillId of theyTeachIWant) {
      const theirSkill = theirSkills.find(s => s.skill_id === skillId);
      const profNote   = theirSkill ? ` (${theirSkill.proficiency})` : '';
      reasons.push({ type: 'learning', text: `They teach ${myGoalMap[skillId]}${profNote}, which you want to learn.` });
    }

  } else if (iTeachTheyWant.length > 0) {
    matchType = 'teaching';
    score     = 50 + iTeachTheyWant.length * 10;

    for (const skillId of iTeachTheyWant) {
      reasons.push({ type: 'teaching', text: `You teach ${mySkillMap[skillId]} and they want to learn it.` });
    }

  } else {
    const sharedGoals = [...myGoalIds].filter(id => theirGoalIds.has(id));
    if (sharedGoals.length > 0) {
      matchType = 'practice';
      score     = 30 + sharedGoals.length * 10;

      for (const skillId of sharedGoals) {
        reasons.push({ type: 'practice', text: `You both want to learn ${myGoalMap[skillId]}. Great practice partners!` });
      }
    }
  }

  if (!matchType || reasons.length === 0) return null;

  return {
    user: { ...other, teaching_skills: theirSkills, learning_goals: theirGoals },
    match_type: matchType,
    score,
    reasons,
  };
};

/**
 * Compute matches for a given userId.
 * @returns {{ matches: Array, message?: string }}
 */
const computeMatches = async (userId) => {
  const [mySkillsRes, myGoalsRes] = await Promise.all([
    query(
      `SELECT us.skill_id, s.name AS skill_name
       FROM user_skills us JOIN skills s ON s.id = us.skill_id
       WHERE us.user_id = $1`,
      [userId]
    ),
    query(
      `SELECT ulg.skill_id, s.name AS skill_name
       FROM user_learning_goals ulg JOIN skills s ON s.id = ulg.skill_id
       WHERE ulg.user_id = $1`,
      [userId]
    ),
  ]);

  const mySkillIds = new Set(mySkillsRes.rows.map(s => s.skill_id));
  const myGoalIds  = new Set(myGoalsRes.rows.map(g => g.skill_id));
  const mySkillMap = Object.fromEntries(mySkillsRes.rows.map(s => [s.skill_id, s.skill_name]));
  const myGoalMap  = Object.fromEntries(myGoalsRes.rows.map(g => [g.skill_id, g.skill_name]));

  if (mySkillIds.size === 0 && myGoalIds.size === 0) {
    return { matches: [], message: 'Add skills and learning goals to see matches.' };
  }

  const othersRes = await query(
    `SELECT id, name, avatar_url, bio, university, year_of_study,
            preferred_interaction, completed_sessions, no_show_count,
            average_rating, rating_count
     FROM users
     WHERE id != $1 AND role = 'student' AND is_active = true AND is_suspended = false`,
    [userId]
  );

  if (othersRes.rows.length === 0) return { matches: [] };

  const otherIds = othersRes.rows.map(u => u.id);
  const { skillMap, goalMap } = await fetchUserSkillMaps(otherIds);

  const matches = [];

  for (const other of othersRes.rows) {
    const theirSkills = skillMap[other.id] || [];
    const theirGoals  = goalMap[other.id]  || [];
    const result = scoreUser(mySkillIds, myGoalIds, mySkillMap, myGoalMap, other, theirSkills, theirGoals);
    if (result) matches.push(result);
  }

  matches.sort((a, b) => b.score - a.score);
  return { matches };
};

module.exports = { computeMatches };
