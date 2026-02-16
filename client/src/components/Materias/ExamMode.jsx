import { useState, useEffect } from 'react';
import './Materias.css';

export default function ExamMode({ materia }) {
    const [timeLeft, setTimeLeft] = useState(3600); // 1 hora en segundos
    const [preguntasRestantes] = useState(20);
    const [respuestas, setRespuestas] = useState({});
    const [currentQuestion, setCurrentQuestion] = useState(1);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    alert('⏱️ Se acabó el tiempo del examen');
                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="exam-container">
            <div className="exam-header">
                <h2>📋 Examen - {materia}</h2>
                <div className={`timer ${timeLeft < 600 ? 'warning' : ''}`}>
                    ⏱️ {minutes}:{seconds.toString().padStart(2, '0')}
                </div>
                <div className="progress">
                    Pregunta {currentQuestion}/{preguntasRestantes}
                </div>
            </div>

            <div className="exam-content">
                <h4>Pregunta {currentQuestion}</h4>
                <p>¿Pregunta de ejemplo?</p>
                <div className="opciones">
                    {['Opción A', 'Opción B', 'Opción C', 'Opción D'].map(op => (
                        <button key={op} className="opcion">
                            {op}
                        </button>
                    ))}
                </div>
            </div>

            <div className="exam-navigation">
                <button onClick={() => setCurrentQuestion(q => Math.max(1, q - 1))} disabled={currentQuestion === 1}>
                    ← Anterior
                </button>
                <button onClick={() => setCurrentQuestion(q => Math.min(preguntasRestantes, q + 1))} disabled={currentQuestion === preguntasRestantes}>
                    Siguiente →
                </button>
                <button className="btn-danger" onClick={() => alert('Examen finalizado')}>
                    Entregar Examen
                </button>
            </div>
        </div>
    );
}