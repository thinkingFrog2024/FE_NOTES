#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve, dirname, basename } from 'path';

// 获取仓库根目录
const ROOT_DIR = resolve(process.cwd(), process.cwd().includes('.github/scripts') ? '../..' : '.');
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const README_PATH = join(ROOT_DIR, 'README.md');

async function main() {
  console.log('开始分析变更并生成目录...');

  try {
    // 1. 获取变更文件列表
    const changedFiles = getChangedFiles();
    console.log(`变更文件: ${changedFiles.length} 个`);

    if (changedFiles.length === 0) {
      console.log('没有 Markdown 文件变更，跳过目录生成');
      return;
    }

    // 2. 读取变更内容
    const changes = analyzeChanges(changedFiles);

    // 3. 分析关联文件
    const relatedFiles = findRelatedFiles(changedFiles);
    console.log(`关联文件: ${relatedFiles.length} 个`);

    // 4. 读取当前 README.md，清除旧的错误提示
    let currentReadme = existsSync(README_PATH)
      ? readFileSync(README_PATH, 'utf-8')
      : '# 前端学习笔记目录\n\n';
    // 清除之前失败留下的错误提示
    currentReadme = currentReadme.replace(/\n*---\n> ⚠️ 目录自动生成失败.*\n?/g, '');

    // 5. 调用智谱 AI API
    const newReadme = await callZhipuAI(currentReadme, changes, relatedFiles);

    // 6. 更新 README.md
    writeFileSync(README_PATH, newReadme, 'utf-8');
    console.log('README.md 已更新');

    // 7. 提交变更
    commitChanges();

  } catch (error) {
    console.error('生成目录失败:', error.message);
    // 失败时添加提示到 README.md
    const currentReadme = existsSync(README_PATH)
      ? readFileSync(README_PATH, 'utf-8')
      : '# 前端学习笔记\n\n';
    const failedReadme = currentReadme + '\n\n---\n> ⚠️ 目录自动生成失败，请检查 GitHub Actions 日志\n';
    writeFileSync(README_PATH, failedReadme, 'utf-8');
    process.exit(1);
  }
}

// 获取本次 push 变更的 Markdown 文件
function getChangedFiles() {
  try {
    // 获取最近两次 commit 之间的变更
    const diffOutput = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf-8', cwd: ROOT_DIR });
    const files = diffOutput.trim().split('\n').filter(f => f.endsWith('.md'));
    return files.filter(f => !f.includes('.github')); // 排除脚本自身
  } catch {
    // 如果是首次 commit，获取所有 md 文件
    const allFiles = execSync('git ls-files "*.md"', { encoding: 'utf-8', cwd: ROOT_DIR });
    return allFiles.trim().split('\n').filter(f => f && !f.includes('.github'));
  }
}

// 分析每个变更文件的内容
function analyzeChanges(files) {
  const changes = [];
  for (const file of files) {
    try {
      // 使用 git show 获取最新版本内容（适用于新增和修改的文件）
      const content = execSync(`git show HEAD:"${file}"`, { encoding: 'utf-8', cwd: ROOT_DIR, maxBuffer: 1024 * 1024 * 10 });
      const diff = execSync(`git diff HEAD~1 HEAD -- "${file}"`, { encoding: 'utf-8', cwd: ROOT_DIR });
      changes.push({
        file,
        diff: diff.slice(0, 2000), // 截取前 2000 字符避免过长
        summary: getFirstLines(content, 20) // 取前 20 行作为摘要
      });
    } catch (e) {
      console.log(`无法读取文件: ${file} - ${e.message}`);
    }
  }
  return changes;
}

// 获取文件前 N 行
function getFirstLines(content, n) {
  const lines = content.split('\n').slice(0, n);
  return lines.join('\n');
}

// 查找关联文件
function findRelatedFiles(changedFiles) {
  const related = new Set();

  for (const file of changedFiles) {
    const dir = dirname(file);

    // 同目录下的其他 md 文件
    try {
      const sameDirFiles = execSync(`git ls-files "${dir}/*.md"`, { encoding: 'utf-8', cwd: ROOT_DIR });
      sameDirFiles.trim().split('\n').forEach(f => {
        if (f && f !== file) related.add(f);
      });
    } catch {}

    // 检测文件内容中的引用链接
    try {
      const content = execSync(`git show HEAD:"${file}"`, { encoding: 'utf-8', cwd: ROOT_DIR, maxBuffer: 1024 * 1024 * 5 });
      const links = content.match(/\[.*?\]\(\.?\/.*?\.md\)/g) || [];
      links.forEach(link => {
        const match = link.match(/\]\(\.?\/(.*?\.md)\)/);
        if (match) {
          const linkPath = join(ROOT_DIR, dir, match[1]).replace(ROOT_DIR + '/', '');
          if (existsSync(join(ROOT_DIR, linkPath))) related.add(linkPath);
        }
      });
    } catch {}
  }

  return Array.from(related).slice(0, 10); // 最多 10 个关联文件
}

// 调用智谱 AI API
async function callZhipuAI(currentReadme, changes, relatedFiles) {
  const prompt = buildPrompt(currentReadme, changes, relatedFiles);

  const response = await fetch(ZHIPU_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZHIPU_API_KEY}`
    },
    body: JSON.stringify({
      model: 'glm-4',
      messages: [
        {
          role: 'system',
          content: '你是一个前端学习笔记目录生成助手。根据变更信息生成简洁的目录：1. 文件目录部分：按主题分类，每个文件一行"文件位置：主要内容"；2. 笔记覆盖知识面分析：分析已覆盖的技术栈、知识深度、建议补充方向。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// 构建 AI Prompt
function buildPrompt(currentReadme, changes, relatedFiles) {
  let prompt = `请根据以下信息更新前端学习笔记的目录（README.md）：

当前 README.md 内容：
${currentReadme}

本次变更的文件：
`;

  changes.forEach(c => {
    prompt += `
### ${c.file}
摘要：
${c.summary}
`;
  });

  prompt += `
关联文件：
${relatedFiles.join('\n')}

请生成完整的目录，格式要求：

## 文件目录

按主题分类，每个文件一行：
- 文件位置：主要内容（一句话概括）

例如：
- JS CSS HTML/ES6/01_基础语法.md：变量声明、解构赋值、运算符、严格模式
- vue/vue3学习大纲.md：Vue3 内置组件源码解析、响应式原理、编译优化

## 笔记覆盖知识面分析

分析当前笔记覆盖的技术领域和知识深度：
1. 已覆盖的技术栈（列出主要技术）
2. 知识深度评估（哪些领域深入、哪些领域浅显）
3. 建议补充的方向

直接输出完整的 README.md 内容，不需要解释。`;

  return prompt;
}

// 提交变更
function commitChanges() {
  execSync('git config user.name "github-actions[bot]"', { encoding: 'utf-8', cwd: ROOT_DIR });
  execSync('git config user.email "github-actions[bot]@users.noreply.github.com"', { encoding: 'utf-8', cwd: ROOT_DIR });
  execSync('git add README.md', { encoding: 'utf-8', cwd: ROOT_DIR });

  // 检查是否有变更再提交
  try {
    execSync('git diff --staged --quiet', { encoding: 'utf-8', cwd: ROOT_DIR });
    console.log('README.md 无变化，跳过提交');
    return;
  } catch {
    // diff --staged --quiet 返回非零表示有变更
    execSync('git commit -m "Update README catalog based on latest changes"', { encoding: 'utf-8', cwd: ROOT_DIR });
    execSync('git push', { encoding: 'utf-8', cwd: ROOT_DIR });
    console.log('变更已提交并推送');
  }
}

main();