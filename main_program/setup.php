<?php
// 创建必要的目录
$dirs = [
    'assets/css',
    'assets/js',
    'assets/js/editorjs/tools',
];

foreach ($dirs as $dir) {
    if (!file_exists(__DIR__ . '/' . $dir)) {
        mkdir(__DIR__ . '/' . $dir, 0755, true);
    }
}

// 下载 Tailwind CSS
$tailwindUrl = 'https://cdn.tailwindcss.com/3.3.3/tailwind.min.css';
$tailwindPath = __DIR__ . '/assets/css/tailwind.min.css';
file_put_contents($tailwindPath, file_get_contents($tailwindUrl));

// 下载 EditorJS 和工具
$editorjsFiles = [
    'editor.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/editorjs@latest/dist/editor.min.js',
    'tools/header.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/header@latest/dist/bundle.min.js',
    'tools/list.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/list@latest/dist/bundle.min.js',
    'tools/checklist.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/checklist@latest/dist/bundle.min.js',
    'tools/quote.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/quote@latest/dist/bundle.min.js',
    'tools/code.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/code@latest/dist/bundle.min.js',
    'tools/marker.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/marker@latest/dist/bundle.min.js',
    'tools/delimiter.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/delimiter@latest/dist/bundle.min.js',
    'tools/image.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/image@latest/dist/bundle.min.js',
    'tools/embed.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/embed@latest/dist/bundle.min.js',
    'tools/table.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/table@latest/dist/bundle.min.js',
    'tools/warning.min.js' => 'https://cdn.jsdelivr.net/npm/@editorjs/warning@latest/dist/bundle.min.js'
];

foreach ($editorjsFiles as $file => $url) {
    $path = __DIR__ . '/assets/js/editorjs/' . $file;
    if (!file_exists(dirname($path))) {
        mkdir(dirname($path), 0755, true);
    }
    file_put_contents($path, file_get_contents($url));
}

echo "Setup completed successfully!\n";
