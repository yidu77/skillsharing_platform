const { query } = require('../database/db');

/**
 * Create a notification record.
 * Non-critical — logs on failure but does not throw.
 *
 * @param {string} userId      - recipient user UUID
 * @param {string} type        - notification type key
 * @param {string} title       - short title shown in bell dropdown
 * @param {string} message     - longer body text
 * @param {string} [relatedId] - UUID of the related entity (request/session)
 * @param {string} [relatedType] - 'request' | 'session' | etc.
 */
const notify = async (userId, type, title, message, relatedId = null, relatedType = null) => {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, title, message, relatedId, relatedType]
    );
  } catch (err) {
    console.error(`[notify] Failed to create notification (type=${type}):`, err.message);
  }
};

// ─── Convenience wrappers ────────────────────────────────────────────────────

const notifyNewRequest = (receiverId, senderName, requestType, requestId) =>
  notify(
    receiverId,
    'new_request',
    'New Learning Request',
    `${senderName} sent you a ${requestType} request.`,
    requestId,
    'request'
  );

const notifyRequestAccepted = (senderId, acceptorName, requestType, requestId) =>
  notify(
    senderId,
    'request_accepted',
    'Request Accepted! 🎉',
    `${acceptorName} accepted your ${requestType} request. Time to schedule a session!`,
    requestId,
    'request'
  );

const notifyRequestDeclined = (senderId, declinerName, requestType, requestId) =>
  notify(
    senderId,
    'request_declined',
    'Request Declined',
    `${declinerName} declined your ${requestType} request.`,
    requestId,
    'request'
  );

const notifySessionProposed = (participantId, proposerName, date, time, sessionId) =>
  notify(
    participantId,
    'session_proposed',
    'Session Proposed 📅',
    `${proposerName} proposed a session on ${date} at ${time?.slice(0, 5)}.`,
    sessionId,
    'session'
  );

const notifySessionConfirmed = (proposerId, confirmerName, sessionId) =>
  notify(
    proposerId,
    'session_confirmed',
    'Session Confirmed! ✅',
    `${confirmerName} confirmed your session.`,
    sessionId,
    'session'
  );

const notifySessionCancelled = (otherUserId, cancellerName, sessionId) =>
  notify(
    otherUserId,
    'session_cancelled',
    'Session Cancelled',
    `${cancellerName} cancelled the session.`,
    sessionId,
    'session'
  );

const notifySessionCounter = (proposerId, counterName, sessionId) =>
  notify(
    proposerId,
    'session_counter',
    'New Time Suggested ⏰',
    `${counterName} suggested a different time for your session.`,
    sessionId,
    'session'
  );

const notifySessionCompleted = (otherUserId, sessionId) =>
  notify(
    otherUserId,
    'session_completed',
    'Session Completed! 🌟',
    'Your session has been marked complete by both participants. Leave a review!',
    sessionId,
    'session'
  );

module.exports = {
  notify,
  notifyNewRequest,
  notifyRequestAccepted,
  notifyRequestDeclined,
  notifySessionProposed,
  notifySessionConfirmed,
  notifySessionCancelled,
  notifySessionCounter,
  notifySessionCompleted,
};
