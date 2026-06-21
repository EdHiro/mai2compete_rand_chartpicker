<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/content.php';

// 验证用户登录状态
if (!$auth->isLoggedIn()) {
    header('Location: login.php');
    exit;
}

// 获取当前用户的所有内容
$posts = $content->getPostsByUser($_SESSION['user_id']);
$videos = $content->getVideosByUser($_SESSION['user_id']);

// 获取统计数据
$postsCount = count($posts);
$videosCount = count($videos);

?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>内容管理 - <?php echo SITE_NAME; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <div class="flex h-screen">
        <!-- 侧边栏 -->
        <div class="w-64 bg-white shadow-lg">
            <div class="p-6 border-b">
                <h1 class="text-2xl font-bold text-gray-800"><?php echo SITE_NAME; ?></h1>
                <p class="text-sm text-gray-600 mt-1">内容管理系统</p>
            </div>
            <nav class="p-6 space-y-2">
                <a href="index.php" class="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <span>返回首页</span>
                </a>
                <a href="#posts" class="flex items-center px-4 py-3 text-blue-600 bg-blue-50 rounded-lg">
                    <span>文章管理 (<?php echo $postsCount; ?>)</span>
                </a>
                <a href="#videos" class="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <span>视频管理 (<?php echo $videosCount; ?>)</span>
                </a>
            </nav>
        </div>

        <!-- 主内容区 -->
        <div class="flex-1 overflow-auto">
            <div class="p-8">
                <!-- 顶部操作栏 -->
                <div class="mb-8 flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-800">内容管理</h2>
                    <div class="space-x-4">
                        <a href="post_edit.php" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            写文章
                        </a>
                        <a href="video_edit.php" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            上传视频
                        </a>
                    </div>
                </div>

                <!-- 文章列表 -->
                <div id="posts" class="mb-12">
                    <h3 class="text-xl font-bold mb-4 text-gray-800">文章管理</h3>
                    <div class="bg-white rounded-lg shadow overflow-hidden">
                        <table class="min-w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">发布时间</th>
                                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                <?php foreach ($posts as $post): ?>
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4">
                                        <a href="post.php?id=<?php echo $post['id']; ?>" class="text-blue-600 hover:text-blue-800">
                                            <?php echo htmlspecialchars($post['title']); ?>
                                        </a>
                                    </td>
                                    <td class="px-6 py-4 text-gray-600">
                                        <?php echo (new DateTime($post['created_at']))->format('Y-m-d H:i'); ?>
                                    </td>
                                    <td class="px-6 py-4 text-right space-x-2">
                                        <a href="post_edit.php?id=<?php echo $post['id']; ?>" 
                                           class="text-blue-600 hover:text-blue-800">编辑</a>
                                        <button onclick="if(confirm('确定删除此文章?')) location.href='post_delete.php?id=<?php echo $post['id']; ?>'" 
                                                class="text-red-600 hover:text-red-800">删除</button>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 视频列表 -->
                <div id="videos">
                    <h3 class="text-xl font-bold mb-4 text-gray-800">视频管理</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <?php foreach ($videos as $video): ?>
                        <div class="bg-white rounded-lg shadow-md overflow-hidden">
                            <?php if ($video['thumbnail_url']): ?>
                            <img src="<?php echo htmlspecialchars($video['thumbnail_url']); ?>" 
                                 alt="视频封面" 
                                 class="w-full h-48 object-cover">
                            <?php endif; ?>
                            <div class="p-4">
                                <h4 class="font-semibold text-lg mb-2"><?php echo htmlspecialchars($video['title']); ?></h4>
                                <p class="text-gray-600 text-sm mb-4">
                                    发布于 <?php echo (new DateTime($video['created_at']))->format('Y-m-d H:i'); ?>
                                </p>
                                <div class="flex justify-between items-center">
                                    <a href="video.php?id=<?php echo $video['id']; ?>" 
                                       class="text-blue-600 hover:text-blue-800">查看</a>
                                    <div class="space-x-2">
                                        <a href="video_edit.php?id=<?php echo $video['id']; ?>" 
                                           class="text-blue-600 hover:text-blue-800">编辑</a>
                                        <button onclick="if(confirm('确定删除此视频?')) location.href='video_delete.php?id=<?php echo $video['id']; ?>'" 
                                                class="text-red-600 hover:text-red-800">删除</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // 平滑滚动到锚点
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
    </script>
</body>
</html>
