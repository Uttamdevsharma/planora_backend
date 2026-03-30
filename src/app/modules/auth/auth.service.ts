import z from "zod"
import { AuthValidation } from "./auth.validation"
import { prisma } from "../../lib/prisma"
import { AppError } from "../../errorHelpers/AppError"
import { envVars } from "../../config/env"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

type RegisterInput = z.infer<typeof AuthValidation.registerSchema>
type LoginInput = z.infer<typeof AuthValidation.loginSchema>

const userRegister = async(payload : RegisterInput)=>{

    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email }
    })
  
    if (existingUser) {
      throw new AppError(400, "Email already in use")
    }
    const hashedPassword = await bcrypt.hash(payload.password, 10)
  
    const newUser = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: hashedPassword
      }
    })
  
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
      envVars.AUTH_SECRET,
      { expiresIn: "7d" }
    )
  
    return {
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role : newUser.role
      }
    }
  }

  const userLogin = async (payload: LoginInput) => {

    const foundUser = await prisma.user.findUnique({
      where: { email: payload.email }
    })
  
    if (!foundUser) {
      throw new AppError(401, "Invalid credentials")
    }
  
    const passwordMatch = await bcrypt.compare(
      payload.password,
      foundUser.password
    )
  
    if (!passwordMatch) {
      throw new AppError(401, "Invalid credentials")
    }
  
    const accessToken = jwt.sign(
      { userId: foundUser.id, role: foundUser.role },
      envVars.AUTH_SECRET,
      { expiresIn: "7d" }
    )
  
    return {
      token: accessToken,
      user: {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role
      }
    }
  }
  

export const authService = {
    userRegister,
    userLogin
}