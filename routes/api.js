const express = require('express');
const router = express.Router();

const userController = require('../controller/controller_user');

// linl : http://localhost:3002/api/register
router.post('/register', userController.register);
// linl : http://localhost:3002/api/login           
router.post('/login', userController.login);
// linl : http://localhost:3002/api/logout
router.post('/logout', userController.logout);

module.exports = router;
