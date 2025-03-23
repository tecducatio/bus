let selectedSeat = null;
let currentToken = null;

// Auth Functions
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = {
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        full_name: document.getElementById('regName').value
    };
    
    const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(user)
    });
    
    const data = await response.json();
    alert(data.message);
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const credentials = {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
    };
    
    const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(credentials)
    });
    
    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        window.location.href = 'dashboard.html';
    } else {
        alert('Login failed');
    }
});

// Seat Reservation Logic
function generateSeatMap(seatsData) {
    const container = document.getElementById('seatContainer');
    container.innerHTML = '';
    
    const rows = ['A', 'B', 'C', 'D'];
    rows.forEach(row => {
        for (let i = 1; i <= 10; i++) {
            const seat = document.createElement('div');
            seat.className = `seat ${seatsData[row].includes(i) ? 'occupied' : 'available'}`;
            seat.textContent = `${row}${i}`;
            seat.onclick = () => selectSeat(seat, row, i);
            container.appendChild(seat);
        }
    });
}

function selectSeat(element, row, number) {
    if (element.classList.contains('available')) {
        document.querySelectorAll('.seat').forEach(s => s.classList.remove('selected'));
        element.classList.add('selected');
        selectedSeat = `${row}${number}`;
    }
}

async function loadSeats() {
    const date = document.getElementById('dateInput').value;
    const route = document.getElementById('routeSelect').value;
    const time = document.getElementById('timeSelect').value;
    
    const response = await fetch(`http://localhost:5001/schedules?date=${date}&route=${route}&time=${time}`, {
        headers: {'Authorization': `Bearer ${localStorage.getItem('token')}`}
    });
    
    const data = await response.json();
    if (data.schedules.length > 0) {
        const seatsResponse = await fetch(`http://localhost:5001/seats/${data.schedules[0].id}`, {
            headers: {'Authorization': `Bearer ${localStorage.getItem('token')}`}
        });
        const seatsData = await seatsResponse.json();
        generateSeatMap(seatsData.seats);
    }
}

async function reserveSeat() {
    if (!selectedSeat) {
        alert('Selecciona un asiento primero');
        return;
    }
    
    const response = await fetch('http://localhost:5001/reserve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            schedule_id: currentScheduleId,
            seat: selectedSeat
        })
    });
    
    if (response.ok) {
        alert('Reserva exitosa!');
        loadSeats();
    } else {
        alert('Error en la reserva');
    }
}

// Check auth status
window.onload = () => {
    const token = localStorage.getItem('token');
    if (!token && window.location.pathname.endsWith('dashboard.html')) {
        window.location.href = '/';
    }
};
