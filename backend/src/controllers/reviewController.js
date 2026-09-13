const { validationResult } = require('express-validator');
const { query } = require('../database/db');

const createReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { session_id, reviewee_id, rating, comment } = req.body;
  const reviewer_id = req.user.id;

  try {
    // Verify session is completed and reviewer participated
    const sessionRes = await query(
      `SELECT id, proposer_id, participant_id, status
       FROM sessions WHERE id = $1 AND status = 'completed'`,
      [session_id]
    );
    if (sessionRes.rows.length === 0) {
      return res.status(400).json({ error: 'Session not found or not completed yet.' });
    }
    const session = sessionRes.rows[0];

    if (session.proposer_id !== reviewer_id && session.participant_id !== reviewer_id) {
      return res.status(403).json({ error: 'You did not participate in this session.' });
    }
    if (reviewee_id !== session.proposer_id && reviewee_id !== session.participant_id) {
      return res.status(400).json({ error: 'Reviewee was not in this session.' });
    }
    if (reviewee_id === reviewer_id) {
      return res.status(400).json({ error: 'You cannot review yourself.' });
    }

    // Check for duplicate review
    const existing = await query(
      `SELECT id FROM reviews WHERE session_id = $1 AND reviewer_id = $2`,
      [session_id, reviewer_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this session.' });
    }

    await query(
      `INSERT INTO reviews (session_id, reviewer_id, reviewee_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [session_id, reviewer_id, reviewee_id, rating, comment || null]
    );

    // Update reviewee's average rating
    const ratingRes = await query(
      `SELECT AVG(rating)::NUMERIC(3,2) as avg, COUNT(*) as cnt
       FROM reviews WHERE reviewee_id = $1`,
      [reviewee_id]
    );
    await query(
      `UPDATE users SET average_rating = $1, rating_count = $2 WHERE id = $3`,
      [ratingRes.rows[0].avg, ratingRes.rows[0].cnt, reviewee_id]
    );

    res.status(201).json({ message: 'Review submitted. Thank you!' });
  } catch (err) {
    console.error('createReview error:', err);
    res.status(500).json({ error: 'Failed to submit review.' });
  }
};

const getSessionReviews = async (req, res) => {
  const { session_id } = req.params;
  try {
    const result = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              reviewer.name as reviewer_name, reviewer.avatar_url as reviewer_avatar,
              reviewee.name as reviewee_name
       FROM reviews r
       JOIN users reviewer ON reviewer.id = r.reviewer_id
       JOIN users reviewee ON reviewee.id = r.reviewee_id
       WHERE r.session_id = $1`,
      [session_id]
    );
    res.json({ reviews: result.rows });
  } catch (err) {
    console.error('getSessionReviews error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
};

// Check if current user has already reviewed a session
const checkReview = async (req, res) => {
  const { session_id } = req.params;
  const reviewer_id = req.user.id;
  try {
    const result = await query(
      `SELECT id FROM reviews WHERE session_id = $1 AND reviewer_id = $2`,
      [session_id, reviewer_id]
    );
    res.json({ has_reviewed: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check review status.' });
  }
};

module.exports = { createReview, getSessionReviews, checkReview };
