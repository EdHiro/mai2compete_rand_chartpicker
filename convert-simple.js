// 转换脚本：将 151-C.json 转换为 songlist.json 格式
// 注意：这个脚本需要在 Node.js 环境中运行

const fs = require('fs');
const path = require('path');

// 文件路径
const SOURCE_PATH = path.join(__dirname, '151-C.json');
const OUTPUT_PATH = path.join(__dirname, 'converted-songlist.json');

console.log('开始转换...');

try {
  // 读取源文件
  const rawData = fs.readFileSync(SOURCE_PATH, 'utf-8');
  const sourceData = JSON.parse(rawData);

  console.log(`成功读取 ${sourceData.length} 首歌的源数据`);

  const result = [];
  let id = 1;

  // 处理每首歌
  for (const song of sourceData) {
    if (!song || !song.基础信息) continue;

    const base = song.基础信息;
    const levels = base.等级;

    // 处理 EXPERT 难度 (索引 2)
    if (levels[2]) {
      const levelInfo = parseLevel(levels[2]);
      result.push({
        id: id.toString(),
        name: base.歌名,
        difficulty: 'EXPERT',
        level: levelInfo.level,
        isPlus: levelInfo.isPlus,
        cover: `./public/covers/${base.image_url || ''}`,
        author: base.artist,
        difficultyAuthor: '',
        bpm: base.bpm || 120,
        chartType: convertType(base.type)
      });
      id++;
    }

    // 处理 MASTER 难度 (索引 3)
    if (levels[3]) {
      const levelInfo = parseLevel(levels[3]);
      result.push({
        id: id.toString(),
        name: base.歌名,
        difficulty: 'MASTER',
        level: levelInfo.level,
        isPlus: levelInfo.isPlus,
        cover: `./public/covers/${base.image_url || ''}`,
        author: base.artist,
        difficultyAuthor: '',
        bpm: base.bpm || 120,
        chartType: convertType(base.type)
      });
      id++;
    }

    // 处理 Re:MASTER 难度 (索引 4)
    if (levels[4]) {
      const levelInfo = parseLevel(levels[4]);
      result.push({
        id: id.toString(),
        name: base.歌名,
        difficulty: 'Re:MASTER',
        level: levelInfo.level,
        isPlus: levelInfo.isPlus,
        cover: `./public/covers/${base.image_url || ''}`,
        author: base.artist,
        difficultyAuthor: '',
        bpm: base.bpm || 120,
        chartType: convertType(base.type)
      });
      id++;
    }
  }

  console.log(`成功转换 ${result.length} 个难度数据`);

  // 写入输出文件
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`转换完成！输出文件: ${OUTPUT_PATH}`);

} catch (error) {
  console.error('转换失败:', error);
  process.exit(1);
}

// 辅助函数
function parseLevel(levelStr) {
  if (!levelStr) return { level: 1, isPlus: false };
  const isPlus = levelStr.includes('+');
  const level = parseInt(levelStr.replace('+', ''), 10);
  return { level, isPlus };
}

function convertType(type) {
  if (type === 'DX') return 'dx';
  return 'standard';
}