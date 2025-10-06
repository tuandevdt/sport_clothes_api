const Post = require('../model/model_post');

// Lấy tất cả bài viết
exports.getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách bài viết',
            error: error.message
        });
    }
};

// Lấy bài viết theo ID
exports.getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bài viết'
            });
        }
        res.status(200).json({
            success: true,
            data: post
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin bài viết',
            error: error.message
        });
    }
};

// Tạo bài viết mới
exports.createPost = async (req, res) => {
    try {
        const newPost = new Post(req.body);
        const savedPost = await newPost.save();
        res.status(201).json({
            success: true,
            data: savedPost
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Lỗi khi tạo bài viết mới',
            error: error.message
        });
    }
};

// Cập nhật bài viết
exports.updatePost = async (req, res) => {
    try {
        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedPost) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bài viết để cập nhật'
            });
        }
        res.status(200).json({
            success: true,
            data: updatedPost
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Lỗi khi cập nhật bài viết',
            error: error.message
        });
    }
};

// Xóa bài viết
exports.deletePost = async (req, res) => {
    try {
        const deletedPost = await Post.findByIdAndDelete(req.params.id);
        if (!deletedPost) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bài viết để xóa'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Xóa bài viết thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa bài viết',
            error: error.message
        });
    }
};

// Lấy bài viết theo sản phẩm
exports.getPostsByProduct = async (req, res) => {
    try {
        const posts = await Post.findByProductId(req.params.productId);
        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy bài viết theo sản phẩm',
            error: error.message
        });
    }
};

// Lấy bài viết theo tag
exports.getPostsByTag = async (req, res) => {
    try {
        const posts = await Post.findByTag(req.params.tag);
        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy bài viết theo tag',
            error: error.message
        });
    }
};

// Tìm kiếm bài viết
exports.searchPosts = async (req, res) => {
    try {
        const searchText = req.query.q;
        if (!searchText) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập từ khóa tìm kiếm'
            });
        }
        const posts = await Post.searchPosts(searchText);
        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tìm kiếm bài viết',
            error: error.message
        });
    }
}; 