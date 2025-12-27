<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabaseClient'

// Componentes PrimeVue
import Select from 'primevue/select';
import AutoComplete from 'primevue/autocomplete';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Message from 'primevue/message';
import FloatLabel from 'primevue/floatlabel';
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';

const emit = defineEmits(['pago-registrado'])

const loading = ref(false)
const inscripciones = ref([])
const mensaje = ref({ texto: '', severity: '' }) // severity: success | error

const form = reactive({
  inscripcion: null, // Ahora guardaremos el objeto completo del dropdown
  monto: 0,
  metodo_pago: 'Efectivo',
  observacion: '',
  meses_a_pagar: 1
})

const metodosPago = ['Efectivo', 'QR / Transferencia', 'Tarjeta']

// Cargar Inscripciones
const cargarInscripciones = async () => {
  const { data } = await supabase
    .from('inscripciones')
    .select(`
      id, 
      proximo_pago_vence, 
      estudiantes (nombre, apellido_paterno, ci), 
      cursos (nombre, costo_mensual),
      pagos (monto, fecha_pago)
    `)
    .eq('estado', 'activo')
    .order('id', { ascending: false })

  inscripciones.value = data.map(i => ({
    ...i,
    // Mostrar CI para desambiguar estudiantes con nombres similares
    label: `${i.estudiantes.nombre} ${i.estudiantes.apellido_paterno || ''} - ${i.cursos.nombre} (${i.estudiantes.ci || 'S/CI'})`,
    ultimoPago: i.pagos?.length > 0 ? i.pagos[0] : null
  }))
}

const filteredInscripciones = ref([])

const buscarEstudiante = (event) => {
  const query = event.query.toLowerCase()
  filteredInscripciones.value = inscripciones.value.filter(i =>
    i.label.toLowerCase().includes(query)
  )
}

// Watchers inteligentes
watch(() => form.inscripcion, (newVal) => {
  if (newVal && typeof newVal === 'object') {
    form.monto = newVal.cursos.costo_mensual * form.meses_a_pagar
  }
})

watch(() => form.meses_a_pagar, (newVal) => {
  if (form.inscripcion && typeof form.inscripcion === 'object') {
    form.monto = form.inscripcion.cursos.costo_mensual * newVal
  }
})

const procesarPago = async () => {
  if (!form.inscripcion) return

  loading.value = true

  try {
    // 1. Insertar Pago
    await supabase.from('pagos').insert([{
      inscripcion_id: form.inscripcion.id,
      monto: form.monto,
      metodo_pago: form.metodo_pago,
      observacion: form.observacion,
      fecha_pago: new Date()
    }])

    // 2. Calcular nueva fecha
    let fechaBase = new Date(form.inscripcion.proximo_pago_vence)
    const hoy = new Date()
    if (fechaBase < hoy) fechaBase = hoy

    fechaBase.setMonth(fechaBase.getMonth() + form.meses_a_pagar)

    // 3. Actualizar Inscripción
    await supabase.from('inscripciones')
      .update({ proximo_pago_vence: fechaBase.toISOString() })
      .eq('id', form.inscripcion.id)

    mensaje.value = { texto: 'Pago registrado correctamente', severity: 'success' }

    // Reset
    form.inscripcion = null
    form.monto = 0
    emit('pago-registrado')
    cargarInscripciones()
    setTimeout(() => mensaje.value = { texto: '', severity: '' }, 3000)

  } catch (error) {
    mensaje.value = { texto: error.message, severity: 'error' }
  } finally {
    loading.value = false
  }
}

onMounted(cargarInscripciones)
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <div
      class="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-slate-200/60 overflow-hidden relative">
      <!-- Decoración de fondo -->
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-emerald-50 rounded-full blur-3xl opacity-50"></div>
      <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-50"></div>

      <div class="flex items-center justify-between mb-8 border-b border-slate-100 pb-6 relative z-10">
        <div class="flex items-center gap-4">
          <div
            class="bg-linear-to-br from-emerald-400 to-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-200 text-white">
            <i class="pi pi-wallet text-2xl"></i>
          </div>
          <div>
            <h2 class="text-2xl font-black text-slate-800 tracking-tight">Caja e Ingresos</h2>
            <p class="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Registrar nuevo pago
            </p>
          </div>
        </div>
      </div>

      <form @submit.prevent="procesarPago" class="space-y-8 relative z-10">

        <!-- Selección de Estudiante -->
        <div class="space-y-4">
          <FloatLabel variant="on">
            <AutoComplete id="estudiante" v-model="form.inscripcion" :suggestions="filteredInscripciones"
              @complete="buscarEstudiante" optionLabel="label" placeholder=" "
              class="w-full rounded-2xl! border-slate-200! focus:border-emerald-500! bg-slate-50/30! transition-all duration-300"
              inputClass="w-full! px-4! py-2!" panelClass="rounded-2xl! shadow-2xl!" dropdown />
            <label for="estudiante" class="text-slate-500 font-medium ml-2">Seleccionar Estudiante o CI</label>
          </FloatLabel>
        </div>

        <!-- Info de la Inscripción Seleccionada -->
        <transition name="fade">
          <div v-if="form.inscripcion && typeof form.inscripcion === 'object'"
            class="bg-slate-50 border border-slate-100 p-6 rounded-4xl flex flex-wrap gap-6 items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                <i class="pi pi-calendar-clock text-emerald-500 text-xl"></i>
              </div>
              <div>
                <span class="block text-[10px] font-black uppercase tracking-widest text-slate-400">Próximo
                  Vencimiento</span>
                <span class="text-lg font-bold text-slate-700">
                  {{ new Date(form.inscripcion.proximo_pago_vence).toLocaleDateString('es-ES', {
                    day: '2-digit', month:
                      'long'
                  }) }}
                </span>
              </div>
            </div>

            <div class="h-8 w-px bg-slate-200 hidden md:block"></div>

            <div class="flex items-center gap-4">
              <div class="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                <i class="pi pi-book text-blue-500 text-xl"></i>
              </div>
              <div>
                <span class="block text-[10px] font-black uppercase tracking-widest text-slate-400">Mensualidad</span>
                <span class="text-lg font-bold text-slate-800">
                  {{ form.inscripcion.cursos.costo_mensual }} USD
                </span>
              </div>
            </div>

            <div v-if="form.inscripcion.ultimoPago"
              class="w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-200 mt-2 md:mt-0">
              <span
                class="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit">
                <i class="pi pi-check text-[8px]"></i>
                Último pago: {{ form.inscripcion.ultimoPago.monto }} USD ({{ new
                  Date(form.inscripcion.ultimoPago.fecha_pago).toLocaleDateString() }})
              </span>
            </div>
          </div>
        </transition>

        <!-- Grid de Meses y Método -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <label class="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Tiempo a pagar</label>
            <InputGroup class="rounded-2xl! overflow-hidden border-none!">
              <InputGroupAddon class="bg-slate-100! border-slate-200! text-slate-500!">
                <i class="pi pi-calendar"></i>
              </InputGroupAddon>
              <InputNumber v-model="form.meses_a_pagar" showButtons :min="1" buttonLayout="horizontal" class="w-full"
                inputClass="text-center font-bold bg-white! border-slate-200!"
                incrementButtonClass="bg-slate-50! text-slate-600! border-slate-200!"
                decrementButtonClass="bg-slate-50! text-slate-600! border-slate-200!" incrementButtonIcon="pi pi-plus"
                decrementButtonIcon="pi pi-minus" />
              <InputGroupAddon class="bg-slate-50! border-slate-200! text-slate-500! font-bold px-4">
                Mes(es)
              </InputGroupAddon>
            </InputGroup>
          </div>

          <div class="space-y-4">
            <label class="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Forma de Pago</label>
            <FloatLabel variant="on">
              <Select id="metodo" v-model="form.metodo_pago" :options="metodosPago"
                class="w-full rounded-2xl! border-slate-200! focus:border-emerald-500! bg-slate-50/30!" />
              <label for="metodo" class="text-slate-500 font-medium ml-2">Método</label>
            </FloatLabel>
          </div>
        </div>

        <!-- Monto Total (Highlight & Editable) -->
        <div class="group relative">
          <div
            class="absolute -inset-1 bg-linear-to-r from-emerald-400 to-blue-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000">
          </div>
          <div
            class="relative bg-white p-6 rounded-2xl border border-emerald-100 flex items-center justify-between shadow-sm">
            <div class="space-y-2 w-full">
              <span class="block text-xs font-black uppercase tracking-widest text-emerald-600">Total a Recibir
                (Editable)</span>
              <div class="flex items-center gap-3">
                <InputNumber v-model="form.monto" mode="currency" currency="USD" locale="en-US" class="w-full"
                  inputClass="text-3xl font-black text-slate-800 tabular-nums border-none! bg-transparent! p-0! focus:ring-0!" />
              </div>
            </div>
            <div class="bg-emerald-50 p-4 rounded-xl shrink-0">
              <i class="pi pi-pencil text-xl text-emerald-400 mb-1 block text-center"></i>
              <i class="pi pi-money-bill text-2xl text-emerald-500"></i>
            </div>
          </div>
        </div>

        <!-- Observación -->
        <div class="space-y-4">
          <FloatLabel variant="on">
            <Textarea id="obs" v-model="form.observacion" rows="2"
              class="w-full rounded-2xl! border-slate-200! focus:border-emerald-500! bg-slate-50/30! transition-all duration-300"
              autoResize />
            <label for="obs" class="text-slate-500 font-medium ml-2">Notas u Observaciones</label>
          </FloatLabel>
        </div>

        <transition name="fade">
          <Message v-if="mensaje.texto" :severity="mensaje.severity" class="rounded-2xl! mt-4! shadow-sm border-none">
            {{ mensaje.texto }}
          </Message>
        </transition>

        <Button type="submit" :loading="loading"
          class="w-full! py-4! rounded-2xl! border-none! text-lg! font-bold! bg-linear-to-r! from-slate-800! to-slate-900! text-white! shadow-xl hover:scale-[1.02]! active:scale-[0.98]! transition-all duration-300 overflow-hidden relative group">
          <div class="flex items-center justify-center gap-3 relative z-10">
            <i class="pi pi-check-circle"></i>
            <span>Confirmar Transacción</span>
          </div>
          <!-- Brillo de hover -->
          <div
            class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-[-20deg]">
          </div>
        </Button>

      </form>
    </div>
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

:deep(.p-select) {
  border-radius: 1rem;
}

:deep(.p-inputnumber-input) {
  border-radius: 0;
}
</style>
