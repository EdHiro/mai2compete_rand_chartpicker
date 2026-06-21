<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/content.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

$content_id = $_GET['id'] ?? 0;
$contentObj = new Content($db, $auth);
$content = $contentObj->getContentById($content_id);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = $_POST['title'] ?? '';
    $description = $_POST['description'] ?? '';
    
    try {
        // 视频文件处理
        if (isset($_FILES['video_file']) && $_FILES['video_file']['error'] === UPLOAD_ERR_OK) {
            $video_info = processVideoUpload($_FILES['video_file']);
            $video_path = $video_info['path'];
            $qualities = $video_info['qualities'];
            $video_path = $video_info['path'];
            
            // 如果没有上传封面，则自动生成
            if (!isset($_FILES['thumbnail_file']) || $_FILES['thumbnail_file']['error'] !== UPLOAD_ERR_OK) {
                $thumbnail_path = generateVideoThumbnail($video_path);
            }
        }
        
        // 封面图处理
        if (isset($_FILES['thumbnail_file']) && $_FILES['thumbnail_file']['error'] === UPLOAD_ERR_OK) {
            $thumbnail_info = processImageUpload($_FILES['thumbnail_file'], 'covers');
            $thumbnail_path = $thumbnail_info['path'];
        } else if (isset($_POST['generated_thumbnail'])) {
            // 使用自动生成的缩略图
            $thumbnail_path = $_POST['generated_thumbnail'];
        }

        // 更新或创建视频
        if ($content_id) {
            if ($contentObj->updateVideo($content_id, $title, $video_path ?? null, $description, $thumbnail_path ?? null, $qualities ?? null)) {
                $_SESSION['success'] = "视频更新成功";
                header('Location: video.php?id='.$content_id);
                exit;
            }
        } else {
            if ($contentObj->createVideo($title, $description, $video_path, $thumbnail_path ?? null, $qualities ?? null)) {
                $_SESSION['success'] = "视频创建成功";
                header('Location: manage_content.php#videos');
                exit;
            }
        }
    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}

// 辅助函数：处理视频上传
function processVideoUpload($file) {
    require_once __DIR__ . '/VideoProcessor.php';
    
    $allowed_types = ['video/mp4', 'video/webm', 'video/ogg'];
    $max_size = 500 * 1024 * 1024; // 500MB
    
    if (!in_array($file['type'], $allowed_types)) {
        throw new Exception('不支持的视频格式，请上传 MP4, WebM 或 Ogg 格式');
    }
    
    if ($file['size'] > $max_size) {
        throw new Exception('视频文件过大，最大支持500MB');
    }
    
    $upload_dir = __DIR__ . '/uploads/videos/';
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }
    
    $filename = uniqid() . '_' . basename($file['name']);
    $filepath = $upload_dir . $filename;
    
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('视频上传失败');
    }
    
    // 生成不同画质的视频版本
    $processor = new VideoProcessor($filepath, $upload_dir);
    
    // 生成不同画质的视频版本
    $qualities = $processor->generateQualities();
    
    return [
        'path' => '/uploads/videos/' . $filename,
        'type' => $file['type'],
        'qualities' => $qualities
    ];
}

// 辅助函数：处理图片上传
function processImageUpload($file, $subfolder) {
    $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $max_size = 5 * 1024 * 1024; // 5MB
    
    if (!in_array($file['type'], $allowed_types)) {
        throw new Exception('不支持的图片格式，请上传 JPG, PNG, GIF 或 WebP 格式');
    }
    
    if ($file['size'] > $max_size) {
        throw new Exception('图片文件过大，最大支持5MB');
    }
    
    $upload_dir = __DIR__ . '/uploads/' . $subfolder . '/';
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }
    
    $filename = uniqid() . '_' . basename($file['name']);
    $filepath = $upload_dir . $filename;
    
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('图片上传失败');
    }
    
    return [
        'path' => '/uploads/' . $subfolder . '/' . $filename,
        'type' => $file['type']
    ];
}

// 辅助函数：生成视频缩略图
function generateVideoThumbnail($video_path) {
    $ffmpeg = __DIR__ . '/tools/ffmpeg.exe'; // FFmpeg路径
    $video_full_path = __DIR__ . $video_path;
    $thumbnail_dir = __DIR__ . '/uploads/covers/';
    $thumbnail_name = uniqid() . '_thumb.jpg';
    $thumbnail_path = $thumbnail_dir . $thumbnail_name;
    
    if (!file_exists($thumbnail_dir)) {
        mkdir($thumbnail_dir, 0777, true);
    }
    
    // 提取视频第一帧作为封面
    $command = sprintf(
        '%s -i %s -vframes 1 -an -s 640x360 -ss 1 %s 2>&1',
        $ffmpeg,
        escapeshellarg($video_full_path),
        escapeshellarg($thumbnail_path)
    );
    
    exec($command, $output, $return_var);
    
    if ($return_var !== 0) {
        // 如果FFmpeg失败，创建默认封面
        return createDefaultThumbnail($thumbnail_path);
    }
    
    return '/uploads/covers/' . $thumbnail_name;
}

// 辅助函数：创建默认封面
function createDefaultThumbnail($path) {
    $image = imagecreatetruecolor(640, 360);
    $bg_color = imagecolorallocate($image, 33, 33, 33);
    $text_color = imagecolorallocate($image, 255, 255, 255);
    
    imagefill($image, 0, 0, $bg_color);
    imagestring($image, 5, 270, 170, 'Video', $text_color);
    
    imagejpeg($image, $path);
    imagedestroy($image);
    
    return '/uploads/covers/' . basename($path);
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>编辑视频 - <?php echo SITE_NAME; ?></title>
    <script src="/js/twnd.css.js"></script>
    <style>
        .drag-area {
            border: 2px dashed #CBD5E0;
            border-radius: 0.5rem;
            padding: 2rem;
            text-align: center;
            transition: all 0.3s ease;
        }
        .drag-area.active {
            border-color: #4299E1;
            background-color: #EBF8FF;
        }
        .progress-bar {
            height: 0.5rem;
            border-radius: 9999px;
            background: #EDF2F7;
            overflow: hidden;
        }
        .progress-bar-fill {
            height: 100%;
            background: #4299E1;
            transition: width 0.2s ease;
        }
        .thumbnail-preview {
            max-width: 320px;
            max-height: 180px;
            object-fit: cover;
            border-radius: 0.375rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
    </style>
    <script>
        function generateCover() {
            const videoFile = document.querySelector('input[name="video_file"]').files[0];
            if (!videoFile) {
                alert('请先上传视频文件');
                return;
            }
            
            const formData = new FormData();
            formData.append('video', videoFile);
            
            fetch('/generate_cover.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 创建隐藏的缩略图路径输入
                    let thumbnailInput = document.querySelector('input[name="generated_thumbnail"]');
                    if (!thumbnailInput) {
                        thumbnailInput = document.createElement('input');
                        thumbnailInput.type = 'hidden';
                        thumbnailInput.name = 'generated_thumbnail';
                        document.querySelector('form').appendChild(thumbnailInput);
                    }
                    thumbnailInput.value = data.thumbnail_url;

                    // 更新预览图
                    const previewContainer = document.getElementById('thumbnail-preview-container');
                    if (!previewContainer) {
                        const container = document.createElement('div');
                        container.id = 'thumbnail-preview-container';
                        container.className = 'mt-2';
                        container.innerHTML = `
                            <span class="text-sm text-gray-500">生成的封面:</span>
                            <img src="${data.thumbnail_url}" 
                                 alt="视频封面" 
                                 class="mt-2 thumbnail-preview">
                        `;
                        document.querySelector('.space-y-4').appendChild(container);
                    } else {
                        const previewImg = previewContainer.querySelector('img');
                        if (previewImg) {
                            previewImg.src = data.thumbnail_url;
                        }
                    }

                    alert('封面图生成并应用成功');
                } else {
                    alert('封面图生成失败: ' + data.error);
                }
            })
            .catch(error => {
                alert('请求失败: ' + error);
            });
        }
        
        function uploadVideo(form) {
            const formData = new FormData(form);
            const progressBar = document.getElementById('uploadProgress');
            const progressContainer = document.getElementById('progressContainer');
            
            progressContainer.classList.remove('hidden');
            progressBar.value = 0;
            
            const xhr = new XMLHttpRequest();
            xhr.open('POST', form.action, true);
            
            xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressBar.value = percentComplete;
                }
            };
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    window.location.href = xhr.responseURL || form.getAttribute('data-success-url');
                } else {
                    alert('上传失败: ' + xhr.responseText);
                    progressContainer.classList.add('hidden');
                }
            };
            
            xhr.onerror = function() {
                alert('上传过程中发生错误');
                progressContainer.classList.add('hidden');
            };
            
            xhr.send(formData);
            return false;
        }
        
        // 拖放上传功能
        function setupDragAndDrop() {
            const dragArea = document.querySelector('.drag-area');
            const fileInput = document.querySelector('input[name="video_file"]');
            
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dragArea.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                dragArea.addEventListener(eventName, highlight, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dragArea.addEventListener(eventName, unhighlight, false);
            });

            function highlight() {
                dragArea.classList.add('active');
            }

            function unhighlight() {
                dragArea.classList.remove('active');
            }

            dragArea.addEventListener('drop', handleDrop, false);

            function handleDrop(e) {
                const dt = e.dataTransfer;
                const files = dt.files;
                fileInput.files = files;
                updateFileInfo(files[0]);
            }

            fileInput.addEventListener('change', function() {
                updateFileInfo(this.files[0]);
            });
        }

        function updateFileInfo(file) {
            if (!file) return;
            const infoEl = document.getElementById('fileInfo');
            const size = (file.size / (1024 * 1024)).toFixed(2);
            infoEl.innerHTML = `
                <div class="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p class="text-sm text-blue-800">
                        <span class="font-medium">已选择:</span> ${file.name}<br>
                        <span class="font-medium">大小:</span> ${size}MB<br>
                        <span class="font-medium">类型:</span> ${file.type}
                    </p>
                </div>
            `;
        }

        document.addEventListener('DOMContentLoaded', setupDragAndDrop);
    </script>
</head>
<body class="min-h-screen bg-gray-50">
    <div class="flex min-h-screen">
        <!-- 侧边栏导航 -->
        <div class="w-64 bg-white shadow-lg">
            <div class="p-6">
                <h1 class="text-xl font-bold text-gray-800"><?php echo SITE_NAME; ?></h1>
            </div>
            <nav class="mt-6">
                <a href="manage_content.php" class="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
                    <span>返回管理</span>
                </a>
                <a href="manage_content.php#videos" class="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
                    <span>视频列表</span>
                </a>
            </nav>
        </div>

        <!-- 主要内容区 -->
        <div class="flex-1 px-8 py-6">
            <div class="max-w-4xl mx-auto">
                <h2 class="text-2xl font-bold text-gray-800 mb-8"><?php echo $content_id ? '编辑视频' : '上传新视频'; ?></h2>

                <?php if (isset($_SESSION['success'])): ?>
                    <div class="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
                        <?php echo $_SESSION['success']; unset($_SESSION['success']); ?>
                    </div>
                <?php endif; ?>

                <?php if (isset($error)): ?>
                    <div class="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                        <?php echo $error; ?>
                    </div>
                <?php endif; ?>

                <form method="post" enctype="multipart/form-data" onsubmit="return uploadVideo(this)" class="space-y-6">
                    <div class="space-y-4">
                        <label class="block">
                            <span class="text-gray-700 font-medium">视频标题</span>
                            <input type="text" 
                                   name="title" 
                                   value="<?php echo htmlspecialchars($content['title'] ?? ''); ?>" 
                                   class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                                   required>
                        </label>

                        <label class="block">
                            <span class="text-gray-700 font-medium">视频简介</span>
                            <textarea name="description" 
                                      rows="4" 
                                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"><?php echo htmlspecialchars($content['description'] ?? ''); ?></textarea>
                        </label>

                        <div class="drag-area p-8 text-center">
                            <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                            <p class="mt-4 text-gray-600">拖放视频文件到此处或</p>
                            <input type="file" 
                                   name="video_file" 
                                   accept="video/mp4,video/webm,video/ogg"
                                   class="mt-2">
                            <div id="fileInfo"></div>
                        </div>

                        <!-- 进度条 -->
                        <div id="progressContainer" class="hidden space-y-2">
                            <div class="flex justify-between text-sm text-gray-600">
                                <span>上传进度</span>
                                <span id="progressText">0%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-bar-fill" style="width: 0%"></div>
                            </div>
                        </div>

                        <!-- 封面设置 -->
                        <div class="space-y-4">
                            <label class="block">
                                <span class="text-gray-700 font-medium">视频封面</span>
                                <div class="mt-2 flex items-start space-x-4">
                                    <div class="flex-1">
                                        <input type="file" 
                                               name="thumbnail_file" 
                                               accept="image/*"
                                               class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                                    </div>
                                    <button type="button"
                                            onclick="generateCover()"
                                            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                                        自动生成封面
                                    </button>
                                </div>
                            </label>

                            <?php if (!empty($content['thumbnail_url'])): ?>
                                <div class="mt-2">
                                    <span class="text-sm text-gray-500">当前封面:</span>
                                    <img src="<?php echo htmlspecialchars($content['thumbnail_url']); ?>" 
                                         alt="视频封面" 
                                         class="mt-2 thumbnail-preview">
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>

                    <div class="flex justify-end space-x-4">
                        <button type="button" 
                                onclick="history.back()" 
                                class="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                            取消
                        </button>
                        <button type="submit" 
                                class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            <?php echo $content_id ? '保存修改' : '开始上传'; ?>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>
</html>