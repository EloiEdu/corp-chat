import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { WorkspacesService } from './workspaces.service.js';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  create(@Body() dto: CreateWorkspaceDto, @GetUser() user: AuthenticatedUser) {
    return this.workspacesService.create(dto, user.userId);
  }

  @Get()
  findAll(@GetUser() user: AuthenticatedUser) {
    return this.workspacesService.findAll(user.userId);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.workspacesService.findOne(id, user.userId);
  }

  @Post(':id/members')
  addMember(
    @Param('id', new ParseUUIDPipe()) workspaceId: string,
    @GetUser() user: AuthenticatedUser,
    @Body() dto: AddWorkspaceMemberDto,
  ) {
    return this.workspacesService.addMember(
      workspaceId,
      user.userId,
      dto,
    );
  }

  @Delete(':workspaceId')
  remove(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.workspacesService.remove(workspaceId, user.userId);
  }
}
