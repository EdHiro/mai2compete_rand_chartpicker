<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/content.php';

$pageTitle = '文章详情';
$postPageTitle = $post['title'];
$postId = $_GET['id'] ?? 0;
$contentObj = new Content($db, $auth);
$post = $contentObj->getPost($postId);

if (!$post) {
    header('Location: index.php');
    exit;
}

// 增加文章浏览量
$contentObj->incrementViewCount($postId, 'post');

require_once __DIR__ . '/header.php';

// 解析文章内容为 JSON
$postContentJson = is_array($post['content']) ? json_encode($post['content']) : $post['content'];
if (json_last_error() !== JSON_ERROR_NONE) {
    $postContentJson = json_encode(['blocks' => [['type' => 'paragraph', 'data' => ['text' => $post['content']]]]]);
}

$postContentData = json_decode($postContentJson, true);
if (!$postContentData || !isset($postContentData['blocks'])) {
    $postContentData = ['blocks' => [['type' => 'paragraph', 'data' => ['text' => $post['content']]]]];
}

// 生成 HTML
$postContent = '';
if (isset($postContentData['blocks']) && is_array($postContentData['blocks'])) {
    foreach ($postContentData['blocks'] as $block) {
        $blockType = $block['type'] ?? '';
        $blockData = $block['data'] ?? [];

        switch ($blockType) {
            case 'paragraph':
                $postContent .= sprintf('<p class="mb-4">%s</p>', $blockData['text']);
                break;
            
            case 'header':
                $level = isset($blockData['level']) ? intval($blockData['level']) : 2;
                $classes = match($level) {
                    1 => 'text-4xl font-bold mt-8 mb-4',
                    2 => 'text-3xl font-bold mt-6 mb-3',
                    3 => 'text-2xl font-semibold mt-4 mb-2',
                    default => 'text-xl font-semibold mt-3 mb-2'
                };
                $postContent .= sprintf('<h%d class="%s">%s</h%d>', $level, $classes, $blockData['text'], $level);
                break;
            
            case 'quote':
                $alignment = $blockData['alignment'] === 'left' ? 'text-left' : 'text-center';
                $postContent .= sprintf('<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-6 italic text-gray-600 %s">%s</blockquote>', $alignment, $blockData['text']);
                break;
            
            case 'list':
                $isOrdered = $blockData['style'] === 'ordered';
                $items = array_map(fn($item) => sprintf('<li class="ml-4">%s</li>', $item['content']), $blockData['items']);
                $tag = $isOrdered ? 'ol' : 'ul';
                $postContent .= sprintf('<%s class="list-disc pl-6 mb-4">%s</%s>', $tag, implode('', $items), $tag);
                break;
            
            case 'code':
                $language = $blockData['language'] ?? '';
                $code = $blockData['code'] ?? '';
                $postContent .= sprintf('<div class="bg-gray-800 rounded-lg p-4 mb-4 relative group"><div class="flex justify-between items-center mb-2"><span class="text-gray-400 text-sm">%s</span><button class="copy-code bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition" data-code="%s">复制</button></div><pre class="text-green-400 overflow-x-auto"><code class="language-%s">%s</code></pre></div>', $language, htmlspecialchars($code, ENT_QUOTES), $language, htmlspecialchars($code));
                break;
            
            case 'image':
                // 修复：图片 URL 存储在 file.url 中，不是直接的 url
                $fileData = $blockData['file'] ?? [];
                $imageUrl = $fileData['url'] ?? $blockData['url'] ?? '';
                $caption = $fileData['caption'] ?? $blockData['caption'] ?? '';
                
                if (empty($imageUrl)) {
                    $postContent .= '<div class="p-4 bg-gray-100 rounded-lg mb-4"><p class="text-gray-600">图片 URL 为空</p></div>';
                    break;
                }
                
                // 处理路径
                if (strpos($imageUrl, 'http') !== 0) {
                    // 相对路径或绝对路径，确保以 / 开头
                    $imageUrl = '/' . ltrim($imageUrl, '/');
                }
                
                $captionHtml = !empty($caption) 
                    ? sprintf('<figcaption class="text-center text-gray-500 text-sm mt-2">%s</figcaption>', htmlspecialchars($caption)) 
                    : '';
                
                // 添加 lightbox 功能：点击可放大
                $escapedUrl = htmlspecialchars($imageUrl);
                $escapedAlt = htmlspecialchars($caption ?: '文章图片');
                $postContent .= sprintf(
                    '<figure class="mb-6 flex justify-center"><img src="%s" alt="%s" class="rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity max-w-full h-auto" loading="lazy" onclick="openLightbox(this.src)">%s</figure>', 
                    $escapedUrl, 
                    $escapedAlt, 
                    $captionHtml
                );
                break;
            
            case 'embed':
                $postContent .= sprintf('<div class="embed-responsive aspect-video mb-4">%s</div>', $blockData['embed'] ?? '');
                break;
            
            case 'video':
                $postContent .= sprintf('<div class="aspect-video mb-6"><video class="w-full h-full rounded-lg shadow-md" controls preload="metadata"><source src="%s" type="video/mp4">您的浏览器不支持 HTML5 视频播放</video></div>', htmlspecialchars($blockData['url'] ?? ''));
                break;
            
            case 'audio':
                $postContent .= sprintf('<div class="mb-6"><audio class="w-full" controls preload="metadata"><source src="%s" type="audio/mpeg">您的浏览器不支持 HTML5 音频播放</audio></div>', htmlspecialchars($blockData['url'] ?? ''));
                break;
            
            case 'attaches':
                $postContent .= sprintf('<div class="mb-4 p-4 bg-gray-50 rounded-lg"><h3 class="text-lg font-semibold mb-2">附件</h3><a href="%s" class="text-blue-600 hover:underline">%s</a></div>', htmlspecialchars($blockData['url'] ?? ''), htmlspecialchars($blockData['name'] ?? '下载文件'));
                break;
            
            case 'table':
                $rows = array_map(function($row) {
                    $cells = array_map(fn($cell) => sprintf('<td class="border border-gray-300 px-4 py-2">%s</td>', $cell), $row);
                    return sprintf('<tr>%s</tr>', implode('', $cells));
                }, $blockData['content'] ?? []);
                $postContent .= sprintf('<div class="overflow-x-auto mb-4"><table class="min-w-full border-collapse border border-gray-300">%s</table></div>', implode('', $rows));
                break;
            
            case 'delimiter':
                $postContent .= '<div class="my-8 text-center"><span class="text-2xl">***</span></div>';
                break;
            
            case 'raw':
                $postContent .= sprintf('<div class="my-4 p-4 bg-gray-100 rounded-lg"><pre class="text-sm">%s</pre></div>', htmlspecialchars($blockData['html'] ?? ''));
                break;
            
            case 'checklist':
                $items = array_map(function($item) {
                    $checked = $item['checked'] ? 'checked' : '';
                    return sprintf('<label class="flex items-center space-x-2 mb-2"><input type="checkbox" %s class="form-checkbox h-4 w-4 text-blue-600"><span>%s</span></label>', $checked, htmlspecialchars($item['text'] ?? ''));
                }, $blockData['items'] ?? []);
                $postContent .= sprintf('<div class="space-y-2 mb-4">%s</div>', implode('', $items));
                break;
            
            case 'warning':
                $postContent .= sprintf('<div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-4"><p class="font-bold">%s</p><p>%s</p></div>', htmlspecialchars($blockData['title'] ?? ''), htmlspecialchars($blockData['message'] ?? ''));
                break;
            
            case 'personLink':
                $postContent .= sprintf('<div class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 my-4"><p><a href="%s" class="underline">%s</a></p></div>', htmlspecialchars($blockData['link'] ?? '#'), htmlspecialchars($blockData['name'] ?? ''));
                break;
            
            case 'markdown':
                $postContent .= sprintf('<div class="prose max-w-none mb-4">%s</div>', $blockData['source'] ?? '');
                break;
            
            case 'mermaid':
                static $mermaidCounter = 0;
                $mermaidId = 'mermaid-' . ++$mermaidCounter;
                $code = $blockData['code'] ?? '';
                $postContent .= sprintf('<div class="bg-white rounded-lg p-4 mb-4"><div class="mermaid" id="%s">%s</div></div>', $mermaidId, htmlspecialchars($code));
                break;
            
            default:
                $postContent .= sprintf('<div class="p-4 bg-gray-100 rounded-lg mb-4"><p class="text-gray-600">不支持的模块类型: %s</p></div>', htmlspecialchars($blockType));
                break;
        }
    }
}
?>
    <title><?php echo htmlspecialchars($post['title']); ?> - <?php echo SITE_NAME; ?></title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    <script>
        mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose', themeCSS: '.node rect { fill: #e6f3ff; }' });
    </script>
    <style>
        .prose img { margin: 1.5rem auto; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 100%; height: auto; }
        .prose figure { display: flex; flex-direction: column; align-items: center; margin: 1.5rem 0; }
        .prose blockquote { border-left-width: 4px; border-left-color: #3b82f6; padding-left: 1rem; font-style: italic; }
        .prose code { background-color: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
        
        /* Lightbox 样式 */
        .lightbox {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 9999;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            animation: lightboxFadeIn 0.2s ease-out;
        }
        .lightbox.active { display: flex; }
        
        .lightbox img {
            max-width: 90vw;
            max-height: 90vh;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            cursor: zoom-in;
            transition: transform 0.3s ease;
        }
        .lightbox img.zoomed { cursor: zoom-out; transform: scale(2); }
        
        .lightbox-close {
            position: absolute;
            top: 20px;
            right: 30px;
            color: white;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            transition: background 0.2s;
        }
        .lightbox-close:hover { background: rgba(255, 255, 255, 0.2); }
        
        @keyframes lightboxFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        /* 移动端适配 */
        @media (max-width: 768px) {
            .lightbox img { max-width: 95vw; max-height: 80vh; }
            .lightbox-close { top: 10px; right: 15px; font-size: 30px; width: 40px; height: 40px; }
        }
    </style>
</head>
<body>
<main class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4">
        <article class="bg-white rounded-lg shadow-md p-8">
            <header class="mb-8 border-b pb-6">
                <h1 class="text-3xl font-bold mb-4"><?php echo htmlspecialchars($post['title']); ?></h1>
                <div class="flex items-center justify-between text-gray-500 text-sm">
                    <div class="flex items-center gap-4">
                        <span>作者: <?php echo htmlspecialchars($post['username']); ?></span>
                        <span>发布于: <?php echo date('Y-m-d H:i', strtotime($post['created_at']) + (new DateTimeZone(SITE_TIMEZONE))->getOffset(new DateTime())); ?></span>
                        <?php if ($post['updated_at'] && $post['updated_at'] !== $post['created_at']): ?>
                            <span>更新于: <?php echo date('Y-m-d H:i', strtotime($post['updated_at']) + (new DateTimeZone(SITE_TIMEZONE))->getOffset(new DateTime())); ?></span>
                        <?php endif; ?>
                    </div>
                    <?php if ($auth->isAdmin()): ?>
                        <form method="post" action="admin.php">
                            <input type="hidden" name="action" value="delete">
                            <input type="hidden" name="type" value="post">
                            <input type="hidden" name="id" value="<?php echo $post['id']; ?>">
                            <input type="hidden" name="csrf_token" value="<?php echo generateCsrfToken(); ?>">
                            <button type="submit" class="text-red-600 hover:text-red-800" onclick="return confirm('确定删除这篇文章吗？')">删除文章</button>
                        </form>
                    <?php endif; ?>
                </div>
            </header>

            <div class="prose max-w-none mb-8">
                <?php echo $postContent; ?>
            </div>
        </article>

        <div class="bg-white rounded-lg shadow-md p-8 mt-8">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">评论</h2>

            <?php if ($auth->isLoggedIn()): ?>
                <form id="comment-form" class="mb-8" onsubmit="event.preventDefault()">
                    <input type="hidden" name="content_id" value="<?php echo $post['id']; ?>">
                    <input type="hidden" name="content_type" value="post">
                    <input type="hidden" name="csrf_token" value="<?php echo generateCsrfToken(); ?>">
                    <textarea name="content" placeholder="写下你的评论..." rows="4" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"></textarea>
                    <button type="submit" class="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200">提交评论</button>
                </form>
                <script>
document.getElementById('comment-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('comment.php', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            const commentHtml = `<div class="group relative border-l-2 border-blue-100 pl-6 py-4 hover:bg-gray-50 transition-all duration-300"><div class="flex items-start gap-4"><div class="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-medium">${result.comment.username.charAt(0)}</div><div class="flex-1"><div class="flex items-baseline gap-3 mb-2"><span class="font-semibold text-gray-800">${result.comment.username}</span><span class="text-xs text-gray-400">${new Date().toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</span></div><p class="text-gray-700 leading-relaxed mb-3">${result.comment.content}</p></div></div></div>`;
            document.querySelector('.comments-list').insertAdjacentHTML('afterbegin', commentHtml);
            e.target.reset();
        } else {
            alert(result.message || '评论发送失败');
        }
    } catch (error) {
        alert('评论发送失败，请稍后重试');
    }
});
</script>
            <?php else: ?>
                <p class="text-gray-600 mb-6">请<a href="login.php" class="text-blue-600 hover:text-blue-800 font-medium">登录</a>后发表评论</p>
            <?php endif; ?>

            <div class="comments-list space-y-4">
                <?php
                $comments = $contentObj->getComments($post['id'], 'post', 1, 10);
                foreach ($comments as $comment) {
                    $avatarColor = getAvatarColor($comment['user_id']);
                    $initials = mb_substr($comment['username'], 0, 1);
                ?>
                    <div class="group relative border-l-2 border-blue-100 pl-6 py-4 hover:bg-gray-50 transition-all duration-300">
                        <div class="flex items-start gap-4">
                            <div class="<?php echo $avatarColor; ?> w-10 h-10 rounded-full flex items-center justify-center text-white font-medium">
                                <?php echo $initials; ?>
                            </div>
                            <div class="flex-1">
                                <div class="flex items-baseline gap-3 mb-2">
                                    <span class="font-semibold text-gray-800"><?php echo htmlspecialchars($comment['username']); ?></span>
                                    <span class="text-xs text-gray-400"><?php echo date('m-d H:i', strtotime($comment['created_at'])); ?></span>
                                </div>
                                <p class="text-gray-700 leading-relaxed mb-3">
                                    <?php echo nl2br(htmlspecialchars($comment['content'])); ?>
                                </p>
                            </div>
                        </div>
                        <?php if (!empty($comment['replies'])): ?>
                            <div class="ml-6 space-y-4 mt-4">
                                <?php foreach ($comment['replies'] as $reply): ?>
                                    <div class="group relative border-l-2 border-blue-200 pl-6 py-4 hover:bg-gray-50 transition-all duration-300">
                                        <div class="flex items-start gap-4">
                                            <div class="<?php echo getAvatarColor($reply['user_id']); ?> w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                                <?php echo mb_substr($reply['username'], 0, 1); ?>
                                            </div>
                                            <div class="flex-1">
                                                <div class="flex items-baseline gap-3 mb-2">
                                                    <span class="font-semibold text-gray-800 text-sm"><?php echo htmlspecialchars($reply['username']); ?></span>
                                                    <span class="text-xs text-gray-400"><?php echo date('m-d H:i', strtotime($reply['created_at'])); ?></span>
                                                </div>
                                                <p class="text-gray-700 leading-relaxed text-sm">
                                                    <?php echo nl2br(htmlspecialchars($reply['content'])); ?>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php } ?>
            </div>
        </div>
    </div>
</main>

<!-- Lightbox 悬浮窗 -->
<div id="lightbox" class="lightbox" onclick="closeLightbox(event)">
    <span class="lightbox-close" onclick="closeLightbox(event)" aria-label="关闭">&times;</span>
    <img id="lightbox-img" src="" alt="放大图片" onclick="toggleZoom(event)">
</div>

<script>
// Lightbox 功能
function openLightbox(src) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    lightboxImg.src = src;
    lightboxImg.classList.remove('zoomed');
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden'; // 禁止背景滚动
}

function closeLightbox(event) {
    // 点击背景、关闭按钮或ESC键时关闭
    const lightbox = document.getElementById('lightbox');
    if (event.target === lightbox || event.target.classList.contains('lightbox-close')) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function toggleZoom(event) {
    event.stopPropagation();
    const img = event.target;
    img.classList.toggle('zoomed');
}

// ESC 键关闭 lightbox
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const lightbox = document.getElementById('lightbox');
        if (lightbox.classList.contains('active')) {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});
</script>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // 统一代码高亮
    document.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
    });

    // 统一复制代码功能
    document.querySelectorAll('.copy-code').forEach(button => {
        button.addEventListener('click', function() {
            const code = this.dataset.code;
            navigator.clipboard.writeText(code).then(() => {
                this.textContent = '已复制!';
                setTimeout(() => { this.textContent = '复制'; }, 2000);
            });
        });
    });
});
</script>
</body>
</html>
