import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    url:{
        type:String,
        required:true,
        unique:true
    },
    content:{
        type:String,
    },
    scraped_at:{
        type:Date,
        default:Date.now
    }
});

const BlogModel = mongoose.model("BlogModel", blogSchema);
export default BlogModel;