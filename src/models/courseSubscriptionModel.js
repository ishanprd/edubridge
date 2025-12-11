import mongoose from "mongoose";

const courseSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "courses",
      required: true,
    },
  },
  { timestamps: true }
);

const CourseSubscription =
  mongoose.models.course_subscriptions ||
  mongoose.model("course_subscriptions", courseSubscriptionSchema);

export default CourseSubscription;
