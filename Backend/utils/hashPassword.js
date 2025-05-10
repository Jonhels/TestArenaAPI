const bcrypt = require("bcrypt");

const hashPassword = (password) => bcrypt.hash(password, 12);
const comparePassword = (password, hashed) => bcrypt.compare(password, hashed);

module.exports = { hashPassword, comparePassword };
