<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/content.php';

// 验证用户登录状态
if (!$auth->isLoggedIn()) {
    header('Location: login.php');
    exit;
}

// 获取文章ID
$postId = $_GET['id'] ?? 0;
if (empty($postId) || !is_numeric($postId)) {
    header('Location: index.php');
    exit;
}

// 获取文章信息
$post = $content->getPost($postId);
if (!$post) {
    header('Location: index.php');
    exit;
}

// 验证权限：管理员或文章作者
if (!$auth->isAdmin() && $post['user_id'] != $_SESSION['user_id']) {
    header('Location: index.php');
    exit;
}

// 执行删除操作
if ($content->deletePost($postId)) {
    header('Location: index.php?delete_success=1');
} else {
    header('Location: post.php?id=' . $postId . '&delete_error=1');
}
?>