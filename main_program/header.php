<?php
/**
 * 公共头部文件，包含导航栏和页面动画
 */
if (!defined('SITE_NAME')) {
    require_once __DIR__ . '/config.php';
}
if (!isset($auth)) {
    require_once __DIR__ . '/auth.php';
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($pageTitle) ? htmlspecialchars($pageTitle) . ' - ' . SITE_NAME : SITE_NAME; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="/js/twnd.css.js"></script>
    <style>
        @keyframes fadeInPage {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOutPage {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
        }
        body { animation: fadeInPage 0.3s ease-out forwards; }
        body.page-leaving { animation: fadeOutPage 0.3s ease-out forwards; }
        main { animation: fadeInPage 0.4s ease-out 0.1s; opacity: 0; animation-fill-mode: forwards; }
        body.loaded { opacity: 1; transform: translateY(0); }
        body.leaving { opacity: 0; transform: translateY(-10px); pointer-events: none; }
    </style>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            document.body.classList.add('loaded');
            document.addEventListener('click', function(e) {
                const target = e.target.closest('a, button[onclick*="location"]');
                if (!target) return;
                const url = target.href || (target.getAttribute('onclick') || '').match(/location\.href='([^']+)'/)?.[1];
                if (!url || url.startsWith('#') || url.includes('javascript:')) return;
                e.preventDefault();
                document.body.classList.add('leaving');
                setTimeout(() => { window.location.href = url; }, 300);
            });
        });
        window.addEventListener('pageshow', function(event) {
            if (event.persisted) {
                document.body.classList.remove('leaving');
                document.body.classList.add('loaded');
            }
        });
    </script>
</head>
<body>
<!-- 导航栏组件 -->
<nav class="bg-white shadow-lg sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
            <div class="flex items-center">
                <h1 class="text-blue-600 text-3xl font-bold cursor-pointer" onclick="location.href='index.php'"><?php echo SITE_NAME; ?></h1>
            </div>
            <div class="flex space-x-6">
                <?php if (isset($auth) && $auth->isLoggedIn()): ?>
                    <?php if ($auth->isAdmin()): ?>
                        <button onclick="location.href='admin.php'" class="px-6 py-3 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-all duration-300 font-medium">
                            后台管理
                        </button>
                    <?php endif; ?>
                    <button onclick="location.href='profile.php?id=<?php echo $_SESSION['user_id']; ?>'" class="px-6 py-3 text-blue-600 hover:text-blue-800 rounded-lg transition-all duration-300 font-medium">
                        <?php echo htmlspecialchars($_SESSION['username']); ?>
                    </button>
                    <button onclick="location.href='logout.php'" class="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all duration-300 font-medium">
                        退出
                    </button>
                <?php else: ?>
                    <button onclick="location.href='login.php'" class="px-6 py-3 text-blue-600 hover:text-blue-800 rounded-lg transition-all duration-300 font-medium">
                        登录
                    </button>
                    <button onclick="location.href='register.php'" class="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all duration-300 font-medium">
                        注册
                    </button>
                <?php endif; ?>
            </div>
        </div>
    </div>
</nav>
