import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { AuthValidation } from "./auth.validation";
import { authService } from "./auth.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";


const userRegister = catchAsync(
    async(req:Request,res:Response) => {
        const parseBody = AuthValidation.registerSchema.parse(req.body)
        const user = await authService.userRegister(parseBody)

        sendResponse(res, {
            httpStatusCode : status.CREATED,
            success :true,
            message : "User created Successfully",
            data : user
        })
    }
)


const userLogin = catchAsync(
    async(req:Request,res:Response) => {
        const parseBody = AuthValidation.loginSchema.parse(req.body)
        const user = await authService.userLogin(parseBody)

        sendResponse(res, {
            httpStatusCode : status.OK,
            success :true,
            message : "User Login Successfully",
            data : user
        })
    }
)

export const authController = {
    userRegister,
    userLogin
}