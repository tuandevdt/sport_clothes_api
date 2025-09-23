const Category = require('../model/model_categorie');

// Lấy danh sách tất cả danh mục
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy chi tiết một danh mục
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        }
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh mục theo code
exports.getCategoryByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const category = await Category.findOne({ code: code.toLowerCase() });
        if (!category) {
            return res.status(404).json({ message: 'Không tìm thấy danh mục với code này' });
        }
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Tạo danh mục mới
exports.createCategory = async (req, res) => {
    try {
        const { name, code, type, image } = req.body;
        
        // Kiểm tra dữ liệu đầu vào
        if (!name || !code || !type || !image) {
            return res.status(400).json({ message: 'Tên, mã, loại và hình ảnh danh mục là bắt buộc' });
        }

        // Kiểm tra type có hợp lệ không
        if (!['club', 'national'].includes(type)) {
            return res.status(400).json({ message: 'Loại danh mục phải là "club" hoặc "national"' });
        }

        const category = new Category({
            name,
            code: code.toLowerCase(),
            type,
            image
        });

        const newCategory = await category.save();
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Cập nhật danh mục
exports.updateCategory = async (req, res) => {
    try {
        const { name, code, type, image } = req.body;
        
        // Kiểm tra dữ liệu đầu vào
        if (!name || !code || !type || !image) {
            return res.status(400).json({ message: 'Tên, mã, loại và hình ảnh danh mục là bắt buộc' });
        }

        // Kiểm tra type có hợp lệ không
        if (!['club', 'national'].includes(type)) {
            return res.status(400).json({ message: 'Loại danh mục phải là "club" hoặc "national"' });
        }

        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        }

        category.name = name;
        category.code = code.toLowerCase();
        category.type = type;
        category.image = image;

        const updatedCategory = await category.save();
        res.json(updatedCategory);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Xóa danh mục
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        }

        await category.deleteOne();
        res.json({ message: 'Đã xóa danh mục thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 