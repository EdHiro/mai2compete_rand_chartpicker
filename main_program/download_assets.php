<?php
$basePath = __DIR__ . '/assets/js/editorjs/';
if (!is_dir($basePath)) {
    mkdir($basePath, 0755, true);
}

$resources = [
    'editor.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/editorjs@2.26.5/dist/editor.min.js',
    'editorjs/header.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/header@2.7.0/dist/bundle.min.js',
    'editorjs/list.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/list@1.8.0/dist/bundle.min.js',
    'editorjs/image.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/image@2.8.1/dist/bundle.min.js',
    'editorjs/quote.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/quote@2.5.0/dist/bundle.min.js',
    'editorjs/marker.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/marker@1.3.0/dist/bundle.min.js',
    'editorjs/code.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/code@2.8.0/dist/bundle.min.js',
    'editorjs/delimiter.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/delimiter@1.3.0/dist/bundle.min.js',
    'editorjs/embed.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/embed@2.5.3/dist/bundle.min.js',
    'editorjs/table.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/table@2.2.1/dist/table.min.js',
    'editorjs/warning.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/warning@1.3.0/dist/bundle.min.js',
    'editorjs/underline.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/underline@1.1.0/dist/bundle.min.js'
];

foreach ($resources as $path => $url) {
    $savePath = __DIR__ . '/assets/js/' . $path;
    
    // 确保目录存在
    $dir = dirname($savePath);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    // 下载文件
    $content = file_get_contents($url);
    if ($content === false) {
        echo "下载失败: $url\n";
        continue;
    }
    
    // 保存文件
    if (file_put_contents($savePath, $content) === false) {
        echo "保存失败: $path\n";
        continue;
    }
    
    echo "成功下载: $path\n";
}

echo "资源下载完成！\n";
