import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import TarjetaEstado from '../components/TarjetaEstado';

const ETIQUETA_RESPUESTA = {
  pendiente: {
    admin: { texto: 'Esperando respuesta del árbitro', clase: 'bg-card-yellow/20 text-card-yellow-dark' },
    arbitro: { texto: 'Revisa esta liquidación y responde cuando quieras', clase: 'bg-card-yellow/20 text-card-yellow-dark' },
  },
  aceptada: {
    admin: { texto: 'El árbitro confirmó que todo está correcto', clase: 'bg-pitch-green/15 text-pitch-green-dark' },
    arbitro: { texto: 'Confirmaste que todo está correcto', clase: 'bg-pitch-green/15 text-pitch-green-dark' },
  },
  rechazada: {
    admin: { texto: 'El árbitro marcó desacuerdo', clase: 'bg-card-red/15 text-card-red-dark' },
    arbitro: { texto: 'Estoy en desacuerdo con esta liquidación', clase: 'bg-card-red/15 text-card-red-dark' },
  },
};

// En desarrollo, VITE_API_URL no está definida y esto queda vacío, así que
// las rutas relativas de imagen_url se usan tal cual (como antes). En
// producción, arma la URL completa hacia el backend (donde vive /uploads).
const URL_BASE_ARCHIVOS = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '');

function urlCompleta(rutaRelativa) {
  if (!rutaRelativa) return null;
  if (rutaRelativa.startsWith('http')) return rutaRelativa; // ya es una URL completa
  return `${URL_BASE_ARCHIVOS}${rutaRelativa}`;
}

export default function LiquidacionDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [liquidacion, setLiquidacion] = useState(null);
  const [error, setError] = useState(null);

  const [mensajes, setMensajes] = useState([]);
  const [textoMensaje, setTextoMensaje] = useState('');
  const [imagenMensaje, setImagenMensaje] = useState(null);
  const [previsualizacion, setPrevisualizacion] = useState(null);
  const [errorMensaje, setErrorMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const inputArchivoRef = useRef(null);
  const finConversacionRef = useRef(null);

  function cargar() {
    api.get(`/liquidaciones/${id}`).then((res) => setLiquidacion(res.data));
    api.get(`/liquidaciones/${id}/mensajes`).then((res) => setMensajes(res.data));
  }

  useEffect(cargar, [id]);

  // Refresca solo la conversación cada 5 segundos, para simular una
  // conversación continua sin tener que recargar la página.
  useEffect(() => {
    const intervalo = setInterval(() => {
      api.get(`/liquidaciones/${id}/mensajes`).then((res) => setMensajes(res.data));
    }, 5000);

    return () => clearInterval(intervalo);
  }, [id]);

  useEffect(() => {
    finConversacionRef.current?.scrollIntoView({ block: 'nearest' });
  }, [mensajes]);

  async function pagar() {
    setError(null);
    try {
      await api.put(`/liquidaciones/${id}/pagar`);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al marcar como pagada');
    }
  }

  async function responder(respuesta) {
    try {
      await api.put(`/liquidaciones/${id}/responder`, { respuesta });
      cargar();
    } catch (err) {
      setErrorMensaje(err.response?.data?.error || 'Error al enviar tu respuesta');
    }
  }

  function elegirImagen(e) {
    const archivo = e.target.files[0];
    setImagenMensaje(archivo || null);
    setPrevisualizacion(archivo ? URL.createObjectURL(archivo) : null);
  }

  function quitarImagen() {
    setImagenMensaje(null);
    setPrevisualizacion(null);
    if (inputArchivoRef.current) inputArchivoRef.current.value = '';
  }

  async function enviarMensaje(e) {
    e.preventDefault();
    setErrorMensaje(null);

    if (!textoMensaje.trim() && !imagenMensaje) {
      setErrorMensaje('Escribe un mensaje o adjunta una imagen');
      return;
    }

    const formData = new FormData();
    if (textoMensaje.trim()) formData.append('mensaje', textoMensaje.trim());
    if (imagenMensaje) formData.append('imagen', imagenMensaje);

    setEnviando(true);
    try {
      await api.post(`/liquidaciones/${id}/mensajes`, formData);
      setTextoMensaje('');
      quitarImagen();
      // Si el árbitro escribe, se entiende que está marcando desacuerdo (si aún no había respondido)
      if (usuario?.rol === 'arbitro' && liquidacion.respuesta_arbitro === 'pendiente') {
        await api.put(`/liquidaciones/${id}/responder`, { respuesta: 'rechazada' });
      }
      cargar();
    } catch (err) {
      setErrorMensaje(err.response?.data?.error || 'Error al enviar el mensaje');
    } finally {
      setEnviando(false);
    }
  }

  if (!liquidacion) return <p className="text-sm text-gray-500">Cargando...</p>;

  const esAdmin = usuario?.rol === 'administrador';
  const respuestaInfo = (ETIQUETA_RESPUESTA[liquidacion.respuesta_arbitro] || ETIQUETA_RESPUESTA.pendiente)[esAdmin ? 'admin' : 'arbitro'];

  return (
    <div className="max-w-2xl">
      <Link
        to={esAdmin ? '/liquidaciones' : '/mis-finanzas'}
        className="text-xs text-navy-600 hover:underline mb-3 inline-block"
      >
        ← {esAdmin ? 'Volver a liquidaciones' : 'Regresar'}
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900 capitalize">
            Liquidación {liquidacion.periodo}
          </h1>
          {esAdmin && (
            <p className="text-sm text-navy-700 font-medium mt-0.5">
              {liquidacion.nombres} {liquidacion.apellidos}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            {liquidacion.fecha_inicio?.slice(0, 10)} → {liquidacion.fecha_fin?.slice(0, 10)}
          </p>
        </div>
        <TarjetaEstado estado={liquidacion.estado} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Monto bruto</p>
          <p className="font-display text-xl font-semibold text-navy-900 mt-1">${liquidacion.monto_bruto}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Adelantos</p>
          <p className="font-display text-xl font-semibold text-card-red-dark mt-1">-${liquidacion.total_adelantos}</p>
        </div>
        <div className="bg-navy-900 rounded-lg p-4">
          <p className="text-xs text-navy-100 uppercase tracking-wide">Neto a pagar</p>
          <p className="font-display text-xl font-semibold text-white mt-1">${liquidacion.monto_neto}</p>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-3">Partidos incluidos</h2>
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-700 text-left">
            <tr>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Fecha</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Cancha</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Categoría</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Rol</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Monto</th>
            </tr>
          </thead>
          <tbody>
            {liquidacion.detalle.map((d, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-4 py-2.5">{d.fecha?.slice(0, 10)} · {d.hora}</td>
                <td className="px-4 py-2.5">{d.cancha}</td>
                <td className="px-4 py-2.5 capitalize">{d.categoria}</td>
                <td className="px-4 py-2.5 capitalize">{d.rol_designacion}</td>
                <td className="px-4 py-2.5 tabular-nums font-medium text-navy-900">${d.monto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {liquidacion.adelantos_descontados.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-3">Adelantos descontados</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <tbody>
                {liquidacion.adelantos_descontados.map((a) => (
                  <tr key={a.id} className="border-t border-gray-100 first:border-t-0">
                    <td className="px-4 py-2.5 text-gray-500">{a.fecha_solicitud?.slice(0, 10)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-card-red-dark text-right">-${a.monto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {error && <p className="text-xs text-card-red-dark bg-card-red/10 px-3 py-2 rounded mb-3">{error}</p>}

      {liquidacion.estado !== 'pagada' && esAdmin && (
        liquidacion.respuesta_arbitro === 'aceptada' ? (
          <button
            onClick={pagar}
            className="bg-pitch-green hover:bg-pitch-green-dark text-white text-sm px-4 py-2 rounded font-medium transition mb-6"
          >
            Marcar como pagada
          </button>
        ) : (
          <p className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded mb-6 inline-block">
            El árbitro debe confirmar que está de acuerdo antes de poder marcarla como pagada
          </p>
        )
      )}

      {liquidacion.estado !== 'pagada' && (
        <>
          {/* Estado + botón rápido de aceptar */}
          <div className={`rounded-lg p-3 mb-4 flex items-center justify-between flex-wrap gap-2 ${respuestaInfo.clase}`}>
            <p className="text-sm font-medium">{respuestaInfo.texto}</p>
            {!esAdmin && liquidacion.respuesta_arbitro !== 'aceptada' && (
              <button
                onClick={() => responder('aceptada')}
                className="bg-pitch-green hover:bg-pitch-green-dark text-white text-xs px-3 py-1.5 rounded font-medium transition whitespace-nowrap"
              >
                ✓ Ya está resuelto, todo correcto
              </button>
            )}
          </div>

          {/* Conversación: árbitro y admin pueden escribirse y adjuntar fotos */}
          <h2 className="text-sm font-semibold text-navy-900 uppercase tracking-wide mb-3">Conversación</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-3 max-h-96 overflow-y-auto">
            {mensajes.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                Aún no hay mensajes. {!esAdmin && 'Si algo no cuadra, escribe aquí y adjunta una foto si hace falta.'}
              </p>
            )}
            {mensajes.map((m) => {
              const esMio = m.autor_id === usuario?.id;
              return (
                <div key={m.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 ${esMio ? 'bg-navy-900 text-white' : 'bg-gray-100 text-navy-900'}`}>
                    <p className="text-[11px] opacity-70 mb-0.5">
                      {m.nombres} {m.apellidos} · {m.autor_rol === 'administrador' ? 'Admin' : 'Árbitro'}
                    </p>
                    {m.mensaje && <p className="text-sm whitespace-pre-wrap">{m.mensaje}</p>}
                    {m.imagen_url && (
                      <a href={urlCompleta(m.imagen_url)} target="_blank" rel="noreferrer">
                        <img src={urlCompleta(m.imagen_url)} alt="Adjunto" className="mt-1.5 rounded max-h-48 border border-white/20" />
                      </a>
                    )}
                    <p className="text-[10px] opacity-60 mt-1">
                      {new Date(m.fecha_creacion).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={finConversacionRef} />
          </div>

          <form onSubmit={enviarMensaje} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
            <textarea
              rows={2}
              placeholder="Escribe un mensaje..."
              value={textoMensaje}
              onChange={(e) => setTextoMensaje(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
            {previsualizacion && (
              <div className="relative inline-block">
                <img src={previsualizacion} alt="Vista previa" className="max-h-24 rounded border border-gray-200" />
                <button
                  type="button"
                  onClick={quitarImagen}
                  className="absolute -top-2 -right-2 bg-card-red text-white rounded-full w-5 h-5 text-xs leading-none"
                >
                  ×
                </button>
              </div>
            )}
            {errorMensaje && <p className="text-xs text-card-red-dark">{errorMensaje}</p>}
            <div className="flex items-center justify-between">
              <label className="text-xs text-navy-600 hover:underline cursor-pointer">
                📎 Adjuntar foto
                <input ref={inputArchivoRef} type="file" accept="image/*" onChange={elegirImagen} className="hidden" />
              </label>
              <button
                disabled={enviando}
                className="bg-navy-900 hover:bg-navy-800 text-white text-xs px-4 py-1.5 rounded font-medium transition disabled:opacity-50"
              >
                {enviando ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}