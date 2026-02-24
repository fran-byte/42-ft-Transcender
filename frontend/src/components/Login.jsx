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
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Envía/recibe la cookie httpOnly automáticamente
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success) {
                // La cookie httpOnly se guarda automáticamente
                // Solo pasamos los datos del usuario al padre para el estado de React
                onLogin(data.user);
            } else {
                setError(data.message || 'Error al iniciar sesión');
            }
        } catch (err) {
            console.error('Error en login:', err);
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>🎰 Login</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username:</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoFocus
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Password:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Cargando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="auth-switch">
                    ¿No tienes cuenta?{' '}
                    <button onClick={onSwitchToRegister} className="link-button">
                        Regístrate aquí
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login;
