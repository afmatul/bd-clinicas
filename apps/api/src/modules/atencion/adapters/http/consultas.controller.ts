import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AbrirConsultaInput, BorradorConsultaInput, CerrarConsultaInput, Id } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../../shared/contexto.js';
import { Contexto, Modulo, SesionGuard } from '../../../../http/contexto.js';
import type { CasosDeUsoAtencion } from '../../application/casos-de-uso.js';
import { ATENCION } from '../../../../tokens.js';

const PorPaciente = z.object({ paciente: Id });

/** Adaptador HTTP del módulo atencion. Mismo JSON en los cuatro motores. */
@Controller('consultas')
@Modulo('atencion')
@UseGuards(SesionGuard)
export class ConsultasController {
  constructor(@Inject(ATENCION) private readonly atencion: CasosDeUsoAtencion) {}

  /** GET /consultas?paciente=<id> → historial longitudinal. */
  @Get()
  historial(@Contexto() ctx: ContextoInstitucion, @Query() q: unknown) {
    return this.atencion.historial(ctx, PorPaciente.parse(q).paciente);
  }

  /** Abre (o retoma) la consulta del paciente; con idCita, la cita pasa a EN_CONSULTA. */
  @Post()
  abrir(@Contexto() ctx: ContextoInstitucion, @Body() body: unknown) {
    return this.atencion.abrir(ctx, AbrirConsultaInput.parse(body));
  }

  @Get(':id')
  obtener(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string) {
    return this.atencion.obtener(ctx, id);
  }

  @Put(':id/borrador')
  @HttpCode(204)
  async borrador(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string, @Body() body: unknown) {
    await this.atencion.guardarBorrador(ctx, id, BorradorConsultaInput.parse(body));
  }

  /** Signos, diagnósticos, tratamientos y recetas en una sola unidad atómica. */
  @Post(':id/cierre')
  cerrar(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string, @Body() body: unknown) {
    return this.atencion.cerrar(ctx, id, CerrarConsultaInput.parse(body));
  }
}
