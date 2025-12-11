import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "please provide a title"],
  },

  description: {
    type: String,
  },

  subject: {
    type: String,
    required: [true, "please provide a subject"],
  },

  tags: {
    type: [String],
    default: [],
  },

  thumbnail: {
    type: String,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: [true, "please provide a teacher/admin reference"],
  },
}, { timestamps: true });

const Course = mongoose.models.courses || mongoose.model("courses", courseSchema);

export default Course;
