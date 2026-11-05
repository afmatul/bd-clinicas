/**
 * Catálogos compartidos por las cuatro instituciones: medicamentos y casos clínicos.
 * Cada institución toma de aquí lo que usa; las instituciones no comparten datos en tiempo de ejecución.
 */

export interface MedicamentoSemilla {
  clave: string;
  nombre: string;
  presentacion: string;
  concentracion: string;
  /** Familia para cruzar con alergias (no se guarda). */
  grupo?: 'penicilina' | 'aine' | 'sulfa' | 'macrolido';
}

export const MEDICAMENTOS_ADULTO: MedicamentoSemilla[] = [
  { clave: 'losartan', nombre: 'Losartán', presentacion: 'Tableta', concentracion: '50 mg' },
  { clave: 'hctz', nombre: 'Hidroclorotiazida', presentacion: 'Tableta', concentracion: '12.5 mg' },
  { clave: 'amlodipino', nombre: 'Amlodipino', presentacion: 'Tableta', concentracion: '5 mg' },
  { clave: 'enalapril', nombre: 'Enalapril', presentacion: 'Tableta', concentracion: '10 mg' },
  { clave: 'metformina', nombre: 'Metformina', presentacion: 'Tableta', concentracion: '850 mg' },
  { clave: 'glibenclamida', nombre: 'Glibenclamida', presentacion: 'Tableta', concentracion: '5 mg' },
  { clave: 'atorvastatina', nombre: 'Atorvastatina', presentacion: 'Tableta', concentracion: '20 mg' },
  { clave: 'levotiroxina', nombre: 'Levotiroxina', presentacion: 'Tableta', concentracion: '50 mcg' },
  { clave: 'asa', nombre: 'Ácido acetilsalicílico', presentacion: 'Tableta', concentracion: '100 mg', grupo: 'aine' },
  { clave: 'omeprazol', nombre: 'Omeprazol', presentacion: 'Cápsula', concentracion: '20 mg' },
  { clave: 'acetaminofen', nombre: 'Acetaminofén', presentacion: 'Tableta', concentracion: '500 mg' },
  { clave: 'ibuprofeno', nombre: 'Ibuprofeno', presentacion: 'Tableta', concentracion: '400 mg', grupo: 'aine' },
  { clave: 'diclofenaco', nombre: 'Diclofenaco sódico', presentacion: 'Tableta', concentracion: '50 mg', grupo: 'aine' },
  { clave: 'naproxeno', nombre: 'Naproxeno', presentacion: 'Tableta', concentracion: '550 mg', grupo: 'aine' },
  { clave: 'amoxicilina', nombre: 'Amoxicilina', presentacion: 'Cápsula', concentracion: '500 mg', grupo: 'penicilina' },
  { clave: 'penicilina-benzatinica', nombre: 'Penicilina G benzatínica', presentacion: 'Polvo para suspensión inyectable', concentracion: '1 200 000 UI', grupo: 'penicilina' },
  { clave: 'azitromicina', nombre: 'Azitromicina', presentacion: 'Tableta', concentracion: '500 mg', grupo: 'macrolido' },
  { clave: 'ciprofloxacino', nombre: 'Ciprofloxacino', presentacion: 'Tableta', concentracion: '500 mg' },
  { clave: 'nitrofurantoina', nombre: 'Nitrofurantoína', presentacion: 'Cápsula', concentracion: '100 mg' },
  { clave: 'tmp-smx', nombre: 'Trimetoprim/sulfametoxazol', presentacion: 'Tableta', concentracion: '160/800 mg', grupo: 'sulfa' },
  { clave: 'metronidazol', nombre: 'Metronidazol', presentacion: 'Tableta', concentracion: '500 mg' },
  { clave: 'loratadina', nombre: 'Loratadina', presentacion: 'Tableta', concentracion: '10 mg' },
  { clave: 'salbutamol', nombre: 'Salbutamol', presentacion: 'Inhalador', concentracion: '100 mcg/dosis' },
  { clave: 'beclometasona', nombre: 'Beclometasona', presentacion: 'Inhalador', concentracion: '250 mcg/dosis' },
  { clave: 'tramadol', nombre: 'Tramadol', presentacion: 'Cápsula', concentracion: '50 mg' },
  { clave: 'furosemida', nombre: 'Furosemida', presentacion: 'Tableta', concentracion: '40 mg' },
  { clave: 'sulfato-ferroso', nombre: 'Sulfato ferroso', presentacion: 'Tableta', concentracion: '300 mg' },
  { clave: 'calcio-vitd', nombre: 'Carbonato de calcio + vitamina D3', presentacion: 'Tableta', concentracion: '600 mg/400 UI' },
];

export const MEDICAMENTOS_PEDIATRICO: MedicamentoSemilla[] = [
  { clave: 'acetaminofen-jarabe', nombre: 'Acetaminofén', presentacion: 'Jarabe 160 mg/5 mL', concentracion: '160 mg/5 mL' },
  { clave: 'acetaminofen-gotas', nombre: 'Acetaminofén', presentacion: 'Gotas 100 mg/mL', concentracion: '100 mg/mL' },
  { clave: 'ibuprofeno-susp', nombre: 'Ibuprofeno', presentacion: 'Suspensión 100 mg/5 mL', concentracion: '100 mg/5 mL', grupo: 'aine' },
  { clave: 'amoxicilina-susp', nombre: 'Amoxicilina', presentacion: 'Suspensión 250 mg/5 mL', concentracion: '250 mg/5 mL', grupo: 'penicilina' },
  { clave: 'amoxi-clav-susp', nombre: 'Amoxicilina + ácido clavulánico', presentacion: 'Suspensión 400/57 mg/5 mL', concentracion: '400/57 mg/5 mL', grupo: 'penicilina' },
  { clave: 'azitromicina-susp', nombre: 'Azitromicina', presentacion: 'Suspensión 200 mg/5 mL', concentracion: '200 mg/5 mL', grupo: 'macrolido' },
  { clave: 'salbutamol-jarabe', nombre: 'Salbutamol', presentacion: 'Jarabe 2 mg/5 mL', concentracion: '2 mg/5 mL' },
  { clave: 'salbutamol-inh', nombre: 'Salbutamol', presentacion: 'Inhalador 100 mcg/dosis con espaciador', concentracion: '100 mcg/dosis' },
  { clave: 'sro', nombre: 'Sales de rehidratación oral', presentacion: 'Sobre para 1 litro', concentracion: '75 mEq/L sodio' },
  { clave: 'zinc', nombre: 'Sulfato de zinc', presentacion: 'Jarabe 20 mg/5 mL', concentracion: '20 mg/5 mL' },
  { clave: 'loratadina-jarabe', nombre: 'Loratadina', presentacion: 'Jarabe 5 mg/5 mL', concentracion: '5 mg/5 mL' },
  { clave: 'cetirizina-gotas', nombre: 'Cetirizina', presentacion: 'Gotas 10 mg/mL', concentracion: '10 mg/mL' },
  { clave: 'sulfato-ferroso-gotas', nombre: 'Sulfato ferroso', presentacion: 'Gotas 125 mg/mL', concentracion: '125 mg/mL' },
  { clave: 'albendazol-susp', nombre: 'Albendazol', presentacion: 'Suspensión 400 mg/10 mL', concentracion: '400 mg/10 mL' },
  { clave: 'nistatina-susp', nombre: 'Nistatina', presentacion: 'Suspensión 100 000 UI/mL', concentracion: '100 000 UI/mL' },
  { clave: 'hidrocortisona-crema', nombre: 'Hidrocortisona', presentacion: 'Crema 1 %', concentracion: '1 %' },
  { clave: 'vitamina-a', nombre: 'Vitamina A', presentacion: 'Cápsula 200 000 UI', concentracion: '200 000 UI' },
  { clave: 'penicilina-benzatinica', nombre: 'Penicilina G benzatínica', presentacion: 'Polvo para suspensión inyectable 600 000 UI', concentracion: '600 000 UI', grupo: 'penicilina' },
];

export const MEDICAMENTOS_ODONTOLOGIA: MedicamentoSemilla[] = [
  { clave: 'amoxicilina', nombre: 'Amoxicilina', presentacion: 'Cápsula', concentracion: '500 mg', grupo: 'penicilina' },
  { clave: 'clindamicina', nombre: 'Clindamicina', presentacion: 'Cápsula', concentracion: '300 mg' },
  { clave: 'ibuprofeno', nombre: 'Ibuprofeno', presentacion: 'Tableta', concentracion: '600 mg', grupo: 'aine' },
  { clave: 'ketorolaco', nombre: 'Ketorolaco', presentacion: 'Tableta sublingual', concentracion: '10 mg', grupo: 'aine' },
  { clave: 'acetaminofen', nombre: 'Acetaminofén', presentacion: 'Tableta', concentracion: '500 mg' },
  { clave: 'clorhexidina', nombre: 'Clorhexidina', presentacion: 'Enjuague bucal', concentracion: '0.12 %' },
  { clave: 'lidocaina', nombre: 'Lidocaína con epinefrina', presentacion: 'Cartucho dental 1.8 mL', concentracion: '2 % / 1:100 000' },
  { clave: 'fluoruro', nombre: 'Fluoruro de sodio', presentacion: 'Barniz', concentracion: '5 %' },
  { clave: 'metronidazol', nombre: 'Metronidazol', presentacion: 'Tableta', concentracion: '500 mg' },
  { clave: 'benzocaina', nombre: 'Benzocaína', presentacion: 'Gel tópico', concentracion: '20 %' },
];

/* -------------------------------------------------------------------------- */
/* Casos clínicos de adultos (hospital y laboratorio)                          */
/* -------------------------------------------------------------------------- */

export interface Renglon {
  med: string; // clave del catálogo
  dosis: string;
  via: string;
  frecuencia: number | null;
  dias: number | null;
  cantidad: number | null;
  indicaciones?: string;
}

export interface Caso {
  clave: string;
  motivo: string;
  hea: string;
  dx: string;
  tipoDx: 'PRESUNTIVO' | 'DEFINITIVO';
  obsDx?: string;
  tratamiento: { tipo: string; descripcion: string; indicaciones: string; dias: number | null };
  receta: Renglon[];
  /** Alternativa si el paciente es alérgico al grupo indicado. */
  alternativa?: { grupo: NonNullable<MedicamentoSemilla['grupo']>; receta: Renglon[] };
  signos: 'normal' | 'hta' | 'fiebre' | 'respiratorio' | 'dolor';
  evolucion: string;
}

export const CASOS: Record<string, Caso> = {
  hta: {
    clave: 'hta',
    motivo: 'Control de hipertensión',
    hea: 'Paciente con hipertensión arterial en tratamiento. Refiere buena adherencia, sin cefalea, visión borrosa ni dolor torácico. Dieta baja en sodio parcialmente.',
    dx: 'Hipertensión arterial esencial (I10)', tipoDx: 'DEFINITIVO',
    obsDx: 'Cifras tensionales cercanas a la meta; continuar esquema.',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Antihipertensivo de mantenimiento', indicaciones: 'Dieta hiposódica, caminar 30 minutos diarios, control de presión en casa.', dias: 90 },
    receta: [{ med: 'losartan', dosis: '1 tableta', via: 'Oral', frecuencia: 24, dias: 90, cantidad: 90, indicaciones: 'Por la mañana.' }],
    signos: 'hta',
    evolucion: 'Evolución estable. Se refuerzan medidas no farmacológicas. Control en 3 meses.',
  },
  'hta-doble': {
    clave: 'hta-doble',
    motivo: 'Control de hipertensión',
    hea: 'Hipertensión de difícil control con monoterapia. Registros en casa entre 140 y 150 de sistólica.',
    dx: 'Hipertensión arterial esencial (I10)', tipoDx: 'DEFINITIVO',
    obsDx: 'No alcanza meta con losartán solo; se agrega diurético.',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Terapia combinada ARA II + tiazida', indicaciones: 'Restringir sal, control de electrolitos en 1 mes.', dias: 90 },
    receta: [
      { med: 'losartan', dosis: '1 tableta', via: 'Oral', frecuencia: 24, dias: 90, cantidad: 90, indicaciones: 'Por la mañana.' },
      { med: 'hctz', dosis: '1 tableta', via: 'Oral', frecuencia: 24, dias: 90, cantidad: 90, indicaciones: 'Junto con losartán.' },
    ],
    signos: 'hta',
    evolucion: 'Se ajusta tratamiento. Control en 4 semanas con electrolitos.',
  },
  dm2: {
    clave: 'dm2',
    motivo: 'Control de diabetes',
    hea: 'Diabetes mellitus tipo 2 en tratamiento con metformina. Glucometrías en ayunas entre 120 y 150 mg/dL. Niega poliuria y polidipsia.',
    dx: 'Diabetes mellitus tipo 2 sin complicaciones (E11.9)', tipoDx: 'DEFINITIVO',
    obsDx: 'HbA1c pendiente de laboratorio.',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Hipoglucemiante oral', indicaciones: 'Plan de alimentación, revisión de pies diaria, glucometría en ayunas 3 veces por semana.', dias: 90 },
    receta: [{ med: 'metformina', dosis: '1 tableta', via: 'Oral', frecuencia: 12, dias: 90, cantidad: 180, indicaciones: 'Con desayuno y cena.' }],
    signos: 'normal',
    evolucion: 'Control metabólico aceptable. Se solicita HbA1c y perfil lipídico.',
  },
  dislipidemia: {
    clave: 'dislipidemia',
    motivo: 'Resultados de colesterol elevado',
    hea: 'Trae perfil lipídico con colesterol total de 248 mg/dL y LDL de 165 mg/dL. Sedentario.',
    dx: 'Hiperlipidemia mixta (E78.2)', tipoDx: 'DEFINITIVO',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Estatina de intensidad moderada', indicaciones: 'Dieta baja en grasas saturadas, actividad física. Perfil lipídico en 3 meses.', dias: 90 },
    receta: [{ med: 'atorvastatina', dosis: '1 tableta', via: 'Oral', frecuencia: 24, dias: 90, cantidad: 90, indicaciones: 'Por la noche.' }],
    signos: 'normal',
    evolucion: 'Inicia estatina. Control con perfil lipídico en 3 meses.',
  },
  hipotiroidismo: {
    clave: 'hipotiroidismo',
    motivo: 'Control de tiroides',
    hea: 'Hipotiroidismo primario en reemplazo hormonal. Refiere menos fatiga. TSH de control en rango.',
    dx: 'Hipotiroidismo no especificado (E03.9)', tipoDx: 'DEFINITIVO',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Reemplazo con levotiroxina', indicaciones: 'Tomar en ayunas, 30 minutos antes del desayuno.', dias: 90 },
    receta: [{ med: 'levotiroxina', dosis: '1 tableta', via: 'Oral', frecuencia: 24, dias: 90, cantidad: 90, indicaciones: 'En ayunas.' }],
    signos: 'normal',
    evolucion: 'Eutiroidea clínicamente. Misma dosis.',
  },
  asma: {
    clave: 'asma',
    motivo: 'Dificultad respiratoria intermitente',
    hea: 'Episodios de sibilancias y tos nocturna dos veces por semana, desencadenados por frío y polvo.',
    dx: 'Asma no especificada (J45.9)', tipoDx: 'DEFINITIVO',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Broncodilatador de rescate y esteroide inhalado', indicaciones: 'Técnica inhalatoria revisada en consulta. Evitar desencadenantes.', dias: 30 },
    receta: [
      { med: 'beclometasona', dosis: '1 inhalación', via: 'Inhalada', frecuencia: 12, dias: 30, cantidad: 1, indicaciones: 'Enjuagar la boca después de usarlo.' },
      { med: 'salbutamol', dosis: '2 inhalaciones', via: 'Inhalada', frecuencia: 6, dias: 30, cantidad: 1, indicaciones: 'Solo si hay falta de aire.' },
    ],
    signos: 'respiratorio',
    evolucion: 'Asma parcialmente controlada. Se agrega esteroide inhalado.',
  },
  cefalea: {
    clave: 'cefalea',
    motivo: 'Cefalea frecuente',
    hea: 'Cefalea opresiva bifrontal de 2 semanas, vespertina, asociada a estrés laboral. Sin náusea, fotofobia ni déficit neurológico.',
    dx: 'Cefalea tensional (G44.2)', tipoDx: 'DEFINITIVO',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Analgésico simple', indicaciones: 'Higiene del sueño, pausas activas, evitar automedicación prolongada.', dias: 5 },
    receta: [{ med: 'acetaminofen', dosis: '1 tableta', via: 'Oral', frecuencia: 8, dias: 5, cantidad: 15, indicaciones: 'Si hay dolor.' }],
    signos: 'normal',
    evolucion: 'Examen neurológico normal. Reconsulta si hay signos de alarma.',
  },
  faringo: {
    clave: 'faringo',
    motivo: 'Dolor de garganta y fiebre',
    hea: 'Odinofagia de 3 días, fiebre no cuantificada, sin tos. Amígdalas hipertróficas con exudado.',
    dx: 'Faringoamigdalitis aguda (J03.9)', tipoDx: 'DEFINITIVO',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Antibiótico y antipirético', indicaciones: 'Completar el antibiótico aunque mejore. Líquidos abundantes.', dias: 10 },
    receta: [
      { med: 'amoxicilina', dosis: '1 cápsula', via: 'Oral', frecuencia: 8, dias: 10, cantidad: 30 },
      { med: 'acetaminofen', dosis: '1 tableta', via: 'Oral', frecuencia: 8, dias: 3, cantidad: 9, indicaciones: 'Si hay fiebre.' },
    ],
    alternativa: {
      grupo: 'penicilina',
      receta: [
        { med: 'azitromicina', dosis: '1 tableta', via: 'Oral', frecuencia: 24, dias: 3, cantidad: 3, indicaciones: 'Alérgico a penicilina.' },
        { med: 'acetaminofen', dosis: '1 tableta', via: 'Oral', frecuencia: 8, dias: 3, cantidad: 9, indicaciones: 'Si hay fiebre.' },
      ],
    },
    signos: 'fiebre',
    evolucion: 'Cuadro infeccioso agudo. Reconsulta si persiste fiebre a las 72 horas.',
  },
  itu: {
    clave: 'itu',
    motivo: 'Ardor al orinar',
    hea: 'Disuria, polaquiuria y urgencia de 2 días. Sin fiebre ni dolor lumbar. Puño percusión negativa.',
    dx: 'Infección de vías urinarias, sitio no especificado (N39.0)', tipoDx: 'PRESUNTIVO',
    obsDx: 'Se solicita urocultivo.',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Antibiótico empírico', indicaciones: 'Abundantes líquidos. Ajustar según urocultivo.', dias: 7 },
    receta: [{ med: 'nitrofurantoina', dosis: '1 cápsula', via: 'Oral', frecuencia: 12, dias: 7, cantidad: 14, indicaciones: 'Con alimentos.' }],
    signos: 'normal',
    evolucion: 'Inicia antibiótico empírico mientras se obtiene urocultivo.',
  },
  gastritis: {
    clave: 'gastritis',
    motivo: 'Dolor en la boca del estómago',
    hea: 'Epigastralgia urente de 3 semanas, empeora con ayuno y comidas irritantes. Sin melena ni pérdida de peso.',
    dx: 'Gastritis no especificada (K29.7)', tipoDx: 'DEFINITIVO',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Inhibidor de bomba de protones', indicaciones: 'Evitar café, picante, alcohol y AINE. Comidas fraccionadas.', dias: 30 },
    receta: [{ med: 'omeprazol', dosis: '1 cápsula', via: 'Oral', frecuencia: 24, dias: 30, cantidad: 30, indicaciones: '30 minutos antes del desayuno.' }],
    signos: 'normal',
    evolucion: 'Sin datos de alarma. Control en 1 mes.',
  },
  lumbalgia: {
    clave: 'lumbalgia',
    motivo: 'Dolor de espalda baja',
    hea: 'Dolor lumbar mecánico de 5 días tras cargar peso. Sin irradiación ni alteraciones de esfínteres. Lasègue negativo.',
    dx: 'Lumbago no especificado (M54.5)', tipoDx: 'DEFINITIVO',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Antiinflamatorio y medidas físicas', indicaciones: 'Calor local, evitar cargar peso, retomar actividad progresiva.', dias: 7 },
    receta: [{ med: 'ibuprofeno', dosis: '1 tableta', via: 'Oral', frecuencia: 8, dias: 7, cantidad: 21, indicaciones: 'Después de comer.' }],
    alternativa: {
      grupo: 'aine',
      receta: [{ med: 'acetaminofen', dosis: '2 tabletas', via: 'Oral', frecuencia: 8, dias: 7, cantidad: 42, indicaciones: 'Alérgico a AINE.' }],
    },
    signos: 'dolor',
    evolucion: 'Lumbalgia mecánica aguda. Reconsulta si no mejora en 2 semanas.',
  },
  rinitis: {
    clave: 'rinitis',
    motivo: 'Estornudos y congestión nasal',
    hea: 'Rinorrea hialina, estornudos en salvas y prurito nasal matutino, peor en época seca.',
    dx: 'Rinitis alérgica, no especificada (J30.4)', tipoDx: 'DEFINITIVO',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Antihistamínico', indicaciones: 'Evitar polvo y humo, lavados nasales con solución salina.', dias: 14 },
    receta: [{ med: 'loratadina', dosis: '1 tableta', via: 'Oral', frecuencia: 24, dias: 14, cantidad: 14 }],
    signos: 'normal',
    evolucion: 'Cuadro alérgico. Control si persiste.',
  },
  chequeo: {
    clave: 'chequeo',
    motivo: 'Chequeo general',
    hea: 'Asintomática. Acude a evaluación anual.',
    dx: 'Examen médico general (Z00.0)', tipoDx: 'DEFINITIVO',
    tratamiento: { tipo: 'No farmacológico', descripcion: 'Estilo de vida saludable', indicaciones: 'Alimentación balanceada, 150 minutos de ejercicio por semana, hematología y química de control.', dias: null },
    receta: [],
    signos: 'normal',
    evolucion: 'Examen físico normal. Se solicitan laboratorios de rutina.',
  },
  'dolor-toracico': {
    clave: 'dolor-toracico',
    motivo: 'Dolor torácico',
    hea: 'Dolor precordial punzante de 2 días, no irradiado, aumenta con la palpación y los movimientos. Sin disnea ni diaforesis.',
    dx: 'Dolor precordial (R07.2)', tipoDx: 'PRESUNTIVO',
    obsDx: 'Probable osteocondritis. Descartar origen cardíaco con ECG y troponinas.',
    tratamiento: { tipo: 'Estudios', descripcion: 'Electrocardiograma, troponina I y hematología', indicaciones: 'Acudir a emergencia si el dolor se vuelve opresivo o se acompaña de falta de aire.', dias: null },
    receta: [{ med: 'acetaminofen', dosis: '1 tableta', via: 'Oral', frecuencia: 8, dias: 3, cantidad: 9, indicaciones: 'Si hay dolor.' }],
    signos: 'hta',
    evolucion: 'ECG sin cambios agudos. Pendiente troponina.',
  },
  postoperatorio: {
    clave: 'postoperatorio',
    motivo: 'Seguimiento postoperatorio',
    hea: 'Colecistectomía laparoscópica hace 3 semanas. Tolera dieta, heridas sin secreción, dolor leve ocasional.',
    dx: 'Atención de seguimiento posterior a cirugía (Z48.8)', tipoDx: 'DEFINITIVO',
    tratamiento: { tipo: 'No farmacológico', descripcion: 'Cuidados de heridas', indicaciones: 'Evitar esfuerzos por 2 semanas más. Dieta baja en grasa.', dias: 14 },
    receta: [{ med: 'acetaminofen', dosis: '1 tableta', via: 'Oral', frecuencia: 8, dias: 5, cantidad: 15, indicaciones: 'Si hay dolor.' }],
    signos: 'normal',
    evolucion: 'Heridas en buen estado. Alta de cirugía en la próxima cita.',
  },
  colecistitis: {
    clave: 'colecistitis',
    motivo: 'Dolor abdominal después de comer',
    hea: 'Dolor en hipocondrio derecho tras comidas grasas, de 2 meses de evolución, con náusea. Ultrasonido con litiasis vesicular.',
    dx: 'Colelitiasis con colecistitis crónica (K80.1)', tipoDx: 'DEFINITIVO',
    obsDx: 'Referida a cirugía general para colecistectomía.',
    tratamiento: { tipo: 'Quirúrgico', descripcion: 'Colecistectomía laparoscópica programada', indicaciones: 'Dieta sin grasa hasta la cirugía.', dias: null },
    receta: [{ med: 'acetaminofen', dosis: '1 tableta', via: 'Oral', frecuencia: 8, dias: 7, cantidad: 21, indicaciones: 'Si hay dolor.' }],
    signos: 'dolor',
    evolucion: 'Se programa cirugía electiva.',
  },
  'erc-hiperk': {
    clave: 'erc-hiperk',
    motivo: 'Resultados de laboratorio',
    hea: 'Enfermedad renal crónica estadio 3 e hipertensión. Trae química con potasio elevado. Asintomática, sin palpitaciones.',
    dx: 'Hiperpotasemia (E87.5)', tipoDx: 'DEFINITIVO',
    obsDx: 'Potasio 6.4 mmol/L. ECG sin ondas T picudas. Suspender suplementos de potasio.',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Diurético de asa y dieta baja en potasio', indicaciones: 'Evitar banano, aguacate y jugos de naranja. Repetir química en 48 horas.', dias: 7 },
    receta: [{ med: 'furosemida', dosis: '1 tableta', via: 'Oral', frecuencia: 24, dias: 7, cantidad: 7, indicaciones: 'Por la mañana.' }],
    signos: 'hta',
    evolucion: 'Hiperpotasemia moderada sin cambios electrocardiográficos. Control en 48 horas.',
  },
  'primera-consulta': {
    clave: 'primera-consulta',
    motivo: 'Primera consulta',
    hea: 'Acude por primera vez para apertura de expediente. Refiere cansancio y dolor de rodilla derecha al jugar fútbol.',
    dx: 'Gonalgia derecha (M25.56)', tipoDx: 'PRESUNTIVO',
    tratamiento: { tipo: 'No farmacológico', descripcion: 'Reposo relativo y hielo local', indicaciones: 'Hielo 15 minutos 3 veces al día, evitar deporte por 1 semana.', dias: 7 },
    receta: [],
    signos: 'normal',
    evolucion: 'Primera evaluación. Se abre expediente.',
  },
};

/* -------------------------------------------------------------------------- */
/* Casos pediátricos (la dosis se calcula con el peso del niño)                 */
/* -------------------------------------------------------------------------- */

export interface CasoPediatrico {
  clave: string;
  motivo: string;
  hea: string;
  dx: string;
  tipoDx: 'PRESUNTIVO' | 'DEFINITIVO';
  tratamiento: { tipo: string; descripcion: string; indicaciones: string; dias: number | null };
  receta: (pesoKg: number, edadMeses: number, alergicoPenicilina: boolean) => Renglon[];
  fiebre: boolean;
  evolucion: string;
  edadMinMeses?: number;
}

const ml = (n: number) => `${Math.max(1, Math.round(n * 2) / 2)} mL`;

export const CASOS_PEDIATRICOS: Record<string, CasoPediatrico> = {
  'nino-sano': {
    clave: 'nino-sano',
    motivo: 'Control de crecimiento',
    hea: 'Control de niño sano. Alimentación adecuada para la edad, desarrollo psicomotor acorde.',
    dx: 'Control de salud de rutina del niño (Z00.1)', tipoDx: 'DEFINITIVO',
    tratamiento: { tipo: 'Preventivo', descripcion: 'Suplemento de hierro', indicaciones: 'Lactancia o alimentación complementaria según edad. Próximo control en 2 meses.', dias: 60 },
    receta: (p) => [{ med: 'sulfato-ferroso-gotas', dosis: `${Math.max(5, Math.round(p * 2))} gotas`, via: 'Oral', frecuencia: 24, dias: 60, cantidad: 1, indicaciones: 'Con jugo, lejos de la leche.' }],
    fiebre: false,
    evolucion: 'Crecimiento y desarrollo adecuados.',
  },
  rinofaringitis: {
    clave: 'rinofaringitis',
    motivo: 'Tos y mocos',
    hea: 'Rinorrea, tos seca y fiebre de 38 °C de 2 días. Come menos pero toma líquidos. Sin dificultad respiratoria.',
    dx: 'Rinofaringitis aguda (J00)', tipoDx: 'DEFINITIVO',
    tratamiento: { tipo: 'Sintomático', descripcion: 'Antipirético y lavados nasales', indicaciones: 'Lavados nasales con suero, líquidos. Consultar si hay respiración rápida o fiebre por más de 3 días.', dias: 3 },
    receta: (p) => [{ med: 'acetaminofen-jarabe', dosis: ml((15 * p) / 32), via: 'Oral', frecuencia: 6, dias: 3, cantidad: 1, indicaciones: 'Solo si hay fiebre.' }],
    fiebre: true,
    evolucion: 'Infección respiratoria alta sin signos de neumonía.',
  },
  otitis: {
    clave: 'otitis',
    motivo: 'Dolor de oído',
    hea: 'Otalgia derecha, irritabilidad y fiebre de 38.5 °C desde hace 1 día, precedido de cuadro catarral. Membrana timpánica abombada.',
    dx: 'Otitis media aguda (H66.9)', tipoDx: 'DEFINITIVO',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Antibiótico y analgésico', indicaciones: 'Completar 10 días de antibiótico.', dias: 10 },
    receta: (p, _m, alergico) => alergico
      ? [
          { med: 'azitromicina-susp', dosis: ml((10 * p) / 40), via: 'Oral', frecuencia: 24, dias: 3, cantidad: 1, indicaciones: 'Alérgico a penicilina.' },
          { med: 'ibuprofeno-susp', dosis: ml((10 * p) / 20), via: 'Oral', frecuencia: 8, dias: 3, cantidad: 1, indicaciones: 'Si hay dolor o fiebre.' },
        ]
      : [
          { med: 'amoxicilina-susp', dosis: ml((90 * p) / 2 / 50), via: 'Oral', frecuencia: 12, dias: 10, cantidad: 2 },
          { med: 'ibuprofeno-susp', dosis: ml((10 * p) / 20), via: 'Oral', frecuencia: 8, dias: 3, cantidad: 1, indicaciones: 'Si hay dolor o fiebre.' },
        ],
    fiebre: true,
    evolucion: 'Otitis media aguda. Control en 48 horas si persiste fiebre.',
    edadMinMeses: 6,
  },
  diarrea: {
    clave: 'diarrea',
    motivo: 'Diarrea',
    hea: 'Evacuaciones líquidas 5 al día por 2 días, sin sangre. Un vómito. Ojos no hundidos, llora con lágrimas.',
    dx: 'Diarrea y gastroenteritis de presunto origen infeccioso (A09)', tipoDx: 'DEFINITIVO',
    obsDx: undefined,
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Plan A de hidratación y zinc', indicaciones: 'SRO después de cada evacuación, continuar alimentación. Volver si hay sangre, vómitos persistentes o decaimiento.', dias: 10 },
    receta: (_p, m) => [
      { med: 'sro', dosis: m < 24 ? '50–100 mL' : '100–200 mL', via: 'Oral', frecuencia: null, dias: 3, cantidad: 4, indicaciones: 'Después de cada evacuación líquida.' },
      { med: 'zinc', dosis: m < 6 ? '2.5 mL' : '5 mL', via: 'Oral', frecuencia: 24, dias: 10, cantidad: 1 },
    ],
    fiebre: false,
    evolucion: 'Diarrea aguda sin deshidratación.',
  } as CasoPediatrico,
  sibilancias: {
    clave: 'sibilancias',
    motivo: 'Silbido de pecho',
    hea: 'Tos y sibilancias de 3 días, peor por la noche. Antecedente de episodios similares. Tiraje leve que mejora con nebulización.',
    dx: 'Hiperreactividad bronquial / asma infantil (J45.9)', tipoDx: 'PRESUNTIVO',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Broncodilatador inhalado con espaciador', indicaciones: 'Evitar humo de leña y cigarrillo en casa. Volver si respira rápido o se le hunden las costillas.', dias: 7 },
    receta: () => [{ med: 'salbutamol-inh', dosis: '2 inhalaciones', via: 'Inhalada', frecuencia: 6, dias: 7, cantidad: 1, indicaciones: 'Con espaciador y mascarilla.' }],
    fiebre: false,
    evolucion: 'Mejora tras salbutamol en consulta. Control en 1 semana.',
    edadMinMeses: 12,
  },
  parasitosis: {
    clave: 'parasitosis',
    motivo: 'Dolor de estómago y poco apetito',
    hea: 'Dolor abdominal periumbilical intermitente y apetito disminuido de 1 mes. Heces con restos de parásitos según la madre.',
    dx: 'Parasitosis intestinal, sin otra especificación (B82.9)', tipoDx: 'PRESUNTIVO',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Antiparasitario de dosis única', indicaciones: 'Lavado de manos, agua hervida. Tratar a la familia.', dias: 1 },
    receta: () => [{ med: 'albendazol-susp', dosis: '10 mL', via: 'Oral', frecuencia: null, dias: 1, cantidad: 1, indicaciones: 'Dosis única.' }],
    fiebre: false,
    evolucion: 'Desparasitación. Control de peso en 1 mes.',
    edadMinMeses: 24,
  },
  dermatitis: {
    clave: 'dermatitis',
    motivo: 'Ronchas que pican',
    hea: 'Placas eritematosas pruriginosas en pliegues de codos y rodillas de 2 semanas. Piel seca.',
    dx: 'Dermatitis atópica (L20.9)', tipoDx: 'DEFINITIVO',
    tratamiento: { tipo: 'Farmacológico', descripcion: 'Esteroide tópico de baja potencia y antihistamínico', indicaciones: 'Baño corto con agua tibia, crema humectante sin perfume dos veces al día.', dias: 7 },
    receta: (p) => [
      { med: 'hidrocortisona-crema', dosis: 'Capa fina', via: 'Tópica', frecuencia: 12, dias: 7, cantidad: 1, indicaciones: 'Solo en las lesiones.' },
      { med: 'loratadina-jarabe', dosis: p < 30 ? '5 mL' : '10 mL', via: 'Oral', frecuencia: 24, dias: 7, cantidad: 1 },
    ],
    fiebre: false,
    evolucion: 'Dermatitis atópica leve.',
    edadMinMeses: 24,
  },
};

/* -------------------------------------------------------------------------- */
/* Esquema de vacunación (MSPAS Guatemala, simplificado)                        */
/* -------------------------------------------------------------------------- */

/** Edad en meses de cada dosis. */
export const VACUNAS: { nombre: string; dosisMeses: number[]; soloNinas?: boolean }[] = [
  { nombre: 'BCG', dosisMeses: [0] },
  { nombre: 'Hepatitis B pediátrica', dosisMeses: [0] },
  { nombre: 'Pentavalente (DPT-HepB-Hib)', dosisMeses: [2, 4, 6] },
  { nombre: 'Polio (IPV/bOPV)', dosisMeses: [2, 4, 6] },
  { nombre: 'Rotavirus', dosisMeses: [2, 4] },
  { nombre: 'Neumococo conjugada', dosisMeses: [2, 4, 12] },
  { nombre: 'SPR (sarampión, paperas, rubéola)', dosisMeses: [12, 18] },
  { nombre: 'DPT refuerzo', dosisMeses: [18, 48] },
  { nombre: 'Polio refuerzo (bOPV)', dosisMeses: [18, 48] },
  { nombre: 'VPH', dosisMeses: [120, 126], soloNinas: true },
];

/* -------------------------------------------------------------------------- */
/* Tablas OMS aproximadas (mediana por edad en meses, niños)                    */
/* -------------------------------------------------------------------------- */

export const OMS_PESO: [number, number][] = [
  [0, 3.3], [1, 4.5], [2, 5.6], [4, 7.0], [6, 7.9], [9, 8.9], [12, 9.6], [18, 10.9], [24, 12.2],
  [36, 14.3], [48, 16.3], [60, 18.3], [72, 20.5], [84, 22.9], [96, 25.4], [108, 28.1], [120, 31.2], [144, 39.0],
];
export const OMS_TALLA: [number, number][] = [
  [0, 49.9], [1, 54.7], [2, 58.4], [4, 63.9], [6, 67.6], [9, 72.0], [12, 75.7], [18, 82.3], [24, 87.1],
  [36, 96.1], [48, 103.3], [60, 110.0], [72, 116.0], [84, 121.7], [96, 127.3], [108, 132.6], [120, 137.8], [144, 149.1],
];
export const OMS_PC: [number, number][] = [
  [0, 34.5], [1, 37.3], [2, 39.1], [4, 41.6], [6, 43.3], [9, 44.9], [12, 46.1], [18, 47.4], [24, 48.3], [36, 49.5],
];
