import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    video: { type: String, required: true },
    thumbnail: { type: String, required: true },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    title: { type: String, required: true },
    description: { type: String },
    duration: { type: Number, required: true },
    views: { type: String, default: 0 },
    isPublished: { type: Boolean, defult: true },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
