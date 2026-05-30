<template>
  <div class="dashboard-content">
    <div class="welcome-header">
      <div class="header-with-icon">
        <div class="icon-circle">
          <component :is="Coffee" :size="32" stroke-width="1.5" />
        </div>
        <div>
          <h1>About Silingan Coffee</h1>
          <p class="welcome-message">
            Coffee with a Purpose • Supporting Families, Building Communities
          </p>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-info">
          <h3>Impact Scale</h3>
          <p class="stat-value">100 Families</p>
          <span class="stat-trend positive"
            >Sustainable livelihoods provided</span
          >
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <h3>Network</h3>
          <p class="stat-value">5 Branches</p>
          <span class="stat-trend">Across Metro Manila & Batangas</span>
        </div>
      </div>
      <div class="stat-card growth-card">
        <div class="stat-info">
          <h3>Our Founder</h3>
          <p class="stat-value">Jun Santiago III</p>
          <span class="stat-trend">Missionary & Photojournalist</span>
        </div>
      </div>
    </div>

    <div class="main-layout">
      <div class="left-column">
        <div class="content-box">
          <div class="section-header">
            <component :is="MapPin" :size="20" />
            <h2>Branch Locations (2025)</h2>
          </div>
          <ul class="mini-location-list">
            <li>
              <strong>DLSU Branch</strong>
              <p>De La Salle University, Taft Ave</p>
            </li>
            <li>
              <strong>Ateneo Branch</strong>
              <p>Ateneo de Manila, Katipunan Ave</p>
            </li>
            <li>
              <strong>Batangas Branch</strong>
              <p>Batangas City, Batangas Province</p>
            </li>
            <li>
              <strong>Lipa Branch</strong>
              <p>Lipa City, Batangas Province</p>
            </li>
            <li>
              <strong>Cubao Expo</strong>
              <p>Quezon City (Original Branch)</p>
            </li>
          </ul>
        </div>
      </div>

      <div class="center-column">
        <div class="content-box">
          <div class="section-header">
            <component :is="BookOpen" :size="20" />
            <h2>Our Story & Mission</h2>
          </div>
          <p class="narrative-text">
            Silingan Coffee was founded in <strong>October 2021</strong> to
            support families of victims of extrajudicial killings (EJKs).
            Through meaningful employment, we transform tragedy into hope for
            communities affected by the war on drugs.
          </p>

          <div class="timeline">
            <div class="timeline-item">
              <span class="year">Oct 2021</span>
              <p>Founded as a missionary outreach in Cubao Expo.</p>
            </div>
            <div class="timeline-item">
              <span class="year">2023</span>
              <p>
                Introduced the Mobile Coffee Van for school and community
                events.
              </p>
            </div>
            <div class="timeline-item">
              <span class="year">2025</span>
              <p>Expanded to five strategic locations to maximize impact.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="right-column">
        <div class="content-box">
          <div class="section-header">
            <component :is="Heart" :size="20" />
            <h2>Core Values</h2>
          </div>
          <div class="value-tags">
            <span class="tag">Compassion</span>
            <span class="tag">Justice</span>
            <span class="tag">Community</span>
            <span class="tag">Sustainability</span>
          </div>
        </div>

        <div class="content-box system-card">
          <div class="section-header">
            <component :is="Terminal" :size="20" />
            <h2>Management System Information</h2>
          </div>
          <div class="system-details">
            <div class="detail-row">
              <span>Version</span>
              <strong>1.0.0</strong>
            </div>
            <div class="detail-row">
              <span>Last Updated</span>
              <strong>May 2026</strong>
            </div>
            <div class="detail-row">
              <span>Purpose</span>
              <strong>Branch Management</strong>
            </div>
          </div>
          <div class="system-features">
            <p>
              Features: Inventory, Sales, Scheduling, Reports, Employee
              Management, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  Coffee,
  Heart,
  BookOpen,
  MapPin,
  Terminal,
  Calendar,
} from "lucide-vue-next";
</script>

<style scoped>
.dashboard-content {
  padding: 24px 32px;
  background: #fafafa;
  min-height: 100vh;
  font-family: "Inter", sans-serif;
}

/* Header */
.header-with-icon {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
}
.icon-circle {
  background: #31201d;
  color: white;
  padding: 15px;
  border-radius: 50%;
  display: flex;
}
.welcome-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #31201d;
  margin: 0;
}
.welcome-message {
  font-size: 14px;
  color: #8b4513;
  margin-top: 4px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}
.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e9ecef;
}
.stat-info h3 {
  font-size: 12px;
  color: #6c757d;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #31201d;
}
.stat-trend {
  font-size: 12px;
  color: #8b4513;
  margin-top: 5px;
  display: block;
}
.growth-card {
  background: #31201d;
  color: white;
  border: none;
}
.growth-card .stat-info h3,
.growth-card .stat-value,
.growth-card .stat-trend {
  color: white;
}

/* Main Layout Grid */
.main-layout {
  display: grid;
  grid-template-columns: 0.8fr 1.4fr 1fr;
  gap: 24px;
  align-items: start;
}
.content-box {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e9ecef;
  margin-bottom: 24px;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  color: #31201d;
  border-bottom: 1px solid #f1f3f5;
  padding-bottom: 12px;
}
.section-header h2 {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}

/* Narrative & Timeline */
.narrative-text {
  font-size: 15px;
  line-height: 1.6;
  color: #495057;
  margin-bottom: 20px;
}
.timeline {
  border-left: 2px solid #f1f3f5;
  padding-left: 20px;
  margin-left: 10px;
}
.timeline-item {
  margin-bottom: 15px;
  position: relative;
}
.timeline-item::before {
  content: "";
  position: absolute;
  left: -26px;
  top: 6px;
  width: 10px;
  height: 10px;
  background: #c49a6c;
  border-radius: 50%;
}
.year {
  font-weight: 700;
  color: #31201d;
  font-size: 13px;
}

/* Locations & Lists */
.mini-location-list {
  list-style: none;
  padding: 0;
}
.mini-location-list li {
  padding: 10px 0;
  border-bottom: 1px solid #f8f9fa;
}
.mini-location-list li:last-child {
  border-bottom: none;
}
.mini-location-list strong {
  font-size: 14px;
  color: #31201d;
}
.mini-location-list p {
  font-size: 12px;
  color: #6c757d;
  margin: 2px 0 0;
}

/* Values Tags */
.value-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag {
  background: #fdf8f3;
  border: 1px solid #c49a6c;
  color: #8b4513;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

/* System Info */
.system-card {
  background: #f8f9fa;
}
.system-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}
.system-features {
  margin-top: 20px;
  font-size: 12px;
  color: #6c757d;
  border-top: 1px solid #e9ecef;
  padding-top: 12px;
}

@media (max-width: 1024px) {
  .main-layout {
    grid-template-columns: 1fr;
  }
}
</style>
