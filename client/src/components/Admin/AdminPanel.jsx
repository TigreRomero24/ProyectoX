import { useState } from 'react';
import GestionPreguntas from './GestionPreguntas';
import GestionUsuarios from './GestionUsuarios';
import './Admin.css';

export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState('preguntas');

    return (
        <div className="admin-panel">
            <h2>⚙️ Panel Administrativo</h2>
            
            <div className="admin-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'preguntas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('preguntas')}
                >
                    📝 Gestión de Preguntas
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`}
                    onClick={() => setActiveTab('usuarios')}
                >
                    👥 Gestión de Usuarios
                </button>
            </div>

            <div className="admin-content">
                {activeTab === 'preguntas' && <GestionPreguntas />}
                {activeTab === 'usuarios' && <GestionUsuarios />}
            </div>
        </div>
    );
}
