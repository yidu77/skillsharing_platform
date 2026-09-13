const { validationResult } = require('express-validator');
const { query } = require('../database/db');

const createNotification = async (userId, type, title, message, relatedId, relatedType) => {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, title, message, relatedId, relatedType]
    );
  } catch (err) {
    console.error('Notification creation failed (non-critical):', err.message);
  }
};

const getRequests = async (req, res) => {
  const userId = req.user.id;
  const { type } = req.query; // 'sent' | 'received' | 'all'

  try {
    let whereClause = '';
    const params = [userId];

    if (type === 'sent') {
      whereClause = 'WHERE lr.sender_id = $1';
    } else if (type === 'received') {
      whereClause = 'WHERE lr.receiver_id = $1';
    } else {
      whereClause = 'WHERE (lr.sender_id = $1 OR lr.receiver_id = $1)';
    }

    const result = await query(
      `SELECT lr.id, lr.sender_id, lr.receiver_id, lr.skill_id, lr.request_type,
              lr.message, lr.status, lr.created_at, lr.updated_at,
              s.name as skill_name, sc.name as skill_category,
              sender.name as sender_name, sender.avatar_url as sender_avatar,
              receiver.name as receiver_name, receiver.avatar_url as receiver_avatar
       FROM learning_requests lr
       LEFT JOIN skills s ON s.id = lr.skill_id
       LEFT JOIN skill_categories sc ON sc.id = s.category_id
       JOIN users sender ON sender.id = lr.sender_id
       JOIN users receiver ON receiver.id = lr.receiver_id
       ${whereClause}
       ORDER BY lr.created_at DESC`,
      params
    );

    res.json({ requests: result.rows });
  } catch (err) {
    console.error('getRequests error:', err);
    res.status(500).json({ error: 'Failed to fetch requests.' });
  }
};

const createRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { receiver_id, skill_id, request_type, message } = req.body;
  const sender_id = req.user.id;

  if (receiver_id === sender_id) {
    return res.status(400).json({ error: 'You cannot send a request to yourself.' });
  }

  try {
    // Check receiver exists
    const receiverCheck = await query('SELECT id, name FROM users WHERE id = $1 AND is_active = true', [receiver_id]);
    if (receiverCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found.' });
    }

    // Check no duplicate pending request
    const existing = await query(
      `SELECT id FROM learning_requests
       WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [sender_id, receiver_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a pending request with this student.' });
    }

    const result = await query(
      `INSERT INTO learning_requests (sender_id, receiver_id, skill_id, request_type, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sender_id, receiver_id, skill_id, request_type, message, status, created_at`,
      [sender_id, receiver_id, skill_id || null, request_type, message || null]
    );

    const request = result.rows[0];

    // Notify receiver
    await createNotification(
      receiver_id,
      'new_request',
      'New Learning Request',
      `${req.user.name} sent you a ${request_type} request.`,
      request.id,
      'request'
    );

    res.status(201).json({ request, message: 'Request sent successfully!' });
  } catch (err) {
    console.error('createRequest error:', err);
    res.status(500).json({ error: 'Failed to send request.' });
  }
};

const acceptRequest = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await query(
      `UPDATE learning_requests SET status = 'accepted', updated_at = NOW()
       WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
       RETURNING id, sender_id, receiver_id, request_type`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found, already processed, or access denied.' });
    }

    const req_data = result.rows[0];
    await createNotification(
      req_data.sender_id,
      'request_accepted',
      'Request Accepted!',
      `${req.user.name} accepted your ${req_data.request_type} request. Schedule a session!`,
      id,
      'request'
    );

    res.json({ message: 'Request accepted.' });
  } catch (err) {
    console.error('acceptRequest error:', err);
    res.status(500).json({ error: 'Failed to accept request.' });
  }
};

const declineRequest = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await query(
      `UPDATE learning_requests SET status = 'declined', updated_at = NOW()
       WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
       RETURNING id, sender_id, request_type`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or access denied.' });
    }

    const req_data = result.rows[0];
    await createNotification(
      req_data.sender_id,
      'request_declined',
      'Request Declined',
      `${req.user.name} declined your ${req_data.request_type} request.`,
      id,
      'request'
    );

    res.json({ message: 'Request declined.' });
  } catch (err) {
    console.error('declineRequest error:', err);
    res.status(500).json({ error: 'Failed to decline request.' });
  }
};

const cancelRequest = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await query(
      `UPDATE learning_requests SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND sender_id = $2 AND status = 'pending'
       RETURNING id, receiver_id, request_type`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or access denied.' });
    }

    res.json({ message: 'Request cancelled.' });
  } catch (err) {
    console.error('cancelRequest error:', err);
    res.status(500).json({ error: 'Failed to cancel request.' });
  }
};

module.exports = { getRequests, createRequest, acceptRequest, declineRequest, cancelRequest };
