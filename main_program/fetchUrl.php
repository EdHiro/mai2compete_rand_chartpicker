<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

if (!$auth->isLoggedIn()) {
    http_response_code(401);
    die(json_encode(['success' => 0]));
}

if (!isset($_POST['url'])) {
    http_response_code(400);
    die(json_encode(['success' => 0]));
}

$url = $_POST['url'];

// 获取网页元数据
$context = stream_context_create([
    'http' => [
        'user_agent' => 'Mozilla/5.0',
        'timeout' => 5
    ]
]);

try {
    $html = file_get_contents($url, false, $context);
    
    if ($html === false) {
        throw new Exception('无法访问URL');
    }

    // 解析元数据
    preg_match('/<title>(.*?)<\/title>/i', $html, $titleMatch);
    preg_match('/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i', $html, $descMatch);
    preg_match('/<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i', $html, $imageMatch);

    echo json_encode([
        'success' => 1,
        'meta' => [
            'title' => $titleMatch[1] ?? '',
            'description' => $descMatch[1] ?? '',
            'image' => [
                'url' => $imageMatch[1] ?? ''
            ]
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => 0,
        'error' => $e->getMessage()
    ]);
}
