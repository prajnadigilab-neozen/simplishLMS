async function testLogin() {
    try {
        const response = await fetch('http://localhost:5000/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: '9112233445',
                password: 'password123'
            })
        });
        const data = await response.json();
        if (response.ok) {
            console.log('Login Success:', data);
        } else {
            console.error('Login Failed with status:', response.status);
            console.error('Data:', data);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testLogin();
