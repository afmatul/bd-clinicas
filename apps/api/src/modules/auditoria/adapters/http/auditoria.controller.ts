import { Controller, Get, Header, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { ConsultarBitacoraQuery } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../../shared/contexto.js';
import { Contexto, Modulo, SesionGuard } from '../../../../http/contexto.js';
import type { ConsultasAuditoria } from '../../application/consultar-bitacora.js';
import { CONSULTAS_AUDITORIA } from '../../../../tokens.js';

@Controller('auditoria')
@Modulo('auditoria')
@UseGuards(SesionGuard)
export class AuditoriaController {
  constructor(@Inject(CONSULTAS_AUDITORIA) private readonly consultas: ConsultasAuditoria) {}

  /** GET /auditoria/bitacora?accion=&usuario=&idPaciente=&desde=&hasta=&pagina=&porPagina= */
  @Get('bitacora')
  buscar(@Contexto() ctx: ContextoInstitucion, @Query() query: unknown) {
    return this.consultas.buscar(ctx, ConsultarBitacoraQuery.parse(query));
  }

  /** Mismos filtros, hasta 5,000 filas en CSV. Queda en la bitácora como EXPORTAR. */
  @Get('bitacora.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="bitacora.csv"')
  exportar(@Contexto() ctx: ContextoInstitucion, @Query() query: unknown) {
    return this.consultas.exportarCsv(ctx, ConsultarBitacoraQuery.parse(query));
  }

  /** "Quién vio a este paciente". */
  @Get('pacientes/:id/accesos')
  accesos(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string) {
    return this.consultas.accesosAPaciente(ctx, id);
  }
}
