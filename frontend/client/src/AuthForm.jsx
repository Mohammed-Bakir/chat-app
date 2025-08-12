import { useState } from 'react';
import { API_BASE_URL } from './config/api';
import { useNavigate } from 'react-router-dom';

function AuthForm({ type }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await fetch(`${API_BASE_URL}/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include',
        });
        if (res.ok) navigate('/chat'); // Redirect to chat
    };

    return (
        <form onSubmit={handleSubmit}>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit">{type === 'login' ? 'Login' : 'Signup'}</button>
        </form>
    );
}