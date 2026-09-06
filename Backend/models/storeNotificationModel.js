import mongoose from 'mongoose';

const storeNotificationSchema = new mongoose.Schema({
    store: {
        type: mongoose.Schema.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    order: {
        type: mongoose.Schema.ObjectId,
        ref: 'Order',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    type: {
        type: String,
        enum: ['NewOrder', 'OrderCancelled', 'LowStock'],
        default: 'NewOrder'
    }
}, { timestamps: true });

const StoreNotification = mongoose.models.StoreNotification || mongoose.model('StoreNotification', storeNotificationSchema);

export default StoreNotification;
