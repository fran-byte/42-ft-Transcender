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

        // Validación de passwords
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Envía/recibe la cookie httpOnly automáticamente
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();

            if (data.success) {
                // La cookie httpOnly se guarda automáticamente
                // Solo pasamos los datos del usuario al padre para el estado de React
                onRegister(data.user);
            } else {
                setError(data.message || 'Error al registrarse');
            }
        } catch (err) {
            console.error('Error en registro:', err);
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>🎰 Registro</h2>
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
                        <label>Email:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
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

                    <div className="form-group">
                        <label>Confirmar Password:</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Cargando...' : 'Registrarse'}
                    </button>
                </form>

                <div className="auth-switch">
                    ¿Ya tienes cuenta?{' '}
                    <button onClick={onSwitchToLogin} className="link-button">
                        Inicia sesión aquí
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Register;
