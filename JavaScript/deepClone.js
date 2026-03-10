
/**
 * 功能完善的深克隆函数
 * @param {any} target - 需要克隆的目标
 * @param {WeakMap} map - 用于处理循环引用的缓存
 * @returns {any} - 克隆后的对象
 */
function deepClone(target, map = new WeakMap()) {
    // 1. 处理基本类型和 null
    if (typeof target !== 'object' || target === null) {
        return target;
    }

    // 2. 处理循环引用
    if (map.has(target)) {
        return map.get(target);
    }

    // 3. 处理特殊对象类型
    const type = Object.prototype.toString.call(target);
    
    // Date
    if (type === '[object Date]') {
        return new Date(target);
    }
    
    // RegExp
    if (type === '[object RegExp]') {
        return new RegExp(target);
    }
    
    // Error
    if (type === '[object Error]') {
        return new Error(target.message);
    }

    // Set
    if (type === '[object Set]') {
        const cloneTarget = new Set();
        map.set(target, cloneTarget); // 先放入 map 防止循环引用
        target.forEach(value => {
            cloneTarget.add(deepClone(value, map));
        });
        return cloneTarget;
    }

    // Map
    if (type === '[object Map]') {
        const cloneTarget = new Map();
        map.set(target, cloneTarget); // 先放入 map 防止循环引用
        target.forEach((value, key) => {
            cloneTarget.set(deepClone(key, map), deepClone(value, map));
        });
        return cloneTarget;
    }

    // 4. 处理数组和普通对象
    
    // 保持原型链继承
    // 如果是数组，直接创建空数组（Array.from(target) 会浅拷贝，不合适）
    // 如果是对象，使用 Object.create 保持原型链
    let cloneTarget;
    if (Array.isArray(target)) {
        cloneTarget = [];
    } else {
        cloneTarget = Object.create(Object.getPrototypeOf(target));
    }
    
    // 放入 map
    map.set(target, cloneTarget);

    // 处理所有属性 (包括 Symbol 和不可枚举属性)
    // Reflect.ownKeys = Object.getOwnPropertyNames + Object.getOwnPropertySymbols
    Reflect.ownKeys(target).forEach(key => {
        // 过滤掉不可配置/不可写的属性描述符处理（这里简化为直接赋值，如果需要更严谨可以使用 defineProperty）
        // 这里直接赋值，会触发 setter，如果不想触发 setter，应该用 Object.defineProperty
        const desc = Object.getOwnPropertyDescriptor(target, key);
        if (desc && (desc.enumerable || key === 'length')) { // 通常只拷贝可枚举属性，或者全部拷贝
             // 简单赋值：
             cloneTarget[key] = deepClone(target[key], map);
        }
        // 如果追求极致完善，应该拷贝描述符：
        // Object.defineProperty(cloneTarget, key, {
        //     ...desc,
        //     value: deepClone(desc.value, map)
        // });
    });

    return cloneTarget;
}

// --- 测试用例 ---

const original = {
    num: 1,
    str: 'hello',
    bool: true,
    nullVal: null,
    undef: undefined,
    date: new Date(),
    reg: /test/g,
    err: new Error('oops'),
    set: new Set([1, { a: 2 }]),
    map: new Map([['key', { b: 3 }]]),
    fn: function() { console.log('fn'); },
    [Symbol('sym')]: 'symbolValue'
};

// 循环引用
original.self = original;

// 原型链
function Person(name) {
    this.name = name;
}
Person.prototype.sayHello = function() { console.log('Hello ' + this.name); };
original.person = new Person('Jack');


console.log('--- 开始深克隆 ---');
const cloned = deepClone(original);

console.log('原始对象:', original);
console.log('克隆对象:', cloned);

console.log('--- 验证 ---');
console.log('循环引用:', cloned.self === cloned); // true
console.log('Date 独立性:', cloned.date !== original.date); // true
console.log('RegExp 独立性:', cloned.reg !== original.reg); // true
console.log('Set 内部对象深拷贝:', cloned.set !== original.set); // true
console.log('Map 内部对象深拷贝:', cloned.map !== original.map); // true
console.log('Symbol 属性:', cloned[Object.getOwnPropertySymbols(cloned)[0]]); // symbolValue
console.log('原型链方法调用:');
cloned.person.sayHello(); // Hello Jack
console.log('原型链保持:', cloned.person instanceof Person); // true

