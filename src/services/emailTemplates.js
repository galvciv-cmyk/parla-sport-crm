/**
 * Plantillas HTML de Alta Gama para Correos Oficiales de Parla Sport
 * Compatible con clientes de correo modernos, móviles y modo oscuro.
 */

const baseEmailWrapper = ({ headerTitle, contentHtml }) => {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle}</title>
  <style>
    body, table, td, p, a { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .content-padding { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #040917; color: #F8FAFC; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #040917; padding: 24px 10px;">
    <tr>
      <td align="center">
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #0A1633; border: 1.5px solid rgba(212, 175, 55, 0.45); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);">
          
          <!-- Encabezado con Logo Oficial CID -->
          <tr>
            <td align="center" style="background: linear-gradient(180deg, #0A1633 0%, #060D1E 100%); padding: 30px 20px 20px 20px; border-bottom: 2px solid rgba(212, 175, 55, 0.4);">
              <table align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto 14px auto;">
                <tr>
                  <td align="center">
                    <img src="cid:parlasportlogo" alt="Parla Sport" width="180" style="display: block; height: auto; max-height: 75px; object-fit: contain; margin: 0 auto;" />
                  </td>
                </tr>
              </table>
              <div style="font-size: 18px; font-weight: 800; color: #FBBF24; letter-spacing: 0.5px; text-transform: uppercase; text-shadow: 0 2px 4px rgba(0,0,0,0.4);">
                ${headerTitle}
              </div>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td class="content-padding" style="padding: 28px 24px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Pie de Página -->
          <tr>
            <td style="background-color: #060D1E; padding: 18px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 11px; color: #64748B;">
              Parla Sport • Sistema de Gestión y Notificaciones para Entrenadores.<br>
              Este es un mensaje institucional generado por la Dirección Técnica.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

/**
 * 1. Correo de Bienvenida para el Entrenador recién registrado
 */
export const buildWelcomeCoachHtml = ({ coachName = 'Entrenador', coachEmail = '', originUrl = 'https://parlasport.netlify.app' }) => {
  const cleanUrl = (originUrl || 'https://parlasport.netlify.app').replace(/\/+$/, '');

  const content = `
    <p style="font-size: 16px; color: #F8FAFC; margin-top: 0;">
      ¡Hola, <strong>${coachName}</strong>! Te damos la más cordial bienvenida a la familia de <strong>Parla Sport</strong>.
    </p>

    <p style="font-size: 14px; color: #94A3B8; line-height: 1.6;">
      Tu cuenta como <strong>Entrenador Oficial</strong> ha sido creada y configurada exitosamente. A partir de ahora podrás gestionar tus sesiones de entrenamiento (modalidades 1-1, 1-2 y 1-3), consultar las fichas técnicas de los alumnos y registrar tus evaluaciones directamente desde nuestra plataforma web y móvil.
    </p>

    <!-- Caja de Pasos a Seguir -->
    <div style="background-color: rgba(15, 23, 42, 0.85); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 18px; margin: 20px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #FBBF24; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
        📌 Próximos pasos para empezar:
      </div>
      <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #CBD5E1; line-height: 1.7;">
        <li><strong>Inicia sesión</strong> con tu correo <code>${coachEmail}</code>.</li>
        <li><strong>Configura tu disponibilidad semanal:</strong> Define en tu perfil qué días y horas estás disponible en cancha.</li>
        <li><strong>Revisa tu calendario:</strong> Cada vez que la dirección técnica te asigne alumnos, recibirás un correo y una notificación automática en tu móvil.</li>
      </ul>
    </div>

    <!-- Botón de Ingreso Directo -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0 12px 0;">
      <tr>
        <td align="center">
          <a href="${cleanUrl}/#coach-calendar" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
            ⚽ Ingresar a Mi Panel de Entrenador
          </a>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin-top: 20px;">
      <p style="font-size: 13px; color: #94A3B8; margin: 0;">
        ¡Estamos muy entusiasmados de contar con tu talento y compromiso en la cancha!
      </p>
      <p style="font-size: 13px; font-weight: 700; color: #F5BE28; margin: 6px 0 0 0;">
        Dirección Técnica • Parla Sport
      </p>
    </div>
  `;

  return baseEmailWrapper({
    headerTitle: '¡Bienvenido al Cuerpo Técnico!',
    contentHtml: content,
    originUrl
  });
};

/**
 * 2. Correo Duplicado para el Administrador (Nuevo Entrenador Registrado)
 */
export const buildAdminNewCoachHtml = ({
  coachName = 'Entrenador',
  coachEmail = '',
  coachPhone = '',
  coachSpecialty = '',
  date = new Date().toLocaleDateString('es-ES'),
  originUrl = 'https://parlasport.netlify.app'
}) => {
  const cleanUrl = (originUrl || 'https://parlasport.netlify.app').replace(/\/+$/, '');

  const content = `
    <p style="font-size: 16px; color: #F8FAFC; margin-top: 0;">
      📋 <strong>Notificación Administrativa de Parla Sport</strong>
    </p>

    <p style="font-size: 14px; color: #94A3B8; line-height: 1.6;">
      Se ha registrado un nuevo profesor en la plataforma de Parla Sport. A continuación se presentan los datos del expediente:
    </p>

    <!-- Ficha del Nuevo Entrenador -->
    <table width="100%" style="background-color: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; margin: 18px 0; padding: 16px;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 14px; color: #94A3B8;">
          👤 <strong>Nombre Completo:</strong> <span style="color: #F8FAFC; font-weight: 700;">${coachName}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 14px; color: #94A3B8;">
          📧 <strong>Correo Electrónico:</strong> <span style="color: #60A5FA; font-weight: 600;">${coachEmail}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 14px; color: #94A3B8;">
          📱 <strong>Teléfono / WhatsApp:</strong> <span style="color: #34D399; font-weight: 600;">${coachPhone || 'No registrado'}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 14px; color: #94A3B8;">
          🎯 <strong>Especialidad:</strong> <span style="color: #FBBF24; font-weight: 600;">${coachSpecialty || 'Entrenador General'}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 14px; color: #94A3B8;">
          📅 <strong>Fecha de Registro:</strong> <span style="color: #E2E8F0;">${date}</span>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0 10px 0;">
      <tr>
        <td align="center">
          <a href="${cleanUrl}/#coaches" target="_blank" style="display: inline-block; background-color: #0EA5E9; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13.5px; box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);">
            👥 Ver Panel de Entrenadores en Parla Sport
          </a>
        </td>
      </tr>
    </table>
  `;

  return baseEmailWrapper({
    headerTitle: 'Nuevo Entrenador Registrado',
    contentHtml: content,
    originUrl
  });
};

/**
 * 3. Correo Motivacional Previo al Inicio de la Jornada
 */
export const buildCoachMotivationalHtml = ({
  coachName = 'Entrenador',
  title = '¡Hoy se deja el corazón en la cancha!',
  message = '',
  sessionCount = 0,
  date = new Date().toLocaleDateString('es-ES'),
  originUrl = 'https://parlasport.netlify.app'
}) => {
  const cleanUrl = (originUrl || 'https://parlasport.netlify.app').replace(/\/+$/, '');

  const defaultMessage = `Cada pase, cada corrección y cada palabra tuya inspiran a nuestros alumnos a ser su mejor versión. ¡A darlo todo hoy en cancha con pasión y excelencia Parla Sport!`;
  const finalMessage = message || defaultMessage;

  const content = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; background: rgba(245, 158, 11, 0.15); border: 1px solid #F59E0B; color: #FDE047; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
        🌅 Mensaje del Día • Parla Sport
      </span>
      <h2 style="font-size: 20px; font-weight: 800; color: #F8FAFC; margin: 12px 0 6px 0;">
        ${title}
      </h2>
      <p style="font-size: 13px; color: #94A3B8; margin: 0;">
        Jornada deportiva del <strong>${date}</strong>
      </p>
    </div>

    <p style="font-size: 15px; color: #E2E8F0; line-height: 1.6;">
      Hola, Profe <strong>${coachName}</strong>:
    </p>

    <!-- Tarjeta de la Frase Motivacional -->
    <div style="background: linear-gradient(135deg, rgba(15, 28, 63, 0.95) 0%, rgba(10, 22, 51, 0.95) 100%); border-left: 4px solid #F5BE28; border-radius: 0 12px 12px 0; padding: 20px; margin: 20px 0; box-shadow: 0 4px 16px rgba(0,0,0,0.4);">
      <p style="font-size: 16px; font-style: italic; color: #F8FAFC; line-height: 1.6; margin: 0;">
        "${finalMessage}"
      </p>
    </div>

    ${sessionCount > 0 ? `
      <div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 12px 16px; text-align: center; margin: 18px 0;">
        <span style="font-size: 13px; color: #34D399; font-weight: 700;">
          ⚽ Tienes ${sessionCount} ${sessionCount === 1 ? 'sesión programada' : 'sesiones programadas'} para tu jornada de hoy.
        </span>
      </div>
    ` : ''}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 26px 0 10px 0;">
      <tr>
        <td align="center">
          <a href="${cleanUrl}/#coach-calendar" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #F5BE28 0%, #D97706 100%); color: #060D1E; text-decoration: none; padding: 13px 26px; border-radius: 10px; font-weight: 800; font-size: 13.5px; box-shadow: 0 4px 12px rgba(245, 190, 40, 0.35);">
            ⚽ Ver Mi Agenda de Hoy
          </a>
        </td>
      </tr>
    </table>
  `;

  return baseEmailWrapper({
    headerTitle: '¡A Darlo Todo en Cancha!',
    contentHtml: content,
    originUrl
  });
};

/**
 * 4. Correo de Agradecimiento al Finalizar la Jornada de Sesiones
 */
export const buildCoachWorkdayThanksHtml = ({
  coachName = 'Entrenador',
  completedCount = 1,
  date = new Date().toLocaleDateString('es-ES'),
  originUrl = 'https://parlasport.netlify.app'
}) => {
  const content = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid #10B981; color: #34D399; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
        🏆 Fin de Jornada • Misión Cumplida
      </span>
      <h2 style="font-size: 20px; font-weight: 800; color: #F8FAFC; margin: 12px 0 6px 0;">
        ¡Excelente trabajo en cancha, Profe ${coachName}!
      </h2>
      <p style="font-size: 13px; color: #94A3B8; margin: 0;">
        Entrenamientos finalizados el <strong>${date}</strong>
      </p>
    </div>

    <p style="font-size: 15px; color: #E2E8F0; line-height: 1.6;">
      Queremos expresar nuestro más sincero agradecimiento por tu entrega, disciplina y pasión demostrada el día de hoy.
    </p>

    <!-- Tarjeta de Agradecimiento -->
    <div style="background-color: rgba(15, 23, 42, 0.9); border: 1.5px solid rgba(212, 175, 55, 0.35); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="font-size: 15px; color: #FDE047; font-weight: 700; line-height: 1.5; margin: 0 0 10px 0;">
        👏 "La excelencia no es un acto, es un hábito. Gracias por formar el futuro del fútbol en cada minuto de entrenamiento."
      </p>
      <p style="font-size: 13.5px; color: #CBD5E1; line-height: 1.6; margin: 0;">
        Completaste exitosamente <strong>${completedCount} ${completedCount === 1 ? 'sesión de entrenamiento' : 'sesiones de entrenamiento'}</strong> y dejaste asentadas las notas técnicas de cada uno de tus alumnos. Tu liderazgo es el motor de Parla Sport.
      </p>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <p style="font-size: 14px; color: #94A3B8; margin: 0;">
        ¡Descansa bien y recarga energías para la próxima jornada!
      </p>
      <p style="font-size: 14px; font-weight: 800; color: #F5BE28; margin: 6px 0 0 0;">
        Dirección Técnica • Parla Sport
      </p>
    </div>
  `;

  return baseEmailWrapper({
    headerTitle: '¡Gracias por tu Entrega!',
    contentHtml: content,
    originUrl
  });
};
