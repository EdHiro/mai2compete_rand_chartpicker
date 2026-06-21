<?php
class VideoProcessor {
    private $ffmpegPath = __DIR__ . '/tools/ffmpeg.exe';
    private $outputDir;
    private $qualities = [
        '1080' => ['width' => 1920, 'height' => 1080, 'bitrate' => '5000k'],
        '720' => ['width' => 1280, 'height' => 720, 'bitrate' => '2500k'],
        '480' => ['width' => 854, 'height' => 480, 'bitrate' => '1500k'],
        '360' => ['width' => 640, 'height' => 360, 'bitrate' => '800k']
    ];
    private $filesize;
    private $duration;
    private $db;

    public function __construct($videoPath, $outputDir) {
        $this->videoPath = $videoPath;
        $this->outputDir = $outputDir;
        $this->db = new SQLite3(__DIR__ . '/db.db');
    }

    public function generateQualities() {
        // 获取视频文件大小
        $this->filesize = filesize($this->videoPath);
        
        // 获取视频时长
        $cmd = sprintf(
            '%s -i %s 2>&1',
            escapeshellarg($this->ffmpegPath),
            escapeshellarg($this->videoPath)
        );
        exec($cmd, $output);
        $duration = 0;
        foreach ($output as $line) {
            if (preg_match('/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/', $line, $matches)) {
                $duration = $matches[1] * 3600 + $matches[2] * 60 + $matches[3];
                break;
            }
        }
        $this->duration = $duration;
        
        $results = [];
        $baseFilename = pathinfo($this->videoPath, PATHINFO_FILENAME);

        foreach ($this->qualities as $quality => $settings) {
            $outputPath = $this->outputDir . $baseFilename . '_' . $quality . '.mp4';
            if ($this->transcode($settings['width'], $settings['height'], $settings['bitrate'], $outputPath)) {
                // 获取转码后的文件大小（KB）
                $filesize = round(filesize($outputPath) / 1024);
                
                $results[$quality] = [
                    'url' => '/uploads/videos/' . basename($outputPath),
                    'width' => $settings['width'],
                    'height' => $settings['height'],
                    'bitrate' => (int)str_replace('k', '', $settings['bitrate']),
                    'filesize' => $filesize,
                    'duration' => $this->duration
                ];
            }
        }

        return $results;
    }

    private function transcode($width, $height, $bitrate, $outputPath) {
        $cmd = sprintf(
            '%s -i %s -vf "scale=%d:%d" -b:v %s -c:v libx264 -preset ultrafast -threads 8 -c:a aac -b:a 128k -movflags +faststart %s 2>&1',
            escapeshellarg($this->ffmpegPath),
            escapeshellarg($this->videoPath),
            $width,
            $height,
            $bitrate,
            escapeshellarg($outputPath)
        );

        exec($cmd, $output, $returnCode);
        return $returnCode === 0;
    }

    public function getVideoInfo() {
        $cmd = sprintf(
            '%s -i %s 2>&1',
            escapeshellarg($this->ffmpegPath),
            escapeshellarg($this->videoPath)
        );

        exec($cmd, $output);
        return implode("\n", $output);
    }
}