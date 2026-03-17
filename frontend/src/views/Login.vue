>


<template>
    <div class = "login-container">
        <div class="card-bdy"> 
            <div class = "login-form">
                <form @submit.prevent="handleLogin">
                    <h1 class="welcome-title"> Welcome </h1>

                    <div class = "form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" v-model="username" required />
                    </div>

                    <div class = "form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" v-model="password" required />
                    </div>
                    
                    <button type="submit">Login</button>
                </form>
            </div>
        </div>
    </div>

</template>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #f5f5f5;
}

.card-bdy {
    background-color: #fff;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.4);
}

.welcome-title {
    text-align: center;
    margin-bottom: 1.5rem;
}

</style>