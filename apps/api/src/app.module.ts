import { Controller, Get, Module } from '@nestjs/common';
import { InfraestructuraModule } from './infrastructure/infraestructura.module.js';
import { IdentidadModule } from './modules/identidad/identidad.module.js';
import { PacientesModule } from './modules/pacientes/pacientes.module.js';
import { AgendaModule } from './modules/agenda/agenda.module.js';
import { PrescripcionModule } from './modules/prescripcion/prescripcion.module.js';
import { AtencionModule } from './modules/atencion/atencion.module.js';

@Controller()
class SaludController {
  @Get('salud')
  salud() {
    return { ok: true };
  }
}

/**
 * Raíz de composición. Cada módulo de dominio es un módulo de Nest que conecta sus puertos
 * con sus adaptadores; al implementar agenda, atencion, etc., se agregan aquí.
 */
@Module({
  imports: [InfraestructuraModule, IdentidadModule, PacientesModule, AgendaModule, PrescripcionModule, AtencionModule],
  controllers: [SaludController],
})
export class AppModule {}
