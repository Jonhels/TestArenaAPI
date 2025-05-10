const Inquiry = require("../models/inquirySchema");
const CreateError = require("./createError");

const findInquiry = async (id) => {
  const inquiry = await Inquiry.findById(id);
  if (!inquiry) throw new CreateError("Inquiry not found", 404);
  return inquiry;
};

module.exports = findInquiry;
