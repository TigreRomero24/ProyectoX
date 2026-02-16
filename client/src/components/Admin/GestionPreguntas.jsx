import { useState } from 'react';
import './Admin.css';

export default function GestionPreguntas() {
    const [preguntas, setPreguntas] = useState([
        { id: 1, materia: 'Matemáticas', texto: '¿2+2?', opciones: ['3', '4', '5'], respuesta: '4' }
    ]);
    const [newPregunta, setNewPregunta] = useState({
        materia: '',
        texto: '',
        opciones: ['', '', '', ''],
        respuesta: ''
    });
    const [editing, setEditing] = useState(null);

    const handleAddEdit = () => {
        if (newPregunta.texto && newPregunta.materia) {
            if (editing) {
                setPreguntas(preguntas.map(p => p.id === editing ? { ...newPregunta, id: editing } : p));
                setEditing(null);
            } else {
                setPreguntas([...preguntas, { ...newPregunta, id: Date.now() }]);
            }
            setNewPregunta({ materia: '', texto: '', opciones: ['', '', '', ''], respuesta: '' });
        }
    };

    const handleDelete = (id) => {
        setPreguntas(preguntas.filter(p => p.id !== id));
    };

    const handleEdit = (pregunta) => {
        setNewPregunta(pregunta);
        setEditing(pregunta.id);
    };

    return (
        <div className="gestion-preguntas">
            <h3>Agregar/Editar Pregunta</h3>
            <div className="form-group">
                <input 
                    type="text" 
                    placeholder="Materia"
                    value={newPregunta.materia}
                    onChange={(e) => setNewPregunta({ ...newPregunta, materia: e.target.value })}
                />
                <input 
                    type="text" 
                    placeholder="Pregunta"
                    value={newPregunta.texto}
                    onChange={(e) => setNewPregunta({ ...newPregunta, texto: e.target.value })}
                />
                <input 
                    type="text" 
                    placeholder="Respuesta correcta"
                    value={newPregunta.respuesta}
                    onChange={(e) => setNewPregunta({ ...newPregunta, respuesta: e.target.value })}
                />
                <button onClick={handleAddEdit} className="btn-primary">
                    {editing ? 'Actualizar' : 'Agregar'} Pregunta
                </button>
            </div>

            <h3>Preguntas Registradas</h3>
            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Materia</th>
                            <th>Pregunta</th>
                            <th>Respuesta</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {preguntas.map(p => (
                            <tr key={p.id}>
                                <td>{p.materia}</td>
                                <td>{p.texto}</td>
                                <td>{p.respuesta}</td>
                                <td>
                                    <button onClick={() => handleEdit(p)} className="btn-edit">Editar</button>
                                    <button onClick={() => handleDelete(p.id)} className="btn-delete">Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
