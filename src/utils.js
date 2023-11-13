const stringFirstUpperCase = (str) => {
    return str.replace(/^(\{)?[a-z]/g, (L) => L.toUpperCase());
};

const stringFirstLowerCase = (str) => {
    return str.replace(/^[A-Z]/g, (L) => L.toLowerCase());
};

module.exports = {
    stringFirstUpperCase,
    stringFirstLowerCase
}