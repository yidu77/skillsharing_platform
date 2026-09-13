const { validationResult } = require('express-validator');
const { query } = require('../database/db');

const createNotification = async (userId, type, title, message, relatedId) => {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       VALUES ($1, $2, $3, $4, $5, 'session')`,
      [userId, type, title, message, relatedId]
    );
  } catch (e) { /* non-critical */ }
};

const buildSessionQuery = () => `
  SELECT s.id, s.request_id, s.proposer_id, s.participant_id, s.skill_id,
         s.scheduled_date, s.scheduled_time, s.duration_minutes, s.interaction_type,
         s.location_or_link, s.notes, s.status, s.proposer_completed, s.participant_completed,
         s.counter_date, s.counter_time, s.counter_notes, s.created_at, s.updated_at,
         sk.name as skill_name,
         p.name as proposer_name, p.avatar_url as proposer_avatar,
         part.name as participant_name, part.avatar_url as participant_avatar
  FROM sessions s
  LEFT JOIN skills sk ON sk.id = s.skill_id
  JOIN users p ON p.id = s.proposer_id
  JOIN users part ON part.id = s.participant_id
`;

const getSessions = async (req, res) => {
  const userId = req.user.id;
  const { status } = req.query;

  try {
    let whereClause = `WHERE (s.proposer_id = $1 OR s.participant_id = $1)`;
    const params = [userId];

    if (status) {
      params.push(status);
      whereClause += ` AND s.status = $2`;
    }

    const result = await query(
      `${buildSessionQuery()} ${whereClause} ORDER BY s.scheduled_date ASC, s.scheduled_time ASC`,
      params
    );

    res.json({ sessions: result.rows });
  } catch (err) {
    console.error('getSessions error:', err);
    res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
};

const proposeSession = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { request_id, participant_id, skill_id, scheduled_date, scheduled_time,
          duration_minutes, interaction_type, location_or_link, notes } = req.body;
  const proposer_id = req.user.id;

  try {
    // Validate request exists and is accepted
    if (request_id) {
      const reqCheck = await query(
        `SELECT id, sender_id, receiver_id FROM learning_requests
         WHERE id = $1 AND status = 'accepted'
         AND (sender_id = $2 OR receiver_id = $2)`,
        [request_id, proposer_id]
      );
      if (reqCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Request not found or not accepted yet.' });
      }
    }

    const result = await query(
      `INSERT INTO sessions (request_id, proposer_id, participant_id, skill_id,
         scheduled_date, scheduled_time, duration_minutes, interaction_type, location_or_link, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [request_id || null, proposer_id, participant_id, skill_id || null,
       scheduled_date, scheduled_time, duration_minutes || 60,
       interaction_type || 'online', location_or_link || null, notes || null]
    );

    const sessionId = result.rows[0].id;

    const session = await query(
      `${buildSessionQuery()} WHERE s.id = $1`,
      [sessionId]
    );

    await createNotification(
      participant_id,
      'session_proposed',
      'Session Proposed',
      `${req.user.name} proposed a session on ${scheduled_date} at ${scheduled_time}.`,
      sessionId
    );

    res.status(201).json({ session: session.rows[0], message: 'Session proposed!' });
  } catch (err) {
    console.error('proposeSession error:', err);
    res.status(500).json({ error: 'Failed to propose session.' });
  }
};

const updateSession = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { scheduled_date, scheduled_time, duration_minutes, interaction_type,
          location_or_link, notes, status } = req.body;

  try {
    const sessionRes = await query(
      `SELECT id, proposer_id, participant_id, status FROM sessions WHERE id = $1`,
      [id]
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    const session = sessionRes.rows[0];
    if (session.proposer_id !== userId && session.participant_id !== userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const result = await query(
      `UPDATE sessions SET
         scheduled_date = COALESCE($1, scheduled_date),
         scheduled_time = COALESCE($2, scheduled_time),
         duration_minutes = COALESCE($3, duration_minutes),
         interaction_type = COALESCE($4, interaction_type),
         location_or_link = COALESCE($5, location_or_link),
         notes = COALESCE($6, notes),
         status = COALESCE($7, status),
         updated_at = NOW()
       WHERE id = $8
       RETURNING id`,
      [scheduled_date, scheduled_time, duration_minutes, interaction_type,
       location_or_link, notes, status, id]
    );

    res.json({ message: 'Session updated.' });
  } catch (err) {
    console.error('updateSession error:', err);
    res.status(500).json({ error: 'Failed to update session.' });
  }
};

const confirmSession = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const sessionRes = await query(
      `SELECT id, proposer_id, participant_id, status FROM sessions WHERE id = $1`,
      [id]
    );
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const session = sessionRes.rows[0];

    // Only the participant can confirm (accept the proposal)
    if (session.participant_id !== userId) {
      return res.status(403).json({ error: 'Only the invited participant can confirm the session.' });
    }
    if (session.status !== 'proposed') {
      return res.status(400).json({ error: 'Session is not in proposed state.' });
    }

    await query(
      `UPDATE sessions SET status = 'confirmed', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await createNotification(
      session.proposer_id,
      'session_confirmed',
      'Session Confirmed!',
      `${req.user.name} confirmed the session.`,
      id
    );

    res.json({ message: 'Session confirmed!' });
  } catch (err) {
    console.error('confirmSession error:', err);
    res.status(500).json({ error: 'Failed to confirm session.' });
  }
};

const counterSession = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { counter_date, counter_time, counter_notes } = req.body;

  try {
    const sessionRes = await query(
      `SELECT id, proposer_id, participant_id, status FROM sessions WHERE id = $1`,
      [id]
    );
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const session = sessionRes.rows[0];

    if (session.participant_id !== userId) {
      return res.status(403).json({ error: 'Only the participant can suggest another time.' });
    }

    await query(
      `UPDATE sessions SET counter_date = $1, counter_time = $2, counter_notes = $3,
         status = 'proposed', updated_at = NOW()
       WHERE id = $4`,
      [counter_date, counter_time, counter_notes || null, id]
    );

    await createNotification(
      session.proposer_id,
      'session_counter',
      'New Time Suggested',
      `${req.user.name} suggested a different time for your session.`,
      id
    );

    res.json({ message: 'Counter-proposal sent.' });
  } catch (err) {
    console.error('counterSession error:', err);
    res.status(500).json({ error: 'Failed to send counter-proposal.' });
  }
};

const completeSession = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const sessionRes = await query(
      `SELECT id, proposer_id, participant_id, status,
              proposer_completed, participant_completed
       FROM sessions WHERE id = $1`,
      [id]
    );
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const session = sessionRes.rows[0];

    if (session.proposer_id !== userId && session.participant_id !== userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (!['confirmed', 'proposed'].includes(session.status)) {
      return res.status(400).json({ error: 'Session cannot be marked completed in its current state.' });
    }

    const isProposer = session.proposer_id === userId;
    const updateField = isProposer ? 'proposer_completed' : 'participant_completed';

    await query(
      `UPDATE sessions SET ${updateField} = true, updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // If both marked complete, update session status and increment counts
    const updatedSession = await query(
      `SELECT proposer_completed, participant_completed FROM sessions WHERE id = $1`,
      [id]
    );
    const { proposer_completed, participant_completed } = updatedSession.rows[0];

    if (proposer_completed && participant_completed) {
      await query(`UPDATE sessions SET status = 'completed', updated_at = NOW() WHERE id = $1`, [id]);

      // Increment completed_sessions for both users
      await query(
        `UPDATE users SET completed_sessions = completed_sessions + 1 WHERE id = ANY($1)`,
        [[session.proposer_id, session.participant_id]]
      );

      const otherUserId = isProposer ? session.participant_id : session.proposer_id;
      await createNotification(
        otherUserId,
        'session_completed',
        'Session Completed!',
        `Your session has been marked complete. Leave a review!`,
        id
      );
    }

    res.json({ message: 'Marked as completed. Waiting for the other participant if needed.' });
  } catch (err) {
    console.error('completeSession error:', err);
    res.status(500).json({ error: 'Failed to complete session.' });
  }
};

const cancelSession = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const sessionRes = await query(
      `SELECT id, proposer_id, participant_id, status FROM sessions WHERE id = $1`,
      [id]
    );
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const session = sessionRes.rows[0];

    if (session.proposer_id !== userId && session.participant_id !== userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (['completed', 'cancelled'].includes(session.status)) {
      return res.status(400).json({ error: 'Session cannot be cancelled.' });
    }

    await query(`UPDATE sessions SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [id]);

    const otherUserId = session.proposer_id === userId ? session.participant_id : session.proposer_id;
    await createNotification(
      otherUserId,
      'session_cancelled',
      'Session Cancelled',
      `${req.user.name} cancelled the session.`,
      id
    );

    res.json({ message: 'Session cancelled.' });
  } catch (err) {
    console.error('cancelSession error:', err);
    res.status(500).json({ error: 'Failed to cancel session.' });
  }
};

const noShowSession = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const sessionRes = await query(
      `SELECT id, proposer_id, participant_id, status FROM sessions WHERE id = $1`,
      [id]
    );
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const session = sessionRes.rows[0];

    if (session.proposer_id !== userId && session.participant_id !== userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (!['confirmed', 'proposed'].includes(session.status)) {
      return res.status(400).json({ error: 'Session is not in a state that can be marked as no-show.' });
    }

    await query(`UPDATE sessions SET status = 'no_show', updated_at = NOW() WHERE id = $1`, [id]);

    // The other person (who didn't show up) gets a no-show count increment
    const otherUserId = session.proposer_id === userId ? session.participant_id : session.proposer_id;
    await query(`UPDATE users SET no_show_count = no_show_count + 1 WHERE id = $1`, [otherUserId]);

    res.json({ message: 'Session marked as no-show.' });
  } catch (err) {
    console.error('noShowSession error:', err);
    res.status(500).json({ error: 'Failed to mark no-show.' });
  }
};

module.exports = {
  getSessions, proposeSession, updateSession, confirmSession,
  counterSession, completeSession, cancelSession, noShowSession
};
