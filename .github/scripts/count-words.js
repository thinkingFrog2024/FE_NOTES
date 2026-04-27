#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const STATS_PATH = join(process.cwd(), 'STATS.md');

async function main() {
  console.log('开始统计文件字数...');

  try {
    // 获取所有 Markdown 文件
    const allFiles = getAllMdFiles();
    console.log(`共有 ${allFiles.length} 个 Markdown 文件`);

    // 统计每个文件的字数
    const stats = allFiles.map(file => {
      try {
        const content = readFileSync(file, 'utf-8');
        const wordCount = countWords(content);
        return { file, wordCount };
      } catch {
        return { file, wordCount: 0 };
      }
    });

    // 按字数排序
    stats.sort((a, b) => b.wordCount - a.wordCount);

    // 计算总计
    const totalWords = stats.reduce((sum, s) => sum + s.wordCount, 0);
    console.log(`总字数: ${totalWords}`);

    // 生成统计报告
    const report = generateReport(stats, totalWords);
    writeFileSync(STATS_PATH, report, 'utf-8');
    console.log('STATS.md 已生成');

    // 提交变更
    commitChanges();

  } catch (error) {
    console.error('统计失败:', error.message);
    process.exit(1);
  }
}

// 获取所有 Markdown 文件
function getAllMdFiles() {
  const output = execSync('git ls-files "*.md"', { encoding: 'utf-8' });
  return output.trim().split('\n').filter(f =>
    f &&
    !f.includes('.github') &&
    !f.includes('.claude') &&
    !f.includes('.trae')
  );
}

// 统计字数（中文按字符，英文按单词）
function countWords(content) {
  // 移除代码块（不计入字数）
  const textOnly = content
    .replace(/```[\s\S]*?```/g, '')  // 移除代码块
    .replace(/`[^`]*`/g, '')          // 移除内联代码
    .replace(/!\[.*?\]\(.*?\)/g, '')  // 移除图片链接
    .replace(/\[.*?\]\(.*?\)/g, '')   // 移除链接（保留显示文本）
    .replace(/<[^>]*>/g, '')          // 移除 HTML 标签
    .replace(/^---[\s\S]*?---/g, '')  // 移除 YAML frontmatter
    .replace(/#\s+/g, '')             // 移除标题标记
    .replace(/[-*_]{3,}/g, '')        // 移除分隔线
    .replace(/^\s*[-*+]\s+/gm, '')    // 移除列表标记
    .replace(/\s+/g, ' ');            // 合并空白

  // 统计中文字符
  const chineseChars = (textOnly.match(/[一-龥]/g) || []).length;

  // 统计英文单词
  const englishWords = (textOnly.match(/[a-zA-Z]+/g) || []).length;

  // 统计数字
  const numbers = (textOnly.match(/\d+/g) || []).length;

  return chineseChars + englishWords + numbers;
}

// 生成统计报告
function generateReport(stats, totalWords) {
  const now = new Date().toISOString().slice(0, 10);

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

## 📝 详细统计

| 文件 | 字数 |
|------|------:|
`;

  stats.forEach(s => {
    report += `| ${s.file} | ${s.wordCount.toLocaleString()} |\n`;
  });

  report += `
---

## 📈 按目录统计

`;

  // 按目录分组统计
  const dirStats = {};
  stats.forEach(s => {
    const dir = s.file.split('/')[0] || '根目录';
    if (!dirStats[dir]) {
      dirStats[dir] = { files: 0, words: 0 };
    }
    dirStats[dir].files++;
    dirStats[dir].words += s.wordCount;
  });

  report += `| 目录 | 文件数 | 字数 | 占比 |
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

> 自动生成: Claude Code 字数统计器
`;

  return report;
}

// 提交变更
function commitChanges() {
  execSync('git config user.name "github-actions[bot]"', { encoding: 'utf-8' });
  execSync('git config user.email "github-actions[bot]@users.noreply.github.com"', { encoding: 'utf-8' });
  execSync('git add STATS.md', { encoding: 'utf-8' });

  // 检查是否有变更
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  if (status.includes('STATS.md')) {
    execSync('git commit -m "Update STATS.md with word count statistics"', { encoding: 'utf-8' });
    execSync('git push origin HEAD', { encoding: 'utf-8' });
    console.log('统计报告已提交');
  } else {
    console.log('无变更，跳过提交');
  }
}

main();