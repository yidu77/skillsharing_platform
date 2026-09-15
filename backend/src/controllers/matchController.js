const { computeMatches } = require('../services/matchService');

const getMatches = async (req, res) => {
  try {
    const result = await computeMatches(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('getMatches error:', err);
    res.status(500).json({ error: 'Failed to compute matches.' });
  }
};

module.exports = { getMatches };
