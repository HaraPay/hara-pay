var express = require('express');
var router = express.Router();
var { ussdCallback } = require('../controllers/ussd.js')

// USSD authentication
router.post('/', ussdCallback);

module.exports = router;