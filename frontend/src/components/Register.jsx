import { useState } from 'react';
import './Auth.css';

function Register({ onRegister, onSwitchToLogin }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, email, password }),
            });
            const data = await response.json();

            if (data.success) {
                onRegister(data.user);
            } else {
                setError(data.message || 'Error en el registro');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1 className="brand-title">REGISTRO VIP</h1>
                    <div className="brand-subtitle">ÚNETE A LA ÉLITE</div>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && <div className="error-banner"><span>⚠️</span> {error}</div>}

                    <div className="form-group">
                        <div className="input-group">
                            <span className="input-icon">👤</span>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Elige tu Alias"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="input-group">
                            <span className="input-icon">✉️</span>
                            <input
                                className="form-input"
                                type="email"
                                placeholder="Correo Electrónico"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="input-group">
                            <span className="input-icon">🔑</span>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Contraseña Maestra"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="input-group">
                            <span className="input-icon">🛡️</span>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Confirmar Contraseña"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Creando perfil...' : 'FINALIZAR REGISTRO'}
                    </button>
                </form>

                <div className="auth-footer">
                    ¿Ya tienes cuenta?
                    <button onClick={onSwitchToLogin} className="link-highlight">
                        Inicia Sesión
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Register;