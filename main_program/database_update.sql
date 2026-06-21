-- 视频分辨率表
CREATE TABLE video_qualities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    quality TEXT NOT NULL,  -- '360', '480', '720', '1080'
    video_url TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    bitrate INTEGER NOT NULL,  -- 单位kbps
    filesize INTEGER NOT NULL,  -- 单位KB
    duration INTEGER NOT NULL,  -- 单位秒
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
);

-- 更新视频表，添加默认质量字段
ALTER TABLE videos ADD COLUMN default_quality INTEGER DEFAULT 720;