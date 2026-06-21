<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

if (!$auth->isLoggedIn()) {
    header('Location: login.php');
    exit;
}

// 获取视频ID
$video_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($video_id <= 0) {
    $_SESSION['error'] = '无效的视频ID';
    header('Location: index.php');
    exit;
}

try {
    // 获取视频信息
    $stmt = $db->prepare('SELECT * FROM videos WHERE id = ?');
    $stmt->execute([$video_id]);
    $video = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$video) {
        $_SESSION['error'] = '视频不存在';
        header('Location: index.php');
        exit;
    }

    // 检查权限（只有视频作者和管理员可以删除）
    if ($video['user_id'] !== $auth->getUserId() && !$auth->isAdmin()) {
        $_SESSION['error'] = '您没有权限删除此视频';
        header('Location: video.php?id=' . $video_id);
        exit;
    }

    // 开始事务
    $db->beginTransaction();

    // 删除视频文件及其所有质量版本
    $baseVideoPath = __DIR__ . $video['video_url'];
    $videoDir = dirname($baseVideoPath);
    $videoBaseName = basename($baseVideoPath);
    $videoNameWithoutExt = pathinfo($videoBaseName, PATHINFO_FILENAME);

    // 删除原始视频文件
    if (file_exists($baseVideoPath)) {
        unlink($baseVideoPath);
    }

    // 删除不同质量版本的视频文件
    $qualities = ['360p', '480p', '720p'];
    foreach ($qualities as $quality) {
        $qualityVideoPath = $videoDir . '/' . $videoNameWithoutExt . '_' . $quality . '.mp4';
        if (file_exists($qualityVideoPath)) {
            unlink($qualityVideoPath);
        }
    }

    // 删除缩略图
    if ($video['thumbnail_url']) {
        $thumbnailPath = __DIR__ . $video['thumbnail_url'];
        if (file_exists($thumbnailPath)) {
            unlink($thumbnailPath);
        }
    }

    // 删除视频质量记录
    $stmt = $db->prepare('DELETE FROM video_qualities WHERE video_id = ?');
    $stmt->execute([$video_id]);

    // 删除视频记录
    $stmt = $db->prepare('DELETE FROM videos WHERE id = ?');
    $stmt->execute([$video_id]);

    // 提交事务
    $db->commit();

    $_SESSION['success'] = '视频已成功删除';
    header('Location: admin.php');
    exit;

} catch (Exception $e) {
    // 发生错误时回滚事务
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    $_SESSION['error'] = '删除视频时发生错误：' . $e->getMessage();
    header('Location: video.php?id=' . $video_id);
    exit;
}