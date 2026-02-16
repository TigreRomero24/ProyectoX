import './About.css';

export default function About() {
    return (
        <div className="about-container">
            <h2>ℹ️ Acerca de EduQuery</h2>
            
            <div className="about-content">
                <section className="about-section">
                    <h3>📚 ¿Qué es EduQuery?</h3>
                    <p>
                        EduQuery es una plataforma educativa integral diseñada para facilitar el aprendizaje 
                        y la evaluación de estudiantes. Nuestro sistema combina tecnología moderna con prácticas 
                        pedagógicas efectivas para crear una experiencia de aprendizaje óptima.
                    </p>
                </section>

                <section className="about-section">
                    <h3>✨ Características Principales</h3>
                    <ul>
                        <li>📝 <strong>Modo Test</strong> - Práctica sin límite de tiempo con autosave cada 5 minutos</li>
                        <li>📋 <strong>Modo Examen</strong> - Evaluaciones temporizadas con 20 preguntas y 1 hora de duración</li>
                        <li>💬 <strong>Foro de Discusión</strong> - Espacio para compartir dudas y conocimientos</li>
                        <li>👥 <strong>Administración</strong> - Panel para gestionar preguntas y usuarios</li>
                        <li>🔐 <strong>Seguridad</strong> - Autenticación institucional con protección de dispositivos</li>
                    </ul>
                </section>

                <section className="about-section">
                    <h3>🔒 Seguridad</h3>
                    <p>
                        Tu seguridad es nuestra prioridad. EduQuery implementa múltiples capas de protección:
                    </p>
                    <ul>
                        <li>Autenticación con correo institucional</li>
                        <li>Un dispositivo registrado por usuario</li>
                        <li>Identificación de dispositivo mediante fingerprint</li>
                        <li>Registro de IP en cada acceso</li>
                        <li>Bloqueo de capturas de pantalla</li>
                    </ul>
                </section>

                <section className="about-section">
                    <h3>📞 Soporte</h3>
                    <p>
                        ¿Tienes preguntas o necesitas asistencia? Puedes:
                    </p>
                    <ul>
                        <li>📧 Enviar un email a: soporte@eduquery.edu</li>
                        <li>💬 Usar el foro de discusión de la plataforma</li>
                        <li>📱 Contactar al departamento de TI</li>
                    </ul>
                </section>

                <section className="about-section version">
                    <p><strong>Versión: 1.0.0</strong></p>
                    <p><strong>Última actualización: Enero 2024</strong></p>
                </section>
            </div>
        </div>
    );
}
