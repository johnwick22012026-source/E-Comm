import { ValidationPipe } from '@nestjs/common'

export const adminValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
})
