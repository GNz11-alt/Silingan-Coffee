<script setup>
import LandingTopbar from "@/components/LandingTopbar.vue";
import logo from "@/assets/images/logo.png"
import { themeColor } from "@/data/items";
import {
  Home,
  BarChart3,
  Coffee,
  Users,
  ShieldCheck,
  Clock,
  Store,
} from "lucide-vue-next";


const heroHeading = "Welcome to Silingan Coffee";
const servicesHeading = "Complete Coffee Shop Management";
const locationsHeading = "Our Locations";
const buttonAltLogin = "Access Management System";

const items = [
  {
    id: 1,
    name: "Multi Branch Management",
    des: "Manage all 5 branches from DLSU to Cubao Expo with centralized oversight and branch-specific operations.",
    icon: Home,
  },
  {
    id: 2,
    name: "Sales & Analytics",
    des: "Track daily sales, monitor performance, and generate comprehensive reports with Philippine Peso pricing.",
    icon: BarChart3,
  },
  {
    id: 3,
    name: "Inventory Control",
    des: "Monitor coffee beans, supplies, and equipment across all locations with real-time stock updates.",
    icon: Coffee,
  },
  {
    id: 4,
    name: "Staff Management",
    des: "Handle employee schedules, payroll, and performance tracking with role-based access control.",
    icon: Users,
  },
  {
    id: 5,
    name: "Secure Access",
    des: "Role-based authentication for administrators, managers, and cashiers with comprehensive security.",
    icon: ShieldCheck,
  },
  {
    id: 6,
    name: "Real-time Operations",
    des: "Live dashboard updates, instant notifications, and seamless daily operations management.",
    icon: Clock,
  },
];

const locations = [
  { id: 1, name: "DLSU", fullName: "De La Salle University" },
  { id: 2, name: "Ateneo", fullName: "Ateneo de Manila" },
  { id: 3, name: "Batangas", fullName: "Batangas City" },
  { id: 4, name: "Lipa", fullName: "Lipa City" },
  { id: 5, name: "Cubao Expo", fullName: "Cubao, Quezon City" },
];

</script>

<template>
  <div>
    <LandingTopbar />
    <!-- hero page -->
    <div class="silingan_co-hero min-vh-100 d-flex align-items-center" id="home-section">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8 text-center">
            <!-- logo -->
            <img :src="logo" alt="Image" class="img-fluid mx-auto d-block mb-4" style="max-width: 200px;" />

            <!-- main heading title -->
            <h1 class="heading mb-3">
              {{ heroHeading }}
            </h1>

            <!-- main heading subtitle -->
            <p class="mb-4">
              Your comprehensive coffee shop management solution. Streamline operations, track inventory, manage sales, and grow your business across all branches.
            </p>

            <!-- alternative login button 1 -->
            <router-link
              to="/login"
              class="btn btn-primary px-4 py-2"
              style="margin-right: 5px"
              :style="{ backgroundColor: themeColor, borderColor: themeColor }"
            >
              {{ buttonAltLogin }}
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Services Section -->
    <div class="silingan_co-services bg-light py-5">
      <div class="container py-5">
        <div class="row mb-5 justify-content-center text-center">
          <div class="col-lg-7">
            <h2 class="section-title">{{ servicesHeading }}</h2>
          </div>
        </div>

        <div class="row">
          <div v-for="item in items" :key="item.id" class="col-md-6 col-lg-4 mb-4">
            <div class="service-card">
              <div class="icon-box mb-4">
                <component :is="item.icon" size="24" stroke-width="2" />
              </div>

              <div class="service-content">
                <h3 class="h5 fw-bold mb-3">{{ item.name }}</h3>
                <p class="text-muted small mb-0">{{ item.des }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Locations Section -->
    <div class="silingan_co-locations py-5 bg-white">
      <div class="container">
        <div class="row mb-5 justify-content-center text-center">
          <div class="col-lg-7">
            <h2 class="section-title">{{ locationsHeading }}</h2>
          </div>
        </div>

       
        <div class="row row-cols-1 row-cols-md-3 row-cols-lg-5 g-4 justify-content-center">
          <div v-for="loc in locations" :key="loc.id" class="col">
            <div class="location-card text-center">
              <div class="icon-circle mx-auto mb-3">
                <Store size="20" stroke-width="2" />
              </div>
              <div class="location-content">
                <h3 class="h6 fw-bold mb-3">{{ loc.name }}</h3>
                <p class="text-muted small mb-0">{{ loc.fullName }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.silingan_co-hero {
  background-color: #fff;
}

.heading {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -1px;
}

.section-title {
  font-size: 2.2rem;
  font-weight: 600;
  color: #222;
}


.service-card {
  background: #ffffff;
  padding: 2.5rem;
  border-radius: 15px; 
  height: 100%;
  border: 1px solid rgba(0,0,0,0.05);
  transition: all 0.3s ease-in-out;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
}

.service-card:hover {
  transform: translateY(-10px); 
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.08);
}

.icon-box {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0; 
  border-radius: 12px;
  color: #4b3832; 
}

.service-content h3 {
  color: #333;
  line-height: 1.4;
}

.service-content p {
  line-height: 1.7;
}

.location-card {
  background: #ffffff;
  padding: 2rem 1rem;
  border-radius: 12px;
  border: 1px solid #eaeaea;
  height: 100%;
  transition: all 0.3s ease;
}

.location-card:hover {
  border-color: #6f4e37; 
  transform: translateY(-5px);
}

.icon-circle {
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f1f1f1; 
  border-radius: 50%; 
  color: #555;
}

.location-content h3 {
  color: #333;
  font-size: 1.1rem;
}

.location-content p {
  font-size: 0.85rem;
  color: #777;
}

@media (max-width: 768px) {
  .heading { font-size: 2.5rem; }
}
</style>