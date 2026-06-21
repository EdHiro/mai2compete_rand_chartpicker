<?php
http_response_code(404);
require_once __DIR__ . '/../config.php';
$pageTitle = '页面未找到';
require_once __DIR__ . '/../header.php';
?>
<div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="max-w-xl p-8 bg-white shadow-lg rounded-lg text-center">
        <div class="mb-6">
            <h1 class="text-6xl font-bold text-blue-600 mb-4">404</h1>
            <p class="text-2xl text-gray-700 mb-2">页面未找到</p>
            <p class="text-gray-500">抱歉，您访问的页面不存在或已被移除。</p>
        </div>
        <div class="flex justify-center gap-4">
            <button onclick="history.back()" 
                    class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                返回上页
            </button>
            <a href="/" 
               class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                返回首页
            </a>
        </div>
    </div>
</div>
