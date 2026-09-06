import api from './api';

export const register = async (userData) => {
    console.warn("register() is deprecated, use sendLoginOtp/verifyLoginOtp");
    return { success: false, message: "Use login for auto-registration" };
};

export const sendLoginOtp = async (identifier) => {
    let payload;

    if (typeof identifier === 'string') {
        payload = { email: identifier };
    } else if (identifier && typeof identifier === 'object') {
        const { email, phone } = identifier;
        payload = {
            ...(email ? { email } : {}),
            ...(phone ? { phone } : {}),
        };
    } else {
        payload = {};
    }

    const { data } = await api.post('/api/users/send-login-otp', payload);
    return data;
};

export const verifyLoginOtp = async (identifier, otp) => {
    let payload;

    if (typeof identifier === 'string') {
        payload = { email: identifier, otp };
    } else if (identifier && typeof identifier === 'object') {
        const { email, phone } = identifier;
        payload = {
            ...(email ? { email } : {}),
            ...(phone ? { phone } : {}),
            otp,
        };
    } else {
        payload = { otp };
    }

    const { data } = await api.post('/api/users/verify-login-otp', payload);

    if (data.token) {
        localStorage.setItem('token', data.token);
    }
    if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
    }

    return data;
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
};


export const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const { data } = await api.post('/api/users/refresh-token', { refreshToken });

    if (data.token) {
        localStorage.setItem('token', data.token);
    }

    return data;
};

export const forgotPassword = async (email) => {
    const { data } = await api.post('/api/users/forgot-password', { email });
    return data;
};

export const verifyForgotPasswordOtp = async (email, otp) => {
    const { data } = await api.post('/api/users/verify-forgot-password-otp', { email, otp });
    return data;
};

export const resetPassword = async (email, newPassword, confirmPassword) => {
    const { data } = await api.post('/api/users/reset-password', {
        email,
        newPassword,
        confirmPassword,
    });
    return data;
};

export const verifyEmail = async (email, otp) => {
    const { data } = await api.post('/api/users/verify-email', { email, otp });
    return data;
};

export const getProfile = async () => {
    const { data } = await api.get('/api/users/user-details');
    return data;
};

export const updateProfile = async (profileData) => {
    const { data } = await api.put('/api/users/update-user', profileData);
    return data;
};

export const requestEmailUpdate = async (newEmail) => {
    const { data } = await api.post('/api/users/request-email-update', { newEmail });
    return data;
};

export const verifyEmailUpdate = async (otp) => {
    const { data } = await api.post('/api/users/verify-email-update', { otp });
    return data;
};
