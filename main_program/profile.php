<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/content.php';

$pageTitle = '用户资料';
$contentObj = new Content($db, $auth);

// 优化：去除重复代码，统一处理逻辑
if (!isset($_GET['id'])) {
    header('Location: index.php');
    exit;
}

$user_id = intval($_GET['id']);
$user = $auth->getUserById($user_id);

if (!$user) {
    header('Location: index.php');
    exit;
}

$user_posts = $contentObj->getPostsByUser($user_id);
$user_videos = $contentObj->getVideosByUser($user_id);

$error = '';
$success = '';

// 处理资料更新
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $auth->isLoggedIn() && $_SESSION['user_id'] == $user_id) {
    // 优化：添加 CSRF 验证
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $error = '无效的 CSRF token';
    } else {
        $username = trim($_POST['username']);
        $email = trim($_POST['email']);
        
        if (empty($username) || empty($email)) {
            $error = '用户名和邮箱不能为空';
        } elseif ($auth->updateUser($user_id, $username, $email)) {
            $success = '个人资料已更新';
            $_SESSION['username'] = $username;
            $user = $auth->getUserById($user_id);
        } else {
            $error = '更新失败，请重试';
        }
    }
}

// 处理关注/取消关注
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $auth->isLoggedIn()) {
    $action = $_POST['action'] ?? '';
    $current_user_id = $_SESSION['user_id'];
    
    if ($action === 'follow') {
        $auth->followUser($current_user_id, $user_id);
    } elseif ($action === 'unfollow') {
        $auth->unfollowUser($current_user_id, $user_id);
    }
}

$is_following = false;
if ($auth->isLoggedIn()) {
    $is_following = $auth->isFollowing($_SESSION['user_id'], $user_id);
}

$follower_count = $auth->getFollowerCount($user_id);
$following_count = $auth->getFollowingCount($user_id);

require_once __DIR__ . '/header.php';
?>
    <title><?php echo htmlspecialchars($user['username']); ?> - <?php echo SITE_NAME; ?></title>
</head>
<body>
    <div class="container mx-auto px-4 py-8">
        <?php if ($error): ?>
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>
        <?php if ($success): ?>
            <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4"><?php echo htmlspecialchars($success); ?></div>
        <?php endif; ?>
        
        <div class="bg-white rounded-lg shadow-md p-8 mb-8 bg-cover bg-center relative overflow-hidden" style="background-image: url('<?php echo !empty($user['background_image']) ? htmlspecialchars('uploads/' . $user['background_image']) : 'https://placehold.co/1200x400?text=Background+Image'; ?>')">
            <div class="absolute inset-0 bg-opacity-50 backdrop-blur-sm"></div>
            <div class="flex items-center space-x-6 relative z-10">
                <div class="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                    <?php if (!empty($user['avatar'])): ?>
                        <img src="<?php echo htmlspecialchars('uploads/' . $user['avatar']); ?>" alt="头像" class="w-full h-full object-cover">
                    <?php else: ?>
                        <img src="https://placehold.co/96x96?text=<?php echo urlencode(mb_substr($user['username'], 0, 1)); ?>" alt="头像" class="w-full h-full object-cover">
                    <?php endif; ?>
                </div>
                <div class="flex-1">
                    <div class="flex items-center space-x-4">
                        <h1 class="text-3xl font-bold"><?php echo htmlspecialchars($user['username']); ?></h1>
                        <?php if ($auth->isLoggedIn() && $_SESSION['user_id'] == $user_id): ?>
                            <a href="profile_edit.php?id=<?php echo $user_id; ?>" class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all duration-300 font-medium">
                                编辑
                            </a>
                        <?php elseif ($auth->isLoggedIn() && $_SESSION['user_id'] != $user_id): ?>
                            <form method="POST" action="profile.php?id=<?php echo $user_id; ?>">
                                <input type="hidden" name="csrf_token" value="<?php echo generateCsrfToken(); ?>">
                                <?php if ($is_following): ?>
                                    <input type="hidden" name="action" value="unfollow">
                                    <button type="submit" class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition">取消关注</button>
                                <?php else: ?>
                                    <input type="hidden" name="action" value="follow">
                                    <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">关注</button>
                                <?php endif; ?>
                            </form>
                        <?php endif; ?>
                    </div>
                    <p class="text-gray-600">注册于 <?php echo date('Y-m-d', strtotime($user['created_at'])); ?></p>
                    <div class="flex space-x-4 mt-2">
                        <span class="text-gray-700">粉丝: <?php echo $follower_count; ?></span>
                        <span class="text-gray-700">关注: <?php echo $following_count; ?></span>
                    </div>
                    <?php if (!empty($user['bio'])): ?>
                        <p class="mt-2 text-gray-700"><?php echo htmlspecialchars($user['bio']); ?></p>
                    <?php endif; ?>
                    <?php if (!empty($user['website']) || !empty($user['github']) || !empty($user['twitter'])): ?>
                        <div class="flex space-x-4 mt-4">
                            <?php if (!empty($user['website'])): ?>
                                <a href="<?php echo htmlspecialchars($user['website']); ?>" target="_blank" class="text-blue-600 hover:underline">网站</a>
                            <?php endif; ?>
                            <?php if (!empty($user['github'])): ?>
                                <a href="https://github.com/<?php echo htmlspecialchars($user['github']); ?>" target="_blank" class="text-blue-600 hover:underline">GitHub</a>
                            <?php endif; ?>
                            <?php if (!empty($user['twitter'])): ?>
                                <a href="https://twitter.com/<?php echo htmlspecialchars($user['twitter']); ?>" target="_blank" class="text-blue-600 hover:underline">Twitter</a>
                            <?php endif; ?>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h2 class="text-2xl font-bold mb-4">文章</h2>
                <?php if (!empty($user_posts)): ?>
                    <?php foreach ($user_posts as $post): ?>
                        <div class="bg-white rounded-lg shadow-md p-6 mb-4">
                            <h3 class="text-xl font-bold mb-2"><?php echo htmlspecialchars($post['title']); ?></h3>
                            <p class="text-gray-600 mb-4"><?php echo htmlspecialchars(mb_substr(strip_tags($post['content']), 0, 100)); ?>...</p>
                            <a href="post.php?id=<?php echo $post['id']; ?>" class="text-blue-600 hover:underline">阅读更多</a>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <p class="text-gray-500">暂无文章</p>
                <?php endif; ?>
            </div>

            <div>
                <h2 class="text-2xl font-bold mb-4">视频</h2>
                <?php if (!empty($user_videos)): ?>
                    <?php foreach ($user_videos as $video): ?>
                        <div class="bg-white rounded-lg shadow-md p-6 mb-4">
                            <h3 class="text-xl font-bold mb-2"><?php echo htmlspecialchars($video['title']); ?></h3>
                            <p class="text-gray-600 mb-4"><?php echo htmlspecialchars($video['description'] ?? ''); ?></p>
                            <a href="video.php?id=<?php echo $video['id']; ?>" class="text-blue-600 hover:underline">观看视频</a>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <p class="text-gray-500">暂无视频</p>
                <?php endif; ?>
            </div>
        </div>
    </div>
</body>
</html>
