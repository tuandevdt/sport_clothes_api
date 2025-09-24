const Product = require('../model/model_product');
const Comment = require('../model/model_comment');
const { Types } = require('mongoose'); // dùng để convert _id về ObjectId

// Lấy danh sách sản phẩm
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        console.error('Get all products error:', error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách sản phẩm', error: error.message });
    }
};

// Lấy chi tiết sản phẩm theo ID
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra xem ID có hợp lệ không
        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 400,
                message: "ID không hợp lệ",
                data: []
            });
        }

        // Chuyển ID thành ObjectId
        const objectId = new Types.ObjectId(id);

        // Tìm sản phẩm theo ObjectId
        const result = await Product.findById(objectId);

        if (result) {
            res.json({
                status: 200,
                message: "Đã tìm thấy ID",
                data: result
            });
        } else {
            res.json({
                status: 400,
                message: "Không tìm thấy ID",
                data: []
            });
        }
    } catch (error) {
        console.error('Get product error:', error);
        if (error.name === 'CastError') {
            res.status(404).send('Invalid ID format');
        } else {
            res.status(500).send('Lỗi server');
        }
    }
};

// Tạo sản phẩm mới
exports.createProduct = async (req, res) => {
    try {
        const { name, price, stock, sold, description, images, size, colors, categoryCode } = req.body;

        if (!name || !price || !stock || !description || !images || !Array.isArray(images) || !size || !Array.isArray(size) || !categoryCode) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin sản phẩm, images, size và categoryCode hợp lệ' });
        }

        // Validate images array
        if (images.length === 0) {
            return res.status(400).json({ message: 'Sản phẩm phải có ít nhất một hình ảnh' });
        }

        // Validate colors if provided
        if (colors && Array.isArray(colors)) {
            const validColors = ['Đen', 'Trắng', 'Xanh'];
            const invalidColors = colors.filter(color => !validColors.includes(color));
            if (invalidColors.length > 0) {
                return res.status(400).json({ 
                    message: 'Màu sắc không hợp lệ', 
                    invalidColors,
                    validColors 
                });
            }
        }

        const product = new Product({ 
            name, 
            price, 
            stock, 
            sold: sold || 0, 
            description, 
            images, 
            size, 
            colors, 
            categoryCode 
        });
        const savedProduct = await product.save();

        res.status(201).json({ message: 'Tạo sản phẩm thành công', product: savedProduct });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ message: 'Lỗi khi tạo sản phẩm', error: error.message });
    }
};

// Cập nhật sản phẩm
exports.updateProduct = async (req, res) => {
    try {
        const { name, price, stock, sold, description, images, size, colors, categoryCode } = req.body;
        const objectId = new Types.ObjectId(req.params.id);

        const product = await Product.findById(objectId);
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });

        if (price !== undefined && price <= 0) {
            return res.status(400).json({ message: 'Giá sản phẩm phải lớn hơn 0' });
        }

        if (stock !== undefined && stock < 0) {
            return res.status(400).json({ message: 'Số lượng tồn kho không được âm' });
        }

        if (sold !== undefined && sold < 0) {
            return res.status(400).json({ message: 'Số lượng đã bán không được âm' });
        }

        if (name && name !== product.name) {
            const existingProduct = await Product.findOne({ name });
            if (existingProduct) {
                return res.status(400).json({ message: 'Sản phẩm với tên này đã tồn tại' });
            }
        }

        // Validate images array if provided
        if (images && Array.isArray(images)) {
            if (images.length === 0) {
                return res.status(400).json({ message: 'Sản phẩm phải có ít nhất một hình ảnh' });
            }
        }

        // Validate colors if provided
        if (colors && Array.isArray(colors)) {
            const validColors = ['Đen', 'Trắng', 'Xanh'];
            const invalidColors = colors.filter(color => !validColors.includes(color));
            if (invalidColors.length > 0) {
                return res.status(400).json({ 
                    message: 'Màu sắc không hợp lệ', 
                    invalidColors,
                    validColors 
                });
            }
        }

        if (name) product.name = name;
        if (price !== undefined) product.price = price;
        if (stock !== undefined) product.stock = stock;
        if (sold !== undefined) product.sold = sold;
        if (description) product.description = description;
        if (images && Array.isArray(images)) product.images = images;
        if (size && Array.isArray(size)) product.size = size;
        if (colors && Array.isArray(colors)) product.colors = colors;
        if (categoryCode) product.categoryCode = categoryCode;

        const updatedProduct = await product.save();
        res.json({ message: 'Cập nhật sản phẩm thành công', product: updatedProduct });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ message: 'Lỗi khi cập nhật sản phẩm', error: error.message });
    }
};

// Xóa sản phẩm
exports.deleteProduct = async (req, res) => {
    try {
        const objectId = new Types.ObjectId(req.params.id);
        const product = await Product.findByIdAndDelete(objectId);
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });

        res.json({ message: 'Xóa sản phẩm thành công' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ message: 'Lỗi khi xóa sản phẩm', error: error.message });
    }
};