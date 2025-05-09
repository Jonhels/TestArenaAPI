const mongoose = require("mongoose");

// Schema for individual components
const ComponentSchema = new mongoose.Schema({
    id: {
        type: mongoose.Schema.Types.ObjectId,
        default: new mongoose.Types.ObjectId, // Automatically generates a unique ID
    },
    type: {
        type: String,
        required: [true, "Component type is required"], // e.g., 'text-block', 'image-block'
    },
    content: {
        type: String,
        required: [true, "Component content is required"], // e.g., text or image URL
    },
    style: {
        type: Object, // Optional: styling information
        default: {},
    },
    position: {
        type: Object, // Optional: { x: Number, y: Number }
        default: {},
    },
});

// Schema for grid areas
const GridAreaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Please enter the title"],
        maxlength: [100, "Title cannot exceed 100 characters"],
    },
    components: {
        type: [ComponentSchema], // Array of components
        default: [],
    },
    order: {
        type: Number, // Determines the display order
        required: [true, "Order is required"],
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId, // Reference to the user
        ref: "User",
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

// Export the GridArea model
const GridArea = mongoose.model("GridArea", GridAreaSchema);

module.exports = GridArea;
