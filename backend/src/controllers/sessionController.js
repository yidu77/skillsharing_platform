const { validationResult } = require('express-validator');
const { query } = require('../database/db');
const {
  notifySessionProposed,
  notifySessionConfirmed,
  notifySessionCancelled,
  notifySessionCounter,
  notifySessionCompleted,
} = require('../services/notificationService');

const buildSessionQuery = () => `
  SELECT s.id, s.request_id, s.proposer_id, s.participant_id, s.skill_id,
         s.scheduled_date, s.scheduled_time, s.duration_minutes, s.interaction_type,
         s.location_or_link, s.notes, s.status, s.proposer_completed, s.participant_completed,
         s.counter_date, s.counter_time, s.counter_notes, s.created_at, s.updated_at,
         sk.name AS skill_name,
         p.name    AS proposer_name,    p.avatar_url    AS proposer_avatar,
         part.name AS participant_name, part.avatar_url AS participant_avatar
  FROM sessions s
  LEFT JOIN skills sk ON sk.id = s.skill_id
  JOIN users p    ON p.id    = s.proposer_id
  JOIN users part ON part.id = s.participant_id
`;

/* ─── getSessions ─────────────────────────────────────────────────────────── */
const getSessions = async (req, res) => {
  const userId = req.user.id;
  const { status } = req.query;
  try {
    const params = [userId];
    let where = `WHERE (s.proposer_id = $1 OR s.participant_id = $1)`;
    if (status) { params.push(status); where += ` AND s.status = $2`; }

    const result = await query(
      `${buildSessionQuery()} ${where} ORDER BY s.scheduled_date ASC, s.scheduled_time ASC`,
      params
    );
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error('getSessions error:', err);
    res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
};

/* ─── proposeSession ──────────────────────────────────────────────────────── */
const proposeSession = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    request_id, participant_id, skill_id,
    scheduled_date, scheduled_time, duration_minutes,
    interaction_type, location_or_link, notes,
  } = req.body;
  const proposer_id = req.user.id;

  try {
    if (request_id) {
      const check = await query(
        `SELECT id FROM learning_requests
         WHERE id = $1 AND status = 'accepted' AND (sender_id = $2 OR receiver_id = $2)`,
        [request_id, proposer_id]
      );
      if (check.rows.length === 0) {
        return res.status(400).json({ error: 'Request not found or not accepted yet.' });
      }
    }

    const ins = await query(
      `INSERT INTO sessions
         (request_id, proposer_id, participant_id, skill_id,
          scheduled_date, scheduled_time, duration_minutes,
          interaction_type, location_or_link, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        request_id || null, proposer_id, participant_id, skill_id || null,
        scheduled_date, scheduled_time, duration_minutes || 60,
        interaction_type || 'online', location_or_link || null, notes || null,
      ]
    );

    const sessionId = ins.rows[0].id;
    const session = await query(`${buildSessionQuery()} WHERE s.id = $1`, [sessionId]);

    await notifySessionProposed(participant_id, req.user.name, scheduled_date, scheduled_time, sessionId);

    res.status(201).json({ session: session.rows[0], message: 'Session proposed!' });
  } catch (err) {
    console.error('proposeSession error:', err);
    res.status(500).json({ error: 'Failed to propose session.' });
  }
};

/* ─── updateSession ───────────────────────────────────────────────────────── */
const updateSession = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { scheduled_date, scheduled_time, duration_minutes, interaction_type,
          location_or_link, notes, status } = req.body;

  try {
    const existing = await query(`SELECT proposer_id, participant_id FROM sessions WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const s = existing.rows[0];
    if (s.proposer_id !== userId && s.participant_id !== userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await query(
      `UPDATE sessions SET
         scheduled_date    = COALESCE($1, scheduled_date),
         scheduled_time    = COALESCE($2, scheduled_time),
         duration_minutes  = COALESCE($3, duration_minutes),
         interaction_type  = COALESCE($4, interaction_type),
         location_or_link  = COALESCE($5, location_or_link),
         notes             = COALESCE($6, notes),
         status            = COALESCE($7, status),
         updated_at        = NOW()
       WHERE id = $8`,
      [scheduled_date, scheduled_time, duration_minutes, interaction_type,
       location_or_link, notes, status, id]
    );
    res.json({ message: 'Session updated.' });
  } catch (err) {
    console.error('updateSession error:', err);
    res.status(500).json({ error: 'Failed to update session.' });
  }
};

/* ─── confirmSession ──────────────────────────────────────────────────────── */
const confirmSession = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const row = await query(`SELECT proposer_id, participant_id, status FROM sessions WHERE id = $1`, [id]);
    if (row.rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const s = row.rows[0];

    if (s.participant_id !== userId) {
      return res.status(403).json({ error: 'Only the invited participant can confirm the session.' });
    }
    if (s.status !== 'proposed') {
      return res.status(400).json({ error: 'Session is not in proposed state.' });
    }

    await query(`UPDATE sessions SET status = 'confirmed', updated_at = NOW() WHERE id = $1`, [id]);
    await notifySessionConfirmed(s.proposer_id, req.user.name, id);

    res.json({ message: 'Session confirmed!' });
  } catch (err) {
    console.error('confirmSession error:', err);
    res.status(500).json({ error: 'Failed to confirm session.' });
  }
};

/* ─── counterSession ──────────────────────────────────────────────────────── */
const counterSession = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { counter_date, counter_time, counter_notes } = req.body;
  try {
    const row = await query(`SELECT proposer_id, participant_id, status FROM sessions WHERE id = $1`, [id]);
    if (row.rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const s = row.rows[0];

    if (s.participant_id !== userId) {
      return res.status(403).json({ error: 'Only the participant can suggest another time.' });
    }

    await query(
      `UPDATE sessions SET
         counter_date = $1, counter_time = $2, counter_notes = $3,
         status = 'proposed', updated_at = NOW()
       WHERE id = $4`,
      [counter_date, counter_time, counter_notes || null, id]
    );
    await notifySessionCounter(s.proposer_id, req.user.name, id);

    res.json({ message: 'Counter-proposal sent.' });
  } catch (err) {
    console.error('counterSession error:', err);
    res.status(500).json({ error: 'Failed to send counter-proposal.' });
  }
};

/* ─── completeSession ─────────────────────────────────────────────────────── */
const completeSession = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const row = await query(
      `SELECT proposer_id, participant_id, status, proposer_completed, participant_completed
       FROM sessions WHERE id = $1`,
      [id]
    );
    if (row.rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const s = row.rows[0];

    if (s.proposer_id !== userId && s.participant_id !== userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (!['confirmed', 'proposed'].includes(s.status)) {
      return res.status(400).json({ error: 'Session cannot be marked completed in its current state.' });
    }

    const isProposer  = s.proposer_id === userId;
    const updateField = isProposer ? 'proposer_completed' : 'participant_completed';

    await query(`UPDATE sessions SET ${updateField} = true, updated_at = NOW() WHERE id = $1`, [id]);

    // Re-read to check if both now completed
    const updated = await query(
      `SELECT proposer_completed, participant_completed FROM sessions WHERE id = $1`, [id]
    );
    const { proposer_completed, participant_completed } = updated.rows[0];

    if (proposer_completed && participant_completed) {
      await query(`UPDATE sessions SET status = 'completed', updated_at = NOW() WHERE id = $1`, [id]);
      await query(
        `UPDATE users SET completed_sessions = completed_sessions + 1 WHERE id = ANY($1)`,
        [[s.proposer_id, s.participant_id]]
      );
      const otherUserId = isProposer ? s.participant_id : s.proposer_id;
      await notifySessionCompleted(otherUserId, id);
    }

    res.json({ message: 'Marked as completed. Waiting for the other participant if needed.' });
  } catch (err) {
    console.error('completeSession error:', err);
    res.status(500).json({ error: 'Failed to complete session.' });
  }
};

/* ─── cancelSession ───────────────────────────────────────────────────────── */
const cancelSession = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const row = await query(`SELECT proposer_id, participant_id, status FROM sessions WHERE id = $1`, [id]);
    if (row.rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const s = row.rows[0];

    if (s.proposer_id !== userId && s.participant_id !== userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (['completed', 'cancelled'].includes(s.status)) {
      return res.status(400).json({ error: 'Session cannot be cancelled.' });
    }

    await query(`UPDATE sessions SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [id]);

    const otherUserId = s.proposer_id === userId ? s.participant_id : s.proposer_id;
    await notifySessionCancelled(otherUserId, req.user.name, id);

    res.json({ message: 'Session cancelled.' });
  } catch (err) {
    console.error('cancelSession error:', err);
    res.status(500).json({ error: 'Failed to cancel session.' });
  }
};

/* ─── noShowSession ───────────────────────────────────────────────────────── */
const noShowSession = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const row = await query(`SELECT proposer_id, participant_id, status FROM sessions WHERE id = $1`, [id]);
    if (row.rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const s = row.rows[0];

    if (s.proposer_id !== userId && s.participant_id !== userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (!['confirmed', 'proposed'].includes(s.status)) {
      return res.status(400).json({ error: 'Session is not in a state that can be marked as no-show.' });
    }

    await query(`UPDATE sessions SET status = 'no_show', updated_at = NOW() WHERE id = $1`, [id]);

    // Penalise the absent party
    const absentUserId = s.proposer_id === userId ? s.participant_id : s.proposer_id;
    await query(`UPDATE users SET no_show_count = no_show_count + 1 WHERE id = $1`, [absentUserId]);

    res.json({ message: 'Session marked as no-show.' });
  } catch (err) {
    console.error('noShowSession error:', err);
    res.status(500).json({ error: 'Failed to mark no-show.' });
  }
};

module.exports = {
  getSessions, proposeSession, updateSession, confirmSession,
  counterSession, completeSession, cancelSession, noShowSession,
};
