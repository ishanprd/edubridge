import mongoose from "mongoose";

const courseRatingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "User ID is required"],
      index: true,
    },
    
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "courses",
      required: [true, "Course ID is required"],
      index: true,
    },
    
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number (1, 2, 3, 4, or 5)",
      },
    },
    
    review: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1000, "Review cannot exceed 1000 characters"],
    },
  },
  { 
    timestamps: true,
  }
);

courseRatingSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const CourseRating =
  mongoose.models.course_ratings ||
  mongoose.model("course_ratings", courseRatingSchema);

export default CourseRating;