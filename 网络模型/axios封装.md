# axios封装

为什么做封装？

1. 统一配置：超时时间 baseURL 
2. 拦截器：统一身份认证 参数处理 错误处理
3. 简化代码
4. 拓展：自定义配置覆盖全局配置
5. ts支持

基本代码：创建一个axios实例并且封装请求方法：

axios请求拦截器和响应拦截器的参数都是两个函数 第一个是成功情况的回调 第二格是失败情况的回调

请求拦截失败函数在请求没有成功发出的时候触发 比如配置不合法 网络断开 

响应拦截的失败函数在返回的状态码不是以2开头的时候触发

```javascript
// src/utils/request.ts
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

// 定义响应数据结构（根据后端约定调整）
interface ResponseData<T = any> {
  code: number;
  message: string;
  data: T;
}

class Request {
  private instance: AxiosInstance;

  constructor(config: AxiosRequestConfig) {
    this.instance = axios.create(config);

    // 请求拦截器
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // 统一添加 token
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse<ResponseData>) => {
        // 统一处理响应数据
        const { code, message, data } = response.data;
        if (code === 200) {
          return data; // 直接返回业务数据
        } else {
          return Promise.reject(new Error(message || '请求失败'));
        }
      },
      (error) => {
        // 统一处理 HTTP 错误（如 401、404、500 等）
        if (error.response?.status === 401) {
          window.location.href = '/login'; // 跳转登录
        }
        return Promise.reject(error);
      }
    );
  }

  // 封装基础请求方法
  public request<T>(config: AxiosRequestConfig): Promise<T> {
    return this.instance.request(config);
  }

  // 封装 GET
  public get<T>(url: string, params?: object, config?: AxiosRequestConfig): Promise<T> {
    return this.request({ url, params, method: 'GET', ...config });
  }

  // 封装 POST
  public post<T>(url: string, data?: object, config?: AxiosRequestConfig): Promise<T> {
    return this.request({ url, data, method: 'POST', ...config });
  }

  // 其他方法（PUT、DELETE等）类似...
}

// 创建实例并配置全局参数
const request = new Request({
  baseURL: import.meta.env.VITE_API_BASE_URL, // 从环境变量读取
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export default request;
```

上面的基础代码实现了基础配置 但是可以进一步处理 比如取消重复请求，

```javascript
// 在 Request 类中添加
private pendingRequests = new Map<string, AbortController>();

private generateRequestKey(config: AxiosRequestConfig): string {
  return `${config.url}-${JSON.stringify(config.params)}-${config.method}`;
}

constructor(config: AxiosRequestConfig) {
  // ...原有代码

  // 请求拦截器：添加取消逻辑
  this.instance.interceptors.request.use((config) => {
    const key = this.generateRequestKey(config);
    if (this.pendingRequests.has(key)) {
      this.pendingRequests.get(key)?.abort(); // 取消重复请求
    }
    const controller = new AbortController();
    config.signal = controller.signal;
    this.pendingRequests.set(key, controller);
    return config;
  });

  // 响应拦截器：移除记录
  this.instance.interceptors.response.use((response) => {
    const key = this.generateRequestKey(response.config);
    this.pendingRequests.delete(key);
    return response;
  }, (error) => {
    const key = this.generateRequestKey(error.config);
    this.pendingRequests.delete(key);
    return Promise.reject(error);
  });
}
```

文件上传

```javascript
// 单独封装 upload 方法
public upload<T>(url: string, file: File, data?: object): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  return this.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
```

大请求缓存

```javascript
// 在 Request 类中添加缓存逻辑
private cache = new Map<string, Promise<any>>();

public getWithCache<T>(url: string, params?: object, config?: AxiosRequestConfig): Promise<T> {
  const key = `${url}-${JSON.stringify(params)}`;
  if (this.cache.has(key)) {
    return this.cache.get(key)!;
  }
  const promise = this.get<T>(url, params, config).finally(() => {
    this.cache.delete(key); // 请求完成后清除缓存
  });
  this.cache.set(key, promise);
  return promise;
}
```





基础请求流程里面 需要分成三块进行处理 请求拦截 发起请求 响应拦截

分成针对某些接口的处理 和面向所有接口的处理

- 请求拦截
  - 请求调整
  - 用户标识
- 响应拦截
  - 网络错误处理
  - 授权错误处理
  - 普通错误处理
  - 代码异常处理



### 针对get的处理

我希望用api.getinfo这样的方式调用接口 并且返回值是一个数组 可以通过解构赋值得到结果

那么需要对axios的get方法进行封装，无论请求成功与否 结果需要封装成一个数组

并且如果这歌接口比较特别的话 需要一个函数来处理返回值

```javascript
type Fn = (data: FcResponse<any>) => unknown

interface IAnyObj {
  [index: string]: unknown
}

interface FcResponse<T> {
  errno: string
  errmsg: string
  data: T
}

const get = <T,>(url: string, params: IAnyObj = {}, clearFn?: Fn): Promise<[any, FcResponse<T> | undefined]> =>
  new Promise((resolve) => {
    axios
      .get(url, { params })
      .then((result) => {
        let res: FcResponse<T>
        if (clearFn !== undefined) {
          res = clearFn(result.data) as unknown as FcResponse<T>
        } else {
          res = result.data as FcResponse<T>
        }
        resolve([null, res as FcResponse<T>])
      })
      .catch((err) => {
        resolve([err, undefined])
      })
  })

```

另外在请求拦截里面 需要进行请求调整 加上某些配置 配置用户标识 将这两个操作封装成函数 并且在请求拦截器里面进行调用

```javascript
const handleRequestHeader = (config) => {
    config['xxxx'] = 'xxx'
    return config
}

const handleAuth = (config) => {
    config.header['token'] = localStorage.getItem('token') || token || ''
    return config
}

axios.interceptors.request.use((config) => {
    config = handleChangeRequestHeader(config)
    config = handleConfigureAuth(config)
    return config
})
```

 响应拦截器主要用于处理错误 错误可以大概分成网络错误 授权错误 普通错误




