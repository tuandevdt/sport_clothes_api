const Favorite = require('../model/model_favorite');
const Product = require('../model/model_product');
const SaleProduct = require('../model/model_sale_product');
const Comment = require('../model/model_comment');
const mongoose = require('mongoose');

// Lấy toàn bộ danh sách sản phẩm yêu thích
exports.getAllFavorites = async (req, res) => {
    try {
        console.log('Getting all favorites...');

        //Lấy toàn bộ dữ liệu favorite trong DB
        const favorites = await Favorite.find().sort({ createdAt: -1 });

        console.log('Found favorites:', favorites.length);

        //Trả về JSON cho client
        res.json(favorites);
    } catch (error) {
        console.error('Get all favorites error:', error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách yêu thích', error: error.message });
    }
};

// Lấy danh sách sản phẩm yêu thích của user
exports.getUserFavorites = async (req, res) => {
    try {
        //userId lấy từ URL params
        const { userId } = req.params;

        console.log('Kiểm tra danh sách yêu thích của user:', userId);

        //Kiểm tra xem userId có phải ObjectId hợp lệ không
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.warn('ID người dùng không hợp lệ:', userId);
            return res.status(400).json({ message: 'ID người dùng không hợp lệ' });
        }

        //Lấy tất cả favorite của user sắp xếp theo mới nhất
        const favorites = await Favorite.find({ userId }).sort({ createdAt: -1 });
        console.log(`Tổng số bản ghi favorite tìm được: ${favorites.length}`);


        const validFavorites = await Promise.all(
            favorites.map(async (fav) => {
                //Lấy type để xác định sản phẩm là sale hay normal
                const type = fav.type || 'normal';

                //Lấy sản phẩm tương ứng từ DB
                let product;
                if (type === 'sale') {
                    product = await SaleProduct.findById(fav.productId);
                } else {
                    product = await Product.findById(fav.productId);
                }

                //Nếu sản phẩm đã bị xoá - xoá luôn favorite
                if (!product) {
                    console.warn(`Sản phẩm đã bị xoá (productId: ${fav.productId}) => Xoá luôn favorite`);
                    await Favorite.findByIdAndDelete(fav._id);
                    return null;
                }

                //Nếu sản phẩm tồn tại - trả về object favorite kèm thông tin cơ bản của product
                return {
                    _id: fav._id,
                    userId: fav.userId,
                    productId: fav.productId,
                    type: type,
                    product: {
                        _id: product._id,
                        name: product.name,
                        price: type === 'sale' ? product.discount_price : product.price,
                        image: product.images?.[0] || '',
                    },
                };
            })
        );

        //Loại bỏ những favorite null (sản phẩm bị xoá) - 
        const filtered = validFavorites.filter((f) => f !== null);

        //trả về JSON cho client
        res.json(filtered);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách yêu thích:', error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách yêu thích', error: error.message });
    }
};

// Thêm sản phẩm vào yêu thích
exports.addToFavorites = async (req, res) => {
    try {
        //Lấy userId, productId, type từ request body - type mặc định là 'normal'
        const { userId, productId, type = 'normal' } = req.body;

        console.log('== ADD TO FAVORITES ==');
        console.log('userId:', userId, '| valid?', mongoose.Types.ObjectId.isValid(userId));
        console.log('productId:', productId, '| valid?', mongoose.Types.ObjectId.isValid(productId));
        console.log('type:', type);

        //Kiểm tra ObjectId hợp lệ
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }


        //Lấy sản phẩm tương ứng theo type
        let product;
        if (type === 'sale') {
            product = await SaleProduct.findById(productId);
        } else {
            product = await Product.findById(productId);
        }

        console.log('Found product:', !!product);

        //Nếu không tìm thấy - trả 404
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }

        //Kiểm tra xem user đã có favorite này chưa - Nếu có => trả lỗi 400
        const existingFavorite = await Favorite.findOne({ userId, productId });
        if (existingFavorite) {
            return res.status(400).json({ message: 'Sản phẩm đã có trong danh sách yêu thích' });
        }

        //Tạo document mới trong collection Favorite và lưu vào DB
        const newFavorite = new Favorite({
            userId,
            productId,
            type,
            product: {
                name: product.name,
                price: product.price,
                image: product.images && product.images.length > 0 ? product.images[0] : '',
            }
        });

        await newFavorite.save();
        console.log('✅ New favorite saved:', newFavorite._id);
        res.status(201).json(newFavorite);
    } catch (error) {
        console.error('Add to favorites error:', error);
        res.status(500).json({ message: 'Lỗi khi thêm vào yêu thích', error: error.message });
    }
};

// Xóa sản phẩm khỏi yêu thích
exports.removeFromFavorites = async (req, res) => {
    try {
        //Lấy userId và productId từ URL params
        const { userId, productId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }

        //Tìm và xoá favorite tương ứng
        const result = await Favorite.findOneAndDelete({ userId, productId });

        if (!result) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong danh sách yêu thích' });
        }

        res.json({ message: 'Đã xóa khỏi danh sách yêu thích' });
    } catch (error) {
        console.error('Remove from favorites error:', error);
        res.status(500).json({ message: 'Lỗi khi xóa khỏi yêu thích', error: error.message });
    }
};

// Kiểm tra sản phẩm có trong yêu thích không
exports.checkFavorite = async (req, res) => {
    try {
        ////Lấy userId và productId từ URL params
        const { userId, productId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }

        //Tìm favorite của user với product
        const favorite = await Favorite.findOne({ userId, productId });

        //Chuyển object thành boolean (true nếu tồn tại, false nếu null)
        res.json({ isFavorite: !!favorite });
    } catch (error) {
        console.error('Check favorite error:', error);
        res.status(500).json({ message: 'Lỗi khi kiểm tra yêu thích', error: error.message });
    }
};

// Lấy chi tiết sản phẩm kèm trạng thái yêu thích và bình luận
exports.getProductDetailWithFavoriteAndComments = async (req, res) => {
    try {
        //Lấy productId, userId, type từ params
        const { productId, userId, type = 'normal' } = req.params;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'ID sản phẩm không hợp lệ' });
        }

        //Lấy sản phẩm tương ứng theo type
        let product;
        if (type === 'sale') {
            product = await SaleProduct.findById(productId);
        } else {
            product = await Product.findById(productId);
        }

        console.log('Found product:', !!product);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }

        //Kiểm tra sản phẩm có thuộc yêu thích của user không.
        let isFavorite = false;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const favorite = await Favorite.findOne({ userId, productId });
            isFavorite = !!favorite;
        }

        //Lấy danh sách comment theo productId, sắp xếp mới nhất lên đầu.
        const comments = await Comment.find({ productId }).sort({ createdAt: -1 });

        res.json({ product, isFavorite, comments });
    } catch (error) {
        console.error('Get product detail error:', error);
        res.status(500).json({ message: 'Lỗi khi lấy chi tiết sản phẩm', error: error.message });
    }
};