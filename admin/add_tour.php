<?php
require_once "auth.php";
require_login();
header('Content-Type: text/html; charset=UTF-8');
require_once "tour_service.php";

$activePage = 'tour';
$message = '';
$type = '';

$name = '';
$description = '';
$selectedPoiIds = [];

$pois = getPoiList();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $selectedPoiIds = $_POST['poi_ids'] ?? [];

    if ($name === '' || count($selectedPoiIds) < 2) {
        $message = 'Tên tour và ít nhất 2 POI là bắt buộc.';
        $type = 'delete';
    } else {
        $tourId = createTour($name, $description, $selectedPoiIds);
        if ($tourId === false) {
            $message = 'Tên tour và ít nhất 2 POI là bắt buộc.';
            $type = 'delete';
        } else {
            header('Location: manage_tour.php?added=1');
            exit;
        }
    }
}
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Tạo Tour</title>
<link rel="stylesheet" href="../assets/style.css">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="../assets/tour.css">
</head>
<body>
<?php if ($message): ?>
<div id="toast" class="toast <?= $type ?>">
    <?= htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>
</div>
<?php endif; ?>
<div class="admin">
<?php include "_sidebar.php"; ?>
<div class="content">
<div class="main-content">
<div class="tour-builder">
    <div class="tour-panel">
        <h2>Thiết kế Tour</h2>
        <p class="subtext">Thiết lập lộ trình tham quan</p>

        <form id="tour-form" method="post">
            <label>Tên tour</label>
            <input type="text" name="name" value="<?= htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" placeholder="Nhập tên tour" required>

            <label>Mô tả</label>
            <textarea name="description" placeholder="Mô tả ngắn về tour"><?= htmlspecialchars($description, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></textarea>

            <label>Chọn POI</label>
            <div class="controls">
                <select id="poi-select" multiple size="5">
                    <?php foreach ($pois as $poi): ?>
                    <option value="<?= $poi['id'] ?>"><?= htmlspecialchars($poi['name'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></option>
                    <?php endforeach; ?>
                </select>
                <button type="button" id="add-poi">Thêm POI đã chọn</button>
            </div>

            <div class="hint">Thứ tự lộ trình: chọn nhiều điểm và thêm vào danh sách.</div>
            <div class="hint">Chọn ít nhất 2 POI để lưu tour.</div>
            <div class="hint">Bấm marker trên bản đồ để thêm POI vào tour.</div>
            <ul id="poi-list"></ul>

            <button type="submit">Lưu Tour</button>
        </form>
    </div>
    <div class="tour-map">
        <div id="map"></div>
    </div>
</div>
</div>
</div>
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const selectedIds = new Set(<?= json_encode(array_values($selectedPoiIds)) ?>);
const pois = <?= json_encode($pois, JSON_HEX_TAG) ?>;
const poiMap = {};
pois.forEach(p => poiMap[p.id] = p);

const poiList = document.getElementById('poi-list');
const poiSelect = document.getElementById('poi-select');
const addPoiBtn = document.getElementById('add-poi');
const map = L.map('map').setView([10.762622, 106.660172], 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const baseMarkers = [];
const selectedMarkerHighlights = [];

function renderPoiItem(id) {
    const poi = poiMap[id];
    const li = document.createElement('li');
    li.dataset.id = id;
    const imageHtml = poi.image_url ? `<a href="../${poi.image_url}" target="_blank" rel="noopener noreferrer"><img class="tour-poi-thumbnail" src="../${poi.image_url}" alt="${poi.name}" title="Xem ảnh đầy đủ"></a>` : '';
    li.innerHTML = `
        <span>${imageHtml}${poi.name}</span>
        <span class="actions">
            <button type="button" class="move-up" title="Lên">↑</button>
            <button type="button" class="move-down" title="Xuống">↓</button>
            <button type="button" class="remove-poi" title="Xóa">×</button>
            <input type="hidden" name="poi_ids[]" value="${id}">
        </span>`;
    return li;
}

function renderBaseMarkers() {
    pois.forEach(p => {
        const marker = L.marker([p.latitude, p.longitude]).addTo(map);
        let popupContent = `<strong>${p.name}</strong>`;
        if (p.image_url) {
            popupContent += `<br><a href="../${p.image_url}" target="_blank" rel="noopener noreferrer"><img class="poi-popup-image" src="../${p.image_url}" alt="${p.name}"></a>`;
        }
        popupContent += `<br><em>Click để thêm vào tour</em>`;
        marker.bindPopup(popupContent);
        marker.on('click', () => addPoi(p.id));
        baseMarkers.push(marker);
    });
    if (baseMarkers.length) {
        const group = L.featureGroup(baseMarkers);
        map.fitBounds(group.getBounds().pad(0.2));
    }
}

function refreshSelectedHighlights() {
    selectedMarkerHighlights.forEach(m => map.removeLayer(m));
    selectedMarkerHighlights.length = 0;
    const selectedItems = Array.from(poiList.children).map(li => poiMap[li.dataset.id]);
    selectedItems.forEach(poi => {
        if (!poi) return;
        const circle = L.circle([poi.latitude, poi.longitude], {
            radius: 40,
            color: '#2563eb',
            fillColor: '#bfdbfe',
            fillOpacity: 0.35,
            weight: 2,
        }).addTo(map);
        selectedMarkerHighlights.push(circle);
    });
    if (selectedMarkerHighlights.length) {
        const group = L.featureGroup(selectedMarkerHighlights);
        map.fitBounds(group.getBounds().pad(0.25));
    }
}

function addPoi(id) {
    if (!id || selectedIds.has(id)) return;
    selectedIds.add(id);
    poiList.appendChild(renderPoiItem(id));
    refreshSelectedHighlights();
}

function loadInitialItems() {
    Array.from(selectedIds).forEach(id => {
        poiList.appendChild(renderPoiItem(id));
    });
    refreshSelectedHighlights();
}

addPoiBtn.addEventListener('click', () => {
    const selectedOptions = Array.from(poiSelect.selectedOptions).map(opt => opt.value);
    selectedOptions.forEach(id => addPoi(id));
});

const tourForm = document.getElementById('tour-form');
function getSelectedPoiCount() {
    return document.querySelectorAll('input[name="poi_ids[]"]').length;
}

tourForm.addEventListener('submit', (event) => {
    if (getSelectedPoiCount() < 2) {
        alert('Vui lòng chọn ít nhất 2 POI để lưu tour.');
        event.preventDefault();
    }
});

poiList.addEventListener('click', (event) => {
    const li = event.target.closest('li');
    if (!li) return;
    if (event.target.classList.contains('remove-poi')) {
        selectedIds.delete(li.dataset.id);
        li.remove();
        refreshSelectedHighlights();
        return;
    }
    if (event.target.classList.contains('move-up')) {
        const prev = li.previousElementSibling;
        if (prev) {
            poiList.insertBefore(li, prev);
            refreshSelectedHighlights();
        }
        return;
    }
    if (event.target.classList.contains('move-down')) {
        const next = li.nextElementSibling;
        if (next) {
            poiList.insertBefore(next, li);
            refreshSelectedHighlights();
        }
        return;
    }
});

renderBaseMarkers();
loadInitialItems();
</script>
</body>
</html>
