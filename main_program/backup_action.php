<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

// 检查管理员权限
if (!$auth->isAdmin()) {
    header('Location: index.php');
    exit;
}

// 设置备份文件名
$backupFileName = 'backup_' . date('Y-m-d_H-i-s') . '.db';
$backupFilePath = __DIR__ . '/backups/' . $backupFileName;

// 确保备份目录存在
if (!file_exists(__DIR__ . '/backups')) {
    mkdir(__DIR__ . '/backups', 0755, true);
}

// 执行数据库备份
$command = "sqlite3 " . DB_PATH . " .dump > {$backupFilePath}";
system($command, $returnCode);

if ($returnCode === 0) {
    $_SESSION['success'] = "数据库备份成功，文件已保存为: {$backupFileName}";
} else {
    $_SESSION['error'] = "数据库备份失败";
}

header('Location: settings.php?type=backup');
exit;
?>