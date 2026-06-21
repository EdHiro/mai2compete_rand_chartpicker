<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/content.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$auth->isLoggedIn()) {
        echo json_encode(['success' => false, 'message' => '请先登录']);
        exit;
    }

    // 优化：添加 CSRF 验证
    $csrfToken = $_POST['csrf_token'] ?? '';
    if (!verifyCsrfToken($csrfToken)) {
        echo json_encode(['success' => false, 'message' => '无效的 CSRF token']);
        exit;
    }

    $contentId = intval($_POST['content_id'] ?? 0);
    $contentType = $_POST['content_type'] ?? '';
    $commentContent = trim($_POST['content'] ?? '');
    
    // 优化：验证输入
    if (!$contentId || !$contentType || !$commentContent) {
        echo json_encode(['success' => false, 'message' => '评论内容不能为空']);
        exit;
    }

    $parentId = intval($_POST['parent_id'] ?? null);
    if ($content->addComment($contentId, $contentType, $commentContent, $parentId)) {
        $newComment = [
            'id' => $db->lastInsertId(),
            'content' => htmlspecialchars($commentContent),
            'user_id' => $_SESSION['user_id'],
            'username' => htmlspecialchars($_SESSION['username']),
            'created_at' => date('Y-m-d H:i:s'),
            'like_count' => 0,
            'parent_id' => $parentId,
            'replies' => []
        ];
        
        echo json_encode(['success' => true, 'comment' => $newComment]);
        exit;
    }
    
    echo json_encode(['success' => false, 'message' => '评论发送失败']);
    exit;
}

echo json_encode(['success' => false, 'message' => '无效的请求方法']);
exit;
?>
