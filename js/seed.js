/**
 * TravelOne Initial Seed Data ("Guatemala 2026" Demo)
 */

import { getAllFromStore, saveItem } from './db.js';

export async function seedDemoDataIfNeeded() {
  const existingTrips = await getAllFromStore('trips');
  if (existingTrips.length > 0) {
    return; // Already initialized
  }

  const demoTripId = 'trip-gt-2026';

  const demoTrip = {
    id: demoTripId,
    name: 'Guatemala 2026',
    destination: 'Antigua Guatemala & Lago Atitlán',
    startDate: '2026-08-15',
    endDate: '2026-08-18',
    status: 'en_curso', // planificando | en_curso | finalizado
    budget: 3000,
    mainCurrency: 'GTQ',
    secondaryCurrencies: ['USD'],
    exchangeRates: { USD: 7.70 },
    coverEmoji: '🇬🇹',
    createdAt: new Date().toISOString()
  };

  await saveItem('trips', demoTrip);

  // Itinerary
  const itineraryItems = [
    { tripId: demoTripId, date: '2026-08-15', time: '08:00', title: 'Desayuno en Café El Unión', category: 'Comida', location: 'Café El Unión', address: 'Calle del Arco #4, Antigua', cost: 65, notes: 'Famoso por su café de especialidad y desayunos típicos', status: 'Completado', order: 1 },
    { tripId: demoTripId, date: '2026-08-15', time: '10:00', title: 'Visitar Arco de Santa Catalina y Cerro de la Cruz', category: 'Turismo', location: 'Antigua Guatemala', address: 'Calle del Arco', cost: 0, notes: 'Llevar cámara para vista panorámica del Volcán de Agua', status: 'Completado', order: 2 },
    { tripId: demoTripId, date: '2026-08-15', time: '13:00', title: 'Almuerzo en Restaurante La Cuevita', category: 'Comida', location: 'La Cuevita', address: '5ta Avenida Norte', cost: 120, notes: 'Probar el Pepián de pollo tradicional', status: 'Completado', order: 3 },
    { tripId: demoTripId, date: '2026-08-15', time: '15:00', title: 'Compras en Mercado de Artesanías', category: 'Compras', location: 'Mercado El Carmen', address: '3ra Avenida Norte', cost: 250, notes: 'Comprar textiles y café para regalo', status: 'Completado', order: 4 },
    { tripId: demoTripId, date: '2026-08-15', time: '19:00', title: 'Cena en Frida\'s Antigua', category: 'Comida', location: 'Frida\'s Restaurant', address: 'Calle del Arco', cost: 180, notes: 'Ambiente agradable y cócteles artesanales', status: 'En progreso', order: 5 },
    { tripId: demoTripId, date: '2026-08-16', time: '08:30', title: 'Shuttle hacia Panajachel (Lago de Atitlán)', category: 'Transporte', location: 'Parque Central Antigua', address: 'Punto de encuentro Parque Central', cost: 150, notes: 'Duración aproximada 2.5 horas', status: 'Pendiente', order: 1 },
    { tripId: demoTripId, date: '2026-08-16', time: '12:30', title: 'Check-in en Posada de Don Rodrigo Panajachel', category: 'Hotel', location: 'Panajachel', address: 'Calle Santander', cost: 0, notes: 'Reserva confirmed #PANA-991', status: 'Pendiente', order: 2 },
    { tripId: demoTripId, date: '2026-08-16', time: '14:30', title: 'Tour en lancha por San Juan La Laguna y Santiago', category: 'Turismo', location: 'Embarcadero Panajachel', address: 'Calle del Lago', cost: 200, notes: 'Visita a cooperativas de teñido natural y galerías', status: 'Pendiente', order: 3 }
  ];

  for (const item of itineraryItems) {
    await saveItem('itinerary', item);
  }

  // Reservations
  const reservations = [
    { tripId: demoTripId, type: 'Hotel', name: 'Porta Hotel Antigua', date: '2026-08-15', time: '15:00', address: '8va Calle Poniente No. 1, Antigua', confirmationNo: 'HTL-8829', price: 650, contact: '+502 7931 0600', notes: 'Incluye desayuno buffet. Habitación vista a los jardines.' },
    { tripId: demoTripId, type: 'Hotel', name: 'Posada de Don Rodrigo Panajachel', date: '2026-08-16', time: '14:00', address: 'Calle Santander, Panajachel', confirmationNo: 'PANA-991', price: 580, contact: '+502 7762 2629', notes: 'Vista al Lago de Atitlán' },
    { tripId: demoTripId, type: 'Tour', name: 'Tour Privado San Juan La Laguna', date: '2026-08-16', time: '14:30', address: 'Muelle Principal Panajachel', confirmationNo: 'ATIT-2026', price: 200, contact: '+502 5555 1234', notes: 'Lancha privada + guía local en telar maya' }
  ];

  for (const item of reservations) {
    await saveItem('reservations', item);
  }

  // Expenses
  const expenses = [
    { tripId: demoTripId, date: '2026-08-15', description: 'Noche Porta Hotel Antigua', category: 'Hotel', amount: 650, currency: 'GTQ', paidBy: 'Yo', notes: 'Pago anticipado con tarjeta' },
    { tripId: demoTripId, date: '2026-08-15', description: 'Desayuno Café El Unión', category: 'Alimentación', amount: 65, currency: 'GTQ', paidBy: 'Yo', notes: 'Efectivo' },
    { tripId: demoTripId, date: '2026-08-15', description: 'Almuerzo La Cuevita', category: 'Alimentación', amount: 120, currency: 'GTQ', paidBy: 'Carlos', notes: 'Compartido' },
    { tripId: demoTripId, date: '2026-08-15', description: 'Textiles y Recuerdos Mercado', category: 'Souvenirs', amount: 250, currency: 'GTQ', paidBy: 'Yo', notes: 'Regalos familiares' },
    { tripId: demoTripId, date: '2026-08-16', description: 'Shuttle Antigua - Atitlán', category: 'Transporte', amount: 150, currency: 'GTQ', paidBy: 'Yo', notes: 'Reserva compartida' }
  ];

  for (const item of expenses) {
    await saveItem('expenses', item);
  }

  // Category Budgets Breakdown (Stored in Trip or computed)

  // Places
  const places = [
    { tripId: demoTripId, name: 'Arco de Santa Catalina', category: 'Atracción', address: 'Calle del Arco, Antigua', approxPrice: 0, priority: 'Alta', notes: 'Icono de la ciudad', visited: true, url: '' },
    { tripId: demoTripId, name: 'Cerro de la Cruz', category: 'Mirador', address: 'Antigua Guatemala', approxPrice: 0, priority: 'Alta', notes: 'Excelente panorama', visited: true, url: '' },
    { tripId: demoTripId, name: 'Volcán de Pacaya', category: 'Atracción', address: 'San Vicente Pacaya', approxPrice: 250, priority: 'Media', notes: 'Caminata de 2 horas. Asar malvaviscos en lava.', visited: false, url: '' },
    { tripId: demoTripId, name: 'Café Descalzo', category: 'Cafetería', address: 'Calle Santander, Panajachel', approxPrice: 45, priority: 'Media', notes: 'Famosos licuados y café frente al lago', visited: false, url: '' },
    { tripId: demoTripId, name: 'Mercado de Chichicastenango', category: 'Mercado', address: 'Chichicastenango', approxPrice: 100, priority: 'Baja', notes: 'Mercado indígena los jueves y domingos', visited: false, url: '' }
  ];

  for (const item of places) {
    await saveItem('places', item);
  }

  // Shopping List
  const shopping = [
    { tripId: demoTripId, product: 'Café de Origen Antigua (500g)', category: 'Comida', place: 'Café El Unión', estPrice: 80, realPrice: 75, quantity: 2, bought: true, notes: 'Grano entero tostado medio' },
    { tripId: demoTripId, product: 'Huipil bordado artesanal', category: 'Souvenirs', place: 'Mercado El Carmen', estPrice: 300, realPrice: 280, quantity: 1, bought: true, notes: 'Diseño de San Juan La Laguna' },
    { tripId: demoTripId, product: 'Chocolate artesanal con cardamomo', category: 'Regalos', place: 'ChocoMuseo', estPrice: 50, realPrice: 50, quantity: 3, bought: false, notes: 'Para la familia' },
    { tripId: demoTripId, product: 'Artesanías de madera de cedro', category: 'Souvenirs', place: 'Mercado Panajachel', estPrice: 120, realPrice: 0, quantity: 1, bought: false, notes: 'Posavasos o tallado' }
  ];

  for (const item of shopping) {
    await saveItem('shopping', item);
  }

  // Checklist
  const checklists = [
    { tripId: demoTripId, group: 'Antes del viaje', item: 'Reservar hotel en Antigua y Atitlán', completed: true },
    { tripId: demoTripId, group: 'Antes del viaje', item: 'Confirmar shuttle de transporte', completed: true },
    { tripId: demoTripId, group: 'Antes del viaje', item: 'Revisar documentos e identidades', completed: true },
    { tripId: demoTripId, group: 'Antes del viaje', item: 'Descargar mapas offline de Antigua', completed: true },
    { tripId: demoTripId, group: 'Equipaje', item: 'Cargador de celular y Power Bank', completed: true },
    { tripId: demoTripId, group: 'Equipaje', item: 'Cámara fotográfica y memorias SD', completed: true },
    { tripId: demoTripId, group: 'Equipaje', item: 'Zapatos cómodos para caminata empedrada', completed: true },
    { tripId: demoTripId, group: 'Equipaje', item: 'Chaqueta ligera para la noche y sudadera', completed: true },
    { tripId: demoTripId, group: 'Equipaje', item: 'Bloqueador solar y repelente de mosquitos', completed: false },
    { tripId: demoTripId, group: 'Durante el viaje', item: 'Check-in en Porta Hotel', completed: true },
    { tripId: demoTripId, group: 'Durante el viaje', item: 'Confirmar horario lancha privada Atitlán', completed: false },
    { tripId: demoTripId, group: 'Durante el viaje', item: 'Comprar café tostado fresco', completed: true },
    { tripId: demoTripId, group: 'Regreso', item: 'Check-out hotel y revisar caja fuerte', completed: false },
    { tripId: demoTripId, group: 'Regreso', item: 'Guardar todos los comprobantes de gastos', completed: false }
  ];

  for (const item of checklists) {
    await saveItem('checklists', item);
  }

  // Documents
  const documents = [
    { tripId: demoTripId, type: 'Reservaciones', name: 'Voucher Porta Hotel Antigua.pdf', notes: 'Confirmación #HTL-8829 | Habitación Doble', fileData: null, fileName: 'Voucher_Porta_Hotel.pdf', fileType: 'application/pdf' },
    { tripId: demoTripId, type: 'Boletos', name: 'Ticket Shuttle Antigua-Atitlan.pdf', notes: 'Salida 08:30 AM | Asientos reservados 3 y 4', fileData: null, fileName: 'Ticket_Shuttle.pdf', fileType: 'application/pdf' }
  ];

  for (const item of documents) {
    await saveItem('documents', item);
  }

  // Contacts
  const contacts = [
    { tripId: demoTripId, name: 'Porta Hotel Antigua', type: 'Hotel', phone: '+502 7931 0600', email: 'reservas@portahoteles.com', notes: 'Recepción 24 horas' },
    { tripId: demoTripId, name: 'Carlos Morales (Guía Atitlán)', type: 'Tours', phone: '+502 5555 1234', email: 'carlos@atitlantours.gt', notes: 'Guía certificado para San Juan La Laguna' },
    { tripId: demoTripId, name: 'Shuttle Transportes Antigua', type: 'Transporte', phone: '+502 7832 9900', email: 'info@shuttleantigua.com', notes: 'Punto de recolección en hotel' }
  ];

  for (const item of contacts) {
    await saveItem('contacts', item);
  }

  // Journal
  const journalEntries = [
    {
      tripId: demoTripId,
      date: '2026-08-15',
      title: '¡Llegamos a Antigua Guatemala!',
      text: 'El día comenzó brillante y fresco. Caminamos por el famoso Calle del Arco y subimos al Cerro de la Cruz. La vista del Volcán de Agua sin nubes fue inolvidable. Disfrutamos de un café espectacular en El Unión.',
      location: 'Antigua Guatemala'
    }
  ];

  for (const item of journalEntries) {
    await saveItem('journal', item);
  }
}
