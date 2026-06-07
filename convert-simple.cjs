// 通用转换脚本：将任意常见曲库格式转换为本项目使用的 song 格式
// 输出格式每项包含：id, name, difficulty, level, isPlus, cover, author, difficultyAuthor, bpm, chartType
// 使用：node convert-simple.cjs [input.json] [output.json]

const fs = require('fs');
const path = require('path');

const INPUT = process.argv[2] || path.join(__dirname, '151-C.json');
const OUTPUT = process.argv[3] || path.join(__dirname, 'converted-songlist.json');

console.log(`转换开始 — 输入: ${INPUT}，输出: ${OUTPUT}`);

let raw;
try {
  raw = fs.readFileSync(INPUT, 'utf-8');
} catch (err) {
  console.error('无法读取输入文件:', err.message);
  process.exit(1);
}

let source;
try {
  source = JSON.parse(raw);
} catch (err) {
  console.error('输入不是有效的 JSON:', err.message);
  process.exit(1);
}

// 规整为数组
if (!Array.isArray(source)) {
  if (source && typeof source === 'object') {
    // 例如 { songs: [...] }
    if (Array.isArray(source.songs)) source = source.songs;
    else source = Object.values(source).flat().filter(Boolean);
  } else {
    console.error('无法解析输入数据为数组');
    process.exit(1);
  }
}

const out = [];
let nextId = 1;

for (const item of source) {
  if (!item) continue;

  // 如果已经是目标格式的单条记录，直接归一化并推入
  if (item.name && item.difficulty && typeof item.level !== 'undefined') {
    out.push(normalizeItem(item));
    continue;
  }

  // 支持：每首歌包含 charts 数组
  if (Array.isArray(item.charts) && item.charts.length) {
    for (const chart of item.charts) {
      const merged = Object.assign({}, item, chart);
      out.push(normalizeItem(merged));
    }
    continue;
  }

  // 支持：原始中文结构，包含 基础信息 和 等级 列表
  if (item.基础信息) {
    const base = item.基础信息;
    const levels = base.等级 || [];
    const mapping = {2: 'EXPERT', 3: 'MASTER', 4: 'Re:MASTER'};
    for (const idx of Object.keys(mapping)) {
      const lv = levels[idx];
      if (!lv) continue;
      const levelInfo = parseLevel(String(lv));
      const entry = {
        name: base.歌名 || base.title,
        difficulty: mapping[idx],
        level: levelInfo.level,
        isPlus: levelInfo.isPlus,
        cover: base.image_url || base.cover || '',
        author: base.artist || base.作曲家 || '',
        difficultyAuthor: base.谱师 || '',
        bpm: base.bpm || 0,
        chartType: convertType(base.type)
      };
      out.push(normalizeItem(entry));
    }
    continue;
  }

  // 支持 maidata.json（字段如 title, lev_bas, lev_adv, lev_exp, lev_mas, dx_lev_exp, image_file）
  if (item.title && (item.lev_exp || item.dx_lev_exp || item.lev_mas || item.lev_adv || item.lev_bas)) {
    const cover = item.image_file ? `./public/covers/cover/${item.image_file}` : (item.cover || '')
    const mapping = [
      { key: 'dx_lev_exp', difficulty: 'EXPERT', chartType: 'dx' },
      { key: 'dx_lev_mas', difficulty: 'MASTER', chartType: 'dx' },
      { key: 'dx_lev_adv', difficulty: 'ADVANCED', chartType: 'dx' },
      { key: 'dx_lev_bas', difficulty: 'BASIC', chartType: 'dx' },
      { key: 'lev_exp', difficulty: 'EXPERT', chartType: 'standard' },
      { key: 'lev_mas', difficulty: 'MASTER', chartType: 'standard' },
      { key: 'lev_adv', difficulty: 'ADVANCED', chartType: 'standard' },
      { key: 'lev_bas', difficulty: 'BASIC', chartType: 'standard' },
      { key: 'lev_remas', difficulty: 'Re:MASTER', chartType: 'standard' }
    ]

    for (const m of mapping) {
      const raw = item[m.key]
      if (!raw) continue
      const levelInfo = parseLevel(String(raw))
      out.push(normalizeItem({
        name: item.title,
        difficulty: m.difficulty,
        level: levelInfo.level,
        isPlus: levelInfo.isPlus,
        cover,
        author: item.artist || '',
        difficultyAuthor: '',
        bpm: item.bpm || 0,
        chartType: m.chartType
      }))
    }
    continue
  }

  // 支持：某些来源使用 levels 对象或数组（如 {levels: {EXPERT: '12+', MASTER: '13'}} )
  if (item.levels && typeof item.levels === 'object') {
    for (const [k, v] of Object.entries(item.levels)) {
      const difficulty = mapDifficultyName(k);
      if (!difficulty) continue;
      const levelInfo = parseLevel(String(v));
      const entry = Object.assign({}, item, {
        difficulty,
        level: levelInfo.level,
        isPlus: levelInfo.isPlus
      });
      out.push(normalizeItem(entry));
    }
    continue;
  }

  // 兜底：如果有 title/artist/level 字段
  if (item.title || item.artist || item.level) {
    const fallback = {
      name: item.name || item.title,
      difficulty: item.difficulty || 'EXPERT',
      level: item.level || parseLevel(item.levelStr || '').level || 1,
      isPlus: !!item.isPlus,
      cover: item.cover || item.image || '',
      author: item.author || item.artist || '',
      difficultyAuthor: item.difficultyAuthor || '',
      bpm: item.bpm || 0,
      chartType: item.chartType || convertType(item.type)
    };
    out.push(normalizeItem(fallback));
    continue;
  }

  // 未识别结构，跳过并打印警告
  console.warn('跳过未知条目结构：', JSON.stringify(item).slice(0, 200));
}

// 为每条输出生成唯一 id（若已存在则保持）
for (const entry of out) {
  if (!entry.id) {
    entry.id = String(nextId++);
  }
}

try {
  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2), 'utf-8');
  console.log(`转换完成，输出 ${out.length} 条记录到 ${OUTPUT}`);
} catch (err) {
  console.error('写入输出文件失败:', err.message);
  process.exit(1);
}

// --- 辅助函数 ---
function normalizeItem(src) {
  const levelParse = parseLevel(String(src.level || src.Level || src.levelStr || ''));
  return {
    id: src.id ? String(src.id) : undefined,
    name: src.name || src.title || src.song || '',
    difficulty: mapDifficultyName(src.difficulty) || src.difficulty || 'EXPERT',
    level: Number.isFinite(Number(levelParse.level)) ? Number(levelParse.level) : 1,
    isPlus: !!levelParse.isPlus || !!src.isPlus,
    cover: normalizeCover(src.cover || src.image || src.image_url || ''),
    author: src.author || src.artist || '',
    difficultyAuthor: src.difficultyAuthor || src.chartAuthor || '',
    bpm: Number(src.bpm) || 0,
    chartType: convertType(src.chartType || src.type || src.mode)
  };
}

function parseLevel(levelStr) {
  if (!levelStr) return { level: 1, isPlus: false };
  const s = String(levelStr).trim();
  const isPlus = s.includes('+');
  const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
  return { level: Number.isFinite(num) ? num : 1, isPlus };
}

function convertType(type) {
  if (!type) return 'standard';
  const t = String(type).toLowerCase();
  if (t === 'dx') return 'dx';
  return 'standard';
}

function mapDifficultyName(name) {
  if (!name) return null;
  const n = String(name).toLowerCase();
  if (n.includes('expert') || n.includes('ex')) return 'EXPERT';
  if (n.includes('master') && !n.includes('re')) return 'MASTER';
  if (n.includes('re') || n.includes('re:') || n.includes('re:master') || n.includes('re_master')) return 'Re:MASTER';
  if (n === 'm' || n === 'master') return 'MASTER';
  return null;
}

function normalizeCover(c) {
  if (!c) return '';
  // 保持相对路径，如果传入的是 URL 则返回原样
  return String(c).replace('public\\', 'public/');
}