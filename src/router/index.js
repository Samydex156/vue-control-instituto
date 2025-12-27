import { createRouter, createWebHistory } from "vue-router";
import CrearCurso from "../views/CrearCurso.vue";
import HomeView from "../views/HomeView.vue";
import DemoFeatures from "../views/DemoFeatures.vue";
import NuevaInscripcion from "../views/NuevaInscripcion.vue";
import RegistrarPago from "../views/RegistrarPago.vue";
import StudentsDashboard from "../views/StudentsDashboard.vue";
import NuevoEstudiante from "../views/NuevoEstudiante.vue";
import MonitorAsistencia from "../views/MonitorAsistencia.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/demo",
      name: "demo",
      component: DemoFeatures,
    },
    {
      path: "/inscripcion",
      name: "inscripcion",
      component: NuevaInscripcion,
    },
    {
      path: "/nuevo-curso",
      name: "Nuevo curso",
      component: CrearCurso,
    },
    {
      path: "/pagos",
      name: "pagos",
      component: RegistrarPago,
    },
    {
      path: "/registros",
      name: "registros",
      component: StudentsDashboard,
    },
    {
      path: "/nuevo-estudiante",
      name: "Nuevo estudiante",
      component: NuevoEstudiante,
    },
    {
      path: "/monitor-asistencia",
      name: "Monitor de asistencia",
      component: MonitorAsistencia,
    }
    // Aquí irían tus rutas futuras como /estudiantes, /cursos
  ],
});

export default router;
