import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { RegistrarAlergiaInput, RegistrarAntecedenteInput } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../../shared/contexto.js';
import { Contexto, Modulo, SesionGuard } from '../../../../http/contexto.js';
import type { CasosDeUsoAntecedentes } from '../../application/registrar-antecedentes.js';
import { ANTECEDENTES } from '../../../../tokens.js';

/** Alergias y antecedentes cuelgan del paciente: /pacientes/:id/alergias y /pacientes/:id/antecedentes. */
@Controller('pacientes/:id')
@Modulo('antecedentes')
@UseGuards(SesionGuard)
export class AntecedentesController {
  constructor(@Inject(ANTECEDENTES) private readonly casos: CasosDeUsoAntecedentes) {}

  @Get('cuadro-clinico')
  consultar(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string) {
    return this.casos.consultar(ctx, id);
  }

  @Post('alergias')
  registrarAlergia(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string, @Body() body: unknown) {
    return this.casos.registrarAlergia(ctx, id, RegistrarAlergiaInput.parse(body));
  }

  @Post('antecedentes')
  registrarAntecedente(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string, @Body() body: unknown) {
    return this.casos.registrarAntecedente(ctx, id, RegistrarAntecedenteInput.parse(body));
  }
}
