import { useState, useEffect } from 'react';
import './Materias.css';

export default function TestMode({ materia }) {
    const [preguntas, setPreguntas] = useState([]);
    const [respuestas, setRespuestas] = useState({});
    const [fallidas, setFallidas] = useState([]);
    const [showFailed, setShowFailed] = useState(false);

    useEffect(() => {
        // Simular carga de preguntas
        setPreguntas([
            { id: 1, texto: '¿Cuál es la capital de Francia?', opciones: ['París', 'Lyon', 'Marsella'], respuesta: 'París' },
            { id: 2, texto: '¿Cuál es la fórmula del agua?', opciones: ['H2O', 'O2', 'H2'], respuesta: 'H2O' }
        ]);

        // Autoguardado cada 5 minutos
        const autoSave = setInterval(() => {
            console.log('Autoguardando respuestas...', respuestas);
        }, 300000);

        return () => clearInterval(autoSave);
    }, [respuestas]);

    const handleSelectAnswer = (preguntaId, respuesta) => {
        setRespuestas({ ...respuestas, [preguntaId]: respuesta });
    };

    const handleFinish = () => {
        const nuevasFallidas = preguntas.filter(p => respuestas[p.id] !== p.respuesta);
        
        if (nuevasFallidas.length > 0) {
            setFallidas(nuevasFallidas);
            setShowFailed(true);
        } else {
            alert('¡Felicidades! Respondiste todas correctamente.');
        }
    };

    if (showFailed) {
        return (
            <div className="test-container">
                <h2>Preguntas Incorrectas - Intenta de Nuevo</h2>
                {fallidas.map(p => (
                    <div key={p.id} className="pregunta-card">
                        <h4>{p.texto}</h4>
                        <div className="opciones">
                            {p.opciones.map(op => (
                                <button
                                    key={op}
                                    className={`opcion ${respuestas[p.id] === op ? 'selected' : ''}`}
                                    onClick={() => handleSelectAnswer(p.id, op)}
                                >
                                    {op}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
                <button onClick={() => setShowFailed(false)} className="btn-primary">
                    Finalizar Test
                </button>
            </div>
        );
    }

    return (
        <div className="test-container">
            <h2>📝 Modo Test - {materia}</h2>
            <p className="info">Sin límite de tiempo • Autoguardado cada 5 minutos</p>

            {preguntas.map((preg, idx) => (
                <div key={preg.id} className="pregunta-card">
                    <h4>{idx + 1}. {preg.texto}</h4>
                    <div className="opciones">
                        {preg.opciones.map(op => (
                            <button
                                key={op}
                                className={`opcion ${respuestas[preg.id] === op ? 'selected' : ''}`}
                                onClick={() => handleSelectAnswer(preg.id, op)}
                            >
                                {op}
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            <button onClick={handleFinish} className="btn-primary">
                Finalizar Test
            </button>
        </div>
    );
}