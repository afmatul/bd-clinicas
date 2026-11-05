import { Body, Controller, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CapturarResultadosInput, ListarExamenesQuery, OrdenarExamenInput } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../../shared/contexto.js';
import { Contexto, Modulo, SesionGuard } from '../../../../http/contexto.js';
import type { CasosDeUsoLaboratorio } from '../../application/casos-de-uso.js';
import { LABORATORIO } from '../../laboratorio.tokens.js';

/** Adaptador HTTP del laboratorio. Desde otra institución responde 404 (módulo no habilitado). */
@Controller('laboratorio')
@Modulo('laboratorio')
@UseGuards(SesionGuard)
export class LaboratorioController {
  constructor(@Inject(LABORATORIO) private readonly lab: CasosDeUsoLaboratorio) {}

  @Get('tipos')
  tipos(@Contexto() ctx: ContextoInstitucion) {
    return this.lab.tipos(ctx);
  }

  @Get('examenes')
  listar(@Contexto() ctx: ContextoInstitucion, @Query() query: unknown) {
    return this.lab.listar(ctx, ListarExamenesQuery.parse(query));
  }

  @Get('examenes/:id')
  obtener(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string) {
    return this.lab.obtener(ctx, id);
  }

  @Post('examenes')
  ordenar(@Contexto() ctx: ContextoInstitucion, @Body() body: unknown) {
    return this.lab.ordenar(ctx, OrdenarExamenInput.parse(body));
  }

  @Put('examenes/:id/resultados')
  capturar(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string, @Body() body: unknown) {
    return this.lab.capturar(ctx, id, CapturarResultadosInput.parse(body));
  }

  @Post('examenes/:id/validar')
  validar(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string) {
    return this.lab.validar(ctx, id);
  }
}
