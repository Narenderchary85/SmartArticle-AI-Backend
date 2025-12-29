import mongoose from "mongoose";

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true,
        unique: true
    },
    content: { 
        type: String,
    },
    scraped_at: {
        type: Date,
        default: Date.now
    },

    updated_content: { 
        type: String, 
        default: ""
    },
    is_updated: { 
        type: Boolean, 
        default: false 
    },
    references: { 
        type: [String], 
        default: [] 
    },
    updated_at: {
        type: Date
    }
});

const ArticleModel = mongoose.model("ArticleModel", articleSchema);
export default ArticleModel;