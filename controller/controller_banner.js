const Banner = require('../model/model_banner');

// Lấy tất cả banner
exports.getAllBanners = async (req, res) => {
    try {
        const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Lấy banner theo ID
exports.getBannerById = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Không tìm thấy banner' });
        }
        res.json(banner);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Tạo banner mới
exports.createBanner = async (req, res) => {
    try {
        const { name, banner, isActive, order } = req.body;

        if (!name || !banner) {
            return res.status(400).json({ message: 'Tên và đường dẫn banner là bắt buộc' });
        }

        const newBanner = new Banner({
            name,
            banner,
            isActive: isActive !== undefined ? isActive : true,
            order: order || 0
        });

        await newBanner.save();
        res.status(201).json({ message: 'Tạo banner thành công', banner: newBanner });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Cập nhật banner
exports.updateBanner = async (req, res) => {
    try {
        const { name, banner, isActive, order } = req.body;
        const bannerId = req.params.id;

        const existingBanner = await Banner.findById(bannerId);
        if (!existingBanner) {
            return res.status(404).json({ message: 'Không tìm thấy banner' });
        }

        // Cập nhật thông tin
        existingBanner.name = name || existingBanner.name;
        existingBanner.banner = banner || existingBanner.banner;
        existingBanner.isActive = isActive !== undefined ? isActive : existingBanner.isActive;
        existingBanner.order = order !== undefined ? order : existingBanner.order;

        await existingBanner.save();
        res.json({ message: 'Cập nhật banner thành công', banner: existingBanner });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Xóa banner
exports.deleteBanner = async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Không tìm thấy banner' });
        }
        res.json({ message: 'Xóa banner thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Lấy banner đang hoạt động
exports.getActiveBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

// Thay đổi trạng thái banner
exports.toggleBannerStatus = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Không tìm thấy banner' });
        }

        banner.isActive = !banner.isActive;
        await banner.save();

        res.json({ 
            message: `Banner đã ${banner.isActive ? 'kích hoạt' : 'vô hiệu hóa'} thành công`, 
            banner 
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};
