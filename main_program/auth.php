<?php
require_once __DIR__ . '/config.php';

class Auth {
    private $db;
    private $isAdminCache = null; // 优化：缓存管理员状态

    public function __construct($db) {
        $this->db = $db;
    }

    // 检查用户名是否存在
    public function usernameExists($username) {
        $stmt = $this->db->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
    }

    // 检查邮箱是否存在
    public function emailExists($email) {
        $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
    }

    // 用户注册
    public function register($username, $email, $password, $is_admin = false) {
        $password_hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)");
        return $stmt->execute([$username, $email, $password_hash, $is_admin ? 1 : 0]);
    }

    // 用户登录
    public function login($username, $password) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['is_admin'] = $user['is_admin'];
            return true;
        }
        return false;
    }

    // 用户登出
    public function logout() {
        session_destroy();
    }

    // 检查用户是否登录
    public function isLoggedIn() {
        return isset($_SESSION['user_id']);
    }

    // 优化：缓存管理员状态检查，避免重复数据库查询
    public function isAdmin() {
        if (!isset($_SESSION['user_id'])) return false;
        
        // 使用缓存
        if ($this->isAdminCache !== null) return $this->isAdminCache;
        
        // 保持向后兼容，先检查session中的is_admin
        if (isset($_SESSION['is_admin']) && $_SESSION['is_admin']) {
            $this->isAdminCache = true;
            return true;
        }
        
        // 从数据库实时检查管理员状态
        $stmt = $this->db->prepare("SELECT is_admin FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $this->isAdminCache = ($user && $user['is_admin']);
        return $this->isAdminCache;
    }

    // 获取当前用户信息
    public function getCurrentUser() {
        if (!$this->isLoggedIn()) return null;
        
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    // 通过ID获取用户信息
    public function getUserById($id) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    // 获取所有用户
    public function getAllUsers() {
        $stmt = $this->db->prepare("SELECT * FROM users ORDER BY id ASC");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // 获取当前登录用户ID
    public function getUserId() {
        return isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
    }
    
    // 更新用户信息
    public function updateUser($id, $username, $email, $password, $is_admin) {
        $password_hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("UPDATE users SET username = ?, email = ?, password_hash = ?, is_admin = ? WHERE id = ?");
        return $stmt->execute([$username, $email, $password_hash, $is_admin, $id]);
    }
    
    // 更新用户信息（不更新密码）
    public function updateUserWithoutPassword($id, $username, $email, $is_admin, $avatar = null, $bio = null, $website = null, $github = null, $twitter = null) {
        $stmt = $this->db->prepare("UPDATE users SET username = ?, email = ?, is_admin = ?, avatar = ?, bio = ?, website = ?, github = ?, twitter = ? WHERE id = ?");
        return $stmt->execute([$username, $email, $is_admin, $avatar, $bio, $website, $github, $twitter, $id]);
    }

    // 关注用户
    public function followUser($followerId, $followingId) {
        $stmt = $this->db->prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)");
        return $stmt->execute([$followerId, $followingId]);
    }

    // 取消关注
    public function unfollowUser($followerId, $followingId) {
        $stmt = $this->db->prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?");
        return $stmt->execute([$followerId, $followingId]);
    }

    // 检查是否已关注
    public function isFollowing($followerId, $followingId) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = ?");
        $stmt->execute([$followerId, $followingId]);
        return $stmt->fetchColumn() > 0;
    }

    // 获取粉丝数
    public function getFollowerCount($userId) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM follows WHERE following_id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetchColumn();
    }

    // 获取关注数
    public function getFollowingCount($userId) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM follows WHERE follower_id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetchColumn();
    }
}

// 初始化认证系统
$auth = new Auth($db);
?>