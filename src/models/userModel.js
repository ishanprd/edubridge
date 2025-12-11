import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, "please provide a firstName"],
    },

    lastName: {
        type: String,
        required: [true, "please provide a lastName"],
    },

    email: {
        type: String,
        required: [true, "please provide a email"],
        unique: true
    },

    password: {
        type: String,
        required: [true, "please provide a password"],
    },
    
    role: {
        type: String,
        enum: ["student", "teacher", "admin"],
        required: [true, "please provide a role"],
    },
    forgotPasswordToken: String,
    forgotPasswordTokenExpiry: Date,
},{timestamps:true})

const User = mongoose.models.users || mongoose.model("users", userSchema);

export default User;