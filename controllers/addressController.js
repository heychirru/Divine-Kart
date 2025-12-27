import Address from "../models/addressModel.js";
import User from "../models/userModel.js";

export const addAddressController = async(request,response)=>{
    try {
        const userId = request.userId // middleware
        const { addressLine, city, state, pincode, country, mobile } = request.body

        const createAddress = new Address({
            addressLine,
            city,
            state,
            country,
            pincode,
            mobile,
            userId: userId 
        })
        const saveAddress = await createAddress.save()

        const addUserAddressId = await User.findByIdAndUpdate(
            userId,
            { $push: { addressDetails: saveAddress._id } },
            { new: true }
        )

        if (!addUserAddressId) {
            return response.status(404).json({
                message: "User not found",
                error: true,
                success: false
            })
        }

        return response.json({
            message: "Address Created Successfully",
            error: false,
            success: true,
            data: saveAddress
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const getAddressController = async(request,response)=>{
    try {
        const userId = request.userId // middleware auth

        const data = await Address.find({ userId: userId }).sort({ createdAt: -1 })

        return response.json({
            data: data,
            message: "List of address",
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const updateAddressController = async(request,response)=>{
    try {
        const userId = request.userId // middleware auth 
        const { _id, addressLine, city, state, country, pincode, mobile } = request.body 

        const updateAddress = await Address.updateOne(
            { _id: _id, userId: userId },
            {
                addressLine,
                city,
                state,
                country,
                mobile,
                pincode
            }
        )

        return response.json({
            message: "Address Updated",
            error: false,
            success: true,
            data: updateAddress
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const deleteAddressController = async(request,response)=>{
    try {
        const userId = request.userId // auth middleware    
        const { _id } = request.body 

        const disableAddress = await Address.updateOne(
            { _id: _id, userId: userId },
            { isActive: false }
        )

        return response.json({
            message: "Address removed",
            error: false,
            success: true,
            data: disableAddress
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

