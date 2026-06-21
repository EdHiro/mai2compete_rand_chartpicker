<?php
http_response_code(500);
require_once __DIR__ . '/../config.php';
$pageTitle = '服务器错误';
require_once __DIR__ . '/../header.php';
?>
<div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="max-w-xl p-8 bg-white shadow-lg rounded-lg text-center">
        <div class="mb-6">
            <h1 class="text-6xl font-bold text-red-600 mb-4">500</h1>
            <p class="text-2xl text-gray-700 mb-2">服务器错误</p>
            <p class="text-gray-500">抱歉，服务器出现了一些问题。请稍后再试。</p>
        </div>
        <div class="flex justify-center gap-4">
            <button onclick="location.reload()" 
                    class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                重新加载
            </button>
            <a href="/" 
               class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                返回首页
            </a>
        </div>
    </div>
</div>
