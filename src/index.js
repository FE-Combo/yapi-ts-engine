const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const axios = require("axios");
const Agent = require("https").Agent;
const childProcess = require("child_process");
const { match } = require("path-to-regexp");
const { generateStaticMockData } = require("./generateMockData.js");
const { stringFirstUpperCase, stringFirstLowerCase } = require("./utils.js");

function format(prettierPath) {
  const prettierConfigPath = path.join(process.cwd(), "/prettier.config.js");
  if (prettierPath && fs.pathExistsSync(prettierConfigPath)) {
    spawn("prettier", ["--config", prettierConfigPath, "--write", prettierPath]);
  }
}

function spawn(command, params) {
  const isWindows = process.platform === "win32";
  const result = childProcess.spawnSync(isWindows ? command + ".cmd" : command, params, {
    stdio: "inherit",
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`non-zero exit code returned, code=${result.status}, command=${command} ${params.join(" ")}`);
    process.exit(1);
  }
}

const apiPattern = (api, options) => {
  const { excludePatterns = [], includePatterns = [] } = options;
  const includeRegexp = includePatterns.length > 0 ? match(includePatterns, { decode: decodeURIComponent })(api) : true;
  const excludeRegexp = excludePatterns.length > 0 ? !match(excludePatterns, { decode: decodeURIComponent })(api) : true;

  return includeRegexp && excludeRegexp;
};

const recursiveJSON = (json, lines, layer) => {
  if (json.type === "object") {
    lines.push(`${new Array(layer).fill(" ").join("")}{`);
    Object.entries(json.properties || {}).forEach(([key, properties]) => {
      const required = json?.required?.includes(key);
      if (properties.type === "object") {
        lines.push(`${new Array(layer).fill(" ").join("")}${key}${required ? "" : "?"}:`);
        recursiveJSON(properties, lines, layer + 1);
      } else if (properties.type === "array") {
        lines.push(`${new Array(layer).fill(" ").join("")}${key}${required ? "" : "?"}:`);
        recursiveJSON(properties, lines, layer + 1);
      } else if (properties.type === "integer") {
        lines.push(`${new Array(layer).fill(" ").join("")}${key}${required ? "" : "?"}: number`);
      } else {
        lines.push(`${new Array(layer).fill(" ").join("")}${key}${required ? "" : "?"}: ${(Object.prototype.toString.call(properties.type)==='[object Array]' ? properties.type.join(" | ") : properties.type) || "string"}`);
      }
    });
    lines.push(`${new Array(layer).fill(" ").join("")}}`);
  } else if (json.type === "array") {
    lines.push(`${new Array(layer).fill(" ").join("")}Array<`);
    recursiveJSON(json.items, lines, layer + 1);
    lines.push(`${new Array(layer).fill(" ").join("")}>`);
  } else if (json.type === "integer") {
    lines.push(`${new Array(layer).fill(" ").join("")}number`);
  } else {
    lines.push(`${new Array(layer).fill(" ").join("")}${json.type || "string"}`);
  }
};

function getStaticMockFilePath(servicePath, options) {
  let staticMockFilePath;
  if(options?.path) {
    staticMockFilePath = path.join(process.cwd(), optionspath, optionsfilename ? `${optionsfilename}.ts` : "static.mock.ts");
  } else {
    staticMockFilePath = path.join(servicePath, options.filename ? `${options.filename}.ts` : "static.mock.ts");
  }
  return staticMockFilePath
}

async function getContent(url) {
  const response = await axios.get(url, {
    headers: {
      Cookie: fs.readFileSync(path.join(process.cwd(), ".cookie"), { encoding: "utf-8" }),
    },
    httpsAgent: new Agent({ rejectUnauthorized: false }),
  });
  return response.data;
}

function generateTypeContent(apiJSON, generatePath, options) {
  const { additionalPageHeader = "", hiddenTypes = [] } = options;
  const lines = [];
  lines.push(additionalPageHeader);
  lines.push(``);
  Object.entries(apiJSON).forEach(([key, api]) => {
    const path = `${options.basepath || ""}${api.path}` 
    if (apiPattern(path, options)) {
      lines.push(`// ${api.method}: ${path}`);
      if (api.req_params?.length > 0 && !hiddenTypes.includes("path")) {
        lines.push(`export interface ${key}$Path {`);
        api.req_params.forEach((_) => {
          lines.push(`  ${_.name}: string | number`);
        });
        lines.push(`}`);
      }

      if (api.req_query?.length > 0 && !hiddenTypes.includes("query")) {
        lines.push(`export interface ${key}$Query {`);
        api.req_query.forEach((_) => {
          lines.push(`  ${_.name}${Number(_?.required || 0) ? "" : "?"}: string | number`);
        });
        lines.push(`}`);
      }
      const body = api.req_body_other ? JSON.parse(api.req_body_other) : {};
      if (Object.keys(body).length > 0 && !hiddenTypes.includes("body")) {
        if (body.type === "object") {
          lines.push(`export interface ${key}$Body`);
          recursiveJSON(body, lines, 1);
        } else if (body.type === "array") {
          lines.push(`export type ${key}$Body =`);
          recursiveJSON(body, lines, 1);
        } else if (body.type === "integer") {
          lines.push(`export type ${key}$Body = number`);
        } else {
          lines.push(`export type ${key}$Body = ${body.type}`);
        }
      }

      if (api.req_headers?.length > 0 && !hiddenTypes.includes("headers")) {
        lines.push(`export interface ${key}$Headers {`);
        api.req_headers.forEach((_) => {
          lines.push(`  "${_.name}"${Number(_?.required || 0) ? "" : "?"}: ${_.value ? `"${_.value}"` : "string | number"}`);
        });
        lines.push(`}`);
      }

      const response = api.res_body ? JSON.parse(api.res_body) : {};
      if (Object.keys(response).length > 0 && !hiddenTypes.includes("response")) {
        if (response.type === "object") {
          lines.push(`export interface ${key}$Response`);
          recursiveJSON(response, lines, 1);
        } else if (response.type === "array") {
          lines.push(`export type ${key}$Response =`);
          recursiveJSON(response, lines, 1);
        } else if (response.type === "integer") {
          lines.push(`export type ${key}$Response = number`);
        } else {
          lines.push(`export type ${key}$Response = ${response.type}`);
        }
      }
      lines.push(``);
    }
  });

  const targetPath = path.join(generatePath, `type.ts`);
  fs.ensureFileSync(targetPath);
  fs.writeFileSync(targetPath, lines.join("\n"));
  console.info(chalk`{white.green Write:} ${targetPath}`);
}

function generateApiContent(apiJSON, generatePath, options) {
  const { requestImportExpression, additionalPageHeader = "", responseType, ajaxName = "ajax", hiddenTypes = [], hiddenBodyInGET = false, mock } = options;
  const lines = [];
  lines.push(additionalPageHeader);
  lines.push(requestImportExpression);
  lines.push(`import * as Type from "./type";`);
  if(mock) {
    const staticMockFilePath = getStaticMockFilePath(generatePath, mock);
    lines.push(`import * as StaticMockServices from "${path.relative(generatePath, staticMockFilePath).startsWith("../")? path.relative(generatePath, staticMockFilePath).replace(/\.ts$/, "") : "./"+path.relative(generatePath, staticMockFilePath).replace(/\.ts$/, "")}"`);
  }
  lines.push(``);
  lines.push(`class Services {`);
  Object.entries(apiJSON).forEach(([key, api]) => {
    const nextPath = `${options.basepath || ""}${api.path}` 
    if (apiPattern(nextPath, options)) {
      const path = api?.req_params?.length > 0 && !hiddenTypes.includes("path") ? `path: Type.${key}$Path` : null;
      const query = api?.req_query?.length > 0 && !hiddenTypes.includes("query") ? `query: Type.${key}$Query` : null;
      const headers = api?.req_headers?.length > 0 && !hiddenTypes.includes("headers") ? `headers: Type.${key}$Headers` : null;
      const body = api?.req_body_other && !hiddenTypes.includes("body") && !(hiddenBodyInGET && api.method.toLowerCase() === "get") ? `body: Type.${key}$Body` : null;
      const response = `${api.res_body && !hiddenTypes.includes("response") ? `Type.${key}$Response` : "void"}`;
      const nextResponseType = `${typeof responseType === "function" ? responseType(response) : response}`;
      lines.push(`  public static ${stringFirstLowerCase(key)}(${[path, query, body, headers].filter((_) => _).join(",")}): Promise<${nextResponseType}> {`);
      lines.push(`    return ${ajaxName}("${api.method}","${nextPath}", ${path ? "path" : "null"}, ${query ? "query" : "null"}, ${body ? "body" : "null"}, ${headers ? "headers" : "null"}, null)`);
      lines.push(`  }`);
    }
  });

  lines.push(`}`);
  if(mock) {
    lines.push(`
const ServicesProxy = new Proxy(Services, {
  get: function(target, prop, receiver) {
    if (prop === 'prototype') {
      return Services.prototype;
    }
    // eslint-disable-next-line
    // @ts-ignore
    if(ENV.STATIC_MOCK) {
      return function(...args) {
        console.info("%cMockRequest: " + prop.toString(), 'color: green; font-weight: bold;');
        console.info('%cMockData:', 'color: blue; font-weight: bold;', {data: StaticMockServices?.[prop], options: args});
        return ${mock?.responseBodyTemplate?.replace(/{value}/g, "StaticMockServices?.[prop]") || "StaticMockServices?.[prop]"};
      }
    } else {
      return Reflect.get(target, prop, receiver);
    }
  }
});

export default ServicesProxy; 
    `);
  } else {
    lines.push(`export default Services;`);
  }

  const indexPath = path.join(generatePath, `index.ts`);
  fs.ensureFileSync(indexPath);
  fs.writeFileSync(indexPath, lines.join("\n"));
  console.info(chalk`{white.green Write:} ${indexPath}`);
}

function generateMockData(generatePath, mockOptions) {
  if(mockOptions) {
    const source = path.join(generatePath, `type.ts`);
    const targetPath = getStaticMockFilePath(generatePath, mockOptions);
    const typeContent = fs.readFileSync(source, { encoding: "utf-8" })
    const staticMockData = generateStaticMockData(typeContent, mockOptions);
    fs.ensureFileSync(targetPath);
    fs.writeFileSync(targetPath, staticMockData);
    console.info(chalk`{white.green Write:} ${targetPath}`);
  }
}

async function generate(options) {
  try {
    const { serverUrl, servicePath, requestImportExpression, apiRename, projectId } = options;

    if (!serverUrl) {
      throw new Error("Missing [serverUrl]");
    }
    if (!servicePath) {
      throw new Error("Missing [servicePath]");
    }
    if (!requestImportExpression) {
      throw new Error("Missing [requestImportExpression]");
    }
    if (!projectId) {
      throw new Error("Missing [projectId]");
    }
    const generatePath = path.join(process.cwd(), servicePath);
    console.info(chalk`{white.green Clear directory:} ${generatePath}`);
    fs.emptyDirSync(generatePath);

    let apiJSON = options.customData || {};
    
    if (!options.customData) {
      let content = null;
      for (let page = 1; page <= (content?.data?.total || 10); page++) {
        const response = await getContent(`${serverUrl}/api/interface/list?page=${page}&limit=20&project_id=${projectId}`);
        if(!response?.data?.list) {
          throw new Error(response?.errmsg || "1. 请检测 cookie 信息是否已过期; 2. 请检测是否有该项目权限");
        }
        if(!content) {
          content = response;
        } else {
          if(content)
          content.data.list = content.data.list.concat(response.data.list)
        }
      }
      
      for (item of content.data.list) {
        const response = await getContent(`${serverUrl}/api/interface/get?id=${item._id}`);
        if (!response.errcode) {
          const data = response.data;
          const path = `${options.basepath || ""}${data.path}` 
          const apiName = `${stringFirstUpperCase(data.method.toLowerCase())}${(typeof apiRename === "function" ? apiRename(path) : path)
            .split(/\-|\/|\_/)
            .map((_) => stringFirstUpperCase(_))
            .join("")
            .replace(/(\{)|(\}\{)|(\:)/g, "With")
            .replace(/\}$/g, "")
            .replace(/\}/g, "In")}`;
          apiJSON[apiName] = data;
        }
      }
    }

    generateTypeContent(apiJSON, generatePath, options);

    generateApiContent(apiJSON, generatePath, options);

    generateMockData(generatePath, options.mock);

    format(generatePath + "/*");

    console.info(
      chalk`{white.bold 😍 Generated Successfully (total: ${Object.keys(apiJSON).length}，generate: ${
        Object.values(apiJSON)
          .map((_) => (apiPattern(`${options.basepath || ""}${_.path}`, options) ? _.path : null))
          .filter((_) => _).length
      })}`
    );
  } catch (e) {
    console.error(chalk`{red.bold ❌ ${e.message}}`);
    console.error(e.stack);
    process.exit(1);
  }
}

module.exports = generate;
