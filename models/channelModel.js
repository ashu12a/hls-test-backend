import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        lang: { type: String, required: true, default: 'hi' },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            required: false,
        },
        url:{
            type:String,
            required: false
        },
        flussonic_token: {
            type: String,
            required: false
        },
        flussonic_uri: {
            type: String,
            required: false
        },
        flussonic_key: {
            type: String,
            required: false
        },
        restream_count: {
            type: Number,
            required: false,
            default: 3
        },
        support_email:[{
            type: String,
            required: false
        }],
        epgCheck: {
            type: Date,
        }
    },
    { timestamps: true }
);

const Channel = mongoose.model("Channel", channelSchema);

export default Channel;