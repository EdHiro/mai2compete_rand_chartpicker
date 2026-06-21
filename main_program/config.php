<?php
// 数据库配置
define('DB_PATH', __DIR__ . '/db.db');

// 确保数据库文件存在
if (!file_exists(DB_PATH)) {
    file_put_contents(DB_PATH, '');
}

try {
    $db = new PDO('sqlite:' . DB_PATH);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // 优化：启用 WAL 模式提升并发性能
    $db->exec('PRAGMA journal_mode=WAL');
    // 优化：启用 busy timeout 避免锁冲突
    $db->exec('PRAGMA busy_timeout=5000');
    
    // 检查并创建表结构
    $tables = $db->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
    if (empty($tables)) {
        $db->exec(file_get_contents(__DIR__ . '/database.sql'));
    }
} catch (PDOException $e) {
    // 优化：生产环境不暴露详细错误信息
    error_log("数据库连接失败: " . $e->getMessage());
    die("数据库连接失败，请稍后重试");
}

// 会话配置
session_start();

// 网站基本配置
try {
    $siteSettings = $db->query("SELECT site_name, site_description, timezone FROM site_settings WHERE id = 1")->fetch(PDO::FETCH_ASSOC);
    define('SITE_NAME', $siteSettings['site_name'] ?? 'ZTC博客');
    define('SITE_URL', 'http://localhost');
    define('SITE_DESCRIPTION', $siteSettings['site_description'] ?? '我的个人博客');
    // 修复：使用配置的时区而不是 UTC
    $timezone = $siteSettings['timezone'] ?? 'Asia/Shanghai';
    define('SITE_TIMEZONE', $timezone);
    date_default_timezone_set($timezone);
} catch (PDOException $e) {
    define('SITE_NAME', 'ZTC博客');
    define('SITE_URL', 'http://localhost');
    define('SITE_DESCRIPTION', '我的个人博客');
    define('SITE_TIMEZONE', 'Asia/Shanghai');
    date_default_timezone_set('Asia/Shanghai');
}

// CSRF Token 生成与验证
function generateCsrfToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}
?>
