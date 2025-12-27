<script setup>
import { ref, onMounted, computed, reactive, watch } from 'vue'
import { supabase } from '../lib/supabaseClient.js'
import QRCode from 'qrcode'

// Importaciones de PrimeVue
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Tag from 'primevue/tag';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';
import Message from 'primevue/message';
import FloatLabel from 'primevue/floatlabel';

// --- ESTADO GENERAL ---
const loading = ref(true)
const filters = ref({ global: { value: null, matchMode: 'contains' } });
const students = ref([]) // Ahora contendrá registros de INSCRIPCIONES mapeados

// --- ESTADO PARA PAGOS ---
const showPaymentDialog = ref(false)
const paymentLoading = ref(false)
const paymentMessage = ref({ texto: '', severity: '' })

const paymentForm = reactive({
  inscripcion: null,
  monto: 0,
  metodo_pago: 'Efectivo',
  observacion: '',
  meses_a_pagar: 1
})

const metodosPago = ['Efectivo', 'QR / Transferencia', 'Tarjeta']

// --- ESTADO PARA QR ---
const showQRDialog = ref(false)
const selectedStudentNameQR = ref('')
const selectedQRData = ref('')
const qrImageUrl = ref('')
const generatingQR = ref(false)

// 1. CARGAR DATOS
const fetchData = async () => {
  loading.value = true

  // Consultamos directamente a INSCRIPCIONES para no perder ningún curso de un estudiante
  const { data, error } = await supabase
    .from('inscripciones')
    .select(`
      id, proximo_pago_vence, estado, modulo_actual, codigo_qr_data,
      estudiantes ( id, nombre, apellido_paterno, ci ),
      cursos ( nombre, costo_mensual ),
      pagos ( id, monto, fecha_pago, metodo_pago )
    `)
    .order('id', { ascending: false })

  if (!error) {
    students.value = data.map(ins => {
      const today = new Date()
      const dueDate = new Date(ins.proximo_pago_vence)

      let statusSeverity = 'success'
      let statusText = 'AL DÍA'

      if (today > dueDate) {
        statusSeverity = 'danger'
        statusText = 'VENCIDO'
      }

      return {
        ...ins, // Datos de la inscripción
        fullName: `${ins.estudiantes?.nombre} ${ins.estudiantes?.apellido_paterno}`,
        ci: ins.estudiantes?.ci,
        studentId: ins.estudiantes?.id,
        statusSeverity,
        statusText,
        allPayments: ins.pagos || []
      }
    })
  }
  loading.value = false
}

// 2. LÓGICA DE PAGO
const openPayment = (enrollmentRow) => {
  // Limpiar form
  paymentForm.inscripcion = {
    ...enrollmentRow,
    estudiantes: { nombre: enrollmentRow.fullName }
  }
  paymentForm.meses_a_pagar = 1
  paymentForm.monto = enrollmentRow.cursos?.costo_mensual || 0
  paymentForm.metodo_pago = 'Efectivo'
  paymentForm.observacion = ''
  paymentMessage.value = { texto: '', severity: '' }

  showPaymentDialog.value = true
}

// Watcher para recalcular monto en el modal
watch(() => paymentForm.meses_a_pagar, (newVal) => {
  if (paymentForm.inscripcion) {
    paymentForm.monto = paymentForm.inscripcion.cursos.costo_mensual * newVal
  }
})

const processPayment = async () => {
  if (!paymentForm.inscripcion) return

  paymentLoading.value = true
  try {
    // 1. Insertar Pago
    const { error: errPayment } = await supabase.from('pagos').insert([{
      inscripcion_id: paymentForm.inscripcion.id,
      monto: paymentForm.monto,
      metodo_pago: paymentForm.metodo_pago,
      observacion: paymentForm.observacion,
      fecha_pago: new Date()
    }])

    if (errPayment) throw errPayment

    // 2. Calcular nueva fecha de vencimiento
    let fechaBase = new Date(paymentForm.inscripcion.proximo_pago_vence)
    const hoy = new Date()
    if (fechaBase < hoy) fechaBase = hoy
    fechaBase.setMonth(fechaBase.getMonth() + paymentForm.meses_a_pagar)

    // 3. Actualizar Inscripción
    const { error: errUpdate } = await supabase.from('inscripciones')
      .update({ proximo_pago_vence: fechaBase.toISOString() })
      .eq('id', paymentForm.inscripcion.id)

    if (errUpdate) throw errUpdate

    paymentMessage.value = { texto: 'Pago registrado con éxito', severity: 'success' }

    setTimeout(() => {
      showPaymentDialog.value = false
      fetchData()
    }, 1500)

  } catch (error) {
    paymentMessage.value = { texto: error.message, severity: 'error' }
  } finally {
    paymentLoading.value = false
  }
}

// 3. LÓGICA DE QR
const openQRModal = async (enrollmentRow) => {
  if (!enrollmentRow.codigo_qr_data) {
    alert("Esta inscripción no tiene un código QR generado.")
    return
  }

  selectedStudentNameQR.value = enrollmentRow.fullName
  selectedQRData.value = enrollmentRow.codigo_qr_data

  showQRDialog.value = true
  qrImageUrl.value = ''
  generatingQR.value = true

  try {
    qrImageUrl.value = await QRCode.toDataURL(selectedQRData.value, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 400,
      margin: 2
    })
  } catch (err) {
    console.error(err)
  } finally {
    generatingQR.value = false
  }
}

const downloadQRImage = () => {
  if (!qrImageUrl.value || !selectedStudentNameQR.value) return

  const cleanName = selectedStudentNameQR.value.replace(/\s+/g, '_').toLowerCase()
  const fileName = `QR-${cleanName}.png`

  const link = document.createElement('a')
  link.href = qrImageUrl.value
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(() => fetchData())
</script>

<template>
  <div class="p-6 bg-slate-50 min-h-screen">
    <div class="max-w-7xl mx-auto">

      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-black text-slate-800 tracking-tight">Kardex Estudiantil</h1>
          <p class="text-slate-500 font-medium">Gestión de inscripciones y cobranza activa</p>
        </div>
        <router-link to="/inscripcion" class="no-underline">
          <Button label="Registrar Nueva Inscripción" icon="pi pi-user-plus" severity="help" class="rounded-xl!"
            raised />
        </router-link>
      </div>

      <div class="card bg-white p-2 rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
        <DataTable :value="students" :loading="loading" paginator :rows="10" v-model:filters="filters"
          :globalFilterFields="['fullName', 'cursos.nombre', 'ci']" tableStyle="min-width: 60rem"
          class="p-datatable-sm">

          <template #header>
            <div class="flex justify-end">
              <IconField iconPosition="left">
                <InputIcon class="pi pi-search" />
                <InputText v-model="filters['global'].value" placeholder="Buscar estudiante..." />
              </IconField>
            </div>
          </template>

          <template #empty> No se encontraron estudiantes. </template>

          <Column header="Estudiante" sortable field="fullName">
            <template #body="slotProps">
              <div class="font-bold text-slate-800">{{ slotProps.data.fullName }}</div>
              <div class="text-[10px] font-mono text-slate-400">CI: {{ slotProps.data.ci }}</div>
            </template>
          </Column>

          <Column header="Curso y Nivel" sortable field="cursos.nombre">
            <template #body="slotProps">
              <div class="flex flex-col">
                <span class="font-bold text-indigo-600">{{ slotProps.data.cursos.nombre }}</span>
                <span class="text-[10px] font-medium bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full w-fit">
                  Módulo {{ slotProps.data.modulo_actual }}
                </span>
              </div>
            </template>
          </Column>

          <Column header="Estado Pago">
            <template #body="slotProps">
              <div class="flex flex-col gap-1">
                <Tag :value="slotProps.data.statusText" :severity="slotProps.data.statusSeverity" class="text-[9px]!" />
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                  Vence: {{ new Date(slotProps.data.proximo_pago_vence).toLocaleDateString() }}
                </span>
              </div>
            </template>
          </Column>

          <Column header="Historial Pagos">
            <template #body="slotProps">
              <div class="flex flex-wrap gap-1 max-w-[150px]">
                <div v-for="pago in slotProps.data.allPayments" :key="pago.id"
                  class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200"
                  v-tooltip.top="`${pago.monto} USD - ${pago.metodo_pago}`">
                  {{ new Date(pago.fecha_pago).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) }}
                </div>
                <span v-if="slotProps.data.allPayments.length === 0" class="text-xs text-slate-300 italic">Sin
                  pagos</span>
              </div>
            </template>
          </Column>

          <Column header="" headerStyle="width: 8rem; text-align: center" bodyStyle="text-align: center">
            <template #body="slotProps">
              <div class="flex gap-2 justify-end">
                <Button icon="pi pi-dollar" v-tooltip.left="'Registrar Pago'" severity="success" rounded text
                  aria-label="Pagar" @click="openPayment(slotProps.data)" />

                <Button v-if="slotProps.data.codigo_qr_data" icon="pi pi-qrcode" v-tooltip.left="'Ver QR'"
                  severity="info" rounded text aria-label="Código QR" @click="openQRModal(slotProps.data)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

    <Dialog v-model:visible="showPaymentDialog" modal header="Registrar Pago" :style="{ width: '30rem' }"
      class="rounded-3xl! overflow-hidden">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="bg-emerald-100 p-2 rounded-xl text-emerald-600">
            <i class="pi pi-wallet text-xl"></i>
          </div>
          <span class="text-xl font-black text-slate-800 tracking-tight">Cobro de Mensualidad</span>
        </div>
      </template>

      <div class="space-y-6 pt-2">
        <!-- Info Resumen -->
        <div v-if="paymentForm.inscripcion"
          class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
          <div>
            <span class="block text-[10px] font-black uppercase tracking-widest text-slate-400">Estudiante</span>
            <span class="font-bold text-slate-700">{{ paymentForm.inscripcion.estudiantes.nombre }}</span>
          </div>
          <div class="text-right">
            <span class="block text-[10px] font-black uppercase tracking-widest text-slate-400">Vence</span>
            <span class="font-bold text-rose-500">{{ new
              Date(paymentForm.inscripcion.proximo_pago_vence).toLocaleDateString() }}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase text-slate-400 ml-1">Meses</label>
            <InputGroup>
              <InputNumber v-model="paymentForm.meses_a_pagar" showButtons :min="1" buttonLayout="horizontal"
                class="w-full" inputClass="text-center font-bold" incrementButtonIcon="pi pi-plus"
                decrementButtonIcon="pi pi-minus" />
            </InputGroup>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase text-slate-400 ml-1">Método</label>
            <Select v-model="paymentForm.metodo_pago" :options="metodosPago" class="w-full" />
          </div>
        </div>

        <div class="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
          <div>
            <span class="block text-[10px] font-black uppercase text-emerald-600">Total a Cobrar</span>
            <InputNumber v-model="paymentForm.monto" mode="currency" currency="USD" locale="en-US"
              inputClass="text-2xl font-black text-emerald-700 bg-transparent border-none p-0 focus:ring-0" />
          </div>
          <i class="pi pi-money-bill text-3xl text-emerald-400 opacity-50"></i>
        </div>

        <FloatLabel variant="on">
          <Textarea v-model="paymentForm.observacion" rows="2" class="w-full rounded-xl!" autoResize />
          <label>Observaciones</label>
        </FloatLabel>

        <transition name="fade">
          <Message v-if="paymentMessage.texto" :severity="paymentMessage.severity" class="m-0!">{{ paymentMessage.texto
          }}
          </Message>
        </transition>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end mt-4">
          <Button label="Cancelar" text severity="secondary" @click="showPaymentDialog = false" />
          <Button label="Registrar Pago" icon="pi pi-check" severity="success" class="rounded-xl! px-6"
            :loading="paymentLoading" @click="processPayment" />
        </div>
      </template>
    </Dialog>

    <Dialog v-model:visible="showQRDialog" modal header="Credencial QR" :style="{ width: '25rem' }">
      <div class="flex flex-col items-center gap-4 py-4">

        <div class="text-center">
          <h3 class="font-bold text-xl text-slate-800">{{ selectedStudentNameQR }}</h3>
          <span class="text-sm font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
            {{ selectedQRData }}
          </span>
        </div>

        <div
          class="border-2 border-dashed border-slate-200 rounded-xl p-4 w-64 h-64 flex items-center justify-center bg-slate-50">
          <i v-if="generatingQR" class="pi pi-spin pi-spinner text-3xl text-indigo-500"></i>
          <img v-else-if="qrImageUrl" :src="qrImageUrl" alt="QR Code" class="w-full h-full object-contain" />
          <span v-else class="text-slate-400 text-sm">No se pudo generar</span>
        </div>

        <p class="text-xs text-slate-500 text-center px-4">
          Este QR pertenece al curso actual. Si el estudiante cambia de curso, se generará uno nuevo.
        </p>

        <Button label="Descargar Imagen PNG" icon="pi pi-download" severity="help" class="w-full"
          :disabled="!qrImageUrl" @click="downloadQRImage" />
      </div>
    </Dialog>

  </div>
</template>