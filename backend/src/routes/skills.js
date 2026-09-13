const express = require('express');
const router = express.Router();
const {
  getCategories, getSkills,
  getMyTeachingSkills, getMyLearningGoals,
  addTeachingSkill, updateTeachingSkill, removeTeachingSkill,
  addLearningGoal, removeLearningGoal,
} = require('../controllers/skillController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

const teachSkillValidator = [
  body('proficiency').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid proficiency.'),
];

router.get('/categories', getCategories);
router.get('/', getSkills);

router.get('/my/teaching', authenticate, getMyTeachingSkills);
router.get('/my/learning', authenticate, getMyLearningGoals);

router.post('/my/teaching', authenticate, teachSkillValidator, addTeachingSkill);
router.put('/my/teaching/:id', authenticate, updateTeachingSkill);
router.delete('/my/teaching/:id', authenticate, removeTeachingSkill);

router.post('/my/learning', authenticate, addLearningGoal);
router.delete('/my/learning/:id', authenticate, removeLearningGoal);

module.exports = router;
