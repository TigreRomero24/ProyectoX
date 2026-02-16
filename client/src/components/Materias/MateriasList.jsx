import { useState } from 'react';
import TestMode from './TestMode';
import ExamMode from './ExamMode';
import './Materias.css';

export default function MateriasList() {
    const [materias] = useState([
        { id: 1, nombre: 'Matemáticas', descripcion: 'Cálculo y Álgebra' },
        { id: 2, nombre: 'Física', descripcion: 'Mecánica y Termodinámica' },
        { id: 3, nombre: 'Química', descripcion: 'Química Orgánica' },
        { id: 4, nombre: 'Historia', descripcion: 'Historia Moderna' }
    ]);

    const [selectedMateria, setSelectedMateria] = useState(null);
    const [mode, setMode] = useState(null);

    if (selectedMateria && mode === 'test') {
        return (
            <div className="materias-container">
                <button className="btn-back" onClick={() => { setSelectedMateria(null); setMode(null); }}>
                    ← Volver
                </button>
                <TestMode materia={selectedMateria.nombre} />
            </div>
        );
    }

    if (selectedMateria && mode === 'exam') {
        return (
            <div className="materias-container">
                <button className="btn-back" onClick={() => { setSelectedMateria(null); setMode(null); }}>
                    ← Volver
                </button>
                <ExamMode materia={selectedMateria.nombre} />
            </div>
        );
    }

    if (selectedMateria && !mode) {
        return (
            <div className="materias-container">
                <button className="btn-back" onClick={() => setSelectedMateria(null)}>
                    ← Volver
                </button>
                <h2>{selectedMateria.nombre}</h2>
                <div className="mode-selector">
                    <div className="mode-card test-card" onClick={() => setMode('test')}>
                        <h3>📝 Modo Test</h3>
                        <p>Sin límite de tiempo</p>
                        <p>Las preguntas incorrectas se repiten</p>
                        <button>Iniciar Test</button>
                    </div>
                    <div className="mode-card exam-card" onClick={() => setMode('exam')}>
                        <h3>📋 Modo Examen</h3>
                        <p>20 preguntas</p>
                        <p>1 hora de duración</p>
                        <button>Iniciar Examen</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="materias-container">
            <h2>📚 Mis Materias</h2>
            <div className="materias-grid">
                {materias.map(materia => (
                    <div 
                        key={materia.id} 
                        className="materia-card"
                        onClick={() => setSelectedMateria(materia)}
                    >
                        <h3>{materia.nombre}</h3>
                        <p>{materia.descripcion}</p>
                        <div className="card-actions">
                            <span className="btn-enter">Acceder →</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
