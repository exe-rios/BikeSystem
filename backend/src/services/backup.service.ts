import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import cron from 'node-cron';
import { google } from 'googleapis';

// Definimos los permisos necesarios (Acceso para administrar archivos en Drive)
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Configuramos la autenticación con la Cuenta de Servicio
const jwtOptions: any = {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: SCOPES
};

const auth = new google.auth.JWT(jwtOptions);

const drive = google.drive({ version: 'v3', auth });

export const iniciarPlanDeRespaldos = () => {
    // Programado para ejecutarse TODOS los días a las 19:50 hs
    cron.schedule('50 19 * * *', async () => {
        console.log('[Backup]: Iniciando el respaldo automático nocturno en Google Drive...');

        const fecha = new Date().toISOString().split('T')[0];
        const nombreArchivo = `bikesystem_db_${fecha}.sql`;
        const rutaTemporal = path.join(process.cwd(), nombreArchivo);

        // Extraemos el volcado de la base de datos desde el contenedor Docker
        const comandoDump = `docker exec -t bikesystem-db pg_dump -U admin_bikesystem -d bikesystem_db > "${rutaTemporal}"`;

        exec(comandoDump, async (error) => {
            if (error) {
                console.error('[Backup Error]: No se pudo generar el archivo SQL local:', error.message);
                return;
            }

            try {
                // Verificamos que el archivo se haya creado correctamente en el disco temporal
                if (!fs.existsSync(rutaTemporal)) {
                    throw new Error('El archivo temporal de respaldo no se creó correctamente.');
                }

                // Preparamos los metadatos para Google Drive
                const fileMetadata: { name: string; parents?: string[] } = {
                    name: nombreArchivo,
                };
                if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
                    fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
                }

                // Preparamos el cuerpo del archivo
                const media = {
                    mimeType: 'application/sql',
                    body: fs.createReadStream(rutaTemporal)
                };

                // Enviamos el archivo directamente a Google Drive
                const response = await drive.files.create({
                    requestBody: fileMetadata,
                    media: media,
                    fields: 'id'
                });

                console.log(`[Backup Éxito]: Respaldo subido a Google Drive con ID: ${response.data.id}`);

            } catch (uploadError) {
                console.error('[Backup Error]: Falló la transferencia a Google Drive:', uploadError);
            } finally {
                // Borramos el archivo local temporal para cuidar el almacenamiento físico
                if (fs.existsSync(rutaTemporal)) {
                    fs.unlinkSync(rutaTemporal);
                    console.log('[Backup]: Limpieza local completada.');
                }
            }
        });
    });
};