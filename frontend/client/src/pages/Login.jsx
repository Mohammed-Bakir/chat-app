import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export default function Login() {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const testConnection = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/test`);
            console.log('Server test response:', response.data);
            alert(`Server Status: ${JSON.stringify(response.data, null, 2)}`);
        } catch (error) {
            console.error('Server test failed:', error);
            alert('Server test failed - check console');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/api/login`, {
                username: formData.username.trim(),
                password: formData.password
            }, {
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.data?.token) {
                throw new Error('No token received');
            }

            localStorage.setItem('token', response.data.token);
            navigate('/chat');

        } catch (err) {
            const errorMessage = err.response?.data?.message ||
                err.message ||
                'Login failed. Check console';
            console.error('Login error:', {
                status: err.response?.status,
                data: err.response?.data,
                error: err.message
            });
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <h2>Welcome Back</h2>
                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Log In'}
                    </button>
                </form>

                <div className="auth-footer">
                    Don't have an account? <Link to="/signup">Sign up</Link>
                </div>

                <button
                    type="button"
                    onClick={testConnection}
                    style={{ marginTop: '10px', backgroundColor: '#007bff', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '4px' }}
                >
                    Test Server Connection
                </button>
            </div>
        </div>
    );
}