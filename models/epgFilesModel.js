import mongoose from 'mongoose';

const epgFilesSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        channel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Channel",
            required: true,
        },
        filename: { type: String, required: true },
    },
    { timestamps: true }
);


epgFilesSchema.pre("save", async function (next) {
    if (!this.author) {
        const channel = await mongoose.model("Channel").findById(this.channel);
        if (channel) {
            this.author = channel.author;   // auto assign same user
        }
    }
    next();
});


const EpgFiles = mongoose.model('EpgFiles', epgFilesSchema);
export default EpgFiles;
