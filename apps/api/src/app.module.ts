import { Controller, Get, Module } from '@nestjs/common';
import { InfraestructuraModule } from './infrastructure/infraestructura.module.js';
import { IdentidadModule } from './modules/identidad/identidad.module.js';
import { PacientesModule } from './modules/pacientes/pacientes.module.js';
import { OdontologiaModule } from './modules/odontologia/odontologia.module.js';
import { PediatriaModule } from './modules/pediatria/pediatria.module.js';

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
  imports: [InfraestructuraModule, IdentidadModule, PacientesModule, OdontologiaModule, PediatriaModule],
  controllers: [SaludController],
})
export class AppModule {}
