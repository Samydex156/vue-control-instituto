<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { supabase } from '../lib/supabaseClient'

// Componentes PrimeVue
import AutoComplete from 'primevue/autocomplete';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Message from 'primevue/message';
import FloatLabel from 'primevue/floatlabel';
import InputNumber from 'primevue/inputnumber';

const emit = defineEmits(['inscripcion-creada'])

const loading = ref(false)
const cargandoDatos = ref(true)
const estudiantes = ref([])
const cursos = ref([])
const mensaje = ref({ texto: '', severity: '' })

const showModalEstudiante = ref(false)
const loadingEstudiante = ref(false)

const form = reactive({
  estudiante: null,
  curso: null,
  modulo_inicio: 1,
  fecha_inicio: new Date(),
  proximo_pago_vence: new Date(new Date().setMonth(new Date().getMonth() + 1)),
  // Registro de Pago inicial
  monto_pago: 0,
  metodo_pago: 'Efectivo',
  observacion_pago: 'Primer pago por inscripción'
})

const metodosPago = ['Efectivo', 'QR / Transferencia', 'Tarjeta']

const formEstudiante = reactive({
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  ci: '',
  telefono: '',
  notas_adicionales: ''
})

// 1. Cargar Datos
const obtenerDatos = async () => {
  cargandoDatos.value = true
  try {
    const { data: dataEst } = await supabase
      .from('estudiantes')
      .select('id, nombre, apellido_paterno, apellido_materno, ci')
      .order('nombre')

    const { data: dataCur } = await supabase
      .from('cursos')
      .select('id, nombre, costo_mensual, cantidad_modulos')
      .order('nombre')

    estudiantes.value = dataEst?.map(e => ({
      ...e,
      label: `${e.nombre} ${e.apellido_paterno} ${e.apellido_materno || ''}`.trim() + ` (${e.ci || 'Sin CI'})`
    })) || []

    cursos.value = dataCur || []
  } catch (e) {
    console.error('Error cargando datos:', e)
  } finally {
    cargandoDatos.value = false
  }
}

const filteredEstudiantes = ref([])
const buscarEstudiante = (event) => {
  const query = event.query.toLowerCase()
  filteredEstudiantes.value = estudiantes.value.filter(e =>
    e.label.toLowerCase().includes(query)
  )
}

// 2. Computed: Módulos
const listaModulos = computed(() => {
  if (!form.curso) return []
  return Array.from({ length: form.curso.cantidad_modulos }, (_, i) => ({
    label: `Módulo ${i + 1}`,
    value: i + 1
  }))
})

watch(() => form.curso, (newVal) => {
  form.modulo_inicio = 1
  if (newVal) {
    form.monto_pago = newVal.costo_mensual
  }
})

watch(() => form.fecha_inicio, (newVal) => {
  if (newVal) {
    const fecha = new Date(newVal)
    fecha.setMonth(fecha.getMonth() + 1)
    form.proximo_pago_vence = fecha
  }
})

// --- UTILIDAD PARA GENERAR STRING QR ---
const generarStringQR = (inscripcionId, nombreEstudiante, apellidosEstudiante, nombreCurso) => {
  // 1. Iniciales del estudiante (Ej: Juan Perez -> JP)
  const inicialNombre = nombreEstudiante ? nombreEstudiante.trim().charAt(0).toUpperCase() : 'X'
  const inicialApellido = apellidosEstudiante ? apellidosEstudiante.trim().charAt(0).toUpperCase() : 'X'
  const iniciales = `${inicialNombre}${inicialApellido}`

  // 2. Código del Curso (Ej: Robótica -> ROB)
  let codigoCurso = 'CUR'
  if (nombreCurso) {
    const palabras = nombreCurso.trim().split(' ')
    if (palabras.length === 1 && palabras[0].length >= 3) {
      codigoCurso = palabras[0].substring(0, 3).toUpperCase()
    } else {
      codigoCurso = palabras.map(p => p.charAt(0).toUpperCase()).join('')
    }
  }

  // 3. Formato Final: JP-ROB-125 (Donde 125 es el ID de la inscripción)
  // Usamos el ID de inscripción para asegurar unicidad absoluta.
  return `${iniciales}-${codigoCurso}-${inscripcionId}`
}

// 3. Crear Estudiante (YA NO GENERA QR AQUÍ)
const crearEstudiante = async () => {
  if (!formEstudiante.nombre || !formEstudiante.apellido_paterno) return

  loadingEstudiante.value = true
  try {
    const { data: nuevoEst, error } = await supabase
      .from('estudiantes')
      .insert([{
        nombre: formEstudiante.nombre,
        apellido_paterno: formEstudiante.apellido_paterno,
        apellido_materno: formEstudiante.apellido_materno,
        ci: formEstudiante.ci,
        telefono: formEstudiante.telefono,
        notas_adicionales: formEstudiante.notas_adicionales
      }])
      .select().single()

    if (error) throw error

    await obtenerDatos()
    const estSeleccionado = estudiantes.value.find(e => e.id === nuevoEst.id)
    form.estudiante = estSeleccionado

    showModalEstudiante.value = false
    Object.keys(formEstudiante).forEach(k => formEstudiante[k] = '')

    mensaje.value = { texto: '¡Estudiante creado!', severity: 'success' }
    setTimeout(() => mensaje.value = { texto: '', severity: '' }, 3000)
  } catch (e) {
    mensaje.value = { texto: e.message, severity: 'error' }
  } finally {
    loadingEstudiante.value = false
  }
}

// 4. Guardar Inscripción (AQUÍ SE GENERA EL QR AHORA)
const guardarInscripcion = async () => {
  if (!form.estudiante || !form.curso) {
    mensaje.value = { texto: 'Faltan datos obligatorios.', severity: 'error' }
    return
  }

  loading.value = true
  try {
    // A. Insertar la inscripción base
    const { data: inscripcionData, error } = await supabase
      .from('inscripciones')
      .insert([
        {
          estudiante_id: form.estudiante.id,
          curso_id: form.curso.id,
          fecha_inicio: form.fecha_inicio.toISOString(),
          proximo_pago_vence: form.proximo_pago_vence.toISOString(),
          modulo_inicio: form.modulo_inicio,
          modulo_actual: form.modulo_inicio,
          estado: 'activo'
        }
      ])
      .select()
      .single()

    if (error) throw error

    // B. Generar el QR usando los datos de la inscripción recién creada
    const apellidos = `${form.estudiante.apellido_paterno || ''} ${form.estudiante.apellido_materno || ''}`
    const qrString = generarStringQR(
      inscripcionData.id,
      form.estudiante.nombre,
      apellidos,
      form.curso.nombre
    )

    // C. Actualizar la inscripción con el QR generado
    const { error: updateError } = await supabase
      .from('inscripciones')
      .update({ codigo_qr_data: qrString })
      .eq('id', inscripcionData.id)

    if (updateError) throw updateError

    mensaje.value = { texto: `¡Inscrito! QR Generado: ${qrString}`, severity: 'success' }

    // D. Registrar el pago inicial
    const { error: errorPago } = await supabase
      .from('pagos')
      .insert([{
        inscripcion_id: inscripcionData.id,
        monto: form.monto_pago,
        metodo_pago: form.metodo_pago,
        observacion: form.observacion_pago,
        fecha_pago: new Date()
      }])

    if (errorPago) throw new Error('Inscripción creada pero el pago falló: ' + errorPago.message)

    mensaje.value = { texto: '¡Inscripción y Pago registrados correctamente!', severity: 'success' }

    // Reset form
    form.estudiante = null
    form.curso = null
    form.modulo_inicio = 1
    form.monto_pago = 0

    emit('inscripcion-creada')
    setTimeout(() => { mensaje.value = { texto: '', severity: '' } }, 3000)

  } catch (error) {
    mensaje.value = { texto: 'Error: ' + error.message, severity: 'error' }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  obtenerDatos()
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <div class="bg-white border border-slate-200 shadow-xl rounded-4xl p-6 lg:p-8 relative overflow-hidden">
      <!-- Encabezado minimalista -->
      <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <div class="flex items-center gap-4">
          <div class="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md">
            <i class="pi pi-user-plus text-lg"></i>
          </div>
          <div>
            <h2 class="text-xl font-black text-slate-800 tracking-tight">Registro de Inscripción</h2>
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Panel de Admisión</p>
          </div>
        </div>
      </div>

      <form @submit.prevent="guardarInscripcion" class="space-y-6 relative z-10">
        <!-- SECCIÓN 1: ESTUDIANTE Y CURSO -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div class="md:col-span-8">
            <div class="flex gap-2">
              <FloatLabel variant="on" class="flex-1">
                <AutoComplete id="estudiante" v-model="form.estudiante" :suggestions="filteredEstudiantes"
                  @complete="buscarEstudiante" optionLabel="label" placeholder=" "
                  class="w-full rounded-xl! border-slate-200! bg-slate-50/50!" inputClass="w-full! px-4! py-2.5!"
                  panelClass="rounded-xl! shadow-2xl!" dropdown />
                <label for="estudiante" class="text-slate-500 font-medium ml-2">Estudiante</label>
              </FloatLabel>
              <Button type="button" icon="pi pi-plus" text
                class="shrink-0 rounded-xl! bg-slate-100! text-slate-600! hover:bg-indigo-50! hover:text-indigo-600! px-4"
                v-tooltip="'Nuevo Estudiante'" @click="showModalEstudiante = true" />
            </div>
          </div>
          <div class="md:col-span-4">
            <FloatLabel variant="on">
              <Select id="modulo" v-model="form.modulo_inicio" :options="listaModulos" optionLabel="label"
                optionValue="value" :disabled="!form.curso" class="w-full rounded-xl! border-slate-200! bg-slate-50/50!"
                inputClass="py-2.5 px-4" />
              <label for="modulo" class="text-slate-500 font-medium ml-2 text-sm">Módulo</label>
            </FloatLabel>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="md:col-span-4">
            <FloatLabel variant="on">
              <Select id="curso" v-model="form.curso" :options="cursos" optionLabel="nombre"
                class="w-full rounded-xl! border-slate-200! bg-slate-50/50!" inputClass="py-2.5 px-4" />
              <label for="curso" class="text-slate-500 font-medium ml-2">Seleccionar Curso</label>
            </FloatLabel>
          </div>
        </div>

        <!-- SECCIÓN 2: FECHAS -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div class="space-y-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fecha Inicio</label>
            <DatePicker v-model="form.fecha_inicio" dateFormat="dd/mm/yy" class="w-full!"
              inputClass="w-full! rounded-xl border-slate-200! py-2 px-3 bg-white text-sm" />
          </div>
          <div class="space-y-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vence 1er Pago</label>
            <DatePicker v-model="form.proximo_pago_vence" dateFormat="dd/mm/yy" class="w-full!"
              inputClass="w-full! rounded-xl border-rose-100! py-2 px-3 bg-rose-50/50 text-rose-700 font-bold text-sm" />
          </div>
        </div>

        <!-- SECCIÓN 3: PAGO (MINIMALISTA) -->
        <div class="border border-emerald-100 rounded-2xl bg-emerald-50/30 p-4 lg:p-5">
          <div class="flex flex-col lg:flex-row gap-4 items-center">
            <div class="flex-1 w-full">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <i class="pi pi-wallet text-[10px]"></i>
                </div>
                <span class="text-[10px] font-black uppercase tracking-widest text-emerald-800">Liquidación
                  Inicial</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FloatLabel variant="on">
                  <Select id="metodo_pago" v-model="form.metodo_pago" :options="metodosPago"
                    class="w-full rounded-xl! border-emerald-100! bg-white text-sm" h-9 />
                  <label for="metodo_pago" class="text-emerald-700/60! text-[10px]">Método</label>
                </FloatLabel>
                <FloatLabel variant="on">
                  <InputText id="obs_pago" v-model="form.observacion_pago"
                    class="w-full rounded-xl! border-emerald-100! bg-white px-3 py-2 text-xs" />
                  <label for="obs_pago" class="text-emerald-700/60! text-[10px]">Referencia</label>
                </FloatLabel>
              </div>
            </div>

            <div
              class="shrink-0 w-full lg:w-40 bg-white border border-emerald-100 p-3 rounded-xl shadow-xs text-center self-end">
              <span class="block text-[8px] font-black text-emerald-600 uppercase mb-0.5">Total Cobrado</span>
              <InputNumber v-model="form.monto_pago" mode="currency" currency="USD" locale="en-US"
                inputClass="text-2xl font-black text-slate-800 text-center border-none! bg-transparent! p-0! focus:ring-0!" />
            </div>
          </div>
        </div>

        <transition name="fade">
          <Message v-if="mensaje.texto" :severity="mensaje.severity" class="rounded-2xl! mt-4! shadow-sm border-none">
            {{ mensaje.texto }}
          </Message>
        </transition>

        <Button type="submit" :loading="loading"
          class="w-full! py-4! rounded-xl! border-none! text-base! font-bold! bg-slate-900! text-white! shadow-lg hover:bg-slate-800! active:scale-[0.98]! transition-all">
          <div class="flex items-center justify-center gap-2">
            <i class="pi pi-check text-sm"></i>
            <span>Finalizar inscripción</span>
          </div>
        </Button>
      </form>
    </div>

    <Dialog v-model:visible="showModalEstudiante" modal header="Crear Nuevo Estudiante" :style="{ width: '50vw' }"
      breakpoints="{ '1199px': '75vw', '575px': '90vw' }" class="rounded-3xl! border-none! shadow-2xl overflow-hidden">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="bg-indigo-100 p-2 rounded-xl text-indigo-600">
            <i class="pi pi-user text-xl"></i>
          </div>
          <span class="text-xl font-black text-slate-800 tracking-tight">Datos Estudiante</span>
        </div>
      </template>

      <div class="p-4 space-y-6">
        <FloatLabel variant="on">
          <InputText id="nom" v-model="formEstudiante.nombre" class="w-full rounded-xl!" />
          <label for="nom">Nombre(s) *</label>
        </FloatLabel>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FloatLabel variant="on">
            <InputText id="pat" v-model="formEstudiante.apellido_paterno" class="w-full rounded-xl!" />
            <label for="pat">Apellido Paterno *</label>
          </FloatLabel>
          <FloatLabel variant="on">
            <InputText id="mat" v-model="formEstudiante.apellido_materno" class="w-full rounded-xl!" />
            <label for="mat">Apellido Materno</label>
          </FloatLabel>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FloatLabel variant="on">
            <InputText id="tel" v-model="formEstudiante.telefono" class="w-full rounded-xl!" />
            <label for="tel">Teléfono</label>
          </FloatLabel>
          <FloatLabel variant="on">
            <InputText id="ci" v-model="formEstudiante.ci" class="w-full rounded-xl!" />
            <label for="ci">Cédula de Identidad</label>
          </FloatLabel>
        </div>

        <FloatLabel variant="on">
          <Textarea id="notas" v-model="formEstudiante.notas_adicionales" rows="2" class="w-full rounded-xl!"
            autoResize />
          <label for="notas">Notas u Observaciones</label>
        </FloatLabel>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end mt-4">
          <Button label="Cancelar" icon="pi pi-times" text class="rounded-xl!" @click="showModalEstudiante = false" />
          <Button label="Guardar Estudiante" icon="pi pi-save" class="bg-indigo-600! rounded-xl! px-6"
            :loading="loadingEstudiante" @click="crearEstudiante" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>