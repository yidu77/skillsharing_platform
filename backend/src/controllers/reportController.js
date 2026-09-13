const { validationResult } = require('express-validator');
const { query } = require('../database/db');

const createReport = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { reported_user_id, reason, description } = req.body;
  const reporter_id = req.user.id;

  if (reported_user_id === reporter_id) {
    return res.status(400).json({ error: 'You cannot report yourself.' });
  }

  try {
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [reported_user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Reported user not found.' });
    }

    // Prevent spam: one open report per user pair
    const existing = await query(
      `SELECT id FROM reports WHERE reporter_id = $1 AND reported_user_id = $2 AND status = 'pending'`,
      [reporter_id, reported_user_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a pending report for this user.' });
    }

    await query(
      `INSERT INTO reports (reporter_id, reported_user_id, reason, description)
       VALUES ($1, $2, $3, $4)`,
      [reporter_id, reported_user_id, reason, description || null]
    );

    res.status(201).json({ message: 'Report submitted. Our team will review it shortly.' });
  } catch (err) {
    console.error('createReport error:', err);
    res.status(500).json({ error: 'Failed to submit report.' });
  }
};

// Admin only
const getReports = async (req, res) => {
  const { status } = req.query;
  try {
    let q = `
      SELECT r.id, r.reason, r.description, r.status, r.admin_notes, r.created_at, r.updated_at,
             reporter.name as reporter_name, reporter.email as reporter_email,
             reported.name as reported_name, reported.email as reported_email, reported.id as reported_id
      FROM reports r
      JOIN users reporter ON reporter.id = r.reporter_id
      JOIN users reported ON reported.id = r.reported_user_id
    `;
    const params = [];
    if (status) {
      q += ` WHERE r.status = $1`;
      params.push(status);
    }
    q += ` ORDER BY r.created_at DESC`;

    const result = await query(q, params);
    res.json({ reports: result.rows });
  } catch (err) {
    console.error('getReports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
};

const updateReport = async (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;

  try {
    const result = await query(
      `UPDATE reports SET status = COALESCE($1, status), admin_notes = COALESCE($2, admin_notes),
         reviewed_by = $3, updated_at = NOW()
       WHERE id = $4 RETURNING id`,
      [status, admin_notes, req.user.id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found.' });
    res.json({ message: 'Report updated.' });
  } catch (err) {
    console.error('updateReport error:', err);
    res.status(500).json({ error: 'Failed to update report.' });
  }
};

module.exports = { createReport, getReports, updateReport };
