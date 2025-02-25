import React, { useState } from 'react';
import styles from './login.module.scss';
import { getServerURL } from '../client/api';
import { useTokenStore } from '../store/token';
import { useNavigate } from 'react-router-dom';
import { Path } from '../constant';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const recordToken = useTokenStore((state) => state.recordToken);
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            const response = await fetch(getServerURL() + '/user/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                throw new Error('登录失败，请检查您的用户名和密码');
            }

            const data = await response.json();
            console.log('登录成功:', data.data.tokenValue);
            recordToken(data.data.tokenValue);
            navigate(Path.Home);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className={styles.login}>
            <div className={styles['login-header']}>
                <h1 className={styles['login-header-title']}>欢迎登录</h1>
            </div>
            <div className={styles['login-body']}>
                <input
                    type="text"
                    placeholder="请输入用户名"
                    className={styles['login-input']}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="请输入密码"
                    className={styles['login-input']}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                {error && <p className={styles['login-error']}>{error}</p>}
                <button className={styles['login-button']} onClick={handleLogin}>
                    登录
                </button>
            </div>
        </div>
    );
};

export default Login; 
