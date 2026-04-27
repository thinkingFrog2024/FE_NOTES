# CLAUDE.md - 项目持久说明

## 项目概述
这是一个**前端开发学习笔记库**，用于系统性学习 JavaScript、Vue、React、Node.js 等技术栈。

## 技术栈
- **语言**: JavaScript (ES6+)
- **框架**: Vue 3, React
- **运行时**: Node.js
- **工具**: Webpack

## 目录结构说明

### 核心学习目录
- `JS CSS HTML/ES6/` - ES6 完整学习笔记（9个文件）
  - `01_基础语法.md` ~ `09_其他.md`
- `vue/` - Vue3 相关笔记和面试题
- `node/` - Node.js 学习路线
- `code-react/` - React 调度器实践代码

### 重要代码文件
- `JS CSS HTML/deepClone.js` - 深拷贝函数实现（已处理循环引用、WeakMap）
- `code-react/mock-scheduler.js` - React 调度器模拟实现

## 编码规范

### JavaScript 风格
- 使用 `const` 和 `let`，禁止使用 `var`
- 优先使用箭头函数
- 使用模板字符串（反引号）
- 对象方法使用简写语法

### 注释规范
- 关键算法必须添加注释
- 使用 JSDoc 格式为函数添加文档
- TODO 标记待完成的功能

## 我的偏好

### 回答风格
- 用中文回答（除非代码注释需要英文）
- 提供具体代码示例，不要只说理论
- 解释"为什么"，而不只是"怎么做"
- 结合我的实际项目文件举例

### 代码生成要求
- 生成的代码要有详细的中文注释
- 包含错误处理逻辑
- 考虑边界情况
- 符合 ES6+ 最佳实践

## 注意事项

### 已知问题
- `JacaScript/` 目录名称有拼写错误（应该是 JavaScript），但保留原样
- 部分笔记文件存在重复（`JS CSS HTML/` 和 `JacaScript/` 有相似内容）

### 学习重点
目前重点关注：
1. 异步编程（Promise、async/await、事件循环）
2. Vue 3 Composition API
3. React Fiber 架构和调度器原理
4. 前端工程化（Webpack）

## 禁止事项
- ❌ 不要修改原始笔记文件的内容（只读参考）
- ❌ 不要删除任何现有文件
- ❌ 不要安装未经确认的 npm 包
- ❌ 不要修改 .gitignore 文件

---

## Compact Instructions（压缩指令）

### 压缩时必须保留的信息
- **当前学习主题**：Claude Code 文档解读和核心概念理解
- **关键文件位置**：
  - 学习文档：`AI/claude code 文档阅读记录/1.txt`
  - 实践代码：`JS CSS HTML/deepClone.js`、`code-react/mock-scheduler.js`
  - 本配置文件：`CLAUDE.md`（本文件）
- **已完成的工作**：
  - ✅ 创建了 CLAUDE.md 配置文件
  - ✅ 创建了 Git Worktree：`my-feature-worktree`（feat/my 分支）
  - ✅ 理解了三种运行环境、记忆系统、并行会话机制

### 压缩时可以精简的内容
- 早期的基础概念解释（已经理解了）
- 详细的命令输出截图（可以重新运行）
- 中间的调试过程（只需要最终结论）

### 当前焦点
**正在学习**：上下文窗口管理和压缩机制
**下一步计划**：继续阅读文档，了解 MCP 工具和高级功能
