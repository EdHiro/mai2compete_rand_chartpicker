<?php
/**
 * 数据库初始化脚本
 * 使用方法：在服务器上访问 http://你的域名/install.php
 * 初始化完成后请删除此文件
 */

// 设置错误显示（仅用于安装）
ini_set('display_errors', 1);
error_reporting(E_ALL);

define('DB_PATH', __DIR__ . '/db.db');
define('SQL_FILE', __DIR__ . '/database.sql');

// 检查是否已安装
if (file_exists(DB_PATH) && filesize(DB_PATH) > 0) {
    die('<h2>数据库已存在！如需重新安装，请先删除 ' . DB_PATH . ' 文件</h2>');
}

echo '<html><head><meta charset="UTF-8"><title>数据库初始化</title>';
echo '<style>body{font-family:Arial,sans-serif;max-width:800px;margin:50px auto;padding:20px;background:#f5f5f5}';
echo '.success{background:#d4edda;border:1px solid #c3e6cb;color:#155724;padding:15px;margin:10px 0;border-radius:4px}';
echo '.error{background:#f8d7da;border:1px solid #f5c6cb;color:#721c24;padding:15px;margin:10px 0;border-radius:4px}';
echo '.info{background:#d1ecf1;border:1px solid #bee5eb;color:#0c5460;padding:15px;margin:10px 0;border-radius:4px}';
echo 'pre{background:#fff;padding:10px;border-radius:4px;overflow-x:auto}</style></head><body>';
echo '<h1>数据库初始化</h1>';

try {
    // 1. 创建数据库文件
    echo '<div class="info">步骤 1/5: 创建数据库文件...</div>';
    file_put_contents(DB_PATH, '');
    echo '<div class="success">数据库文件创建成功</div>';

    // 2. 连接数据库
    echo '<div class="info">步骤 2/5: 连接数据库...</div>';
    $db = new PDO('sqlite:' . DB_PATH);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('PRAGMA journal_mode=WAL');
    echo '<div class="success">数据库连接成功</div>';

    // 3. 执行 SQL 脚本
    echo '<div class="info">步骤 3/5: 执行数据库结构创建...</div>';
    if (!file_exists(SQL_FILE)) {
        throw new Exception('找不到 database.sql 文件');
    }
    
    $sql = file_get_contents(SQL_FILE);
    
    // 优化：逐行解析，正确区分注释和语句
    $tables = [];
    $indexes = [];
    $currentStatement = '';
    
    $lines = explode("\n", $sql);
    foreach ($lines as $line) {
        $line = trim($line);
        
        // 跳过空行和注释行
        if (empty($line) || strpos($line, '--') === 0) {
            continue;
        }
        
        $currentStatement .= ' ' . $line;
        
        // 如果行以 ; 结尾，说明语句结束
        if (substr($line, -1) === ';') {
            $stmt = trim($currentStatement);
            $upper = strtoupper($stmt);
            
            if (strpos($upper, 'CREATE TABLE') === 0) {
                $tables[] = $stmt;
            } elseif (strpos($upper, 'CREATE INDEX') === 0) {
                $indexes[] = $stmt;
            }
            
            $currentStatement = '';
        }
    }
    
    $executed = 0;
    
    // 1. 先创建所有表
    foreach ($tables as $statement) {
        try {
            $db->exec($statement);
            $executed++;
        } catch (Exception $e) {
            if (strpos($e->getMessage(), 'already exists') === false) {
                throw $e;
            }
        }
    }
    
    // 2. 再创建所有索引
    foreach ($indexes as $statement) {
        try {
            $db->exec($statement);
            $executed++;
        } catch (Exception $e) {
            if (strpos($e->getMessage(), 'already exists') === false) {
                throw $e;
            }
        }
    }
    
    echo "<div class='success'>成功执行 $executed 条 SQL 语句（" . count($tables) . " 个表，" . count($indexes) . " 个索引）</div>";

    // 4. 创建默认管理员账号
    echo '<div class="info">步骤 4/5: 创建默认管理员账号...</div>';
    
    // 检查是否已存在管理员
    $stmt = $db->query("SELECT COUNT(*) FROM users WHERE is_admin = 1");
    $adminCount = $stmt->fetchColumn();
    
    if ($adminCount == 0) {
        // 生成默认密码
        $defaultPassword = 'admin123';
        $passwordHash = password_hash($defaultPassword, PASSWORD_DEFAULT);
        
        $stmt = $db->prepare("INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, 1)");
        $stmt->execute(['admin', 'admin@example.com', $passwordHash]);
        
        echo '<div class="success">默认管理员创建成功</div>';
        echo '<div class="info">';
        echo '<strong>默认管理员账号:</strong><br>';
        echo '用户名: <code>admin</code><br>';
        echo '密码: <code>' . $defaultPassword . '</code><br>';
        echo '<strong>重要：请立即登录并修改密码！</strong>';
        echo '</div>';
    } else {
        echo '<div class="info">管理员账号已存在，跳过创建</div>';
    }

    // 5. 插入默认网站设置
    echo '<div class="info">步骤 5/5: 初始化网站设置...</div>';
    $stmt = $db->query("SELECT COUNT(*) FROM site_settings");
    $settingsCount = $stmt->fetchColumn();
    
    if ($settingsCount == 0) {
        $stmt = $db->prepare("INSERT INTO site_settings (id, site_name, site_description, timezone) VALUES (1, ?, ?, ?)");
        $stmt->execute(['ZTC博客', '我的个人博客', 'Asia/Shanghai']);
        echo '<div class="success">网站设置初始化成功</div>';
    } else {
        echo '<div class="info">网站设置已存在，跳过初始化</div>';
    }

    // 完成
    echo '<hr><div class="success"><h2>安装完成！</h2>';
    echo '<p>你可以访问 <a href="index.php">首页</a> 或 <a href="login.php">登录页面</a></p>';
    echo '<p><strong>安全提示：安装完成后请立即删除 install.php 文件！</strong></p></div>';

} catch (Exception $e) {
    echo '<div class="error"><strong>错误：</strong> ' . $e->getMessage() . '</div>';
    echo '<pre>' . htmlspecialchars($e->getTraceAsString()) . '</pre>';
}

echo '</body></html>';
?>
