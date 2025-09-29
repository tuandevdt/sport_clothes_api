const SaleProduct = require('../model/model_sale_product');
const Comment = require('../model/model_comment');
const { Types } = require('mongoose');

// Lấy danh sách tất cả sản phẩm khuyến mãi
exports.getAllSaleProducts = async (req, res) => {
    try {
      const saleProducts = await SaleProduct.find();
      res.json(saleProducts);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi khi lấy danh sách sản phẩm khuyến mãi', error: error.message });
    }
  };

// Lấy chi tiết sản phẩm khuyến mãi theo ID
exports.getSaleProductById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 400,
                message: "ID không hợp lệ",
                data: null
            });
        }

        const objectId = new Types.ObjectId(id);
        const result = await SaleProduct.findById(objectId);

        if (result) {
            res.json({
                status: 200,
                message: "Đã tìm thấy sản phẩm khuyến mãi",
                data: result
            });
        } else {
            res.status(404).json({
                status: 404,
                message: "Không tìm thấy sản phẩm khuyến mãi",
                data: null
            });
        }
    } catch (error) {
        console.error('Get sale product error:', error);
        res.status(500).json({
            status: 500,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Tạo sản phẩm khuyến mãi mới
exports.createSaleProduct = async (req, res) => {
    try {
        const {
            name,
            price,
            discount_percent,
            stock,
            sold = 0,
            description,
            images,
            size,
            colors,
            categoryCode,
            isDiscount = true
        } = req.body;

        // Validation
        if (!name || !price || !discount_percent || !stock || !description || !images || !Array.isArray(images) || !categoryCode) {
            return res.status(400).json({
                status: 400,
                message: 'Vui lòng nhập đầy đủ thông tin sản phẩm khuyến mãi'
            });
        }

        // Validate images array
        if (images.length === 0) {
            return res.status(400).json({
                status: 400,
                message: 'Sản phẩm phải có ít nhất một hình ảnh'
            });
        }

        if (price <= 0) {
            return res.status(400).json({
                status: 400,
                message: 'Giá sản phẩm phải lớn hơn 0'
            });
        }

        if (discount_percent < 0 || discount_percent > 100) {
            return res.status(400).json({
                status: 400,
                message: 'Phần trăm giảm giá phải từ 0 đến 100'
            });
        }

        if (stock < 0) {
            return res.status(400).json({
                status: 400,
                message: 'Số lượng tồn kho không được âm'
            });
        }

        if (sold < 0) {
            return res.status(400).json({
                status: 400,
                message: 'Số lượng đã bán không được âm'
            });
        }

        // Validate size
        if (size && Array.isArray(size)) {
            const validSizes = ['S', 'M', 'L', 'XL'];
            const invalidSizes = size.filter(s => !validSizes.includes(s));
            if (invalidSizes.length > 0) {
                return res.status(400).json({
                    status: 400,
                    message: 'Kích thước không hợp lệ',
                    invalidSizes,
                    validSizes
                });
            }
        }

        // Validate colors
        if (colors && Array.isArray(colors)) {
            const validColors = ['Đen', 'Trắng', 'Xanh'];
            const invalidColors = colors.filter(color => !validColors.includes(color));
            if (invalidColors.length > 0) {
                return res.status(400).json({
                    status: 400,
                    message: 'Màu sắc không hợp lệ',
                    invalidColors,
                    validColors
                });
            }
        }

        // Tính discount_price
        const discount_price = Math.round(price * (1 - discount_percent / 100));

        const saleProduct = new SaleProduct({
            name,
            price,
            discount_percent,
            discount_price,
            stock,
            sold,
            description,
            images,
            size: size || ['M'],
            colors: colors || [],
            categoryCode,
            isDiscount
        });

        const savedSaleProduct = await saleProduct.save();

        res.status(201).json({
            status: 201,
            message: 'Tạo sản phẩm khuyến mãi thành công',
            data: savedSaleProduct
        });
    } catch (error) {
        console.error('Create sale product error:', error);
        res.status(500).json({
            status: 500,
            message: 'Lỗi khi tạo sản phẩm khuyến mãi',
            error: error.message
        });
    }
};

// Cập nhật sản phẩm khuyến mãi
exports.updateSaleProduct = async (req, res) => {
    try {
        const {
            name,
            price,
            discount_percent,
            stock,
            sold,
            description,
            images,
            size,
            colors,
            categoryCode,
            isDiscount
        } = req.body;

        const objectId = new Types.ObjectId(req.params.id);

        const saleProduct = await SaleProduct.findById(objectId);
        if (!saleProduct) {
            return res.status(404).json({
                status: 404,
                message: 'Không tìm thấy sản phẩm khuyến mãi'
            });
        }

        // Validation
        if (price !== undefined && price <= 0) {
            return res.status(400).json({
                status: 400,
                message: 'Giá sản phẩm phải lớn hơn 0'
            });
        }

        if (discount_percent !== undefined && (discount_percent < 0 || discount_percent > 100)) {
            return res.status(400).json({
                status: 400,
                message: 'Phần trăm giảm giá phải từ 0 đến 100'
            });
        }

        if (stock !== undefined && stock < 0) {
            return res.status(400).json({
                status: 400,
                message: 'Số lượng tồn kho không được âm'
            });
        }

        if (sold !== undefined && sold < 0) {
            return res.status(400).json({
                status: 400,
                message: 'Số lượng đã bán không được âm'
            });
        }

        // Validate size
        if (size && Array.isArray(size)) {
            const validSizes = ['S', 'M', 'L', 'XL'];
            const invalidSizes = size.filter(s => !validSizes.includes(s));
            if (invalidSizes.length > 0) {
                return res.status(400).json({
                    status: 400,
                    message: 'Kích thước không hợp lệ',
                    invalidSizes,
                    validSizes
                });
            }
        }

        // Validate colors
        if (colors && Array.isArray(colors)) {
            const validColors = ['Đen', 'Trắng', 'Xanh'];
            const invalidColors = colors.filter(color => !validColors.includes(color));
            if (invalidColors.length > 0) {
                return res.status(400).json({
                    status: 400,
                    message: 'Màu sắc không hợp lệ',
                    invalidColors,
                    validColors
                });
            }
        }

        // Update fields
        if (name) saleProduct.name = name;
        if (price !== undefined) saleProduct.price = price;
        if (discount_percent !== undefined) saleProduct.discount_percent = discount_percent;
        if (stock !== undefined) saleProduct.stock = stock;
        if (sold !== undefined) saleProduct.sold = sold;
        if (description) saleProduct.description = description;
        if (images && Array.isArray(images)) saleProduct.images = images;
        if (size && Array.isArray(size)) saleProduct.size = size;
        if (colors && Array.isArray(colors)) saleProduct.colors = colors;
        if (categoryCode) saleProduct.categoryCode = categoryCode;
        if (isDiscount !== undefined) saleProduct.isDiscount = isDiscount;

        // Recalculate discount_price if price or discount_percent changed
        if (price !== undefined || discount_percent !== undefined) {
            const newPrice = price !== undefined ? price : saleProduct.price;
            const newDiscountPercent = discount_percent !== undefined ? discount_percent : saleProduct.discount_percent;
            saleProduct.discount_price = Math.round(newPrice * (1 - newDiscountPercent / 100));
        }

        const updatedSaleProduct = await saleProduct.save();

        res.json({
            status: 200,
            message: 'Cập nhật sản phẩm khuyến mãi thành công',
            data: updatedSaleProduct
        });
    } catch (error) {
        console.error('Update sale product error:', error);
        res.status(500).json({
            status: 500,
            message: 'Lỗi khi cập nhật sản phẩm khuyến mãi',
            error: error.message
        });
    }
};

// Xóa sản phẩm khuyến mãi
exports.deleteSaleProduct = async (req, res) => {
    try {
        const objectId = new Types.ObjectId(req.params.id);
        const saleProduct = await SaleProduct.findByIdAndDelete(objectId);

        if (!saleProduct) {
            return res.status(404).json({
                status: 404,
                message: 'Không tìm thấy sản phẩm khuyến mãi'
            });
        }

        res.json({
            status: 200,
            message: 'Xóa sản phẩm khuyến mãi thành công'
        });
    } catch (error) {
        console.error('Delete sale product error:', error);
        res.status(500).json({
            status: 500,
            message: 'Lỗi khi xóa sản phẩm khuyến mãi',
            error: error.message
        });
    }
};

// Tìm kiếm sản phẩm khuyến mãi
exports.searchSaleProducts = async (req, res) => {
    try {
        const { keyword, minPrice, maxPrice, minDiscount, maxDiscount } = req.query;
        let query = {};

        if (keyword) {
            query.name = { $regex: keyword, $options: 'i' };
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        if (minDiscount || maxDiscount) {
            query.discount_percent = {};
            if (minDiscount) query.discount_percent.$gte = Number(minDiscount);
            if (maxDiscount) query.discount_percent.$lte = Number(maxDiscount);
        }

        const saleProducts = await SaleProduct.find(query);

        res.json({
            status: 200,
            message: "Tìm kiếm sản phẩm khuyến mãi thành công",
            data: saleProducts
        });
    } catch (error) {
        console.error('Search sale products error:', error);
        res.status(500).json({
            status: 500,
            message: 'Lỗi khi tìm kiếm sản phẩm khuyến mãi',
            error: error.message
        });
    }
};

// Lấy sản phẩm khuyến mãi theo category code
exports.getSaleProductsByCategory = async (req, res) => {
    try {
        const { categoryCode } = req.params;

        if (!categoryCode) {
            return res.status(400).json({
                status: 400,
                message: 'Category code là bắt buộc'
            });
        }

        const saleProducts = await SaleProduct.find({ categoryCode: categoryCode.toLowerCase() });

        if (saleProducts.length === 0) {
            return res.status(404).json({
                status: 404,
                message: 'Không tìm thấy sản phẩm khuyến mãi nào cho category này',
                categoryCode: categoryCode,
                data: []
            });
        }

        res.json({
            status: 200,
            message: "Lấy sản phẩm khuyến mãi theo category thành công",
            categoryCode: categoryCode,
            data: saleProducts
        });
    } catch (error) {
        console.error('Get sale products by category error:', error);
        res.status(500).json({
            status: 500,
            message: 'Lỗi khi lấy sản phẩm khuyến mãi theo category',
            error: error.message
        });
    }
};

// Lấy sản phẩm khuyến mãi có discount cao nhất
exports.getTopDiscountProducts = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const saleProducts = await SaleProduct.find({ isDiscount: true })
            .sort({ discount_percent: -1 })
            .limit(Number(limit));

        res.json({
            status: 200,
            message: "Lấy sản phẩm khuyến mãi cao nhất thành công",
            data: saleProducts
        });
    } catch (error) {
        console.error('Get top discount products error:', error);
        res.status(500).json({
            status: 500,
            message: 'Lỗi khi lấy sản phẩm khuyến mãi cao nhất',
            error: error.message
        });
    }
};

// Cập nhật trạng thái khuyến mãi
exports.updateDiscountStatus = async (req, res) => {
    try {
        const { isDiscount } = req.body;
        const objectId = new Types.ObjectId(req.params.id);

        const saleProduct = await SaleProduct.findById(objectId);
        if (!saleProduct) {
            return res.status(404).json({
                status: 404,
                message: 'Không tìm thấy sản phẩm khuyến mãi'
            });
        }

        saleProduct.isDiscount = isDiscount;
        const updatedSaleProduct = await saleProduct.save();

        res.json({
            status: 200,
            message: 'Cập nhật trạng thái khuyến mãi thành công',
            data: updatedSaleProduct
        });
    } catch (error) {
        console.error('Update discount status error:', error);
        res.status(500).json({
            status: 500,
            message: 'Lỗi khi cập nhật trạng thái khuyến mãi',
            error: error.message
        });
    }
};

// Cập nhật số lượng đã bán khi có đơn hàng
exports.updateSoldCount = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        if (!Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 400,
                message: "ID không hợp lệ",
                data: null
            });
        }

        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                status: 400,
                message: "Số lượng phải lớn hơn 0",
                data: null
            });
        }

        const objectId = new Types.ObjectId(id);
        const saleProduct = await SaleProduct.findById(objectId);

        if (!saleProduct) {
            return res.status(404).json({
                status: 404,
                message: "Không tìm thấy sản phẩm khuyến mãi",
                data: null
            });
        }

        // Kiểm tra xem có đủ hàng trong kho không
        if (saleProduct.stock < quantity) {
            return res.status(400).json({
                status: 400,
                message: "Không đủ hàng trong kho",
                data: {
                    available: saleProduct.stock,
                    requested: quantity
                }
            });
        }

        // Cập nhật số lượng đã bán và tồn kho
        saleProduct.sold += quantity;
        saleProduct.stock -= quantity;

        const updatedSaleProduct = await saleProduct.save();

        res.json({
            status: 200,
            message: "Cập nhật số lượng đã bán thành công",
            data: updatedSaleProduct
        });
    } catch (error) {
        console.error('Update sold count error:', error);
        res.status(500).json({
            status: 500,
            message: 'Lỗi khi cập nhật số lượng đã bán',
            error: error.message
        });
    }
};

// Lấy sản phẩm bán chạy nhất
exports.getBestSellingProducts = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const saleProducts = await SaleProduct.find()
            .sort({ sold: -1 })
            .limit(Number(limit));

        res.json({
            status: 200,
            message: "Lấy sản phẩm bán chạy nhất thành công",
            data: saleProducts
        });
    } catch (error) {
        console.error('Get best selling products error:', error);
        res.status(500).json({
            status: 500,
            message: 'Lỗi khi lấy sản phẩm bán chạy nhất',
            error: error.message
        });
    }
};

exports.getSaleProductDetailWithComments = async (req, res) => {
    try {
        const { id } = req.params;
        const objectId = new Types.ObjectId(id);

        const allComments = await Comment.find();
        console.log("📌 Tất cả comment trong DB:", allComments.map(c => ({
            _id: c._id,
            productId: c.productId,
            type: c.type,
            rating: c.rating,
            content: c.content
        })));

        const product = await SaleProduct.findById(objectId);
        if (!product) {
            return res.status(404).json({ message: "Sale product not found" });
        }

        console.log("📌 Query comment với:", { productId: objectId, type: "sale" });

        const comments = await Comment.find({
            productId: { $in: [objectId, id] },
            type: "sale"
        })
        .populate("userId", "name avatar")
        .sort({ createdAt: -1 });

        console.log("📌 Query comment với:", { 
            productId: [objectId, id], 
            type: "sale" 
        });

        const totalReviews = comments.length;
        const averageRating =
            totalReviews > 0
                ? (comments.reduce((sum, c) => sum + c.rating, 0) / totalReviews).toFixed(1)
                : 0;

        res.json({
            status: 200,
            message: "Lấy chi tiết sản phẩm khuyến mãi kèm bình luận thành công",
            data: product,
            comments,
            averageRating: Number(averageRating),
            totalReviews,
        });
    } catch (err) {
        console.error("Get sale product detail with comments error:", err);
        res.status(500).json({ error: err.message });
    }
};
