const response = require("../utils/responseHandler");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const Conversation = require("../models/Conversation");
const Status = require("../models/Status");

exports.createStatus = async (req, res) => {
    try {
        const { content, contentType } = req.body;
        const userId = req.user.id;
        const file = req.file;

        let imageOrVideoUrl = null;
        let finalContentType = contentType || 'text';

        if (file) {
            const uploadFile = await uploadFileToCloudinary(file);

            if (!uploadFile?.secure_url) {
                return response({
                    res,
                    statusCode: 400,
                    message: "Failed to upload file to Cloudinary",
                });
            }
            imageOrVideoUrl = uploadFile?.secure_url;

            if (file.mimetype.startsWith("image")) {
                finalContentType = "image";
            } else if (file.mimetype.startsWith("video")) {
                finalContentType = "video";
            } else {
                return response({ res, statusCode: 400, message: "Invalid file type" });
            }
        } else if (content?.trim()) {
            finalContentType = "text";
        } else {
            return response({
                res,
                statusCode: 400,
                message: "Content or file is required",
            });
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        const status = new Status({
            user: userId,
            content: content || imageOrVideoUrl,
            contentType: finalContentType,
            expiresAt: expiresAt
        });

        await status.save();
        const populatedStatus = await Status.findById(status?._id)
            .populate("user", "username profilePicture")
            .populate("viewers", "username profilePicture");


            if(req.io && req.socketUserMap) {
                for(const[connectionId, socketId] of req.socketUserMap) {
                    if(connectionUserId !== userId) {
                        req.io.to(socketId).emit("newStatus", { status: populatedStatus });
                    }
                }                       
            }
        return response({
            res, statusCode: 200, message: "Status created successfully", data: { status: populatedStatus },
        });
    } catch (error) {
        console.error(error);
        return response({ res, statusCode: 500, message: "Internal server error" });
    }
};



exports.getStatuses = async (req, res) => {
    try {
        const statuses = await Status.find({
            expiresAt: { $gt: new Date() },
        })
            .populate("user", "username profilePicture")
            .populate("viewers", "username profilePicture")
            .sort({ createdAt: -1 });
        return response({ res, statusCode: 200, message: "Statuses fetched successfully", data: { statuses } });
    }
    catch (error) {
        console.error(error);
        return response({ res, statusCode: 500, message: "Internal server error" });
    }
}

exports.viewStatus = async (req, res) => {
    try {
        const { statusId } = req.params;
        const userId = req.user.id;
        
        const status = await Status.findById(statusId);
        if (!status) {
            return response({ res, statusCode: 404, message: "Status not found" });
        }

        if (!status.viewers.includes(userId)) {
            status.viewers.push(userId);
            await status.save();
        }

        const updatedStatus = await Status.findById(statusId)
            .populate("user", "username profilePicture")
            .populate("viewers", "username profilePicture");

            if(req.io && req.socketUserMap) {
                const statusOwnerSocketId = req.socketUserMap.get(status.user._id.toString());
                if(statusOwnerSocketId) {
                    const viewData = {
                        statusId,
                        viewerId: userId,
                        totalviewers: updatedStatus.viewers.length,
                        viewers: updatedStatus.viewers
                    };
                    req.io.to(statusOwnerSocketId).emit("statusViewed", viewData);
                }else{
                    console.log(`Status owner with ID ${status.user._id} is not connected via WebSocket`);
                }
            }else{
                console.log("user already viewed the status");
            }

        return response({ res, statusCode: 200, message: "Status viewed successfully", data: { status: updatedStatus } });
    }
    catch (error) {
        console.error(error);
        return response({ res, statusCode: 500, message: "Internal server error" });
    }
}
exports.deleteStatus = async (req, res) => {
    try {
        const { statusId } = req.params;
        const userId = req.user.id;

        const status = await Status.findById(statusId);
        if (!status) {
            return response({ res, statusCode: 404, message: "Status not found" });
        }

        if (status.user.toString() !== userId) {
            return response({ res, statusCode: 403, message: "You are not the owner of this status" });
        }

        await Status.deleteOne();

        if(req.io && req.socketUserMap) {
            for(const[connectionUserId, socketId] of req.socketUserMap) {
                if(connectionUserId !== userId) {
                    req.io.to(socketId).emit("statusDeleted", { statusId });
                }
            }
        }
        
        return response({ res, statusCode: 200, message: "Status deleted successfully" });
    }
    catch (error) {
        console.error(error);
        return response({ res, statusCode: 500, message: "Internal server error" });
    }
}

