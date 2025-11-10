import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://cywvxfcvkpczlngowicl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5d3Z4ZmN2a3BjemxuZ293aWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NTQzMTUsImV4cCI6MjA3ODMzMDMxNX0.jf8bvOMJr97ZqUTpGpIBlumqkrCroiFYkRGXhWdKvyE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const mainBox = document.getElementById('mainBox');
    const img1 = document.getElementById('logoNtitle');
    const welcomeText = document.getElementById('welcomeText');
    const employeeRegisterBtn = document.getElementById('employeeRegisterBtn');

    if (performance.navigation.type === performance.navigation.TYPE_RELOAD) {
        window.location.href = 'index.html';
    }

    // LOGIN FORM - Only add listener if loginBtn exists (e.g., on index.html)
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            document.body.style.overflow = "hidden";
            mainBox.classList.add('move-right');

            setTimeout(() => {
                mainBox.innerHTML = `
                    <div class="new-content">
                        <form id="loginForm">
                            <select id="branch" name="branch" required>
                                <option value="" disabled selected hidden>Select a branch...</option>
                                <option value="dlsu">De La Salle University</option>
                                <option value="ateneo">Ateneo de Manila University</option>
                                <option value="batangas">Batangas City</option>
                                <option value="lipa">Lipa City</option>
                                <option value="cubao">Cubao Expo</option>
                            </select>

                            <label for="username">User ID</label><br>
                            <input type="text" id="username" name="username" required><br>
                            
                            <label for="pwd">Password</label><br>
                            <input type="password" id="pwd" name="pwd" required>
                            
                            <button type="submit">Login</button>
                        </form>
                    </div>
                `;

                welcomeText.classList.add('show-text');
                img1.classList.add('show-img');
                document.body.style.overflow = "auto";

                const loginForm = document.getElementById('loginForm');
                loginForm.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const branch = document.getElementById('branch').value.trim();
                    const username = document.getElementById('username').value.trim();
                    const password = document.getElementById('pwd').value.trim();

                    const { data, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('branch', branch)
                        .eq('username', username)
                        .eq('password', password)
                        .maybeSingle();

                    console.log('Query result:', { data, error });

                    if (error || !data) {
                        alert('Invalid credentials or user not found!');
                        return;
                    }

                    alert(`Welcome back, ${data.username}!`);
                    window.location.href = 'admin-dashboard.html';
                });
            }, 700);
        });
    }

    // EMPLOYEE REGISTER FORM BUTTON - Only add listener if employeeRegisterBtn exists (e.g., on employee-dashboard.html)
    if (employeeRegisterBtn) {
        employeeRegisterBtn.addEventListener('click', () => {
            employeeRegisterBtn.style.display = 'none';

            mainBox.innerHTML = `
                <div class="new-content">
                    <h2>Employee Registration Form</h2>
                    <form id="employeeForm">

                        <label>Full Name:</label>
                        <input type="text" name="fullName" placeholder="John Doe" required>

                        <label>Password:</label>
                        <input type="password" name="password" placeholder="Enter password" required>

                        <label>Email:</label>
                        <input type="email" name="email" placeholder="john@example.com" required>

                        <label>Age:</label>
                        <input type="number" name="age" placeholder="25" min="18" max="100" required>

                        <label>Date of Joining:</label>
                        <input type="date" name="joiningDate" required>

                        <label>Department:</label>
                        <select name="department" required>
                            <option value="" disabled selected hidden>Select Department</option>
                            <option value="hr">HR</option>
                            <option value="it">IT</option>
                            <option value="marketing">Marketing</option>
                        </select>

                        <label>Gender:</label>
                        <div class="radio-group">
                            <label><input type="radio" name="gender" value="male" required> Male</label>
                            <label><input type="radio" name="gender" value="female"> Female</label>
                        </div>

                        <button type="submit">Register</button>
                    </form>
                </div>
            `;
        });
    }

    if (mainBox) {
        mainBox.addEventListener('submit', async (e) => {
            if (e.target && e.target.id === 'employeeForm') {
                e.preventDefault();

                const formData = new FormData(e.target);
                const fullName = formData.get('fullName').trim();
                const password = formData.get('password').trim();
                const email = formData.get('email').trim();
                const age = parseInt(formData.get('age'));
                const joiningDate = formData.get('joiningDate').trim();
                const department = formData.get('department').trim();
                const gender = formData.get('gender');

                // Validate Full Name
                if (!fullName || fullName.length < 2) {
                    alert('Full Name must be at least 2 characters long.');
                    return;
                }

                // Validate Email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!email || !emailRegex.test(email)) {
                    alert('Please enter a valid email address.');
                    return;
                }

                // Validate Password
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.\-_])[A-Za-z\d@$!%*?&.\-_]{8,}$/;
                if (!password || !passwordRegex.test(password)) {
                    alert('Password must be at least 8 characters long and include at least one lowercase letter, one uppercase letter, one number, and one special character (e.g., !@#$%^&*., -, _).');
                    return;
                }

                // Validate Age
                if (isNaN(age) || age < 18 || age > 100) {
                    alert('Age must be a number between 18 and 100.');
                    return;
                }

                // Validate Date of Joining
                if (!joiningDate) {
                    alert('Please select a valid joining date.');
                    return;
                }

                // Validate Department
                if (!department) {
                    alert('Please select a department.');
                    return;
                }

                // Validate Gender
                if (!gender) {
                    alert('Please select a gender.');
                    return;
                }

                // Check for duplicate email
                const { data: existing, error: selectError } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('email', email)
                    .maybeSingle();

                if (selectError) {
                    console.error('Error checking existing employee:', selectError);
                    alert('Error checking database.');
                    return;
                }

                if (existing) {
                    alert('An employee with this email already exists!');
                    return;
                }

                // Insert into Supabase
                const { data, error } = await supabase
                    .from('employees')
                    .insert([{ fullName, password, email, age, joiningDate, department, gender }])
                    .select()
                    .single();

                if (error) {
                    alert('Error registering employee: ' + error.message);
                    return;
                }

                alert(`Employee ${data.fullName} registered successfully!`);
                window.location.href = 'employee-dashboard.html';
            }
        });
    }
});