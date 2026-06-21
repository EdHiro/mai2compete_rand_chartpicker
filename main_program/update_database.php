<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

// 安全检查：只允许管理员执行
if (!$auth->isAdmin()) {
    die('只有管理员可以执行数据库更新');
}

try {
    // 开始事务
    $db->beginTransaction();

    // 检查是否已存在 is_draft 列
    $columns = $db->query("PRAGMA table_info(posts)")->fetchAll(PDO::FETCH_ASSOC);
    $hasIsDraft = false;
    
    foreach ($columns as $column) {
        if ($column['name'] === 'is_draft') {
            $hasIsDraft = true;
            break;
        }
    }

    // 如果不存在则添加 updated_at 列
    if (!$hasIsDraft) {
        // SQLite 不支持直接 ADD COLUMN WITH DEFAULT
        // 需要创建新表并迁移数据
        $db->exec("
            CREATE TABLE posts_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                content_type TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_draft INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ");

        // 迁移现有数据
        $db->exec("
            INSERT INTO posts_new (id, user_id, title, content, content_type, created_at, updated_at, is_draft)
            SELECT id, user_id, title, content, content_type, created_at, updated_at, 0
            FROM posts
        ");

        // 删除旧表并重命名新表
        $db->exec("DROP TABLE posts");
        $db->exec("ALTER TABLE posts_new RENAME TO posts");

        echo "成功添加 is_draft 列\n";
    }

    // 确保所有现有文章的 is_draft 都有值
    $db->exec("UPDATE posts SET is_draft = 0 WHERE is_draft IS NULL");

    // 提交事务
    $db->commit();
    
    echo "数据库更新完成！\n";

} catch (Exception $e) {
    // 发生错误时回滚
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    die("更新失败: " . $e->getMessage());
}

try {
    // 开始事务
    $db->beginTransaction();

    // 创建 video_qualities 表
    $db->exec("CREATE TABLE IF NOT EXISTS video_qualities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id INTEGER NOT NULL,
        quality TEXT NOT NULL,
        video_url TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        bitrate INTEGER NOT NULL,
        filesize INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
    )");

    // 添加 videos 表的 updated_at 列
    $columns = $db->query("PRAGMA table_info(videos)")->fetchAll(PDO::FETCH_ASSOC);
    $hasUpdatedAt = false;
    
    foreach ($columns as $column) {
        if ($column['name'] === 'updated_at') {
            $hasUpdatedAt = true;
            break;
        }
    }

    // 如果不存在则添加 updated_at 列
    if (!$hasUpdatedAt) {
        // 创建新表
        $db->exec("
            CREATE TABLE videos_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                video_url TEXT NOT NULL,
                thumbnail_url TEXT,
                view_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ");

        // 迁移现有数据
        $db->exec("
            INSERT INTO videos_new (id, user_id, title, description, video_url, thumbnail_url, view_count, created_at, updated_at)
            SELECT id, user_id, title, description, video_url, thumbnail_url, view_count, created_at, created_at
            FROM videos
        ");

        // 删除旧表并重命名新表
        $db->exec("DROP TABLE videos");
        $db->exec("ALTER TABLE videos_new RENAME TO videos");

        echo "成功添加 updated_at 列到视频表\n";
    }

    // 确保所有现有视频的 updated_at 都有值
    $db->exec("UPDATE videos SET updated_at = created_at WHERE updated_at IS NULL");

    // 提交事务
    $db->commit();
    
    echo "数据库更新完成！\n";

} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    die("更新失败: " . $e->getMessage());
}

try {
    // 开始事务
    $db->beginTransaction();

    // 检查是否已存在 video_qualities 列
    $columns = $db->query("PRAGMA table_info(videos)")->fetchAll(PDO::FETCH_ASSOC);
    $hasVideoQualities = false;
    
    foreach ($columns as $column) {
        if ($column['name'] === 'video_qualities') {
            $hasVideoQualities = true;
            break;
        }
    }

    // 如果不存在则添加 video_qualities 列
    if (!$hasVideoQualities) {
        // 创建新表
        $db->exec("
            CREATE TABLE videos_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                video_url TEXT NOT NULL,
                thumbnail_url TEXT,
                video_qualities TEXT,
                is_default INTEGER DEFAULT 0,
                view_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ");

        // 迁移现有数据
        $db->exec("
            INSERT INTO videos_new (id, user_id, title, description, video_url, thumbnail_url, view_count, created_at, updated_at)
            SELECT id, user_id, title, description, video_url, thumbnail_url, view_count, created_at, updated_at
            FROM videos
        ");

        // 删除旧表并重命名新表
        $db->exec("DROP TABLE videos");
        $db->exec("ALTER TABLE videos_new RENAME TO videos");

        echo "成功添加 video_qualities 列到视频表\n";

        // 为现有视频生成不同画质版本
        $videos = $db->query("SELECT id, video_url FROM videos")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($videos as $video) {
            $videoPath = __DIR__ . $video['video_url'];
            $outputDir = dirname($videoPath) . '/';
            if (file_exists($videoPath)) {
                require_once __DIR__ . '/VideoProcessor.php';
                $processor = new VideoProcessor($videoPath, $outputDir);
                $qualities = $processor->generateQualities();
                if (!empty($qualities)) {
                    $db->prepare("UPDATE videos SET video_qualities = ? WHERE id = ?")
                       ->execute([json_encode($qualities), $video['id']]);
                }
            }
        }
        echo "已为现有视频生成不同画质版本\n";
    }

    // 提交事务
    $db->commit();
    
    echo "数据库更新完成！\n";

} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    die("更新失败: " . $e->getMessage());
}
?>
