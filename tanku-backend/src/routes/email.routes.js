const express = require('express');
const { testEmail } = require('../controllers/email.controller');

const router = express.Router();

router.post('/test', testEmail);

module.exports = router;
