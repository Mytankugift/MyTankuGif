/**
 * Constantes para el onboarding
 * Categorías y actividades disponibles
 * 
 * 📝 PARA AGREGAR MÁS CATEGORÍAS O ACTIVIDADES:
 * Simplemente agrega nuevos objetos al array correspondiente.
 * El componente HoneycombGrid organizará automáticamente en patrón 4-5-4.
 */

// Categorías de interés (Top 8 recomendadas)
// ⬇️ AGREGAR MÁS CATEGORÍAS AQUÍ ⬇️
export const ONBOARDING_CATEGORIES = [
  { slug: 'tecnologia', label: 'Tecnología' },
  { slug: 'moda', label: 'Moda' },
  { slug: 'hogar', label: 'Hogar' },
  { slug: 'salud-bienestar', label: 'Salud & Bienestar' },

  { slug: 'deportes', label: 'Deportes' },
  { slug: 'cocina', label: 'Cocina' },
  { slug: 'mascotas', label: 'Mascotas' },
  { slug: 'jugueteria', label: 'Juguetería' },
  { slug: 'libros', label: 'Libros' },

  { slug: 'cine-series', label: 'Cine y Series' },
  { slug: 'musica', label: 'Música' },
  { slug: 'viajes', label: 'Viajes' },
  { slug: 'videojuegos', label: 'Videojuegos' },
  { slug: 'belleza-cuidado', label: 'Belleza & Cuidado' },
] as const

// Actividades/Hobbies (12 oficiales)
// ⬇️ AGREGAR MÁS ACTIVIDADES AQUÍ ⬇️
export const ONBOARDING_ACTIVITIES = [
  { slug: 'lectura', label: 'Lectura' },
  { slug: 'running', label: 'Running' },
  { slug: 'arte-dibujo', label: 'Arte & Dibujo' },
  { slug: 'musica', label: 'Música' },

  { slug: 'cine-series', label: 'Cine y series' },
  { slug: 'entrenamiento-fisico', label: 'Fitness' },
  { slug: 'cocina', label: 'Cocina' },
  { slug: 'videojuegos', label: 'Videojuegos' },
  { slug: 'fotografia', label: 'Fotografía' },

  { slug: 'bienestar-meditacion', label: 'Bienestar & Meditación' },
  { slug: 'moda-estilo', label: 'Moda & Estilo' },
  { slug: 'viajes', label: 'Viajes' },
  { slug: 'escritura', label: 'Escritura' },
  { slug: 'manualidades', label: 'Manualidades' },
] as const

// Meses del año
export const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
] as const

// Días del mes (1-31)
export const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

// Textos de los pasos
export const ONBOARDING_STEPS = [
  {
    title: '🎉 ¿Cuándo celebramos contigo?',
    subtitle: 'Queremos sorprenderte en tu día especial.',
    helper: 'Nada de spam, lo prometemos 😉',
  },
  {
    title: '🛍️ ¿Qué te gustaría ver primero?',
    subtitle: 'Elige las categorías que más te llaman la atención.',
    helper: 'Así personalizamos tu feed desde el primer momento.',
    secondaryLabel: 'Top recomendadas',
  },
  {
    title: '💡 ¿Qué disfrutas hacer en tu tiempo libre?',
    subtitle: 'Queremos mostrarte contenido que vaya contigo.',
  },
] as const
