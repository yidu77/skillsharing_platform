const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with this information already exists.' });
  }
  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist.' });
  }
  // PostgreSQL check constraint
  if (err.code === '23514') {
    return res.status(400).json({ error: 'Invalid value provided.' });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode < 500 ? err.message : 'An unexpected error occurred. Please try again.';

  res.status(statusCode).json({ error: message });
};

module.exports = errorHandler;
