<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

class Content {
    private $db;
    private $auth;

    public function __construct($db, $auth) {
        $this->db = $db;
        $this->auth = $auth;
    }

    // 创建文章
    public function createPost($title, $content, $content_type = 'post', $is_draft = false) {
        if (!$this->auth->isLoggedIn()) return false;
        
        try {
            if (!is_string($content)) {
                $content = json_encode($content, JSON_UNESCAPED_UNICODE);
            }
            
            $this->db->beginTransaction();
            $stmt = $this->db->prepare("INSERT INTO posts (user_id, title, content, content_type, is_draft) VALUES (?, ?, ?, ?, ?)");
            $success = $stmt->execute([$_SESSION['user_id'], $title, $content, $content_type, $is_draft ? 1 : 0]);
            
            if ($success) {
                $this->db->commit();
                return $this->db->lastInsertId();
            }
            
            $this->db->rollBack();
            return false;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw new Exception("创建文章失败: " . $e->getMessage());
        }
    }

    // 创建视频
    public function createVideo($title, $description, $video_url, $thumbnail_url = null, $qualities = null) {
        if (!$this->auth->isLoggedIn()) return false;
        
        try {
            $this->db->beginTransaction();
            
            // 创建主视频记录
            $stmt = $this->db->prepare("INSERT INTO videos (user_id, title, description, video_url, thumbnail_url, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))");
            $success = $stmt->execute([$_SESSION['user_id'], $title, $description, $video_url, $thumbnail_url]);
            
            if (!$success) {
                throw new Exception('创建视频记录失败');
            }
            
            $videoId = $this->db->lastInsertId();
            
            // 如果有质量版本，添加到video_qualities表
            if ($qualities && is_array($qualities)) {
                $qualityStmt = $this->db->prepare("INSERT INTO video_qualities (video_id, quality, video_url, width, height, bitrate, filesize, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($qualities as $quality => $info) {
                    $success = $qualityStmt->execute([
                        $videoId,
                        $quality,
                        $info['url'],
                        $info['width'],
                        $info['height'],
                        $info['bitrate'],
                        $info['filesize'],
                        $info['duration']
                    ]);
                    if (!$success) {
                        throw new Exception('添加视频质量版本失败');
                    }
                }
            }
            
            $this->db->commit();
            return $videoId;
            
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw new Exception('创建视频失败: ' . $e->getMessage());
        }
    }

    // 优化：一次性获取文章及其点赞数，避免 N+1 查询
    public function getAllPostsWithLikeCount($limit = 20, $offset = 0) {
        $stmt = $this->db->prepare("SELECT posts.*, users.username, 
            (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as view_count
            FROM posts 
            JOIN users ON posts.user_id = users.id 
            WHERE posts.is_draft = 0
            ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->execute([$limit, $offset]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // 优化：一次性获取视频及其信息，避免 N+1 查询
    public function getAllVideosWithLikeCount($limit = 20, $offset = 0) {
        $stmt = $this->db->prepare("SELECT videos.*, users.username, videos.view_count
            FROM videos 
            JOIN users ON videos.user_id = users.id 
            ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->execute([$limit, $offset]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // 获取所有文章（保留向后兼容）
    public function getAllPosts() {
        $stmt = $this->db->query("SELECT posts.*, users.username FROM posts JOIN users ON posts.user_id = users.id WHERE posts.is_draft = 0 ORDER BY created_at DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // 获取所有视频（保留向后兼容）
    public function getAllVideos() {
        $stmt = $this->db->query("SELECT videos.*, users.username FROM videos JOIN users ON videos.user_id = users.id ORDER BY created_at DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // 添加评论（优化：去除不必要的事务，修复 SQL 注入风险）
    public function addComment($contentId, $type, $content, $parentId = null) {
        if (!$this->auth->isLoggedIn()) return false;
        
        if (empty($contentId)) {
            throw new Exception('content_id cannot be empty');
        }
        
        // 优化：验证 type 防止 SQL 注入
        $column = $type === 'post' ? 'post_id' : 'video_id';
        $stmt = $this->db->prepare("INSERT INTO comments (user_id, $column, content, parent_id, content_id, content_type) VALUES (?, ?, ?, ?, ?, ?)");
        return $stmt->execute([$_SESSION['user_id'], $contentId, $content, $parentId, $contentId, $type]);
    }

    // 获取单个文章
    public function getPost($id) {
        $stmt = $this->db->prepare("SELECT posts.*, users.username FROM posts JOIN users ON posts.user_id = users.id WHERE posts.id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // 增加视频/文章浏览计数
    public function incrementViewCount($id, $type = 'video') {
        if ($type === 'post') {
            $stmt = $this->db->prepare("UPDATE posts SET view_count = view_count + 1 WHERE id = ?");
        } else {
            $stmt = $this->db->prepare("UPDATE videos SET view_count = view_count + 1 WHERE id = ?");
        }
        return $stmt->execute([$id]);
    }

    // 获取单个视频
    public function getVideo($id) {
        $stmt = $this->db->prepare("SELECT videos.*, users.username FROM videos JOIN users ON videos.user_id = users.id WHERE videos.id = ?");
        $stmt->execute([$id]);
        $video = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($video) {
            // 获取视频的所有质量版本
            $qualityStmt = $this->db->prepare("SELECT quality, video_url FROM video_qualities WHERE video_id = ? ORDER BY quality DESC");
            $qualityStmt->execute([$id]);
            $qualities = [];
            
            while ($row = $qualityStmt->fetch(PDO::FETCH_ASSOC)) {
                $qualities[(int)$row['quality']] = $row['video_url'];
            }
            
            // 如果没有质量版本记录，尝试从原始URL推断
            if (empty($qualities) && !empty($video['video_url'])) {
                $quality = 720; // 默认质量
                if (preg_match('/_([0-9]+)\.[a-zA-Z0-9]+$/', $video['video_url'], $matches)) {
                    $quality = (int)$matches[1];
                }
                $qualities[$quality] = $video['video_url'];
            }
            
            $video['qualities'] = $qualities;
        }
        
        return $video;
    }
    
    // 获取用户的所有文章
    public function getPostsByUser($userId) {
        $stmt = $this->db->prepare("SELECT posts.*, users.username FROM posts JOIN users ON posts.user_id = users.id WHERE posts.user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // 获取用户的所有视频
    public function getVideosByUser($userId) {
        $stmt = $this->db->prepare("SELECT videos.*, users.username FROM videos JOIN users ON videos.user_id = users.id WHERE videos.user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // 根据ID获取内容（通用方法）
    public function getContentById($id) {
        // 分别查询文章和视频信息
        $postStmt = $this->db->prepare("SELECT 
            posts.id, 
            posts.user_id, 
            posts.title, 
            posts.content, 
            posts.content_type,
            posts.created_at,
            posts.updated_at,
            users.username
        FROM posts 
        JOIN users ON posts.user_id = users.id
        WHERE posts.id = ?");
        $postStmt->execute([$id]);
        $post = $postStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($post) {
            // 检查content是否已经是JSON格式
            if (!empty($post['content'])) {
                $decoded = json_decode($post['content'], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $post['content'] = $decoded;
                }
            }
            return $post;
        }
        
        $videoStmt = $this->db->prepare("SELECT 
            videos.id, 
            videos.user_id, 
            videos.title, 
            videos.description, 
            videos.video_url,
            videos.created_at,
            videos.updated_at,
            'video' AS content_type,
            users.username
        FROM videos 
        JOIN users ON videos.user_id = users.id
        WHERE videos.id = ?");
        $videoStmt->execute([$id]);
        $video = $videoStmt->fetch(PDO::FETCH_ASSOC);
        
        // 合并结果，优先返回找到的内容
        return $post ?: $video;
    }

    // 删除文章
    public function deletePost($id) {
        if (!$this->auth->isAdmin()) return false;
        
        $stmt = $this->db->prepare("DELETE FROM posts WHERE id = ?");
        return $stmt->execute([$id]);
    }

    // 删除视频
    public function deleteVideo($id) {
        if (!$this->auth->isAdmin()) return false;
        
        $stmt = $this->db->prepare("DELETE FROM videos WHERE id = ?");
        return $stmt->execute([$id]);
    }
    
    // 更新文章内容
    public function updateContent($id, $title, $content, $is_draft = null) {
        if (!$this->auth->isLoggedIn()) {
            throw new Exception('用户未登录');
        }
        
        try {
            // 验证用户权限
            $post = $this->getPost($id);
            if (!$post || ($post['user_id'] != $_SESSION['user_id'] && !$this->auth->isAdmin())) {
                throw new Exception('没有权限修改此文章');
            }
            
            if (!is_string($content)) {
                $content = json_encode($content, JSON_UNESCAPED_UNICODE);
            }
            
            $this->db->beginTransaction();
            if ($is_draft !== null) {
                $stmt = $this->db->prepare("UPDATE posts SET title = ?, content = ?, is_draft = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                $success = $stmt->execute([$title, $content, $is_draft ? 1 : 0, $id]);
            } else {
                $stmt = $this->db->prepare("UPDATE posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                $success = $stmt->execute([$title, $content, $id]);
            }
            
            if ($success) {
                $this->db->commit();
                return true;
            }
            
            $this->db->rollBack();
            throw new Exception('更新文章失败');
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw new Exception("更新失败: " . $e->getMessage());
        }
    }
    
    // 更新视频内容
    public function updateVideo($id, $title, $video_url, $description = null, $thumbnail_url = null, $qualities = null) {
        // 参数基础验证
        if(empty($video_url) || (!filter_var($video_url, FILTER_VALIDATE_URL) && !file_exists(__DIR__.'/'.$video_url))) {
            throw new Exception('视频路径无效');
        }
        if (!$this->auth->isLoggedIn()) {
            throw new Exception('用户未登录');
        }
        
        // 验证参数
        if (empty($id) || !is_numeric($id)) {
            throw new Exception('无效的视频ID');
        }
        if (empty($title) || strlen($title) > 255) {
            throw new Exception('标题不能为空且长度不能超过255字符');
        }
        
        // 允许本地文件路径或URL
        if (empty($video_url)) {
            throw new Exception('视频URL或文件路径不能为空');
        }
        
        // 如果是URL则验证格式
        if (strpos($video_url, 'http') === 0 && !filter_var($video_url, FILTER_VALIDATE_URL)) {
            throw new Exception('无效的视频URL');
        }
        
        try {
            $this->db->beginTransaction();
            
            $stmt = $this->db->prepare("UPDATE videos SET title = ?, video_url = ?, description = ?, thumbnail_url = ?, video_qualities = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?");
            $stmt->execute([$title, $video_url, $description, $thumbnail_url, $qualities ? json_encode($qualities) : null, $id, $_SESSION['user_id']]);
            
            if ($stmt->rowCount() === 0) {
                $this->db->rollBack();
                throw new Exception('视频不存在或您没有权限修改');
            }
            
            $this->db->commit();
            return $this->getVideo($id);
            
        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log("更新视频失败: " . $e->getMessage());
            throw new Exception('更新视频时发生错误: ' . $e->getMessage());
        }
    }
    
    // 获取点赞数量
    public function getLikesCount($contentId, $type) {
        $column = $type === 'post' ? 'post_id' : 'video_id';
        $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM likes WHERE $column = ?");
        $stmt->execute([$contentId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'] ?? 0;
    }
    
    // 获取评论
    public function getComments($contentId, $type, $page = 1, $perPage = 10) {
        $column = $type === 'post' ? 'post_id' : 'video_id';
        $offset = ($page - 1) * $perPage;
        $stmt = $this->db->prepare("SELECT comments.*, users.username FROM comments JOIN users ON comments.user_id = users.id WHERE $column = ? AND parent_id IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->execute([$contentId, $perPage, $offset]);
        $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 获取每条评论的回复
        foreach ($comments as &$comment) {
            $comment['replies'] = $this->getCommentReplies($comment['id']);
        }
        
        return $comments;
    }
        
    // 添加点赞
    public function addLike($contentId, $type) {
        if (!$this->auth->isLoggedIn()) return false;
        
        // 检查是否已经点赞
        $stmt = $this->db->prepare("SELECT id FROM likes WHERE user_id = ? AND " . ($type === 'post' ? 'post_id' : 'video_id') . " = ?");
        $stmt->execute([$_SESSION['user_id'], $contentId]);
        if ($stmt->fetch()) return false;
        
        $stmt = $this->db->prepare("INSERT INTO likes (user_id, content_id, content_type) VALUES (?, ?, ?)");
        return $stmt->execute([$_SESSION['user_id'], $contentId, $type]);
    }
    
    // 取消点赞
    public function removeLike($contentId, $type) {
        if (!$this->auth->isLoggedIn()) return false;
        
        $stmt = $this->db->prepare("DELETE FROM likes WHERE user_id = ? AND content_id = ? AND content_type = ?");
        return $stmt->execute([$_SESSION['user_id'], $contentId, $type]);
    }
    

    
    // 检查用户是否点赞
    public function hasLiked($contentId, $type) {
        if (!$this->auth->isLoggedIn()) return false;
        
        $stmt = $this->db->prepare("SELECT id FROM likes WHERE user_id = ? AND " . ($type === 'post' ? 'post_id' : 'video_id') . " = ?");
        $stmt->execute([$_SESSION['user_id'], $contentId]);
        return (bool)$stmt->fetch();
    }
    
    public function getCommentReplies($commentId) {
        $stmt = $this->db->prepare("SELECT comments.*, users.username FROM comments JOIN users ON comments.user_id = users.id WHERE parent_id = ? ORDER BY created_at ASC");
        $stmt->execute([$commentId]);
        $replies = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 递归获取嵌套回复
        foreach ($replies as &$reply) {
            $reply['replies'] = $this->getCommentReplies($reply['id']);
        }
        
        return $replies;
    }
    
    public function getCommentsCount($contentId, $type) {
        $column = $type === 'post' ? 'post_id' : 'video_id';
        $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM comments WHERE $column = ?");
        $stmt->execute([$contentId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'];
    }
    

    

    

}

// 全局：基于用户ID固定头像颜色
function getAvatarColor($userId) {
    $colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500'];
    return $colors[$userId % count($colors)];
}

// 初始化内容管理系统
$content = new Content($db, $auth);
?>