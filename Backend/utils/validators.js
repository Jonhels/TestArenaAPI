const validator = require("validator");

// Passord-validering
const validateStrongPassword = (password) => {
  return validator.isStrongPassword(password, {
    minLength: 6,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  });
};

// E-postvalidering
const validateEmail = (email) => {
  return validator.isEmail(email);
};

// Dato-validering
const isValidDate = (value) => {
  return !isNaN(new Date(value).getTime());
};

// Sjekk at navn ikke er for langt
const isValidName = (name, maxLength = 50) => {
  return (
    typeof name === "string" &&
    name.trim().length > 0 &&
    name.length <= maxLength
  );
};

// Sjekk at telefonnummeret er gyldig
const validatePhone = (phone) => {
  return typeof phone === "string" && /^[+\d\s()-]{5,20}$/.test(phone);
};

module.exports = {
  validateStrongPassword,
  validateEmail,
  isValidDate,
  isValidName,
  validatePhone,
};
