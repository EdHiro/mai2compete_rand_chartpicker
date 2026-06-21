<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['success' => 0, 'message' => 'Unauthorized']));
}

$upload_dir = __DIR__ . '/uploads/';
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

// 允许的文件类型
$allowed_image_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$allowed_video_types = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
$allowed_audio_types = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'];
$allowed_file_types = array_merge($allowed_image_types, $allowed_video_types, $allowed_audio_types, [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
]);

// 处理文件上传
if (isset($_FILES['image']) || isset($_FILES['file'])) {
    $file = isset($_FILES['image']) ? $_FILES['image'] : $_FILES['file'];
    $file_type = $file['type'];
    $file_size = $file['size'];
    $max_size = 50 * 1024 * 1024; // 50MB

    // 验证文件大小
    if ($file_size > $max_size) {
        http_response_code(400);
        die(json_encode([
            'success' => 0,
            'message' => 'File size exceeds limit (50MB)'
        ]));
    }

    // 验证文件类型
    if (!in_array($file_type, $allowed_file_types)) {
        http_response_code(400);
        die(json_encode([
            'success' => 0,
            'message' => 'File type not allowed'
        ]));
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $filename = uniqid() . '.' . $ext;
    
    if (move_uploaded_file($file['tmp_name'], $upload_dir . $filename)) {
        echo json_encode([
            'success' => 1,
            'file' => [
                'url' => '/uploads/' . $filename,
                'name' => $file['name'],
                'size' => $file_size,
                'extension' => $ext
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => 0,
            'message' => 'Failed to upload file'
        ]);
    }
} else {
    http_response_code(400);
    echo json_encode([
        'success' => 0,
        'message' => 'No file uploaded'
    ]);
}
