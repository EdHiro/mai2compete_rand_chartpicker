<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

if (!$auth->isLoggedIn()) {
    header('Location: login.php');
    exit;
}

$user_id = $_SESSION['user_id'];
$user = $auth->getUserById($user_id);

$error = '';
$success = '';

// 处理表单提交
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $email = trim($_POST['email']);
    
    // 处理头像上传
    if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
        $allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
        $file_type = $_FILES['avatar']['type'];
        
        if (in_array($file_type, $allowed_types)) {
            $upload_dir = __DIR__ . '/uploads/';
            if (!is_dir($upload_dir)) {
                mkdir($upload_dir, 0755, true);
            }
            $file_name = uniqid() . '_' . basename($_FILES['avatar']['name']);
            $upload_path = $upload_dir . $file_name;
            
            if (move_uploaded_file($_FILES['avatar']['tmp_name'], $upload_path)) {
                // 更新用户头像路径
                $stmt = $db->prepare("UPDATE users SET avatar = ? WHERE id = ?");
                $stmt->execute([$file_name, $user_id]);
                $success = '头像上传成功';
            } else {
                $error = '头像上传失败';
            }
        } else {
            $error = '只允许上传JPEG、PNG或GIF格式的图片';
        }
    }
    
    // 处理背景图片上传
    if (isset($_FILES['background_image']) && $_FILES['background_image']['error'] === UPLOAD_ERR_OK) {
        $allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
        $file_type = $_FILES['background_image']['type'];
        
        if (in_array($file_type, $allowed_types)) {
            $upload_dir = __DIR__ . '/uploads/';
            if (!is_dir($upload_dir)) {
                mkdir($upload_dir, 0755, true);
            }
            $file_name = uniqid() . '_' . basename($_FILES['background_image']['name']);
            $upload_path = $upload_dir . $file_name;
            
            if (move_uploaded_file($_FILES['background_image']['tmp_name'], $upload_path)) {
                // 更新用户背景图片路径
                $stmt = $db->prepare("UPDATE users SET background_image = ? WHERE id = ?");
                $stmt->execute([$file_name, $user_id]);
                $success = '背景图片上传成功';
            } else {
                $error = '背景图片上传失败';
            }
        } else {
            $error = '只允许上传JPEG、PNG或GIF格式的图片';
        }
    }
    
    if (empty($username) || empty($email)) {
        $error = '用户名和邮箱不能为空';
    } else {
        if ($auth->updateUserWithoutPassword($user_id, $username, $email, $user['is_admin'], isset($file_name) ? $file_name : null, $_POST['bio'] ?? null, $_POST['website'] ?? null, $_POST['github'] ?? null, $_POST['twitter'] ?? null)) {
            $success = '个人资料已更新';
            $_SESSION['username'] = $username;
            $user = $auth->getUserById($user_id); // 刷新用户信息
        } else {
            $error = '更新失败，请重试';
        }
    }
}

require_once __DIR__ . '/header.php';

?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>编辑个人资料 - <?php echo SITE_NAME; ?></title>
    <script src="/js/twnd.css.js"></script>
</head>
<body>
    <nav class="bg-white shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-20">
                <div class="flex items-center">
                    <h1 class="text-blue-600 text-3xl font-bold"><?php echo SITE_NAME; ?></h1>
                </div>
                <div class="flex space-x-6">
                    <button onclick="location.href='profile.php?id=<?php echo $_SESSION['user_id']; ?>'" class="px-6 py-3 text-blue-600 hover:text-blue-800 rounded-lg transition-all duration-300 font-medium">
                        <?php echo $_SESSION['username']; ?>
                    </button>
                    <button onclick="location.href='logout.php'" class="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all duration-300 font-medium">
                        退出
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
            <h2 class="text-2xl font-bold text-center mb-6">编辑个人资料</h2>
            
            <?php if ($error): ?>
                <div class="text-red-600 mb-4"><?php echo $error; ?></div>
            <?php elseif ($success): ?>
                <div class="text-green-600 mb-4"><?php echo $success; ?></div>
            <?php endif; ?>
            
            <form method="POST" action="profile_edit.php" enctype="multipart/form-data">
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2" for="username">用户名</label>
                    <input type="text" id="username" name="username" value="<?php echo htmlspecialchars($user['username']); ?>" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2" for="email">邮箱</label>
                    <input type="email" id="email" name="email" value="<?php echo htmlspecialchars($user['email']); ?>" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2" for="avatar">头像</label>
                    <input type="file" id="avatar" name="avatar" accept="image/*" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <?php if (!empty($user['avatar'])): ?>
                        <p class="text-sm text-gray-500 mt-1">当前头像: <?php echo htmlspecialchars($user['avatar']); ?></p>
                    <?php endif; ?>
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2" for="background_image">背景图片</label>
                    <input type="file" id="background_image" name="background_image" accept="image/*" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <?php if (!empty($user['background_image'])): ?>
                        <p class="text-sm text-gray-500 mt-1">当前背景: <?php echo htmlspecialchars($user['background_image']); ?></p>
                    <?php endif; ?>
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2" for="bio">个人简介</label>
                    <textarea id="bio" name="bio" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"><?php echo htmlspecialchars($user['bio'] ?? ''); ?></textarea>
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 mb-2">社交链接</label>
                    <div class="space-y-2">
                        <input type="text" id="website" name="website" placeholder="个人网站" value="<?php echo htmlspecialchars($user['website'] ?? ''); ?>" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <input type="text" id="github" name="github" placeholder="GitHub用户名" value="<?php echo htmlspecialchars($user['github'] ?? ''); ?>" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <input type="text" id="twitter" name="twitter" placeholder="Twitter用户名" value="<?php echo htmlspecialchars($user['twitter'] ?? ''); ?>" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                
                <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300">
                    保存更改
                </button>
            </form>
        </div>
    </div>
</body>
</html>