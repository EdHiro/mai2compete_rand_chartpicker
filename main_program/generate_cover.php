<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
    exit;
}

if (!isset($_FILES['video'])) {
    echo json_encode(['success' => false, 'error' => 'No video file uploaded']);
    exit;
}

$videoFile = $_FILES['video'];
$allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];

if (!in_array($videoFile['type'], $allowedTypes)) {
    echo json_encode(['success' => false, 'error' => 'Invalid video format']);
    exit;
}

$uploadDir = __DIR__ . '/uploads/temp/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$videoPath = $uploadDir . uniqid() . '_' . basename($videoFile['name']);
if (!move_uploaded_file($videoFile['tmp_name'], $videoPath)) {
    echo json_encode(['success' => false, 'error' => 'Failed to save video']);
    exit;
}

$thumbnailDir = __DIR__ . '/uploads/covers/';
if (!file_exists($thumbnailDir)) {
    mkdir($thumbnailDir, 0777, true);
}

$coverName = uniqid() . '_cover.jpg';
$coverPath = $thumbnailDir . $coverName;

// 使用FFmpeg从视频中提取第1秒的帧作为封面
$ffmpegPath = __DIR__ . '/tools/ffmpeg.exe';
$command = sprintf('"%s" -i "%s" -ss 00:00:05 -vframes 1 -threads 4 -preset veryfast -f image2 "%s" -y 2>&1',
    $ffmpegPath,
    $videoPath,
    $coverPath
);

$output = [];
$returnVar = 0;
exec($command, $output, $returnVar);

if ($returnVar !== 0) {
    unlink($videoPath); // 清理临时视频文件
    echo json_encode(['success' => false, 'error' => 'Failed to generate thumbnail']);
    exit;
}

// 删除临时视频文件
unlink($videoPath);

echo json_encode([
    'success' => true,
    'thumbnail_url' => '/uploads/covers/' . $coverName
]);
?>