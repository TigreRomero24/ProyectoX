import { useState } from 'react';
import './Forum.css';

export default function Forum() {
    const [threads, setThreads] = useState([
        { 
            id: 1, 
            titulo: '¿Cómo resolver ecuaciones cuadráticas?', 
            autor: 'estudiante1@ejemplo.com',
            fecha: '2024-01-15',
            respuestas: 3,
            vistas: 45
        },
        { 
            id: 2, 
            titulo: 'Dudas sobre el parcial de Física', 
            autor: 'estudiante2@ejemplo.com',
            fecha: '2024-01-14',
            respuestas: 5,
            vistas: 62
        }
    ]);

    const [newThread, setNewThread] = useState('');
    const [selectedThread, setSelectedThread] = useState(null);
    const [reply, setReply] = useState('');

    const handleCreateThread = (e) => {
        e.preventDefault();
        if (newThread.trim()) {
            setThreads([...threads, {
                id: Date.now(),
                titulo: newThread,
                autor: 'usuario@ejemplo.com',
                fecha: new Date().toISOString().split('T')[0],
                respuestas: 0,
                vistas: 0
            }]);
            setNewThread('');
        }
    };

    const handleReply = (e) => {
        e.preventDefault();
        if (reply.trim()) {
            alert('Respuesta agregada: ' + reply);
            setReply('');
        }
    };

    if (selectedThread) {
        return (
            <div className="forum-thread-view">
                <button className="btn-back" onClick={() => setSelectedThread(null)}>
                    ← Volver
                </button>
                <div className="thread-detail">
                    <h2>{selectedThread.titulo}</h2>
                    <div className="thread-meta">
                        <span>📝 Por: {selectedThread.autor}</span>
                        <span>📅 {selectedThread.fecha}</span>
                        <span>💬 {selectedThread.respuestas} respuestas</span>
                    </div>
                    
                    <div className="thread-content">
                        <p>Contenido de la pregunta original...</p>
                    </div>

                    <div className="replies-section">
                        <h3>Respuestas ({selectedThread.respuestas})</h3>
                        <div className="reply-item">
                            <strong>profesor@ejemplo.com</strong>
                            <p>Esta es una respuesta de ejemplo al tema...</p>
                        </div>
                    </div>

                    <form onSubmit={handleReply} className="reply-form">
                        <h4>Tu Respuesta</h4>
                        <textarea 
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            placeholder="Escribe tu respuesta..."
                            rows={4}
                        />
                        <button type="submit" className="btn-primary">
                            Enviar Respuesta
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="forum-container">
            <h2>💬 Foro de Discusión</h2>
            
            <form onSubmit={handleCreateThread} className="new-thread-form">
                <h3>Crear Nueva Pregunta</h3>
                <input 
                    type="text"
                    value={newThread}
                    onChange={(e) => setNewThread(e.target.value)}
                    placeholder="¿Cuál es tu pregunta?"
                    required
                />
                <button type="submit" className="btn-primary">
                    Publicar Pregunta
                </button>
            </form>

            <div className="threads-list">
                <h3>Temas Recientes</h3>
                {threads.map(thread => (
                    <div 
                        key={thread.id} 
                        className="thread-card"
                        onClick={() => setSelectedThread(thread)}
                    >
                        <div className="thread-header">
                            <h4>{thread.titulo}</h4>
                            <span className="thread-category">Pregunta</span>
                        </div>
                        <div className="thread-body">
                            <span>👤 {thread.autor}</span>
                            <span>📅 {thread.fecha}</span>
                        </div>
                        <div className="thread-stats">
                            <span>💬 {thread.respuestas} respuestas</span>
                            <span>👁️ {thread.vistas} vistas</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
