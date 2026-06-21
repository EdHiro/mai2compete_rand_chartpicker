<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

// 检查管理员权限
if (!$auth->isAdmin()) {
    header('Location: index.php');
    exit;
}

$action = $_GET['action'] ?? '';
$userId = $_GET['id'] ?? 0;
$error = '';
$success = '';

// 处理表单提交
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $email = trim($_POST['email']);
    $password = $_POST['password'];
    $isAdmin = isset($_POST['is_admin']) ? 1 : 0;

    try {
        if ($action === 'create') {
            // 创建新用户
            if (empty($password)) {
                throw new Exception('密码不能为空');
            }
            $auth->register($username, $email, $password, $isAdmin);
            $success = '用户创建成功';
        } else {
            // 更新用户
            if (!empty($password)) {
                $auth->updateUser($userId, $username, $email, $password, $isAdmin);
            } else {
                $auth->updateUserWithoutPassword($userId, $username, $email, $isAdmin);
            }
            $success = '用户信息已更新';
        }
    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}

// 获取用户信息（编辑模式）
$user = null;
if ($userId && $action !== 'create') {
    $user = $auth->getUserById($userId);
    if (!$user) {
        header('Location: admin.php');
        exit;
    }
}

?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $action === 'create' ? '添加用户' : '编辑用户'; ?> - <?php echo SITE_NAME; ?></title>
    <script src="/js/twnd.css.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background-color: #f3f4f6;
        }
    </style>
</head>
<body>
        <div class="max-w-md mx-auto my-8 p-6 bg-white rounded-lg shadow-md">
            <h1 class="text-2xl font-semibold mb-6">
                <?php echo $action === 'create' ? '添加新用户' : '编辑用户'; ?>
            </h1>

            <?php if ($error): ?>
                <div class="mb-4 p-3 bg-red-100 text-red-700 rounded"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>

            <?php if ($success): ?>
                <div class="mb-4 p-3 bg-green-100 text-green-700 rounded"><?php echo htmlspecialchars($success); ?></div>
            <?php endif; ?>

            <form method="post" class="space-y-4">
                <div>
                    <input 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="用户名" 
                        name="username" 
                        value="<?php echo htmlspecialchars($user['username'] ?? ''); ?>" 
                        required>
                </div>

                <div>
                    <input 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="邮箱" 
                        name="email" 
                        type="email" 
                        value="<?php echo htmlspecialchars($user['email'] ?? ''); ?>" 
                        required>
                </div>

                <div>
                    <input 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="密码" 
                        name="password" 
                        type="password" 
                        <?php echo $action === 'create' ? 'required' : ''; ?>>
                    <?php if ($action !== 'create'): ?>
                        <p class="mt-1 text-sm text-gray-500">留空则不修改密码</p>
                    <?php endif; ?>
                </div>

                <div class="flex items-center">
                    <input 
                        type="checkbox" 
                        name="is_admin" 
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        <?php echo ($user['is_admin'] ?? false) ? 'checked' : ''; ?>>
                    <label class="ml-2 block text-sm text-gray-700">管理员权限</label>
                </div>

                <div class="flex space-x-3">
                    <button 
                        type="submit" 
                        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        <?php echo $action === 'create' ? '创建用户' : '保存更改'; ?>
                    </button>
                    <button 
                        type="button" 
                        onclick="location.href='admin.php'" 
                        class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        取消
                    </button>
                </div>
            </form>
        </div>
        
        <?php if ($auth->isAdmin()): ?>
            <div class="mt-4 text-center">
                <a href="admin.php" class="inline-block px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    返回后台
                </a>
            </div>
        <?php endif; ?>
</body>
</html>