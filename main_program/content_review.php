<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/content.php';

// 检查管理员权限
if (!$auth->isAdmin()) {
    header('Location: index.php');
    exit;
}

$type = $_GET['type'] ?? 'unreviewed';
$contentType = $_GET['content_type'] ?? 'all';
$page = $_GET['page'] ?? 1;
$perPage = 10;

// 获取待审核或举报内容
if ($type === 'unreviewed') {
    $contents = $content->getUnreviewedContents($contentType, $page, $perPage);
} else {
    $contents = $content->getReportedContents($contentType, $page, $perPage);
}

?><!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>内容审核 - <?php echo SITE_NAME; ?></title>
    <link href="https://unpkg.com/@fluentui/web-components@2.6.1/dist/web-components.min.css" rel="stylesheet">
    <style>
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f3f2f1;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 20px;
            background-color: #0078d4;
            color: white;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .content-section {
            background: white;
            border-radius: 4px;
            box-shadow: 0 1.6px 3.6px 0 rgba(0, 0, 0, 0.132), 0 0.3px 0.9px 0 rgba(0, 0, 0, 0.108);
            padding: 32px;
            margin-top: 20px;
        }
        .content-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .content-table {
            width: 100%;
            border-collapse: collapse;
        }
        .content-table th, .content-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #edebe9;
        }
        .content-table th {
            background-color: #f3f2f1;
        }
        .pagination {
            display: flex;
            justify-content: center;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <fluent-design-system-provider>
        <div class="header">
            <fluent-text size="large" weight="semibold"><?php echo SITE_NAME; ?> - 内容审核</fluent-text>
            <div>
                <fluent-button appearance="stealth"><?php echo $_SESSION['username']; ?></fluent-button>
                <fluent-button appearance="stealth" onclick="location.href='logout.php'">退出</fluent-button>
            </div>
        </div>

        <div class="container">
            <div class="content-section">
                <div class="content-header">
                    <fluent-text size="x-large" weight="semibold">
                        <?php echo $type === 'unreviewed' ? '待审核内容' : '举报内容'; ?>
                    </fluent-text>
                    <div style="display: flex; gap: 10px;">
                        <fluent-select name="content_type" onchange="location.href='content_review.php?type=<?php echo $type; ?>&content_type='+this.value">
                            <fluent-option value="all" <?php echo $contentType === 'all' ? 'selected' : ''; ?>>全部类型</fluent-option>
                            <fluent-option value="post" <?php echo $contentType === 'post' ? 'selected' : ''; ?>>文章</fluent-option>
                            <fluent-option value="video" <?php echo $contentType === 'video' ? 'selected' : ''; ?>>视频</fluent-option>
                            <fluent-option value="comment" <?php echo $contentType === 'comment' ? 'selected' : ''; ?>>评论</fluent-option>
                        </fluent-select>
                        <fluent-button appearance="primary" onclick="location.href='content_review.php?type=unreviewed'">待审核</fluent-button>
                        <fluent-button appearance="primary" onclick="location.href='content_review.php?type=reported'">举报内容</fluent-button>
                    </div>
                </div>

                <table class="content-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>标题/内容</th>
                            <th>类型</th>
                            <th>作者</th>
                            <th>提交时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($contents as $item): ?>
                        <tr>
                            <td><?php echo $item['id']; ?></td>
                            <td><?php echo htmlspecialchars($item['title'] ?? substr($item['content'], 0, 50)); ?></td>
                            <td><?php echo $item['type']; ?></td>
                            <td><?php echo htmlspecialchars($item['author_name']); ?></td>
                            <td><?php echo date('Y-m-d H:i', strtotime($item['created_at'])); ?></td>
                            <td>
                                <fluent-button appearance="outline" onclick="location.href='content_detail.php?id=<?php echo $item['id']; ?>&type=<?php echo $item['type']; ?>'">查看</fluent-button>
                                <fluent-button appearance="outline" onclick="if(confirm('确定通过审核吗？')) location.href='content_approve.php?id=<?php echo $item['id']; ?>&type=<?php echo $item['type']; ?>'">通过</fluent-button>
                                <fluent-button appearance="outline" onclick="if(confirm('确定拒绝吗？')) location.href='content_reject.php?id=<?php echo $item['id']; ?>&type=<?php echo $item['type']; ?>'">拒绝</fluent-button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>

                <div class="pagination">
                    <?php if ($page > 1): ?>
                        <fluent-button appearance="outline" onclick="location.href='content_review.php?type=<?php echo $type; ?>&content_type=<?php echo $contentType; ?>&page=<?php echo $page - 1; ?>'">上一页</fluent-button>
                    <?php endif; ?>
                    <fluent-text style="margin: 0 10px; align-self: center;">第 <?php echo $page; ?> 页</fluent-text>
                    <?php if (count($contents) === $perPage): ?>
                        <fluent-button appearance="outline" onclick="location.href='content_review.php?type=<?php echo $type; ?>&content_type=<?php echo $contentType; ?>&page=<?php echo $page + 1; ?>'">下一页</fluent-button>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </fluent-design-system-provider>
</body>
</html>