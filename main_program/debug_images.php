<?php
/**
 * 快速诊断脚本 - 检查文章#2的图片数据
 * 访问: https://zepblog.infinityfree.io/debug_images.php
 * 使用后立即删除
 */
require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=UTF-8');
echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>图片诊断</title>";
echo "<style>body{font-family:monospace;padding:20px;background:#f0f0f0}";
echo ".ok{color:green;font-weight:bold}.err{color:red;font-weight:bold}";
echo "pre{background:#fff;padding:15px;border-radius:5px;overflow-x:auto;white-space:pre-wrap}";
echo "img{max-width:400px;border:2px solid #ddd}</style></head><body>";

echo "<h1>文章#2 图片诊断</h1>\n";

try {
    $stmt = $db->prepare("SELECT id, title, content FROM posts WHERE id = ?");
    $stmt->execute([2]);
    $post = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$post) {
        echo "<p class='err'>文章#2 不存在！</p>";
        exit;
    }
    
    echo "<h2>标题: " . htmlspecialchars($post['title']) . "</h2>\n";
    echo "<h3>完整内容数据:</h3>\n";
    echo "<pre>" . htmlspecialchars($post['content']) . "</pre>\n";
    
    $content = json_decode($post['content'], true);
    
    if (isset($content['blocks'])) {
        echo "<h3>图片块分析:</h3>\n";
        foreach ($content['blocks'] as $i => $block) {
            if ($block['type'] === 'image') {
                $url = $block['data']['url'] ?? '无URL';
                $caption = $block['data']['caption'] ?? '';
                
                echo "<hr><p><strong>图片块 #$i:</strong></p>\n";
                echo "<ul>\n";
                echo "<li>URL: <code>$url</code></li>\n";
                echo "<li>类型: ";
                if (strpos($url, 'http') === 0) {
                    echo "<span class='ok'>完整URL</span>";
                } elseif (strpos($url, '/') === 0) {
                    echo "<span class='ok'>绝对路径 (以 / 开头)</span>";
                } else {
                    echo "<span class='err'>相对路径 (可能有问题!)</span>";
                }
                echo "</li>\n";
                
                // 检查文件是否存在
                $testPath = __DIR__ . $url;
                echo "<li>服务器文件路径: <code>$testPath</code></li>\n";
                if (file_exists($testPath)) {
                    echo "<li class='ok'>✓ 文件存在 (" . round(filesize($testPath)/1024, 1) . " KB)</li>\n";
                } else {
                    echo "<li class='err'>✗ 文件不存在</li>\n";
                }
                
                // 显示图片（尝试）
                $imgUrl = $url;
                echo "<li>图片预览: <br><img src='$imgUrl' alt='测试图片'></li>\n";
                
                echo "</ul>\n";
            }
        }
    }
    
    // 检查 uploads 目录
    echo "<hr><h3>uploads 目录检查:</h3>\n";
    $uploadDir = __DIR__ . '/uploads';
    echo "<p>路径: <code>$uploadDir</code></p>\n";
    if (file_exists($uploadDir)) {
        echo "<p class='ok'>✓ 目录存在</p>\n";
        echo "<p>权限: " . substr(decoct(fileperms($uploadDir)), -4) . "</p>\n";
        $files = glob($uploadDir . '/*.{jpg,jpeg,png,gif,webp}', GLOB_BRACE);
        echo "<p>图片文件: " . count($files) . " 个</p>\n";
        foreach ($files as $f) {
            $fn = basename($f);
            echo "<p>- <code>/uploads/$fn</code> (" . round(filesize($f)/1024, 1) . " KB)</p>\n";
        }
    } else {
        echo "<p class='err'>✗ 目录不存在</p>\n";
    }
    
    // Nginx/Apache 测试
    echo "<hr><h3>Web 访问测试:</h3>\n";
    echo "<p>当前URL: <code>" . htmlspecialchars($_SERVER['REQUEST_URI']) . "</code></p>\n";
    echo "<p>服务器根目录: <code>" . htmlspecialchars($_SERVER['DOCUMENT_ROOT'] ?? '未知') . "</code></p>\n";
    
} catch (Exception $e) {
    echo "<p class='err'>错误: " . htmlspecialchars($e->getMessage()) . "</p>\n";
}

echo "<hr><p class='err'><strong>⚠️ 使用完毕后请立即删除此文件！</strong></p>\n";
echo "</body></html>";
?>
