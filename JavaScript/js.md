























































# javaScript





## 1.2 代码结构







## 1.3 现代模式

"use strict"

当这个指令位于代码最顶部，代码将开启严格模式，当这个指令位于函数最顶部，将在这个函数的内部开启严格模式。确保只有注释位于这个指令的上方，否则这个指令不会生效。 并且没有指令用于关闭严格模式



## 1.4 变量



基本数据类型：栈内存  不可修改的 Number（包括数字 NaN infinite） String（支持双引号 单引号 反引号 并且es6引入了模板字符串 支持换行 嵌入表达式 ）Boolean Null Undefined Symbol BigInt

引用数据类型 ：堆内存 可修改的 Object Array Function  Date Map set 等

检验数据类型的四种方案：typeof instanceOf Object。prototype.toString.call()   Array.IsArray

其中toString方法是基于对象内部的[[class]]属性的 这个属性是一个内部属性 描述了对象的具体类型

对象原型上面的toSting被调用的时候 就会检查调用它的对象内部的[[class]]属性 

之所以要调用对象原型上面的toString 是因为很多对象都重写了这个方法 

**typeof**

这是一种运算符，并且会以字符串的形式返回数据类型。不过需要注意，会把null判断成对象。有时会把typeof x写成typeof（X） 但是这并不表明这是一个函数，这个括号是数学表达式，而不是传递参数

### 1.4.1. 对象基础





**创建一个对象**

我们可以通过构造函数，或者对象字面量的方法创建一个对象。

```
let obj = {
 name = 12
}
let obj = new User
	this.name = ...
)
```





**操作对象**

1. 访问 可以通过object.name这样访问 但是 对于user name这样里面有空格的属性名 就无法通过.进行访问了，这个时候就必须用[]进行访问了 比如user["my name"]。除此之外 方括号里面还可以是一个变量user[name]
2. 删除 通过delete操作符进行删除 delete user.name
3. 添加



**计算属性**

创建对象的时候可以在对象字面量里面使用方括号，这样对象的属性名就可以从变量里面获取

```javascript
let fruit = prompt("Which fruit to buy?", "apple");

let bag = {
  [fruit]: 5, // 属性名是从 fruit 变量中得到的 尤其在使用symbol类型变量作为键名，也一定要记得中括号，不然直接变字符串
};

alert( bag.apple ); // 5 如果 fruit="apple"
//并且可以使用更复杂的表达式
let bag = {
  [fruit + 'Computers']: 5 // bag.appleComputers = 5
};
```



**属性值缩写**

当键名与变量名一样 就可以使用缩写

```javascript
function makeUser(name, age) {
  return {
    name, // 与 name: name 相同
    age,  // 与 age: age 相同
    // ...
  };
}
```



**in操作符**

可以检测某个对象里有没有某个属性

`alert( "age" in user ); // true，user.age 存在`

in的左边也可以是一个变量

这种判断方法在**属性值可能为undefined**的时候非常有用





1. 

#### 1.4.1.1 对象本质



**克隆与合并**

我们可以通过Object.assign（目标对象，[源对象数组]）进行**浅层克隆**，这个方法返回的是克隆好的目标对象。使用这个方法可以把很多对象的属性值合并到一个对象里面。如果要克隆的属性已经存在了，那么会覆盖。

**深层克隆**

当对象的属性值也是一个对象的时候，我们需要深层克隆。

```javascript
function deepclone(obj，target){
    (obj instanceof Object){
        //对对象的属性进行遍历
        for(let key in obj){
            target[key] = deepClone(obj[key],target)
        }
    }
    return obj
}
```



**垃圾回收**

可达值的基本集合（这些值被称为roots）：

- **当前执行的函数**，它的局部变量和参数。
- **当前嵌套调用链上的其他函数**、它们的局部变量和参数。
- **全局变量**。
- （还有一些其他的，内部实现）

**内部算法实现**

- 垃圾收集器找到所有的根，并“标记”（记住）它们。
- 然后它遍历并“标记”来自它们的所有引用。
- 然后它遍历标记的对象并标记 **它们的** 引用。所有被遍历到的对象都会被记住，以免将来再次遍历到同一个对象。
- ……如此操作，直到所有可达的（从根部）引用都被访问到。
- 没有被标记的对象都会被删除。

#### 1.4.1.2 构造器

构造器函数在技术层面就是一个常规函数，只不过有一些约定俗成的规定：通过new操作符执行，以大写字母开头。

我们比较一下普通的执行一个函数，和使用new操作符执行一个函数有什么区别：

```javascript
//严格模式
function User(n){
	this.name = n
}
```

如果我们普通的执行这个函数，**函数里面没有this的概念**，这时还要往undefined里面添加属性，当然会报错不能往undefined里面添加属性了。

所以可以看出来，new操作符执行函数和普通执行函数的区别是，使用new操作符**会在函数里面隐式的创建一个this**，并且这个this是个空对象，然后我们就可以快乐的往空对象里面添加属性啦，而且最后它还会**隐式的返回这个this对象**。当然我们也可以理解成他把这个this的指向修改成了我们创建的那个对象，然后没有返回this的那一步，具体细节不重要！

如果我们想要这个构造器之使用一次，之后就无法被调用了，也可以这样写：

```javascript
/ 创建一个函数并立即使用 new 调用它
let user = new function() {
  this.name = "John";
  this.isAdmin = false;

  // ……用于用户创建的其他代码
  // 也许是复杂的逻辑和语句
  // 局部变量等
};
```

**构造器模式测试：new.target**

这个东西可以用在函数内部，**判断函数是常规调用还是使用new操作符调用。**

```javascript
function User(name) {
  if (!new.target) { // 如果你没有通过 new 运行我
    return new User(name); // ……我会给你添加 new
  }

  this.name = name;
}

let john = User("John"); // 将调用重定向到新用户
alert(john.name); // John
```

当函数通过 `new` 关键字作为构造函数调用时，`new.target` 指向该构造函数本身；当函数作为普通函数直接调用时，`new.target` 为 `undefined`。

在继承关系中，`new.target` 指向实际创建实例的构造函数，而不是当前执行的构造函数。这在实现抽象类或防止基类被直接实例化时非常有用。



**构造器的return**

构造器是没有return的，但是如果非要return，那么：

1. 返回一个对象：那就返回这个对象，不管this
2. 返回原始类型或者空：这个return会被忽略



#### 1.4.1.3 symbol

只有两种类型可以作为对象的键名：字符串，symbol。其他类型会被转换成字符串。

symbol表示的意思是：唯一的标识符。可以通过Symbol创建并传入一个描述字符：`let id = Symbol("id")`  这个描述字符应该是一个字符串 如果是一个对象 会调用tostring方法

这个类型 **不会被自动转换成字符串**，如果alert一个symbol类型的值 将会报错。用+将一个symbol类型变量和字符串进行拼接也会报错，如果真的需要转换 需要手动调用toString方法。会转换成Symbol（'描述'） 。或者调用.description获取一个symbol的描述。也可以使用Boolean方法把symbol变量手动转换成布尔类型的值，**但是不能转换成数字**



**使用symbol创建对象的隐藏属性**

就比如需要往第三方库里面的某个对象添加属性，直接使用字符喜欢不安全，万一同名属性覆盖了呢，这个时候使用symbol类型作为键名就不会有覆盖问题。



使用symbol类型的值作为对象的键时 不能使用点运算符 这是因为默认点运算符后面都是字符串 

symbol变量还很适合用在switch语句里面 保证case之后的值一定不相等。



**symbol在for in循环里面会被跳过**

**通过Object.keys获取键名的时候也不会获取到**

**Object.assign会复制symbol属性。**

**可以通过Object.getOwnPropertySymbols(obj)获取**

**也可以通过Object.Reflect.ownKeys(obj)获取所有的键 也就是获取可枚举 不可枚举的属性** 

Object.Reflect是js里面的一个内置对象,提供了一些静态方法，这些方法不依赖于对象的原型链，使用这些方法进行处理的时候，只会考虑对象本身拥有的属性

```javascript
Object.Reflect.defineProperty(target, property, attributes)：定义或修改对象的属性。
Object.Reflect.deleteProperty(target, property)：删除对象的属性。
Object.Reflect.has(target, property)：检查对象是否具有特定的属性。
Object.Reflect.ownKeys(target)：返回一个包含对象自身所有属性键的数组。
```





**全局symbol**

有的时候我们就是要在其他的地方拿到之前的那个symbol，这个时候就要有全局注册表这个东西了。注册表里面的symbol被称为全局symbol。当然也可以通过这个symbol拿到他的描述，和.description的区别就在于，这个只能对全局symbol使用。

```javascript
// 从全局注册表中读取
let id = Symbol.for("id"); // 如果该 symbol 不存在，则创建它

// 再次读取（可能是在代码中的另一个位置）
let idAgain = Symbol.for("id");

// 相同的 symbol
alert( id === idAgain ); // true

// 通过 name 获取 symbol
let sym = Symbol.for("name");
let sym2 = Symbol.for("id");

// 通过 symbol 获取 name
alert( Symbol.keyFor(sym) ); // name
alert( Symbol.keyFor(sym2) ); // id
```



**内置的symbo值**

ES6提供了11个内置的Symbol值 指向语言内部使用的方法

`Symbol.hasInstance`

对象的这个属性指向一个方法，**当对象使用instanceof运算符判断是否为某个构造函数的实例时 其实就会调用这个方法** 我们可以对这个方法进行重写 

```javascript
class Even {
  static [Symbol.hasInstance](obj) {
    return Number(obj) % 2 === 0;
  }
}

// 等同于
const Even = {
  [Symbol.hasInstance](obj) {
    return Number(obj) % 2 === 0;
  }
};

1 instanceof Even // false
2 instanceof Even // true
12345 instanceof Even // false
```



#### 1. **`Symbol.iterator`**

- **用途**：定义对象的默认迭代器，使对象可被 `for...of` 循环遍历。
- **相关语法**：`for...of`、展开语法（`...`）、解构赋值等。

#### 2. **`Symbol.asyncIterator`**

- **用途**：定义对象的默认异步迭代器，使对象可被 `for await...of` 循环异步遍历。 异步迭代器的 `next()` 方法返回一个 `Promise`，该 `Promise` 解析为 `{ value, done }` 对象异步生成器是最常见的异步可迭代对象，通过 `async function*` 定义，使用 `yield await` 产生异步值。 像这样：

  ```
  // 定义异步生成器函数
  async function* fetchUsers() {
    // 模拟异步获取用户数据（如API请求）
    yield await new Promise(resolve => setTimeout(() => resolve({ id: 1, name: '张三' }), 1000));
    yield await new Promise(resolve => setTimeout(() => resolve({ id: 2, name: '李四' }), 500));
    yield await new Promise(resolve => setTimeout(() => resolve({ id: 3, name: '王五' }), 800));
  }
  ```

  

- **相关语法**：`for await...of`。

#### 3. **`Symbol.toStringTag`**

- **用途**：自定义 `Object.prototype.toString.call()` 方法返回的类型标签，影响对象的字符串表示形式。
- **相关方法**：`Object.prototype.toString()`。

```
// 自定义类型标签
class Person {
  get [Symbol.toStringTag]() {
    return 'Person';
  }
}

const person = new Person();
console.log(Object.prototype.toString.call(person)); // 输出: "[object Person]"
```

#### 5. **`Symbol.isConcatSpreadable`**

- **用途**：控制对象在 `Array.prototype.concat()` 方法中是否被展开为数组元素。

- **相关方法**：`Array.prototype.concat()`。  concat可以展开类数组 

- ```
  // 控制数组在 concat 中的展开行为
  const arr1 = [1, 2];
  const arr2 = [3, 4];
  
  // 普通数组默认会被展开
  console.log(arr1.concat(arr2)); // 输出: [1, 2, 3, 4]
  
  // 自定义类数组对象
  const arrayLike1 = {
    0: 'a',
    1: 'b',
    length: 2,
    // 不展开
    [Symbol.isConcatSpreadable]: false
  };
  
  const arrayLike2 = {
    0: 'c',
    1: 'd',
    length: 2,
    // 展开
    [Symbol.isConcatSpreadable]: true
  };
  
  console.log(arr1.concat(arrayLike1)); // 输出: [1, 2, { ... }] (整个对象被添加)
  console.log(arr1.concat(arrayLike2)); // 输出: [1, 2, 'c', 'd'] (对象被展开)
  
  // 普通对象默认不展开
  const obj = { a: 1, b: 2 };
  console.log(arr1.concat(obj)); // 输出: [1, 2, { a: 1, b: 2 }]
  
  ```

#### 6. **`Symbol.toPrimitive`**

- **用途**：自定义对象在需要转换为原始值（如数字、字符串）时的行为。

- **相关操作**：对象的隐式类型转换（如 `+`、`-`、`==` 等操作）。

- ```
  // 自定义对象的原始值转换
  class Currency {
    constructor(value, unit) {
      this.value = value;
      this.unit = unit;
    }
    
    // 定义原始值转换逻辑
    [Symbol.toPrimitive](hint) {
      switch (hint) {
        case 'number':
          return this.value; // 用于数字运算
        case 'string':
          return `${this.value} ${this.unit}`; // 用于字符串转换
        case 'default':
          return `${this.value} ${this.unit}`; // 默认情况
        default:
          return this.value;
      }
    }
  }
  
  const price = new Currency(19.99, 'USD');
  
  // 数字运算
  console.log(price * 2); // 输出: 39.98 (使用 number 提示)
  
  // 字符串连接
  console.log(`Price: ${price}`); // 输出: "Price: 19.99 USD" (使用 string 提示)
  
  // 默认情况（如 + 操作）
  console.log(price + ''); // 输出: "19.99 USD" (使用 default 提示)
  
  ```

  #### 11. **`Symbol.species`**

  - **用途**：定义创建派生对象时使用的构造函数，影响对象方法（如 `map()`、`filter()`）返回的新对象的类型。

  - **相关方法**：`Array`、`Map`、`Set` 等对象的方法（如 `map()`、`filter()`、`substring()` 等）。

  - ```
    // 自定义派生对象的构造函数
    class MyArray extends Array {
      // 静态 getter，控制派生对象的构造函数
      static get [Symbol.species]() {
        return Array; // 使用原生 Array 作为构造函数
      }
    }
    
    const myArr = new MyArray(1, 2, 3);
    console.log(myArr instanceof MyArray); // 输出: true
    console.log(myArr instanceof Array); // 输出: true
    
    // 使用 map 方法创建新数组
    const mapped = myArr.map(x => x * 2);
    
    // 由于 Symbol.species 返回 Array，mapped 是原生 Array 实例
    console.log(mapped instanceof MyArray); // 输出: false
    console.log(mapped instanceof Array); // 输出: true
    
    // 如果不定义 Symbol.species，默认会使用 MyArray 作为构造函数
    class MyArrayWithoutSpecies extends Array {}
    const myArr2 = new MyArrayWithoutSpecies(1, 2, 3);
    const mapped2 = myArr2.map(x => x * 2);
    console.log(mapped2 instanceof MyArrayWithoutSpecies); // 输出: true (默认行为)
    
    ```

  #### **`Symbol.match`**

  - **用途**：定义对象作为正则表达式时的匹配行为，影响 `String.prototype.match()` 方法的调用。

  - **相关方法**：`String.prototype.match()`、`String.prototype.replace()`、`String.prototype.search()`、`String.prototype.split()`。

  - ```
    // 自定义匹配行为
    class CustomMatcher {
      constructor(pattern) {
        this.pattern = pattern;
      }
      
      // 定义匹配逻辑
      [Symbol.match](string) {
        const index = string.indexOf(this.pattern);
        return index === -1 ? null : [this.pattern];
      }
    }
    
    const text = "Hello, world!";
    
    // 使用自定义匹配器
    const matcher = new CustomMatcher("world");
    console.log(text.match(matcher)); // 输出: ["world"]
    
    // 与普通正则表达式比较
    const regex = /world/;
    console.log(text.match(regex)); // 输出: ["world", index: 7, input: "Hello, world!", groups: undefined]
    
    ```

  - 

#### 1.4.1.4**对象的原始值转换**

对象进行数学运算或者比较，会发生什么？

**js并不允许自定义运算符对对象的处理方式，进行数学操作时，对象会被转换成原始值。**

转换规则：

1. 没有转换成布尔值：所有的对象在布尔上下文里面都是真
2. **数字转换**发生在**对象相减或者应用数学函数的时候**，比如Date对象详见可以得到两个日期的差值。
3. 字符串转换：比如alert一个对象，这个对象就变成字符串弹窗显示。



**hint**

那么js是怎样决定应用哪种规则的呢？

类型转换有三种变体，这个称为hint。

1. string:在**执行alert**，或者让对象作为另一个对象的键值时 
2. number：**进行数学运算 或者通过< >进行比较的时候**（这个比较运算符也可以是用于字符串，这里使用number是历史原因）
3. default：**不确定期望值的类型的时候**，比如加号既可以是数学运算符，也可以是字符串连接符 或者进行==比较的时候。

**为了进行转换，JavaScript 尝试查找并调用三个对象方法：**

1. 调用 `obj[Symbol.toPrimitive](hint)` —— 带有 symbol 键 `Symbol.toPrimitive`（系统 symbol）的方法，如果这个方法存在的话，

   ```javascript
   let user = {
     name: "John",
     money: 1000,
   
     [Symbol.toPrimitive](hint) {
       alert(`hint: ${hint}`);
       return hint == "string" ? `{name: "${this.name}"}` : this.money;
     }
   };
   
   // 转换演示：
   alert(user); // hint: string -> {name: "John"}
   alert(+user); // hint: number -> 1000
   alert(user + 500); // hint: default -> 1500
   ```

   

2. 否则，如果 hint 是 `"string"` —— 尝试调用 `obj.toString()` ,如果不存哎就调用`obj.valueOf()`。

3. 否则，如果 hint 是 `"number"` 或 `"default"` —— 尝试调用 `obj.valueOf()` ，如果不存在就调用 `obj.toString()`。

**这些方法必须返回一个原始值，如果返回了一个对象 将会被忽略。**

```javascript
let user = {name: "John"};

alert(user); // [object Object]
alert(user.valueOf() === user); // true
```

**但是因为历史原因，这里的valueOf方法就是会返回对象本身**，所以忽略他吧。

**硬要实现自定义转换，其实可以重写这些方法：**

```javascript
let user = {
  name: "John",
  money: 1000,

  // 对于 hint="string"
  toString() {
    return `{name: "${this.name}"}`;
  },

  // 对于 hint="number" 或 "default"
  valueOf() {
    return this.money;
  }

};

alert(user); // toString -> {name: "John"}
alert(+user); // valueOf -> 1000
alert(user + 500); // valueOf -> 1500
```

需要注意的是，转换的结果之要求是原始类型，至于是哪个原始类型就没有关系了。我们也可以只实现一种方法，统一处理。



**进一步的转换**

就比如在对对象执行乘法的时候，对象先是会进行原始值转换，然后生成的原始值将会进一步转换  转换成数字。







#### 1.4.1.6 属性标志 属性描述符

属性描述符是一个记录了对象属性的配置的对象，这个对象里面的键称为属性标志，属性标志一共有：

```
Enumerable//可枚举
Configurable//可配置
Writable//可写
Value//值
Getter//
Setter
```



**属性标志**

1. writable:为真 则该属性可以修改 在严格模式下修改只读属性将会报错
2. enumerable:为真 则该属性会在循环里面被列出
3. configurable:为真 则该属性可以删除 否则不能删除 不能再次配置





当我们使用普通的方式 创建一个对象属性的时候,以上属性均为真.



**获取这些标志`Object.getOwnPropertyDescriptor(obj,propertyName)`**

返回值就是一个属性描述符:

```
{
  "value": "John",
  "writable": true,
  "enumerable": true,
  "configurable": true
}
*/
```

通过`Object.defineProperty`修改属性描述符:如果这个属性存在,则修改,否则创建该属性.如果没有提供属性标识符,那么所有标志都是false

```javascript
Object.defineProperty(user, "name", {
  writable: false,
  configurable: false
});
//也可以一次配置多个属性:
Object.defineProperties(user, {
  name: { value: "John", writable: false },
  surname: { value: "Smith", writable: false },
  // ...
});
```

我们甚至可以用这个进行对象的拷贝

```javascript
let clone = Object.defineProperties({}, Object.getOwnPropertyDescriptors(obj));
```

如果我们使用for in 循环遍历 那么是**不能复制标志**的 并且**忽略symbol类型 不可枚举的属性**.而这种方式就不会



Q 怎么拷贝一个对象？

实现这个问题 我们要考虑以下几个问题

1. 浅拷贝or深拷贝
2. 只拷贝可遍历属性or全部拷贝 

对于浅拷贝 并且只拷贝可以遍历的属性 使用for 循环即可 或者使用Object.assign属性 

对于深拷贝 需要遍历对象的每层属性 就要在便利的时候判断属性值是否是基础数据类型 否则需要递归调用 

实现深拷贝 也就是需要获取到不可遍历的属性 以及Symbol类型的属性  需要使用Object.getOwnPropertyNames(除了symmbol之外的) Reflect.ownKeys（所有的 包括symbol） Object.getOwnPropertySymbols(symbol) Object.keys(可枚举的)

如果属性描述符也需要复制 那么需要使用getOwnPropertyDescriptors  



一些对象方法:

1. `Object.preventExtensions(obj)`  禁止像对象添加新属性
2. `Object.seal(obj)` 禁止添加 删除属性 给所有属性设置不可配置
3. `Object.freeze(obj) ` 禁止添加 删除 更改属性
4. `Object.isExtensible(obj)`
5. `Object.isSealed(obj)`
6. `Object.isFrozen(obj)`



#### 1.4.1.7 属性getter setter

**访问器属性的描述符**

对于访问器属性是没有value和writeable的,所以当我们通过defineProperty定义一个属性的时候 可以:

```javascript
Object.defineProperty(user, 'fullName', {
  get() {
    return `${this.name} ${this.surname}`;
  },

  set(value) {
    [this.name, this.surname] = value.split(" ");
  }
});
```

只定义getter函数的时候，这个属性就成为一个只读属性。只定义setter属性的时候，这个属性就成为一个只设属性

这个只设属性可以用来修改内部状态，而且不直接暴露这些状态：

```javascript
const obj = {
  _count: 0,
  set count(value) {
    this._count = value;
    console.log(`Count has been set to ${this._count}`);
  }
};

obj.count = 10; // 输出："Count has been set to 10"
```





**使用getter setter作为数据属性的包装器**

比如 我们要对某个数据属性进行限制 这个限制我们可以通过setter实现:

````java
let user = {
  get name() {
    return this._name;
  },

  set name(value) {
    if (value.length < 4) {
      alert("Name is too short, need at least 4 characters");
      return;
    }
    this._name = value;
  }
};

user.name = "Pete";
alert(user.name); // Pete

user.name = ""; // Name 太短了……
````

虽然但是 这样可以从外部访问_name 但是用下划线开头的属性是内部的 不应该从外部访问.









### 1.4.2 原始类型

**原始类型的方法

**对象包装器**

为了解决既可以通过方法操作原始类型，又要让原始类型保持轻量级，js创作者的解决方案是这样的：

1. 访问一个原始值的某个属性的时候，会创建一个包含这个原始值的字面量的特殊对象，这个特殊对象里面有这个类型对应的方法。
2. 这个方法运行之后返回运行结果
3. 特殊对象被销毁

这个特殊的对象，我们管它叫包装器。

**不过null和undefined这两没有任何方法，没有对应的包装器**，所以我们可以认为这两种类型是最原始的了。



**不要使用基本类型的构造器函数**

```javascript
let zero = new Number(0);

if (zero) { // zero 为 true，因为它是一个对象
  alert( "zero is truthy?!?" );
}
```



#### 1.4.2.1 数字类型

**编写数字**在表示很长的数字的时候 可以使用下划线进行分隔，这是一种语法糖，js引擎会直接忽略下划线。

有一些带着贼长一段的0的数字，可以在数字后面加上字母e来指定：

```javascript
let billion = 1_000_000_000;
let billion = 1e9; 
1.23e6 === 1.23 * 1000000; // e6 表示 *1000000
let mcs = 1e-6; // 1 的左边有 6 个 0
```

如果需要转换进制，可以使用toString（base）方法，这个方法会返回对应进制结果的字符串形式。`1233..toString(36)`，为什么这里有两个点？因为js隐含了第一个点之后是小数，用括号包裹也可以解决。(如果只写一个点会报错标识符或者关键字不能紧跟在数字字面量之后)



**舍入数字**

```javascript
let num = 1.23456;

alert( Math.round(num * 100) / 100 );//直接舍去多余部分，不会四舍五入
alert( num.toFixed(1) ); // "12.3"  这会向上或向下舍入到最接近的值  结果是一个字符串。如果小数部分比所需要的短，则在结尾添加零：

```





**不精确的计算**

使用64位来存储一个数字，其中52位存整数部分，11位小数部分，1位符号。许多时候，我们得到的值是并不精准的：`0.1+0.2==0.3` 结果是假

我们可以通过toFixed方法舍去后面不精确的一大坨小数解决 这个方法返回字符串 

```javascript
let sum = 0.1 + 0.2;
alert( +sum.toFixed(2) ); // 0.3
```





**isFinte isNaN**

infinite NaN都是数字类型 却不是一个普通的数字，所以js设计了这两个函数来检查。

isNaN将会把参数转换成数字，再测试是否是NaN：

```javascript
alert( isNaN(NaN) ); // true
alert( isNaN("str") ); // true
//不能使用===进行比较，NaN不等于任何东西 包括自己
alert( NaN === NaN ); // false
alert( NaN == NaN ); // false 这个也是假的，虽然用==进行比较的时候两边会发生类型转换，但是NaN是特殊的 对于其他类型的值 这个操作符会把他们转换成相同的类型进行转换  对于NaN会直接返回false
```

isFinite会将参数转换成数字类型（空字符串/空格字符串被认为是0），如果是常规数字，不是NaN.Infinite,-inFinte都会返回true，这个函数可以用来检验输入。

> Object.is()
>
> 这时一个内建方法 和===差不多 特殊的是 Object.is(NaN，NaN)返回true



**parseInt parseFloat**

我们经常使用Number + 把某些字符串转换成数字，这样的转换很严格，如果一个字符串里面的字符不完全是数字，转换会失败 变成NaN。（开头结尾的字符串会被忽略）

而这两个函数会从字符串里从头读取数字直到无法读取为止，发生错误就会返回读取到的数字，要是一个数字都读不到，返回NaN。（开头就是字母的情况）

这个函数还提供了第二个参数指定进制，结果还是会返回十进制的。





#### 1.4.2.2 字符串类型



**特殊字符**

换行符：\n

在反引号出现之前就是使用换行符实现输出换行的。

```javascript
let str1 = "Hello\nWorld"; // 使用“换行符”创建的两行字符串

// 使用反引号和普通的换行创建的两行字符串
let str2 = `Hello
World`;

alert(str1 == str2); // true
```



**字符串属性**

* 字符串长度：str.length 这个属性会计算字符串里面有几个字符，但是注意转义字符是一个字符
* 访问字符：可以像数组一样：str[1],也可以调用charAt方法`str.charAt(1)` 这个方法是很古老的，这两个之间的区别在于找不到的话[]返回undefined，charAt返回空字符串。
* 遍历字符串：for...of...

在js里面，无法通过str[1] = 'a'来修改字符串。（试了一下 确实会报错）这是因为在js里面，字符串是不可变的，当对一个字符串变量进行赋值的时候，如果将其修改为另一个字符串，其实是修改了变量内部的指向，有一些直接修改字符串的方法，其实也是返回一个新的实例然后修改了指向的内存地址。毕竟字符串的本质还是对象，但是使用==进行比较的时候 字符串比较的是字符序列，而非地址。



**查找子字符串**

1. str.indexOf(substr, pos) 从pos位置开始查找子字符串，没有找到返回-1，找到了返回子字符串的开始下标，但是只会找到第一个子字符串。如果要查找所有的可以循环：

   ```javascript
   let str = "As sly as a fox, as strong as an ox";
   let target = "as";
   
   let pos = -1;
   while ((pos = str.indexOf(target, pos + target.length)) != -1) {
     alert( pos );
   }
   ```

2. str.includes(substr,pos)：根据str从pos（可省略）位置开始是否包含子字符串返回真或假。
3. str.startsWith('字符串')/str.endsWith('字符串')：检查某个字符串的开始/结尾是否是某个子字符串，返回真或假。



**获取子字符串**

1. str.slice(stsrt[,end]):从开始位置截取到结束位置（不包括），没有结束位置就一直到最后。start end也可以是负值，表示从右边开始数（end必须是负数，如果start是负数而end是0 这个0会被视为开始位置）
2. str.substring(stsrt[,end]):和str.slice(stsrt[,end])基本一样，但是允许start大于end，这时它会将start end视为相同的索引，提取从start到最后一个字符，slice这样的话会返回空字符串不支持负数。
3. str.substr(start[,length]):第一个参数可以是负数，表示从右边开始算。(这个比较古老)



#### 1.4.2.3 数组类型

数组的本质还是对象，所以这和其他基本类型不太一样，数组是可以使用new Array（）声明的。

```javascript
let arr = new Array();
let arr = [];
```

如果使用构造函数创建数字，我们可以传进去数组元素，或者长度，但是如果传递长度的话，每个元素都会是undefined。





**新特性at增加了`arr.at(-1)`这种方法来获取最后的元素。这种方法如果i为正数 就和直接取出来一样，如果为负数就是从最后一位往前数。







**数组内部**

正如前面所说的，数组是一种特殊的对象，对对象进行了拓展，使用[]和下标访问数组元素其实源于访问对象属性。

数组和对象一样，复制数组的时候复制的也是数组的引用。

但是数组的内部实现不一样，js引擎会把这些元素一个一个的存储在连续的内存区域，进行优化，这能使数组运行的很快。但是如果把数组当成对象使用，那么js引擎会关闭对应的优化。

```javascript
let fruits = []; // 创建一个数组

fruits[99999] = 5; // 分配索引远大于数组长度的属性

fruits.age = 25; // 创建一个具有任意名称的属性
```

数组误用的几种方式:

- 添加一个非数字的属性，比如 `arr.test = 5`。
- 制造空洞，比如：添加 `arr[0]`，然后添加 `arr[1000]` (它们中间什么都没有)。
- 以倒序填充数组，比如 `arr[1000]`，`arr[999]` 等等。



**数组循环**

**一般会使用for循环，不过数组也可以使用for of**，这种方式无法获取当前的下标。

但是因为数组的本质就是对象，所以**其实for in循环也是可以的，但是这种遍历会遍历所有的属性，而不仅仅是数字属性**。而且这种循环用于数组的时候比较慢。



**length**

这个属性有趣的地方是他是可写的，增加他不会发生什么，但是减少他数组将会被截断，并且不可逆。所以如果想要清空数组，设置长度为零。



**toString**

数组有自己的toString方法实现，会返回以逗号隔开的元素数组。



其他的数组方法：

1. `arr.splice(stsrt[,deletenum,elem1.....elemn])`：这个方法可以删除，添加，插入元素。其实`delete arr[0]`也可以删除，但是这样只会清空某个下标上的内容，length不改变。允许负数索引，表示从尾端开始某位的前面的位置。

2. `arr.slice([start],[end])`复制从start到end（不包括）的元素到新数组，返回新数组，也可以不传参，获得数组的副本。

3. `arr.concat(arg1...argN)`参数可以接收数组或者单个的元素，返回创建的新数组。（类数组按照单个元素处理 但是如果类数组打开了`Symbol.isCincatSpreadable`属性 就会当作数组处理）

   ```javascript
   let arr = [1, 2];
   
   let arrayLike = {
     0: "something",
     1: "else",
     [Symbol.isConcatSpreadable]: true,
     length: 2
   };
   
   alert( arr.concat(arrayLike) ); // 1,2,something,else
   ```

   

4. `arr.forEach(function(item,index,array){})`对每个数组元素执行特定的操作，可以不一定是函数，alert这样的也可以。如果是函数，那么函数的返回值会被忽略。

5. `arr.indexOf(item[,from])`从from开始寻找item，找到了返回索引，找不到返回-1。这个函数内部使用的是===，无法正确处理NaN

6. `arr.lastIndexOf(item)`和indexOf相同，只不过这个从右向左找。

7. `arr.includes(item[,from])`从from开始查找，找得到返回true，否则返回false。这个函数内部使用的是===，但是他可以正确处理NaN。

8. `arr.find(function(item,index,array){...})` （当然箭头函数也可以）函数内部返回true，则搜索停止，返回对应的item。

9. `arr.findIndex((item,index,array)=>{})`和find一样的，只不过这个返回索引。

10. `arr.findLastIndex(..)` 从右向左 返回索引

11. `arr.filter((item,index,arr)=>{...})` 和find相似，返回所有符合条件的元素组合成的数组。

12. `arr.map((item,index,arr)=>{...})` 对每个元素进行处理 返回处理之后的源数组

13. `arr.sort()` 这个方法默认按照字符串顺序进行排序 如果我们要使用自己定义的比较规则，需要传一个比较器函数。

    ```javascript
    [1, -2, 15, 2, 0, 8].sort( (a, b) => a - b);
    alert( countries.sort( (a, b) => a.localeCompare(b) ) ); // Andorra,Österreich,Vietnam（对的！）
    ```

14. `arr.reverse()` 原地颠倒数组。
15. `arr.split(delim[,length])` 通过给定的分隔符把字符串分隔成数组。第二个参数用于限制数组长度 如果不给定分隔符，会分割成单个的字符。
16. `arr.join(delim)` 返回由给定分隔符分隔的字符串。
17. `arr.reduce(function(accum,item,index,arr){...},[initial])`  上一个函数调用的结果作为accum传递给下一个函数。如果没有初始值，把数组里面的第一个元素作为初始值，从第二个元素开始迭代。
18. `arr.reduceRight(function(accum,item,index,arr){...},[initial])` 和上面哪个一样 但是从右边开始迭代
19. `Array.isArray(arr)` 因为数组是基于对象的 所以typeof会得到object，这种方式可以区分数组和对象 返回true/false



1. `arr.some(fn)` `arr.every(fn)`

2. `arr.fill(val,start,end)`

3. `arr.copyWithin(target,start,end)`从start 到end位置的元素复制到target位置。

4. `arr.flat(depth)` `arr.flatMap(fn)`多维数组整合成扁平数组

   1. 由于之前的很多方法都是直接修改原数组，现在有了一些返回拷贝数组的方法：`toReversed()` `toSorted()`  `toSpliced()`   `with(index,value)`

   ```javascript
   const sequence = [1, 2, 3];
   sequence.toReversed() // [3, 2, 1]
   sequence // [1, 2, 3]
   
   const outOfOrder = [3, 1, 2];
   outOfOrder.toSorted() // [1, 2, 3]
   outOfOrder // [3, 1, 2]
   
   const array = [1, 2, 3, 4];
   array.toSpliced(1, 2, 5, 6, 7) // [1, 5, 6, 7, 4]
   array // [1, 2, 3, 4]
   
   const correctionNeeded = [1, 1, 3];
   correctionNeeded.with(1, 2) // [1, 2, 3]
   correctionNeeded // [1, 1, 3]
   ```

   



**thisArg**

上述的方法几乎都支持thisArg作为最后一个参数，除了sort，这个参数是用来指定上下文的

```javascript
let army = {
  minAge: 18,
  maxAge: 27,
  canJoin(user) {
    return user.age >= this.minAge && user.age < this.maxAge;
  }
};

let users = [
  {age: 16},
  {age: 20},
  {age: 23},
  {age: 30}
];

// 找到 army.canJoin 返回 true 的 user
let soldiers = users.filter(army.canJoin, army);

alert(soldiers.length); // 2
alert(soldiers[0].age); // 20
alert(soldiers[1].age); // 23
```

 this.minAge 的this需要指向army 所以这里制定了上下文 当然也可以使用users.filter(user => army.canJoin(user)) （箭头函数没有自己的this但是这里调用canjoin的是army对象，所以内部的this指向是正确的 army才是方法调用的上下文）



**可迭代对象**

可迭代对象是数组的泛化，这个概念的意思是所有对象都可以被定制成能通过for of循环的对象

比如我有一个对象，适合使用for of循环：

```javascript
let range = {
  from: 1,
  to: 5
};

// 我们希望 for..of 这样运行：
// for(let num of range) ... num=1,2,3,4,5
```

为了让 `range` 对象可迭代（也就让 `for..of` 可以运行）我们需要为对象添加一个名为 `Symbol.iterator` 的方法（一个专门用于使对象可迭代的内建 symbol）。

1. 当 `for..of` 循环启动时，它会调用这个方法（如果没找到，就会报错）。这个方法必须返回一个 **迭代器（iterator）** —— 一个有 `next` 方法的对象。
2. 从此开始，`for..of` **仅适用于这个被返回的对象**。
3. 当 `for..of` 循环希望取得下一个数值，它就调用这个对象的 `next()` 方法。
4. `next()` 方法返回的结果的格式必须是 `{done: Boolean, value: any}`，当 `done=true` 时，表示循环结束，否则 `value` 是下一个值。

```javascript
let range = {
  from: 1,
  to: 5
};

// 1. for..of 调用首先会调用这个：
range[Symbol.iterator] = function() {

  // ……它返回迭代器对象（iterator object）：
  // 2. 接下来，for..of 仅与下面的迭代器对象一起工作，要求它提供下一个值
  return {
    current: this.from,
    last: this.to,

    // 3. next() 在 for..of 的每一轮循环迭代中被调用
    next() {
      // 4. 它将会返回 {done:.., value :...} 格式的对象
      if (this.current <= this.last) {
        return { done: false, value: this.current++ };
      } else {
        return { done: true };
      }
    }
  };
};

// 现在它可以运行了！
for (let num of range) {
  alert(num); // 1, 然后是 2, 3, 4, 5
}
//从技术上说，我们可以将它们合并，并使用 range 自身作为迭代器来简化代码。
//现在 range[Symbol.iterator]() 返回的是 range 对象自身：它包括了必需的 next() 方法，并通过 this.current 记忆了当前的迭代进程。这样更短，对吗？是的。有时这样也可以。

//但缺点是，现在不可能同时在对象上运行两个 for..of 循环了：它们将共享迭代状态，因为只有一个迭代器，即对象本身。但是两个并行的 for..of 是很罕见的，即使在异步情况下。
let range = {
  from: 1,
  to: 5,

  [Symbol.iterator]() {
    this.current = this.from;
    return this;
  },

  next() {
    if (this.current <= this.to) {
      return { done: false, value: this.current++ };
    } else {
      return { done: true };
    }
  }
};

for (let num of range) {
  alert(num); // 1, 然后是 2, 3, 4, 5
}
```

> 无穷迭代器
>
> 无穷迭代器也是可能的。例如，将 `range` 设置为 `range.to = Infinity`，这时 `range` 则成为了无穷迭代器。或者我们可以创建一个可迭代对象，它生成一个无穷伪随机数序列。也是可能的。
>
> `next` 没有什么限制，它可以返回越来越多的值，这是正常的。
>
> 当然，迭代这种对象的 `for..of` 循环将不会停止。但是我们可以通过使用 `break` 来停止它。



字符串也是可以迭代的（这是为什么？因为字符串这种数据类型实现了迭代器协议 这是ES6里引入的一种机制）

**显式调用迭代器**

```javascript
let str = "Hello";

// 和 for..of 做相同的事
// for (let char of str) alert(char);

let iterator = str[Symbol.iterator]();

while (true) {
  let result = iterator.next();
  if (result.done) break;
  alert(result.value); // 一个接一个地输出字符
}
```

可迭代（iterable）:实现了Symbol.iterator    类数组（array-like）具有索引和length属性的对象。就比如字符串，既是可迭代的，又是类数组。

可迭代对象，类数组对象通常并不是数组，但是如果我们希望像数组一样操作他们，可以使用`Array.from(obj[,mapFn.thisArg])`方法，接收一个可迭代对象/类数组对象，将其处理成一个真正的数组并返回。`mapFn` 可以是一个函数，该函数会在对象中的元素被添加到数组前，被应用于每个元素，此外 `thisArg` 允许我们为该函数设置 `this`。

```javascript
let arr = Array.from(range, num => num * num);

alert(arr); // 1,4,9,16,25
```

这个函数也可以把字符串转换成单个字符的数组，和split不同 它依赖于字符串的可迭代性，这意味着它会按照字符串的规范来正确处理代理对。（迭代器可以正确处理代理对）

`str.split` 方法在处理字符串时，通常按照字符串的分隔符来分割字符串。默认情况下，如果没有提供分隔符，它会按照字符串的每个字符来分割，但这里的“字符”实际上是按照UTF-16代码单元来分割的。这意味着，如果一个字符由一个代理对表示，`str.split` 方法可能会将这个字符分割成两部分，因为每个代理对代码单元被当作独立的字符。

像原生的slice方法，也无法识别代理对，我们可以通过这个函数改进他

```javascript
function slice(str, start, end) {
  return Array.from(str).slice(start, end).join('');
}

let str = '𝒳😂𩷶';

alert( slice(str, 1, 3) ); // 😂𩷶

// 原生方法不支持识别代理对（译注：UTF-16 扩展字符）
alert( str.slice(1, 3) ); // 乱码（两个不同 UTF-16 扩展字符碎片拼接的结果）
```



**原型方法**

**Array.from()** :这个方法用于把类数组对象 可遍历对象转换成数组

```javascript
let arrayLike = {
    '0': 'a',
    '1': 'b',
    '2': 'c',
    length: 3
};

// ES5 的写法  在一个类数组对象的上下文里面执行slice方法
var arr1 = [].slice.call(arrayLike); // ['a', 'b', 'c']

// ES6 的写法
let arr2 = Array.from(arrayLike); // ['a', 'b', 'c']
```

具有遍历器接口的数据结构都可以使用这个方法。之前提到的使用拓展运算符也可以把某些具有遍历器的数据变成数组，这两个方法的差别在于类数组对象，只要是具有length属性的对象 这个方法就能将其转换成数组，如果元素不够就是undefined 而拓展运算符不能。

这个方法还可以接受一个函数作为第二个参数,类似于数组的map方法，

另外这个方法由于可以正确处理各种字符 可以使用这个方法把字符串转换成数组，再取数组的长度，避免错误。



**Array.of()**方法用于把一组值转换成数组，可以弥补构造函数的问题：

```javascript
Array()//得到空数组
Array(3)//得到有三个空元素的数组
Array(3,33,3)//得到[3,33,3]
//只有当参数不少于两个 构造函数才会使用参数构成新的数组

//手动实现
function ArrayOf(){
  return [].slice.call(arguments);
}
```

















































#### 1.4.2.4 Map Set

Map是比对象更加完整的哈希结构，允许任何数据类型作为键

它的方法和属性如下：

- `new Map()` —— 创建 map。
- `map.set(key, value)` —— 根据键存储值。
- `map.get(key)` —— 根据键来返回值，如果 `map` 中不存在对应的 `key`，则返回 `undefined`。
- `map.has(key)` —— 如果 `key` 存在则返回 `true`，否则返回 `false`。
- `map.delete(key)` —— 删除指定键的值。
- `map.clear()` —— 清空 map。
- `map.size` —— 返回当前元素个数。

> 不要写map[key]
>
> 虽然这样的代码也是有效的 但是这样就会把这个map当作扁平对象，因此他暗含了相应的限制

> Map是怎么比较键的？
>
> 内部使用的是SameValueZero算法 和===差不多 但是NaN会等于它本身 所以NaN也可以用作键

> 链式调用
>
> 每一次map.set调用之后都会返回map本身，所以可以：map.set().set()....



**迭代**

- `map.keys()` —— 遍历并返回一个包含所有键的可迭代对象，
- `map.values()` —— 遍历并返回一个包含所有值的可迭代对象，
- `map.entries()` —— 遍历并返回一个包含所有实体 `[key, value]` 的可迭代对象，`for..of` 在默认情况下使用的就是这个。

并且迭代的顺序和插入的顺序相同。

Map还有内建的forEach算法`map.foreach((val,key,map)=>{....})`



**创建map**

我们可以传入一个带有键值对的数组，或者其他的可迭代对象进行初始化

```javascript
// 键值对 [key, value] 数组
let map = new Map([
  ['1',  'str1'],
  [1,    'num1'],
  [true, 'bool1']
]);

alert( map.get('1') ); // str1
```

通过普通对象初始化：

```javascript
let obj = {
  name: "John",
  age: 30
};

let map = new Map(Object.entries(obj));

alert( map.get('name') ); // John
```

这个方法返回对象的键值对数组。

还有一个函数：`Object.fromEntries(obj)` 可以把键值对数组变成对象，这个函数可以把map结构变成对象。`let obj = Object.fromEntries(map.entries())`



Set是一个值的集合 并且每个值只能出现一次

- `new Set(iterable)` —— 创建一个 `set`，如果提供了一个 `iterable` 对象（通常是数组），将会从数组里面复制值到 `set` 中。
- `set.add(value)` —— 添加一个值，返回 set 本身
- `set.delete(value)` —— 删除值，如果 `value` 在这个方法调用的时候存在则返回 `true` ，否则返回 `false`。
- `set.has(value)` —— 如果 `value` 在 set 中，返回 `true`，否则返回 `false`。
- `set.clear()` —— 清空 set。
- `set.size` —— 返回元素个数。

它的主要特点是，重复使用同一个值调用 `set.add(value)` 并不会发生什么改变。这就是 `Set` 里面的每一个值只出现一次的原因。

在set内部 NaN是等于NaN的



**迭代**

可以使用for of 和forEach进行迭代。

```javascript
let set = new Set(["oranges", "apples", "bananas"]);

for (let value of set) alert(value);

// 与 forEach 相同：
set.forEach((value, valueAgain, set) => {
  alert(value);
});
```

很怪的是，上面的value和valueAgain是完全一样的，这是为了和Map兼容。

.keys .values .entries .foreach 这几种方法都可以对set进行遍历 并且前三个方法返回的都是遍历器对象 但是因为set没有键名 只有键值 所以keys values方法的行为完全一致 并且Set结构默认可以遍历 他的默认遍历器就是他的.values方法 

```javascript
Set.prototype[Symbol.iterator] === Set.prototype.values
```

这就是为什么for(let a of set)和for(let a of set.values)是一个效果。



还没有方法可以在对set进行遍历的时候同步修改set 但是我们可以使用原来的set映射出一个数组 复制给原来的set

```javascript
// 方法一
let set = new Set([1, 2, 3]);
set = new Set([...set].map(val => val * 2));
// set的值是2, 4, 6

// 方法二
let set = new Set([1, 2, 3]);
set = new Set(Array.from(set, val => val * 2));
// set的值是2, 4, 6
```





**WeakMap WeakSet**

通过前面的垃圾回收机制可以猜到，如果定义了一个对象，把这个对象作为map的键，之后再覆盖这个对象的引用，由于这个对象保存在了map里面，这个对象不会被垃圾回收机制回收

**WeakMAp就不一样了，它不会阻止垃圾回收机制对作为键的回收。而且它的键只能是对象,他也不能进行迭代**，没有keys values entries方法

```javascript
let john = { name: "John" };

let map = new Map();
map.set(john, "...");

john = null; // 覆盖引用

// john 被存储在了 map 中，
// 我们可以使用 map.keys() 来获取它

let john = { name: "John" };

let weakMap = new WeakMap();
weakMap.set(john, "...");

john = null; // 覆盖引用

// john 被从内存中删除了！
```

`WeakMap` 只有以下的方法：

- `weakMap.get(key)`
- `weakMap.set(key, value)`
- `weakMap.delete(key)`
- `weakMap.has(key)`

这是因为如果有一个对象丢失了所有引用，那么按道理，他会被回收，但是我们不能准确的知道这个对象到底在什么时候会被回收。所以不支持访问所有的键值。

这种数据类型的使用场景是额外数据的存储，比如我们正在处理某个对象的一些数据，那么要是这个对象被清除了，和对象有关的数据也应该被一起清除。另一个例子是缓存，我们可以把对象和对象的一些缓存计算数据存储在里面，当用户被清理，缓存数据也会清理。这样的方式，避免手动清除

```javascript
// 📁 cache.js
let cache = new WeakMap();

// 计算并记结果
function process(obj) {
  if (!cache.has(obj)) {
    let result = /* calculate the result for */ obj;

    cache.set(obj, result);
  }

  return cache.get(obj);
}

// 📁 main.js
let obj = {/* some object */};

let result1 = process(obj);
let result2 = process(obj);

// ……稍后，我们不再需要这个对象时：
obj = null;

// 无法获取 cache.size，因为它是一个 WeakMap，
// 要么是 0，或即将变为 0
// 当 obj 被垃圾回收，缓存的数据也会被清除
```





**WeakSet里面只能添加对象**不可迭代

```javascript
let visitedSet = new WeakSet();

let john = { name: "John" };
let pete = { name: "Pete" };
let mary = { name: "Mary" };

visitedSet.add(john); // John 访问了我们
visitedSet.add(pete); // 然后是 Pete
visitedSet.add(john); // John 再次访问

// visitedSet 现在有两个用户了

// 检查 John 是否来访过？
alert(visitedSet.has(john)); // true

// 检查 Mary 是否来访过？
alert(visitedSet.has(mary)); // false

john = null;

// visitedSet 将被自动清理(即自动清除其中已失效的值 john)
```





**前面的Map数据结构可以通过map.keys获取所有的键 而对于对象 则可以通过Object.keys(obj)获取所有的键 不一样的是 map返回的是一个可迭代对象 可以通过for of遍历返回值 而对象返回的则是一个真正的数组。 至于`Object.values()` `Object.entries()` 也是一样的。**

> 以上的几种方法都会忽略以Symbol作为键名的属性
>
> 如果想要得到以Symbol作为键的属性，也可以使用Object.getOwnPropertySymbols,他会返回一个只包含Symbol类型的键的数组。



**转换对象**

如果我们想对对象应用数组的一些方法，比如map filter这样的，我们可以使用`Object.entries`获取数组，再对这个数组进行处理，再使用`Object.fromEntries(arr)` 把处理好的数组还原成对象。



### 1.4.3 解构赋值

结构赋值是一种特殊的语法，允许我们把对象数组拆包到变量里面。

**数组/字符串/Map解构**

```javascript
let [firstName, surname] = "John Smith".split(' ');

for (let [key, value] of Object.entries(user)) {
  alert(`${key}:${value}`); // name:John, then age:30
}

[guest, admin] = [admin, guest];
```

这样的解构赋值**可以用于任何可以迭代的对象**，这里列出**数组字符串**是因为这两种数据类型**具有内建迭代器**。并且等号的左侧可以是任何能够被赋值的东西，比如对象的某个属性。

也可以通过添加额外的,来跳过某个元素

```javascript
let [firstName, , title] = ["Julius", "Caesar", "Consul", "of the Roman Republic"];
```

如果右边有**多余元素 将会被忽略** 也可以**通过...收集这些元素**

```javascript
let [name1, name2] = ["Julius", "Caesar", "Consul", "of the Roman Republic"];
//这里的...rest只能在最后一个
let [name1, name2, ...rest] = ["Julius", "Caesar", "Consul", "of the Roman Republic"];
```

如果左边有多余元素，那么这些多余元素会被赋值成undefined

为了防止undefined，我们可以为左边元素添加默认值**。默认值可以是更复杂的函数表达式，也可以是函数调用，但是，只有在这个变量没有被赋值的时候才会被计算。**

```javascript
let [name = "Guest", surname = "Anonymous"] = ["Julius"];
```



**对象解构**

**等号右边是一个已经存在的对象，等号左侧是一个相应属性的类模式。也就是说，最简单的情况下，变量名是等于属性名的。**不过也可以使用冒号来重新设置变量名。也可以设置默认值，就和数组一样。 

```javascript
let options = {
  title: "Menu",
  width: 100,
  height: 200
};

// { sourceProperty: targetVariable }
let {width: w=10, height: h, title} = options;
let {width: w = 100, height: h = 200, title} = options;
```

对象也可以使用剩余模式，把多出来的属性收集到某个对象里面。



> 进行解构赋值时不使用let
>
> 如果我们使用一些现成的变量，当然也是可以的，不过一些小陷阱会使代码无法正常运行：
>
> ```javascript
> let title, width, height;
> 
> // 这一行发生了错误
> {title, width, height} = {title: "Menu", width: 200, height: 100};
> ```
>
> 这是因为js引擎把大括号视为一个代码块 为了解决 把整个解构赋值语句用（）括起来



**嵌套解构**

如果对象/数组里面嵌套了对象/数组，我们可以用更复杂的模式解构出来



**通过解构赋值传递函数参数**

有的时候函数需要很多参数，但是在传递参数的时候写很长一串不太好看，这个时候可以传递对象，并把对象解构

```javascript
// 我们传递一个对象给函数
let options = {
  title: "My menu",
  items: ["Item1", "Item2"]
};

// ……然后函数马上把对象解构成变量
function showMenu({title = "Untitled", width = 200, height = 100, items = []}) {
  // title, items – 提取于 options，
  // width, height – 使用默认值
  alert( `${title} ${width} ${height}` ); // My Menu 200 100
  alert( items ); // Item1, Item2
}

showMenu(options);
```

**如果某些情况下 我们想要全部使用默认值，这个时候还是需要传递一个空对象的 但是传递一个空对象看起来躲闪有点莫名其妙，这个时候我们就可以用默认值的方式给整体赋值{}**



```javascript
function showMenu({ title = "Menu", width = 100, height = 200 } = {}) {
  alert( `${title} ${width} ${height}` );
}

showMenu(); // Menu 100 200
```



### 1.4.4 JSON

在过去想把对象显式转换成字符串，可能需要自定义一些方法，为了简单，我们现在可以直接转换成JSON字符串。

JSON 是语言无关的纯数据规范

**JSON.stringify**

这个函数可以把对象（也使用与原始数据类型）转换成JSON字符串，并且支持嵌套转换，这个字符串被称为JSON编码的对象/序列化的对象/字符串化的对象/编组化的对象。

* 字符串使用双引号
* 属性名使用双引号



JSON 支持以下数据类型：

- Objects `{ ... }`
- Arrays `[ ... ]`
- Primitives：
  - strings，
  - numbers，
  - boolean values `true/false`，
  - `null`。

```javascript
// 数字在 JSON 还是数字
alert( JSON.stringify(1) ) // 1

// 字符串在 JSON 中还是字符串，只是被双引号扩起来
alert( JSON.stringify('test') ) // "test"

alert( JSON.stringify(true) ); // true

alert( JSON.stringify([1, 2, 3]) ); // [1,2,3]
```

由于JSON 是语言无关的纯数据规范，一些特定于 **JavaScript 的对象属性会被 `JSON.stringify` 跳过。**

即：

- 函数属性（方法）。
- Symbol 类型的键和值。
- 存储 `undefined` 的属性。

**不得有循环引用，否则这个操作会报错：**

````javascript
let room = {
  number: 23
};

let meetup = {
  title: "Conference",
  participants: ["john", "ann"]
};

meetup.place = room;       // meetup 引用了 room
room.occupiedBy = meetup; // room 引用了 meetup

JSON.stringify(meetup); // Error: Converting circular structure to JSON
````



**JSON.stringify(val[,replacer,space])**

value

要编码的值。

replacer

**要编码的属性数组或映射函数** `function(key, value)`。

space

用于格式化的空格数量。



如果我们需要微调替换过程，比如过滤掉循环引用，就可以使用第二个参数

```javascript
let room = {
  number: 23
};

let meetup = {
  title: "Conference",
  participants: [{name: "John"}, {name: "Alice"}],
  place: room // meetup 引用了 room
};

room.occupiedBy = meetup; // room 引用了 meetup

alert( JSON.stringify(meetup, ['title', 'participants']) );
// {"title":"Conference","participants":[{},{}]}
```

这里我们可能过于严格了。属性列表应用于了整个对象结构。所以 `participants` 是空的，因为 `name` 不在列表中。

```javascript
let room = {
  number: 23
};

let meetup = {
  title: "Conference",
  participants: [{name: "John"}, {name: "Alice"}],
  place: room // meetup 引用了 room
};

room.occupiedBy = meetup; // room 引用了 meetup

alert( JSON.stringify(meetup, ['title', 'participants', 'place', 'name', 'number']) );
/*
{
  "title":"Conference",
  "participants":[{"name":"John"},{"name":"Alice"}],
  "place":{"number":23}
}
*/
```

虽然这样防止了由于循环引用导致的报错，但是 写起来也太麻烦了。但是我们可以使用一个函数代替属性列表数组

````javascript
alert( JSON.stringify(meetup, function replacer(key, value) {
  alert(`${key}: ${value}`);
  return (key == 'occupiedBy') ? undefined : value;
}));

/* key:value pairs that come to replacer:
:             [object Object]
title:        Conference
participants: [object Object],[object Object]
0:            [object Object]
name:         John
1:            [object Object]
name:         Alice
place:        [object Object]
number:       23
occupiedBy: [object Object]
*/
````

这个replacer函数会获取每个键值对，包括嵌套对象和数组项，这个函数会被递归调用，并且这个函数里面的this指向拥有当前属性的对象。

为什么第一次输出的键是空 值是[object Object]呢？

因为他是对一个特殊的包装对象调用了这个函数：`{"": meetup}` 也就是说这个对象里面只有一个键值对，并且键为空，值为我们需要处理的一整个对象。这是为了给处理函数提供尽量多的功能，如果有必要，它可以分析整个对象。



第三个参数调整的就是空格数量 2就是两个空格这样





**自定义toJSON**

在我们把日期对象转换成JSON格式，我们应该看到的是这个对象内部地键值对，但是事实上，直接变成了字符串，这是因为日期对象有一个内建的toJSON方法来返回这个字符串。

当我们给一个对象定义toJSON方法，对对象进行JSON.stringify的时候 就会自动调用这个方法。并且如果这个对象是另外一个对象的属性值，在另一个对象进行stringfy的时候，也会自动调用这个方法：

```javascript
let room = {
  number: 23,
  toJSON() {
    return this.number;
  }
};

let meetup = {
  title: "Conference",
  room
};

alert( JSON.stringify(room) ); // 23

alert( JSON.stringify(meetup) );
/*
  {
    "title":"Conference",
    "room": 23
  }
*/
```



**JSON.parse**

`let obj = JSON.parse(str,[reviver])`

reviver函数将会对每个键值对调用，把JSON对象转换成真正的对象（字符串化数组会转换成数组） 例如：

```javascript
let numbers = "[0, 1, 2, 3]";

numbers = JSON.parse(numbers);

alert( numbers[1] ); // 1
```

也能正确处理嵌套对象：

```javascript
let userData = '{ "name": "John", "age": 35, "isAdmin": false, "friends": [0,1,2,3] }';

let user = JSON.parse(userData);

alert( user.friends[1] ); // 1
```



**使用处理函数**

就比如我们得到了一个序列化对象：

```javascript
// title: (meetup title), date: (meetup date)
let str = '{"title":"Conference","date":"2017-11-30T12:00:00.000Z"}';
```

如果我们直接对其调用parse函数 里面的日期对象将会变成普通字符串，这时就需要处理函数：

```javascript
let meetup = JSON.parse(str, function(key, value) {
  if (key == 'date') return new Date(value);
  return value;
});
```

并且由于这个函数会递归调用，所以即使是嵌套对象里面的数据也可以被正确处理。



### 1.4.5 过去的var

**没有块级作用域**

使用var声明的变量**只有函数作用域 全局作用域，**如果在**if代码块里面使用var进行声明，我们就会得到一个全局变量**，这是因为在早期，**代码块不具有自己的词法环境。**



**允许重新声明**

使用var对一个变量进行多次声明式无效的 但是也不会报错。



**在声明之前使用**

也就是变量提升：在函数一开始，或者脚本一执行，就会处理var声明。

```javascript
function sayHi() {
  phrase = "Hello"; // (*)

  if (false) {
    var phrase;
  }

  alert(phrase);
}
sayHi();
```

就像这段代码里面的分支永远不会走 但**是变量存在 所以执行赋值是可以的**

但是**变量声明会被提升 变量赋值却不会**

```javascript
function sayHi() {

  alert(phrase); // undefined

  var phrase = "Hello"; // ……赋值 — 当程序执行到这一行时。
}

sayHi();
```





**IIFE**

这是一种模仿块级作用域的方法:创建一个函数表达式并且立即调用（创建一个函数会占用不必要的内存）

```javascript
(function() {

  var message = "Hello";

  alert(message); // Hello

})();
```

**这里需要使用圆括号包裹是因为v8遇到function的时候就会把他当成一个函数声明的开始，但是函数声明需要名字，如果加一个名字再立即调用 还是不行，因为js不允许立即调用函数声明**

```javascript
// 下面的括号会导致语法错误
function go() {

}(); // <-- 不能立即调用函数声明
```

所以需要用圆括号表明这是在表达式上下文里面创建的

```javascript
// 创建 IIFE 的方法

(function() {
  alert("Parentheses around the function");
})();

(function() {
  alert("Parentheses around the whole thing");
}());

!!function() {
  alert("Bitwise NOT operator starts the expression");
}();
//这种调用方式是因为！！把函数表达式变成了true 于是整个就成了true() 调用true触发了Boolean构造函数内部的call行为
+function() {
  alert("Unary plus starts the expression");
}();
```



### 1.4.6 全局对象

在浏览器中，**使用var声明的全局函数 变量将会成为全局对象的属性。函数声明也有这样的效果。**



### 1.4.7 函数对象

**name**

函数的名字可以通过name属性来获取,这对函数声明函数表达式都有效,并且当函数以默认值的方式完成赋值的时候 会根据上下文推断函数的命名

```javascript
function f(sayHi = function() {}) {
  alert(sayHi.name); // sayHi（生效了！）
}

f();
```

并且对象中的方法也有名字.

对于new Fuction返回的函数实例，name是anonymous。对于bind返回的函数，name属性值会加上bound前缀。



**length**

获取入参个数 但是rest参数不会计入 



**自定义属性**

我们也可以像给对象添加属性一样,给函数添加自定义属性,但是并不会在函数内部创建一个变量

函数属性有时可以用于代替闭包:

```javascript
function makeCounter() {
  // 不需要这个了
  // let count = 0

  function counter() {
    return counter.count++;
  };

  counter.count = 0;

  return counter;
}

let counter = makeCounter();
alert( counter() ); // 0
alert( counter() ); // 1
counter.count = 10;
alert( counter() ); // 10

//普通闭包写法
function makeCounter() {
  let count = 0;  // 外部变量

  function counter() {
    return count++;
  };

  return counter;
}

let counter = makeCounter();
alert(counter()); // 0
alert(counter()); // 1
```

这两种方式 闭包是把变量定义在外层函数里面,在内层函数里面修改变量,最后把这个内层函数返回出来,所以唯一修改变量的值的方法就是获取内层函数并执行.而函数属性的方法,虽然不能直接修改这个变量,但是可以获取函数属性 修改这个属性.





**命名函数表达式**

```javascript
let sayHi = function func(who) {
  alert(`Hello, ${who}`);
};
```

**我们给它添加了一个名字,这并没有使他变成一个函数声明,因为他任然是作为赋值表达式中的后部分被创建的,函数也是依旧可以通过sayHi来调用.**

**但是添加一个名字,允许函数在内部调用自己,也就是可以写递归函数.并且这个名字在函数外是不可见的.**

```javascript
let sayHi = function func(who) {
  if (who) {
    alert(`Hello, ${who}`);
  } else {
    func("Guest"); // 使用 func 再次调用函数自身
  }
};

sayHi(); // Hello, Guest

// 但这不工作：
func(); // Error, func is not defined（在函数外不可见）
```

但是其实可以直接使用sayHi:

```javascript
let sayHi = function(who) {
  if (who) {
    alert(`Hello, ${who}`);
  } else {
    sayHi("Guest");
  }
};
```

**不过这样可以避免sayHi的值被修改之后报错,就比如我们不想要sayHi作为这个函数,我们把这个函数赋值给另外一个变量,让sayHi=null 这个时候调用函数,就会出错了.**

```javascript
let sayHi = function(who) {
  if (who) {
    alert(`Hello, ${who}`);
  } else {
    sayHi("Guest"); // Error: sayHi is not a function
  }
};

let welcome = sayHi;
sayHi = null;

welcome(); // Error，嵌套调用 sayHi 不再有效！
```

用词法环境解释,其实就是这个函数调用的时候发现要调用sayHi 但是没有,去外面找 找到个null



### 1.4.8 原型与继承

**[[prototype]]**

这是对象的一个隐藏属性,这个属性值要么是null,要么就是对另一个对象的引用,这个对象称为原型:prototype object

当我们读取一个属性,可是对象本身没有这个属性,js会顺着原型链找到原型,检查原型上有没有这个属性.这个叫原型继承.

属性[[prototype]]是内部隐藏属性,但是我们可以间接设置它:

1. \_proto_

   ```javascript
   let animal = {
     eats: true
   };
   let rabbit = {
     jumps: true
   };
   
   rabbit.__proto__ = animal;
   //给rabbit的原型链接上了animal这个对象 于是aniaml变成了rabiit的原型对象
   //顺着[[prototype]]的引用 一级一级向上查找原型对象
   //这里设置原型的设置有两个:原型链不能形成闭环.原型可以是对象 也可以是null 但是设置成其他类型就会被忽略
   ```

   > \_proto_s是[[prototype]]因为历史原因留下来的getter/setter
   >
   > \_proto_和[[prototype]]并不一样,现代变成语言建议我们使用函数:getPrototypeOf,setPrototypeof



proto属于对象 

prototype属于函数  对象上面的proto指向函数上面的prototype



**手动写入方法属性**

如果对象本身和原型上面都有一个属性,那么通过对象调用该属性不会顺着原型链查找



**访问器属性**

```javascript
let user = {
  name: "John",
  surname: "Smith",

  set fullName(value) {
    [this.name, this.surname] = value.split(" ");
  },

  get fullName() {
    return `${this.name} ${this.surname}`;
  }
};

let admin = {
  __proto__: user,
  isAdmin: true
};

alert(admin.fullName); // John Smith (*)

// setter triggers!
admin.fullName = "Alice Cooper"; // (**)

alert(admin.fullName); // Alice Cooper，admin 的内容被修改了
alert(user.fullName);  // John Smith，user 的内容被保护了
```

这里修改了admin的fullname 按道理 user的fullname也会受影响 但是fullname的属性被保护起来了 导致这个的是this指向的问题

这样子完了 就相当于给这个admin对象本身添加这个属性了 

哈哈草泥马的



**由于this不受原型的影响**



## 1.5 交互

**alert**

展示一条信息 等待用户点击ok

**prompt**

接收两个参数：title，default。可以接受用户的输入作为返回值

**confirm**

接收一个参数question，会给用户展示确定取消，可以接收true，false作为返回值。

## 1.6 类型转换

大多数情况下存在自动的类型转换。

**字符串转换**

就比如alert会把接收到的值转换成字符串，但是也可以手动调用String（val）进行转换.

**数字型转换**

在算数函数里会进行自动转换，就比如"9"/"3",也可以通过Number（val）进行显示转换。当然如果是一串文字，或者undefined，那么会转换失败得到NaN。null会转换成0，true/false会转换成0/1.

**布尔型转换**

使用Boolean进行显示转换，当然直接写更多。0，空字符串（包含一个空格 或者一个0就不算空字符串了），null，undefined，NaN会转换成false



## 1.7 运算符和操作符

**一元运算符和二元运算符**

一元二元的概念针对的是运算元（元素符应用的对象）。有几个运算元，就是几元运算符



**数学运算**

其实也就是+，—，*，/，%，**（求幂，就比如2\*\*2就是2的二次方）。

而+还可以用于来凝结字符串，不过只要表达式里面有一个运算元是字符串，另一个也会被转换成字符串。而且这个运算符是按照顺序工作的，依次比较两个运算元，就比如：2+2+'2'的结果是42（字符串）。

二元运算符里面只有+可以支持字符串，其他的二元运算符碰到字符串都会把他转换成数字类型。

但是+也可以是一元运算符，这时他用于类型转换，可以把其他类型转换成number，和Number函数的作用是一样的。





**运算符优先级**

一元运算符高于二元运算符



**赋值运算符**

赋值运算符的优先级非常低，这也是为什么所有的计算执行完了之后才会进行赋值。

在js里面，所有的运算符都会返回一个值，赋值语句返回的就是右边的表达式的值。因为这个特性，使得我们可以进行链式赋值 

解析从右到左 执行从左到右  、



还可以使用+=这样的运算符进行原地修改，这个叫修改并赋值运算符，所有算数和位运算符都有简短的修改并赋值运算符，这类运算符的优先级和赋值运算符相同。



**自增运算符**

在后面就是先用后加，其实本质就是前置运算符，后置运算符的返回值不一样。而且这个运算符的优先级比大部分优先级高。

不过需要注意自增 自减运算符不可以和常数一起使用 比如（a+3）++。





**位运算符**

- 按位与 ( `&` )相同取1
- 按位或 ( `|` )有1取1
- 按位异或 ( `^` )不同取1
- 按位非 ( `~` )
- 左移 ( `<<` )相当于*2
- 右移 ( `>>` )相当于/2
- 无符号右移 ( `>>>` )



**逗号运算符**

这个运算符的作用时运行好几个表达式的结果，但是值返回最后一个表达式的返回值。这个运算符的优先级很低，所以下面的例子里面必须加括号

```javascript
let a = (1 + 2, 3 + 4);//a=7
let a = 1 + 2, 3 + 4;//a=3
```

这个运算符看起来没什么用，但是其实for循环里面就会用到这个运算符

`for(a=1,b=2,c=1;;)` 这里的三个赋值操作都执行了。



**比较运算符**

对于数值的比较就没什么好说的了。

字符串的比较算法非常简单：

1. 首先比较两个字符串的首位字符大小。
2. 如果一方字符较大（或较小），则该字符串大于（或小于）另一个字符串。算法结束。
3. 否则，如果两个字符串的首位字符相等，则继续取出两个字符串各自的后一位字符进行比较。
4. 重复上述步骤进行比较，直到比较完成某字符串的所有字符为止。
5. 如果两个字符串的字符同时用完，那么则判定它们相等，否则未结束（还有未比较的字符）的字符串更大。



对于不同类型之间的比较，js会将其转换成数字再进行比较。



对于==运算符，有一个问题，他认为0和false是相等的，""和false是相等的。这是因为他比较时，会先把两者转换成数字，然后他们都是0，自然就相等了。不过对于nll和undefined这两个在进行相等性检查的时候去，不会产生类型转换，不过js存在一个特殊规则：`null == undefined`这个表达式是true

对于===运算符，就不会有这个问题-因为这个运算符在比较的时候不会进行任何的类型转换，在使用这个运算符的时候，如果两侧的类型不一样，会直接返回false。严格不相等!==也是这样。



```javascript
alert( null > 0 );  // (1) false
alert( null == 0 ); // (2) false 因为这个运算符不对null进行类型转换 
alert( null >= 0 ); // (3) true  因为这个运算符会对null进行类型转换
alert( undefined > 0 ); // false (1)
alert( undefined < 0 ); // false (2) undefined变成NaN 怎么比都是false
alert( undefined == 0 ); // false (3)
```

这提醒我们 在使用>=这些运算符的时候 小心变量为undefined/null的情况



**逻辑运算符**

`||`（或），`&&`（与），`!`（非），`??`（空值合并运算符）

虽然是叫逻辑运算符，除了布尔值之外的其他值也可以用







**||**

除了用在if判断里面的传统用法，还可以用来寻找多个表达式里面的第一个真值

`result = value1 || value2 || value3;`

或运算符 `||` 做了如下的事情：

- 从左到右依次计算操作数。
- 处理每一个操作数时，都将其转化为布尔值。如果结果是 `true`，就**停止计算**，返回这个操作数的初始值。
- 如果所有的操作数都被计算过（也就是，转换结果都是 `false`），则返回最后一个操作数。

```javascript
let firstName = "";
let lastName = "";
let nickName = "SuperCoder";

alert( firstName || lastName || nickName || "Anonymous"); // SuperCoder
```

这个运算符的优先级为3 比赋值高，比很多数学运算符低（+ *） 所以使用需要注意括号



除此之外，还可以用来短路求值

只有左侧为假右侧才会运行

```javascript
true || alert("not printed");
false || alert("printed");
```





**&&**

与运算可以用来寻找第一个假值

但是&&的优先级比||更高



**！**

接收一个参数 可以转换成布尔类型或者返回相反的值

两个非运算也可以把某个值转换成布尔类型

```javascript
alert( !true ); // false
alert( !0 ); // true

alert( !!"non-empty string" ); // true
alert( !!null ); // false
//第一个非运算将该值转化为布尔类型并取反，第二个非运算再次取反。最后我们就得到了一个任意值到布尔值的转化。
//Boolean函数也有一样的效果
```



**？？空值合并运算符**

这个运算符又被称为null判断运算符 这时因为当我们需要给某些变量使用默认值时 会使用||运算符 但是当我们的值是空字符串或者数字0 默认值也会生效 所以产生了这个运算符 用于判断一个值是否为null 或者是undefined

a??b 这个表达式的值，如果a是未定义的，返回b，如果a是已经定义的，返回a

其实只是一种可以省略条件判断的更简便的方法 就比如:`alert(username??匿名)`

这个运算符和||相似。都可以用来寻找第一个真值`alert(user??user2??user3)`。并且这个运算符的优先级和||一样。

1



？？是不能和|| &&一起使用的 除非使用括号明确优先级

```javascript
let x = 1 && 2 ?? 3; // Syntax erro
let x = (1 && 2) ?? 3; // 正常工作了
```

这个运算符很适合跟可选来年运算符一起使用 



**可选链操作符**？.

这个东西可以让我们的代码更加优雅 省略一大坨的判断 就比如：

```java
let user = {}; // user 没有 address 属性

alert( user.address && user.address.street && user.address.street.name ); // undefined（不报错）
```

如果这个操作符前面的值为undefined或者null，他会停止运算并且返回undefined。也就是说，这个操作符使前面的值变成可选的，但是对后面的值就不起作用了。注意 虽然说是可选的，但是前面的变量必须是已经定义的，如果是没有定义的也会触发错误。



这个操作符和与 或一样具有短路效应，当停止运算之后，右侧的部分不会执行。



​	**其他变体**

​	这个操作符还可以用于调用一个可能步不存在的函数：`userAdmin.admin?.();`,在这段代码里面，会获取对象里面的admin属性，如果这个函数存在，就会调用。这个对于表单验证 或者说调用一些部分浏览器没有实现的api很有用：

```javascript
if (myForm.checkValidity?.() === false) {
  // 表单校验失败
  return;
}
```



​	还可以用于从一个可能不存在的对象身上读取属性：`user?.[name]`,还可以和delete操作符一起使用：`delete user?.['name']`。可以使用这个操作符安全的读取删除，但是不能写入，因为当对象不存在那么就相当于：`undefined = 'name'`



**括号的影响**

如果属性链有圆括号 **那么链式运算符对括号外面没有影响**

```
a?.b.c
(a?.b).c
```

第二种写法由于加了一个括号 所以不论前面得到了什么结果都会执行 所以一般来讲 使用这个运算符的场景里面不应该使用圆括号





**~按位运算符**

把数字转换成三十二位整数，把二进制表示形式全部取反，~n=-（n+1）





## 1.8 逻辑与条件



**while do while for**

**break continue** labelName

labelName可以结合break退出嵌套的循环。

```javascript
outer: for (let i = 0; i < 3; i++) {

  for (let j = 0; j < 3; j++) {

    let input = prompt(`Value at coords (${i},${j})`, '');

    // 如果是空字符串或被取消，则中断并跳出这两个循环。
    if (!input) break outer; // (*)

    // 用得到的值做些事……
  }
}

alert('Done!');
```

`reak outer` 向上寻找名为 `outer` 的标签并跳出当前循环。

虽然但是 也只能在循环体内部这样写 因为break只能在循环体内部使用





## 1.9 函数

使用函数声明创建函数 这样创建的函数会被提升到当前作用域的顶层,这是因为**js准备运行脚本的时候，会先在脚本里寻找全局函数声明，并且创建这些函数**，我们可以把这个当成初始化阶段。

```javascript,                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             
function showMessage() {
  alert( 'Hello everyone!' );
}
```



**使用函数表达式创建函数 这样创建函数不存在提升，**使用函数只能在声明之后。**这是因为函数表达式的本质就是赋值表达式，只有当代码运行到那一行，那个变量才会被赋值成那个函数**。

```javascript
let sayHi = function() {
  alert( "Hello" );
};
```







**参数的默认值**

**默认值是惰性求值的**

```javascript
function showMessage(from, text = anotherFunction()) {
  // anotherFunction() 仅在没有给定 text 时执行
  // 其运行结果将成为 text 的值
}
```

使用默认值时就不能有同名参数了：

```javascript
// 不报错
function foo(x, x, y) {
  // ...
}

// 报错
function foo(x, x, y = 1) {
  // ...
}
// SyntaxError: Duplicate parameter name not allowed in this context
```

在函数里面试运行有同名参数的，**但是在函数里使用的值会是传递给最后一个同名参数的值**，其他的值将会被忽略。

解构赋值可以结合默认值使用：

```java
function add({a=1,b=1}={}){
   .....
}
add({a-2})
//要是没有传值 就默认是个对象，传了对象就可以解构赋值
//默认值生效之后 解构赋值依然会进行 
add()//此时a=1 b=1
```

```javascript
// 写法一
function m1({x = 0, y = 0} = {}) {
  return [x, y];
}

// 写法二
function m2({x, y} = { x: 0, y: 0 }) {
  return [x, y];
}

//第一：要是不传递 就会使用默认值空数组 然后解构赋值 这个空对象里面没有对应的属性 于是使用了默认值
//第二：要是不传递  就会使用默认的哪个数组 然后解构赋值把值赋值给对象。
//第一：传递空对象 不使用默认值 进行解构赋值 使用默认值
//第二：传递空对象 进行解构赋值 xy都是undefined
```

**带有默认值的参数只能在最后** 如果写在前面 虽说不会报错 这个参数其实也不能省略，除非显示的输入undefined，将会触发默认值，输入null不会触发，**并且还有一个问题就是，如果写在中间 后面的参数将不会计入函数的length属性，rest参数，可选参数都不会计入这个属性，因为这个属性的意思是期望传入的参数个数**



一旦设置了参数的默认值 函数进行初始化声明的时候，参数 **会形成一个单独的作用域**，在其他函数里面并不存在这种现象：

```javascript
var x = 1;

function f(x, y = x) {
  console.log(y);
}

f(2) // 2
```

x会先接受到2 然后y会得到x的值 因为形成了一个单独的作用域 所以y得到的是2

```javascript
var x = 1;

function foo(x = x) {
  // ...
}

foo() // ReferenceError: Cannot access 'x' before initialization
```

**由于单独形成了作用域 上面的代码相当于let x = x ,**由于暂时性死区，这行代码将会报错。

暂时性死区：

js里面变量的生命周期可以分成：

1. 创建阶段：变量被添加到作用域的此法环境
2. 初始化阶段：被初始化成undefined  可以访问
3. 赋值阶段：被赋值 

对于var创建的变量 21阶段是合并的 被提升到当前作用域的顶部

````javascript
var x = 1;
function foo(x, y = function() { x = 2; }) {
  var x = 3;
  y();
  console.log(x);
}

foo() // 3
x // 1
````

在这个例子里面，函数外部声明了一个变量x，函数参数里面声明了一个变量x，函数内部声明了一个变量x。这三个x是三个独立的变量，在打印x的时候，打印的是那个函数内部声明的变量，而y这个函数改变的是函数参数作用域里面声明的x。

如果函数内部不是var x = 3 而是x=3 ，那么修改的就是参数x，之后y函数再把x修改成2，此时将会打印2.



利用参数默认值 可以指定某一个参数不得省略，如果省略就抛出一个错误。

```javascript
function throwIfMissing() {
  throw new Error('Missing parameter');
}

function foo(mustBeProvided = throwIfMissing()) {
  return mustBeProvided;
}

foo()
// Error: Missing parameter
```



**函数的严格模式**

**可以把某个函数设置成严格模式，但是如果这个函数使用了参数默认值，解构赋值，拓展运算符，就不能把内部设置成严格模式。**

这样规定的原因是函数执行的时候先执行函数参数，但是只有读了函数体才知道该不该用严格模式，但是严格模式又是同时作用于函数参数的。

如果一定需要局部的严格模式，那么可以把函数包在一个无参数的立即执行函数里面。



**函数的返回值**

如果没有返回值 或者返回值为空，那么函数执行的结果会返回undefined。

需要注意 不能在return 返回值之间添加新行，因为JavaScript默认在return之后添加；

```javascript
return
{
	name:,,,,,
}
```



### 1.9.1递归和栈堆



**执行上下文和栈堆**

执行上下文是一个内部数据结构，包含有关函数执行时的详细细节：当前控制流所在的位置，当前的变量，this的值.... 一个函数调用只有一个与其相关联的执行上下文。



**当一个函数执行嵌套调用的时候 会发生什么？**

1. 当前函数被暂停
2. 与这个函数相关的执行上下文会被一个叫做执行上下文栈堆的特殊数据结构保存
3. 执行嵌套的函数
4. 嵌套调用结束之后，从栈堆中恢复之前的执行上下文，从停止的位置开始，继续执行外部函数。

就比如：

```javascript
function pow(x, n) {
  if (n == 1) {
    return x;
  } else {
    return x * pow(x, n - 1);
  }
}

alert( pow(2, 3) ); // 8
```

首先调用pow（2，3），执行上下文会记录：x:2 n:3 at line1，这个上下文进入堆栈然后调用了pow（2，2），于是上下文变成相应的，也进入堆栈，并且在顶部。当这个调用完成，他的上下文从堆栈里面弹出，执行上下文变成之前的。

在这个函数里，递归深度为3，由于上下文会占用内存 所以空间复杂度是N。可以看出来递归深度等于栈堆里面上下文的最大数量。





**递归解构**

递归数据结构是一种部分复制自身的数据解构。

就好比：部门之下有员工和部门

而链表，就是一种递归结构。



**链表**

如果要存储一个有序的对象集合，一般会想要用数组，但是数组删除，插入的代价很大。

为了实现快速删除和插入，我们引入了链表。

链表元素：具有value next属性的对象 还可以添加prev属性 使得链表可以向前移动 等等





**尾调用优化**

尾调用指的是 函数的最后一步是调用另一个函数。

```javascript
function f(x){

....
  return g(x);
}
```

而下面的几种情况都不属于尾调用：

```javascript
// 情况一
function f(x){
  let y = g(x);
  return y;
}

// 情况二
function f(x){
  return g(x) + 1;
}

// 情况三
function f(x){
  g(x);
}
```

第一种情况 调用之后进行了赋值操作，第二种情况调用之后还有其他操作，第三种情况等同于最后进行了return undefined。尾调用只要是在最后一步操作就可以了，而不一定是写在函数最后的位置。



由于这个特殊的调用位置，是所以进行了尾调用优化。函数调用的时候会形成调用记录 也就是一个调用帧 保存调用相关信息。

但是由于尾调用是函数的最后一部操作， **所以不需要保留外层的调用帧** 不过只有safari支持这个。

只有在严格模式下才会开启尾调用优化，正常模式下是无效的 这是因为在正常模式下函数内部有两个变量用于跟踪函数的调用栈，在尾调用优化发生的时候，函数的调用栈会改写，上面两个变量就会失真。而严格模式禁用这两个变量.



我们可以通过蹦床函数 手动实现尾递归优化：

```javascript
function trampoline(f) {
  while (f && f instanceof Function) {
    f = f();
  }
  return f;
}
function sum(x, y) {
  if (y > 0) {
    return sum.bind(null, x + 1, y - 1);
  } else {
    return x;
  }
}
trampoline(sum(1, 100000))
// 100001
```

蹦床函数可以将递归执行转换成循环执行，大概逻辑就是执行传入的函数 如果返回值还是一个函数 那么久重复 

而这里返回函数时使用bind 是因为需要创建一个新的函数 防止潜在的闭包或者变量引用问题

```javascript
function trampoline(f) {
  while (f && f instanceof Function) {
    f = f();
  }
  return f;
}

function factorial(n) {
  function next() {
    if (n === 0) {
      return 1;
    } else {
      return function() { 
        return n * factorial(n - 1); 
      };
    }
  }
  return next;
}

// 使用蹦床函数执行
const result = trampoline(factorial(5));  // 可能得到错误的结果或抛出异常
console.log(result); // 期望输出：120
```

这个bind 实在是看不懂 之后再说吧











**尾递归**

函数调用自己 称为递归，如果尾调用自己，就称为尾递归。

递归由于保存大量调用帧，所以容易发生栈溢出，对于尾递归就不会 它永远只有一个调用帧。

使用这个特性，对函数进行优化，就比如计算某个数的阶乘：

```javascript
function factorial(n) {
  if (n === 1) return 1;
  return n * factorial(n - 1);
}

factorial(5) // 120
```

可以将这个函数改写成尾递归：

```javascript
function factorial(n, total) {
  if (n === 1) return total;
  return factorial(n - 1, n * total);
}

factorial(5, 1) // 120
```



尾递归的实现，需要改写递归函数，确保最后只调用自身。我们需要把所有用到的变量改写成函数的参数：

我们可以在尾递归函数之外，再提供一个正常形式的函数

```javascript
function tailFactorial(n, total) {
  if (n === 1) return total;
  return tailFactorial(n - 1, n * total);
}

function factorial(n) {
  return tailFactorial(n, 1);
}

factorial(5) // 120
```

通过函数柯里化实现：

```javascript
// 定义一个 currying 高阶函数，它接受一个函数 fn 和一个参数 n
function currying(fn, n) {
  // 返回一个新的函数，这个函数接受参数 m
  return function (m) {
    // 使用 call 方法调用传入的函数 fn，传入参数 m 和 n，以及当前的 this 上下文
    return fn.call(this, m, n);
  };
}

// 定义一个递归函数 tailFactorial，用于计算阶乘
function tailFactorial(n, total) {
  // 如果 n 等于 1，返回 total，因为 1 的阶乘是 1
  if (n === 1) return total;
  // 否则，递归调用 tailFactorial，将 n 减 1，并将 total 与当前的 n 相乘
  return tailFactorial(n - 1, n * total);
}

// 使用 currying 函数创建一个柯里化的 factorial 函数，预设 total 参数为 1
const factorial = currying(tailFactorial, 1);

// 当调用 factorial(5) 时，它会计算 5 的阶乘
factorial(5) // 输出 120
```

高阶函数：接受一个或者多个函数作为参数的哈桑农户 或者返回值是另一个函数的参数

柯里化（Currying）：柯里化是一种技术 把多参数的函数转换成一系列使用以两个参数的函数 这样可以部分应用函数参数，创建一个新的函数，这个新函数等待剩余的参数。

```javascript
function add(a, b, c) {
  return a + b + c;
}

function curryAdd(a) {
  return function(b) {
    return function(c) {
      return a + b + c;
    };
  };
}

const addFive = curryAdd(5);
const addTen = addFive(3); // 现在 addTen 是一个函数，等待第三个参数
console.log(addTen(2)); // 输出：10
```

柯里化允许固定一些参数值 返回一个新的函数 这个新的函数可以接受剩余的参数。

当然也可以直接使用函数参数的默认值。









### 1.9.2 Rest参数和Spread语法

在js里面，无论参数是怎么定义的，调用函数的时候都可以传入任意数量的参数，并不会因为传入多余参数而报错，只是被会忽略。可以使用rest参数:`...args`收集参数，但是rest参数只能在最后



**arguments变量**

**这是一个特殊的类数组对象，可迭代,可以在函数里被访问，这个对象会存储所有传递的参数，即使函数没有接收**，这是一个在rest参数还没有发明的时候被使用的古老方法。

**不过有一点需要注意：箭头函数没有arguements**，在箭头函数内部访问这个参数会访问到箭头函数外层的普通函数的参数。



**Spread语法**

这个语法可以用来展开数组，我们可以用来传递参数，或是合并数组，或是浅拷贝：

```javascript
alert( Math.max(1, ...arr1, 2, ...arr2, 25) );
let merged = [0, ...arr, 2, ...arr2];
//使用拓展运算符来浅拷贝 在这之前使用的是concat方法 拼接一个空数组

// 写法一
const a2 = [...a1];
// 写法二
const [...a2] = a1;
```



拓展运算符后面也可以是一个表达式：`...(x > 0 ? ['a'] : [])`

在没有拓展运算符的时候 如果要把数组作为函数的参数进行传递 可以使用apply方法：`Math.max.apply(null, [14, 3, 77])`









事实上 这个语法可以用于任何可迭代对象，就比如字符串。

```javascript
let str = "Hello";

alert( [...str] ); // H,e,l,l,o
//这个语法和Array.from 用处有一些相似，不过Array.from还适用于类数组对象
```

这是因为这个语法和for of一样：内部使用迭代器来收集元素。

所以也当然展开语法会得到和for of一样的结果啦

另外，虽然普通对象并不是可迭代的，但是也可以使用展开语法。

另外 虽然rest参数和展开语法看起来都是... 但并不是一样的东西



### 1.9.3 变量作用域 闭包

**代码块**

在代码块里面声明的变量 在代码块之外是不可见的。我们可以利用这个特性，在代码块里面隔离一段代码，这个代码块有自己需要执行的任务。不过在使用for循环时 哪个let i= 0 虽然看起来在代码块外面，但是这个变量i是属于代码块的。



**嵌套函数**

嵌套函数指的是在另一个函数里面创建的函数。嵌套函数可以访问外部的变量（向外找呗，这个蛮正常的，毕竟有就近原则），并且在这个嵌套函数里面可以返回一个嵌套函数，之后可以在其他地方调用，不管在哪里调用，这个嵌套函数都可以访问相同的外部变量。



**词法环境Lexical Environment**

在js里面，每个运行的函数，代码块，整个脚本，都有一个被称为词法环境的内部的隐藏对象。词法环境对象由两部分组成：

1. 环境记录Environment Record ——一个存储所有局部变量作为其属性（当然还有其他信息比如this的指向）的对象。
2. 对外部词法环境的引用 与外部代码相关联。

所以一个变量只是环境记录这个特殊的内部对象的一个属性，获取和修改变量其实就是获取修改这个对象里面的一个属性

当脚本开始运行 词法环境预先填充了所有声明的变量，不过这些变量会处于未初始化状态，这是一种特殊的内部状态，这意味着js执行引擎知道这个变量 但是在使用let声明之前 不能引用这个变量。在我们看来，这个变量和不存在没有区别。  然后就遇到了赋值语句：`let a = 19` 从这时开始，变量的定义和值就出现了。



至于函数声明，其实函数也是一个值，和变量一样，不一样的是 **函数声明的初始化会立即完成**  当创建了一个词法环境 函数声明会立即变成即用型函数 而不是像变量一样在运行初始化之后才能使用。



在一个函数运行时，在调用刚开始的时候，会自动创建一个新的词法环境来存储这个调用的局部变量和参数，这个内部词法环境引用了外部的词法环境，当代码需要访问一个变量，首先在内部词法环境里面寻找，如果找不到再去外部词法环境里面寻找，一层一层往外找，这就是为什么在代码里面 函数可以访问函数外部的变量，外部不能访问内部声明的变量——内部词法环境引用外部 外部不会引用内部。



举例：

```javascript
function makeCounter() {
  let count = 0;

  return function() {
    return count++;
  };
}

let counter = makeCounter();
```

在每次makeCounter（）调用的开始，都会创建一个新的词法环境，来存储本次调用执行时的变量，在这个例子里面 就有了两层词法环境——全局词法环境，函数的词法环境

但是在执行这个函数调用的时候我们有创建了一个函数，我们还没有执行这个函数，仅仅是创建了，它也有了一个自己的词法环境，这个词法环境的outer是makeCounter的词法环境。在他的词法环境里，会记住它是在这个环境里面创建的，并且保存对这个环境引用，这个点很重要

js里面的每个函数都可以通过词法环境记住创建他们的位置，所以在js里面，所有函数都是天然的闭包。



通常函数调用结束之后会把词法环境和里面所有的变量从内存里删除，因为这个词法环境现在不可达了。

现在让我们结合垃圾收集机制，梳理一遍上面代码的流程

在全局词法环境里面保存了一个变量counter 函数makeCounter。然后就创建了属于makeCounter的词法环境

我们在给counter赋值的时候发现，他是把makeCounter这个函数的执行结果赋值给了counter，于是makeCounter开始执行，并且执行的结果是返回一个函数，这个函数具有对makeCounter词法环境的引用，于是counter也获得了这个引用。

如果之后调用counter 那么又会为这个调用创建一个新的词法环境并且这个新的词法环境的外部环境是从counter[[environment]]获取的。

在counter里面的代码查找count变量的时候，它首先在自己的词法环境里面寻找count变量，发现找不到，又去makeCounter的词法环境里面找，并且在哪里找到就在哪里改

其实还是不太懂嘻嘻 那要是一个嵌套三层的函数 他的外部环境是最外面那层的还是中间那层的，还是一层一层引用上去？

总之 由于有个变量保存了这个函数的词法环境，这个函数的词法环境没有被销毁

但是如果这个变量成了null 那这个环境就会真的销毁了



> 实际开发中的优化
>
> 根据我们之前讲到的，理论上一个函数可达的时候，我们可以在函数里面访问所有外部的变量。
>
> 但是实际运行里面，v8会进行优化，分析变量的使用情况——删除没有使用的外部变量 这将导致这样的变量在调试过程里面不可用
>
> ```javascript
> function f() {
>   let value = Math.random();
> 
>   function g() {
>     debugger; // 在 Console 中：输入 alert(value); No such variable!
>   }
> 
>   return g;
> }
> 
> let g = f();
> g();
> 
> let value = "Surprise!";
> 
> function f() {
>   let value = "the closest value";
> 
>   function g() {
>     debugger; // 在 console 中：输入 alert(value); Surprise!
>   }
> 
>   return g;
> }
> 
> let g = f();
> g();//这里为什么？
> ```
>
> 





### 1.9.4 new Function

就比如:

```javascript
let sum = new Function('a', 'b', 'return a + b');

alert( sum(1, 2) ); // 3
```

与我们已知的其他方法相比，这种方法最大的不同在于，它实际上是通过运行时通过参数传递过来的字符串创建的。

以前的所有声明方法都需要我们 —— 程序员，在脚本中编写函数的代码。

但是 `new Function` 允许我们将任意字符串变为函数。例如，我们可以从服务器接收一个新的函数并执行它：



**我们之前说到了每一个函数都有[[envionment]]指向自己的词法环境,但是如果使用这种方式创建函数,他的[[environment]]会指向全局环境.**



这个看起来有一点奇怪 但是其实是很常用的.

**在程序发布到生产环境之前需要压缩程序,会把变量名修改了,如果new Function可以访问自身函数以外的变量 他可能找不到 因为已经重命名了.所以在使用这种方式创建的函数时不能想要他能自动捕获 访问外部的变量 必须传递进去.**





### 1.9.5 调度:setTimeout setInterval

```javascript
let timerId = setTimeout(func|code, [delay], [arg1], [arg2], ...)
                         
//这个参数就是函数参数
function sayHi(phrase, who) {
  alert( phrase + ', ' + who );
}

setTimeout(sayHi, 1000, "Hello", "John");
//取消调度
clearTimeout(timerId);
```

因为历史原因 第一个参数传递字符串也可以的 js会为其创建一个函数

setInterval也是这样 不过取消调度是clearInterval



**嵌套的setTimeout**

周期性调度除了使用setTnterval 还可以使用嵌套的setTimeout

```javascript
/** instead of:
let timerId = setInterval(() => alert('tick'), 2000);
*/

let timerId = setTimeout(function tick() {
  alert('tick');
  timerId = setTimeout(tick, 2000); // (*)
}, 2000);
```

但是这种调度方式比setInterval更加灵活,这种方式可以根据当前的执行结果来调度下一次调用.比如实现一个服务,每五秒向服务器进行推送,如果服务器过载了就延长等待时间:

```javascript
let delay = 5000;

let timerId = setTimeout(function request() {
  ...发送请求...

  if (request failed due to server overload) {
    // 下一次执行的间隔是当前的 2 倍
    delay *= 2;
  }

  timerId = setTimeout(request, delay);

}, delay);
```

有一个小细节 **setTimeout相较于setInterval能够更精确的设置两次执行之间的延时** (注意 这里的延时是指这次执行结束到下次执行开始 也就是说 延时时间不包括执行时间)

所以如果设置一个延时100毫秒的setInterval 这个100毫秒其实是延时时间和执行时间的和为100毫秒 .如果出现一种情况:函数的执行时间超过100毫秒,那么v8会等待函数执行完成,然后检查调度程序,如果时间到了 将会立即执行函数,在极端情况之下,如果函数每次执行时间都超过delay设置的时间 那么每次调用之间将会完全没有停顿.出现这些的原因是内部计时是从函数开始执行计时的

而setTimeout就不是这样了,setTimeout的时间计算是不带着函数执行时间的,保证了延时时间的固定,这是因为下一次调用是在前一次调用完成时再调度的.

> 垃圾回收
>
> 如果我们创建了一个函数,并把这个函数传入setTimeout/setInterval,那么会在内部为这个函数创建一个引用,并且保存在调度程序里,即使这个函数没有其他的引用,垃圾回收器也不会回收他,只有当调度执行结束 或者被清除,这个函数才会被清理,另外由于闭包这个东西对于一些不需要的变量会占用很多内存,所以要及时取消函数.

> 延时为0的定时器
>
> 在浏览器环境下,嵌套定时器的运行频率是有限制的.HTML5标准规定经过5重嵌套定时器之后,时间间隔被强制设定为4ms,对于服务端则没有限制.
>
> ```javascript
> let start = Date.now();
> let times = [];
> 
> setTimeout(function run() {
>   times.push(Date.now() - start); // 保存前一个调用的延时
> 
>   if (start + 100 < Date.now()) alert(times); // 100 毫秒之后，显示延时信息
>   else setTimeout(run); // 否则重新调度
> });
> 
> // 输出示例：
> // 1,1,1,1,9,15,20,24,30,35,40,45,50,55,59,64,70,75,80,85,90,95,100
> ```
>
> 可以看出来前四次执行都是零延时,后面就经历至少四毫秒的延时,setInterval也有类似情况



### 1.9.6 装饰器模式和转发 call/apply



装饰器:接受另一个函数并且修改这个函数的行为,我们可以为任何一个函数调用装饰器,在这个装饰器里面可以缓存某些函数执行的结果,比如重cpu型函数.

```javascript
function slow(x) {
  // 这里可能会有重负载的 CPU 密集型工作
  alert(`Called with ${x}`);
  return x;
}

function cachingDecorator(func) {
  let cache = new Map();

  return function(x) {
    if (cache.has(x)) {    // 如果缓存中有对应的结果
      return cache.get(x); // 从缓存中读取结果
    }

    let result = func(x);  // 否则就调用 func

    cache.set(x, result);  // 然后将结果缓存（记住）下来
    return result;
  };
}

slow = cachingDecorator(slow);

alert( slow(1) ); // slow(1) 被缓存下来了，并返回结果
alert( "Again: " + slow(1) ); // 返回缓存中的 slow(1) 的结果

alert( slow(2) ); // slow(2) 被缓存下来了，并返回结果
alert( "Again: " + slow(2) ); // 返回缓存中的 slow(2) 的结果
```

在这个装饰器函数里面,也用到了闭包的执行原理:当我们调用slow(1)的时候,会进入外层函数的词法环境寻找func,而x则是传递的参数.



**当执行的函数是对象里面的方法**

以上例子,我们使用函数声明创建了一个函数并且进行包装,但是如果我们需要对对象里面的方法进行包装,而且这个方法还调用了this,这时就会产生this丢失的问题

```javascript
/ 我们将对 worker.slow 的结果进行缓存
let worker = {
  someMethod() {
    return 1;
  },

  slow(x) {
    // 可怕的 CPU 过载任务
    alert("Called with " + x);
    return x * this.someMethod(); // (*)
  }
};

// 和之前例子中的代码相同
function cachingDecorator(func) {
  let cache = new Map();
    //这里的外层函数this指向undefined
  return function(x) {
    if (cache.has(x)) {
      return cache.get(x);
    }
    let result = func(x); // (**)
    cache.set(x, result);
    return result;
  };
}

alert( worker.slow(1) ); // 原始方法有效

worker.slow = cachingDecorator(worker.slow); // 现在对其进行缓存

alert( worker.slow(2) ); // 蛤！Error: Cannot read property 'someMethod' of undefined
```

**函数里面的this指向不取决于函数定义的方式,而是取决于函数调用的方式**

在这里把对象里面的方法用包装器进行包装,虽然这个包装器并非定义在对象里面,但是由于之后我们是通过对象调用这个函数所以这个函数里面的this指向了对象.而对象的方法是通过一个参数传递进去的 而非通过对象调用,所以这个函数内部this指向undefined.

我们可以call/apply 修改this指向,但是更简单的:使用箭头函数







但是如果函数的参数不止一个呢?

传递数组/对象?这样肯定不行,他们比较的是地址.而map又不能允许有两个键

1. 实现一个类似map但是允许多个键的数据结构
2. 使用嵌套的map:cache.get(max).get(min)
3. 把两个或者多个参数合并:我们为装饰器提供一个哈希函数,这个函数知道该怎么办

```javascript
let worker = {
  slow(min, max) {
    alert(`Called with ${min},${max}`);
    return min + max;
  }
};

function cachingDecorator(func, hash) {
  let cache = new Map();
  return function() {
    let key = hash(arguments); // (*)
    if (cache.has(key)) {
      return cache.get(key);
    }

    let result = func.call(this, ...arguments); // (**)

    cache.set(key, result);
    return result;
  };
}

function hash(args) {
  return args[0] + ',' + args[1];
}

worker.slow = cachingDecorator(worker.slow, hash);

alert( worker.slow(3, 5) ); // works
alert( "Again " + worker.slow(3, 5) ); // same (cached)
```

这个哈希函数应该怎样安排,怎么安排才能兼容?

上面的函数里面我们使用了arguments来获取所有这个参数,并且想把他们拼成一个字符串,但是他毕竟不是一个数组 无法使用join方法,(其实传递参数的时候传递数组就很好解决了),这里我们可以使用"方法借用"

```javascript
function hash() {
  alert( [].join.call(arguments) ); // 1,2
}

hash(1, 2);
```

这个方法可行是因为join方法的内部使用了可迭代这个特性





### 1.9.7 函数绑定

```javascript
let user = {
  firstName: "John",
  sayHi() {
    alert(`Hello, ${this.firstName}!`);
  }
};

setTimeout(user.sayHi, 1000); // Hello, undefined!
```

这里为什么会出现undefined?明明这里的函数就是通过对象调用的,为什么还会出现this丢失的问题? 其实这里的写法等效于:

```javascript
let f = user.sayHi;
setTimeout(f, 1000); // 丢失了 user 上下文
```

这是因为在浏览器环境里面给setTimeout的函数调用设置了this=window(在node里面会变成定时器对象)

1. 使用包装器

   在外层包装一次函数 这样外层函数的this指向undefined 内层由于是通过对象调用的 this指向对象

   ```javascript
   setTimeout(function() {
     user.sayHi(); // Hello, John!
   }, 1000);
   
   setTimeout(() => user.sayHi(), 1000); // Hello, John!
   ```

   但是这种方法由于是通过对象调用,在对象调用之前如果方法被修改了就可能有问题

2. bind

   ```javascript
   let user = {
     firstName: "John",
     sayHi() {
       alert(`Hello, ${this.firstName}!`);
     }
   };
   
   let sayHi = user.sayHi.bind(user); // (*)
   
   // 可以在没有对象（译注：与对象分离）的情况下运行它
   sayHi(); // Hello, John!
   
   setTimeout(sayHi, 1000); // Hello, John!
   
   // 即使 user 的值在不到 1 秒内发生了改变
   // sayHi 还是会使用预先绑定（pre-bound）的值，该值是对旧的 user 对象的引用
   user = {
     sayHi() { alert("Another user in setTimeout!"); }
   };
   ```

   这个方法相当于把函数传递给另外一个变量并且指定上下文.在传递之后修改方法也不会影响变量.



**部分(应用)函数(partial functions)**

bind的完整语法还可以绑定参数:`let` bound `=` `func.bind(context, [arg1], [arg2], ...);`

```javascript
function mul(a, b) {
  return a * b;
}

let double = mul.bind(null, 2);
```

使用这种方法我们可以创建可读性更高的函数.

我们也可以自己写一个函数实现不绑定上下文 只绑定参数

```javascript
//该外层函数接收函数和固定参数
function partial(func,...argu){
    //内层函数接收每次调用传递的参数
    return function (...arg){
        return func.call(this,...argu,..args)
    }
}

let user = {
    name:'1',
    say(num,tear){
        alert(this.name+num+tear)
    }
}

let saysome = partial(user.say,1)
```



### 1.9.8 箭头函数

为什么存在箭头函数,不仅仅是写起来还很方便,更因为是js有很多地方修奥我们再创建一个函数进行操作,但是这个函数又不能脱离当前的环境

```javascript
let group = {
  title: "Our Group",
  students: ["John", "Pete", "Alice"],

  showList() {
    this.students.forEach(function(student) {
      // Error: Cannot read property 'title' of undefined
      alert(this.title + ': ' + student);
    });
  }
};

group.showList();
```

这里的showList方法里面，this是指向group对象的，但是 **传递给foreach的回调函数的this并不会自动指向对象**,

但是箭头函数也有不适合的场景 比如上面的showList函数 如果使用了箭头函数，那么箭头函数不具有自己的this 向外找，由于对象不形成单独的作用域，那么this就指向了错误的对象。

另外在需要动态this的时候，也不能使用箭头函数 ：

```javascript
var button = document.getElementById('press');
button.addEventListener('click', () => {
  this.classList.toggle('on');
});
```

记得是 **普通函数** 才是谁调用，this就指向谁，对于箭头函数 不存在这种说法。



并且这个没有环境的特性在定时器里也很有用:

```javascript
function defer(f, ms) {
  return function() {
    setTimeout(() => f.apply(this, arguments), ms);
  };
}

function sayHi(who) {
  alert('Hello, ' + who);
}
//传递组要延迟的函数 延迟的时间 由于箭头函数没有自己的this 所以当定时器的回调函数是一个箭头函数的时候 
let sayHiDeferred = defer(sayHi, 2000);
sayHiDeferred("John"); // 2 秒后显示：Hello, John

//不用箭头函数的写法:提前获得this和参数
function defer(f, ms) {
  return function(...args) {
    let ctx = this;
    setTimeout(function() {
      return f.apply(ctx, args);
    }, ms);
  };
}
```



另外，箭头函数在返回函数的时候，由于大括号会被解释成代码块，所以在外层需要包一层括号。







# 代码质量

## 1.1 在浏览器里调试

快捷键F12

**资源面板**

在资源面板 可以看到文件导航区域，代码编辑区域，代码调试区域

​	**代码调试区域**

1. 监视：点击+输入一个表达式，调试器会显示这个表达式的值，并且在执行过程里重新计算这个表达式的值
2. 调用栈：显示嵌套的调用链
3. 作用域：显示当前的变量，local显示当前函数中的变量,global显示全局变量

​	**跟踪执行**：在右侧面板上方的按键

1. 恢复执行 快捷键F8
2. 下一步：运行下一条（就是当前高亮的那行）快捷键F9
3. 跨步：运行下一条（即当前行）指令，但是不会进入函数（不是内建的函数 而是自己写的函数） 也就是说 这个命令跳过函数内部 如果我们不想观察函数内部执行，可以用这个。
4. 步入：忽略异步行为，就比如定时器，使用步入会进入代码并等待，下一步不会等待 快捷键F11
5. 步出：继续执行到当前函数的末尾 快捷键shift+F11
6. 启用 禁用所有的断点
7. 启用 禁用出现错误时暂停执行脚本
8. 在代码的某一行上右键 会出现一个执行到此处 这个在相向前面执行代码但是又不想设置断点的时候可以用。
9. 



**控制台**

快捷键ESC 试了一下会弹出来 可以输入命令按enter执行，执行之后结果会显示在下面的。



**断点**

在刚刚的资源面板上点击代码左边的行号 行号变蓝就是设置了断点。可以在右侧的断点栏里看到设置的断点。断点是调试器会自动暂停js执行的地方

设置断点之后，程序会在断点位置停下，这是在代码调试区域的监视里可以

它允许我们：

- 快速跳转至代码中的断点（通过点击右侧面板中的对应的断点）。
- 通过取消选中断点来临时禁用对应的断点。
- 通过右键单击并选择移除来删除一个断点。



**debugger**

在代码里插入debugger 可以暂停代码

这个命令只有打开开发者工具才有用，否则浏览器会忽略。





###### js延迟脚本加载·的·方式有哪些

1. defer async 这两种模式表示的是js文件里面没有操作dom 浏览器不必等待加载。 defer模式的执行时机是`DOMContentLoaded` 事件触发之前执行。 async则是在脚本下载完成之后 立即执行 不保证顺序
2. 动态创建script标签 这样创建之后立即加载脚本 并且也可以控制这个标签的defer async属性
3. 使用import函数 异步导入
4. insersection Observer 通过观察元素的位置控制执行时机

###### 异步编程有哪些实现方式 

早期通过回调函数实现：给一个异步加载的函数传递一个回调函数 接受失败时产生的错误 成功时得到的数据  这种方式在异步请求之间存在依赖关系的时候将会产生回调地狱

之后为了解决这个回调地狱的问题 引入promise—链式调用 使用.then .catch 并且提供all race这样的方法 

async await则是promise yield的语法糖：await后的代码将会被包装成一个promise async函数的返回值也是一个promise ：如果async函数的返回值不是promise 那么async函数的返回值是完成状态的 value为返回值的promise

如果返回值是一个promise 则返回一个新的promise



###### promise的状态吸收

指的是：一个promise的结果得到的是另一个promisew 他就会进行状态吸收

状态吸收分成两个步骤：准备 吸收 这两个任务也是微任务

当调用栈运行到要进行状态吸收的promise 就会把准备任务放进队列 当这个准备1任务被取出来执行的时候 吸收这个任务就会进入任务队列



await之后的代码 是同步执行的 

await语句之后的代码 将会被包装成异步任务 如果await之后 函数就结束了 那么这个函数完成 作为一个微任务进入队列 箭头函数默认严格模式

获取dom的几何信息会导致回流 但是浏览器会缓存dom的几何信息

打包工具不能再浏览器运行的本质是浏览器文件权限不够2





- 如果 `async` 函数正常完成并返回一个值，返回的 Promise 将以该值为参数被 resolve。
- 如果 `async` 函数抛出异常，返回的 Promise 将以该异常为参数被 reject。

由于返回的是 Promise，因此可以在其他 `async` 函数中使用 `await` 关键字等待其完成。

1  7 6  4 6 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               

cb

6 3 async2 万层

```
async function a (){
	log（1）
	await b()
	log(2
}

async function b
```



此法环境就是栈 使用词法环境的outerfield实现了调用栈



pnpm

怎么理解promise

对esm的理解

对函数式编程的理解

vue2 vue3

###### ts 配置文件

- **`compilerOptions`**：核心配置项，控制 TypeScript 编译器的行为。
  - **`target`**：指定 ECMAScript 版本（如 `ES5`、`ES2015`、`ES2020`、`ESNext`）。
  - **`module`**：指定模块系统（如 `commonjs`、`esnext`、`umd`）。
  - **`lib`**：指定要包含的库文件（如 `dom`、`esnext`、`dom.iterable`）。
  - **`outDir`**：指定编译输出目录。
  - **`rootDir`**：指定输入文件的根目录，用于控制输出目录结构
- **`include`**：指定需要编译的文件或目录，支持 glob 模式（如 `src/**/*.ts`）。
- **`exclude`**：指定需要排除的文件或目录，默认排除 `node_modules`、`bower_components`、`jspm_packages` 和 `outDir` 目录。
- **`files`**：指定需要编译的单个文件路径，适用于小型项目。
- **`references`**：用于配置项目引用，实现大型项目的增量编译。
- **`strict`**：启用所有严格类型检查选项（默认 `true`），包括 `noImplicitAny`、`strictNullChecks` 等。
- **`noImplicitAny`**：禁止隐式 `any` 类型。
- **`strictNullChecks`**：启用严格的 `null` 和 `undefined` 检查。
- **`noImplicitThis`**：禁止隐式的 `this` 类型为 `any`。

数组定义两种方式



browerlist 相当于antofixer core。js

###### 打包工具

- 

###### 工厂模式 

传入不同的参数 实例化不同的对象 一般用switch

###### 抽象工厂模式 

```javascript
class Animal {
  constructor() {
    // 检查是否直接实例化抽象类
    if (new.target === Animal) {
      throw new Error('Animal 是抽象类，不能直接实例化');
    }
    
    this.type = 'animal';
  }
  
  // 抽象方法
  makeSound() {
    throw new Error('子类必须实现 makeSound 方法');
  }
}

// 子类
class Dog extends Animal {
  constructor(name) {
    super(); // 调用父类构造函数
    this.name = name;
  }
  
  // 实现抽象方法
  makeSound() {
    return '汪汪汪';
  }
}
```

箭头函数没有自己的 `this`、`arguments`、`super` 或 `new.target`，它继承自外层函数的这些值。因此，在箭头函数中使用 `new.target` 会引用外层函数的 `new.target`。







###### 单例模式

只会创建一个实例 只会创建内存里面保存的实例

   

###### 代理模式

通过访问代理对象来访问源对象



###### 装饰器模式 

不破坏类原有的结构 通过一个新的类拓展功能





###### 适配器模式

###### 迭代器模式

手写promise

lock

###### BFC IFC GFC FFC

BFC 是一个独立的渲染区域，规定了内部的块级元素如何布局，并且与外部元素相互隔离。BFC 内部的元素不会影响外部元素，反之亦然

- 根元素（`<html>`）
- 浮动元素（`float: left/right`，不为 `none`）
- 绝对定位元素（`position: absolute/fixed`）
- 行内块元素（`display: inline-block`）
- 表格单元格（`display: table-cell`）
- Flex 项目（父元素 `display: flex/inline-flex` 的子元素）
- Grid 项目（父元素 `display: grid/inline-grid` 的子元素）
- 弹性元素（`display: flex/inline-flex`）
- 网格容器（`display: grid/inline-grid`）
- 多列容器（`column-count` 或 `column-width` 不为 `auto`）
- `overflow` 不为 `visible` 的元素

IFC 是一个独立的渲染区域，规定了内部的内联元素（如 `<span>`、`<a>`、`<img>` 等）如何布局。IFC 内的元素会在水平方向上一个接一个排列，直到容器的边界，然后换行。

GFC 是 CSS Grid Layout 引入的概念，当元素设置 `display: grid` 或 `display: inline-grid` 时，会创建 GFC。GFC 内部的元素（网格项）会按照网格系统布局，支持精确控制行、列和位置。

FFC 是 CSS Flexbox 引入的概念，当元素设置 `display: flex` 或 `display: inline-flex` 时，会创建 FFC。FFC 内部的元素（弹性项）会按照弹性盒模型布局，支持一维布局（水平或垂直）。

#### `display: flex` 或 `display: inline-flex`

#### `flex-direction``flex-wrap``flex-flow``justify-content``align-items``align-content`



forEach forof foron

declare

declare gloabal

代码分割

1. import
2. lazy
3. 







###### async await

- `async` 函数返回一个 **Promise** 对象。
- `await` 用于暂停异步函数的执行，等待 Promise 解决（resolved）或拒绝（rejected）。
- 本质上，`async/await` 是 **Generator（生成器）** 和 **自动执行器** 的语法糖。

```javascript
// 自动执行器：接收 Generator 函数，返回 Promise
function run(gen) {
  // 返回一个 Promise，作为 async 函数的返回值
  return new Promise((resolve, reject) => {
    // 获取 Generator 实例
    const g = gen();

    // 递归执行 next 方法
    function step(key, arg) {
      let result;
      try {
        // 执行 g[key](arg)，即 g.next(arg) 或 g.throw(arg)
        result = g[key](arg);
      } catch (error) {
        // Generator 内部抛出错误，Promise 拒绝
        return reject(error);
      }

      // 获取 Generator 的结果 { value, done }
      const { value, done } = result;

      if (done) {
        // 生成器执行完毕，Promise 解决
        return resolve(value);
      } else {
        // value 是一个 Promise（await 后面的表达式）
        // 等待 Promise 解决后，递归调用 step
        Promise.resolve(value).then(
          val => step('next', val), // 解决：调用 g.next(val)
          err => step('throw', err) // 拒绝：调用 g.throw(err)
        );
      }
    }

    // 启动执行
    step('next');
  });
}

// 模拟 async 函数
function myAsync(genFn) {
  // 返回一个函数，类似 async 函数的定义
  return function() {
    // 调用 run 函数，传入 Generator 实例
    return run(genFn.apply(this, arguments));
  };
}

// 模拟 await 操作符
// 实际上，await 在 Generator 中表现为 yield 一个 Promise


// 异步操作：模拟网络请求
function fetchData(url) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (url === 'success') {
        resolve('Data from server');
      } else {
        reject(new Error('Request failed'));
      }
    }, 1000);
  });
}

// 使用 myAsync 定义异步函数（替代 async）
const getData = myAsync(function* (url) {
  try {
    // 模拟 await（使用 yield 暂停，等待 Promise 解决）
    const data = yield fetchData(url);
    return data;
  } catch (error) {
    // 捕获 Promise 拒绝
    return `Error: ${error.message}`;
  }
});

// 测试
getData('success').then(result => console.log('Success:', result));
// 输出: Success: Data from server

getData('fail').then(result => console.log('Fail:', result));
// 输出: Fail: Error: Request failed
```

###### promiseA+规范怎么定义一个promise

1. promise是一个状态机 有独特的状态转换规则
2. 必须提供then方法  参数为两个回调函数 返回一个promise
3. 成功回调函数在promise变成完成的时候异步调用 如果回调函数抛出异常 返回的promise变成拒绝状态
4. 返回promise的value跟随处理函数

变量没有声明的话 默认为var

all

race

###### 手写promise.all

promise.all接受一个 **可迭代对象** 返回一个新的promise 只要有一个promise失败 返回的promise **失败** 并且接受的promise **并行执行**

```java
function myPromiseAll(promises) {
  // 返回一个新 Promise
  return new Promise((resolve, reject) => {
    // 参数校验：确保 promises 是可迭代对象（如数组）
    if (!promises || typeof promises[Symbol.iterator] !== 'function') {
      return reject(new TypeError('Argument must be an iterable'));
    }

    // 将可迭代对象转换为数组
    const promiseArray = Array.from(promises);
    // 结果数组，长度与输入数组一致
    const results = new Array(promiseArray.length);
    // 记录已完成的 Promise 数量
    let completedCount = 0;

    // 如果输入数组为空，直接 resolve 空数组
    if (promiseArray.length === 0) {
      return resolve(results);
    }

    // 遍历所有 Promise
    promiseArray.forEach((promise, index) => {
      // 处理非 Promise 值：用 Promise.resolve 包装
      Promise.resolve(promise)
        .then((value) => {
          // 将成功值按原顺序存入结果数组
          results[index] = value;
          // 已完成数量加 1
          completedCount++;
          // 若所有 Promise 都已成功，resolve 结果数组
          if (completedCount === promiseArray.length) {
            resolve(results);
          }
        })
        .catch((reason) => {
          // 只要有一个 Promise 失败，立即 reject
          reject(reason);
        });
    });
  });
}

```

- **只能在 `async` 函数内部使用**：`async` 函数会隐式返回一个 Promise，`await` 在这个 Promise 环境中才能正常工作。
- **顶层 await（Top-Level Await）除外**：ES2022 允许在模块（Module）顶层直接使用 `await`，但仅限于 `type="module"` 的脚本



###### 变量

在非严格模式下直接给没有声明的变量赋值会隐式在全局对象上面创建一个属性：

```javascript
// 示例：非严格模式下未声明变量直接赋值
function example() {
  x = 10; // ❌ 未声明变量 x，直接赋值
}

example();
console.log(x); // 输出: 10（x 成为全局变量）
```

严格模式则会抛出错误

并且这个变量可以使用delete删除 使用var创建的变量虽然也是在window上面的属性 但是是不可配置的 不能删除 





###### es6的语法有哪些常用的

1. let const
2. 箭头函数
3. 模板字符串
4. 解构赋值
5. 类
6. 模块系统
7. promise
8. 拓展运算符
9. 迭代器 生成器 
10. 默认值
11. symbol
12. proxy
13. Reflect
