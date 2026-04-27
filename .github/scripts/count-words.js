#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// 获取仓库根目录
const ROOT_DIR = resolve(process.cwd(), process.cwd().includes('.github/scripts') ? '../..' : '.');
const STATS_PATH = join(ROOT_DIR, 'STATS.md');

async function main() {
  console.log('开始统计文件字数...');
  console.log(`根目录: ${ROOT_DIR}`);

  try {
    // 获取所有 Markdown 文件
    const allFiles = getAllMdFiles();
    console.log(`共有 ${allFiles.length} 个 Markdown 文件`);

    // 统计每个文件的字数
    const stats = [];
    for (const file of allFiles) {
      try {
        const fullPath = join(ROOT_DIR, file);
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf-8');
          const wordCount = countWords(content);
          stats.push({ file, wordCount });
        } else {
          console.log(`文件不存在: ${file}`);
          stats.push({ file, wordCount: 0 });
        }
      } catch (e) {
        console.log(`读取失败: ${file} - ${e.message}`);
        stats.push({ file, wordCount: 0 });
      }
    }

    // 按字数排序
    stats.sort((a, b) => b.wordCount - a.wordCount);

    // 计算总计
    const totalWords = stats.reduce((sum, s) => sum + s.wordCount, 0);
    console.log(`总字数: ${totalWords}`);

    // 生成统计报告
    const report = generateReport(stats, totalWords);
    writeFileSync(STATS_PATH, report, 'utf-8');
    console.log('STATS.md 已生成');

  } catch (error) {
    console.error('统计失败:', error.message);
    process.exit(1);
  }
}

// 获取所有 Markdown 文件（使用 -z 避免路径转义）
function getAllMdFiles() {
  try {
    // -z 用 null 字符分隔，不转义路径名
    const output = execSync('git ls-files -z', { encoding: 'utf8', cwd: ROOT_DIR });
    const files = output.split('\0').filter(f =>
      f &&
      f.endsWith('.md') &&
      !f.includes('.github') &&
      !f.includes('.claude') &&
      !f.includes('.trae')
    );
    return files;
  } catch (e) {
    console.log('git ls-files 失败:', e.message);
    return [];
  }
}

// 统计字数（中文按字符，英文按单词）
function countWords(content) {
  // 移除代码块和不需要统计的内容
  const textOnly = content
    .replace(/```[\s\S]*?```/g, '')      // 移除代码块
    .replace(/`[^`]*`/g, '')              // 移除内联代码
    .replace(/!\[.*?\]\(.*?\)/g, '')      // 移除图片
    .replace(/#{1,6}\s+/g, '')            // 移除标题标记
    .replace(/[-*_]{3,}/g, '')            // 移除分隔线
    .replace(/^\s*[-*+]\s+/gm, '')        // 移除列表标记
    .replace(/^\s*\d+\.\s+/gm, '')        // 移除有序列表
    .replace(/\[.*?\]\(.*?\)/g, '$1')     // 链接保留显示文本
    .replace(/<[^>]*>/g, '')              // 移除 HTML 标签
    .replace(/^---[\s\S]*?---/gm, '')     // 移除 YAML frontmatter
    .replace(/\s+/g, ' ')                 // 合并空白
    .trim();

  if (!textOnly) return 0;

  // 统计中文字符（常用汉字范围）
  const chineseChars = (textOnly.match(/[一-龥]/g) || []).length;

  // 统计英文单词
  const englishWords = (textOnly.match(/[a-zA-Z]+/g) || []).length;

  // 统计数字
  const numbers = (textOnly.match(/\d+/g) || []).length;

  return chineseChars + englishWords + numbers;
}

// 生成统计报告
function generateReport(stats, totalWords) {
  const now = new Date().toLocaleDateString('zh-CN');

  // 按目录分组
  const dirStats = {};
  stats.forEach(s => {
    const dir = s.file.split('/')[0] || '根目录';
    if (!dirStats[dir]) {
      dirStats[dir] = { files: 0, words: 0 };
    }
    dirStats[dir].files++;
    dirStats[dir].words += s.wordCount;
  });

  let report = `# 笔记字数统计

> 最后更新: ${now}

---

## 📊 统计概览

| 指标 | 数值 |
|------|------|
| 文件总数 | ${stats.length} 个 |
| 总字数 | ${totalWords.toLocaleString()} 字 |
| 平均字数 | ${Math.round(totalWords / stats.length).toLocaleString()} 字/文件 |

---

## 📈 按目录统计

| 目录 | 文件数 | 字数 | 占比 |
|------|:------:|------:|------:|
`;

  Object.entries(dirStats)
    .sort((a, b) => b[1].words - a[1].words)
    .forEach(([dir, data]) => {
      const percent = ((data.words / totalWords) * 100).toFixed(1);
      report += `| ${dir} | ${data.files} | ${data.words.toLocaleString()} | ${percent}% |\n`;
    });

  report += `
---

## 📝 详细统计（按字数排序）

| 文件 | 字数 |
|------|------:|
`;

  stats.forEach(s => {
    if (s.wordCount > 0) {
      report += `| ${s.file} | ${s.wordCount.toLocaleString()} |\n`;
    }
  });

  // 显示字数为 0 的文件（可能有问题）
  const zeroFiles = stats.filter(s => s.wordCount === 0);
  if (zeroFiles.length > 0 && zeroFiles.length < stats.length) {
    report += `
---

## ⚠️ 未能统计的文件 (${zeroFiles.length} 个)

`;
    zeroFiles.slice(0, 20).forEach(s => {
      report += `- ${s.file}\n`;
    });
    if (zeroFiles.length > 20) {
      report += `- ... 还有 ${zeroFiles.length - 20} 个文件\n`;
    }
  }

  report += `
---

> 自动生成: Claude Code 字数统计器
`;

  return report;
}

main();