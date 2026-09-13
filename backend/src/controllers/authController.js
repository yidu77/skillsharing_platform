const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { query } = require('../database/db');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name, university, year_of_study, major } = req.body;

  try {
    // Check duplicate email
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

    const result = await query(
      `INSERT INTO users (email, password_hash, name, university, year_of_study, major, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, role, avatar_url, bio, university, year_of_study, major,
                 preferred_interaction, completed_sessions, no_show_count, average_rating, created_at`,
      [email.toLowerCase(), passwordHash, name.trim(), university, year_of_study, major, avatarUrl]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({ user, token, message: 'Account created successfully!' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const result = await query(
      `SELECT id, email, name, role, password_hash, avatar_url, bio, university, year_of_study,
              major, preferred_interaction, completed_sessions, no_show_count, average_rating,
              is_active, is_suspended, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account deactivated. Contact support.' });
    }
    if (user.is_suspended) {
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update last_active
    await query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [user.id]);

    const { password_hash, is_active, is_suspended, ...safeUser } = user;
    const token = generateToken(user.id);

    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

const logout = async (req, res) => {
  // JWT is stateless; client simply drops the token.
  res.json({ message: 'Logged out successfully.' });
};

const getMe = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, name, role, avatar_url, bio, university, year_of_study, major,
              availability_text, preferred_interaction, completed_sessions, no_show_count,
              average_rating, rating_count, last_active_at, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ error: 'Failed to fetch user data.' });
  }
};

module.exports = { register, login, logout, getMe };
