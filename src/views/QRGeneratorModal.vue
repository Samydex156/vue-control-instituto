<script setup>
import { ref, watch, computed } from 'vue'
import QRCode from 'qrcode'
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

// Recibimos el objeto (puede ser estudiante o inscripción, mientras tenga nombre y codigo_qr_data)
const props = defineProps({
  show: Boolean,
  data: Object // { fullName: 'Juan', codigo_qr_data: '...' }
})

const emit = defineEmits(['update:show']) // Para usar v-model:visible

const qrImageUrl = ref('')
const generating = ref(false)

// Nombre del archivo para descargar
const downloadFileName = computed(() => {
  if (!props.data) return 'qr-code.png'
  // Usamos fullName si existe, si no nombre
  const name = props.data.fullName || props.data.nombre || 'estudiante'
  const sanitized_name = name.replace(/\s+/g, '_').toLowerCase()
  return `QR-${sanitized_name}.png`
})

const generateQR = async () => {
  if (!props.data?.codigo_qr_data) return

  generating.value = true
  try {
    const options = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1,
      margin: 2,
      scale: 10,
      width: 400,
      color: { dark: '#000000', light: '#ffffff' }
    }
    qrImageUrl.value = await QRCode.toDataURL(props.data.codigo_qr_data, options)
  } catch (err) {
    console.error('Error generando QR:', err)
  } finally {
    generating.value = false
  }
}

const downloadImage = () => {
  if (!qrImageUrl.value) return
  const link = document.createElement('a')
  link.href = qrImageUrl.value
  link.download = downloadFileName.value
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Observar cambios
watch(() => props.show, (isOpen) => {
  if (isOpen && props.data) {
    generateQR()
  } else {
    qrImageUrl.value = ''
  }
})
</script>

<template>
  <Dialog :visible="show" @update:visible="val => emit('update:show', val)" modal header="Credencial QR"
    :style="{ width: '25rem' }" class="rounded-3xl overflow-hidden">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="bg-indigo-600 text-white p-2 rounded-lg">
          <i class="pi pi-qrcode text-lg"></i>
        </div>
        <span class="text-xl font-bold text-slate-800">Acceso Digital</span>
      </div>
    </template>

    <div class="flex flex-col items-center gap-4 py-2">
      <div class="text-center w-full">
        <h4 class="text-lg font-bold text-slate-800 mb-1">
          {{ data?.fullName || data?.nombre }}
        </h4>
        <div class="bg-slate-100 py-1 px-3 rounded-lg inline-block">
          <p class="text-xs font-mono text-slate-500 break-all">
            {{ data?.codigo_qr_data }}
          </p>
        </div>
      </div>

      <div class="relative group">
        <div
          class="absolute -inset-1 bg-linear-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-500">
        </div>
        <div
          class="relative bg-white p-4 border-2 border-dashed border-slate-200 rounded-xl w-64 h-64 flex items-center justify-center">
          <i v-if="generating" class="pi pi-spin pi-spinner text-4xl text-indigo-500"></i>
          <img v-else-if="qrImageUrl" :src="qrImageUrl" alt="QR Code" class="w-full h-full object-contain" />
          <div v-else class="text-red-400 flex flex-col items-center">
            <i class="pi pi-exclamation-circle text-2xl mb-2"></i>
            <span class="text-xs">Sin código asignado</span>
          </div>
        </div>
      </div>

      <p class="text-xs text-slate-400 text-center max-w-[80%]">
        Este código es único para la inscripción actual. Úsalo para registrar asistencia.
      </p>

      <Button @click="downloadImage" :disabled="!qrImageUrl || generating" label="Descargar Credencial PNG"
        icon="pi pi-download" class="w-full mt-2 rounded-xl" />
    </div>
  </Dialog>
</template>