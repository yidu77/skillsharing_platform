require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🌱 Starting seed...');

    // Clear existing data (order matters for FK constraints)
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM reports');
    await client.query('DELETE FROM reviews');
    await client.query('DELETE FROM sessions');
    await client.query('DELETE FROM learning_requests');
    await client.query('DELETE FROM user_interests');
    await client.query('DELETE FROM user_learning_goals');
    await client.query('DELETE FROM user_skills');
    await client.query('DELETE FROM interests');
    await client.query('DELETE FROM skills');
    await client.query('DELETE FROM skill_categories');
    await client.query('DELETE FROM users');

    // --- Skill Categories ---
    const categories = [
      { name: 'Programming', icon: '💻', description: 'Coding, software development, and tech skills' },
      { name: 'Design', icon: '🎨', description: 'Graphic design, UI/UX, and visual arts' },
      { name: 'Business', icon: '📈', description: 'Entrepreneurship, marketing, and business skills' },
      { name: 'Languages', icon: '🌍', description: 'Foreign languages and communication' },
      { name: 'Creative', icon: '🎭', description: 'Arts, music, writing, and creative expression' },
      { name: 'Academic', icon: '📚', description: 'Subject-specific academic knowledge' },
      { name: 'Practical', icon: '🔧', description: 'Hands-on practical skills' },
      { name: 'Professional', icon: '💼', description: 'Career and professional development' },
      { name: 'Other', icon: '⭐', description: 'Other skills and interests' },
    ];
    const catIds = {};
    for (const cat of categories) {
      const res = await client.query(
        `INSERT INTO skill_categories (name, icon, description) VALUES ($1, $2, $3) RETURNING id`,
        [cat.name, cat.icon, cat.description]
      );
      catIds[cat.name] = res.rows[0].id;
    }
    console.log('✅ Categories created');

    // --- Skills ---
    const skillsData = [
      { name: 'Java', cat: 'Programming' }, { name: 'Python', cat: 'Programming' },
      { name: 'JavaScript', cat: 'Programming' }, { name: 'React', cat: 'Programming' },
      { name: 'Node.js', cat: 'Programming' }, { name: 'SQL', cat: 'Programming' },
      { name: 'Data Science', cat: 'Programming' }, { name: 'Machine Learning', cat: 'Programming' },
      { name: 'C++', cat: 'Programming' }, { name: 'Swift', cat: 'Programming' },
      { name: 'Photoshop', cat: 'Design' }, { name: 'Illustrator', cat: 'Design' },
      { name: 'Figma', cat: 'Design' }, { name: 'UI/UX Design', cat: 'Design' },
      { name: 'Graphic Design', cat: 'Design' }, { name: 'Video Editing', cat: 'Design' },
      { name: 'Photography', cat: 'Creative' }, { name: 'Digital Marketing', cat: 'Business' },
      { name: 'Excel', cat: 'Business' }, { name: 'Public Speaking', cat: 'Professional' },
      { name: 'Spanish', cat: 'Languages' }, { name: 'French', cat: 'Languages' },
      { name: 'Mandarin', cat: 'Languages' }, { name: 'English Writing', cat: 'Languages' },
      { name: 'Guitar', cat: 'Creative' }, { name: 'Piano', cat: 'Creative' },
      { name: 'Drawing', cat: 'Creative' }, { name: 'Creative Writing', cat: 'Creative' },
      { name: 'Cooking', cat: 'Practical' }, { name: 'Sewing', cat: 'Practical' },
      { name: 'Statistics', cat: 'Academic' }, { name: 'Calculus', cat: 'Academic' },
      { name: 'Essay Writing', cat: 'Academic' }, { name: 'Research Methods', cat: 'Academic' },
      { name: 'Presentation Skills', cat: 'Professional' }, { name: 'Resume Writing', cat: 'Professional' },
    ];
    const skillIds = {};
    for (const s of skillsData) {
      const res = await client.query(
        `INSERT INTO skills (name, category_id) VALUES ($1, $2) RETURNING id`,
        [s.name, catIds[s.cat]]
      );
      skillIds[s.name] = res.rows[0].id;
    }
    console.log('✅ Skills created');

    // --- Interests ---
    const interestList = ['Music', 'Film', 'Travel', 'Gaming', 'Sports', 'Reading', 'Cooking', 'Art', 'Technology', 'Nature', 'Fashion', 'Photography', 'Dance', 'Fitness', 'Volunteering'];
    const interestIds = {};
    for (const name of interestList) {
      const res = await client.query(`INSERT INTO interests (name) VALUES ($1) RETURNING id`, [name]);
      interestIds[name] = res.rows[0].id;
    }
    console.log('✅ Interests created');

    // --- Users ---
    const pw = await bcrypt.hash('password123', 10);
    const adminPw = await bcrypt.hash('admin123', 10);

    const usersData = [
      {
        email: 'admin@skillbridge.edu', password: adminPw, name: 'Admin User', role: 'admin',
        bio: 'Platform administrator.', university: 'SkillBridge University', year: 'Staff',
        major: 'Administration', preferred: 'online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
      },
      {
        email: 'alex.chen@university.edu', password: pw, name: 'Alex Chen', role: 'student',
        bio: 'CS junior who loves building apps and wants to learn design. Coffee addict ☕',
        university: 'State University', year: '3rd Year', major: 'Computer Science',
        preferred: 'both', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex'
      },
      {
        email: 'maya.patel@university.edu', password: pw, name: 'Maya Patel', role: 'student',
        bio: 'Design student passionate about creating beautiful user experiences. Aspiring UX researcher.',
        university: 'State University', year: '2nd Year', major: 'Design',
        preferred: 'online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maya'
      },
      {
        email: 'james.okonkwo@university.edu', password: pw, name: 'James Okonkwo', role: 'student',
        bio: 'Finance & business student. Can help with Excel wizardry and presentations. Learning to code!',
        university: 'State University', year: '4th Year', major: 'Finance',
        preferred: 'in-person', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=james'
      },
      {
        email: 'sofia.garcia@university.edu', password: pw, name: 'Sofia Garcia', role: 'student',
        bio: 'Bilingual Spanish/English speaker. Studying linguistics and learning Mandarin on the side.',
        university: 'State University', year: '2nd Year', major: 'Linguistics',
        preferred: 'both', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sofia'
      },
      {
        email: 'leo.nakamura@university.edu', password: pw, name: 'Leo Nakamura', role: 'student',
        bio: 'Data science enthusiast. I make music in my spare time and want to improve my design skills.',
        university: 'State University', year: '3rd Year', major: 'Data Science',
        preferred: 'online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leo'
      },
      {
        email: 'priya.sharma@university.edu', password: pw, name: 'Priya Sharma', role: 'student',
        bio: 'Passionate about photography and storytelling. Marketing minor. Open to creative collabs!',
        university: 'State University', year: '3rd Year', major: 'Communications',
        preferred: 'both', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya'
      },
      {
        email: 'tom.harris@university.edu', password: pw, name: 'Tom Harris', role: 'student',
        bio: 'Music theory nerd and self-taught guitarist. CS minor. Always up for a coding study session.',
        university: 'State University', year: '1st Year', major: 'Music',
        preferred: 'in-person', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tom'
      },
      {
        email: 'aisha.johnson@university.edu', password: pw, name: 'Aisha Johnson', role: 'student',
        bio: 'Pre-law student with strong writing and research skills. Learning Python for data analysis.',
        university: 'State University', year: '4th Year', major: 'Political Science',
        preferred: 'both', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=aisha'
      },
      {
        email: 'carlos.mendez@university.edu', password: pw, name: 'Carlos Mendez', role: 'student',
        bio: 'Full-stack dev and startup enthusiast. Let\'s build something cool together!',
        university: 'State University', year: '4th Year', major: 'Computer Science',
        preferred: 'online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos'
      },
      {
        email: 'nina.volkov@university.edu', password: pw, name: 'Nina Volkov', role: 'student',
        bio: 'Fine arts student turned digital creator. Photoshop expert, learning web dev.',
        university: 'State University', year: '3rd Year', major: 'Fine Arts',
        preferred: 'both', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nina'
      },
      {
        email: 'daniel.kim@university.edu', password: pw, name: 'Daniel Kim', role: 'student',
        bio: 'Mechanical engineering student who moonlights as a cooking enthusiast and piano player.',
        university: 'State University', year: '2nd Year', major: 'Mechanical Engineering',
        preferred: 'in-person', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=daniel'
      },
      {
        email: 'fatima.ali@university.edu', password: pw, name: 'Fatima Ali', role: 'student',
        bio: 'Public health student with a knack for statistics and research. Learning graphic design.',
        university: 'State University', year: '3rd Year', major: 'Public Health',
        preferred: 'online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fatima'
      },
    ];

    const userIds = {};
    for (const u of usersData) {
      const res = await client.query(
        `INSERT INTO users (email, password_hash, name, role, bio, university, year_of_study, major, preferred_interaction, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [u.email, u.password, u.name, u.role, u.bio, u.university, u.year, u.major, u.preferred, u.avatar]
      );
      userIds[u.email] = res.rows[0].id;
    }
    console.log('✅ Users created');

    // --- User Skills (CAN TEACH) ---
    const userSkillsData = [
      // Alex: Java, Python, Node.js. Wants: Photoshop, Figma
      { user: 'alex.chen@university.edu', skill: 'Java', prof: 'advanced' },
      { user: 'alex.chen@university.edu', skill: 'Python', prof: 'intermediate' },
      { user: 'alex.chen@university.edu', skill: 'Node.js', prof: 'intermediate' },
      // Maya: Photoshop, Figma, UI/UX Design. Wants: Java, JavaScript
      { user: 'maya.patel@university.edu', skill: 'Photoshop', prof: 'advanced' },
      { user: 'maya.patel@university.edu', skill: 'Figma', prof: 'advanced' },
      { user: 'maya.patel@university.edu', skill: 'UI/UX Design', prof: 'intermediate' },
      // James: Excel, Public Speaking, Presentation Skills. Wants: Python, Data Science
      { user: 'james.okonkwo@university.edu', skill: 'Excel', prof: 'advanced' },
      { user: 'james.okonkwo@university.edu', skill: 'Public Speaking', prof: 'advanced' },
      { user: 'james.okonkwo@university.edu', skill: 'Presentation Skills', prof: 'intermediate' },
      // Sofia: Spanish, English Writing. Wants: Mandarin, Photoshop
      { user: 'sofia.garcia@university.edu', skill: 'Spanish', prof: 'advanced' },
      { user: 'sofia.garcia@university.edu', skill: 'English Writing', prof: 'advanced' },
      // Leo: Python, Data Science, Machine Learning. Wants: Graphic Design, Guitar
      { user: 'leo.nakamura@university.edu', skill: 'Python', prof: 'advanced' },
      { user: 'leo.nakamura@university.edu', skill: 'Data Science', prof: 'advanced' },
      { user: 'leo.nakamura@university.edu', skill: 'Machine Learning', prof: 'intermediate' },
      // Priya: Photography, Digital Marketing. Wants: Figma, Video Editing
      { user: 'priya.sharma@university.edu', skill: 'Photography', prof: 'advanced' },
      { user: 'priya.sharma@university.edu', skill: 'Digital Marketing', prof: 'intermediate' },
      // Tom: Guitar, Piano. Wants: Python, JavaScript
      { user: 'tom.harris@university.edu', skill: 'Guitar', prof: 'advanced' },
      { user: 'tom.harris@university.edu', skill: 'Piano', prof: 'intermediate' },
      // Aisha: Essay Writing, Research Methods, English Writing. Wants: Python, Statistics
      { user: 'aisha.johnson@university.edu', skill: 'Essay Writing', prof: 'advanced' },
      { user: 'aisha.johnson@university.edu', skill: 'Research Methods', prof: 'advanced' },
      { user: 'aisha.johnson@university.edu', skill: 'English Writing', prof: 'advanced' },
      // Carlos: JavaScript, React, Node.js, Python. Wants: UI/UX Design, Photography
      { user: 'carlos.mendez@university.edu', skill: 'JavaScript', prof: 'advanced' },
      { user: 'carlos.mendez@university.edu', skill: 'React', prof: 'advanced' },
      { user: 'carlos.mendez@university.edu', skill: 'Node.js', prof: 'advanced' },
      // Nina: Photoshop, Illustrator, Graphic Design, Drawing. Wants: JavaScript, React
      { user: 'nina.volkov@university.edu', skill: 'Photoshop', prof: 'advanced' },
      { user: 'nina.volkov@university.edu', skill: 'Illustrator', prof: 'advanced' },
      { user: 'nina.volkov@university.edu', skill: 'Graphic Design', prof: 'advanced' },
      { user: 'nina.volkov@university.edu', skill: 'Drawing', prof: 'intermediate' },
      // Daniel: Cooking, Piano, Calculus. Wants: Photoshop, Guitar
      { user: 'daniel.kim@university.edu', skill: 'Cooking', prof: 'advanced' },
      { user: 'daniel.kim@university.edu', skill: 'Piano', prof: 'intermediate' },
      { user: 'daniel.kim@university.edu', skill: 'Calculus', prof: 'advanced' },
      // Fatima: Statistics, Research Methods, Excel. Wants: Graphic Design, Public Speaking
      { user: 'fatima.ali@university.edu', skill: 'Statistics', prof: 'advanced' },
      { user: 'fatima.ali@university.edu', skill: 'Research Methods', prof: 'intermediate' },
      { user: 'fatima.ali@university.edu', skill: 'Excel', prof: 'intermediate' },
    ];
    for (const us of userSkillsData) {
      await client.query(
        `INSERT INTO user_skills (user_id, skill_id, proficiency) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [userIds[us.user], skillIds[us.skill], us.prof]
      );
    }
    console.log('✅ User skills created');

    // --- Learning Goals (WANT TO LEARN) ---
    const learningGoalsData = [
      { user: 'alex.chen@university.edu', skill: 'Photoshop' },
      { user: 'alex.chen@university.edu', skill: 'Figma' },
      { user: 'maya.patel@university.edu', skill: 'Java' },
      { user: 'maya.patel@university.edu', skill: 'JavaScript' },
      { user: 'james.okonkwo@university.edu', skill: 'Python' },
      { user: 'james.okonkwo@university.edu', skill: 'Data Science' },
      { user: 'sofia.garcia@university.edu', skill: 'Mandarin' },
      { user: 'sofia.garcia@university.edu', skill: 'Photoshop' },
      { user: 'leo.nakamura@university.edu', skill: 'Graphic Design' },
      { user: 'leo.nakamura@university.edu', skill: 'Guitar' },
      { user: 'priya.sharma@university.edu', skill: 'Figma' },
      { user: 'priya.sharma@university.edu', skill: 'Video Editing' },
      { user: 'tom.harris@university.edu', skill: 'Python' },
      { user: 'tom.harris@university.edu', skill: 'JavaScript' },
      { user: 'aisha.johnson@university.edu', skill: 'Python' },
      { user: 'aisha.johnson@university.edu', skill: 'Statistics' },
      { user: 'carlos.mendez@university.edu', skill: 'UI/UX Design' },
      { user: 'carlos.mendez@university.edu', skill: 'Photography' },
      { user: 'nina.volkov@university.edu', skill: 'JavaScript' },
      { user: 'nina.volkov@university.edu', skill: 'React' },
      { user: 'daniel.kim@university.edu', skill: 'Photoshop' },
      { user: 'daniel.kim@university.edu', skill: 'Guitar' },
      { user: 'fatima.ali@university.edu', skill: 'Graphic Design' },
      { user: 'fatima.ali@university.edu', skill: 'Public Speaking' },
    ];
    for (const lg of learningGoalsData) {
      await client.query(
        `INSERT INTO user_learning_goals (user_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userIds[lg.user], skillIds[lg.skill]]
      );
    }
    console.log('✅ Learning goals created');

    // --- User Interests ---
    const userInterestsData = [
      { user: 'alex.chen@university.edu', interests: ['Technology', 'Gaming', 'Music'] },
      { user: 'maya.patel@university.edu', interests: ['Art', 'Travel', 'Photography'] },
      { user: 'james.okonkwo@university.edu', interests: ['Sports', 'Reading', 'Technology'] },
      { user: 'sofia.garcia@university.edu', interests: ['Travel', 'Music', 'Dance'] },
      { user: 'leo.nakamura@university.edu', interests: ['Music', 'Technology', 'Film'] },
      { user: 'priya.sharma@university.edu', interests: ['Photography', 'Travel', 'Fashion'] },
      { user: 'tom.harris@university.edu', interests: ['Music', 'Gaming', 'Film'] },
      { user: 'aisha.johnson@university.edu', interests: ['Reading', 'Volunteering', 'Travel'] },
      { user: 'carlos.mendez@university.edu', interests: ['Technology', 'Fitness', 'Cooking'] },
      { user: 'nina.volkov@university.edu', interests: ['Art', 'Photography', 'Film'] },
      { user: 'daniel.kim@university.edu', interests: ['Cooking', 'Music', 'Nature'] },
      { user: 'fatima.ali@university.edu', interests: ['Volunteering', 'Reading', 'Fitness'] },
    ];
    for (const ui of userInterestsData) {
      for (const interest of ui.interests) {
        if (interestIds[interest]) {
          await client.query(
            `INSERT INTO user_interests (user_id, interest_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [userIds[ui.user], interestIds[interest]]
          );
        }
      }
    }
    console.log('✅ User interests created');

    // --- Learning Requests ---
    // Alex → Maya: wants to learn Photoshop (exchange: Maya wants Java)
    const req1 = await client.query(
      `INSERT INTO learning_requests (sender_id, receiver_id, skill_id, request_type, message, status)
       VALUES ($1, $2, $3, 'exchange', $4, 'accepted') RETURNING id`,
      [userIds['alex.chen@university.edu'], userIds['maya.patel@university.edu'], skillIds['Photoshop'],
       "Hi Maya! I'd love to learn Photoshop from you. I can teach you Java in return — I saw you want to learn it!"]
    );
    // Tom → Leo: wants to learn Python
    const req2 = await client.query(
      `INSERT INTO learning_requests (sender_id, receiver_id, skill_id, request_type, message, status)
       VALUES ($1, $2, $3, 'learn', $4, 'accepted') RETURNING id`,
      [userIds['tom.harris@university.edu'], userIds['leo.nakamura@university.edu'], skillIds['Python'],
       "Hey Leo! I'm just getting started with Python — would love to learn from you!"]
    );
    // Carlos → Nina: wants to exchange (Carlos teaches React, Nina wants React; Nina teaches Graphic Design, Carlos wants UI/UX)
    const req3 = await client.query(
      `INSERT INTO learning_requests (sender_id, receiver_id, skill_id, request_type, message, status)
       VALUES ($1, $2, $3, 'exchange', $4, 'pending') RETURNING id`,
      [userIds['carlos.mendez@university.edu'], userIds['nina.volkov@university.edu'], skillIds['JavaScript'],
       "Hi Nina! I can teach you React/JS and you could help me with graphic design. Perfect exchange?"]
    );
    // Fatima → James: wants to learn Public Speaking
    const req4 = await client.query(
      `INSERT INTO learning_requests (sender_id, receiver_id, skill_id, request_type, message, status)
       VALUES ($1, $2, $3, 'learn', $4, 'pending') RETURNING id`,
      [userIds['fatima.ali@university.edu'], userIds['james.okonkwo@university.edu'], skillIds['Public Speaking'],
       "Hi James! I need help improving my public speaking for my thesis defense. Could you help me?"]
    );
    // Aisha → Leo: wants to learn Statistics
    const req5 = await client.query(
      `INSERT INTO learning_requests (sender_id, receiver_id, skill_id, request_type, message, status)
       VALUES ($1, $2, $3, 'learn', $4, 'declined') RETURNING id`,
      [userIds['aisha.johnson@university.edu'], userIds['leo.nakamura@university.edu'], skillIds['Statistics'],
       "Hi Leo, I need stats help for my research paper. Are you available?"]
    );
    console.log('✅ Learning requests created');

    // --- Sessions ---
    // Alex + Maya: completed session
    const sess1 = await client.query(
      `INSERT INTO sessions (request_id, proposer_id, participant_id, skill_id, scheduled_date, scheduled_time, duration_minutes, interaction_type, location_or_link, notes, status, proposer_completed, participant_completed)
       VALUES ($1, $2, $3, $4, '2026-08-20', '14:00', 90, 'online', 'https://meet.google.com/abc-def-ghi', 'Bring your Photoshop files!', 'completed', true, true) RETURNING id`,
      [req1.rows[0].id, userIds['alex.chen@university.edu'], userIds['maya.patel@university.edu'], skillIds['Photoshop']]
    );
    // Tom + Leo: upcoming confirmed session
    const sess2 = await client.query(
      `INSERT INTO sessions (request_id, proposer_id, participant_id, skill_id, scheduled_date, scheduled_time, duration_minutes, interaction_type, location_or_link, notes, status)
       VALUES ($1, $2, $3, $4, '2026-09-15', '16:00', 60, 'online', 'https://zoom.us/j/123456789', 'We will start with Python basics.', 'confirmed') RETURNING id`,
      [req2.rows[0].id, userIds['leo.nakamura@university.edu'], userIds['tom.harris@university.edu'], skillIds['Python']]
    );
    console.log('✅ Sessions created');

    // Update completed session counts
    await client.query(`UPDATE users SET completed_sessions = 1 WHERE id = $1`, [userIds['alex.chen@university.edu']]);
    await client.query(`UPDATE users SET completed_sessions = 1 WHERE id = $1`, [userIds['maya.patel@university.edu']]);

    // --- Reviews ---
    await client.query(
      `INSERT INTO reviews (session_id, reviewer_id, reviewee_id, rating, comment) VALUES ($1, $2, $3, 5, $4)`,
      [sess1.rows[0].id, userIds['alex.chen@university.edu'], userIds['maya.patel@university.edu'],
       'Maya is an incredible teacher! She explained Photoshop concepts so clearly and was super patient. Highly recommend!']
    );
    await client.query(
      `INSERT INTO reviews (session_id, reviewer_id, reviewee_id, rating, comment) VALUES ($1, $2, $3, 5, $4)`,
      [sess1.rows[0].id, userIds['maya.patel@university.edu'], userIds['alex.chen@university.edu'],
       'Alex is a great Java mentor! Very structured and explains things step by step. Looking forward to more sessions.']
    );
    // Update ratings
    await client.query(`UPDATE users SET average_rating = 5.0, rating_count = 1 WHERE id = $1`, [userIds['alex.chen@university.edu']]);
    await client.query(`UPDATE users SET average_rating = 5.0, rating_count = 1 WHERE id = $1`, [userIds['maya.patel@university.edu']]);
    console.log('✅ Reviews created');

    await client.query('COMMIT');
    console.log('');
    console.log('🎉 Seed completed successfully!');
    console.log('');
    console.log('📋 Demo Credentials:');
    console.log('  Admin:   admin@skillbridge.edu / admin123');
    console.log('  Student: alex.chen@university.edu / password123');
    console.log('  Student: maya.patel@university.edu / password123');
    console.log('  Student: carlos.mendez@university.edu / password123');
    console.log('  (all students use: password123)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
