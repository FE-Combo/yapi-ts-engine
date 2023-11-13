# [YAPI-TS-ENGINE]() &middot;

## 动机

根据 yapi 自动导出 api 与 type
yapi 适用于文档先行开发团队

## 约定

- 云端接口命名需要遵循 RESTful 风格
- 接口命名除英文字符外只能使用`/`、`-`
- 生成的所有 Service 都是通过 ajax 调用
- ajax 参数对应顺序: method, api, path, query, body, header, formData
- 未命名类型的默认为`string`
- `integer`转换成`number`
- 服务方法名的生成规则是`Method➕Url`，url 中存在 path 变量自动在变量前后新增`with`、`in`关键字
- 若需要鉴权将 cookie 存储于根目录`.cookie`文件下

## 缺陷

- yapi 中不存在泛型
- 所有方法放在一个目录中
- 服务方法是前端根据 url 生成，可能存在不准确

## API

- serverUrl: swagger json 地址
- servicePath: 生成 service 与 type 的文件路径
- requestImportExpression: ajax 导入模板
- additionalPageHeader?: 页面头部信息，通常用于 disable eslint
- apiRename?: 服务方法重命名，修改后将影响服务方法名
- responseType?: 返回类型包装
- basepath?: 接口统一前缀，对应 yapi 中的接口基本路径
- ajaxName?: ajax 命名，默认为`ajax`
- hiddenTypes?: 隐藏类型, 默认为空数组. `path`、`query`、`body`、`headers`、`formData`、`response`
- hiddenBodyInGET?: boolean 是否隐藏 body 在 get 方法中
- customData?: 本地导入 json 解析
- includePatterns?: string[], 指定包含接口，[规则参考](https://github.com/pillarjs/path-to-regexp)，若配置了 basepath，请加上 basepath
- excludePatterns?: string[], 过滤指定接口，[规则参考](https://github.com/pillarjs/path-to-regexp)，若配置了 basepath，请加上 basepath
- mock?: object, 是否生成mock数据
  - closeOptional?: boolean, 是否关闭可选类型
  - filename?: string, mock文件名
  - path?: string, mock文件路径
  - responseBodyTemplate?: string, mock返回值模板, {value}代表 mock 数据
## 使用

```bash
$ yarn add yapi-ts-engine --dev
```

- 新建文件 api.js

```
const generate = require("yapi-ts-engine")

generate({
    serverUrl:"https://xxx",
    servicePath:"/output/api",
    requestImportExpression: "import { request } from '@/utils/fetch';"
});
```

- package.json 新增 script: node api.js

## prettier

- 根目录下若存在`prettier.config.js`文件会自动执行

## axios 案例

```
import axios, { AxiosRequestConfig, Method } from 'axios';

function createFormData<F>(forData: F): FormData | null {
  if (!forData) {
    return null;
  }
  const data = new FormData();
  Object.entries(forData).forEach(([name, value]) => {
    data.append(name, value);
  });
  return data;
}


function pathReplace<P>(url: string, path: P): string {
  if (!path) {
    return url;
  }
  let nextApi = url;
  Object.entries(path).forEach(([name, value]) => {
    const encodedValue = encodeURIComponent(value.toString());
    nextApi = nextApi.replace(`{${name}}`, encodedValue);
  });
  return nextApi;
}

export default async function ajax<P,Q,B,H,F,R>(method: Method, url: string, path:P, query:Q, body:B, headers:H, formData: F): Promise<R> {
  const response = await (await axios({
    method,
    url:`/api${pathReplace(url, path)}`,
    params: query,
    data: body || createFormData(formData),
    headers
  })).data;
  return response;
}

```

# TODO

- 支持 formData
- 嵌套层级
- 支持单个接口升级
