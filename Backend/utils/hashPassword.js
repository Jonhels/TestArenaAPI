const bcrypt = require("bcrypt");

const hashPassword = async (password) => {
    try {
        const hash = await bcrypt.hash(password, 12);
        return hash;
    } catch (err) {
        throw err;
    }
};

const comparePassword = async (password, hashed) => {
    try {
        return await bcrypt.compare(password, hashed);
    } catch (err) {
        throw err;
    }
};

module.exports = {
    hashPassword,
    comparePassword
};