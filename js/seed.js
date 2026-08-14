/**
 * TravelOne Initial Seed Data ("Costa Rica 2026" Pura Vida Edition 🇨🇷)
 */

import { getAllFromStore, saveItem } from './db.js';

export async function seedDemoDataIfNeeded() {
  const existingUsers = await getAllFromStore('users');
  let demoUserId = 'usr-demo';

  if (existingUsers.length === 0) {
    const demoUser = {
      id: demoUserId,
      username: 'tico',
      name: 'Usuario Pura Vida',
      password: '123',
      createdAt: new Date().toISOString()
    };
    await saveItem('users', demoUser);
  } else {
    demoUserId = existingUsers[0].id;
  }

  const existingTrips = await getAllFromStore('trips');
  if (existingTrips.length > 0) {
    return; // Already initialized
  }

  const demoTripId = 'trip-cr-2026';

  const demoTrip = {
    id: demoTripId,
    userId: demoUserId,
    name: 'Costa Rica 2026',
    destination: 'La Fortuna, Monteverde & Manuel Antonio',
    startDate: '2026-11-15',
    endDate: '2026-11-20',
    status: 'en_curso', // planificando | en_curso | finalizado
    budget: 1500000, // 1.5 Millones de Colones
    mainCurrency: 'CRC',
    secondaryCurrencies: ['USD'],
    exchangeRates: { USD: 500 }, // 1 USD = 500 CRC
    coverEmoji: '🇨🇷',
    createdAt: new Date().toISOString()
  };

  await saveItem('trips', demoTrip);

  // Itinerary
  const itineraryItems = [
    { tripId: demoTripId, date: '2026-11-15', time: '08:00', title: 'Desayuno Típico (Gallo Pinto) en Soda La Parada', category: 'Comida', location: 'La Fortuna', address: 'Frente al Parque de La Fortuna', cost: 4500, notes: 'Gallo pinto fresco con natilla, huevos y plátano maduro', status: 'Completado', order: 1 },
    { tripId: demoTripId, date: '2026-11-15', time: '10:00', title: 'Caminata en Parque Nacional Volcán Arenal', category: 'Turismo', location: 'Volcán Arenal', address: 'La Fortuna, San Carlos', cost: 12000, notes: 'Llevar capa de lluvia y cámara para senderos de lava', status: 'Completado', order: 2 },
    { tripId: demoTripId, date: '2026-11-15', time: '13:30', title: 'Almuerzo de Casado Típico en Restaurante Don Juan', category: 'Comida', location: 'La Fortuna', address: 'Calle Principal La Fortuna', cost: 8500, notes: 'Probar el picadillo de papa y chifrijo tradicional', status: 'Completado', order: 3 },
    { tripId: demoTripId, date: '2026-11-15', time: '16:00', title: 'Tarde de Relajación en Aguas Termales Baldi', category: 'Turismo', location: 'Termales Baldi', address: 'Carretera a Volcán Arenal', cost: 35000, notes: 'Entrada con pase vespertino y cena buffet', status: 'En progreso', order: 4 },
    { tripId: demoTripId, date: '2026-11-16', time: '08:30', title: 'Traslado a Monteverde & Tour de Puentes Colgantes', category: 'Transporte', location: 'Monteverde Cloud Forest', address: 'Santa Elena, Puntarenas', cost: 28000, notes: 'Caminata por el bosque nuboso a través de puentes elevados', status: 'Pendiente', order: 1 },
    { tripId: demoTripId, date: '2026-11-17', time: '07:30', title: 'Visita guiada al Parque Nacional Manuel Antonio', category: 'Turismo', location: 'Manuel Antonio', address: 'Quepos, Puntarenas', cost: 16000, notes: 'Avistamiento de perezosos, monos cariblancos y baño en playa', status: 'Pendiente', order: 1 }
  ];

  for (const item of itineraryItems) {
    await saveItem('itinerary', item);
  }

  // Reservations
  const reservations = [
    { tripId: demoTripId, type: 'Hotel', name: 'Hotel Arenal Kioro Suites & Spa', date: '2026-11-15', time: '15:00', address: 'La Fortuna, San Carlos', confirmationNo: 'KIORO-506', price: 140000, contact: '+506 2479 1000', notes: 'Vista directa al Volcán Arenal con termales privadas' },
    { tripId: demoTripId, type: 'Hotel', name: 'Hotel Costa Verde Manuel Antonio', date: '2026-11-16', time: '14:00', address: 'Camino a Manuel Antonio, Quepos', confirmationNo: 'CVERDE-77', price: 180000, contact: '+506 2777 0584', notes: 'Famoso avión restaurante y vista al Pacífico' },
    { tripId: demoTripId, type: 'Tour', name: 'Canopy & Zip Line Monteverde', date: '2026-11-16', time: '11:00', address: 'Santa Elena, Monteverde', confirmationNo: 'ZIP-CR2026', price: 32000, contact: '+506 2645 5900', notes: 'Incluye salto de Tarzán y vuelo de Superman' }
  ];

  for (const item of reservations) {
    await saveItem('reservations', item);
  }

  // Expenses
  const expenses = [
    { tripId: demoTripId, date: '2026-11-15', description: 'Noche Hotel Arenal Kioro', category: 'Hotel', amount: 140000, currency: 'CRC', paidBy: 'Yo', notes: 'Tarjeta de crédito' },
    { tripId: demoTripId, date: '2026-11-15', description: 'Desayuno Gallo Pinto en Soda', category: 'Alimentación', amount: 4500, currency: 'CRC', paidBy: 'Yo', notes: 'Efectivo colones' },
    { tripId: demoTripId, date: '2026-11-15', description: 'Almuerzo Casado Típico', category: 'Alimentación', amount: 8500, currency: 'CRC', paidBy: 'Carlos', notes: 'Compartido' },
    { tripId: demoTripId, date: '2026-11-15', description: 'Café Britt & Souvenirs de Carreta', category: 'Souvenirs', amount: 25000, currency: 'CRC', paidBy: 'Yo', notes: 'Regalos familiares' },
    { tripId: demoTripId, date: '2026-11-16', description: 'Combustible & Peajes Ruta 27', category: 'Transporte', amount: 22000, currency: 'CRC', paidBy: 'Yo', notes: 'Vehículo alquilado' }
  ];

  for (const item of expenses) {
    await saveItem('expenses', item);
  }

  // Places
  const places = [
    { tripId: demoTripId, name: 'Parque Nacional Manuel Antonio', category: 'Atracción', address: 'Quepos, Puntarenas', approxPrice: 16000, priority: 'Alta', notes: 'Playa Espadilla Sur y fauna silvestre', visited: true, url: '' },
    { tripId: demoTripId, name: 'Catarata Río Celeste', category: 'Atracción', address: 'Parque Nacional Tenorio', approxPrice: 12000, priority: 'Alta', notes: 'Agua azul turquesa increíble por minerales', visited: false, url: '' },
    { tripId: demoTripId, name: 'Soda Tapia', category: 'Restaurante', address: 'San José', approxPrice: 6000, priority: 'Media', notes: 'Batidos de fruta con leche y arreglados tradicionales', visited: false, url: '' },
    { tripId: demoTripId, name: 'Parque Nacional Volcán Poás', category: 'Mirador', address: 'Alajuela', approxPrice: 10000, priority: 'Media', notes: 'Cráter principal activo', visited: false, url: '' }
  ];

  for (const item of places) {
    await saveItem('places', item);
  }

  // Shopping List
  const shopping = [
    { tripId: demoTripId, product: 'Café Britt Tarrazú (Bolsa 340g)', category: 'Comida', place: 'Tienda Britt', estPrice: 7500, realPrice: 7000, quantity: 3, bought: true, notes: 'Grano entero tueste oscuro' },
    { tripId: demoTripId, product: 'Carreta artesanal pintada de Sarchí', category: 'Souvenirs', place: 'Sarchí Alajuela', estPrice: 15000, realPrice: 14500, quantity: 1, bought: true, notes: 'Artesanía típica de madera' },
    { tripId: demoTripId, product: 'Salsa Lizano (Botella 500ml)', category: 'Comida', place: 'Supermercado Palí', estPrice: 3000, realPrice: 3000, quantity: 4, bought: false, notes: 'Para cocinar gallo pinto en casa' },
    { tripId: demoTripId, product: 'Figura de Perezoso tallada en madera', category: 'Regalos', place: 'Mercado Manuel Antonio', estPrice: 10000, realPrice: 0, quantity: 2, bought: false, notes: 'Para recuerdos' }
  ];

  for (const item of shopping) {
    await saveItem('shopping', item);
  }

  // Checklist
  const checklists = [
    { tripId: demoTripId, group: 'Antes del viaje', item: 'Reservar entrada a Manuel Antonio y Poás online', completed: true },
    { tripId: demoTripId, group: 'Antes del viaje', item: 'Verificar estado del clima y capa de lluvia', completed: true },
    { tripId: demoTripId, group: 'Antes del viaje', item: 'Descargar mapa offline de Costa Rica', completed: true },
    { tripId: demoTripId, group: 'Equipaje', item: 'Repelente para mosquitos biodegradable', completed: true },
    { tripId: demoTripId, group: 'Equipaje', item: 'Bloqueador solar y traje de baño', completed: true },
    { tripId: demoTripId, group: 'Equipaje', item: 'Zapatos de senderismo y sandalias de agua', completed: true },
    { tripId: demoTripId, group: 'Equipaje', item: 'Capa impermeable y sudadera ligera', completed: true },
    { tripId: demoTripId, group: 'Durante el viaje', item: 'Comprar café de origen Tarrazú', completed: true },
    { tripId: demoTripId, group: 'Durante el viaje', item: 'Probar Chifrijo en soda local', completed: true },
    { tripId: demoTripId, group: 'Regreso', item: 'Check-out hotel Costa Verde', completed: false }
  ];

  for (const item of checklists) {
    await saveItem('checklists', item);
  }

  // Documents
  const documents = [
    { tripId: demoTripId, type: 'Reservaciones', name: 'Voucher Hotel Kioro.pdf', notes: 'Confirmación #KIORO-506 | Vista Volcán', fileData: null, fileName: 'Voucher_Kioro.pdf', fileType: 'application/pdf' },
    { tripId: demoTripId, type: 'Boletos', name: 'Entradas Manuel Antonio.pdf', notes: 'Horario ingreso 07:30 AM', fileData: null, fileName: 'Manuel_Antonio_Tickets.pdf', fileType: 'application/pdf' }
  ];

  for (const item of documents) {
    await saveItem('documents', item);
  }

  // Contacts
  const contacts = [
    { tripId: demoTripId, name: 'Hotel Arenal Kioro', type: 'Hotel', phone: '+506 2479 1000', email: 'info@hotelarenalkioro.com', notes: 'La Fortuna, San Carlos' },
    { tripId: demoTripId, name: 'Esteban Alpízar (Guía Naturalista)', type: 'Tours', phone: '+506 8888 5555', email: 'esteban@puravidatours.cr', notes: 'Guía certificado en Manuel Antonio' },
    { tripId: demoTripId, name: 'Emergencias Costa Rica (911)', type: 'Emergencia', phone: '911', email: '', notes: 'Servicio de emergencia nacional' }
  ];

  for (const item of contacts) {
    await saveItem('contacts', item);
  }

  // Journal
  const journalEntries = [
    {
      tripId: demoTripId,
      date: '2026-11-15',
      title: '¡Bienvenidos a La Fortuna de San Carlos!',
      text: 'Llegamos con un día espectacular y despejado. El Volcán Arenal se lucía imponente en el horizonte. Desayunamos un gallo pinto delicioso en La Fortuna y disfrutamos la tarde en las termales. ¡Pura Vida!',
      location: 'La Fortuna, Costa Rica'
    }
  ];

  for (const item of journalEntries) {
    await saveItem('journal', item);
  }
}
