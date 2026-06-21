<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/content.php';

// 初始化变量
$error = null;
$success = null;
$type = $_GET['type'] ?? 'site';

// 检查管理员权限
if (!$auth->isAdmin()) {
    header('Location: index.php');
    exit;
}

// 处理表单提交
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if ($type === 'site') {
            // 更新站点设置
            $siteName = trim($_POST['site_name']);
            $siteDescription = trim($_POST['site_description']);
            $timezone = trim($_POST['timezone']);
            
            if (empty($siteName)) {
                throw new Exception('站点名称不能为空');
            }
            
            // 更新站点设置到数据库
            $stmt = $db->prepare('UPDATE site_settings SET site_name = ?, site_description = ?, timezone = ? WHERE id = 1');
            if ($stmt->execute([$siteName, $siteDescription, $timezone])) {
                $success = '站点设置已保存';
                // 更新当前会话中的站点名称
                $_SESSION['site_name'] = $siteName;
                // 设置时区
                date_default_timezone_set($timezone);
            } else {
                throw new Exception('保存站点设置失败');
            }
        }
    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}

// 获取文章和视频列表
$posts = $content->getAllPosts();
$videos = $content->getAllVideos();
$users = $auth->getAllUsers();

?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理后台 - <?php echo SITE_NAME; ?></title>
    <link rel="stylesheet" href="/assets/css/fluent-admin.css">
</head>
<body>
    <div class="fluent-layout">
        <!-- 侧边栏 -->
        <div class="fluent-sidebar">
            <div class="fluent-sidebar-header">
                <h1 class="text-xl font-bold"><?php echo SITE_NAME; ?></h1>
                <p class="text-sm text-gray-500">管理后台</p>
            </div>
            <nav>
                <a href="index.php" class="fluent-nav-item">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    返回主页
                </a>
                <a href="#posts" class="fluent-nav-item" data-target="postsSection">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    文章管理
                </a>
                <a href="#videos" class="fluent-nav-item" data-target="videosSection">
                    <svg class="w-5 h-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    视频管理
                </a>
                <a href="#users" class="fluent-nav-item" data-target="usersSection">
                    <svg class="w-5 h-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    用户管理
                </a>
                <a href="#settings" class="fluent-nav-item" data-target="settingsSection">
                    <svg class="w-5 h-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    系统设置
                </a>
            </nav>
        </div>

        <!-- 主内容区 -->
        <div class="fluent-main">
            <?php if ($error): ?>
                <div class="fluent-alert fluent-alert-error"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>

            <?php if ($success): ?>
                <div class="fluent-alert fluent-alert-success"><?php echo htmlspecialchars($success); ?></div>
            <?php endif; ?>

            <!-- 用户管理模块 -->
            <div class="content-section hidden" id="usersSection">
                <div class="fluent-card">
                    <div class="mb-4">
                        <button class="fluent-button fluent-button-primary" onclick="location.href='user_edit.php?action=create'">添加用户</button>
                    </div>
                    <table class="fluent-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>用户名</th>
                                <th>邮箱</th>
                                <th>注册时间</th>
                                <th>管理员</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($users as $user): ?>
                            <tr>
                                <td><?php echo $user['id']; ?></td>
                                <td><?php echo htmlspecialchars($user['username']); ?></td>
                                <td><?php echo htmlspecialchars($user['email']); ?></td>
                                <td><?php echo date('Y-m-d', strtotime($user['created_at'])); ?></td>
                                <td><?php echo $user['is_admin'] ? '是' : '否'; ?></td>
                                <td>
                                    <button class="fluent-button fluent-button-secondary" onclick="location.href='user_edit.php?id=<?php echo $user['id']; ?>'">编辑</button>
                                    <button class="fluent-button fluent-button-secondary ml-2" onclick="if(confirm('确定删除吗？')) location.href='user_delete.php?id=<?php echo $user['id']; ?>'">删除</button>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 文章管理模块 -->
            <div class="content-section hidden" id="postsSection">
                <div class="fluent-card">
                    <div class="mb-4">
                        <button class="fluent-button fluent-button-primary" onclick="location.href='post_edit.php?action=create'">新建文章</button>
                    </div>
                    <table class="fluent-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>标题</th>
                                <th>发布时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($posts as $post): ?>
                            <tr>
                                <td><?php echo $post['id']; ?></td>
                                <td><?php echo htmlspecialchars($post['title']); ?></td>
                                <td><?php echo date('Y-m-d', strtotime($post['created_at'])); ?></td>
                                <td>
                                    <button class="fluent-button fluent-button-secondary" onclick="location.href='post_edit.php?id=<?php echo $post['id']; ?>'">编辑</button>
                                    <button class="fluent-button fluent-button-secondary ml-2" onclick="if(confirm('确定删除吗？')) location.href='post_delete.php?id=<?php echo $post['id']; ?>'">删除</button>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 视频管理模块 -->
            <div class="content-section hidden" id="videosSection">
                <div class="fluent-card">
                    <div class="mb-4">
                        <button class="fluent-button fluent-button-primary" onclick="location.href='video_edit.php?action=create'">新建视频</button>
                    </div>
                    <table class="fluent-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>标题</th>
                                <th>发布时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($videos as $video): ?>
                            <tr>
                                <td><?php echo $video['id']; ?></td>
                                <td><?php echo htmlspecialchars($video['title']); ?></td>
                                <td><?php echo date('Y-m-d', strtotime($video['created_at'])); ?></td>
                                <td>
                                    <button class="fluent-button fluent-button-secondary" onclick="location.href='video_edit.php?id=<?php echo $video['id']; ?>'">编辑</button>
                                    <button class="fluent-button fluent-button-secondary ml-2" onclick="if(confirm('确定删除吗？')) location.href='video_delete.php?id=<?php echo $video['id']; ?>'">删除</button>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 系统设置模块 -->
            <div class="content-section hidden" id="settingsSection">
                <div class="fluent-card">
                    <form method="post" action="?type=site" class="fluent-form">
                        <div class="fluent-form-group">
                            <label for="site_name">站点名称</label>
                            <input type="text" 
                                id="site_name"
                                class="fluent-input" 
                                name="site_name" 
                                value="<?php echo htmlspecialchars(SITE_NAME); ?>" 
                                required>
                        </div>

                        <div class="fluent-form-group">
                            <label for="site_description">站点描述</label>
                            <textarea 
                                id="site_description"
                                class="fluent-input" 
                                name="site_description" 
                                rows="3"><?php echo htmlspecialchars(SITE_DESCRIPTION ?? ''); ?></textarea>
                        </div>

                        <div class="fluent-form-group">
                            <label for="timezone">时区</label>
                            <select 
                                id="timezone"
                                class="fluent-select" 
                                name="timezone" 
                                required>
                                <?php foreach(DateTimeZone::listIdentifiers() as $tz): ?>
                                    <option value="<?php echo $tz; ?>" <?php echo (null !== SITE_TIMEZONE && SITE_TIMEZONE === $tz) ? 'selected' : ''; ?>><?php echo $tz; ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div class="fluent-form-group">
                            <button type="submit" class="fluent-button fluent-button-primary">保存设置</button>
                        </div>
                    </form>
                </div>

                <div class="fluent-card mt-4">
                    <h2 class="text-xl mb-4">数据库备份</h2>
                    <button onclick="location.href='backup_action.php'" class="fluent-button fluent-button-primary">立即备份</button>
                </div>
            </div>
        </div>
    </div>

    <script>
    // 增强版分区切换功能
    function switchSection(target) {
        if (!target) return;
        
        // 移除所有活动状态
        document.querySelectorAll('.fluent-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 设置当前活动状态
        const activeNav = document.querySelector(`[data-target="${target}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }
        
        // 隐藏所有内容区域
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // 显示对应内容区域
        const targetSection = document.getElementById(target);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
    }
    
    // 初始化导航菜单事件
    function initNavMenu() {
        document.querySelectorAll('.fluent-nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const target = this.dataset.target;
                if (target) {
                    switchSection(target);
                    // 更新URL哈希
                    window.location.hash = target;
                }
            });
        });
        
        // 检查URL哈希并切换对应选项卡
        const hash = window.location.hash.substring(1);
        if (hash) {
            switchSection(hash);
        } else {
            // 默认显示用户管理选项卡
            switchSection('usersSection');
        }
    }
    
    // 页面加载完成后初始化
    document.addEventListener('DOMContentLoaded', initNavMenu);
    </script>
</body>
</html>