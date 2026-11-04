// Telecom Predictive & ML Forecasting Engine Frontend Application Logic

let mlData = null;
let chartGrowthInstance = null;
let chartRfmInstance = null;
let chartFeatInstance = null;
let chartDemandInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  fetchPredictionsData();
  setupEventListeners();
});

function initTabs() {
  const navButtons = document.querySelectorAll(".nav-item button");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const headerTitle = document.getElementById("header-title");

  const titlesMap = {
    "tab-overview": "Predictive Intelligence Overview & ML Health",
    "tab-growth": "Subscriber Growth & Dynamic Scenario Forecasting",
    "tab-churn": "Customer Churn Risk & Retention Command Center",
    "tab-recharge": "Expected Recharge Predictor & What-If Simulator",
    "tab-demand": "Network Data Usage Demand Forecaster",
    "tab-nbo": "Customer Intelligence & Next-Best-Offer (NBO)",
    "tab-campaigns": "RFM Marketing Campaigns & Ad Creative Assets"
  };

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  const navButtons = document.querySelectorAll(".nav-item button");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const headerTitle = document.getElementById("header-title");

  const titlesMap = {
    "tab-overview": "Predictive Intelligence Overview & ML Health",
    "tab-growth": "Subscriber Growth & Dynamic Scenario Forecasting",
    "tab-churn": "Customer Churn Risk & Retention Command Center",
    "tab-recharge": "Expected Recharge Predictor & What-If Simulator",
    "tab-demand": "Network Data Usage Demand Forecaster",
    "tab-nbo": "Customer Intelligence & Next-Best-Offer (NBO)",
    "tab-campaigns": "RFM Marketing Campaigns & Ad Creative Assets"
  };

  navButtons.forEach(b => {
    if (b.getAttribute("data-tab") === tabId) {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });

  tabPanes.forEach(pane => {
    if (pane.id === tabId) {
      pane.classList.add("active");
    } else {
      pane.classList.remove("active");
    }
  });

  if (titlesMap[tabId]) {
    headerTitle.textContent = titlesMap[tabId];
  }
}

async function fetchPredictionsData() {
  try {
    const response = await fetch("predictions_data.json");
    mlData = await response.json();
    console.log("Loaded ML Predictions Data:", mlData);

    renderMLHealthAndKPIs();
    renderOverviewCharts();
    renderGrowthForecastChart(0, 0);
    populateFilterDropdowns();
    renderChurnTable();
    renderNetworkDemandTab();
    renderSimulator();
    renderAdGallery("All");
    populateQuickSelect();

    // Default load first customer for NBO tab
    if (mlData.customers && mlData.customers.length > 0) {
      // Find a customer with high risk or sample
      const highRisk = mlData.customers.find(c => c.risk_level === "High") || mlData.customers[0];
      inspectCustomerNBO(highRisk.customer_id);
    }
  } catch (err) {
    console.error("Failed to load predictions data:", err);
  }
}

function renderMLHealthAndKPIs() {
  const s = mlData.summary;
  document.getElementById("ml-churn-auc").textContent = (s.churn_roc_auc * 100).toFixed(1) + "%";
  document.getElementById("ml-churn-acc").textContent = s.churn_accuracy.toFixed(1) + "%";
  document.getElementById("ml-rech-r2").textContent = s.recharge_r2.toFixed(3);
  document.getElementById("ml-rech-rmse").textContent = "₹" + s.recharge_rmse.toFixed(2);

  document.getElementById("kpi-active-subs").textContent = s.active_customers.toLocaleString();
  document.getElementById("kpi-churn-rate").textContent = s.avg_churn_probability.toFixed(1) + "%";
  document.getElementById("kpi-high-risk-count").textContent = `${s.high_risk_churn_count} High Risk Accounts`;
  document.getElementById("kpi-revenue").textContent = "₹" + Math.round(s.total_revenue).toLocaleString();
  document.getElementById("kpi-data-tb").textContent = s.total_data_tb.toFixed(2) + " TB";
}

function renderOverviewCharts() {
  // RFM Segments Chart (9 segments)
  const rfmCounts = mlData.summary.rfm_segment_counts;
  const ctxRfm = document.getElementById("chart-rfm").getContext("2d");
  
  const palette = [
    "#00F2FE", "#4FACFE", "#00F2A9", "#7F00FF", "#E100FF", 
    "#FFB300", "#FF4B4B", "#38EF7D", "#FF758C"
  ];

  if (chartRfmInstance) chartRfmInstance.destroy();
  chartRfmInstance = new Chart(ctxRfm, {
    type: "doughnut",
    data: {
      labels: Object.keys(rfmCounts),
      datasets: [{
        data: Object.values(rfmCounts),
        backgroundColor: palette.slice(0, Object.keys(rfmCounts).length),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "right",
          labels: { color: "#94A3B8", font: { family: "Inter", size: 11 }, boxWidth: 12 }
        }
      }
    }
  });

  // Feature Importance Chart
  const featImp = mlData.feature_importances;
  const ctxFeat = document.getElementById("chart-features").getContext("2d");

  if (chartFeatInstance) chartFeatInstance.destroy();
  chartFeatInstance = new Chart(ctxFeat, {
    type: "bar",
    data: {
      labels: Object.keys(featImp).map(k => k.replace(/_/g, " ")),
      datasets: [{
        label: "Relative Importance",
        data: Object.values(featImp),
        backgroundColor: "rgba(0, 242, 254, 0.8)",
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#94A3B8" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { ticks: { color: "#94A3B8", font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

function renderGrowthForecastChart(boostPct = 0, churnReductPct = 0) {
  const forecast = mlData.subscriber_forecast;
  const horizonSlider = document.getElementById("sim-horizon-slider");
  const horizonDays = horizonSlider ? parseInt(horizonSlider.value) : 90;

  const slicedDates = forecast.dates.slice(0, horizonDays);
  const baseActive = forecast.projected_active.slice(0, horizonDays);

  // Apply combined campaign acquisition boost + churn reduction impact
  const netModifier = (boostPct + (churnReductPct * 0.7)) / 100;

  const boostedActive = baseActive.map((val, idx) => {
    const progression = (idx + 1) / horizonDays;
    return Math.round(val + (val * netModifier * progression * 0.08));
  });

  const upper = forecast.upper_bound.slice(0, horizonDays).map((val, idx) => {
    const progression = (idx + 1) / horizonDays;
    return Math.round(val + (val * netModifier * progression * 0.08));
  });

  const lower = forecast.lower_bound.slice(0, horizonDays);

  const ctxGrowth = document.getElementById("chart-growth").getContext("2d");
  if (chartGrowthInstance) chartGrowthInstance.destroy();

  chartGrowthInstance = new Chart(ctxGrowth, {
    type: "line",
    data: {
      labels: slicedDates,
      datasets: [
        {
          label: "Projected Active Subscribers",
          data: boostedActive,
          borderColor: "#00F2FE",
          borderWidth: 3,
          tension: 0.3,
          fill: false,
          pointRadius: 0
        },
        {
          label: "Upper 95% Confidence Limit",
          data: upper,
          borderColor: "rgba(79, 172, 254, 0.4)",
          borderWidth: 1.5,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0
        },
        {
          label: "Lower 95% Confidence Limit",
          data: lower,
          borderColor: "rgba(255, 75, 75, 0.4)",
          borderWidth: 1.5,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#94A3B8" } }
      },
      scales: {
        x: { ticks: { color: "#94A3B8", maxTicksLimit: 12 }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { ticks: { color: "#94A3B8" }, grid: { color: "rgba(255,255,255,0.05)" } }
      }
    }
  });

  // Update Milestones
  const baseNow = forecast.historical_last_active;
  const d30 = boostedActive[Math.min(29, boostedActive.length - 1)];
  const d60 = boostedActive[Math.min(59, boostedActive.length - 1)];
  const d90 = boostedActive[Math.min(89, boostedActive.length - 1)];

  document.getElementById("ms-30d").textContent = d30.toLocaleString();
  document.getElementById("ms-30d-net").textContent = `${d30 - baseNow >= 0 ? '+' : ''}${d30 - baseNow} net additions`;

  document.getElementById("ms-60d").textContent = d60.toLocaleString();
  document.getElementById("ms-60d-net").textContent = `${d60 - baseNow >= 0 ? '+' : ''}${d60 - baseNow} net additions`;

  document.getElementById("ms-90d").textContent = d90.toLocaleString();
  document.getElementById("ms-90d-net").textContent = `${d90 - baseNow >= 0 ? '+' : ''}${d90 - baseNow} net additions`;
}

function populateFilterDropdowns() {
  const circles = [...new Set(mlData.customers.map(c => c.circle))].sort();
  const circleSelect = document.getElementById("filter-circle");
  circles.forEach(cir => {
    const opt = document.createElement("option");
    opt.value = cir;
    opt.textContent = cir;
    circleSelect.appendChild(opt);
  });

  const rfmSegments = [...new Set(mlData.customers.map(c => c.rfm_segment))].sort();
  const rfmSelect = document.getElementById("filter-rfm");
  rfmSegments.forEach(seg => {
    const opt = document.createElement("option");
    opt.value = seg;
    opt.textContent = seg;
    rfmSelect.appendChild(opt);
  });
}

function renderChurnTable() {
  const tbody = document.getElementById("churn-table-body");
  const searchQuery = document.getElementById("search-customer").value.toLowerCase();
  const filterRisk = document.getElementById("filter-risk").value;
  const filterCircle = document.getElementById("filter-circle").value;
  const filterRfm = document.getElementById("filter-rfm").value;

  tbody.innerHTML = "";

  const filtered = mlData.customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery) ||
                          c.customer_id.toLowerCase().includes(searchQuery) ||
                          c.circle.toLowerCase().includes(searchQuery);
    const matchesRisk = (filterRisk === "All") || (c.risk_level === filterRisk);
    const matchesCircle = (filterCircle === "All") || (c.circle === filterCircle);
    const matchesRfm = (filterRfm === "All") || (c.rfm_segment === filterRfm);

    return matchesSearch && matchesRisk && matchesCircle && matchesRfm;
  });

  document.getElementById("churn-count-label").textContent = 
    `Showing ${Math.min(filtered.length, 60)} of ${filtered.length} matching accounts`;

  // Display top 60 records for snappy table response
  filtered.slice(0, 60).forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${c.customer_id}</strong></td>
      <td>${c.name}</td>
      <td>${c.circle}</td>
      <td>${c.recency_days}d ago</td>
      <td>${c.current_plan}</td>
      <td><strong style="color: var(--accent-green);">₹${c.predicted_next_recharge}</strong></td>
      <td><strong>${c.churn_probability}%</strong></td>
      <td><span class="risk-badge risk-${c.risk_level}">${c.risk_level}</span></td>
      <td><span class="segment-badge">${c.rfm_segment}</span></td>
      <td>
        <button class="action-btn" onclick="openInterventionModal('${c.customer_id}', '${c.name.replace(/'/g, "\\'")}', ${c.churn_probability}, '${c.rfm_segment}')">
          Intervene
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function exportCohortToCSV() {
  const searchQuery = document.getElementById("search-customer").value.toLowerCase();
  const filterRisk = document.getElementById("filter-risk").value;
  const filterCircle = document.getElementById("filter-circle").value;
  const filterRfm = document.getElementById("filter-rfm").value;

  const filtered = mlData.customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery) ||
                          c.customer_id.toLowerCase().includes(searchQuery) ||
                          c.circle.toLowerCase().includes(searchQuery);
    const matchesRisk = (filterRisk === "All") || (c.risk_level === filterRisk);
    const matchesCircle = (filterCircle === "All") || (c.circle === filterCircle);
    const matchesRfm = (filterRfm === "All") || (c.rfm_segment === filterRfm);
    return matchesSearch && matchesRisk && matchesCircle && matchesRfm;
  });

  if (filtered.length === 0) {
    alert("No records match the current filter selection.");
    return;
  }

  const headers = ["Customer_ID", "Name", "Phone", "Circle", "Current_Plan", "Recency_Days", "Total_Spend", "Churn_Probability_Pct", "Risk_Level", "RFM_Segment", "Predicted_Next_Recharge", "Recommended_Plan"];
  const rows = filtered.map(c => [
    c.customer_id,
    `"${c.name}"`,
    c.phone_number,
    c.circle,
    `"${c.current_plan}"`,
    c.recency_days,
    c.total_recharge_amt,
    c.churn_probability,
    c.risk_level,
    `"${c.rfm_segment}"`,
    c.predicted_next_recharge,
    `"${c.nbo_plan_name}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `telecom_retention_cohort_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function renderNetworkDemandTab() {
  const circles = mlData.circle_demand;
  const labels = circles.map(c => c.circle);
  const dataTB = circles.map(c => c.projected_monthly_tb);

  const ctxDemand = document.getElementById("chart-data-circle").getContext("2d");
  if (chartDemandInstance) chartDemandInstance.destroy();

  chartDemandInstance = new Chart(ctxDemand, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Projected Monthly Throughput (TB)",
        data: dataTB,
        backgroundColor: dataTB.map(val => val > 120 ? "rgba(255, 75, 75, 0.85)" : "rgba(0, 242, 254, 0.85)"),
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#94A3B8" }, grid: { display: false } },
        y: { ticks: { color: "#94A3B8" }, grid: { color: "rgba(255,255,255,0.05)" } }
      }
    }
  });

  const listContainer = document.getElementById("circle-capacity-list");
  listContainer.innerHTML = "";

  circles.forEach(c => {
    const div = document.createElement("div");
    div.style.background = "rgba(0,0,0,0.25)";
    div.style.border = "1px solid rgba(255,255,255,0.06)";
    div.style.padding = "12px 16px";
    div.style.borderRadius = "12px";
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";

    const isHigh = c.projected_monthly_tb > 120;
    div.innerHTML = `
      <div>
        <strong style="color: #FFF; font-size: 14px;">${c.circle}</strong>
        <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">
          ${c.current_daily_gb} GB/day baseline &bull; Avg session: ${Math.round(c.avg_session_mins)} mins
        </div>
      </div>
      <div style="text-align: right;">
        <span style="font-family: var(--font-heading); font-weight: 700; font-size: 16px; color: ${isHigh ? 'var(--accent-red)' : 'var(--accent-green)'};">
          ${c.projected_monthly_tb} TB/mo
        </span>
        <div style="font-size: 11px; font-weight: 600; color: ${isHigh ? 'var(--accent-red)' : '#94A3B8'};">
          ${isHigh ? '⚠️ High Load / Upgrade Alert' : '✅ Optimal Capacity'}
        </div>
      </div>
    `;
    listContainer.appendChild(div);
  });
}

function renderSimulator() {
  const planSlider = document.getElementById("sim-plan-price");
  const recencySlider = document.getElementById("sim-recency");
  const freqSlider = document.getElementById("sim-frequency");
  const dataSlider = document.getElementById("sim-data");
  const callSlider = document.getElementById("sim-call");

  function updateSimulation() {
    const price = parseFloat(planSlider.value);
    const recency = parseInt(recencySlider.value);
    const freq = parseInt(freqSlider.value);
    const dataMB = parseFloat(dataSlider.value);
    const callSec = parseFloat(callSlider.value);

    // Update label text
    document.getElementById("sim-plan-price-val").textContent = `₹${price}`;
    document.getElementById("sim-recency-val").textContent = `${recency} Days`;
    document.getElementById("sim-frequency-val").textContent = `${freq} Recharges`;
    document.getElementById("sim-data-val").textContent = `${dataMB.toLocaleString()} MB (~${(dataMB/1024).toFixed(1)} GB)`;
    document.getElementById("sim-call-val").textContent = `${callSec.toLocaleString()} Sec (~${Math.round(callSec/60)} Mins)`;

    // Simulation formulas based on trained Random Forest Regressor and Classifier trends
    // Expected recharge is heavily anchored to plan price tier and historical cadence
    const predictedRecharge = Math.round((price * 0.94) + (freq * 12) + (dataMB * 0.015) + (callSec * 0.008));
    document.getElementById("sim-res-recharge").textContent = `₹${predictedRecharge.toLocaleString()}`;

    // Churn probability increases with recency days and drops with usage frequency
    let simulatedChurn = 14.0 + (recency * 0.28) - (freq * 2.5) - (dataMB * 0.001);
    simulatedChurn = Math.max(10.5, Math.min(65.0, simulatedChurn)).toFixed(1);

    const churnEl = document.getElementById("sim-res-churn");
    churnEl.textContent = `${simulatedChurn}%`;

    const riskBadge = document.getElementById("sim-risk-badge");
    if (simulatedChurn > 35) {
      riskBadge.className = "risk-badge risk-High";
      riskBadge.textContent = "High Churn Risk";
      churnEl.style.color = "var(--accent-red)";
    } else if (simulatedChurn > 22) {
      riskBadge.className = "risk-badge risk-Medium";
      riskBadge.textContent = "Medium Churn Risk";
      churnEl.style.color = "var(--accent-yellow)";
    } else {
      riskBadge.className = "risk-badge risk-Low";
      riskBadge.textContent = "Low Churn Risk";
      churnEl.style.color = "var(--accent-green)";
    }

    // Determine Simulated RFM Segment
    let simSegment = "Loyal Customers";
    if (recency < 30 && freq >= 4 && price >= 800) simSegment = "Champions / VIP";
    else if (recency > 70 && freq >= 3) simSegment = "At Risk";
    else if (recency > 90) simSegment = "Can't Lose Them";
    else if (recency < 30 && freq <= 2) simSegment = "New Customers";
    else if (dataMB > 3000) simSegment = "Potential Loyalists";
    else if (recency > 45) simSegment = "Need Attention";

    document.getElementById("sim-res-rfm").textContent = simSegment;

    // Simulated Next-Best-Offer
    let recPlan = "P001: Unlimited 5G Data (₹299)";
    let recReason = "High data intensity user upgrade recommendation";
    if (simulatedChurn > 35) {
      recPlan = "P002: Truly Unlimited (₹479 - 20% OFF Winback)";
      recReason = "Urgent retention coupon offer with double data booster";
    } else if (price >= 999 || freq >= 5) {
      recPlan = "P003: Annual Plan (₹2999)";
      recReason = "Long-tenure lock-in offer with 3 months free validity";
    } else if (callSec > 2500 && dataMB < 800) {
      recPlan = "P005: Talktime Only (₹99)";
      recReason = "Cost-optimized voice centric package";
    }
    document.getElementById("sim-res-nbo-plan").textContent = recPlan;
    document.getElementById("sim-res-nbo-reason").textContent = recReason;
  }

  [planSlider, recencySlider, freqSlider, dataSlider, callSlider].forEach(slider => {
    slider.addEventListener("input", updateSimulation);
  });

  updateSimulation();
}

function populateQuickSelect() {
  const quickSelect = document.getElementById("nbo-quick-select");
  const sampleCustomers = [
    { id: "C000001", label: "C000001 - Raj Yadav (Can't Lose Them)" },
    { id: "C000002", label: "C000002 - Anita Sharma (High Risk Churner)" },
    { id: "C000003", label: "C000003 - Vikram Singh (Champions / VIP)" },
    { id: "C000450", label: "C000450 - Loyal Customer Sample" },
    { id: "C001200", label: "C001200 - At Risk Win-Back Sample" },
    { id: "C001816", label: "C001816 - Family Postpaid VIP" }
  ];

  sampleCustomers.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.label;
    quickSelect.appendChild(opt);
  });

  quickSelect.addEventListener("change", (e) => {
    if (e.target.value) {
      document.getElementById("nbo-search-id").value = e.target.value;
      inspectCustomerNBO(e.target.value);
    }
  });
}

function inspectCustomerNBO(customerId) {
  const customer = mlData.customers.find(c => c.customer_id.toLowerCase() === customerId.toLowerCase());
  const display = document.getElementById("nbo-profile-display");

  if (!customer) {
    alert("Customer ID not found. Please try another ID (e.g. C000001 to C002000).");
    return;
  }

  display.style.display = "block";
  document.getElementById("nbo-customer-name").textContent = `${customer.name} (${customer.customer_id})`;
  document.getElementById("nbo-meta-info").textContent = 
    `Circle: ${customer.circle} &bull; City: ${customer.city} &bull; Joined: ${customer.join_date} &bull; Account: ${customer.status}`;
  
  const riskBadge = document.getElementById("nbo-risk-badge");
  riskBadge.className = `risk-badge risk-${customer.risk_level}`;
  riskBadge.textContent = `${customer.risk_level} Churn Risk (${customer.churn_probability}%)`;

  document.getElementById("nbo-current-plan").textContent = customer.current_plan;
  document.getElementById("nbo-pred-recharge").textContent = `₹${customer.predicted_next_recharge}`;
  document.getElementById("nbo-rfm-segment").textContent = customer.rfm_segment;
  document.getElementById("nbo-recency").textContent = `${customer.recency_days} days ago`;

  document.getElementById("nbo-rec-plan").textContent = customer.nbo_plan_name;
  document.getElementById("nbo-rec-reason").textContent = `Strategic Rationale: ${customer.nbo_reason}`;

  // Link Tailored Campaign Ad Creative from ad_images/
  const adImg = document.getElementById("nbo-ad-img");
  const adFile = customer.ad_primary || "01_Champions_VIP.png";
  adImg.src = `/ad_images/${adFile}`;

  const campaign = mlData.ad_campaigns.find(c => c.segment === customer.rfm_segment) || mlData.ad_campaigns[0];
  document.getElementById("nbo-ad-title").textContent = campaign.campaign_title;
  document.getElementById("nbo-ad-offer").textContent = `${campaign.target_offer} &bull; Channel: ${campaign.channel}`;

  document.getElementById("nbo-dispatch-btn").onclick = () => {
    alert(`🚀 Campaign dispatched to ${customer.name} (+91 ${customer.phone_number}) via WhatsApp and SMS!\nOffer: ${campaign.target_offer}`);
  };
}

function renderAdGallery(filterSegment = "All") {
  const container = document.getElementById("ad-gallery-container");
  container.innerHTML = "";

  const campaigns = mlData.ad_campaigns || [];
  const filtered = (filterSegment === "All") ? campaigns : campaigns.filter(c => c.segment === filterSegment);

  filtered.forEach(c => {
    // Primary Card
    const card = document.createElement("div");
    card.className = "ad-card";
    card.innerHTML = `
      <div class="ad-img-wrapper" onclick="openImageModal('/ad_images/${c.ad_primary}')">
        <img src="/ad_images/${c.ad_primary}" alt="${c.campaign_title}" loading="lazy">
      </div>
      <div class="ad-card-content">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span class="segment-badge">${c.segment}</span>
            <span style="font-size: 10px; color: var(--text-dim); text-transform: uppercase;">1080x1080 px</span>
          </div>
          <div class="ad-headline">${c.campaign_title}</div>
          <div class="ad-offer">${c.target_offer}</div>
          <div class="ad-meta">
            <div><strong>Copy:</strong> "${c.copy_headline}"</div>
            <div style="margin-top: 4px;"><strong>Target Channels:</strong> ${c.channel}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button class="action-btn" style="flex: 1;" onclick="triggerSegmentBlast('${c.segment}', '${c.campaign_title}')">
            Deploy Campaign
          </button>
          <button class="btn-secondary" onclick="openImageModal('/ad_images/${c.ad_primary}')">
            Zoom
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);

    // If secondary ad image exists and is distinct
    if (c.ad_secondary && c.ad_secondary !== c.ad_primary) {
      const card2 = document.createElement("div");
      card2.className = "ad-card";
      card2.innerHTML = `
        <div class="ad-img-wrapper" onclick="openImageModal('/ad_images/${c.ad_secondary}')">
          <img src="/ad_images/${c.ad_secondary}" alt="${c.campaign_title} Variant" loading="lazy">
        </div>
        <div class="ad-card-content">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span class="segment-badge">${c.segment} (Variant B)</span>
              <span style="font-size: 10px; color: var(--text-dim); text-transform: uppercase;">1080x1080 px</span>
            </div>
            <div class="ad-headline">${c.campaign_title} - Multiplier</div>
            <div class="ad-offer">${c.target_offer}</div>
            <div class="ad-meta">
              <div><strong>Copy:</strong> "${c.copy_headline}"</div>
              <div style="margin-top: 4px;"><strong>Target Channels:</strong> ${c.channel}</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="action-btn" style="flex: 1;" onclick="triggerSegmentBlast('${c.segment}', '${c.campaign_title} Variant B')">
              Deploy Campaign
            </button>
            <button class="btn-secondary" onclick="openImageModal('/ad_images/${c.ad_secondary}')">
              Zoom
            </button>
          </div>
        </div>
      `;
      container.appendChild(card2);
    }
  });
}

function setupEventListeners() {
  // Boost slider interaction
  const boostSlider = document.getElementById("sim-boost-slider");
  const churnReductSlider = document.getElementById("sim-churn-reduct-slider");
  const horizonSlider = document.getElementById("sim-horizon-slider");

  function refreshGrowthForecast() {
    const boost = parseInt(boostSlider.value);
    const churnReduct = parseInt(churnReductSlider.value);
    document.getElementById("sim-boost-val").textContent = `+${boost}%`;
    document.getElementById("sim-churn-reduct-val").textContent = `-${churnReduct}%`;
    document.getElementById("sim-horizon-val").textContent = `${horizonSlider.value} Days`;
    renderGrowthForecastChart(boost, churnReduct);
  }

  boostSlider.addEventListener("input", refreshGrowthForecast);
  churnReductSlider.addEventListener("input", refreshGrowthForecast);
  horizonSlider.addEventListener("input", refreshGrowthForecast);

  // Search and filter churn table
  document.getElementById("search-customer").addEventListener("input", renderChurnTable);
  document.getElementById("filter-risk").addEventListener("change", renderChurnTable);
  document.getElementById("filter-circle").addEventListener("change", renderChurnTable);
  document.getElementById("filter-rfm").addEventListener("change", renderChurnTable);
  document.getElementById("export-csv-btn").addEventListener("click", exportCohortToCSV);

  // NBO Customer Lookup
  document.getElementById("nbo-lookup-btn").addEventListener("click", () => {
    const id = document.getElementById("nbo-search-id").value.trim();
    if (id) inspectCustomerNBO(id);
  });

  // Modal interactions
  document.getElementById("modal-close-btn").addEventListener("click", closeModal);
  document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
  document.getElementById("modal-confirm-btn").addEventListener("click", () => {
    alert("🚀 Retention offer dispatched successfully via WhatsApp & SMS!");
    closeModal();
  });

  // Image zoom modal interactions
  document.getElementById("img-modal-close-btn").addEventListener("click", () => {
    document.getElementById("image-modal").classList.remove("active");
  });

  // Campaign filter buttons
  const filterBtns = document.querySelectorAll("#campaign-filter-buttons button");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => {
        b.className = "btn-secondary";
      });
      btn.className = "action-btn";
      const seg = btn.getAttribute("data-segment");
      renderAdGallery(seg);
    });
  });
}

function openInterventionModal(id, name, prob, segment) {
  document.getElementById("modal-title").textContent = `Churn Intervention: ${name} (${id})`;
  document.getElementById("modal-body").innerHTML = `
    <p style="margin-bottom: 12px; font-size: 14px;">
      Customer currently in <strong>${segment}</strong> segment with a 
      <strong style="color: var(--accent-red);">${prob}% predicted churn risk</strong>.
    </p>
    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 14px; border-radius: 10px;">
      <label style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">Select Automated Retention Offer:</label>
      <select class="custom-select" style="width: 100%;">
        <option>20% Win-Back Discount on Truly Unlimited (₹479 → ₹239 Coupon: RETENTION20)</option>
        <option>Free 15GB 5G High-Speed Data Booster Pack (₹148 Value)</option>
        <option>Annual Plan Saver: 3 Months Complimentary Validity on Plan P003</option>
        <option>Escalate for Dedicated Executive Care Direct Call</option>
      </select>
    </div>
  `;
  document.getElementById("action-modal").classList.add("active");
}

function closeModal() {
  document.getElementById("action-modal").classList.remove("active");
}

function openImageModal(imgSrc) {
  document.getElementById("enlarged-ad-img").src = imgSrc;
  document.getElementById("image-modal").classList.add("active");
}

function triggerSegmentBlast(segment, campaignTitle) {
  alert(`📢 Automated Omnichannel Broadcast Triggered!\nSegment: ${segment}\nCampaign: ${campaignTitle}\nChannels: WhatsApp Business API, Push Notification, SMS Gateway`);
}
