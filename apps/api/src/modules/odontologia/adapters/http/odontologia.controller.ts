import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AplicarOdontogramaInput, RegistroRapidoInput } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../../shared/contexto.js';
import { Contexto, Modulo, SesionGuard } from '../../../../http/contexto.js';
import type { CasosDeUsoOdontologia } from '../../application/casos-de-uso.js';
import { ODONTOLOGIA } from '../../../../tokens.js';

/** Adaptador HTTP del módulo odontologia (solo Clínica odontológica; las demás reciben 404). */
@Controller('odontologia')
@Modulo('odontologia')
@UseGuards(SesionGuard)
export class OdontologiaController {
  constructor(@Inject(ODONTOLOGIA) private readonly odontologia: CasosDeUsoOdontologia) {}

  /** Turnos de hoy, odontólogos y siguiente turno libre. */
  @Get('recepcion')
  recepcion(@Contexto() ctx: ContextoInstitucion) {
    return this.odontologia.recepcion(ctx);
  }

  @Post('recepcion/registro-rapido')
  registroRapido(@Contexto() ctx: ContextoInstitucion, @Body() body: unknown) {
    return this.odontologia.registroRapido(ctx, RegistroRapidoInput.parse(body));
  }

  @Post('recepcion/turnos/:id/llegada')
  marcarLlegada(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string) {
    return this.odontologia.marcarLlegada(ctx, id);
  }

  @Get('pacientes/:id/odontograma')
  odontograma(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string) {
    return this.odontologia.odontograma(ctx, id);
  }

  @Patch('pacientes/:id/odontograma')
  aplicar(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string, @Body() body: unknown) {
    return this.odontologia.aplicarOdontograma(ctx, id, AplicarOdontogramaInput.parse(body));
  }
}
