import mongoose from "mongoose";

const ContentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "courses",
      required: [true, "please provide a courseId"],
      index: true,
    },

    title: {
      type: String,
      required: [true, "please provide a title"],
      set: (v) => (typeof v === "string" ? v.trim() : v),
    },

    description: {
      type: String,
      default: "",
      set: (v) => (typeof v === "string" ? v.trim() : v),
    },

    whatToLearn: {
      type: [String],
      default: [],
      set: (arr) => {
        if (!Array.isArray(arr)) return [];
        const cleaned = arr
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter(Boolean);
        return [...new Set(cleaned)];
      },
    },

    pdfUrl: { type: String, default: null },
    pdfName: { type: String, default: "" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
  },
  { timestamps: true }
);

const CourseContent =
  mongoose.models.course_contents ||
  mongoose.model("course_contents", ContentSchema);

export default CourseContent;
