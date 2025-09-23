const express = require('express');
const router = express.Router();

const userController = require('../controller/controller_user');
const categoryController = require('../controller/controller_categorie');


// linl : http://localhost:3002/api/register
router.post('/register', userController.register);
// linl : http://localhost:3002/api/login           
router.post('/login', userController.login);
// linl : http://localhost:3002/api/profile
router.get('/profile', auth, userController.getProfile);
// linl : http://localhost:3002/api/profile
router.put('/profile', auth, userController.updateProfile);
// linl : http://localhost:3002/api/profile/field
router.put('/profile/field', auth, userController.updateField);
// linl : http://localhost:3002/api/change-password
router.put('/change-password', auth, userController.changePassword);
// linl : http://localhost:3002/api/users
router.get('/users', userController.getAllUsers);
// linl : http://localhost:3002/api/users/:id
router.get('/users/:id', userController.getUserById);
// linl : http://localhost:3002/api/users/:id
router.put('/users/:id', userController.updateUserById);
// linl : http://localhost:3002/api/users/:id
router.delete('/users/:id', userController.deleteUser);
// linl : http://localhost:3002/api/reset-password
router.post('/reset-password', userController.resetPassword);
// linl : http://localhost:3002/api/logout
router.post('/logout', userController.logout);

// Category routes
// linl : http://localhost:3001/api/categories
router.get('/categories', categoryController.getAllCategories);
// linl : http://localhost:3001/api/categories/code/:code
router.get('/categories/code/:code', categoryController.getCategoryByCode);
// linl : http://localhost:3001/api/categories/:id
router.get('/categories/:id', categoryController.getCategoryById);
// linl : http://localhost:3001/api/categories/add
router.post('/categories/add', categoryController.createCategory);
// linl : http://localhost:3001/api/categories/:id
router.put('/categories/:id', categoryController.updateCategory);
// linl : http://localhost:3001/api/categories/:id
router.delete('/categories/:id', categoryController.deleteCategory);


module.exports = router;
