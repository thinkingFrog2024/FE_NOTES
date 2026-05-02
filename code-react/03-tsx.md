# 03 TSX 与模板编译原理

## Q: 类似于 TSX 这样的语法，或者 Vue 的模板语法，是怎么变成 JS 的？

**A:** 浏览器**根本不认识** TSX 或 Vue 模板。它们本质上都是**语法糖（Syntactic Sugar）**，也就是一层外衣。

它们之所以能在浏览器中运行，是因为在代码运行之前（如执行 `npm run build` 或 `npm run dev` 时），**编译器**（如 Babel、TypeScript 编译器、Vue Compiler）介入了，把这些特殊的语法“翻译”成了**普通的 JavaScript 函数调用**。

### 1. TSX 是怎么变成 JS 的？

在 React 中，TSX/JSX 的本质就是**用来创建虚拟 DOM（Virtual DOM）对象的快捷方式**。

**原始 TSX 代码：**

```tsx
const element = (
  <div id="app">
    <span>Hello</span>
  </div>
);
```

**编译后的 JS 代码：**
现代 React（17+，引入了 Automatic Runtime）不再需要手动 `import React`，编译器会自动注入 `_jsx` 函数：

```javascript
import { jsx as _jsx } from "react/jsx-runtime";

// 标签被转换成了嵌套的函数调用
const element = _jsx("div", {
  id: "app",
  children: _jsx("span", {
    children: "Hello"
  })
});
```

**结论**：TSX 里的每一个标签，最终都会变成一个 JS 函数执行。这个函数执行完毕后，会返回一个普通的 JS 对象（即虚拟 DOM 节点）。

### 💡 追问：编译器“注入”指的是什么？

\*\*注入（Inject）\*\*是一个编译器术语，指的是：**你没有在源代码里写这行代码，但编译器/工具在打包时，悄悄帮你塞进去了。**

**对比理解（以 React 为例）：**

- **以前（React 17 之前）**：如果你写了 JSX 标签，文件顶部必须手动写 `import React from 'react'`，否则报错。因为编译器会把标签翻译成 `React.createElement`，如果不引入，就会报 `React is not defined` 错误。
- **现在（React 17 引入 Automatic Runtime 后）**：编译器在将 JSX 转换成 JS 时，会**自动在代码的最顶部帮你加上** **`import { jsx as _jsx } from "react/jsx-runtime";`** **这行代码**。这就是注入的过程！开发者再也不用写那行烦人的样板代码了。

***

### 2. Vue 模板是怎么变成 JS 的？

Vue 的模板看似是一段纯 HTML 字符串，但它同样会被 Vue 的编译器（`@vue/compiler-core`）编译成**渲染函数（Render Function）**。

**原始 Vue 模板：**

```html
<template>
  <div id="app">
    <span>Hello</span>
  </div>
</template>
```

**编译后的 JS 代码：**

```javascript
import { createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", { id: "app" }, [
    _createElementVNode("span", null, "Hello")
  ]))
}
```

底层同样是调用形如 `createElementVNode` 的函数来生成虚拟 DOM。

***

## Q: 编译器是怎么做到把 HTML/TSX 翻译成 JS 的？（核心原理）

**A:** 编译器并不是简单地做“字符串替换”，而是经过了一个严谨的**编译流水线（Pipeline）**。以 `<div id="app">Hi</div>` 为例，分为四个核心步骤：

#### 步骤 1：词法分析 (Lexical Analysis / Tokenization) —— "切词机"

**目标**：把连续的字符串切成有意义的词块（Token）。
**核心工具**：**有限状态机 (Finite State Machine, FSM)**。

> **什么是状态机？**
> 可以把它想象成一个“吃豆人”，它一边往前走（读取字符），一边根据当前吃到的东西和自己当前的心情（状态），决定下一步该干嘛。
> 例如：遇到 `<`，从 `文本状态` 切换到 `标签打开状态`；遇到 `>`，结束标签读取，吐出一个 Token，并切回 `文本状态`。

*数据流向模拟（状态机输出）：*

```text
"<div id='app'>Hi</div>" 
↓
[
  { type: "TagOpen", value: "div" },
  { type: "Attribute", name: "id", value: "app" },
  { type: "TagEnd", value: ">" },
  { type: "Text", value: "Hi" },
  { type: "CloseTag", value: "div" }
]
```

#### 步骤 2：语法分析 (Parsing) —— "搭积木"

**目标**：把上面那一堆散落的 Token，组装成具有层级关系的树状结构（AST）。如果发现语法错误（比如 `<div></p>` 标签不匹配），就在这里报错。
**核心工具**：**栈（Stack，先进后出）**。

> **为什么用栈？**
> 因为 HTML/XML 天生就是嵌套的（洋葱模型），这完美契合栈的特性。
> **模拟过程**：遇到开始标签（如 `<div>`）就**压栈**；遇到文本就挂在栈顶元素下面；遇到闭合标签（如 `</div>`），去检查栈顶是不是对应的 `div`，是的话就**出栈**。如果栈顶对不上，说明标签没闭合好，直接抛出语法错误！

*AST 树状结构展示（栈组装产物）：*

```text
RootNode
 └── ElementNode (tag: "div")
      ├── Props: [ { name: "id", value: "app" } ]
      └── Children: 
           └── TextNode (value: "Hi")
```

#### 源码级理解：词法与语法分析的伪代码实现

为了更直观地理解状态机和栈（递归调用栈）的运作，我们用 JS 伪代码来实现对 `<p>Hi</p>` 的解析：

**1. 词法分析器（Tokenizer）：基于** **`while`** **循环的状态机**
本质是一个带有“游标（Cursor）”的循环，根据当前字符特征决定进入哪个内层循环（状态）。

```javascript
function tokenize(code) {
  let cursor = 0;
  let tokens = [];

  while (cursor < code.length) {
    let char = code[cursor];

    // 状态 1：处理尖括号
    if (char === '<' || char === '>') {
      tokens.push({ type: 'Bracket', value: char });
      cursor++; continue;
    }
    // 状态 2：处理字母（遇到字母就一直收集，直到不是字母）
    if (/[a-zA-Z]/.test(char)) {
      let word = '';
      while (/[a-zA-Z]/.test(char) && cursor < code.length) {
        word += char;
        cursor++; char = code[cursor];
      }
      tokens.push({ type: 'Word', value: word });
      continue;
    }
    // 状态 3：处理闭合斜杠
    if (char === '/') {
      tokens.push({ type: 'Slash', value: '/' });
      cursor++; continue;
    }
    // 状态 4：处理等号 (用于属性)
    if (char === '=') {
      tokens.push({ type: 'Assign', value: '=' });
      cursor++; continue;
    }
    // 状态 5：处理字符串 (用于属性值)
    if (char === '"' || char === "'") {
      let quote = char;
      let str = '';
      cursor++; char = code[cursor]; // 跳过开头引号
      while (char !== quote && cursor < code.length) {
        str += char;
        cursor++; char = code[cursor];
      }
      tokens.push({ type: 'String', value: str });
      cursor++; continue; // 跳过闭合引号
    }
    // 处理空格：为了简化，这里直接跳过空格
    if (/\s/.test(char)) {
      cursor++; continue;
    }
  }
  return tokens;
}
// 假设输入 <div id="app">
// 输出 Token 包含: Bracket(<), Word(div), Word(id), Assign(=), String(app), Bracket(>)
```

**2. 语法分析器（Parser）：基于递归下降（Recursive Descent）**
真实的编译器通常不显式声明一个数组作为栈，而是利用**函数的调用栈**（递归调用）来处理嵌套的树状结构。

```javascript
function parse(tokens) {
  let current = 0;

  // 递归函数：专门用来"吃掉" token 并返回一个完整的 AST 节点
  function walk() {
    let token = tokens[current];

    // 情况 A：纯文本节点
    if (token.type === 'Word' && tokens[current - 1].value === '>') {
      current++;
      return { type: 'TextNode', value: token.value };
    }

    // 情况 B：元素节点（遇到 '<' 说明标签开始了）
    if (token.type === 'Bracket' && token.value === '<') {
      current++; // 跳过 '<'
      let tagName = tokens[current].value; // 拿到标签名
      current++; // 游标移到标签名后面

      let props = [];
      // ⚠️ 新增逻辑：收集属性。只要还没遇到 '>'，说明中间都是属性
      while (tokens[current].value !== '>') {
        let attrName = tokens[current].value; // 拿到属性名，如 'id'
        current++; 
        if (tokens[current].value === '=') current++; // 跳过 '='
        let attrValue = tokens[current].value; // 拿到属性值，如 'app'
        current++; 
        
        props.push({ name: attrName, value: attrValue });
      }
      current++; // 循环结束说明遇到了 '>'，跳过它

      let elementNode = { type: 'ElementNode', tag: tagName, props: props, children: [] };

      // ⚠️ 核心递归魔法（修正版）：判断是否结束，要看是不是遇到了闭合标签的标志 `</`
      // 只要还没遇到 `</`，就说明里面全是子节点（无论是文本还是嵌套的新标签）
      while (
        current < tokens.length && 
        !(tokens[current].value === '<' && tokens[current + 1].value === '/')
      ) {
        elementNode.children.push(walk()); // 自己调用自己，处理内部的文本或子标签！
      }

      current += 3; // 退出循环说明遇到了 `</`，跳过闭合标签的 `</` 和 `>` 以及标签名 (例如 `</p>`)
      return elementNode;
    }
  }

  let astRoot = { type: 'Root', children: [] };
  while (current < tokens.length) {
    astRoot.children.push(walk());
  }
  return astRoot;
}
```

**💡 伪代码执行产物（AST 树）：**
如果输入是 `<div id="app"> <p>Hi</p> </div>`，经过上述 `parse` 函数处理后，最终会输出这样一棵层次分明、非常干净的 JSON 树（抽象语法树）：

```json
{
  "type": "Root",
  "children": [
    {
      "type": "ElementNode",
      "tag": "div",
      "props": [
        {
          "name": "id",
          "value": "app"
        }
      ],
      "children": [
        {
          "type": "ElementNode",
          "tag": "p",
          "children": [
            {
              "type": "TextNode",
              "value": "Hi"
            }
          ]
        }
      ]
    }
  ]
}
```

有了这个规整的 JSON 对象，接下来的转换（Transform）和代码生成（Code Gen）只需遍历这棵树即可。

#### 步骤 3：转换 (Transform) —— "对树进行外科手术"
遍历并修改这棵 AST。这一步是 JSX 和 Vue 产生分歧的关键地方。

**1. React (Babel) 的 Transform：纯粹的翻译官**
Babel 会遍历 AST，遇到 `ElementNode` 时，将其**替换**成一个 JavaScript 函数调用节点（`CallExpression`）。
- *手术前*：`{ "type": "ElementNode", "tag": "div", "props": [...] }`
- *手术后*：`{ "type": "CallExpression", "callee": { "name": "_jsx" }, "arguments": [...] }`

**2. Vue 的 Transform：激进的精算师（编译期优化）**
Vue 不仅做翻译，还会做深度性能优化。其核心思想是**靶向更新**，主要有 4 个大招：

- **大招一：静态提升 (Static Hoisting)**
  如果节点永远不变（如 `<p>纯静态文本</p>`），Vue 会把它提取到 `render` 函数**外部**作为全局常量。每次渲染直接复用同一个内存对象，无需像 React 那样每次重新执行 `createElement`。
- **大招二：PatchFlag (补丁标记)**
  对于动态节点（如 `<p :id="dynamicId">{{ message }}</p>`），Vue 会在生成的函数里打上魔法数字标记（如 `9`，代表文本和 props 会变）。运行时 Diff 算法看到 `9`，**直接跳过其他属性的对比**，只更新文本和 id。而 React 是“盲人摸象”，必须遍历全量 Props 才知道什么变了。
- **大招三：Block Tree (区块树降维打击)**
  对于深层嵌套的动态节点，Vue 编译器会在根节点（Block）维护一个扁平的 `dynamicChildren` 数组。将“树状递归遍历”降维成了“数组一层循环”。哪怕你嵌套 100 层，Diff 算法也只需要循环一次这个数组！
- **大招四：事件监听器缓存 (Cache Event Handlers)**
  对于 `<button @click="count++">`，Vue 会在编译时自动注入缓存逻辑（`_cache[0] || (_cache[0] = ...)`）。相当于在编译期帮你全自动写好了 React 的 `useCallback`。

> **为什么 React 不抄这些优化？**
> 因为 JSX 是“图灵完备”的动态 JS，编译器猜不到你运行时会传什么属性或渲染什么标签，不敢乱优化。而 Vue 模板是受限的 DSL，限制写法换取了 100% 的确定性。

#### 步骤 4：代码生成 (Code Generation) —— "打印机"
**目标**：把做完手术的 AST 树，重新拼接成普通的 JavaScript 字符串输出。
**核心原理**：**递归拼接字符串**。

这其实是最简单的一步。伪代码逻辑如下（以 React 为例）：
```javascript
function generate(node) {
  // 1. 如果是函数调用节点
  if (node.type === 'CallExpression') {
    let funcName = node.callee.name; // '_jsx'
    // 递归处理所有参数，并用逗号拼接
    let args = node.arguments.map(arg => generate(arg)).join(', ');
    return `${funcName}(${args})`;
  }
  
  // 2. 如果是字符串字面量
  if (node.type === 'StringLiteral') {
    return `"${node.value}"`; 
  }
  
  // (省略对象等其他类型的处理...)
}
```
当巨大的 AST 树扔进 `generate` 函数，它就会咔哒咔哒地输出我们最终看到的那些 `_jsx("div", { id: "app" })` 代码。至此，编译器的使命彻底结束！

***

## 💡 深度拷问：技术选型背后的思考

### Q: 既然 TSX 和 Vue 模板最终都要变成 JS 函数，那为什么我们不直接手写这些函数？

**A:**

1. **可读性灾难（硬性约束）**：人类大脑擅长处理层级分明的 XML/HTML 树状结构，但不擅长阅读嵌套了 10 层的函数调用。TSX 让我们能以 HTML 的视觉结构来写 JS。
2. **缺乏编译期优化（Vue 的考量）**：如果全手写 JS，编译器很难猜到哪些节点是静态的。Vue 模板通过限制写法，换取了极高的分析能力。

### Q: 同样是编译成渲染函数，JSX 和 Vue 模板在底层有什么核心差异？

**A:** 这是一个关于**灵活性 vs 性能优化**的设计偏好选择：

- **JSX 是“图灵完备”的 JS（重运行时）**：
  JSX 只是 JS 的语法糖，内部可以写任何复杂的 `if/else`、`map`、甚至嵌套执行函数。因为太灵活，**React 编译器很难猜到你到底想干嘛**。因此，React 很难在编译期做极致的性能优化，主要依赖开发者手动优化（如 `useMemo`）和运行时的 Fiber 架构。
- **Vue 模板是“受限”的 DSL（重编译时）**：
  领域特定语言（DSL）限制了你只能用 `v-if`、`v-for`。正因为受到了限制，Vue 编译器可以**100% 确定**这段代码的意图。所以 Vue 能在编译时精准地标记出哪些节点会变（PatchFlags）、把不会变的节点提取到渲染函数外面（静态提升 Static Hoisting）。

> **总结**：你写下的 TSX 或模板，其实是一张**设计图纸**。编译器（Babel/Vue Compiler）就是**施工队**，它们通过 `代码 -> Token -> AST -> JS函数` 的流水线，把图纸翻译成了浏览器能执行的 JS 代码。理解了 AST，你就理解了现代前端工程化一半以上的底层魔法。

