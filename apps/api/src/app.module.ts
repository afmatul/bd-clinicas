import { Controller, Get, Module } from '@nestjs/common';
import { InfraestructuraModule } from './infrastructure/infraestructura.module.js';
import { IdentidadModule } from './modules/identidad/identidad.module.js';
import { PacientesModule } from './modules/pacientes/pacientes.module.js';
import { AntecedentesModule } from './modules/antecedentes/antecedentes.module.js';
import { PersonalModule } from './modules/personal/personal.module.js';
import { AuditoriaModule } from './modules/auditoria/auditoria.module.js';

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
  imports: [InfraestructuraModule, IdentidadModule, PacientesModule, AntecedentesModule, PersonalModule, AuditoriaModule],
  controllers: [SaludController],
})
export class AppModule {}
