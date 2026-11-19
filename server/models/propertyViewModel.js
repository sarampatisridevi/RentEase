const mongoose = require("mongoose");

const viewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "propertyschema", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("propertyview", viewSchema);