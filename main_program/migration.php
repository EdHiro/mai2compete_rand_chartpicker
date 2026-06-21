<?php
/**
 * 数据库迁移脚本 - 为 posts 表添加 view_count 字段
 * 运行一次后立即删除
 */
require_once __DIR__ . '/config.php';

echo "<html><head><meta charset='UTF-8'><title>数据库迁移</title></head><body>";
echo "<h1>数据库迁移</h1>";

try {
    // 检查 posts 表是否有 view_count 字段
    $stmt = $db->query("PRAGMA table_info(posts)");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (in_array('view_count', $columns)) {
        echo "<p style='color:green'>✓ posts 表已包含 view_count 字段，无需迁移</p>";
    } else {
        // 添加 view_count 字段
        $db->exec("ALTER TABLE posts ADD COLUMN view_count INTEGER DEFAULT 0");
        echo "<p style='color:green'>✓ 成功添加 view_count 字段到 posts 表</p>";
    }
    
    // 为已有数据设置初始浏览量
    $db->exec("UPDATE posts SET view_count = 0 WHERE view_count IS NULL");
    echo "<p style='color:green'>✓ 已有文章浏览量已初始化为 0</p>";
    
    echo "<hr><p><strong>迁移完成！</strong></p>";
    echo "<p><a href='index.php'>返回首页</a></p>";
    echo "<p style='color:red;font-weight:bold'>⚠️ 请立即删除此文件！</p>";
    
} catch (Exception $e) {
    echo "<p style='color:red'>错误: " . htmlspecialchars($e->getMessage()) . "</p>";
}

echo "</body></html>";
?>
