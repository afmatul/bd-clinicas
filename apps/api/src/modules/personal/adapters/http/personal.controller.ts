import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { DirectorioQuery, InstitucionClave, RegistrarProfesionalInput } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../../shared/contexto.js';
import { Contexto, Modulo, SesionGuard } from '../../../../http/contexto.js';
import type { CasosDeUsoPersonal } from '../../application/casos-de-uso.js';
import { PERSONAL } from '../../../../tokens.js';

/** Directorio público: GET /directorio/hospital?q=&especialidad= (sin sesión). */
@Controller('directorio')
export class DirectorioController {
  constructor(@Inject(PERSONAL) private readonly personal: CasosDeUsoPersonal) {}

  @Get(':institucion')
  directorio(@Param('institucion') institucion: string, @Query() query: unknown) {
    return this.personal.directorioPublico(InstitucionClave.parse(institucion), DirectorioQuery.parse(query));
  }
}

/** Personal de la institución del usuario en sesión. Las rutas fijas van antes de :id. */
@Controller('personal')
@Modulo('personal')
@UseGuards(SesionGuard)
export class PersonalController {
  constructor(@Inject(PERSONAL) private readonly personal: CasosDeUsoPersonal) {}

  @Get()
  listar(@Contexto() ctx: ContextoInstitucion, @Query() query: unknown) {
    return this.personal.listar(ctx, DirectorioQuery.parse(query));
  }

  @Get('yo')
  async yo(@Contexto() ctx: ContextoInstitucion) {
    return { profesional: await this.personal.yo(ctx) };
  }

  @Get('especialidades')
  especialidades(@Contexto() ctx: ContextoInstitucion) {
    return this.personal.especialidades(ctx);
  }

  @Get('departamentos')
  departamentos(@Contexto() ctx: ContextoInstitucion) {
    return this.personal.departamentos(ctx);
  }

  @Get(':id')
  obtener(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string) {
    return this.personal.obtener(ctx, id);
  }

  @Post()
  registrar(@Contexto() ctx: ContextoInstitucion, @Body() body: unknown) {
    return this.personal.registrar(ctx, RegistrarProfesionalInput.parse(body));
  }

  @Put(':id/especialidades/:idEspecialidad')
  asignar(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string, @Param('idEspecialidad') idEsp: string) {
    return this.personal.asignarEspecialidad(ctx, id, idEsp);
  }

  @Delete(':id/especialidades/:idEspecialidad')
  quitar(@Contexto() ctx: ContextoInstitucion, @Param('id') id: string, @Param('idEspecialidad') idEsp: string) {
    return this.personal.quitarEspecialidad(ctx, id, idEsp);
  }
}
