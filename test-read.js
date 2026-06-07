import fs from 'fs';

const data = fs.readFileSync('151-C.json', 'utf-8');
const json = JSON.parse(data);
console.log('读取成功，数据条数:', json.length);
console.log('第一条数据:', JSON.stringify(json[0], null, 2));
