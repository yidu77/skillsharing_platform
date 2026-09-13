require('dotenv').config();
const { pool } = require('./db');

const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Extensions
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // skill_categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS skill_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(150) NOT NULL,
        avatar_url TEXT,
        bio TEXT,
        university VARCHAR(200),
        year_of_study VARCHAR(50),
        major VARCHAR(150),
        availability_text TEXT,
        preferred_interaction VARCHAR(20) DEFAULT 'both' CHECK (preferred_interaction IN ('online', 'in-person', 'both')),
        role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
        is_active BOOLEAN DEFAULT TRUE,
        is_suspended BOOLEAN DEFAULT FALSE,
        completed_sessions INT DEFAULT 0,
        no_show_count INT DEFAULT 0,
        average_rating NUMERIC(3,2) DEFAULT 0,
        rating_count INT DEFAULT 0,
        last_active_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // skills (global skill pool)
    await client.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        category_id INT REFERENCES skill_categories(id) ON DELETE SET NULL,
        is_custom BOOLEAN DEFAULT FALSE,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(name, category_id)
      )
    `);

    // user_skills — skills a user can TEACH
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_skills (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_id INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        proficiency VARCHAR(20) DEFAULT 'intermediate' CHECK (proficiency IN ('beginner', 'intermediate', 'advanced')),
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, skill_id)
      )
    `);

    // user_learning_goals — skills a user WANTS TO LEARN
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_learning_goals (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_id INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, skill_id)
      )
    `);

    // interests
    await client.query(`
      CREATE TABLE IF NOT EXISTS interests (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // user_interests
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_interests (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        interest_id INT NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, interest_id)
      )
    `);

    // learning_requests
    await client.query(`
      CREATE TABLE IF NOT EXISTS learning_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_id INT REFERENCES skills(id) ON DELETE SET NULL,
        request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('learn', 'teach', 'exchange', 'practice')),
        message TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT no_self_request CHECK (sender_id != receiver_id)
      )
    `);

    // sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        request_id UUID REFERENCES learning_requests(id) ON DELETE SET NULL,
        proposer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        participant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_id INT REFERENCES skills(id) ON DELETE SET NULL,
        scheduled_date DATE NOT NULL,
        scheduled_time TIME NOT NULL,
        duration_minutes INT DEFAULT 60,
        interaction_type VARCHAR(20) DEFAULT 'online' CHECK (interaction_type IN ('online', 'in-person')),
        location_or_link TEXT,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'completed', 'cancelled', 'no_show')),
        proposer_completed BOOLEAN DEFAULT FALSE,
        participant_completed BOOLEAN DEFAULT FALSE,
        counter_date DATE,
        counter_time TIME,
        counter_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // reviews
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(session_id, reviewer_id)
      )
    `);

    // reports
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(50) NOT NULL CHECK (reason IN ('inappropriate_behavior', 'harassment', 'spam', 'fake_profile', 'no_show', 'other')),
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
        admin_notes TEXT,
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        related_id UUID,
        related_type VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON user_skills(skill_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_learning_goals_user ON user_learning_goals(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_learning_requests_sender ON learning_requests(sender_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_learning_requests_receiver ON learning_requests(receiver_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_learning_requests_status ON learning_requests(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_proposer ON sessions(proposer_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_participant ON sessions(participant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)`);

    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

createTables().catch((err) => {
  console.error(err);
  process.exit(1);
});
