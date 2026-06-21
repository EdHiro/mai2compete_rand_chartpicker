<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/content.php';

$pageTitle = '首页';
$contentObj = new Content($db, $auth);

require_once __DIR__ . '/header.php';

// 优化：使用批量查询替代 N+1 查询，并添加分页限制
$limit = 20;
$posts = $contentObj->getAllPostsWithLikeCount($limit, 0);
$videos = $contentObj->getAllVideosWithLikeCount($limit, 0);

// 为文章添加类型标记
$posts = array_map(function($post) {
    return array_merge($post, ['type' => 'posts']);
}, $posts);

// 为视频添加类型标记
$videos = array_map(function($video) {
    return array_merge($video, ['type' => 'videos']);
}, $videos);

$allContent = array_merge($posts, $videos);
usort($allContent, function($a, $b) {
    return strtotime($b['created_at']) - strtotime($a['created_at']);
});
?>
<main class="min-h-screen bg-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-8 flex justify-between items-center">
            <div class="flex gap-4">
                <button id="show-all" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active">全部</button>
                <button id="show-posts" class="px-4 py-2 bg-white text-gray-600 rounded-lg hover:bg-blue-50">文章</button>
                <button id="show-videos" class="px-4 py-2 bg-white text-gray-600 rounded-lg hover:bg-blue-50">视频</button>
            </div>
            <select id="sort-select" class="px-4 py-2 border rounded-lg text-gray-600" aria-label="排序方式">
                <option value="latest">最新发布</option>
                <option value="popular">最多浏览</option>
            </select>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="content-grid">
            <?php foreach ($allContent as $item): 
                $isPost = $item['type'] === 'posts';
            ?>
                <div class="content-item <?php echo $item['type']; ?>"
                     data-type="<?php echo $item['type']; ?>"
                     data-date="<?php echo $item['created_at']; ?>"
                     data-views="<?php echo $item['view_count'] ?? 0; ?>">
                    <div class="bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow duration-300">
                        <?php if (!$isPost && isset($item['thumbnail_url'])): ?>
                            <div class="relative aspect-video bg-gray-100">
                                <img src="<?php echo htmlspecialchars($item['thumbnail_url']); ?>" 
                                     alt="视频封面" 
                                     class="w-full h-full object-cover" loading="lazy">
                                <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                                    <div class="w-16 h-16 flex items-center justify-center rounded-full bg-blue-600 bg-opacity-75">
                                        <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        <?php endif; ?>
                        
                        <div class="p-6 flex-1 flex flex-col">
                            <h3 class="text-xl font-bold mb-2 hover:text-blue-600 transition-colors">
                                <a href="<?php echo $isPost ? 'post.php?id=' : 'video.php?id='; ?><?php echo $item['id']; ?>">
                                    <?php echo htmlspecialchars($item['title']); ?>
                                </a>
                            </h3>
                            
                            <p class="text-gray-600 mb-4 flex-1">
                                <?php 
                                    if ($isPost) {
                                        $content = $item['content'];
                                        $decoded = json_decode($content, true);
                                        if (json_last_error() === JSON_ERROR_NONE && isset($decoded['blocks'])) {
                                            $text = '';
                                            foreach ($decoded['blocks'] as $block) {
                                                if ($block['type'] === 'paragraph') {
                                                    $blockText = strip_tags($block['data']['text']);
                                                    $text .= $blockText . ' ';
                                                }
                                            }
                                        } else {
                                            $text = strip_tags($content);
                                        }
                                        $text = trim(preg_replace('/\s+/', ' ', $text));
                                        echo htmlspecialchars(mb_substr($text, 0, 150)) . '...';
                                    } else {
                                        echo htmlspecialchars(mb_substr($item['description'] ?? '', 0, 150)) . '...';
                                    }
                                ?>
                            </p>
                            
                            <div class="mt-auto flex items-center justify-between">
                                <div class="flex items-center space-x-4">
                                    <span class="text-sm text-gray-500">
                                        <?php echo date('Y-m-d', strtotime($item['created_at'])); ?>
                                    </span>
                                    <span class="text-sm text-gray-500 flex items-center">
                                        <!-- 优化：使用 SVG 图标代替 emoji -->
                                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        </svg>
                                        <?php echo number_format($item['view_count'] ?? 0); ?>
                                    </span>
                                </div>
                                <a href="<?php echo $isPost ? 'post.php?id=' : 'video.php?id='; ?><?php echo $item['id']; ?>" 
                                   class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                                    <?php echo $isPost ? '阅读' : '观看'; ?>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</main>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const grid = document.getElementById('content-grid');
    const filterButtons = document.querySelectorAll('#show-all, #show-posts, #show-videos');
    const sortSelect = document.getElementById('sort-select');
    
    function filterContent(type) {
        const items = document.querySelectorAll('.content-item');
        items.forEach(item => {
            if (type === 'all' || item.dataset.type === type) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    function sortContent(criteria) {
        const visibleItems = Array.from(document.querySelectorAll('.content-item:not([style*="display: none"])'));
        visibleItems.sort((a, b) => {
            if (criteria === 'latest') {
                return new Date(b.dataset.date) - new Date(a.dataset.date);
            }
            return parseInt(b.dataset.views) - parseInt(a.dataset.views);
        });
        visibleItems.forEach(item => grid.appendChild(item));
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('bg-white', 'text-gray-600');
            });
            button.classList.remove('bg-white', 'text-gray-600');
            button.classList.add('bg-blue-500', 'text-white');
            
            const type = button.id.split('-')[1];
            filterContent(type);
            sortContent(sortSelect.value);
        });
    });

    sortSelect.addEventListener('change', (e) => {
        sortContent(e.target.value);
    });

    // 初始化显示
    filterContent('all');
});
</script>
</body>
</html>
