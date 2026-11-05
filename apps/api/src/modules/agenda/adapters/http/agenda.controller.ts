import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AgendaQuery, AgendarCitaInput, CambiarEstadoCitaInput, DisponibilidadQuery } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../../shared/contexto.js';
import { Contexto, Modulo, SesionGuard } from '../../../../http/contexto.js';
import type { CasosDeUsoAgenda } from '../../application/casos-de-uso.js';
import { AGENDA } from '../../../../tokens.js';

const Rango = z.object({ desde: z.string().date(), hasta: z.string().date() });

/** Adaptador HTTP del módulo agenda. Mismo JSON en los cuatro motores. */
@Controller('agenda')
@Modulo('agenda')
@UseGuards(SesionGuard)
export class AgendaController {
  constructor(@Inject(AGENDA) private readonly agenda: CasosDeUsoAgenda) {}

  /** GET /agenda?idMedico=&desde=&hasta= */
  @Get()
  delMedico(@Contexto() ctx: ContextoInstitucion, @Query() q: unknown) {
    return this.agenda.agenda(ctx, AgendaQuery.parse(q));
  }

  /** GET /agenda/disponibilidad?idMedico=&fecha= → horarios libres */
  @Get('disponibilidad')
  disponibilidad(@Contexto() ctx: ContextoInstitucion, @Query() q: unknown) {
    return this.agenda.disponibilidad(ctx, DisponibilidadQuery.parse(q));
  }

  @Get('inasistencias')
  inasistencias(@Contexto() ctx: ContextoInstitucion, @Query() q: unknown) {
    const r = Rango.parse(q);
    return this.agenda.inasistencias(ctx, r.desde, r.hasta);
  }

  /** Próximas citas activas del paciente (alerta "Ya tiene una cita" en Nueva cita). */
  @Get('paciente/:id')
  delPaciente(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string) {
    return this.agenda.proximasDelPaciente(ctx, id);
  }

  @Get('citas/:id')
  obtener(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string) {
    return this.agenda.obtener(ctx, id);
  }

  @Post('citas')
  agendar(@Contexto() ctx: ContextoInstitucion, @Body() body: unknown) {
    return this.agenda.agendar(ctx, AgendarCitaInput.parse(body));
  }

  /** Confirmar, cancelar o marcar inasistencia. EN_CONSULTA y ATENDIDA las pone el módulo atencion. */
  @Patch('citas/:id/estado')
  cambiarEstado(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string, @Body() body: unknown) {
    return this.agenda.cambiarEstado(ctx, id, CambiarEstadoCitaInput.parse(body));
  }
}
