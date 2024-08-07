var express = require('express');
var router = express.Router();
var { register } = require('../controllers/auth.js')

// USSD authentication
router.post('/', register);

module.exports = router;