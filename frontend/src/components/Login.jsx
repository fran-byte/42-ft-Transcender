import { useState } from 'react';
import './Auth.css';

function Login({ onLogin, onSwitchToRegister }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();

            if (data.success) {
                onLogin(data.user);
            } else {
                setError(data.message || 'Credenciales incorrectas');
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
                    <h1 className="brand-title">ROYAL BLACKJACK</h1>
                    <div className="brand-subtitle">MEMBERS ONLY</div>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="error-banner">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <div className="form-group">
                        <div className="input-group">
                            <span className="input-icon">👤</span>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Usuario / Email"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="input-group">
                            <span className="input-icon">🔒</span>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Validando...' : 'ENTRAR A LA MESA'}
                    </button>
                </form>

                <div className="auth-footer">
                    ¿Nuevo jugador?
                    <button onClick={onSwitchToRegister} className="link-highlight">
                        Crear Cuenta VIP
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login;