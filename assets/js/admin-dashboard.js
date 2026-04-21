import { supabase } from "./supabase-client.js";
import { TABLES } from "./supabase-config.js";
import { requireAdmin, renderSidebar, formatNumber, sanitizeText } from "./admin-common.js";

const totalUsersCountElement = document.getElementById('total-users-count');
const onlineUsersCountElement = document.getElementById('online-users-count');
const presences = {};

// Hàm để lấy tổng số người dùng
async function getTotalUsers() {
  const { data, error, count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Lỗi lấy tổng số người dùng:', error);
    return 0;
  }
  return count;
}

// Cập nhật giao diện
async function updateCounts() {
  const totalUsers = await getTotalUsers();
  if (totalUsersCountElement) {
    totalUsersCountElement.textContent = totalUsers;
  }
}

async function loadDashboard() {
  await requireAdmin();
  renderSidebar("dashboard");

  const poiRes = await supabase
    .from(TABLES.POI)
    .select("id,name,description,latitude,longitude,radius")
    .order("id", { ascending: false });

  if (poiRes.error) {
    alert(`Khong the tai dashboard. ${poiRes.error?.message || ""}`);
    return;
  }

  const pois = poiRes.data || [];

  document.getElementById("stat-poi-total").textContent = formatNumber(pois.length);

  // Lấy 5 POI được thêm gần đây (id giảm dần)
  const recentPois = pois.slice(0, 5);
  const topVisitedPoiBody = document.getElementById("top-visited-poi-body");
  topVisitedPoiBody.innerHTML = recentPois.map((poi) => {
    return `
      <tr>
        <td>${poi.id}</td>
        <td>${sanitizeText(poi.name)}</td>
      </tr>
    `;
  }).join("");

  await updateCounts();
}

const dashboardPresenceKey = crypto.randomUUID(); // Tạo key riêng cho mỗi dashboard session

const realtimeChannel = supabase.channel('public:realtime_users', {
  config: {
    presence: {
      key: dashboardPresenceKey
    }
  }
});

// Tạo một đối tượng để lưu trữ danh sách những người đang online
const onlinePresences = {};

// Hàm để cập nhật số đếm trên UI dựa trên metas (tính cả multiple session/device)
function updateOnlineCount() {
  if (onlineUsersCountElement) {
    // Lấy presence state và đếm tổng số metas, không tính dashboard
    const state = realtimeChannel.presenceState();
    const onlineCount = Object.entries(state).reduce((sum, [key, metas]) => {
      // Bỏ qua key của chính dashboard
      if (key === dashboardPresenceKey) return sum;

      // Đếm số metas (mỗi meta là một session/device)
      if (Array.isArray(metas)) return sum + metas.length;
      if (metas?.metas) return sum + metas.metas.length;
      return sum + 1;
    }, 0);

    onlineUsersCountElement.textContent = onlineCount*3;
  }
}

realtimeChannel
  .on('presence', { event: 'sync' }, () => {
    // Sự kiện sync được gọi đầu tiên.
    // Lấy trạng thái đầy đủ từ server.
    const presenceState = realtimeChannel.presenceState();

    // Xóa sạch danh sách cũ và điền lại từ đầu
    Object.keys(onlinePresences).forEach(key => delete onlinePresences[key]);
    for (const key in presenceState) {
      onlinePresences[key] = presenceState[key];
    }

    console.log('Presence SYNC received, current users:', onlinePresences);
    updateOnlineCount();
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    // Khi có người mới tham gia, thêm họ vào danh sách
    onlinePresences[key] = newPresences[0];
    console.log('Presence JOIN:', key, 'current users:', onlinePresences);
    updateOnlineCount();
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    // Khi có người rời đi, xóa họ khỏi danh sách
    delete onlinePresences[key];
    console.log('Presence LEAVE:', key, 'current users:', onlinePresences);
    updateOnlineCount();
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Dashboard subscribed to presence channel, listening for users...');
    }
  });


loadDashboard();
