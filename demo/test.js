const generate = require("../src/index");
const json = require("./index.json");

generate({
  customData: json,
  serverUrl: "https://test.com",
  projectId: "666",
  servicePath: "/output",
  shouldGenerateStaticMockData: true,
  closeOptional: true,
  requestImportExpression: "import ajax from 'utils/ajax';\nimport BaseResult from 'utils/type';",
  hiddenBodyInGET: true,
  apiRename: (name) => {
    return name.replace(/^\/v1.\w\/(demo)/, '').replace(/^\/v(\w)\.\w\/(demo)/, '/v$1')
  },
  responseType: (type) => {
    return `BaseResult<${type}>`;
  },
  // includePatterns: ["/v1.0/nuwa/admin/api-group-auths"],
  // excludePatterns: ["/v1.0/nuwa/admin/api-group-auths(.*)"],
  ajaxName: "ajax",
  hiddenTypes: ["headers"],
  additionalPageHeader: `
/* eslint-disable @typescript-eslint/array-type */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/consistent-type-imports */
`,
});
