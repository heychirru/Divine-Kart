import express from 'express';
import auth from "../middleware/auth.js";
import { addAddressController, deleteAddressController, getAddressController, updateAddressController } from '../controllers/addressController.js'
import { validateAddress } from '../middleware/validation.js';

const addressRouter = express.Router();

addressRouter.post('/create', auth, validateAddress, addAddressController)
addressRouter.get("/get", auth, getAddressController)
addressRouter.put('/update', auth, validateAddress, updateAddressController)
addressRouter.delete("/disable", auth, deleteAddressController)

export default addressRouter