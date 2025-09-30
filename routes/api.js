const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const userController = require('../controller/controller_user');
const categoryController = require('../controller/controller_categorie');
const productController = require('../controller/controller_product');
const saleProductController = require('../controller/controller_sale_product');
const favoriteController = require('../controller/controller_favorite');

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


// Product routes
// linl : http://localhost:3002/api/products
router.get('/products', productController.getAllProducts);  
// linl : http://localhost:3002/api/products/:id     // lấy chi  tiết sản phẩm
router.get('/products/:id', productController.getProductById);
// linl : http://localhost:3002/api/products/add
router.post('/products/add', productController.createProduct);
// linl : http://localhost:3002/api/products/:id
router.put('/products/:id', productController.updateProduct);     
// linl : http://localhost:3002/api/products/:id
router.delete('/products/:id',productController.deleteProduct);
// linl : http://localhost:3002/api/products/search
router.get('/products/search', productController.searchProducts);
// linl : http://localhost:3002/api/products/category/:categoryCode
router.get('/products/category/:categoryCode', productController.getProductsByCategory);
// linl : http://localhost:3002/api/products/:id/stock
router.put('/products/:id/stock', productController.updateStock);
// link: http://localhost:3001/api/products/:productId/detail/:userId
router.get('/products/:productId/detail/:userId', favoriteController.getProductDetailWithFavoriteAndComments);

// của bình luộn
// linl : http://localhost:3002/api/products/:id/detail
router.get('/products/:id/detail', productController.getProductDetailWithComments);
// link: http://localhost:3002/api/sale-products/:id/detail
router.get('/sale-products/:id/detail', saleProductController.getSaleProductDetailWithComments);

// Sale Product routes
// link: http://localhost:3002/api/sale-products
router.get('/sale-products', saleProductController.getAllSaleProducts);
// link: http://localhost:3002/api/sale-products/:id
router.get('/sale-products/:id', saleProductController.getSaleProductById);
// link: http://localhost:3002/api/sale-products/add
router.post('/sale-products/add', saleProductController.createSaleProduct);
// link: http://localhost:3002/api/sale-products/:id
router.put('/sale-products/:id', saleProductController.updateSaleProduct);
// link: http://localhost:3002/api/sale-products/:id
router.delete('/sale-products/:id', saleProductController.deleteSaleProduct);
// link: http://localhost:3002/api/sale-products/search
router.get('/sale-products/search', saleProductController.searchSaleProducts);
// link: http://localhost:3002/api/sale-products/category/:categoryCode
router.get('/sale-products/category/:categoryCode', saleProductController.getSaleProductsByCategory);
// link: http://localhost:3002/api/sale-products/top-discount
router.get('/sale-products/top-discount', saleProductController.getTopDiscountProducts);
// link: http://localhost:3002/api/sale-products/:id/discount-status
router.put('/sale-products/:id/discount-status', saleProductController.updateDiscountStatus);
// link: http://localhost:3002/api/sale-products/:id/sold
router.put('/sale-products/:id/sold', saleProductController.updateSoldCount);
// link: http://localhost:3002/api/sale-products/best-selling
router.get('/sale-products/best-selling', saleProductController.getBestSellingProducts);

// Comment routes
// link: http://localhost:3001/api/comments/:productId (lấy tất cả comment của sản phẩm)
router.get('/comments/:productId', commentController.getProductDetailWithComments);
// link: http://localhost:3001/api/comments/add (thêm comment mới)
router.post('/comments/add', commentController.createComment);
//(thêm nhiều comment mới)
router.post('/comments/add-multi', commentController.createMultipleComments);

// Favorite routes
// lấy toàn bộ danh sách sản phẩm yêu thích
// link: http://localhost:3001/api/favorites
router.get('/favorites', favoriteController.getAllFavorites);
// link: http://localhost:3001/api/favorites/:userId
router.get('/favorites/:userId', favoriteController.getUserFavorites);
// link: http://localhost:3001/api/favorites/add
router.post('/favorites/add', favoriteController.addToFavorites);
// link: http://localhost:3001/api/favorites/:userId/:productId
router.delete('/favorites/:userId/:productId', favoriteController.removeFromFavorites);
// link: http://localhost:3001/api/favorites/check/:userId/:productId
router.get('/favorites/check/:userId/:productId', favoriteController.checkFavorite);
// link: http://localhost:3001/api/products/:productId/detail/:userId
router.get('/products/:productId/detail/:userId', favoriteController.getProductDetailWithFavoriteAndComments);


// Cart routes
// link: http://localhost:3002/api/carts
router.get('/carts', cartController.getAllCarts);
router.put('/carts/:user_id/item', cartController.updateItemQuantity);
router.delete('/carts/:user_id/item', cartController.deleteItemFromCart);
router.delete('/carts/:user_id', cartController.deleteCartByUserId);
// link: http://localhost:3002/api/carts/id/:id
router.get('/carts/id/:id', cartController.getCartById);
router.post('/carts/add', cartController.addToCart);
router.put('/carts/upsert', cartController.upsertCart);

router.get('/carts/:user_id', cartController.getCartByUserId);

module.exports = router;
