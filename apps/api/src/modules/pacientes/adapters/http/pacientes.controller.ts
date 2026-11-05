import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BuscarPacientesQuery, DarDeBajaInput, RegistrarPacienteInput } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../../shared/contexto.js';
import { Contexto, Modulo, SesionGuard } from '../../../../http/contexto.js';
import type { CasosDeUsoPacientes } from '../../application/casos-de-uso.js';
import { PACIENTES } from '../../../../tokens.js';

/** Adaptador HTTP: traduce JSON ↔ casos de uso. El mismo JSON para los cuatro motores. */
@Controller('pacientes')
@Modulo('pacientes')
@UseGuards(SesionGuard)
export class PacientesController {
  constructor(@Inject(PACIENTES) private readonly pacientes: CasosDeUsoPacientes) {}

  @Get()
  buscar(@Contexto() ctx: ContextoInstitucion, @Query() query: unknown) {
    return this.pacientes.buscar(ctx, BuscarPacientesQuery.parse(query));
  }

  @Get(':id')
  ficha(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string) {
    return this.pacientes.obtenerFicha(ctx, id);
  }

  @Post()
  registrar(@Contexto() ctx: ContextoInstitucion, @Body() body: unknown) {
    return this.pacientes.registrar(ctx, RegistrarPacienteInput.parse(body));
  }

  @Post(':id/baja')
  @HttpCode(204)
  async darDeBaja(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string, @Body() body: unknown) {
    await this.pacientes.darDeBaja(ctx, id, DarDeBajaInput.parse(body));
  }
}
