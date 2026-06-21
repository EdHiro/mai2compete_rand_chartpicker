<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/content.php';

// 检查用户是否已登录
if (!$auth->isLoggedIn()) {
    header('Location: login.php');
    exit;
}

$content = new Content($db, $auth);
$errors = [];
$success = false;

// 获取文章ID（如果是编辑现有文章）
$content_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$post = null;

// 如果是编辑现有文章，获取文章内容
if ($content_id) {
    $post = $content->getPost($content_id);
    // 检查权限
    if (!$post || ($post['user_id'] != $_SESSION['user_id'] && !$auth->isAdmin())) {
        header('Location: index.php');
        exit;
    }
}

// 处理表单提交
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = trim($_POST['title'] ?? '');
    $editorContent = $_POST['content'] ?? '';
    $isDraft = isset($_POST['is_draft']) ? true : false;

    // 验证标题
    if (empty($title)) {
        $errors[] = '标题不能为空';
    }

    // 验证内容
    if (empty($editorContent)) {
        $errors[] = '内容不能为空';
    }

    // 如果没有错误，保存文章
    if (empty($errors)) {
        try {
            if ($content_id) {
                // 更新现有文章
                $success = $content->updateContent($content_id, $title, json_decode($editorContent, true), $isDraft);
                if ($success) {
                    header('Location: post.php?id=' . $content_id);
                    exit;
                }
            } else {
                // 创建新文章
                $newPostId = $content->createPost($title, json_decode($editorContent, true), 'post', $isDraft);
                if ($newPostId) {
                    header('Location: post.php?id=' . $newPostId);
                    exit;
                }
            }
        } catch (Exception $e) {
            $errors[] = $e->getMessage();
        }
    }
}

?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $content_id ? '编辑文章' : '写文章'; ?> - <?php echo SITE_NAME; ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Editor.js 核心 -->
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/editorjs@2.26.5/dist/editor.min.js"></script>
    <!-- 编辑器基础插件 -->
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/code@2.8.0/dist/bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/delimiter@1.3.0/dist/bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/table@2.2.1/dist/table.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/warning@1.3.0/dist/bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/embed@2.5.3/dist/bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/header@2.7.0/dist/bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/list@1.8.0/dist/bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/image@2.8.1/dist/bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/quote@2.5.0/dist/bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/marker@1.3.0/dist/bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/underline@1.1.0/dist/bundle.min.js"></script>
    <!-- 文本格式化工具 -->
    <script src="/assets/js/editorjs/tools/text-alignment.js"></script>
    <script src="/assets/js/editorjs/tools/text-color.js"></script>
    <!-- 新增插件 -->
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/attaches@1.3.0/dist/bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/checklist@1.5.0/dist/bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/editorjs-drag-drop@1.1.13/dist/bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/editorjs-undo@2.0.26/dist/bundle.min.js"></script>
    <!-- Mermaid 支持 -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.0/dist/mermaid.min.js"></script>
    <script>mermaid.initialize({ startOnLoad: false });</script>
    <!-- Mermaid 工具 -->
    <script src="/assets/js/editorjs/tools/mermaid-tool.js"></script>
    <!-- 配置文件 -->
    <script src="/assets/js/editorjs/config.js"></script>
    <!-- 自动保存功能 -->
    <script src="/assets/js/autosave.js"></script>
    <!-- 主题支持 -->
    <script src="/assets/js/editor-theme.js"></script>
    <!-- 编辑器工具样式 -->
    <link rel="stylesheet" href="/assets/css/editor-tools.css">
    <!-- 代码编辑器增强样式 -->
    <link rel="stylesheet" href="/assets/css/code-editor.css">
    <!-- 编辑器工具初始化 -->
    <script src="/assets/js/editor-tools-init.js"></script>
</head>
<body class="bg-gray-100">
    <div class="flex min-h-screen">
        <!-- 侧边栏 -->
        <div class="w-64 bg-white shadow-md">
            <div class="p-4 border-b">
                <h1 class="text-xl font-bold"><?php echo SITE_NAME; ?></h1>
            </div>
            <nav class="p-4 space-y-2">
                <a href="manage_content.php" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">所有文章</a>
                <a href="post_edit.php" class="block px-4 py-2 bg-blue-100 text-blue-700 rounded">写文章</a>
                <a href="video_edit.php" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">添加视频</a>
            </nav>
        </div>

        <!-- 主内容区 -->
        <div class="flex-1 p-8">
            <div class="bg-white rounded-lg shadow-md p-8">
                <h2 class="text-2xl font-bold mb-6"><?php echo $content_id ? '编辑文章' : '写文章'; ?></h2>
                
                <?php if (!empty($errors)): ?>
                    <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                        <?php foreach ($errors as $error): ?>
                            <p class="mb-1"><?php echo htmlspecialchars($error); ?></p>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
                
                <form id="postForm" method="POST" class="space-y-6">
                    <div class="mb-4">
                        <label for="title" class="block text-sm font-medium text-gray-700 mb-2">标题</label>
                        <input type="text" id="title" name="title" 
                               value="<?php echo htmlspecialchars($post['title'] ?? ''); ?>" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                               required>
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">内容</label>
                        <div id="editorjs" class="border border-gray-300 rounded-md min-h-[400px] p-4"></div>
                        <input type="hidden" name="content" id="editorContent">
                    </div>

                    <div class="flex items-center mb-4">
                        <input type="checkbox" id="is_draft" name="is_draft" class="h-4 w-4 text-blue-600" 
                               <?php echo (isset($post['is_draft']) && $post['is_draft']) ? 'checked' : ''; ?>>
                        <label for="is_draft" class="ml-2 text-sm text-gray-700">保存为草稿</label>
                    </div>

                    <div class="flex justify-end space-x-4">
                        <button type="button" onclick="window.location.href='manage_content.php'" 
                                class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
                            取消
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <?php echo $content_id ? '更新' : '发布'; ?>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        // 等待DOM完全加载后初始化编辑器
        document.addEventListener('DOMContentLoaded', function() {
            // 初始化编辑器
            const editor = new EditorJS({
                holder: 'editorjs',
                tools: {
                    header: {
                        class: Header,
                        inlineToolbar: true
                    },
                    list: {
                        class: List,
                        inlineToolbar: true
                    },
                    code: CustomCodeTool,
                    image: {
                        class: ImageTool,
                        config: {
                            endpoints: {
                                byFile: 'upload.php'
                            }
                        }
                    },
                    quote: {
                        class: Quote,
                        inlineToolbar: true
                    },
                    marker: Marker,
                    underline: Underline,
                    table: {
                        class: Table,
                        inlineToolbar: true
                    },
                    warning: Warning,
                    delimiter: Delimiter,
                    embed: Embed,
                    mermaid: {
                        class: MermaidTool
                    },
                    checklist: {
                        class: Checklist,
                        inlineToolbar: true
                    },
                    attaches: {
                        class: AttachesTool,
                        config: {
                            endpoint: 'upload.php'
                        }
                    }
                },
                data: <?php echo $post ? $post['content'] : '{}'; ?>,
                onChange: function() {
                    editor.save().then((outputData) => {
                        document.getElementById('editorContent').value = JSON.stringify(outputData);
                    });
                }
            });

            // 表单提交前保存编辑器内容
            document.getElementById('postForm').addEventListener('submit', function(e) {
                e.preventDefault();
                editor.save().then((outputData) => {
                    document.getElementById('editorContent').value = JSON.stringify(outputData);
                    this.submit();
                });
            });
        });

    </script>
</body>
</html>