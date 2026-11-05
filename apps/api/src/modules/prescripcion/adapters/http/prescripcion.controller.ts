import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { BuscarMedicamentosQuery, Id } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../../shared/contexto.js';
import { Contexto, Modulo, SesionGuard } from '../../../../http/contexto.js';
import type { CasosDeUsoPrescripcion } from '../../application/casos-de-uso.js';
import { PRESCRIPCION } from '../../../../tokens.js';

const RecetasQuery = z.object({ paciente: Id, vigentes: z.enum(['true', 'false']).default('false') });

/** Adaptador HTTP del módulo prescripcion. */
@Controller()
@Modulo('prescripcion')
@UseGuards(SesionGuard)
export class PrescripcionController {
  constructor(@Inject(PRESCRIPCION) private readonly prescripcion: CasosDeUsoPrescripcion) {}

  /** GET /medicamentos?q= → catálogo de la institución. */
  @Get('medicamentos')
  medicamentos(@Contexto() ctx: ContextoInstitucion, @Query() q: unknown) {
    return this.prescripcion.buscarMedicamentos(ctx, BuscarMedicamentosQuery.parse(q).q);
  }

  /** GET /recetas?paciente=&vigentes=true */
  @Get('recetas')
  recetas(@Contexto() ctx: ContextoInstitucion, @Query() q: unknown) {
    const p = RecetasQuery.parse(q);
    return this.prescripcion.recetas(ctx, p.paciente, p.vigentes === 'true');
  }
}
