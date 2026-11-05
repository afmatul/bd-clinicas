/**
 * Personas de la semilla. Los cinco primeros adultos y los nombres de las agendas de hoy son los del prototipo.
 * Un mismo CUI en dos instituciones es la misma persona; cada institución guarda su propia copia
 * (las instituciones no comparten datos).
 */
import { HOY, sumarDias, sumarMeses } from './util.js';

export type Inst = 'hospital' | 'laboratorio' | 'odontologia';

export interface Alergia { tipo: 'Medicamento' | 'Alimento' | 'Ambiental'; descripcion: string; severidad: 'LEVE' | 'MODERADA' | 'SEVERA'; med?: string }
export interface Antecedente { tipo: 'Patológico' | 'Quirúrgico' | 'Familiar' | 'Traumático' | 'Gineco-obstétrico' | 'Hábitos'; descripcion: string }

export interface Adulto {
  clave: string;
  cui: string;
  nombres: string;
  apellidos: string;
  nacimiento: string;
  sexo: 'F' | 'M';
  sangre: string;
  direccion: string;
  procedencia: string;
  telefonos: string[];
  emails: string[];
  contacto?: { nombre: string; parentesco: string; telefonos: string[] };
  social: { estadoCivil: string; ocupacion: string; escolaridad: string; religion: string; etnia: string };
  pesoKg: number;
  tallaCm: number;
  alergias: Alergia[];
  antecedentes: Antecedente[];
  /** Enfermedades crónicas: generan consultas de control cada 2–3 meses. */
  cronicos: string[];
  /** Cuadros agudos del último año. */
  agudos: string[];
  en: Inst[];
  baja?: { hace: number; motivo: string };
}

const año = (dias: number) => sumarDias(HOY, -dias).slice(0, 4);

export const ADULTOS: Adulto[] = [
  {
    clave: 'mjlopez', cui: '2547881200101', nombres: 'María José', apellidos: 'López Ramírez', nacimiento: '1992-03-14', sexo: 'F', sangre: 'O+',
    direccion: '5a. avenida 12-40, zona 1, Mixco', procedencia: 'Mixco, Guatemala', telefonos: ['55124478'], emails: ['mariajose.lopez@gmail.com'],
    contacto: { nombre: 'Jorge López Ramírez', parentesco: 'Hermano', telefonos: ['55129087'] },
    social: { estadoCivil: 'Casada', ocupacion: 'Maestra de primaria', escolaridad: 'Universitaria', religion: 'Católica', etnia: 'Mestiza' },
    pesoKg: 61.4, tallaCm: 158,
    alergias: [
      { tipo: 'Medicamento', descripcion: 'Penicilina', severidad: 'SEVERA', med: 'penicilina-benzatinica' },
      { tipo: 'Ambiental', descripcion: 'Polen', severidad: 'LEVE' },
    ],
    antecedentes: [
      { tipo: 'Patológico', descripcion: 'Hipertensión arterial' },
      { tipo: 'Quirúrgico', descripcion: 'Apendicectomía 2015' },
      { tipo: 'Familiar', descripcion: 'Madre diabética' },
    ],
    cronicos: ['hta'], agudos: ['faringo'], en: ['hospital', 'laboratorio', 'odontologia'],
  },
  {
    clave: 'cuaju', cui: '1987663010901', nombres: 'Carlos', apellidos: 'Ajú Tzul', nacimiento: '1968-07-02', sexo: 'M', sangre: 'B-',
    direccion: 'Colonia El Milagro, 3a. calle 4-15, zona 6, Mixco', procedencia: 'San Cristóbal Totonicapán', telefonos: ['44102290', '22145587'], emails: [],
    contacto: { nombre: 'Juana Tzul de Ajú', parentesco: 'Esposa', telefonos: ['44102291'] },
    social: { estadoCivil: 'Casado', ocupacion: 'Comerciante', escolaridad: 'Primaria completa', religion: 'Evangélica', etnia: 'Maya k’iche’' },
    pesoKg: 82.0, tallaCm: 166,
    alergias: [{ tipo: 'Alimento', descripcion: 'Mariscos', severidad: 'MODERADA' }],
    antecedentes: [
      { tipo: 'Patológico', descripcion: 'Dislipidemia' },
      { tipo: 'Hábitos', descripcion: 'Tabaquismo, 10 cigarrillos al día por 25 años' },
      { tipo: 'Familiar', descripcion: 'Padre con infarto agudo de miocardio a los 60 años' },
    ],
    cronicos: ['dislipidemia'], agudos: ['lumbalgia'], en: ['hospital', 'laboratorio', 'odontologia'],
  },
  {
    clave: 'shernandez', cui: '2210774500101', nombres: 'Sofía', apellidos: 'Hernández Pérez', nacimiento: '1985-01-22', sexo: 'F', sangre: 'O-',
    direccion: '12 calle 8-30, zona 11, Guatemala', procedencia: 'Guatemala, Guatemala', telefonos: ['30215567'], emails: ['sofia.hernandez85@outlook.com'],
    contacto: { nombre: 'Ricardo Hernández', parentesco: 'Padre', telefonos: ['30215500'] },
    social: { estadoCivil: 'Divorciada', ocupacion: 'Contadora', escolaridad: 'Universitaria', religion: 'Católica', etnia: 'Mestiza' },
    pesoKg: 68.5, tallaCm: 162,
    alergias: [{ tipo: 'Medicamento', descripcion: 'Sulfonamidas', severidad: 'MODERADA', med: 'tmp-smx' }],
    antecedentes: [
      { tipo: 'Patológico', descripcion: 'Enfermedad renal crónica estadio 3' },
      { tipo: 'Patológico', descripcion: 'Hipertensión arterial' },
      { tipo: 'Gineco-obstétrico', descripcion: 'G2 P2 A0, último parto 2014' },
    ],
    cronicos: ['hta'], agudos: ['itu'], en: ['hospital', 'laboratorio', 'odontologia'],
  },
  {
    clave: 'lmazariegos', cui: '2899100230101', nombres: 'Luis', apellidos: 'Mazariegos', nacimiento: '1999-05-10', sexo: 'M', sangre: 'A+',
    direccion: 'Residenciales Las Flores, casa 14, Villa Nueva', procedencia: 'Quetzaltenango', telefonos: ['57891123'], emails: ['luis.mazariegos99@gmail.com'],
    contacto: { nombre: 'Carmen Mazariegos', parentesco: 'Madre', telefonos: ['57891100'] },
    social: { estadoCivil: 'Soltero', ocupacion: 'Estudiante universitario', escolaridad: 'Universitaria en curso', religion: 'Ninguna', etnia: 'Mestiza' },
    pesoKg: 74.0, tallaCm: 175,
    alergias: [], antecedentes: [], cronicos: [], agudos: [], en: ['hospital', 'laboratorio', 'odontologia'],
  },
  {
    clave: 'rgomez', cui: '1755441200108', nombres: 'Rosa', apellidos: 'Gómez de León', nacimiento: '1963-09-30', sexo: 'F', sangre: 'AB+',
    direccion: 'Calzada San Juan 15-60, zona 7, Guatemala', procedencia: 'Chimaltenango', telefonos: ['41227781'], emails: [],
    contacto: { nombre: 'Esteban León Gómez', parentesco: 'Hijo', telefonos: ['41227790', '22301145'] },
    social: { estadoCivil: 'Viuda', ocupacion: 'Ama de casa', escolaridad: 'Secundaria', religion: 'Católica', etnia: 'Mestiza' },
    pesoKg: 70.2, tallaCm: 154,
    alergias: [{ tipo: 'Medicamento', descripcion: 'Ibuprofeno', severidad: 'LEVE', med: 'ibuprofeno' }],
    antecedentes: [
      { tipo: 'Patológico', descripcion: 'Diabetes mellitus tipo 2' },
      { tipo: 'Quirúrgico', descripcion: `Colecistectomía laparoscópica ${año(21)}` },
      { tipo: 'Gineco-obstétrico', descripcion: 'G4 P4, menopausia a los 51 años' },
    ],
    cronicos: ['dm2'], agudos: ['colecistitis'], en: ['hospital', 'laboratorio', 'odontologia'],
  },
  {
    clave: 'jtum', cui: '1645987300801', nombres: 'José', apellidos: 'Tum Chávez', nacimiento: '1958-11-03', sexo: 'M', sangre: 'O+',
    direccion: 'Aldea Chuisuc, Totonicapán', procedencia: 'Totonicapán', telefonos: ['48871220'], emails: [],
    contacto: { nombre: 'Petrona Chávez', parentesco: 'Esposa', telefonos: ['48871221'] },
    social: { estadoCivil: 'Casado', ocupacion: 'Agricultor', escolaridad: 'Primaria incompleta', religion: 'Católica', etnia: 'Maya k’iche’' },
    pesoKg: 77.5, tallaCm: 160,
    alergias: [],
    antecedentes: [
      { tipo: 'Patológico', descripcion: 'Diabetes mellitus tipo 2 desde 2016' },
      { tipo: 'Patológico', descripcion: 'Hipertensión arterial' },
      { tipo: 'Traumático', descripcion: 'Fractura de radio izquierdo 1994' },
    ],
    cronicos: ['dm2', 'hta'], agudos: [], en: ['hospital', 'laboratorio'],
  },
  {
    clave: 'amorales', cui: '3012456780101', nombres: 'Ana Gabriela', apellidos: 'Morales Pineda', nacimiento: '1990-06-18', sexo: 'F', sangre: 'A+',
    direccion: '20 avenida 5-12, zona 15, Vista Hermosa I', procedencia: 'Guatemala, Guatemala', telefonos: ['52348811'], emails: ['ana.morales@empresa.com.gt'],
    contacto: { nombre: 'Luis Fernando Pineda', parentesco: 'Esposo', telefonos: ['52348812'] },
    social: { estadoCivil: 'Casada', ocupacion: 'Ingeniera industrial', escolaridad: 'Posgrado', religion: 'Católica', etnia: 'Mestiza' },
    pesoKg: 58.0, tallaCm: 163,
    alergias: [], antecedentes: [{ tipo: 'Gineco-obstétrico', descripcion: 'G1 P0 C1 (cesárea 2021)' }],
    cronicos: [], agudos: ['rinitis'], en: ['hospital', 'odontologia'],
  },
  {
    clave: 'mperez', cui: '2154879630101', nombres: 'Marco Antonio', apellidos: 'Pérez Gálvez', nacimiento: '1975-02-11', sexo: 'M', sangre: 'A+',
    direccion: '4a. calle 2-55, zona 2, Guatemala', procedencia: 'Jutiapa', telefonos: ['55667788'], emails: ['marco.perez.g@gmail.com'],
    contacto: { nombre: 'Lilian Gálvez', parentesco: 'Esposa', telefonos: ['55667789'] },
    social: { estadoCivil: 'Casado', ocupacion: 'Piloto de transporte', escolaridad: 'Secundaria', religion: 'Evangélica', etnia: 'Mestiza' },
    pesoKg: 88.0, tallaCm: 170,
    alergias: [], antecedentes: [{ tipo: 'Hábitos', descripcion: 'Consumo social de alcohol' }],
    cronicos: [], agudos: ['lumbalgia', 'gastritis'], en: ['hospital', 'odontologia'],
  },
  {
    clave: 'lbarrios', cui: '2378451290101', nombres: 'Lucía Fernanda', apellidos: 'Barrios Ochoa', nacimiento: '1988-10-05', sexo: 'F', sangre: 'O+',
    direccion: 'Condominio Los Álamos, apto. 3B, zona 16', procedencia: 'Guatemala, Guatemala', telefonos: ['31458870'], emails: ['lfbarrios@yahoo.com'],
    contacto: { nombre: 'Héctor Barrios', parentesco: 'Padre', telefonos: ['31458800'] },
    social: { estadoCivil: 'Soltera', ocupacion: 'Abogada', escolaridad: 'Universitaria', religion: 'Católica', etnia: 'Mestiza' },
    pesoKg: 64.0, tallaCm: 160,
    alergias: [], antecedentes: [{ tipo: 'Patológico', descripcion: 'Hipotiroidismo primario desde 2019' }],
    cronicos: ['hipotiroidismo'], agudos: ['cefalea'], en: ['hospital', 'laboratorio'],
  },
  {
    clave: 'pxicara', cui: '1899456320901', nombres: 'Pedro', apellidos: 'Xicará Batz', nacimiento: '1981-04-27', sexo: 'M', sangre: 'O+',
    direccion: 'Colonia Primero de Julio, zona 5, Mixco', procedencia: 'Quetzaltenango', telefonos: ['46012233'], emails: [],
    contacto: { nombre: 'María Batz', parentesco: 'Madre', telefonos: ['46012200'] },
    social: { estadoCivil: 'Unido', ocupacion: 'Albañil', escolaridad: 'Primaria completa', religion: 'Evangélica', etnia: 'Maya k’iche’' },
    pesoKg: 69.0, tallaCm: 162,
    alergias: [{ tipo: 'Ambiental', descripcion: 'Polvo de casa', severidad: 'MODERADA' }],
    antecedentes: [{ tipo: 'Patológico', descripcion: 'Asma desde la infancia' }, { tipo: 'Hábitos', descripcion: 'Exposición a humo de leña' }],
    cronicos: ['asma'], agudos: [], en: ['hospital', 'laboratorio', 'odontologia'],
  },
  {
    clave: 'jcux', cui: '1722365480701', nombres: 'Juana Isabel', apellidos: 'Cux Sicajá', nacimiento: '1970-12-08', sexo: 'F', sangre: 'O+',
    direccion: 'Cantón Xecaracoj, Sololá', procedencia: 'Sololá', telefonos: ['47785521'], emails: [],
    contacto: { nombre: 'Tomás Sicajá', parentesco: 'Hermano', telefonos: ['47785500'] },
    social: { estadoCivil: 'Casada', ocupacion: 'Tejedora', escolaridad: 'Sin escolaridad', religion: 'Católica', etnia: 'Maya kaqchikel' },
    pesoKg: 66.0, tallaCm: 148,
    alergias: [],
    antecedentes: [{ tipo: 'Patológico', descripcion: 'Hipertensión arterial' }, { tipo: 'Patológico', descripcion: 'Diabetes mellitus tipo 2' }, { tipo: 'Familiar', descripcion: 'Padre con enfermedad cerebrovascular' }],
    cronicos: ['hta-doble', 'dm2'], agudos: [], en: ['hospital', 'laboratorio'],
  },
  {
    clave: 'grecinos', cui: '3054127890101', nombres: 'Gabriela', apellidos: 'Recinos Paz', nacimiento: '1995-08-21', sexo: 'F', sangre: 'B+',
    direccion: '7a. avenida 9-20, zona 4, Guatemala', procedencia: 'Escuintla', telefonos: ['58123390'], emails: ['gaby.recinos@gmail.com'],
    contacto: { nombre: 'Rolando Recinos', parentesco: 'Padre', telefonos: ['58123300'] },
    social: { estadoCivil: 'Soltera', ocupacion: 'Diseñadora gráfica', escolaridad: 'Universitaria', religion: 'Católica', etnia: 'Mestiza' },
    pesoKg: 55.0, tallaCm: 161,
    alergias: [{ tipo: 'Medicamento', descripcion: 'Amoxicilina', severidad: 'MODERADA', med: 'amoxicilina' }],
    antecedentes: [],
    cronicos: [], agudos: ['rinitis', 'itu', 'faringo'], en: ['hospital', 'laboratorio', 'odontologia'],
  },
  {
    clave: 'oixcoy', cui: '1601234570901', nombres: 'Óscar', apellidos: 'Ixcoy Quiej', nacimiento: '1966-01-15', sexo: 'M', sangre: 'O+',
    direccion: 'Zona 3, San Juan Sacatepéquez', procedencia: 'San Juan Sacatepéquez', telefonos: ['42213344'], emails: [],
    social: { estadoCivil: 'Casado', ocupacion: 'Guardia de seguridad', escolaridad: 'Primaria completa', religion: 'Católica', etnia: 'Maya kaqchikel' },
    pesoKg: 79.0, tallaCm: 164,
    alergias: [], antecedentes: [{ tipo: 'Patológico', descripcion: 'Diabetes mellitus tipo 2' }],
    cronicos: ['dm2'], agudos: [], en: ['hospital'],
    baja: { hace: 40, motivo: 'Traslado al IGSS por afiliación laboral.' },
  },
  {
    clave: 'msolares', cui: '2510369870101', nombres: 'Mónica Alejandra', apellidos: 'Solares Lemus', nacimiento: '1979-03-30', sexo: 'F', sangre: 'A-',
    direccion: 'Boulevard Los Próceres 18-50, zona 10', procedencia: 'Guatemala, Guatemala', telefonos: ['59874412'], emails: ['monica.solares@gmail.com'],
    contacto: { nombre: 'Andrés Lemus', parentesco: 'Esposo', telefonos: ['59874400'] },
    social: { estadoCivil: 'Casada', ocupacion: 'Gerente de ventas', escolaridad: 'Universitaria', religion: 'Católica', etnia: 'Mestiza' },
    pesoKg: 63.0, tallaCm: 165,
    alergias: [], antecedentes: [{ tipo: 'Gineco-obstétrico', descripcion: 'G2 P2' }],
    cronicos: [], agudos: ['gastritis', 'cefalea'], en: ['hospital', 'laboratorio', 'odontologia'],
  },
  {
    clave: 'rarriaga', cui: '1500987650101', nombres: 'Ricardo', apellidos: 'Arriaga Villatoro', nacimiento: '1955-07-19', sexo: 'M', sangre: 'O+',
    direccion: 'Colonia Lourdes, zona 17, Guatemala', procedencia: 'Huehuetenango', telefonos: ['22567788', '50123344'], emails: ['r.arriaga55@gmail.com'],
    contacto: { nombre: 'Silvia Villatoro', parentesco: 'Hija', telefonos: ['50123345'] },
    social: { estadoCivil: 'Casado', ocupacion: 'Jubilado', escolaridad: 'Universitaria', religion: 'Católica', etnia: 'Mestiza' },
    pesoKg: 84.0, tallaCm: 171,
    alergias: [{ tipo: 'Medicamento', descripcion: 'Ácido acetilsalicílico', severidad: 'MODERADA', med: 'asa' }],
    antecedentes: [{ tipo: 'Patológico', descripcion: 'Hipertensión arterial' }, { tipo: 'Patológico', descripcion: 'Dislipidemia' }, { tipo: 'Quirúrgico', descripcion: 'Prostatectomía 2020' }],
    cronicos: ['hta', 'dislipidemia'], agudos: [], en: ['hospital', 'laboratorio'],
  },
  {
    clave: 'echoc', cui: '3298745611601', nombres: 'Elena', apellidos: 'Choc Caal', nacimiento: '2001-09-12', sexo: 'F', sangre: 'O+',
    direccion: 'Barrio San Vicente, Cobán, Alta Verapaz', procedencia: 'Cobán, Alta Verapaz', telefonos: ['33015566'], emails: [],
    contacto: { nombre: 'Rosa Caal', parentesco: 'Madre', telefonos: ['33015500'] },
    social: { estadoCivil: 'Soltera', ocupacion: 'Estudiante', escolaridad: 'Diversificado', religion: 'Evangélica', etnia: 'Maya q’eqchi’' },
    pesoKg: 52.0, tallaCm: 150,
    alergias: [], antecedentes: [],
    cronicos: [], agudos: ['itu', 'faringo'], en: ['hospital', 'laboratorio'],
  },
  {
    clave: 'msontay', cui: '1488523690801', nombres: 'Manuel de Jesús', apellidos: 'Sontay Coy', nacimiento: '1949-05-02', sexo: 'M', sangre: 'A+',
    direccion: 'Paraje Chiyax, Totonicapán', procedencia: 'Totonicapán', telefonos: ['48990011'], emails: [],
    contacto: { nombre: 'Francisco Sontay', parentesco: 'Hijo', telefonos: ['48990012'] },
    social: { estadoCivil: 'Viudo', ocupacion: 'Agricultor jubilado', escolaridad: 'Sin escolaridad', religion: 'Católica', etnia: 'Maya k’iche’' },
    pesoKg: 61.0, tallaCm: 158,
    alergias: [], antecedentes: [{ tipo: 'Patológico', descripcion: 'Hipertensión arterial' }, { tipo: 'Patológico', descripcion: 'Insuficiencia cardíaca' }],
    cronicos: ['hta-doble'], agudos: [], en: ['hospital'],
    baja: { hace: 12, motivo: 'Fallecimiento por causas naturales, reportado por la familia.' },
  },
  {
    clave: 'kmonzon', cui: '3089654120101', nombres: 'Karla Patricia', apellidos: 'Monzón Rivas', nacimiento: '1993-11-25', sexo: 'F', sangre: 'O+',
    direccion: '3a. calle 6-18, zona 1, Villa Canales', procedencia: 'Villa Canales', telefonos: ['57004455'], emails: ['karla.monzon93@hotmail.com'],
    contacto: { nombre: 'Patricia Rivas', parentesco: 'Madre', telefonos: ['57004400'] },
    social: { estadoCivil: 'Soltera', ocupacion: 'Enfermera auxiliar', escolaridad: 'Técnica', religion: 'Católica', etnia: 'Mestiza' },
    pesoKg: 60.0, tallaCm: 157,
    alergias: [], antecedentes: [],
    cronicos: [], agudos: ['chequeo', 'cefalea'], en: ['hospital', 'laboratorio', 'odontologia'],
  },
  {
    clave: 'ecifuentes', cui: '1923654780101', nombres: 'Edgar Rolando', apellidos: 'Cifuentes Mejía', nacimiento: '1972-06-09', sexo: 'M', sangre: 'B+',
    direccion: 'Colonia Venezuela, zona 21, Guatemala', procedencia: 'Zacapa', telefonos: ['45128899'], emails: [],
    contacto: { nombre: 'Gloria Mejía', parentesco: 'Esposa', telefonos: ['45128800'] },
    social: { estadoCivil: 'Casado', ocupacion: 'Mecánico', escolaridad: 'Secundaria', religion: 'Evangélica', etnia: 'Mestiza' },
    pesoKg: 86.0, tallaCm: 172,
    alergias: [{ tipo: 'Medicamento', descripcion: 'Diclofenaco', severidad: 'SEVERA', med: 'diclofenaco' }],
    antecedentes: [{ tipo: 'Traumático', descripcion: 'Hernia discal L4-L5 2018' }],
    cronicos: [], agudos: ['lumbalgia'], en: ['hospital', 'odontologia'],
  },
  {
    clave: 'cchavez', cui: '2645123980101', nombres: 'Claudia Marisol', apellidos: 'Chávez Ordóñez', nacimiento: '1983-02-17', sexo: 'F', sangre: 'O+',
    direccion: 'Lotificación El Carmen, lote 22, Santa Catarina Pinula', procedencia: 'Santa Catarina Pinula', telefonos: ['54781122'], emails: ['claudia.chavez@gmail.com'],
    contacto: { nombre: 'Rubén Ordóñez', parentesco: 'Esposo', telefonos: ['54781100'] },
    social: { estadoCivil: 'Casada', ocupacion: 'Secretaria', escolaridad: 'Diversificado', religion: 'Católica', etnia: 'Mestiza' },
    pesoKg: 71.0, tallaCm: 156,
    alergias: [{ tipo: 'Alimento', descripcion: 'Maní', severidad: 'SEVERA' }],
    antecedentes: [{ tipo: 'Patológico', descripcion: 'Hipotiroidismo' }],
    cronicos: ['hipotiroidismo'], agudos: ['rinitis'], en: ['hospital', 'laboratorio', 'odontologia'],
  },
  {
    clave: 'vtzoc', cui: '3125478960901', nombres: 'Víctor Hugo', apellidos: 'Tzoc Ajanel', nacimiento: '1990-01-30', sexo: 'M', sangre: 'O+',
    direccion: 'Zona 1, Salcajá, Quetzaltenango', procedencia: 'Quetzaltenango', telefonos: ['30987766'], emails: ['victor.tzoc@gmail.com'],
    contacto: { nombre: 'Elvira Ajanel', parentesco: 'Madre', telefonos: ['30987700'] },
    social: { estadoCivil: 'Soltero', ocupacion: 'Programador', escolaridad: 'Universitaria', religion: 'Ninguna', etnia: 'Maya k’iche’' },
    pesoKg: 72.0, tallaCm: 168,
    alergias: [], antecedentes: [],
    cronicos: [], agudos: ['faringo'], en: ['hospital', 'laboratorio'],
  },
  {
    clave: 'bcastaneda', cui: '3301987450101', nombres: 'Brenda Lorena', apellidos: 'Castañeda Fuentes', nacimiento: '1997-04-04', sexo: 'F', sangre: 'A+',
    direccion: '15 avenida 3-40, zona 13, Guatemala', procedencia: 'Guatemala, Guatemala', telefonos: ['58889911'], emails: ['brenda.castaneda@gmail.com'],
    social: { estadoCivil: 'Soltera', ocupacion: 'Mesera', escolaridad: 'Diversificado', religion: 'Evangélica', etnia: 'Mestiza' },
    pesoKg: 57.0, tallaCm: 159,
    alergias: [], antecedentes: [],
    cronicos: [], agudos: ['gastritis'], en: ['hospital', 'odontologia'],
  },
  // Solo en la clínica odontológica (agenda de hoy del prototipo).
  {
    clave: 'dmonterroso', cui: '3045879120101', nombres: 'Diana', apellidos: 'Monterroso Salguero', nacimiento: '1994-07-07', sexo: 'F', sangre: 'O+',
    direccion: '6a. avenida 10-11, zona 9, Guatemala', procedencia: 'Guatemala, Guatemala', telefonos: ['51236654'], emails: ['diana.monterroso@gmail.com'],
    social: { estadoCivil: 'Soltera', ocupacion: 'Psicóloga', escolaridad: 'Universitaria', religion: 'Católica', etnia: 'Mestiza' },
    pesoKg: 56, tallaCm: 160, alergias: [], antecedentes: [], cronicos: [], agudos: [], en: ['odontologia'],
  },
  {
    clave: 'korozco', cui: '3578412360101', nombres: 'Kevin Alexander', apellidos: 'Orozco Bámaca', nacimiento: '2004-02-14', sexo: 'M', sangre: 'B+',
    direccion: 'Colonia Bethania, zona 7, Guatemala', procedencia: 'Guatemala, Guatemala', telefonos: ['30451278'], emails: [],
    contacto: { nombre: 'Gladys Bámaca', parentesco: 'Madre', telefonos: ['30451200'] },
    social: { estadoCivil: 'Soltero', ocupacion: 'Estudiante', escolaridad: 'Universitaria en curso', religion: 'Católica', etnia: 'Mestiza' },
    pesoKg: 68, tallaCm: 172, alergias: [], antecedentes: [], cronicos: [], agudos: [], en: ['odontologia'],
  },
  {
    clave: 'plima', cui: '3201457890101', nombres: 'Paola', apellidos: 'Lima Estrada', nacimiento: '1998-12-01', sexo: 'F', sangre: 'A+',
    direccion: 'Residenciales Atlántida, zona 18', procedencia: 'Guatemala, Guatemala', telefonos: ['55331122'], emails: ['paola.lima98@gmail.com'],
    social: { estadoCivil: 'Soltera', ocupacion: 'Cajera bancaria', escolaridad: 'Universitaria en curso', religion: 'Evangélica', etnia: 'Mestiza' },
    pesoKg: 54, tallaCm: 158,
    alergias: [{ tipo: 'Medicamento', descripcion: 'Penicilina', severidad: 'MODERADA', med: 'amoxicilina' }],
    antecedentes: [], cronicos: [], agudos: [], en: ['odontologia'],
  },
  {
    clave: 'hramirez', cui: '2789654120101', nombres: 'Héctor', apellidos: 'Ramírez Solís', nacimiento: '1987-09-23', sexo: 'M', sangre: 'B+',
    direccion: 'Carretera a El Salvador km 14, Condado Concepción', procedencia: 'Guatemala, Guatemala', telefonos: ['42001188'], emails: ['hector.ramirez@gmail.com'],
    social: { estadoCivil: 'Casado', ocupacion: 'Arquitecto', escolaridad: 'Universitaria', religion: 'Católica', etnia: 'Mestiza' },
    pesoKg: 80, tallaCm: 178, alergias: [], antecedentes: [{ tipo: 'Patológico', descripcion: 'Bruxismo nocturno' }], cronicos: [], agudos: [], en: ['odontologia'],
  },
  {
    clave: 'avelasquez', cui: '3645201780101', nombres: 'Andrea', apellidos: 'Velásquez Morán', nacimiento: '2008-05-16', sexo: 'F', sangre: 'O+',
    direccion: '2a. calle 14-25, zona 14, Guatemala', procedencia: 'Guatemala, Guatemala', telefonos: ['59001234'], emails: [],
    contacto: { nombre: 'Lorena Morán de Velásquez', parentesco: 'Madre', telefonos: ['59001200'] },
    social: { estadoCivil: 'Soltera', ocupacion: 'Estudiante', escolaridad: 'Diversificado en curso', religion: 'Católica', etnia: 'Mestiza' },
    pesoKg: 52, tallaCm: 160, alergias: [], antecedentes: [], cronicos: [], agudos: [], en: ['odontologia'],
  },
];

/* -------------------------------------------------------------------------- */
/* Centro pediátrico                                                           */
/* -------------------------------------------------------------------------- */

export interface Nino {
  clave: string;
  cui: string | null;
  nombres: string;
  apellidos: string;
  nacimiento: string;
  sexo: 'F' | 'M';
  sangre: string | null;
  direccion: string;
  /** Desvío z constante respecto de la mediana OMS (peso y talla). */
  zPeso: number;
  zTalla: number;
  responsables: { nombre: string; cui: string | null; parentesco: string; tutor: boolean; telefonos: string[] }[];
  alergias: Alergia[];
  antecedentes: Antecedente[];
  casos: string[];
  /** Vacunas (por nombre) cuya última dosis vencida no se aplicó. */
  pendientes?: string[];
  /** Persona que también es paciente del laboratorio (mismo CUI). */
  enLaboratorio?: boolean;
  baja?: { hace: number; motivo: string };
}

const nacio = (meses: number, dias = 0) => sumarDias(sumarMeses(HOY, -meses), -dias);

export const NINOS: Nino[] = [
  {
    clave: 'mjuarez', cui: '4012365470101', nombres: 'Mateo', apellidos: 'Juárez Coc', nacimiento: nacio(67, 9), sexo: 'M', sangre: 'O+',
    direccion: 'Colonia La Florida, 18 calle 3-10, zona 19', zPeso: 0.3, zTalla: 0.1,
    responsables: [
      { nombre: 'Andrea Coc de Juárez', cui: '2890123450101', parentesco: 'Madre', tutor: true, telefonos: ['55124479'] },
      { nombre: 'Rodrigo Juárez', cui: '2678451230101', parentesco: 'Padre', tutor: true, telefonos: ['55124480'] },
    ],
    alergias: [], antecedentes: [{ tipo: 'Patológico', descripcion: 'Otitis media recurrente (3 episodios en 2025)' }],
    casos: ['otitis', 'rinofaringitis'], enLaboratorio: true,
  },
  {
    clave: 'vlopez', cui: '4123698520101', nombres: 'Valentina', apellidos: 'López Ajú', nacimiento: nacio(38, 4), sexo: 'F', sangre: 'A+',
    direccion: '9a. avenida 4-22, zona 5, Mixco', zPeso: -0.4, zTalla: -0.2,
    responsables: [{ nombre: 'Marta Ajú de López', cui: '2412589630101', parentesco: 'Madre', tutor: true, telefonos: ['50017788'] }],
    alergias: [], antecedentes: [], casos: ['rinofaringitis', 'diarrea'],
  },
  {
    clave: 'shernandez-c', cui: '4256987410101', nombres: 'Santiago', apellidos: 'Hernández Cutz', nacimiento: nacio(8, 12), sexo: 'M', sangre: 'O+',
    direccion: 'Aldea El Rodeo, San José Pinula', zPeso: -1.1, zTalla: -0.8,
    responsables: [{ nombre: 'Lidia Cutz', cui: '3012547890101', parentesco: 'Madre', tutor: true, telefonos: ['46019988'] }],
    alergias: [], antecedentes: [{ tipo: 'Patológico', descripcion: 'Prematuro de 35 semanas, peso al nacer 2.2 kg' }],
    casos: ['rinofaringitis'], pendientes: ['Pentavalente (DPT-HepB-Hib)', 'Polio (IPV/bOPV)'],
  },
  {
    clave: 'creyes', cui: '4198745630101', nombres: 'Camila Fernanda', apellidos: 'Reyes Monzón', nacimiento: nacio(25, 3), sexo: 'F', sangre: 'B+',
    direccion: 'Residenciales San Cristóbal, sector B2, Mixco', zPeso: 0.6, zTalla: 0.4,
    responsables: [{ nombre: 'Fernanda Monzón', cui: '2987456120101', parentesco: 'Madre', tutor: true, telefonos: ['55783322'] }],
    alergias: [], antecedentes: [], casos: ['diarrea'],
  },
  {
    clave: 'dtum', cui: '4087456320101', nombres: 'Diego Alejandro', apellidos: 'Tum Pérez', nacimiento: nacio(50, 20), sexo: 'M', sangre: 'O+',
    direccion: 'Colonia El Limón, zona 18', zPeso: 0.0, zTalla: -0.3,
    responsables: [
      { nombre: 'Gloria Pérez de Tum', cui: '2501478960101', parentesco: 'Madre', tutor: true, telefonos: ['52219900'] },
      { nombre: 'Esperanza Pérez', cui: null, parentesco: 'Abuela', tutor: false, telefonos: ['52219901'] },
    ],
    alergias: [{ tipo: 'Medicamento', descripcion: 'Amoxicilina (exantema)', severidad: 'LEVE', med: 'amoxicilina-susp' }],
    antecedentes: [{ tipo: 'Patológico', descripcion: 'Sibilancias recurrentes' }, { tipo: 'Familiar', descripcion: 'Padre asmático' }],
    casos: ['sibilancias', 'otitis'],
  },
  {
    clave: 'isic', cui: '3956871230101', nombres: 'Isabella', apellidos: 'Sic Morales', nacimiento: nacio(123, 5), sexo: 'F', sangre: 'A+',
    direccion: '2a. calle 11-08, zona 3, Guatemala', zPeso: 0.9, zTalla: 0.5,
    responsables: [{ nombre: 'Patricia Morales', cui: '2745896310101', parentesco: 'Madre', tutor: true, telefonos: ['31120044'] }],
    alergias: [], antecedentes: [], casos: ['dermatitis', 'nino-sano'],
  },
  {
    clave: 'sgarcia', cui: '4301258740101', nombres: 'Sebastián', apellidos: 'García Batz', nacimiento: nacio(14, 2), sexo: 'M', sangre: 'O+',
    direccion: 'Colonia Santa Marta, zona 19, Mixco', zPeso: 0.2, zTalla: 0.6,
    responsables: [{ nombre: 'Ana Batz', cui: '3101452870101', parentesco: 'Madre', tutor: true, telefonos: ['47712233'] }],
    alergias: [], antecedentes: [], casos: ['rinofaringitis'],
  },
  {
    clave: 'mcabrera', cui: '4012547850101', nombres: 'Mía Alejandra', apellidos: 'Cabrera Lima', nacimiento: nacio(74, 15), sexo: 'F', sangre: 'B-',
    direccion: '13 avenida 6-50, zona 12, Guatemala', zPeso: -0.2, zTalla: 0.0,
    responsables: [{ nombre: 'Julio Cabrera', cui: '2678912340101', parentesco: 'Padre', tutor: true, telefonos: ['58440011'] }],
    alergias: [{ tipo: 'Alimento', descripcion: 'Huevo', severidad: 'LEVE' }], antecedentes: [], casos: ['parasitosis', 'nino-sano'],
  },
  {
    clave: 'exoy', cui: '4401236980101', nombres: 'Emiliano', apellidos: 'Xoy Choc', nacimiento: nacio(3, 6), sexo: 'M', sangre: null,
    direccion: 'Zona 6, Chinautla', zPeso: 0.1, zTalla: 0.2,
    responsables: [{ nombre: 'Rosa Choc', cui: '3256984170101', parentesco: 'Madre', tutor: true, telefonos: ['30558877'] }],
    alergias: [], antecedentes: [{ tipo: 'Patológico', descripcion: 'Ictericia neonatal tratada con fototerapia' }], casos: [],
  },
  {
    clave: 'xorellana', cui: '3987456210101', nombres: 'Ximena', apellidos: 'Orellana Paz', nacimiento: nacio(87, 1), sexo: 'F', sangre: 'O+',
    direccion: 'Condominio Valle del Sol, casa 31, Villa Nueva', zPeso: 1.2, zTalla: 0.3,
    responsables: [{ nombre: 'Mariela Paz de Orellana', cui: '2854123670101', parentesco: 'Madre', tutor: true, telefonos: ['55882244'] }],
    alergias: [{ tipo: 'Ambiental', descripcion: 'Ácaros del polvo', severidad: 'MODERADA' }],
    antecedentes: [{ tipo: 'Patológico', descripcion: 'Dermatitis atópica' }], casos: ['dermatitis'],
  },
  {
    clave: 'gcoyoy', cui: '3874512690901', nombres: 'Gael', apellidos: 'Coyoy Tzoc', nacimiento: nacio(108, 18), sexo: 'M', sangre: 'O+',
    direccion: 'Zona 1, Mixco', zPeso: -0.9, zTalla: -1.2,
    responsables: [{ nombre: 'Felipe Coyoy', cui: '2456321780901', parentesco: 'Padre', tutor: true, telefonos: ['48451122'] }],
    alergias: [], antecedentes: [], casos: ['parasitosis'],
  },
  {
    clave: 'lbarrios-c', cui: '3745896120101', nombres: 'Luciana', apellidos: 'Barrios Chávez', nacimiento: nacio(130, 10), sexo: 'F', sangre: 'A+',
    direccion: '5a. calle 2-14, zona 10, Guatemala', zPeso: 0.4, zTalla: 0.8,
    responsables: [{ nombre: 'Héctor Barrios', cui: '1987452360101', parentesco: 'Abuelo', tutor: true, telefonos: ['31458800'] }],
    alergias: [], antecedentes: [], casos: ['nino-sano'], pendientes: ['VPH'],
  },
  {
    clave: 'dpac', cui: '4078965410901', nombres: 'Daniel Estuardo', apellidos: 'Pac Quiché', nacimiento: nacio(62, 7), sexo: 'M', sangre: 'O+',
    direccion: 'Zona 3, Quetzaltenango', zPeso: -0.3, zTalla: -0.5,
    responsables: [{ nombre: 'Irma Quiché', cui: '2789651230901', parentesco: 'Madre', tutor: true, telefonos: ['46337788'] }],
    alergias: [], antecedentes: [], casos: ['rinofaringitis'],
    baja: { hace: 25, motivo: 'La familia se trasladó a Quetzaltenango; continúa control en otro centro.' },
  },
  {
    clave: 'sajanel', cui: '4356987120101', nombres: 'Sara Lucía', apellidos: 'Ajanel Ixcoy', nacimiento: nacio(18, 9), sexo: 'F', sangre: 'O+',
    direccion: 'Colonia Carolingia, zona 6, Mixco', zPeso: -0.6, zTalla: -0.1,
    responsables: [{ nombre: 'Juan Ajanel', cui: '2654781230101', parentesco: 'Padre', tutor: true, telefonos: ['59873344'] }],
    alergias: [], antecedentes: [], casos: ['diarrea'],
  },
  {
    clave: 'mcaal', cui: '4256312870101', nombres: 'Matías', apellidos: 'Caal Coc', nacimiento: nacio(30, 25), sexo: 'M', sangre: 'O+',
    direccion: 'Asentamiento El Esfuerzo, zona 7', zPeso: -1.6, zTalla: -1.4,
    responsables: [{ nombre: 'Marta Coc', cui: '3301256980101', parentesco: 'Madre', tutor: true, telefonos: ['30124455'] }],
    alergias: [], antecedentes: [{ tipo: 'Patológico', descripcion: 'Desnutrición aguda moderada en 2025, recuperado' }],
    casos: ['diarrea', 'parasitosis'],
  },
  {
    clave: 'rmejia', cui: '4145236980101', nombres: 'Renata', apellidos: 'Mejía Solares', nacimiento: nacio(50, 2), sexo: 'F', sangre: 'AB+',
    direccion: '1a. avenida 8-90, zona 15, Guatemala', zPeso: 0.5, zTalla: 1.0,
    responsables: [{ nombre: 'Daniela Solares', cui: '2701459630101', parentesco: 'Madre', tutor: true, telefonos: ['55440099'] }],
    alergias: [], antecedentes: [], casos: ['rinofaringitis', 'nino-sano'],
  },
];

/* -------------------------------------------------------------------------- */
/* Personal por institución                                                    */
/* -------------------------------------------------------------------------- */

export const DEPARTAMENTOS = [
  { nombre: 'Medicina interna', ubicacion: 'Edificio A, 2.º nivel', extension: '2101' },
  { nombre: 'Cirugía', ubicacion: 'Edificio B, 3.er nivel', extension: '2301' },
  { nombre: 'Ginecología y obstetricia', ubicacion: 'Edificio C, 1.er nivel', extension: '2401' },
  { nombre: 'Emergencias', ubicacion: 'Edificio A, 1.er nivel', extension: '2001' },
  { nombre: 'Consulta externa', ubicacion: 'Edificio D, 1.er nivel', extension: '2501' },
];

export const ESPECIALIDADES = [
  { nombre: 'Medicina interna', departamento: 'Medicina interna', descripcion: 'Diagnóstico y tratamiento no quirúrgico de enfermedades del adulto.' },
  { nombre: 'Cardiología', departamento: 'Medicina interna', descripcion: 'Enfermedades del corazón y de los vasos sanguíneos.' },
  { nombre: 'Endocrinología', departamento: 'Medicina interna', descripcion: 'Diabetes, tiroides y otras enfermedades hormonales.' },
  { nombre: 'Neumología', departamento: 'Medicina interna', descripcion: 'Enfermedades del aparato respiratorio.' },
  { nombre: 'Cirugía general', departamento: 'Cirugía', descripcion: 'Cirugía abdominal, de pared y de tejidos blandos.' },
  { nombre: 'Ginecología', departamento: 'Ginecología y obstetricia', descripcion: 'Salud reproductiva y control prenatal.' },
  { nombre: 'Medicina de emergencias', departamento: 'Emergencias', descripcion: 'Atención de urgencias y estabilización.' },
  { nombre: 'Medicina general', departamento: 'Consulta externa', descripcion: 'Atención primaria y referencia a especialidades.' },
];

export interface Profesional { clave: string; nombres: string; apellidos: string; colegiado: string | null; especialidades: string[]; rol: string }

export const MEDICOS_HOSPITAL: Profesional[] = [
  { clave: 'aperez', nombres: 'Ana Lucía', apellidos: 'Pérez', colegiado: 'COL-10234', especialidades: ['Medicina interna', 'Medicina general'], rol: 'MEDICO' },
  { clave: 'cmendez', nombres: 'Carlos', apellidos: 'Méndez Arriola', colegiado: 'COL-11872', especialidades: ['Cardiología', 'Medicina interna'], rol: 'MEDICO' },
  { clave: 'snatareno', nombres: 'Silvia', apellidos: 'Natareno Ruiz', colegiado: 'COL-13021', especialidades: ['Endocrinología', 'Medicina interna'], rol: 'MEDICO' },
  { clave: 'jochoa', nombres: 'Julio César', apellidos: 'Ochoa Rivas', colegiado: 'COL-8743', especialidades: ['Neumología'], rol: 'MEDICO' },
  { clave: 'restrada', nombres: 'Rodrigo', apellidos: 'Estrada Fuentes', colegiado: 'COL-12455', especialidades: ['Cirugía general'], rol: 'MEDICO' },
  { clave: 'plemus', nombres: 'Patricia', apellidos: 'Lemus Girón', colegiado: 'COL-9876', especialidades: ['Ginecología'], rol: 'MEDICO' },
  { clave: 'mbarillas', nombres: 'Mario', apellidos: 'Barillas Toledo', colegiado: 'COL-14590', especialidades: ['Medicina de emergencias', 'Medicina general'], rol: 'MEDICO' },
];

export const PEDIATRAS: Profesional[] = [
  { clave: 'jcastillo', nombres: 'Jorge', apellidos: 'Castillo', colegiado: 'COL-20871', especialidades: ['Pediatría'], rol: 'MEDICO' },
  { clave: 'lmendoza', nombres: 'Lucía', apellidos: 'Mendoza Arévalo', colegiado: 'COL-21544', especialidades: ['Pediatría', 'Neonatología'], rol: 'MEDICO' },
  { clave: 'abatres', nombres: 'Andrés', apellidos: 'Batres Quan', colegiado: 'COL-22310', especialidades: ['Pediatría', 'Neumología pediátrica'], rol: 'MEDICO' },
];

export const PERSONAL_LABORATORIO: Profesional[] = [
  { clave: 'msic', nombres: 'Marta', apellidos: 'Sic', colegiado: 'QB-1450', especialidades: ['Química biológica', 'Hematología'], rol: 'QUIMICO_BIOLOGO' },
  { clave: 'itoc', nombres: 'Ingrid', apellidos: 'Toc Yax', colegiado: 'QB-1622', especialidades: ['Química biológica', 'Microbiología'], rol: 'QUIMICO_BIOLOGO' },
  { clave: 'rgodoy', nombres: 'Raúl', apellidos: 'Godoy Pineda', colegiado: 'COL-14211', especialidades: ['Patología clínica'], rol: 'MEDICO' },
  { clave: 'emerida', nombres: 'Elisa', apellidos: 'Mérida Castro', colegiado: 'COL-15890', especialidades: ['Medicina de laboratorio'], rol: 'MEDICO' },
];

export const PERSONAL_ODONTOLOGIA: Profesional[] = [
  { clave: 'fcastillo', nombres: 'Fernando', apellidos: 'Castillo', colegiado: 'COL-OD-3021', especialidades: ['Odontología general'], rol: 'ODONTOLOGO' },
  { clave: 'crosales', nombres: 'Carmen', apellidos: 'Rosales Juárez', colegiado: 'COL-OD-3388', especialidades: ['Ortodoncia'], rol: 'ODONTOLOGO' },
  { clave: 'mvela', nombres: 'Mauricio', apellidos: 'Vela Recinos', colegiado: 'COL-OD-3540', especialidades: ['Endodoncia', 'Odontología general'], rol: 'ODONTOLOGO' },
  { clave: 'spac', nombres: 'Silvia', apellidos: 'Pac', colegiado: null, especialidades: [], rol: 'SECRETARIA' },
];
