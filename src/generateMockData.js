const {parse} = require("@babel/parser");
const babelTraverse = require("@babel/traverse");

function generateStaticMockData(code, options) {
    let result = [];
    const ast = parse(code, {
        sourceType: "module",
        plugins: ["typescript"],
    });
    babelTraverse.default(ast, {
        // 针对 interface 定义
        TSInterfaceDeclaration(path) {
            const node = path.node;
            result.push(`
    export const ${`static${node.id.name}` || "unknown"} = {
        ${node.body.body.map(item => {
            // 50% 的概率为 true，50% 的概率为 false
            const visible = Math.random() < 0.5;
            return !options.closeOptional && item.optional && visible ? undefined : `${item.key.name}: ${randomGenerator(item.typeAnnotation.typeAnnotation, options)}`
        }).filter(_=>_).join(`,
        `)}
    }`)
        },
        // 针对 type 定义
        TSTypeAliasDeclaration(path) {
            const node = path.node;
            result.push(`
    export const ${`static${node.id.name}` || "unknown"} = ${randomGenerator(node.typeAnnotation, options)}`)
        }
    });
    return result.join(``)
}

module.exports = {
    generateStaticMockData
};


function randomGenerator(node, options) {
    switch (node.type) {
        // 联合类型
        case "TSUnionType":
            const randomValue = Math.floor(Math.random() * node.types.length); // 生成随机整数 0 ~ node.types.length-1
            return randomGenerator(node.types[randomValue], options);
        // 字符串类型
        case "TSStringKeyword":
            const length = Math.floor(Math.random() * 6) + 1; // 生成随机整数 1 ~ 6
            return `"${generateRandomString(length)}"`;
        // 数字类型
        case "TSNumberKeyword":
            return Math.floor(Math.random() * 100); // 随机生成 0 ~ 99 的整数
        // 布尔类型
        case "TSBooleanKeyword":
            return Math.random() < 0.5;
        // 数组类型
        case "TSTupleType":
            return `[${node.elementTypes.map(item => !options.closeOptional && item.optional && Math.random() < 0.5 ? null : randomGenerator(item, options)).join(", ")}]`;
        // 对象类型
        case "TSTypeLiteral": 
            return `{${node.members.map(item => !options.closeOptional && item.optional && Math.random() < 0.5 ? null : randomGenerator(item, options)).filter(_=>_).join(", ")}}`;
        // 泛型
        case "TSTypeReference":
            // 只支持 Array<T> 的形式，且 T 为基本类型
            if(node.typeName.name === "Array" && node.typeParameters.params.length > 0) {
                const length = Math.floor(Math.random() * 6) + 1;
                return `[${Array(length).fill(1).map(_ => node.typeParameters.params.map(item => !options.closeOptional && item.optional && Math.random() < 0.5 ? null : randomGenerator(item, options)).filter(_=>_).join(", ")).join(", ")}]`;
            }
        // 对象属性
        case "TSPropertySignature":
            return `${node.key.name}: ${randomGenerator(node.typeAnnotation.typeAnnotation, options)}`;
        default:
            return "undefined";
    }
}

// 生成随机字符串
function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomString += characters.charAt(randomIndex);
    }
    return randomString;
}
