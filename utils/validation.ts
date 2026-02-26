import { z } from 'zod'

export const usernameSchema = z.string()
  .min(3, 'Mínimo 3 caracteres')
  .max(30, 'Máximo 30')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, . _ -')

export const passwordSchema = z.string()
  .min(7, 'Mínimo 7 letras o más')
  .regex(/[A-Za-z]/, 'Debe tener letras')
  .regex(/\d/, 'Debe tener al menos un número')
  .regex(/[^\w\s]/, 'Debe tener al menos un carácter especial')

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema
})
