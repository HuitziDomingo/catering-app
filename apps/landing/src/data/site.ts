/**
 * Datos de relleno de la landing (mockup). Todo el texto, precios, contacto
 * y fotos vive aquí para cambiarlo sin tocar los componentes. Las fotos son
 * temporales de Unsplash (ver IMAGES.md): se reemplazarán por fotos reales
 * del negocio.
 */

/** Número de WhatsApp del negocio, en formato internacional sin "+" (placeholder). */
export const WHATSAPP_NUMBER = '520000000000';

/** Link de wa.me con un mensaje prellenado. */
export function whatsappLink(message = 'Hola, quiero cotizar un evento con Santo Sazón.'): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export interface Photo {
  /** id de images.unsplash.com (lo que sigue a "photo-"). */
  id: string;
  alt: string;
  author: string;
  /** @usuario en Unsplash, sin "@". */
  username: string;
}

/** URL de Unsplash recortada al tamaño pedido. */
export function photoUrl(photo: Photo, width: number, height?: number): string {
  const params = new URLSearchParams({ auto: 'format', fit: 'crop', w: String(width), q: '80' });
  if (height) params.set('h', String(height));
  return `https://images.unsplash.com/photo-${photo.id}?${params}`;
}

/** srcset de anchos para fotos responsivas. */
export function photoSrcset(photo: Photo, widths: number[], ratio?: number): string {
  return widths
    .map((w) => `${photoUrl(photo, w, ratio ? Math.round(w * ratio) : undefined)} ${w}w`)
    .join(', ');
}

export const business = {
  name: 'Santo Sazón',
  tagline: 'Catering mexicano para tus mejores momentos',
  city: 'Ciudad de México',
  cityShort: 'CDMX',
  phone: '55 0000 0000',
  email: 'hola@santosazon.mx',
  address: 'Calle Ejemplo 123, Col. Centro, Ciudad de México',
  hours: [
    { days: 'Lunes a viernes', time: '9:00 a 19:00' },
    { days: 'Sábado', time: '9:00 a 15:00' },
    { days: 'Domingo', time: 'Solo eventos agendados' },
  ],
  social: [
    { name: 'Instagram', href: '#' },
    { name: 'Facebook', href: '#' },
    { name: 'TikTok', href: '#' },
  ],
};

export const nav = [
  { label: 'Servicios', href: '#servicios' },
  { label: 'Menú', href: '#menu' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Contacto', href: '#contacto' },
];

export const photos = {
  heroTable: {
    id: '1676081986290-ac79c2968c3f',
    alt: 'Mesa vista desde arriba con cazuelas de barro, enchiladas, arroz y salsas',
    author: 'Israel Caballero',
    username: 'isracab',
  },
  socialToast: {
    id: '1527529482837-4698179dc6ce',
    alt: 'Invitados brindando con copas en una celebración iluminada',
    author: 'Al Elmes',
    username: 'alelmes',
  },
  corporateBuffet: {
    id: '1555244162-803834f70033',
    alt: 'Buffet con charolas de acero llenas de comida para un evento',
    author: 'Saile Ilyas',
    username: 'saile_ilyas',
  },
  weddingHall: {
    id: '1723832348105-2e69f948135a',
    alt: 'Salón de boda con mesas largas, sillas doradas y luces colgantes',
    author: 'Jennifer Kalenberg',
    username: 'jkalen71',
  },
  takeawayBoxes: {
    id: '1672826979217-7156a305acf5',
    alt: 'Cajas de cartón con bocadillos listas para llevar',
    author: 'Thriday',
    username: 'thriday',
  },
  tacosLime: {
    id: '1648437595587-e6a8b0cdf1f9',
    alt: 'Tres tacos con carne y limón sobre una tabla de madera',
    author: 'Frankie Lopez',
    username: 'frankielopez',
  },
  beefTacos: {
    id: '1599974579688-8dbdd335c77f',
    alt: 'Tacos de res en tortilla de maíz con cebolla y cilantro',
    author: 'Jeswin Thomas',
    username: 'jeswinthomas',
  },
  houseTacos: {
    id: '1565299585323-38d6b0865b47',
    alt: 'Tacos de verduras asadas con limón exprimido encima',
    author: 'Chad Montano',
    username: 'briewilly',
  },
  guacamole: {
    id: '1628394029816-1dc524670f60',
    alt: 'Guacamole, totopos y un plato hondo sobre un mantel bordado',
    author: 'Jed Owen',
    username: 'jediahowen',
  },
  nachos: {
    id: '1582169296194-e4d644c48063',
    alt: 'Totopos con frijoles, queso y pico de gallo en un tazón negro',
    author: 'Coffeefy Workafe',
    username: 'coffeefyworkafe',
  },
  clayPots: {
    id: '1584208632869-05fa2b2a5934',
    alt: 'Guisados servidos en cazuelas de barro sobre azulejo de talavera',
    author: 'Roberto Carlos Román Don',
    username: 'srcharls',
  },
  talaveraTacos: {
    id: '1700625916627-16ad4fb0553c',
    alt: 'Tacos, guacamole y salsas sobre una mesa de azulejos de colores',
    author: 'Hybrid Storytellers',
    username: 'hybridstorytellers',
  },
  grazingTable: {
    id: '1576842546422-60562b9242ae',
    alt: 'Mesa de bocadillos con pan, quesos y fruta en un evento al aire libre',
    author: 'Yukiko Kanada',
    username: 'okikuy0930',
  },
  plating: {
    id: '1687369595840-e96a912586f1',
    alt: 'Cocinera con guantes emplatando platillos en una cocina profesional',
    author: 'Gastro Editorial',
    username: 'gastroeditorial',
  },
  pastries: {
    id: '1637059395523-d5a35541d544',
    alt: 'Charolas con panes rellenos y tartaletas para un evento',
    author: 'Adele De Bruyn',
    username: 'adele27',
  },
  roundTables: {
    id: '1524824267900-2fa9cbf7a506',
    alt: 'Salón con mesas redondas vestidas y centros de flores',
    author: 'Thomas William',
    username: 'thomasw',
  },
  rusticTable: {
    id: '1647296020388-787fdae78e3c',
    alt: 'Mesa de madera con platos, copas y hojas verdes para una cena',
    author: 'Taylor Gray',
    username: 'captured_photography',
  },
} satisfies Record<string, Photo>;

export const services = [
  {
    title: 'Eventos sociales',
    text: 'Cumpleaños, bautizos y reuniones familiares con el sabor de casa, servido como en un restaurante.',
    photo: photos.socialToast,
  },
  {
    title: 'Corporativos',
    text: 'Desayunos de trabajo, comidas de equipo y coffee breaks puntuales para tu oficina.',
    photo: photos.corporateBuffet,
  },
  {
    title: 'Bodas',
    text: 'Menús de tres tiempos o buffet mexicano para el día más importante, de 50 a 500 invitados.',
    photo: photos.weddingHall,
  },
  {
    title: 'Pedidos para llevar',
    text: 'Charolas y bocadillos listos para recoger o enviar, ideales para reuniones pequeñas.',
    photo: photos.takeawayBoxes,
  },
];

export const menuHighlights = [
  {
    name: 'Tacos al pastor',
    description: 'Cerdo marinado en achiote, piña asada, cebolla y cilantro.',
    price: 85,
    photo: photos.tacosLime,
  },
  {
    name: 'Tacos de suadero',
    description: 'Res cocinada lentamente, en tortilla de maíz hecha a mano.',
    price: 90,
    photo: photos.beefTacos,
  },
  {
    name: 'Tacos de la huerta',
    description: 'Calabaza, elote y champiñón asados con salsa de chile morita.',
    price: 75,
    photo: photos.houseTacos,
  },
  {
    name: 'Guacamole de molcajete',
    description: 'Aguacate, chile serrano y limón, con totopos recién hechos.',
    price: 65,
    photo: photos.guacamole,
  },
  {
    name: 'Totopos preparados',
    description: 'Frijoles, queso gratinado, pico de gallo y crema.',
    price: 70,
    photo: photos.nachos,
  },
  {
    name: 'Guisados en cazuela',
    description: 'Tinga, rajas con crema y chicharrón en salsa verde, para compartir.',
    price: 120,
    photo: photos.clayPots,
  },
];

/** Refleja lo que ya hace la app: pedido, pago con Mercado Pago y aviso + recibo por WhatsApp. */
export const steps = [
  {
    title: 'Eliges en la app',
    text: 'Arma tu pedido con el menú, la fecha de tu evento y el número de personas.',
  },
  {
    title: 'Pagas seguro con Mercado Pago',
    text: 'Tarjeta, transferencia u OXXO, con el respaldo de Mercado Pago.',
  },
  {
    title: 'Recibes confirmación por WhatsApp',
    text: 'Te avisamos cuando tu pedido está confirmado y te enviamos tu recibo.',
  },
];

export const gallery = [
  photos.talaveraTacos,
  photos.roundTables,
  photos.grazingTable,
  photos.plating,
  photos.rusticTable,
  photos.pastries,
];

/** Todas las fotos usadas en la página, para los créditos del footer. */
export const allPhotos: Photo[] = Object.values(photos);
