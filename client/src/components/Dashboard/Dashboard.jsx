import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MateriasList from '../Materias/MateriasList';
import AdminPanel from '../Admin/AdminPanel';
import Forum from '../Forum/Forum';
import About from '../About/About';
import './Dashboard.css';

export default function Dashboard({ user }) {
    const [activeSection, setActiveSection] = useState('materias');

    const renderSection = () => {
        switch (activeSection) {
            case 'materias':
                return <MateriasList />;
            case 'admin':
                return user?.rol === 'ADMIN' ? <AdminPanel /> : null;
            case 'forum':
                return <Forum />;
            case 'about':
                return <About />;
            default:
                return <MateriasList />;
        }
    };

    return (
        <div className="dashboard">
            <Navbar user={user} />
            <div className="dashboard-container">
                <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} userRole={user?.rol} />
                <main className="dashboard-content">
                    {renderSection()}
                </main>
            </div>
        </div>
    );
}