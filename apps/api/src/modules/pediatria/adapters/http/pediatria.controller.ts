import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AplicarDosisInput, DosisVencidasQuery, RegistrarMedicionInput } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../../shared/contexto.js';
import { Contexto, Modulo, SesionGuard } from '../../../../http/contexto.js';
import type { CasosDeUsoPediatria } from '../../application/casos-de-uso.js';
import { PEDIATRIA } from '../../../../tokens.js';

/** Adaptador HTTP del módulo pediatria. Fuera del Centro pediátrico responde 404 (SesionGuard + @Modulo). */
@Controller('pediatria')
@Modulo('pediatria')
@UseGuards(SesionGuard)
export class PediatriaController {
  constructor(@Inject(PEDIATRIA) private readonly pediatria: CasosDeUsoPediatria) {}

  @Get('vacunas')
  vacunas(@Contexto() ctx: ContextoInstitucion) {
    return this.pediatria.vacunas(ctx);
  }

  @Get('dosis-vencidas')
  dosisVencidas(@Contexto() ctx: ContextoInstitucion, @Query() query: unknown) {
    return this.pediatria.dosisVencidas(ctx, DosisVencidasQuery.parse(query).hasta);
  }

  @Get('pacientes/:id')
  seguimiento(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string) {
    return this.pediatria.seguimiento(ctx, id);
  }

  @Post('pacientes/:id/mediciones')
  registrarMedicion(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string, @Body() body: unknown) {
    return this.pediatria.registrarMedicion(ctx, id, RegistrarMedicionInput.parse(body));
  }

  @Post('pacientes/:id/dosis')
  aplicarDosis(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string, @Body() body: unknown) {
    return this.pediatria.aplicarDosis(ctx, id, AplicarDosisInput.parse(body));
  }
}
