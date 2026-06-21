<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';
    $captcha = $_POST['captcha'] ?? '';
    
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (empty($_SESSION['captcha']) || strtolower($captcha) !== strtolower($_SESSION['captcha'])) {
        $error = "验证码错误";
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = "邮箱格式不正确";
    } elseif ($auth->usernameExists($username)) {
        $error = "用户名已存在";
    } elseif ($auth->emailExists($email)) {
        $error = "邮箱已被注册";
    } elseif ($password !== $confirm_password) {
        $error = "两次输入的密码不一致";
    } elseif ($auth->register($username, $email, $password, false)) {
        header('Location: login.php');
        exit;
    } else {
        $error = "用户名已存在或注册失败";
    }
}
?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>注册 - <?php echo SITE_NAME; ?></title>
    <script src="/js/twnd.css.js"></script>
</head>
<body>
        <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
                <h2 class="text-2xl font-bold text-center mb-6">注册</h2>
                
                <?php if (isset($error)): ?>
                    <div class="text-red-600 mb-4"><?php echo $error; ?></div>
                <?php endif; ?>
                
                <form method="post" class="space-y-4">
                    <input 
                        type="text" 
                        name="username" 
                        placeholder="用户名" 
                        required
                        class="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    
                    <input 
                        type="email" 
                        name="email" 
                        placeholder="邮箱" 
                        required
                        class="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    
                    <input 
                        type="password" 
                        name="password" 
                        placeholder="密码" 
                        required
                        class="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    
                    <input 
                        type="password" 
                        name="confirm_password" 
                        placeholder="确认密码" 
                        required
                        class="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500">    
                    
                        <div class="flex items-center space-x-2">
                        <input 
                            type="text" 
                            name="captcha" 
                            placeholder="验证码" 
                            required
                            class="w-1/2 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <img src="captcha.php" onclick="this.src='captcha.php?'+Math.random()" 
                            class="w-1/2 h-10 cursor-pointer" 
                            alt="验证码">
                    </div>
                    
                    
                    
                    <button 
                        type="submit" 
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        注册
                    </button>
                </form>
                
                <div class="mt-6 text-center">
                    <a href="login.php" class="text-blue-600 hover:text-blue-800 hover:underline">
                        已有账号？去登录
                    </a>
                </div>
            </div>
        </div>
</body>
</html>