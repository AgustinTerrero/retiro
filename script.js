// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD3FN85uHi5pHLo0vMbbWjmr6kdLsx_mw0",
    authDomain: "retiroalumnos-878d3.firebaseapp.com",
    projectId: "retiroalumnos-878d3",
    storageBucket: "retiroalumnos-878d3.appspot.com", 
    messagingSenderId: "413300723900",
    appId: "1:413300723900:web:ecdc2ecd87f996887940b9"
};
  
  // Inicializar Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  
  
  // Variables para almacenar datos en caché local
  let alumnosPorGrado = {};
  let notificacionesRetiro = {};
  let historialRetiros = [];
  let lastNotificationCount = 0;
  let notificacionGrandeMostrada = false;
  let listaPadresCompleta = []; // Guardamos todos los padres para buscar

  
  function gradoSeleccionadoEnAula() {
    return document.getElementById('aula-grado')?.value || '';
  }
  

  function mostrarNotificacionFlotante(mensaje, tipo = 'success', grado = '') {
    if (notificacionGrandeMostrada) return;
    if (grado && grado !== gradoSeleccionadoEnAula()) return;
  
    const notificacion = document.createElement('div');
    notificacion.className = `notification-floating ${tipo} centered-notification`;
    notificacion.textContent = mensaje;
  
    document.body.appendChild(notificacion);
    setTimeout(() => notificacion.remove(), 3500);
  }
  
  // Función para cargar datos iniciales
  async function cargarDatosIniciales() {
    try {
      // Cargar alumnos por grado
      await cargarAlumnosPorGrado();
      
      // Cargar notificaciones de retiro
      await cargarNotificacionesRetiro();
      
      // Cargar historial de retiros
      await cargarHistorialRetiros();
      
      console.log("Datos iniciales cargados con éxito");
      
      // Actualizar la interfaz inicial
      actualizarAlertaBadge();
    } catch (error) {
      console.error("Error al cargar los datos iniciales:", error);
      mostrarNotificacionFlotante("Hubo un problema al cargar los datos. Por favor, recarga la página.");
    }
  }
  
  // Función para cargar alumnos por grado desde Firebase
  async function cargarAlumnosPorGrado() {
    try {
      const snapshot = await db.collection('alumnosPorGrado').doc('datos').get();
      
      if (snapshot.exists) {
        alumnosPorGrado = snapshot.data();
      } else {
        // Si no existen datos, crear los datos por defecto
        alumnosPorGrado = {
          '1A': ['Ana García', 'Carlos López', 'Elena Martínez', 'Pedro Rodríguez'],
          '1B': ['Juan Pérez', 'María Gómez', 'Sofía Castro', 'Tomás Díaz'],
          '2A': ['Lucía Fernández', 'Marcos Ruiz', 'Paula Sánchez', 'Roberto Torres'],
          '2B': ['Carolina Vargas', 'Diego Morales', 'Valentina Suárez', 'Mateo Paz'],
        };
        
        // Inicializar el resto de grados con arrays vacíos
        const grados = ['3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B', '7A', '7B'];
        grados.forEach(grado => {
          if (!alumnosPorGrado[grado]) {
            alumnosPorGrado[grado] = [];
          }
        });
        
        // Guardar los datos iniciales en Firebase
        await db.collection('alumnosPorGrado').doc('datos').set(alumnosPorGrado);
      }
    } catch (error) {
      console.error("Error al cargar alumnos por grado:", error);
      throw error;
    }
  }
  
  // Función para cargar notificaciones de retiro desde Firebase
  async function cargarNotificacionesRetiro() {
    try {
      const snapshot = await db.collection('notificacionesRetiro').doc('datos').get();
      
      if (snapshot.exists) {
        notificacionesRetiro = snapshot.data();
      } else {
        notificacionesRetiro = {};
        await db.collection('notificacionesRetiro').doc('datos').set({});
      }
    } catch (error) {
      console.error("Error al cargar notificaciones de retiro:", error);
      throw error;
    }
  }
  
  // Función para cargar historial de retiros desde Firebase
  async function cargarHistorialRetiros() {
    try {
      const snapshot = await db.collection('historialRetiros').get();
      historialRetiros = [];
      
      snapshot.forEach(doc => {
        const retiro = doc.data();
        historialRetiros.push({
            id: retiro.id,
            grado: retiro.grado,
            alumno: retiro.alumno,
            conMochila: retiro.conMochila,
            nombrePadre: retiro.nombrePadre, 
            fechaHora: retiro.fechaHora.toDate() 
        });
    });
      
      // Ordenar el historial por fecha (más reciente primero)
      historialRetiros.sort((a, b) => b.fechaHora - a.fechaHora);
    } catch (error) {
      console.error("Error al cargar historial de retiros:", error);
      throw error;
    }
  }
  function escucharNotificaciones(grado) {
    firebase.firestore().collection("notificaciones")
      .where("grado", "==", grado)
      .where("retirado", "==", false)
      .onSnapshot(snapshot => {
        const notificaciones = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          data.id = doc.id;
          notificaciones.push(data);
        });
      });
  }
  // Función para cambiar el modo de acceso (vista de aula vs. completa)
  function cambiarModoAcceso() {
    const rolUsuario = document.getElementById('rol-usuario').value;
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-panel');


    if (rolUsuario === 'aula') {
      // Mostrar solo la pestaña de Aula 
      tabs.forEach((tab, index) => {
        if (index === 2) { // 2 es el índice de la pestaña "Aula"
          tab.style.display = 'block';
          cambiarPestaña(2); // Activar la pestaña Aula
        } else {
          tab.style.display = 'none';
        }
      });
    } else {
      // Mostrar todas las pestañas
      tabs.forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
      });
      tabContents.forEach(content => content.classList.remove('active'));
      cambiarPestaña(0); // Activar la primera pestaña
    }

    // Activar escucha automática de notificaciones si ya hay un aula seleccionada
const gradoActual = document.getElementById('aula-grado').value;
if (gradoActual) {
  cargarNotificacionesAula(); // Mostrar notificaciones inmediatamente
  escucharNotificaciones(gradoActual); // Escuchar en tiempo real
}
if (rolUsuario === 'aula') {
  const grado = document.getElementById('aula-grado').value;
  if (grado) {
    cargarNotificacionesAula(); // Mostrar inmediatamente
    escucharNotificaciones(grado); // Escuchar en tiempo real
  }

  // También actualizar el historial filtrado si está activo
  const indexHistorial = 3;
  const tabHistorial = document.querySelectorAll('.tab-panel')[indexHistorial];
  if (tabHistorial && tabHistorial.classList.contains('active')) {
    filtrarHistorial(); 
  }
}
  }
  
  // Función para cambiar entre pestañas
  function cambiarPestaña(index) {
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-panel');
  
    if (!tabs[index] || tabs[index].style.display === 'none') return;
  
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
  
    tabs[index].classList.add('active');
    tabContents[index].classList.add('active');
  
    if (index === 1) { // Si es la pestaña de Gestión
      mostrarPadres(); // Llamar a la función para mostrar los padres
    } else if (index === 2) {
      const gradoAula = document.getElementById('aula-grado').value;
      if (gradoAula) cargarNotificacionesAula();
    } else if (index === 3) {
      actualizarHistorial();
    }
  
    if (index === 3 && rolActual === 'aula') {
      const gradoAula = document.getElementById('aula-grado').value;
    
      // Filtrar automáticamente por el grado del aula
      const historialFiltrado = historialRetiros.filter(entry => entry.grado === gradoAula);
      actualizarHistorial(historialFiltrado);
    
      // Ocultar el filtro de grado
      document.getElementById('historial-grado').parentElement.style.display = 'none';
    } else if (index === 3) {
      // Mostrar el filtro si no es docente
      document.getElementById('historial-grado').parentElement.style.display = 'block';
      actualizarHistorial(); // Mostrar todo el historial
    }
  }
  
  // Función para alternar entre modo individual y masivo
  function toggleModoMasivo() {
    const checkboxMasivo = document.getElementById('modo-masivo');
    const agregarIndividual = document.getElementById('agregar-individual');
    const cargaMasiva = document.getElementById('carga-masiva');
  
    if (checkboxMasivo.checked) {
      agregarIndividual.classList.remove('active');
      cargaMasiva.classList.add('active');
    } else {
      agregarIndividual.classList.add('active');
      cargaMasiva.classList.remove('active');
    }
  }
  
  // Función para cargar los alumnos en la pestaña de Retiro
  function cargarAlumnos() {
    const gradoSeleccionado = document.getElementById('retiro-grado').value;
    const alumnoSelect = document.getElementById('retiro-alumno');
  
    alumnoSelect.innerHTML = '<option value="">Seleccione</option>';
    alumnoSelect.disabled = true;
  
    if (!padreActual || !gradoSeleccionado) return;
  
    const alumnosFiltrados = padreActual.hijos.filter(hijo => hijo.grado === gradoSeleccionado);
  
    alumnosFiltrados.forEach(hijo => {
      const opt = document.createElement('option');
      opt.value = hijo.nombre;
      opt.textContent = hijo.nombre;
      alumnoSelect.appendChild(opt);
    });
  
    alumnoSelect.disabled = false;
  }
  
  
  // Función para mostrar alumnos en la pestaña de Gestión
  function mostrarAlumnosGrado() {
    const gradoSeleccionado = document.getElementById('gestion-grado').value;
    const contenedor = document.getElementById('gestion-alumnos-container');
    const listaAlumnos = document.getElementById('lista-alumnos');
    
    if (gradoSeleccionado) {
      actualizarListaAlumnos(gradoSeleccionado);
    } else {
      listaAlumnos.innerHTML = '<div class="empty-list">Seleccione un grado para ver la lista de alumnos.</div>';
    }
  }
  
  // Función para actualizar la lista visual de alumnos
  function actualizarListaAlumnos(grado) {
    const listaAlumnos = document.getElementById('lista-alumnos');
    const alumnos = alumnosPorGrado[grado] || [];
    
    // Limpiar la lista actual
    listaAlumnos.innerHTML = '';
    
    // Si no hay alumnos, mostrar mensaje
    if (alumnos.length === 0) {
      listaAlumnos.innerHTML = '<div class="empty-list">No hay alumnos registrados en este grado.</div>';
      return;
    }
    
    // Agregar cada alumno a la lista
    alumnos.forEach((alumno, index) => {
      const alumnoItem = document.createElement('div');
      alumnoItem.className = 'alumno-item';
      
      const nombreAlumno = document.createElement('div');
      nombreAlumno.textContent = alumno;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'Eliminar';
      deleteBtn.onclick = function() {
        eliminarAlumno(grado, index);
      };
      
      alumnoItem.appendChild(nombreAlumno);
      alumnoItem.appendChild(deleteBtn);
      listaAlumnos.appendChild(alumnoItem);
    });
  }
  
  // Función para agregar un nuevo alumno
  async function agregarAlumno() {
    const gradoSeleccionado = document.getElementById('gestion-grado').value;
    const nombreAlumno = document.getElementById('nuevo-alumno').value.trim();
    
    if (!gradoSeleccionado) {
      mostrarNotificacionFlotante('Por favor seleccione un grado.');
      return;
    }
    
    if (!nombreAlumno) {
      mostrarNotificacionFlotante('Por favor ingrese el nombre del alumno.');
      return;
    }
    
    // Verificar si el alumno ya existe en este grado
    if (alumnosPorGrado[gradoSeleccionado] && alumnosPorGrado[gradoSeleccionado].includes(nombreAlumno)) {
      mostrarNotificacionFlotante('Este alumno ya existe en el grado seleccionado.');
      return;
    }
    
    try {
      // Inicializar el array si no existe
      if (!alumnosPorGrado[gradoSeleccionado]) {
        alumnosPorGrado[gradoSeleccionado] = [];
      }
      
      // Agregar el alumno al array
      alumnosPorGrado[gradoSeleccionado].push(nombreAlumno);
      
      // Guardar en Firebase
      await db.collection('alumnosPorGrado').doc('datos').set(alumnosPorGrado);
      
      // Actualizar la interfaz
      actualizarListaAlumnos(gradoSeleccionado);
      
      // Limpiar el campo de entrada
      document.getElementById('nuevo-alumno').value = '';
      
      mostrarNotificacionFlotante(`Alumno "${nombreAlumno}" agregado al grado ${gradoSeleccionado}.`);
    } catch (error) {
      console.error("Error al agregar alumno:", error);
      mostrarNotificacionFlotante("Error al guardar los datos. Por favor, inténtelo de nuevo.");
    }
  }
  
  // Función para agregar múltiples alumnos a la vez
  async function agregarAlumnosMasivos() {
    const gradoSeleccionado = document.getElementById('gestion-grado').value;
    const listaTexto = document.getElementById('lista-alumnos-masiva').value.trim();
    
    if (!gradoSeleccionado) {
      mostrarNotificacionFlotante('Por favor seleccione un grado.');
      return;
    }
    
    if (!listaTexto) {
      mostrarNotificacionFlotante('Por favor ingrese al menos un nombre de alumno.');
      return;
    }
    
    // Dividir el texto en líneas y filtrar líneas vacías
    const nombresAlumnos = listaTexto.split('\n')
      .map(nombre => nombre.trim())
      .filter(nombre => nombre !== '');
      
    if (nombresAlumnos.length === 0) {
      mostrarNotificacionFlotante('No se encontraron nombres válidos.');
      return;
    }
    
    if (nombresAlumnos.length > 30) {
      mostrarNotificacionFlotante('Por favor ingrese un máximo de 30 alumnos a la vez.');
      return;
    }
    
    try {
      // Inicializar el array si no existe
      if (!alumnosPorGrado[gradoSeleccionado]) {
        alumnosPorGrado[gradoSeleccionado] = [];
      }
      
      let alumnosAgregados = 0;
      let alumnosDuplicados = 0;
      
      // Procesar cada nombre
      nombresAlumnos.forEach(nombre => {
        // Verificar si el alumno ya existe
        if (!alumnosPorGrado[gradoSeleccionado].includes(nombre)) {
          alumnosPorGrado[gradoSeleccionado].push(nombre);
          alumnosAgregados++;
        } else {
          alumnosDuplicados++;
        }
      });
      
      // Guardar en Firebase
      await db.collection('alumnosPorGrado').doc('datos').set(alumnosPorGrado);
      
      // Actualizar la interfaz
      actualizarListaAlumnos(gradoSeleccionado);
      
      // Limpiar el campo de entrada
      document.getElementById('lista-alumnos-masiva').value = '';
      
      // Mostrar resumen
      mostrarNotificacionFlotante(`Operación completada:\n- ${alumnosAgregados} alumnos agregados\n- ${alumnosDuplicados} alumnos omitidos (ya existían)`);
    } catch (error) {
      console.error("Error al agregar alumnos masivos:", error);
      mostrarNotificacionFlotante("Error al guardar los datos. Por favor, inténtelo de nuevo.");
    }
  }
  
  // Función para cargar alumnos desde un archivo CSV
  async function cargarDesdeCSV() {
    const gradoSeleccionado = document.getElementById('gestion-grado').value;
    const fileInput = document.getElementById('csv-file');
    
    if (!gradoSeleccionado) {
      mostrarNotificacionFlotante('Por favor seleccione un grado.');
      return;
    }
    
    if (!fileInput.files || fileInput.files.length === 0) {
      mostrarNotificacionFlotante('Por favor seleccione un archivo CSV o Excel.');
      return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async function(e) {
      try {
        const contenido = e.target.result;
        const lineas = contenido.split(/[\r\n]+/);
        
        if (lineas.length === 0) {
          mostrarNotificacionFlotante('El archivo está vacío.');
          return;
        }
        
        // Inicializar el array si no existe
        if (!alumnosPorGrado[gradoSeleccionado]) {
          alumnosPorGrado[gradoSeleccionado] = [];
        }
        
        // Procesar el contenido del archivo
        let alumnosAgregados = 0;
        let alumnosDuplicados = 0;
        
        // Suponemos que el archivo tiene nombres en la primera columna
        // Si hay encabezados, comenzamos desde la segunda línea (índice 1)
        const inicioEnIndice = 0; // Si hay encabezados, cambiar a 1
        
        for (let i = inicioEnIndice; i < lineas.length; i++) {
          const linea = lineas[i].trim();
          if (!linea) continue;
          
          // Dividir la línea por coma, punto y coma, o tabulación
          const columnas = linea.split(/[,;\t]/);
          const nombre = columnas[0].trim();
          
          if (nombre && !alumnosPorGrado[gradoSeleccionado].includes(nombre)) {
            alumnosPorGrado[gradoSeleccionado].push(nombre);
            alumnosAgregados++;
          } else if (nombre) {
            alumnosDuplicados++;
          }
        }
        
        // Guardar en Firebase
        await db.collection('alumnosPorGrado').doc('datos').set(alumnosPorGrado);
        
        // Actualizar la interfaz
        actualizarListaAlumnos(gradoSeleccionado);
        
        // Limpiar el campo de entrada
        fileInput.value = '';
        
        // Mostrar resumen
        mostrarNotificacionFlotante(`Importación completada:\n- ${alumnosAgregados} alumnos agregados\n- ${alumnosDuplicados} alumnos omitidos (ya existían)`);
      } catch (error) {
        console.error('Error al procesar el archivo:', error);
        mostrarNotificacionFlotante('Error al procesar el archivo. Asegúrese de que el formato es correcto.');
      }
    };
    
    reader.onerror = function() {
      mostrarNotificacionFlotante('Error al leer el archivo.');
    };
    
    reader.readAsText(file);
  }
  
  async function eliminarAlumno(grado, index) {
    const alumno = alumnosPorGrado[grado][index];
    
    if (confirm(`¿Está seguro que desea eliminar a "${alumno}" del grado ${grado}?`)) {
      try {
        alumnosPorGrado[grado].splice(index, 1);
        
        await db.collection('alumnosPorGrado').doc('datos').set(alumnosPorGrado);
        
        actualizarListaAlumnos(grado);
        
        mostrarNotificacionFlotante(`Alumno "${alumno}" eliminado del grado ${grado}.`);
      } catch (error) {
        console.error("Error al eliminar alumno:", error);
        mostrarNotificacionFlotante("Error al eliminar el alumno. Por favor, inténtelo de nuevo.");
      }
    }
  }
  
  async function enviarNotificacion() {
    const nombrePadre = padreActual?.nombrePadre || '';
    const grado = document.getElementById('retiro-grado').value;
    const alumno = document.getElementById('retiro-alumno').value;
    
    const conMochilaValue = document.getElementById('conMochila').value;
    const conMochila = conMochilaValue === 'true';
    const sinMochila = conMochilaValue === 'false';
  
    if (!nombrePadre) {
        mostrarNotificacionFlotante('Ingrese su nombre como apoderado', 'error');
        return;
    }
    if (!grado) {
        mostrarNotificacionFlotante('Seleccione grado', 'error');
        return;
    }
    if (!alumno) {
        mostrarNotificacionFlotante('Seleccione alumno', 'error');
        return;
    }
    if (!conMochila && !sinMochila) {
        mostrarNotificacionFlotante('Seleccione con mochila o sin mochila', 'error');
        return;
    }
  
    try {
      const fechaHora = new Date();
  
      const notificacion = {
        grado,
        alumno,
        conMochila,
        fechaHora: firebase.firestore.Timestamp.fromDate(fechaHora),
        atendido: false,
        nombrePadre
      };
  
      await db.collection('notificaciones').add(notificacion);
  
      Swal.fire({
        icon: 'success',
        title: '✅ Solicitud enviada',
        text: 'El retiro fue registrado correctamente',
        confirmButtonColor: '#1a237e'
      });
  
      document.getElementById('retiro-grado').value = '';
      document.getElementById('retiro-alumno').innerHTML = '<option value="">Seleccione</option>';
      document.getElementById('retiro-alumno').disabled = true;
      document.getElementById('conMochila').value = '';
      document.getElementById('btn-con-mochila').classList.remove('seleccionado');
      document.getElementById('btn-sin-mochila').classList.remove('seleccionado');
  
    } catch (error) {
      console.error(error);
      mostrarNotificacionFlotante('Error al enviar la notificación', 'error');
    }
  }
  


  
  async function agregarAlHistorial(notificacion) {
    try {
      const entrada = {
        id: notificacion.id,
        grado: notificacion.grado,
        alumno: notificacion.alumno,
        conMochila: notificacion.conMochila,
        fechaHora: firebase.firestore.Timestamp.fromDate(new Date(notificacion.fechaHora)),
        nombrePadre: notificacion.nombrePadre
    };
      

      await db.collection('historialRetiros').doc(entrada.id).set(entrada);
      

      historialRetiros.push({
        ...entrada,
        fechaHora: new Date(notificacion.fechaHora)
      });
      

      historialRetiros.sort((a, b) => b.fechaHora - a.fechaHora);
      
      const tabHistorial = document.querySelectorAll('.tab')[3];
      if (tabHistorial.classList.contains('active')) {
        actualizarHistorial();
      }
    } catch (error) {
      console.error("Error al agregar al historial:", error);
      throw error;
    }
  }
  
 
  function actualizarAlertaBadge() {
    const alertBadge = document.getElementById('alert-badge');
    const gradoActual = gradoSeleccionadoEnAula();
    let total = 0;
  
    Object.values(notificacionesRetiro).forEach(lista => {
      lista.forEach(n => {
        if (!n.atendido && n.grado === gradoActual) total++;
      });
    });
  
    if (total > 0) {
      alertBadge.textContent = total;
      alertBadge.style.display = 'inline-block';
    } else {
      alertBadge.style.display = 'none';
    }
  }

  function cargarNotificacionesAula() {
    const gradoAula = document.getElementById('aula-grado').value;
    const contenedor = document.getElementById('aula-notificaciones');
    contenedor.innerHTML = '';
  
    if (!gradoAula) {
      contenedor.innerHTML = '<div class="empty-list">Seleccione un aula para ver las notificaciones de retiro.</div>';
      return;
    }
  
    const lista = notificacionesRetiro[gradoAula] || [];
    const pendientes = lista.filter(n => !n.atendido);
  
    if (pendientes.length === 0) {
      contenedor.innerHTML = '<div class="empty-list">No hay notificaciones de retiro pendientes para esta aula.</div>';
      return;
    }
  
    pendientes.forEach(notif => {
      const item = document.createElement('div');
      item.className = 'notification-item fade-in';
  
      const fechaObj = notif.fechaHora?.seconds
        ? new Date(notif.fechaHora.seconds * 1000)
        : new Date(notif.fechaHora);
  
      const fechaTexto = `${fechaObj.toLocaleDateString()} a las ${fechaObj.toLocaleTimeString()}`;
  
      item.innerHTML = `
        <div class="notification-header">Alumno: ${notif.alumno}</div>
        <div class="notification-body">• Se retira ${notif.conMochila ? 'con mochila' : 'sin mochila'}</div>
        <div class="notification-time">Notificado: ${fechaTexto}</div>
      `;
  
      const btn = document.createElement('button');
      btn.textContent = 'Marcar como atendido';
      btn.onclick = () => marcarComoAtendido(notif.id, gradoAula);
  
      item.appendChild(btn);
      contenedor.appendChild(item);
  
      setTimeout(() => item.classList.remove('fade-in'), 400);
    });
  }
  

  async function marcarComoAtendido(idNotificacion, grado) {
    try {
      const notificaciones = notificacionesRetiro[grado] || [];
      const index = notificaciones.findIndex(n => n.id === idNotificacion);
      
      if (index !== -1) {
        notificaciones[index].atendido = true;
  
        await db.collection('notificacionesRetiro').doc('datos').set(notificacionesRetiro);
  
        cargarNotificacionesAula();
        actualizarAlertaBadge();
        mostrarNotificacionFlotante('Notificación marcada como atendida.');
  
        
        const indexHistorial = 3;
        const tabHistorial = document.querySelectorAll('.tab-panel')[indexHistorial];
        if (tabHistorial && tabHistorial.classList.contains('active')) {
          filtrarHistorial(); 
        }
      }
    } catch (error) {
      console.error("Error al marcar como atendido:", error);
      mostrarNotificacionFlotante("Error al actualizar el estado. Por favor, inténtelo de nuevo.");
    }
  }
  
  
  
  function actualizarHistorial(filtrados = null) {
    const contenedorHistorial = document.getElementById('historial-lista');
    const listaHistorial = filtrados || historialRetiros;
  
    contenedorHistorial.innerHTML = '';
  
    if (listaHistorial.length === 0) {
      contenedorHistorial.innerHTML = '<div class="empty-list">No hay registros de retiro en el historial.</div>';
      return;
    }
  
    listaHistorial.forEach(entrada => {
      const fecha = entrada.fechaHora.toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
  
      const card = document.createElement('div');
      card.className = `history-card mochila-${entrada.conMochila}`;
  
      card.innerHTML = `
        <div class="history-header">
          <span class="history-fecha">${fecha}</span>
          <span class="history-grado">Grado: ${entrada.grado}</span>
        </div>
        <div class="history-body">
          <div class="history-dato"><strong>Alumno:</strong> ${entrada.alumno}</div>
          <div class="history-dato"><strong>Retirado por:</strong> ${entrada.nombrePadre || 'No especificado'}</div>
          <div class="history-dato"><strong>Mochila:</strong> ${entrada.conMochila ? 'Con mochila' : 'Sin mochila'}</div>
        </div>
      `;
  
      contenedorHistorial.appendChild(card);
    });
  }
  
  
  
  function filtrarHistorial() {
    const filtroGrado = document.getElementById('historial-grado').value;
    const filtroFecha = document.getElementById('historial-fecha').value;
    const filtroAlumno = document.getElementById('historial-alumno').value.trim().toLowerCase();
    
   
        
        
        let historialFiltrado = [...historialRetiros];
        
        if (filtroGrado) {
          historialFiltrado = historialFiltrado.filter(entrada => entrada.grado === filtroGrado);
        }
        
        if (filtroFecha) {
          
          const fechaSeleccionada = new Date(filtroFecha);
          fechaSeleccionada.setHours(0, 0, 0, 0); 
          
          
          historialFiltrado = historialFiltrado.filter(entrada => {
            const fechaEntrada = new Date(entrada.fechaHora);
            return fechaEntrada.getDate() === fechaSeleccionada.getDate() &&
                   fechaEntrada.getMonth() === fechaSeleccionada.getMonth() &&
                   fechaEntrada.getFullYear() === fechaSeleccionada.getFullYear();
          });
        }
        
        if (filtroAlumno) {
          historialFiltrado = historialFiltrado.filter(entrada => 
            entrada.alumno.toLowerCase().includes(filtroAlumno)
          );
        }
        
        
        actualizarHistorial(historialFiltrado);
      }
      

      
      
      async function limpiarDatosAntiguos() {
        try {
          
          const snapshot = await db.collection('historialRetiros').get();
          
          
          const fechaLimite = new Date();
          fechaLimite.setDate(fechaLimite.getDate() - 30);
          
          
          let contador = 0;
          
          
          const batch = db.batch();
          
          snapshot.forEach(doc => {
            const datos = doc.data();
            const fechaRetiro = datos.fechaHora.toDate();
            
            if (fechaRetiro < fechaLimite) {
              batch.delete(doc.ref);
              contador++;
            }
          });
          
          
          if (contador > 0) {
            await batch.commit();
            console.log(`Se eliminaron ${contador} registros antiguos del historial.`);
            
            
            await cargarHistorialRetiros();
            actualizarHistorial();
          }
          
          return contador;
        } catch (error) {
          console.error("Error al limpiar datos antiguos:", error);
          throw error;
        }
      }
      
      
      function exportarHistorialCSV() {
        try {
          
          const filtroGrado = document.getElementById('historial-grado').value;
          const filtroFecha = document.getElementById('historial-fecha').value;
          const filtroAlumno = document.getElementById('historial-alumno').value.trim().toLowerCase();
          
          let datosExportar = [...historialRetiros];
          
          
          if (filtroGrado) {
            datosExportar = datosExportar.filter(entrada => entrada.grado === filtroGrado);
          }
          
          if (filtroFecha) {
            const fechaSeleccionada = new Date(filtroFecha);
            fechaSeleccionada.setHours(0, 0, 0, 0);
            
            datosExportar = datosExportar.filter(entrada => {
              const fechaEntrada = new Date(entrada.fechaHora);
              return fechaEntrada.getDate() === fechaSeleccionada.getDate() &&
                     fechaEntrada.getMonth() === fechaSeleccionada.getMonth() &&
                     fechaEntrada.getFullYear() === fechaSeleccionada.getFullYear();
            });
          }
          
          if (filtroAlumno) {
            datosExportar = datosExportar.filter(entrada => 
              entrada.alumno.toLowerCase().includes(filtroAlumno)
            );
          }
          
          
          let csvContent = "Fecha,Hora,Grado,Alumno,Estado\n";
          
          
          datosExportar.forEach(entrada => {
            const fecha = new Date(entrada.fechaHora);
            const fechaStr = fecha.toLocaleDateString();
            const horaStr = fecha.toLocaleTimeString();
            const estadoMochila = entrada.conMochila ? "Con mochila" : "Sin mochila";
            
            
            const alumnoEscapado = entrada.alumno.includes(',') ? `"${entrada.alumno}"` : entrada.alumno;
            
            csvContent += `${fechaStr},${horaStr},${entrada.grado},${alumnoEscapado},${estadoMochila}\n`;
          });
          
          
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const fechaHoy = new Date().toISOString().split('T')[0];
          
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `historial_retiros_${fechaHoy}.csv`);
          link.style.visibility = 'hidden';
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          mostrarNotificacionFlotante(`Se han exportado ${datosExportar.length} registros a CSV.`);
        } catch (error) {
          console.error("Error al exportar a CSV:", error);
          mostrarNotificacionFlotante("Error al exportar los datos. Por favor, inténtelo de nuevo.");
        }
      }
      
      
      async function realizarBackup() {
        try {
         
          const datosBackup = {
            alumnosPorGrado: alumnosPorGrado,
            notificacionesRetiro: notificacionesRetiro,
            historialRetiros: historialRetiros,
            fechaBackup: new Date().toISOString()
          };
          
        
          const jsonData = JSON.stringify(datosBackup, null, 2);
          
          
          const blob = new Blob([jsonData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const fechaHoy = new Date().toISOString().split('T')[0];
          
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `backup_sistema_retiros_${fechaHoy}.json`);
          link.style.visibility = 'hidden';
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          
          await db.collection('backups').doc(`backup_${fechaHoy}`).set({
            fecha: firebase.firestore.Timestamp.fromDate(new Date()),
            datosAlumnos: true,
            datosNotificaciones: true,
            datosHistorial: true
          });
          
          mostrarNotificacionFlotante("Copia de seguridad creada correctamente.");
        } catch (error) {
          console.error("Error al crear copia de seguridad:", error);
          mostrarNotificacionFlotante("Error al crear la copia de seguridad. Por favor, inténtelo de nuevo.");
        }
      }
      
    


function hideNotification() {
  document.getElementById('page-notification').style.display = 'none';
  notificacionGrandeMostrada = false;
}




function iniciarEscuchaEnTiempoReal() {
  db.collection('notificaciones')
    .orderBy('fechaHora', 'desc')
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const notificacion = change.doc.data();
          const gradoActual = gradoSeleccionadoEnAula(); 

          if (notificacion.grado === gradoActual) {
            mostrarNotificacionFlotante(
              `Nueva solicitud de retiro de ${notificacion.alumno}`,
              'success'
            );
            mostrarNotificacionRetiro(notificacion);
            actualizarAlertaBadge();

            if (!notificacionesRetiro[gradoActual]) {
              notificacionesRetiro[gradoActual] = [];
            }
            notificacionesRetiro[gradoActual].push({
              id: change.doc.id,
              ...notificacion
            });

            
            cargarNotificacionesAula();
          } else if (gradoActual) {
            console.log(`[IGNORADO] Nueva solicitud de ${notificacion.alumno} para ${notificacion.grado}, no es tu aula (${gradoActual}).`);
          }
        }
      });
    });
}


          
      
document.addEventListener('DOMContentLoaded', async function () {
  try {
    const selectRol = document.getElementById('rol-usuario');
    
   
    const rolGuardado = localStorage.getItem('rol');

    if (rolGuardado) {
      selectRol.value = rolGuardado;
    } else {
      
      const isTablet = window.innerWidth <= 1024;

      
      selectRol.value = isTablet ? 'padres' : 'aula';
    }

    rolActual = selectRol.value;
    localStorage.setItem('rol', rolActual);

    cambiarModoAcceso(); 

    await cargarDatosIniciales(); 
    iniciarEscuchaEnTiempoReal(); 

    console.log(`Sistema iniciado en modo: ${rolActual}`);
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);
    mostrarNotificacionFlotante("Hubo un problema al iniciar la aplicación. Por favor, recarga la página.");
  }
});


        
     
    function cerrarModal() {
      document.getElementById('modal-login').style.display = 'none';
    }
    
     
let rolActual = 'padres';
let adminAutenticado = false;


function cambiarModoAcceso() {
  const rolUsuario = document.getElementById('rol-usuario').value;
  const tabs = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-panel');

  
  if (rolUsuario === 'admin' && !adminAutenticado) {
    
  document.getElementById('modal-login').style.display = 'flex';
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    setTimeout(() => {
      document.getElementById('username')?.focus();
    }, 100);
    return;
  }

  rolActual = rolUsuario;

  
  tabs.forEach(tab => {
    tab.style.display = 'none';
    tab.classList.remove('active');
  });
  tabContents.forEach(content => content.classList.remove('active'));

  
  if (rolUsuario === 'padres') {
    tabs[0].style.display = 'inline-block';
    tabs[0].classList.add('active');
    tabContents[0].classList.add('active');
  } else if (rolUsuario === 'aula') {
    tabs[2].style.display = 'inline-block';
    tabs[3].style.display = 'inline-block';
    tabs[2].classList.add('active');
    tabContents[2].classList.add('active');
  } else if (rolUsuario === 'admin' && adminAutenticado) {
    tabs.forEach(tab => tab.style.display = 'inline-block');
    tabs[0].classList.add('active');
    tabContents[0].classList.add('active');
  }

  if (rolUsuario === 'aula') {
    const selectAula = document.getElementById('aula-grado');
    const grados = ['1A','1B','2A','2B','3A','3B','4A','4B','5A','5B','6A','6B','7A','7B'];
    document.getElementById('aula-grado').addEventListener('change', () => {
      const nuevoGrado = document.getElementById('aula-grado').value;
      if (nuevoGrado) {
        cargarNotificacionesAula();
        escucharNotificaciones(nuevoGrado);
      }
    });
    
    selectAula.innerHTML = '<option value="">Seleccione</option>';
    grados.forEach(grado => {
      const opt = document.createElement('option');
      opt.value = grado;
      opt.textContent = grado;
      selectAula.appendChild(opt);
    });

 
selectAula.addEventListener('change', () => {
  const gradoSeleccionado = selectAula.value;
  if (gradoSeleccionado) {
    cargarNotificacionesAula();
    escucharNotificaciones(gradoSeleccionado);
  }
});


if (selectAula.value) {
  cargarNotificacionesAula();
  escucharNotificaciones(selectAula.value);
}

  }

  if (rolUsuario === 'aula') {
    const gradoSeleccionado = document.getElementById('aula-grado').value;
    const selectHistorialGrado = document.getElementById('historial-grado');
  
  
    selectHistorialGrado.parentElement.style.display = 'none';
    selectHistorialGrado.value = gradoSeleccionado;
  
  
    filtrarHistorial();
  } else {
   
    document.getElementById('historial-grado').parentElement.style.display = 'block';
  }


  const gradoAula = document.getElementById('aula-grado').value;
  if (gradoAula) cargarNotificacionesAula();

  actualizarAlertaBadge();
}


function verificarCredenciales() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  if (username === 'admin' && password === 'Ver814b') {
     
      adminAutenticado = true;
      document.getElementById('modal-login').style.display = 'none';
      
      
      cambiarModoAcceso();
      cambiarPestaña(1);
  } else {
     
      document.getElementById('login-error').style.display = 'block';
  }
}


function cancelarLogin() {
  document.getElementById('modal-login').style.display = 'none';
  document.getElementById('rol-usuario').value = rolActual || 'padres';
}


function showNotification(alumno, grado, conMochila, nombrePadre) {
  if (grado !== gradoSeleccionadoEnAula()) return;

  const notifElement = document.getElementById('page-notification');
  notifElement.style.display = 'flex';
  notificacionGrandeMostrada = true;

  document.getElementById('notif-alumno').textContent = alumno;
  document.getElementById('notif-grado').textContent = grado;
  document.getElementById('notif-mochila').textContent = conMochila ? 'Sí' : 'No';
  document.getElementById('notif-padre').textContent = nombrePadre;
  document.getElementById('notif-hora').textContent = new Date().toLocaleTimeString('es-ES');

  try {
    const sound = document.getElementById('notification-sound');
    sound.currentTime = 0;
    sound.play().catch(e => console.log("No se pudo reproducir el sonido:", e));
  } catch (e) {
    console.log("Error con el sonido de notificación:", e);
  }
}



function contarNotificacionesPendientes() {
    let count = 0;
    Object.values(notificacionesRetiro).forEach(listaNotificaciones => {
        listaNotificaciones.forEach(notificacion => {
            if (!notificacion.atendido) {
                count++;
            }
        });
    });
    return count;
}


function poblarSelectGrados(idSelect) {
  const grados = ['1A','1B','2A','2B','3A','3B','4A','4B','5A','5B','6A','6B','7A','7B'];
  const select = document.getElementById(idSelect);

  
  select.innerHTML = '<option value="">Seleccione grado</option>';

  grados.forEach(grado => {
    const option = document.createElement('option');
    option.value = grado;
    option.textContent = `${grado[0]}° ${grado[1]}`;
    select.appendChild(option);
  });
}


document.addEventListener('DOMContentLoaded', function() {
  poblarSelectGrados('gestion-grado');
  poblarSelectGrados('retiro-grado');
  poblarSelectGrados('aula-grado');
  poblarSelectGrados('historial-grado');

  
});

document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
    e.preventDefault();

    const selector = document.querySelector('.role-selector');
    const visible = selector.style.display === 'flex';

    selector.style.display = visible ? 'none' : 'flex';

  }
});


function mostrarNotificacionRetiro(data) {
  const { alumno, grado, conMochila, nombrePadre, fechaHora } = data;

 
  

  const textoMochila = conMochila ? '✅ Con mochila' : '❌ Sin mochila';

  Swal.fire({
    icon: 'info',
    title: '🚸 Solicitud de retiro',
    html: `
      <div style="text-align: left;">
        <p><strong>Alumno:</strong> ${alumno}</p>
        <p><strong>Grado:</strong> ${grado}</p>
        <p><strong>Retirado por:</strong> ${nombrePadre}</p>
        <p><strong>Mochila:</strong> ${textoMochila}</p>
      </div>
    `,
    confirmButtonText: 'Confirmar retiro',
    confirmButtonColor: '#4CAF50',
    showCloseButton: true,
    allowOutsideClick: false,
    backdrop: true,
    customClass: {
      popup: 'animated fadeInDown'
    }
  });
}


function agregarHijoAlFormulario() {
  const container = document.getElementById('hijos-container');

  const div = document.createElement('div');
  div.classList.add('campo-flex');
  div.innerHTML = `
    <select class="grado-hijo">
      <option value="">Grado</option>
      <option value="1A">1° A</option><option value="1B">1° B</option>
      <option value="2A">2° A</option><option value="2B">2° B</option>
      <option value="3A">3° A</option><option value="3B">3° B</option>
      <option value="4A">4° A</option><option value="4B">4° B</option>
      <option value="5A">5° A</option><option value="5B">5° B</option>
      <option value="6A">6° A</option><option value="6B">6° B</option>
      <option value="7A">7° A</option><option value="7B">7° B</option>
    </select>
    <input type="text" class="nombre-hijo" placeholder="Nombre del alumno">
    <button onclick="this.parentElement.remove()">❌</button>
  `;
  container.appendChild(div);
}

async function guardarPadreEnFirestore() {
  const dniPadre = document.getElementById('dni-padre').value.trim();
  const nombrePadre = document.getElementById('nombre-padre-gestion').value.trim();
  const hijosContainer = document.getElementById('hijos-container');
  const hijos = [];

  hijosContainer.querySelectorAll('.campo-flex').forEach(div => {
    const grado = div.querySelector('select.grado-hijo')?.value || '';
    const nombreHijo = div.querySelector('select.nombre-hijo')?.value || '';

    if (grado && nombreHijo) {
      hijos.push({ nombre: nombreHijo, grado });
    }
  });

  if (!dniPadre || !nombrePadre) {
    Swal.fire('Error', 'Debe ingresar DNI y nombre del padre.', 'error');
    return;
  }

  if (hijos.length === 0) {
    Swal.fire('Error', 'Debe agregar al menos un hijo.', 'error');
    return;
  }

  try {
    const refPadres = db.collection('padresAutorizados');
    const padreDoc = await refPadres.doc(dniPadre).get();

    if (padreDoc.exists) {
      const datosExistentes = padreDoc.data();
      const hijosExistentes = datosExistentes.hijos || [];

      hijos.forEach(nuevoHijo => {
        const yaExiste = hijosExistentes.some(h => h.nombre === nuevoHijo.nombre && h.grado === nuevoHijo.grado);
        if (!yaExiste) hijosExistentes.push(nuevoHijo);
      });

      await refPadres.doc(dniPadre).update({
        nombrePadre,
        hijos: hijosExistentes
      });
    } else {
      await refPadres.doc(dniPadre).set({
        nombrePadre,
        hijos
      });
    }

    Swal.fire('Guardado', 'Datos del padre actualizados correctamente.', 'success');
    document.getElementById('dni-padre').value = '';
    document.getElementById('nombre-padre-gestion').value = '';
    document.getElementById('hijos-container').innerHTML = '';

    cargarPadresAutorizados();

  } catch (error) {
    console.error('Error al guardar padre:', error);
    Swal.fire('Error', 'Hubo un problema al guardar los datos.', 'error');
  }
}




function importarPadresDesdeCSV() {
  const input = document.getElementById('csv-padres');
  if (!input.files.length) {
    mostrarNotificacionFlotante('Seleccione un archivo CSV.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async function (e) {
    const contenido = e.target.result;
    procesarTextoPadres(contenido);
  };
  reader.readAsText(input.files[0]);
}

function importarPadresDesdeTexto() {
  const texto = document.getElementById('lista-padres-textarea').value.trim();
  if (!texto) {
    mostrarNotificacionFlotante('Pegue una lista de padres.', 'error');
    return;
  }
  procesarTextoPadres(texto);
}


async function procesarTextoPadres(texto) {
  try {
    const lineas = texto.split(/\r?\n/);
    const datosPadres = {};

    lineas.forEach(linea => {
      const partes = linea.split(',');
      if (partes.length >= 4) {
        const dni = partes[0].trim();
        const nombrePadre = partes[1].trim();
        const nombreAlumno = partes[2].trim();
        const grado = partes[3].trim();

        if (!datosPadres[dni]) {
          datosPadres[dni] = {
            nombrePadre,
            hijos: []
          };
        }

        datosPadres[dni].hijos.push({ nombre: nombreAlumno, grado });
      }
    });

    const batch = db.batch();
    Object.keys(datosPadres).forEach(dni => {
      const ref = db.collection('padresAutorizados').doc(dni);
      batch.set(ref, datosPadres[dni]);
    });

    await batch.commit();
    mostrarNotificacionFlotante('Importación completada.');
    listarPadres();
  } catch (error) {
    console.error("Error al importar padres:", error);
    mostrarNotificacionFlotante('Error al importar.', 'error');
  }
}


async function listarPadres() {
  try {
    const snapshot = await db.collection('padresAutorizados').get();
    const contenedor = document.getElementById('lista-padres');
    contenedor.innerHTML = '';

    if (snapshot.empty) {
      contenedor.innerHTML = '<div>No hay padres registrados.</div>';
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.className = 'alumno-item'; 
      div.innerHTML = `
        <div>
          <strong>${data.nombrePadre}</strong> (DNI: ${doc.id})<br>
          ${data.hijos.map(h => `• ${h.nombre} (${h.grado})`).join('<br>')}
        </div>
      `;
      contenedor.appendChild(div);
    });
  } catch (error) {
    console.error("Error al listar padres:", error);
  }
}


let padreActual = null; 

async function buscarPadrePorDNI() {
  const dni = document.getElementById('dni-ingresado').value.trim();
  const nombreDiv = document.getElementById('nombre-padre-mostrado');
  const gradoSelect = document.getElementById('retiro-grado');
  const alumnoSelect = document.getElementById('retiro-alumno');

  nombreDiv.textContent = '';
  gradoSelect.innerHTML = '<option value="">Seleccione</option>';
  gradoSelect.disabled = true;
  alumnoSelect.innerHTML = '<option value="">Seleccione</option>';
  alumnoSelect.disabled = true;
  padreActual = null;

  if (dni.length < 7) return; 

  try {
    const doc = await db.collection('padresAutorizados').doc(dni).get();

    if (!doc.exists) {
      nombreDiv.textContent = '❌ DNI no encontrado.';
      return;
    }

    padreActual = doc.data();
    nombreDiv.textContent = `Padre: ${padreActual.nombrePadre}`;

   
    const gradosUnicos = [...new Set(padreActual.hijos.map(hijo => hijo.grado))];
    gradosUnicos.forEach(grado => {
      const opt = document.createElement('option');
      opt.value = grado;
      opt.textContent = grado;
      gradoSelect.appendChild(opt);
    });

    gradoSelect.disabled = false;

  } catch (error) {
    console.error("Error al buscar padre:", error);
    mostrarNotificacionFlotante('Error al buscar el padre.', 'error');
  }
}


function agregarHijoAlFormulario() {
  const container = document.getElementById('hijos-container');

  const div = document.createElement('div');
  div.classList.add('campo-flex');

  div.innerHTML = `
    <select class="grado-hijo" onchange="cargarAlumnosParaPadre(this)">
      <option value="">Grado</option>
      <option value="1A">1° A</option><option value="1B">1° B</option>
      <option value="2A">2° A</option><option value="2B">2° B</option>
      <option value="3A">3° A</option><option value="3B">3° B</option>
      <option value="4A">4° A</option><option value="4B">4° B</option>
      <option value="5A">5° A</option><option value="5B">5° B</option>
      <option value="6A">6° A</option><option value="6B">6° B</option>
      <option value="7A">7° A</option><option value="7B">7° B</option>
    </select>

    <select class="nombre-hijo" disabled>
      <option value="">Seleccione un alumno</option>
    </select>

    <button onclick="this.parentElement.remove()">❌</button>
  `;

  container.appendChild(div);
}

// Esta función carga los alumnos del grado seleccionado en el select correspondiente
function cargarAlumnosParaPadre(selectGrado) {
  const grado = selectGrado.value;
  const alumnoSelect = selectGrado.parentElement.querySelector('.nombre-hijo');

  alumnoSelect.innerHTML = '<option value="">Seleccione un alumno</option>';
  alumnoSelect.disabled = true;

  if (!grado) return;

  const alumnos = alumnosPorGrado[grado] || [];
  alumnos.forEach(alumno => {
    const opt = document.createElement('option');
    opt.value = alumno;
    opt.textContent = alumno;
    alumnoSelect.appendChild(opt);
  });

  alumnoSelect.disabled = false;
}

async function cargarPadresAutorizados() {
  const contenedor = document.getElementById('lista-padres');
  contenedor.innerHTML = '';

  const snapshot = await db.collection('padresAutorizados').get();

  snapshot.forEach(doc => {
    const datos = doc.data();
    const div = document.createElement('div');
    div.classList.add('alumno-item');
    div.innerHTML = `
      <strong>${doc.id} - ${datos.nombrePadre}</strong><br>
      Hijos: ${datos.hijos.map(h => `${h.nombre} (${h.grado})`).join(', ')}
      <br><button onclick="editarPadre('${doc.id}')">✏️ Editar</button>
    `;
    contenedor.appendChild(div);
  });
}

function editarPadre(dniPadre) {
  db.collection('padresAutorizados').doc(dniPadre).get().then(doc => {
    if (doc.exists) {
      const datos = doc.data();
      document.getElementById('dni-padre').value = dniPadre;
      document.getElementById('nombre-padre-gestion').value = datos.nombrePadre;
      const hijosContainer = document.getElementById('hijos-container');
      hijosContainer.innerHTML = '';

      datos.hijos.forEach(hijo => {
        const div = document.createElement('div');
        div.classList.add('campo-flex');
        div.innerHTML = `
          <select class="grado-hijo">
            <option value="">Grado</option>
            ${['1A','1B','2A','2B','3A','3B','4A','4B','5A','5B','6A','6B','7A','7B'].map(grado => `
              <option value="${grado}" ${grado === hijo.grado ? 'selected' : ''}>${grado}</option>
            `).join('')}
          </select>
          <input type="text" value="${hijo.nombre}" placeholder="Nombre del alumno">
          <button onclick="this.parentElement.remove()">❌</button>
        `;
        hijosContainer.appendChild(div);
      });
    }
  });
}


async function mostrarPadres() {
  const contenedor = document.getElementById('lista-padres');
  contenedor.innerHTML = '';

  try {
    const snapshot = await db.collection('padresAutorizados').get();

    listaPadresCompleta = []; 

    if (snapshot.empty) {
      contenedor.innerHTML = '<div class="empty-list">No hay padres registrados.</div>';
      return;
    }

    snapshot.forEach(doc => {
      const padre = doc.data();
      padre.id = doc.id;
      padre.dni = doc.id; 
      listaPadresCompleta.push(padre);
    });
    

    renderizarPadres(listaPadresCompleta);

  } catch (error) {
    console.error('Error al mostrar padres:', error);
    contenedor.innerHTML = '<div class="empty-list">Error al cargar los padres.</div>';
  }
}


async function eliminarPadre(id) {
  if (confirm('¿Seguro que desea eliminar este padre?')) {
    try {
      await db.collection('padresAutorizados').doc(id).delete();
      mostrarNotificacionFlotante('Padre eliminado.');
      mostrarPadres(); 
    } catch (error) {
      console.error('Error al eliminar padre:', error);
      mostrarNotificacionFlotante('Error al eliminar padre.', 'error');
    }
  }
}

function renderizarPadres(lista) {
  const contenedor = document.getElementById('lista-padres');
  contenedor.innerHTML = '';

  if (lista.length === 0) {
    contenedor.innerHTML = '<div class="empty-list">No se encontraron padres.</div>';
    return;
  }

  lista.forEach(padre => {
    const divPadre = document.createElement('div');
    divPadre.className = 'alumno-item';
    divPadre.innerHTML = `
      <div>
        <strong>${padre.nombrePadre}</strong> (DNI: ${padre.dni})
        <br>
        Hijos: ${padre.hijos.map(h => `${h.nombre} (${h.grado})`).join(', ')}
      </div>
      <button onclick="editarPadre('${padre.id}')" class="boton-editar">✏️</button>
      <button onclick="eliminarPadre('${padre.id}')">🗑️</button>
      
    `;
    contenedor.appendChild(divPadre);
  });
}

function filtrarPadres() {
  const texto = document.getElementById('buscador-padres').value.toLowerCase();
  const filtrados = listaPadresCompleta.filter(padre =>
    padre.nombrePadre.toLowerCase().includes(texto) ||
    padre.dni.toLowerCase().includes(texto)
  );
  renderizarPadres(filtrados);
}

function resetearFiltroPadres() {
  document.getElementById('buscador-padres').value = '';
  renderizarPadres(listaPadresCompleta);
}

async function editarPadre(id) {
  try {
    const doc = await db.collection('padresAutorizados').doc(id).get();
    if (!doc.exists) {
      mostrarNotificacionFlotante('Padre no encontrado.', 'error');
      return;
    }

    const padre = doc.data();
    padre.id = id;
    padre.dni = id;
    window.hijosTemp = [...padre.hijos];

    if (!alumnosPorGrado || Object.keys(alumnosPorGrado).length === 0) {
      const snapshot = await db.collection('alumnosPorGrado').doc('datos').get();
      alumnosPorGrado = snapshot.data();
    }

    const gradosDisponibles = Object.keys(alumnosPorGrado).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      return numA - numB;
    });

    await Swal.fire({
      title: 'Editar Datos del Padre',
      html: `
        <input id="nuevo-nombre" class="swal2-input" value="${padre.nombrePadre}" placeholder="Nombre del Padre">
        <input id="nuevo-dni" class="swal2-input" value="${padre.dni}" placeholder="DNI" readonly>

        <div style="text-align:left; margin-top:10px;">
          <strong>Hijos:</strong>
          <div id="lista-hijos-actuales" style="margin-top:8px;"></div>
        </div>

        <div style="margin-top:15px;">
          <select id="select-grado" class="swal2-select">
            <option value="">Seleccione Grado</option>
            ${gradosDisponibles.map(grado => `<option value="${grado}">${grado}</option>`).join('')}
          </select>

          <select id="select-alumno" class="swal2-select" style="margin-top:10px;">
            <option value="">Seleccione Alumno</option>
          </select>

          <button type="button" onclick="agregarHijoTemp()" class="swal2-confirm" style="margin-top:10px;">➕ Agregar Hijo</button>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar cambios',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        renderizarListaHijos();
        document.getElementById('select-grado').addEventListener('change', cargarAlumnosDisponibles);
      },
      preConfirm: () => {
        const nombreNuevo = document.getElementById('nuevo-nombre').value.trim();
        if (!nombreNuevo) {
          Swal.showValidationMessage('El nombre no puede estar vacío');
          return false;
        }
        return {
          nombreNuevo,
          hijosActualizados: window.hijosTemp
        };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { nombreNuevo, hijosActualizados } = result.value;
        await db.collection('padresAutorizados').doc(padre.dni).update({
          nombrePadre: nombreNuevo,
          hijos: hijosActualizados
        });
        mostrarNotificacionFlotante('Datos actualizados correctamente.');
        mostrarPadres();
      }
    });

  } catch (error) {
    console.error('Error al editar padre:', error);
    mostrarNotificacionFlotante('Error al editar padre.', 'error');
  }
}



function renderizarListaHijos() {
  const contenedor = document.getElementById('lista-hijos-actuales');
  contenedor.innerHTML = '';
  if (!window.hijosTemp || window.hijosTemp.length === 0) {
    contenedor.innerHTML = '<small>No hay hijos registrados.</small>';
    return;
  }
  window.hijosTemp.forEach((hijo, index) => {
    const div = document.createElement('div');
    div.className = 'hijo-item';
    div.innerHTML = `
      ${hijo.nombre} (${hijo.grado})
      <button type="button" onclick="eliminarHijoTemp(${index})">❌</button>
    `;
    contenedor.appendChild(div);
  });
}

function eliminarHijoTemp(index) {
  window.hijosTemp.splice(index, 1);
  renderizarListaHijos();
}

function cargarAlumnosDisponibles() {
  const gradoSeleccionado = document.getElementById('select-grado').value;
  const selectAlumnos = document.getElementById('select-alumno');
  selectAlumnos.innerHTML = '<option value="">Seleccione Alumno</option>';
  if (gradoSeleccionado && alumnosPorGrado[gradoSeleccionado]) {
    alumnosPorGrado[gradoSeleccionado].forEach(alumno => {
      const opt = document.createElement('option');
      opt.value = alumno;
      opt.textContent = alumno;
      selectAlumnos.appendChild(opt);
    });
  }
}

function agregarHijoTemp() {
  const gradoSeleccionado = document.getElementById('select-grado').value;
  const alumnoSeleccionado = document.getElementById('select-alumno').value;
  if (!gradoSeleccionado || !alumnoSeleccionado) {
    Swal.showValidationMessage('Debe seleccionar un grado y un alumno');
    return;
  }
  window.hijosTemp.push({ nombre: alumnoSeleccionado, grado: gradoSeleccionado });
  renderizarListaHijos();
  document.getElementById('select-grado').value = '';
  document.getElementById('select-alumno').innerHTML = '<option value="">Seleccione Alumno</option>';
}

document.addEventListener('DOMContentLoaded', async function () {
  try {
    const params = new URLSearchParams(window.location.search);
    const rolParam = params.get('rol');

    const selectRol = document.getElementById('rol-usuario');

    if (rolParam) {
      selectRol.value = rolParam;
    } else {
      
      const isTablet = window.innerWidth <= 1024;
      selectRol.value = isTablet ? 'padres' : 'aula';
    }

    
    rolActual = selectRol.value;
    localStorage.setItem('rol', rolActual);

    cambiarModoAcceso(); 
    await cargarDatosIniciales(); 
    iniciarEscuchaEnTiempoReal(); 

    console.log(`Sistema iniciado automáticamente como: ${rolActual}`);
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);
    mostrarNotificacionFlotante("Problema al iniciar. Por favor, recargue la página.");
  }
});

function seleccionarMochila(conMochila) {
  document.getElementById('conMochila').value = conMochila ? 'true' : 'false';

  // Actualizar visualmente
  const btnCon = document.getElementById('btn-con-mochila');
  const btnSin = document.getElementById('btn-sin-mochila');

  if (conMochila) {
    btnCon.classList.add('seleccionado');
    btnSin.classList.remove('seleccionado');
  } else {
    btnCon.classList.remove('seleccionado');
    btnSin.classList.add('seleccionado');
  }
}
