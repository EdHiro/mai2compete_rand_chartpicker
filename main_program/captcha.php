<?php
require_once __DIR__ . '/config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 生成随机验证码
$chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
$length = 4;
$code = '';
for ($i = 0; $i < $length; $i++) {
    $code .= $chars[rand(0, strlen($chars) - 1)];
}

// 存储验证码到session
$_SESSION['captcha'] = $code;

// 创建验证码图片
$width = 120;
$height = 40;
$image = imagecreatetruecolor($width, $height);

// 设置背景色和文本色
$bgColor = imagecolorallocate($image, 255, 255, 255);
$textColor = imagecolorallocate($image, 0, 0, 0);

// 填充背景
imagefilledrectangle($image, 0, 0, $width, $height, $bgColor);

// 添加干扰线
for ($i = 0; $i < 5; $i++) {
    $lineColor = imagecolorallocate($image, rand(0, 255), rand(0, 255), rand(0, 255));
    imageline($image, rand(0, $width), rand(0, $height), rand(0, $width), rand(0, $height), $lineColor);
}

// 添加干扰点
for ($i = 0; $i < 50; $i++) {
    $pixelColor = imagecolorallocate($image, rand(0, 255), rand(0, 255), rand(0, 255));
    imagesetpixel($image, rand(0, $width), rand(0, $height), $pixelColor);
}

// 添加验证码文本
$fontPath = __DIR__ . '/fonts/arial.ttf';
if (file_exists($fontPath)) {
    imagettftext($image, 20, rand(-10, 10), 20, 30, $textColor, $fontPath, $code);
} else {
    imagestring($image, 5, 20, 10, $code, $textColor);
}

// 输出图片
header('Content-Type: image/png');
imagepng($image);
imagedestroy($image);
?>