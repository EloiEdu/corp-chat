# Usando `@GetUser()` em uma rota protegida

O `JwtAuthGuard` valida o token Bearer antes de executar o handler. Depois da
validação, o Passport coloca em `request.user` o objeto retornado por
`JwtStrategy.validate()`, tipado como `AuthenticatedUser`.

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface.js';
import { GetUser } from './decorators/get-user.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('profile')
export class ProfileController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@GetUser() user: AuthenticatedUser) {
    return user;
  }
}
```

Envie o token recebido no login no cabeçalho da requisição:

```http
Authorization: Bearer <access_token>
```
